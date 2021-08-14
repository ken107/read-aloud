
var readAloudDoc = new function() {
  var context = undefined;
  var btnNext = $("reader-scrubber button", context).get(1);
  var btnPrev = $("reader-scrubber button", context).get(0);
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var delta = Math.abs(index-currentIndex);
    for (; currentIndex<index; currentIndex++) simulateClick(btnNext);
    for (; currentIndex>index; currentIndex--) simulateClick(btnPrev);
    return waitMillis(1500+delta*500).then(getTexts);
  }

  function getTexts() {
    var dontRead = $("sup", context).hide();
    var texts = [];
    $(".gb-segment", context).children(":visible").get()
      .forEach(function(elem) {
        if ($(elem).is(".liste")) handleList(elem, texts);
        else handleOther(elem, texts);
      })
    dontRead.show();
    return texts;
  }

  function handleList(elem, texts) {
    var addNumbering = !hasNumbering(elem);
    $(elem).children().get()
      .forEach(function(child, index) {
        var text = child.innerText.trim();
        if (addNumbering) texts.push((index +1) + ". " + text);
        else texts.push(text);
      })
  }

  function hasNumbering(elem) {
    var firstChild = $(elem).children().get(0);
    return firstChild && firstChild.innerText.trim().match(/^[(]?(\d|[a-zA-Z][).])/);
  }

  function handleOther(elem, texts) {
    var text = elem.innerText.trim();
    if (text) texts.push(text);
  }
}
