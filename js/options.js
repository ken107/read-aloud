
$.fn.slider = function() {
  var slider = this.data("slider");
  if (!slider) this.data("slider", slider = new Slider(this.get(0)));
  return slider;
};

$(function() {
  $("[data-i18n]").each(function() {
    var key = $(this).data("i18n");
    $(this).text(chrome.i18n.getMessage(key));
  });

  Promise.all([getSettings(), getVoices()]).then(spread(function(settings, voices) {
    voices.forEach(function(voice) {
      $("<option>")
        .val(voice.voiceName)
        .text(voice.voiceName)
        .prop("selected", voice.voiceName == settings.voiceName)
        .appendTo($("#voices"));
    });
    $("#rate").slider().setValue(Math.log(settings.rate || defaults.rate) / Math.log(5));
    $("#pitch").slider().setValue(settings.pitch || defaults.pitch);
    $("#volume").slider().setValue(settings.volume || defaults.volume);
    $("#spchletMaxLen").val(settings.spchletMaxLen || defaults.spchletMaxLen);
  }));

  $("#save").click(function() {
    validate();
    updateSettings({
      voiceName: $("#voices").val(),
      rate: Math.pow(5, $("#rate").slider().getValue()),
      pitch: $("#pitch").slider().getValue(),
      volume: $("#volume").slider().getValue(),
      spchletMaxLen: $("#spchletMaxLen").val()
    })
    .then(function() {
      $(".status.success").show().delay(3000).fadeOut();
    });
  });

  $("#reset").click(function() {
    clearSettings().then(() => location.reload());
  });
});

function validate() {
  var spchletMaxLen = restrictValue($("#spchletMaxLen").val(), defaults.minSpchletMaxLen, defaults.maxSpchletMaxLen, defaults.spchletMaxLen);
  $("#spchletMaxLen").val(spchletMaxLen);
}
