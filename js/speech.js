
function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleNetworkVoice(options.voice) ? 0.9 : 1);

  const wordReplacements = parseWordReplacements(options.wordReplacements).rules
  if (wordReplacements.length) {
    const replaceWords = createWordReplacer(wordReplacements)
    texts = texts.map(replaceWords)
  }
  for (var i=0; i<texts.length; i++) if (/[\w)]$/.test(texts[i])) texts[i] += '.';
  if (texts.length) texts = getChunks(texts.join("\n\n"));

  const engine = pickEngine()
  const statusId = crypto.randomUUID()
  let navigationRevision = 0
  let enginePlaybackState

  this.options = options;
  this.play = () => playbackState$.next("resumed")
  this.pause = () => playbackState$.next("paused")
  this.stop = () => cmd$.error({name: "CancellationException", message: "Playback cancelled"})
  this.getState = getState;
  this.getInfo = getInfo;
  this.canForward = () => engine.forward != null || playlist.canForward()
  this.canRewind = () => engine.rewind != null || playlist.canRewind()
  this.forward = () => { navigationRevision++; cmd$.next({name: "forward", delay: 750}) }
  this.rewind = () => { navigationRevision++; cmd$.next({name: "rewind", delay: 750}) }
  this.seek = index => {
    navigationRevision++
    cmd$.next({name: "seek", index})
    playbackState$.next("resumed")
  }
  this.gotoEnd = () => { navigationRevision++; cmd$.next({name: "gotoEnd"}) }

  function pickEngine() {
    if (isPiperVoice(options.voice)) return piperTtsEngine;
    if (isSupertonicVoice(options.voice)) return supertonicTtsEngine;
    if (isNghiTtsVoice(options.voice)) return nghiTtsEngine;
    if (isAzure(options.voice)) return azureTtsEngine;
    if (isOpenai(options.voice)) return openaiTtsEngine;
    if (isUseMyPhone(options.voice)) return phoneTtsEngine;
    if (isGoogleTranslate(options.voice) && !/\s(Hebrew|Telugu)$/.test(options.voice.voiceName)) {
      return googleTranslateTtsEngine
    }
    if (isAmazonPolly(options.voice)) return amazonPollyTtsEngine;
    if (isGoogleWavenet(options.voice)) return googleWavenetTtsEngine;
    if (isIbmWatson(options.voice)) return ibmWatsonTtsEngine;
    if (isPremiumVoice(options.voice) || isReadAloudCloud(options.voice)) {
      premiumTtsEngine.prepare(options)
      return premiumTtsEngine;
    }
    // Catch silent playback stalls when the word-based duration estimate misses
    // Chrome's built-in Google TTS extension's 15-second playback limit.
    if (isGoogleNetworkVoice(options.voice)) return new TimeoutTtsEngine(browserTtsEngine, 3*1000, 16*1000);
    return browserTtsEngine;
  }

  function getChunks(text) {
    var isEA = /^(zh|ko|ja)(?:-|$)/i.test(options.lang);
    var punctuator = createPunctuator(options.lang);
    if (isOfflineVoice(options.voice) && !isUseMyPhone(options.voice)) {
      return punctuator.getParagraphs(text).flatMap(paragraph => punctuator.getSentences(paragraph));
    }
    if (isGoogleNetworkVoice(options.voice)) {
      // Historically Chrome's built-in Google TTS extension can go silent after ~15 seconds
      // without an error or event, through either chrome.tts or Web Speech.
      // These language/rate-adjusted word budgets approximate that duration;
      // the 16-second engine timeout catches segments that still run too long.
      var wordLimit = (/^(de|ru|es|pt|id)/.test(options.lang) ? 32 : 36) * (isEA ? 2 : 1) * options.rate;
      return new WordBreaker(wordLimit, punctuator).breakText(text);
    }
    else {
      // Translate's jQ1olc RPC returns no audio above 200 characters in our
      // ASCII boundary probe (2026-10-10); see docs/tts-limit-verification.md.
      if (isGoogleTranslate(options.voice)) return new CharBreaker(200, punctuator).breakText(text);
      else if (isPiperVoice(options.voice) || isSupertonicVoice(options.voice) || isNghiTtsVoice(options.voice)) return [text];
      // Prefer 750-character synthesis chunks; combine small paragraphs up to
      // 200 characters to reduce request overhead while retaining boundaries.
      else return new CharBreaker(750, punctuator, 200).breakText(text);
    }
  }

  async function getState() {
    if (playbackState$.value == "resumed") {
      return await rxjs.firstValueFrom(isLoading$) ? "LOADING" : "PLAYING"
    } else {
      return "PAUSED"
    }
  }

  function getInfo() {
    return {
      texts: enginePlaybackState ? enginePlaybackState.texts : texts,
      position: {
        index: enginePlaybackState ? enginePlaybackState.index : playlist.getIndex()
      },
      statusId,
      navigationRevision,
      voiceName: options.voice.voiceName,
      voiceLocation: isOfflineVoice(options.voice) ? "offline" : "cloud",
      detectedLang: options.lang,
      voiceLanguages: getVoiceLanguages(options.voice),
      isRTL: /^(ar|az|dv|he|iw|ku|fa|ur)\b/.test(options.lang),
      engine: immediate(() => {
        switch (engine) {
          case piperTtsEngine: return 'Piper'
          case supertonicTtsEngine: return 'Supertonic'
          case nghiTtsEngine: return 'NghiTTS'
        }
      })
    }
  }



  const playbackState$ = new rxjs.BehaviorSubject("paused")
  const playlist = makePlaylist()
  const cmd$ = new rxjs.Subject()
  const isLoadingSubject = new rxjs.BehaviorSubject(false)
  const isLoading$ = isLoadingSubject.pipe(
    rxjs.distinctUntilChanged(),
    rxjs.scan((previous$, isLoading) =>
      rxjs.iif(() => previous$ && isLoading, rxjs.timer(2000), rxjs.of(0)).pipe(
        rxjs.map(() => isLoading)
      ),
      null
    ),
    rxjs.switchAll(),
    rxjs.shareReplay({bufferSize: 1, refCount: false})
  )

  cmd$.pipe(
    rxjs.startWith({name: "first"}),
    rxjs.scan((current, cmd) => {
      switch (cmd.name) {
        case "first": {
          const playback$ = playlist.first()
          return playback$ ? {playback$, ts: Date.now()} : null
        }
        case "forward": {
          if (engine.forward != null) {
            engine.forward()
            return current
          } else {
            const playback$ = playlist.forward()
            return playback$ ? {playback$, ts: Date.now(), delay: cmd.delay} : null
          }
        }
        case "rewind": {
          if (engine.rewind != null) {
            engine.rewind()
            return current
          } else if (Date.now()-current.ts > 3000) {
            const playback$ = playlist.seek(playlist.getIndex())
            return playback$ ? {playback$, ts: Date.now()} : current
          } else {
            const playback$ = playlist.rewind()
            return playback$ ? {playback$, ts: Date.now(), delay: cmd.delay} : current
          }
        }
        case "seek": {
          if (engine.seek != null) {
            engine.seek(cmd.index)
            return current
          } else {
            const playback$ = playlist.seek(cmd.index)
            return playback$ ? {playback$, ts: Date.now()} : current
          }
        }
        case "gotoEnd": {
          const playback$ = playlist.gotoEnd()
          return playback$ ? {playback$, ts: Date.now()} : current
        }
      }
    }, null),
    rxjs.takeWhile(x => x),
    rxjs.distinctUntilChanged(),
    rxjs.debounce(x => x.delay ? rxjs.timer(x.delay) : rxjs.of(0)),
    rxjs.switchMap(x =>
      rxjs.concat(
        rxjs.of({type: "load"}),
        x.playback$
      )
    )
  )
  .subscribe({
    next(event) {
      isLoadingSubject.next(event.type == "load")
      switch (event.type) {
        case "start":
          if (event.sentenceStartIndicies) {
            enginePlaybackState = {
              texts: event.sentenceStartIndicies.map((startIndex, i, arr) => texts[0].slice(startIndex, arr[i+1])),
              sentenceStartIndicies: event.sentenceStartIndicies,
              index: 0
            }
          } else if (engine.prefetch != null) {
            const nextIndex = playlist.getIndex() + 1
            const nextText = texts[nextIndex]
            if (nextText) {
              engine.prefetch(nextText, options)
              // A short next chunk may finish before its successor can load.
              // Use a 100-character threshold.
              if (nextText.length < 100) {
                const followingText = texts[nextIndex + 1]
                if (followingText) engine.prefetch(followingText, options)
              }
            }
          }
          break
        case "sentence":
          if (enginePlaybackState) {
            enginePlaybackState.index = enginePlaybackState.sentenceStartIndicies.indexOf(event.startIndex)
          }
          break
        case "end":
          if (enginePlaybackState) {
            cmd$.complete()
          } else {
            cmd$.next({name: "forward"})
          }
          break
      }
    },
    complete: () => {
      if (this.onEnd) this.onEnd()
    },
    error: err => {
      if (err.name != "CancellationException") {
        if (this.onEnd) this.onEnd(err)
      }
    }
  })



  function makePlaylist() {
    let index
    return {
      getIndex() {
        return index
      },
      first() {
        if (0 < texts.length) {
          index = 0
          return makePlayback(texts[index])
        }
      },
      canForward() {
        return index+1 < texts.length
      },
      canRewind() {
        return index > 0
      },
      forward() {
        if (index+1 < texts.length) {
          index++
          return makePlayback(texts[index])
        }
      },
      rewind() {
        if (index > 0) {
          index--
          return makePlayback(texts[index])
        }
      },
      seek(toIndex) {
        if (toIndex >= 0 && toIndex < texts.length) {
          index = toIndex
          return makePlayback(texts[index])
        }
      },
      gotoEnd() {
        const toIndex = texts.length - 1
        if (toIndex >= 0) {
          index = toIndex
          return makePlayback(texts[index])
        }
      }
    }
  }



  function makePlayback(text) {
    if (engine.stop != null) return makePlaybackLegacy(text)
    else return engine.speak(text, options, playbackState$)
  }

  function makePlaybackLegacy(text) {
    return playbackState$.pipe(
      rxjs.distinctUntilChanged(),
      rxjs.scan((playing$, state) => {
        if (state == "resumed") {
          if (playing$) {
            engine.resume()
            return playing$
          } else {
            return new rxjs.Observable(observer => {
              engine.speak(text, options, event => {
                if (event.type == "error") observer.error(event.error)
                else observer.next(event)
              })
            })
          }
        } else if (state == "paused") {
          if (playing$) {
            if (isGoogleNetworkVoice(options.voice) || isChromeOSNative(options.voice)) {
              engine.stop()
              return null
            } else {
              engine.pause()
              return playing$
            }
          } else {
            return null
          }
        }
      }, null),
      rxjs.distinctUntilChanged(),
      rxjs.switchMap(playing$ => {
        if (playing$) {
          return playing$.pipe(
            rxjs.finalize(() => engine.stop())
          )
        } else {
          return rxjs.EMPTY
        }
      }),
      rxjs.takeWhile(event => event.type != "end", true)
    )
  }



}

/**
 * Keep Google native voice segments below the historically reported ~15-second
 * cutoff by using a caller-supplied word budget as a duration estimate.
 *
 * Split at sentence boundaries, then pack phrases up to wordLimit.
 * Paragraphs and sentences are never combined. Oversized phrases are emitted
 * separately in balanced word groups; their leftovers are not packed with the
 * next phrase. Word tokens retain the separators supplied by the punctuator.
 */
function WordBreaker(wordLimit, punctuator) {
  this.breakText = function(text) {
    const chunks = createChunkCollector();
    for (const paragraph of punctuator.getParagraphs(text)) {
      for (const sentence of punctuator.getSentences(paragraph)) {
        for (const phrase of punctuator.getPhrases(sentence)) {
          let words = punctuator.getWords(phrase);
          if (words.length <= wordLimit) {
            chunks.append(phrase, words.length, wordLimit);
            continue;
          }

          chunks.flush();
          // Prefer halves over a nearly full chunk followed by a tiny tail.
          // E.g. 40 words with a limit of 36 become 20 + 20, not 36 + 4.
          const wordsPerChunk = Math.min(Math.ceil(words.length / 2), wordLimit);
          while (words.length) {
            chunks.emit(words.slice(0, wordsPerChunk).join(""));
            words = words.slice(wordsPerChunk);
          }
        }
        chunks.flush();
      }
    }
    return chunks.result;
  };
}

/**
 * Create general synthesis chunks, balancing natural boundaries with request
 * size and network efficiency. The caller selects a preferred or server limit.
 *
 * Pack text at the coarsest boundary that fits: paragraphs, sentences, phrases,
 * then words. Only an oversized word is sliced directly.
 *
 * charLimit is measured in JavaScript UTF-16 code units (String.length), not
 * Unicode code points. paragraphCombineThreshold controls only whether adjacent
 * paragraphs are combined; a single paragraph may exceed it up to charLimit.
 * A missing or zero threshold uses charLimit, preserving the existing policy.
 *
 * Before splitting an oversized part, flush its preceding neighbors. Flush again
 * after its children so the final child never combines with the next neighbor.
 * Limits must be positive; word slicing requires charLimit >= 1.
 */
function CharBreaker(charLimit, punctuator, paragraphCombineThreshold) {
  this.breakText = function(text) {
    const chunks = createChunkCollector();
    const paragraphPackingLimit = paragraphCombineThreshold || charLimit;
    for (const paragraph of punctuator.getParagraphs(text)) {
      if (paragraph.length <= charLimit) {
        chunks.append(paragraph, paragraph.length, paragraphPackingLimit);
        continue;
      }

      chunks.flush();
      for (const sentence of punctuator.getSentences(paragraph)) {
        if (sentence.length <= charLimit) {
          chunks.append(sentence, sentence.length, charLimit);
          continue;
        }

        chunks.flush();
        for (const phrase of punctuator.getPhrases(sentence)) {
          if (phrase.length <= charLimit) {
            chunks.append(phrase, phrase.length, charLimit);
            continue;
          }

          chunks.flush();
          for (const word of punctuator.getWords(phrase)) {
            if (word.length <= charLimit) {
              chunks.append(word, word.length, charLimit);
              continue;
            }

            chunks.flush();
            for (const part of splitOversizedWord(word, charLimit)) chunks.emit(part);
          }
          chunks.flush();
        }
        chunks.flush();
      }
      chunks.flush();
    }
    chunks.flush();
    return chunks.result;
  };
}

/** Collect adjacent pieces without deciding how or when to split text. */
function createChunkCollector() {
  const result = [];
  let pendingParts = [];
  let pendingSize = 0;
  function flush() {
    if (pendingParts.length) {
      result.push(pendingParts.join(""));
      pendingParts = [];
      pendingSize = 0;
    }
  }
  return {
    result,
    flush,
    // Emit an already split chunk without packing it with neighboring pieces.
    emit(text) { result.push(text); },
    append(text, size, packingLimit) {
      if (pendingSize + size > packingLimit) flush();
      pendingParts.push(text);
      pendingSize += size;
    }
  };
}

/** Choose boundary rules independently of engine-specific duration budgets. */
function createPunctuator(lang) {
  const language = (lang || "").toLowerCase().split("-")[0];
  if (["zh", "ja", "ko"].includes(language)) return new EastAsianPunctuator();
  if (["th", "lo", "km", "my"].includes(language)) return new DictionaryPunctuator(language);
  return new SpaceDelimitedPunctuator(language);
}

/**
 * Prefer whole graphemes when slicing an oversized word. The request limit is
 * still UTF-16 units. A pathological grapheme larger than the limit must fall
 * back to code points; an individual code point must fit or the limit is invalid.
 */
function* splitOversizedWord(word, limit) {
  const segments = typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(word)
    : Array.from(word, segment => ({segment}));
  let pending = "";
  for (const {segment} of segments) {
    const pieces = segment.length > limit ? Array.from(segment) : [segment];
    for (const piece of pieces) {
      if (piece.length > limit) throw new RangeError("Character limit cannot fit a Unicode code point");
      if (pending.length + piece.length > limit) {
        yield pending;
        pending = "";
      }
      pending += piece;
    }
  }
  if (pending) yield pending;
}

/**
 * Periods after titles/references usually introduce more text. Ambiguous endings
 * (etc., company suffixes, degrees, times, acronyms) are joined only before a
 * lowercase letter or number. This is a speech-boundary heuristic, not grammar.
 * Keep language-specific entries scoped: e.g. German "Art." is English "art".
 */
function createAbbreviationMatcher(language) {
  const prefixes = {
    en: "adm assn ave blvd bldg brig capt cmdr col comdr cpl ct dept dr drs fig figs fr ft gen gov hon lieut ln lt maj messrs mmes mr mrs ms mt mx no nos pl pres prof rd rep reps rev sen sens sgt st ste univ jan feb mar apr jun jul aug sep sept oct nov dec ch chap chs eq eqs sec secs vol vols pp ref refs vs cf approx est esp e.g i.e",
    de: "dr prof dipl ing hr fr frl nr abb abs art kap bd bsp bzgl bzw ca d.h z.b vgl s sog str gebr",
    fr: "m mm mme mmes mlle mlles dr dre pr prof me mgr no nos réf fig chap vol éd janv févr avr juil sept oct nov déc p.ex",
    es: "sr sra sres sras srta dr dra prof profr ud uds núm núms pág págs cap caps fig figs ej p.ej aprox avda",
    pt: "sr sra srs sras srta dr dra prof profa pág págs cap caps fig figs núm aprox av ex",
    ru: "г гг ул д кв стр рис табл им т.е т.к т.н см напр проф доц акад пер просп",
  };
  const ambiguous = {
    en: "etc inc corp co ltd jr sr ed eds misc al a.m p.m a.d b.c b.c.e c.e ph.d m.d b.a m.a b.sc m.sc d.d.s esq",
    de: "usw etc u.a",
    fr: "etc env",
    es: "etc a.m p.m",
    pt: "etc",
    ru: "др пр т.д т.п",
  };
  const lang = (language || "en").toLowerCase().split("-")[0];
  const prefixWords = new Set((prefixes[lang] || "").split(" "));
  const ambiguousWords = new Set((ambiguous[lang] || "").split(" "));
  return function(previous, next) {
    // A Unicode boundary prevents matching an abbreviation inside a longer word.
    // Dotted forms are matched whole, not as a trailing single-letter initial.
    const match = previous.match(/(?:^|[^\p{L}\p{M}\p{N}_.])([\p{L}\p{M}]+(?:\.[\p{L}\p{M}]+)*)\.[\s\u200b]+$/u);
    if (!match) return false;
    const spaced = previous.match(/(?:^|[^\p{L}\p{M}\p{N}_.])([\p{L}\p{M}]+\.[\s\u200b]+[\p{L}\p{M}]+)\.[\s\u200b]+$/u);
    if (spaced && prefixWords.has(spaced[1].replace(/[\s\u200b]/g, "").toLowerCase())) return true;
    const abbreviation = match[1];
    const normalized = abbreviation.replace(/[\s\u200b]/g, "").toLowerCase();
    // Join the first boundary of spaced forms such as "e. g." and "z. B.".
    const nextComponent = next.match(/^([\p{L}\p{M}]+)\./u);
    if (nextComponent && prefixWords.has(normalized + "." + nextComponent[1].toLowerCase())) return true;
    if (prefixWords.has(normalized)) return true;
    const following = next.replace(/^[\s\u200b"'“‘«(\[（]+/u, "");
    const continues = /^[\p{Ll}\p{N}]/u.test(following);
    if (ambiguousWords.has(normalized) || /^(?:\p{Lu}\.)+\p{Lu}$/u.test(abbreviation)) return continues;
    // Personal initials, including Cyrillic and accented Latin letters.
    return /^\p{Lu}$/u.test(abbreviation) && /^\p{L}/u.test(following);
  };
}

/** Space-separated text across scripts; punctuation stays with preceding text. */
function SpaceDelimitedPunctuator(language = "en") {
  const continuesAfterAbbreviation = createAbbreviationMatcher(language);
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    // Also Arabic/Urdu endings, Hebrew sof pasuq, Indic danda, Myanmar and Khmer.
    // Those marks do not require a following space to establish a boundary.
    return recombine(text.split(/([.!?]+["'”’»）)\]}」』】]*[\s\u200b]+|[؟۔׃।॥။៕។]+["'”’»）)\]}」』】]*[\s\u200b]*)/), continuesAfterAbbreviation);
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|[،؛၊]\s*|\s-+\s+|—\s*)/));
  }
  this.getWords = function(sentence) {
    var tokens = sentence.split(/([~@#%^*_+=<>]|[\s\-—/]+|\.(?=\w{2,})|,(?=[0-9]))/);
    var result = [];
    var leadingSeparators = "";
    for (var i=0; i<tokens.length; i+=2) {
      if (tokens[i]) {
        result.push(leadingSeparators + tokens[i]);
        leadingSeparators = "";
      }
      if (i+1 < tokens.length) {
        if (/^[~@#%^*_+=<>]$/.test(tokens[i+1])) {
          result.push(leadingSeparators + tokens[i+1]);
          leadingSeparators = "";
        }
        else if (result.length) result[result.length-1] += tokens[i+1];
        else leadingSeparators += tokens[i+1];
      }
    }
    if (leadingSeparators) result.push(leadingSeparators);
    return result;
  }
  function recombine(tokens, nonPunc) {
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      var part = (i+1 < tokens.length) ? (tokens[i] + tokens[i+1]) : tokens[i];
      if (part) {
        if (nonPunc && result.length && nonPunc(result[result.length-1], part)) result[result.length-1] += part;
        else result.push(part);
      }
    }
    return result;
  }
}

/** Dictionary-backed boundaries for languages that do not separate words by spaces. */
function DictionaryPunctuator(language) {
  SpaceDelimitedPunctuator.call(this, language);
  // Older engines retain space-based splitting plus safe oversized-word slicing.
  if (typeof Intl.Segmenter !== "function") return;
  const segmenter = new Intl.Segmenter(language, {granularity: "word"});
  this.getWords = function(text) {
    const result = [];
    let leading = "";
    for (const {segment, isWordLike} of segmenter.segment(text)) {
      if (isWordLike) {
        result.push(leading + segment);
        leading = "";
      } else if (result.length) result[result.length - 1] += segment;
      else leading += segment;
    }
    if (leading) result.push(leading);
    return result;
  };
}

function EastAsianPunctuator() {
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    return recombine(text.split(/([.!?]+["'”’»）)\]}」』】]*[\s\u200b]+|[。！？]+["'”’»）)\]}」』】]*[\s\u200b]*)/));
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|[\u2025\u2026\u3000\u3001\uff0c\uff1b]+)/));
  }
  this.getWords = function(sentence) {
    // Keep character-based counting, but never split a Unicode code point.
    // Attach whitespace to a neighboring token instead of deleting it.
    const result = [];
    let leadingWhitespace = "";
    for (const character of sentence) {
      if (/\s/u.test(character)) {
        if (result.length) result[result.length - 1] += character;
        else leadingWhitespace += character;
      } else {
        result.push(leadingWhitespace + character);
        leadingWhitespace = "";
      }
    }
    if (leadingWhitespace) result.push(leadingWhitespace);
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

function createWordReplacer(rules) {
  const regexRules = rules.filter(rule => rule.pattern)
  const replaceLiteralWords = createLiteralWordReplacer(rules.filter(rule => !rule.pattern))
  return text => {
    text = replaceLiteralWords(text)
    for (const rule of regexRules) text = text.replace(rule.pattern, rule.to)
    return text
  }
}

function createLiteralWordReplacer(rules) {
  if (!rules.length) return text => text
  const lookup = Object.create(null)
  rules.forEach(rule => lookup[rule.from.toLowerCase()] = rule.to)

  const sources = rules
    .map(rule => rule.from)
    .sort((a, b) => b.length - a.length)
    .map(from => from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  const pattern = new RegExp(
    "(^|[^\\p{L}\\p{N}_])(" + sources.join("|") + ")(?=$|[^\\p{L}\\p{N}_])",
    "giu"
  )
  return text => text.replace(pattern, (match, prefix, source) => {
    const key = source.toLowerCase()
    return prefix + (key in lookup ? lookup[key] : source)
  })
}
