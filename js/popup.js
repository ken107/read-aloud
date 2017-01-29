
$(function() {
  $("#btnPlay, #btnPause, #btnStop, #btnSettings").hide();
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {
        return master.getPlaybackState()
          .then(function(state) {
            if (state == "PAUSED") return master.resume();
            else return master.play();
          })
      })
      .then(updateButtons)
      .catch(console.error.bind(console));
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
  getBackgroundPage()
    .then(function(master) {return master.getPlaybackState()})
    .then(function(state) {
      updateButtons(state);
      if (state != "PLAYING") $("#btnPlay").click();
    });
});

function updateButtons() {
  getBackgroundPage().then(function(master) {
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
