
$(function() {
  $("#speech-language").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.stop().then(function() {return master.play(true)}).then(master.getPlaybackState)})
      .then(updateButtons)
      .then(console.error.bind(console));
  });
  $("#btnPlay, #btnPause, #btnStop, #btnSettings").hide();
  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.play().then(master.getPlaybackState)})
      .then(updateButtons)
      .catch(console.error.bind(console));
  });
  $("#btnPause").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.pause().then(master.getPlaybackState)})
      .then(updateButtons);
  });
  $("#btnStop").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.stop().then(master.getPlaybackState)})
      .then(updateButtons);
  });
  $("#btnSettings").click(function() {
    location.href = "options.html";
  });
  $("#btnPlay").click();
});

function updateButtons(state) {
  $("#btnSettings").toggle(state == "STOPPED");
  $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
  $("#btnPause").toggle(state == "PLAYING");
  $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING");

  Promise.all([
    getState("activeSpeech"),
    getState("attributionLastShown")
  ])
  .then(spread(function(speech, lastShown) {
    $("#speech-language").text(languageCodes[parseLang(speech.options.lang).lang] || speech.options.lang);
    $("#attribution").toggle(isCustomVoice(speech.options.voiceName) && (!lastShown || new Date().getTime()-lastShown > 3600*1000));
    if ($("#attribution").is(":visible")) setState("attributionLastShown", new Date().getTime());
  }));
}
