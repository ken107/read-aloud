
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
  }
})();


function RemoteTTS(host) {
  var audio = window.ttsAudio;
  if (!audio) audio = window.ttsAudio = document.createElement("AUDIO");

  this.speak = function(utterance, options, onEvent) {
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    audio.volume = options.volume || 1;
    audio.defaultPlaybackRate = (options.rate || 1) * getRateMultiplier(options.voiceName);
    audio.src = host + "/read-aloud/speak/" + options.lang + "/" + encodeURIComponent(options.voiceName) + "?q=" + encodeURIComponent(utterance);
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onerror =
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
    audio.play();
  }

  this.isSpeaking = function(callback) {
    callback(audio.currentTime && !audio.paused && !audio.ended);
  }

  this.stop = function() {
    audio.pause();
  }

  function getRateMultiplier(voiceName) {
    if (isGoogleTranslate(voiceName)) return 1.2;
    return 1;
  }
}
