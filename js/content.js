
var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

(function() {
  var port = brapi.runtime.connect({name: "ReadAloudContentScript"});
  var peer = new RpcPeer(new ExtensionMessagingPeer(port));
  peer.onInvoke = function(method) {
    var args = Array.prototype.slice.call(arguments, 1);
    var handlers = {
      getCurrentIndex: getCurrentIndex,
      getTexts: getTexts
    }
    if (handlers[method]) return handlers[method].apply(handlers, args);
    else console.error("Unknown method", method);
  }
  $(function() {
    peer.invoke("onReady", getInfo());
  })

  function getInfo() {
    return {
      url: location.href,
      title: document.title,
      lang: getLang(),
      requireJs: getRequireJs()
    }
  }

  function getLang() {
    var lang = document.documentElement.lang || $("html").attr("xml:lang");
    if (lang) lang = lang.split(",",1)[0].replace(/_/g, '-');
    return lang;
  }

  function getRequireJs() {
    if (typeof readAloudDoc != "undefined") return null;
    if (location.hostname == "docs.google.com") {
      if (/^\/presentation\/d\//.test(location.pathname)) return ["js/content/google-slides.js"];
      else if (/\/document\/d\//.test(location.pathname)) return ["js/content/googleDocsUtil.js", "js/content/google-doc.js"];
      else if ($(".drive-viewer-paginated-scrollable").length) return ["js/content/google-drive-doc.js"];
      else return ["js/content/html-doc.js"];
    }
    else if (location.hostname == "drive.google.com") {
      if ($(".drive-viewer-paginated-scrollable").length) return ["js/content/google-drive-doc.js"];
      else return ["js/content/google-drive-preview.js"];
    }
    else if (/^read\.amazon\./.test(location.hostname)) return ["js/content/kindle-book.js"];
    else if (location.hostname.endsWith(".khanacademy.org")) return ["js/content/khan-academy.js"];
    else if (location.hostname.endsWith("acrobatiq.com")) return ["js/content/html-doc.js", "js/content/acrobatiq.js"];
    else if (location.hostname == "digital.wwnorton.com") return ["js/content/html-doc.js", "js/content/wwnorton.js"];
    else if (location.hostname == "plus.pearson.com") return ["js/content/html-doc.js", "js/content/pearson.js"];
    else if (location.hostname == "www.ixl.com") return ["js/content/ixl.js"];
    else if (location.hostname == "www.webnovel.com" && location.pathname.startsWith("/book/")) return ["js/content/webnovel.js"];
    else if (location.hostname == "archiveofourown.org") return ["js/content/archiveofourown.js"];
    else if (location.pathname.match(/pdf-upload\.html$/)
      || location.pathname.match(/\.pdf$/)
      || $("embed[type='application/pdf']").length
      || $("iframe[src*='.pdf']").length) return ["js/content/pdf-doc.js"];
    else return ["js/content/html-doc.js"];
  }

  function getCurrentIndex() {
    if (getSelectedText()) return -100;
    else return readAloudDoc.getCurrentIndex();
  }

  function getTexts(index, quietly) {
    if (index < 0) {
      if (index == -100) return getSelectedText().split(paragraphSplitter);
      else return null;
    }
    else {
      return Promise.resolve(readAloudDoc.getTexts(index, quietly))
        .then(function(texts) {
          if (texts && Array.isArray(texts)) {
            if (!quietly) console.log(texts.join("\n\n"));
          }
          return texts;
        })
    }
  }

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }
})()


//helpers --------------------------

var paragraphSplitter = /(?:\s*\r?\n\s*){2,}/;

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
      if (/[-\u2013\u2014]$/.test(para)) para = para.substr(0, para.length-1);
      else para += " ";
    }
    para += texts[i].replace(/[-\u2013\u2014]\r?\n/g, "");
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
}

function waitMillis(millis) {
  return new Promise(function(fulfill) {
    setTimeout(fulfill, millis);
  })
}

function loadPageScript(url) {
  if (!$("head").length) $("<head>").prependTo("html");
  $.ajax({
    dataType: "script",
    cache: true,
    url: url
  });
}

function simulateMouseEvent(element, eventName, coordX, coordY) {
  element.dispatchEvent(new MouseEvent(eventName, {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: coordX,
    clientY: coordY,
    button: 0
  }));
}

function simulateClick(elementToClick) {
  var box = elementToClick.getBoundingClientRect(),
      coordX = box.left + (box.right - box.left) / 2,
      coordY = box.top + (box.bottom - box.top) / 2;
  simulateMouseEvent (elementToClick, "mousedown", coordX, coordY);
  simulateMouseEvent (elementToClick, "mouseup", coordX, coordY);
  simulateMouseEvent (elementToClick, "click", coordX, coordY);
}

function getSettings(names) {
  return new Promise(function(fulfill) {
    brapi.storage.local.get(names, fulfill);
  });
}

function updateSettings(items) {
  return new Promise(function(fulfill) {
    brapi.storage.local.set(items, fulfill);
  });
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
