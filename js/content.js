
(function() {
  var current;
  next();

  function next() {
    current = findNext(current);
    if (current) {
      chrome.runtime.sendMessage({ method: "speak", text: $(current).text() }, function(response) {
        if (response.method == "onComplete") next();
      });
    }
  }
})();

function findNext(current) {
  var node = current ? nextNode(current, true) : nextNode(document.body);
  while (node) {
    if (["H1","H2","H3","H4","H5","H6","P"].indexOf(node.tagName) != -1) return node;
    node = nextNode(node);
  }
}

function nextNode(node, skipChildren) {
  if (node.nodeType == 1 && $(node).is(":visible") && !skipChildren && node.firstChild) return node.firstChild;
  if (node.nextSibling) return node.nextSibling;
  return nextNode(node.parentNode, true);
}
