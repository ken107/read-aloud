
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
  ibmFetchVoices: sendToPlayer.bind(null, {method: "ibmFetchVoices"}),
  getSpeechPosition: sendToPlayer.bind(null, {method: "getSpeechPosition"}),
  getPlaybackError: sendToPlayer.bind(null, {method: "getPlaybackError"}),
}

brapi.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    var handler = handlers[request.method];
    if (handler) {
      Promise.resolve(handler.apply(null, request.args))
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
function sendToPlayer(message) {
  return messagingClient.sendTo("player", message)
}

function playText(text, opts) {
  //TODO:
  //0. stop current player if any
  //1. inject player
  return sendToPlayer({method: "playText", args: [text, opts]})
}

function playTab(tabId) {
  //TODO:
  //0. stop current player if any
  //1. decide based on URL where to inject content-script and player
  //2. inject content-script, load any dependencies
  //3. inject player with content-script's destId
  var destId
  return sendToPlayer({method: "playTab", args: [destId]})
}

function stop() {
  return sendToPlayer({method: "stop"})
}

function pause() {
  return sendToPlayer({method: "pause"})
}

function getPlaybackState() {
  return sendToPlayer({method: "getPlaybackState"})
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
