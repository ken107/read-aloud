const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const rxjs = require('../js/rxjs.umd.min.js')
const managerSource = fs.readFileSync('js/offscreen-manager.js', 'utf8')
function fixture({existing = false, detection = 'hasDocument'} = {}) {
  let present = existing, creates = 0, pings = 0
  const api = {runtime: {getURL: path => 'extension://' + path, sendMessage: async () => {pings++; return present}}, offscreen: {
    createDocument: async () => {creates++; present = true}
  }}
  const clients = {matchAll: async () => present ? [{url: 'extension://offscreen.html'}] : []}
  if (detection == 'hasDocument') api.offscreen.hasDocument = async () => present
  if (detection == 'getContexts') api.runtime.getContexts = async filter => {
    assert.deepEqual(Array.from(filter.documentUrls), ['extension://offscreen.html'])
    return present ? [{}] : []
  }
  const context = vm.createContext({setTimeout, clearTimeout, console})
  vm.runInContext(managerSource, context)
  return {api, clients, ensure: context.makeOffscreenManager(api, clients, {timeout: 15, pollInterval: 1}),
    counts: () => ({creates, pings}), setPresent: value => present = value}
}
for (const detection of ['hasDocument', 'getContexts', 'clients']) {
  test(`reuse surviving document using ${detection}`, async () => {
    const f = fixture({existing: true, detection})
    assert.equal(await f.ensure(), true)
    assert.equal(f.counts().creates, 0)
  })
}
test('concurrent callers share creation and readiness', async () => {
  const f = fixture()
  const a = f.ensure(), b = f.ensure()
  assert.equal(a, b)
  await Promise.all([a,b])
  assert.equal(f.counts().creates, 1)
})
test('failed creation propagates and clears the shared operation for retry', async () => {
  const f = fixture(), create = f.api.offscreen.createDocument
  f.api.offscreen.createDocument = async () => {throw new Error('denied')}
  await assert.rejects(f.ensure(), /denied/)
  f.api.offscreen.createDocument = create
  await f.ensure()
})
test('creation race with another owner reuses its ready document', async () => {
  const f = fixture()
  f.api.offscreen.createDocument = async () => {f.setPresent(true); throw new Error('duplicate')}
  assert.equal(await f.ensure(), true)
})
test('waits for listener readiness after existence becomes visible', async () => {
  const f = fixture({existing: true})
  let calls = 0
  f.api.runtime.sendMessage = async () => ++calls > 2
  await f.ensure()
  assert.equal(calls, 3)
})
test('unresponsive document fails within a bound without closing other audio', async () => {
  const f = fixture({existing: true})
  f.api.runtime.sendMessage = () => new Promise(() => {})
  await assert.rejects(f.ensure(), /did not become ready/)
  assert.equal(f.counts().creates, 0)
})
test('document disappearing during readiness is recreated once', async () => {
  const f = fixture({existing: true})
  let disappeared = false
  f.api.runtime.sendMessage = async () => {
    if (!disappeared) {disappeared = true; f.setPresent(false)}
    return f.counts().creates > 0
  }
  await f.ensure()
  assert.equal(f.counts().creates, 1)
})
test('old Chrome fallback matches exact document URL, not another extension page', async () => {
  const f = fixture({detection: 'clients'})
  f.clients.matchAll = async () => [{url:'extension://player.html'}]
  await f.ensure()
  assert.equal(f.counts().creates, 1)
})
function offscreenFixture() {
  let handlers, starts = 0, states = [], events = []
  vm.runInNewContext(fs.readFileSync('js/offscreen.js','utf8'), {
    rxjs, console, errorToJson: e => ({message:e.message}),
    registerMessageListener: (_, h) => handlers = h,
    playAudioHere: (_, options, state) => {starts++; state.subscribe(x => states.push(x)); return rxjs.NEVER},
    brapi: {runtime: {sendMessage: async event => events.push(event)}}
  })
  return {get handlers() {return handlers}, starts: () => starts, states}
}
test('play is idempotent and stale pause/stop cannot affect newer sessions', () => {
  const f = offscreenFixture(), h = f.handlers
  assert.equal(h.ping(), true)
  h.pause('empty'); h.stop('empty')
  h.play('a', {}, 'one'); h.pause('one'); h.play('a', {}, 'one')
  assert.equal(f.starts(), 1)
  assert.equal(f.states.at(-1), 'resumed')
  h.play('b', {}, 'two'); h.pause('one'); h.stop('one')
  h.play('b', {}, 'two')
  assert.equal(f.starts(), 2)
  h.stop('two'); h.play('b', {}, 'two')
  assert.equal(f.starts(), 3)
})
function playerFixture() {
  const source = fs.readFileSync('js/player.js','utf8')
  let ensure = async () => true, messages = [], counter = 0
  const context = vm.createContext({rxjs, console, setTimeout, clearTimeout,
    crypto: {randomUUID: () => String(++counter)}, messageHandlers: {},
    bgPageInvoke: () => ensure(),
    brapi: {runtime: {sendMessage: async msg => {messages.push(msg); return true}}}
  })
  vm.runInContext(source.slice(source.indexOf('var offscreenCommandQueue'), source.indexOf('async function shouldPlaySilence')), context)
  return {context, messages, setEnsure: fn => ensure = fn,
    play: state => context.playAudioOffscreen(Promise.resolve('url'), {}, state)}
}
const tick = () => new Promise(resolve => setImmediate(resolve))
test('unsubscribe during setup prevents delayed audio start', async () => {
  const f = playerFixture()
  let release
  f.setEnsure(() => new Promise(resolve => release = resolve))
  const sub = f.play(new rxjs.BehaviorSubject('resumed')).subscribe()
  await tick()
  sub.unsubscribe(); release(true)
  await tick()
  assert.deepEqual(f.messages.map(x => x.method), ['stop'])
})
test('pause while setup is pending prevents delayed play and permits later resume', async () => {
  const f = playerFixture(), state = new rxjs.BehaviorSubject('resumed')
  let release
  f.setEnsure(() => new Promise(resolve => release = resolve))
  const sub = f.play(state).subscribe()
  await tick(); state.next('paused'); release(true); await tick()
  assert.deepEqual(f.messages.map(x => x.method), ['pause'])
  f.setEnsure(async () => true); state.next('resumed'); await tick()
  assert.deepEqual(f.messages.map(x => x.method), ['pause','play'])
  sub.unsubscribe(); await tick()
})
test('events are scoped to session and handlers are removed on unsubscribe', async () => {
  const f = playerFixture(), received = []
  const a = f.play(new rxjs.BehaviorSubject('resumed')).subscribe(e => received.push(['a',e.type]))
  const b = f.play(new rxjs.BehaviorSubject('resumed')).subscribe(e => received.push(['b',e.type]))
  await tick()
  f.context.messageHandlers.offscreenPlaybackEvent({type:'start'}, '1')
  f.context.messageHandlers.offscreenPlaybackEvent({type:'start'}, '2')
  a.unsubscribe()
  f.context.messageHandlers.offscreenPlaybackEvent({type:'end'}, '1')
  assert.deepEqual(received, [['a','start'],['b','start']])
  b.unsubscribe(); await tick()
  assert.equal(f.context.offscreenEventHandlers.size, 0)
})
test('transport failure between readiness and play retries with the same session ID', async () => {
  const f = playerFixture(); let calls = 0
  f.context.brapi.runtime.sendMessage = async msg => {
    f.messages.push(msg)
    if (msg.method == 'play' && ++calls == 1) throw new Error('No receiver')
    return true
  }
  const sub = f.play(new rxjs.BehaviorSubject('resumed')).subscribe()
  await tick()
  assert.equal(calls, 2)
  assert.equal(f.messages[0].args[2], f.messages[1].args[2])
  sub.unsubscribe(); await tick()
})
test('application errors surface without recreating or replaying audio', async () => {
  const f = playerFixture(); let error
  f.context.brapi.runtime.sendMessage = async msg => {
    f.messages.push(msg)
    return {error:{message:'invalid playback'}}
  }
  f.play(new rxjs.BehaviorSubject('resumed')).subscribe({error: e => error = e})
  await tick()
  assert.match(error.message, /invalid playback/)
  assert.equal(f.messages.filter(x => x.method == 'play').length, 1)
})
test('hung creation times out and a later attempt can recover', async () => {
  const f = fixture(), create = f.api.offscreen.createDocument
  f.api.offscreen.createDocument = () => new Promise(() => {})
  await assert.rejects(f.ensure(), /timed out/)
  f.api.offscreen.createDocument = create
  await f.ensure()
})
test('late rejection after timeout is consumed', async () => {
  const f = fixture()
  let reject
  f.api.offscreen.createDocument = () => new Promise((_, r) => reject = r)
  await assert.rejects(f.ensure(), /timed out/)
  reject(new Error('late failure'))
  await tick()
})
