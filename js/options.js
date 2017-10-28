
$(function() {
  $("[data-i18n]").each(function() {
    var key = $(this).data("i18n");
    $(this).text(chrome.i18n.getMessage(key));
  });
  $(".slider").each(function() {
    $(this).slider({
      min: $(this).data("min"),
      max: $(this).data("max"),
      step: $(this).data("step")
    })
  });
  $("#save").click(function() {
    updateSettings({
      voiceName: $("#voices").val(),
      rate: Math.pow($("#rate").data("pow"), $("#rate").slider("value")),
      pitch: $("#pitch").slider("value"),
      volume: $("#volume").slider("value"),
      showHighlighting: Number($("[name=highlighting]:checked").val()),
    })
    .then(function() {
      $(".status.success").show().delay(3000).fadeOut();
    });
  });
  $("#reset").click(function() {
    clearSettings().then(() => location.reload());
  });
  getSettings().then(init);
});


function init(settings) {
  getVoices()
    .then(initVoices)
    .then(function() {
      if (settings.voiceName) {
        $("#voices").val(settings.voiceName);
      }
    })
  $("#rate").slider("value", Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")));
  $("#pitch").slider("value", settings.pitch || defaults.pitch);
  $("#volume").slider("value", settings.volume || defaults.volume);
  $("[name=highlighting]").prop("checked", false);
  $("[name=highlighting][value=" + (settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) + "]").prop("checked", true);
}

function initVoices(voices) {
  voices.sort(function(a,b) {
    if (isRemoteVoice(a.voiceName)) {
      if (isRemoteVoice(b.voiceName)) return a.voiceName.localeCompare(b.voiceName);
      else return 1;
    }
    else {
      if (isRemoteVoice(b.voiceName)) return -1;
      else return a.voiceName.localeCompare(b.voiceName);
    }
  });
  voices.forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo($("#voices"));
  });
  $("#premium").toggle(!voices.some(function(voice) {return isPremiumVoice(voice.voiceName)}));
}
