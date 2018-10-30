
Promise.all([getVoices(), getSettings(), domReady()])
  .then(spread(initialize));

function initialize(allVoices, settings) {
  setI18nText();

  //sliders
  $(".slider").each(function() {
    $(this).slider({
      min: $(this).data("min"),
      max: $(this).data("max"),
      step: $(this).data("step")
    })
  });


  //voices
  var selectedLangs = settings.languages && settings.languages.split(',');
  var voices = !selectedLangs ? allVoices : allVoices.filter(
    function(voice) {
      return !voice.lang || selectedLangs.includes(voice.lang.split('-',1)[0]);
    });
  var groups = Object.assign({
      premium: [],
      standard: [],
    },
    voices.groupBy(function(voice) {
      if (isPremiumVoice(voice)) return "premium";
      else return "standard";
    }))
  for (var name in groups) groups[name].sort(voiceSorter);

  var standard = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_standard"))
    .appendTo($("#voices"));
  groups.standard.forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(standard);
  });
  googleWavenetTtsEngine.ready()
    .catch(function(err) {
      standard.children("option")
        .filter(function() {return isGoogleWavenet({voiceName: $(this).val()})})
        .remove()
    })

  $("<optgroup>").appendTo($("#voices"));
  var premium = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_premium"))
    .appendTo($("#voices"));
  groups.premium.forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(premium);
  });
  getAuthToken()
    .then(function(token) {
      return token ? getAccountInfo(token) : {balance: 0};
    })
    .then(function(account) {
      if (!account.balance) {
        premium.prev().remove();
        premium.remove();
      }
    })

  $("<optgroup>").appendTo($("#voices"));
  var additional = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_additional"))
    .appendTo($("#voices"));
  $("<option>")
    .val("@premium")
    .text(brapi.i18n.getMessage("options_enable_premium_voices"))
    .appendTo(additional)
  $("<option>")
    .val("@custom")
    .text(brapi.i18n.getMessage("options_enable_custom_voices"))
    .appendTo(additional)

  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      var voiceName = $(this).val();
      if (voiceName == "@custom") brapi.tabs.create({url: "custom-voices.html"});
      else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
      else updateSettings({voiceName: voiceName}).then(showSaveConfirmation);
      updateVoiceInfo(voiceName);
    });

  $("#languages-edit-button").click(function() {
    location.href = "languages.html";
  })
  updateVoiceInfo(settings.voiceName);


  //rate
  $("#rate-edit-button").click(function() {
    $("#rate, #rate-input-div").toggle();
  });
  $("#rate")
    .slider("value", Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")))
    .on("slidechange", function() {
      var val = Math.pow($(this).data("pow"), $(this).slider("value"));
      $("#rate-input").val(val.toFixed(3));
      $("#rate-warning").toggle(val > 2);
      saveRateSetting();
    });
  $("#rate-input")
    .val(settings.rate || defaults.rate)
    .change(function() {
      var val = $(this).val().trim();
      if (isNaN(val)) $(this).val(1);
      else if (val < .1) $(this).val(.1);
      else if (val > 10) $(this).val(10);
      else $("#rate-edit-button").hide();
      $("#rate-warning").toggle(val > 2);
      saveRateSetting();
    });
  $("#rate-warning")
    .toggle((settings.rate || defaults.rate) > 2);
  function saveRateSetting() {
    updateSettings({rate: Number($("#rate-input").val())}).then(showSaveConfirmation);
  }


  //pitch
  $("#pitch")
    .slider("value", settings.pitch || defaults.pitch)
    .on("slidechange", function() {
      updateSettings({pitch: $(this).slider("value")}).then(showSaveConfirmation);
    })


  //volume
  $("#volume")
    .slider("value", settings.volume || defaults.volume)
    .on("slidechange", function() {
      updateSettings({volume: $(this).slider("value")}).then(showSaveConfirmation);
    })


  //showHighlighting
  $("[name=highlighting]")
    .prop("checked", function() {
      return $(this).val() == (settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting);
    })
    .change(function() {
      updateSettings({showHighlighting: Number($(this).val())}).then(showSaveConfirmation);
    })


  //buttons
  $("#reset").click(function() {
    clearSettings().then(function() {
      location.reload();
    })
  });


  //hot key
  $("#hotkeys-link").click(function() {
    brapi.tabs.create({url: getHotkeySettingsUrl()});
  });
}



function voiceSorter(a, b) {
  if (isRemoteVoice(a)) {
    if (isRemoteVoice(b)) return a.voiceName.localeCompare(b.voiceName);
    else return 1;
  }
  else {
    if (isRemoteVoice(b)) return -1;
    else return a.voiceName.localeCompare(b.voiceName);
  }
}

function showSaveConfirmation() {
  $(".status.success").finish().show().delay(500).fadeOut();
}

function updateVoiceInfo(voiceName) {
  if (voiceName && isGoogleWavenet({voiceName: voiceName})) {
    $("#voice-info")
      .html("Note: This voice may become unavailable at any time. <a href='http://blog.readaloud.app/2018/10/the-state-of-text-to-speech-technology.html' target='_blank'>Read more</a> about it on our blog.")
      .show()
  }
  else $("#voice-info").hide();
}
