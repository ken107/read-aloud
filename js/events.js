
brapi.runtime.onInstalled.addListener(function() {
  installContentScripts()
  installContextMenus()
  syncActionPopup().catch(console.error)
})

brapi.runtime.onStartup.addListener(function() {
  syncActionPopup().catch(console.error)
})

settingsChange$.pipe(rxjs.filter(changes => changes.showHighlighting))
  .subscribe(() => syncActionPopup().catch(console.error))

brapi.action.onClicked.addListener(function(tab) {
  activateReader(tab.id)
    .catch(handleHeadlessError)
})


/**
 * IPC handlers
 */
var handlers = {
  ensureOffscreen: makeOffscreenManager(brapi, self.clients),
  playText: playText,
  playTab: playTab,
  reloadAndPlayTab: reloadAndPlayTab,
  stop: stop,
  pause: pause,
  resume: resume,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
  reportIssue: reportIssue,
  authWavenet: authWavenet,
  managePiperVoices,
  manageSupertonicVoices,
  managePocketTtsVoices,
  manageNghiTtsVoices,
  activateReader,
  openPopupWindow,
  openOptionsPage,
  getReaderFonts,
}

registerMessageListener("serviceWorker", handlers)


/**
 * Installers
 */
async function installContentScripts() {
  const scripts = [
    {
      matches: ["https://docs.google.com/document/*"],
      id: "google-docs",
      js: ["js/page/google-doc.js"],
      runAt: "document_start",
      world: "MAIN"
    },
  ]
  const registeredIds = await brapi.scripting.getRegisteredContentScripts({ids: scripts.map(x => x.id)})
    .then(scripts => scripts.map(x => x.id))
    .catch(err => {
      console.error(err)
      return []
    })
  if (registeredIds.length) {
    console.info("Already registered content scripts", registeredIds)
  }
  const scriptsToRegister = scripts.filter(script => !registeredIds.includes(script.id))
  for (const script of scriptsToRegister) {
    await brapi.scripting.registerContentScripts([script])
      .then(() => console.info("Successfully registered content script", script.id))
      .catch(err => console.error("Failed to register content script", script.id, err))
  }
}

function installContextMenus() {
  if (brapi.contextMenus)
  brapi.contextMenus.create({
    id: "read-selection",
    title: brapi.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  },
  function() {
    if (brapi.runtime.lastError) console.error(brapi.runtime.lastError)
    else console.info("Installed context menus")
  })
}


/**
 * Context menu handlers
 */
if (brapi.contextMenus)
brapi.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection")
    Promise.resolve()
      .then(function() {
        if (tab && tab.id != -1) return detectTabLanguage(tab.id)
        else return undefined
      })
      .then(function(lang) {
        return playText(info.selectionText, {lang: lang})
      })
      .catch(handleHeadlessError)
})


/**
 * Shortcut keys handlers
 */
if (brapi.commands)
brapi.commands.onCommand.addListener(function(command) {
  if (command == "play" || command == "pause") {
    getPlaybackState()
      .then(function(stateInfo) {
        switch (stateInfo.state) {
          case "PLAYING": return command == "pause" ? pause() : stop()
          case "PAUSED": return resume()
          case "STOPPED": return playTab()
        }
      })
      .catch(handleHeadlessError)
  }
  else if (command == "stop") {
    stop()
      .catch(handleHeadlessError)
  }
  else if (command == "forward") {
    forward()
      .catch(handleHeadlessError)
  }
  else if (command == "rewind") {
    rewind()
      .catch(handleHeadlessError)
  }
})


/**
 * Listener for external calls
 */
brapi.runtime.onMessageExternal.addListener(
  (request, sender) => {
    if (request.method == "play" && typeof request.text == "string") {
      playText(request.text)
        .catch(handleHeadlessError)
    }
    else if (request.method == "pause") {
      pause()
        .catch(handleHeadlessError)
    }
    else if (request.method == "stop") {
      stop()
        .catch(handleHeadlessError)
    }
    else if (request.method == "resume") {
      resume()
        .catch(handleHeadlessError)
    }
    else {
      handleHeadlessError(new Error("Bad method call"))
    }
  })



/**
 * METHODS
 */
var currentTask = {
  task: null,
  isActive() {
    return this.task && this.task.isActive
  },
  begin(onCancel) {
    if (this.task) this.task.cancel()
    return this.task = {
      isActive: true,
      cancel() {
        if (!this.isActive) return
        this.isActive = false
        if (onCancel) onCancel()
      },
      check() {
        if (!this.isActive) throw Object.assign(new Error("Canceled"), {name: "CancellationException"})
      },
      end() {
        this.check()
        this.isActive = false
      }
    }
  },
  cancel() {
    if (this.task) {
      this.task.cancel()
      this.task = null
    }
  }
}

async function playText(text, opts) {
  await brapi.storage.local.remove("playingTabId")
  const hasPlayer = await stop().then(res => res == true, err => false)
  if (!hasPlayer) await injectPlayer(await getActiveTab())
  await sendToPlayer({method: "playText", args: [text, opts]})
}

async function playTab(tabId) {
  const tab = tabId ? await getTab(tabId) : await getActiveTab()
  if (!tab) throw new Error(JSON.stringify({code: "error_page_unreadable"}))

  // Join repeated starts until preparation is canceled or playback reaches the player.
  let pending = pendingPlayTabs.get(tab.id)
  if (!pending) {
    const release = () => {
      if (pendingPlayTabs.get(tab.id) === pending) pendingPlayTabs.delete(tab.id)
    }
    pending = startPlayTab(tab, release).finally(release)
    pendingPlayTabs.set(tab.id, pending)
  }
  return pending
}

const pendingPlayTabs = new Map()

async function startPlayTab(tab, release) {
  const task = currentTask.begin(release)
  // Browser operations may finish after cancellation. Never continue the startup
  // or touch the player on behalf of a canceled request.
  async function checked(promise) {
    const result = await promise
    task.check()
    return result
  }
  let readerUnavailable = false
  try {
    const handler = contentHandlers.find(h => h.match(tab.url || "", tab.title))
    if (handler.validate) await checked(handler.validate(tab))
    if (handler.getSourceUri) {
      await checked(brapi.storage.local.set({"sourceUri": handler.getSourceUri(tab)}))
    }
    else {
      const frameId = handler.getFrameId && await checked(getAllFrames(tab.id).then(frames => handler.getFrameId(frames)))
      if (!await checked(contentScriptAlreadyInjected(tab, frameId))) {
        await checked(injectContentScript(tab, frameId, handler.extraScripts))
      }
      await checked(brapi.storage.local.set({"sourceUri": "contentscript:" + tab.id}))
    }

    if (await checked(isReaderMode())) {
      await checked(showReader(tab).catch(err => {
        console.warn("Cannot show reader", err)
        readerUnavailable = true
      }))
    }

    // Stop the old audio without canceling this startup task, as public stop() does.
    const hasPlayer = await checked(sendToPlayer({method: "stop"}).then(res => res == true, err => false))
    if (!hasPlayer) await checked(injectPlayer(tab))
    // The reader must not attribute the previous player's speech to this tab.
    await checked(brapi.storage.local.set({playingTabId: tab.id}))
  }
  finally {
    task.end()
  }
  // No async gap between releasing startup and handing cancellation to the player.
  release()
  await sendToPlayer({method: "playTab"})
  if (readerUnavailable) await openPopupWindow(tab.id)
}

async function reloadAndPlayTab(tabId) {
  const tab = tabId ? await getTab(tabId) : await getActiveTab()

  const task = currentTask.begin()
  try {
    const tabLoadComplete = new Promise(fulfill => {
      function listener(changeTabId, changeInfo) {
        if (changeTabId == tab.id && changeInfo.status == "complete") {
          brapi.tabs.onUpdated.removeListener(listener)
          fulfill()
        }
      }
      brapi.tabs.onUpdated.addListener(listener)
    })
    await brapi.tabs.reload(tab.id)
    await tabLoadComplete
  }
  finally {
    task.end()
  }

  await playTab(tab.id)
}

function stop() {
  currentTask.cancel()
  return sendToPlayer({method: "stop"})
}

function pause() {
  return sendToPlayer({method: "pause"})
}

function resume() {
  return sendToPlayer({method: "resume"})
}

async function getPlaybackState() {
  if (currentTask.isActive()) return {state: "LOADING"}
  try {
    return await sendToPlayer({method: "getPlaybackState"}) || {state: "STOPPED"}
  }
  catch (err) {
    return {state: "STOPPED"}
  }
}

function forward() {
  return sendToPlayer({method: "forward"})
}

function rewind() {
  return sendToPlayer({method: "rewind"})
}

function seek(n) {
  return sendToPlayer({method: "seek", args: [n]})
}



function handleHeadlessError(err) {
  console.error(err)
  //TODO: let user knows somehow
}

function reportIssue(url, comment) {
  var manifest = brapi.runtime.getManifest();
  return getSettings()
    .then(function(settings) {
      if (url) settings.url = url;
      settings.version = manifest.version;
      settings.userAgent = navigator.userAgent;
      return ajaxPost(config.serviceUrl + "/read-aloud/report-issue", {
        url: JSON.stringify(settings),
        comment: comment
      })
    })
}

function authWavenet() {
  createTab("https://cloud.google.com/text-to-speech/#put-text-to-speech-into-action", true)
    .then(function(tab) {
      addRequestListener();
      brapi.tabs.onRemoved.addListener(onTabRemoved);
      return showInstructions();

      function addRequestListener() {
        brapi.webRequest.onBeforeRequest.addListener(onRequest, {
          urls: ["https://cxl-services.appspot.com/proxy*"],
          tabId: tab.id
        })
      }
      function onTabRemoved(tabId) {
        if (tabId == tab.id) {
          brapi.tabs.onRemoved.removeListener(onTabRemoved);
          brapi.webRequest.onBeforeRequest.removeListener(onRequest);
        }
      }
      function onRequest(details) {
        var parser = new URL(details.url);
        var qs = parser.search ? parseQueryString(parser.search) : {};
        if (qs.token) {
          updateSettings({gcpToken: qs.token});
          showSuccess();
        }
      }
      function showInstructions() {
        return brapi.scripting.executeScript({
          target: {tabId: tab.id},
          func: function() {
            var elem = document.createElement('DIV')
            elem.id = 'ra-notice'
            elem.style.position = 'fixed'
            elem.style.top = '0'
            elem.style.left = '0'
            elem.style.right = '0'
            elem.style.backgroundColor = 'yellow'
            elem.style.padding = '20px'
            elem.style.fontSize = 'larger'
            elem.style.zIndex = 999000
            elem.style.textAlign = 'center'
            elem.innerHTML = 'Please click the blue SPEAK-IT button, then check the I-AM-NOT-A-ROBOT checkbox.'
            document.body.appendChild(elem)
          }
        })
      }
      function showSuccess() {
        return brapi.scripting.executeScript({
          target: {tabId: tab.id},
          func: function() {
            var elem = document.getElementById('ra-notice')
            elem.style.backgroundColor = '#0d0'
            elem.innerHTML = 'Successful, you can now use Google Wavenet voices. You may close this tab.'
          }
        })
      }
    })
}

async function openPdfViewer(tabId, pdfUrl) {
  const perms = {
    origins: ["http://*/", "https://*/"]
  }
  if (!await brapi.permissions.contains(perms)) {
    throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}))
  }
  await setTabUrl(tabId, brapi.runtime.getURL("pdf-viewer.html?url=" + encodeURIComponent(pdfUrl)))
  await new Promise(f => handlers.pdfViewerCheckIn = f)
}

async function managePiperVoices() {
  const result = await sendToPlayer({method: "managePiperVoices"}).catch(err => false)
  if (result != "OK") {
    if (result == "POPOUT") await sendToPlayer({method: "close"})
    await injectPlayer()
    await sendToPlayer({method: "managePiperVoices"})
  }
}

async function manageSupertonicVoices() {
  const result = await sendToPlayer({method: "manageSupertonicVoices"}).catch(err => false)
  if (result != "OK") {
    if (result == "POPOUT") await sendToPlayer({method: "close"})
    await injectPlayer()
    await sendToPlayer({method: "manageSupertonicVoices"})
  }
}

async function managePocketTtsVoices() {
  const result = await sendToPlayer({method: "managePocketTtsVoices"}).catch(err => false)
  if (result != "OK") {
    if (result == "POPOUT") await sendToPlayer({method: "close"})
    await injectPlayer()
    await sendToPlayer({method: "managePocketTtsVoices"})
  }
}

async function manageNghiTtsVoices() {
  const result = await sendToPlayer({method: "manageNghiTtsVoices"}).catch(err => false)
  if (result != "OK") {
    if (result == "POPOUT") await sendToPlayer({method: "close"})
    await injectPlayer()
    await sendToPlayer({method: "manageNghiTtsVoices"})
  }
}



async function contentScriptAlreadyInjected(tab, frameId) {
  const items = await brapi.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: frameId ? [frameId] : undefined,
    },
    func: function() {
      return typeof brapi != "undefined"
    }
  })
  return items[0].result == true
}

async function injectContentScript(tab, frameId, extraScripts) {
  await brapi.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: frameId ? [frameId] : undefined,
    },
    files: [
      "js/rxjs.umd.min.js",
      "js/jquery-3.7.1.min.js",
      "js/defaults.js",
      "js/messaging.js",
      "js/content.js",
    ]
  })
  const files = extraScripts || await brapi.tabs.sendMessage(tab.id, {dest: "contentScript", method: "getRequireJs"})
  await brapi.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: frameId ? [frameId] : undefined,
    },
    files: files
  })
  console.info("Content handler", files)
}

let pendingPlayerInjection

function injectPlayer(tab) {
  // A canceled start may still be creating the shared player. Reuse that work
  // instead of replacing its check-in listener or creating another player.
  if (!pendingPlayerInjection) {
    pendingPlayerInjection = createPlayer(tab).finally(() => pendingPlayerInjection = null)
  }
  return pendingPlayerInjection
}

async function createPlayer(tab) {
  const settings = await getSettings(["useEmbeddedPlayer", "piperVoices", "supertonicVoices", "pocketTtsVoices", "nghiTtsVoices"])
  const promise = new Promise(f => handlers.playerCheckIn = f)
  if (tab && settings.useEmbeddedPlayer
    //don't use embedded player if there are hosted tool voices installed
    && (settings.piperVoices || []).length == 0
    && (settings.supertonicVoices || []).length == 0
    && (settings.pocketTtsVoices || []).length == 0
    && (settings.nghiTtsVoices || []).length == 0
  ) {
    try {
      if (tab.incognito) {
        //https://developer.chrome.com/docs/extensions/mv3/manifest/incognito/
        throw new Error("Incognito tab")
      }
      await brapi.scripting.executeScript({
        target: {tabId: tab.id},
        func: createPlayerFrame
      })
    }
    catch (err) {
      console.warn("Cannot embed player", err)
      await createPlayerTab()
    }
  }
  else {
    await createPlayerTab()
  }
  await promise
}

function createPlayerFrame() {
  const brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {})
  const frame = document.createElement("iframe")
  frame.src = brapi.runtime.getURL("player.html")
  frame.style.position = "absolute"
  frame.style.height = "0"
  frame.style.borderWidth = "0"
  document.body.appendChild(frame)
}

async function createPlayerTab() {
  const tab = await brapi.tabs.create({
    url: "player.html?autoclose",
    index: 0,
    active: false,
  })
  await brapi.tabs.update(tab.id, {pinned: true})
}



async function sendToPlayer(message) {
  message.dest = "player"
  const result = await brapi.runtime.sendMessage(message)
  if (result && result.error) throw result.error
  else return result
}
