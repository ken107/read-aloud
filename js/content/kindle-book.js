
var readAloudDoc = new function() {
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    for (; currentIndex<index; currentIndex++) $("#kr-chevron-right").click();
    for (; currentIndex>index; currentIndex--) $("#kr-chevron-left").click();
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
