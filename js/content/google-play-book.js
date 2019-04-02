
var readAloudDoc = new function() {
  var btnNext = $(".gb-pagination-controls-right").get(0);
  var btnPrev = $(".gb-pagination-controls-left").get(0);
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var delta = Math.abs(index-currentIndex);
    for (; currentIndex<index; currentIndex++) simulateClick(btnNext);
    for (; currentIndex>index; currentIndex--) simulateClick(btnPrev);
    return waitMillis(500+delta*500).then(getTexts);
  }

  function getTexts() {
    var dontRead = $("sup").hide();
    var texts = $("p, .title-chapter, .subtitle-chapter, .p, .p-indent").get()
      .map(function(elem) {return elem.innerText.trim()})
    dontRead.show();
    return texts;
  }
}
