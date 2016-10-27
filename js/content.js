
var headings = ["H1","H2","H3","H4","H5","H6"];
var textBlocks = ["P","BLOCKQUOTE"];

(function() {
  var texts = [];
  var state = ["IDLE"];
  var elem = findFirst();
  while (elem) {
    switch (state[0]) {
      case "IDLE":
        if (isHeading(elem) && !startsWithLink(elem)) state = ["FOUND_TEXT_HEADING"];
        break;
      case "FOUND_TEXT_HEADING":
        if (isTextBlock(elem)) state = ["FOUND_TEXT_BLOCK_1"];
        else state = ["IDLE"];
        break;
      case "FOUND_TEXT_BLOCK_1":
        if (isTextBlock(elem)) state = ["FOUND_TEXT_BLOCK_2"];
        else state = ["IDLE"];
        break;
      case "FOUND_TEXT_BLOCK_2":
        if (isTextBlock(elem)) state = ["FOUND_TEXT_SECTION"];
        else state = ["IDLE"];
        break;
      case "FOUND_TEXT_SECTION":
        if (isHeading(elem)) state = ["FOUND_HEADING_AFTER_TEXT_SECTION", elem.tagName, 1];
        break;
      case "FOUND_HEADING_AFTER_TEXT_SECTION":
        if (isHeading(elem)) {
          if (elem.tagName == state[1]) state[2]++;
          else state = ["FOUND_HEADING_AFTER_TEXT_SECTION", elem.tagName, 1];
        }
        else state = ["FOUND_TEXT_SECTION"];
        break;
    }
    if (state[0] == "FOUND_HEADING_AFTER_TEXT_SECTION" && state[2] >= 3) {
      for (var i=0; i<state[2]-1; i++) texts.pop();
      break;
    }
    texts.push($(elem).text().trim());
    elem = findNext(elem);
  }
  for (var i=0; i<texts.length; i++) console.log(texts[i]);
  return {
    title: document.title,
    texts: texts,
    lang: document.documentElement.lang
  };
})();

function findFirst() {
  var tags = headings.concat(textBlocks);
  for (var i=0; i<tags.length; i++) {
    var elem = $(tags[i] + ":visible:first");
    if (elem.length) return elem.get(0);
  }
  return null;
}

function findNext(current) {
  var node = nextNode(current, true);
  while (node) {
    if (node.nodeType == 1 && (isHeading(node) || isTextBlock(node))) return node;
    node = nextNode(node);
  }
  return null;
}

function nextNode(node, skipChildren) {
  if (node == document.body && skipChildren) return null;
  if (node.nodeType == 1 && $(node).is(":visible") && !skipChildren && node.firstChild) return node.firstChild;
  if (node.nextSibling) return node.nextSibling;
  return nextNode(node.parentNode, true);
}

function isHeading(elem) {
  return headings.indexOf(elem.tagName) != -1;
}

function isTextBlock(elem) {
  return textBlocks.indexOf(elem.tagName) != -1;
}

function startsWithLink(elem) {
  var child = elem.firstChild;
  while (child && child.nodeType == 3 && child.nodeValue.trim() == "") child = child.nextSibling;
  return child && child.nodeType == 1 && child.tagName == "A";
}
