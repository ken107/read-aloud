const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

test('constructing engines and listing voices does not stop speech; first speak initializes once', async () => {
  const calls = []
  const voice = {voiceName: 'Test voice', lang: 'en-US'}
  const context = vm.createContext({
    brapi: {tts: {
      stop: () => calls.push('stop'),
      speak: text => calls.push(text),
      getVoices: callback => callback([voice]),
    }},
    isPiperVoice: () => false,
    isSupertonicVoice: () => false,
    isPocketTtsVoice: () => false,
  })
  const source = fs.readFileSync('js/tts-engines.js', 'utf8')
  vm.runInContext(source.slice(source.indexOf('function BrowserTtsEngine()'), source.indexOf('function WebSpeechEngine()')), context)
  const playerEngine = new context.BrowserTtsEngine()
  assert.deepEqual(calls, [])
  playerEngine.speak('first chunk', {voice}, () => {})
  assert.deepEqual(calls, ['stop', 'first chunk'])

  // Opening/reloading Options constructs its own engine for voice discovery.
  const optionsEngine = new context.BrowserTtsEngine()
  const voices = await optionsEngine.getVoices()
  assert.equal(voices[0], voice)
  assert.deepEqual(calls, ['stop', 'first chunk'])

  playerEngine.speak('next chunk', {voice}, () => {})
  assert.deepEqual(calls, ['stop', 'first chunk', 'next chunk'])
})
