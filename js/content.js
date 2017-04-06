
function connect(name) {
  if (!window.docReady) window.docReady = makeDoc();
  window.docReady.then(function(doc) {startService(name, doc)});
}


function startService(name, doc) {
  var port = chrome.runtime.connect({name: name});
  port.onMessage.addListener(dispatch.bind(null, {
    raGetInfo: getInfo,
    raGetCurrentIndex: getCurrentIndex,
    raGetTexts: getTexts,
  }))

  function dispatch(handlers, message) {
    var request = message.request;
    if (handlers[request.method]) {
      var result = handlers[request.method](request);
      Promise.resolve(result).then(function(response) {
        port.postMessage({id: message.id, response: response});
      });
    }
  }

  function getInfo(request) {
    return {
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang || $("html").attr("xml:lang") || $("meta[http-equiv=content-language]").attr("content")
    }
  }

  function getCurrentIndex(request) {
    if (getSelectedText()) return -100;
    else return doc.getCurrentIndex();
  }

  function getTexts(request) {
    if (request.index < 0) {
      if (request.index == -100) return [getSelectedText()];
      else return null;
    }
    else {
      return Promise.resolve(doc.getTexts(request.index))
        .then(function(texts) {
          if (texts) {
            texts = texts.map(removeLinks);
            console.log(texts.join("\n\n"));
          }
          return texts;
        })
    }
  }

  function getSelectedText() {
    return window.getSelection().toString().trim();
  }
}


function makeDoc() {
  return domReady()
    .then(createDoc)
    .then(function(doc) {
      return Promise.resolve(doc.ready).then(function() {return doc});
    })

  function domReady() {
    return new Promise(function(fulfill) {
      $(fulfill);
    })
  }

  function createDoc() {
    if (location.hostname == "docs.google.com") {
      if ($(".kix-appview-editor").length) return new GoogleDoc();
      else if ($(".drive-viewer-paginated-scrollable").length) return new GDriveDoc();
      else return new HtmlDoc();
    }
    else if (location.hostname == "drive.google.com") return new GDriveDoc();
    else if (location.hostname == "read.amazon.com") return new KindleBook();
    else if (location.pathname.match(/\.pdf$/)) return new PdfDoc(location.href);
    else return new HtmlDoc();
  }
}


function GoogleDoc() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

  this.getCurrentIndex = function() {
    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index) {
    var page = pages.get(index);
    if (page) {
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(page, 2);
    }
    else return null;
  }

  function tryGetTexts(page, count) {
    return waitMillis(1000)
      .then(function() {
        return $(".kix-paragraphrenderer", page).get().map(getText).filter(isNotEmpty);
      })
      .then(function(texts) {
        if (texts && !texts.length && count > 1) return tryGetTexts(page, count-1);
        else return texts;
      })
  }
}


function GDriveDoc() {
  var viewport = $(".drive-viewer-paginated-scrollable").get(0);
  var pages = $(".drive-viewer-paginated-page");

  this.getCurrentIndex = function() {
    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index) {
    var page = pages.get(index);
    if (page) {
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(page, 3);
    }
    else return null;
  }

  function tryGetTexts(page, count) {
    return waitMillis(1000)
      .then(function() {
        return $("p", page).get().map(getText).filter(isNotEmpty);
      })
      .then(fixParagraphs)
      .then(function(texts) {
        if (texts && !texts.length && count > 1) return tryGetTexts(page, count-1);
        else return texts;
      })
  }
}


function KindleBook() {
  var mainDoc = document.getElementById("KindleReaderIFrame").contentDocument;
  var btnNext = mainDoc.getElementById("kindleReader_pageTurnAreaRight");
  var btnPrev = mainDoc.getElementById("kindleReader_pageTurnAreaLeft");
  var contentFrames = [
    mainDoc.getElementById("column_0_frame_0"),
    mainDoc.getElementById("column_0_frame_1"),
    mainDoc.getElementById("column_1_frame_0"),
    mainDoc.getElementById("column_1_frame_1")
  ];
  var currentIndex = 0;
  var lastText;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    for (; currentIndex<index; currentIndex++) $(btnNext).click();
    for (; currentIndex>index; currentIndex--) $(btnPrev).click();
    return tryGetTexts(4);
  }

  function tryGetTexts(count) {
    return waitMillis(1000)
      .then(getTexts)
      .then(function(texts) {
        if (texts && !texts.length && count > 1) return tryGetTexts(count-1);
        else return texts;
      })
  }

  function getTexts() {
    var texts = [];
    contentFrames.filter(function(frame) {
      return frame.style.visibility != "hidden";
    })
    .forEach(function(frame) {
      var frameHeight = $(frame).height();
      $("h1, h2, h3, h4, h5, h6, .was-a-p", frame.contentDocument).each(function() {
        var top = $(this).offset().top;
        var bottom = top + $(this).height();
        if (top < frameHeight && bottom > 0) texts.push($(this).text());
      })
    })
    var out = [];
    for (var i=0; i<texts.length; i++) {
      if (texts[i] != (out.length ? out[out.length-1] : lastText)) out.push(texts[i]);
    }
    lastText = out[out.length-1];
    return out;
  }
}


function PdfDoc(url) {
  PDFJS.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

  this.ready = PDFJS.getDocument(url).promise;

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    return this.ready.then(function(pdf) {
      if (index < pdf.numPages) return pdf.getPage(index+1).then(getPageTexts);
      else return null;
    })
  }

  function getPageTexts(page) {
    return page.getTextContent()
      .then(function(content) {
        return content.items.map(function(item) {return item.str.trim()}).filter(isNotEmpty);
      })
      .then(fixParagraphs)
  }
}


function HtmlDoc() {
  var headingTags = ["H1", "H2", "H3", "H4", "H5", "H6"];
  var paragraphTags = ["P", "BLOCKQUOTE", "PRE"];
  var listTags = ["OL", "UL"];

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return this.texts || (this.texts = parse());
    else return null;
  }

  function parse() {
    //clear markers
    $(".read-aloud").removeClass("read-aloud");

    //find text blocks with at least 1 paragraphs
    var textBlocks = $("p").not("blockquote > p").parent().get();
    $.uniqueSort(textBlocks);

    //visible only
    textBlocks = $(textBlocks).filter(":visible").filter(notOutOfView).get();

    if (textBlocks.length) {
      //remove any block less than 1/7 the length of the longest block
      var lengths = textBlocks.map(function(block) {
        return $(block).children(paragraphTags.join(", ")).text().length;
      });
      var longest = Math.max.apply(null, lengths);
      textBlocks = textBlocks.filter(function(block, index) {
        return lengths[index] > longest/7;
      });

      //mark the elements to be read
      textBlocks.forEach(function(block) {
        $(findHeadingsFor(block)).addClass("read-aloud");
        $(block).children(headingTags.concat(paragraphTags).join(", ")).addClass("read-aloud");
        $(block).children(listTags.join(", ")).children("li").addClass("read-aloud");
      });
    }
    else {
      //if no text blocks found, read all headings
      $(headingTags.concat(paragraphTags).join(", ")).filter(":visible").addClass("read-aloud");
    }

    //extract texts
    var texts = $(".read-aloud").get().map(getText).filter(isNotEmpty);
    return texts;
  }

  function findHeadingsFor(block) {
    var result = [];
    var firstInnerElem = $(block).children(headingTags.concat(paragraphTags).join(", ")).get(0);
    var currentLevel = getHeadingLevel(firstInnerElem);
    var node = previousNode(firstInnerElem, true);
    while (node && !$(node).hasClass("read-aloud")) {
      if (node.nodeType == 1) {
        var level = getHeadingLevel(node);
        if (level < currentLevel) {
          result.push(node);
          currentLevel = level;
        }
      }
      node = previousNode(node);
    }
    return result.reverse();
  }

  function getHeadingLevel(elem) {
    var index = elem ? headingTags.indexOf(elem.tagName) : -1;
    return index == -1 ? 100 : index + 1;
  }

  function previousNode(node, skipChildren) {
    if (node == document.body) return null;
    if (node.nodeType == 1 && !skipChildren && node.lastChild) return node.lastChild;
    if (node.previousSibling) return node.previousSibling;
    return previousNode(node.parentNode, true);
  }
}


function notOutOfView() {
  return $(this).offset().left >= 0;
}

function getText(elem) {
  $(elem).find(":hidden, sup").remove();
  var text = $(elem).text().trim();
  if (elem.tagName == "LI") return ($(elem).index() + 1) + ". " + text;
  else return text;
}

function isNotEmpty(text) {
  return text;
}

function removeLinks(text) {
  return text.replace(/https?:\/\/\S+/g, "this URL.");
}

function waitMillis(millis) {
  return new Promise(function(fulfill) {
    setTimeout(fulfill, millis);
  });
}

function fixParagraphs(texts) {
  var out = [];
  var para = "";
  for (var i=0; i<texts.length; i++) {
    if (para) para += " ";
    para += texts[i];
    if (texts[i].match(/[.!?:)"'\u2019\u201d]$/)) {
      out.push(para);
      para = "";
    }
  }
  if (para) out.push(para);
  return out;
}
