
function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleNative(options.voice.voiceName) ? 0.9 : (isGoogleTranslate(options.voice.voiceName) ? 1.1 : 1));

  for (var i=0; i<texts.length; i++) if (/\w$/.test(texts[i])) texts[i] += '.';
  if (texts.length) texts = getChunks(texts.join("\n\n"));

  var engine = options.engine || pickEngine();
  var pauseDuration = isGoogleTranslate(options.voice.voiceName) ? 0 : (650/options.rate);
  var state = "IDLE";
  var index = 0;
  var delayedPlayTimer;

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.stop = stop;
  this.getState = getState;
  this.getPosition = getPosition;
  this.forward = forward;
  this.rewind = rewind;
  this.gotoEnd = gotoEnd;

  function pickEngine() {
    if (isRemoteVoice(options.voice.voiceName)) return remoteTtsEngine;
    if (isGoogleNative(options.voice.voiceName)) return new TimeoutTtsEngine(browserTtsEngine, 16*1000);
    return browserTtsEngine;
  }

  function getChunks(text) {
    var isEA = /^zh|ko|ja/.test(options.lang);
    var punctuator = isEA ? new EastAsianPunctuator() : new LatinPunctuator();
    if (isGoogleNative(options.voice.voiceName)) {
      var wordLimit = (/^(de|ru|es)/.test(options.lang) ? 32 : 36) * (isEA ? 2 : 1) * options.rate;
      return new WordBreaker(wordLimit, punctuator).breakText(text);
    }
    else {
      if (isGoogleTranslate(options.voice.voiceName)) return new CharBreaker(200, punctuator).breakText(text);
      else return new CharBreaker(500, punctuator, 200).breakText(text);
    }
  }

  function getState() {
    return new Promise(function(fulfill) {
      engine.isSpeaking(function(isSpeaking) {
        if (state == "PLAYING") fulfill(isSpeaking ? "PLAYING" : "LOADING");
        else fulfill("PAUSED");
      })
    })
  }

  function getPosition() {
    return {
      index: index,
      texts: texts,
    }
  }

  function play() {
    if (index >= texts.length) {
      state = "IDLE";
      if (options.onEnd) options.onEnd();
      return Promise.resolve();
    }
    else if (state == "PAUSED") {
      state = "PLAYING";
      engine.resume();
      return Promise.resolve();
    }
    else {
      state = new String("PLAYING");
      state.startTime = new Date().getTime();
      return speak(texts[index],
        function() {
          state = "IDLE";
          if (engine.setNextStartTime) engine.setNextStartTime(new Date().getTime() + pauseDuration, options);
          index++;
          play();
        },
        function(err) {
          state = "IDLE";
          if (options.onEnd) options.onEnd(err);
        })
        .then(function() {
          if (texts[index+1] && engine.prefetch) engine.prefetch(texts[index+1], options);
        })
    }
  }

  function delayedPlay() {
    clearTimeout(delayedPlayTimer);
    delayedPlayTimer = setTimeout(play, 750);
    return Promise.resolve();
  }

  function pause() {
    if (engine.pause) {
      engine.pause();
      state = "PAUSED";
      return Promise.resolve();
    }
    else return stop();
  }

  function stop() {
    engine.stop();
    state = "IDLE";
    return Promise.resolve();
  }

  function forward() {
    if (index+1 < texts.length) {
      index++;
      return delayedPlay();
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (state == "PLAYING" && new Date().getTime()-state.startTime > 3*1000) {
      return play();
    }
    else if (index > 0) {
      index--;
      return play();
    }
    else return Promise.reject(new Error("Can't rewind, at beginning"));
  }

  function gotoEnd() {
    index = texts.length && texts.length-1;
  }

  function speak(text, onEnd, onError) {
    return new Promise(function(fulfill) {
      engine.speak(text, options, function(event) {
        if (event.type == "start") fulfill();
        else if (event.type == "end") onEnd();
        else if (event.type == "error") onError(new Error(event.errorMessage || "Unknown TTS error"));
      })
    })
  }


//text breakers

function WordBreaker(wordLimit, punctuator) {
  this.breakText = breakText;
  function breakText(text) {
    return merge(punctuator.getParagraphs(text), breakParagraph);
  }
  function breakParagraph(text) {
    return merge(punctuator.getSentences(text), breakSentence);
  }
  function breakSentence(sentence) {
    return merge(punctuator.getPhrases(sentence), breakPhrase);
  }
  function breakPhrase(phrase) {
    var words = punctuator.getWords(phrase);
    var splitPoint = Math.min(Math.ceil(words.length/2), wordLimit);
    var result = [];
    while (words.length) {
      result.push(words.slice(0, splitPoint).join(""));
      words = words.slice(splitPoint);
    }
    return result;
  }
  function merge(parts, breakPart) {
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
        var subParts = breakPart(part);
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

function CharBreaker(charLimit, punctuator, paragraphCombineThreshold) {
  this.breakText = breakText;
  function breakText(text) {
    return merge(punctuator.getParagraphs(text), breakParagraph, paragraphCombineThreshold);
  }
  function breakParagraph(text) {
    return merge(punctuator.getSentences(text), breakSentence);
  }
  function breakSentence(sentence) {
    return merge(punctuator.getPhrases(sentence), breakPhrase);
  }
  function breakPhrase(phrase) {
    return merge(punctuator.getWords(phrase), breakWord);
  }
  function breakWord(word) {
    var result = [];
    while (word) {
      result.push(word.slice(0, charLimit));
      word = word.slice(charLimit);
    }
    return result;
  }
  function merge(parts, breakPart, combineThreshold) {
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
        var subParts = breakPart(part);
        for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
      }
      else {
        if (group.charCount + charCount > (combineThreshold || charLimit)) flush();
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
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    return recombine(text.split(/([.!?]+[\s\u200b]+)/));
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|\s-+\s+|—\s*)/));
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
  function recombine(tokens) {
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else if (tokens[i]) result.push(tokens[i]);
    }
    return result;
  }
}

function EastAsianPunctuator() {
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    return recombine(text.split(/([.!?]+[\s\u200b]+|[\u3002\uff01]+)/));
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|[\u2025\u2026\u3000\u3001\uff0c\uff1b]+)/));
  }
  this.getWords = function(sentence) {
    return sentence.replace(/\s+/g, "").split("");
  }
  function recombine(tokens) {
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
      else if (tokens[i]) result.push(tokens[i]);
    }
    return result;
  }
}

  function TimeoutTtsEngine(baseEngine, timeoutMillis) {
    var timer;
    this.speak = function(text, options, onEvent) {
      clearTimeout(timer);
      timer = setTimeout(function() {
        baseEngine.stop();
        onEvent({type: "end", charIndex: text.length});
      },
      timeoutMillis);
      baseEngine.speak(text, options, function(event) {
          if (event.type == "end" || event.type == "error") clearTimeout(timer);
          onEvent(event);
      })
    }
    this.stop = function() {
      clearTimeout(timer);
      baseEngine.stop();
    }
    this.isSpeaking = baseEngine.isSpeaking;
  }
}
