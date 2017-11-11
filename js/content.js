
var readAloud = {
  paraSplitter: /(?:\s*\r?\n\s*){2,}/
};

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
    var lang = document.documentElement.lang || $("html").attr("xml:lang");
    if (lang) lang = lang.replace(/_/g, '-');
    if (lang == "en" || lang == "en-US") lang = null;    //foreign language pages often erronenously declare lang="en"
    return {
      isPdf: doc.isPdf,
      isGoogleDocs: doc.isGoogleDocs,
      canSeek: doc.canSeek,
      url: location.href,
      title: document.title,
      lang: lang
    }
  }

  function getCurrentIndex(request) {
    if (getSelectedText()) return -100;
    else return doc.getCurrentIndex();
  }

  function getTexts(request) {
    if (request.index < 0) {
      if (request.index == -100) return getSelectedText().split(readAloud.paraSplitter);
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

  function removeLinks(text) {
    return text.replace(/https?:\/\/\S+/g, "this URL.");
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
    else if (/^read\.amazon\./.test(location.hostname)) return new KindleBook();
    else if (location.hostname == "www.quora.com") return new QuoraPage();
    else if (location.hostname == "www.khanacademy.org") return new KhanAcademy();
    else if (location.pathname.match(/\.pdf$/)) return new PdfDoc(location.href);
    else if ($("embed[type='application/pdf']").length) return new PdfDoc($("embed[type='application/pdf']").attr("src"));
    else return new HtmlDoc();
  }
}


function GoogleDoc() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

  this.isGoogleDocs = true;

  this.getCurrentIndex = function() {
    var doc = googleDocsUtil.getGoogleDocument();
    if (doc.selectedText) return 9999;

    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index) {
    if (index == 9999) {
      var doc = googleDocsUtil.getGoogleDocument();
      return [doc.selectedText];
    }

    var page = pages.get(index);
    if (page) {
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 2000);
    }
    else return null;
  }

  function getTexts() {
    return $(".kix-paragraphrenderer", this).get()
      .map(getInnerText)
      .filter(isNotEmpty);
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
      return tryGetTexts(getTexts.bind(page), 3000);
    }
    else return null;
  }

  function getTexts() {
    var texts = $("p", this).get()
      .map(getInnerText)
      .filter(isNotEmpty);
    return fixParagraphs(texts);
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
    return tryGetTexts(getTexts, 4000);
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
        if (top >= 0 && top < frameHeight) texts.push($(this).text());
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
  var pdf;
  this.isPdf = true;
  this.canSeek = true;

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (/^file:/.test(url)) {
      showUploadDialog();
      return Promise.resolve(null);
    }
    return ready().then(function() {
      if (index < pdf.numPages) return pdf.getPage(index+1).then(getPageTexts);
      else return null;
    })
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

  function ready() {
    if (pdf) return Promise.resolve();
    else {
      PDFJS.workerSrc = chrome.runtime.getURL("/js/pdf.worker.js");
      return PDFJS.getDocument(url).promise.then(function(result) {pdf = result});
    }
  }

  function showUploadDialog() {
    if ($(".pdf-upload-dialog:visible").length) return;

    var div = $("<div>")
      .addClass("pdf-upload-dialog");
    $("<p>")
      .text(formatMessage({code: "uploadpdf_message1", extension_name: chrome.i18n.getMessage("extension_short_name")}))
      .css("color", "blue")
      .appendTo(div);
    $("<p>")
      .text(formatMessage({code: "uploadpdf_message2", extension_name: chrome.i18n.getMessage("extension_short_name")}))
      .appendTo(div);
    var form = $("<form>")
      .attr("action", "https://support2.lsdsoftware.com/dropmeafile-readaloud/upload")
      .attr("method", "POST")
      .attr("enctype", "multipart/form-data")
      .on("submit", function() {
        btnSubmit.prop("disabled", true);
      })
      .appendTo(div);
    $("<input>")
      .attr("type", "file")
      .attr("name", "fileToUpload")
      .attr("accept", "application/pdf")
      .on("change", function() {
        btnSubmit.prop("disabled", !$(this).val())
      })
      .appendTo(form);
    $("<br>")
      .appendTo(form);
    $("<br>")
      .appendTo(form);
    var btnSubmit = $("<input>")
      .attr("type", "submit")
      .attr("value", chrome.i18n.getMessage("uploadpdf_submit_button"))
      .prop("disabled", true)
      .appendTo(form);

    div.appendTo(document.body)
      .dialog({
        title: chrome.i18n.getMessage("extension_short_name"),
        width: 400,
        modal: true
      })
  }

  function formatMessage(msg) {
    var message = chrome.i18n.getMessage(msg.code);
    if (message) message = message.replace(/{(\w+)}/g, function(m, p1) {return msg[p1]});
    return message;
  }
}


function QuoraPage() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    var texts = [];
    var elem = $(".QuestionArea .question_qtext").get(0);
    if (elem) texts.push(elem.innerText);
    $(".AnswerBase")
      .each(function() {
        elem = $(this).find(".feed_item_answer_user .user").get(0);
        if (elem) texts.push("Answer by " + elem.innerText);
        elem = $(this).find(".rendered_qtext").get(0);
        if (elem) texts.push.apply(texts, elem.innerText.split(readAloud.paraSplitter));
        elem = $(this).find(".AnswerFooter").get(0);
        if (elem) texts.push(elem.innerText);
      })
    return texts;
  }
}


function KhanAcademy() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    return $("h1:first")
      .add($("> :not(ul, ol), > ul > li, > ol > li", ".paragraph:not(.paragraph .paragraph)"))
      .get()
      .map(function(elem) {
        var text = getInnerText(elem);
        if ($(elem).is("li")) return ($(elem).index() + 1) + ". " + text;
        else return text;
      })
  }
}


function HtmlDoc() {
  var ignoreTags = "select, textarea, button, label, audio, video, dialog, embed, menu, nav, noframes, noscript, object, script, style, svg, aside, footer, #footer";

  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    //find blocks containing text
    var start = new Date();
    var textBlocks = findTextBlocks(100);
    var countChars = textBlocks.reduce(function(sum, elem) {return sum + getInnerText(elem).length}, 0);
    console.log("Found", textBlocks.length, "blocks", countChars, "chars in", new Date()-start, "ms");

    if (countChars < 1000) {
      textBlocks = findTextBlocks(3);
      var texts = textBlocks.map(getInnerText);
      console.log("Using lower threshold, found", textBlocks.length, "blocks", texts.join("").length, "chars");

      //trim the head and the tail
      var head, tail;
      for (var i=3; i<texts.length && !head; i++) {
        var dist = getGaussian(texts, 0, i);
        if (texts[i].length > dist.mean + 2*dist.stdev) head = i;
      }
      for (var i=texts.length-4; i>=0 && !tail; i--) {
        var dist = getGaussian(texts, i+1, texts.length);
        if (texts[i].length > dist.mean + 2*dist.stdev) tail = i+1;
      }
      if (head||tail) {
        textBlocks = textBlocks.slice(head||0, tail);
        console.log("Trimmed", head, tail);
      }
    }

    //mark the elements to be read
    var toRead = [];
    for (var i=0; i<textBlocks.length; i++) {
      toRead.push.apply(toRead, findHeadingsFor(textBlocks[i], textBlocks[i-1]));
      toRead.push(textBlocks[i]);
    }
    $(toRead).addClass("read-aloud");   //for debugging only

    //extract texts
    var texts = toRead.map(getTexts);
    return flatten(texts).filter(isNotEmpty);
  }

  function findTextBlocks(threshold) {
    var skipTags = "h1, h2, h3, h4, h5, h6, p, a[href], " + ignoreTags;
    var isTextNode = function(node) {
      return node.nodeType == 3 && node.nodeValue.trim().length >= 3;
    };
    var isParagraph = function(node) {
      return node.nodeType == 1 && $(node).is("p") && getInnerText(node).length >= threshold;
    };
    var hasTextNodes = function(elem) {
      return someChildNodes(elem, isTextNode) && getInnerText(elem).length >= threshold;
    };
    var hasParagraphs = function(elem) {
      return someChildNodes(elem, isParagraph);
    };
    var containsTextBlocks = function(elem) {
      var childElems = $(elem).children(":not(" + skipTags + ")").get();
      return childElems.some(hasTextNodes) || childElems.some(hasParagraphs) || childElems.some(containsTextBlocks);
    };
    var addBlock = function(elem, multi) {
      if (multi) $(elem).data("read-aloud-multi-block", true);
      textBlocks.push(elem);
    };
    var walk = function() {
      if ($(this).is("frame, iframe")) try {walk.call(this.contentDocument.body)} catch(err) {}
      else if ($(this).is("dl")) addBlock(this);
      else if ($(this).is("ol, ul")) {
        var items = $(this).children().get();
        if (items.some(hasTextNodes)) addBlock(this);
        else if (items.some(hasParagraphs)) addBlock(this, true);
        else if (items.some(containsTextBlocks)) addBlock(this, true);
      }
      else if ($(this).is("tbody")) {
        var rows = $(this).children();
        if (rows.length > 3 || rows.eq(0).children().length > 3) {
          if (rows.get().some(containsTextBlocks)) addBlock(this, true);
        }
        else rows.each(walk);
      }
      else {
        if (hasTextNodes(this)) addBlock(this);
        else if (hasParagraphs(this)) addBlock(this, true);
        else $(this).children(":not(" + skipTags + ")").each(walk);
      }
    };
    var textBlocks = [];
    walk.call(document.body);
    return textBlocks.filter(function(elem) {
      return $(elem).is(":visible") && $(elem).offset().left >= 0;
    })
  }

  function getGaussian(texts, start, end) {
    if (start == undefined) start = 0;
    if (end == undefined) end = texts.length;
    var sum = 0;
    for (var i=start; i<end; i++) sum += texts[i].length;
    var mean = sum / (end-start);
    var variance = 0;
    for (var i=start; i<end; i++) variance += (texts[i].length-mean)*(texts[i].length-mean);
    return {mean: mean, stdev: Math.sqrt(variance)};
  }

  function getTexts(elem) {
    var toHide = $(elem).find(":visible").filter(dontRead).hide();
    $(elem).find("ol, ul").addBack("ol, ul").each(addNumbering);
    var texts = $(elem).data("read-aloud-multi-block")
      ? $(elem).children(":visible").get().map(getText)
      : getText(elem).split(readAloud.paraSplitter);
    $(elem).find(".read-aloud-numbering").remove();
    toHide.show();
    return texts;
  }

  function addNumbering() {
    var children = $(this).children();
    var text = children.length ? getInnerText(children.get(0)) : null;
    if (text && !text.match(/^[(]?(\d|[a-zA-Z][).])/))
      children.each(function(index) {
        $("<span>").addClass("read-aloud-numbering").text((index +1) + ". ").prependTo(this);
      })
  }

  function dontRead() {
    var float = $(this).css("float");
    var position = $(this).css("position");
    return $(this).is(ignoreTags) || $(this).is("sup") || float == "right" || position == "absolute" || position == "fixed";
  }

  function getText(elem) {
    return addMissingPunctuation(elem.innerText).trim();
  }

  function addMissingPunctuation(text) {
    return text.replace(/(\w)(\s*?\r?\n)/g, "$1.$2");
  }

  function findHeadingsFor(block, prevBlock) {
    var result = [];
    var firstInnerElem = $(block).find("h1, h2, h3, h4, h5, h6, p").filter(":visible").get(0);
    var currentLevel = getHeadingLevel(firstInnerElem);
    var node = previousNode(block, true);
    while (node && node != prevBlock) {
      var ignore = $(node).is(ignoreTags);
      if (!ignore && node.nodeType == 1 && $(node).is(":visible")) {
        var level = getHeadingLevel(node);
        if (level < currentLevel) {
          result.push(node);
          currentLevel = level;
        }
      }
      node = previousNode(node, ignore);
    }
    return result.reverse();
  }

  function getHeadingLevel(elem) {
    var matches = elem && /^H(\d)$/i.exec(elem.tagName);
    return matches ? Number(matches[1]) : 100;
  }

  function previousNode(node, skipChildren) {
    if ($(node).is('body')) return null;
    if (node.nodeType == 1 && !skipChildren && node.lastChild) return node.lastChild;
    if (node.previousSibling) return node.previousSibling;
    return previousNode(node.parentNode, true);
  }

  function someChildNodes(elem, test) {
    var child = elem.firstChild;
    while (child) {
      if (test(child)) return true;
      child = child.nextSibling;
    }
    return false;
  }

  function flatten(array) {
    return [].concat.apply([], array);
  }
}


//helpers --------------------------

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

function tryGetTexts(getTexts, millis) {
  return waitMillis(500)
    .then(getTexts)
    .then(function(texts) {
      if (texts && !texts.length && millis-500 > 0) return tryGetTexts(getTexts, millis-500);
      else return texts;
    })

  function waitMillis(millis) {
    return new Promise(function(fulfill) {
      setTimeout(fulfill, millis);
    });
  }
}
