
$(function() {
  chrome.storage.sync.get("voiceName", function(saved) {
    chrome.tts.getVoices(function(voices) {
      voices.forEach(function(voice) {
        $("<option>").val(voice.voiceName).text(voice.voiceName).prop("selected", voice.voiceName == saved.voiceName).appendTo($("#voices"));
      });
    });
  });
  $("#save").click(function() {
    chrome.storage.sync.set({
      voiceName: $("#voices").val()
    },
    function() {
      $("#status").text("Saved");
    });
  });
});
