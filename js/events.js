
var activeDoc;

brapi.runtime.onInstalled.addListener(installContextMenus);
if (getBrowser() == "firefox") brapi.runtime.onStartup.addListener(installContextMenus);

brapi.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (request.permissions) {
      requestPermissions({
        permissions: ['tabs'],
        origins: ['http://*/', 'https://*/'],
      });
    } else {
      execCommand(request.command);
    }
  }
);

brapi.runtime.onConnectExternal.addListener(
  function(port) {
    port.onMessage.addListener(function(msg) {
      execCommand(msg.command, function() {
        port.postMessage('end');
      });
    });
  }
);

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
        return playText(info.selectionText, function(err) {
          if (err) console.error(err);
        })
      })
      .catch(console.error)
})

function execCommand(command, onEnd) {
  if (command == "play") {
    getPlaybackState()
      .then(function(state) {
        if (state == "PLAYING") return pause();
        else if (state == "STOPPED" || state == "PAUSED") {
          return play(function(err) {
            if (err) console.error(err);
            if (onEnd) onEnd()
          })
        }
      })
      .catch(console.error)
  }
  else if (command == "stop") stop();
  else if (command == "forward") forward();
  else if (command == "rewind") rewind();
}

if (brapi.commands)
brapi.commands.onCommand.addListener(execCommand);

if (brapi.ttsEngine) (function() {
  brapi.ttsEngine.onSpeak.addListener(function(utterance, options, onEvent) {
    options = Object.assign({}, options, {voice: {voiceName: options.voiceName}});
    remoteTtsEngine.speak(utterance, options, onEvent);
  });
  brapi.ttsEngine.onStop.addListener(remoteTtsEngine.stop);
  brapi.ttsEngine.onPause.addListener(remoteTtsEngine.pause);
  brapi.ttsEngine.onResume.addListener(remoteTtsEngine.resume);
})()


function playText(text, onEnd) {
  if (!activeDoc) {
    activeDoc = new Doc(new SimpleSource(text.split(/(?:\r?\n){2,}/)), function(err) {
      handleError(err);
      closeDoc();
      if (typeof onEnd == "function") onEnd(err);
    })
  }
  return activeDoc.play()
    .catch(function(err) {
      handleError(err);
      closeDoc();
      throw err;
    })
}

function play(onEnd) {
  if (!activeDoc) {
    activeDoc = new Doc(new TabSource(), function(err) {
      handleError(err);
      closeDoc();
      if (typeof onEnd == "function") onEnd(err);
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

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
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
    var code = /^{/.test(err.message) ? JSON.parse(err.message).code : err.message;
    if (code == "error_payment_required") clearSettings(["voiceName"]);
    reportError(err);
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
  createTab("https://cloud.google.com/text-to-speech/#convert-your-text-to-speech-right-now", true)
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
