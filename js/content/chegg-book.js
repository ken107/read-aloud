
var readAloudDoc = new function() {
  var $btnNext = $(".nav-button.right");
  var $btnPrev = $(".nav-button.left");
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var promise = Promise.resolve()
    var rewind = function() {
      var oldEl = $(".pf").get(0)
      $btnPrev.click()
      return waitFrameChange(oldEl)
    }
    var forward = function() {
      var oldEl = $(".pf").get(0)
      $btnNext.click()
      return waitFrameChange(oldEl)
    }
    for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
    for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
    return promise.then(getTexts)
  }

  function waitFrameChange(oldEl) {
    return repeat({
      action: function() {return $(".pf").get(0)},
      until: function(el) {return el && el.id && el.id != oldEl.id},
      max: 20,
      delay: 500
    })
  }

  function getTexts() {
    return $(".pf:first .pc .t").get()
      .reduce(function(acc, el) {
        var fontSize = getFontSize(el)
        var text = el.innerText.trim()
        if (acc.length && acc[acc.length-1].fontSize == fontSize && !endsWithPunct(acc[acc.length-1].text)) acc[acc.length-1].text += " " + text
        else acc.push({fontSize: fontSize, text: text})
        return acc
      }, [])
      .map(function(item) {
        return item.text
      })
  }

  function getFontSize(el) {
    var match = /\bfs\w+\b/.exec(el.className)
    return match && match[0]
  }

  function endsWithPunct(str) {
    return /[.?!]$/.test(str)
  }
}
