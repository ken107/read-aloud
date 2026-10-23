const {test} = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')

async function openPopup(state, queryString) {
  const calls = []
  const handlers = {}
  let ready
  const element = {
    style: {setProperty() {}},
    setAttribute() {},
    addEventListener() {},
  }
  const context = vm.createContext({
    getQueryString: () => queryString,
    createPlaybackEstimate: () => ({}),
    $(selector) {
      if (typeof selector === 'function') { ready = selector; return }
      const chain = {
        click(handler) {
          if (handler) handlers[selector] = handler
          else handlers[selector]()
          return chain
        },
        attr() { return chain },
        text() { return chain },
        hide() { return chain },
        addClass() { return chain },
      }
      return chain
    },
    document: {getElementById: () => element, body: element},
    getComputedStyle: () => ({lineHeight: '20px'}),
    ResizeObserver: class { observe() {} },
    setInterval() {},
    getCurrentTab: async () => ({id: 10}),
    updateSettings: async () => {},
    getSettings: async () => ({showHighlighting: 2}),
    brapi: {i18n: {getMessage: () => ''}},
    bgPageInvoke: async (method, args) => {
      calls.push({method, args})
      if (method === 'getPlaybackState') return state
    },
  })
  vm.runInContext(fs.readFileSync(require.resolve('../js/popup.js'), 'utf8'), context)
  context.updateButtons = async () => {}
  context.refreshSize = () => {}
  ready()
  await new Promise(resolve => setImmediate(resolve))
  return JSON.parse(JSON.stringify(calls))
}

for (const state of ['PLAYING', 'LOADING', 'PAUSED', 'STOPPED']) {
  test(`separate window preserves the normal popup startup behavior when ${state}`, async () => {
    const calls = await openPopup(state, {tab: '42'})
    assert.equal(calls.some(call => call.method === 'stop'), false)
    assert.deepEqual(calls, [
      {method: 'getPlaybackState'},
      ...(['PAUSED', 'STOPPED'].includes(state) ? [{method: 'playTab', args: [42]}] : []),
    ])
  })
}

for (const state of ['PAUSED', 'STOPPED']) {
  test(`reader fallback does not automatically restart ${state} playback`, async () => {
    assert.deepEqual(await openPopup(state, {tab: '42', autoplay: '0'}), [{method: 'getPlaybackState'}])
  })
}
