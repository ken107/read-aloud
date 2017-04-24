
(function() {
  var port;
  var requests = {};
  var requestIdGen = 0;
  var utterances = {};
  var utteranceIdGen = 0;

  chrome.ttsEngine.onSpeak.addListener(function(utterance, options, sendTtsEvent) {
    var id = ++utteranceIdGen;
    utterances[id] = {
      onEnd: sendTtsEvent.bind(null, {type: 'end', charIndex: utterance.length})
    };
    ready()
      .then(send.bind(null, {method: "speak", args: [id, utterance, options]}))
      .then(sendTtsEvent.bind(null, {type: 'start', charIndex: 0}))
      .catch(utterances[id].onEnd)
  })

  chrome.ttsEngine.onStop.addListener(function() {
    if (port) send({method: "stop"});
  })

  function ready() {
    if (port) return Promise.resolve();
    else return connect().then(setPort);
  }

  function connect() {
    var name = String(Math.random());
    return new Promise(function(fulfill, reject) {
      function onConnect(result) {
        if (result.name == name) {
          chrome.runtime.onConnect.removeListener(onConnect);
          fulfill(result);
        }
      }
      chrome.runtime.onConnect.addListener(onConnect);
      executeFile("js/responsivevoice.js")
        .then(executeFile.bind(null, "js/vietnamese.js"))
        .then(executeScript.bind(null, "connectRespVoice('" + name + "')"))
        .catch(reject);
    })
  }

  function setPort(p) {
    port = p;
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(onDisconnect);
  }

  function onMessage(message) {
    if (message.request) {
      if (message.request.method == "onEnd") {
        var id = message.request.args[0];
        if (utterances[id]) {
          utterances[id].onEnd();
          delete utterances[id];
        }
      }
    }
    else {
      var callback = requests[message.id];
      if (callback) {
        delete requests[message.id];
        callback(message.response);
      }
    }
  }

  function onDisconnect() {
    port = null;
    requests = {};
    for (var id in utterances) utterances[id].onEnd();
    utterances = {};
  }

  function send(request) {
    return new Promise(function(fulfill) {
      var id = ++requestIdGen;
      requests[id] = fulfill;
      port.postMessage({id: id, request: request});
    })
  }
})();
