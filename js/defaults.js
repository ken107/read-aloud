var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

polyfills();

var config = {
  serviceUrl: "https://support.readaloud.app",
  webAppUrl: "https://readaloud.app",
  pdfViewerUrl: "https://assets.lsdsoftware.com/read-aloud/pdf-viewer-2/web/readaloud.html",
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
    'chrome:',
    'about:',
  ],
  wavenetPerms: {
    permissions: ["webRequest"],
    origins: ["https://*/"]
  },
}

var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  showHighlighting: 1,
  highlightFontSize: 3,
  highlightWindowSize: 2,
};

var getSingletonAudio = lazy(() => {
  const audio = new Audio()
  audio.crossOrigin = "anonymous"
  return audio
})
var getSilenceTrack = lazy(() => makeSilenceTrack())

setupDarkMode()




async function setupDarkMode() {
  //if extension page but not service worker
  if (typeof brapi.commands != "undefined" && typeof window != "undefined") {
    const [{darkMode}] = await Promise.all([
      getSettings(["darkMode"]),
      new Promise(f => document.addEventListener("DOMContentLoaded", f))
    ])
    if (typeof darkMode == "boolean") {
      document.body.classList.toggle("dark-mode", darkMode)
    }
    else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add("dark-mode")
      }
    }
  }
}


/**
 * HELPERS
 */
function lazy(get) {
  var value
  return () => value || (value = get())
}

function immediate(get) {
  return get()
}

function getQueryString() {
  return location.search ? parseQueryString(location.search) : {};
}

function parseQueryString(search) {
  if (search.charAt(0) != '?') throw new Error("Invalid argument");
  var queryString = {};
  search.substr(1).replace(/\+/g, '%20').split('&').forEach(function(tuple) {
    var tokens = tuple.split('=');
    queryString[decodeURIComponent(tokens[0])] = tokens[1] && decodeURIComponent(tokens[1]);
  })
  return queryString;
}


/**
 * SETTINGS
 */
function getSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.get(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize", "preferredVoices", "useEmbeddedPlayer", "fixBtSilenceGap", "darkMode"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
}

function clearSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.remove(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize", "preferredVoices", "useEmbeddedPlayer", "fixBtSilenceGap", "darkMode"], fulfill);
  });
}

async function getSetting(name) {
  const items = await brapi.storage.local.get([name])
  return items[name]
}

async function updateSetting(name, value) {
  const items = {}
  items[name] = value
  await brapi.storage.local.set(items)
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

function clearState(key) {
  return brapi.storage.local.remove(key)
}


/**
 * VOICES
 */
function getVoices(opts) {
  if (!opts) opts = {}
  return getSettings(["awsCreds", "gcpCreds", "openaiCreds", "azureCreds", "piperVoices"])
    .then(function(settings) {
      return Promise.all([
        browserTtsEngine.getVoices(),
        Promise.resolve(!opts.excludeUnavailable || googleTranslateTtsEngine.ready())
          .then(() => googleTranslateTtsEngine.getVoices())
          .catch(err => {
            console.error(err)
            return []
          }),
        remoteTtsEngine.getVoices(),
        settings.awsCreds ? amazonPollyTtsEngine.getVoices() : [],
        settings.gcpCreds ? googleWavenetTtsEngine.getVoices() : googleWavenetTtsEngine.getFreeVoices(),
        ibmWatsonTtsEngine.getVoices(),
        nvidiaRivaTtsEngine.getVoices(),
        phoneTtsEngine.getVoices(),
        settings.openaiCreds ? openaiTtsEngine.getVoices() : [],
        settings.azureCreds ? azureTtsEngine.getVoices() : [],
        settings.piperVoices || [],
      ])
    })
    .then(function(arr) {
      return Array.prototype.concat.apply([], arr);
    })
}

function isOfflineVoice(voice) {
  return voice.remote == false
}

function isGoogleNative(voice) {
  return /^Google\s/.test(voice.voiceName);
}

function isChromeOSNative(voice) {
  return /^Chrome\sOS\s/.test(voice.voiceName);
}

function isMacOSNative(voice) {
  return /^MacOS /.test(voice.voiceName);
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

function isReadAloudCloud(voice) {
  return /^ReadAloud /.test(voice.voiceName)
}

function isAmazonPolly(voice) {
  return /^AmazonPolly /.test(voice.voiceName);
}

function isGoogleWavenet(voice) {
  return /^Google(Standard|Wavenet|Neural2|Studio) /.test(voice.voiceName);
}

function isGoogleStudio(voice) {
  return /^Google(Studio) /.test(voice.voiceName);
}

function isIbmWatson(voice) {
  return /^IBM-Watson /.test(voice.voiceName);
}

function isNvidiaRiva(voice) {
  return /^Nvidia-Riva /.test(voice.voiceName);
}

function isOpenai(voice) {
  return /^ChatGPT /.test(voice.voiceName);
}

function isAzure(voice) {
  return /^Azure /.test(voice.voiceName);
}

function isPiperVoice(voice) {
  return /^Piper /.test(voice.voiceName)
}

function isUseMyPhone(voice) {
  return voice.isUseMyPhone == true
}

function isRemoteVoice(voice) {
  return isAmazonCloud(voice) || isMicrosoftCloud(voice) || isReadAloudCloud(voice) || isGoogleTranslate(voice) || isGoogleWavenet(voice) || isAmazonPolly(voice) || isIbmWatson(voice) || isNvidiaRiva(voice) || isOpenai(voice) || isAzure(voice);
}

function isPremiumVoice(voice) {
  return isAmazonCloud(voice) || isMicrosoftCloud(voice);
}

function getSpeechVoice(voiceName, lang) {
  return Promise.all([getVoices({excludeUnavailable: true}), getSettings(["preferredVoices"])])
    .then(function(res) {
      var voices = res[0];
      var preferredVoiceByLang = res[1].preferredVoices || {};
      var voice;
      //if a specific voice is indicated
      if (voiceName) voice = findVoiceByName(voices, voiceName);
      //if no specific voice indicated, but a preferred voice was configured for the language
      if (!voice && lang) {
        voiceName = preferredVoiceByLang[lang.split("-")[0]];
        if (voiceName) voice = findVoiceByName(voices, voiceName);
      }
      //otherwise, auto-select
      voices = voices.filter(negate(isUseMyPhone))    //do not auto-select "Use My Phone"
      if (!voice && lang) {
        voice = findVoiceByLang(voices.filter(isOfflineVoice), lang)
          || findVoiceByLang(voices.filter(isGoogleNative), lang)
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
        //language matches
        if (voiceLang.rest == speechLang.rest) {
          //dialect matches, prefer female
          if (voice.gender == "female") match.first = match.first || voice;
          else match.second = match.second || voice;
        }
        else if (!voiceLang.rest) {
          //voice specifies no dialect
          match.third = match.third || voice;
        }
        else {
          //dialect mismatch, prefer en-US (if english)
          if (voiceLang.lang == 'en' && voiceLang.rest == 'us') match.fourth = match.fourth || voice;
          else match.sixth = match.sixth || voice;
        }
      }
    }
    else {
      //voice specifies no language, assume can handle any lang
      match.fifth = match.fifth || voice;
    }
  });
  return match.first || match.second || match.third || match.fourth || match.fifth || match.sixth;
}


/**
 * HELPERS
 */
function getActiveTab() {
  return new Promise(function(fulfill) {
    brapi.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
      fulfill(tabs[0]);
    })
  })
}

function getCurrentTab() {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.getCurrent(function(tab) {
      if (tab) fulfill(tab)
      else reject(brapi.runtime.lastError || new Error("Could not get current tab"))
    })
  })
}

function getTab(tabId) {
  return new Promise(function(fulfill) {
    brapi.tabs.get(tabId, fulfill)
  })
}

function setTabUrl(tabId, url) {
  return new Promise(function(fulfill) {
    brapi.tabs.update(tabId, {url: url}, fulfill);
  })
}

function createTab(url, waitForLoad) {
  return new Promise(function(fulfill) {
    brapi.tabs.create({url: url}, function(tab) {
      if (!waitForLoad) fulfill(tab);
      else brapi.tabs.onUpdated.addListener(onUpdated);

      function onUpdated(tabId, changeInfo) {
        if (changeInfo.status == "complete" && tabId == tab.id) {
          brapi.tabs.onUpdated.removeListener(onUpdated);
          fulfill(tab);
        }
      }
    })
  })
}

function updateTab(tabId, details) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.update(tabId, details, function(tab) {
      if (tab) fulfill(tab)
      else reject(brapi.runtime.lastError || new Error("Could not update tab " + tabId))
    })
  })
}

function createWindow(details) {
  return new Promise(function(fulfill, reject) {
    brapi.windows.create(details, function(window) {
      if (window) fulfill(window)
      else reject(brapi.runtime.lastError || new Error("Could not create window"))
    })
  })
}

function updateWindow(windowId, details) {
  return new Promise(function(fulfill, reject) {
    brapi.windows.update(windowId, details, function(window) {
      if (window) fulfill(window)
      else reject(brapi.runtime.lastError || new Error("Could not update window " + windowId))
    })
  })
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

function wait(observable, value) {
  return rxjs.firstValueFrom(observable.pipe(rxjs.filter(x => x == value)))
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
  var opts = typeof sUrl == "string" ? {url: sUrl} : sUrl;
  return fetch(opts.url, {headers: opts.headers})
    .then(res => {
      if (!res.ok) throw new Error("Server returns " + res.status)
      switch (opts.responseType) {
        case "json": return res.json()
        case "blob": return res.blob()
        default: return res.text()
      }
    })
}

function ajaxPost(sUrl, oData, sType) {
  return fetch(sUrl, {
      method: "POST",
      headers: {
        "Content-Type": sType == "json" ? "application/json" : "application/x-www-form-urlencoded"
      },
      body: sType == "json" ? JSON.stringify(oData) : urlEncode(oData)
    })
    .then(res => {
      if (!res.ok) throw new Error("Server returns " + res.status)
      return res.text()
    })
}


/**
 * POLYFILLS
 */
function polyfills() {
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
        if (key != null) {
          var value = valueReducer(result[key], this[i]);
          if (value !== undefined) result[key] = value;
          else delete result[key];
        }
      }
      return result;
    },
    configurable: true,
    writable: true
  })
}


/**
 * HELPERS
 */
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

function isIOS() {
  return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform)
}

function getHotkeySettingsUrl() {
  switch (getBrowser()) {
    case 'opera': return 'opera://settings/configureCommands';
    case 'chrome': return 'chrome://extensions/configureCommands';
    default: return brapi.runtime.getURL("shortcuts.html");
  }
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

function removePermissions(perms) {
  return new Promise(function(fulfill) {
    brapi.permissions.remove(perms, fulfill);
  })
}

function getAuthToken(opts) {
  if (!opts) opts = {};
  return getSettings(["authToken"])
    .then(function(settings) {
      return settings.authToken || (opts.interactive ? interactiveLogin().then(extraAction(saveToken)) : null);
    })
  //Note: Cognito webAuthFlow is always interactive (if user already logged in, it shows button "Sign in as <email>" or  "Continue with Google/Facebook/etc")
  function interactiveLogin() {
    return new Promise(function(fulfill, reject) {
      if (!brapi.identity || !brapi.identity.launchWebAuthFlow) return fulfill(null);
      brapi.identity.launchWebAuthFlow({
        interactive: true,
        url: config.webAppUrl + "/login.html?returnUrl=" + brapi.identity.getRedirectURL()
      },
      function(responseUrl) {
        if (responseUrl) {
          var index = responseUrl.indexOf("?");
          var res = parseQueryString(responseUrl.substr(index));
          if (res.error) reject(new Error(res.error_description || res.error));
          else fulfill(res.token);
        }
        else {
          if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
          else fulfill(null);
        }
      })
    })
  }
  function saveToken(token) {
    if (token) return updateSettings({authToken: token});
  }
}

function clearAuthToken() {
  return clearSettings(["authToken"])
    .then(function() {
      return new Promise(function(fulfill) {
        brapi.identity.launchWebAuthFlow({
          interactive: false,
          url: config.webAppUrl + "/logout.html?returnUrl=" + brapi.identity.getRedirectURL()
        },
        function(responseUrl) {
          if (responseUrl) {
            var index = responseUrl.indexOf("?");
            var res = index != -1 ? parseQueryString(responseUrl.substr(index)) : {};
            if (res.error) reject(new Error(res.error_description || res.error));
            else fulfill();
          }
          else {
            if (brapi.runtime.lastError) console.warn(new Error(brapi.runtime.lastError.message));
            fulfill();
          }
        })
      })
    })
}

async function getAccountInfo(authToken) {
  const res = await fetch(config.serviceUrl + "/read-aloud/get-account?t=" + authToken)
  if (res.ok) {
    const account = await res.json()
    account.balance += account.freeBalance;
    return account;
  }
  else {
    if (res.status == 401) {
      await clearSettings(["authToken"])
      return null
    }
    else {
      throw new Error("Can't fetch account info, server returns " + res.status)
    }
  }
}

function isMobileOS() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

function getAllFrames(tabId) {
  return new Promise(function(fulfill) {
    brapi.webNavigation.getAllFrames({tabId: tabId}, fulfill);
  })
}

function promiseTimeout(millis, errorMsg, promise) {
  return new Promise(function(fulfill, reject) {
    var timedOut = false;
    var timer = setTimeout(onTimeout, millis);
    promise.then(onFulfill, onReject);

    function onFulfill(value) {
      if (timedOut) return;
      clearTimeout(timer);
      fulfill(value);
    }
    function onReject(err) {
      if (timedOut) return;
      clearTimeout(timer);
      reject(err);
    }
    function onTimeout() {
      timedOut = true;
      reject(new Error(errorMsg));
    }
  })
}

function bgPageInvoke(method, args) {
  return new Promise(function(fulfill, reject) {
    brapi.runtime.sendMessage({dest: "serviceWorker", method: method, args: args}, function(res) {
      if (res && res.error) reject(res.error);
      else fulfill(res);
    })
  })
}

function detectTabLanguage(tabId) {
  return new Promise(function(fulfill) {
    brapi.tabs.detectLanguage(tabId, fulfill)
  })
  .then(function(lang) {
    if (lang == "und") return undefined
    return lang
  })
  .catch(function(err) {
    console.error(err)
    return undefined
  })
}

function truncateRepeatedChars(text, max) {
  var result = ""
  var startIndex = 0
  var count = 1
  for (var i=1; i<text.length; i++) {
    if (text.charCodeAt(i) == text.charCodeAt(i-1) && !/^\d$/.test(text.charAt(i))) {
      count++
      if (count == max) result += text.slice(startIndex, i+1)
    }
    else {
      if (count >= max) startIndex = i
      count = 1
    }
  }
  if (count < max) result += text.slice(startIndex)
  return result
}

function playAudioHere(urlPromise, options, startTime) {
  const audio = getSingletonAudio()
  audio.pause()
  if (!isIOS()) {
    audio.defaultPlaybackRate = (options.rate || 1) * (options.rateAdjust || 1)
    audio.volume = options.volume || 1
  }
  const silenceTrack = getSilenceTrack()

  const timeoutPromise = waitMillis(10*1000)
    .then(() => Promise.reject(new Error("Timeout, TTS never started, try picking another voice?")))
  const {abortPromise, abort} = makeAbortable()
  const readyPromise = Promise.resolve(urlPromise)
    .then(async url => {
      const canPlayPromise = new Promise((fulfill, reject) => {
        audio.oncanplay = fulfill
        audio.onerror = () => reject(new Error(audio.error.message || audio.error.code))
      })
      audio.src = url
      await canPlayPromise

      if (startTime) {
        const waitTime = startTime - Date.now()
        if (waitTime > 0) await waitMillis(waitTime)
      }
    })

  const startPromise = Promise.race([readyPromise, abortPromise, timeoutPromise])
    .then(async () => {
      await audio.play()
        .catch(err => {
          if (err instanceof DOMException) throw new Error(err.name || err.message)
          else throw err
        })
      silenceTrack.start()
    })

  const endPromise = new Promise((fulfill, reject) => {
    audio.onended = fulfill
    audio.onerror = () => reject(new Error(audio.error.message || audio.error.code))
  })
  .finally(() => silenceTrack.stop())

  return {
    startPromise,
    endPromise: endPromise,
    pause() {
      abort(new Error("Aborted"))
      audio.pause()
      silenceTrack.stop()
    },
    async resume() {
      await audio.play()
      silenceTrack.start()
      return true
    }
  }
}

function canUseEmbeddedPlayer() {
  return brapi.tts && brapi.offscreen ? true : false
  //without chrome.tts, using WebSpeech inside tab requires initial page interaction
  //without offscreen, playing audio inside tab requires initial page interaction
}

function makeSilenceTrack() {
  const audio = new Audio(brapi.runtime.getURL("sound/silence.mp3"))
  audio.loop = true
  const stateMachine = new StateMachine({
    IDLE: {
      start() {
        audio.play().catch(console.error)
        return "PLAYING"
      },
      stop() {}
    },
    PLAYING: {
      start() {},
      stop() {
        return "STOPPING"
      }
    },
    STOPPING: {
      onTransitionIn() {
        this.timer = setTimeout(() => stateMachine.trigger("onStop"), 15*1000)
      },
      onStop() {
        audio.pause()
        return "IDLE"
      },
      start() {
        clearTimeout(this.timer)
        return "PLAYING"
      },
      stop() {}
    }
  })
  return {
    start() {
      stateMachine.trigger("start")
    },
    stop() {
      stateMachine.trigger("stop")
    }
  }
}

async function getRemoteConfig() {
  let {remoteConfig} = await getSettings("remoteConfig")
  if (remoteConfig && remoteConfig.expire > Date.now()) {
    //still valid, return stored object
    return remoteConfig
  }
  try {
    //attempt to get latest from server
    remoteConfig = await ajaxGet({url: config.serviceUrl + "/read-aloud/config", responseType: "json"})
  }
  catch (err) {
    console.error(err)
    //if fail, use the expired object or create a dummy
    if (!remoteConfig) remoteConfig = {}
  }
  //dont check again for an hour
  remoteConfig.expire = Date.now() + 3600*1000
  await updateSettings({remoteConfig})
  return remoteConfig
}

function makeAbortable() {
  let abort
  return {
    abortPromise: new Promise((f,r) => abort = r),
    abort
  }
}

/**
 * Repeat an action
 * @param {Object} opt - options
 * @param {Function} opt.action - action to repeat
 * @param {Function} opt.until - termination condition
 * @param {Number} opt.delay - delay between actions
 * @param {Number} opt.max - maximum number of repetitions
 * @returns {Promise}
 */
function repeat(opt) {
  if (!opt || !opt.action) throw new Error("Missing action")
  return iter(1)
  function iter(n) {
    return Promise.resolve()
      .then(opt.action)
      .then(function(result) {
        if (opt.until && opt.until(result)) return result
        if (opt.max && n >= opt.max) return result
        if (!opt.delay) return iter(n+1)
        return new Promise(function(f) {setTimeout(f, opt.delay)}).then(iter.bind(null, n+1))
      })
  }
}

function when(pred, val) {
  if (typeof pred == "function" ? pred() : pred) {
    return {
      when() {
        return this
      },
      else() {
        return typeof val == "function" ? val() : val
      }
    }
  }
  else {
    return {
      when,
      else(val) {
        return typeof val == "function" ? val() : val
      }
    }
  }
}

function removeAllAttrs(el, recursive) {
  while (el.attributes.length > 0) el.removeAttribute(el.attributes[0].name)
  if (recursive) for (const child of el.children) removeAllAttrs(child, true)
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
    }
  })
}

var languageTable = (function() {
  const nameFromCode = new Map([
    ['af', 'Afrikaans'],
    ['af-ZA', 'Afrikaans (South Africa)'],
    ['ar', 'Arabic'],
    ['ar-AE', 'Arabic (U.A.E.)'],
    ['ar-BH', 'Arabic (Bahrain)'],
    ['ar-DZ', 'Arabic (Algeria)'],
    ['ar-EG', 'Arabic (Egypt)'],
    ['ar-IQ', 'Arabic (Iraq)'],
    ['ar-JO', 'Arabic (Jordan)'],
    ['ar-KW', 'Arabic (Kuwait)'],
    ['ar-LB', 'Arabic (Lebanon)'],
    ['ar-LY', 'Arabic (Libya)'],
    ['ar-MA', 'Arabic (Morocco)'],
    ['ar-OM', 'Arabic (Oman)'],
    ['ar-QA', 'Arabic (Qatar)'],
    ['ar-SA', 'Arabic (Saudi Arabia)'],
    ['ar-SY', 'Arabic (Syria)'],
    ['ar-TN', 'Arabic (Tunisia)'],
    ['ar-YE', 'Arabic (Yemen)'],
    ['az', 'Azeri (Latin)'],
    ['az-AZ', 'Azeri (Latin) (Azerbaijan)'],
    ['az-AZ', 'Azeri (Cyrillic) (Azerbaijan)'],
    ['be', 'Belarusian'],
    ['be-BY', 'Belarusian (Belarus)'],
    ['bg', 'Bulgarian'],
    ['bg-BG', 'Bulgarian (Bulgaria)'],
    ['bs-BA', 'Bosnian (Bosnia and Herzegovina)'],
    ['ca', 'Catalan'],
    ['ca-ES', 'Catalan (Spain)'],
    ['cs', 'Czech'],
    ['cs-CZ', 'Czech (Czech Republic)'],
    ['cy', 'Welsh'],
    ['cy-GB', 'Welsh (United Kingdom)'],
    ['da', 'Danish'],
    ['da-DK', 'Danish (Denmark)'],
    ['de', 'German'],
    ['de-AT', 'German (Austria)'],
    ['de-CH', 'German (Switzerland)'],
    ['de-DE', 'German (Germany)'],
    ['de-LI', 'German (Liechtenstein)'],
    ['de-LU', 'German (Luxembourg)'],
    ['dv', 'Divehi'],
    ['dv-MV', 'Divehi (Maldives)'],
    ['el', 'Greek'],
    ['el-GR', 'Greek (Greece)'],
    ['en', 'English'],
    ['en-AU', 'English (Australia)'],
    ['en-BZ', 'English (Belize)'],
    ['en-CA', 'English (Canada)'],
    ['en-CB', 'English (Caribbean)'],
    ['en-GB', 'English (United Kingdom)'],
    ['en-IE', 'English (Ireland)'],
    ['en-IN', 'English (Indian)'],
    ['en-JM', 'English (Jamaica)'],
    ['en-NZ', 'English (New Zealand)'],
    ['en-PH', 'English (Republic of the Philippines)'],
    ['en-TT', 'English (Trinidad and Tobago)'],
    ['en-US', 'English (United States)'],
    ['en-ZA', 'English (South Africa)'],
    ['en-ZW', 'English (Zimbabwe)'],
    ['eo', 'Esperanto'],
    ['es', 'Spanish'],
    ['es-AR', 'Spanish (Argentina)'],
    ['es-BO', 'Spanish (Bolivia)'],
    ['es-CL', 'Spanish (Chile)'],
    ['es-CO', 'Spanish (Colombia)'],
    ['es-CR', 'Spanish (Costa Rica)'],
    ['es-DO', 'Spanish (Dominican Republic)'],
    ['es-EC', 'Spanish (Ecuador)'],
    ['es-ES', 'Spanish (Castilian)'],
    ['es-ES', 'Spanish (Spain)'],
    ['es-GT', 'Spanish (Guatemala)'],
    ['es-HN', 'Spanish (Honduras)'],
    ['es-MX', 'Spanish (Mexico)'],
    ['es-NI', 'Spanish (Nicaragua)'],
    ['es-PA', 'Spanish (Panama)'],
    ['es-PE', 'Spanish (Peru)'],
    ['es-PR', 'Spanish (Puerto Rico)'],
    ['es-PY', 'Spanish (Paraguay)'],
    ['es-SV', 'Spanish (El Salvador)'],
    ['es-UY', 'Spanish (Uruguay)'],
    ['es-VE', 'Spanish (Venezuela)'],
    ['et', 'Estonian'],
    ['et-EE', 'Estonian (Estonia)'],
    ['eu', 'Basque'],
    ['eu-ES', 'Basque (Spain)'],
    ['fa', 'Farsi'],
    ['fa-IR', 'Farsi (Iran)'],
    ['fi', 'Finnish'],
    ['fi-FI', 'Finnish (Finland)'],
    ['fo', 'Faroese'],
    ['fo-FO', 'Faroese (Faroe Islands)'],
    ['fr', 'French'],
    ['fr-BE', 'French (Belgium)'],
    ['fr-CA', 'French (Canada)'],
    ['fr-CH', 'French (Switzerland)'],
    ['fr-FR', 'French (France)'],
    ['fr-LU', 'French (Luxembourg)'],
    ['fr-MC', 'French (Principality of Monaco)'],
    ['gl', 'Galician'],
    ['gl-ES', 'Galician (Spain)'],
    ['gu', 'Gujarati'],
    ['gu-IN', 'Gujarati (India)'],
    ['he', 'Hebrew'],
    ['he-IL', 'Hebrew (Israel)'],
    ['hi', 'Hindi'],
    ['hi-IN', 'Hindi (India)'],
    ['hr', 'Croatian'],
    ['hr-BA', 'Croatian (Bosnia and Herzegovina)'],
    ['hr-HR', 'Croatian (Croatia)'],
    ['hu', 'Hungarian'],
    ['hu-HU', 'Hungarian (Hungary)'],
    ['hy', 'Armenian'],
    ['hy-AM', 'Armenian (Armenia)'],
    ['id', 'Indonesian'],
    ['id-ID', 'Indonesian (Indonesia)'],
    ['is', 'Icelandic'],
    ['is-IS', 'Icelandic (Iceland)'],
    ['it', 'Italian'],
    ['it-CH', 'Italian (Switzerland)'],
    ['it-IT', 'Italian (Italy)'],
    ['ja', 'Japanese'],
    ['ja-JP', 'Japanese (Japan)'],
    ['ka', 'Georgian'],
    ['ka-GE', 'Georgian (Georgia)'],
    ['kk', 'Kazakh'],
    ['kk-KZ', 'Kazakh (Kazakhstan)'],
    ['kn', 'Kannada'],
    ['kn-IN', 'Kannada (India)'],
    ['ko', 'Korean'],
    ['ko-KR', 'Korean (Korea)'],
    ['kok', 'Konkani'],
    ['kok-IN', 'Konkani (India)'],
    ['ky', 'Kyrgyz'],
    ['ky-KG', 'Kyrgyz (Kyrgyzstan)'],
    ['lt', 'Lithuanian'],
    ['lt-LT', 'Lithuanian (Lithuania)'],
    ['lv', 'Latvian'],
    ['lv-LV', 'Latvian (Latvia)'],
    ['mi', 'Maori'],
    ['mi-NZ', 'Maori (New Zealand)'],
    ['mk', 'FYRO Macedonian'],
    ['mk-MK', 'FYRO Macedonian (Former Yugoslav Republic of Macedonia)'],
    ['mn', 'Mongolian'],
    ['mn-MN', 'Mongolian (Mongolia)'],
    ['mr', 'Marathi'],
    ['mr-IN', 'Marathi (India)'],
    ['ms', 'Malay'],
    ['ms-BN', 'Malay (Brunei Darussalam)'],
    ['ms-MY', 'Malay (Malaysia)'],
    ['mt', 'Maltese'],
    ['mt-MT', 'Maltese (Malta)'],
    ['nb', 'Norwegian (Bokm?l)'],
    ['nb-NO', 'Norwegian (Bokm?l) (Norway)'],
    ['nl', 'Dutch'],
    ['nl-BE', 'Dutch (Belgium)'],
    ['nl-NL', 'Dutch (Netherlands)'],
    ['nn-NO', 'Norwegian (Nynorsk) (Norway)'],
    ['ns', 'Northern Sotho'],
    ['ns-ZA', 'Northern Sotho (South Africa)'],
    ['pa', 'Punjabi'],
    ['pa-IN', 'Punjabi (India)'],
    ['pl', 'Polish'],
    ['pl-PL', 'Polish (Poland)'],
    ['ps', 'Pashto'],
    ['ps-AR', 'Pashto (Afghanistan)'],
    ['pt', 'Portuguese'],
    ['pt-BR', 'Portuguese (Brazil)'],
    ['pt-PT', 'Portuguese (Portugal)'],
    ['qu', 'Quechua'],
    ['qu-BO', 'Quechua (Bolivia)'],
    ['qu-EC', 'Quechua (Ecuador)'],
    ['qu-PE', 'Quechua (Peru)'],
    ['ro', 'Romanian'],
    ['ro-RO', 'Romanian (Romania)'],
    ['ru', 'Russian'],
    ['ru-RU', 'Russian (Russia)'],
    ['sa', 'Sanskrit'],
    ['sa-IN', 'Sanskrit (India)'],
    ['se', 'Sami (Northern)'],
    ['se-FI', 'Sami (Northern) (Finland)'],
    ['se-FI', 'Sami (Skolt) (Finland)'],
    ['se-FI', 'Sami (Inari) (Finland)'],
    ['se-NO', 'Sami (Northern) (Norway)'],
    ['se-NO', 'Sami (Lule) (Norway)'],
    ['se-NO', 'Sami (Southern) (Norway)'],
    ['se-SE', 'Sami (Northern) (Sweden)'],
    ['se-SE', 'Sami (Lule) (Sweden)'],
    ['se-SE', 'Sami (Southern) (Sweden)'],
    ['sk', 'Slovak'],
    ['sk-SK', 'Slovak (Slovakia)'],
    ['sl', 'Slovenian'],
    ['sl-SI', 'Slovenian (Slovenia)'],
    ['sq', 'Albanian'],
    ['sq-AL', 'Albanian (Albania)'],
    ['sr-BA', 'Serbian (Latin) (Bosnia and Herzegovina)'],
    ['sr-BA', 'Serbian (Cyrillic) (Bosnia and Herzegovina)'],
    ['sr-SP', 'Serbian (Latin) (Serbia and Montenegro)'],
    ['sr-SP', 'Serbian (Cyrillic) (Serbia and Montenegro)'],
    ['sv', 'Swedish'],
    ['sv-FI', 'Swedish (Finland)'],
    ['sv-SE', 'Swedish (Sweden)'],
    ['sw', 'Swahili'],
    ['sw-KE', 'Swahili (Kenya)'],
    ['syr', 'Syriac'],
    ['syr-SY', 'Syriac (Syria)'],
    ['ta', 'Tamil'],
    ['ta-IN', 'Tamil (India)'],
    ['te', 'Telugu'],
    ['te-IN', 'Telugu (India)'],
    ['th', 'Thai'],
    ['th-TH', 'Thai (Thailand)'],
    ['tl', 'Tagalog'],
    ['tl-PH', 'Tagalog (Philippines)'],
    ['tn', 'Tswana'],
    ['tn-ZA', 'Tswana (South Africa)'],
    ['tr', 'Turkish'],
    ['tr-TR', 'Turkish (Turkey)'],
    ['tt', 'Tatar'],
    ['tt-RU', 'Tatar (Russia)'],
    ['ts', 'Tsonga'],
    ['uk', 'Ukrainian'],
    ['uk-UA', 'Ukrainian (Ukraine)'],
    ['ur', 'Urdu'],
    ['ur-PK', 'Urdu (Islamic Republic of Pakistan)'],
    ['uz', 'Uzbek (Latin)'],
    ['uz-UZ', 'Uzbek (Latin) (Uzbekistan)'],
    ['uz-UZ', 'Uzbek (Cyrillic) (Uzbekistan)'],
    ['vi', 'Vietnamese'],
    ['vi-VN', 'Vietnamese (Viet Nam)'],
    ['xh', 'Xhosa'],
    ['xh-ZA', 'Xhosa (South Africa)'],
    ['zh', 'Chinese'],
    ['zh-CN', 'Chinese (S)'],
    ['zh-HK', 'Chinese (Hong Kong)'],
    ['zh-MO', 'Chinese (Macau)'],
    ['zh-SG', 'Chinese (Singapore)'],
    ['zh-TW', 'Chinese (T)'],
    ['zu', 'Zulu'],
    ['zu-ZA', 'Zulu (South Africa)'],
  ])
  return {
    getNameFromCode(lang) {
      return nameFromCode.get(lang)
    }
  }
})();
