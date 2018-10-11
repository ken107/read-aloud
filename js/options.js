
Promise.all([getVoices(), getSettings(), getAuthToken(), domReady()])
  .then(spread(initialize));

function initialize(allVoices, settings, authToken) {
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
  var groups = groupVoices(voices, isPremiumVoice);
  if (!groups[true]) groups[true] = [];
  if (!groups[false]) groups[false] = [];
  groups[true].sort(voiceSorter);
  groups[false].sort(voiceSorter);

  var standard = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_standard"))
    .appendTo($("#voices"));
  groups[false].forEach(function(voice) {
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
var populatePremium = function() {
  premium.empty();
  groups[true].forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(premium);
  });
}
  if (authToken) populatePremium();
  else $("<option>").val("@premium").text(brapi.i18n.getMessage("options_enable_premium_voices")).appendTo(premium);

  $("<optgroup>").appendTo($("#voices"));
  var custom = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_custom"))
    .appendTo($("#voices"));
  $("<option>")
    .val("@custom")
    .text(brapi.i18n.getMessage("options_enable_custom_voices"))
    .appendTo(custom)

  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      var voiceName = $(this).val();
      if (voiceName == "@custom") brapi.tabs.create({url: "custom-voices.html"});
      else if (voiceName == "@premium") {
        $("#voice-info").removeClass().addClass("notice").text(brapi.i18n.getMessage("error_login_required")).show();
        getAuthToken({interactive: true})
          .then(function(token) {
            if (token) {
              populatePremium();
              $("#voice-info").removeClass().addClass("success").text(brapi.i18n.getMessage("options_premium_voices_enabled")).show();
            }
          })
      }
      else updateSettings({voiceName: voiceName}).then(showSaveConfirmation);
    });

  $("#languages-edit-button").click(function() {
    location.href = "languages.html";
  })
  $("#voice-info").hide();


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


function groupVoices(voices, keySelector) {
  var groups = {};
  for (var i=0; i<voices.length; i++) {
    var key = keySelector(voices[i]);
    if (groups[key]) groups[key].push(voices[i]);
    else groups[key] = [voices[i]];
  }
  return groups;
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
