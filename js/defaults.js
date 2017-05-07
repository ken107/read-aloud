var defaults = {
  rate: 1.0,
  minRate: 0.1,
  maxRate: 2,
  pitch: 1.0,
  volume: 1.0,
  spchletMaxLen: 36,
  minSpchletMaxLen: 10,
  maxSpchletMaxLen: 500,
};

function restrictValue(value, min, max, def) {
  if (isNaN(value)) return def;
  else return Math.min(Math.max(value, min), max);
}

function not(predicate) {
  return function() {
    return !predicate.apply(null, arguments);
  }
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
  return new Promise(function(fulfill) {
    chrome.runtime.lastError = null;
    chrome.tabs.executeScript({code: code}, function(result) {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else fulfill(result);
    });
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
