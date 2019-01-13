var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

polyfills();

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
  showHighlighting: 1,
  highlightFontSize: 4,
  highlightWindowSize: 2,
};


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
    brapi.storage.local.get(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
}

function clearSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.remove(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize"], fulfill);
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
  return Promise.all([
      browserTtsEngine.getVoices(),
      getSettings(["awsCreds", "gcpCreds"])
    ])
    .then(spread(function(voices, settings) {
      voices = voices.concat(googleTranslateTtsEngine.getVoices());
      voices = voices.concat(remoteTtsEngine.getVoices());
      if (settings.awsCreds) voices = voices.concat(amazonPollyTtsEngine.getVoices());
      /*if (settings.gcpCreds)*/ voices = voices.concat(googleWavenetTtsEngine.getVoices());
      voices = voices.concat(ibmWatsonTtsEngine.getVoices());
      return voices;
    }))
}

function isGoogleNative(voice) {
  return /^Google\s/.test(voice.voiceName);
}

function isGoogleTranslate(voice) {
  return /^GoogleTranslate /.test(voice.voiceName);
}

function isAmazonCloud(voice) {
  return /^Amazon /.test(voice.voiceName);
}

function isMicrosoftCloud(voice) {
  return /^Microsoft /.test(voice.voiceName) && voice.voiceName.indexOf(' - ') == -1;
}

function isOpenFPT(voice) {
  return /^OpenFPT /.test(voice.voiceName);
}

function isAmazonPolly(voice) {
  return /^AmazonPolly /.test(voice.voiceName);
}

function isGoogleWavenet(voice) {
  return /^Google(Standard|Wavenet) /.test(voice.voiceName);
}

function isIbmWatson(voice) {
  return /^IBM-Watson /.test(voice.voiceName);
}

function isRemoteVoice(voice) {
  return isAmazonCloud(voice) || isMicrosoftCloud(voice) || isOpenFPT(voice) || isGoogleTranslate(voice) || isGoogleWavenet(voice) || isAmazonPolly(voice) || isIbmWatson(voice);
}

function isPremiumVoice(voice) {
  return isAmazonCloud(voice) || (isMicrosoftCloud(voice) && voice.voiceName != "Microsoft Vietnamese (An)");
}

function getSpeechVoice(voiceName, lang) {
  return getVoices()
    .then(function(voices) {
      var voice;
      if (voiceName) voice = findVoiceByName(voices, voiceName);
      if (!voice && lang) {
        voice = findVoiceByLang(voices.filter(isGoogleNative), lang)
          || findVoiceByLang(voices.filter(negate(isRemoteVoice)), lang)
          || findVoiceByLang(voices.filter(isGoogleTranslate), lang)
          || findVoiceByLang(voices.filter(negate(isPremiumVoice)), lang)
          || findVoiceByLang(voices, lang);
        if (voice && isRemoteVoice(voice)) voice = Object.assign({autoSelect: true}, voice);
      }
      return voice;
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

function executeFile(file) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.executeScript({file: file}, function(result) {
      if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function executeScript(details) {
  var tabId = details.tabId;
  delete details.tabId;
  return new Promise(function(fulfill, reject) {
    brapi.tabs.executeScript(tabId, details, function(result) {
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

function negate(pred) {
  return function() {
    return !pred.apply(this, arguments);
  }
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

function callMethod(name) {
  var args = Array.prototype.slice.call(arguments, 1);
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

function assert(truthy, message) {
  if (!truthy) throw new Error(message || "Assertion failed");
}

function formatError(err) {
  var message = brapi.i18n && brapi.i18n.getMessage(err.code) || err.code;
  if (message) {
    message = message
      .replace(/{(\w+)}/g, function(m, p1) {return err[p1]})
      .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='#$2'>$1</a>")
  }
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
        else if (reject) {
          var err = new Error(xhr.responseText || xhr.statusText || xhr.status || ("Failed to fetch " + sUrl.substr(0, 100)));
          err.xhr = xhr;
          reject(err);
        }
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
        else reject(new Error(xhr.responseText || xhr.statusText || xhr.status || ("Failed to fetch " + sUrl.substr(0, 100))));
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

function polyfills() {
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

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
    if (this_len === undefined || this_len > this.length) {
      this_len = this.length;
    }
    return this.substring(this_len - search.length, this_len) === search;
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

if (!Promise.prototype.finally) {
  Object.defineProperty(Promise.prototype, 'finally', {
    value: function(callback) {
      var promise = this;
      function chain() {
        return Promise.resolve(callback()).then(function() {return promise});
      }
      return promise.then(chain, chain);
    },
    configurable: true,
    writable: true
  })
}
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

function getUniqueClientId() {
  return getSettings(["uniqueClientId"])
    .then(function(settings) {
      return settings.uniqueClientId || createId(8).then(extraAction(saveId));
    })
  function createId(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i=0; i<len; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
    return Promise.resolve(text);
  }
  function saveId(id) {
    return updateSettings({uniqueClientId: id});
  }
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

function StateMachine(states) {
  if (!states.IDLE) throw new Error("Missing IDLE state");
  var currentStateName = "IDLE";
  var lock = 0;
  this.trigger = function(eventName) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (lock) throw new Error("Cannot trigger an event while inside an event handler");
    lock++;
    try {
      var currentState = states[currentStateName];
      if (currentState[eventName]) {
        var nextStateName = (typeof currentState[eventName] == "string") ? currentState[eventName] : currentState[eventName].apply(currentState, args);
        if (nextStateName) {
          if (typeof nextStateName == "string") {
            if (states[nextStateName]) {
              currentStateName = nextStateName;
              if (states[currentStateName].onTransitionIn) states[currentStateName].onTransitionIn();
            }
            else throw new Error("Unknown next-state " + nextStateName);
          }
          else throw new Error("Event handler must return next-state's name or null to stay in same state");
        }
      }
      else throw new Error("No handler '" + eventName + "' in state " + currentStateName);
    }
    finally {
      lock--;
    }
  }
  this.getState = function() {
    return currentStateName;
  }
}

function requestPermissions(perms) {
  return new Promise(function(fulfill) {
    brapi.permissions.request(perms, fulfill);
  })
}

function hasPermissions(perms) {
  return new Promise(function(fulfill) {
    brapi.permissions.contains(perms, fulfill);
  })
}

function getAuthToken(opts) {
  return new Promise(function(fulfill, reject) {
    if (!brapi.identity || !brapi.identity.getAuthToken) return fulfill(null);
    brapi.identity.getAuthToken(opts, function(token) {
      if (brapi.runtime.lastError);
      fulfill(token);
    })
  })
}

function removeCachedAuthToken(authToken) {
  return new Promise(function(fulfill) {
    brapi.identity.removeCachedAuthToken({token: authToken}, fulfill);
  })
}

function getAccountInfo(authToken) {
  return ajaxGet(config.serviceUrl + "/read-aloud/get-account?t=" + authToken)
    .then(JSON.parse)
    .then(function(account) {
      account.balance += account.freeBalance;
      return account;
    })
    .catch(function(err) {
      if (err.xhr && err.xhr.status == 401) return removeCachedAuthToken(authToken).then(function() {return null});
      else throw err;
    })
}
