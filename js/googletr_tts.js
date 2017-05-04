
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = new GoogleTranslateTTS();
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
  }
})();


function GoogleTranslateTTS() {
  var audio;

  this.speak = function(utterance, options, onEvent) {
    if (audio) audio.pause();
    audio = document.createElement("AUDIO");
    if (options.volume) audio.volume = options.volume;
    if (options.rate) audio.defaultPlaybackRate = options.rate;
    audio.src = "http://app.diepkhuc.com:30112/read-aloud/speak/" + options.lang + "?q=" + encodeURIComponent(utterance);
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onerror =
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
    audio.play();
  }

  this.isSpeaking = function(callback) {
    callback(audio && audio.currentTime && !audio.paused && !audio.ended);
  }

  this.stop = function() {
    if (audio) {
      audio.pause();
      audio = null;
    }
  }
}
