
const isEmbedded = top != self
var queryString = new URLSearchParams(location.search)
var activeDoc;
var playbackError = null;
var playbackCompleted = false;
var lastUrlPromise = Promise.resolve(null)

maintainPlaybackWakeLock(async () => {
  const doc = activeDoc
  return !!doc && await doc.getState() == "PLAYING" && doc == activeDoc
})


const piperSubject = new rxjs.Subject()
const piperObservable = rxjs.defer(() => {
    createPiperFrame()
    return piperSubject
  })
  .pipe(
    rxjs.shareReplay({bufferSize: 1, refCount: false}),
    rxjs.tap(raisePiperFrame)
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
  audioPlay: args => audioPlayer.play(args.src, args.rate, args.volume),
  audioPause: () => audioPlayer.pause(),
  audioResume: () => audioPlayer.resume(),
})


const supertonicSubject = new rxjs.Subject()
const supertonic$ = rxjs.defer(() => {
  createSupertonicFrame()
  return supertonicSubject
}).pipe(
  rxjs.shareReplay({bufferSize: 1, refCount: false}),
  rxjs.tap(raiseSupertonicFrame)
)
const supertonicCallbacks = new rxjs.Subject()
const supertonicDispatcher = makeDispatcher("supertonic-host", {
  advertiseVoices({voices}, sender) {
    updateSettings({supertonicVoices: voices})
    supertonicSubject.next(sender)
  },
  onStart: args => supertonicCallbacks.next({type: "start", ...args}),
  onSentence: args => supertonicCallbacks.next({type: "sentence", ...args}),
  onParagraph: args => supertonicCallbacks.next({type: "paragraph", ...args}),
  onEnd: args => supertonicCallbacks.next({type: "end", ...args}),
  onError: args => supertonicCallbacks.next({type: "error", ...args}),
  audioPlay: args => audioPlayer.play(args.src, args.rate, args.volume),
  audioPause: () => audioPlayer.pause(),
  audioResume: () => audioPlayer.resume(),
})


const pocketTtsSubject = new rxjs.Subject()
const pocketTts$ = rxjs.defer(() => {
  createPocketTtsFrame()
  return pocketTtsSubject
}).pipe(
  rxjs.shareReplay({bufferSize: 1, refCount: false}),
  rxjs.tap(raisePocketTtsFrame)
)
const pocketTtsCallbacks = new rxjs.Subject()
const pocketTtsDispatcher = makeDispatcher("pocket-host", {
  advertiseVoices({voices}, sender) {
    updateSettings({pocketTtsVoices: voices})
    pocketTtsSubject.next(sender)
  },
  onStart: args => pocketTtsCallbacks.next({type: "start", ...args}),
  onSentence: args => pocketTtsCallbacks.next({type: "sentence", ...args}),
  onParagraph: args => pocketTtsCallbacks.next({type: "paragraph", ...args}),
  onEnd: args => pocketTtsCallbacks.next({type: "end", ...args}),
  onError: args => pocketTtsCallbacks.next({type: "error", ...args}),
  audioPlay: args => audioPlayer.play(args.src, args.rate, args.volume),
  audioPause: () => audioPlayer.pause(),
  audioResume: () => audioPlayer.resume(),
})


const nghiTtsSubject = new rxjs.Subject()
const nghiTtsObservable = rxjs.defer(() => {
  createNghiTtsFrame()
  return nghiTtsSubject
}).pipe(
  rxjs.shareReplay({bufferSize: 1, refCount: false}),
  rxjs.tap(raiseNghiTtsFrame)
)
const nghiTtsCallbacks = new rxjs.Subject()
const nghiTtsDispatcher = makeDispatcher("nghitts-host", {
  advertiseVoices({voices}, sender) {
    updateSettings({nghiTtsVoices: voices})
    nghiTtsSubject.next(sender)
  },
  onStart: args => nghiTtsCallbacks.next({type: "start", ...args}),
  onSentence: args => nghiTtsCallbacks.next({type: "sentence", ...args}),
  onParagraph: args => nghiTtsCallbacks.next({type: "paragraph", ...args}),
  onEnd: args => nghiTtsCallbacks.next({type: "end", ...args}),
  onError: args => nghiTtsCallbacks.next({type: "error", ...args}),
})


const audioPlayer = immediate(() => {
  let current
  return {
    play(src, rate, volume) {
      if (current) current.playback.unsubscribe()
      const isBlob = src instanceof Blob
      const url = isBlob ? URL.createObjectURL(src) : src
      const playbackState$ = new rxjs.BehaviorSubject("resumed")
      return new Promise((fulfill, reject) => {
        current = {
          playbackState$,
          playback: playAudio(Promise.resolve(url), {rate, volume}, playbackState$).subscribe({
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

  supertonicDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({from: "supertonic-host", to: "supertonic-service", type: "request", id, method, args})
      return supertonicDispatcher.waitForResponse(id)
    }
  }, send)

  pocketTtsDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({from: "pocket-host", to: "pocket-service", type: "request", id, method, args})
      return pocketTtsDispatcher.waitForResponse(id)
    }
  }, send)

  nghiTtsDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({from: "nghitts-host", to: "nghitts-service", type: "request", id, method, args})
      return nghiTtsDispatcher.waitForResponse(id)
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

if (queryString.has("autoclose")) {
  rxjs.combineLatest(
    idleSubject,
    piperSubject.pipe(rxjs.startWith(null)),
    supertonicSubject.pipe(rxjs.startWith(null)),
    pocketTtsSubject.pipe(rxjs.startWith(null)),
    nghiTtsSubject.pipe(rxjs.startWith(null))
  ).pipe(
    rxjs.switchMap(([isIdle, piper, supertonic, pocketTts, nghiTts]) =>
      rxjs.iif(
        () => isIdle,
        rxjs.timer(queryString.get("autoclose") == "long" || piper || supertonic || pocketTts || nghiTts ? 15*60*1000 : 5*60*1000),
        rxjs.EMPTY
      )
    )
  ).subscribe(closePlayer)
}


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
  manageSupertonicVoices,
  managePocketTtsVoices,
  manageNghiTtsVoices,
  getLastUrl: () => lastUrlPromise,
}

registerMessageListener("player", messageHandlers)

if (queryString.has("opener")) {
  brapi.runtime.sendMessage({dest: queryString.get("opener"), method: "playerCheckIn"})
    .catch(console.error)
} else {
  bgPageInvoke("playerCheckIn")
    .catch(console.error)
}

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
  playbackCompleted = false
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
      .finally(() => {
        playbackError = null
      })
  }
  else {
    return {
      state: "STOPPED",
      playbackCompleted,
      playbackError: errorToJson(playbackError),
    }
  }
}

function openDoc(source, onEnd) {
  playbackCompleted = false
  const doc = new Doc(source, function(err) {
    if (activeDoc !== doc) return
    playbackCompleted = !err
    handleError(err);
    closeDoc();
    if (typeof onEnd == "function") onEnd(err);
  })
  activeDoc = doc
  idleSubject.next(false)
  lastUrlPromise = Promise.resolve(source.getUri())
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
    lastUrlPromise
      .then(url => bgPageInvoke("reportIssue", [url, details]))
      .catch(console.error)
  }
}

function playAudio(urlPromise, options, playbackState$) {
  if (brapi.offscreen) {
    return playAudioOffscreen(urlPromise, options, playbackState$)
  }
  else {
    return playAudioHere(requestAudioPlaybackPermission().then(() => urlPromise), options, playbackState$)
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

// Commands are ordered even when RxJS cancels a pending asynchronous start.
// Session IDs make late cleanup and events harmless to subsequent playback.
var offscreenCommandQueue = Promise.resolve()
var offscreenEventHandlers = new Map()
messageHandlers.offscreenPlaybackEvent = (event, id) => {
  const handler = offscreenEventHandlers.get(id)
  if (handler) handler(event, id)
}
function queueOffscreenCommand(command) {
  const result = offscreenCommandQueue.then(command)
  offscreenCommandQueue = result.catch(() => {})
  return result
}

function playAudioOffscreen(urlPromise, options, playbackState$) {
  return new rxjs.Observable(observer => {
    const id = crypto.randomUUID()
    let disposed = false
    let revision = 0
    let subscription
    const eventHandler = (event, sessionId) => {
      if (sessionId != id || disposed) return
      if (event.type == "error") observer.error(event.error)
      else {
        observer.next(event)
        if (event.type == "end") observer.complete()
      }
    }
    offscreenEventHandlers.set(id, eventHandler)

    Promise.resolve(urlPromise).then(url => {
      if (disposed) return
      subscription = playbackState$.pipe(rxjs.distinctUntilChanged()).subscribe({
        next(state) {
          const request = ++revision
          queueOffscreenCommand(async () => {
            if (disposed || request != revision) return
            if (state != "resumed") {
              await sendToOffscreen({method: "pause", args: [id]}).catch(() => {})
              return
            }
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                await offscreenTimeout(() => bgPageInvoke("ensureOffscreen"), 45000)
                if (disposed || request != revision) return
                // Idempotent for this session: resume existing audio, or start
                // again if Chrome discarded the document while it was paused.
                const result = await sendToOffscreen({method: "play", args: [url, options, id]})
                if (result !== true) throw new Error("Offscreen document inaccessible")
                return
              } catch (err) {
                if (disposed || request != revision) return
                if (attempt || err.offscreenApplicationError) throw err
              }
            }
          }).catch(err => {
            if (!disposed && request == revision) observer.error(err)
          })
        },
        error: err => observer.error(err)
      })
    }, err => observer.error(err))

    return () => {
      disposed = true
      revision++
      if (subscription) subscription.unsubscribe()
      offscreenEventHandlers.delete(id)
      queueOffscreenCommand(() => sendToOffscreen({method: "stop", args: [id]})).catch(() => {})
    }
  })
}

async function offscreenTimeout(operation, timeout = 5000) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => timer = setTimeout(() => reject(new Error("Offscreen operation timed out")), timeout))
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function sendToOffscreen(message) {
  const result = await offscreenTimeout(() => brapi.runtime.sendMessage({...message, dest: "offscreen"}))
  if (result && result.error) {
    const err = new Error(result.error.message || String(result.error))
    err.offscreenApplicationError = true
    throw err
  }
  return result
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

function raisePiperFrame() {
  const maxZ = $('iframe').get().reduce((max, f) => Math.max(max, Number(f.style.zIndex) || 0), 0)
  $('#piper-frame').css('z-index', maxZ + 1)
}

function manageSupertonicVoices() {
  if (isEmbedded) {
    return "POPOUT"
  } else {
    rxjs.firstValueFrom(supertonic$)
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

function createSupertonicFrame() {
  const f = document.createElement("iframe")
  f.id = "supertonic-frame"
  f.src = "https://supertonic.ttstool.com/"
  f.allow = "cross-origin-isolated"
  f.style.position = "absolute"
  f.style.left =
  f.style.top = "0"
  f.style.width =
  f.style.height = "100%"
  f.style.borderWidth = "0"
  document.body.appendChild(f)
}

function raiseSupertonicFrame() {
  const maxZ = $('iframe').get().reduce((max, f) => Math.max(max, Number(f.style.zIndex) || 0), 0)
  $('#supertonic-frame').css('z-index', maxZ + 1)
}

function managePocketTtsVoices() {
  if (isEmbedded) {
    return "POPOUT"
  } else {
    rxjs.firstValueFrom(pocketTts$)
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

function createPocketTtsFrame() {
  const f = document.createElement("iframe")
  f.id = "pockettts-frame"
  f.src = "https://pocket.ttstool.com/"
  f.allow = "cross-origin-isolated"
  f.style.position = "absolute"
  f.style.left =
  f.style.top = "0"
  f.style.width =
  f.style.height = "100%"
  f.style.borderWidth = "0"
  document.body.appendChild(f)
}

function raisePocketTtsFrame() {
  const maxZ = $('iframe').get().reduce((max, f) => Math.max(max, Number(f.style.zIndex) || 0), 0)
  $('#pockettts-frame').css('z-index', maxZ + 1)
}

function manageNghiTtsVoices() {
  if (isEmbedded) {
    return "POPOUT"
  } else {
    rxjs.firstValueFrom(nghiTtsObservable)
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

function createNghiTtsFrame() {
  const f = document.createElement("iframe")
  f.id = "nghitts-frame"
  f.src = "https://nghitts.ttstool.com/?embed=1"
  f.allow = "cross-origin-isolated"
  f.style.position = "absolute"
  f.style.left =
  f.style.top = "0"
  f.style.width =
  f.style.height = "100%"
  f.style.borderWidth = "0"
  document.body.appendChild(f)
}

function raiseNghiTtsFrame() {
  const maxZ = $('iframe').get().reduce((max, f) => Math.max(max, Number(f.style.zIndex) || 0), 0)
  $('#nghitts-frame').css('z-index', maxZ + 1)
}


function createFasttextFrame() {
  const f = document.createElement("iframe")
  f.id = "fasttext-frame"
  f.src = "https://ttstool.com/fasttext/index.html"
  f.allow = "cross-origin-isolated"
  f.style.display = "none"
  document.body.appendChild(f)
}
