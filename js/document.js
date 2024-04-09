
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


function TabSource() {
  var waiting = true;
  var sendToSource;

  this.ready = getState("sourceUri")
    .then(uri => {
      if (uri.startsWith("contentscript:")) {
        const tabId = Number(uri.substr(14))
        sendToSource = sendToContentScript.bind(null, tabId)
        return sendToSource({method: "getDocumentInfo"})
      }
      else if (uri.startsWith("epubreader:")) {
        const extensionId = uri.substr(11)
        sendToSource = sendToEpubReader.bind({}, extensionId)
        return sendToSource({method: "getDocumentInfo"})
          .then(res => {
            if (!res.success) throw new Error("Failed to get EPUB document info")
            if (res.lang && !/^[a-z][a-z](-[A-Z][A-Z])?$/.test(res.lang)) res.lang = null
            if (res.lang) res.detectedLang = res.lang   //prevent lang detection
            return res
          })
      }
      else if (uri.startsWith("pdfviewer:")) {
        sendToSource = sendToPdfViewer
        return sendToSource({method: "getDocumentInfo"})
      }
      else throw new Error("Invalid source")
    })
    .finally(function() {
      waiting = false;
    })

  this.isWaiting = function() {
    return waiting;
  }
  this.getCurrentIndex = function() {
    waiting = true;
    return sendToSource({method: "getCurrentIndex"})
      .finally(function() {waiting = false})
  }
  this.getTexts = function(index, quietly) {
    waiting = true;
    return sendToSource({method: "getTexts", args: [index, quietly]})
      .finally(function() {waiting = false})
  }
  this.close = function() {
    return Promise.resolve();
  }
  this.getUri = function() {
    return this.ready
      .then(function(info) {return info.url})
  }

  async function sendToContentScript(tabId, message) {
    message.dest = "contentScript"
    const result = await brapi.tabs.sendMessage(tabId, message)
      .catch(err => {
        clearState("contentScriptTabId")
        if (/^(A listener indicated|Could not establish)/.test(err.message)) throw new Error(err.message + " " + message.method)
        throw err
      })
    if (result && result.error) throw result.error
    else return result
  }

  async function sendToEpubReader(extId, message) {
    if (this.currentPage == null) this.currentPage = 0
    switch (message.method) {
      case "getDocumentInfo": return brapi.runtime.sendMessage(extId, {name: "getDocumentInfo"})
      case "getCurrentIndex": return this.currentPage
      case "getTexts": return getTexts.apply(this, message.args)
      default: throw new Error("Bad method")
    }
    async function getTexts(index) {
      var res = {success: true, paged: true}
      for (; this.currentPage<index; this.currentPage++) res = await brapi.runtime.sendMessage(extId, {name: "pageForward"})
      for (; this.currentPage>index; this.currentPage--) res = await brapi.runtime.sendMessage(extId, {name: "pageBackward"})
      if (!res.success) throw new Error("Failed to flip EPUB page");
      res = res.paged ? await brapi.runtime.sendMessage(extId, {name: "getPageText"}) : {success: true, text: null}
      if (!res.success) throw new Error("Failed to get EPUB text");
      return res.text && parseXhtml(res.text)
    }
    function parseXhtml(xml) {
      const dom = new DOMParser().parseFromString(xml, "text/xml");
      const nodes = dom.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p");
      return Array.prototype.slice.call(nodes)
        .map(node => node.innerText && node.innerText.trim().replace(/\r?\n/g, " "))
        .filter(text => text)
    }
  }

  async function sendToPdfViewer(message) {
    message.dest = "pdfViewer"
    const result = await brapi.runtime.sendMessage(message)
      .catch(err => {
        if (/^(A listener indicated|Could not establish)/.test(err.message)) throw new Error(err.message + " " + message.method)
        throw err
      })
    if (result && result.error) throw result.error
    else return result
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
  const playbackState = new rxjs.BehaviorSubject("resumed")

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
    playbackState.error({name: "CancellationException", message: "Playback cancelled"})
    return ready
      .catch(function() {})
      .then(function() {
        if (activeSpeech) activeSpeech.stop().then(function() {activeSpeech = null});
        source.close();
      })
  }

  //method play
  async function play() {
    if (activeSpeech) return activeSpeech.play();
    await ready
    await wait(playbackState, "resumed")
    currentIndex = await source.getCurrentIndex()
    await wait(playbackState, "resumed")
    return readCurrent()
  }

  async function readCurrent(rewinded) {
    const texts = await source.getTexts(currentIndex).catch(err => null)
    await wait(playbackState, "resumed")
    if (texts) {
      if (texts.length) {
        foundText = true;
        return read(texts, rewinded);
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
  }

  async function read(texts, rewinded) {
    texts = texts.map(preprocess)
    if (info.detectedLang == null) {
      const lang = await detectLanguage(texts)
      await wait(playbackState, "resumed")
      info.detectedLang = lang || "";
    }
    if (activeSpeech) return;
    activeSpeech = await getSpeech(texts);
    await wait(playbackState, "resumed")
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
    if (rewinded) await activeSpeech.gotoEnd();
    return activeSpeech.play();
  }

  function preprocess(text) {
    text = truncateRepeatedChars(text, 3)
    return text.replace(/https?:\/\/\S+/g, "HTTP URL.")
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

  async function serverDetectLanguage(text) {
    try {
      const service = await rxjs.firstValueFrom(fasttextObservable)
      if (!service) throw new Error("FastText service unavailable")
      const [prediction] = await service.sendRequest("detectLanguage", {text})
      return prediction?.language
    }
    catch (err) {
      console.error(err)

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
  }

  async function getSpeech(texts) {
    const settings = await getSettings()
    settings.rate = await getSetting("rate" + (settings.voiceName || ""))
    var lang = (!info.detectedLang || info.lang && info.lang.startsWith(info.detectedLang)) ? info.lang : info.detectedLang;
    console.log("Declared", info.lang, "- Detected", info.detectedLang, "- Chosen", lang)
    var options = {
      rate: settings.rate || defaults.rate,
      pitch: settings.pitch || defaults.pitch,
      volume: settings.volume || defaults.volume,
      lang: config.langMap[lang] || lang || 'en-US',
    }
    const voice = await getSpeechVoice(settings.voiceName, options.lang)
    if (!voice) throw new Error(JSON.stringify({code: "error_no_voice", lang: options.lang}));
    options.voice = voice;
    return new Speech(texts, options);
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
    else return "LOADING"
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
