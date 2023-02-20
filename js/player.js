
var queryString = new URLSearchParams(location.search)
var activeDoc;
var playbackError = null;
var closeTabTimer = queryString.has("autoclose") && startTimer(5*60*1000, closePlayer)


var messageHandlers = {
  playText: playText,
  playTab: playTab,
  stop: stop,
  pause: pause,
  resume: resume,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
  close: closePlayer,
  shouldPlaySilence: shouldPlaySilence.bind({}),
}

registerMessageListener("player", messageHandlers)

bgPageInvoke("playerCheckIn")
  .catch(console.error)

document.addEventListener("DOMContentLoaded", initialize)



async function initialize() {
  setI18nText()

  $("#hidethistab-link")
    .toggle(canUseEmbeddedPlayer() && !(await getSettings()).useEmbeddedPlayer)
    .click(function() {
      $("#dialog-backdrop, #hidethistab-dialog").show()
    })

  $("#hidethistab-dialog .btn, #hidethistab-dialog .close")
    .click(function(event) {
      $("#dialog-backdrop, #hidethistab-dialog").hide()
      if ($(event.target).is(".btn-ok")) {
        updateSettings({useEmbeddedPlayer: true})
          .then(() => window.close())
          .catch(console.error)
      }
    })
}

function playText(text, opts) {
  opts = opts || {}
  playbackError = null
  if (!activeDoc) {
    openDoc(new SimpleSource(text.split(/(?:\r?\n){2,}/), {lang: opts.lang}), function(err) {
      if (err) playbackError = err
    })
  }
  const doc = activeDoc
  return activeDoc.play()
    .catch(function(err) {
      if (doc == activeDoc) {
        handleError(err);
        closeDoc();
      }
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
  const doc = activeDoc
  return activeDoc.play()
    .catch(function(err) {
      if (doc == activeDoc) {
        handleError(err);
        closeDoc();
      }
      throw err;
    })
}

function stop() {
  if (activeDoc) {
    activeDoc.stop();
    closeDoc();
  }
  return true;
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
  if (closeTabTimer) closeTabTimer.stop();
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
    if (closeTabTimer) closeTabTimer.restart();
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

function closePlayer() {
  if (top == self) window.close()
  else location.href = "about:blank"
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

async function playAudio(urlPromise, options, startTime) {
  if (brapi.offscreen) {
    return playAudioOffscreen(urlPromise, options, startTime)
  }
  else {
    await requestAudioPlaybackPermission()
    return playAudioHere(urlPromise, options, startTime)
  }
}

var requestAudioPlaybackPermission = lazy(async function() {
  const thisTab = await brapi.tabs.getCurrent()
  const prevTab = await brapi.tabs.query({windowId: thisTab.windowId, active: true}).then(tabs => tabs[0])
  await brapi.tabs.update(thisTab.id, {active: true})
  $("#dialog-backdrop, #audio-playback-permission-dialog").show()
  await new Audio(brapi.runtime.getURL("sound/silence.mp3")).play()
  $("#dialog-backdrop, #audio-playback-permission-dialog").hide()
  await brapi.tabs.update(prevTab.id, {active: true})
})

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

async function playAudioOffscreen(urlPromise, options, startTime) {
  const url = await urlPromise
  const hasOffscreen = await sendToOffscreen({method: "pause"}).then(res => res == true, err => false)
  if (!hasOffscreen) {
    const readyPromise = new Promise(f => messageHandlers.offscreenCheckIn = f)
    brapi.offscreen.createDocument({
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Read Aloud would like to play audio in the background",
      url: brapi.runtime.getURL("offscreen.html")
    })
    await readyPromise
  }
  const endPromise = new Promise((fulfill, reject) => {
    messageHandlers.offscreenPlaybackEnded = err => err ? reject(err) : fulfill()
  })
  await sendToOffscreen({method: "play", args: [url, options, startTime]})
  return {
    endPromise: endPromise,
    pause: function() {
      sendToOffscreen({method: "pause"})
        .catch(console.error)
    },
    resume: function() {
      return sendToOffscreen({method: "resume"})
        .then(res => {
          if (res != true) throw new Error("Offscreen player unreachable")
        })
    },
  }

  async function sendToOffscreen(message) {
    message.dest = "offscreen"
    const result = await brapi.runtime.sendMessage(message)
      .catch(err => {
        if (/^(A listener indicated|Could not establish)/.test(err.message)) throw new Error(err.message + " " + message.method)
        throw err
      })
    if (result && result.error) throw result.error
    else return result
  }
}

async function shouldPlaySilence(providerId) {
  const should = await getPlaybackState().then(x => x.state == "PLAYING")
  const now = Date.now()
  if (providerId == this.providerId) {
    this.nextExpectedCheckIn = now + (now - this.lastCheckIn)
    this.lastCheckIn = now
    return should
  }
  else {
    if (now < this.nextExpectedCheckIn) {
      return false
    }
    else {
      this.providerId = providerId
      this.lastCheckIn = now
      return should
    }
  }
}
