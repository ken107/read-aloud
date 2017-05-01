
(function() {
  var audio;
  chrome.ttsEngine.onSpeak.addListener(onSpeak);
  chrome.ttsEngine.onStop.addListener(onStop);

  function onSpeak(utterance, options, sendTtsEvent) {
    if (audio) audio.pause();
    audio = new Audio();
    if (options.volume) audio.volume = options.volume;
    if (options.rate) audio.defaultPlaybackRate = options.rate;
    audio.src = "http://app.diepkhuc.com:30112/read-aloud/speak/" + options.lang + "?q=" + encodeURIComponent(utterance);
    audio.onplay = function() {
      sendTtsEvent({type: 'start', charIndex: 0});
    }
    audio.onerror =
    audio.onended = function() {
      sendTtsEvent({type: 'end', charIndex: utterance.length});
    }
    audio.play();
  }

  function onStop() {
    if (audio) {
      audio.pause();
      audio = null;
    }
  }
})();
