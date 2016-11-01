
function play() {
  return getPlaybackState()
    .then(function(state) {
      if (state == "PAUSED") return resume();
      else if (state == "STOPPED") return parseDoc().then(speak).catch(console.error.bind(console));
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

function isSpeaking() {
  return new Promise(function(fulfill) {
    chrome.tts.isSpeaking(fulfill);
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

function speak(speech, enqueue) {
  return getSettings().then(function(settings) {
    return speakSpeech(speech, enqueue, {
      voiceName: settings.voiceName,
      rate: settings.rate || defaults.rate,
      pitch: settings.pitch || defaults.pitch,
      volume: settings.volume || defaults.volume,
      spchletMaxLen: settings.spchletMaxLen || defaults.spchletMaxLen
    });
  });
}

function speakSpeech(speech, enqueue, options) {
  return getVoices()
    .then(function(voices) {
      return findSuitableVoice(voices, speech, options);
    })
    .then(function(voice) {
      console.log("voice", voice);
      options.voiceName = voice.voiceName;
      setState("activeVoice", voice);
      return isCustomVoice(voice.voiceName);
    })
    .then(function(isCustomVoice) {
      if (isCustomVoice) {
        return speakText(speech.texts.join("\n\n"), enqueue, options);
      }
      else {
        var texts = breakTexts(speech.texts, options.spchletMaxLen);
        var promise = speakText(texts[0], enqueue, options);
        for (var i=1; i<texts.length; i++) speakText(texts[i], true, options);
        return promise;
      }
    });
}

function speakText(text, enqueue, options) {
  return new Promise(function(fulfill) {
    chrome.tts.speak(text, {
      enqueue: enqueue,
      voiceName: options.voiceName,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start"],
      desiredEventTypes: ["start"],
      onEvent: function(event) {
        if (event.type == "start") fulfill();
      }
    });
  });
}

function findSuitableVoice(voices, speech, options) {
  if (options.voiceName)
    return findVoiceByName(voices, options.voiceName);
  else
    return Promise.resolve()
      .then(function() {
        if (speech.lang) return speech.lang;
        else return detectLanguage(speech);
      })
      .then(function(lang) {
        options.lang = lang;
        return findVoiceByLang(voices, lang);
      });
}

function findVoiceByName(voices, name) {
  for (var i=0; i<voices.length; i++) if (voices[i].name == name) return voices[i];
  return null;
}

function findVoiceByLang(voices, lang) {
  var speechLang = parseLang(lang);
  var match = {};
  voices.forEach(function(voice) {
    if (voice.lang) {
      var voiceLang = parseLang(voice.lang);
      if (voiceLang.lang == speechLang.lang) {
        if (voiceLang.rest == speechLang.rest) {
          if (voice.gender == "female") match.first = match.first || voice;
          else match.second = match.second || voice;
        }
        else if (!voiceLang.rest) match.third = match.third || voice;
        else {
          if (voiceLang.lang == 'en' && voiceLang.rest == 'us') match.fourth = voice;
          else match.fourth = match.fourth || voice;
        }
      }
    }
    if (voice.voiceName == "Google US English") match.default = match.default || voice;
  });
  return match.first || match.second || match.third || match.fourth || match.default;
}

function parseLang(lang) {
  var tokens = lang.toLowerCase().split("-", 2);
  return {
    lang: tokens[0],
    rest: tokens[1]
  };
}

function detectLanguage(speech) {
  var sentences = getSentences(speech.texts.join("\n\n"));
  return request("GET", "http://ws.detectlanguage.com/0.2/detect", {
    q: sentences.slice(0,5).join(" "),
    key: "d49ef20f88bd3f33a0983eda351bf4a8"
  })
  .then(function(text) {
    var result = JSON.parse(text);
    result.data.detections.sort(function(a,b) {
      if (a.isReliable == b.isReliable) {
        if (a.confidence < b.confidence) return -1;
        else if (a.confidence > b.confidence) return 1;
        else return 0;
      }
      else if (a.isReliable) return 1;
      else return -1;
    });
    var best = result.data.detections.pop();
    return best && best.language;
  });
}

function breakTexts(texts, wordLimit) {
  return [].concat.apply([], texts.map(function(text) {
    return breakText(text, wordLimit);
  }));
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
