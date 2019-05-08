
Promise.all([getVoices(), getSettings(), domReady()])
  .then(spread(initialize));

function initialize(allVoices, settings) {
  setI18nText();
  updateDependents(settings);

  //close button
  var queryString = getQueryString();
  if (queryString.referer) {
    $("button.close").show()
      .click(function() {
        location.href = queryString.referer;
      })
  }


  //sliders
  $(".slider").each(function() {
    $(this).slider({
      min: $(this).data("min"),
      max: $(this).data("max"),
      step: $(this).data("step")
    })
  });


  //voices
  populateVoices(allVoices, settings);
  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      var voiceName = $(this).val();
      if (voiceName == "@custom") brapi.tabs.create({url: "custom-voices.html"});
      else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
      else saveSettings({voiceName: voiceName});
    });
  $("#languages-edit-button").click(function() {
    location.href = "languages.html";
  })


  //rate
  $("#rate-edit-button").click(function() {
    $("#rate, #rate-input-div").toggle();
  });
  $("#rate")
    .slider("value", Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")))
    .on("slidechange", function() {
      var val = Math.pow($(this).data("pow"), $(this).slider("value"));
      $("#rate-input").val(val.toFixed(3));
      saveSettings({rate: Number($("#rate-input").val())});
    });
  $("#rate-input")
    .val(settings.rate || defaults.rate)
    .change(function() {
      var val = $(this).val().trim();
      if (isNaN(val)) $(this).val(1);
      else if (val < .1) $(this).val(.1);
      else if (val > 10) $(this).val(10);
      else $("#rate-edit-button").hide();
      saveSettings({rate: Number($("#rate-input").val())});
    });


  //pitch
  $("#pitch")
    .slider("value", settings.pitch || defaults.pitch)
    .on("slidechange", function() {
      saveSettings({pitch: $(this).slider("value")});
    })


  //showHighlighting
  $("[name=highlighting]")
    .prop("checked", function() {
      var active = $(this).val() == (settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting);
      if (active) $(this).parent(".btn").addClass("active");
      return active;
    })
    .change(function() {
      $("[name=highlighting]").parent(".btn").removeClass("active");
      $(this).parent(".btn").addClass("active");
      saveSettings({showHighlighting: Number($(this).val())});
    })


  //buttons
  var demoSpeech = {};
  $("#test-voice").click(function() {
    var voiceName = $("#voices").val();
    var voice = voiceName && findVoiceByName(allVoices, voiceName);
    var lang = (voice && voice.lang || "en-US").split("-")[0];
    $("#test-voice .spinner").show();
    Promise.resolve(demoSpeech[lang])
      .then(function(speech) {
        if (speech) return speech;
        return ajaxGet(config.serviceUrl + "/read-aloud/get-demo-speech-text/" + lang)
          .then(JSON.parse)
          .then(function(result) {
            return demoSpeech[lang] = result;
          })
      })
      .then(function(result) {
        return getBackgroundPage()
          .then(function(master) {
            return master.stop()
              .then(function() {
                return master.playText(result.text);
              })
          })
      })
      .catch(function(err) {
        console.error(err);
        alert("An error occurred: " + err.message);
      })
      .finally(function() {
        $("#test-voice .spinner").hide();
      })
  })
  $("#test-voice .spinner").hide();

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



function populateVoices(allVoices, settings) {
  //get voices filtered by selected languages
  var selectedLangs = settings.languages && settings.languages.split(',');
  var voices = !selectedLangs ? allVoices : allVoices.filter(
    function(voice) {
      return !voice.lang || selectedLangs.includes(voice.lang.split('-',1)[0]);
    });

  //group by standard/premium
  var groups = Object.assign({
      premium: [],
      standard: [],
    },
    voices.groupBy(function(voice) {
      if (isPremiumVoice(voice)) return "premium";
      else return "standard";
    }))
  for (var name in groups) groups[name].sort(voiceSorter);

  //create the standard optgroup
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

  //create the premium optgroup
  if (getBrowser() == "chrome") {
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
      return token ? getAccountInfo(token) : null;
    })
    .then(function(account) {
      if (account && !account.balance) {
        premium.prev().remove();
        premium.remove();
      }
    })
  }

  //create the additional optgroup
  $("<optgroup>").appendTo($("#voices"));
  var additional = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_additional"))
    .appendTo($("#voices"));
  if (getBrowser() == "chrome") {
  $("<option>")
    .val("@premium")
    .text(brapi.i18n.getMessage("options_enable_premium_voices"))
    .appendTo(additional)
  }
  $("<option>")
    .val("@custom")
    .text(brapi.i18n.getMessage("options_enable_custom_voices"))
    .appendTo(additional)
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



function saveSettings(delta) {
  getBackgroundPage()
    .then(function(master) {
      master.stop();
    })
  return updateSettings(delta)
    .then(showConfirmation)
    .then(getSettings)
    .then(updateDependents)
}

function showConfirmation() {
  $(".green-check").finish().show().delay(500).fadeOut();
}

function updateDependents(settings) {
  if (settings.voiceName && isGoogleWavenet(settings)) $("#voice-info").show();
  else $("#voice-info").hide();

  if (settings.voiceName && isRemoteVoice(settings) && !isGoogleWavenet(settings)) $(".pitch-visible").hide();
  else $(".pitch-visible").show();

  if ((!settings.voiceName || !isRemoteVoice(settings)) && settings.rate > 2) $("#rate-warning").show();
  else $("#rate-warning").hide();
}
