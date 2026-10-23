const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const source = fs.readFileSync('js/reader.js', 'utf8')
test('reader keeps progress separate from the truncatable voice name', () => {
  const els = {status: {}, voice: {}, progress: {}}
  let active = true
  const context = vm.createContext({els, isActive: () => active,
    playbackEstimate: {update: () => ({percent: 42})}, performance: {now: () => 0},
    brapi: {i18n: {getUILanguage: () => 'en'}}, message: key => key,
  })
  vm.runInContext(source.slice(source.indexOf('  function updateStatus('), source.indexOf('  async function onAction(')), context)
  const voiceName = 'A very long voice name that exceeds the available toolbar space'
  context.updateStatus('PLAYING', {voiceName})
  assert.equal(els.voice.textContent, voiceName)
  assert.equal(els.voice.title, voiceName)
  assert.equal(els.progress.textContent, ' · 42%')
  assert.equal(els.status.hidden, false)
  context.updateStatus('LOADING', {})
  assert.equal(els.voice.hidden, true)
  assert.equal(els.progress.textContent, 'playback_status_loading')
  active = false
  context.updateStatus('STOPPED', null)
  assert.equal(els.status.hidden, true)
})
