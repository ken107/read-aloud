
$(function() {
  $("#btnPlay, #btnPause, #btnStop, #btnSettings").hide();
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.play()})
      .then(updateButtons)
      .catch(function(err) {
        console.error(err);
        getState("lastUrl").then(function(url) {
          $.ajax({
            method: "POST",
            url: "http://app.diepkhuc.com:30112/read-aloud/report-issue",
            data: {url: url, comment: err.stack}
          })
        });
      });
  });
  $("#btnPause").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.pause()})
      .then(updateButtons);
  });
  $("#btnStop").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.stop()})
      .then(updateButtons);
  });
  $("#btnSettings").click(function() {
    location.href = "options.html";
  });
  updateButtons()
    .then(getBackgroundPage)
    .then(function(master) {return master.getPlaybackState()})
    .then(function(state) {
      if (state != "PLAYING") $("#btnPlay").click();
    });
});

function updateButtons() {
  return getBackgroundPage().then(function(master) {
    return Promise.all([
      master.activeSpeech,
      master.getPlaybackState(),
      getState("attributionLastShown")
    ])
  })
  .then(spread(function(speech, state, lastShown) {
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING");
    $("#attribution").toggle(speech != null && isCustomVoice(speech.options.voiceName) && (!lastShown || new Date().getTime()-lastShown > 3600*1000));
    if ($("#attribution").is(":visible")) setState("attributionLastShown", new Date().getTime());
  }));
}
