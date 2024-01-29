
var readAloudDoc = location.pathname.startsWith("/sample/") ? new KindleSample() : new KindleDoc()


function KindleDoc() {
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    for (; currentIndex<index; currentIndex++) simulateClick(document.getElementById("kr-chevron-right"))
    for (; currentIndex>index; currentIndex--) simulateClick(document.getElementById("kr-chevron-left"))
    return waitMillis(250).then(getTexts)
  }

  function getTexts() {
    const img = $(".kg-full-page-img > img").get(0)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0)
    return new Promise(f => canvas.toBlob(f))
      .then(blob => fetch("https://support.readaloud.app/read-aloud/ocr", {method: "POST", body: blob}))
      .then(res => res.json())
      .then(result => result.texts || fixParagraphs(result.lines))
  }
}


function KindleSample() {
  this.getCurrentIndex = function() {
    return 0
  }

  this.getTexts = function(index) {
    return index == 0 ? getTexts() : null
  }

  function getTexts() {
    const elems = $("#kr-renderer").find("div[data-pid]").get()
      .filter(el => el.firstChild && el.firstChild.tagName != "DIV")
    const index = elems.findIndex(el => el.getBoundingClientRect().top > 100)
    return elems.slice(index)
      .map(getInnerText)
      .filter(text => /[\p{L}\p{Nl}\p{Nd}]/u.test(text))
  }
}
