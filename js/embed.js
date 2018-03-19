
var readAloud = new function() {
  var pauseBtn = document.querySelector(".ra-pause");
  if (pauseBtn) pauseBtn.style.display = "none";

  if (typeof Promise == 'undefined') ajaxGetCb("https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js", eval);

  var speech;
  var voiceProvider = new VoiceProvider();
  var attribution = new Attribution();

  this.play = function(options) {
    return ready()
      .then(function() {
        return speech ? speech.play() : speak(new HtmlDoc().getTexts(0), options);
      })
      .then(updateButtons)
  };
  this.speak = function(text, options) {
    return ready()
      .then(speak.bind(this, text, options))
      .then(updateButtons)
  };
  this.pause = function() {
    return speech ? speech.pause().then(updateButtons) : Promise.resolve();
  };
  this.isPlaying = isPlaying;

  function ready() {
    if (window.jQuery) {
      if (!window.$) window.$ = window.jQuery;
      else if (window.$ != window.jQuery) console.warn("WARNING: Read Aloud embed script may not work because $ != jQuery.");
      return Promise.resolve();
    }
    else return ajaxGet("https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js").then(eval);
  }

  function speak(texts, options) {
    return voiceProvider.getVoice(options.lang).then(function(voice) {
      if (!voice) {
        alert("Language not supported '" + options.lang + "'");
        return;
      }
      options.voice = voice;
      options.onEnd = function() {speech = null; updateButtons()};
      if (speech) speech.stop();
      speech = new Speech(texts, options);
      return speech.play();
    })
  }

  function updateButtons() {
    return isPlaying()
      .then(function(playing) {
        $(".ra-play").toggle(!playing);
        $(".ra-pause").toggle(playing);
        attribution.toggle(playing && isGoogleTranslate(speech.options.voice.voiceName));
      })
  }

  function isPlaying() {
    if (speech) return speech.getState().then(function(state) {return state != "PAUSED"});
    else return Promise.resolve(false);
  }

  //voice provider
  function VoiceProvider() {
    this.getVoice = function(lang) {
      return getVoices().then(function(voices) {
        return findVoiceByLang(voices.filter(function(voice) {return !isRemoteVoice(voice.voiceName)}), lang)
          || findVoiceByLang(voices.filter(function(voice) {return isMicrosoftCloud(voice.voiceName)}), lang)
          || findVoiceByLang(voices, lang);
      })
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

  //google translate attribution
  function Attribution() {
    var elem;

    function create() {
      elem = $("<div/>").appendTo(document.body);
    $("<div>powered&nbsp;by</div>").css({color: "#888", "margin-bottom": "3px"}).appendTo(elem);
    $("<span>G</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>o</span>").css("color", "#db3236").appendTo(elem);
    $("<span>o</span>").css("color", "#f4c20d").appendTo(elem);
    $("<span>g</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>l</span>").css("color", "#3cba54").appendTo(elem);
    $("<span>e</span>").css("color", "#db3236").appendTo(elem);
    $("<span>&nbsp;Translate</span>").css("color", "#888").appendTo(elem);

    elem.css({
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
    }

    this.toggle = function(b) {
      if (b) {
        if (!elem) create();
        var offset = $(".ra-pause").offset();
        if (offset) {
          offset.left = Math.max(0, offset.left + $(".ra-pause").outerWidth() / 2 - elem.outerWidth() / 2);
          offset.top += $(".ra-pause").height() + 5;
          elem.css(offset).show();
        }
      }
      else elem && elem.hide();
    }
  }
}
