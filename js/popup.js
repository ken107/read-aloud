
var queryString = getQueryString()
const playerCheckIn$ = new rxjs.Subject()

registerMessageListener("popup", {
  playerCheckIn() {
    playerCheckIn$.next()
  }
})

const playbackEstimate = createPlaybackEstimate()

$(function() {
  if (queryString.isPopup) $("body").addClass("is-popup")
  else getCurrentTab().then(function(currentTab) {return updateSettings({readAloudTab: currentTab.id})})
})



getSettings(["showHighlighting", "readAloudTab"]).then(async settings => {
  if (settings.showHighlighting == 2 && queryString.isPopup) {
    await popout(settings.readAloudTab)
  } else if (settings.showHighlighting == 3 && queryString.isPopup) {
    //reader mode replaces the popup; normally the toolbar button has no popup at all
    const activeTab = await getActiveTab()
    await bgPageInvoke("activateReader", [activeTab.id])
    window.close()
  } else {
    await init()
  }
}).catch(handleError)

async function popout(tabId) {
  const activeTab = await getActiveTab()
  const url = brapi.runtime.getURL("popup.html?tab=" + activeTab.id)
  try {
    if (!tabId) throw "Create"
    const tab = await updateTab(tabId, {url, active: true})
    await updateWindow(tab.windowId, {focused: true}).catch(console.error)
    window.close()
  }
  catch (err) {
    await createWindow({
      url,
      focused: true,
      type: "popup",
      width: 500,
      height: 600,
    })
    window.close()
  }
}

async function init() {
  await domReady()

  $("#btnPlay").click(onPlay);
  $("#btnPause").click(onPause);
  $("#btnStop").click(onStop);
  $("#btnSettings").click(onSettings);
  $("#btnForward").click(onForward);
  $("#btnRewind").click(onRewind);
  $("#decrease-font-size").click(changeFontSize.bind(null, -1));
  $("#increase-font-size").click(changeFontSize.bind(null, +1));
  $("#decrease-window-size").click(changeWindowSize.bind(null, -1));
  $("#increase-window-size").click(changeWindowSize.bind(null, +1));
  $("#toggle-dark-mode").click(toggleDarkMode);
  for (const [id, key] of [
    ["decrease-font-size", "smaller_text"],
    ["increase-font-size", "larger_text"],
    ["decrease-window-size", "smaller_popup"],
    ["increase-window-size", "larger_popup"],
    ["toggle-dark-mode", "toggle_dark_mode"],
  ]) {
    const label = brapi.i18n.getMessage(`playback_status_${key}`)
    $("#" + id).attr({title: label, "aria-label": label})
  }
  const reportLabel = brapi.i18n.getMessage("playback_status_report_issue")
  $("#report-issue").text(reportLabel)

  const controlsToggle = document.getElementById("toggle-reading-controls")
  const controlsLabel = brapi.i18n.getMessage("playback_status_reading_controls")
  controlsToggle.setAttribute("aria-label", controlsLabel)
  controlsToggle.title = controlsLabel
  controlsToggle.addEventListener("click", () => {
    const toolbar = document.getElementById("toolbar")
    toolbar.hidden = !toolbar.hidden
    controlsToggle.setAttribute("aria-expanded", String(!toolbar.hidden))
  })

  new ResizeObserver(entries => {
    const controls = entries[0].target
    const height = controls.hidden ? 0 : controls.getBoundingClientRect().height
      + parseFloat(getComputedStyle(controls).marginTop)
    document.body.style.setProperty("--playback-status-height", `${height}px`)
  }).observe(document.getElementById("reading-controls"));
  const footer = document.getElementById("footer")
  // Return the former always-visible footer line to the reading pane.
  document.body.style.setProperty("--footer-line-height", getComputedStyle(footer).lineHeight)
  new ResizeObserver(() => {
    const style = getComputedStyle(footer)
    const height = style.display === "none" ? 0 : footer.getBoundingClientRect().height
      + parseFloat(style.marginTop)
    document.body.style.setProperty("--announcement-height", `${height}px`)
  }).observe(footer)
  refreshSize();
  checkAnnouncements();

  const {state} = await bgPageInvoke("getPlaybackState")
  if (state == "PAUSED" || state == "STOPPED") onPlay()
}



function handleError(err) {
  if (!err) return;
  if (err.name == "CancellationException") return;

  if (/^{/.test(err.message)) {
    var errInfo = JSON.parse(err.message);

    $("#status").html(formatError(errInfo)).show();
    $("#status a").click(function() {
      switch ($(this).attr("href")) {
        case "#open-extension-settings":
          brapi.tabs.create({url: "chrome://extensions/?id=" + brapi.runtime.id});
          break;
        case "#request-permissions":
          brapi.permissions.request(errInfo.perms)
            .then(function(granted) {
              if (granted) {
                if (errInfo.reload) return reloadAndPlay()
                else $("#btnPlay").click()
              }
            })
          break;
        case "#sign-in":
          getAuthToken({interactive: true})
            .then(function(token) {
              if (token) $("#btnPlay").click();
            })
            .catch(function(err) {
              $("#status").text(err.message).show();
            })
          break;
        case "#auth-wavenet":
          brapi.permissions.request(config.wavenetPerms)
            .then(function(granted) {
              if (granted) bgPageInvoke("authWavenet");
            })
          break;
        case "#open-pdf-viewer":
          brapi.tabs.create({url: config.pdfViewerUrl})
          break
        case "#connect-phone":
          location.href = "connect-phone.html"
          break
      }
    })
  }
  else if (isOpera() && /locked fullscreen/.test(err.message)) {
    $("#status").html("Click <a href='#open-player-tab'>here</a> to start read aloud.").show()
    $("#status a").click(async function() {
      try {
        playerCheckIn$.pipe(rxjs.take(1)).subscribe(() => $("#btnPlay").click())
        const tab = await brapi.tabs.create({
          url: "player.html?opener=popup&autoclose=long",
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
    $("#status").text(err.message).show();
  }
}



rxjs.concat(domReady(), rxjs.interval(500)).subscribe(updateButtons)

async function updateButtons() {
  const [settings, stateInfo] = await Promise.all([
    getSettings(),
    bgPageInvoke("getPlaybackState"),
  ])
  const showHighlighting = settings.showHighlighting != null ? Number(settings.showHighlighting) : defaults.showHighlighting
  var state = stateInfo.state
  const speech = stateInfo.speechInfo
  var playbackErr = stateInfo.playbackError

  if (playbackErr) handleError(playbackErr)
  updatePlaybackStatus(state, speech)

  $("body").toggleClass("is-stopped", state == "STOPPED");
  $("#imgLoading").toggle(state == "LOADING");
  $("#btnSettings").toggle(state == "STOPPED");
  $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
  $("#btnPause").toggle(state == "PLAYING");
  $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
  $("#btnForward, #btnRewind").toggle(state == "PLAYING" || state == "PAUSED");

  if ((showHighlighting == 1 || showHighlighting == 2) && (state == "LOADING" || state == "PAUSED" || state == "PLAYING") && speech) {
    $("body").addClass("has-highlight")
    $("#highlight").show()
    updateHighlighting(speech)
  }
  else {
    $("body").removeClass("has-highlight")
    $("#highlight").hide()
  }
}

function updateHighlighting(speech) {
  var elem = $("#highlight");
  if (!elem.data("texts")
    || elem.data("texts").length != speech.texts.length
    || elem.data("texts").some((text,i) => text != speech.texts[i])
  ) {
    elem.css("direction", speech.isRTL ? "rtl" : "")
      .data({texts: speech.texts, position: null})
      .empty()
    for (let i=0; i<speech.texts.length; i++) {
      makeSpan(speech.texts[i])
        .css("cursor", "pointer")
        .click(onSeek.bind(null, i))
        .appendTo(elem)
    }
  }

  const pos = speech.position
  if (!elem.data("position") || positionDiffers(elem.data("position"), pos)) {
    elem.data("position", pos);
    elem.find(".active").removeClass("active");
    const child = elem.children().eq(pos.index)
    const section = pos.word
    if (section) {
      child.empty()
      const text = speech.texts[pos.index]
      let span
      if (section.startIndex > 0) {
        makeSpan(text.slice(0, section.startIndex))
          .appendTo(child)
      }
      if (section.endIndex > section.startIndex) {
        span = makeSpan(text.slice(section.startIndex, section.endIndex))
          .addClass("active")
          .appendTo(child)
      }
      if (text.length > section.endIndex) {
        makeSpan(text.slice(section.endIndex))
          .appendTo(child)
      }
      if (span) scrollIntoView(span, elem)
    }
    else {
      child.addClass("active")
      scrollIntoView(child, elem)
    }
  }
}

function makeSpan(text) {
  const html = escapeHtml(text).replace(/\r?\n/g, "<br/>")
  return $("<span>").html(html)
}

function positionDiffers(left, right) {
  function rangeDiffers(a, b) {
    if (a == null && b == null) return false
    if (a != null && b != null) return a.startIndex != b.startIndex || a.endIndex != b.endIndex
    return true
  }
  return left.index != right.index ||
    rangeDiffers(left.paragraph, right.paragraph) ||
    rangeDiffers(left.sentence, right.sentence) ||
    rangeDiffers(left.word, right.word)
}

function scrollIntoView(child, scrollParent) {
  const childTop = child.offset().top - scrollParent.offset().top
  const childBottom = childTop + child.outerHeight()
  if (childTop < 0 || childBottom >= scrollParent.height())
    scrollParent.animate({scrollTop: scrollParent[0].scrollTop + childTop - 10})
}



var currentPlayRequestId

function onPlay() {
  $("#status").hide();
  const requestId = currentPlayRequestId = Math.random()
  bgPageInvoke("getPlaybackState")
    .then(function(stateInfo) {
      if (stateInfo.state == "PAUSED") return bgPageInvoke("resume")
      else return bgPageInvoke("playTab", queryString.tab ? [Number(queryString.tab)] : [])
    })
    .then(updateButtons)
    .catch(err => {
      if (requestId == currentPlayRequestId) handleError(err)
      else console.debug("Ignoring error from an earlier request", err)
    })
}

function reloadAndPlay() {
  $("#status").hide();
  bgPageInvoke("reloadAndPlayTab", queryString.tab ? [Number(queryString.tab)] : [])
    .then(updateButtons)
    .catch(handleError)
}

function onPause() {
  bgPageInvoke("pause")
    .then(updateButtons)
    .catch(handleError)
}

function onStop() {
  bgPageInvoke("stop")
    .then(updateButtons)
    .catch(handleError)
}

function onSettings() {
  location.href = "options.html?referer=popup.html";
}

function onForward() {
  bgPageInvoke("forward")
    .then(updateButtons)
    .catch(handleError)
}

function onRewind() {
  bgPageInvoke("rewind")
    .then(updateButtons)
    .catch(handleError)
}

function onSeek(n) {
  bgPageInvoke("seek", [n])
    .catch(handleError)
}

function changeFontSize(delta) {
  getSettings(["highlightFontSize"])
    .then(function(settings) {
      var newSize = (settings.highlightFontSize || defaults.highlightFontSize) + delta;
      if (newSize >= 1 && newSize <= 8) return updateSettings({highlightFontSize: newSize}).then(refreshSize);
    })
    .catch(handleError)
}

function changeWindowSize(delta) {
  getSettings(["highlightWindowSize"])
    .then(function(settings) {
      var newSize = (settings.highlightWindowSize || defaults.highlightWindowSize) + delta;
      if (newSize >= 1 && newSize <= 3) return updateSettings({highlightWindowSize: newSize}).then(refreshSize);
    })
    .catch(handleError)
}

function refreshSize() {
  return getSettings(["highlightFontSize", "highlightWindowSize"])
    .then(function(settings) {
      var fontSize = getFontSize(settings);
      var windowSize = getWindowSize(settings);
      $("#highlight").css({
        "font-size": fontSize,
      })
      if (queryString.isPopup) $("#highlight").css({
        width: isMobileOS() ? "100%" : windowSize[0],
        height: `calc(${windowSize[1]}px - 8px + var(--footer-line-height, 0px) - var(--playback-status-height, 0px) - var(--announcement-height, 0px))`
      })
    })
  function getFontSize(settings) {
    switch (settings.highlightFontSize || defaults.highlightFontSize) {
      case 1: return ".9em";
      case 2: return "1em";
      case 3: return "1.1em";
      case 4: return "1.2em";
      case 5: return "1.3em";
      case 6: return "1.4em";
      case 7: return "1.5em";
      default: return "1.6em";
    }
  }
  function getWindowSize(settings) {
    switch (settings.highlightWindowSize || defaults.highlightWindowSize) {
      case 1: return [430, 380];
      case 2: return [550, 470];
      default: return [750, 500];
    }
  }
}

function checkAnnouncements() {
  var now = new Date().getTime();
  getSettings(["announcement"])
    .then(function(settings) {
      var ann = settings.announcement;
      if (ann && ann.expire > now)
        return ann;
      else
        return ajaxGet(config.serviceUrl + "/read-aloud/announcement")
          .then(JSON.parse)
          .then(function(result) {
            result.expire = now + 6*3600*1000;
            if (ann && result.id == ann.id) {
              result.lastShown = ann.lastShown;
              result.disabled = ann.disabled;
            }
            updateSettings({announcement: result});
            return result;
          })
    })
    .then(function(ann) {
      if (ann.text && !ann.disabled) {
        if (!ann.lastShown || now-ann.lastShown > ann.period*60*1000) {
          showAnnouncement(ann);
          ann.lastShown = now;
          updateSettings({announcement: ann});
        }
      }
    })
}

function showAnnouncement(ann) {
  var html = escapeHtml(ann.text).replace(/\[(.*?)\]/g, "<a target='_blank' href='" + ann.link + "'>$1</a>").replace(/\n/g, "<br/>");
  $("#footer").html(html).addClass("announcement");
  if (ann.disableIfClick)
    $("#footer a").click(function() {
      ann.disabled = true;
      updateSettings({announcement: ann});
    })
}

function toggleDarkMode() {
  const darkMode = document.body.classList.toggle("dark-mode")
  updateSettings({darkMode})
}

function updatePlaybackStatus(state, speech) {
  const active = state === "PLAYING" || state === "PAUSED" || state === "LOADING"
  const panel = document.getElementById("playback-status")
  panel.hidden = !active
  document.getElementById("reading-controls").hidden = !active
  const estimate = playbackEstimate.update(state, speech, performance.now())
  if (!active) {
    panel.open = false
    document.getElementById("toolbar").hidden = true
    document.getElementById("toggle-reading-controls").setAttribute("aria-expanded", "false")
    return
  }
  const message = (key, value) => brapi.i18n.getMessage(`playback_status_${key}`, value)
  const uiLanguage = brapi.i18n.getUILanguage()
  const voice = speech?.voiceName || message("preparing_voice")
  $("#playback-voice").text(voice)
  let progress = estimate ? new Intl.NumberFormat(uiLanguage, {style: "percent"}).format(estimate.percent / 100) : ""
  if (estimate?.seconds != null) {
    progress = estimate.seconds < 60 ? message("less_than_minute")
      : message("minutes_left", new Intl.NumberFormat(uiLanguage).format(Math.ceil(estimate.seconds / 60)))
  }
  if (state === "LOADING") progress = speech?.engine ? message("loading_engine", speech.engine) : message("loading")
  else if (state === "PAUSED") progress = message("paused") + (progress ? ` · ${progress}` : "")
  $("#playback-progress").text(progress)
  const languageName = code => {
    if (!code) return message("unavailable")
    try { return new Intl.DisplayNames([uiLanguage], {type: "language"}).of(code) }
    catch { return code }
  }
  $("#playback-details").text([
    message("detected_language", languageName(speech?.detectedLang)),
    speech?.voiceLanguages?.length ? message("reading_language", new Intl.ListFormat(uiLanguage).format(speech.voiceLanguages.map(languageName))) : null,
    message("voice", voice),
    speech?.voiceLocation ? message("processing", message(speech.voiceLocation)) : null,
  ].filter(Boolean).join("\n"))
}
