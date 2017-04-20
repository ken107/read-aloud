
var showGotoPage;

$(function() {
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {
        return master.play()
          .then(updateButtons)
          .then(master.getDocInfo)
          .then(function(docInfo) {return setState("lastUrl", docInfo.url)})
      })
      .catch(function(err) {
        window.close();
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
      master.getPlaybackState(),
      master.getDocInfo(),
      master.getCurrentPage(),
      master.getActiveSpeech(),
      getState("attributionLastShown")
    ])
  })
  .then(spread(function(state, docInfo, pageIndex, speech, lastShown) {
    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING");
    $("#hlPageNo").toggle(Boolean(docInfo && docInfo.canSeek && !showGotoPage)).text("Page " + (pageIndex+1));
    $("#txtPageNo, #btnGotoPage").toggle(Boolean(docInfo && docInfo.canSeek && showGotoPage));
    $("#attribution").toggle(speech != null && isCustomVoice(speech.options.voiceName) && (!lastShown || new Date().getTime()-lastShown > 3600*1000));
    if ($("#attribution").is(":visible")) setState("attributionLastShown", new Date().getTime());
  }));
}

function reportIssue(err) {
  return new Promise(function(fulfill) {
    $.ajax({
      method: "POST",
      url: "http://app.diepkhuc.com:30112/read-aloud/report-issue",
      data: {comment: err.stack},
      complete: fulfill
    })
  })
}
