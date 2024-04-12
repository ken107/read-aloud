
function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleNative(options.voice) ? 0.9 : 1);

  for (var i=0; i<texts.length; i++) if (/[\w)]$/.test(texts[i])) texts[i] += '.';
  if (texts.length) texts = getChunks(texts.join("\n\n"));

  var self = this;
  const engine = pickEngine()
  var pauseDuration = 650/options.rate;
  var state = "IDLE";
  let sentenceStartIndicies
  const position = immediate(() => {
    let index = 0
    let word
    return {
      getIndex() {
        return index
      },
      setIndex(value) {
        index = value
        word = null
      },
      getWord() {
        return word
      },
      setWord(value) {
        word = value
      }
    }
  })
  var delayedPlayTimer;

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.stop = stop;
  this.getState = getState;
  this.getInfo = getInfo;
  this.forward = forward;
  this.rewind = rewind;
  this.seek = seek;
  this.gotoEnd = gotoEnd;

  function pickEngine() {
    if (isPiperVoice(options.voice)) return piperTtsEngine;
    if (isAzure(options.voice)) return azureTtsEngine;
    if (isOpenai(options.voice)) return openaiTtsEngine;
    if (isUseMyPhone(options.voice)) return phoneTtsEngine;
    if (isNvidiaRiva(options.voice)) return nvidiaRivaTtsEngine;
    if (isGoogleTranslate(options.voice) && !/\s(Hebrew|Telugu)$/.test(options.voice.voiceName)) {
      return googleTranslateTtsEngine
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
      var wordLimit = (/^(de|ru|es|pt|id)/.test(options.lang) ? 32 : 36) * (isEA ? 2 : 1) * options.rate;
      return new WordBreaker(wordLimit, punctuator).breakText(text);
    }
    else {
      if (isGoogleTranslate(options.voice)) return new CharBreaker(200, punctuator).breakText(text);
      else if (isPiperVoice(options.voice)) return [text];
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

  function getInfo() {
    return {
      texts: texts,
      position: {
        index: position.getIndex(),
        word: position.getWord(),
      },
      isRTL: /^(ar|az|dv|he|iw|ku|fa|ur)\b/.test(options.lang),
      isPiper: engine == piperTtsEngine,
    }
  }

  function play() {
    if (position.getIndex() >= texts.length) {
      state = "IDLE";
      if (self.onEnd) self.onEnd();
      return Promise.resolve();
    }
    else if (state == "PAUSED") {
      state = "PLAYING";
      return Promise.resolve()
        .then(() => engine.resume())
        .catch(err => {
          console.error("Couldn't resume", err)
          state = "IDLE"
          return play()
        })
    }
    else {
      state = new String("PLAYING");
      state.startTime = new Date().getTime();
      return speak(texts[position.getIndex()], {
        onEnd() {
          state = "IDLE";
          if (engine.setNextStartTime) engine.setNextStartTime(new Date().getTime() + pauseDuration, options);
          position.setIndex(position.getIndex() + 1)
          play()
            .catch(function(err) {
              if (self.onEnd) self.onEnd(err)
            })
        },
        onError(err) {
          state = "IDLE";
          if (self.onEnd) self.onEnd(err);
        },
        onSentence({startIndex}) {
          if (engine == piperTtsEngine) {
            position.setIndex(sentenceStartIndicies.indexOf(startIndex))
          }
        }
      })
      .then(startEvent => {
        if (engine == piperTtsEngine) {
          const text = texts[0]
          sentenceStartIndicies = startEvent.sentenceStartIndicies
          texts = sentenceStartIndicies.map((startIndex, i) => {
            return i+1 < sentenceStartIndicies.length
              ? text.slice(startIndex, sentenceStartIndicies[i+1])
              : text.slice(startIndex)
          })
        }
        else {
          const nextText = texts[position.getIndex() + 1]
          if (nextText && engine.prefetch) engine.prefetch(nextText, options)
        }
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

  async function pause() {
    if (canPause()) {
      clearTimeout(delayedPlayTimer);
      engine.pause();
      state = "PAUSED";
    }
    else return stop();
  }

  async function stop() {
    clearTimeout(delayedPlayTimer);
    engine.stop();
    state = "IDLE";
  }

  function forward() {
    if (engine.forward) {
      return Promise.resolve(engine.forward())
    }
    if (position.getIndex() + 1 < texts.length) {
      position.setIndex(position.getIndex() + 1)
      if (state == "PLAYING") return delayedPlay()
      else return stop()
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (engine.rewind) {
      return Promise.resolve(engine.rewind())
    }
    if (state == "PLAYING" && new Date().getTime()-state.startTime > 3*1000) {
      return stop().then(play);
    }
    else if (position.getIndex() > 0) {
      position.setIndex(position.getIndex() - 1)
      if (state == "PLAYING") return stop().then(play)
      else return stop()
    }
    else return Promise.reject(new Error("Can't rewind, at beginning"));
  }

  function seek(n) {
    if (engine.seek) {
      return Promise.resolve(engine.seek(n))
    }
    position.setIndex(n)
    return stop().then(play)
  }

  async function gotoEnd() {
    if (engine.seek) {
      return Promise.resolve(engine.seek(texts.length-1))
    }
    position.setIndex(texts.length && texts.length-1)
  }

  function speak(text, {onEnd, onError, onSentence}) {
    var state = "IDLE";
    return new Promise(function(fulfill, reject) {
      engine.speak(text, options, function(event) {
        if (event.type == "start") {
          if (state == "IDLE") {
            fulfill(event);
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
          if (event.error.message == "Aborted") {
          }
          else if (state == "IDLE") {
            reject(event.error);
            state = "ERROR";
          }
          else if (state == "STARTED") {
            onError(event.error);
            state = "ERROR";
          }
        }
        else if (event.type == "sentence") {
          onSentence(event)
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
