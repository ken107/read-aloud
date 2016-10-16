
$(function() {
  $("#btnPlay, #btnPause, #btnStop, #btnSettings").hide();
  chrome.runtime.getBackgroundPage(function(master) {
    master.getPlaybackState(updateButtons);
  });
  $("#btnPlay").click(function() {
    chrome.runtime.getBackgroundPage(function(master) {
      master.play(function() {
        master.getPlaybackState(updateButtons);
      });
    });
  });
  $("#btnPause").click(function() {
    chrome.runtime.getBackgroundPage(function(master) {
      master.pause(function() {
        master.getPlaybackState(updateButtons);
      });
    });
  });
  $("#btnStop").click(function() {
    chrome.runtime.getBackgroundPage(function(master) {
      master.stop(function() {
        master.getPlaybackState(updateButtons);
      });
    });
  });
  $("#btnSettings").click(function() {
    location.href = "options.html";
  });
});

function updateButtons(state) {
  $("#btnSettings").toggle(state == "STOPPED");
  $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
  $("#btnPause").toggle(state == "PLAYING");
  $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING");
}
