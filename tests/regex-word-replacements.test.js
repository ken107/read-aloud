const assert = require('node:assert/strict')
const {test} = require('node:test')
const {readFileSync} = require('node:fs')
const vm = require('node:vm')
const context = vm.createContext({})
const defaults = readFileSync(require.resolve('../js/defaults.js'), 'utf8')
vm.runInContext(defaults.slice(defaults.indexOf('function normalizeWordReplacements('), defaults.indexOf('function escapeHtml(')), context)
vm.runInContext(readFileSync(require.resolve('../js/speech.js'), 'utf8'), context)
const parse = context.parseWordReplacements
const replace = rules => context.createWordReplacer(parse(rules).rules)

test('literal replacements preserve boundaries, case folding and non-cascading behavior', () => {
  assert.equal(replace('cat = dog\ndog = fox\ne.g. = example')('Cat cats dog e.g.'), 'dog cats fox example')
  assert.equal(replace('cash = $1')('cash'), '$1')
})
test('regex removes attached and grouped references globally across paragraphs', () => {
  const apply = replace(String.raw`/\[\d+(?:\s*[,–-]\s*\d+)*\]/ =`)
  assert.equal(apply('Word[1], word[2, 3] and word[4–6].'), 'Word, word and word.')
  assert.equal(apply('Again[7].'), 'Again.')
})
test('regex parsing allows equals signs, escaped slashes and slash character classes', () => {
  assert.equal(replace('/a(?==b)/ = X')('a=b'), 'X=b')
  assert.equal(replace(String.raw`/a\/b/ = X`)('a/b'), 'X')
  assert.equal(replace('/[/=]/ = X')('/='), 'XX')
  assert.equal(replace('/x/ = a=b')('x'), 'a=b')
})
test('regex is case sensitive, has no word boundaries and supports captures', () => {
  assert.equal(replace('/(a)(b)/ = $2$1')('zab AB'), 'zba AB')
  assert.equal(parse('/a/ = x\n/A/ = y').errors.length, 0)
})
test('literal rules run first and regex rules run in listed order', () => {
  assert.equal(replace('/dog/ = fox\ncat = dog\n/fox/ = wolf')('cat'), 'wolf')
})
test('invalid rules are reported and skipped while valid rules still work', () => {
  const result = parse('/(/ = x\ncat = dog\nCAT = fox\nmissing\n = empty')
  assert.deepEqual(Array.from(result.errors, e => [e.line, e.code]), [[1, 'invalid_regex'], [3, 'duplicate'], [4, 'missing_separator'], [5, 'missing_word']])
  assert.equal(context.createWordReplacer(result.rules)('cat'), 'dog')
  assert.equal(parse('/a/ = x\n/a/ = y').errors[0].code, 'duplicate')
})
test('no rules and empty-match regexes terminate normally', () => {
  assert.equal(replace('')('text'), 'text')
  assert.equal(replace('/^/ = prefix ')('text'), 'prefixtext')
})


test('structured rows preserve explicit plain text and replacement whitespace', () => {
  const rules = [{type: 'text', from: '/a/', to: ' $1 '}, {type: 'regex', from: 'b(?==)', to: 'B'}]
  assert.equal(context.createWordReplacer(parse(rules).rules)('/a/ b='), ' $1  B=')
})
test('legacy invalid entries survive normalization and remain ignored', () => {
  const rows = context.normalizeWordReplacements('bad line\ncat = dog')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].invalid, 'missing_separator')
  assert.equal(context.createWordReplacer(parse(rows).rules)('bad line cat'), 'bad line dog')
})
