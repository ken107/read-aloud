
brapi.runtime.onInstalled.addListener(installContextMenus);
if (getBrowser() == "firefox") brapi.runtime.onStartup.addListener(installContextMenus);


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
  forwardToContentScript: sendToContentScript,
  ibmFetchVoices: function() {
    return sendToPlayer({method: "ibmFetchVoices"})
  },
}

function serviceWorkerMessageHandler(request) {
  var handler = handlers[request.method]
  if (!handler) return Promise.reject(new Error("Bad method " + request.method))
  return Promise.resolve()
    .then(function() {
      return handler.apply(null, request.args)
    })
}

brapi.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.dest != "serviceWorker") return;
    serviceWorkerMessageHandler(request)
      .then(sendResponse)
      .catch(function(err) {
        console.error(err)
        sendResponse({error: err.message});
      })
    return true
  }
)


/**
 * Context menu installer & handlers
 */
function installContextMenus() {
  if (brapi.contextMenus)
  brapi.contextMenus.create({
    id: "read-selection",
    title: brapi.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
}

if (brapi.contextMenus)
brapi.contextMenus.onClicked.addListener(function(info, tab) {
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
 * METHODS
 */
function playText(text, opts) {
  stopCurrentPlayback()
  return injectPlayer()
    .then(function() {
      return sendToPlayer({method: "playText", args: [text, opts]})
    })
}

function playTab(tabId) {
  stopCurrentPlayback()
  return injectContentScript(tabId)
    .then(function(contentScriptTabId) {
      return injectPlayer()
        .then(function(playerTabId) {
          if (/^extension:/.test(contentScriptTabId)) return contentScriptTabId
          else if (contentScriptTabId == playerTabId) return "local:"
          else return "forward:"
        })
    })
    .then(function(destUri) {
      return sendToPlayer({method: "playTab", args: [destUri]})
    })
}

function stop() {
  return sendToPlayer({method: "stop"})
}

function pause() {
  return sendToPlayer({method: "pause"})
}

function getPlaybackState() {
  return getState("playerTabId")
    .then(function(tabId) {
      if (tabId) return sendToPlayer({method: "getPlaybackState"})
      return {status: "STOPPED"}
    })
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



function stopCurrentPlayback() {
  sendToPlayer({method: "stop"})
    .catch(function(err) {
      //ignore
    })
}

function injectContentScript(tabId) {
  var tab
  return (tabId ? getTab(tabId) : getActiveTab())
    .then(function(result) {
      tab = result
      if (!tab) throw new Error({code: "error_page_unreadable"})

      //check if already injected
      return brapi.scripting.executeScript({
        target: {tabId: tab.id},
        func: function() {
          return typeof contentScriptMessageHandler != "undefined"
        }
      })
        .then(function(items) {
          return items[0].result == true
        })
    })
    .then(function(alreadyInjected) {
      if (alreadyInjected) return
      return brapi.scripting.executeScript({
        target: {tabId: tab.id},
        files: [
          "js/jquery-3.1.1.min.js",
          "js/messaging.js",
          getPageSpecificScript(tab.url),
          "js/content.js",
        ]
      })
    })
    .then(function() {
      return setState("contentScriptTabId", tab.id)
    })
    .then(function() {
      return tab.id
    })

  function getPageSpecificScript(url) {
    //TODO
    return "js/content/html-doc.js"
  }
}

function injectPlayer() {
  var tab
  return getActiveTab()       //TODO: inject player in offscreen document or popup window instead?
    .then(function(result) {
      tab = result
      if (!tab) throw new Error("Can't inject TTS player, no active tab")
      if (!/^(http|https|file):/.test(tab.url)) throw new Error("Can't inject TTS player, non-http tab")

      //check if already injected in this tab
      return brapi.scripting.executeScript({
        target: {tabId: tab.id},
        func: function() {
          return typeof playerMessageHandler != "undefined"
        }
      })
        .then(function(items) {
          return items[0].result == true
        })
    })
    .then(function(alreadyInjected) {
      if (alreadyInjected) return
      return brapi.scripting.executeScript({
        target: {tabId: tab.id},
        files: [
          "js/defaults.js",
          "js/google-translate.js",
          "js/aws-sdk.js",
          "js/tts-engines.js",
          "js/speech.js",
          "js/document.js",
          "js/player.js",
        ]
      })
    })
    .then(function() {
      return setState("playerTabId", tab.id)
    })
    .then(function() {
      return tab.id
    })
}

function sendToContentScript(message) {
  return getState("contentScriptTabId")
    .then(function(tabId) {
      message.dest = "contentScript"
      return brapi.tabs.sendMessage(tabId, message)
    })
    .then(function(result) {
      if (result && result.error) throw new Error(result.error)
      else return result
    })
    .catch(function(err) {
      clearState("contentScriptTabId")
      throw err
    })
}

function sendToPlayer(message) {
  return getState("playerTabId")
    .then(function(tabId) {
      message.dest = "player"
      return brapi.tabs.sendMessage(tabId, message)
    })
    .then(function(result) {
      if (result && result.error) throw new Error(result.error)
      else return result
    })
    .catch(function(err) {
      clearState("playerTabId")
      throw err
    })
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
