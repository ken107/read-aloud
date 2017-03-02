
var activeSpeech = null;

chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "read-selection",
    title: chrome.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
})

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection") play();
})

function play() {
  return Promise.resolve()
    .then(function() {
      if (activeSpeech) return stop();
    })
    .then(parseDoc)
    .then(function(doc) {
      setState("lastUrl", doc.url);
      return getSpeech(doc);
    })
    .then(function(speech) {
      activeSpeech = speech;
      activeSpeech.options.onEnd = function() {activeSpeech = null};
      return activeSpeech.play();
    });
}

function stop() {
  var promise = activeSpeech.pause();
  activeSpeech = null;
  return promise;
}

function pause() {
  return activeSpeech.pause();
}

function resume() {
  return activeSpeech.play();
}

function isSpeaking() {
  return new Promise(function(fulfill) {
    chrome.tts.isSpeaking(fulfill);
  });
}

function getPlaybackState() {
  return isSpeaking().then(function(isSpeaking) {
    if (activeSpeech) {
      if (isSpeaking) return "PLAYING";
      else return "PAUSED";
    }
    else return "STOPPED";
  });
}

function parseDoc() {
  return executeScript("js/jquery-3.1.1.min.js")
    .then(executeScript.bind(null, "js/content.js"))
    .then(function(results) {return results[0]});
}

function getSpeech(doc) {
  return getSettings()
    .then(function(settings) {
      var options = {
        rate: settings.rate || defaults.rate,
        pitch: settings.pitch || defaults.pitch,
        volume: settings.volume || defaults.volume,
        spchletMaxLen: settings.spchletMaxLen || defaults.spchletMaxLen
      }
      options.spchletMaxLen *= options.rate;
      return getSpeechLang(doc)
        .then(function(lang) {options.lang = lang})
        .then(function() {return getSpeechVoice(doc, settings.voiceName, options.lang)})
        .then(function(voiceName) {
          options.voiceName = voiceName;
          options.hack = !isCustomVoice(options.voiceName);
        })
        .then(function() {
          return new Speech(doc.texts, options);
        })
    });
}

function getSpeechLang(doc) {
  return detectLanguage(doc)
    .then(function(lang) {
      return lang || doc.lang;
    })
}

function getSpeechVoice(doc, voiceName, lang) {
  return getVoices()
    .then(function(voices) {
      if (voiceName) return findVoiceByName(voices, voiceName);
      else return findVoiceByLang(voices, lang);
    })
    .then(function(voice) {
      return voice ? voice.voiceName : voiceName;
    })
}

function findVoiceByName(voices, name) {
  for (var i=0; i<voices.length; i++) if (voices[i].voiceName == name) return voices[i];
  return null;
}

function findVoiceByLang(voices, lang) {
  var speechLang = parseLang(lang);
  var match = {};
  voices.forEach(function(voice) {
    if (voice.lang) {
      var voiceLang = parseLang(voice.lang);
      if (voiceLang.lang == speechLang.lang) {
        if (voiceLang.rest == speechLang.rest) {
          if (voice.gender == "female") match.first = match.first || voice;
          else match.second = match.second || voice;
        }
        else if (!voiceLang.rest) match.third = match.third || voice;
        else {
          if (voiceLang.lang == 'en' && voiceLang.rest == 'us') match.fourth = voice;
          else match.fourth = match.fourth || voice;
        }
      }
    }
    if (voice.voiceName == "Google US English") match.default = match.default || voice;
  });
  return match.first || match.second || match.third || match.fourth || match.default;
}

function detectLanguage(doc) {
  var index = Math.floor(doc.texts.length /2);
  var text = doc.texts.slice(index, index+2).join(" ");
  return new Promise(function(fulfill) {
    chrome.i18n.detectLanguage(text, function(result) {
      result.languages.sort(function(a,b) {return b.percentage-a.percentage});
      fulfill(result.languages[0] && result.languages[0].language);
    });
  });
}
