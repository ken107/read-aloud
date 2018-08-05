var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

var config = {
  serviceUrl: "https://support.lsdsoftware.com",
  entityMap: {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  },
  langMap: {
    iw: 'he'
  },
  unsupportedSites: [
    'https://chrome.google.com/webstore',
    'https://addons.mozilla.org',
    'https://play.google.com/books',
    'https://ereader.chegg.com',
    /^https:\/\/\w+\.vitalsource\.com/,
  ],
}

var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  showHighlighting: 0,
};

var browserTtsEngine = brapi.tts ? new BrowserTtsEngine() : (typeof speechSynthesis != 'undefined' ? new WebSpeechEngine() : new DummyTtsEngine());
var remoteTtsEngine = new RemoteTtsEngine(config.serviceUrl, (typeof readAloudManifest != 'undefined') ? readAloudManifest : brapi.runtime.getManifest());
var googleTranslateTts = new GoogleTranslateTts();


function getQueryString() {
  var queryString = {};
  if (location.search) location.search.substr(1).replace(/\+/g, '%20').split('&').forEach(function(tuple) {
    var tokens = tuple.split('=');
    queryString[decodeURIComponent(tokens[0])] = tokens[1] && decodeURIComponent(tokens[1]);
  })
  return queryString;
}

function getSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.get(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
}

function clearSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.remove(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages"], fulfill);
  });
}

function getState(key) {
  return new Promise(function(fulfill) {
    brapi.storage.local.get(key, function(items) {
      fulfill(items[key]);
    });
  });
}

function setState(key, value) {
  var items = {};
  items[key] = value;
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
}

function getVoices() {
  return browserTtsEngine.getVoices()
    .then(function(voices) {
      //add the remote voices if browser didn't return them (i.e. because it doesn't support the ttsEngine declaration in the manifest)
      var remoteVoices = remoteTtsEngine.getVoices();
      if (!voices.some(function(voice) {return voice.voiceName == remoteVoices[0].voiceName})) voices = voices.concat(remoteVoices);
      return voices;
    })
}

function isGoogleNative(voiceName) {
  return /^Google\s/.test(voiceName);
}

function isGoogleTranslate(voiceName) {
  return /^GoogleTranslate /.test(voiceName);
}

function isAmazonPolly(voiceName) {
  return /^Amazon /.test(voiceName);
}

function isMicrosoftCloud(voiceName) {
  return /^Microsoft /.test(voiceName) && voiceName.indexOf(' - ') == -1;
}

function isOpenFPT(voiceName) {
  return /^OpenFPT /.test(voiceName);
}

function isRemoteVoice(voiceName) {
  return remoteTtsEngine.hasVoice(voiceName);
}

function isPremiumVoice(voiceName) {
  return isAmazonPolly(voiceName) || isMicrosoftCloud(voiceName) || isOpenFPT(voiceName);
}

function executeFile(file) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.executeScript({file: file}, function(result) {
      if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function executeScript(code) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.executeScript({code: code}, function(result) {
      if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function insertCSS(file) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.insertCSS({file: file}, function(result) {
      if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
      else fulfill(result);
    })
  });
}

function getActiveTab() {
  return new Promise(function(fulfill) {
    brapi.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
      fulfill(tabs[0]);
    })
  })
}

function setTabUrl(tabId, url) {
  return new Promise(function(fulfill) {
    brapi.tabs.update(tabId, {url: url}, fulfill);
  })
}

function getBackgroundPage() {
  return new Promise(function(fulfill) {
    brapi.runtime.getBackgroundPage(fulfill);
  });
}

function spread(f, self) {
  return function(args) {
    return f.apply(self, args);
  };
}

function extraAction(action) {
  return function(data) {
    return Promise.resolve(action(data))
      .then(function() {return data})
  }
}

function inSequence(tasks) {
  return tasks.reduce(function(p, task) {return p.then(task)}, Promise.resolve());
}

function callMethod(name, args) {
  return function(obj) {
    return obj[name].apply(obj, args);
  };
}

function waitMillis(millis) {
  return new Promise(function(fulfill) {
    setTimeout(fulfill, millis);
  });
}

function parseLang(lang) {
  var tokens = lang.toLowerCase().replace(/_/g, '-').split(/-/, 2);
  return {
    lang: tokens[0],
    rest: tokens[1]
  };
}

function formatError(err) {
  var message = brapi.i18n.getMessage(err.code);
  if (message) message = message.replace(/{(\w+)}/g, function(m, p1) {return err[p1]});
  return message;
}

function urlEncode(oData) {
  if (oData == null) return null;
  var parts = [];
  for (var key in oData) parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(oData[key]));
  return parts.join("&");
}

function ajaxGet(sUrl) {
  return new Promise(ajaxGetCb.bind(null, sUrl));
}

function ajaxGetCb(sUrl, fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", sUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(xhr.responseText);
        else reject && reject(new Error(xhr.responseText));
      }
    };
    xhr.send(null);
}

function ajaxPost(sUrl, oData, sType) {
  return new Promise(function(fulfill, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", sUrl, true);
    xhr.setRequestHeader("Content-type", sType == "json" ? "application/json" : "application/x-www-form-urlencoded");
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(xhr.responseText);
        else reject(new Error(xhr.responseText));
      }
    };
    xhr.send(sType == "json" ? JSON.stringify(oData) : urlEncode(oData));
  })
}

function objectAssign(target, varArgs) { // .length of function is 2
  'use strict';
  if (target == null) throw new TypeError('Cannot convert undefined or null to object');
  var to = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];
    if (nextSource != null) { // Skip over if undefined or null
      for (var nextKey in nextSource) {
        // Avoid bugs when hasOwnProperty is shadowed
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
}

if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: objectAssign,
    writable: true,
    configurable: true
  });
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(search, pos) {
  return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
}

if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) throw new TypeError('"this" is null or not defined');
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) return false;
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }
      while (k < len) {
        if (sameValueZero(o[k], searchElement)) return true;
        k++;
      }
      return false;
    },
    configurable: true,
    writable: true
  });
}

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
      if (this == null) throw new TypeError('"this" is null or not defined');
      var o = Object(this);
      var len = o.length >>> 0;
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var thisArg = arguments[1];
      var k = 0;
      while (k < len) {
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) return kValue;
        k++;
      }
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

if (!Array.prototype.groupBy) {
  Object.defineProperty(Array.prototype, 'groupBy', {
    value: function(keySelector, valueReducer) {
      if (!valueReducer) {
        valueReducer = function(a,b) {
          if (!a) a = [];
          a.push(b);
          return a;
        }
      }
      var result = {};
      for (var i=0; i<this.length; i++) {
        var key = keySelector(this[i]);
        if (key != null) result[key] = valueReducer(result[key], this[i]);
      }
      return result;
    },
    configurable: true,
    writable: true
  })
}

function domReady() {
  return new Promise(function(fulfill) {
    $(fulfill);
  })
}

function setI18nText() {
  $("[data-i18n]").each(function() {
    var key = $(this).data("i18n");
    var text = brapi.i18n.getMessage(key);
    if ($(this).is("input")) $(this).val(text);
    else $(this).text(text);
  })
}

function escapeHtml(text) {
  return text.replace(/[&<>"'`=\/]/g, function(s) {
    return config.entityMap[s];
  })
}

function getBrowser() {
  if (/Opera|OPR\//.test(navigator.userAgent)) return 'opera';
  if (/firefox/i.test(navigator.userAgent)) return 'firefox';
  return 'chrome';
}

function getHotkeySettingsUrl() {
  switch (getBrowser()) {
    case 'opera': return 'opera://settings/configureCommands';
    case 'chrome': return 'chrome://extensions/configureCommands';
    default: return brapi.runtime.getURL("shortcuts.html");
  }
}

function isUnsupportedSite(url) {
  return config.unsupportedSites.some(function(site) {
    return (typeof site == "string" && url.startsWith(site)) ||
      (site instanceof RegExp && site.test(url));
  })
}

function BrowserTtsEngine() {
  this.speak = function(text, options, onEvent) {
    brapi.tts.speak(text, {
      voiceName: options.voice.voiceName,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start", "end"],
      desiredEventTypes: ["start", "end", "error"],
      onEvent: onEvent
    })
  }
  this.stop = brapi.tts.stop;
  this.pause = brapi.tts.pause;
  this.resume = brapi.tts.resume;
  this.isSpeaking = brapi.tts.isSpeaking;
  this.getVoices = function() {
    return new Promise(function(fulfill) {
      brapi.tts.getVoices(fulfill);
    })
  }
}

function WebSpeechEngine() {
  var utter;
  this.speak = function(text, options, onEvent) {
    utter = new SpeechSynthesisUtterance();
    utter.text = text;
    utter.voice = options.voice;
    if (options.lang) utter.lang = options.lang;
    if (options.pitch) utter.pitch = options.pitch;
    if (options.rate) utter.rate = options.rate;
    if (options.volume) utter.volume = options.volume;
    utter.onstart = onEvent.bind(null, {type: 'start', charIndex: 0});
    utter.onend = onEvent.bind(null, {type: 'end', charIndex: text.length});
    utter.onerror = function(event) {
      onEvent({type: 'error', errorMessage: event.error});
    };
    speechSynthesis.speak(utter);
  }
  this.stop = function() {
    if (utter) utter.onend = null;
    speechSynthesis.cancel();
  }
  this.pause = function() {
    speechSynthesis.pause();
  }
  this.resume = function() {
    speechSynthesis.resume();
  }
  this.isSpeaking = function(callback) {
    callback(speechSynthesis.speaking);
  }
  this.getVoices = function() {
    return new Promise(function(fulfill) {
      var voices = speechSynthesis.getVoices();
      if (voices.length) fulfill(voices);
      else speechSynthesis.onvoiceschanged = function() {
        fulfill(speechSynthesis.getVoices());
      }
    })
    .then(function(voices) {
      for (var i=0; i<voices.length; i++) voices[i].voiceName = voices[i].name;
      return voices;
    })
  }
}

function DummyTtsEngine() {
  this.getVoices = function() {
    return Promise.resolve([]);
  }
}

function RemoteTtsEngine(serviceUrl, manifest) {
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  var audio = document.createElement("AUDIO");
  var prefetchAudio = document.createElement("AUDIO");
  var isSpeaking = false;
  var nextStartTime = 0;
  var waitTimer;
  var voices = manifest.tts_engine.voices.map(function(voice) {
    return {voiceName: voice.voice_name, lang: voice.lang};
  })
  var voiceMap = {};
  for (var i=0; i<voices.length; i++) voiceMap[voices[i].voiceName] = voices[i];

  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    audio.pause();
    if (!iOS) {
      audio.volume = options.volume;
      audio.defaultPlaybackRate = options.rate;
    }
    audio.src = getAudioUrl(utterance, options.lang, options.voice.voiceName);
    audio.oncanplay = function() {
      var waitTime = nextStartTime - new Date().getTime();
      if (waitTime > 0) waitTimer = setTimeout(audio.play.bind(audio), waitTime);
      else audio.play();
      isSpeaking = true;
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = function() {
      onEvent({type: 'end', charIndex: utterance.length});
      isSpeaking = false;
    };
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
      isSpeaking = false;
    };
    audio.load();
  }
  this.isSpeaking = function(callback) {
    callback(isSpeaking);
  }
  this.pause =
  this.stop = function() {
    clearTimeout(waitTimer);
    audio.pause();
  }
  this.resume = function() {
    audio.play();
  }
  this.prefetch = function(utterance, options) {
    if (!iOS) {
      prefetchAudio.src = getAudioUrl(utterance, options.lang, options.voice.voiceName);
      prefetchAudio.load();
    }
  }
  this.setNextStartTime = function(time, options) {
    if (!iOS)
      nextStartTime = time || 0;
  }
  this.getVoices = function() {
    return voices;
  }
  this.hasVoice = function(voiceName) {
    return voiceMap[voiceName] != null;
  }
  function getAudioUrl(utterance, lang, voiceName) {
    return serviceUrl + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voiceName) + "?q=" + encodeURIComponent(utterance);
  }
}

function GoogleTranslateTts() {
  var prevTab;
  var translateTab;
  var promise;
  this.getEngine = function() {
    if (!promise) promise = createEngine();
    return promise;
  }
  function createEngine() {
    return savePrevTab()
      .then(createTranslateTab)
      .then(waitForConnect)
      .then(function(port) {
        return new Promise(function(fulfill, reject) {
          var engine = new GoogleTranslateTtsEngine(port,
            function(isReady) { //onReady
              if (isReady) fulfill(engine);
              else reject(new Error("Failed to start TTS worker"));
            },
            function() {  //onDisconnect
              promise = null;
            })
        })
      })
      .then(extraAction(restorePrevTab))
      .catch(function(err) {
        removeTranslateTab();
        promise = null;
        throw err;
      })
  }
  function savePrevTab() {
    return getActiveTab().then(function(tab) {
      prevTab = tab;
    })
  }
  function restorePrevTab() {
    setTimeout(function() {
      brapi.tabs.update(prevTab.id, {active: true})
    }, 1500)
  }
  function createTranslateTab() {
    return new Promise(function(fulfill, reject) {
      brapi.tabs.create({url: "https://translate.google.com/"}, function(tab) {
        if (brapi.runtime.lastError) reject(brapi.runtime.lastError);
        else fulfill(translateTab = tab);
      })
    })
  }
  function removeTranslateTab() {
    if (translateTab) {
      brapi.tabs.remove(translateTab.id);
      translateTab = null;
    }
  }
  function injectScripts() {
    return new Promise(function(fulfill, reject) {
      brapi.tabs.executeScript(translateTab.id, {file: "js/messaging.js"}, function() {
        if (brapi.runtime.lastError) reject(brapi.runtime.lastError);
        else {
          brapi.tabs.executeScript(translateTab.id, {file: "js/google-translate.js"}, function() {
            if (brapi.runtime.lastError) reject(brapi.runtime.lastError);
            else fulfill();
          })
        }
      })
    })
  }
  function waitForConnect() {
    return new Promise(function(fulfill, reject) {
      function onConnect(port) {
        if (port.name == "GoogleTranslateTtsWorker") {
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
        reject(new Error("Timeout waiting for TTS worker to connect"));
      }
      brapi.runtime.onConnect.addListener(onConnect);
      injectScripts().catch(onError);
      var timer = setTimeout(onTimeout, 5000);
    })
  }
}

function GoogleTranslateTtsEngine(port, onReady, onDisconnect) {
  var onEvent;
  var peer = new RpcPeer(new ExtensionMessagingPeer(port));
  peer.onInvoke = function(method, arg0) {
    if (method == "onReady") onReady(arg0);
    else if (method == "onEvent") {
      if (onEvent) {
        onEvent(arg0);
        if (arg0.type == "end" || arg0.type == "error") onEvent = null;
      }
      else console.error("Unexpected event " + JSON.stringify(arg0));
    }
    else console.error("Unknown method " + method);
  }
  peer.onDisconnect = function() {
    if (onEvent) {
      onEvent({type:"error", errorMessage:"Lost connection to GoogleTranslate speech engine"});
      onEvent = null;
    }
    onDisconnect();
  }
  this.speak = function(text, options, onEvt) {
    onEvent = onEvt;
    peer.invoke("speak", text, options)
      .then(onEvent.bind(null, {type:"start"}))
  }
  this.isSpeaking = function(callback) {
    peer.invoke("isSpeaking")
      .then(callback)
  }
  this.stop = peer.invoke.bind(peer, "stop");
  this.pause = peer.invoke.bind(peer, "pause");
  this.resume = peer.invoke.bind(peer, "resume");
  this.prefetch = peer.invoke.bind(peer, "prefetch");
  this.setNextStartTime = peer.invoke.bind(peer, "setNextStartTime");
}
