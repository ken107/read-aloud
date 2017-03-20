
function Doc(tabId) {
  var self = this;
  var info;
  var currentIndex;
  var activeSpeech;

  //method init
  this.init = function() {
    return send({method: "raCheck"})
      .then(function(result) {return result || injectScripts()})
      .then(send.bind(null, {method: "raGetInfo"}))
      .then(function(result) {info = result})
  }

  function injectScripts() {
    return executeScript(tabId, "js/jquery-3.1.1.min.js")
      .then(executeScript.bind(null, tabId, "js/es6-promise.auto.min.js"))
      .then(executeScript.bind(null, tabId, "js/defaults.js"))
      .then(executeScript.bind(null, tabId, "js/content.js"))
  }

  //method play
  this.play = function() {
    if (activeSpeech) return activeSpeech.play();
    else {
      return send({method: "raGetCurrentIndex"})
        .then(function(index) {currentIndex = index})
        .then(readCurrent)
    }
  }

  function readCurrent() {
    return send({method: "raGetTexts", index: currentIndex})
      .then(function(texts) {
        if (texts) return read(texts);
        else if (self.onEnd) self.onEnd();
      });
    function read(texts) {
      return Promise.resolve()
        .then(function() {
          if (!info.detectedLang)
            return detectLanguage(texts).then(function(lang) {info.detectedLang = lang});
        })
        .then(function() {return getSpeech(texts)})
        .then(function(speech) {
          activeSpeech = speech;
          activeSpeech.options.onEnd = function() {activeSpeech = null; currentIndex++; readCurrent()};
          return activeSpeech.play();
        })
    }
  }

  function detectLanguage(texts) {
    var text = "";
    for (var i=0; i<texts.length && text.length<500; i++) text += (texts[i] + " ");
    return new Promise(function(fulfill) {
      chrome.i18n.detectLanguage(text, function(result) {
        result.languages.sort(function(a,b) {return b.percentage-a.percentage});
        fulfill(result.languages[0] && result.languages[0].language);
      })
    })
  }

  function getSpeech(texts) {
    return getSettings()
      .then(function(settings) {
        var options = {
          rate: settings.rate || defaults.rate,
          pitch: settings.pitch || defaults.pitch,
          volume: settings.volume || defaults.volume,
          spchletMaxLen: settings.spchletMaxLen || defaults.spchletMaxLen,
          lang: info.detectedLang || info.lang,
        }
        options.spchletMaxLen *= options.rate;
        return getSpeechVoice(settings.voiceName, options.lang)
          .then(function(voiceName) {
            options.voiceName = voiceName;
            options.hack = !isCustomVoice(options.voiceName);
          })
          .then(function() {
            return new Speech(texts, options);
          })
      })
  }

  function getSpeechVoice(voiceName, lang) {
    return getVoices()
      .then(function(voices) {
        if (voiceName) return findVoiceByName(voices, voiceName);
        else if (lang) return findVoiceByLang(voices, lang);
        else return null;
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

  //method stop
  this.stop = function() {
    if (activeSpeech) return activeSpeech.pause().then(function() {activeSpeech = null});
    else return Promise.resolve();
  }

  //method pause
  this.pause = function() {
    if (activeSpeech) return activeSpeech.pause();
    else return Promise.resolve();
  }

  //method isActive
  this.isActive = function() {
    return !!activeSpeech;
  }

  //helper functions
  function send(message) {
    return sendMessage(tabId, message);
  }
}
