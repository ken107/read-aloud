
$(function() {
  chrome.storage.sync.get(["voiceName", "spchletMaxLen", "lastParaMinLen"], function(settings) {
    chrome.tts.getVoices(function(voices) {
      voices.forEach(function(voice) {
        $("<option>")
          .val(voice.voiceName)
          .text(voice.voiceName)
          .prop("selected", voice.voiceName == (settings.voiceName || defaults.voiceName))
          .appendTo($("#voices"));
      });
    });
    $("#spchletMaxLen").val(settings.spchletMaxLen || defaults.spchletMaxLen);
    $("#lastParaMinLen").val(settings.lastParaMinLen || defaults.lastParaMinLen);
  });
  $("#save").click(function() {
    chrome.storage.sync.set({
      voiceName: $("#voices").val(),
      spchletMaxLen: $("#spchletMaxLen").val(),
      lastParaMinLen: $("#lastParaMinLen").val()
    },
    function() {
      $("#status").removeClass("error").addClass("success").text("Saved.");
    });
  });
  $("#reset").click(function() {
    chrome.storage.sync.clear();
    location.reload();
  });
});
