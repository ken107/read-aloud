
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
          PDFViewerApplication.eventBus.on("documentload", fulfill);
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
      return pdf.getPage(index+1).then(getPageTexts)
    }
    else return Promise.resolve(null);
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


  /**
   * Viewer loader
   */
  function loadViewer() {
    if (window.PDFViewerApplication) return Promise.resolve();
    var viewerBase = "https://assets.lsdsoftware.com/read-aloud/pdf-viewer/web/";
    console.log("Loading PDF viewer...");

    return loadCss(viewerBase + "viewer.css")
      .then(loadViewerHtml)
      .then(showLoadingIcon)
      .then(appendLocaleResourceLink)
      .then(loadScript.bind(null, viewerBase + "../build/pdf.js"))
      .then(rebaseUrls)
      .then(loadScript.bind(null, viewerBase + "pdf.viewer.js", viewerJsPreprocessor))
      .then(waitUntilInitialized)
      .then(hideLoadingIcon)

    function loadViewerHtml() {
      return ajaxGet(viewerBase + "viewer.html")
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

    function waitUntilInitialized() {
      return new Promise(function(fulfill) {
        var timer = setInterval(function() {
          if (PDFViewerApplication.initialized) {
            clearInterval(timer);
            fulfill();
          }
        }, 500);
      })
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
      .then(loadCss.bind(null, "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css"))
      .then(loadScript.bind(null, "https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"))
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
    var link = document.createElement("LINK");
    document.head.appendChild(link);
    link.setAttribute("type", "text/css");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", url);
    return Promise.resolve();
  }

  function loadScript(url, preprocess) {
    return ajaxGet(url)
      .then(function(text) {
        if (preprocess) text = preprocess(text);
        eval(text);
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
})()
