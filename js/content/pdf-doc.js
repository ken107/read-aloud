
var readAloudDoc = location.pathname.match(/readaloud\.html$/) ? new Standalone() : new Embedded()


function Embedded() {
  const pdfViewerUrl = new URL("https://assets.lsdsoftware.com/read-aloud/pdf-viewer-2/web/readaloud.html?embedded")
  const ready = Promise.resolve()
        .then(function() {
          var url = location.href
          console.info("Trying location.href", url)
          return tryLoadPdf(url)
        })
        .catch(function(err) {
          var url = $("embed[type='application/pdf']").attr("src")
          if (!url || url == "about:blank") throw err
          console.info("Trying embed", url)
          return tryLoadPdf(url)
        })
        .catch(function(err) {
          var url = $("iframe[src*='.pdf']").attr("src")
          if (!url) throw err
          console.info("Trying iframe", url)
          return tryLoadPdf(url)
        })
        .then(loadViewer)
        .catch(function() {
          throw new Error(JSON.stringify({code: "error_ajax_pdf"}))
        })

  async function tryLoadPdf(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error("Non-OK status")
    const contentType = res.headers.get("Content-Type")
    if (!/application\/pdf/.test(contentType)) throw new Error("Non-PDF content")
    return await res.arrayBuffer()
  }

  async function loadViewer(buffer) {
    const frame = createViewerFrame(pdfViewerUrl.href)
    var queue
    await new Promise(f => queue = new MessageQueue(frame.contentWindow, pdfViewerUrl.origin, {viewerReady: f}))
    await queue.send({method: "loadDocument", buffer: buffer}, [buffer])
    return queue
  }

  function createViewerFrame(url) {
    const frame = document.createElement("iframe")
    frame.src = url
    frame.style.position = "fixed"
    frame.style.top = "0"
    frame.style.left = "0"
    frame.style.width = "100%"
    frame.style.height = "100%"
    frame.style.zIndex = "999000"
    frame.style.borderWidth = "0"
    document.body.appendChild(frame)
    return frame
  }

  this.getCurrentIndex = function() {
    return ready
      .then(queue => queue.send({method: "getCurrentIndex"}))
      .then(res => res.value)
  }
  this.getTexts = function(index, quietly) {
    return ready
      .then(queue => queue.send({method: "getTexts", index: index, quietly: quietly}))
      .then(res => res.value)
  }

  function MessageQueue(targetWindow, targetOrigin, handlers) {
    const pending = {}
    window.addEventListener("message", event => {
      if (event.origin == targetOrigin) {
        if (handlers[event.data.method]) handlers[event.data.method](event.data)
        else if (pending[event.data.id]) pending[event.data.id](event.data)
        else console.error("Unhandled", event)
      }
    })
    this.send = function(message, transfer) {
      message.id = Math.random()
      targetWindow.postMessage(message, targetOrigin, transfer)
      return new Promise(f => pending[message.id] = f)
        .finally(() => delete pending[message.id])
    }
  }
}


function Standalone() {
  var queue = new EventQueue("PdfDoc");
  var ready = new Promise(f => queue.once("documentLoaded", f).trigger("loadDocument"))

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
