
var activeDoc;
var playbackError = null;
var silenceLoop = new Audio("sound/silence.opus");
silenceLoop.loop = true;
const pdfViewerCheckIn$ = new rxjs.Subject()

const audioPlayer = immediate(() => {
  let current
  return {
    play(src, opts) {
      if (current) current.playback.unsubscribe()
      const isBlob = src instanceof Blob
      const url = isBlob ? URL.createObjectURL(src) : src
      const playbackState$ = new rxjs.BehaviorSubject("resumed")
      return new Promise((fulfill, reject) => {
        current = {
          playbackState$,
          playback: playAudio(Promise.resolve(url), opts, playbackState$).subscribe({
            complete: fulfill,
            error: reject
          })
        }
        if (isBlob) current.playback.add(() => URL.revokeObjectURL(url))
      })
    },
    pause() {
      if (current) current.playbackState$.next("paused")
    },
    resume() {
      if (current) current.playbackState$.next("resumed")
    }
  }
})

installContextMenus()
syncActionPopup().catch(console.error)
settingsChange$.pipe(rxjs.filter(changes => changes.showHighlighting))
  .subscribe(() => syncActionPopup().catch(console.error))
brapi.browserAction.onClicked.addListener(tab => activateReader(tab.id).catch(console.error))


/**
 * Piper
 */
const piperHost = immediate(() => {
  const tabSubject = new rxjs.BehaviorSubject(null)
  return {
    setTab(tab) {
      const prevTab = tabSubject.getValue()
      if (prevTab && prevTab.id != tab.id) closeStaleEngineTab(prevTab, "piper-host")
      tabSubject.next(tab)
    },
    isSuperseded(tab) {
      const currentTab = tabSubject.getValue()
      return currentTab != null && currentTab.id != tab.id
    },
    async ready({requestFocus}) {
      if (requestFocus) {
        const windows = brapi.extension.getViews({type: "popup"})
        for (const w of windows) w.close()
      }
      try {
        const tab = tabSubject.getValue()
        if (!tab) throw "Absent"
        const status = await this.sendRequest("areYouThere")
        if (status != true) throw "Absent"
        if (requestFocus) {
          await Promise.all([
            chrome.windows.update(tab.windowId, {focused: true}),
            chrome.tabs.update(tab.id, {active: true})
          ])
        }
      }
      catch (err) {
        const staleTab = tabSubject.getValue()
        if (staleTab) closeStaleEngineTab(staleTab, "piper-host")
        tabSubject.next(null)
        await brapi.tabs.create({url: "https://piper.ttstool.com/", pinned: true, active: requestFocus})
        await rxjs.firstValueFrom(tabSubject.pipe(rxjs.filter(x => x)))
      }
    },
    async sendRequest(method, args) {
      const tab = tabSubject.getValue()
      const {error, result} = await brapi.tabs.sendMessage(tab.id, {
        to: "piper-host",
        type: "request",
        id: String(Math.random()),
        method,
        args
      })
      return error ? Promise.reject(error) : result
    },
    eventSubject: new rxjs.Subject()
  }
})


/**
 * Supertonic
 */
const supertonicHost = immediate(() => {
  const tabSubject = new rxjs.BehaviorSubject(null)
  return {
    setTab(tab) {
      const prevTab = tabSubject.getValue()
      if (prevTab && prevTab.id != tab.id) closeStaleEngineTab(prevTab, "supertonic-host")
      tabSubject.next(tab)
    },
    isSuperseded(tab) {
      const currentTab = tabSubject.getValue()
      return currentTab != null && currentTab.id != tab.id
    },
    async ready({requestFocus}) {
      if (requestFocus) {
        const windows = brapi.extension.getViews({type: "popup"})
        for (const w of windows) w.close()
      }
      try {
        const tab = tabSubject.getValue()
        if (!tab) throw "Absent"
        const status = await this.sendRequest("areYouThere")
        if (status != true) throw "Absent"
        if (requestFocus) {
          await Promise.all([
            chrome.windows.update(tab.windowId, {focused: true}),
            chrome.tabs.update(tab.id, {active: true})
          ])
        }
      }
      catch (err) {
        const staleTab = tabSubject.getValue()
        if (staleTab) closeStaleEngineTab(staleTab, "supertonic-host")
        tabSubject.next(null)
        await brapi.tabs.create({url: "https://supertonic.ttstool.com/", pinned: true, active: requestFocus})
        await rxjs.firstValueFrom(tabSubject.pipe(rxjs.filter(x => x)))
      }
    },
    async sendRequest(method, args) {
      const tab = tabSubject.getValue()
      const {error, result} = await brapi.tabs.sendMessage(tab.id, {
        to: "supertonic-host",
        type: "request",
        id: String(Math.random()),
        method,
        args
      })
      return error ? Promise.reject(error) : result
    },
    eventSubject: new rxjs.Subject()
  }
})


const nghiTtsHost = immediate(() => {
  const tabSubject = new rxjs.BehaviorSubject(null)
  return {
    setTab(tab) {
      const prevTab = tabSubject.getValue()
      if (prevTab && prevTab.id != tab.id) closeStaleEngineTab(prevTab, "nghitts-host")
      tabSubject.next(tab)
    },
    isSuperseded(tab) {
      const currentTab = tabSubject.getValue()
      return currentTab != null && currentTab.id != tab.id
    },
    async ready({requestFocus}) {
      if (requestFocus) {
        const windows = brapi.extension.getViews({type: "popup"})
        for (const w of windows) w.close()
      }
      try {
        const tab = tabSubject.getValue()
        if (!tab) throw "Absent"
        const status = await this.sendRequest("areYouThere")
        if (status != true) throw "Absent"
        if (requestFocus) {
          await Promise.all([
            chrome.windows.update(tab.windowId, {focused: true}),
            chrome.tabs.update(tab.id, {active: true})
          ])
        }
      }
      catch (err) {
        const staleTab = tabSubject.getValue()
        if (staleTab) closeStaleEngineTab(staleTab, "nghitts-host")
        tabSubject.next(null)
        await brapi.tabs.create({url: "https://nghitts.ttstool.com/?embed=1", pinned: true, active: requestFocus})
        await rxjs.firstValueFrom(tabSubject.pipe(rxjs.filter(x => x)))
      }
    },
    async sendRequest(method, args) {
      const tab = tabSubject.getValue()
      const {error, result} = await brapi.tabs.sendMessage(tab.id, {
        to: "nghitts-host",
        type: "request",
        id: String(Math.random()),
        method,
        args
      })
      return error ? Promise.reject(error) : result
    },
    eventSubject: new rxjs.Subject()
  }
})


/**
 * Close an engine tab that has been replaced by a newer one, or that was unloaded and can no longer respond.
 * A live tab is only closed if it still answers as the engine host, so a tab the user navigated elsewhere is left alone.
 */
async function closeStaleEngineTab(tab, to) {
  try {
    const {discarded} = await brapi.tabs.get(tab.id)
    if (!discarded) {
      const res = await brapi.tabs.sendMessage(tab.id, {to, type: "request", id: String(Math.random()), method: "areYouThere"})
      if (res?.result !== true) return
    }
    await brapi.tabs.remove(tab.id)
  }
  catch (err) {
    console.debug("Stale engine tab not closed", tab.id, err)
  }
}

const engineHosts = {
  piper: piperHost,
  supertonic: supertonicHost,
  nghitts: nghiTtsHost,
}


/**
 * IPC handlers
 */
var handlers = {
  activateReader,
  getReaderState,
  openPopupWindow,
  openOptionsPage,
  getReaderFonts,
  resume,
  playText: playText,
  playTab: playTab,
  stop: stop,
  pause: pause,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
  reportIssue: reportIssue,
  authWavenet: authWavenet,
  ibmFetchVoices: function(apiKey, url) {
    return ibmWatsonTtsEngine.fetchVoices(apiKey, url);
  },
  getSpeechInfo: function() {
    return getActiveSpeech()
      .then(function(speech) {
        return speech && speech.getInfo();
      })
  },
  getPlaybackError: function() {
    try {
      if (playbackError) return {message: playbackError.message}
    } finally {
      playbackError = null
    }
  },
  startPairing: function() {
    return phoneTtsEngine.startPairing()
  },
  isPaired: function() {
    return phoneTtsEngine.isPaired()
  },
  managePiperVoices() {
    return piperHost.ready({requestFocus: true})
  },
  piperServiceReady: function() {
    piperHost.setTab(this.sender.tab)
  },
  onPiperEvent(event) {
    piperHost.eventSubject.next(event)
  },
  manageSupertonicVoices() {
    return supertonicHost.ready({requestFocus: true})
  },
  supertonicServiceReady() {
    supertonicHost.setTab(this.sender.tab)
  },
  onSupertonicEvent(event) {
    supertonicHost.eventSubject.next(event)
  },
  manageNghiTtsVoices() {
    return nghiTtsHost.ready({requestFocus: true})
  },
  nghiTtsServiceReady() {
    nghiTtsHost.setTab(this.sender.tab)
  },
  onNghiTtsEvent(event) {
    nghiTtsHost.eventSubject.next(event)
  },
  isEngineTabSuperseded(engine) {
    return engineHosts[engine].isSuperseded(this.sender.tab)
  },
  closeEngineTab() {
    return brapi.tabs.remove(this.sender.tab.id)
  },
  audioPlay: audioPlayer.play,
  audioPause: audioPlayer.pause,
  audioResume: audioPlayer.resume,
  pdfViewerCheckIn() {
    pdfViewerCheckIn$.next()
  },
}

brapi.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.dest) return;
    var handler = handlers[request.method];
    if (handler) {
      Promise.resolve(handler.apply({sender}, request.args))
        .then(sendResponse)
        .catch(function(err) {
          sendResponse({error: err.message});
        })
      return true;
    }
    else {
      sendResponse({error: "BAD_METHOD"});
    }
  }
);


/**
 * Context menu installer & handlers
 */
function installContextMenus() {
  if (brapi.menus && brapi.menus.create) {
    brapi.menus.create({
      id: "read-selection",
      title: brapi.i18n.getMessage("context_read_selection"),
      contexts: ["selection"]
    });
    brapi.menus.create({
      id: "options",
      title: brapi.i18n.getMessage("options_heading"),
      contexts: ["browser_action"]
    })
  }
}

if (brapi.menus)
brapi.menus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection")
    stop()
      .then(function() {
        if (tab && tab.id != -1) return detectTabLanguage(tab.id)
        else return undefined
      })
      .then(function(lang) {
        return playText(info.selectionText, {lang: lang})
      })
      .catch(console.error)
  else if (info.menuItemId == "options")
    createTab(brapi.runtime.getURL("options.html"))
})


/**
 * Shortcut keys handlers
 */
function execCommand(command) {
  if (command == "play" || command == "pause") {
    getPlaybackState()
      .then(function(state) {
        if (state == "PLAYING") return command == "pause" ? pause() : stop()
        else if (state == "STOPPED" || state == "PAUSED") return playTab()
      })
      .catch(console.error)
  }
  else if (command == "stop") stop();
  else if (command == "forward") forward();
  else if (command == "rewind") rewind();
}

if (brapi.commands)
brapi.commands.onCommand.addListener(function(command) {
  execCommand(command)
})



/**
 * METHODS
 */
function playText(text, opts) {
  cancelStartup()
  playingTabId = null
  opts = opts || {}
  playbackError = null
  if (!activeDoc) {
    openDoc(new SimpleSource(text.split(/(?:\r?\n){2,}/), {lang: opts.lang}), function(err) {
      if (err) playbackError = err
    })
  }
  return playDocument(activeDoc)
}

let playingTabId = null
let pendingStart = null

function cancelStartup() {
  if (pendingStart) {
    pendingStart.canceled = true
    if (pendingStart.source) pendingStart.source.close()
    if (pendingStart.doc && activeDoc === pendingStart.doc) closeDoc()
    pendingStart = null
  }
}

function playTab(tabId) {
  // Popup and keyboard commands resume the current document as before.
  if (pendingStart && (tabId == null || tabId == pendingStart.tabId)) return pendingStart.promise
  if (activeDoc && (tabId == null || tabId == playingTabId)) return resume()
  cancelStartup()
  const task = {tabId, canceled: false}
  pendingStart = task
  task.promise = startTab(task).finally(() => {
    if (pendingStart === task) pendingStart = null
  })
  return task.promise
}

async function startTab(task) {
  function check() {
    if (task.canceled) throw Object.assign(new Error("Playback canceled"), {name: "CancellationException"})
  }
  let doc
  try {
    const tab = task.tabId != null ? await getTab(task.tabId) : await getActiveTab()
    check()
    if (!tab) throw new Error(JSON.stringify({code: "error_page_unreadable"}))
    task.tabId = tab.id
    const source = task.source = new TabSource(tab.id)
    await source.ready
    check()
    let fallback = false
    const readerMode = await isReaderMode()
    check()
    if (readerMode) {
      await showReader(tab).catch(err => { console.warn("Cannot show reader", err); fallback = true })
      check()
    }
    // Transfer ownership only after source preparation succeeds.
    closeDoc()
    playingTabId = tab.id
    playbackError = null
    openDoc(source, err => { if (err) playbackError = err })
    task.source = null
    doc = task.doc = activeDoc
    await doc.play()
    check()
    if (fallback) await openPopupWindow(tab.id)
  }
  catch (err) {
    if (task.source) task.source.close()
    if (task.canceled || err.name == "CancellationException") return
    if (doc && activeDoc === doc) closeDoc()
    playbackError = err
    handleError(err)
    throw err
  }
}

function stop() {
  cancelStartup()
  closeDoc()
  return Promise.resolve()
}

function resume() {
  return activeDoc ? playDocument(activeDoc) : playTab()
}

function playDocument(doc) {
  return doc.play().catch(err => {
    if (err.name == "CancellationException" || activeDoc !== doc) return
    playbackError = err
    handleError(err)
    closeDoc()
    throw err
  })
}

async function getReaderState() {
  const doc = activeDoc
  const owner = playingTabId
  const state = pendingStart ? "LOADING" : await getPlaybackState()
  const speech = doc && await doc.getActiveSpeech()
  if (doc !== activeDoc) return getReaderState()
  return {
    state,
    playingTabId: pendingStart ? pendingStart.tabId : owner,
    speechInfo: pendingStart ? null : speech && speech.getInfo(),
    playbackError: playbackError && errorToJson(playbackError),
  }
}

function pause() {
  if (activeDoc) return activeDoc.pause();
  else return Promise.resolve();
}

function getPlaybackState() {
  if (pendingStart) return Promise.resolve("LOADING")
  if (activeDoc) return activeDoc.getState();
  else return Promise.resolve("STOPPED");
}

function getActiveSpeech() {
  if (activeDoc) return activeDoc.getActiveSpeech();
  else return Promise.resolve(null);
}

function openDoc(source, onEnd) {
  const doc = new Doc(source, function(err) {
    if (activeDoc !== doc) return
    handleError(err)
    closeDoc()
    if (typeof onEnd == "function") onEnd(err)
  })
  activeDoc = doc
  silenceLoop.play().catch(console.error)
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
    silenceLoop.pause();
  }
}

function forward() {
  if (activeDoc) return activeDoc.forward();
  else return Promise.reject(new Error("Can't forward, not active"));
}

function rewind() {
  if (activeDoc) return activeDoc.rewind();
  else return Promise.reject(new Error("Can't rewind, not active"));
}

function seek(n) {
  if (activeDoc) return activeDoc.seek(n);
  else return Promise.reject(new Error("Can't seek, not active"));
}

function handleError(err) {
  if (err && err.name == "CancellationException") return
  if (err) {
    if (/^{/.test(err.message)) {
      const errInfo = JSON.parse(err.message)
      switch (errInfo.code) {
        case "error_payment_required":
          clearSettings(["voiceName"])
          break
        case "error_upload_pdf":
          setTabUrl(errInfo.tabId, config.pdfViewerUrl)
          break
        case "error_file_access":
        case "error_add_permissions":
        case "error_page_unreadable":
        case "error_login_required":
        case "error_wavenet_auth_required":
        case "error_chatgpt":
          //dont report
          break
        default:
          reportError(err)
      }
    }
    else {
      reportError(err);
    }
  }
}

function reportError(err) {
  if (err && err.stack) {
    var details = err.stack;
    if (!details.startsWith(err.name)) details = err.name + ": " + err.message + "\n" + details;
    brapi.storage.local.get("lastUrl")
      .then(({lastUrl}) => reportIssue(lastUrl, details))
      .catch(console.error)
  }
}

async function reportIssue(url, comment) {
  const permissions = await brapi.permissions.getAll();
  // Older Firefox versions do not expose built-in data consent.
  if (permissions.data_collection && !permissions.data_collection.includes("technicalAndInteraction")) return false;
  var manifest = brapi.runtime.getManifest();
  return getSettings()
    .then(function(settings) {
      if (url) settings.url = url;
      settings.version = manifest.version;
      settings.userAgent = navigator.userAgent;
      return ajaxPost(config.serviceUrl + "/read-aloud/report-issue", {
        url: JSON.stringify(settings),
        comment: comment
      }).then(() => true)
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
        var parser = parseUrl(details.url);
        var qs = parser.search ? parseQueryString(parser.search) : {};
        if (qs.token) {
          updateSettings({gcpToken: qs.token});
          showSuccess();
        }
      }
      function showInstructions() {
        return executeScript({
          tabId: tab.id,
          code: [
            "var elem = document.createElement('DIV')",
            "elem.id = 'ra-notice'",
            "elem.style.position = 'fixed'",
            "elem.style.top = '0'",
            "elem.style.left = '0'",
            "elem.style.right = '0'",
            "elem.style.backgroundColor = 'yellow'",
            "elem.style.padding = '20px'",
            "elem.style.fontSize = 'larger'",
            "elem.style.zIndex = 999000",
            "elem.style.textAlign = 'center'",
            "elem.innerHTML = 'Please click the blue SPEAK-IT button, then check the I-AM-NOT-A-ROBOT checkbox.'",
            "document.body.appendChild(elem)",
            "1"
          ]
          .join(";\n")
        })
      }
      function showSuccess() {
        return executeScript({
          tabId: tab.id,
          code: [
            "var elem = document.getElementById('ra-notice')",
            "elem.style.backgroundColor = '#0d0'",
            "elem.innerHTML = 'Successful, you can now use Google Wavenet voices. You may close this tab.'"
          ]
          .join(";\n")
        })
      }
    })
}

function userGestureActivate() {
  var audio = document.createElement("AUDIO");
  audio.src = "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==";
  audio.play();
}
