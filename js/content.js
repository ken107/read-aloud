
(function() {
  var texts = [];
  var node = findFirst();
  while (node) {
    texts.push($(node).text().trim());
    node = findNext(node);
  }
  return {
    texts: texts,
    lang: document.documentElement.lang
  };
})();

function findFirst() {
  var tags = ["H1","H2","H3","H4","H5","H6","P"];
  for (var i=0; i<tags.length; i++) {
    var elem = $(tags[i] + ":visible:first");
    if (elem.length) return elem.get(0);
  }
  return null;
}

function findNext(current) {
  var node = nextNode(current, true);
  while (node) {
    if (node.nodeType == 1 && ["H1","H2","H3","H4","H5","H6","P","BLOCKQUOTE"].indexOf(node.tagName) != -1) return node;
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

function startsWithLink(elem) {
  var child = elem.firstChild;
  while (child && child.nodeType == 3 && child.nodeValue.trim() == "") child = child.nextSibling;
  return child && child.nodeType == 1 && child.tagName == "A";
}
