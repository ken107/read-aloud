var brapi = browser;

polyfills();

var config = {
  serviceUrl: "https://support.readaloud.app",
  webAppUrl: "https://readaloud.app",
  pdfViewerUrl: "https://assets.lsdsoftware.com/read-aloud/page-scripts/pdf-upload.html",
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
    'moz-extension://',
    'about:',
  ],
  wavenetPerms: {
    permissions: ["webRequest"],
    origins: ["https://*/"]
  },
  gtranslatePerms: {
    permissions: ["webRequest", "webRequestBlocking"],
    origins: ["https://translate.google.com/*"]
  },
  langList: [
    {code: "ab", name: "аҧсуа бызшәа, аҧсшәа"},
    {code: "aa", name: "Afaraf"},
    {code: "af", name: "Afrikaans"},
    {code: "ak", name: "Akan"},
    {code: "sq", name: "Shqip"},
    {code: "am", name: "አማርኛ"},
    {code: "ar", name: "العربية"},
    {code: "hy", name: "Հայերեն"},
    {code: "as", name: "অসমীয়া"},
    {code: "av", name: "авар мацӀ, магӀарул мацӀ"},
    {code: "ae", name: "avesta"},
    {code: "ay", name: "aymar aru"},
    {code: "az", name: "azərbaycan dili, تۆرکجه"},
    {code: "bm", name: "bamanankan"},
    {code: "ba", name: "башҡорт теле"},
    {code: "eu", name: "euskara, euskera"},
    {code: "be", name: "беларуская мова"},
    {code: "bn", name: "বাংলা"},
    {code: "bi", name: "Bislama"},
    {code: "bs", name: "bosanski jezik"},
    {code: "br", name: "brezhoneg"},
    {code: "bg", name: "български език"},
    {code: "my", name: "ဗမာစာ"},
    {code: "ca", name: "català, valencià"},
    {code: "ch", name: "Chamoru"},
    {code: "ce", name: "нохчийн мотт"},
    {code: "ny", name: "chiCheŵa, chinyanja"},
    {code: "zh", name: "中文 (Zhōngwén), 汉语, 漢語"},
    {code: "cv", name: "чӑваш чӗлхи"},
    {code: "kw", name: "Kernewek"},
    {code: "co", name: "corsu, lingua corsa"},
    {code: "cr", name: "ᓀᐦᐃᔭᐍᐏᐣ"},
    {code: "hr", name: "hrvatski jezik"},
    {code: "cs", name: "čeština, český jazyk"},
    {code: "da", name: "dansk"},
    {code: "dv", name: "ދިވެހި"},
    {code: "nl", name: "Nederlands, Vlaams"},
    {code: "dz", name: "རྫོང་ཁ"},
    {code: "en", name: "English"},
    {code: "et", name: "eesti, eesti keel"},
    {code: "ee", name: "Eʋegbe"},
    {code: "fo", name: "føroyskt"},
    {code: "fj", name: "vosa Vakaviti"},
    {code: "fi", name: "suomi, suomen kieli"},
    {code: "fr", name: "français"},
    {code: "ff", name: "Fulfulde, Pulaar, Pular"},
    {code: "gl", name: "Galego"},
    {code: "ka", name: "ქართული"},
    {code: "de", name: "Deutsch"},
    {code: "el", name: "ελληνικά"},
    {code: "gn", name: "Avañe'ẽ"},
    {code: "gu", name: "ગુજરાતી"},
    {code: "ht", name: "Kreyòl ayisyen"},
    {code: "ha", name: "(Hausa) هَوُسَ"},
    {code: "he", name: "עברית"},
    {code: "hz", name: "Otjiherero"},
    {code: "hi", name: "हिन्दी, हिंदी"},
    {code: "ho", name: "Hiri Motu"},
    {code: "hu", name: "magyar"},
    {code: "ia", name: "Interlingua"},
    {code: "id", name: "Bahasa Indonesia"},
    {code: "ga", name: "Gaeilge"},
    {code: "ig", name: "Asụsụ Igbo"},
    {code: "ik", name: "Iñupiaq, Iñupiatun"},
    {code: "is", name: "Íslenska"},
    {code: "it", name: "Italiano"},
    {code: "iu", name: "ᐃᓄᒃᑎᑐᑦ"},
    {code: "ja", name: "日本語 (にほんご)"},
    {code: "jv", name: "ꦧꦱꦗꦮ, Basa Jawa"},
    {code: "kl", name: "kalaallisut, kalaallit oqaasii"},
    {code: "kn", name: "ಕನ್ನಡ"},
    {code: "ks", name: "कश्मीरी, كشميري‎"},
    {code: "kk", name: "қазақ тілі"},
    {code: "km", name: "ខ្មែរ, ខេមរភាសា, ភាសាខ្មែរ"},
    {code: "ki", name: "Gĩkũyũ"},
    {code: "rw", name: "Ikinyarwanda"},
    {code: "ky", name: "Кыргызча, Кыргыз тили"},
    {code: "kv", name: "коми кыв"},
    {code: "kg", name: "Kikongo"},
    {code: "ko", name: "한국어"},
    {code: "ku", name: "Kurdî, کوردی‎"},
    {code: "kj", name: "Kuanyama"},
    {code: "la", name: "latine, lingua latina"},
    {code: "lb", name: "Lëtzebuergesch"},
    {code: "lg", name: "Luganda"},
    {code: "li", name: "Limburgs"},
    {code: "ln", name: "Lingála"},
    {code: "lo", name: "ພາສາລາວ"},
    {code: "lt", name: "lietuvių kalba"},
    {code: "lu", name: "Kiluba"},
    {code: "lv", name: "latviešu valoda"},
    {code: "gv", name: "Gaelg, Gailck"},
    {code: "mk", name: "македонски јазик"},
    {code: "mg", name: "fiteny malagasy"},
    {code: "ms", name: "Bahasa Melayu, بهاس ملايو‎"},
    {code: "ml", name: "മലയാളം"},
    {code: "mt", name: "Malti"},
    {code: "mi", name: "te reo Māori"},
    {code: "mr", name: "मराठी"},
    {code: "mh", name: "Kajin M̧ajeļ"},
    {code: "mn", name: "Монгол хэл"},
    {code: "na", name: "Dorerin Naoero"},
    {code: "nv", name: "Diné bizaad"},
    {code: "nd", name: "isiNdebele"},
    {code: "ne", name: "नेपाली"},
    {code: "ng", name: "Owambo"},
    {code: "nb", name: "Norsk Bokmål"},
    {code: "nn", name: "Norsk Nynorsk"},
    {code: "no", name: "Norsk"},
    {code: "ii", name: "ꆈꌠ꒿ Nuosuhxop"},
    {code: "nr", name: "isiNdebele"},
    {code: "oc", name: "occitan, lenga d'òc"},
    {code: "cu", name: "ѩзыкъ словѣньскъ"},
    {code: "om", name: "Afaan Oromoo"},
    {code: "or", name: "ଓଡ଼ିଆ"},
    {code: "os", name: "ирон ӕвзаг"},
    {code: "pa", name: "ਪੰਜਾਬੀ, پنجابی‎"},
    {code: "fa", name: "فارسی"},
    {code: "pl", name: "język polski, polszczyzna"},
    {code: "ps", name: "پښتو"},
    {code: "pt", name: "Português"},
    {code: "qu", name: "Runa Simi, Kichwa"},
    {code: "rm", name: "Rumantsch Grischun"},
    {code: "rn", name: "Ikirundi"},
    {code: "ro", name: "Română, Moldovenească"},
    {code: "ru", name: "русский"},
    {code: "sa", name: "संस्कृतम्, 𑌸𑌂𑌸𑍍𑌕𑍃𑌤𑌮𑍍"},
    {code: "sc", name: "sardu"},
    {code: "sd", name: "सिन्धी, سنڌي، سندھی‎"},
    {code: "se", name: "Davvisámegiella"},
    {code: "sm", name: "gagana fa'a Samoa"},
    {code: "sg", name: "yângâ tî sängö"},
    {code: "sr", name: "српски језик"},
    {code: "gd", name: "Gàidhlig"},
    {code: "sn", name: "chiShona"},
    {code: "si", name: "සිංහල"},
    {code: "sk", name: "Slovenčina, Slovenský jazyk"},
    {code: "sl", name: "Slovenski jezik, Slovenščina"},
    {code: "so", name: "Soomaaliga, af Soomaali"},
    {code: "st", name: "Sesotho"},
    {code: "es", name: "Español"},
    {code: "su", name: "Basa Sunda"},
    {code: "sw", name: "Kiswahili"},
    {code: "ss", name: "SiSwati"},
    {code: "sv", name: "Svenska"},
    {code: "ta", name: "தமிழ்"},
    {code: "te", name: "తెలుగు"},
    {code: "tg", name: "тоҷикӣ, toçikī, تاجیکی‎"},
    {code: "th", name: "ไทย"},
    {code: "ti", name: "ትግርኛ"},
    {code: "bo", name: "བོད་ཡིག"},
    {code: "tk", name: "Türkmen, Түркмен"},
    {code: "tl", name: "Wikang Tagalog"},
    {code: "tn", name: "Setswana"},
    {code: "to", name: "Faka Tonga"},
    {code: "tr", name: "Türkçe"},
    {code: "ts", name: "Xitsonga"},
    {code: "tt", name: "татар теле, tatar tele"},
    {code: "ty", name: "Reo Tahiti"},
    {code: "ug", name: "ئۇيغۇرچە‎, Uyghurche"},
    {code: "uk", name: "Українська"},
    {code: "ur", name: "اردو"},
    {code: "uz", name: "Oʻzbek, Ўзбек, أۇزبېك‎"},
    {code: "ve", name: "Tshivenḓa"},
    {code: "vi", name: "Tiếng Việt"},
    {code: "wa", name: "Walon"},
    {code: "cy", name: "Cymraeg"},
    {code: "wo", name: "Wollof"},
    {code: "fy", name: "Frysk"},
    {code: "xh", name: "isiXhosa"},
    {code: "yo", name: "Yorùbá"},
    {code: "za", name: "Saɯ cueŋƅ, Saw cuengh"},
    {code: "zu", name: "isiZulu"},
  ],
}

var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  showHighlighting: 1,
  highlightFontSize: 3,
  highlightWindowSize: 2,
};

if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.addEventListener("DOMContentLoaded", function() {
    document.body.classList.add("dark-mode")
  })
}


/**
 * HELPERS
 */
function lazy(get) {
  var value
  return () => value || (value = get())
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

function parseUrl(url) {
  var parser = document.createElement("A");
  parser.href = url;
  return parser;
}


/**
 * SETTINGS
 */
function getSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.get(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize", "preferredVoices"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
}

function clearSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.remove(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages", "highlightFontSize", "highlightWindowSize", "preferredVoices"], fulfill);
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


/**
 * VOICES
 */
function getVoices() {
  return getSettings(["awsCreds", "gcpCreds"])
    .then(function(settings) {
      return Promise.all([
        browserTtsEngine.getVoices(),
        googleTranslateTtsEngine.getVoices(),
        remoteTtsEngine.getVoices(),
        settings.awsCreds ? amazonPollyTtsEngine.getVoices() : [],
        settings.gcpCreds ? googleWavenetTtsEngine.getVoices() : [],
        ibmWatsonTtsEngine.getVoices(),
        phoneTtsEngine.getVoices(),
      ])
    })
    .then(function(arr) {
      return Array.prototype.concat.apply([], arr);
    })
}

function isOfflineVoice(voice) {
  return voice.localService == true
}

function isGoogleNative(voice) {
  return /^Google\s/.test(voice.voiceName);
}

function isChromeOSNative(voice) {
  return /^Chrome\sOS\s/.test(voice.voiceName);
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
  return /^Google(Standard|Wavenet|Neural2) /.test(voice.voiceName);
}

function isIbmWatson(voice) {
  return /^IBM-Watson /.test(voice.voiceName);
}

function isUseMyPhone(voice) {
  return voice.isUseMyPhone == true
}

function isRemoteVoice(voice) {
  return isAmazonCloud(voice) || isMicrosoftCloud(voice) || isReadAloudCloud(voice) || isGoogleTranslate(voice) || isGoogleWavenet(voice) || isAmazonPolly(voice) || isIbmWatson(voice);
}

function isPremiumVoice(voice) {
  return isAmazonCloud(voice) || isMicrosoftCloud(voice);
}

function getSpeechVoice(voiceName, lang) {
  return Promise.all([getVoices(), getSettings(["preferredVoices"])])
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
          || findVoiceByLang(voices.filter(isReadAloudCloud), lang)
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
function executeFile(file) {
  return new Promise(function(fulfill, reject) {
    brapi.tabs.executeScript({file: file}, function(result) {
      if (brapi.runtime.lastError) reject(new Error(brapi.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function executeScript(details) {
  console.log(details);
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
  var opts = typeof sUrl == "string" ? {url: sUrl} : sUrl;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", opts.url, true);
    if (opts.headers) for (var name in opts.headers) xhr.setRequestHeader(name, opts.headers[name]);
    if (opts.responseType) xhr.responseType = opts.responseType;
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) fulfill(xhr.response);
        else if (reject) {
          var err = new Error("Failed to fetch " + opts.url.substr(0, 100));
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
        else reject(new Error("Failed to fetch " + sUrl.substr(0, 100)));
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


/**
 * POLYFILLS
 */
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

if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, 'flat', {
    configurable: true,
    writable: true,
    value: function () {
      var depth =
        typeof arguments[0] === 'undefined' ? 1 : Number(arguments[0]) || 0;
      var result = [];
      var forEach = result.forEach;

      var flatDeep = function (arr, depth) {
        forEach.call(arr, function (val) {
          if (depth > 0 && Array.isArray(val)) {
            flatDeep(val, depth - 1);
          } else {
            result.push(val);
          }
        });
      };

      flatDeep(this, depth);
      return result;
    },
  });
}

if (!Array.prototype.flatMap) {
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true,
    writable: true,
    value: function () {
      return Array.prototype.map.apply(this, arguments).flat(1);
    },
  });
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

function getAccountInfo(authToken) {
  return ajaxGet(config.serviceUrl + "/read-aloud/get-account?t=" + authToken)
    .then(JSON.parse)
    .then(function(account) {
      account.balance += account.freeBalance;
      return account;
    })
    .catch(function(err) {
      if (err.xhr && err.xhr.status == 401) return clearSettings(["authToken"]).then(function() {return null});
      else throw err;
    })
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

function getFrameTexts(tabId, frameId, scripts) {
  return new Promise(function(fulfill, reject) {
    function onConnect(port) {
      if (port.name == "ReadAloudGetTextsScript") {
        brapi.runtime.onConnect.removeListener(onConnect);
        var peer = new RpcPeer(new ExtensionMessagingPeer(port));
        peer.onInvoke = function(method, arg0) {
          clearTimeout(timer);
          if (method == "onTexts") fulfill(arg0);
          else reject(new Error("Unexpected"));
        }
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
    var tasks = scripts.map(function(file) {
      return executeScript.bind(null, {file: file, tabId: tabId, frameId: frameId});
    })
    inSequence(tasks).catch(onError);
    var timer = setTimeout(onTimeout, 15000);
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
    brapi.runtime.sendMessage({method: method, args: args}, function(res) {
      if (res && res.error) reject(new Error(res.error));
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


/**
 * AWS client
 */
const AwsPolly = (function() {
  const encoder = new TextEncoder('utf-8')

  const HOST_SERVICES = {
    'appstream2': 'appstream',
    'cloudhsmv2': 'cloudhsm',
    'email': 'ses',
    'git-codecommit': 'codecommit',
    'marketplace': 'aws-marketplace',
    'mobile': 'AWSMobileHubService',
    'mturk-requester-sandbox': 'mturk-requester',
    'pinpoint': 'mobiletargeting',
    'queue': 'sqs',
    'personalize-runtime': 'personalize',
  }

  // https://github.com/aws/aws-sdk-js/blob/cc29728c1c4178969ebabe3bbe6b6f3159436394/lib/signers/v4.js#L190-L198
  const UNSIGNABLE_HEADERS = [
    'authorization',
    'content-type',
    'content-length',
    'user-agent',
    'presigned-expires',
    'expect',
    'x-amzn-trace-id',
    'range',
  ]

  class AwsClient {
    constructor({ accessKeyId, secretAccessKey, sessionToken, service, region, cache, retries, initRetryMs }) {
      if (accessKeyId == null) throw new TypeError('accessKeyId is a required option')
      if (secretAccessKey == null) throw new TypeError('secretAccessKey is a required option')
      this.accessKeyId = accessKeyId
      this.secretAccessKey = secretAccessKey
      this.sessionToken = sessionToken
      this.service = service
      this.region = region
      this.cache = cache || new Map()
      this.retries = retries != null ? retries : 10 // Up to 25.6 secs
      this.initRetryMs = initRetryMs || 50
    }

    async sign(input, init) {
      if (input instanceof Request) {
        const { method, url, headers, body } = input
        init = Object.assign({ method, url, headers }, init)
        if (init.body == null && headers.has('Content-Type')) {
          init.body = body != null && headers.has('X-Amz-Content-Sha256') ? body : await input.clone().arrayBuffer()
        }
        input = url
      }
      const signer = new AwsV4Signer(Object.assign({ url: input }, init, this, init && init.aws))
      const signed = Object.assign({}, init, await signer.sign())
      delete signed.aws
      return new Request(signed.url, signed)
    }

    async fetch(input, init) {
      for (let i = 0; i <= this.retries; i++) {
        const fetched = fetch(await this.sign(input, init))
        if (i === this.retries) {
          return fetched // No need to await if we're returning anyway
        }
        const res = await fetched
        if (res.status < 500 && res.status !== 429) {
          return res
        }
        await new Promise(resolve => setTimeout(resolve, Math.random() * this.initRetryMs * Math.pow(2, i)))
      }
    }
  }

  class AwsV4Signer {
    constructor({ method, url, headers, body, accessKeyId, secretAccessKey, sessionToken, service, region, cache, datetime, signQuery, appendSessionToken, allHeaders, singleEncode }) {
      if (url == null) throw new TypeError('url is a required option')
      if (accessKeyId == null) throw new TypeError('accessKeyId is a required option')
      if (secretAccessKey == null) throw new TypeError('secretAccessKey is a required option')

      this.method = method || (body ? 'POST' : 'GET')
      this.url = new URL(url)
      this.headers = new Headers(headers)
      this.body = body

      this.accessKeyId = accessKeyId
      this.secretAccessKey = secretAccessKey
      this.sessionToken = sessionToken

      let guessedService, guessedRegion
      if (!service || !region) {
        ;[guessedService, guessedRegion] = guessServiceRegion(this.url, this.headers)
      }
      this.service = service || guessedService
      this.region = region || guessedRegion

      this.cache = cache || new Map()
      this.datetime = datetime || new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
      this.signQuery = signQuery
      this.appendSessionToken = appendSessionToken || this.service === 'iotdevicegateway'

      this.headers.delete('Host') // Can't be set in insecure env anyway

      const params = this.signQuery ? this.url.searchParams : this.headers
      if (this.service === 's3' && !this.headers.has('X-Amz-Content-Sha256')) {
        this.headers.set('X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD')
      }

      params.set('X-Amz-Date', this.datetime)
      if (this.sessionToken && !this.appendSessionToken) {
        params.set('X-Amz-Security-Token', this.sessionToken)
      }

      // headers are always lowercase in keys()
      this.signableHeaders = ['host', ...this.headers.keys()]
        .filter(header => allHeaders || !UNSIGNABLE_HEADERS.includes(header))
        .sort()

      this.signedHeaders = this.signableHeaders.join(';')

      // headers are always trimmed:
      // https://fetch.spec.whatwg.org/#concept-header-value-normalize
      this.canonicalHeaders = this.signableHeaders
        .map(header => header + ':' + (header === 'host' ? this.url.host : this.headers.get(header).replace(/\s+/g, ' ')))
        .join('\n')

      this.credentialString = [this.datetime.slice(0, 8), this.region, this.service, 'aws4_request'].join('/')

      if (this.signQuery) {
        if (this.service === 's3' && !params.has('X-Amz-Expires')) {
          params.set('X-Amz-Expires', 86400) // 24 hours
        }
        params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
        params.set('X-Amz-Credential', this.accessKeyId + '/' + this.credentialString)
        params.set('X-Amz-SignedHeaders', this.signedHeaders)
      }

      if (this.service === 's3') {
        try {
          this.encodedPath = decodeURIComponent(this.url.pathname).replace(/\+/g, ' ')
        } catch (e) {
          this.encodedPath = this.url.pathname
        }
      } else {
        this.encodedPath = this.url.pathname.replace(/\/+/g, '/')
      }
      if (!singleEncode) {
        this.encodedPath = encodeURIComponent(this.encodedPath).replace(/%2F/g, '/')
      }
      this.encodedPath = encodeRfc3986(this.encodedPath)

      const seenKeys = new Set()
      this.encodedSearch = [...this.url.searchParams]
        .filter(([k]) => {
          if (!k) return false // no empty keys
          if (this.service === 's3') {
            if (seenKeys.has(k)) return false // first val only for S3
            seenKeys.add(k)
          }
          return true
        })
        .map(pair => pair.map(p => encodeRfc3986(encodeURIComponent(p))))
        .sort(([k1, v1], [k2, v2]) => k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0)
        .map(pair => pair.join('='))
        .join('&')
    }

    async sign() {
      if (this.signQuery) {
        this.url.searchParams.set('X-Amz-Signature', await this.signature())
        if (this.sessionToken && this.appendSessionToken) {
          this.url.searchParams.set('X-Amz-Security-Token', this.sessionToken)
        }
      } else {
        this.headers.set('Authorization', await this.authHeader())
      }

      return {
        method: this.method,
        url: this.url,
        headers: this.headers,
        body: this.body,
      }
    }

    async authHeader() {
      return [
        'AWS4-HMAC-SHA256 Credential=' + this.accessKeyId + '/' + this.credentialString,
        'SignedHeaders=' + this.signedHeaders,
        'Signature=' + (await this.signature()),
      ].join(', ')
    }

    async signature() {
      const date = this.datetime.slice(0, 8)
      const cacheKey = [this.secretAccessKey, date, this.region, this.service].join()
      let kCredentials = this.cache.get(cacheKey)
      if (!kCredentials) {
        const kDate = await hmac('AWS4' + this.secretAccessKey, date)
        const kRegion = await hmac(kDate, this.region)
        const kService = await hmac(kRegion, this.service)
        kCredentials = await hmac(kService, 'aws4_request')
        this.cache.set(cacheKey, kCredentials)
      }
      return hmac(kCredentials, await this.stringToSign(), 'hex')
    }

    async stringToSign() {
      return [
        'AWS4-HMAC-SHA256',
        this.datetime,
        this.credentialString,
        await hash(await this.canonicalString(), 'hex'),
      ].join('\n')
    }

    async canonicalString() {
      return [
        this.method.toUpperCase(),
        this.encodedPath,
        this.encodedSearch,
        this.canonicalHeaders + '\n',
        this.signedHeaders,
        await this.hexBodyHash(),
      ].join('\n')
    }

    async hexBodyHash() {
      if (this.headers.has('X-Amz-Content-Sha256')) {
        return this.headers.get('X-Amz-Content-Sha256')
      } else {
        return hash(this.body || '', 'hex')
      }
    }
  }

  async function hmac(key, string, encoding) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      typeof key === 'string' ? encoder.encode(key) : key,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    )
    const signed = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(string))
    return encoding === 'hex' ? buf2hex(signed) : signed
  }

  async function hash(content, encoding) {
    const digest = await crypto.subtle.digest('SHA-256', typeof content === 'string' ? encoder.encode(content) : content)
    return encoding === 'hex' ? buf2hex(digest) : digest
  }

  function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('0' + x.toString(16)).slice(-2)).join('')
  }

  function encodeRfc3986(urlEncodedStr) {
    return urlEncodedStr.replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  }

  function guessServiceRegion(url, headers) {
    const { hostname, pathname } = url
    const match = hostname.replace('dualstack.', '').match(/([^.]+)\.(?:([^.]*)\.)?amazonaws\.com(?:\.cn)?$/)
    let [service, region] = (match || ['', '']).slice(1, 3)

    if (region === 'us-gov') {
      region = 'us-gov-west-1'
    } else if (region === 's3' || region === 's3-accelerate') {
      region = 'us-east-1'
      service = 's3'
    } else if (service === 'iot') {
      if (hostname.startsWith('iot.')) {
        service = 'execute-api'
      } else if (hostname.startsWith('data.jobs.iot.')) {
        service = 'iot-jobs-data'
      } else {
        service = pathname === '/mqtt' ? 'iotdevicegateway' : 'iotdata'
      }
    } else if (service === 'autoscaling') {
      const targetPrefix = (headers.get('X-Amz-Target') || '').split('.')[0]
      if (targetPrefix === 'AnyScaleFrontendService') {
        service = 'application-autoscaling'
      } else if (targetPrefix === 'AnyScaleScalingPlannerFrontendService') {
        service = 'autoscaling-plans'
      }
    } else if (region == null && service.startsWith('s3-')) {
      region = service.slice(3).replace(/^fips-|^external-1/, '')
      service = 's3'
    } else if (service.endsWith('-fips')) {
      service = service.slice(0, -5)
    } else if (region && /-\d$/.test(service) && !/-\d$/.test(region)) {
      ;[service, region] = [region, service]
    }

    return [HOST_SERVICES[service] || service, region || 'us-east-1']
  }

  class AwsPolly {
    constructor(opts) {
      this.client = new AwsClient(opts);
      this.endpoint = "https://polly." + (opts.region || "us-east-1") + ".amazonaws.com";
    }
    describeVoices() {
      return {
        promise: async () => {
          const res = await this.client.fetch(this.endpoint + "/v1/voices");
          return res.json();
        }
      }
    }
    synthesizeSpeech(opts) {
      return {
        promise: async () => {
          const res = await this.client.fetch(this.endpoint + "/v1/speech", {
            body: JSON.stringify(opts)
          })
          return res.blob();
        }
      }
    }
  }

  return AwsPolly;
})();


function truncateRepeatedChars(text, max) {
  var result = ""
  var startIndex = 0
  var count = 1
  for (var i=1; i<text.length; i++) {
    if (text.charCodeAt(i) == text.charCodeAt(i-1)) {
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
