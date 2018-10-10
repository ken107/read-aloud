
var browserTtsEngine = brapi.tts ? new BrowserTtsEngine() : (typeof speechSynthesis != 'undefined' ? new WebSpeechEngine() : new DummyTtsEngine());
var remoteTtsEngine = new RemoteTtsEngine(config.serviceUrl, (typeof readAloudManifest != 'undefined') ? readAloudManifest : brapi.runtime.getManifest());
var googleTranslateTtsEngine = new GoogleTranslateTtsEngine();
var amazonPollyTtsEngine = new AmazonPollyTtsEngine();
var googleWavenetTtsEngine = new GoogleWavenetTtsEngine();


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


function GoogleTranslateTtsEngine() {
  var audio = document.createElement("AUDIO");
  var prefetchAudio = document.createElement("AUDIO");
  var isSpeaking = false;
  this.ready = function() {
    return getGoogleTranslateToken("test");
  };
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate * 1.1;
    audio.oncanplay = function() {
      audio.play();
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
    getAudioUrl(utterance, options.voice.lang)
      .then(function(url) {
        audio.src = url;
        audio.load();
      })
      .catch(function(err) {
        onEvent({type: "error", errorMessage: err.message});
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    audio.pause();
  };
  this.resume = function() {
    audio.play();
  };
  this.prefetch = function(utterance, options) {
    getAudioUrl(utterance, options.voice.lang)
      .then(function(url) {
        prefetchAudio.src = url;
        prefetchAudio.load();
      })
      .catch(console.error)
  };
  this.setNextStartTime = function() {
  };
  function getAudioUrl(text, lang) {
    assert(text && lang);
    return getGoogleTranslateToken(text)
      .then(function(tk) {
        var query = [
          "ie=UTF-8",
          "q=" + encodeURIComponent(text),
          "tl=" + lang,
          "total=1",
          "idx=0",
          "textlen=" + text.length,
          "tk=" + tk.value,
          "client=t",
          "prev=input"
        ]
        return "https://translate.google.com/translate_tts?" + query.join("&");
      })
  }
}


function AmazonPollyTtsEngine() {
  var pollyPromise;
  var audio = document.createElement("AUDIO");
  var prefetchAudio;
  var isSpeaking = false;
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!options.pitch) options.pitch = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.oncanplay = function() {
      audio.play();
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
    Promise.resolve()
      .then(function() {
        if (prefetchAudio && prefetchAudio[0] == utterance && prefetchAudio[1] == options) return prefetchAudio[2];
        else return getAudioUrl(utterance, options.lang, options.voice, options.pitch);
      })
      .then(function(url) {
        audio.src = url;
        audio.load();
      })
      .catch(function(err) {
        onEvent({type: "error", errorMessage: err.message});
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    audio.pause();
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
  function getAudioUrl(text, lang, voice, pitch) {
    assert(text && lang && voice && pitch != null);
    var matches = voice.voiceName.match(/^AmazonPolly .* \((\w+)\)$/);
    const voiceId = matches[1];
    return getPolly()
      .then(function(polly) {
        return polly.synthesizeSpeech({
          OutputFormat: "mp3",
          Text: text,
          VoiceId: voiceId
        })
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
  this.getVoices = function() {
    return [
      {"voice_name": "AmazonPolly Turkish (Filiz)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Swedish (Astrid)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Russian (Tatyana)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Russian (Maxim)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Romanian (Carmen)", "lang": "ro-RO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Portuguese (Ines)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Portuguese (Cristiano)", "lang": "pt-PT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Brazilian Portuguese (Vitoria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Brazilian Portuguese (Ricardo)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Polish (Maja)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Polish (Jan)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Polish (Jacek)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Polish (Ewa)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Dutch (Ruben)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Dutch (Lotte)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Norwegian (Liv)", "lang": "nb-NO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Korean (Seoyeon)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Japanese (Takumi)", "lang": "ja-JP", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Japanese (Mizuki)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Italian (Giorgio)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Italian (Carla)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Icelandic (Karl)", "lang": "is-IS", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Icelandic (Dora)", "lang": "is-IS", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly French (Mathieu)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly French (Lea)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly French (Celine)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Canadian French (Chantal)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US Spanish (Penelope)", "lang": "es-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US Spanish (Miguel)", "lang": "es-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Castilian Spanish (Enrique)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Castilian Spanish (Conchita)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Welsh English (Geraint)", "lang": "en-GB-WLS", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Salli)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Matthew)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Kimberly)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Kendra)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Justin)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Joey)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Joanna)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly US English (Ivy)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Indian English (Raveena)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Indian English (Aditi)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly British English (Emma)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly British English (Brian)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly British English (Amy)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Australian English (Russell)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Australian English (Nicole)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly German (Vicki)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly German (Marlene)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly German (Hans)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Danish (Naja)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Danish (Mads)", "lang": "da-DK", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Welsh (Gwyneth)", "lang": "cy-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "AmazonPolly Chinese Mandarin (Zhiyu)", "lang": "cmn-CN", "gender": "female", "event_types": ["start", "end", "error"]}
    ]
    .map(function(item) {
      return {voiceName: item.voice_name, lang: item.lang};
    })
  }
}


function GoogleWavenetTtsEngine() {
  var audio = document.createElement("AUDIO");
  var prefetchAudio;
  var isSpeaking = false;
  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!options.pitch) options.pitch = 1;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.oncanplay = function() {
      audio.play();
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
    Promise.resolve()
      .then(function() {
        if (prefetchAudio && prefetchAudio[0] == utterance && prefetchAudio[1] == options) return prefetchAudio[2];
        else return getAudioUrl(utterance, options.lang, options.voice, options.pitch);
      })
      .then(function(url) {
        audio.src = url;
        audio.load();
      })
      .catch(function(err) {
        onEvent({type: "error", errorMessage: err.message});
      })
  };
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  };
  this.pause =
  this.stop = function() {
    audio.pause();
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
  function getAudioUrl(text, lang, voice, pitch) {
    assert(text && lang && voice && pitch != null);
    var matches = voice.voiceName.match(/^Google(\w+) .* \((\w+)\)$/);
    const voiceName = voice.lang + "-" + matches[1] + "-" + matches[2];
    return getSettings(["gcpCreds"])
      .then(function(items) {return items.gcpCreds})
      .then(function(creds) {
        if (!creds) throw new Error("Missing API key");
        var postData = {
          input: {
            text: text
          },
          voice: {
            languageCode: lang,
            name: voiceName
          },
          audioConfig: {
            audioEncoding: "mp3",
            pitch: (pitch-1)*20
          }
        }
        return ajaxPost("https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=" + creds.apiKey, postData, "json");
      })
      .then(function(responseText) {
        var data = JSON.parse(responseText);
        return "data:audio/mpeg;base64," + data.audioContent;
      })
  }
  this.getVoices = function() {
    return [
      {"voice_name": "GoogleWavenet German (A)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet German (B)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet German (C)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet German (D)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Australian English (A)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Australian English (B)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Australian English (C)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Australian English (D)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet British English (A)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet British English (B)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet British English (C)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet British English (D)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (A)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (B)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (C)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (D)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (E)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet US English (F)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet French (A)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet French (B)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet French (C)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet French (D)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Italian (A)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Japanese (A)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Korean (A)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Dutch (A)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Swedish (A)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleWavenet Turkish (A)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Spanish (A)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Italian (A)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Japanese (A)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Korean (A)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Dutch (A)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Brazilian Portuguese (A)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Turkish (A)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Swedish (A)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard British English (A)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard British English (B)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard British English (C)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard British English (D)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard US English (B)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard US English (C)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard US English (D)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard US English (E)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard German (A)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard German (B)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Australian English (A)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Australian English (B)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Australian English (C)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Australian English (D)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Canadian French (A)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Canadian French (B)", "lang": "fr-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Canadian French (C)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard Canadian French (D)", "lang": "fr-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard French (A)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard French (B)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard French (C)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleStandard French (D)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]}
    ]
    .map(function(item) {
      return {voiceName: item.voice_name, lang: item.lang};
    })
  }
}
