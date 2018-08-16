
var browserTtsEngine = brapi.tts ? new BrowserTtsEngine() : (typeof speechSynthesis != 'undefined' ? new WebSpeechEngine() : new DummyTtsEngine());
var remoteTtsEngine = new RemoteTtsEngine(config.serviceUrl, (typeof readAloudManifest != 'undefined') ? readAloudManifest : brapi.runtime.getManifest());
var googleTranslateTts = new GoogleTranslateTts();


/*
interface Options {
  voice: {
    voiceName: string
    autoSelect?: boolean
  }
  lang: string
  rate?: number
  pitch?: number
  volume?: number
}

interface Event {
  type: string
}

interface Voice {
  voiceName: string
  lang: string
}

interface TtsEngine {
  ready: Promise
  speak: function(text: string, opts: Options, onEvent: (e:Event) => void): void
  stop: function(): void
  pause: function(): void
  resume: function(): void
  isSpeaking: function(callback): void
  getVoices: function(): Voice[]
}
*/

function BrowserTtsEngine() {
  this.speak = function(text, options, onEvent) {
    brapi.tts.speak(text, {
      voiceName: options.voice.voiceName,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start", "end"],
      desiredEventTypes: ["start", "end", "error"],
      onEvent: onEvent
    })
  }
  this.stop = brapi.tts.stop;
  this.pause = brapi.tts.pause;
  this.resume = brapi.tts.resume;
  this.isSpeaking = brapi.tts.isSpeaking;
  this.getVoices = function() {
    return new Promise(function(fulfill) {
      brapi.tts.getVoices(function(voices) {
        fulfill(voices || []);
      })
    })
  }
}


function WebSpeechEngine() {
  var utter;
  this.speak = function(text, options, onEvent) {
    utter = new SpeechSynthesisUtterance();
    utter.text = text;
    utter.voice = options.voice;
    if (options.lang) utter.lang = options.lang;
    if (options.pitch) utter.pitch = options.pitch;
    if (options.rate) utter.rate = options.rate;
    if (options.volume) utter.volume = options.volume;
    utter.onstart = onEvent.bind(null, {type: 'start', charIndex: 0});
    utter.onend = onEvent.bind(null, {type: 'end', charIndex: text.length});
    utter.onerror = function(event) {
      onEvent({type: 'error', errorMessage: event.error});
    };
    speechSynthesis.speak(utter);
  }
  this.stop = function() {
    if (utter) utter.onend = null;
    speechSynthesis.cancel();
  }
  this.pause = function() {
    speechSynthesis.pause();
  }
  this.resume = function() {
    speechSynthesis.resume();
  }
  this.isSpeaking = function(callback) {
    callback(speechSynthesis.speaking);
  }
  this.getVoices = function() {
    return new Promise(function(fulfill) {
      var voices = speechSynthesis.getVoices() || [];
      if (voices.length) fulfill(voices);
      else speechSynthesis.onvoiceschanged = function() {
        fulfill(speechSynthesis.getVoices() || []);
      }
    })
    .then(function(voices) {
      for (var i=0; i<voices.length; i++) voices[i].voiceName = voices[i].name;
      return voices;
    })
  }
}


function DummyTtsEngine() {
  this.getVoices = function() {
    return Promise.resolve([]);
  }
}


function TimeoutTtsEngine(baseEngine, timeoutMillis) {
  var timer;
  this.speak = function(text, options, onEvent) {
    clearTimeout(timer);
    timer = setTimeout(function() {
      baseEngine.stop();
      onEvent({type: "end", charIndex: text.length});
    },
    timeoutMillis);
    baseEngine.speak(text, options, function(event) {
        if (event.type == "end" || event.type == "error") clearTimeout(timer);
        onEvent(event);
    })
  }
  this.stop = function() {
    clearTimeout(timer);
    baseEngine.stop();
  }
  this.isSpeaking = baseEngine.isSpeaking;
}


function RemoteTtsEngine(serviceUrl, manifest) {
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  var audio = document.createElement("AUDIO");
  var prefetchAudio = document.createElement("AUDIO");
  var isSpeaking = false;
  var nextStartTime = 0;
  var waitTimer;
  var voices = manifest.tts_engine.voices.map(function(voice) {
    return {voiceName: voice.voice_name, lang: voice.lang};
  })
  var voiceMap = voices.groupBy(function(x) {return x.voiceName});
  var clientId;
  this.ready = getUniqueClientId().then(function(id) {
    clientId = id;
  })
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    audio.pause();
    if (!iOS) {
      audio.volume = options.volume;
      audio.defaultPlaybackRate = options.rate;
    }
    audio.src = getAudioUrl(utterance, options.lang, options.voice);
    audio.oncanplay = function() {
      var waitTime = nextStartTime - new Date().getTime();
      if (waitTime > 0) waitTimer = setTimeout(audio.play.bind(audio), waitTime);
      else audio.play();
      isSpeaking = true;
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    audio.load();
  }
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  }
  this.pause =
  this.stop = function() {
    clearTimeout(waitTimer);
    audio.pause();
  }
  this.resume = function() {
    audio.play();
  }
  this.prefetch = function(utterance, options) {
    if (!iOS) {
      prefetchAudio.src = getAudioUrl(utterance, options.lang, options.voice);
      prefetchAudio.load();
    }
  }
  this.setNextStartTime = function(time, options) {
    if (!iOS)
      nextStartTime = time || 0;
  }
  this.getVoices = function() {
    return voices;
  }
  this.hasVoice = function(voiceName) {
    return voiceMap[voiceName] != null;
  }
  function getAudioUrl(utterance, lang, voice) {
    assert(utterance && lang && voice && clientId);
    return serviceUrl + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voice.voiceName) + "?c=" + encodeURIComponent(clientId) + (voice.autoSelect ? '&a=1' : '') + "&q=" + encodeURIComponent(utterance);
  }
}


function GoogleTranslateTts() {
  var prevTab;
  var translateTab;
  var promise;
  this.getEngine = function() {
    if (!promise) promise = createEngine();
    return promise;
  }
  function createEngine() {
    return savePrevTab()
      .then(createTranslateTab)
      .then(waitForConnect)
      .then(function(port) {
        return new Promise(function(fulfill, reject) {
          var engine = new GoogleTranslateTtsEngine(port,
            function(isReady) { //onReady
              if (isReady) fulfill(engine);
              else reject(new Error("Failed to start TTS worker"));
            },
            function() {  //onDisconnect
              promise = null;
            })
        })
      })
      .then(extraAction(restorePrevTab))
      .catch(function(err) {
        removeTranslateTab();
        promise = null;
        throw err;
      })
  }
  function savePrevTab() {
    return getActiveTab().then(function(tab) {
      prevTab = tab;
    })
  }
  function restorePrevTab() {
    setTimeout(function() {
      brapi.tabs.update(prevTab.id, {active: true})
    }, 1500)
  }
  function createTranslateTab() {
    return new Promise(function(fulfill, reject) {
      brapi.tabs.create({url: "https://translate.google.com/"}, function(tab) {
        if (brapi.runtime.lastError) reject(brapi.runtime.lastError);
        else fulfill(translateTab = tab);
      })
    })
  }
  function removeTranslateTab() {
    if (translateTab) {
      brapi.tabs.remove(translateTab.id);
      translateTab = null;
    }
  }
  function injectScripts() {
    return executeScript({tabId: translateTab.id, file: "js/messaging.js"})
      .then(executeScript.bind(null, {tabId: translateTab.id, file: "js/google-translate.js"}))
  }
  function waitForConnect() {
    return new Promise(function(fulfill, reject) {
      function onConnect(port) {
        if (port.name == "GoogleTranslateTtsWorker") {
          brapi.runtime.onConnect.removeListener(onConnect);
          clearTimeout(timer);
          fulfill(port);
        }
      }
      function onError(err) {
        brapi.runtime.onConnect.removeListener(onConnect);
        clearTimeout(timer);
        reject(err);
      }
      function onTimeout() {
        brapi.runtime.onConnect.removeListener(onConnect);
        reject(new Error("Timeout waiting for TTS worker to connect"));
      }
      brapi.runtime.onConnect.addListener(onConnect);
      injectScripts().catch(onError);
      var timer = setTimeout(onTimeout, 5000);
    })
  }
}


function GoogleTranslateTtsEngine(port, onReady, onDisconnect) {
  var onEvent;
  var sm = new StateMachine({
    IDLE: {
      onReady: function(isReady) {
        onReady(isReady);
        return isReady ? "READY" : "DEAD";
      },
      onDisconnect: function() {
        onReady(false);
        onDisconnect();
        return "DEAD";
      }
    },
    READY: {
      speak: function(text, options, onEvt) {
        onEvent = onEvt;
        peer.invoke("speak", text, options).then(sm.trigger.bind(sm, "onEvent", {type: "start"}));
        return "SPEAKING";
      },
      onDisconnect: function() {
        onDisconnect();
        return "DEAD";
      },
    },
    SPEAKING: {
      speak: function(text, options, onEvt) {
        onEvent = onEvt;
        peer.invoke("speak", text, options).then(sm.trigger.bind(sm, "onEvent", {type: "start"}));
      },
      stop: function() {
        peer.invoke("stop");
        return "READY";
      },
      onEvent: function(event) {
        onEvent(event);
        if (event.type == "end" || event.type == "error") return "READY";
      },
      onDisconnect: function() {
        onEvent({type: "error", errorMessage: "Lost connection to GoogleTranslate speech engine"});
        onDisconnect();
        return "DEAD";
      },
    },
    DEAD: {
      onDisconnect: onDisconnect,
    }
  })
  var peer = new RpcPeer(new ExtensionMessagingPeer(port));
  peer.onInvoke = function(method, arg0) {
    if (method == "onReady") sm.trigger("onReady", arg0);
    else if (method == "onEvent") sm.trigger("onEvent", arg0);
    else if (method == "getMessages") return arg0.map(function(key) {return brapi.i18n.getMessage(key)});
    else console.error("Unknown method " + method);
  }
  peer.onDisconnect = sm.trigger.bind(sm, "onDisconnect");
  this.speak = function(text, options, onEvt) {
    if (options.voice.voiceName) {
      var manifest = brapi.runtime.getManifest();
      var voice = manifest.tts_engine.voices.find(function(x) {return x.voice_name == options.voice.voiceName});
      if (voice) options.lang = voice.lang;
    }
    sm.trigger("speak", text, options, onEvt);
  }
  this.isSpeaking = function(callback) {
    peer.invoke("isSpeaking")
      .then(callback)
  }
  this.stop = sm.trigger.bind(sm, "stop");
  this.pause = peer.invoke.bind(peer, "pause");
  this.resume = peer.invoke.bind(peer, "resume");
  this.prefetch = peer.invoke.bind(peer, "prefetch");
  this.setNextStartTime = peer.invoke.bind(peer, "setNextStartTime");
}
