
var activeDoc;
var playbackError = null;
var silenceLoop = new Audio("sound/silence.opus");
silenceLoop.loop = true;

const audioPlayer = immediate(() => {
  let current
  return {
    play(src, opts) {
      if (current) current.playback.unsubscribe()
      const url = (src instanceof Blob) ? URL.createObjectURL(src) : src
      const playbackState$ = new rxjs.BehaviorSubject("resumed")
      return new Promise((fulfill, reject) => {
        current = {
          playbackState$,
          playback: playAudio(Promise.resolve(url), opts, playbackState$).subscribe({
            complete: fulfill,
            error: reject
          })
        }
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


/**
 * Piper
 */
const piperHost = immediate(() => {
  const tabSubject = new rxjs.BehaviorSubject(null)
  return {
    setTab(tab) {
      tabSubject.next(tab)
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
 * IPC handlers
 */
var handlers = {
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
  audioPlay: audioPlayer.play,
  audioPause: audioPlayer.pause,
  audioResume: audioPlayer.resume,
}

brapi.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
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
  if (command == "play") {
    getPlaybackState()
      .then(function(state) {
        if (state == "PLAYING") return pause();
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
 * chrome.ttsEngine handlers
 */
if (brapi.ttsEngine) (function() {
  brapi.ttsEngine.onSpeak.addListener(function(utterance, options, onEvent) {
    options = Object.assign({}, options, {voice: {voiceName: options.voiceName}});
    remoteTtsEngine.speak(utterance, options, onEvent);
  });
  brapi.ttsEngine.onStop.addListener(remoteTtsEngine.stop);
  brapi.ttsEngine.onPause.addListener(remoteTtsEngine.pause);
  brapi.ttsEngine.onResume.addListener(remoteTtsEngine.resume);
})()



/**
 * METHODS
 */
function playText(text, opts) {
  opts = opts || {}
  playbackError = null
  if (!activeDoc) {
    openDoc(new SimpleSource(text.split(/(?:\r?\n){2,}/), {lang: opts.lang}), function(err) {
      if (err) playbackError = err
    })
  }
  return activeDoc.play()
    .catch(function(err) {
      handleError(err);
      closeDoc();
      throw err;
    })
}

function playTab(tabId) {
  playbackError = null
  if (!activeDoc) {
    openDoc(new TabSource(tabId), function(err) {
      if (err) playbackError = err
    })
  }
  return activeDoc.play()
    .catch(function(err) {
      handleError(err);
      closeDoc();
      throw err;
    })
}

function stop() {
  if (activeDoc) {
    activeDoc.stop();
    closeDoc();
    return Promise.resolve();
  }
  else return Promise.resolve();
}

function pause() {
  if (activeDoc) return activeDoc.pause();
  else return Promise.resolve();
}

function getPlaybackState() {
  if (activeDoc) return activeDoc.getState();
  else return Promise.resolve("STOPPED");
}

function getActiveSpeech() {
  if (activeDoc) return activeDoc.getActiveSpeech();
  else return Promise.resolve(null);
}

function openDoc(source, onEnd) {
  activeDoc = new Doc(source, function(err) {
    handleError(err);
    closeDoc();
    if (typeof onEnd == "function") onEnd(err);
  })
  silenceLoop.play();
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
    getState("lastUrl")
      .then(function(url) {return reportIssue(url, details)})
      .catch(console.error)
  }
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
