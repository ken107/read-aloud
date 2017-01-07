var languageCodes = {
  ab: 'Abkhazian',
  aa: 'Afar',
  af: 'Afrikaans',
  sq: 'Albanian',
  am: 'Amharic',
  ar: 'Arabic',
  an: 'Aragonese',
  hy: 'Armenian',
  as: 'Assamese',
  ay: 'Aymara',
  az: 'Azerbaijani',
  ba: 'Bashkir',
  eu: 'Basque',
  bn: 'Bengali (Bangla)',
  dz: 'Bhutani',
  bh: 'Bihari',
  bi: 'Bislama',
  br: 'Breton',
  bg: 'Bulgarian',
  my: 'Burmese',
  be: 'Byelorussian (Belarusian)',
  km: 'Cambodian',
  ca: 'Catalan',
  zh: 'Chinese',
  'zh-Hans': 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)',
  co: 'Corsican',
  hr: 'Croatian',
  cs: 'Czech',
  da: 'Danish',
  nl: 'Dutch',
  en: 'English',
  eo: 'Esperanto',
  et: 'Estonian',
  fo: 'Faeroese',
  fa: 'Farsi',
  fj: 'Fiji',
  fi: 'Finnish',
  fr: 'French',
  fy: 'Frisian',
  gl: 'Galician',
  gd: 'Gaelic (Scottish)',
  gv: 'Gaelic (Manx)',
  ka: 'Georgian',
  de: 'German',
  el: 'Greek',
  kl: 'Greenlandic',
  gn: 'Guarani',
  gu: 'Gujarati',
  ht: 'Haitian Creole',
  ha: 'Hausa',
  he: 'Hebrew',
  iw: 'Hebrew',
  hi: 'Hindi',
  hu: 'Hungarian',
  is: 'Icelandic',
  io: 'Ido',
  id: 'Indonesian',
  in: 'Indonesian',
  ia: 'Interlingua',
  ie: 'Interlingue',
  iu: 'Inuktitut',
  ik: 'Inupiak',
  ga: 'Irish',
  it: 'Italian',
  ja: 'Japanese',
  jv: 'Javanese',
  kn: 'Kannada',
  ks: 'Kashmiri',
  kk: 'Kazakh',
  rw: 'Kinyarwanda (Ruanda)',
  ky: 'Kirghiz',
  rn: 'Kirundi (Rundi)',
  ko: 'Korean',
  ku: 'Kurdish',
  lo: 'Laothian',
  la: 'Latin',
  lv: 'Latvian (Lettish)',
  li: 'Limburgish ( Limburger)',
  ln: 'Lingala',
  lt: 'Lithuanian',
  mk: 'Macedonian',
  mg: 'Malagasy',
  ms: 'Malay',
  ml: 'Malayalam',
  mt: 'Maltese',
  mi: 'Maori',
  mr: 'Marathi',
  mo: 'Moldavian',
  mn: 'Mongolian',
  na: 'Nauru',
  ne: 'Nepali',
  no: 'Norwegian',
  oc: 'Occitan',
  or: 'Oriya',
  om: 'Oromo (Afaan Oromo)',
  ps: 'Pashto (Pushto)',
  pl: 'Polish',
  pt: 'Portuguese',
  pa: 'Punjabi',
  qu: 'Quechua',
  rm: 'Rhaeto-Romance',
  ro: 'Romanian',
  ru: 'Russian',
  sm: 'Samoan',
  sg: 'Sangro',
  sa: 'Sanskrit',
  sr: 'Serbian',
  sh: 'Serbo-Croatian',
  st: 'Sesotho',
  tn: 'Setswana',
  sn: 'Shona',
  ii: 'Sichuan Yi',
  sd: 'Sindhi',
  si: 'Sinhalese',
  ss: 'Siswati',
  sk: 'Slovak',
  sl: 'Slovenian',
  so: 'Somali',
  es: 'Spanish',
  su: 'Sundanese',
  sw: 'Swahili (Kiswahili)',
  sv: 'Swedish',
  tl: 'Tagalog',
  tg: 'Tajik',
  ta: 'Tamil',
  tt: 'Tatar',
  te: 'Telugu',
  th: 'Thai',
  bo: 'Tibetan',
  ti: 'Tigrinya',
  to: 'Tonga',
  ts: 'Tsonga',
  tr: 'Turkish',
  tk: 'Turkmen',
  tw: 'Twi',
  ug: 'Uighur',
  uk: 'Ukrainian',
  ur: 'Urdu',
  uz: 'Uzbek',
  vi: 'Vietnamese',
  vo: 'Volapük',
  wa: 'Wallon',
  cy: 'Welsh',
  wo: 'Wolof',
  xh: 'Xhosa',
  yi: 'Yiddish',
  ji: 'Yiddish',
  yo: 'Yoruba',
  zu: 'Zulu'
};

var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  spchletMaxLen: 38
};

function isCustomVoice(voiceName) {
  var customVoices = chrome.runtime.getManifest().tts_engine.voices;
  return customVoices.some(function(voice) {
    return voice.voice_name == voiceName;
  });
}

function Slider(elem) {
  var min = $(elem).data("min");
  var max = $(elem).data("max");

  this.getValue = function() {
    return (elem.scrollLeft / getScrollWidth()) * (max - min) + min;
  };
  this.setValue = function(value) {
    if (value < min) value = min;
    if (value > max) value = max;
    elem.scrollLeft = getScrollWidth() * (value - min) / (max - min);
  };
  function getScrollWidth() {
    var current = elem.scrollLeft;
    elem.scrollLeft = elem.scrollWidth;
    var max = elem.scrollLeft;
    elem.scrollLeft = current;
    return max;
  }
}

function getSettings() {
  return new Promise(function(fulfill) {
    chrome.storage.local.get(["voiceName", "rate", "pitch", "volume", "spchletMaxLen"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    chrome.storage.local.set(items, fulfill);
  });
}

function clearSettings() {
  return new Promise(function(fulfill) {
    chrome.storage.local.remove(["voiceName", "rate", "pitch", "volume", "spchletMaxLen"], fulfill);
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

function executeScript(file) {
  return new Promise(function(fulfill) {
    chrome.tabs.executeScript({file: file}, fulfill);
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

function waitMillis(millis) {
  return new Promise(function(fulfill) {
    setTimeout(fulfill, millis);
  });
}

function request(method, url, params, headers) {
  return new Promise(function (resolve, reject) {
    if (params) {
      if (typeof params === 'object') {
        params = Object.keys(params).map(function (key) {
          return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
        }).join('&');
      }
      if (method == "GET") {
        var index = url.indexOf('?');
        if (index != -1) url += '&' + params;
        else url += '?' + params;
      }
    }
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) resolve(xhr.response);
      else reject(new Error("HTTP " + this.status));
    };
    xhr.onerror = function () {
      reject(new Error(this.status || xhr.statusText));
    };
    if (headers) {
      Object.keys(headers).forEach(function (key) {
        xhr.setRequestHeader(key, headers[key]);
      });
    }
    if (method == "POST") xhr.send(params);
    else xhr.send();
  });
}

function parseLang(lang) {
  var tokens = lang.toLowerCase().split("-", 2);
  return {
    lang: tokens[0],
    rest: tokens[1]
  };
}

function getDomainLang(domain) {
  return getState("domainLang")
    .then(function(domainLang) {
      return domainLang && domainLang[domain];
    })
}

function setDomainLang(domain, lang) {
  return getState("domainLang")
    .then(function(domainLang) {
      if (!domainLang) domainLang = {};
      if (lang) domainLang[domain] = lang;
      else delete domainLang[domain];
      return setState("domainLang", domainLang);
    })
}
