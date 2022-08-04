
var browserTtsEngine = brapi.tts ? new BrowserTtsEngine() : (typeof speechSynthesis != 'undefined' ? new WebSpeechEngine() : new DummyTtsEngine());
var remoteTtsEngine = new RemoteTtsEngine(config.serviceUrl);
var googleTranslateTtsEngine = new GoogleTranslateTtsEngine();
var amazonPollyTtsEngine = new AmazonPollyTtsEngine();
var googleWavenetTtsEngine = new GoogleWavenetTtsEngine();
var ibmWatsonTtsEngine = new IbmWatsonTtsEngine();


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
    return promiseTimeout(1500, "Timeout WebSpeech getVoices", new Promise(function(fulfill) {
      var voices = speechSynthesis.getVoices() || [];
      if (voices.length) fulfill(voices);
      else speechSynthesis.onvoiceschanged = function() {
        fulfill(speechSynthesis.getVoices() || []);
      }
    }))
    .then(function(voices) {
      for (var i=0; i<voices.length; i++) voices[i].voiceName = voices[i].name;
      return voices;
    })
    .catch(function(err) {
      console.error(err);
      return [];
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
    var started = false;
    clearTimeout(timer);
    timer = setTimeout(function() {
      baseEngine.stop();
      if (started) onEvent({type: "end", charIndex: text.length});
      else onEvent({type: "error", errorMessage: "Timeout, TTS never started, try picking another voice?"});
    },
    timeoutMillis);
    baseEngine.speak(text, options, function(event) {
        if (event.type == "start") started = true;
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


function RemoteTtsEngine(serviceUrl) {
  var manifest = brapi.runtime.getManifest();
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  var audio = document.createElement("AUDIO");
  var isSpeaking = false;
  var nextStartTime = 0;
  var waitTimer;
  var authToken;
  var clientId;
  var speakPromise;
  function ready(options) {
    return getAuthToken()
      .then(function(token) {authToken = token})
      .then(getUniqueClientId)
      .then(function(id) {clientId = id})
      .then(function() {
        if (isPremiumVoice(options.voice) && !options.voice.autoSelect) {
          if (!authToken) throw new Error(JSON.stringify({code: "error_login_required"}));
          return getAccountInfo(authToken)
            .then(function(account) {
              if (!account) throw new Error(JSON.stringify({code: "error_login_required"}));
              if (!account.balance) throw new Error(JSON.stringify({code: "error_payment_required"}));
            })
        }
      })
  }
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    audio.pause();
    if (!iOS) {
      audio.volume = options.volume;
      audio.defaultPlaybackRate = options.rate;
    }
    speakPromise = ready(options)
      .then(function() {
        audio.src = getAudioUrl(utterance, options.lang, options.voice);
        return new Promise(function(fulfill) {audio.oncanplay = fulfill});
      })
      .then(function() {
        var waitTime = nextStartTime - Date.now();
        if (waitTime > 0) return new Promise(function(f) {waitTimer = setTimeout(f, waitTime)});
      })
      .then(function() {
        isSpeaking = true;
        return audio.play();
      })
      .catch(function(err) {
        onEvent({
          type: "error",
          errorMessage: err.name == "NotAllowedError" ? JSON.stringify({code: "error_user_gesture_required"}) : err.message
        })
      })
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
    speakPromise.then(function() {
    clearTimeout(waitTimer);
    audio.pause();
    })
  }
  this.resume = function() {
    audio.play();
  }
  this.prefetch = function(utterance, options) {
    if (!iOS) {
      ajaxGet(getAudioUrl(utterance, options.lang, options.voice, true));
    }
  }
  this.setNextStartTime = function(time, options) {
    if (!iOS)
      nextStartTime = time || 0;
  }
  this.getVoices = function() {
    return voices;
  }
  function getAudioUrl(utterance, lang, voice, prefetch) {
    assert(utterance && lang && voice);
    return serviceUrl + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voice.voiceName) + "?c=" + encodeURIComponent(clientId) + "&t=" + encodeURIComponent(authToken) + (voice.autoSelect ? '&a=1' : '') + "&v=" + manifest.version + "&pf=" + (prefetch ? 1 : 0) + "&q=" + encodeURIComponent(utterance);
  }
  var voices = [
      {"voice_name": "Amazon Australian English (Nicole)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Australian English (Russell)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Brazilian Portuguese (Ricardo)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Brazilian Portuguese (Vitoria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Amy)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Brian)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Emma)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Canadian French (Chantal)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Castilian Spanish (Conchita)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Castilian Spanish (Enrique)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Danish (Mads)", "lang": "da-DK", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Danish (Naja)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Dutch (Lotte)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Dutch (Ruben)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon French (Celine)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon French (Mathieu)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon German (Hans)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon German (Marlene)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Icelandic (Dora)", "lang": "is-IS", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Icelandic (Karl)", "lang": "is-IS", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Indian English (Raveena)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Italian (Carla)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Italian (Giorgio)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Norwegian (Liv)", "lang": "nb-NO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Ewa)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Jacek)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Jan)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Maja)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Portuguese (Cristiano)", "lang": "pt-PT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Portuguese (Ines)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Romanian (Carmen)", "lang": "ro-RO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Russian (Maxim)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Russian (Tatyana)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Swedish (Astrid)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Turkish (Filiz)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Ivy)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Joey)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Justin)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Kendra)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Kimberly)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Salli)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US Spanish (Miguel)", "lang": "es-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US Spanish (Penelope)", "lang": "es-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Welsh (Gwyneth)", "lang": "cy-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Welsh English (Geraint)", "lang": "en-GB-WLS", "gender": "male", "event_types": ["start", "end", "error"]},

      {"voice_name": "Microsoft Australian English (Catherine)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Australian English (James)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Austrian German (Michael)", "lang": "de-AT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Belgian Dutch (Bart)", "lang": "nl-BE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Brazilian Portuguese (Daniel)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Brazilian Portuguese (Maria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (George)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (Hazel)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (Susan)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Bulgarian (Ivan)", "lang": "bg-BG", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian English (Linda)", "lang": "en-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian English (Richard)", "lang": "en-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Caroline)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Claude)", "lang": "fr-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Nathalie)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Catalan (Herena)", "lang": "ca-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Huihui)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Kangkang)", "lang": "zh-CN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Yaoyao)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft ChineseHK (Danny)", "lang": "zh-HK", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft ChineseHK (Tracy)", "lang": "zh-HK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Croatian (Matej)", "lang": "hr-HR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Czech (Jakub)", "lang": "cs-CZ", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Danish (Helle)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Dutch (Frank)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Egyptian Arabic (Hoda)", "lang": "ar-EG", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Finnish (Heidi)", "lang": "fi-FI", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Hortense)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Julie)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Paul)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Hedda)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Katja)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Stefan)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Greek (Stefanos)", "lang": "el-GR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Hebrew (Asaf)", "lang": "he-IL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Hindi (Hemant)", "lang": "hi-IN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Hindi (Kalpana)", "lang": "hi-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Hungarian (Szabolcs)", "lang": "hu-HU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Indian English (Heera)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Indian English (Ravi)", "lang": "en-IN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Indonesian (Andika)", "lang": "id-ID", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Irish English (Sean)", "lang": "en-IE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Italian (Cosimo)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Italian (Elsa)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Ayumi)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Haruka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Ichiro)", "lang": "ja-JP", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Sayaka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Korean (Heami)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Malay (Rizwan)", "lang": "ms-MY", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Mexican Spanish (Raul)", "lang": "es-MX", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Mexican Spanish (Sabina)", "lang": "es-MX", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Norwegian (Jon)", "lang": "nb-NO", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Polish (Adam)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Polish (Paulina)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Portuguese (Helia)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Romanian (Andrei)", "lang": "ro-RO", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Russian (Irina)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Russian (Pavel)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Saudi Arabic (Naayf)", "lang": "ar-SA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Slovak (Filip)", "lang": "sk-SK", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Slovenian (Lado)", "lang": "sl-SI", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Helena)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Laura)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Pablo)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Swedish (Bengt)", "lang": "sv-SE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Swiss French (Guillaume)", "lang": "fr-CH", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Swiss German (Karsten)", "lang": "de-CH", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Tamil (Valluvar)", "lang": "ta-IN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Thai (Pattara)", "lang": "th-TH", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Turkish (Tolga)", "lang": "tr-TR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (David)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (Mark)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (Zira)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Vietnamese (An)", "lang": "vi-VI", "gender": "male", "event_types": ["start", "end", "error"]},
    ]
    .map(function(item) {
      return {voiceName: item.voice_name, lang: item.lang};
    })
}


function GoogleTranslateTtsEngine() {
  var audio = document.createElement("AUDIO");
  var prefetchAudio;
  var isSpeaking = false;
  var speakPromise;
  this.ready = function() {
    return googleTranslateReady();
  };
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate * 1.1;
    audio.onplay = function() {
      onEvent({type: 'start', charIndex: 0});
      isSpeaking = true;
    };
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    speakPromise = Promise.resolve()
      .then(function() {
        if (prefetchAudio && prefetchAudio[0] == utterance && prefetchAudio[1] == options) return prefetchAudio[2];
        else return getAudioUrl(utterance, options.voice.lang);
      })
      .then(function(url) {
        audio.src = url;
        return audio.play();
      })
      .catch(function(err) {
        onEvent({
          type: "error",
          errorMessage: err.name == "NotAllowedError" ? JSON.stringify({code: "error_user_gesture_required"}) : err.message
        })
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    speakPromise.then(function() {audio.pause()});
  };
  this.resume = function() {
    audio.play();
  };
  this.prefetch = function(utterance, options) {
    getAudioUrl(utterance, options.voice.lang)
      .then(function(url) {
        prefetchAudio = [utterance, options, url];
      })
      .catch(console.error)
  };
  this.setNextStartTime = function() {
  };
  this.getVoices = function() {
    return voices;
  }
  function getAudioUrl(text, lang) {
    assert(text && lang);
    return googleTranslateSynthesizeSpeech(text, lang);
  }
  var voices = [
      {"voice_name": "GoogleTranslate Afrikaans", "lang": "af", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Albanian", "lang": "sq", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Arabic", "lang": "ar", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Armenian", "lang": "hy", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Bengali", "lang": "bn", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Bosnian", "lang": "bs", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Bulgarian", "lang": "bg", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Catalan", "lang": "ca", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Chinese", "lang": "zh-CN", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Croatian", "lang": "hr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Czech", "lang": "cs", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Danish", "lang": "da", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Dutch", "lang": "nl", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate English", "lang": "en", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Esperanto", "lang": "eo", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Estonian", "lang": "et", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Filipino", "lang": "fil", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Finnish", "lang": "fi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate French", "lang": "fr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate German", "lang": "de", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Greek", "lang": "el", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Gujarati", "lang": "gu", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hebrew", "lang": "he", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hindi", "lang": "hi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hungarian", "lang": "hu", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Icelandic", "lang": "is", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Indonesian", "lang": "id", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Italian", "lang": "it", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Japanese", "lang": "ja", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Javanese", "lang": "jw", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Kannada", "lang": "kn", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Khmer", "lang": "km", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Korean", "lang": "ko", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Latin", "lang": "la", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Latvian", "lang": "lv", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Macedonian", "lang": "mk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Malay", "lang": "ms", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Malayalam", "lang": "ml", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Marathi", "lang": "mr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Myanmar (Burmese)", "lang": "my", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Nepali", "lang": "ne", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Norwegian", "lang": "no", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Polish", "lang": "pl", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Portuguese", "lang": "pt", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Romanian", "lang": "ro", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Russian", "lang": "ru", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Serbian", "lang": "sr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Sinhala", "lang": "si", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Slovak", "lang": "sk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Spanish", "lang": "es", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Sundanese", "lang": "su", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Swahili", "lang": "sw", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Swedish", "lang": "sv", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Tagalog", "lang": "tl", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Tamil", "lang": "ta", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Telugu", "lang": "te", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Thai", "lang": "th", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Turkish", "lang": "tr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Ukrainian", "lang": "uk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Urdu", "lang": "ur", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Vietnamese", "lang": "vi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Welsh", "lang": "cy", "event_types": ["start", "end", "error"]}
    ]
    .map(function(item) {
      return {voiceName: item.voice_name, lang: item.lang};
    })
}


function AmazonPollyTtsEngine() {
  var pollyPromise;
  var audio = document.createElement("AUDIO");
  var prefetchAudio;
  var isSpeaking = false;
  var speakPromise;
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!options.pitch) options.pitch = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.onplay = function() {
      onEvent({type: 'start', charIndex: 0});
      isSpeaking = true;
    };
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    speakPromise = Promise.resolve()
      .then(function() {
        if (prefetchAudio && prefetchAudio[0] == utterance && prefetchAudio[1] == options) return prefetchAudio[2];
        else return getAudioUrl(utterance, options.lang, options.voice, options.pitch);
      })
      .then(function(url) {
        audio.src = url;
        return audio.play();
      })
      .catch(function(err) {
        onEvent({
          type: "error",
          errorMessage: err.name == "NotAllowedError" ? JSON.stringify({code: "error_user_gesture_required"}) : err.message
        })
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    speakPromise.then(function() {audio.pause()});
  };
  this.resume = function() {
    audio.play();
  };
  this.prefetch = function(utterance, options) {
    getAudioUrl(utterance, options.lang, options.voice, options.pitch)
      .then(function(url) {
        prefetchAudio = [utterance, options, url];
      })
      .catch(console.error)
  };
  this.setNextStartTime = function() {
  };
  this.getVoices = function() {
    return getSettings(["pollyVoices"])
      .then(function(items) {
        if (!items.pollyVoices || Date.now()-items.pollyVoices[0].ts > 24*3600*1000) updateVoices();
        return items.pollyVoices || voices;
      })
  }
  function updateVoices() {
    ajaxGet(config.serviceUrl + "/read-aloud/list-voices/amazon")
      .then(JSON.parse)
      .then(function(list) {
        list[0].ts = Date.now();
        updateSettings({pollyVoices: list});
      })
  }
  function getAudioUrl(text, lang, voice, pitch) {
    assert(text && lang && voice && pitch != null);
    var matches = voice.voiceName.match(/^AmazonPolly .* \((\w+)\)( \+\w+)?$/);
    var voiceId = matches[1];
    var style = matches[2] && matches[2].substr(2);
    return getPolly()
      .then(function(polly) {
        return polly.synthesizeSpeech(getOpts(text, voiceId, style))
        .promise()
      })
      .then(function(data) {
        var blob = new Blob([data.AudioStream], {type: data.ContentType});
        return URL.createObjectURL(blob);
      })
  }
  function getPolly() {
    return pollyPromise || (pollyPromise = createPolly());
  }
  function createPolly() {
    return getSettings(["awsCreds"])
      .then(function(items) {
        if (!items.awsCreds) throw new Error("Missing AWS credentials");
        return new AWS.Polly({
          region: "us-east-1",
          accessKeyId: items.awsCreds.accessKeyId,
          secretAccessKey: items.awsCreds.secretAccessKey
        })
      })
  }
  function getOpts(text, voiceId, style) {
    switch (style) {
      case "newscaster":
        return {
          OutputFormat: "mp3",
          Text: '<speak><amazon:domain name="news">' + escapeXml(text) + '</amazon:domain></speak>',
          TextType: "ssml",
          VoiceId: voiceId,
          Engine: "neural"
        }
      case "conversational":
        return {
          OutputFormat: "mp3",
          Text: '<speak><amazon:domain name="conversational">' + escapeXml(text) + '</amazon:domain></speak>',
          TextType: "ssml",
          VoiceId: voiceId,
          Engine: "neural"
        }
      case "neural":
        return {
          OutputFormat: "mp3",
          Text: text,
          VoiceId: voiceId,
          Engine: "neural"
        }
      default:
        return {
          OutputFormat: "mp3",
          Text: text,
          VoiceId: voiceId
        }
    }
  }
  function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
      }
    })
  }
  var voices = [
    {"voiceName":"AmazonPolly Turkish (Filiz)","lang":"tr-TR","gender":"female"},
    {"voiceName":"AmazonPolly Swedish (Astrid)","lang":"sv-SE","gender":"female"},
    {"voiceName":"AmazonPolly Russian (Tatyana)","lang":"ru-RU","gender":"female"},
    {"voiceName":"AmazonPolly Russian (Maxim)","lang":"ru-RU","gender":"male"},
    {"voiceName":"AmazonPolly Romanian (Carmen)","lang":"ro-RO","gender":"female"},
    {"voiceName":"AmazonPolly Portuguese (Ines)","lang":"pt-PT","gender":"female"},
    {"voiceName":"AmazonPolly Portuguese (Cristiano)","lang":"pt-PT","gender":"male"},
    {"voiceName":"AmazonPolly Brazilian Portuguese (Vitoria)","lang":"pt-BR","gender":"female"},
    {"voiceName":"AmazonPolly Brazilian Portuguese (Ricardo)","lang":"pt-BR","gender":"male"},
    {"voiceName":"AmazonPolly Brazilian Portuguese (Camila) +neural","lang":"pt-BR","gender":"female"},
    {"voiceName":"AmazonPolly Brazilian Portuguese (Camila)","lang":"pt-BR","gender":"female"},
    {"voiceName":"AmazonPolly Polish (Maja)","lang":"pl-PL","gender":"female"},
    {"voiceName":"AmazonPolly Polish (Jan)","lang":"pl-PL","gender":"male"},
    {"voiceName":"AmazonPolly Polish (Jacek)","lang":"pl-PL","gender":"male"},
    {"voiceName":"AmazonPolly Polish (Ewa)","lang":"pl-PL","gender":"female"},
    {"voiceName":"AmazonPolly Dutch (Ruben)","lang":"nl-NL","gender":"male"},
    {"voiceName":"AmazonPolly Dutch (Lotte)","lang":"nl-NL","gender":"female"},
    {"voiceName":"AmazonPolly Norwegian (Liv)","lang":"nb-NO","gender":"female"},
    {"voiceName":"AmazonPolly Korean (Seoyeon) +neural","lang":"ko-KR","gender":"female"},
    {"voiceName":"AmazonPolly Korean (Seoyeon)","lang":"ko-KR","gender":"female"},
    {"voiceName":"AmazonPolly Japanese (Takumi) +neural","lang":"ja-JP","gender":"male"},
    {"voiceName":"AmazonPolly Japanese (Takumi)","lang":"ja-JP","gender":"male"},
    {"voiceName":"AmazonPolly Japanese (Mizuki)","lang":"ja-JP","gender":"female"},
    {"voiceName":"AmazonPolly Italian (Giorgio)","lang":"it-IT","gender":"male"},
    {"voiceName":"AmazonPolly Italian (Carla)","lang":"it-IT","gender":"female"},
    {"voiceName":"AmazonPolly Italian (Bianca) +neural","lang":"it-IT","gender":"female"},
    {"voiceName":"AmazonPolly Italian (Bianca)","lang":"it-IT","gender":"female"},
    {"voiceName":"AmazonPolly Icelandic (Karl)","lang":"is-IS","gender":"male"},
    {"voiceName":"AmazonPolly Icelandic (Dora)","lang":"is-IS","gender":"female"},
    {"voiceName":"AmazonPolly French (Mathieu)","lang":"fr-FR","gender":"male"},
    {"voiceName":"AmazonPolly French (Lea) +neural","lang":"fr-FR","gender":"female"},
    {"voiceName":"AmazonPolly French (Lea)","lang":"fr-FR","gender":"female"},
    {"voiceName":"AmazonPolly French (Celine)","lang":"fr-FR","gender":"female"},
    {"voiceName":"AmazonPolly Canadian French (Gabrielle) +neural","lang":"fr-CA","gender":"female"},
    {"voiceName":"AmazonPolly Canadian French (Gabrielle)","lang":"fr-CA","gender":"female"},
    {"voiceName":"AmazonPolly Canadian French (Chantal)","lang":"fr-CA","gender":"female"},
    {"voiceName":"AmazonPolly US Spanish (Penelope)","lang":"es-US","gender":"female"},
    {"voiceName":"AmazonPolly US Spanish (Miguel)","lang":"es-US","gender":"male"},
    {"voiceName":"AmazonPolly US Spanish (Lupe) +newscaster","lang":"es-US","gender":"female"},
    {"voiceName":"AmazonPolly US Spanish (Lupe) +neural","lang":"es-US","gender":"female"},
    {"voiceName":"AmazonPolly US Spanish (Lupe)","lang":"es-US","gender":"female"},
    {"voiceName":"AmazonPolly Mexican Spanish (Mia) +neural","lang":"es-MX","gender":"female"},
    {"voiceName":"AmazonPolly Mexican Spanish (Mia)","lang":"es-MX","gender":"female"},
    {"voiceName":"AmazonPolly Castilian Spanish (Lucia) +neural","lang":"es-ES","gender":"female"},
    {"voiceName":"AmazonPolly Castilian Spanish (Lucia)","lang":"es-ES","gender":"female"},
    {"voiceName":"AmazonPolly Castilian Spanish (Enrique)","lang":"es-ES","gender":"male"},
    {"voiceName":"AmazonPolly Castilian Spanish (Conchita)","lang":"es-ES","gender":"female"},
    {"voiceName":"AmazonPolly South African English (Ayanda) +neural","lang":"en-ZA","gender":"female"},
    {"voiceName":"AmazonPolly South African English (Ayanda)","lang":"en-ZA","gender":"female"},
    {"voiceName":"AmazonPolly US English (Salli) +neural","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Salli)","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Matthew) +newscaster","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Matthew) +neural","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Matthew) +conversational","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Matthew)","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Kimberly) +neural","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Kimberly)","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Kevin) +neural","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Kevin)","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Kendra) +neural","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Kendra)","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Justin) +neural","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Justin)","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Joey) +neural","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Joey)","lang":"en-US","gender":"male"},
    {"voiceName":"AmazonPolly US English (Joanna) +newscaster","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Joanna) +neural","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Joanna) +conversational","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Joanna)","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Ivy) +neural","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly US English (Ivy)","lang":"en-US","gender":"female"},
    {"voiceName":"AmazonPolly New Zealand English (Aria) +neural","lang":"en-NZ","gender":"female"},
    {"voiceName":"AmazonPolly New Zealand English (Aria)","lang":"en-NZ","gender":"female"},
    {"voiceName":"AmazonPolly Indian English (Raveena)","lang":"en-IN","gender":"female"},
    {"voiceName":"AmazonPolly Indian English (Aditi)","lang":"en-IN","gender":"female"},
    {"voiceName":"AmazonPolly Welsh English (Geraint)","lang":"en-GB-WLS","gender":"male"},
    {"voiceName":"AmazonPolly British English (Emma) +neural","lang":"en-GB","gender":"female"},
    {"voiceName":"AmazonPolly British English (Emma)","lang":"en-GB","gender":"female"},
    {"voiceName":"AmazonPolly British English (Brian) +neural","lang":"en-GB","gender":"male"},
    {"voiceName":"AmazonPolly British English (Brian)","lang":"en-GB","gender":"male"},
    {"voiceName":"AmazonPolly British English (Amy) +newscaster","lang":"en-GB","gender":"female"},
    {"voiceName":"AmazonPolly British English (Amy) +neural","lang":"en-GB","gender":"female"},
    {"voiceName":"AmazonPolly British English (Amy)","lang":"en-GB","gender":"female"},
    {"voiceName":"AmazonPolly Australian English (Russell)","lang":"en-AU","gender":"male"},
    {"voiceName":"AmazonPolly Australian English (Olivia) +neural","lang":"en-AU","gender":"female"},
    {"voiceName":"AmazonPolly Australian English (Olivia)","lang":"en-AU","gender":"female"},
    {"voiceName":"AmazonPolly Australian English (Nicole)","lang":"en-AU","gender":"female"},
    {"voiceName":"AmazonPolly German (Vicki) +neural","lang":"de-DE","gender":"female"},
    {"voiceName":"AmazonPolly German (Vicki)","lang":"de-DE","gender":"female"},
    {"voiceName":"AmazonPolly German (Marlene)","lang":"de-DE","gender":"female"},
    {"voiceName":"AmazonPolly German (Hans)","lang":"de-DE","gender":"male"},
    {"voiceName":"AmazonPolly German (Hannah) +neural","lang":"de-AT","gender":"female"},
    {"voiceName":"AmazonPolly German (Hannah)","lang":"de-AT","gender":"female"},
    {"voiceName":"AmazonPolly Danish (Naja)","lang":"da-DK","gender":"female"},
    {"voiceName":"AmazonPolly Danish (Mads)","lang":"da-DK","gender":"male"},
    {"voiceName":"AmazonPolly Welsh (Gwyneth)","lang":"cy-GB","gender":"female"},
    {"voiceName":"AmazonPolly Chinese Mandarin (Zhiyu)","lang":"cmn-CN","gender":"female"},
    {"voiceName":"AmazonPolly Catalan (Arlet) +neural","lang":"ca-ES","gender":"female"},
    {"voiceName":"AmazonPolly Catalan (Arlet)","lang":"ca-ES","gender":"female"},
    {"voiceName":"AmazonPolly Arabic (Zeina)","lang":"arb","gender":"female"}
  ]
}


function GoogleWavenetTtsEngine() {
  var audio = document.createElement("AUDIO");
  var prefetchAudio;
  var isSpeaking = false;
  var speakPromise;
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!options.pitch) options.pitch = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.onplay = function() {
      onEvent({type: 'start', charIndex: 0});
      isSpeaking = true;
    };
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    speakPromise = Promise.resolve()
      .then(function() {
        if (prefetchAudio && prefetchAudio[0] == utterance && prefetchAudio[1] == options) return prefetchAudio[2];
        else return getAudioUrl(utterance, options.voice, options.pitch);
      })
      .then(function(url) {
        audio.src = url;
        return audio.play();
      })
      .catch(function(err) {
        onEvent({
          type: "error",
          errorMessage: err.name == "NotAllowedError" ? JSON.stringify({code: "error_user_gesture_required"}) : err.message
        })
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    speakPromise.then(function() {audio.pause()});
  };
  this.resume = function() {
    audio.play();
  };
  this.prefetch = function(utterance, options) {
    getAudioUrl(utterance, options.voice, options.pitch)
      .then(function(url) {
        prefetchAudio = [utterance, options, url];
      })
      .catch(console.error)
  };
  this.setNextStartTime = function() {
  };
  this.getVoices = function() {
    return getSettings(["wavenetVoices"])
      .then(function(items) {
        if (!items.wavenetVoices || Date.now()-items.wavenetVoices[0].ts > 24*3600*1000) updateVoices();
        return items.wavenetVoices || voices;
      })
  }
  this.getFreeVoices = function() {
    return this.getVoices()
      .then(function(items) {
        return items.filter(function(item) {
          return item.voiceName.match(/^GoogleStandard /);
        })
      })
  }
  function updateVoices() {
    ajaxGet(config.serviceUrl + "/read-aloud/list-voices/google")
      .then(JSON.parse)
      .then(function(list) {
        list[0].ts = Date.now();
        updateSettings({wavenetVoices: list});
      })
  }
  function getAudioUrl(text, voice, pitch) {
    assert(text && voice && pitch != null);
    var matches = voice.voiceName.match(/^Google(\w+) .* \((\w+)\)$/);
    var voiceName = voice.lang + "-" + matches[1] + "-" + matches[2][0];
    var endpoint = matches[1] == "Neural2" ? "us-central1-texttospeech.googleapis.com" : "texttospeech.googleapis.com";
    return getSettings(["gcpCreds", "gcpToken"])
      .then(function(settings) {
        var postData = {
          input: {
            text: text
          },
          voice: {
            languageCode: voice.lang,
            name: voiceName
          },
          audioConfig: {
            audioEncoding: "OGG_OPUS",
            pitch: (pitch-1)*20
          }
        }
        if (settings.gcpCreds) return ajaxPost("https://" + endpoint + "/v1/text:synthesize?key=" + settings.gcpCreds.apiKey, postData, "json");
        if (!settings.gcpToken) throw new Error(JSON.stringify({code: "error_wavenet_auth_required"}));
        return ajaxPost("https://cxl-services.appspot.com/proxy?url=https://texttospeech.googleapis.com/v1beta1/text:synthesize&token=" + settings.gcpToken, postData, "json")
          .catch(function(err) {
            console.error(err);
            throw new Error(JSON.stringify({code: "error_wavenet_auth_required"}));
          })
      })
      .then(function(responseText) {
        var data = JSON.parse(responseText);
        return "data:audio/ogg;codecs=opus;base64," + data.audioContent;
      })
  }
  var voices = [
    {"voiceName":"GoogleWavenet Arabic (Anna)","lang":"ar-XA","gender":"female"},
    {"voiceName":"GoogleWavenet Arabic (Benjamin)","lang":"ar-XA","gender":"male"},
    {"voiceName":"GoogleWavenet Arabic (Christopher)","lang":"ar-XA","gender":"male"},
    {"voiceName":"GoogleWavenet Mandarin (Anna)","lang":"cmn-CN","gender":"female"},
    {"voiceName":"GoogleWavenet Mandarin (Benjamin)","lang":"cmn-CN","gender":"male"},
    {"voiceName":"GoogleWavenet Mandarin (Christopher)","lang":"cmn-CN","gender":"male"},
    {"voiceName":"GoogleWavenet Mandarin (Diane)","lang":"cmn-CN","gender":"female"},
    {"voiceName":"GoogleWavenet Czech (Anna)","lang":"cs-CZ","gender":"female"},
    {"voiceName":"GoogleWavenet Danish (Anna)","lang":"da-DK","gender":"female"},
    {"voiceName":"GoogleWavenet German (Anna)","lang":"de-DE","gender":"female"},
    {"voiceName":"GoogleWavenet German (Benjamin)","lang":"de-DE","gender":"male"},
    {"voiceName":"GoogleWavenet German (Caroline)","lang":"de-DE","gender":"female"},
    {"voiceName":"GoogleWavenet German (Daniel)","lang":"de-DE","gender":"male"},
    {"voiceName":"GoogleWavenet German (Ethan)","lang":"de-DE","gender":"male"},
    {"voiceName":"GoogleWavenet Greek, Modern (Anna)","lang":"el-GR","gender":"female"},
    {"voiceName":"GoogleWavenet Australian English (Anna)","lang":"en-AU","gender":"female"},
    {"voiceName":"GoogleWavenet Australian English (Benjamin)","lang":"en-AU","gender":"male"},
    {"voiceName":"GoogleWavenet Australian English (Caroline)","lang":"en-AU","gender":"female"},
    {"voiceName":"GoogleWavenet Australian English (Daniel)","lang":"en-AU","gender":"male"},
    {"voiceName":"GoogleWavenet British English (Anna)","lang":"en-GB","gender":"female"},
    {"voiceName":"GoogleWavenet British English (Benjamin)","lang":"en-GB","gender":"male"},
    {"voiceName":"GoogleWavenet British English (Caroline)","lang":"en-GB","gender":"female"},
    {"voiceName":"GoogleWavenet British English (Daniel)","lang":"en-GB","gender":"male"},
    {"voiceName":"GoogleWavenet Indian English (Anna)","lang":"en-IN","gender":"female"},
    {"voiceName":"GoogleWavenet Indian English (Benjamin)","lang":"en-IN","gender":"male"},
    {"voiceName":"GoogleWavenet Indian English (Christopher)","lang":"en-IN","gender":"male"},
    {"voiceName":"GoogleWavenet US English (Adam)","lang":"en-US","gender":"male"},
    {"voiceName":"GoogleWavenet US English (Benjamin)","lang":"en-US","gender":"male"},
    {"voiceName":"GoogleWavenet US English (Caroline)","lang":"en-US","gender":"female"},
    {"voiceName":"GoogleWavenet US English (Daniel)","lang":"en-US","gender":"male"},
    {"voiceName":"GoogleWavenet US English (Elizabeth)","lang":"en-US","gender":"female"},
    {"voiceName":"GoogleWavenet US English (Francesca)","lang":"en-US","gender":"female"},
    {"voiceName":"GoogleWavenet Finnish (Anna)","lang":"fi-FI","gender":"female"},
    {"voiceName":"GoogleWavenet Filipino (Anna)","lang":"fil-PH","gender":"female"},
    {"voiceName":"GoogleWavenet Canadian French (Anna)","lang":"fr-CA","gender":"female"},
    {"voiceName":"GoogleWavenet Canadian French (Benjamin)","lang":"fr-CA","gender":"male"},
    {"voiceName":"GoogleWavenet Canadian French (Caroline)","lang":"fr-CA","gender":"female"},
    {"voiceName":"GoogleWavenet Canadian French (Daniel)","lang":"fr-CA","gender":"male"},
    {"voiceName":"GoogleWavenet French (Anna)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleWavenet French (Benjamin)","lang":"fr-FR","gender":"male"},
    {"voiceName":"GoogleWavenet French (Caroline)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleWavenet French (Daniel)","lang":"fr-FR","gender":"male"},
    {"voiceName":"GoogleWavenet French (Elizabeth)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleWavenet Hindi (Anna)","lang":"hi-IN","gender":"female"},
    {"voiceName":"GoogleWavenet Hindi (Benjamin)","lang":"hi-IN","gender":"male"},
    {"voiceName":"GoogleWavenet Hindi (Christopher)","lang":"hi-IN","gender":"male"},
    {"voiceName":"GoogleWavenet Hungarian (Anna)","lang":"hu-HU","gender":"female"},
    {"voiceName":"GoogleWavenet Indonesian (Anna)","lang":"id-ID","gender":"female"},
    {"voiceName":"GoogleWavenet Indonesian (Benjamin)","lang":"id-ID","gender":"male"},
    {"voiceName":"GoogleWavenet Indonesian (Christopher)","lang":"id-ID","gender":"male"},
    {"voiceName":"GoogleWavenet Italian (Anna)","lang":"it-IT","gender":"female"},
    {"voiceName":"GoogleWavenet Italian (Bianca)","lang":"it-IT","gender":"female"},
    {"voiceName":"GoogleWavenet Italian (Christopher)","lang":"it-IT","gender":"male"},
    {"voiceName":"GoogleWavenet Italian (Daniel)","lang":"it-IT","gender":"male"},
    {"voiceName":"GoogleWavenet Japanese (Anna)","lang":"ja-JP","gender":"female"},
    {"voiceName":"GoogleWavenet Japanese (Bianca)","lang":"ja-JP","gender":"female"},
    {"voiceName":"GoogleWavenet Japanese (Christopher)","lang":"ja-JP","gender":"male"},
    {"voiceName":"GoogleWavenet Japanese (Daniel)","lang":"ja-JP","gender":"male"},
    {"voiceName":"GoogleWavenet Korean (Bianca)","lang":"ko-KR","gender":"female"},
    {"voiceName":"GoogleWavenet Korean (Christopher)","lang":"ko-KR","gender":"male"},
    {"voiceName":"GoogleWavenet Korean (Daniel)","lang":"ko-KR","gender":"male"},
    {"voiceName":"GoogleWavenet Korean (Anna)","lang":"ko-KR","gender":"female"},
    {"voiceName":"GoogleWavenet Norwegian Bokmål (Elizabeth)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleWavenet Norwegian Bokmål (Anna)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleWavenet Norwegian Bokmål (Benjamin)","lang":"nb-NO","gender":"male"},
    {"voiceName":"GoogleWavenet Norwegian Bokmål (Caroline)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleWavenet Norwegian Bokmål (Daniel)","lang":"nb-NO","gender":"male"},
    {"voiceName":"GoogleWavenet Dutch (Benjamin)","lang":"nl-NL","gender":"male"},
    {"voiceName":"GoogleWavenet Dutch (Christopher)","lang":"nl-NL","gender":"male"},
    {"voiceName":"GoogleWavenet Dutch (Diane)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleWavenet Dutch (Elizabeth)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleWavenet Dutch (Anna)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleWavenet Polish (Anna)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleWavenet Polish (Benjamin)","lang":"pl-PL","gender":"male"},
    {"voiceName":"GoogleWavenet Polish (Christopher)","lang":"pl-PL","gender":"male"},
    {"voiceName":"GoogleWavenet Polish (Diane)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleWavenet Polish (Elizabeth)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleWavenet Brazilian Portuguese (Anna)","lang":"pt-BR","gender":"female"},
    {"voiceName":"GoogleWavenet Portuguese (Anna)","lang":"pt-PT","gender":"female"},
    {"voiceName":"GoogleWavenet Portuguese (Benjamin)","lang":"pt-PT","gender":"male"},
    {"voiceName":"GoogleWavenet Portuguese (Christopher)","lang":"pt-PT","gender":"male"},
    {"voiceName":"GoogleWavenet Portuguese (Diane)","lang":"pt-PT","gender":"female"},
    {"voiceName":"GoogleWavenet Russian (Elizabeth)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleWavenet Russian (Anna)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleWavenet Russian (Benjamin)","lang":"ru-RU","gender":"male"},
    {"voiceName":"GoogleWavenet Russian (Caroline)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleWavenet Russian (Daniel)","lang":"ru-RU","gender":"male"},
    {"voiceName":"GoogleWavenet Slovak (Anna)","lang":"sk-SK","gender":"female"},
    {"voiceName":"GoogleWavenet Swedish (Anna)","lang":"sv-SE","gender":"female"},
    {"voiceName":"GoogleWavenet Turkish (Anna)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleWavenet Turkish (Benjamin)","lang":"tr-TR","gender":"male"},
    {"voiceName":"GoogleWavenet Turkish (Caroline)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleWavenet Turkish (Diane)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleWavenet Turkish (Ethan)","lang":"tr-TR","gender":"male"},
    {"voiceName":"GoogleWavenet Ukrainian (Anna)","lang":"uk-UA","gender":"female"},
    {"voiceName":"GoogleWavenet Vietnamese (Anna)","lang":"vi-VN","gender":"female"},
    {"voiceName":"GoogleWavenet Vietnamese (Benjamin)","lang":"vi-VN","gender":"male"},
    {"voiceName":"GoogleWavenet Vietnamese (Caroline)","lang":"vi-VN","gender":"female"},
    {"voiceName":"GoogleWavenet Vietnamese (Daniel)","lang":"vi-VN","gender":"male"},
    {"voiceName":"GoogleStandard Spanish; Castilian (Anna)","lang":"es-ES","gender":"female"},
    {"voiceName":"GoogleStandard Arabic (Anna)","lang":"ar-XA","gender":"female"},
    {"voiceName":"GoogleStandard Arabic (Benjamin)","lang":"ar-XA","gender":"male"},
    {"voiceName":"GoogleStandard Arabic (Christopher)","lang":"ar-XA","gender":"male"},
    {"voiceName":"GoogleStandard Arabic (Diane)","lang":"ar-XA","gender":"female"},
    {"voiceName":"GoogleStandard French (Elizabeth)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleStandard Italian (Anna)","lang":"it-IT","gender":"female"},
    {"voiceName":"GoogleStandard Russian (Elizabeth)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleStandard Russian (Anna)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleStandard Russian (Benjamin)","lang":"ru-RU","gender":"male"},
    {"voiceName":"GoogleStandard Russian (Caroline)","lang":"ru-RU","gender":"female"},
    {"voiceName":"GoogleStandard Russian (Daniel)","lang":"ru-RU","gender":"male"},
    {"voiceName":"GoogleStandard Mandarin (Diane)","lang":"cmn-CN","gender":"female"},
    {"voiceName":"GoogleStandard Mandarin (Anna)","lang":"cmn-CN","gender":"female"},
    {"voiceName":"GoogleStandard Mandarin (Benjamin)","lang":"cmn-CN","gender":"male"},
    {"voiceName":"GoogleStandard Mandarin (Christopher)","lang":"cmn-CN","gender":"male"},
    {"voiceName":"GoogleStandard Korean (Anna)","lang":"ko-KR","gender":"female"},
    {"voiceName":"GoogleStandard Korean (Bianca)","lang":"ko-KR","gender":"female"},
    {"voiceName":"GoogleStandard Korean (Christopher)","lang":"ko-KR","gender":"male"},
    {"voiceName":"GoogleStandard Korean (Daniel)","lang":"ko-KR","gender":"male"},
    {"voiceName":"GoogleStandard Japanese (Anna)","lang":"ja-JP","gender":"female"},
    {"voiceName":"GoogleStandard Japanese (Bianca)","lang":"ja-JP","gender":"female"},
    {"voiceName":"GoogleStandard Japanese (Christopher)","lang":"ja-JP","gender":"male"},
    {"voiceName":"GoogleStandard Japanese (Daniel)","lang":"ja-JP","gender":"male"},
    {"voiceName":"GoogleStandard Vietnamese (Anna)","lang":"vi-VN","gender":"female"},
    {"voiceName":"GoogleStandard Vietnamese (Benjamin)","lang":"vi-VN","gender":"male"},
    {"voiceName":"GoogleStandard Vietnamese (Caroline)","lang":"vi-VN","gender":"female"},
    {"voiceName":"GoogleStandard Vietnamese (Daniel)","lang":"vi-VN","gender":"male"},
    {"voiceName":"GoogleStandard Filipino (Anna)","lang":"fil-PH","gender":"female"},
    {"voiceName":"GoogleStandard Indonesian (Anna)","lang":"id-ID","gender":"female"},
    {"voiceName":"GoogleStandard Indonesian (Benjamin)","lang":"id-ID","gender":"male"},
    {"voiceName":"GoogleStandard Indonesian (Christopher)","lang":"id-ID","gender":"male"},
    {"voiceName":"GoogleStandard Dutch (Anna)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleStandard Dutch (Benjamin)","lang":"nl-NL","gender":"male"},
    {"voiceName":"GoogleStandard Dutch (Christopher)","lang":"nl-NL","gender":"male"},
    {"voiceName":"GoogleStandard Dutch (Diane)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleStandard Dutch (Elizabeth)","lang":"nl-NL","gender":"female"},
    {"voiceName":"GoogleStandard Czech (Anna)","lang":"cs-CZ","gender":"female"},
    {"voiceName":"GoogleStandard Greek, Modern (Anna)","lang":"el-GR","gender":"female"},
    {"voiceName":"GoogleStandard Brazilian Portuguese (Anna)","lang":"pt-BR","gender":"female"},
    {"voiceName":"GoogleStandard Hungarian (Anna)","lang":"hu-HU","gender":"female"},
    {"voiceName":"GoogleStandard Polish (Elizabeth)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleStandard Polish (Anna)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleStandard Polish (Benjamin)","lang":"pl-PL","gender":"male"},
    {"voiceName":"GoogleStandard Polish (Christopher)","lang":"pl-PL","gender":"male"},
    {"voiceName":"GoogleStandard Polish (Diane)","lang":"pl-PL","gender":"female"},
    {"voiceName":"GoogleStandard Slovak (Anna)","lang":"sk-SK","gender":"female"},
    {"voiceName":"GoogleStandard Turkish (Anna)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleStandard Turkish (Benjamin)","lang":"tr-TR","gender":"male"},
    {"voiceName":"GoogleStandard Turkish (Caroline)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleStandard Turkish (Diane)","lang":"tr-TR","gender":"female"},
    {"voiceName":"GoogleStandard Turkish (Ethan)","lang":"tr-TR","gender":"male"},
    {"voiceName":"GoogleStandard Ukrainian (Anna)","lang":"uk-UA","gender":"female"},
    {"voiceName":"GoogleStandard Indian English (Anna)","lang":"en-IN","gender":"female"},
    {"voiceName":"GoogleStandard Indian English (Benjamin)","lang":"en-IN","gender":"male"},
    {"voiceName":"GoogleStandard Indian English (Christopher)","lang":"en-IN","gender":"male"},
    {"voiceName":"GoogleStandard Hindi (Anna)","lang":"hi-IN","gender":"female"},
    {"voiceName":"GoogleStandard Hindi (Benjamin)","lang":"hi-IN","gender":"male"},
    {"voiceName":"GoogleStandard Hindi (Christopher)","lang":"hi-IN","gender":"male"},
    {"voiceName":"GoogleStandard Danish (Anna)","lang":"da-DK","gender":"female"},
    {"voiceName":"GoogleStandard Finnish (Anna)","lang":"fi-FI","gender":"female"},
    {"voiceName":"GoogleStandard Portuguese (Anna)","lang":"pt-PT","gender":"female"},
    {"voiceName":"GoogleStandard Portuguese (Benjamin)","lang":"pt-PT","gender":"male"},
    {"voiceName":"GoogleStandard Portuguese (Christopher)","lang":"pt-PT","gender":"male"},
    {"voiceName":"GoogleStandard Portuguese (Diane)","lang":"pt-PT","gender":"female"},
    {"voiceName":"GoogleStandard Norwegian Bokmål (Elizabeth)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleStandard Norwegian Bokmål (Anna)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleStandard Norwegian Bokmål (Benjamin)","lang":"nb-NO","gender":"male"},
    {"voiceName":"GoogleStandard Norwegian Bokmål (Caroline)","lang":"nb-NO","gender":"female"},
    {"voiceName":"GoogleStandard Norwegian Bokmål (Daniel)","lang":"nb-NO","gender":"male"},
    {"voiceName":"GoogleStandard Swedish (Anna)","lang":"sv-SE","gender":"female"},
    {"voiceName":"GoogleStandard British English (Anna)","lang":"en-GB","gender":"female"},
    {"voiceName":"GoogleStandard British English (Benjamin)","lang":"en-GB","gender":"male"},
    {"voiceName":"GoogleStandard British English (Caroline)","lang":"en-GB","gender":"female"},
    {"voiceName":"GoogleStandard British English (Daniel)","lang":"en-GB","gender":"male"},
    {"voiceName":"GoogleStandard US English (Benjamin)","lang":"en-US","gender":"male"},
    {"voiceName":"GoogleStandard US English (Caroline)","lang":"en-US","gender":"female"},
    {"voiceName":"GoogleStandard US English (Daniel)","lang":"en-US","gender":"male"},
    {"voiceName":"GoogleStandard US English (Elizabeth)","lang":"en-US","gender":"female"},
    {"voiceName":"GoogleStandard German (Anna)","lang":"de-DE","gender":"female"},
    {"voiceName":"GoogleStandard German (Benjamin)","lang":"de-DE","gender":"male"},
    {"voiceName":"GoogleStandard German (Ethan)","lang":"de-DE","gender":"male"},
    {"voiceName":"GoogleStandard Australian English (Anna)","lang":"en-AU","gender":"female"},
    {"voiceName":"GoogleStandard Australian English (Benjamin)","lang":"en-AU","gender":"male"},
    {"voiceName":"GoogleStandard Australian English (Caroline)","lang":"en-AU","gender":"female"},
    {"voiceName":"GoogleStandard Australian English (Daniel)","lang":"en-AU","gender":"male"},
    {"voiceName":"GoogleStandard Canadian French (Anna)","lang":"fr-CA","gender":"female"},
    {"voiceName":"GoogleStandard Canadian French (Benjamin)","lang":"fr-CA","gender":"male"},
    {"voiceName":"GoogleStandard Canadian French (Caroline)","lang":"fr-CA","gender":"female"},
    {"voiceName":"GoogleStandard Canadian French (Daniel)","lang":"fr-CA","gender":"male"},
    {"voiceName":"GoogleStandard French (Anna)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleStandard French (Benjamin)","lang":"fr-FR","gender":"male"},
    {"voiceName":"GoogleStandard French (Caroline)","lang":"fr-FR","gender":"female"},
    {"voiceName":"GoogleStandard French (Daniel)","lang":"fr-FR","gender":"male"},
    {"voiceName":"GoogleStandard Italian (Bianca)","lang":"it-IT","gender":"female"},
    {"voiceName":"GoogleStandard Italian (Christopher)","lang":"it-IT","gender":"male"},
    {"voiceName":"GoogleStandard Italian (Daniel)","lang":"it-IT","gender":"male"}
  ]
}


function IbmWatsonTtsEngine() {
  var audio = document.createElement("AUDIO");
  var isSpeaking = false;
  var speakPromise;
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!options.pitch) options.pitch = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate * 1.1;
    audio.onplay = function() {
      onEvent({type: 'start', charIndex: 0});
      isSpeaking = true;
    };
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    speakPromise = getAudioUrl(utterance, options.voice)
      .then(function(url) {
        audio.src = url;
        return audio.play();
      })
      .catch(function(err) {
        onEvent({
          type: "error",
          errorMessage: err.name == "NotAllowedError" ? JSON.stringify({code: "error_user_gesture_required"}) : err.message
        })
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    speakPromise.then(function() {audio.pause()});
  };
  this.resume = function() {
    audio.play();
  };
  this.prefetch = function(utterance, options) {
  };
  this.setNextStartTime = function() {
  };
  this.getVoices = function() {
    return getSettings(["watsonVoices", "ibmCreds"])
      .then(function(items) {
        if (!items.ibmCreds) return [];
        if (items.watsonVoices && Date.now()-items.watsonVoices[0].ts < 24*3600*1000) return items.watsonVoices;
        return fetchVoices(items.ibmCreds.apiKey, items.ibmCreds.url)
          .then(function(list) {
            list[0].ts = Date.now();
            updateSettings({watsonVoices: list}).catch(console.error);
            return list;
          })
          .catch(function(err) {
            console.error(err);
            return [];
          })
      })
  }
  this.fetchVoices = fetchVoices;

  function getAudioUrl(text, voice) {
    assert(text && voice);
    var matches = voice.voiceName.match(/^IBM-Watson .* \((\w+)\)$/);
    var voiceName = voice.lang + "_" + matches[1] + "Voice";
    return getSettings(["ibmCreds"])
      .then(function(settings) {
        return ajaxGet({
          url: settings.ibmCreds.url + "/v1/synthesize?text=" + encodeURIComponent(escapeHtml(text)) + "&voice=" + encodeURIComponent(voiceName) + "&accept=" + encodeURIComponent("audio/ogg;codecs=opus"),
          headers: {
            Authorization: "Basic " + btoa("apikey:" + settings.ibmCreds.apiKey)
          },
          responseType: "blob"
        })
      })
      .then(function(blob) {
        return URL.createObjectURL(blob);
      })
  }
  function fetchVoices(apiKey, url) {
    return ajaxGet({
        url: url + "/v1/voices",
        headers: {
          Authorization: "Basic " + btoa("apikey:" + apiKey)
        }
      })
      .then(JSON.parse)
      .then(function(data) {
        return data.voices.map(item => {
          item.description = item.description.replace(/Chinese \((Mandarin|Cantonese)\)/, "Chinese, $1");
          return {
            voiceName: "IBM-Watson " + item.description.split(/: | male| female| \(/)[1] + " (" + item.name.slice(item.language.length+1, -5) + ")",
            lang: item.language,
            gender: item.gender,
          }
        })
      })
  }
}
