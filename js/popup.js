
$(function() {
  $("#btnPlay, #btnPause, #btnStop, #btnSettings").hide();
  getBackgroundPage()
    .then(function(master) {return master.getPlaybackState()})
    .then(updateButtons);

  $("#btnPlay").click(function() {
    getBackgroundPage()
      .then(function(master) {return master.play().then(master.getPlaybackState)})
      .then(updateButtons);
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
}
