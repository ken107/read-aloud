
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
  }
})();


function RemoteTTS(host) {
  var audio = window.ttsAudio || (window.ttsAudio = document.createElement("AUDIO"));

  this.speak = function(utterance, options, onEvent) {
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    audio.volume = options.volume || 1;
    audio.defaultPlaybackRate = options.rate || 1;
    audio.src = host + "/read-aloud/speak/" + options.lang + "/" + encodeURIComponent(options.voiceName) + "?q=" + encodeURIComponent(utterance);
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
    };
    audio.play();
  }

  this.isSpeaking = function(callback) {
    callback(audio.currentTime && !audio.paused && !audio.ended);
  }

  this.stop = function() {
    audio.pause();
  }
}
