const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const source = fs.readFileSync('js/defaults.js', 'utf8')
for (const readyState of ['loading', 'interactive', 'complete']) {
  test(`theme initializes with document ${readyState} without jQuery`, async () => {
    let ready, applied
    const context = vm.createContext({brapi: {commands: {}}, window: {},
      getSettings: async () => ({darkMode: true}),
      document: {readyState, addEventListener: (name, callback, options) => {
        assert.equal(name, 'DOMContentLoaded'); assert.equal(options.once, true); ready = callback
      }, body: {classList: {toggle: (name, value) => {applied = [name, value]}}}},
    })
    vm.runInContext(source.slice(source.indexOf('async function setupDarkMode('), source.indexOf('function lazy(')), context)
    vm.runInContext(source.slice(source.indexOf('function domReady('), source.indexOf('function setI18nText(')), context)
    const pending = context.setupDarkMode()
    if (readyState === 'loading') {assert.equal(applied, undefined); ready()}
    else assert.equal(ready, undefined)
    await pending
    assert.deepEqual(applied, ['dark-mode', true])
  })
}
