
var headingTags = ["H1", "H2", "H3", "H4", "H5", "H6"];
var paragraphTags = ["P", "BLOCKQUOTE"];

(function() {
  var tags = headingTags.concat(paragraphTags);

  //remove unwanted elems
  $(tags.map(function(tag) {return tag + " > div"}).join(", ")).remove();

  //find text blocks with at least 1 paragraphs
  var textBlocks = $("p").not("blockquote > p").parent().get();
  $.uniqueSort(textBlocks);
  textBlocks = $(textBlocks).filter(":visible").filter(notOutOfView).get();
  if (!textBlocks.length) {
    return {
      title: document.title,
      texts: ["This article has no text content"],
      lang: "en"
    };
  }

  //remove all blocks 7x smaller than the longest
  var lengths = textBlocks.map(function(block) {
    return $(block).children(paragraphTags.join(", ")).text().length;
  });
  var longest = Math.max.apply(null, lengths);
  textBlocks = textBlocks.filter(function(block, index) {
    return lengths[index] > longest/7;
  });

  //mark for reading
  for (var i=0; i<textBlocks.length; i++) {
    findHeadingsBetween(textBlocks[i-1], textBlocks[i]).forEach(markForReading);
    $(textBlocks[i]).children(tags.join(", ")).filter(":visible").get().forEach(markForReading);
  }

  //extract texts
  var texts = $(".read-aloud").get().map(getText).filter(isNotEmpty).map(removeLinks);
  console.log(texts.join("\n\n"));

  //return
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

function notOutOfView() {
  return $(this).offset().left >= 0;
}

function markForReading(elem) {
  $(elem).addClass("read-aloud");
}

function getText(elem) {
  return $(elem).text().trim();
}

function isNotEmpty(text) {
  return text;
}

function removeLinks(text) {
  return text.replace(/https?:\/\/\S+/g, "this link.");
}
