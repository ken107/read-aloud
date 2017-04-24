
responsiveVoice.OnVoiceReady = function() {responsiveVoice.isReady = true};
responsiveVoice.init();

function connectRespVoice(name) {
  var port = chrome.runtime.connect({name: name});
  var handlers = {};

  port.onMessage.addListener(function(message) {
    var request = message.request;
    if (handlers[request.method]) {
      var result = handlers[request.method].apply(handlers, request.args);
      Promise.resolve(result).then(function(response) {
        port.postMessage({id: message.id, response: response});
      });
    }
  })

  handlers.speak = function(id, utterance, options) {
    return isReady().then(function() {
      return new Promise(function(fulfill, reject) {
        responsiveVoice.speak(utterance, options.voiceName.replace(/^\S+\s+/, ''), {
          rate: options.rate,
          pitch: options.pitch,
          volume: options.volume,
          onstart: fulfill,
          onend: port.postMessage.bind(port, {request: {method: "onEnd", args: [id]}})
        })
      })
    })
  }

  handlers.stop = function() {
    responsiveVoice.cancel();
  }

  function isReady() {
    if (responsiveVoice.isReady) return Promise.resolve();
    else return waitMillis(500).then(isReady);
  }

  function waitMillis(millis) {
    return new Promise(function(fulfill) {
      setTimeout(fulfill, millis);
    });
  }
}
