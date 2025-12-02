
const isEmbedded = top != self
var queryString = new URLSearchParams(location.search)
var activeDoc;
var playbackError = null;
var lastUrlPromise = Promise.resolve(null)


const piperSubject = new rxjs.Subject()
const piperObservable = rxjs.defer(() => {
  createPiperFrame()
  return piperSubject
})
  .pipe(
    rxjs.shareReplay({ bufferSize: 1, refCount: false })
  )
const piperCallbacks = new rxjs.Subject()
const piperDispatcher = makeDispatcher("piper-host", {
  advertiseVoices({ voices }, sender) {
    updateSettings({ piperVoices: voices })
    piperSubject.next(sender)
  },
  onStart: args => piperCallbacks.next({ type: "start", ...args }),
  onSentence: args => piperCallbacks.next({ type: "sentence", ...args }),
  onParagraph: args => piperCallbacks.next({ type: "paragraph", ...args }),
  onEnd: args => piperCallbacks.next({ type: "end", ...args }),
  onError: args => piperCallbacks.next({ type: "error", ...args }),
  audioPlay: args => audioPlayer.play(args.src, args.rate, args.volume),
  audioPause: () => audioPlayer.pause(),
  audioResume: () => audioPlayer.resume(),
})

const audioPlayer = immediate(() => {
  let current
  return {
    play(src, rate, volume) {
      if (current) current.playback.unsubscribe()
      const url = (src instanceof Blob) ? URL.createObjectURL(src) : src
      const playbackState$ = new rxjs.BehaviorSubject("resumed")
      return new Promise((fulfill, reject) => {
        current = {
          playbackState$,
          playback: playAudio(Promise.resolve(url), { rate, volume }, playbackState$).subscribe({
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


const fasttextSubject = new rxjs.Subject()
const fasttextObservable = rxjs.defer(() => {
  createFasttextFrame()
  return fasttextSubject
})
  .pipe(
    rxjs.startWith(null),
    rxjs.shareReplay({ bufferSize: 1, refCount: false })
  )
const fasttextDispatcher = makeDispatcher("fasttext-host", {
  onServiceReady(args, sender) {
    fasttextSubject.next(sender)
  }
})


window.addEventListener("message", event => {
  const send = message => event.source.postMessage(message, { targetOrigin: event.origin })

  piperDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({ from: "piper-host", to: "piper-service", type: "request", id, method, args })
      return piperDispatcher.waitForResponse(id)
    }
  }, send)

  fasttextDispatcher.dispatch(event.data, {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({ from: "fasttext-host", to: "fasttext-service", type: "request", id, method, args })
      return fasttextDispatcher.waitForResponse(id)
    }
  }, send)
})



const idleSubject = new rxjs.BehaviorSubject(true)

if (queryString.has("autoclose"))
  rxjs.combineLatest(idleSubject, piperSubject.pipe(rxjs.startWith(null)))
    .pipe(
      rxjs.switchMap(([isIdle, piper]) => {
        if (isIdle) return rxjs.timer(queryString.get("autoclose") == "long" || piper ? 15 * 60 * 1000 : 5 * 60 * 1000)
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
  getLastUrl: () => lastUrlPromise,
  synthesizeDownloadAudio: synthesizeDownloadAudio,
}

registerMessageListener("player", messageHandlers)

if (queryString.has("opener")) {
  brapi.runtime.sendMessage({ dest: queryString.get("opener"), method: "playerCheckIn" })
    .catch(console.error)
} else {
  bgPageInvoke("playerCheckIn")
    .catch(console.error)
}

document.addEventListener("DOMContentLoaded", initialize)

async function synthesizeDownloadAudio(text) {
  console.log("PLAYER: synthesizeDownloadAudio received:", text);

  // Load settings
  const settings = await getSettings(["voiceName", "rate", "pitch", "voices"]);

  // Resolve voice list
  let voiceList = settings.voices || [];
  if (!voiceList.length) {
    // fallback: detect voices from engines (GoogleTranslate)
    voiceList = googleTranslateTtsEngine.getVoices();
  }

  // Resolve active voice
  const voiceName =
    settings.voiceName ||
    (voiceList[0] && voiceList[0].voiceName);

  let voice = voiceList.find(v => v.voiceName === voiceName);

  if (!voice) {
    console.error("Voice detection failed. settings.voiceName =", settings.voiceName);
    throw new Error("Unable to detect current playback voice");
  }

  console.log("Voice detected for DOWNLOAD:", voice);

  // if GoogleTranslate voice → force English Wavenet voice
  if (voice.voiceName.startsWith("GoogleTranslate")) {
    console.warn("GoogleTranslate voice detected — forcing Wavenet");

    // Load Wavenet voices properly (it's async)
    let wavenetList = [];
    try {
      wavenetList = await googleWavenetTtsEngine.getVoices();
    } catch (e) {
      console.error("Failed to load Wavenet voices:", e);
    }

    console.log("Loaded Wavenet list:", wavenetList);

    // Pick English voice
    const fallbackVoice = wavenetList.find(v => v.lang && v.lang.startsWith("en")) || null;

    console.log("FallbackVoice: ", fallbackVoice);

    if (!fallbackVoice) {
      throw new Error("No English Wavenet voices available.");
    }

    // override actual voice
    voice = fallbackVoice;

  }

  const options = {
    lang: voice.lang,
    voice: voice,
    rate: settings.rate || 1.0,
    pitch: settings.pitch || 1.0,
  };

  console.log(" Step 1 — worked");

  // Create Speech instance
  const speech = new Speech([text], options);

  console.log(" Step 2 — worked");

  const engine = speech.engine || speech._engine || speech.__engine;
  if (!engine) throw new Error("Cannot access speech engine");

  console.log("Using engine for DOWNLOAD:", engine.constructor.name);
  console.log(" Step 3 — worked");

  // Get audio URL
  let url;

  if (engine.getAudioUrl) {
    url = await engine.getAudioUrl(text, options.voice, options.pitch);
  } else {
    url = await getAudioUrlForDownload(engine, text, options);
  }

  if (!url) throw new Error("Unable to obtain audio URL");

  console.log(" Step 4 — worked");

  // Fetch blob
  const blob = await fetch(url).then(r => r.blob());

  console.log(" Step 5 — worked");

  // Convert to base64
  return await new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}


async function getAudioUrlForDownload(engine, text, options) {

  // Case 1: Engine already has getAudioUrl()
  if (engine.getAudioUrl) {
    return await engine.getAudioUrl(text, options.voice, options.pitch);
  }

  // Case 2: Google Translate engine
  if (engine.constructor.name === "GoogleTranslateTtsEngine") {
    throw new Error("GoogleTranslate engine cannot be used for download");
  }

  // Case 3: OpenAI engine
  if (engine.constructor.name === "OpenaiTtsEngine") {
    return await engine._getAudioUrl(text, options.voice, options.pitch);
  }

  // Case 4: If engine starts playback using playAudio(url)
  if (engine.speak) {
    // Patch speak() to capture the URL
    return new Promise(async (resolve, reject) => {
      const playback = engine.speak(text, options, new rxjs.BehaviorSubject("resumed"));
      playback.subscribe({
        next(event) {
          if (event.type === "start" && event.src) {
            resolve(event.src); // capture URL
          }
        },
        error: reject,
        complete: () => reject("No URL found")
      });
    });
  }

  throw new Error("Engine does not support audio download");
}


async function synthesizeBlob(text) {
  const opts = await getSettings(["voiceName", "rate", "pitch"])
    .then(x => ({
      voice: { voiceName: x.voiceName },
      rate: x.rate,
      pitch: x.pitch,
    }));

  // Create temporary Speech instance
  const speech = new Speech([text], opts);

  // Instead of createAudioBlob(), use the engine directly:
  const engine = speech.engine;  // internal engine chosen by pickEngine()

  if (!engine.getAudioUrl) {
    throw new Error("Selected voice engine does not support audio download.");
  }

  // Get raw URL
  const url = await engine.getAudioUrl(text, opts.voice, opts.pitch);

  // Convert URL to Blob
  const res = await fetch(url);
  const blob = await res.blob();

  return blob;
}


function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function synthesizeSpeech(text, options) {
  // Use the same engine the player normally uses
  const speech = new Speech([text], options);

  // call internal engine to produce audio Blob
  const audio = await speech.createAudioBlob();
  return audio;
}

async function initialize() {
  setI18nText()

  $("#hidethistab-link")
    .toggle(canUseEmbeddedPlayer() && !(await getSettings()).useEmbeddedPlayer)
    .click(function () {
      $("#dialog-backdrop, #hidethistab-dialog").show()
    })

  $("#hidethistab-dialog .btn, #hidethistab-dialog .close")
    .click(function (event) {
      $("#dialog-backdrop, #hidethistab-dialog").hide()
      if ($(event.target).is(".btn-ok")) {
        updateSettings({ useEmbeddedPlayer: true })
          .then(() => window.close())
          .catch(console.error)
      }
    })
}

function playText(text, opts) {
  opts = opts || {}
  playbackError = null
  if (!activeDoc) {
    openDoc(new SimpleSource(text.split(/(?:\r?\n){2,}/), { lang: opts.lang }), function (err) {
      if (err) playbackError = err
    })
  }
  const doc = activeDoc
  return activeDoc.play()
    .catch(function (err) {
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
    openDoc(new TabSource(), function (err) {
      if (err) playbackError = err
    })
  }
  const doc = activeDoc
  return activeDoc.play()
    .catch(function (err) {
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
      .then(function (results) {
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
      playbackError: errorToJson(playbackError),
    }
  }
}

function openDoc(source, onEnd) {
  activeDoc = new Doc(source, function (err) {
    handleError(err);
    closeDoc();
    if (typeof onEnd == "function") onEnd(err);
  })
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

var requestAudioPlaybackPermission = lazy(async function () {
  const thisTab = await brapi.tabs.getCurrent()
  const prevTab = await brapi.tabs.query({ windowId: thisTab.windowId, active: true }).then(tabs => tabs[0])
  await brapi.tabs.update(thisTab.id, { active: true })
  $("#dialog-backdrop, #audio-playback-permission-dialog").show()
  await new Audio(brapi.runtime.getURL("sound/silence.mp3")).play()
  $("#dialog-backdrop, #audio-playback-permission-dialog").hide()
  await brapi.tabs.update(prevTab.id, { active: true })
})

async function createOffscreen() {
  const readyPromise = new Promise(f => messageHandlers.offscreenCheckIn = f)
  brapi.offscreen.createDocument({
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Read Aloud would like to play audio in the background",
    url: brapi.runtime.getURL("offscreen.html")
  })
  await readyPromise
}

function playAudioOffscreen(urlPromise, options, playbackState$) {
  return rxjs.from(urlPromise).pipe(
    rxjs.exhaustMap(url =>
      playbackState$.pipe(
        rxjs.distinctUntilChanged(),
        rxjs.skipWhile(state => state != "resumed"),
        rxjs.scan((playback$, state) => {
          if (state == "resumed") {
            return rxjs.defer(async () => {
              if (!playback$) {
                const result = await sendToOffscreen({ method: "play", args: [url, options] })
                if (result != true) throw "Offscreen doc not present"
              } else {
                const result = await sendToOffscreen({ method: "resume" })
                if (result != true) throw "Offscreen doc gone"
              }
            }).pipe(
              rxjs.catchError(err => {
                console.debug(err)
                return rxjs.defer(createOffscreen).pipe(
                  rxjs.exhaustMap(async () => {
                    const result = await sendToOffscreen({ method: "play", args: [url, options] })
                    if (result != true) throw new Error("Offscreen doc inaccessible")
                  })
                )
              }),
              rxjs.exhaustMap(() =>
                rxjs.NEVER.pipe(
                  rxjs.finalize(() => {
                    sendToOffscreen({ method: "pause" })
                      .catch(console.error)
                  })
                )
              )
            )
          } else {
            return rxjs.EMPTY
          }
        }, null),
        rxjs.switchAll()
      )
    ),
    rxjs.mergeWith(
      new rxjs.Observable(observer => {
        messageHandlers.offscreenPlaybackEvent = function (event) {
          if (event.type == "error") observer.error(event.error)
          else observer.next(event)
        }
      })
    ),
    rxjs.takeWhile(event => event.type != "end", true)
  )
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
        brapi.windows.update(tab.windowId, { focused: true }),
        brapi.tabs.update(tab.id, { active: true })
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
