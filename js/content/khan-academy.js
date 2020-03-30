
var readAloudDoc = new function() {
  this.getCurrentIndex = function() {
    return 0;
  }

  this.getTexts = function(index) {
    if (index == 0) return parse();
    else return null;
  }

  function parse() {
    var elems = $("h1:first")
      .add($("> :not(ul, ol), > ul > li, > ol > li", ".paragraph:not(.paragraph .paragraph)"))
    var dontRead = elems.find(".katex, legend").hide();
    var texts = elems.get()
      .map(function(elem) {
        var text = getInnerText(elem);
        if ($(elem).is("li")) return ($(elem).index() + 1) + ". " + text;
        else return text;
      })
    dontRead.show();
    return texts;
  }
}
