
Promise.all([
  getVoices(),
  getSettings(),
  brapi.i18n.getAcceptLanguages().catch(err => {console.error(err); return []}),
  domReady()
])
  .then(spread(initialize));

function initialize(allVoices, settings, acceptLangs) {
  setI18nText();
  updateDependents(settings);

  //close button
  var queryString = getQueryString();
  if (queryString.referer) {
    $("button.close").show()
      .click(function() {
        history.back();
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
  populateVoices(allVoices, settings, acceptLangs);
  $("#voices")
    .val(settings.voiceName || "")
    .change(function() {
      var voiceName = $(this).val();
      if (voiceName == "@custom") brapi.tabs.create({url: "custom-voices.html"});
      else if (voiceName == "@languages") brapi.tabs.create({url: "languages.html"});
      else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
      else if (voiceName == "@piper") bgPageInvoke("managePiperVoices")
      else saveSettings({voiceName: voiceName});
    });
  $("#languages-edit-button").click(function() {
    brapi.tabs.create({url: "languages.html"});
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
  const statusTracker$ = new rxjs.Subject()
  statusTracker$.pipe(
    rxjs.switchMap(() =>
      rxjs.interval(500).pipe(
        rxjs.exhaustMap(() => Promise.all([
          bgPageInvoke("getPlaybackState"),
          bgPageInvoke("getPlaybackError")
        ])),
        rxjs.takeWhile(([state]) => state != "STOPPED", true)
      )
    )
  ).subscribe(([state, err]) => {
    if (err) handleError(err)
  })

  $("#test-voice").click(function() {
    var voiceName = $("#voices").val();
    var voice = voiceName && findVoiceByName(allVoices, voiceName);
    var lang = (voice && voice.lang) ? parseLang(voice.lang).code : "en";
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
          .then(() => {
            statusTracker$.next()
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



function populateVoices(allVoices, settings, acceptLangs) {
  //get voices filtered by selected languages
  var selectedLangs = immediate(() => {
    if (settings.languages) return settings.languages.split(',')
    if (settings.languages == '') return null
    const accept = new Set(acceptLangs.map(x => parseLang(x).code))
    const langs = Object.keys(groupVoicesByLang(allVoices)).filter(x => accept.has(x))
    return langs.length ? langs : null
  })
  var voices = !selectedLangs ? allVoices : allVoices.filter(
    function(voice) {
      return !voice.lang || selectedLangs.includes(parseLang(voice.lang).code);
    });

  //group by standard/premium
  var groups = Object.assign({
      piper: [],
      offline: [],
      premium: [],
      standard: [],
      googlecloud: [],
    },
    voices.groupBy(function(voice) {
      if (isGoogleWavenet(voice)) return "googlecloud"
      if (isPiperVoice(voice)) return "piper"
      if (isOfflineVoice(voice)) return "offline"
      if (isPremiumVoice(voice)) return "premium";
      else return "standard";
    }))
  for (var name in groups) groups[name].sort(voiceSorter);

  //create the offline optgroup
  const offline = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_offline"))
    .appendTo($("#voices"))
  for (const voice of groups.offline) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(offline)
  }

  //create piper group
  $("<optgroup>").appendTo("#voices")
  const piper = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_piper"))
    .appendTo("#voices")
  for (const voice of groups.piper) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(piper)
  }
  $("<option>")
    .val("@piper")
    .text(brapi.i18n.getMessage("options_enable_piper_voices"))
    .appendTo(piper)

  //create the standard optgroup
  $("<optgroup>").appendTo($("#voices"))
  var standard = $("<optgroup>")
    .attr("label", brapi.i18n.getMessage("options_voicegroup_standard"))
    .appendTo($("#voices"));
  groups.standard.forEach(function(voice) {
    $("<option>")
      .val(voice.voiceName)
      .text(voice.voiceName)
      .appendTo(standard);
  });

  //create the googlecloud optgroup
  if (groups.googlecloud.length) {
    $("<optgroup>").appendTo("#voices")
    const googlecloud = $("<optgroup>")
      .attr("label", brapi.i18n.getMessage("options_voicegroup_googlecloud"))
      .appendTo("#voices")
    for (const {voiceName} of groups.googlecloud)
      $("<option>").val(voiceName).text(voiceName).appendTo(googlecloud)
  }

  //create the premium optgroup
  if (brapi.identity && brapi.identity.launchWebAuthFlow) {
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
  }
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
    .val("@languages")
    .text(brapi.i18n.getMessage("options_add_more_languages"))
    .appendTo(additional)
  $("<option>")
    .val("@custom")
    .text(brapi.i18n.getMessage("options_enable_custom_voices"))
    .appendTo(additional)
}

function voiceSorter(a, b) {
  function getWeight(voice) {
    var weight = 0
    //native voices should appear before non-natives in Standard group
    if (!isNativeVoice(voice)) weight += 10
    //ReadAloud Generic Voice should appear first among the non-natives
    if (!isReadAloudCloud(voice)) weight += 1
    //UseMyPhone should appear last in Offline group
    if (isUseMyPhone(voice)) weight += 1
    return weight
  }
  return getWeight(a)-getWeight(b) || a.voiceName.localeCompare(b.voiceName)
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

async function updateDependents(settings) {
  if (settings.voiceName && isGoogleWavenet(settings) && !await getSetting("gcpCreds")) $("#voice-info").show();
  else $("#voice-info").hide();

  if (settings.voiceName && !isNativeVoice(settings) && !isGoogleWavenet(settings)) $(".pitch-visible").hide();
  else $(".pitch-visible").show();

  if ((!settings.voiceName || isNativeVoice(settings)) && settings.rate > 2) $("#rate-warning").show();
  else $("#rate-warning").hide();
}

function handleError(err) {
  if (/^{/.test(err.message)) {
    var errInfo = JSON.parse(err.message);
    $("#status").html(formatError(errInfo)).show();
    $("#status a").click(function() {
      switch ($(this).attr("href")) {
        case "#sign-in":
          getBackgroundPage()
            .then(callMethod("getAuthToken", {interactive: true}))
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
          createTab(brapi.runtime.getURL("firefox-perm.html") + "?perms=" + encodeURIComponent(JSON.stringify(config.wavenetPerms)) + "&then=auth-wavenet")
            .then(() => window.close())
          break;
        case "#user-gesture":
          getBackgroundPage()
            .then(callMethod("userGestureActivate"))
            .then(function() {
              $("#test-voice").click();
            })
          break;
        case "#connect-phone":
          location.href = "connect-phone.html"
          break
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
  var $track = $("<div class='track'>").appendTo(elem);
  var $knob = $("<div class='knob'>").appendTo($track);
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
    var rect = $track.get(0).getBoundingClientRect();
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
