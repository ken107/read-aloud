
function play() {
  return getState("isPaused")
    .then(function(isPaused) {
      if (isPaused) return resume();
      else return parseDoc().then(speak);
    })
}

function stop() {
  chrome.tts.stop();
  return checkStopped();
}

function checkStopped() {
  return isSpeaking()
    .then(function(isSpeaking) {
      if (!isSpeaking) return;
      else return waitMillis(500).then(checkStopped);
    });
}

function pause() {
  chrome.tts.pause();
  return setState("isPaused", true);
}

function resume() {
  chrome.tts.resume();
  return setState("isPaused", false);
}

function getPlaybackState() {
  return Promise.all([
      isSpeaking(),
      getState("isPaused")
    ])
    .then(spread(function(isSpeaking, isPaused) {
      if (isSpeaking) {
        if (isPaused) return "PAUSED";
        else return "PLAYING";
      }
      else {
        if (isPaused) return setState("isPaused", false).then(function() {return "STOPPED"});
        else return "STOPPED";
      }
    }));
}

function parseDoc() {
  return executeScript("js/jquery-3.1.1.min.js")
    .then(executeScript.bind(null, "js/content.js"))
    .then(function(results) {return results[0]});
}

function speak(speech) {
  return getSettings().then(speak2.bind(null, speech));
}

function speak2(speech, settings) {
  return new Promise(function(fulfill) {
    [].concat.apply([], speech.texts.map(function(text) {
      return breakText(text, settings.spchletMaxLen || defaults.spchletMaxLen);
    }))
    .forEach(function(text, index) {
      var options = {
        enqueue: true,
        voiceName: settings.voiceName || defaults.voiceName,
        lang: speech.lang,
        rate: settings.rate || defaults.rate,
        pitch: settings.pitch || defaults.pitch,
        volume: settings.volume || defaults.volume
      };
      if (index == 0) {
        options.requiredEventTypes =
        options.desiredEventTypes = ["start"];
        options.onEvent = function(event) {
          if (event.type == "start") fulfill();
        };
      }
      chrome.tts.speak(text, options);
    });
  });
}

function breakText(text, wordLimit) {
  return merge(getSentences(text), wordLimit, breakSentence);
}

function breakSentence(sentence, wordLimit) {
  return merge(getPhrases(sentence), wordLimit, breakPhrase);
}

function breakPhrase(phrase, wordLimit) {
  var words = getWords(phrase);
  var splitPoint = Math.min(Math.ceil(words.length/2), wordLimit);
  var result = [];
  while (words.length) {
    result.push(words.slice(0, splitPoint).join(" "));
    words = words.slice(splitPoint);
  }
  return result;
}

function merge(parts, wordLimit, breakPart) {
  var result = [];
  var group = {parts: [], wordCount: 0};
  var flush = function() {
    if (group.parts.length) {
      result.push(group.parts.join(""));
      group = {parts: [], wordCount: 0};
    }
  };
  parts.forEach(function(part) {
    var wordCount = getWords(part).length;
    if (wordCount > wordLimit) {
      flush();
      var subParts = breakPart(part, wordLimit);
      for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
    }
    else {
      if (group.wordCount + wordCount > wordLimit) flush();
      group.parts.push(part);
      group.wordCount += wordCount;
    }
  });
  flush();
  return result;
}

function getSentences(text) {
  var tokens = text.split(/([.!?]+\s)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getPhrases(sentence) {
  var tokens = sentence.split(/([,;:]\s|\s-+\s|\u2014)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getWords(sentence) {
  return sentence.trim().split(/\s+/);
}
