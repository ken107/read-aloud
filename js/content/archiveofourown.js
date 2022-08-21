
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    return 0
  }

  this.getTexts = function(index) {
    if (index == 0) return parse()
    else return null
  }

  function parse() {
    var texts = $("#chapters .userstuff p").get().map(getInnerText)
    var titles = $("#chapters .title").get().map(getInnerText)
    return titles.concat(texts)
      .filter(isNotEmpty)
  }
}
