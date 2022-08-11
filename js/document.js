
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


function TabSource(tabId) {
  var handlers = [
    // Unsupported Sites --------------------------------------------------------
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

    // PDF file:// --------------------------------------------------------------
    {
      match: function(url) {
        return /^file:.*\.pdf$/i.test(url.split("?")[0]);
      },
      validate: function() {
        throw new Error(JSON.stringify({code: "error_upload_pdf", tabId: tab.id}));
      }
    },

    // file:// ------------------------------------------------------------------
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

    // Google Play Books ---------------------------------------------------------
    {
      match: function(url) {
        return /^https:\/\/play.google.com\/books\/reader/.test(url) || /^https:\/\/books.google.com\/ebooks\/app#reader/.test(url);
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

    // OneDrive Doc -----------------------------------------------------------
    {
      match: function(url) {
        return url.startsWith("https://onedrive.live.com/edit.aspx") && url.includes("docx");
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://word-edit.officeapps.live.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
          })
      },
      getFrameId: function(frames) {
        var frame = frames.find(function(frame) {
          return frame.url.startsWith("https://word-edit.officeapps.live.com/");
        })
        return frame && frame.frameId;
      },
      extraScripts: ["js/content/onedrive-doc.js"]
    },

    // Chegg NEW --------------------------------------------------------------
    {
      match: function(url) {
        return /^https:\/\/www\.chegg\.com\/reader\//.test(url);
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://ereader-web-viewer.chegg.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
          })
      },
      getFrameId: function(frames) {
        var frame = frames.find(function(frame) {
          return frame.url.startsWith("https://ereader-web-viewer.chegg.com/");
        })
        return frame && frame.frameId;
      },
      extraScripts: ["js/content/chegg-book.js"]
    },

    // VitalSource/Chegg ---------------------------------------------------------
    {
      match: function(url) {
        return /^https:\/\/\w+\.vitalsource\.com\/(#|reader)\/books\//.test(url) ||
          /^https:\/\/\w+\.chegg\.com\/(#|reader)\/books\//.test(url)
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://jigsaw.vitalsource.com/", "https://jigsaw.chegg.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
          })
      },
      getTexts: function(tab) {
        function tryGetFrame(millis) {
          return getAllFrames(tab.id)
            .then(function(frames) {
              return frames.find(function(frame) {return frame.frameId && frame.parentFrameId});
            })
            .then(function(frame) {
              if (!frame && millis > 0) return waitMillis(500).then(tryGetFrame.bind(null, millis-500));
              else return frame;
            })
        }
        return tryGetFrame(5000)
          .then(function(frame) {
            if (frame) return getFrameTexts(tab.id, frame.frameId, ["js/jquery-3.1.1.min.js", "js/messaging.js", "js/content/vitalsource-book.js"]);
            else return null;
          })
      },
      extraScripts: ["js/content/vitalsource-book.js"]
    },

    // Liberty University ---------------------------------------------------------
    {
      match: function(url) {
        return url.startsWith("https://luoa.instructure.com/courses/")
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://luoa-content.s3.amazonaws.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}))
          })
      },
      getFrameId: function(frames) {
        var frame = frames.find(function(frame) {
          return frame.url && frame.url.startsWith("https://luoa-content.s3.amazonaws.com/")
        })
        return frame && frame.frameId
      }
    },

    // EPUBReader ---------------------------------------------------------------
    {
      match: function(url) {
        return /^chrome-extension:\/\/jhhclmfgfllimlhabjkgkeebkbiadflb\/reader.html/.test(url);
      },
      validate: function() {
      },
      connect: function() {
        function call(method) {
          return new Promise(function(fulfill) {
            brapi.runtime.sendMessage("jhhclmfgfllimlhabjkgkeebkbiadflb", {name: method}, fulfill);
          })
        }
        function parseXhtml(xml) {
          var dom = new DOMParser().parseFromString(xml, "text/xml");
          var nodes = dom.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p");
          return Array.prototype.slice.call(nodes)
            .map(function(node) {
              return node.innerText && node.innerText.trim().replace(/\r?\n/g, " ");
            })
            .filter(function(text) {
              return text;
            })
        }
        var currentPage = 0;
        peer = {
          invoke: function(method, index) {
            if (method == "getCurrentIndex") return Promise.resolve(currentPage);
            else if (method == "getTexts") {
              var promise = Promise.resolve({success: true, paged: true});
              for (; currentPage<index; currentPage++) promise = promise.then(call.bind(null, "pageForward"));
              for (; currentPage>index; currentPage--) promise = promise.then(call.bind(null, "pageBackward"));
              return promise
                .then(function(res) {
                  if (!res.success) throw new Error("Failed to flip EPUB page");
                  return res.paged ? call("getPageText") : {success: true, text: null};
                })
                .then(function(res) {
                  if (!res.success) throw new Error("Failed to get EPUB text");
                  return res.text && parseXhtml(res.text);
                })
            }
            else return Promise.reject(new Error("Bad method"));
          },
          disconnect: function() {}
        }
        return call("getDocumentInfo")
          .then(extraAction(function(res) {
            if (!res.success) throw new Error("Failed to get EPUB document info");
            if (res.lang && !/^[a-z][a-z](-[A-Z][A-Z])?$/.test(res.lang)) res.lang = null;
            if (res.lang) res.detectedLang = res.lang;   //prevent lang detection
          }))
      }
    },

    // LibbyApp ---------------------------------------------------------------
    {
      match: function(url) {
        return url.startsWith("https://libbyapp.com/open/")
      },
      validate: function() {
        var perms = {
          permissions: ["webNavigation"],
          origins: ["https://*.read.libbyapp.com/"]
        }
        return hasPermissions(perms)
          .then(function(has) {
            if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}))
          })
      },
      getFrameId: function(frames) {
        var frame = frames.find(function(frame) {
          return frame.url && new URL(frame.url).hostname.endsWith(".read.libbyapp.com")
        })
        return frame && frame.frameId
      },
      extraScripts: ["js/content/libbyapp.js"]
    },

    // default -------------------------------------------------------------------
    {
      match: function() {
        return true;
      },
      validate: function() {
      }
    }
  ]


  var tabPromise = tabId ? getTab(tabId) : getActiveTab();
  var tab, handler, frameId, peer;
  var waiting = true;

  this.ready = tabPromise
    .then(function(res) {
      if (!res) throw new Error(JSON.stringify({code: "error_page_unreadable"}));
      tab = res;
      handler = handlers.find(function(h) {return h.match(tab.url || "")});
      return handler.validate();
    })
    .then(function() {
      if (handler.getFrameId)
        return getAllFrames(tab.id).then(handler.getFrameId).then(function(res) {frameId = res});
    })
    .then(function() {
      if (handler.connect) return handler.connect();
      return waitForConnect()
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
      .then(function(res) {
        if (handler.getTexts) return handler.getTexts(tab);
        else return res;
      })
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
      .then(inject.bind(null, "js/messaging.js"))
      .then(function() {
        if (handler.extraScripts) {
          var tasks = handler.extraScripts.map(function(file) {return inject.bind(null, file)});
          return inSequence(tasks);
        }
      })
      .then(inject.bind(null, "js/content.js"))
  }
  function inject(file) {
    var details = {file: file, tabId: tab.id};
    if (frameId) details.frameId = frameId;
    return executeScript(details);
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
