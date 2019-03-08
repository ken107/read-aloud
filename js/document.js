
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
  this.getUri = function() {
    var textLen = texts.reduce(function(sum, text) {return sum+text.length}, 0);
    return "text-selection:(" + textLen + ")" + encodeURIComponent((texts[0] || "").substr(0, 100));
  }
}


function TabSource() {
  var handlers = [
    {
      match: function(url) {
        return config.unsupportedSites.some(function(site) {
          return (typeof site == "string" && url.startsWith(site)) || (site instanceof RegExp && site.test(url));
        })
      },
      validate: function() {
        throw new Error(JSON.stringify({code: "error_page_unreadable"}));
      }
    },
    {
      match: function(url) {
        return /^file:.*\.pdf$/i.test(url.split("?")[0]);
      },
      validate: function() {
        throw new Error(JSON.stringify({code: "error_upload_pdf"}));
      }
    },
    {
      match: function(url) {
        return /^file:/.test(url);
      },
      validate: function() {
        return new Promise(function(fulfill) {
          brapi.extension.isAllowedFileSchemeAccess(fulfill);
        })
        .then(function(allowed) {
          if (!allowed) throw new Error(JSON.stringify({code: "error_file_access"}));
        })
      }
    },
    {
      match: function(url) {
        return /^https:\/\/play.google.com\/books\/reader/.test(url)
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://books.googleusercontent.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
          })
      },
      getFrameId: function(frames) {
        var frame = frames.find(function(frame) {
          return frame.url.startsWith("https://books.googleusercontent.com/");
        })
        return frame && frame.frameId;
      },
      extraScripts: ["js/content/google-play-book.js"]
    },
  ]


  var tabPromise = getActiveTab();
  var tab, frameId, extraScripts, peer;
  var waiting = true;

  this.ready = tabPromise
    .then(function(res) {
      if (!res) throw new Error(JSON.stringify({code: "error_page_unreadable"}));
      tab = res;
    })
    .then(function() {
      var handler = tab.url && handlers.find(function(handler) {return handler.match(tab.url)});
      return handler && handler.validate()
        .then(function() {
          extraScripts = handler.extraScripts;
          if (handler.getFrameId)
            return getAllFrames(tab.id).then(handler.getFrameId).then(function(res) {frameId = res});
        })
    })
    .then(waitForConnect)
    .then(function(port) {
      return new Promise(function(fulfill) {
        peer = new RpcPeer(new ExtensionMessagingPeer(port));
        peer.onInvoke = function(method, arg0) {
          if (method == "onReady") fulfill(arg0);
          else console.error("Unknown method", method);
        }
        peer.onDisconnect = function() {
          peer = null;
        }
      })
    })
    .then(extraAction(function(info) {
      if (info.requireJs) {
        var tasks = info.requireJs.map(function(file) {return inject.bind(null, file)});
        return inSequence(tasks);
      }
    }))
    .finally(function() {
      waiting = false;
    })

  this.isWaiting = function() {
    return waiting;
  }
  this.getCurrentIndex = function() {
    if (!peer) return Promise.resolve(0);
    waiting = true;
    return peer.invoke("getCurrentIndex").finally(function() {waiting = false});
  }
  this.getTexts = function(index, quietly) {
    if (!peer) return Promise.resolve(null);
    waiting = true;
    return peer.invoke("getTexts", index, quietly)
      .then(function(res) {return res && res.inject ? getFrameTexts(res.inject) : res})
      .finally(function() {waiting = false})
  }
  this.close = function() {
    if (peer) peer.disconnect();
    return Promise.resolve();
  }
  this.getUri = function() {
    return tabPromise.then(function(tab) {return tab && tab.url});
  }

  function waitForConnect() {
    return new Promise(function(fulfill, reject) {
      function onConnect(port) {
        if (port.name == "ReadAloudContentScript") {
          brapi.runtime.onConnect.removeListener(onConnect);
          clearTimeout(timer);
          fulfill(port);
        }
      }
      function onError(err) {
        brapi.runtime.onConnect.removeListener(onConnect);
        clearTimeout(timer);
        reject(err);
      }
      function onTimeout() {
        brapi.runtime.onConnect.removeListener(onConnect);
        reject(new Error("Timeout waiting for content script to connect"));
      }
      brapi.runtime.onConnect.addListener(onConnect);
      injectScripts().catch(onError);
      var timer = setTimeout(onTimeout, 15000);
    })
  }
  function injectScripts() {
    return inject("js/jquery-3.1.1.min.js")
      .then(inject.bind(null, "js/es6-promise.auto.min.js"))
      .then(inject.bind(null, "js/messaging.js"))
      .then(function() {
        if (extraScripts) {
          var tasks = extraScripts.map(function(file) {return inject.bind(null, file)});
          return inSequence(tasks);
        }
      })
      .then(inject.bind(null, "js/content.js"))
  }
  function inject(file) {
    return executeScript({file: file, tabId: tab.id, frameId: frameId});
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
  var hasText;

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
          if (texts.length) hasText = true;
          return read(texts);
        }
        else if (onEnd) {
          if (hasText) onEnd();
          else onEnd(new Error(JSON.stringify({code: "error_no_text"})));
        }
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
          activeSpeech.onEnd = function(err) {
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
    if (text.length < 50) {
      //don't detect language if too little text
      return Promise.resolve(null);
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
        .then(function(list) {return list[0] && list[0].language})
  }

  function getSpeech(texts) {
    return getSettings()
      .then(function(settings) {
        var lang = (!info.detectedLang || info.lang && info.lang.startsWith(info.detectedLang)) ? info.lang : info.detectedLang;
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
