
var activeDoc;

chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "read-selection",
    title: chrome.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
})

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection") play();
})

function play() {
  if (activeDoc) return activeDoc.play();
  else {
    return getActiveTab()
      .then(function(tab) {
        activeDoc = new Doc(tab.id);
        activeDoc.onEnd = function() {activeDoc = null};
        return activeDoc.init();
      })
      .then(function() {
        setState("lastUrl", activeDoc.url);
        return activeDoc.play();
      })
  }
}

function stop() {
  if (activeDoc) return activeDoc.stop().then(function() {activeDoc = null});
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
