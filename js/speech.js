
function Speech(texts, options) {
  var isPlaying = false;
  var index = 0;
  var hackTimer = 0;
  if (options.hack) texts = breakTexts(texts, options.spchletMaxLen);

  this.options = options;
  this.play = play;
  this.pause = pause;

  this.getState = function() {
    return new Promise(function(fulfill) {
      chrome.tts.isSpeaking(function(isSpeaking) {
        console.log('speech', isPlaying, isSpeaking);
        if (isPlaying) fulfill(isSpeaking ? "PLAYING" : "LOADING");
        else fulfill("PAUSED");
      })
    })
  }

  function play() {
    if (index >= texts.length) {
      if (options.hack) clearTimeout(hackTimer);
      isPlaying = false;
      if (options.onEnd) options.onEnd();
      return Promise.resolve();
    }
    else {
      if (options.hack) {
        clearTimeout(hackTimer);
        hackTimer = setTimeout(hack, 16*1000);
      }
      isPlaying = true;
      return new Promise(function(fulfill) {
        speak(texts[index], fulfill, playNext);
      });
    }
  }

  function hack() {
    chrome.tts.isSpeaking(function(isSpeaking) {
      if (isSpeaking) playNext();
    });
  }

  function playNext() {
    index++;
    play();
  }

  function pause() {
    if (options.hack) clearTimeout(hackTimer);
    chrome.tts.stop();
    isPlaying = false;
    return Promise.resolve();
  }

  function speak(text, onStart, onEnd) {
    chrome.tts.speak(text, {
      voiceName: options.voiceName,
      lang: options.lang,
      rate: Math.min(options.rate, 2),
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start", "end"],
      desiredEventTypes: ["start", "end"],
      onEvent: function(event) {
        if (event.type == "start") onStart();
        else if (event.type == "end") onEnd();
      }
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
      result.push(words.slice(0, splitPoint).join(""));
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
    var tokens = text.split(/([.!?]+[\s\u200b])/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  function getPhrases(sentence) {
    var tokens = sentence.split(/([,;:]\s|\s-+\s|—)/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  function getWords(sentence) {
    var tokens = sentence.trim().split(/([~@#%^*_+=<>]|[\s\-—/]+|\.(?=\w{2,})|,(?=[0-9]))/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (tokens[i]) result.push(tokens[i]);
      if (i+1 < tokens.length) {
        if (/^[~@#%^*_+=<>]$/.test(tokens[i+1])) result.push(tokens[i+1]);
        else if (result.length) result[result.length-1] += tokens[i+1];
      }
    }
    return result;
  }
}
