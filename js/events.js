
var activeDoc;

chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "read-selection",
    title: chrome.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
})

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection") stop().then(play);
})

function play() {
  if (!activeDoc) activeDoc = new Doc(closeDoc);
  return activeDoc.getUrl()
    .then(setState.bind(null, "lastUrl"))
    .then(activeDoc.play)
    .catch(function(err) {closeDoc(); throw err})
}

function stop() {
  if (activeDoc) {
    return activeDoc.stop()
      .then(closeDoc)
      .catch(function(err) {closeDoc(); throw err})
  }
  else return Promise.resolve();
}

function pause() {
  if (activeDoc) return activeDoc.pause();
  else return Promise.resolve();
}

function getPlaybackState() {
  return new Promise(function(fulfill) {chrome.tts.isSpeaking(fulfill)})
    .then(function(isSpeaking) {
      if (activeDoc) {
        if (isSpeaking) return "PLAYING";
        else return "PAUSED";
      }
      else return "STOPPED";
    })
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
  }
}
