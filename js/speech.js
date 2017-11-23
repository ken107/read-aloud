
function Speech(texts, options) {
  options.rate = (options.rate || 1) * getRateMultiplier(options.voiceName);

  var engine = options.engine || createEngine();
  var isPlaying = false;
  var index = 0;
  var chunk = null;

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.getState = getState;
  this.getPosition = getPosition;
  this.forward = forward;
  this.rewind = rewind;
  this.gotoEnd = gotoEnd;

  function createEngine() {
    var isEA = isEastAsian(options.lang);
    var punctuator = isEA ? new EastAsianPunctuator() : new LatinPunctuator();
    if (isGoogleNative(options.voiceName)) {
      var wordLimit = 36 * (isEA ? 2 : 1) * options.rate;
      return new ChunkingTtsEngine(new TtsEngineWrapperForGoogleNativeVoices(), new WordBreaker(wordLimit, punctuator));
    }
    else {
      var charLimit = isGoogleTranslate(options.voiceName) ? 200 : 500;
      return new ChunkingTtsEngine(chrome.tts, new CharBreaker(charLimit, punctuator));
    }
  }

  function getState() {
    return new Promise(function(fulfill) {
      engine.isSpeaking(function(isSpeaking) {
        if (isPlaying) fulfill(isSpeaking ? "PLAYING" : "LOADING");
        else fulfill("PAUSED");
      })
    })
  }

  function getPosition() {
    return {
      index: index,
      texts: texts,
      chunk: chunk,
    }
  }

  function play() {
    if (index >= texts.length) {
      isPlaying = false;
      if (options.onEnd) options.onEnd();
      return Promise.resolve();
    }
    else {
      isPlaying = new Date().getTime();
      return speak(texts[index],
        function() {
          index++;
          play();
        },
        function(err) {
          isPlaying = false;
          if (options.onEnd) options.onEnd(err);
        },
        function(startIndex, endIndex) {
          chunk = {
            startIndex: startIndex,
            endIndex: endIndex
          };
        })
    }
  }

  function pause() {
    engine.stop();
    isPlaying = false;
    return Promise.resolve();
  }

  function forward() {
    if (index+1 < texts.length) {
      index++;
      return play();
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (isPlaying && new Date().getTime()-isPlaying > 3*1000) {
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

  function speak(text, onEnd, onError, onChunk) {
    return new Promise(function(fulfill) {
    engine.speak(text, {
      voiceName: options.voiceName,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start", "end"],
      desiredEventTypes: ["start", "end", "error"],
      onEvent: function(event) {
        if (event.type == "start") fulfill();
        else if (event.type == "end") onEnd();
        else if (event.type == "error") onError(new Error(event.errorMessage || "Unknown TTS error"));
        else if (event.type == "chunk") onChunk(event.startIndex, event.endIndex);
      }
    });
    })
  }


  function ChunkingTtsEngine(baseEngine, textBreaker) {
    this.speak = function(text, options) {
      var charIndex = 0;
      var speakChunk = function(chunk) {
        return speak(chunk, options,
          function() {
            if (charIndex == 0) options.onEvent({type: 'start', charIndex: 0});
            options.onEvent({type: "chunk", startIndex: charIndex, endIndex: charIndex+chunk.length});
            charIndex += chunk.length;
          })
      };
      var chunks = textBreaker.breakText(text);
      var tasks = chunks.map(function(chunk) {return speakChunk.bind(null, chunk)});
      inSequence(tasks)
        .then(function() {
          options.onEvent({type: 'end', charIndex: text.length});
        })
        .catch(function(err) {
          options.onEvent({type: 'error', errorMessage: err.message});
        })
    }

    function speak(chunk, options, onStart) {
      return new Promise(function(fulfill, reject) {
        baseEngine.speak(chunk, Object.assign({}, options, {
          onEvent: function(event) {
            if (event.type == "start") onStart();
            else if (event.type == "end") fulfill();
            else if (event.type == "error") reject(new Error(event.errorMessage));
          }
        }))
      })
    }

    this.stop = function() {
      baseEngine.stop();
    }

    this.isSpeaking = function(callback) {
      baseEngine.isSpeaking(callback);
    }
  }

  function TtsEngineWrapperForGoogleNativeVoices() {
    var timer;

    this.speak = function(text, options) {
      clearTimeout(timer);
      timer = setTimeout(options.onEvent.bind(null, {type: "end"}), 16*1000);
      chrome.tts.speak(text, Object.assign({}, options, {
        onEvent: function(event) {
          if (event.type == "end" || event.type == "error") clearTimeout(timer);
          options.onEvent(event);
        }
      }))
    }

    this.stop = function() {
      clearTimeout(timer);
      chrome.tts.stop();
    }

    this.isSpeaking = function(callback) {
      chrome.tts.isSpeaking(callback);
    }
  }

//text breakers

function WordBreaker(wordLimit, punctuator) {
  this.breakText = breakText;

  function breakText(text) {
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

function CharBreaker(charLimit, punctuator) {
  this.breakText = breakText;

  function breakText(text) {
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

  function merge(parts, breakPart) {
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
