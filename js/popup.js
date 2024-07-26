
var queryString = getQueryString()

var playbackErrorProcessor = {
  lastError: {},
  next: function(err) {
    if (err.message != this.lastError.message) {
      this.lastError = err
      handleError(err)
    }
  }
}

const piperInitializingSubject = new rxjs.Subject()
piperInitializingSubject
  .pipe(
    rxjs.distinctUntilChanged()
  )
  .subscribe(isInitializing => {
    if (isInitializing) $("#status").text("Piper engine initializing...").show()
    else $("#status").hide()
  })

const dispatcher = makeDispatcher("popup", {
  close() {
    window.close()
  }
})
brapi.runtime.onMessage.addListener(dispatcher.dispatch)



$(function() {
  if (queryString.isPopup) $("body").addClass("is-popup")
  else getCurrentTab().then(function(currentTab) {return updateSettings({readAloudTab: currentTab.id})})

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

  updateButtons()
    .then(getSettings.bind(null, ["showHighlighting", "readAloudTab"]))
    .then(function(settings) {
      if (settings.showHighlighting == 2 && queryString.isPopup) {
        return getActiveTab()
          .then(function(activeTab) {
            var url = brapi.runtime.getURL("popup.html?tab=" + activeTab.id)
            return (settings.readAloudTab ? Promise.resolve() : Promise.reject("No readAloudTab"))
              .then(function() {return updateTab(settings.readAloudTab, {url: url, active: true})})
              .then(function(tab) {return updateWindow(tab.windowId, {focused: true})})
              .catch(function() {
                return createWindow({
                  url: url,
                  focused: true,
                  type: "popup",
                  width: 500,
                  height: 600,
                })
              })
          })
          .then(window.close)
      }
      else if (queryString.tab) {
        return bgPageInvoke("stop")
          .then(function() {$("#btnPlay").click()})
      }
      else {
        return bgPageInvoke("getPlaybackState")
          .then(function(state) {
            if (state == "PAUSED" || state == "STOPPED") $("#btnPlay").click()
          })
      }
    })
  setInterval(updateButtons, 500);

  refreshSize();
});



function handleError(err) {
  if (!err) return;
  if (/^{/.test(err.message)) {
    var errInfo = JSON.parse(err.message);

    $("#status").html(formatError(errInfo)).show();
    $("#status a").click(function() {
      switch ($(this).attr("href")) {
        case "#open-extension-settings":
          brapi.tabs.create({url: "chrome://extensions/?id=" + brapi.runtime.id});
          break;
        case "#request-permissions":
          if (getBrowser() == "firefox") {
            createTab(brapi.runtime.getURL("firefox-perm.html") + "?perms=" + encodeURIComponent(JSON.stringify(errInfo.perms)));
            window.close();
            break;
          }
          requestPermissions(errInfo.perms)
            .then(function(granted) {
              if (granted) $("#btnPlay").click();
            })
          break;
        case "#sign-in":
          getBackgroundPage()
            .then(callMethod("getAuthToken", {interactive: true}))
            .then(function(token) {
              if (token) $("#btnPlay").click();
            })
            .catch(function(err) {
              $("#status").text(err.message).show();
            })
          break;
        case "#auth-wavenet":
          if (getBrowser() == "firefox") {
            createTab(brapi.runtime.getURL("firefox-perm.html") + "?perms=" + encodeURIComponent(JSON.stringify(config.wavenetPerms)) + "&then=auth-wavenet")
              .then(function() {
                window.close()
              })
            break;
          }
          requestPermissions(config.wavenetPerms)
            .then(function(granted) {
              if (granted) bgPageInvoke("authWavenet");
            })
          break;
        case "#user-gesture":
          getBackgroundPage()
            .then(callMethod("userGestureActivate"))
            .then(function() {
              $("#btnPlay").click();
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
  else {
    $("#status").text(err.message).show();
  }
}



function updateButtons() {
    return Promise.all([
      getSettings(),
      bgPageInvoke("getPlaybackState"),
      bgPageInvoke("getSpeechInfo"),
      bgPageInvoke("getPlaybackError")
    ])
  .then(spread(function(settings, state, speech, playbackErr) {
    const showHighlighting = settings.showHighlighting != null ? Number(settings.showHighlighting) : defaults.showHighlighting

    if (playbackErr) playbackErrorProcessor.next(playbackErr)
    piperInitializingSubject.next(!!speech?.isPiper && state == "LOADING")

    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING" || state == "PAUSED");

    if (showHighlighting && (state == "LOADING" || state == "PAUSED" || state == "PLAYING") && speech) {
      $("#highlight, #toolbar").show()
      updateHighlighting(speech)
    }
    else {
      $("#highlight, #toolbar").hide()
    }
  }))
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



function onPlay() {
  $("#status").hide();
  (queryString.tab ? bgPageInvoke("playTab", [Number(queryString.tab)]) : bgPageInvoke("playTab"))
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
  location.href = "options.html?referer=" + encodeURIComponent(location.pathname + location.search);
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
        height: windowSize[1]
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
      case 1: return [430, 330];
      case 2: return [550, 420];
      default: return [750, 450];
    }
  }
}
