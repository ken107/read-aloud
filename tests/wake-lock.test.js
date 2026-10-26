const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const source = fs.readFileSync('js/defaults.js', 'utf8')

function fixture({mobile = true, supported = true, request} = {}) {
  const events = {}, locks = []
  let speaking = false, tick
  const document = {hidden: false, addEventListener: (name, fn) => events[name] = fn}
  const context = vm.createContext({document,
    window: {addEventListener: (name, fn) => events[name] = fn},
    isMobileOS: () => mobile,
    navigator: {wakeLock: supported ? {request: async type => {
      assert.equal(type, 'screen')
      if (request) await request()
      const lock = {released: false, addEventListener: (_, fn) => lock.onRelease = fn,
        release: async () => {lock.released = true; lock.onRelease()}}
      locks.push(lock)
      return lock
    }} : undefined},
    setInterval: fn => tick = fn,
  })
  vm.runInContext(source.slice(source.indexOf('function maintainPlaybackWakeLock('), source.indexOf('function getHotkeySettingsUrl(')), context)
  context.maintainPlaybackWakeLock(() => speaking)
  return {events, document, locks, tick: async () => {await flush(); if (tick) await tick()}, speak: value => speaking = value}
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('mobile lock follows speech, visibility, and page lifecycle', async () => {
  const f = fixture()
  await f.tick()
  assert.equal(f.locks.length, 0)
  f.speak(true)
  await f.tick()
  await f.tick()
  assert.equal(f.locks.length, 1)
  f.document.hidden = true
  await f.events.visibilitychange()
  assert.equal(f.locks[0].released, true)
  f.document.hidden = false
  await f.events.visibilitychange()
  assert.equal(f.locks.length, 2)
  f.speak(false)
  await f.tick()
  assert.equal(f.locks[1].released, true)
  f.speak(true)
  await f.tick()
  f.events.pagehide()
  assert.equal(f.locks[2].released, true)
  await f.tick()
  assert.equal(f.locks.length, 3)
  f.events.pageshow()
  await flush()
  assert.equal(f.locks.length, 4)
})

test('late grants are released after hiding or stopping speech', async () => {
  for (const hide of [true, false]) {
    let grant
    const f = fixture({request: () => new Promise(resolve => grant = resolve)})
    f.speak(true)
    await flush()
    const pending = f.tick()
    await flush()
    if (hide) {f.document.hidden = true; await f.events.visibilitychange()}
    else f.speak(false)
    grant()
    await pending
    assert.equal(f.locks[0].released, true)
  }
})

test('desktop, unsupported APIs, and denied requests do not affect playback', async () => {
  for (const opts of [{mobile: false}, {supported: false}, {request: () => Promise.reject(new Error('denied'))}]) {
    const f = fixture(opts)
    f.speak(true)
    await f.tick()
    assert.equal(f.locks.length, 0)
  }
})

test('browser-released locks can be reacquired while speaking', async () => {
  const f = fixture()
  f.speak(true)
  await f.tick()
  await f.locks[0].release()
  await f.tick()
  assert.equal(f.locks.length, 2)
})
