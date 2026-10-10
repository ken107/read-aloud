const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

// Load the extension's browser script without invoking Speech or its engines.
const context = vm.createContext({});
vm.runInContext(readFileSync(require.resolve('../js/speech.js'), 'utf8'), context);
const {WordBreaker, CharBreaker, LatinPunctuator, EastAsianPunctuator} = context;
const latin = new LatinPunctuator();
const eastAsian = new EastAsianPunctuator();
const breakText = (breaker, text) => Array.from(breaker.breakText(text));

const cases = [
  ['empty word input', new WordBreaker(4, latin), '', []],
  ['empty character input', new CharBreaker(10, latin), '', []],
  ['word breaker preserves sentence boundaries', new WordBreaker(20, latin), 'One. Two.', ['One. ', 'Two.']],
  ['word breaker preserves paragraph boundaries', new WordBreaker(20, latin), 'One\n\nTwo', ['One\n\n', 'Two']],
  ['phrases pack exactly to word limit', new WordBreaker(4, latin), 'a b, c d, e', ['a b, c d, ', 'e']],
  ['oversized phrase uses balanced halves', new WordBreaker(6, latin), 'a b c d e f g', ['a b c d ', 'e f g']],
  ['very long phrase uses multiple limited groups', new WordBreaker(3, latin), 'a b c d e f g h', ['a b c ', 'd e f ', 'g h']],
  ['split phrase stays separate from neighbors', new WordBreaker(3, latin), 'x, a b c d, y', ['x, ', 'a b ', 'c d, ', 'y']],
  ['word breaker keeps a long word intact', new WordBreaker(1, latin), 'abcdefgh', ['abcdefgh']],
  ['character breaker combines paragraphs by default', new CharBreaker(20, latin), 'a\n\nb', ['a\n\nb']],
  ['paragraph threshold accepts equality', new CharBreaker(20, latin, 4), 'a\n\nb', ['a\n\nb']],
  ['paragraph threshold prevents combining', new CharBreaker(20, latin, 3), 'a\n\nb', ['a\n\n', 'b']],
  ['paragraph threshold does not split a paragraph', new CharBreaker(20, latin, 3), 'abcdef', ['abcdef']],
  ['zero paragraph threshold uses character limit', new CharBreaker(20, latin, 0), 'a\n\nb', ['a\n\nb']],
  ['character breaker packs sentences', new CharBreaker(6, latin), 'A. B. C.', ['A. B. ', 'C.']],
  ['character breaker packs phrases', new CharBreaker(6, latin), 'a, b, c', ['a, b, ', 'c']],
  ['character breaker packs words', new CharBreaker(4, latin), 'a b c d', ['a b ', 'c d']],
  ['oversized word slices stay separate', new CharBreaker(4, latin), 'x abcdef y', ['x ', 'abcd', 'ef ', 'y']],
  ['oversized sentence tail stays separate', new CharBreaker(6, latin), 'abcdefg. X.', ['abcdef', 'g. ', 'X.']],
  ['oversized paragraph tail stays separate', new CharBreaker(6, latin), 'abcdefg\n\nx', ['abcdef', 'g\n\n', 'x']],
  ['abbreviation remains within sentence', new WordBreaker(20, latin), 'Dr. Smith. Hi.', ['Dr. Smith. ', 'Hi.']],
  ['East Asian sentence boundaries', new WordBreaker(20, eastAsian), '你好。世界。', ['你好。', '世界。']],
  ['East Asian character splitting', new CharBreaker(2, eastAsian), '你好世界', ['你好', '世界']],
  ['UTF-16 counting is preserved', new CharBreaker(2, latin), '😀😀', ['😀', '😀']],
];
for (const [name, breaker, input, expected] of cases) {
  test(name, () => assert.deepEqual(breakText(breaker, input), expected));
}

test('each call starts with an empty collector', () => {
  const breaker = new CharBreaker(4, latin);
  assert.deepEqual(breakText(breaker, 'abcdef'), ['abcd', 'ef']);
  assert.deepEqual(breakText(breaker, 'xy'), ['xy']);
});

test('Latin chunks preserve text and satisfy limits across many boundaries', () => {
  const input = 'Dr. Smith reads, then pauses; next comes a verylongword. Another sentence!\n\nLast paragraph.';
  for (let limit = 1; limit <= 40; limit++) {
    const chars = breakText(new CharBreaker(limit, latin), input);
    assert.equal(chars.join(''), input);
    assert.ok(chars.every(chunk => chunk.length <= limit));
    const words = breakText(new WordBreaker(limit, latin), input);
    assert.equal(words.join(''), input);
    assert.ok(words.every(chunk => latin.getWords(chunk).length <= limit));
  }
});
