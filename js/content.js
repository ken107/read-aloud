
var headingTags = ["H1", "H2", "H3", "H4", "H5", "H6"];
var paragraphTags = ["P", "BLOCKQUOTE"];

(function() {
  var tags = headingTags.concat(paragraphTags);

  //remove unwanted elems
  $(tags.map(function(tag) {return tag + " > div"}).join(", ")).remove();

  //find text blocks with at least 1 paragraphs
  var textBlocks = $("p").not("blockquote > p").parent().filter(":visible").get().filter(notOutOfView);
  $.uniqueSort(textBlocks);

  //extract texts
  var texts = [];
  if (textBlocks.length) {
    for (var i=0; i<textBlocks.length; i++) {
      var headings = findHeadingsBetween(textBlocks[i-1], textBlocks[i]);
      texts.push.apply(texts, headings.map(getText));
      var elems = $(textBlocks[i]).children(tags.join(", ")).filter(":visible").get();
      texts.push.apply(texts, elems.map(getText).filter(isNotEmpty));
    }
  }
  else texts = ["This article has no text content"];

  //post process
  texts = texts.map(removeLinks);

  //return
  console.log(texts.join("\n\n"));
  return {
    title: document.title,
    texts: texts,
    lang: document.documentElement.lang
  };
})();

function findHeadingsBetween(start, end) {
  //enumerate headings
  var headings = [];
  var node = start ? nextNode(start, true) : document.body;
  while (node && node != end) {
    if (node.nodeType == 1) {
      var index = headingTags.indexOf(node.tagName);
      if (index != -1 && $(node).is(":visible")) headings.push({node: node, weight: 100-index});
    }
    node = nextNode(node);
  }

  //retain only the relevant sequence of headings (increasing weights from the bottom)
  headings.reverse();
  var result = [];
  for (var i=0; i<headings.length; i++) {
    if (!result.length) result.push(headings[i]);
    else if (headings[i].weight > result[result.length-1].weight) result.push(headings[i]);
  }
  return result.reverse().map(function(item) {return item.node});
}

function nextNode(node, skipChildren) {
  if (node == document.body && skipChildren) return null;
  if (node.nodeType == 1 && $(node).is(":visible") && !skipChildren && node.firstChild) return node.firstChild;
  if (node.nextSibling) return node.nextSibling;
  return nextNode(node.parentNode, true);
}

function hasMultipleParas(block) {
  return $(block).children("p").length > 1;
}

function getText(elem) {
  return $(elem).text().trim();
}

function isNotEmpty(text) {
  return text;
}

function notOutOfView(elem) {
  return $(elem).offset().left >= 0;
}

function removeLinks(text) {
  return text.replace(/https?:\/\/\S+/g, "this link.");
}
