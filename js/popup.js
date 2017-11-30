
var showGotoPage;

$(function() {
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {
        return master.play(function(err) {
            if (err) $("#status").text(err.message).show();
          })
          .then(updateButtons)
          .then(master.getDocInfo)
          .then(function(docInfo) {return setState("lastUrl", docInfo && docInfo.url)})
          .catch(function(err) {
            getSettings().then(function(settings) {
              return master.reportIssue(JSON.stringify(settings), err.stack);
            })
            if (/^{/.test(err.message)) $("#status").text(formatError(JSON.parse(err.message)) || err.message).show();
            else window.close();
          });
      })
  });
  $("#btnPause").click(function() {getBackgroundPage().then(callMethod("pause")).then(updateButtons)});
  $("#btnStop").click(function() {getBackgroundPage().then(callMethod("stop")).then(updateButtons)});
  $("#btnSettings").click(function() {location.href = "options.html"});
  $("#btnForward").click(function() {getBackgroundPage().then(callMethod("forward")).then(updateButtons)});
  $("#btnRewind").click(function() {getBackgroundPage().then(callMethod("rewind")).then(updateButtons)});

  updateButtons()
    .then(getBackgroundPage)
    .then(callMethod("getPlaybackState"))
    .then(function(state) {
      if (state != "PLAYING") $("#btnPlay").click();
    });
  setInterval(updateButtons, 500);
});

function updateButtons() {
  return getBackgroundPage().then(function(master) {
    return Promise.all([
      getSettings(),
      master.getPlaybackState(),
      master.getDocInfo(),
      master.getActiveSpeech()
    ])
  })
  .then(spread(function(settings, state, docInfo, speech) {
    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING");
    $("#attribution").toggle(Boolean(speech && isGoogleTranslate(speech.options.voiceName)));
    $("#highlight").toggle(Boolean(settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && (state == "PAUSED" || state == "PLAYING"));

    if (speech) {
      var pos = speech.getPosition();
      var elem = $("#highlight");
      if (elem.data("texts") != pos.texts) {
        elem.data({texts: pos.texts, index: -1});
        elem.empty();
        for (var i=0; i<pos.texts.length; i++) {
          var html = escapeHtml(pos.texts[i]).replace(/\r?\n/g, "<br/>");
          $("<span>").html(html).appendTo(elem);
        }
      }
      if (elem.data("index") != pos.index) {
        elem.data("index", pos.index);
        elem.children(".active").removeClass("active");
        var child = elem.children().eq(pos.index).addClass("active");
        var childTop = child.position().top;
        var childBottom = childTop + child.outerHeight();
        if (childTop < 0 || childBottom >= elem.height()) elem.animate({scrollTop: elem[0].scrollTop + childTop - 10});
      }
    }
  }));
}
