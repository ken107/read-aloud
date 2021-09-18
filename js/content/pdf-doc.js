
var readAloudDoc = new function() {
  var queue = new EventQueue("PdfDoc");
  var ready = location.pathname.match(/pdf-upload\.html$/)
    ? Promise.resolve()
    : Promise.resolve()
        .then(function() {
          var url = location.href
          console.info("Trying location.href", url)
          return tryLoadPdf(url)
            .then(loadPdfViewer.bind(null, url))
        })
        .catch(function(err) {
          var url = $("embed[type='application/pdf']").attr("src")
          if (!url || url == "about:blank") throw err
          console.info("Trying embed", url)
          return tryLoadPdf(url)
            .then(loadPdfViewer.bind(null, url))
        })
        .catch(function(err) {
          var url = $("iframe[src*='.pdf']").attr("src")
          if (!url) throw err
          console.info("Trying iframe", url)
          return tryLoadPdf(url)
            .then(loadPdfViewer.bind(null, url))
        })
        .catch(function() {
          throw new Error(JSON.stringify({code: "error_ajax_pdf"}))
        })

  function tryLoadPdf(url) {
    return new Promise(function(fulfill, reject) {
        var xhr = new XMLHttpRequest()
        xhr.open("GET", url, true)
        xhr.onreadystatechange = function() {
          if (xhr.readyState == XMLHttpRequest.HEADERS_RECEIVED) {
            if (xhr.status == 200 && /application\/pdf/.test(xhr.getResponseHeader("Content-Type"))) {
              xhr.abort()
              fulfill()
            }
            else reject("Non-OK status")
          }
        }
        xhr.onerror = reject
        xhr.send()
      })
  }

  function loadPdfViewer(url) {
    return new Promise(function(fulfill) {
        queue.once("pageScriptLoaded", function() {
          queue.trigger("loadDocument", url);
        })
        queue.once("documentLoaded", fulfill);
        loadPageScript("https://assets.lsdsoftware.com/read-aloud/page-scripts/pdf-viewer.js");
      })
  }

  this.getCurrentIndex = function() {
    return ready.then(function() {
      return new Promise(function(fulfill) {
        queue.once("currentIndexGot", fulfill).trigger("getCurrentIndex");
      })
    })
  }

  this.getTexts = function(index, quietly) {
    return new Promise(function(fulfill) {
      queue.once("textsGot", fulfill).trigger("getTexts", index, quietly);
    })
  }

  function EventQueue(prefix) {
    this.on = function(eventType, callback) {
      document.addEventListener(prefix+eventType, function(event) {
        callback.apply(null, JSON.parse(event.detail));
      })
      return this;
    }
    this.once = function(eventType, callback) {
      var handler = function(event) {
        document.removeEventListener(prefix+eventType, handler);
        callback.apply(null, JSON.parse(event.detail));
      };
      document.addEventListener(prefix+eventType, handler);
      return this;
    }
    this.trigger = function(eventType) {
      var args = Array.prototype.slice.call(arguments, 1);
      document.dispatchEvent(new CustomEvent(prefix+eventType, {detail: JSON.stringify(args)}));
      return this;
    }
  }
}
