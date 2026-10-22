const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const events = fs.readFileSync('js/events.js', 'utf8')
const reader = fs.readFileSync('js/reader.js', 'utf8')

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {resolve = yes; reject = no})
  return {promise, resolve, reject}
}

function fixture({validationError, injectionError, readerError, readerMode = true} = {}) {
  const storage = {playingTabId: 1}
  const calls = []
  const context = vm.createContext({
    console: {warn() {}},
    getTab: async id => ({id, url: 'https://example.org/'}),
    brapi: {storage: {local: {set: async values => Object.assign(storage, values)}}},
    contentHandlers: [{match: () => true, validate() {if (validationError) throw validationError}}],
    contentScriptAlreadyInjected: async () => false,
    injectContentScript: async () => {if (injectionError) throw injectionError},
    isReaderMode: async () => readerMode,
    showReader: async () => {
      assert.equal(storage.playingTabId, 1)
      if (readerError) throw readerError
    },
    sendToPlayer: async ({method}) => {
      assert.equal(storage.playingTabId, method === 'stop' ? 1 : 2)
      calls.push(method === 'playTab' ? 'play' : method)
      return true
    },
    openPopupWindow: async id => calls.push(`popup:${id}`),
  })
  vm.runInContext(events.slice(events.indexOf('var currentTask ='), events.indexOf('async function playText(')), context)
  vm.runInContext(events.slice(events.indexOf('function stop()'), events.indexOf('function pause()')), context)
  vm.runInContext(events.slice(events.indexOf('async function playTab('), events.indexOf('async function reloadAndPlayTab(')), context)
  return {play: () => context.playTab(2), storage, calls, context}
}

for (const failure of ['validationError', 'injectionError']) {
  test(`failed ${failure} preserves the current playback owner`, async () => {
    const f = fixture({[failure]: new Error('denied')})
    await assert.rejects(f.play(), /denied/)
    assert.equal(f.storage.playingTabId, 1)
    assert.deepEqual(f.calls, [])
  })
}

test('reader failure opens fallback controls after playback starts', async () => {
  const f = fixture({readerError: new Error('overlay unavailable')})
  await f.play()
  assert.deepEqual(f.calls, ['stop', 'play', 'popup:2'])
})

for (const readerMode of [true, false]) {
  test(`successful playback transfers ownership without fallback (reader=${readerMode})`, async () => {
    const f = fixture({readerMode})
    await f.play()
    assert.deepEqual(f.calls, ['stop', 'play'])
  })
}

test('fallback stylesheet survives reader markup initialization', async () => {
  // Stop after markup/style setup, before the unrelated controls are wired.
  const ready = new Error('markup initialized')
  const shadow = {
    children: [],
    set innerHTML(value) {this.children = [{markup: value}]},
    appendChild(node) {this.children.push(node)},
    querySelector() {throw ready},
  }
  const context = vm.createContext({
    HOST_TAG: 'read-aloud-reader',
    host: null,
    console: {warn() {}},
    CSSStyleSheet: function() {throw new Error('unsupported')},
    readAloudReaderCss: '.ra-root { display: block; }',
    button: () => '', escapeHtml: text => text, message: key => key,
    document: {createElement: tag => tag === 'style' ? {tag} : {
      style: {setProperty() {}}, attachShadow: () => shadow,
    }},
  })
  vm.runInContext(reader.slice(reader.indexOf('  async function create('), reader.indexOf('  function button(')), context)
  vm.runInContext(reader.slice(reader.indexOf('  function applyStyles('), reader.indexOf('  function showHost(')), context)
  await assert.rejects(context.create(), err => err === ready)
  assert.equal(shadow.children.length, 2)
  assert.equal(shadow.children[1].tag, 'style')
  assert.equal(shadow.children[1].textContent, '.ra-root { display: block; }')
})

test('a failed cross-tab start never renders the previous tab speech in the new reader', async () => {
  const storage = {playingTabId: 1}
  let playback = {state: 'PLAYING', speechInfo: {
    texts: ['Article from tab A'], position: {index: 0},
  }}
  const current = {texts: null, position: null}
  const rendered = []
  const context = vm.createContext({
    console: {warn() {}}, current, tabId: 2,
    getTab: async id => ({id, url: 'https://example.org/'}),
    brapi: {storage: {local: {
      get: async () => ({...storage}),
      set: async values => Object.assign(storage, values),
    }}},
    contentHandlers: [{match: () => true, getSourceUri: () => 'contentscript:2'}],
    isReaderMode: async () => true,
    bgPageInvoke: async () => playback,
    root: {classList: {toggle() {}}},
    isActive: () => current.isSource && ['PLAYING', 'PAUSED', 'LOADING'].includes(current.state),
    renderBody: speech => rendered.push(...speech.texts),
    loadFonts() {}, FONT_SUBSETS: {}, updateHighlighting() {}, clearHighlighting() {},
    updateStatus() {}, updateButtons() {}, renderPlaceholder() {},
    sendToPlayer: async ({method}) => {
      if (method === 'stop') {playback = {state: 'STOPPED'}; return true}
      throw new Error('No readable text in tab B')
    },
  })
  vm.runInContext(events.slice(events.indexOf('var currentTask ='), events.indexOf('async function playText(')), context)
  vm.runInContext(reader.slice(reader.indexOf('  async function update()'), reader.indexOf('  function updateButtons()')), context)
  vm.runInContext(events.slice(events.indexOf('async function playTab('), events.indexOf('async function reloadAndPlayTab(')), context)
  // Poll the real reader update path while the new overlay is opening.
  context.showReader = async () => context.update()
  await assert.rejects(context.playTab(2), /No readable text/)
  await context.update()
  assert.deepEqual(rendered, [])
  assert.equal(current.texts, null)
  assert.equal(current.state, 'STOPPED')
})

test('repeated start requests for a starting tab join the pending start', async () => {
  const f = fixture()
  await Promise.all([f.play(), f.play()])
  assert.deepEqual(f.calls, ['stop', 'play'])
  // once settled, a new request starts playback again
  f.storage.playingTabId = 1
  await f.play()
  assert.deepEqual(f.calls, ['stop', 'play', 'stop', 'play'])
})

for (const cancelWith of ['stop', 'another task']) {
  test(`preparation canceled by ${cancelWith} can restart before the old request settles`, {timeout: 1000}, async () => {
    const f = fixture()
    const firstReady = deferred(), firstGate = deferred()
    const nextReady = deferred(), nextGate = deferred()
    let validations = 0
    f.context.contentHandlers[0].validate = () => {
      validations++
      if (validations === 1) {
        firstReady.resolve()
        return firstGate.promise
      }
      nextReady.resolve()
      return nextGate.promise
    }
    const first = f.play()
    const firstRejected = assert.rejects(first, /Canceled/)
    await firstReady.promise
    if (cancelWith === 'stop') await f.context.stop()
    else f.context.currentTask.begin()

    const next = f.play()
    await nextReady.promise
    // Settling the canceled request must not remove the replacement's entry.
    firstGate.resolve()
    await firstRejected
    const joined = f.play()
    // Allow the async tab lookup to finish while preparation remains blocked.
    await new Promise(setImmediate)
    assert.equal(validations, 2)
    nextGate.resolve()
    await Promise.all([next, joined])
    assert.deepEqual(f.calls, cancelWith === 'stop' ? ['stop', 'stop', 'play'] : ['stop', 'play'])
  })
}

test('a start request after the player took over is not joined', {timeout: 1000}, async () => {
  const f = fixture()
  const playerReady = deferred(), playerGate = deferred()
  const sendToPlayer = f.context.sendToPlayer
  f.context.sendToPlayer = message => {
    if (message.method !== 'playTab') return sendToPlayer(message)
    playerReady.resolve()
    return playerGate.promise
  }
  const first = f.play()
  await playerReady.promise
  f.storage.playingTabId = 1
  f.context.sendToPlayer = sendToPlayer
  await f.play()
  playerGate.resolve()
  await first
  assert.deepEqual(f.calls, ['stop', 'stop', 'play'])
})

// Block one browser operation deterministically, without timers or polling.
function blockStartup(f, stage) {
  const entered = deferred(), gate = deferred()
  let blocked = false
  function wrap(original, matches = () => true) {
    return async (...args) => {
      if (!blocked && matches(...args)) {
        blocked = true
        entered.resolve()
        await gate.promise
      }
      return original(...args)
    }
  }
  const c = f.context
  switch (stage) {
    case 'content injection': c.injectContentScript = wrap(c.injectContentScript); break
    case 'reader settings': c.isReaderMode = wrap(c.isReaderMode); break
    case 'reader opening': c.showReader = wrap(c.showReader); break
    case 'old player stop': c.sendToPlayer = wrap(c.sendToPlayer, msg => msg.method === 'stop'); break
    case 'player injection': {
      const send = c.sendToPlayer
      c.sendToPlayer = async msg => {
        const result = await send(msg)
        return msg.method === 'stop' ? false : result
      }
      c.injectPlayer = wrap(async () => {})
      break
    }
    case 'ownership write':
      c.brapi.storage.local.set = wrap(c.brapi.storage.local.set, values => 'playingTabId' in values)
      break
  }
  return {entered: entered.promise, release: gate.resolve}
}

for (const stage of ['content injection', 'reader settings', 'reader opening', 'old player stop', 'player injection', 'ownership write']) {
  test(`Stop during ${stage} prevents delayed playback`, {timeout: 1000}, async () => {
    const f = fixture()
    const blocked = blockStartup(f, stage)
    const rejected = assert.rejects(f.play(), {name: 'CancellationException'})
    await blocked.entered
    await f.context.stop()
    blocked.release()
    await rejected
    assert.equal(Boolean(f.context.currentTask.isActive()), false)
    assert.equal(f.calls.includes('play'), false)
    assert.equal(f.calls.some(call => call.startsWith('popup:')), false)
  })
}

for (const stage of ['reader opening', 'player injection']) {
  test(`restart during canceled ${stage} plays only the replacement`, {timeout: 1000}, async () => {
    const f = fixture()
    const blocked = blockStartup(f, stage)
    const rejected = assert.rejects(f.play(), {name: 'CancellationException'})
    await blocked.entered
    await f.context.stop()
    const next = f.play()
    // Let the replacement enter startup before the obsolete operation completes.
    await new Promise(setImmediate)
    blocked.release()
    await Promise.all([rejected, next])
    assert.equal(f.calls.filter(call => call === 'play').length, 1)
    assert.equal(Boolean(f.context.currentTask.isActive()), false)
  })
}

test('overlapping player injections share creation and check-in', {timeout: 1000}, async () => {
  let creates = 0
  const created = deferred()
  const context = vm.createContext({
    getSettings: async () => ({}),
    handlers: {},
    createPlayerTab: async () => {creates++; created.resolve()},
  })
  vm.runInContext(events.slice(events.indexOf('let pendingPlayerInjection'), events.indexOf('function createPlayerFrame()')), context)
  const first = context.injectPlayer({id: 1})
  const next = context.injectPlayer({id: 2})
  assert.equal(first, next)
  await created.promise
  assert.equal(creates, 1)
  context.handlers.playerCheckIn()
  await Promise.all([first, next])
})

test('failed player creation can be retried', async () => {
  let attempts = 0
  const context = vm.createContext({
    getSettings: async () => ({}), handlers: {},
    createPlayerTab: async () => {
      if (++attempts === 1) throw new Error('creation failed')
      context.handlers.playerCheckIn()
    },
  })
  vm.runInContext(events.slice(events.indexOf('let pendingPlayerInjection'), events.indexOf('function createPlayerFrame()')), context)
  await assert.rejects(context.injectPlayer({id: 1}), /creation failed/)
  await context.injectPlayer({id: 1})
  assert.equal(attempts, 2)
})

test('Stop then Start while creating the player reuses it and plays only once', {timeout: 1000}, async () => {
  const f = fixture()
  const created = deferred()
  let creates = 0
  f.context.getSettings = async () => ({})
  f.context.handlers = {}
  f.context.createPlayerTab = async () => {creates++; created.resolve()}
  const send = f.context.sendToPlayer
  f.context.sendToPlayer = async msg => {
    const result = await send(msg)
    return msg.method === 'stop' ? false : result
  }
  vm.runInContext(events.slice(events.indexOf('let pendingPlayerInjection'), events.indexOf('function createPlayerFrame()')), f.context)
  const rejected = assert.rejects(f.play(), {name: 'CancellationException'})
  await created.promise
  await f.context.stop()
  const next = f.play()
  await new Promise(setImmediate)
  assert.equal(creates, 1)
  assert.equal(f.calls.includes('play'), false)
  f.context.handlers.playerCheckIn()
  await Promise.all([rejected, next])
  assert.equal(f.calls.filter(call => call === 'play').length, 1)
})

test('canceled toolbar starts do not show an error or open fallback controls', async () => {
  const calls = []
  const context = vm.createContext({
    getTab: async id => ({id}),
    console: {error() {calls.push('error')}},
  })
  vm.runInContext(fs.readFileSync('js/reader-manager.js', 'utf8'), context)
  context.onActionClicked = async () => {throw {name: 'CancellationException', message: 'Canceled'}}
  context.sendToReader = async () => calls.push('reader error')
  context.openPopupWindow = async () => calls.push('popup')
  await context.activateReader(2)
  assert.deepEqual(calls, [])
})
