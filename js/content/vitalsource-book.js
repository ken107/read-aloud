
if (location.href.startsWith("https://jigsaw.")) {
  var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});
  var port = brapi.runtime.connect({name: "ReadAloudGetTextsScript"});
  var peer = new RpcPeer(new ExtensionMessagingPeer(port));
  peer.invoke("onTexts", getTexts())
    .then(function() {peer.disconnect()})
}
else {
  var readAloudDoc = new ReadAloudDoc();
}



function ReadAloudDoc() {
  var btnNext = $(".next-button").get(0) || $("[aria-label=Next]").get(0) || $("[role=slider]").parent().find("button").get(1);
  var btnPrev = $(".previous-button").get(0) || $("[aria-label=Previous]").get(0) || $("[role=slider]").parent().find("button").get(0);
  var currentIndex = 0;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var tasks = [];
    for (; currentIndex<index; currentIndex++) tasks.push(function() {$(btnNext).click()}, waitMillis.bind(null, 2500));
    for (; currentIndex>index; currentIndex--) tasks.push(function() {$(btnPrev).click()}, waitMillis.bind(null, 2500));
    return tasks.reduce(function(p, task) {return p.then(task)}, Promise.resolve())
      .then(function() {
        return ["The text to read is in another frame."];
      })
  }
}


function getTexts() {
  var $paras = $("h1, h2, h3, h4, h5, h6, p");
  var $dontRead = $paras.find("sup").hide();
  var texts = $paras.get().map(function(elem) {return elem.innerText});
  $dontRead.show();
  return texts;
}
