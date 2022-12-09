
var activeDoc;
var playbackError = null;
var silenceLoop = new Audio("sound/silence.mp3");
silenceLoop.loop = true;

var audioCanPlay = false;
var audioCanPlayPromise = new Promise(f => silenceLoop.oncanplay = f)
  .then(() => audioCanPlay = true)

var closeTabTimer = startTimer(5*60*1000, () => window.close())


registerMessageListener("player", {
  playText: playText,
  playTab: playTab,
  stop: stop,
  pause: pause,
  resume: resume,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
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

function resume() {
  if (activeDoc) return activeDoc.play()
  else return Promise.resolve()
}

function getPlaybackState() {
  if (activeDoc) {
    return Promise.all([activeDoc.getState(), activeDoc.getActiveSpeech()])
      .then(function(results) {
        return {
          state: results[0],
          speechPosition: results[1] && results[1].getPosition(),
          playbackError: errorToJson(playbackError),
        }
      })
  }
  else {
    return {
      state: "STOPPED",
      playbackError: errorToJson(playbackError),
    }
  }
}

function openDoc(source, onEnd) {
  activeDoc = new Doc(source, function(err) {
    handleError(err);
    closeDoc();
    if (typeof onEnd == "function") onEnd(err);
  })
  silenceLoop.play();
  closeTabTimer.stop();
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
    silenceLoop.pause();
    closeTabTimer.restart();
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
    console.error(details)
    getState("lastUrl")
      .then(url => bgPageInvoke("reportIssue", [url, details]))
      .catch(console.error)
  }
}

async function requestAudioPlaybackPermission() {
  if (audioCanPlay) return
  const thisTab = await brapi.tabs.getCurrent()
  const prevTab = await brapi.tabs.query({windowId: thisTab.windowId, active: true}).then(tabs => tabs[0])
  await brapi.tabs.update(thisTab.id, {active: true})
  $("#dialog-backdrop, #audio-playback-permission-dialog").show()
  await audioCanPlayPromise
  $("#dialog-backdrop, #audio-playback-permission-dialog").hide()
  await brapi.tabs.update(prevTab.id, {active: true})
}

function startTimer(timeout, callback) {
  var timer = setTimeout(callback, timeout)
  return {
    stop: function() {
      clearTimeout(timer)
      timer = null
    },
    restart: function() {
      clearTimeout(timer)
      timer = setTimeout(callback, timeout)
    }
  }
}
