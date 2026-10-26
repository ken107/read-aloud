const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

// Exercise the actual trimming loops without needing a browser DOM.
const source = readFileSync(require.resolve('../js/content/html-doc.js'), 'utf8');
const trimming = source.slice(source.indexOf('      var head, tail;'), source.indexOf('      if (head||tail)'));
const gaussian = source.slice(source.indexOf('  function Gaussian()'), source.indexOf('  function getTexts(elem)'));
const trim = vm.runInNewContext(`(function(texts) { ${gaussian} ${trimming} return [head, tail]; })`);

function reference(texts) {
  function threshold(start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) sum += texts[i].length;
    const mean = sum / (end - start);
    let deviations = 0;
    for (let i = start; i < end; i++) deviations += (texts[i].length - mean) ** 2;
    return mean + 2 * Math.sqrt(deviations / (end - start));
  }
  let head, tail;
  for (let i = 3; i < texts.length && !head; i++) {
    if (texts[i].length > threshold(0, i)) head = i;
  }
  for (let i = texts.length - 4; i >= 0 && !tail; i--) {
    if (texts[i].length > threshold(i + 1, texts.length)) tail = i + 1;
  }
  return [head, tail];
}
const chunks = lengths => lengths.map(length => ({length}));

test('trimming preserves boundaries for short, uniform, and outlier inputs', () => {
  for (const lengths of [[], [3], [3, 4], [3, 4, 5], [3, 3, 3, 3],
    [3, 3, 3, 100, 3, 3, 3], [100, 3, 3, 3], [3, 3, 3, 100],
    [3, 4, 5, 8, 9, 10, 100, 10, 9, 8, 5, 4, 3],
    [100000000, 100000001, 100000002, 100000004]]) {
    assert.deepEqual(Array.from(trim(chunks(lengths))), reference(chunks(lengths)));
  }
});

test('trimming agrees with the population-variance reference across deterministic varied inputs', () => {
  let seed = 12345;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let trial = 0; trial < 2000; trial++) {
    const texts = chunks(Array.from({length: random() % 150}, () => 3 + random() % 1000));
    assert.deepEqual(Array.from(trim(texts)), reference(texts), `trial ${trial}`);
  }
});

test('a large no-outlier input requires only linear chunk reads', () => {
  let reads = 0;
  const texts = Array.from({length: 100000}, () => ({get length() { reads++; return 10; }}));
  assert.deepEqual(Array.from(trim(texts)), [undefined, undefined]);
  assert.ok(reads <= 4 * texts.length, `${reads} length reads`);
});

// For [3, 6, 9], mean = 6 and population variance = 6. A length of 12
// exceeds the corrected threshold (~10.90), but not the old one (~14.49).
test('population variance detects content from both ends', () => {
  assert.deepEqual(Array.from(trim(chunks([3, 6, 9, 12, 9, 6, 3]))), [3, 4]);
});
