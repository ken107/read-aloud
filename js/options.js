
(function() {
  const queryString = getQueryString()
  const settingsObservable = makeSettingsObservable()
  const domReadyPromise = domReady()
  const voicesPromise = getVoices()


  //i18n
  domReadyPromise
    .then(setI18nText)



  //close button
  domReadyPromise
    .then(() => {
      if (queryString.referer) {
        $("button.close").show()
          .click(function() {
            location.href = queryString.referer;
          })
      }
    })



  //account button
  domReadyPromise
    .then(() => {
      $("#account-button")
        .click(function() {
          getAuthToken({interactive: true})
            .then(token => brapi.tabs.create({url: config.webAppUrl + "/premium-voices.html?t=" + token}))
            .catch(handleError)
          return false;
        })
      $("#logout-button")
        .click(function() {
          clearAuthToken()
          return false;
        })
    })

  rxjs.combineLatest([
      settingsObservable.of("authToken").pipe(rxjs.switchMap(token => token ? getAccountInfo(token) : Promise.resolve(null))),
      domReadyPromise
    ])
    .subscribe(([account]) => showAccountInfo(account))



  //hotkey
  domReadyPromise
    .then(() => {
      $("#hotkeys-link").click(function() {
        brapi.tabs.create({url: getHotkeySettingsUrl()});
      });
    })



  //voice
  domReadyPromise
    .then(() => {
      $("#voices")
        .change(function() {
          var voiceName = $(this).val();
          if (voiceName == "@custom") location.href = "custom-voices.html";
          else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
          else if (voiceName == "@piper") bgPageInvoke("managePiperVoices").catch(console.error)
          else updateSettings({voiceName})
        });
      $("#languages-edit-button")
        .click(function() {
          location.href = "languages.html";
        })
    })

  const voicesPopulatedObservable = rxjs.combineLatest([settingsObservable.of("languages"), voicesPromise, domReadyPromise])
    .pipe(
      rxjs.tap(([languages, voices]) => populateVoices(voices, {languages})),
      rxjs.share()
    )

  rxjs.combineLatest([settingsObservable.of("voiceName"), voicesPopulatedObservable])
    .subscribe(([voiceName]) => {
      $("#voices").val(voiceName || "")
      $("#voice-info").toggle(!!voiceName && isGoogleWavenet({voiceName}))
    })



  //rate
  const rateSliderPromise = domReadyPromise
    .then(() => {
      const slider = createSlider($("#rate").get(0), {
          onChange(value) {
            const rate = Math.pow($("#rate").data("pow"), value)
            updateSetting("rate" + $("#voices").val(), Number(rate.toFixed(3)))
          }
        })
      $("#rate-edit-button")
        .click(function() {
          $("#rate, #rate-input-div").toggle();
        });
      $("#rate-input")
        .change(function() {
          var val = $(this).val().trim();
          if (isNaN(val)) $(this).val(1);
          else if (val < .1) $(this).val(.1);
          else if (val > 10) $(this).val(10);
          else $("#rate-edit-button").hide();
          updateSetting("rate" + $("#voices").val(), Number($(this).val()))
        });
      return slider
    })

  const rateObservable = settingsObservable.of("voiceName")
    .pipe(
      rxjs.switchMap(voiceName => settingsObservable.of("rate" + (voiceName || ""))),
      rxjs.share()
    )

  rxjs.combineLatest([rateObservable, rateSliderPromise])
    .subscribe(([rate, slider]) => {
      slider.setValue(Math.log(rate || defaults.rate) / Math.log($("#rate").data("pow")))
      $("#rate-input").val(rate || defaults.rate)
    })

  rxjs.combineLatest([settingsObservable.of("voiceName"), rateObservable, domReadyPromise])
    .subscribe(([voiceName, rate]) => {
      $("#rate-warning").toggle((!voiceName || !isRemoteVoice({voiceName})) && rate > 2)
    })



  //pitch
  const pitchSliderPromise = domReadyPromise
    .then(() => {
      return createSlider($("#pitch").get(0), {
          onChange(value) {
            updateSettings({pitch: value})
          }
        })
    })

  rxjs.combineLatest([settingsObservable.of("pitch"), pitchSliderPromise])
    .subscribe(([pitch, slider]) => slider.setValue(pitch || defaults.pitch))



  //volume
  const volumeSliderPromise = domReadyPromise
    .then(() => {
      return createSlider($("#volume").get(0), {
          onChange(value) {
            updateSettings({volume: value})
          }
        })
    })

  rxjs.combineLatest([settingsObservable.of("volume"), volumeSliderPromise])
    .subscribe(([volume, slider]) => slider.setValue(volume || defaults.volume))



  //showHighlighting
  domReadyPromise
    .then(() => {
      $("#show-highlighting")
        .change(function() {
          updateSettings({showHighlighting: $(this).val()})
        })
    })

  rxjs.combineLatest([settingsObservable.of("showHighlighting"), domReadyPromise])
    .subscribe(([showHighlighting]) => $("#show-highlighting").val(showHighlighting || defaults.showHighlighting))



  //audioPlayback
  Promise.all([brapi.storage.local.get(["useEmbeddedPlayer"]), domReadyPromise])
    .then(([settings]) => {
      $("#audio-playback")
        .change(function() {
          updateSettings({useEmbeddedPlayer: JSON.parse($(this).val())})
          brapi.runtime.sendMessage({dest: "player", method: "close"})
            .catch(err => "OK")
        })
      $(".audio-playback-visible").toggle(settings.useEmbeddedPlayer ? true : false)
    })

  rxjs.combineLatest([settingsObservable.of("useEmbeddedPlayer"), domReadyPromise])
    .subscribe(([useEmbeddedPlayer]) => {
      $("#audio-playback").val(useEmbeddedPlayer ? "true" : "false")
    })



  //buttons
  domReadyPromise
    .then(() => {
      var demoSpeech = {};
      $("#test-voice")
        .click(async function() {
          try {
            var voiceName = $("#voices").val();
            var voice = voiceName && findVoiceByName(await voicesPromise, voiceName);
            var lang = (voice && voice.lang || "en-US").split("-")[0];
            $("#test-voice .spinner").show();
            $("#status").parent().hide();
            if (!demoSpeech[lang]) {
              demoSpeech[lang] = await ajaxGet(config.serviceUrl + "/read-aloud/get-demo-speech-text/" + lang).then(JSON.parse)
            }
            await bgPageInvoke("playText", [demoSpeech[lang].text, {lang: lang}])
          }
          catch (err) {
            handleError(err);
          }
          finally {
            $("#test-voice .spinner").hide();
          }
        })
      $("#test-voice .spinner").hide();
      $("#reset")
        .click(function() {
          clearSettings()
        });
    })



  //status
  domReadyPromise
    .then(() => {
      $("#status").parent().hide()
    })

  settingsObservable.changes
    .subscribe(() => {
      showConfirmation()
      bgPageInvoke("stop").catch(err => "OK")
    })








  function makeSettingsObservable() {
    const changes = new rxjs.Observable(observer => brapi.storage.local.onChanged.addListener(changes => observer.next(changes)))
      .pipe(rxjs.share())
    return {
      changes,
      of(name) {
        return rxjs.from(brapi.storage.local.get([name]))
          .pipe(
            rxjs.map(settings => settings[name]),
            rxjs.concatWith(changes.pipe(rxjs.filter(settings => name in settings), rxjs.map(settings => settings[name].newValue))),
          )
      }
    }
  }



  function populateVoices(allVoices, settings) {
    $("#voices").empty()
    $("<option>")
      .val("")
      .text("Auto select")
      .appendTo("#voices")

    //get voices filtered by selected languages
    var selectedLangs = settings.languages && settings.languages.split(',');
    var voices = !selectedLangs ? allVoices : allVoices.filter(
      function(voice) {
        return !voice.lang || selectedLangs.includes(voice.lang.split('-',1)[0]);
      });

    //group by standard/premium
    var groups = Object.assign({
        piper: [],
        offline: [],
        premium: [],
        standard: [],
      },
      voices.groupBy(function(voice) {
        if (isPiperVoice(voice)) return "piper"
        if (isOfflineVoice(voice)) return "offline"
        if (isPremiumVoice(voice)) return "premium";
        return "standard"
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
    function getWeight(voice) {
      var weight = 0
      if (isRemoteVoice(voice)) weight += 10
      if (!isReadAloudCloud(voice)) weight += 1
      if (isUseMyPhone(voice)) weight += 1
      return weight
    }
    return getWeight(a)-getWeight(b) || a.voiceName.localeCompare(b.voiceName)
  }



  function showConfirmation() {
    $(".green-check").finish().show().delay(500).fadeOut();
  }

  function handleError(err) {
    if (/^{/.test(err.message)) {
      var errInfo = JSON.parse(err.message);
      $("#status").html(formatError(errInfo)).parent().show();
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
                $("#status").text(err.message).parent().show();
              })
            break;
          case "#auth-wavenet":
            requestPermissions(config.wavenetPerms)
              .then(function(granted) {
                if (granted) bgPageInvoke("authWavenet");
              })
            break;
          case "#connect-phone":
            location.href = "connect-phone.html"
            break
        }
      })
    }
    else {
      $("#status").text(err.message).parent().show();
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



  function createSlider(elem, {onChange, onSlideChange}) {
    var min = $(elem).data("min") || 0;
    var max = $(elem).data("max") || 1;
    var step = 1 / ($(elem).data("steps") || 20);
    var $bg = $(elem).empty().toggleClass("slider", true);
    var $bar = $("<div class='bar'>").appendTo(elem);
    var $track = $("<div class='track'>").appendTo(elem);
    var $knob = $("<div class='knob'>").appendTo($track);

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
    return {
      setValue(value) {
        setPosition((Math.min(value, max)-min) / (max-min))
      }
    }

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
})();
