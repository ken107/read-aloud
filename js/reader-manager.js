/**
 * Reader mode (showHighlighting == 3): the toolbar button opens an in-page
 * reader overlay instead of the popup.
 */
const READER_FONTS = [
  {family: "ReadAloud Reader Serif", style: "normal", weight: "400 700", subset: "latin",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbNJYQ.woff2",
    unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"},
  {family: "ReadAloud Reader Serif", style: "italic", weight: "400 700", subset: "latin",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9XfjOCX1hbuyalUrK439vogqC9yFZCYg7oRZaLFYYzbA.woff2",
    unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"},
  {family: "ReadAloud Reader Sans", style: "normal", weight: "400 700", subset: "latin",
    url: "https://fonts.gstatic.com/s/nunitosans/v19/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t1R-s.woff2",
    unicodeRange: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"},
  {family: "ReadAloud Reader Serif", style: "normal", weight: "400 700", subset: "latin-ext",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbDJYQraA.woff2",
    unicodeRange: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"},
  {family: "ReadAloud Reader Serif", style: "italic", weight: "400 700", subset: "latin-ext",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9XfjOCX1hbuyalUrK439vogqC9yFZCYg7oRZaLFYgzbBZD.woff2",
    unicodeRange: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"},
  {family: "ReadAloud Reader Sans", style: "normal", weight: "400 700", subset: "latin-ext",
    url: "https://fonts.gstatic.com/s/nunitosans/v19/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t7R-tCKQ.woff2",
    unicodeRange: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF"},
  {family: "ReadAloud Reader Serif", style: "normal", weight: "400 700", subset: "vietnamese",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbCJYQraA.woff2",
    unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB"},
  {family: "ReadAloud Reader Serif", style: "italic", weight: "400 700", subset: "vietnamese",
    url: "https://fonts.gstatic.com/s/newsreader/v26/cY9XfjOCX1hbuyalUrK439vogqC9yFZCYg7oRZaLFYkzbBZD.woff2",
    unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB"},
  {family: "ReadAloud Reader Sans", style: "normal", weight: "400 700", subset: "vietnamese",
    url: "https://fonts.gstatic.com/s/nunitosans/v19/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t6R-tCKQ.woff2",
    unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB"},
]

async function isReaderMode() {
  const {showHighlighting} = await getSettings(["showHighlighting"])
  return showHighlighting == 3
}

async function syncActionPopup() {
  const popup = await isReaderMode() ? "" : "popup.html?isPopup=1"
  await brapi.browserAction.setPopup({popup})
}

async function onActionClicked(tab) {
  const readerState = await sendToReader(tab.id, {method: "getState"}).catch(err => null)
  const {state, playingTabId} = await getReaderState()
  const isSource = playingTabId == tab.id && state != "STOPPED"
  if (readerState == "expanded" && isSource) {
    if (state == "PLAYING") await pause()
    else if (state == "PAUSED") await resume()
  }
  else if (isSource) {
    await showReader(tab)
  }
  else {
    await playTab(tab.id)
  }
}

async function activateReader(tabId) {
  const tab = await getTab(tabId)
  try {
    await onActionClicked(tab)
  }
  catch (err) {
    if (err.name == "CancellationException") return
    console.error(err)
    const shown = await sendToReader(tab.id, {method: "showError", args: [errorToJson(err)]}).then(() => true, () => false)
    if (!shown) await openPopupWindow(tab.id)
  }
}

const pendingReaders = new Map()
function showReader(tab) {
  if (!pendingReaders.has(tab.id)) {
    pendingReaders.set(tab.id, createReader(tab).finally(() => pendingReaders.delete(tab.id)))
  }
  return pendingReaders.get(tab.id)
}

async function createReader(tab) {
  const [injected] = await brapi.tabs.executeScript(tab.id, {
    code: 'typeof readAloudReader != "undefined" ? 2 : typeof settingsChange$ != "undefined" ? 1 : 0'
  })
  const files = [
    ...(injected < 1 ? ["js/rxjs.umd.min.js", "js/defaults.js", "js/messaging.js"] : []),
    ...(injected < 2 ? ["js/playback-status.js", "js/reader-css.js", "js/reader.js"] : []),
  ]
  for (const file of files) await brapi.tabs.executeScript(tab.id, {file})
  await sendToReader(tab.id, {method: "show", args: [{tabId: tab.id, favIconUrl: tab.favIconUrl}]})
}

async function sendToReader(tabId, message) {
  message.dest = "readerOverlay"
  const result = await brapi.tabs.sendMessage(tabId, message, {frameId: 0})
  if (result && result.error) throw result.error
  return result
}

async function openPopupWindow(tabId) {
  const url = brapi.runtime.getURL("popup.html?autoplay=0&tab=" + tabId)
  //reuse an already open popup page rather than stacking windows
  const views = brapi.extension.getViews({type: "tab"})
  const view = views.find(view => view.location.href.startsWith(brapi.runtime.getURL("popup.html")))
  const existing = view && await view.browser.tabs.getCurrent()
  if (existing) {
    if (existing.url != url) await updateTab(existing.id, {url})
    await updateTab(existing.id, {active: true})
    await updateWindow(existing.windowId, {focused: true}).catch(console.error)
  }
  else {
    await createWindow({
      url,
      focused: true,
      type: "popup",
      width: 500,
      height: 600,
    })
  }
}

function openOptionsPage() {
  return brapi.runtime.openOptionsPage()
}

async function getReaderFonts(subsets) {
  const cache = await caches.open("reader-fonts")
  return Promise.all(
    READER_FONTS
      .filter(font => subsets.includes(font.subset))
      .map(async font => {
        let response = await cache.match(font.url)
        if (!response) {
          response = await fetch(font.url)
          if (!response.ok) throw new Error("Failed to fetch font " + font.url)
          await cache.put(font.url, response.clone())
        }
        const {family, style, weight, unicodeRange} = font
        return {family, style, weight, unicodeRange, data: bytesToBase64(await response.arrayBuffer())}
      })
  )
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}
