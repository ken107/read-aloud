// Estimate from observed text boundaries, excluding pauses, loading, and seeking.
function createPlaybackEstimate() {
  let previous, baseline, elapsed = 0, seconds = null
  return {update(state, speech, now) {
    if (!speech || state === 'STOPPED') {
      previous = baseline = null
      elapsed = 0
      seconds = null
      return null
    }
    const texts = speech.texts || []
    const index = Math.max(0, speech.position?.index || 0)
    const total = texts.reduce((sum, text) => sum + text.length, 0)
    const read = texts.slice(0, index).reduce((sum, text) => sum + text.length, 0)
    const key = `${speech.statusId}:${speech.navigationRevision}`
    if (!previous || previous.key !== key || read < previous.read || total !== previous.total) {
      baseline = null
      elapsed = 0
      seconds = null
    } else {
      if (state === 'PLAYING' && previous.state === 'PLAYING' && now - previous.now < 2000) elapsed += now - previous.now
      if (read > previous.read) {
        // Start at an observed boundary; opening the popup mid-chunk must not
        // count the entire chunk against only a fraction of its speaking time.
        if (!baseline) baseline = {read, elapsed}
        else if (elapsed - baseline.elapsed >= 10000) {
          const rate = (read - baseline.read) / ((elapsed - baseline.elapsed) / 1000)
          seconds = rate > 0 ? (total - read) / rate : null
        }
      }
    }
    previous = {key, read, total, now, state}
    return {percent: total ? Math.min(100, Math.floor(100 * read / total)) : 0, seconds}
  }}
}
