
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    return 0
  }

  this.getTexts = function(index) {
    if (index == 0) return parse()
    else return null
  }

  function parse() {
    var texts = $(".chapter .userstuff p").get().map(getInnerText)
    texts.unshift(getInnerText($(".chapter .title").get(0)))
    return texts
  }
}
