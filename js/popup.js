
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
          .then(function(state) {if (state != "PLAYING") $("#btnPlay").click()})
      }
    })
  setInterval(updateButtons, 500);

  refreshSize();
  checkAnnouncements();
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
      }
    })

    if (errInfo.code == "error_upload_pdf") {
      setTabUrl(errInfo.tabId, config.pdfViewerUrl)
    }
  }
  else {
    $("#status").text(err.message).show();
  }
}

function updateButtons() {
    return Promise.all([
      getSettings(),
      bgPageInvoke("getPlaybackState"),
      bgPageInvoke("getSpeechPosition"),
      bgPageInvoke("getPlaybackError")
    ])
  .then(spread(function(settings, state, speechPos, playbackErr) {
    if (playbackErr) playbackErrorProcessor.next(playbackErr)

    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING" || state == "PAUSED");
    $("#highlight, #toolbar").toggle(Boolean(settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && (state == "LOADING" || state == "PAUSED" || state == "PLAYING"));

    if ((settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && speechPos) {
      var pos = speechPos;
      var elem = $("#highlight");
      if (!elem.data("texts") || elem.data("texts").length != pos.texts.length || elem.data("texts").some(function(text,i) {return text != pos.texts[i]})) {
        elem.css("direction", pos.isRTL ? "rtl" : "");
        elem.data({texts: pos.texts, index: -1});
        elem.empty();
        for (var i=0; i<pos.texts.length; i++) {
          var html = escapeHtml(pos.texts[i]).replace(/\r?\n/g, "<br/>");
          $("<span>").html(html).appendTo(elem).css("cursor", "pointer").click(onSeek.bind(null, i));
        }
      }
      if (elem.data("index") != pos.index) {
        elem.data("index", pos.index);
        elem.children(".active").removeClass("active");
        var child = elem.children().eq(pos.index).addClass("active");
        if (child.length) {
        var childTop = child.position().top;
        var childBottom = childTop + child.outerHeight();
        if (childTop < 0 || childBottom >= elem.height()) elem.animate({scrollTop: elem[0].scrollTop + childTop - 10});
        }
      }
    }
  }));
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
