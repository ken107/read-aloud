
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    var bottomFold = $(window).height()
    var headings = $("h1").get()
    if (headings.length > 0) {
      var index = headings.length -1
      while (index > 0 && headings[index].getBoundingClientRect().y >= bottomFold) index--
      return index
    }
    else {
      return 0
    }
  }

  this.getTexts = function(chapterIndex) {
    return Promise.resolve()
      .then(function() {
        if (chapterIndex >= $("h1").length) {
          document.documentElement.scrollTop = document.documentElement.scrollHeight
          return waitMillis(1500)
        }
      })
      .then(function() {
        var headings = $("h1").get()
        if (chapterIndex >= headings.length) return null
        var heading = headings[chapterIndex]
        document.documentElement.scrollTop = $(heading).offset().top -80

        var elems = $("h1, .cha-paragraph p").get()
        var startIndex = elems.indexOf(heading)
        if (startIndex == -1) {
          console.error("FATAL: unexpected")
          return null
        }
        var endIndex = startIndex +1
        while (endIndex < elems.length && elems[endIndex].tagName != "H1") endIndex++

        return elems.slice(startIndex, endIndex)
          .map(getInnerText)
      })
  }
}
