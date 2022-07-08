
(function() {
  if (window.PdfDocPageScriptLoaded) return;
  window.PdfDocPageScriptLoaded = true;

  Promise.resolve()
    .then(loadViewer)
    .then(start)


  function start() {
    var queue = new EventQueue("PdfDoc");
    queue
      .on("loadDocument", function() {
        loadDocument.apply(null, arguments)
          .then(function() {
            queue.trigger("documentLoaded");
          })
      })
      .on("getCurrentIndex", function() {
        getCurrentIndex.apply(null, arguments)
          .then(function(index) {
            queue.trigger("currentIndexGot", index);
          })
      })
      .on("getTexts", function() {
        getTexts.apply(null, arguments)
          .then(function(texts) {
            queue.trigger("textsGot", texts);
          })
      })
      .trigger("pageScriptLoaded")
  }

  function loadDocument(url) {
    if (PDFViewerApplication.url == url) return Promise.resolve();
    return Promise.resolve()
      .then(function() {
        if (/^file:/.test(url)) return uploadFile(url);
        else return url;
      })
      .then(function(url) {
        PDFViewerApplication.open(url);
      })
      .then(function() {
        return new Promise(function(fulfill) {
          PDFViewerApplication.eventBus.on("pagesloaded", fulfill);
        })
      })
  }

  function getCurrentIndex() {
    var pageNo = PDFViewerApplication.pdfViewer.currentPageNumber;
    return Promise.resolve(pageNo ? pageNo-1 : 0);
  }

  function getTexts(index, quietly) {
    var pdf = PDFViewerApplication.pdfDocument;
    if (index < pdf.numPages) {
      if (!quietly) PDFViewerApplication.pdfViewer.currentPageNumber = index+1;
      return pdf.getPage(index+1)
        .then(function(page) {
          return getPageTexts(page, index)
        })
    }
    else return Promise.resolve(null);
  }

  function getPageTexts(page, index) {
    return page.getTextContent()
      .then(function(content) {
        var lines = [];
        for (var i=0; i<content.items.length; i++) {
          if (lines.length == 0 || i > 0 && content.items[i-1].transform[5] != content.items[i].transform[5]) lines.push("");
          lines[lines.length-1] += content.items[i].str;
        }
        return lines.map(function(line) {return line.trim()});
      })
      .then(function(texts) {
        return trimHeaderFooter(texts, index)
      })
      .then(fixParagraphs)
      .then(removeAnnotations)
  }

  function removeAnnotations(texts) {
    return texts.map(function(text) {
      return text
        .replace(/\s*\[[\d,\u2013-]+\]/g, "")
    })
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

  var trimHeaderFooter = (function() {
    var prevs = []
    return function(texts, ref) {
      var trim = prevs
        .filter(function(prev) {
          return prev.ref != ref
        })
        .map(function(prev) {
          var head = 0, tail = 0
          while (head < Math.min(prev.texts.length, texts.length) && leven(prev.texts[head], texts[head]) <= 3) head++
          while (tail < Math.min(prev.texts.length, texts.length) && leven(prev.texts[prev.texts.length-1-tail], texts[texts.length-1-tail]) <= 3) tail++
          return {head: head, tail: tail}
        })
        .filter(function(trim) {
          return trim.head || trim.tail
        })
        .reduce(function(biggest, trim) {
          return biggest && (biggest.head + biggest.tail >= trim.head + trim.tail) ? biggest : trim
        }, null)

      if (prevs.every(function(x) {return x.ref != ref})) {
        prevs.push({texts: texts, ref: ref})
        if (prevs.length > 3) prevs.shift()
      }
      return trim ? texts.slice(trim.head, trim.tail ? -trim.tail : undefined) : texts
    }
  })();


  /**
   * Viewer loader
   */
  function loadViewer() {
    if (window.PDFViewerApplication) return Promise.resolve();
    var viewerBase = "https://assets.lsdsoftware.com/read-aloud/pdf-viewer/web/";
    var libraryBase = "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.9.359/build/"
    var initializedPromise = new Promise(function(fulfill) {
      document.addEventListener("webviewerloaded", function() {
        PDFViewerApplicationOptions.set("workerSrc", libraryBase + "pdf.worker.min.js")
        PDFViewerApplicationOptions.set("sandboxBundleSrc", libraryBase + "pdf.sandbox.min.js")
        PDFViewerApplicationOptions.set("defaultUrl", null)
        PDFViewerApplication.initializedPromise.then(fulfill)
      })
    })
    console.log("Loading PDF viewer...");

    return loadCss(viewerBase + "viewer.css?v=21.8.15.0")
      .then(loadViewerHtml)
      .then(showLoadingIcon)
      .then(appendLocaleResourceLink)
      .then(loadScript.bind(null, libraryBase + "pdf.min.js"))
      .then(loadScript.bind(null, viewerBase + "viewer.js?v=21.8.15.0"))
      .then(waitUntilInitialized)
      .then(hideLoadingIcon)

    function loadViewerHtml() {
      return ajaxGet(viewerBase + "viewer.html?v=21.8.15.0")
        .then(function(text) {
          var start = text.indexOf(">", text.indexOf("<body")) +1;
          var end = text.indexOf("</body>");
          document.body.innerHTML = text.slice(start, end);
        })
    }

    function showLoadingIcon() {
      var elem = document.getElementById("ra-loading-icon");
      if (!elem) {
        elem = document.createElement("DIV");
        elem.setAttribute("id", "ra-loading-icon");
        elem.style.position = "absolute";
        elem.style.left = "50%";
        elem.style.top = "50%";
        document.body.appendChild(elem);

        var img = document.createElement("IMG");
        img.setAttribute("src", viewerBase + "../throb.gif");
        img.style.position = "relative";
        img.style.width = "48px";
        img.style.left = "-24px";
        img.style.top = "-24px";
        elem.appendChild(img);
      }
      elem.style.display = "block";
    }

    function hideLoadingIcon() {
      document.getElementById("ra-loading-icon").style.display = "none";
    }

    function appendLocaleResourceLink() {
      var link = document.createElement("LINK");
      document.head.appendChild(link);
      link.setAttribute("rel", "resource");
      link.setAttribute("type", "application/l10n");
      link.setAttribute("href", viewerBase + "locale/locale.properties");
    }

    function waitUntilInitialized() {
      return initializedPromise
    }
  }


  /**
   * File uploader
   */
  function uploadFile(fileUrl) {
    return loadJQuery()
      .then(createUploadDialog)
      .then(showUploadDialog)
  }

  function loadJQuery() {
    if (window.jQuery) return Promise.resolve();
    return loadScript("https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js")
      .then(function() {
        return Promise.all([
          loadCss("https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css"),
          loadScript("https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"),
        ])
      })
  }

  function createUploadDialog() {
    var $ = jQuery;
    if ($("#ra-upload-dialog").length) return;

    var div = $("<div>").attr("id", "ra-upload-dialog");
    $("<div>")
      .text("*PDF files are opened directly in the browser and not actually uploaded to server.")
      .css({color: "red", "font-size": "smaller", "margin": "1em 0 2em 0"})
      .appendTo(div);
    $("<input>")
      .attr("type", "file")
      .attr("name", "fileToUpload")
      .attr("accept", "application/pdf")
      .on("change", function() {
        div.data("result", this.files[0]).dialog("close");
      })
      .appendTo(div);

    div.dialog({
      appendTo: document.body,
      title: "Select PDF file to Read Aloud",
      width: 450,
      autoOpen: false,
    })
  }

  function showUploadDialog() {
    var $ = jQuery;
    return new Promise(function(fulfill) {
      $("#ra-upload-dialog")
        .data("result", null)
        .dialog("open")
        .one("dialogclose", function() {
          var file = $(this).data("result");
          fulfill(file && URL.createObjectURL(file));
        })
    })
  }


  /**
   * Helpers
   */
  function loadCss(url) {
    return new Promise(function(fulfill) {
      var link = document.createElement("LINK");
      document.head.appendChild(link);
      link.onload = fulfill;
      link.setAttribute("type", "text/css");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", url);
    })
  }

  function loadScript(url) {
    return new Promise(function(fulfill) {
      var script = document.createElement('script');
      document.head.appendChild(script);
      script.onload = fulfill;
      script.type = 'text/javascript';
      script.src = url;
    })
  }

  function ajaxGet(url) {
    return new Promise(function(fulfill, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          if (xhr.status == 200) fulfill(xhr.responseText);
          else reject(new Error(xhr.responseText));
        }
      };
      xhr.send(null);
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

  //https://github.com/gustf/js-levenshtein
  var leven = (function()
  {
    function _min(d0, d1, d2, bx, ay)
    {
      return d0 < d1 || d2 < d1
          ? d0 > d2
              ? d2 + 1
              : d0 + 1
          : bx === ay
              ? d1
              : d1 + 1;
    }

    return function(a, b)
    {
      if (a === b) {
        return 0;
      }

      if (a.length > b.length) {
        var tmp = a;
        a = b;
        b = tmp;
      }

      var la = a.length;
      var lb = b.length;

      while (la > 0 && (a.charCodeAt(la - 1) === b.charCodeAt(lb - 1))) {
        la--;
        lb--;
      }

      var offset = 0;

      while (offset < la && (a.charCodeAt(offset) === b.charCodeAt(offset))) {
        offset++;
      }

      la -= offset;
      lb -= offset;

      if (la === 0 || lb < 3) {
        return lb;
      }

      var x = 0;
      var y;
      var d0;
      var d1;
      var d2;
      var d3;
      var dd;
      var dy;
      var ay;
      var bx0;
      var bx1;
      var bx2;
      var bx3;

      var vector = [];

      for (y = 0; y < la; y++) {
        vector.push(y + 1);
        vector.push(a.charCodeAt(offset + y));
      }

      var len = vector.length - 1;

      for (; x < lb - 3;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        bx1 = b.charCodeAt(offset + (d1 = x + 1));
        bx2 = b.charCodeAt(offset + (d2 = x + 2));
        bx3 = b.charCodeAt(offset + (d3 = x + 3));
        dd = (x += 4);
        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          ay = vector[y + 1];
          d0 = _min(dy, d0, d1, bx0, ay);
          d1 = _min(d0, d1, d2, bx1, ay);
          d2 = _min(d1, d2, d3, bx2, ay);
          dd = _min(d2, d3, dd, bx3, ay);
          vector[y] = dd;
          d3 = d2;
          d2 = d1;
          d1 = d0;
          d0 = dy;
        }
      }

      for (; x < lb;) {
        bx0 = b.charCodeAt(offset + (d0 = x));
        dd = ++x;
        for (y = 0; y < len; y += 2) {
          dy = vector[y];
          vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
          d0 = dy;
        }
      }

      return dd;
    };
  })();
})()
