
(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = window.remoteTtsEngine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
  }
})();


function RemoteTTS(host) {
  var audio = window.ttsAudio || (window.ttsAudio = document.createElement("AUDIO"));
  var prefetchAudio = document.createElement("AUDIO");
  var nextStartTime = 0;

  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    audio.volume = options.volume;
    audio.defaultPlaybackRate = options.rate;
    audio.src = getAudioUrl(utterance, options.lang, options.voiceName);
    audio.oncanplay = function() {
      var waitTime = nextStartTime - new Date().getTime();
      if (waitTime > 0) waitMillis(waitTime).then(audio.play.bind(audio));
      else audio.play();
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
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

  this.prefetch = function(utterance, options) {
    prefetchAudio.src = getAudioUrl(utterance, options.lang, options.voiceName);
  }

  this.setNextStartTime = function(time) {
    nextStartTime = time || 0;
  }

  function getAudioUrl(utterance, lang, voiceName) {
    return host + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voiceName) + "?q=" + encodeURIComponent(utterance);
  }
}
