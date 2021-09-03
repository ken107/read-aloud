
var readAloudDoc = new function() {
  var $btnNext = $(".nav-button.right");
  var $btnPrev = $(".nav-button.left");
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var tasks = [];
    for (; currentIndex<index; currentIndex++) tasks.push(function() {$btnNext.click()}, waitMillis.bind(null, 3000));
    for (; currentIndex>index; currentIndex--) tasks.push(function() {$btnPrev.click()}, waitMillis.bind(null, 3000));
    return tasks.reduce(function(p, task) {return p.then(task)}, Promise.resolve())
      .then(getTexts)
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
