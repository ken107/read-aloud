// The service worker owns creation across all player pages. A restarted worker
// discovers the surviving document instead of relying on in-memory state.
function makeOffscreenManager(api, clients, {timeout = 5000, pollInterval = 100} = {}) {
  let creating
  const url = api.runtime.getURL("offscreen.html")
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  async function bounded(operation) {
    let timer
    try {
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => timer = setTimeout(() => reject(new Error("Offscreen operation timed out")), timeout))
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  async function exists() {
    if (typeof api.offscreen.hasDocument == "function") return api.offscreen.hasDocument()
    if (typeof api.runtime.getContexts == "function") {
      return (await api.runtime.getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"], documentUrls: [url]})).length > 0
    }
    return (await clients.matchAll({includeUncontrolled: true})).some(client => client.url == url)
  }

  async function ready() {
    const deadline = Date.now() + timeout
    do {
      try {
        const response = await bounded(() => api.runtime.sendMessage({dest: "offscreen", method: "ping"}))
        if (response === true) return
      } catch (_) {
        // A document may be loading or shutting down; existence alone is not readiness.
      }
      if (Date.now() >= deadline) break
      await delay(pollInterval)
    } while (Date.now() < deadline)
    throw new Error("Offscreen document did not become ready")
  }

  async function setup() {
    if (!api.offscreen) throw new Error("Offscreen documents are unavailable")
    // Retry once if Chrome removes the document during setup. Do not close an
    // existing document: another player may own audio there.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (!await bounded(exists)) {
        try {
          await bounded(() => api.offscreen.createDocument({
            reasons: ["AUDIO_PLAYBACK"],
            justification: "Read Aloud would like to play audio in the background",
            url
          }))
        } catch (err) {
          // Another context (or a previous worker) may have won creation.
          if (!await bounded(exists)) throw err
        }
      }
      try {
        await ready()
        return true
      } catch (err) {
        if (attempt || await bounded(exists)) throw err
      }
    }
  }

  return function ensureOffscreen() {
    if (!creating) creating = setup().finally(() => creating = null)
    return creating
  }
}
