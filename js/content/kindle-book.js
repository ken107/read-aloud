
var readAloudDoc = new function() {
  var currentIndex = 0;
  var lastText;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var mainDoc = getMainDoc();
    for (; currentIndex<index; currentIndex++) $("#kindleReader_pageTurnAreaRight", mainDoc).click();
    for (; currentIndex>index; currentIndex--) $("#kindleReader_pageTurnAreaLeft", mainDoc).click();
    return tryGetTexts(getTexts, 4000);
  }

  function getTexts() {
    var mainDoc = getMainDoc();
    var texts = [];
    $("#column_0_frame_0, #column_0_frame_1, #column_1_frame_0, #column_1_frame_1", mainDoc)
    .filter(function() {
      return this.style.visibility != "hidden";
    })
    .each(function() {
      var frame = this;
      var frameHeight = $(frame).height();
      var dontRead = $("sup", frame.contentDocument).hide();
      $(".k4w", frame.contentDocument).parent().addClass("read-aloud");
      $(".read-aloud .read-aloud", frame.contentDocument).removeClass("read-aloud");
      $(".read-aloud", frame.contentDocument).each(function() {
        var top = $(this).offset().top;
        var bottom = top + $(this).height();
        if (top >= 0 && top < frameHeight) {
          var text = this.innerText.trim();
          if (text) {
            if ($(this).is("li")) texts.push(($(this).index() +1) + ". " + text);
            else texts.push(text);
          }
        }
      })
      dontRead.show();
    })
    var out = [];
    for (var i=0; i<texts.length; i++) {
      if (texts[i] != (out.length ? out[out.length-1] : lastText)) out.push(texts[i]);
    }
    lastText = out[out.length-1];
    return out;
  }

  function getMainDoc() {
    return document.getElementById("KindleReaderIFrame").contentDocument;
  }
}
