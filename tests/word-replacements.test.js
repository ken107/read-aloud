const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const read = file => fs.readFileSync(require.resolve('../' + file), 'utf8');
const defaults = read('js/defaults.js');
const context = vm.createContext({});
vm.runInContext(defaults.slice(defaults.indexOf('function parseWordReplacements'), defaults.indexOf('function escapeHtml')), context);
const speech = read('js/speech.js');
vm.runInContext(speech.slice(speech.indexOf('function createWordReplacer')), context);
const parse = text => JSON.parse(JSON.stringify(context.parseWordReplacements(text)));
const replace = (rules, text) => context.createWordReplacer(parse(rules).rules)(text);

test('parses valid rules and reports invalid and case-insensitive duplicate lines', () => {
  const result = parse('GIF = jif\ninvalid\n = missing\ngif = duplicate\nskip =\nformula = a=b');
  assert.deepEqual(result.rules, [{from:'GIF',to:'jif'},{from:'skip',to:''},{from:'formula',to:'a=b'}]);
  assert.deepEqual(result.errors.map(x => [x.line,x.code]), [[2,'missing_separator'],[3,'missing_word'],[4,'duplicate']]);
  assert.equal(result.errors[2].firstLine,1);
  assert.deepEqual(parse(undefined),{rules:[],errors:[]});
});

test('uses whole words, case-insensitive matching, literal punctuation and skips', () => {
  assert.equal(replace('GIF = jif\ne.g. = for example\n[citation needed] =','gif GIF gift e.g. [citation needed]'), 'jif jif gift for example ');
  assert.equal(replace('cat = dog','cat cats _cat cat2 écat caté'), 'dog cats _cat cat2 écat caté');
});

test('prefers longer phrases and does not recursively replace the result', () => {
  assert.equal(replace('New York = NYC\nNew = old\nNYC = city','New York; New; NYC'), 'NYC; old; city');
  assert.equal(replace('price = $&','price'), '$&');
});

test('default settings load and reset include word replacements', async () => {
  let loaded, removed;
  const settings = vm.createContext({brapi:{storage:{local:{get:(keys,done)=>{loaded=keys;done({})},remove:(keys,done)=>{removed=keys;done()}}}}});
  vm.runInContext(defaults.slice(defaults.indexOf('function getSettings('),defaults.indexOf('async function getSetting(')),settings);
  await settings.getSettings(); await settings.clearSettings();
  assert.ok(loaded.includes('wordReplacements')); assert.ok(removed.includes('wordReplacements'));
});

test('speech applies replacements before chunking and highlighting', () => {
  const engine = {};
  const environment = {crypto:require("node:crypto"), isOfflineVoice:()=>true, rxjs:require('../js/rxjs.umd.min.js'), console,
    parseWordReplacements:context.parseWordReplacements,
    immediate:fn=>fn(), isPiperVoice:()=>true, isSupertonicVoice:()=>false, isNghiTtsVoice:()=>false,
    isGoogleTranslate:()=>false, piperTtsEngine:engine, supertonicTtsEngine:{}, nghiTtsEngine:{}};
  const runtime = vm.createContext(environment);
  vm.runInContext(speech,runtime);
  const result = new runtime.Speech(['GIF'],{voice:{voiceName:'Piper Test'},lang:'en',wordReplacements:'GIF = jif'});
  assert.deepEqual(Array.from(result.getInfo().texts),['jif.']);
  result.stop();
});
