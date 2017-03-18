
var headingTags = ["H1", "H2", "H3", "H4", "H5", "H6"];
var paragraphTags = ["P", "BLOCKQUOTE", "PRE"];
var listTags = ["OL", "UL"];

function parseDocument() {
  if (location.hostname == "docs.google.com") return parseGoogleDocument();
  else return parseHtmlDocument();
}

function parseGoogleDocument() {
  var editor = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page").get();
  return loadPages().then(waitMillis.bind(null, 1000)).then(parse);

  function loadPages() {
    if (!pages.length) return Promise.resolve();
    else {
      var page = pages.pop();
      editor.scrollTop = $(page).position().top;
      return waitMillis(0).then(loadPages);
    }
  }
  function parse() {
    return $(".kix-paragraphrenderer").get().map(getText).filter(isNotEmpty);
  }
}

function parseHtmlDocument() {
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.method) {
    case "readAloudCheck":
      sendResponse(true);
      break;
    case "readAloudGet":
      getDocument().then(sendResponse);
      return true;
  }
});

function getDocument() {
  return Promise.resolve(window.getSelection().toString().trim())
    .then(function(selectedText) {
      return selectedText ? [selectedText] : parseDocument();
    })
    .then(function(texts) {
      return texts.map(removeLinks);
    })
    .then(function(texts) {
      console.log(texts.join("\n\n"));
      return {
        url: location.href,
        domain: location.hostname,
        title: document.title,
        texts: texts,
        lang: document.documentElement.lang || $("html").attr("xml:lang") || $("meta[http-equiv=content-language]").attr("content")
      };
    });
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
