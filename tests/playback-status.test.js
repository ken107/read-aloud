const {test} = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const ctx = vm.createContext({})
vm.runInContext(fs.readFileSync(require.resolve('../js/playback-status.js'), 'utf8'), ctx)

test('estimate waits for boundaries, excludes pauses, and resets after seeking or a new section', () => {
  const estimator = ctx.createPlaybackEstimate()
  const speech = {statusId: 'a', navigationRevision: 0, texts: Array(5).fill('x'.repeat(100)), position: {index: 0}}
  let now = 0
  const tick = state => estimator.update(state, speech, now += 500)
  assert.equal(tick('PLAYING').seconds, null)
  speech.position.index = 1
  assert.equal(tick('PLAYING').seconds, null)
  for (let i = 0; i < 20; i++) tick('PLAYING')
  for (let i = 0; i < 60; i++) tick('PAUSED')
  tick('PLAYING')
  speech.position.index = 2
  const result = tick('PLAYING')
  assert.equal(result.percent, 40)
  assert.equal(result.seconds, 31.5)
  speech.navigationRevision++
  assert.equal(tick('PLAYING').seconds, null)
  speech.statusId = 'b'
  assert.equal(tick('PLAYING').seconds, null)
  assert.equal(estimator.update('STOPPED', null, now), null)
})

test('empty and unknown positions stay finite', () => {
  const result = ctx.createPlaybackEstimate().update('LOADING', {texts: []}, 0)
  assert.equal(result.percent, 0)
  assert.equal(result.seconds, null)
})
