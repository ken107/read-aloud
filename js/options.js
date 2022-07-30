
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

  //account button
  $("#account-button")
    .click(function() {
      getAuthToken({interactive: true})
        .then(function(token) {
          brapi.tabs.create({url: config.webAppUrl + "/premium-voices.html?t=" + token});
        })
        .catch(handleError)
      return false;
    })

  //logout button
  $("#logout-button")
    .click(function() {
      clearAuthToken()
        .then(function() {
          showAccountInfo(null);
        })
        .catch(console.error)
      return false;
    })


  //rate slider
  createSlider($("#rate").get(0), Math.log(settings.rate || defaults.rate) / Math.log($("#rate").data("pow")), function(value) {
    value = Math.pow($("#rate").data("pow"), value);
    $("#rate-input").val(value.toFixed(3));
    saveSettings({rate: Number($("#rate-input").val())});
  })

  //pitch slider
  createSlider($("#pitch").get(0), settings.pitch || defaults.pitch, function(value) {
    saveSettings({pitch: value});
  })

  //volume slider
  createSlider($("#volume").get(0), settings.volume || defaults.volume, function(value) {
    saveSettings({volume: value});
  })


  //voices
  populateVoices(allVoices, settings);
  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      var voiceName = $(this).val();
      if (voiceName == "@custom") location.href = "custom-voices.html";
      else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
      else saveSettings({voiceName: voiceName});
    });
  $("#languages-edit-button").click(function() {
    location.href = "languages.html";
  })


  //rate input
  $("#rate-edit-button").click(function() {
    $("#rate, #rate-input-div").toggle();
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


  //showHighlighting
  $("#show-highlighting")
    .val(settings.showHighlighting || defaults.showHighlighting)
    .change(function() {
      saveSettings({showHighlighting: $(this).val()})
    })


  //buttons
  var demoSpeech = {};
  $("#test-voice").click(function() {
    var voiceName = $("#voices").val();
    var voice = voiceName && findVoiceByName(allVoices, voiceName);
    var lang = (voice && voice.lang || "en-US").split("-")[0];
    $("#test-voice .spinner").show();
    $("#status").hide();
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
        return bgPageInvoke("stop")
          .then(function() {
            return bgPageInvoke("playText", [result.text, {lang: lang}]);
          })
      })
      .catch(function(err) {
        handleError(err);
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

  //create the premium optgroup
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
      showAccountInfo(account);
      if (account && !account.balance) {
        premium.prev().remove();
        premium.remove();
      }
    })

  //create the additional optgroup
  $("<optgroup>").appendTo($("#voices"));
  var additional = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_additional"))
    .appendTo($("#voices"));
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
  bgPageInvoke("stop");
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

function handleError(err) {
  if (/^{/.test(err.message)) {
    var errInfo = JSON.parse(err.message);
    $("#status").html(formatError(errInfo)).show();
    $("#status a").click(function() {
      switch ($(this).attr("href")) {
        case "#sign-in":
          getAuthToken({interactive: true})
            .then(function(token) {
              if (token) {
                $("#test-voice").click();
                getAccountInfo(token).then(showAccountInfo);
              }
            })
            .catch(function(err) {
              $("#status").text(err.message).show();
            })
          break;
        case "#auth-wavenet":
          requestPermissions(config.wavenetPerms)
            .then(function(granted) {
              if (granted) bgPageInvoke("authWavenet");
            })
          break;
        case "#user-gesture":
          getBackgroundPage()
            .then(callMethod("userGestureActivate"))
            .then(function() {
              $("#test-voice").click();
            })
          break;
      }
    })
  }
  else {
    $("#status").text(err.message).show();
  }
}

function showAccountInfo(account) {
  if (account) {
    $("#account-email").text(account.email);
    $("#account-info").show();
  }
  else {
    $("#account-info").hide();
  }
}



function createSlider(elem, defaultValue, onChange, onSlideChange) {
  var min = $(elem).data("min") || 0;
  var max = $(elem).data("max") || 1;
  var step = 1 / ($(elem).data("steps") || 20);
  var $bg = $(elem).empty().toggleClass("slider", true);
  var $bar = $("<div class='bar'>").appendTo(elem);
  var $knob = $("<div class='knob'>").appendTo(elem);
  setPosition((defaultValue-min) / (max-min));

  $bg.click(function(e) {
    var pos = calcPosition(e);
    setPosition(pos);
    onChange(min + pos*(max-min));
  })
  $knob.click(function() {
    return false;
  })
  $knob.on("mousedown touchstart", function() {
    onSlideStart(function(e) {
      var pos = calcPosition(e);
      setPosition(pos);
      if (onSlideChange) onSlideChange(min + pos*(max-min));
    },
    function(e) {
      var pos = calcPosition(e);
      setPosition(pos);
      onChange(min + pos*(max-min));
    })
    return false;
  })

  function setPosition(pos) {
    var percent = (100 * pos) + "%";
    $knob.css("left", percent);
    $bar.css("width", percent);
  }
  function calcPosition(e) {
    var rect = $bg.get(0).getBoundingClientRect();
    var position = (e.clientX - rect.left) / rect.width;
    position = Math.min(1, Math.max(position, 0));
    return step * Math.round(position / step);
  }
}

function onSlideStart(onSlideMove, onSlideStop) {
  $(document).on("mousemove", onSlideMove);
  $(document).on("mouseup mouseleave", onStop);
  $(document).on("touchmove", onTouchMove);
  $(document).on("touchend touchcancel", onTouchEnd);

  function onTouchMove(e) {
    e.clientX = e.originalEvent.changedTouches[0].clientX;
    e.clientY = e.originalEvent.changedTouches[0].clientY;
    onSlideMove(e);
    return false;
  }
  function onTouchEnd(e) {
    e.clientX = e.originalEvent.changedTouches[0].clientX;
    e.clientY = e.originalEvent.changedTouches[0].clientY;
    onStop(e);
    return false;
  }
  function onStop(e) {
    $(document).off("mousemove", onSlideMove);
    $(document).off("mouseup mouseleave", onStop);
    $(document).off("touchmove", onTouchMove);
    $(document).off("touchend touchcancel", onTouchEnd);
    if (onSlideStop) onSlideStop(e);
    return false;
  }
}
