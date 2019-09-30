
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    var res = org.chromium.distiller.DomDistiller.apply()
    var elem = $("<div>").html("<h1>" + res[1] + "</h1>" + res[2][1])
    return elem.children().get().map(getInnerText).filter(isNotEmpty)
  }
}
