const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const defaults = readFileSync(require.resolve('../js/defaults.js'), 'utf8');
const context = vm.createContext({
  crypto: require('node:crypto'), rxjs: require('../js/rxjs.umd.min.js'), console,
  parseWordReplacements: () => ({rules: []}), immediate: fn => fn(),
  isPiperVoice: () => true, isSupertonicVoice: () => false, isPocketTtsVoice: () => false, isNghiTtsVoice: () => false,
  isGoogleTranslate: () => false, isUseMyPhone: voice => !!voice.isUseMyPhone,
  piperTtsEngine: {}, supertonicTtsEngine: {}, pocketTtsEngine: {}, nghiTtsEngine: {},
});
vm.runInContext(defaults.slice(defaults.indexOf('function isOfflineVoice(')).match(/^function[\s\S]*?\n}/)[0], context);
vm.runInContext(readFileSync(require.resolve('../js/speech.js'), 'utf8'), context);
function chunks(text, voice, lang = 'en') {
  const speech = new context.Speech([text], {voice, lang});
  const result = Array.from(speech.getInfo().texts);
  speech.stop();
  return result;
}
test('Firefox localService voices split sentences and preserve abbreviations and paragraphs', () => {
  assert.deepEqual(chunks('Dr. Smith reads. Next sentence.\n\nLast paragraph.', {localService: true}),
    ['Dr. Smith reads. ', 'Next sentence.\n\n', 'Last paragraph.']);
});
test('offline sentence chunking supports East Asian text', () => {
  assert.deepEqual(chunks('你好。世界。', {localService: true}, 'zh-CN'), ['你好。', '世界。']);
});
test('phone playback and nonlocal engine chunking remain unchanged', () => {
  const text = 'First sentence. Second sentence.';
  assert.deepEqual(chunks(text, {localService: true, isUseMyPhone: true}), [text]);
  assert.deepEqual(chunks(text, {localService: false}), [text]);
});
