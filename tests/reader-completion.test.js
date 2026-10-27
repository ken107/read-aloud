const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const reader = fs.readFileSync('js/reader.js', 'utf8')

for (const [label, stateInfo, owner, closes] of [
  ['natural completion', {state: 'STOPPED', playbackCompleted: true}, 1, true],
  ['manual stop', {state: 'STOPPED'}, 1, false],
  ['pause', {state: 'PAUSED'}, 1, false],
  ['loading', {state: 'LOADING'}, 1, false],
  ['error', {state: 'STOPPED', playbackCompleted: true, playbackError: {}}, 1, false],
  ['other tab completion', {state: 'STOPPED', playbackCompleted: true}, 2, false],
]) {
  test(`reader closes only for its own natural completion: ${label}`, async () => {
    const modes = []
    const context = vm.createContext({
      current: {}, tabId: 1, console,
      bgPageInvoke: async () => stateInfo,
      brapi: {storage: {local: {get: async () => ({playingTabId: owner})}}},
      setMode: mode => modes.push(mode), showError() {},
      root: {classList: {toggle() {}}}, isActive: () => false,
      renderPlaceholder() {}, updateStatus() {}, updateButtons() {},
    })
    vm.runInContext(reader.slice(reader.indexOf('  async function update()'), reader.indexOf('  function updateButtons()')), context)
    await context.update()
    assert.deepEqual(modes, closes ? ['closed'] : [])
  })
}

test('player records natural completion, resets on start/stop, and ignores stale callbacks', () => {
  const source = fs.readFileSync('js/player.js', 'utf8')
  const docs = []
  const context = vm.createContext({
    activeDoc: null, playbackCompleted: false,
    Doc: function(_, end) {this.end = end; this.close = this.stop = () => {}; docs.push(this)},
    handleError() {}, idleSubject: {next() {}},
  })
  vm.runInContext(source.slice(source.indexOf('function openDoc('), source.indexOf('function forward(')), context)
  vm.runInContext(source.slice(source.indexOf('function stop()'), source.indexOf('function pause()')), context)
  const input = {getUri: () => 'test'}
  context.openDoc(input)
  docs[0].end()
  assert.equal(context.playbackCompleted, true)
  context.openDoc(input)
  assert.equal(context.playbackCompleted, false)
  docs[0].end()
  assert.equal(context.activeDoc, docs[1])
  assert.equal(context.playbackCompleted, false)
  docs[1].end(new Error('failed'))
  assert.equal(context.playbackCompleted, false)
  context.openDoc(input)
  context.stop()
  docs[2].end()
  assert.equal(context.playbackCompleted, false)
})
