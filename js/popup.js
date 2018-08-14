
var showGotoPage;

$(function() {
  $("#btnPlay").click(onPlay);
  $("#btnPause").click(onPause);
  $("#btnStop").click(onStop);
  $("#btnSettings").click(onSettings);
  $("#btnForward").click(onForward);
  $("#btnRewind").click(onRewind);
  $("#resize").click(onResize);

  updateButtons()
    .then(getBackgroundPage)
    .then(callMethod("getPlaybackState"))
    .then(function(state) {
      if (state != "PLAYING") $("#btnPlay").click();
    });
  setInterval(updateButtons, 500);

  refreshSize();
  checkAnnouncements();
});

function handleError(err) {
  if (!err) return;
  $("#status")
    .text(/^{/.test(err.message) && formatError(JSON.parse(err.message)) || err.message)
    .show()
}

function updateButtons() {
  return getBackgroundPage().then(function(master) {
    return Promise.all([
      getSettings(),
      master.getPlaybackState(),
      master.getActiveSpeech()
    ])
  })
  .then(spread(function(settings, state, speech) {
    $("#imgLoading").toggle(state == "LOADING");
    $("#btnSettings").toggle(state == "STOPPED");
    $("#btnPlay").toggle(state == "PAUSED" || state == "STOPPED");
    $("#btnPause").toggle(state == "PLAYING");
    $("#btnStop").toggle(state == "PAUSED" || state == "PLAYING" || state == "LOADING");
    $("#btnForward, #btnRewind").toggle(state == "PLAYING");
    $("#attribution").toggle(Boolean(speech && isGoogleTranslate(speech.options.voice.voiceName)));
    $("#highlight, #resize").toggle(Boolean(settings.showHighlighting != null ? settings.showHighlighting : defaults.showHighlighting) && (state == "LOADING" || state == "PAUSED" || state == "PLAYING"));

    if (settings.showHighlighting && speech) {
      var pos = speech.getPosition();
      var elem = $("#highlight");
      if (elem.data("texts") != pos.texts) {
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
  getBackgroundPage()
    .then(callMethod("play", handleError))
    .then(updateButtons)
    .catch(handleError)
}

function onPause() {
  getBackgroundPage()
    .then(callMethod("pause"))
    .then(updateButtons)
    .catch(handleError)
}

function onStop() {
  getBackgroundPage()
    .then(callMethod("stop"))
    .then(updateButtons)
    .catch(handleError)
}

function onSettings() {
  location.href = "options.html";
}

function onForward() {
  getBackgroundPage()
    .then(callMethod("forward"))
    .then(updateButtons)
    .catch(handleError)
}

function onRewind() {
  getBackgroundPage()
    .then(callMethod("rewind"))
    .then(updateButtons)
    .catch(handleError)
}

function onSeek(n) {
  getBackgroundPage()
    .then(callMethod("seek", n))
    .catch(handleError)
}

function onResize() {
  getSettings(["highlightWindowSize"])
    .then(function(settings) {
      return updateSettings({highlightWindowSize: ((settings.highlightWindowSize || 0) + 1) % 3});
    })
    .then(refreshSize)
    .catch(handleError)
}

function refreshSize() {
  return getSettings(["highlightWindowSize"])
    .then(function(settings) {
      switch (settings.highlightWindowSize) {
        case 2: return [720, 420];
        case 1: return [520, 390];
        default: return [400, 300];
      }
    })
    .then(function(size) {
      $("#highlight").css({width: size[0], height: size[1]});
    })
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
