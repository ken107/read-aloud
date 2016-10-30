
responsiveVoice.OnVoiceReady = function() {
  responsiveVoice.isReady = true;
}

function isReady() {
  if (responsiveVoice.isReady) return Promise.resolve();
  else return waitMillis(500).then(isReady);
}

chrome.ttsEngine.onSpeak.addListener(speakListener);
chrome.ttsEngine.onStop.addListener(stopListener);

function speakListener(utterance, options, sendTtsEvent) {
  var voiceName = options.voiceName.replace(/^\S+\s+/, '');
  isReady().then(function() {
    responsiveVoice.speak(utterance, voiceName, {
      onstart: function() {
        sendTtsEvent({type: 'start', charIndex: 0});
      },
      onend: function() {
        sendTtsEvent({type: 'end', charIndex: utterance.length});
      }
    });
  });
}

function stopListener() {
  responsiveVoice.cancel();
}
