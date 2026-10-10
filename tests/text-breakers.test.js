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

for (const [name, punctuator, method, input, expected] of [
  ['Latin leading separators', latin, 'getWords', '/usr/local/bin', ['/usr/', 'local/', 'bin']],
  ['Latin leading whitespace and symbols', latin, 'getWords', '  #tag', ['  #', 'tag']],
  ['Korean whitespace', eastAsian, 'getWords', ' 저는 학교에 갑니다 ', [' 저', '는 ', '학', '교', '에 ', '갑', '니', '다 ']],
  ['East Asian supplementary characters', eastAsian, 'getWords', '甲😀𠀀乙', ['甲', '😀', '𠀀', '乙']],
  ['Latin closing quotes', latin, 'getSentences', 'He said "Hello." Then left.', ['He said "Hello." ', 'Then left.']],
  ['Latin nested closing punctuation', latin, 'getSentences', '(She said “Go!”) Next.', ['(She said “Go!”) ', 'Next.']],
  ['East Asian closing quotes', eastAsian, 'getSentences', '「你好。」然后走了。', ['「你好。」', '然后走了。']],
  ['East Asian fullwidth questions', eastAsian, 'getSentences', '你好吗？我很好。', ['你好吗？', '我很好。']],
  ['East Asian mixed sentence endings', eastAsian, 'getSentences', '「本当！？」 次。', ['「本当！？」 ', '次。']],
  ['zero-width abbreviation separator', latin, 'getSentences', 'Dr.\u200bSmith arrived. Next.', ['Dr.\u200bSmith arrived. ', 'Next.']],
]) {
  test(name, () => assert.deepEqual(Array.from(punctuator[method](input)), expected));
}

test('all punctuator stages preserve text exactly', () => {
  for (const punctuator of [latin, eastAsian]) {
    for (const method of ['getParagraphs', 'getSentences', 'getPhrases', 'getWords']) {
      for (const input of ['', ' \t\n', '/-—', '  /usr/local/bin', '  #tag + value', '저는 학교에 갑니다', '甲😀𠀀乙', '「你好。」\n\nNext.\u200bDone!', 'Dr. Smith said “Hi.” Then left.']) {
        assert.equal(punctuator[method](input).join(''), input, `${method}: ${JSON.stringify(input)}`);
      }
    }
  }
});

test('both breakers preserve text and Unicode across splitting boundaries', () => {
  const inputs = [' /usr/local/bin', ' 저는 학교에 갑니다 ', '甲'.repeat(71) + '😀𠀀' + '乙'.repeat(72), 'abc😀def𠀀ghi'];
  for (const punctuator of [latin, eastAsian]) {
    for (const input of inputs) {
      for (const limit of [2, 3, 4, 36, 72]) {
        for (const Breaker of [WordBreaker, CharBreaker]) {
          const chunks = breakText(new Breaker(limit, punctuator), input);
          assert.equal(chunks.join(''), input);
          for (const chunk of chunks) {
            // With /u, valid surrogate pairs are consumed as code points and
            // cannot match this range; only isolated surrogates match.
            assert.doesNotMatch(chunk, /[\uD800-\uDFFF]/u);
            if (Breaker === CharBreaker) assert.ok(chunk.length <= limit);
          }
        }
      }
    }
  }
});

test('an impossible one-unit limit rejects a supplementary character', () => {
  assert.throws(() => new CharBreaker(1, latin).breakText('😀'), {name: 'RangeError'});
});
