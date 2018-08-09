
var doc = new function() {
  var queue = new EventQueue("PdfDoc");
  var ready = location.pathname.match(/pdf-upload\.html$/)
    ? Promise.resolve()
    : new Promise(function(fulfill) {
        queue.once("pageScriptLoaded", function() {
          queue.trigger("loadDocument", getPdfUrl());
        })
        queue.once("documentLoaded", fulfill);
        loadPageScript("https://assets.lsdsoftware.com/read-aloud/page-scripts/pdf-viewer.js");
      })

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

  function getPdfUrl() {
    if (location.pathname.match(/\.pdf$/)) return location.href;
    else if ($("embed[type='application/pdf']").length) return $("embed[type='application/pdf']").attr("src");
    else return "file:///";
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
