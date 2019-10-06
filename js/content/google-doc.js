
var readAloudDoc = new function() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

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
      .filter(isNotEmpty)
      .map(removeDumbChars)
  }

  function getSelectedText() {
    hack();
    var doc = googleDocsUtil.getGoogleDocument();
    return removeDumbChars(doc.selectedText);
  }

  function removeDumbChars(text) {
    return text && text.replace(/\u200c/g, '');
  }

  function hack() {
    var selections = $(".kix-selection-overlay").get();
    var windowHeight = $(window).height();

    //find one selection-overlay inside viewport
    var index = binarySearch(selections, function(el) {
      var viewportOffset = el.getBoundingClientRect();
      if (viewportOffset.top < 0) return 1;
      if (viewportOffset.top >= windowHeight) return -1;
      return 0;
    })

    if (index != -1) {
      var validSelections = [selections[index]];

      //identify the contiguous selection region
      var line = selections[index].parentNode;
      while (true) {
        line = findPreviousLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      line = selections[index].parentNode;
      while (true) {
        line = findNextLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      //remove all other selection-overlays
      $(selections).not(validSelections).remove();
    }
  }

  function binarySearch(arr, testFn) {
    var m = 0;
    var n = arr.length - 1;
    while (m <= n) {
      var k = (n + m) >> 1;
      var cmp = testFn(arr[k]);
      if (cmp > 0) m = k + 1;
      else if (cmp < 0) n = k - 1;
      else return k;
    }
    return -1;
  }

  function findPreviousLine(line) {
    return line.previousElementSibling ||
      line.parentNode.previousElementSibling && line.parentNode.previousElementSibling.lastElementChild ||
      $(line).closest(".kix-page").prev().find(".kix-page-content-wrapper .kix-lineview").get(-1)
  }

  function findNextLine(line) {
    return line.nextElementSibling ||
      line.parentNode.nextElementSibling && line.parentNode.nextElementSibling.firstElementChild ||
      $(line).closest(".kix-page").next().find(".kix-page-content-wrapper .kix-lineview").get(0)
  }
}
