
function SimpleSource(texts, opts) {
  opts = opts || {}
  this.ready = Promise.resolve({
    lang: opts.lang,
  })
  this.isWaiting = function() {
    return false;
  }
  this.getCurrentIndex = function() {
    return Promise.resolve(0);
  }
  this.getTexts = function(index) {
    return Promise.resolve(index == 0 ? texts : null);
  }
  this.close = function() {
    return Promise.resolve();
  }
  this.getUri = function() {
    var textLen = texts.reduce(function(sum, text) {return sum+text.length}, 0);
    return "text-selection:(" + textLen + ")" + encodeURIComponent((texts[0] || "").substr(0, 100));
  }
}


function TabSource(destId) {
  var waiting = true;

  this.ready = messagingClient.sendTo(destId, {method: "getInfo"})
    .finally(function() {
      waiting = false;
    })

  this.isWaiting = function() {
    return waiting;
  }
  this.getCurrentIndex = function() {
    waiting = true;
    return messagingClient.sendTo(destId, {method: "getCurrentIndex"})
      .finally(function() {waiting = false})
  }
  this.getTexts = function(index, quietly) {
    waiting = true;
    return messagingClient.sendTo(destId, {method: "getTexts", args: [index, quietly]})
      .finally(function() {waiting = false})
  }
  this.close = function() {
    return Promise.resolve();
  }
  this.getUri = function() {
    return this.ready
      .then(function(info) {return info.url})
  }
}


function Doc(source, onEnd) {
  var info;
  var currentIndex;
  var activeSpeech;
  var ready = Promise.resolve(source.getUri())
    .then(function(uri) {return setState("lastUrl", uri)})
    .then(function() {return source.ready})
    .then(function(result) {info = result})
  var foundText;

  this.close = close;
  this.play = play;
  this.stop = stop;
  this.pause = pause;
  this.getState = getState;
  this.getActiveSpeech = getActiveSpeech;
  this.forward = forward;
  this.rewind = rewind;
  this.seek = seek;

  //method close
  function close() {
    return ready
      .catch(function() {})
      .then(function() {
        if (activeSpeech) activeSpeech.stop().then(function() {activeSpeech = null});
        source.close();
      })
  }

  //method play
  function play() {
    return ready
      .then(function() {
        if (activeSpeech) return activeSpeech.play();
        else {
          return source.getCurrentIndex()
            .then(function(index) {currentIndex = index})
            .then(function() {return readCurrent()})
        }
      })
  }

  function readCurrent(rewinded) {
    return source.getTexts(currentIndex)
      .catch(function() {
        return null;
      })
      .then(function(texts) {
        if (texts) {
          if (texts.length) {
            foundText = true;
            return read(texts);
          }
          else {
            currentIndex++;
            return readCurrent();
          }
        }
        else {
          if (!foundText) throw new Error(JSON.stringify({code: "error_no_text"}))
          if (onEnd) onEnd()
        }
      })
    function read(texts) {
      texts = texts.map(preprocess)
      return Promise.resolve()
        .then(function() {
          if (info.detectedLang == null)
            return detectLanguage(texts)
              .then(function(lang) {
                info.detectedLang = lang || "";
              })
        })
        .then(getSpeech.bind(null, texts))
        .then(function(speech) {
          if (activeSpeech) return;
          activeSpeech = speech;
          activeSpeech.onEnd = function(err) {
            if (err) {
              if (onEnd) onEnd(err);
            }
            else {
              activeSpeech = null;
              currentIndex++;
              readCurrent()
                .catch(function(err) {
                  if (onEnd) onEnd(err)
                })
            }
          };
          if (rewinded) activeSpeech.gotoEnd();
          return activeSpeech.play();
        })
    }
    function preprocess(text) {
      text = truncateRepeatedChars(text, 3)
      return text.replace(/https?:\/\/\S+/g, "HTTP URL.")
    }
  }

  function detectLanguage(texts) {
    var minChars = 240;
    var maxPages = 10;
    var output = combineTexts("", texts);
    if (output.length < minChars) {
      return accumulateMore(output, currentIndex+1)
        .then(detectLanguageOf)
        .then(extraAction(function() {
          //for sources that couldn't flip page silently, flip back to the current page
          return source.getTexts(currentIndex, true);
        }))
    }
    else {
      return detectLanguageOf(output);
    }

    function combineTexts(output, texts) {
      for (var i=0; i<texts.length && output.length<minChars; i++) output += (texts[i] + " ");
      return output;
    }
    function accumulateMore(output, index) {
      return source.getTexts(index, true)
        .then(function(texts) {
          if (!texts) return output;
          output = combineTexts(output, texts);
          return output.length<minChars && index-currentIndex<maxPages ? accumulateMore(output, index+1) : output;
        })
    }
  }

  function detectLanguageOf(text) {
    if (text.length < 100) {
      //too little text, use cloud detection for improved accuracy
      return serverDetectLanguage(text)
        .then(function(result) {
          return result || browserDetectLanguage(text)
        })
        .then(function(lang) {
          //exclude commonly misdetected languages
          return ["cy", "eo"].includes(lang) ? null : lang
        })
    }
    return browserDetectLanguage(text)
      .then(function(result) {
        return result || serverDetectLanguage(text);
      })
  }

  function browserDetectLanguage(text) {
    if (!brapi.i18n.detectLanguage) return Promise.resolve(null);
    return new Promise(function(fulfill) {
      brapi.i18n.detectLanguage(text, fulfill);
    })
    .then(function(result) {
      if (result) {
          var list = result.languages.filter(function(item) {return item.language != "und"});
          list.sort(function(a,b) {return b.percentage-a.percentage});
          return list[0] && list[0].language;
      }
      else {
        return null;
      }
    })
  }

  function serverDetectLanguage(text) {
      return ajaxPost(config.serviceUrl + "/read-aloud/detect-language", {text: text}, "json")
        .then(JSON.parse)
        .then(function(res) {
          var result = Array.isArray(res) ? res[0] : res
          if (result && result.language && result.language != "und") return result.language
          else return null
        })
        .catch(function(err) {
          console.error(err)
          return null
        })
  }

  function getSpeech(texts) {
    return getSettings()
      .then(function(settings) {
        console.log("Declared", info.lang)
        console.log("Detected", info.detectedLang)
        var lang = (!info.detectedLang || info.lang && info.lang.startsWith(info.detectedLang)) ? info.lang : info.detectedLang;
        console.log("Chosen", lang)
        var options = {
          rate: settings.rate || defaults.rate,
          pitch: settings.pitch || defaults.pitch,
          volume: settings.volume || defaults.volume,
          lang: config.langMap[lang] || lang || 'en-US',
        }
        return getSpeechVoice(settings.voiceName, options.lang)
          .then(function(voice) {
            if (!voice) throw new Error(JSON.stringify({code: "error_no_voice", lang: options.lang}));
            options.voice = voice;
            return new Speech(texts, options);
          })
      })
  }

  //method stop
  function stop() {
    return ready
      .then(function() {
        if (activeSpeech) return activeSpeech.stop().then(function() {activeSpeech = null});
      })
  }

  //method pause
  function pause() {
    return ready
      .then(function() {
        if (activeSpeech) return activeSpeech.pause();
      })
  }

  //method getState
  function getState() {
    if (activeSpeech) return activeSpeech.getState();
    else return Promise.resolve(source.isWaiting() ? "LOADING" : "STOPPED");
  }

  //method getActiveSpeech
  function getActiveSpeech() {
    return Promise.resolve(activeSpeech);
  }

  //method forward
  function forward() {
    if (activeSpeech) return activeSpeech.forward().catch(forwardPage);
    else return Promise.reject(new Error("Can't forward, not active"));
  }

  function forwardPage() {
    return stop().then(function() {currentIndex++; readCurrent()});
  }

  //method rewind
  function rewind() {
    if (activeSpeech) return activeSpeech.rewind().catch(rewindPage);
    else return Promise.reject(new Error("Can't rewind, not active"));
  }

  function rewindPage() {
    return stop().then(function() {currentIndex--; readCurrent(true)});
  }

  function seek(n) {
    if (activeSpeech) return activeSpeech.seek(n);
    else return Promise.reject(new Error("Can't seek, not active"));
  }
}
