
const isEmbedded = top != self
var queryString = new URLSearchParams(location.search)
var activeDoc;
var playbackError = null;


const piperSubject = new rxjs.Subject()
const piperObservable = rxjs.defer(() => {
    createPiperFrame()
    return piperSubject
  })
  .pipe(
    rxjs.shareReplay({bufferSize: 1, refCount: false})
  )
const piperCallbacks = new rxjs.Subject()
const piperDispatcher = makeDispatcher("piper-host", {
  advertiseVoices({voices}, sender) {
    updateSettings({piperVoices: voices})
    piperSubject.next(sender)
  },
  onStart: args => piperCallbacks.next({type: "start", ...args}),
  onSentence: args => piperCallbacks.next({type: "sentence", ...args}),
  onParagraph: args => piperCallbacks.next({type: "paragraph", ...args}),
  onEnd: args => piperCallbacks.next({type: "end", ...args}),
  onError: args => piperCallbacks.next({type: "error", ...args}),
})


const fasttextSubject = new rxjs.Subject()
const fasttextObservable = rxjs.defer(() => {
    createFasttextFrame()
    return fasttextSubject
  })
  .pipe(
    rxjs.startWith(null),
    rxjs.shareReplay({bufferSize: 1, refCount: false})
  )
const fasttextDispatcher = makeDispatcher("fasttext-host", {
  onServiceReady(args, sender) {
    fasttextSubject.next(sender)
  }
})


window.addEventListener("message", event => {
  const send = message => event.source.postMessage(message, {targetOrigin: event.origin})

  piperDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({from: "piper-host", to: "piper-service", type: "request", id, method, args})
      return piperDispatcher.waitForResponse(id)
    }
  }, send)

  fasttextDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({from: "fasttext-host", to: "fasttext-service", type: "request", id, method, args})
      return fasttextDispatcher.waitForResponse(id)
    }
  }, send)
})



const idleSubject = new rxjs.BehaviorSubject(true)

if (queryString.has("autoclose"))
  rxjs.combineLatest(idleSubject, piperSubject.pipe(rxjs.startWith(null)))
    .pipe(
      rxjs.switchMap(([isIdle, piper]) => {
        if (isIdle) return rxjs.timer(piper ? 30*60*1000 : 5*60*1000)
        else return rxjs.EMPTY
      })
    )
    .subscribe(closePlayer)



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
  startPairing: () => phoneTtsEngine.startPairing(),
  isPaired: () => phoneTtsEngine.isPaired(),
  managePiperVoices,
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
          speechInfo: results[1] && results[1].getInfo(),
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
  idleSubject.next(false)
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
    idleSubject.next(true)
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

function playAudio(urlPromise, options, startTime) {
  if (brapi.offscreen) {
    return playAudioOffscreen(urlPromise, options, startTime)
  }
  else {
    return playAudioHere(requestAudioPlaybackPermission().then(() => urlPromise), options, startTime)
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

async function createOffscreenIfNotExist() {
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
}

function playAudioOffscreen(urlPromise, options, startTime) {
  const readyPromise = createOffscreenIfNotExist().then(() => urlPromise)
  const startPromise = readyPromise.then(url => sendToOffscreen({method: "play", args: [url, options, startTime]}))
  const endPromise = new Promise((fulfill, reject) => {
    messageHandlers.offscreenPlaybackEnded = err => err ? reject(err) : fulfill()
  })
  return {
    startPromise,
    endPromise: endPromise,
    pause: function() {
      readyPromise
        .then(() => sendToOffscreen({method: "pause"}))
        .catch(console.error)
    },
    resume: function() {
      return readyPromise
        .then(() => sendToOffscreen({method: "resume"}))
        .then(res => {
          if (res != true) throw new Error("Offscreen player unreachable")
        })
    },
  }
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

function managePiperVoices() {
  if (isEmbedded) {
    return "POPOUT"
  }
  else {
    rxjs.firstValueFrom(piperObservable)
      .catch(console.error)
    brapi.tabs.getCurrent()
      .then(tab => Promise.all([
        brapi.windows.update(tab.windowId, {focused: true}),
        brapi.tabs.update(tab.id, {active: true})
      ]))
      .catch(console.error)
    return "OK"
  }
}

function createPiperFrame() {
  const f = document.createElement("iframe")
  f.id = "piper-frame"
  f.src = "https://piper.ttstool.com/"
  f.allow = "cross-origin-isolated"
  f.style.position = "absolute"
  f.style.left =
  f.style.top = "0"
  f.style.width =
  f.style.height = "100%"
  f.style.borderWidth = "0"
  document.body.appendChild(f)
}

function createFasttextFrame() {
  const f = document.createElement("iframe")
  f.id = "fasttext-frame"
  f.src = "https://ttstool.com/fasttext/index.html"
  f.allow = "cross-origin-isolated"
  f.style.display = "none"
  document.body.appendChild(f)
}
