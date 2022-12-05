
var activeDoc;
var playbackError = null;
var silenceLoop = new Audio("https://assets.lsdsoftware.com/snd/silence-3s.mp3");
silenceLoop.loop = true;


registerMessageListener("player", {
  playText: playText,
  playTab: playTab,
  stop: stop,
  pause: pause,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
  ibmFetchVoices: ibmFetchVoices,
})

bgPageInvoke("playerCheckIn")
  .catch(console.error)



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

function playTab() {
  playbackError = null
  if (!activeDoc) {
    openDoc(new TabSource(), function(err) {
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
  if (activeDoc) {
    return Promise.all([activeDoc.getState(), activeDoc.getActiveSpeech()])
      .then(function(results) {
        return {
          status: results[0],
          speechPosition: results[1] && results[1].getPosition(),
          playbackError: playbackError && {message: playbackError.message, stack: playbackError.stack},
        }
      })
  }
  else {
    return {status: "STOPPED"}
  }
}

function ibmFetchVoices(apiKey, url) {
  return ibmWatsonTtsEngine.fetchVoices(apiKey, url);
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
      .then(function(url) {return bgPageInvoke("reportIssue", [url, details])})
      .catch(console.error)
  }
}
