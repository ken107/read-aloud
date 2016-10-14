
$.fn.slider = function() {
  var slider = this.data("slider");
  if (!slider) this.data("slider", slider = new Slider(this.get(0)));
  return slider;
};

$(function() {
  chrome.storage.sync.get(["voiceName", "rate", "pitch", "volume", "spchletMaxLen"], function(settings) {
    chrome.tts.getVoices(function(voices) {
      voices.forEach(function(voice) {
        $("<option>")
          .val(voice.voiceName)
          .text(voice.voiceName)
          .prop("selected", voice.voiceName == (settings.voiceName || defaults.voiceName))
          .appendTo($("#voices"));
      });
    });
    $("#rate").val(settings.rate || defaults.rate);
    $("#pitch").slider().setValue(settings.pitch || defaults.pitch);
    $("#volume").slider().setValue(settings.volume || defaults.volume);
    $("#spchletMaxLen").val(settings.spchletMaxLen || defaults.spchletMaxLen);
  });
  $("#save").click(function() {
    chrome.storage.sync.set({
      voiceName: $("#voices").val(),
      rate: Number($("#rate").val()),
      pitch: $("#pitch").slider().getValue(),
      volume: $("#volume").slider().getValue(),
      spchletMaxLen: $("#spchletMaxLen").val()
    },
    function() {
      $("#status").removeClass("error").addClass("success").text("Saved.").show().delay(3000).fadeOut();
    });
  });
  $("#reset").click(function() {
    chrome.storage.sync.clear();
    location.reload();
  });
});
