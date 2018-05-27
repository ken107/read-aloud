
function SimpleSource(texts) {
  this.ready = Promise.resolve({});
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
}


function TabSource() {
  var port;
  var waiting = true;
  var ready = connect()
    .then(send.bind(null, {method: "raGetInfo"}))
    .then(extraAction(function(result) {
      if (result.requireJs) {
        var tasks = result.requireJs.map(function(file) {return executeFile.bind(null, file)});
        return inSequence(tasks);
      }
    }))
    .then(function(result) {
      waiting = false;
      return result;
    })

  this.ready = ready;
  this.isWaiting = function() {
    return waiting;
  }
  this.getCurrentIndex = function() {
    return send({method: "raGetCurrentIndex"});
  }
  this.getTexts = function(index, quietly) {
    return send({method: "raGetTexts", index: index, quietly: quietly});
  }
  this.close = function() {
    if (port) port.disconnect();
    return Promise.resolve();
  }

  function connect() {
    var name = String(Math.random());
    return new Promise(function(fulfill, reject) {
      function onConnect(result) {
        if (result.name == name) {
          brapi.runtime.onConnect.removeListener(onConnect);
          setPort(result);
          fulfill();
        }
      }
      brapi.runtime.onConnect.addListener(onConnect);
      injectScripts(name).catch(reject);
    })
  }

  function setPort(p) {
    port = p;
    port.requestIdGen = 0;
    port.requestMap = {};
    port.onMessage.addListener(onMessage);
  }

  function onMessage(message) {
    var callback = port.requestMap[message.id];
    if (callback) {
      delete port.requestMap[message.id];
      callback(message.response);
    }
  }

  function send(request) {
    return new Promise(function(fulfill) {
      var id = ++port.requestIdGen;
      port.requestMap[id] = fulfill;
      port.postMessage({id: id, request: request});
      waiting = true;
    })
    .then(function(response) {
      waiting = false;
      return response;
    })
  }

  function injectScripts(name) {
    return executeFile("js/jquery-3.1.1.min.js")
      .then(executeFile.bind(null, "js/es6-promise.auto.min.js"))
      .then(executeFile.bind(null, "js/content.js"))
      .then(executeScript.bind(null, "connect('" + name + "')"))
  }
}


function Doc(source, onEnd) {
  var info;
  var currentIndex;
  var activeSpeech;
  var ready = source.ready.then(function(result) {
    info = result;
  })

  this.close = close;
  this.play = play;
  this.stop = stop;
  this.pause = pause;
  this.getInfo = getInfo;
  this.getState = getState;
  this.getActiveSpeech = getActiveSpeech;
  this.forward = forward;
  this.rewind = rewind;

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
        if (texts) return read(texts);
        else if (onEnd) onEnd();
      })
    function read(texts) {
      return Promise.resolve()
        .then(function() {
          if (info.detectedLang == null)
            return detectLanguage(texts)
              .then(function(lang) {
                console.log("Detected", lang);
                info.detectedLang = lang || "";
              })
        })
        .then(getSpeech.bind(null, texts))
        .then(function(speech) {
          if (activeSpeech) return;
          activeSpeech = speech;
          activeSpeech.options.onEnd = function(err) {
            if (err) {
              if (onEnd) onEnd(err);
            }
            else {
              activeSpeech = null;
              currentIndex++;
              readCurrent();
            }
          };
          if (rewinded) activeSpeech.gotoEnd();
          return activeSpeech.play();
        })
    }
  }

  function detectLanguage(texts) {
    var minChars = 1000;
    var maxPages = 10;
    var output = combineTexts("", texts);
    return output.length<minChars ? accumulateMore(output, currentIndex+1).then(detectLanguageOf) : detectLanguageOf(output);

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
        .then(function(list) {return list[0] && list[0].language})
  }

  function getSpeech(texts) {
    return getSettings()
      .then(function(settings) {
        var options = {
          rate: settings.rate || defaults.rate,
          pitch: settings.pitch || defaults.pitch,
          volume: settings.volume || defaults.volume,
          lang: (!info.detectedLang || info.lang && info.lang.lastIndexOf(info.detectedLang,0) == 0) ? info.lang : info.detectedLang
        }
        return getSpeechVoice(settings.voiceName, options.lang)
          .then(function(voice) {
            if (!voice) throw new Error(JSON.stringify({code: "error_no_voice", lang: options.lang}));
            options.voice = voice;
            return new Speech(texts, options);
          })
      })
  }

  function getSpeechVoice(voiceName, lang) {
    return getVoices()
      .then(function(voices) {
        if (voiceName) return findVoiceByName(voices, voiceName);
        else if (lang) {
          return findVoiceByLang(voices.filter(function(voice) {return isGoogleNative(voice.voiceName)}), lang)
            || findVoiceByLang(voices.filter(function(voice) {return !isRemoteVoice(voice.voiceName)}), lang)
            || findVoiceByLang(voices.filter(function(voice) {return !isPremiumVoice(voice.voiceName)}), lang)
            || findVoiceByLang(voices, lang);
        }
        else return null;
      })
  }

  function findVoiceByName(voices, name) {
    for (var i=0; i<voices.length; i++) if (voices[i].voiceName == name) return voices[i];
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
    });
    return match.first || match.second || match.third || match.fourth;
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

  //method getInfo
  function getInfo() {
    return ready.then(function() {return info});
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
}
