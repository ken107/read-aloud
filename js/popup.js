
var showGotoPage;

$(function() {
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {
        return master.play()
          .then(updateButtons)
          .then(master.getDocInfo)
          .then(function(docInfo) {return setState("lastUrl", docInfo && docInfo.url)})
      })
      .catch(function(err) {
        reportIssue(err);
        if (/^{/.test(err.message)) $("#status").text(formatError(JSON.parse(err.message)) || err.message).show();
        else window.close();
      });
  });
  $("#btnPause").click(function() {getBackgroundPage().then(callMethod("pause")).then(updateButtons)});
  $("#btnStop").click(function() {getBackgroundPage().then(callMethod("stop")).then(updateButtons)});
  $("#btnSettings").click(function() {location.href = "options.html"});
  $("#btnForward").click(function() {getBackgroundPage().then(callMethod("forward")).then(updateButtons)});
  $("#btnRewind").click(function() {getBackgroundPage().then(callMethod("rewind")).then(updateButtons)});
  $("#hlPageNo").click(function() {showGotoPage = true; updateButtons()});
  $("#btnGotoPage").click(function() {
    showGotoPage = false;
    var pageNo = $("#txtPageNo").val();
    if (isNaN(pageNo)) updateButtons();
    else getBackgroundPage().then(callMethod("gotoPage", [pageNo-1])).then(updateButtons);
  });

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
      master.getCurrentPage(),
      master.getActiveSpeech()
    ])
  })
  .then(spread(function(settings, state, docInfo, pageIndex, speech) {
    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING");
    $("#hlPageNo").toggle(Boolean(docInfo && docInfo.canSeek && !showGotoPage)).text("Page " + (pageIndex+1));
    $("#txtPageNo, #btnGotoPage").toggle(Boolean(docInfo && docInfo.canSeek && showGotoPage));
    $("#attribution").toggle(Boolean(speech && isGoogleTranslate(speech.options.voiceName)));
    $("#highlight").toggle(Boolean(settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && (state == "PAUSED" || state == "PLAYING"));

    if (speech) {
      var pos = speech.getPosition();
      var elem = $("#highlight");
      if (elem.data("texts") != pos.texts) {
        elem.data("texts", pos.texts)
          .empty()
          .append(pos.texts.map(function(texts, i) {
            var spans = texts.map(function(text, j) {return $("<span/>").addClass("s"+i+"-"+j).text(text + " ")});
            return $("<p/>").append(spans);
          }))
      }
      var oldIndex = elem.data("index");
      var index = "s" + pos.index[0] + "-" + pos.index[1];
      if (index != oldIndex) {
        elem.data("index", index);
        if (oldIndex) elem.find("span." + oldIndex).removeClass("active");
        var child = elem.find("span." + index).addClass("active");
        var childTop = child.position().top;
        var childBottom = childTop + child.outerHeight();
        if (childTop < 0 || childBottom >= elem.height()) elem.animate({scrollTop: elem[0].scrollTop + childTop - 10});
      }
    }
  }));
}

function reportIssue(err) {
    $.ajax({
      method: "POST",
      url: "http://app.diepkhuc.com:30112/read-aloud/report-issue",
      data: {comment: err.stack}
    })
}
