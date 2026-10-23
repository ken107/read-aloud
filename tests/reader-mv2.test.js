const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const events = fs.readFileSync('js/events.js', 'utf8')
const manager = fs.readFileSync('js/reader-manager.js', 'utf8')
const reader = fs.readFileSync('js/reader.js', 'utf8')
const tick = () => new Promise(setImmediate)
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {resolve = yes; reject = no})
  return {promise, resolve, reject}
}
function fixture({ready = async () => {}, play = async () => {}, overlay = async () => {}} = {}) {
  const calls = [], docs = [], sources = []
  const context = vm.createContext({
    activeDoc: null, playbackError: null,
    console: {warn() {}, error() {}},
    getTab: async id => ({id}), getActiveTab: async () => ({id: 2}),
    isReaderMode: async () => true, getSettings: async () => ({showHighlighting: 3}),
    showReader: async tab => {calls.push(['overlay', tab.id]); await overlay(tab)},
    openPopupWindow: async id => calls.push(['fallback', id]),
    handleError() {}, errorToJson: err => ({message: err.message}),
    silenceLoop: {play: async () => {}, pause() {}},
    TabSource: function(id) {
      this.id = id
      this.ready = ready(id)
      this.close = () => calls.push(['source-close', id])
      sources.push(this)
    },
    Doc: function(source, onEnd) {
      this.id = source.id
      this.play = async () => {calls.push(['play', source.id]); await play(source.id)}
      this.close = () => calls.push(['close', source.id])
      this.pause = async () => calls.push(['pause', source.id])
      this.getState = async () => 'PLAYING'
      this.getActiveSpeech = async () => ({getInfo: () => ({texts: ['tab ' + source.id], position: {index: 0}})})
      this.end = onEnd
      docs.push(this)
    },
  })
  vm.runInContext(events.slice(events.indexOf('let playingTabId'), events.indexOf('function forward()')), context)
  return {context, calls, docs, sources}
}
test('MV2 reader starts once, exposes ownership and preserves popup state API', async () => {
  const f = fixture()
  const first = f.context.playTab(2)
  assert.equal(first, f.context.playTab(2))
  await first
  assert.deepEqual(f.calls, [['overlay', 2], ['play', 2]])
  assert.equal(await f.context.getPlaybackState(), 'PLAYING')
  const state = await f.context.getReaderState()
  assert.equal(state.playingTabId, 2)
  assert.equal(state.speechInfo.texts[0], 'tab 2')
})
test('Stop during preparation prevents late playback and permits immediate restart', async () => {
  const gate = deferred()
  let attempts = 0
  const f = fixture({ready: () => ++attempts === 1 ? gate.promise : Promise.resolve()})
  const first = f.context.playTab(2)
  await tick()
  await f.context.stop()
  await f.context.playTab(2)
  gate.resolve()
  await first
  assert.equal(f.calls.filter(([type]) => type === 'play').length, 1)
  assert.equal(f.calls.some(([type]) => type === 'fallback'), false)
})
test('source validation failure preserves previous document and owner', async () => {
  const f = fixture({ready: async id => {if (id === 3) throw new Error('permission denied')}})
  await f.context.playTab(2)
  await assert.rejects(f.context.playTab(3), /permission denied/)
  assert.equal(f.context.activeDoc.id, 2)
  assert.equal((await f.context.getReaderState()).playingTabId, 2)
  assert.equal(f.calls.some(([type]) => type === 'close'), false)
})
test('overlay failure falls back after playback and late old document callbacks are harmless', async () => {
  const f = fixture({overlay: async () => {throw new Error('restricted frame')}})
  await f.context.playTab(2)
  assert.deepEqual(f.calls.slice(-2), [['play', 2], ['fallback', 2]])
  await f.context.playTab(3)
  f.docs[0].end(new Error('late'))
  assert.equal(f.context.activeDoc.id, 3)
})
test('repeated starts join even while the new document is preparing speech', async () => {
  const gate = deferred()
  const f = fixture({play: () => gate.promise})
  const first = f.context.playTab(2)
  await tick()
  assert.equal(f.context.playTab(2), first)
  await f.context.stop()
  gate.resolve()
  await first
  assert.equal(f.context.activeDoc, null)
  assert.equal(f.calls.some(([type]) => type === 'fallback'), false)
})
test('reader state never includes old speech while preparing a different tab', async () => {
  const gate = deferred()
  const f = fixture({ready: id => id === 3 ? gate.promise : Promise.resolve()})
  await f.context.playTab(2)
  const next = f.context.playTab(3)
  await tick()
  const state = await f.context.getReaderState()
  assert.equal(state.state, 'LOADING')
  assert.equal(state.playingTabId, 3)
  assert.equal(state.speechInfo, null)
  gate.resolve()
  await next
})
test('toolbar toggles playback on the source tab and opens another tab independently', async () => {
  const f = fixture()
  vm.runInContext(manager, f.context)
  f.context.showReader = async () => {}
  f.context.sendToReader = async () => 'expanded'
  await f.context.playTab(2)
  await f.context.onActionClicked({id: 2})
  assert.deepEqual(f.calls.at(-1), ['pause', 2])
  await f.context.onActionClicked({id: 3})
  assert.equal(f.context.activeDoc.id, 3)
})
test('MV2 injection detects content helpers separately from brapi and injects sequentially', async () => {
  const calls = []
  const context = vm.createContext({
    brapi: {tabs: {executeScript: async (id, details) => {calls.push(details); return [0]}, sendMessage: async () => true}},
  })
  vm.runInContext(manager, context)
  await context.showReader({id: 2})
  // The extraction script already defines getSettings and immediate, but
  // not the complete defaults.js helpers required to create the reader.
  const page = vm.createContext({})
  const content = fs.readFileSync('js/content.js', 'utf8')
  vm.runInContext(content.slice(content.indexOf('function getInnerText(')), page)
  assert.equal(typeof page.getSettings, 'function')
  assert.equal(vm.runInContext(calls[0].code, page), 0)
  vm.runInContext('const settingsChange$ = {}', page)
  assert.equal(vm.runInContext(calls[0].code, page), 1)
  vm.runInContext('var readAloudReader = {}', page)
  assert.equal(vm.runInContext(calls[0].code, page), 2)
  assert.deepEqual(calls.slice(1).map(x => x.file), ['js/rxjs.umd.min.js', 'js/defaults.js', 'js/messaging.js', 'js/playback-status.js', 'js/reader-css.js', 'js/reader.js'])
})
test('toolbar popup responds to the reader preference', async () => {
  let mode = 3
  const calls = []
  const context = vm.createContext({getSettings: async () => ({showHighlighting: mode}), brapi: {browserAction: {setPopup: async arg => calls.push(arg.popup)}}})
  vm.runInContext(manager, context)
  await context.syncActionPopup()
  mode = 1
  await context.syncActionPopup()
  assert.deepEqual(calls, ['', 'popup.html?isPopup=1'])
})
test('reader does not render another tabs speech', async () => {
  const current = {texts: null, position: null}
  const context = vm.createContext({
    current, tabId: 3, console,
    bgPageInvoke: async () => ({state: 'PLAYING', playingTabId: 2, speechInfo: {texts: ['wrong article'], position: {index: 0}}}),
    root: {classList: {toggle() {}}},
    isActive: () => false, renderBody: () => assert.fail('wrong article rendered'),
    renderPlaceholder() {}, updateButtons() {}, updateStatus() {},
  })
  vm.runInContext(reader.slice(reader.indexOf('  async function update()'), reader.indexOf('  function updateButtons()')), context)
  await context.update()
  assert.equal(current.state, 'STOPPED')
  assert.equal(current.texts, null)
})

const documentScript = fs.readFileSync('js/document.js', 'utf8')
function documentFixture({sourceReady = Promise.resolve({lang: 'en', detectedLang: 'en'}), voiceReady = Promise.resolve({voiceName: 'Test'})} = {}) {
  const calls = []
  const source = {
    ready: sourceReady, getUri: async () => 'test', close: () => calls.push('source-close'),
    getCurrentIndex: async () => 0, getTexts: async () => ['Test sentence.'], isWaiting: () => false,
  }
  const context = vm.createContext({
    console: {log() {}}, brapi: {storage: {local: {set: async () => {}}}},
    getSettings: async () => ({}), defaults: {rate: 1, pitch: 1, volume: 1}, config: {langMap: {}},
    truncateRepeatedChars: text => text, getSpeechVoice: () => voiceReady,
    Speech: function() {this.play = () => calls.push('play'); this.stop = () => calls.push('stop')},
  })
  vm.runInContext(documentScript.slice(documentScript.indexOf('function Doc(')), context)
  return {doc: new context.Doc(source, () => {}), calls}
}
for (const stage of ['source', 'voice']) {
  test(`closing the MV2 document during ${stage} preparation prevents late speech`, async () => {
    const gate = deferred()
    const f = documentFixture(stage === 'source' ? {sourceReady: gate.promise} : {voiceReady: gate.promise})
    const pending = f.doc.play()
    await tick()
    f.doc.close()
    gate.resolve(stage === 'source' ? {lang: 'en', detectedLang: 'en'} : {voiceName: 'Test'})
    await assert.rejects(pending, {name: 'CancellationException'})
    assert.deepEqual(f.calls, ['source-close'])
  })
}
test('closing the MV2 document stops active audio immediately', async () => {
  const f = documentFixture()
  await f.doc.play()
  f.doc.close()
  assert.deepEqual(f.calls, ['play', 'stop', 'source-close'])
})

test('concurrent reader requests share one MV2 injection', async () => {
  const gate = deferred(), calls = []
  const context = vm.createContext({brapi: {tabs: {
    executeScript: async (id, details) => {calls.push(details); if (details.code) {await gate.promise; return [0]}},
    sendMessage: async () => true,
  }}})
  vm.runInContext(manager, context)
  const first = context.showReader({id: 2})
  assert.equal(context.showReader({id: 2}), first)
  gate.resolve()
  await first
  assert.equal(calls.filter(call => call.file === 'js/defaults.js').length, 1)
})

test('TabSource cancellation releases the pending connection and rejects readiness immediately', async () => {
  const listeners = new Set()
  const context = vm.createContext({
    URL, config: {unsupportedSites: []}, getTab: async id => ({id, url: 'https://example.org/article'}),
    brapi: {runtime: {getURL: path => 'moz-extension://test/' + path, onConnect: {
      addListener: listener => listeners.add(listener), removeListener: listener => listeners.delete(listener),
    }}},
    extraAction: action => async value => {await action(value); return value},
    executeScript: async () => {}, setTimeout, clearTimeout,
  })
  vm.runInContext(documentScript.slice(documentScript.indexOf('function TabSource('), documentScript.indexOf('function Doc(')), context)
  const source = new context.TabSource(2)
  const rejected = assert.rejects(source.ready, {name: 'CancellationException'})
  await tick()
  assert.equal(listeners.size, 1)
  await source.close()
  await rejected
  assert.equal(listeners.size, 0)
})

const defaultsScript = fs.readFileSync('js/defaults.js', 'utf8')
const themeScript = defaultsScript.slice(defaultsScript.indexOf('if (location.protocol == "moz-extension:")'), defaultsScript.indexOf('\n\n\n/**\n * HELPERS', defaultsScript.indexOf('if (location.protocol == "moz-extension:")')))
test('reader injection does not initialize the extension theme on article pages', () => {
  const page = vm.createContext({location: {protocol: 'https:'}, immediate: () => assert.fail('article theme initialized')})
  assert.equal(vm.runInContext(themeScript, page), undefined)
})
for (const readyState of ['loading', 'complete']) {
  test(`DOM ready works without jQuery when document is ${readyState}`, async () => {
    let onReady
    const page = vm.createContext({document: {readyState, addEventListener: (name, callback) => {assert.equal(name, 'DOMContentLoaded'); onReady = callback}}})
    vm.runInContext(defaultsScript.slice(defaultsScript.indexOf('function domReady()'), defaultsScript.indexOf('function setI18nText()')), page)
    const promise = page.domReady()
    if (readyState === 'loading') onReady()
    else assert.equal(onReady, undefined)
    await promise
  })
}
