var config = {
  serviceUrl: "https://support.lsdsoftware.com"
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

function getSettings() {
  return new Promise(function(fulfill) {
    chrome.storage.local.get(["voiceName", "rate", "pitch", "volume", "showHighlighting"], fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    chrome.storage.local.set(items, fulfill);
  });
}

function clearSettings() {
  return new Promise(function(fulfill) {
    chrome.storage.local.remove(["voiceName", "rate", "pitch", "volume", "showHighlighting"], fulfill);
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
  return /^Google /.test(voiceName);
}

function isGoogleTranslate(voiceName) {
  return /^GoogleTranslate /.test(voiceName);
}

function isAmazonPolly(voiceName) {
  return /^Amazon /.test(voiceName);
}

function isRemoteVoice(voiceName) {
  return isAmazonPolly(voiceName) || isGoogleTranslate(voiceName);
}

function isPremiumVoice(voiceName) {
  return isAmazonPolly(voiceName);
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
