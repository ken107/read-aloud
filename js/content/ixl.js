
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    var elems = $(".secContentPiece:not(.secContentPiece .secContentPiece)").filter(hasNoHiddenParent);
    var dontRead = elems.find('.legend').hide();
    var texts = elems.get().map(getInnerText);
    dontRead.show();
    return texts;
  }

  function hasNoHiddenParent() {
    var node = this.parentNode;
    while (node && node != document.body) {
      if ($(node).css("visibility") == 'hidden') return false;
      node = node.parentNode;
    }
    return true;
  }
}
