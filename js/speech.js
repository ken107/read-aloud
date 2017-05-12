
function Speech(texts, options) {
  if (!options.spchletMaxLen) options.spchletMaxLen = 36;

  var punctuator;
  if (/^zh|ko|ja/.test(options.lang)) {
    punctuator = new EastAsianPunctuator();
    options.spchletMaxLen *= 2;
  }
  else punctuator = new LatinPunctuator();

  var engine = options.engine || chrome.tts;
  var isPlaying = false;
  var index = [0, 0];
  var hackTimer = 0;

  if (isAmazonPolly(options.voiceName) || isGoogleTranslate(options.voiceName)) {
    texts = texts.map(function(text) {return new CharBreaker().breakText(text, 200, punctuator)})
    options.hack = false;
  }
  else {
    texts = texts.map(function(text) {return new WordBreaker().breakText(text, options.spchletMaxLen, punctuator)});
    options.hack = true;
  }

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.getState = getState;
  this.forward = forward;
  this.rewind = rewind;
  this.gotoEnd = gotoEnd;

  function getState() {
    return new Promise(function(fulfill) {
      engine.isSpeaking(function(isSpeaking) {
        if (isPlaying) fulfill(isSpeaking ? "PLAYING" : "LOADING");
        else fulfill("PAUSED");
      })
    })
  }

  function play() {
    if (index[0] >= texts.length) {
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
      isPlaying = new Date().getTime();
      return new Promise(function(fulfill) {
        speak(texts[index[0]][index[1]], fulfill, playNext);
      });
    }
  }

  function hack() {
    engine.isSpeaking(function(isSpeaking) {
      if (isSpeaking) playNext();
    });
  }

  function playNext() {
    index[1]++;
    if (index[1] >= texts[index[0]].length) index = [index[0]+1, 0];
    return play();
  }

  function pause() {
    if (options.hack) clearTimeout(hackTimer);
    engine.stop();
    isPlaying = false;
    return Promise.resolve();
  }

  function forward() {
    if (index[0]+1 < texts.length) {
      index = [index[0]+1, 0];
      return play();
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (isPlaying && new Date().getTime()-isPlaying > 3*1000) {
      index = [index[0], 0];
      return play();
    }
    else if (index[0] > 0) {
      index = [index[0]-1, 0];
      return play();
    }
    else return Promise.reject(new Error("Can't rewind, at beginning"));
  }

  function gotoEnd() {
    index = [Math.max(texts.length-1, 0), 0];
  }

  function speak(text, onStart, onEnd) {
    engine.speak(text, {
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

//text breakers

function WordBreaker() {
  this.breakText = breakText;

  function breakText(text, wordLimit, punctuator) {
    return merge(punctuator.getSentences(text), wordLimit, punctuator, breakSentence);
  }

  function breakSentence(sentence, wordLimit, punctuator) {
    return merge(punctuator.getPhrases(sentence), wordLimit, punctuator, breakPhrase);
  }

  function breakPhrase(phrase, wordLimit, punctuator) {
    var words = punctuator.getWords(phrase);
    var splitPoint = Math.min(Math.ceil(words.length/2), wordLimit);
    var result = [];
    while (words.length) {
      result.push(words.slice(0, splitPoint).join(""));
      words = words.slice(splitPoint);
    }
    return result;
  }

  function merge(parts, wordLimit, punctuator, breakPart) {
    var result = [];
    var group = {parts: [], wordCount: 0};
    var flush = function() {
      if (group.parts.length) {
        result.push(group.parts.join(""));
        group = {parts: [], wordCount: 0};
      }
    };
    parts.forEach(function(part) {
      var wordCount = punctuator.getWords(part).length;
      if (wordCount > wordLimit) {
        flush();
        var subParts = breakPart(part, wordLimit, punctuator);
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
}

function CharBreaker() {
  this.breakText = breakText;

  function breakText(text, charLimit, punctuator) {
    return merge(punctuator.getSentences(text), charLimit, punctuator, breakSentence);
  }

  function breakSentence(sentence, charLimit, punctuator) {
    return merge(punctuator.getPhrases(sentence), charLimit, punctuator, breakPhrase);
  }

  function breakPhrase(phrase, charLimit, punctuator) {
    return merge(punctuator.getWords(phrase), charLimit, punctuator);
  }

  function merge(parts, charLimit, punctuator, breakPart) {
    var result = [];
    var group = {parts: [], charCount: 0};
    var flush = function() {
      if (group.parts.length) {
        result.push(group.parts.join(""));
        group = {parts: [], charCount: 0};
      }
    };
    parts.forEach(function(part) {
      var charCount = part.length;
      if (charCount > charLimit) {
        flush();
        var subParts = breakPart(part, charLimit, punctuator);
        for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
      }
      else {
        if (group.charCount + charCount > charLimit) flush();
        group.parts.push(part);
        group.charCount += charCount;
      }
    });
    flush();
    return result;
  }
}

//punctuators

function LatinPunctuator() {
  this.getSentences = function(text) {
    var tokens = text.split(/([.!?]+[\s\u200b])/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  this.getPhrases = function(sentence) {
    var tokens = sentence.split(/([,;:]\s|\s-+\s|—)/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  this.getWords = function(sentence) {
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

function EastAsianPunctuator() {
  this.getSentences = function(text) {
    var tokens = text.split(/([.!?]+[\s\u200b]|[\u3002\uff01])/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  this.getPhrases = function(sentence) {
    var tokens = sentence.split(/([,;:]\s|[\u2025\u2026\u3000\u3001\uff0c\uff1b])/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else result.push(tokens[i]);
    }
    return result;
  }

  this.getWords = function(sentence) {
    return sentence.replace(/\s+/g, "").split("");
  }
}
}
