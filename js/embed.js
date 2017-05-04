
var readAloud = new function() {
  var speech;
  var voiceProvider = new VoiceProvider();

  this.play = function(options) {
    if (speech) return speech.play().then(updateButtons);
    else {
      if (!window.Promise) return alert("Browser not supported");
      return voiceProvider.getVoice(options.lang)
        .then(function(voice) {
          options.engine = voice ? new LocalTTS(voice) : new GoogleTranslateTTS();
          options.onEnd = function() {speech = null; updateButtons()};
          speech = new Speech(new HtmlDoc().getTexts(0), options);
          return speech.play().then(updateButtons);
        })
    }
  }

  this.pause = function() {
    if (speech) return speech.pause().then(updateButtons);
    else return Promise.resolve();
  }

  $(updateButtons);

  function updateButtons() {
    return isPlaying()
      .then(function(playing) {
        $(".ra-play").toggle(!playing);
        $(".ra-pause").toggle(playing);
      })
  }

  function isPlaying() {
    if (speech) return speech.getState().then(function(state) {return state != "PAUSED"});
    else return Promise.resolve(false);
  }

  function VoiceProvider() {
    var voices;
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = function() {voices = speechSynthesis.getVoices()};
    else voices = [];

    window.isCustomVoice = function(voice) {
      return false;
    }

    this.getVoice = function(lang) {
      return getVoices()
        .then(function(voices) {return findVoiceByLang(voices, lang)})
    }

    function getVoices() {
      if (voices) return Promise.resolve(voices);
      else {
        speechSynthesis.getVoices();
        return new Promise(function(fulfill) {setTimeout(fulfill, 500)}).then(getVoices);
      }
    }

    //from document.js
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
      });
      return match.first || match.second || match.third || match.fourth;
    }

    function parseLang(lang) {
      var tokens = lang.toLowerCase().split("-", 2);
      return {
        lang: tokens[0],
        rest: tokens[1]
      };
    }
  }

  function LocalTTS(voice) {
    var utter;

    this.speak = function(text, options) {
      utter = new SpeechSynthesisUtterance();
      if (options.lang) utter.lang = options.lang;
      if (options.pitch) utter.pitch = options.pitch;
      if (options.rate) utter.rate = options.rate;
      utter.text = text;
      utter.voice = voice;
      if (options.volume) utter.volume = options.volume;
      utter.onstart = options.onEvent.bind(null, {type: 'start', charIndex: 0});
      utter.onerror =
      utter.onend = options.onEvent.bind(null, {type: 'end', charIndex: text.length});
      speechSynthesis.speak(utter);
    }

    this.isSpeaking = function(callback) {
      callback(speechSynthesis.speaking);
    }

    this.stop = function() {
      if (utter) utter.onend = null;
      speechSynthesis.cancel();
    }
  }
}
