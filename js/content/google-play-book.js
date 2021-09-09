
var readAloudDoc = new function() {
  var context = undefined;
  var btnNext = $("reader-scrubber button", context).get(1);
  var btnPrev = $("reader-scrubber button", context).get(0);
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var promise = Promise.resolve()
    var rewind = function() {
      var oldEl = $("reader-page:visible .gb-segment").get(0)
      $(btnPrev).click()
      return waitFrameChange(oldEl)
    }
    var forward = function() {
      var oldEl = $("reader-page:visible .gb-segment").get(0)
      $(btnNext).click()
      return waitFrameChange(oldEl)
    }
    for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
    for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
    return promise.then(getTexts)
  }

  function waitFrameChange(oldEl) {
    return repeat({
      action: function() {return $("reader-page:visible .gb-segment").get(0)},
      until: function(el) {return el && el != oldEl},
      max: 10,
      delay: 500
    })
  }

  function getTexts() {
    var dontRead = $("sup", context).hide();
    var texts = [];
    $("reader-page:visible .gb-segment", context).children(":visible").get()
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
