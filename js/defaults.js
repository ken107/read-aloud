
var defaults = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  spchletMaxLen: 36
};

function noHackRequired(voiceName) {
  return chrome.runtime.getManifest().tts_engine.voices.some(function(voice) {
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

function isSpeaking() {
  return new Promise(function(fulfill) {
    chrome.tts.isSpeaking(fulfill);
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

function parseLang(lang) {
  var tokens = lang.toLowerCase().split("-", 2);
  return {
    lang: tokens[0],
    rest: tokens[1]
  };
}
