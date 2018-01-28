var manifest = {
  "manifest_version": 2,

  "name": "__MSG_extension_name__",
  "short_name": "__MSG_extension_short_name__",
  "description": "__MSG_extension_description__",
  "version": "1.2.12",
  "default_locale": "en",

  "browser_action": {
    "default_icon": "img/icon.png",
    "default_popup": "popup.html"
  },
  "icons": {
    "16": "img/icon.png",
    "48": "img/icon.png",
    "128": "img/icon.png"
  },
  "permissions": [
    "activeTab",
    "tts",
    "storage",
    "ttsEngine",
    "contextMenus",
    "https://support.lsdsoftware.com/"
  ],
  "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'",
  "web_accessible_resources": [
    "img/*",
    "js/jquery-ui.min.js",
    "css/jquery-ui.min.css",
    "css/images/*",
    "js/googleDocsUtil.js"
  ],
  "background": {
    "scripts": [
      "js/es6-promise.auto.min.js",
      "js/defaults.js",
      "js/speech.js",
      "js/document.js",
      "js/googletr_tts.js",
      "js/events.js"
    ],
    "persistent": false
  },
  "options_page": "options.html",
  "commands": {
    "play": {
      "suggested_key": {"default": "Alt+Shift+P"},
      "description": "play/pause"
    },
    "stop": {
      "suggested_key": {"default": "Alt+Shift+S"},
      "description": "stop"
    },
    "forward": {
      "suggested_key": {"default": "Alt+Shift+N"},
      "description": "forward"
    },
    "rewind": {
      "suggested_key": {"default": "Alt+Shift+B"},
      "description": "rewind"
    }
  },

  "tts_engine": {
    "voices": [
      {"voice_name": "GoogleTranslate Afrikaans", "lang": "af", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Albanian", "lang": "sq", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Arabic", "lang": "ar", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Armenian", "lang": "hy", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Bengali", "lang": "bn", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Bosnian", "lang": "bs", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Catalan", "lang": "ca", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Chinese", "lang": "zh-CN", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Croatian", "lang": "hr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Czech", "lang": "cs", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Danish", "lang": "da", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Dutch", "lang": "nl", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate English", "lang": "en", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Esperanto", "lang": "eo", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Finnish", "lang": "fi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate French", "lang": "fr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate German", "lang": "de", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Greek", "lang": "el", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hebrew", "lang": "he", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hindi", "lang": "hi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Hungarian", "lang": "hu", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Icelandic", "lang": "is", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Indonesian", "lang": "id", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Italian", "lang": "it", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Japanese", "lang": "ja", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Khmer", "lang": "km", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Korean", "lang": "ko", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Latin", "lang": "la", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Latvian", "lang": "lv", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Macedonian", "lang": "mk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Nepali", "lang": "ne", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Norwegian", "lang": "no", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Polish", "lang": "pl", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Portuguese", "lang": "pt", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Romanian", "lang": "ro", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Russian", "lang": "ru", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Serbian", "lang": "sr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Sinhala", "lang": "si", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Slovak", "lang": "sk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Spanish", "lang": "es", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Swahili", "lang": "sw", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Swedish", "lang": "sv", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Tamil", "lang": "ta", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Thai", "lang": "th", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Turkish", "lang": "tr", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Ukrainian", "lang": "uk", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Vietnamese", "lang": "vi", "event_types": ["start", "end", "error"]},
      {"voice_name": "GoogleTranslate Welsh", "lang": "cy", "event_types": ["start", "end", "error"]},

      {"voice_name": "Amazon Australian English (Nicole)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Australian English (Russell)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Brazilian Portuguese (Ricardo)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Brazilian Portuguese (Vitoria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Amy)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Brian)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon British English (Emma)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Canadian French (Chantal)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Castilian Spanish (Conchita)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Castilian Spanish (Enrique)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Danish (Mads)", "lang": "da-DK", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Danish (Naja)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Dutch (Lotte)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Dutch (Ruben)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon French (Celine)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon French (Mathieu)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon German (Hans)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon German (Marlene)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon German (Vicki)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Icelandic (Dora)", "lang": "is-IS", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Icelandic (Karl)", "lang": "is-IS", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Indian English (Aditi)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Indian English (Raveena)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Italian (Carla)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Italian (Giorgio)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Japanese (Mizuki)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Japanese (Takumi)", "lang": "ja-JP", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Korean (Seoyeon)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Norwegian (Liv)", "lang": "nb-NO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Ewa)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Jacek)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Jan)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Polish (Maja)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Portuguese (Cristiano)", "lang": "pt-PT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Portuguese (Ines)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Romanian (Carmen)", "lang": "ro-RO", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Russian (Maxim)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Russian (Tatyana)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Swedish (Astrid)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Turkish (Filiz)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Ivy)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Joanna)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Joey)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Justin)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Kendra)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Kimberly)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Matthew)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US English (Salli)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US Spanish (Miguel)", "lang": "es-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon US Spanish (Penelope)", "lang": "es-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Welsh (Gwyneth)", "lang": "cy-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Amazon Welsh English (Geraint)", "lang": "en-GB-WLS", "gender": "male", "event_types": ["start", "end", "error"]},

      {"voice_name": "Microsoft Australian English (Catherine)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Australian English (James)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Belgian Dutch (Bart)", "lang": "nl-BE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Brazilian Portuguese (Daniel)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Brazilian Portuguese (Maria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (George)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (Hazel)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft British English (Susan)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian English (Linda)", "lang": "en-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian English (Richard)", "lang": "en-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Caroline)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Claude)", "lang": "fr-CA", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Canadian French (Nathalie)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Catalan (Herena)", "lang": "ca-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Huihui)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Kangkang)", "lang": "zh-CN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Chinese (Yaoyao)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft ChineseTW (Hanhan)", "lang": "zh-TW", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft ChineseTW (Yating)", "lang": "zh-TW", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft ChineseTW (Zhiwei)", "lang": "zh-TW", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Danish (Helle)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Dutch (Frank)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Finnish (Heidi)", "lang": "fi-FI", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Hortense)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Julie)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft French (Paul)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Hedda)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Katja)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft German (Stefan)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Indian English (Heera)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Indian English (Ravi)", "lang": "en-IN", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Italian (Cosimo)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Italian (Elsa)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Ayumi)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Haruka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Ichiro)", "lang": "ja-JP", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Japanese (Sayaka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Korean (Heami)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Mexican Spanish (Raul)", "lang": "es-MX", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Mexican Spanish (Sabina)", "lang": "es-MX", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Norwegian (Jon)", "lang": "nb-NO", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Polish (Adam)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Polish (Paulina)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Portuguese (Helia)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Russian (Irina)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Russian (Pavel)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Helena)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Laura)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Spanish (Pablo)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Swedish (Bengt)", "lang": "sv-SE", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Turkish (Tolga)", "lang": "tr-TR", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (David)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (Mark)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft US English (Zira)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
      {"voice_name": "Microsoft Vietnamese (An)", "lang": "vi-VI", "gender": "male", "event_types": ["start", "end", "error"]}
    ]
  }
}
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
  browser: getBrowser()
}

var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  showHighlighting: 0,
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
    chrome.storage.local.get(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    chrome.storage.local.set(items, fulfill);
  });
}

function clearSettings(names) {
  return new Promise(function(fulfill) {
    chrome.storage.local.remove(names || ["voiceName", "rate", "pitch", "volume", "showHighlighting", "languages"], fulfill);
  });
}

function getState(key) {
  return new Promise(function(fulfill) {
    chrome.storage.local.get(key, function(items) {
      fulfill(items[key]);
    });
  });
}

function setState(key, value) {
  var items = {};
  items[key] = value;
  return new Promise(function(fulfill) {
    chrome.storage.local.set(items, fulfill);
  });
}

function getVoices() {
  return new Promise(function(fulfill) {
    chrome.tts.getVoices(fulfill);
  });
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

function isRemoteVoice(voiceName) {
  return isAmazonPolly(voiceName) || isGoogleTranslate(voiceName) || isMicrosoftCloud(voiceName);
}

function isPremiumVoice(voiceName) {
  return isAmazonPolly(voiceName) || isMicrosoftCloud(voiceName);
}

function executeFile(file) {
  return new Promise(function(fulfill, reject) {
    chrome.runtime.lastError = null;
    chrome.tabs.executeScript({file: file}, function(result) {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function executeScript(code) {
  return new Promise(function(fulfill, reject) {
    chrome.runtime.lastError = null;
    chrome.tabs.executeScript({code: code}, function(result) {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else fulfill(result);
    });
  });
}

function insertCSS(file) {
  return new Promise(function(fulfill, reject) {
    chrome.runtime.lastError = null;
    chrome.tabs.insertCSS({file: file}, function(result) {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else fulfill(result);
    })
  });
}

function getBackgroundPage() {
  return new Promise(function(fulfill) {
    chrome.runtime.getBackgroundPage(fulfill);
  });
}

function spread(f, self) {
  return function(args) {
    return f.apply(self, args);
  };
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
  var message = chrome.i18n.getMessage(err.code);
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

function domReady() {
  return new Promise(function(fulfill) {
    $(fulfill);
  })
}

function setI18nText() {
  $("[data-i18n]").each(function() {
    var key = $(this).data("i18n");
    var text = chrome.i18n.getMessage(key);
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
  switch (config.browser) {
    case 'opera': return 'opera://settings/configureCommands';
    case 'chrome': return 'chrome://extensions/configureCommands';
    default: return chrome.runtime.getURL("shortcuts.html");
  }
}
(function() {
  window.connect = connect;
  window.HtmlDoc = HtmlDoc;

var readAloud = {
  paraSplitter: /(?:\s*\r?\n\s*){2,}/
};

function connect(name) {
  if (!window.docReady) window.docReady = makeDoc();
  window.docReady.then(function(doc) {startService(name, doc)});
}


function startService(name, doc) {
  var port = chrome.runtime.connect({name: name});
  port.onMessage.addListener(dispatch.bind(null, {
    raGetInfo: getInfo,
    raGetCurrentIndex: getCurrentIndex,
    raGetTexts: getTexts,
  }))

  function dispatch(handlers, message) {
    var request = message.request;
    if (handlers[request.method]) {
      var result = handlers[request.method](request);
      Promise.resolve(result).then(function(response) {
        port.postMessage({id: message.id, response: response});
      });
    }
  }

  function getInfo(request) {
    var lang = document.documentElement.lang || $("html").attr("xml:lang");
    if (lang) lang = lang.replace(/_/g, '-');
    if (lang == "en" || lang == "en-US") lang = null;    //foreign language pages often erronenously declare lang="en"
    return {
      redirect: doc.redirect,
      url: location.href,
      title: document.title,
      lang: lang
    }
  }

  function getCurrentIndex(request) {
    if (getSelectedText()) return -100;
    else return doc.getCurrentIndex();
  }

  function getTexts(request) {
    if (request.index < 0) {
      if (request.index == -100) return getSelectedText().split(readAloud.paraSplitter);
      else return null;
    }
    else {
      return Promise.resolve(doc.getTexts(request.index, request.quietly))
        .then(function(texts) {
          if (texts) {
            texts = texts.map(removeLinks);
            if (!request.quietly) console.log(texts.join("\n\n"));
          }
          return texts;
        })
    }
  }

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }

  function removeLinks(text) {
    return text.replace(/https?:\/\/\S+/g, "this URL.");
  }
}


function makeDoc() {
  return domReady()
    .then(createDoc)
    .then(function(doc) {
      return Promise.resolve(doc.ready).then(function() {return doc});
    })

  function domReady() {
    return new Promise(function(fulfill) {
      $(fulfill);
    })
  }

  function createDoc() {
    if (location.hostname == "docs.google.com") {
      if ($(".kix-appview-editor").length) return new GoogleDoc();
      else if ($(".drive-viewer-paginated-scrollable").length) return new GDriveDoc();
      else return new HtmlDoc();
    }
    else if (location.hostname == "drive.google.com") return new GDriveDoc();
    else if (/^read\.amazon\./.test(location.hostname)) return new KindleBook();
    else if (location.hostname == "www.quora.com") return new QuoraPage();
    else if (location.hostname == "www.khanacademy.org") return new KhanAcademy();
    else if (location.hostname == "bookshelf.vitalsource.com") return new VitalSourceBookshelf();
    else if (location.pathname.match(/\.pdf$/)) return new PdfDoc(location.href);
    else if ($("embed[type='application/pdf']").length) return new PdfDoc($("embed[type='application/pdf']").attr("src"));
    else return new HtmlDoc();
  }
}


function GoogleDoc() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

  this.ready = readAloud.loadScript(chrome.runtime.getURL("js/googleDocsUtil.js"));

  this.getCurrentIndex = function() {
    var doc = googleDocsUtil.getGoogleDocument();
    if (doc.selectedText) return 9999;

    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index, quietly) {
    if (index == 9999) {
      var doc = googleDocsUtil.getGoogleDocument();
      return [doc.selectedText];
    }

    var page = pages.get(index);
    if (page) {
      var oldScrollTop = viewport.scrollTop;
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 2000)
        .then(function(result) {
          if (quietly) viewport.scrollTop = oldScrollTop;
          return result;
        })
    }
    else return null;
  }

  function getTexts() {
    return $(".kix-paragraphrenderer", this).get()
      .map(getInnerText)
      .filter(isNotEmpty);
  }
}


function GDriveDoc() {
  var viewport = $(".drive-viewer-paginated-scrollable").get(0);
  var pages = $(".drive-viewer-paginated-page");

  this.getCurrentIndex = function() {
    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index, quietly) {
    var page = pages.get(index);
    if (page) {
      var oldScrollTop = viewport.scrollTop;
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 3000)
        .then(function(result) {
          if (quietly) viewport.scrollTop = oldScrollTop;
          return result;
        })
    }
    else return null;
  }

  function getTexts() {
    var texts = $("p", this).get()
      .map(getInnerText)
      .filter(isNotEmpty);
    return fixParagraphs(texts);
  }
}


function KindleBook() {
  var mainDoc = document.getElementById("KindleReaderIFrame").contentDocument;
  var btnNext = mainDoc.getElementById("kindleReader_pageTurnAreaRight");
  var btnPrev = mainDoc.getElementById("kindleReader_pageTurnAreaLeft");
  var contentFrames = [
    mainDoc.getElementById("column_0_frame_0"),
    mainDoc.getElementById("column_0_frame_1"),
    mainDoc.getElementById("column_1_frame_0"),
    mainDoc.getElementById("column_1_frame_1")
  ];
  var currentIndex = 0;
  var lastText;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    for (; currentIndex<index; currentIndex++) $(btnNext).click();
    for (; currentIndex>index; currentIndex--) $(btnPrev).click();
    return tryGetTexts(getTexts, 4000);
  }

  function getTexts() {
    var texts = [];
    contentFrames.filter(function(frame) {
      return frame.style.visibility != "hidden";
    })
    .forEach(function(frame) {
      var frameHeight = $(frame).height();
      $("h1, h2, h3, h4, h5, h6, .was-a-p", frame.contentDocument).each(function() {
        var top = $(this).offset().top;
        var bottom = top + $(this).height();
        if (top >= 0 && top < frameHeight) texts.push($(this).text());
      })
    })
    var out = [];
    for (var i=0; i<texts.length; i++) {
      if (texts[i] != (out.length ? out[out.length-1] : lastText)) out.push(texts[i]);
    }
    lastText = out[out.length-1];
    return out;
  }
}


function PdfDoc(url) {
  var viewerBase = "https://assets.lsdsoftware.com/read-aloud/pdf-viewer/web/";
  var uploadDialog;
  var foundText;

  if (/^file:/.test(url)) {
    this.ready = readAloud.loadCss(chrome.runtime.getURL("css/jquery-ui.min.css"))
      .then(readAloud.loadScript.bind(null, chrome.runtime.getURL("js/jquery-ui.min.js")))
      .then(createUploadDialog)
      .then(function(dialog) {uploadDialog = dialog})
  }
  else {
    this.ready = readAloud.loadCss(viewerBase + "viewer.css")
      .then(loadViewerHtml)
      .then(showLoadingIcon)
      .then(appendLocaleResourceLink)
      .then(readAloud.loadScript.bind(null, viewerBase + "../build/pdf.js"))
      .then(rebaseUrls)
      .then(readAloud.loadScript.bind(null, viewerBase + "pdf.viewer.js", viewerJsPreprocessor))
      .then(loadPdf)
      .then(hideLoadingIcon)
  }

  function loadViewerHtml() {
    return new Promise(function(fulfill, reject) {
      $.ajax(viewerBase + "viewer.html", {
        dataType: "text",
        success: function(text) {
          var start = text.indexOf(">", text.indexOf("<body")) +1;
          var end = text.indexOf("</body>");
          document.body.innerHTML = text.slice(start, end);
          fulfill();
        },
        error: function() {
          reject(new Error("Failed to load viewer html"));
        }
      })
    })
  }

  function appendLocaleResourceLink() {
    $('<link>')
      .appendTo("head")
      .attr({rel: "resource", type: "application/l10n", href: viewerBase + "locale/locale.properties"});
  }

  function rebaseUrls() {
    var wrap = function(prop) {
      var value = PDFJS[prop];
      Object.defineProperty(PDFJS, prop, {
        enumerable: true,
        configurable: true,
        get: function() {return viewerBase + value},
        set: function(val) {value = val}
      })
    };
    wrap("imageResourcesPath");
    wrap("workerSrc");
    wrap("cMapUrl");
  }

  function viewerJsPreprocessor(text) {
    return text.replace("compressed.tracemonkey-pldi-09.pdf", "");
  }

  function loadPdf() {
    return PDFViewerApplication.open(url)
      .then(function() {
        return new Promise(function(fulfill) {
          PDFViewerApplication.eventBus.on("documentload", fulfill);
        })
      })
  }

  function showLoadingIcon() {
    if (!$(".ra-loading-icon").length) {
      var holder = $("<div>")
        .addClass("ra-loading-icon")
        .css({position: "absolute", left: "50%", top: "50%"})
        .appendTo(document.body)
      $("<img>")
        .attr("src", chrome.runtime.getURL("img/throb.gif"))
        .css({position: "relative", width: 48, left: -24, top: -24})
        .appendTo(holder)
    }
    $(".ra-loading-icon").show();
  }

  function hideLoadingIcon() {
    $(".ra-loading-icon").hide();
  }

  this.getCurrentIndex = function() {
    if (uploadDialog) {
      return 0;
    }
    var pageNo = PDFViewerApplication.page;
    return pageNo ? pageNo-1 : 0;
  }

  this.getTexts = function(index, quietly) {
    if (uploadDialog) {
      uploadDialog.show();
      return null;
    }
    var pdf = PDFViewerApplication.pdfDocument;
    if (index < pdf.numPages) {
      if (!quietly) PDFViewerApplication.page = index+1;
      return pdf.getPage(index+1)
        .then(getPageTexts)
        .then(function(texts) {
          if (texts.length) foundText = true;
          return texts;
        })
    }
    else {
      if (!foundText) showNoTextExplanation();
      return null;
    }
  }

  function getPageTexts(page) {
    return page.getTextContent()
      .then(function(content) {
        var lines = [];
        for (var i=0; i<content.items.length; i++) {
          if (lines.length == 0 || i > 0 && content.items[i-1].transform[5] != content.items[i].transform[5]) lines.push("");
          lines[lines.length-1] += content.items[i].str;
        }
        return lines.map(function(line) {return line.trim()});
      })
      .then(fixParagraphs)
  }

  function createUploadDialog() {
    var div = $("<div>");
    $("<p>")
      .text(formatMessage({code: "uploadpdf_message1", extension_name: chrome.i18n.getMessage("extension_short_name")}))
      .css("color", "blue")
      .appendTo(div);
    $("<p>")
      .text(formatMessage({code: "uploadpdf_message2", extension_name: chrome.i18n.getMessage("extension_short_name")}))
      .appendTo(div);
    var form = $("<form>")
      .attr("action", "https://support2.lsdsoftware.com/dropmeafile-readaloud/upload")
      .attr("method", "POST")
      .attr("enctype", "multipart/form-data")
      .on("submit", function() {
        btnSubmit.prop("disabled", true);
      })
      .appendTo(div);
    $("<input>")
      .attr("type", "file")
      .attr("name", "fileToUpload")
      .attr("accept", "application/pdf")
      .on("change", function() {
        btnSubmit.prop("disabled", !$(this).val())
      })
      .appendTo(form);
    $("<br>")
      .appendTo(form);
    $("<br>")
      .appendTo(form);
    var btnSubmit = $("<input>")
      .attr("type", "submit")
      .attr("value", chrome.i18n.getMessage("uploadpdf_submit_button"))
      .prop("disabled", true)
      .appendTo(form);

    div.dialog({
        title: chrome.i18n.getMessage("extension_short_name"),
        width: 450,
        modal: true,
        autoOpen: false
      })
    return {
      show: function() {
        div.dialog("open");
      }
    }
  }

  function showNoTextExplanation() {
    Promise.resolve()
      .then(function() {
        if (!$.ui)
          return readAloud.loadCss(chrome.runtime.getURL("css/jquery-ui.min.css"))
            .then(readAloud.loadScript.bind(null, chrome.runtime.getURL("js/jquery-ui.min.js")))
      })
      .then(function() {
        var div = $("<div>");
        $("<p>")
          .text("I can't find any text to read.  This is probably because this PDF contains scanned images of text instead of the actual text.  If you're unable to select any text using your mouse, it means they are images.")
          .css("color", "blue")
          .appendTo(div);
        div.dialog({
            title: chrome.i18n.getMessage("extension_short_name"),
            width: 450
          })
      })
  }

  function formatMessage(msg) {
    var message = chrome.i18n.getMessage(msg.code);
    if (message) message = message.replace(/{(\w+)}/g, function(m, p1) {return msg[p1]});
    return message;
  }
}


function QuoraPage() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    var texts = [];
    var elem = $(".QuestionArea .question_qtext").get(0);
    if (elem) texts.push(elem.innerText);
    $(".AnswerBase")
      .each(function() {
        elem = $(this).find(".feed_item_answer_user .user").get(0);
        if (elem) texts.push("Answer by " + elem.innerText);
        elem = $(this).find(".rendered_qtext").get(0);
        if (elem) texts.push.apply(texts, elem.innerText.split(readAloud.paraSplitter));
        elem = $(this).find(".AnswerFooter").get(0);
        if (elem) texts.push(elem.innerText);
      })
    return texts;
  }
}


function KhanAcademy() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    return $("h1:first")
      .add($("> :not(ul, ol), > ul > li, > ol > li", ".paragraph:not(.paragraph .paragraph)"))
      .get()
      .map(function(elem) {
        var text = getInnerText(elem);
        if ($(elem).is("li")) return ($(elem).index() + 1) + ". " + text;
        else return text;
      })
  }
}


function VitalSourceBookshelf() {
  this.redirect = true;

  this.getCurrentIndex = function() {
    return 0
  };

  this.getTexts = function() {
    var iframe = $("#jigsaw-placeholder > iframe").get(0);
    if (iframe) location.href = iframe.src;
    return null;
  };
}


function HtmlDoc() {
  var ignoreTags = "select, textarea, button, label, audio, video, dialog, embed, menu, nav, noframes, noscript, object, script, style, svg, aside, footer, #footer";

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    //find blocks containing text
    var start = new Date();
    var textBlocks = findTextBlocks(100);
    var countChars = textBlocks.reduce(function(sum, elem) {return sum + getInnerText(elem).length}, 0);
    console.log("Found", textBlocks.length, "blocks", countChars, "chars in", new Date()-start, "ms");

    if (countChars < 1000) {
      textBlocks = findTextBlocks(3);
      var texts = textBlocks.map(getInnerText);
      console.log("Using lower threshold, found", textBlocks.length, "blocks", texts.join("").length, "chars");

      //trim the head and the tail
      var head, tail;
      for (var i=3; i<texts.length && !head; i++) {
        var dist = getGaussian(texts, 0, i);
        if (texts[i].length > dist.mean + 2*dist.stdev) head = i;
      }
      for (var i=texts.length-4; i>=0 && !tail; i--) {
        var dist = getGaussian(texts, i+1, texts.length);
        if (texts[i].length > dist.mean + 2*dist.stdev) tail = i+1;
      }
      if (head||tail) {
        textBlocks = textBlocks.slice(head||0, tail);
        console.log("Trimmed", head, tail);
      }
    }

    //mark the elements to be read
    var toRead = [];
    for (var i=0; i<textBlocks.length; i++) {
      toRead.push.apply(toRead, findHeadingsFor(textBlocks[i], textBlocks[i-1]));
      toRead.push(textBlocks[i]);
    }
    $(toRead).addClass("read-aloud");   //for debugging only

    //extract texts
    var texts = toRead.map(getTexts);
    return flatten(texts).filter(isNotEmpty);
  }

  function findTextBlocks(threshold) {
    var skipTags = "h1, h2, h3, h4, h5, h6, p, a[href], " + ignoreTags;
    var isTextNode = function(node) {
      return node.nodeType == 3 && node.nodeValue.trim().length >= 3;
    };
    var isParagraph = function(node) {
      return node.nodeType == 1 && $(node).is("p") && getInnerText(node).length >= threshold;
    };
    var hasTextNodes = function(elem) {
      return someChildNodes(elem, isTextNode) && getInnerText(elem).length >= threshold;
    };
    var hasParagraphs = function(elem) {
      return someChildNodes(elem, isParagraph);
    };
    var containsTextBlocks = function(elem) {
      var childElems = $(elem).children(":not(" + skipTags + ")").get();
      return childElems.some(hasTextNodes) || childElems.some(hasParagraphs) || childElems.some(containsTextBlocks);
    };
    var addBlock = function(elem, multi) {
      if (multi) $(elem).data("read-aloud-multi-block", true);
      textBlocks.push(elem);
    };
    var walk = function() {
      if ($(this).is("frame, iframe")) try {walk.call(this.contentDocument.body)} catch(err) {}
      else if ($(this).is("dl")) addBlock(this);
      else if ($(this).is("ol, ul")) {
        var items = $(this).children().get();
        if (items.some(hasTextNodes)) addBlock(this);
        else if (items.some(hasParagraphs)) addBlock(this, true);
        else if (items.some(containsTextBlocks)) addBlock(this, true);
      }
      else if ($(this).is("tbody")) {
        var rows = $(this).children();
        if (rows.length > 3 || rows.eq(0).children().length > 3) {
          if (rows.get().some(containsTextBlocks)) addBlock(this, true);
        }
        else rows.each(walk);
      }
      else {
        if (hasTextNodes(this)) addBlock(this);
        else if (hasParagraphs(this)) addBlock(this, true);
        else $(this).children(":not(" + skipTags + ")").each(walk);
      }
    };
    var textBlocks = [];
    walk.call(document.body);
    return textBlocks.filter(function(elem) {
      return $(elem).is(":visible") && $(elem).offset().left >= 0;
    })
  }

  function getGaussian(texts, start, end) {
    if (start == undefined) start = 0;
    if (end == undefined) end = texts.length;
    var sum = 0;
    for (var i=start; i<end; i++) sum += texts[i].length;
    var mean = sum / (end-start);
    var variance = 0;
    for (var i=start; i<end; i++) variance += (texts[i].length-mean)*(texts[i].length-mean);
    return {mean: mean, stdev: Math.sqrt(variance)};
  }

  function getTexts(elem) {
    var toHide = $(elem).find(":visible").filter(dontRead).hide();
    $(elem).find("ol, ul").addBack("ol, ul").each(addNumbering);
    var texts = $(elem).data("read-aloud-multi-block")
      ? $(elem).children(":visible").get().map(getText)
      : getText(elem).split(readAloud.paraSplitter);
    $(elem).find(".read-aloud-numbering").remove();
    toHide.show();
    return texts;
  }

  function addNumbering() {
    var children = $(this).children();
    var text = children.length ? getInnerText(children.get(0)) : null;
    if (text && !text.match(/^[(]?(\d|[a-zA-Z][).])/))
      children.each(function(index) {
        $("<span>").addClass("read-aloud-numbering").text((index +1) + ". ").prependTo(this);
      })
  }

  function dontRead() {
    var float = $(this).css("float");
    var position = $(this).css("position");
    return $(this).is(ignoreTags) || $(this).is("sup") || float == "right" || position == "fixed";
  }

  function getText(elem) {
    return addMissingPunctuation(elem.innerText).trim();
  }

  function addMissingPunctuation(text) {
    return text.replace(/(\w)(\s*?\r?\n)/g, "$1.$2");
  }

  function findHeadingsFor(block, prevBlock) {
    var result = [];
    var firstInnerElem = $(block).find("h1, h2, h3, h4, h5, h6, p").filter(":visible").get(0);
    var currentLevel = getHeadingLevel(firstInnerElem);
    var node = previousNode(block, true);
    while (node && node != prevBlock) {
      var ignore = $(node).is(ignoreTags);
      if (!ignore && node.nodeType == 1 && $(node).is(":visible")) {
        var level = getHeadingLevel(node);
        if (level < currentLevel) {
          result.push(node);
          currentLevel = level;
        }
      }
      node = previousNode(node, ignore);
    }
    return result.reverse();
  }

  function getHeadingLevel(elem) {
    var matches = elem && /^H(\d)$/i.exec(elem.tagName);
    return matches ? Number(matches[1]) : 100;
  }

  function previousNode(node, skipChildren) {
    if ($(node).is('body')) return null;
    if (node.nodeType == 1 && !skipChildren && node.lastChild) return node.lastChild;
    if (node.previousSibling) return node.previousSibling;
    return previousNode(node.parentNode, true);
  }

  function someChildNodes(elem, test) {
    var child = elem.firstChild;
    while (child) {
      if (test(child)) return true;
      child = child.nextSibling;
    }
    return false;
  }

  function flatten(array) {
    return [].concat.apply([], array);
  }
}


//helpers --------------------------

function getInnerText(elem) {
  var text = elem.innerText;
  return text ? text.trim() : "";
}

function isNotEmpty(text) {
  return text;
}

function fixParagraphs(texts) {
  var out = [];
  var para = "";
  for (var i=0; i<texts.length; i++) {
    if (!texts[i]) {
      if (para) {
        out.push(para);
        para = "";
      }
      continue;
    }
    if (para) {
      if (/-$/.test(para)) para = para.substr(0, para.length-1);
      else para += " ";
    }
    para += texts[i].replace(/-\r?\n/g, "");
    if (texts[i].match(/[.!?:)"'\u2019\u201d]$/)) {
      out.push(para);
      para = "";
    }
  }
  if (para) out.push(para);
  return out;
}

function tryGetTexts(getTexts, millis) {
  return waitMillis(500)
    .then(getTexts)
    .then(function(texts) {
      if (texts && !texts.length && millis-500 > 0) return tryGetTexts(getTexts, millis-500);
      else return texts;
    })

  function waitMillis(millis) {
    return new Promise(function(fulfill) {
      setTimeout(fulfill, millis);
    });
  }
}

readAloud.loadCss = function(url) {
  if (!$("head").length) $("<head>").prependTo("html");
  $("<link>").appendTo("head").attr({type: "text/css", rel: "stylesheet", href: url});
  return Promise.resolve();
}

readAloud.loadScript = function(url, preprocess) {
  return new Promise(function(fulfill, reject) {
    $.ajax(url, {
      dataType: "text",
      success: function(text) {
        eval.call(window, preprocess ? preprocess(text) : text);
        fulfill();
      },
      error: function() {
        reject(new Error("Failed to load script"));
      }
    })
  })
}

})();

function Speech(texts, options) {
  options.rate = (options.rate || 1) * (isGoogleTranslate(options.voiceName) ? 1.2 : 1);

  for (var i=0; i<texts.length; i++) if (/\w$/.test(texts[i])) texts[i] += '.';
  if (texts.length) texts = getChunks(texts.join("\n\n"));

  var engine = options.engine || (isGoogleNative(options.voiceName) ? new TimeoutTtsEngine(new ChromeTtsEngine(), 16*1000) : new ChromeTtsEngine());
  var pauseDuration = isGoogleTranslate(options.voiceName) ? 0 : (650/options.rate);
  var state = "IDLE";
  var index = 0;
  var delayedPlayTimer;

  this.options = options;
  this.play = play;
  this.pause = pause;
  this.stop = stop;
  this.getState = getState;
  this.getPosition = getPosition;
  this.forward = forward;
  this.rewind = rewind;
  this.gotoEnd = gotoEnd;

  function getChunks(text) {
    var isEA = /^zh|ko|ja/.test(options.lang);
    var punctuator = isEA ? new EastAsianPunctuator() : new LatinPunctuator();
    if (isGoogleNative(options.voiceName)) {
      var wordLimit = (/^de/.test(options.lang) ? 32 : 36) * (isEA ? 2 : 1) * options.rate;
      return new WordBreaker(wordLimit, punctuator).breakText(text);
    }
    else {
      if (isGoogleTranslate(options.voiceName)) return new CharBreaker(200, punctuator).breakText(text);
      else return new CharBreaker(500, punctuator, 200).breakText(text);
    }
  }

  function getState() {
    return new Promise(function(fulfill) {
      engine.isSpeaking(function(isSpeaking) {
        if (state == "PLAYING") fulfill(isSpeaking ? "PLAYING" : "LOADING");
        else fulfill("PAUSED");
      })
    })
  }

  function getPosition() {
    return {
      index: index,
      texts: texts,
    }
  }

  function play() {
    if (index >= texts.length) {
      state = "IDLE";
      if (options.onEnd) options.onEnd();
      return Promise.resolve();
    }
    else if (state == "PAUSED") {
      state = "PLAYING";
      engine.resume();
      return Promise.resolve();
    }
    else {
      state = new String("PLAYING");
      state.startTime = new Date().getTime();
      return speak(texts[index],
        function() {
          state = "IDLE";
          engine.setNextStartTime(new Date().getTime() + pauseDuration, options);
          index++;
          play();
        },
        function(err) {
          state = "IDLE";
          if (options.onEnd) options.onEnd(err);
        })
        .then(function() {
          if (texts[index+1]) engine.prefetch(texts[index+1], options);
        })
    }
  }

  function delayedPlay() {
    clearTimeout(delayedPlayTimer);
    delayedPlayTimer = setTimeout(play, 750);
    return Promise.resolve();
  }

  function pause() {
    if (engine.pause) {
      engine.pause();
      state = "PAUSED";
      return Promise.resolve();
    }
    else return stop();
  }

  function stop() {
    engine.stop();
    state = "IDLE";
    return Promise.resolve();
  }

  function forward() {
    if (index+1 < texts.length) {
      index++;
      return delayedPlay();
    }
    else return Promise.reject(new Error("Can't forward, at end"));
  }

  function rewind() {
    if (state == "PLAYING" && new Date().getTime()-state.startTime > 3*1000) {
      return play();
    }
    else if (index > 0) {
      index--;
      return play();
    }
    else return Promise.reject(new Error("Can't rewind, at beginning"));
  }

  function gotoEnd() {
    index = texts.length && texts.length-1;
  }

  function speak(text, onEnd, onError) {
    return new Promise(function(fulfill) {
    engine.speak(text, {
      voiceName: options.voiceName,
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume,
      requiredEventTypes: ["start", "end"],
      desiredEventTypes: ["start", "end", "error"],
    },
    function(event) {
        if (event.type == "start") fulfill();
        else if (event.type == "end") onEnd();
        else if (event.type == "error") onError(new Error(event.errorMessage || "Unknown TTS error"));
    });
    })
  }


//text breakers

function WordBreaker(wordLimit, punctuator) {
  this.breakText = breakText;
  function breakText(text) {
    return merge(punctuator.getParagraphs(text), breakParagraph);
  }
  function breakParagraph(text) {
    return merge(punctuator.getSentences(text), breakSentence);
  }
  function breakSentence(sentence) {
    return merge(punctuator.getPhrases(sentence), breakPhrase);
  }
  function breakPhrase(phrase) {
    var words = punctuator.getWords(phrase);
    var splitPoint = Math.min(Math.ceil(words.length/2), wordLimit);
    var result = [];
    while (words.length) {
      result.push(words.slice(0, splitPoint).join(""));
      words = words.slice(splitPoint);
    }
    return result;
  }
  function merge(parts, breakPart) {
    var result = [];
    var group = {parts: [], wordCount: 0};
    var flush = function() {
      if (group.parts.length) {
        result.push(group.parts.join(""));
        group = {parts: [], wordCount: 0};
      }
    };
    parts.forEach(function(part) {
      var wordCount = punctuator.getWords(part).length;
      if (wordCount > wordLimit) {
        flush();
        var subParts = breakPart(part);
        for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
      }
      else {
        if (group.wordCount + wordCount > wordLimit) flush();
        group.parts.push(part);
        group.wordCount += wordCount;
      }
    });
    flush();
    return result;
  }
}

function CharBreaker(charLimit, punctuator, paragraphCombineThreshold) {
  this.breakText = breakText;
  function breakText(text) {
    return merge(punctuator.getParagraphs(text), breakParagraph, paragraphCombineThreshold);
  }
  function breakParagraph(text) {
    return merge(punctuator.getSentences(text), breakSentence);
  }
  function breakSentence(sentence) {
    return merge(punctuator.getPhrases(sentence), breakPhrase);
  }
  function breakPhrase(phrase) {
    return merge(punctuator.getWords(phrase), breakWord);
  }
  function breakWord(word) {
    var result = [];
    while (word) {
      result.push(word.slice(0, charLimit));
      word = word.slice(charLimit);
    }
    return result;
  }
  function merge(parts, breakPart, combineThreshold) {
    var result = [];
    var group = {parts: [], charCount: 0};
    var flush = function() {
      if (group.parts.length) {
        result.push(group.parts.join(""));
        group = {parts: [], charCount: 0};
      }
    };
    parts.forEach(function(part) {
      var charCount = part.length;
      if (charCount > charLimit) {
        flush();
        var subParts = breakPart(part);
        for (var i=0; i<subParts.length; i++) result.push(subParts[i]);
      }
      else {
        if (group.charCount + charCount > (combineThreshold || charLimit)) flush();
        group.parts.push(part);
        group.charCount += charCount;
      }
    });
    flush();
    return result;
  }
}

//punctuators

function LatinPunctuator() {
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    return recombine(text.split(/([.!?]+[\s\u200b]+)/));
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|\s-+\s+|—\s*)/));
  }
  this.getWords = function(sentence) {
    var tokens = sentence.trim().split(/([~@#%^*_+=<>]|[\s\-—/]+|\.(?=\w{2,})|,(?=[0-9]))/);
    var result = [];
    for (var i=0; i<tokens.length; i+=2) {
      if (tokens[i]) result.push(tokens[i]);
      if (i+1 < tokens.length) {
        if (/^[~@#%^*_+=<>]$/.test(tokens[i+1])) result.push(tokens[i+1]);
        else if (result.length) result[result.length-1] += tokens[i+1];
      }
    }
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

function EastAsianPunctuator() {
  this.getParagraphs = function(text) {
    return recombine(text.split(/((?:\r?\n\s*){2,})/));
  }
  this.getSentences = function(text) {
    return recombine(text.split(/([.!?]+[\s\u200b]+|[\u3002\uff01]+)/));
  }
  this.getPhrases = function(sentence) {
    return recombine(sentence.split(/([,;:]\s+|[\u2025\u2026\u3000\u3001\uff0c\uff1b]+)/));
  }
  this.getWords = function(sentence) {
    return sentence.replace(/\s+/g, "").split("");
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

  function TimeoutTtsEngine(baseEngine, timeoutMillis) {
    var timer;
    this.speak = function(text, options, onEvent) {
      clearTimeout(timer);
      timer = setTimeout(function() {
        baseEngine.stop();
        onEvent({type: "end", charIndex: text.length});
      },
      timeoutMillis);
      baseEngine.speak(text, options, function(event) {
          if (event.type == "end" || event.type == "error") clearTimeout(timer);
          onEvent(event);
      })
    }
    this.stop = function() {
      clearTimeout(timer);
      baseEngine.stop();
    }
    this.isSpeaking = baseEngine.isSpeaking;
    this.prefetch = baseEngine.prefetch;
    this.setNextStartTime = baseEngine.setNextStartTime;
  }

  function ChromeTtsEngine() {
    this.speak = function(text, options, onEvent) {
      chrome.tts.speak(text, Object.assign({onEvent: onEvent}, options));
    }
    this.stop = chrome.tts.stop;
    this.pause = chrome.tts.pause;
    this.resume = chrome.tts.resume;
    this.isSpeaking = chrome.tts.isSpeaking;
    this.prefetch = function(text, options) {
      if (isRemoteVoice(options.voiceName)) remoteTtsEngine.prefetch(text, options);
    }
    this.setNextStartTime = function(time, options) {
      if (isRemoteVoice(options.voiceName)) remoteTtsEngine.setNextStartTime(time);
    }
  }
}

(function() {
  if (window.chrome && chrome.ttsEngine) {
    var engine = window.remoteTtsEngine = new RemoteTTS(config.serviceUrl);
    chrome.ttsEngine.onSpeak.addListener(engine.speak);
    chrome.ttsEngine.onStop.addListener(engine.stop);
    chrome.ttsEngine.onPause.addListener(engine.pause);
    chrome.ttsEngine.onResume.addListener(engine.resume);
  }
})();


function RemoteTTS(host) {
  var iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  var audio = window.ttsAudio || (window.ttsAudio = document.createElement("AUDIO"));
  var prefetchAudio = document.createElement("AUDIO");
  var nextStartTime = 0;
  var waitTimer;

  this.speak = function(utterance, options, onEvent) {
    if (!options.volume) options.volume = 1;
    if (!options.rate) options.rate = 1;
    if (!onEvent) onEvent = options.onEvent;
    audio.pause();
    if (!iOS) {
      audio.volume = options.volume;
      audio.defaultPlaybackRate = options.rate;
    }
    audio.src = getAudioUrl(utterance, options.lang, options.voiceName);
    audio.oncanplay = function() {
      var waitTime = nextStartTime - new Date().getTime();
      if (waitTime > 0) waitTimer = setTimeout(audio.play.bind(audio), waitTime);
      else audio.play();
    };
    audio.onplay = onEvent.bind(null, {type: 'start', charIndex: 0});
    audio.onended = onEvent.bind(null, {type: 'end', charIndex: utterance.length});
    audio.onerror = function() {
      onEvent({type: "error", errorMessage: audio.error.message});
    };
    audio.load();
  }

  this.isSpeaking = function(callback) {
    callback(audio.currentTime && !audio.paused && !audio.ended);
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
    prefetchAudio.src = getAudioUrl(utterance, options.lang, options.voiceName);
  }

  this.setNextStartTime = function(time) {
    nextStartTime = time || 0;
  }

  function getAudioUrl(utterance, lang, voiceName) {
    return host + "/read-aloud/speak/" + lang + "/" + encodeURIComponent(voiceName) + "?q=" + encodeURIComponent(utterance);
  }
}

var readAloud = new function() {
  var pauseBtn = document.querySelector(".ra-pause");
  if (pauseBtn) pauseBtn.style.display = "none";

  if (!window.Promise) ajaxGetCb("https://cdn.jsdelivr.net/npm/es6-promise@4/dist/es6-promise.auto.min.js", eval);

  var speech;
  var voiceProvider = new VoiceProvider();
  var attribution = new Attribution();

  this.play = function(options) {
    return ready()
      .then(function() {
        return speech ? speech.play() : speak(new HtmlDoc().getTexts(0), options);
      })
      .then(updateButtons)
  };
  this.speak = function(text, options) {
    return ready()
      .then(speak.bind(this, text, options))
      .then(updateButtons)
  };
  this.pause = function() {
    return speech ? speech.pause().then(updateButtons) : Promise.resolve();
  };
  this.isPlaying = isPlaying;

  function ready() {
    if (window.jQuery) {
      if (!window.$) window.$ = window.jQuery;
      else if (window.$ != window.jQuery) console.warn("WARNING: Read Aloud embed script may not work because $ != jQuery.");
      return Promise.resolve();
    }
    else return ajaxGet("https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js").then(eval);
  }

  function speak(texts, options) {
      var voice = voiceProvider.getLocalVoice(options.lang);
      if (voice) {
        options.voiceName = voice.name;
        options.engine = new LocalTTS(voice);
      }
      else {
        voice = voiceProvider.getRemoteVoice(options.lang);
        options.voiceName = voice ? voice.voice_name : "default";
        options.engine = new RemoteTTS(config.serviceUrl);
      }
      options.onEnd = function() {speech = null; updateButtons()};
      if (speech) speech.stop();
      speech = new Speech(texts, options);
      return speech.play();
  }

  function updateButtons() {
    return isPlaying()
      .then(function(playing) {
        $(".ra-play").toggle(!playing);
        $(".ra-pause").toggle(playing);
        attribution.toggle(playing && isGoogleTranslate(speech.options.voiceName));
      })
  }

  function isPlaying() {
    if (speech) return speech.getState().then(function(state) {return state != "PAUSED"});
    else return Promise.resolve(false);
  }

  //voice provider
  function VoiceProvider() {
    if (window.speechSynthesis) speechSynthesis.getVoices();

    this.getLocalVoice = function(lang) {
      return window.speechSynthesis ? findVoiceByLang(speechSynthesis.getVoices(), lang) : null;
    }

    this.getRemoteVoice = function(lang) {
      if (window.manifest) {
        var remoteVoices = manifest.tts_engine.voices;
        return findVoiceByLang(remoteVoices.filter(function(voice) {return isAmazonPolly(voice.voice_name)}), lang)
          || findVoiceByLang(remoteVoices.filter(function(voice) {return isMicrosoftCloud(voice.voice_name)}), lang)
          || findVoiceByLang(remoteVoices.filter(function(voice) {return isGoogleTranslate(voice.voice_name)}), lang);
      }
      else return null;
    }

    //from document.js
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
  }

  //native tts engine
  function LocalTTS(voice) {
    var utter;

    this.speak = function(text, options, onEvent) {
      utter = new SpeechSynthesisUtterance();
      if (options.lang) utter.lang = options.lang;
      if (options.pitch) utter.pitch = options.pitch;
      if (options.rate) utter.rate = options.rate;
      utter.text = text;
      utter.voice = voice;
      if (options.volume) utter.volume = options.volume;
      utter.onstart = onEvent.bind(null, {type: 'start', charIndex: 0});
      utter.onerror =
      utter.onend = onEvent.bind(null, {type: 'end', charIndex: text.length});
      speechSynthesis.speak(utter);
    }

    this.isSpeaking = function(callback) {
      callback(speechSynthesis.speaking);
    }

    this.stop = function() {
      if (utter) utter.onend = null;
      speechSynthesis.cancel();
    }

    this.prefetch = function() {}
    this.setNextStartTime = function() {}
  }

  //google translate attribution
  function Attribution() {
    var elem;

    function create() {
      elem = $("<div/>").appendTo(document.body);
    $("<div>powered&nbsp;by</div>").css({color: "#888", "margin-bottom": "3px"}).appendTo(elem);
    $("<span>G</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>o</span>").css("color", "#db3236").appendTo(elem);
    $("<span>o</span>").css("color", "#f4c20d").appendTo(elem);
    $("<span>g</span>").css("color", "#4885ed").appendTo(elem);
    $("<span>l</span>").css("color", "#3cba54").appendTo(elem);
    $("<span>e</span>").css("color", "#db3236").appendTo(elem);
    $("<span>&nbsp;Translate</span>").css("color", "#888").appendTo(elem);

    elem.css({
      display: "none",
      position: "absolute",
      padding: "6px",
      color: "black",
      "background-color": "white",
      "border-radius": "3px",
      "box-shadow": "1px 1px 3px gray",
      "font-family": "Arial, Helvetica, sans-serif",
      "font-size": "small",
      "text-align": "center",
      cursor: "pointer"
    })
    .click(function() {
      window.open("https://translate.google.com/", "_blank");
    });
    }

    this.toggle = function(b) {
      if (b) {
        if (!elem) create();
        var offset = $(".ra-pause").offset();
        if (offset) {
          offset.left = Math.max(0, offset.left + $(".ra-pause").outerWidth() / 2 - elem.outerWidth() / 2);
          offset.top += $(".ra-pause").height() + 5;
          elem.css(offset).show();
        }
      }
      else elem && elem.hide();
    }
  }
}
