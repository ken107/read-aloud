
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    if (hasSelection()) return -1
    return 0
  }

  this.getTexts = function(index) {
    if (index == -1) return getSelectedTexts()
    else if (index == 0) return getTexts()
    else return null
  }

  function hasSelection() {
    return $("p.Paragraph span.Selected").get()
      .some(function(span) {
        return getInnerText(span).trim()
      })
  }

  function getSelectedTexts() {
    var toHide = $("p.Paragraph span:not(.Selected)").hide()
    try {
      return getTexts()
    }
    finally {
      toHide.show()
    }
  }

  function getTexts() {
    return $("p.Paragraph").get()
      .map(getInnerText)
      .filter(isNotEmpty)
  }
}
