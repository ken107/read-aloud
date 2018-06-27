
var activeDoc;

brapi.runtime.onInstalled.addListener(function() {
  brapi.contextMenus.create({
    id: "read-selection",
    title: brapi.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
})

brapi.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection")
    stop().then(function() {
      playText(info.selectionText, function(err) {
        if (err) console.error(err);
      })
    })
})

brapi.commands.onCommand.addListener(function(command) {
  if (command == "play") {
    getPlaybackState()
      .then(function(state) {
        if (state == "PLAYING") return pause();
        else if (state == "STOPPED" || state == "PAUSED") return play();
      })
  }
  else if (command == "stop") stop();
  else if (command == "forward") forward();
  else if (command == "rewind") rewind();
})

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
      closeDoc();
      if (typeof onEnd == "function") onEnd(err);
    })
  }
  return activeDoc.play()
    .catch(function(err) {closeDoc(); throw err})
}

function play(onEnd) {
  if (!activeDoc) {
    activeDoc = new Doc(new TabSource(), function(err) {
      closeDoc();
      if (typeof onEnd == "function") onEnd(err);
    })
  }
  return activeDoc.play()
    .catch(function(err) {closeDoc(); throw err})
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

function getDocInfo() {
  if (activeDoc) return activeDoc.getInfo();
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
