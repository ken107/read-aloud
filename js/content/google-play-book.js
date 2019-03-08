
var readAloudDoc = new function() {
  var btnNext = document.getElementsByClassName("gb-pagination-controls-right")[0];
  var btnPrev = document.getElementsByClassName("gb-pagination-controls-left")[0];
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
    return Array.prototype.slice.call(document.getElementsByTagName("p"))
      .map(function(elem) {return elem.innerText})
  }
}
