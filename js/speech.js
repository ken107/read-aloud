
function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleNative(options.voice) ? 0.9 : 1);

  for (var i=0; i<texts.length; i++) if (/[\w)]$/.test(texts[i])) texts[i] += '.';
  if (texts.length) texts = getChunks(texts.join("\n\n"));

  var self = this;
  const engine = pickEngine()
  var pauseDuration = 650/options.rate;
  let piperState

  this.options = options;
  this.play = () => cmd$.next({name: "resume"})
  this.pause = () => cmd$.next({name: "pause"})
  this.stop = () => cmd$.error({name: "CancellationException", message: "Playback cancelled"})
  this.getState = getState;
  this.getInfo = getInfo;
  this.canForward = () => playlist.canForward()
  this.canRewind = () => playlist.canRewind()
  this.forward = () => cmd$.next({name: "forward"})
  this.rewind = () => cmd$.next({name: "rewind"})
  this.seek = index => cmd$.next({name: "seek", index})
  this.gotoEnd = () => cmd$.next({name: "gotoEnd"})

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
    if (isGoogleNative(options.voice)) return new TimeoutTtsEngine(browserTtsEngine, 2*1000, 30*1000);
    return browserTtsEngine;
  }

  function getChunks(text) {
    var isEA = /^zh|ko|ja/.test(options.lang);
    var punctuator = isEA ? new EastAsianPunctuator() : new LatinPunctuator();
    if (isGoogleTranslate(options.voice)) return new CharBreaker(200, punctuator).breakText(text);
    else if (isGoogleNative(options.voice)) return new CharBreaker(300 * options.rate, punctuator).breakText(text)
    else if (isPiperVoice(options.voice)) return [text];
    else return new CharBreaker(750, punctuator, 200).breakText(text);
  }

  async function getState() {
    if (playbackState$.value == "resumed") {
      const isSpeaking = await new Promise(f => engine.isSpeaking(f))
      return isSpeaking ? "PLAYING" : "LOADING"
    } else {
      return "PAUSED"
    }
  }

  function getInfo() {
    return {
      texts: piperState ? piperState.texts : texts,
      position: {
        index: piperState ? piperState.index : playlist.getIndex()
      },
      isRTL: /^(ar|az|dv|he|iw|ku|fa|ur)\b/.test(options.lang),
      isPiper: piperState != null,
    }
  }



  const playbackState$ = new rxjs.BehaviorSubject("paused")
  const playlist = makePlaylist()
  const cmd$ = new rxjs.Subject()

  cmd$.pipe(
    rxjs.startWith({name: "seek", index: 0}),
    rxjs.scan((current, cmd) => {
      switch (cmd.name) {
        case "pause":
          playbackState$.next("paused")
          return current
        case "resume":
          playbackState$.next("resumed")
          return current
        case "forward":
          if (engine.forward) {
            engine.forward()
            return current
          } else {
            return playlist.forward(750) || current
          }
        case "rewind":
          if (engine.rewind) {
            engine.rewind()
            return current
          } else if (Date.now()-current.since > 3000) {
            return playlist.seek(playlist.getIndex())
          } else {
            return playlist.rewind(750) || current
          }
        case "seek":
          return playlist.seek(cmd.index) || current
        case "gotoEnd":
          return playlist.gotoEnd() || current
      }
    }, null),
    rxjs.takeWhile(x => x),
    rxjs.distinctUntilChanged(),
    rxjs.switchMap(x => x.playback$)
  )
  .subscribe({
    next(event) {
      switch (event.type) {
        case "start":
          if (event.sentenceStartIndicies) {
            piperState = {
              texts: event.sentenceStartIndicies.map((startIndex, i) => {
                return i+1 < event.sentenceStartIndicies.length
                  ? text.slice(startIndex, event.sentenceStartIndicies[i+1])
                  : text.slice(startIndex)
              }),
              sentenceStartIndicies: event.sentenceStartIndicies,
              index: 0
            }
          } else {
            const nextText = texts[playlist.getIndex() + 1]
            if (nextText && engine.prefetch) engine.prefetch(nextText, options)
          }
          break
        case "sentence":
          if (piperState) {
            piperState.index = piperState.sentenceStartIndicies.indexOf(event.startIndex)
          }
          break
        case "end":
          if (engine.setNextStartTime) {
            engine.setNextStartTime(Date.now() + pauseDuration, options)
          }
          cmd$.next({name: "forward"})
          break
      }
    },
    complete() {
      if (self.onEnd) self.onEnd()
    },
    error(err) {
      if (err.name != "CancellationException") {
        if (self.onEnd) self.onEnd(err)
      }
    }
  })



  function makePlaylist() {
    let index
    return {
      getIndex() {
        return index
      },
      canForward() {
        return index+1 < texts.length
      },
      canRewind() {
        return index > 0
      },
      forward(delay) {
        if (index+1 < texts.length) {
          index++
          return makePlaying(texts[index], delay)
        }
      },
      rewind(delay) {
        if (index > 0) {
          index--
          return makePlaying(texts[index], delay)
        }
      },
      seek(toIndex) {
        if (toIndex >= 0 && toIndex < texts.length) {
          index = toIndex
          return makePlaying(texts[index])
        }
      },
      gotoEnd() {
        const toIndex = texts.length - 1
        if (toIndex >= 0) {
          index = toIndex
          return makePlaying(texts[index])
        }
      }
    }
  }



  function makePlaying(text, delay) {
    return {
      since: Date.now(),
      playback$: rxjs.iif(
        () => delay,
        rxjs.timer(delay),
        rxjs.of(0)
      ).pipe(
        rxjs.exhaustMap(() => playbackState$),
        rxjs.distinctUntilChanged(),
        rxjs.scan((playing$, state) => {
          if (state == "resumed") {
            return playing$ || (
              playing$ = new rxjs.Observable(observer => {
                engine.speak(text, options, event => observer.next(event))
              })
            )
          } else if (state == "paused") {
            if (playing$) {
              if (engine.pause && !isChromeOSNative(options.voice)) {
                engine.pause()
                return playing$
              } else {
                engine.stop()
                return null
              }
            } else {
              return null
            }
          }
        }, null),
        rxjs.switchMap(playing$ => {
          if (playing$) {
            return playing$.pipe(
              rxjs.finalize(() => engine.stop())
            )
          } else {
            return rxjs.EMPTY
          }
        }),
        rxjs.map(event => {
          if (event.type == "error") throw event.error
          return event
        }),
        rxjs.takeWhile(event => event.type != "end", true)
      )
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
