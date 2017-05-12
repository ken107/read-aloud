
var readAloud = new function() {
  var speech;
  var voiceProvider = new VoiceProvider();
  var attribution = new Attribution();

  this.play = function(options) {
    if (speech) return speech.play().then(updateButtons);
    else {
      if (!window.Promise) return alert("Browser not supported");
      var voice = voiceProvider.getLocalVoice(options.lang);
      if (voice) {
        options.voiceName = voice.name;
        options.engine = new LocalTTS(voice);
      }
      else {
        voice = voiceProvider.getRemoteVoice(options.lang);
        options.voiceName = voice ? voice.voice_name : "default";
        options.engine = new RemoteTTS("https://test.diepkhuc.com:30113");
      }
      options.onEnd = function() {speech = null; updateButtons()};
      speech = new Speech(new HtmlDoc().getTexts(0), options);
      return speech.play().then(updateButtons);
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
        attribution.toggle(playing && isGoogleTranslate(speech.options.voiceName));
      })
  }

  function isPlaying() {
    if (speech) return speech.getState().then(function(state) {return state != "PAUSED"});
    else return Promise.resolve(false);
  }

  function VoiceProvider() {
    if (window.speechSynthesis) speechSynthesis.getVoices();

    this.getLocalVoice = function(lang) {
      return window.speechSynthesis ? findVoiceByLang(speechSynthesis.getVoices(), lang) : null;
    }

    this.getRemoteVoice = function(lang) {
      if (window.remoteVoices) {
        return findVoiceByLang(remoteVoices.filter(function(voice) {return isAmazonPolly(voice.voice_name)}), lang)
          || findVoiceByLang(remoteVoices.filter(function(voice) {return isGoogleTranslate(voice.voice_name)}), lang);
      }
      else return null;
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

  function Attribution() {
    var elem = $("<div/>").get(0);
    $("<div>powered&nbsp;by</div>").css({color: "#888", "margin-bottom": "3px"}).appendTo(elem);
    $("<span>G</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>o</span>").css("color", "#db3236").appendTo(elem);
    $("<span>o</span>").css("color", "#f4c20d").appendTo(elem);
    $("<span>g</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>l</span>").css("color", "#3cba54").appendTo(elem);
    $("<span>e</span>").css("color", "#db3236").appendTo(elem);
    $("<span>&nbsp;Translate</span>").css("color", "#888").appendTo(elem);

    $(elem).css({
      display: "none",
      position: "absolute",
      padding: "6px",
      color: "black",
      "background-color": "white",
      "border-radius": "3px",
      "box-shadow": "1px 1px 3px gray",
      "font-family": "Arial, Helvetica, sans-serif",
      "font-size": "small",
      "text-align": "center",
      cursor: "pointer"
    })
    .click(function() {
      window.open("https://translate.google.com/", "_blank");
    });

    $(function() {
      $(elem).appendTo(document.body);
    });

    this.toggle = function(b) {
      if (b) {
        var offset = $(".ra-pause").offset();
        offset.left = Math.max(0, offset.left + $(".ra-pause").outerWidth() / 2 - $(elem).outerWidth() / 2);
        offset.top += $(".ra-pause").height() + 5;
        $(elem).css(offset).show();
      }
      else $(elem).hide();
    }
  }
}
