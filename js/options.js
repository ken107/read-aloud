
(function() {
  const queryString = getQueryString()
  const domReadyPromise = domReady()
  const playerCheckIn$ = new rxjs.Subject()

  registerMessageListener("options", {
    playerCheckIn() {
      playerCheckIn$.next()
    }
  })


  //i18n
  domReadyPromise
    .then(setI18nText)



  //close button
  domReadyPromise
    .then(() => {
      if (queryString.referer) {
        $("button.close").show()
          .click(function() {
            history.back();
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
      observeSetting("authToken").pipe(
        rxjs.switchMap(token => token ? getAccountInfo(token) : Promise.resolve(null))
      ),
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
          if (voiceName == "@custom") brapi.tabs.create({url: "custom-voices.html"});
          else if (voiceName == "@languages") brapi.tabs.create({url: "languages.html"});
          else if (voiceName == "@premium") brapi.tabs.create({url: "premium-voices.html"});
          else if (voiceName == "@piper") bgPageInvoke("managePiperVoices").catch(console.error)
          else if (voiceName == "@supertonic") bgPageInvoke("manageSupertonicVoices").catch(console.error)
          else updateSettings({voiceName})
        });
      $("#languages-edit-button")
        .click(function() {
          brapi.tabs.create({url: "languages.html"});
        })
    })

  const voicesPopulatedObservable = rxjs.combineLatest([
    voices$,
    observeSetting("languages"),
    brapi.i18n.getAcceptLanguages().catch(err => {console.error(err); return []}),
    domReadyPromise
  ]).pipe(
      rxjs.tap(([voices, languages, acceptLangs]) => populateVoices(voices, {languages}, acceptLangs)),
      rxjs.share()
    )

  rxjs.combineLatest([observeSetting("voiceName"), voicesPopulatedObservable])
    .subscribe(([voiceName]) => {
      $("#voices").val(voiceName || "")
    })

  rxjs.combineLatest(
    observeSetting("voiceName"),
    observeSetting("gcpCreds"),
    domReadyPromise
  ).subscribe(([voiceName, gcpCreds]) => {
    $("#voice-info").toggle(!!voiceName && isGoogleWavenet({voiceName}) && !gcpCreds)
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

  const rateObservable = observeSetting("voiceName")
    .pipe(
      rxjs.switchMap(voiceName => observeSetting("rate" + (voiceName || ""))),
      rxjs.share()
    )

  rxjs.combineLatest([rateObservable, rateSliderPromise])
    .subscribe(([rate, slider]) => {
      slider.setValue(Math.log(rate || defaults.rate) / Math.log($("#rate").data("pow")))
      $("#rate-input").val(rate || defaults.rate)
    })

  rxjs.combineLatest([observeSetting("voiceName"), rateObservable, domReadyPromise])
    .subscribe(([voiceName, rate]) => {
      $("#rate-warning").toggle((!voiceName || isNativeVoice({voiceName})) && rate > 2)
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

  rxjs.combineLatest([observeSetting("pitch"), pitchSliderPromise])
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

  rxjs.combineLatest([observeSetting("volume"), volumeSliderPromise])
    .subscribe(([volume, slider]) => slider.setValue(volume || defaults.volume))



  //showHighlighting
  domReadyPromise
    .then(() => {
      $("#show-highlighting")
        .change(function() {
          updateSettings({showHighlighting: $(this).val()})
        })
    })

  rxjs.combineLatest([observeSetting("showHighlighting"), domReadyPromise])
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

  rxjs.combineLatest([observeSetting("useEmbeddedPlayer"), domReadyPromise])
    .subscribe(([useEmbeddedPlayer]) => {
      $("#audio-playback").val(useEmbeddedPlayer ? "true" : "false")
    })



  //voiceTest
  const demoSpeech = {
    get(lang) {
      return this[lang] || (
        this[lang] = ajaxGet(config.serviceUrl + "/read-aloud/get-demo-speech-text/" + lang).then(JSON.parse)
      )
    }
  }
  const voiceTestSubject = new rxjs.Subject()
  rxjs.defer(() => domReadyPromise).pipe(
    rxjs.exhaustMap(() =>
      voiceTestSubject.pipe(
        rxjs.switchScan(({state}) =>
          rxjs.iif(
            () => state == "STOPPED",
            //play
            rxjs.defer(() => {
              return voices$.pipe(rxjs.take(1))
            }).pipe(
              rxjs.exhaustMap(voices => {
                const voiceName = $("#voices").val()
                const voice = voiceName && findVoiceByName(voices, voiceName)
                const {lang} = parseLang(voice && getFirstLanguage(voice) || "en-US")
                return rxjs.defer(() => demoSpeech.get(lang)).pipe(
                  rxjs.exhaustMap(({text}) => bgPageInvoke("playText", [text, {lang}]))
                )
              }),
              rxjs.exhaustMap(() =>
                rxjs.timer(100, 500).pipe(
                  rxjs.exhaustMap(() => bgPageInvoke("getPlaybackState")),
                  rxjs.takeWhile(({state}) => state != "STOPPED", true)
                )
              )
            ),
            //stop
            rxjs.defer(() => bgPageInvoke("stop")).pipe(
              rxjs.map(() => ({state: "STOPPED"}))
            )
          ),
          {state: "STOPPED"}
        ),
        rxjs.startWith({state: "STOPPED"})
      )
    )
  ).subscribe({
    next({state, playbackError}) {
      $("#test-voice .spinner").toggle(state == "LOADING")
      $("#test-voice [data-i18n]").text(
        brapi.i18n.getMessage(state == "STOPPED" ? "options_test_button" : "options_stop_button")
      )
      if (state == "STOPPED" && playbackError) handleError(playbackError)
      else $("#status").parent().hide()
    },
    error: handleError
  })



  //buttons
  domReadyPromise
    .then(() => {
      $("#test-voice").click(() => voiceTestSubject.next())
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

  settingsChange$
    .subscribe(() => {
      showConfirmation()
      bgPageInvoke("stop").catch(err => "OK")
    })





  function populateVoices(allVoices, settings, acceptLangs) {
    $("#voices").empty()
    $("<option>")
      .val("")
      .text("Auto select")
      .appendTo("#voices")

    //get voices filtered by selected languages
    var selectedLangs = immediate(() => {
      if (settings.languages) return settings.languages.split(',')
      if (settings.languages == '') return null
      const accept = new Set(acceptLangs.map(x => x.split('-',1)[0]))
      const langs = Object.keys(groupVoicesByLang(allVoices)).filter(x => accept.has(x))
      return langs.length ? langs : null
    })
    var voices = !selectedLangs ? allVoices : allVoices.filter(
      function(voice) {
        const voiceLanguages = getVoiceLanguages(voice)
        return !voiceLanguages
          || voiceLanguages.map(parseLang).some(({ lang }) => selectedLangs.includes(lang))
          || isPiperVoice(voice)
          || isSupertonicVoice(voice)
          || isOpenai(voice)
      });

    //group by standard/premium
    var groups = Object.assign({
        experimental: [],
        offline: [],
        premium: [],
        standard: [],
      },
      voices.groupBy(function(voice) {
        if (isPiperVoice(voice) || isSupertonicVoice(voice)) return "experimental"
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

    //create experimental group
    $("<optgroup>").appendTo("#voices")
    const experimental = $("<optgroup>")
      .attr("label", brapi.i18n.getMessage("options_voicegroup_experimental"))
      .appendTo("#voices")
    for (const voice of groups.experimental) {
      $("<option>")
        .val(voice.voiceName)
        .text(voice.voiceName)
        .appendTo(experimental)
    }
    $("<option>")
      .val("@piper")
      .text(brapi.i18n.getMessage("options_enable_piper_voices"))
      .appendTo(experimental)
    $("<option>")
      .val("@supertonic")
      .text(brapi.i18n.getMessage("options_enable_supertonic_voices"))
      .appendTo(experimental)

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
            brapi.permissions.request(config.wavenetPerms)
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
    else if (config.browserId == "opera" && /locked fullscreen/.test(err.message)) {
      $("#status").html("Click <a href='#open-player-tab'>here</a> to start read aloud.").parent().show()
      $("#status a").click(async function() {
        try {
          playerCheckIn$.pipe(rxjs.take(1)).subscribe(() => $("#test-voice").click())
          const tab = await brapi.tabs.create({
            url: "player.html?opener=options&autoclose=long",
            index: 0,
            active: false,
          })
          brapi.tabs.update(tab.id, {pinned: true})
            .catch(console.error)
        } catch (err) {
          handleError(err)
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
