
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
  }
})();


function RemoteTTS(host) {
  var audio = window.ttsAudio || (window.ttsAudio = document.createElement("AUDIO"));
  var lastEndTime = 0;

  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.src = host + "/read-aloud/speak/" + options.lang + "/" + encodeURIComponent(options.voiceName) + "?q=" + encodeURIComponent(utterance);
    audio.oncanplay = function() {
      var startTime = lastEndTime + (getParagraphPause(options.voiceName) / options.rate);
      var waitTime = startTime - new Date().getTime();
      if (waitTime > 0) waitMillis(waitTime).then(audio.play.bind(audio));
      else audio.play();
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      lastEndTime = new Date().getTime();
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
    };
  }

  this.isSpeaking = function(callback) {
    callback(audio.currentTime && !audio.paused && !audio.ended);
  }

  this.stop = function() {
    audio.pause();
  }
}
