
if (brapi.contextMenus) {
  brapi.runtime.onInstalled.addListener(function() {
    brapi.contextMenus.create({
      id: "read-selection",
      title: brapi.i18n.getMessage("context_read_selection"),
      contexts: ["selection"]
    })
  })

  brapi.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId == "read-selection")
      stop()
        .then(function() {
          if (tab && tab.id != -1) return detectTabLanguage(tab.id)
          else return undefined
        })
        .then(function(lang) {
          return playText(info.selectionText, {lang: lang})
        })
        .catch(console.error)
  })  
}


if (brapi.commands) {
  brapi.commands.onCommand.addListener(function(command) {
    if (command == "play") {
      getPlaybackState()
        .then(function(state) {
          switch (state) {
            case "PLAYING": return pause()
            case "PAUSED": return resume()
            case "STOPPED": return playTab()
            default: throw new Error("Unexpected")
          }
        })
        .catch(console.error)
    }
    else if (command == "stop") stop()
    else if (command == "forward") forward()
    else if (command == "rewind") rewind()
  })
}


function playText(text, opts) {
  opts = opts || {}
  playbackError = null
  if (!activeDoc) {
    openDoc(new SimpleSource(text.split(/(?:\r?\n){2,}/), {lang: opts.lang}), function(err) {
      if (err) playbackError = err
    })
  }
  return activeDoc.play()
    .catch(function(err) {
      handleError(err);
      closeDoc();
      throw err;
    })
}


function playTab(tabId) {
  playbackError = null
  if (!activeDoc) {
    openDoc(new TabSource(tabId), function(err) {
      if (err) playbackError = err
    })
  }
  return activeDoc.play()
    .catch(function(err) {
      handleError(err);
      closeDoc();
      throw err;
    })
}


function stop() {
  if (activeDoc) {
    activeDoc.stop();
    closeDoc();
    return Promise.resolve();
  }
  else return Promise.resolve();
}


function pause() {
  if (activeDoc) return activeDoc.pause();
  else return Promise.resolve();
}


function getPlaybackState() {
  if (activeDoc) return activeDoc.getState();
  else return Promise.resolve("STOPPED");
}
