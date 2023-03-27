
var readAloudDoc = ["word-edit.officeapps.live.com", "usc-word-edit.officeapps.live.com"].includes(location.hostname) ? new Docx() : new Pdf()


function Docx() {
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



function Pdf() {
  this.getCurrentIndex = function() {
    const halfHeight = $(window).height() / 2
    const page = $(".OneUp-pdf--loaded .page[data-page-number]").get()
      .reverse()
      .find(page => page.getBoundingClientRect().top < halfHeight)
    return page ? Number($(page).data("pageNumber")) : 0
  }

  this.getTexts = function(index, quietly) {
    const page = $(".OneUp-pdf--loaded .page[data-page-number=" + index + "]").get(0)
    if (page) {
      if (!quietly) page.scrollIntoView()
      const lines = $(".textLayer >span", page).get()
        .map(getInnerText)
        .filter(isNotEmpty)
      return fixParagraphs(lines)
    }
    else {
      return null
    }
  }
}
