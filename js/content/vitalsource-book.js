
var readAloudDoc = {
  getCurrentIndex: () => 0,
  getTexts: index => index == 0 ? getTexts() : null
}

function getTexts() {
  var $paras = $("h1, h2, h3, h4, h5, h6, p");
  var $dontRead = $paras.find("sup").hide();
  var texts = $paras.get().map(function(elem) {return elem.innerText});
  $dontRead.show();
  return texts;
}
