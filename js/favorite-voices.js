(function() {
  const domReadyPromise = domReady()
  const demoSpeech = {
    get(lang) {
      return this[lang] || (
        this[lang] = ajaxGet(config.serviceUrl + "/read-aloud/get-demo-speech-text/" + lang).then(JSON.parse)
      )
    }
  }
  //the sample currently playing, {voiceName, lang, state}
  let sample = null


  domReadyPromise
    .then(() => {
      setI18nText()
      $("button.close").click(function() {
        if (history.length > 1) history.back()
        else window.close()
      })
    })

  rxjs.combineLatest([
    voices$,
    observeSetting("languages"),
    brapi.i18n.getAcceptLanguages().catch(err => {console.error(err); return []}),
    domReadyPromise
  ]).subscribe(([voices, languages, acceptLangs]) => {
    populateGroups(voices, languages, acceptLangs)
    showSampleState()
    getSetting("favoriteVoices").then(showFavorites)
  })

  rxjs.combineLatest([observeSetting("favoriteVoices"), domReadyPromise])
    .subscribe(([favoriteVoices]) => showFavorites(favoriteVoices))



  function populateGroups(voices, languages, acceptLangs) {
    const voicesForLang = groupVoicesByLang(voices)
    const selectedLangs = immediate(() => {
      if (languages) return languages.split(',')
      const accept = new Set(acceptLangs.map(x => x.split('-',1)[0]))
      const langs = languages == '' ? [] : Object.keys(voicesForLang).filter(x => accept.has(x))
      //no language selected, list all languages
      return langs.length ? langs : Object.keys(voicesForLang)
    })

    const groups = langList
      .filter(item => selectedLangs.includes(item.code) && voicesForLang[item.code])
      .map(item => ({lang: item.code, name: item.name, voices: voicesForLang[item.code]}))
    if (voicesForLang["<any>"]) {
      groups.push({lang: null, name: brapi.i18n.getMessage("favorites_multilingual"), voices: voicesForLang["<any>"]})
    }

    $("#voice-groups").empty()
    if (!groups.length) {
      $("<p>").text(brapi.i18n.getMessage("favorites_no_voices")).appendTo("#voice-groups")
    }
    for (const group of groups) {
      $("<h5>").text(group.name).appendTo("#voice-groups")
      const list = $("<ul>").addClass("voice-group").appendTo("#voice-groups")
      for (const voice of group.voices.sort(voiceSorter)) {
        const lang = group.lang || parseLang(getFirstLanguage(voice) || "en-US").lang
        const item = $("<li>").appendTo(list)
        $("<button>")
          .attr("type", "button")
          .addClass("star")
          .attr("data-voice", voice.voiceName)
          .text("☆")
          .click(function() {
            toggleFavoriteVoice(voice.voiceName, $(this).attr("aria-pressed") != "true")
              .catch(showError)
          })
          .appendTo(item)
        $("<span>").addClass("voice-name").text(voice.voiceName).appendTo(item)
        $("<a>")
          .attr("href", "#")
          .addClass("sample")
          .attr("data-voice", voice.voiceName)
          .attr("data-lang", lang)
          .click(function() {
            toggleSample(voice.voiceName, lang)
            return false
          })
          .appendTo(item)
      }
    }
  }

  function showFavorites(favoriteVoices) {
    const favorites = new Set(favoriteVoices || [])
    $(".star").each(function() {
      const favorite = favorites.has($(this).attr("data-voice"))
      $(this)
        .text(favorite ? "★" : "☆")
        .attr("aria-pressed", String(favorite))
        .attr("title", brapi.i18n.getMessage(favorite ? "favorites_remove" : "favorites_add"))
        .attr("aria-label", brapi.i18n.getMessage(favorite ? "favorites_remove" : "favorites_add"))
    })
  }

  //same mechanism as the options page Test button, but with a specific voice
  async function toggleSample(voiceName, lang) {
    const wasPlaying = sample && sample.voiceName == voiceName && sample.lang == lang
    if (sample) {
      sample.state = "STOPPED"
      sample = null
      showSampleState()
      await bgPageInvoke("stop").catch(console.error)
    }
    if (wasPlaying) return

    const current = sample = {voiceName, lang, state: "LOADING"}
    $("#status").prop("hidden", true)
    showSampleState()
    try {
      const {text} = await demoSpeech.get(lang)
      if (current != sample) return
      await bgPageInvoke("playText", [text, {lang, voiceName}])
      while (current == sample) {
        const {state, playbackError} = await bgPageInvoke("getPlaybackState")
        if (current != sample) return
        current.state = state
        showSampleState()
        if (state == "STOPPED") {
          if (playbackError) showError(playbackError)
          break
        }
        await new Promise(f => setTimeout(f, 500))
      }
    }
    catch (err) {
      if (current == sample) showError(err)
    }
    finally {
      if (current == sample) {
        sample = null
        showSampleState()
      }
    }
  }

  function showSampleState() {
    $(".sample").each(function() {
      const playing = sample
        && sample.voiceName == $(this).attr("data-voice")
        && sample.lang == $(this).attr("data-lang")
      $(this).text(brapi.i18n.getMessage(playing ? "favorites_stop" : "favorites_sample"))
    })
  }

  function showError(err) {
    if (/^{/.test(err.message)) {
      $("#status").html(formatError(JSON.parse(err.message))).prop("hidden", false)
      $("#status a").click(function() {
        switch ($(this).attr("href")) {
          case "#sign-in":
            getAuthToken({interactive: true})
              .then(() => $("#status").prop("hidden", true))
              .catch(showError)
            break
          case "#auth-wavenet":
            brapi.permissions.request(config.wavenetPerms)
              .then(function(granted) {
                if (granted) bgPageInvoke("authWavenet")
              })
            break
          case "#connect-phone":
            location.href = "connect-phone.html"
            break
        }
        return false
      })
    }
    else {
      $("#status").text(err.message).prop("hidden", false)
    }
  }

  function voiceSorter(a, b) {
    function getWeight(voice) {
      //same order as the voice list in the options page
      if (isPiperVoice(voice) || isSupertonicVoice(voice) || isNghiTtsVoice(voice)) return 1
      if (isOfflineVoice(voice)) return 0
      if (isPremiumVoice(voice)) return 4
      return isNativeVoice(voice) ? 2 : 3
    }
    return getWeight(a)-getWeight(b)
      || (a.extensionId || "").localeCompare(b.extensionId || "")
      || a.voiceName.localeCompare(b.voiceName)
  }
})();
