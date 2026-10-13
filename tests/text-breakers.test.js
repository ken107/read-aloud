const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

// Load the extension's browser script without invoking Speech or its engines.
const context = vm.createContext({});
vm.runInContext(readFileSync(require.resolve('../js/speech.js'), 'utf8'), context);
const {WordBreaker, CharBreaker, SpaceDelimitedPunctuator, EastAsianPunctuator} = context;
const latin = new SpaceDelimitedPunctuator();
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

for (const [name, language, method, text, expected] of [
  ['Arabic question mark', 'ar', 'getSentences', 'كيف حالك؟ أنا بخير.', ['كيف حالك؟ ', 'أنا بخير.']],
  ['Arabic phrase punctuation', 'ar', 'getPhrases', 'أولاً،ثانياً؛ أخيراً', ['أولاً،', 'ثانياً؛ ', 'أخيراً']],
  ['Urdu full stop', 'ur', 'getSentences', 'یہ ٹھیک ہے۔ اگلا جملہ۔', ['یہ ٹھیک ہے۔ ', 'اگلا جملہ۔']],
  ['Hebrew sof pasuq', 'he', 'getSentences', 'סוף׃ הבא.', ['סוף׃ ', 'הבא.']],
  ['Hebrew abbreviations and maqaf', 'he', 'getWords', 'ד״ר ג׳ון בית־ספר', ['ד״ר ', 'ג׳ון ', 'בית־ספר']],
  ['Devanagari danda', 'hi', 'getSentences', 'नमस्ते। फिर मिलेंगे॥', ['नमस्ते। ', 'फिर मिलेंगे॥']],
  ['Bengali danda', 'bn', 'getSentences', 'প্রথম। দ্বিতীয়।', ['প্রথম। ', 'দ্বিতীয়।']],
  ['Myanmar sentence marks', 'my', 'getSentences', 'မင်္ဂလာပါ။ နေကောင်းလား။', ['မင်္ဂလာပါ။ ', 'နေကောင်းလား။']],
  ['Khmer sentence marks', 'km', 'getSentences', 'សួស្តី។ អរគុណ៕', ['សួស្តី។ ', 'អរគុណ៕']],
]) {
  test(name, () => assert.deepEqual(Array.from(context.createPunctuator(language)[method](text)), expected));
}

test('language routing handles region tags and keeps native voice counting strategies', () => {
  for (const lang of ['ar-SA', 'he-IL', 'fa', 'ur', 'hi', 'ru', 'en', undefined]) {
    assert.ok(context.createPunctuator(lang) instanceof SpaceDelimitedPunctuator);
  }
  for (const lang of ['zh-CN', 'JA', 'ko-KR']) assert.ok(context.createPunctuator(lang) instanceof EastAsianPunctuator);
  for (const lang of ['th-TH', 'lo', 'km-KH', 'my']) assert.ok(context.createPunctuator(lang) instanceof context.DictionaryPunctuator);
});

for (const [lang, input] of [
  ['th', 'ภาษาไทยเป็นภาษาที่สวยงาม'],
  ['lo', 'ພາສາລາວແມ່ນພາສາທີ່ສວຍງາມ'],
  ['km', 'ភាសាខ្មែរជាភាសាដ៏ស្រស់ស្អាត'],
  ['my', 'မြန်မာဘာသာစကားသည်လှပသည်'],
]) {
  test(`${lang} dictionary boundaries preserve text without requiring spaces`, () => {
    const punctuator = context.createPunctuator(lang);
    const words = Array.from(punctuator.getWords('  ' + input + '! '));
    assert.ok(words.length > 1);
    assert.equal(words.join(''), '  ' + input + '! ');
    const chunks = breakText(new CharBreaker(12, punctuator), input.repeat(4));
    assert.equal(chunks.join(''), input.repeat(4));
    assert.ok(chunks.every(chunk => chunk.length <= 12));
  });
}

test('oversized Arabic and Hebrew words retain vowel marks at chunk boundaries', () => {
  for (const input of ['سَ'.repeat(10), 'שָׁ'.repeat(10), 'क्‍ष'.repeat(10), '👩‍💻'.repeat(10)]) {
    const chunks = breakText(new CharBreaker(7, context.createPunctuator('ar')), input);
    const ends = new Set(Array.from(new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(input), part => part.index + part.segment.length));
    let offset = 0;
    for (const chunk of chunks) {
      offset += chunk.length;
      assert.ok(ends.has(offset));
      assert.ok(chunk.length <= 7);
    }
    assert.equal(chunks.join(''), input);
  }
});

test('graphemes larger than the request limit fall back without losing text', () => {
  const input = 'a' + '\u0301'.repeat(20);
  const chunks = breakText(new CharBreaker(4, latin), input);
  assert.equal(chunks.join(''), input);
  assert.ok(chunks.every(chunk => chunk.length <= 4));
});

test('older browsers without Intl.Segmenter retain a safe fallback', () => {
  const fallback = vm.createContext({Intl: {}});
  vm.runInContext(readFileSync(require.resolve('../js/speech.js'), 'utf8'), fallback);
  const punctuator = fallback.createPunctuator('th');
  const input = 'ภาษาไทย😀'.repeat(4);
  const chunks = Array.from(new fallback.CharBreaker(5, punctuator).breakText(input));
  assert.equal(chunks.join(''), input);
  assert.ok(chunks.every(chunk => chunk.length <= 5));
  for (const chunk of chunks) assert.doesNotMatch(chunk, /[\uD800-\uDFFF]/u);
});

for (const [lang, text, expected] of [
  ['en', 'Ask DR. Smith. Then leave.', ['Ask DR. Smith. ', 'Then leave.']],
  ['en', 'See Eq. 2 and Sec. 3. Done.', ['See Eq. 2 and Sec. 3. ', 'Done.']],
  ['en', 'Try e.g. apples, i.e. fruit. Done.', ['Try e.g. apples, i.e. fruit. ', 'Done.']],
  ['en', 'Try e. g. apples. Done.', ['Try e. g. apples. ', 'Done.']],
  ['en', 'A Ph.D. student arrived.', ['A Ph.D. student arrived.']],
  ['en', 'She has a Ph.D. Next comes work.', ['She has a Ph.D. ', 'Next comes work.']],
  ['en', 'Meet at 3 p.m. tomorrow.', ['Meet at 3 p.m. tomorrow.']],
  ['en', 'Meet at 3 p.m. Tomorrow is busy.', ['Meet at 3 p.m. ', 'Tomorrow is busy.']],
  ['en', 'Fruit etc. is available.', ['Fruit etc. is available.']],
  ['en', 'Fruit etc. Next topic.', ['Fruit etc. ', 'Next topic.']],
  ['en', 'Acme Inc. announced news.', ['Acme Inc. announced news.']],
  ['en', 'Acme Inc. Next topic.', ['Acme Inc. ', 'Next topic.']],
  ['en', 'The U.S. economy grew.', ['The U.S. economy grew.']],
  ['en', 'Lives in the U.S. Next topic.', ['Lives in the U.S. ', 'Next topic.']],
  ['en', 'J. R. Smith arrived.', ['J. R. Smith arrived.']],
  ['en', 'É. Durand arrived.', ['É. Durand arrived.']],
  ['de-DE', 'Siehe Abb. 2 bzw. Kap. 3.', ['Siehe Abb. 2 bzw. Kap. 3.']],
  ['de', 'Zum Beispiel z. B. Berlin.', ['Zum Beispiel z. B. Berlin.']],
  ['fr', 'Mme. Dupont lit la réf. 2.', ['Mme. Dupont lit la réf. 2.']],
  ['es', 'La Dra. García lee la pág. 2.', ['La Dra. García lee la pág. 2.']],
  ['pt-BR', 'A Profa. Silva lê a pág. 2.', ['A Profa. Silva lê a pág. 2.']],
  ['ru', 'См. рис. 2 на стр. 3.', ['См. рис. 2 на стр. 3.']],
  ['ru', 'А. С. Пушкин написал текст.', ['А. С. Пушкин написал текст.']],
  ['en', 'This is art. Next sentence.', ['This is art. ', 'Next sentence.']],
  ['en', 'An unmappedworddr. Next sentence.', ['An unmappedworddr. ', 'Next sentence.']],
  ['en', 'Wait... Next sentence.', ['Wait... ', 'Next sentence.']],
  ['en', 'He said “etc.” Next sentence.', ['He said “etc.” ', 'Next sentence.']],
  ['en', 'DR.\u200bSmith arrived.', ['DR.\u200bSmith arrived.']],
]) {
  test(`abbreviation (${lang}): ${text}`, () => {
    const result = Array.from(context.createPunctuator(lang).getSentences(text));
    assert.deepEqual(result, expected);
    assert.equal(result.join(''), text);
  });
}

test('Speech resumes Google native voice from spoken word boundary instead of chunk start', () => {
  const rxjsCode = readFileSync(require.resolve('../js/rxjs.umd.min.js'), 'utf8');
  const speechCode = readFileSync(require.resolve('../js/speech.js'), 'utf8');
  let now = 1000;
  const spoken = [];
  let currentOnEvent;
  const sandbox = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    Date: {now: () => now},
    Promise,
    Map,
    Set,
    RegExp,
    Object,
    Array,
    Math,
    Error,
    RangeError,
    Intl,
    parseWordReplacements: () => ({rules: []}),
    isGoogleNative: () => true,
    isChromeOSNative: () => false,
    isPiperVoice: () => false,
    isSupertonicVoice: () => false,
    isNghiTtsVoice: () => false,
    isAzure: () => false,
    isOpenai: () => false,
    isUseMyPhone: () => false,
    isGoogleTranslate: () => false,
    isAmazonPolly: () => false,
    isGoogleWavenet: () => false,
    isIbmWatson: () => false,
    isPremiumVoice: () => false,
    isReadAloudCloud: () => false,
    immediate: fn => fn(),
    piperTtsEngine: {},
    supertonicTtsEngine: {},
    nghiTtsEngine: {},
    TimeoutTtsEngine: function(baseEngine) { return baseEngine; },
    browserTtsEngine: {
      speak(utterance, options, onEvent) {
        spoken.push(utterance);
        currentOnEvent = onEvent;
        onEvent({type: 'start', charIndex: 0});
      },
      stop() {},
      pause() {},
      resume() {},
    },
  });
  vm.runInContext(rxjsCode, sandbox);
  vm.runInContext(speechCode, sandbox);

  // 1) When the engine emits 'word' boundary events, resume slices at event.charIndex.
  const speechWithEvents = new sandbox.Speech(['One two three four five.'], {
    voice: {voiceName: 'Google US English'},
    lang: 'en-US',
    rate: 1,
  });
  speechWithEvents.play();
  // An explicit boundary at zero means the first word is still being spoken.
  currentOnEvent({type: 'word', charIndex: 0});
  now += 1000;
  speechWithEvents.pause();
  speechWithEvents.play();
  assert.deepEqual(spoken, ['One two three four five.', 'One two three four five.']);
  spoken.length = 0;
  currentOnEvent({type: 'word', charIndex: 8}); // 'three four five.'
  speechWithEvents.pause();
  speechWithEvents.play();
  assert.deepEqual(spoken, ['three four five.']);

  // Zero is also a valid boundary relative to the resumed utterance.
  currentOnEvent({type: 'word', charIndex: 0});
  now += 1000;
  speechWithEvents.pause();
  speechWithEvents.play();
  assert.deepEqual(spoken, ['three four five.', 'three four five.']);

  // Without new boundaries, replay from the last known position.
  now += 1000;
  speechWithEvents.pause();
  speechWithEvents.play();
  assert.deepEqual(spoken, ['three four five.', 'three four five.', 'three four five.']);
  // Subsequent boundaries are relative to the resumed text, not the full chunk.
  currentOnEvent({type: 'word', charIndex: 6});
  speechWithEvents.pause();
  speechWithEvents.play();
  assert.equal(spoken.at(-1), 'four five.');
  speechWithEvents.stop();

  // 2) Without word events, elapsed time never advances the resume position.
  spoken.length = 0;
  const speechWithoutEvents = new sandbox.Speech(['Alpha beta gamma delta epsilon.'], {
    voice: {voiceName: 'Google US English'},
    lang: 'en-US',
    rate: 1,
  });
  speechWithoutEvents.play();
  now += 10000;
  speechWithoutEvents.pause();
  speechWithoutEvents.play();
  assert.deepEqual(spoken, ['Alpha beta gamma delta epsilon.', 'Alpha beta gamma delta epsilon.']);
  speechWithoutEvents.stop();
});
