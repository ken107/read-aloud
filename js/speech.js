
function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleNative(options.voice) ? 0.9 : 1);

  for (var i=0; i<texts.length; i++) if (/[\w)]$/.test(texts[i])) texts[i] += '.';

  var self = this;
  var engine;
  var pauseDuration = 650/options.rate;
  var state = "IDLE";
  var index = 0;
  var delayedPlayTimer;
  var ready = Promise.resolve(pickEngine())
    .then(function(x) {
      engine = x;
      if (texts.length) texts = getChunks(texts.join("\n\n"));
    })

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.stop = stop;
  this.getState = getState;
  this.getPosition = getPosition;
  this.forward = forward;
  this.rewind = rewind;
  this.seek = seek;
  this.gotoEnd = gotoEnd;

  function pickEngine() {
    if (isGoogleTranslate(options.voice) && !/\s(Hebrew|Telugu)$/.test(options.voice.voiceName)) {
      return googleTranslateTtsEngine.ready()
        .then(function() {return googleTranslateTtsEngine})
        .catch(function(err) {
          console.warn("GoogleTranslate unavailable,", err);
          options.voice.autoSelect = true;
          options.voice.voiceName = "Microsoft US English (Zira)";
          return remoteTtsEngine;
        })
    }
    if (isAmazonPolly(options.voice)) return amazonPollyTtsEngine;
    if (isGoogleWavenet(options.voice)) return googleWavenetTtsEngine;
    if (isIbmWatson(options.voice)) return ibmWatsonTtsEngine;
    if (isRemoteVoice(options.voice)) return remoteTtsEngine;
    if (isGoogleNative(options.voice)) return new TimeoutTtsEngine(browserTtsEngine, 16*1000);
    return browserTtsEngine;
  }

  function getChunks(text) {
    var isEA = /^zh|ko|ja/.test(options.lang);
    var punctuator = isEA ? new EastAsianPunctuator() : new LatinPunctuator();
    if (isGoogleNative(options.voice)) {
      var wordLimit = (/^(de|ru|es|id)/.test(options.lang) ? 32 : 36) * (isEA ? 2 : 1) * options.rate;
      return new WordBreaker(wordLimit, punctuator).breakText(text);
    }
    else {
      if (isGoogleTranslate(options.voice)) return new CharBreaker(200, punctuator).breakText(text);
      else return new CharBreaker(750, punctuator, 200).breakText(text);
    }
  }

  function getState() {
    if (!engine) return "LOADING";
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
      isRTL: /^(ar|az|dv|he|iw|ku|fa|ur)\b/.test(options.lang),
    }
  }

  function play() {
    if (index >= texts.length) {
      state = "IDLE";
      if (self.onEnd) self.onEnd();
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
      return ready
        .then(function() {
          return speak(texts[index],
            function() {
              state = "IDLE";
              if (engine.setNextStartTime) engine.setNextStartTime(new Date().getTime() + pauseDuration, options);
              index++;
              play()
                .catch(function(err) {
                  if (self.onEnd) self.onEnd(err)
                })
            },
            function(err) {
              state = "IDLE";
              if (self.onEnd) self.onEnd(err);
            })
        })
        .then(function() {
          if (texts[index+1] && engine.prefetch) engine.prefetch(texts[index+1], options);
        })
    }
  }

  function delayedPlay() {
    clearTimeout(delayedPlayTimer);
    delayedPlayTimer = setTimeout(function() {stop().then(play)}, 750);
    return Promise.resolve();
  }

  function canPause() {
    return engine.pause && !(
      isChromeOSNative(options.voice) ||
      options.voice.voiceName == "US English Female TTS (by Google)"
    )
  }

  function pause() {
    return ready
      .then(function() {
        if (canPause()) {
          clearTimeout(delayedPlayTimer);
          engine.pause();
          state = "PAUSED";
        }
        else return stop();
      })
  }

  function stop() {
    return ready
      .then(function() {
        clearTimeout(delayedPlayTimer);
        engine.stop();
        state = "IDLE";
      })
  }

  function forward() {
    if (index+1 < texts.length) {
      index++;
      if (state == "PLAYING") return delayedPlay()
      else return stop()
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (state == "PLAYING" && new Date().getTime()-state.startTime > 3*1000) {
      return stop().then(play);
    }
    else if (index > 0) {
      index--;
      if (state == "PLAYING") return stop().then(play)
      else return stop()
    }
    else return Promise.reject(new Error("Can't rewind, at beginning"));
  }

  function seek(n) {
    index = n;
    return play();
  }

  function gotoEnd() {
    index = texts.length && texts.length-1;
  }

  function speak(text, onEnd, onError) {
    var state = "IDLE";
    return new Promise(function(fulfill, reject) {
      engine.speak(text, options, function(event) {
        if (event.type == "start") {
          if (state == "IDLE") {
            fulfill();
            state = "STARTED";
          }
        }
        else if (event.type == "end") {
          if (state == "IDLE") {
            reject(new Error("TTS engine end event before start event"));
            state = "ERROR";
          }
          else if (state == "STARTED") {
            onEnd();
            state = "ENDED";
          }
        }
        else if (event.type == "error") {
          if (state == "IDLE") {
            reject(new Error(event.errorMessage || "Unknown TTS error"));
            state = "ERROR";
          }
          else if (state == "STARTED") {
            onError(new Error(event.errorMessage || "Unknown TTS error"));
            state = "ERROR";
          }
        }
      })
    })
  }


//text breakers

function WordBreaker(wordLimit, punctuator) {
  this.breakText = breakText;
  function breakText(text) {
    return punctuator.getParagraphs(text).flatMap(breakParagraph)
  }
  function breakParagraph(text) {
    return punctuator.getSentences(text).flatMap(breakSentence)
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
    return recombine(text.split(/([.!?]+[\s\u200b]+)/), /\b(\w|[A-Z][a-z]|Assn|Ave|Capt|Col|Comdr|Corp|Cpl|Gen|Gov|Hon|Inc|Lieut|Ltd|Rev|Univ|Jan|Feb|Mar|Apr|Aug|Sept|Oct|Nov|Dec|dept|ed|est|vol|vs)\.\s+$/);
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
  function recombine(tokens, nonPunc) {
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      var part = (i+1 < tokens.length) ? (tokens[i] + tokens[i+1]) : tokens[i];
      if (part) {
        if (nonPunc && result.length && nonPunc.test(result[result.length-1])) result[result.length-1] += part;
        else result.push(part);
      }
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
}
