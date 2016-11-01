
var headingTags = ["H1", "H2", "H3", "H4", "H5", "H6"];
var paragraphTags = ["P", "BLOCKQUOTE", "PRE"];

(function() {
  var tags = headingTags.concat(paragraphTags);

  //clear markers
  $(".read-aloud").removeClass("read-aloud");

  //remove unwanted elems
  $(tags.map(function(tag) {return tag + " > div"}).join(", ")).remove();

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
      $(block).children(tags.join(", ")).addClass("read-aloud");
    });
  }
  else {
    //if no text blocks found, read all headings
    $(tags.join(", ")).filter(":visible").addClass("read-aloud");
  }

  //extract texts
  var texts = $(".read-aloud").get().map(getText).filter(isNotEmpty).map(removeLinks).map(addMissingPunctuation);
  console.log(texts.join("\n\n"));

  //return
  return {
    title: document.title,
    texts: texts,
    lang: document.documentElement.lang || $("meta[http-equiv=content-language]").attr("content")
  };
})();

function notOutOfView() {
  return $(this).offset().left >= 0;
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

function addMissingPunctuation(text) {
  return text.split(/ *\n */).map(function(line) {
    if (/[^,;:.!?]$/.test(line)) line += ".";
    return line;
  })
  .join("\n");
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
