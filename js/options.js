
$.fn.slider = function() {
  var slider = this.data("slider");
  if (!slider) this.data("slider", slider = new Slider(this.get(0)));
  return slider;
};

$(function() {
  Promise.all([getSettings(), getVoices()]).then(spread(function(settings, voices) {
    voices.forEach(function(voice) {
      $("<option>")
        .val(voice.voiceName)
        .text(voice.voiceName)
        .prop("selected", voice.voiceName == settings.voiceName)
        .appendTo($("#voices"));
    });
    $("#rate").val(settings.rate || defaults.rate);
    $("#pitch").slider().setValue(settings.pitch || defaults.pitch);
    $("#volume").slider().setValue(settings.volume || defaults.volume);
    $("#spchletMaxLen").val(settings.spchletMaxLen || defaults.spchletMaxLen);
  }));
  $("#save").click(function() {
    updateSettings({
      voiceName: $("#voices").val(),
      rate: Number($("#rate").val()),
      pitch: $("#pitch").slider().getValue(),
      volume: $("#volume").slider().getValue(),
      spchletMaxLen: $("#spchletMaxLen").val()
    })
    .then(function() {
      $("#status").removeClass("error").addClass("success").text("Saved.").show().delay(3000).fadeOut();
    });
  });
  $("#reset").click(function() {
    clearSettings().then(location.reload);
  });
});
