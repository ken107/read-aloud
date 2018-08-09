
var doc = new function() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");
  var selectionState;

  this.getCurrentIndex = function() {
    if (getSelectedText()) return 9999;

    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index, quietly) {
    if (index == 9999) return [getSelectedText()];

    var page = pages.get(index);
    if (page) {
      var oldScrollTop = viewport.scrollTop;
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 2000)
        .then(function(result) {
          if (quietly) viewport.scrollTop = oldScrollTop;
          return result;
        })
    }
    else return null;
  }

  function getTexts() {
    return $(".kix-paragraphrenderer", this).get()
      .map(getInnerText)
      .filter(isNotEmpty);
  }

  function getSelectedText() {
    var doc = googleDocsUtil.getGoogleDocument();
    //first time
    if (!selectionState) selectionState = {caret: doc.caret.index, prev: [], text: doc.selectedText};
    //if caret has not moved, assume selection state hasn't changed
    //if caret has moved, update selection state
    if (selectionState.caret != doc.caret.index) {
      selectionState.caret = doc.caret.index;
      selectionState.prev.push(selectionState.text);
      selectionState.text = doc.selectedText;
      selectionState.prev = selectionState.prev.filter(function(text) {
        var index = selectionState.text.indexOf(text);
        if (index != -1) selectionState.text = selectionState.text.slice(0,index) + selectionState.text.slice(index+text.length);
        return index != -1;
      })
    }
    return selectionState.text;
  }
}
