
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
  return activeDoc.play()
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
  if (activeDoc) return activeDoc.getState();
  else return Promise.resolve("STOPPED");
}

function getActiveSpeech() {
  if (activeDoc) return activeDoc.getActiveSpeech();
  else return Promise.resolve(null);
}

function getDocInfo() {
  if (activeDoc) return activeDoc.getInfo();
  else return Promise.resolve(null);
}

function closeDoc() {
  if (activeDoc) {
    activeDoc.close();
    activeDoc = null;
  }
}

function forward() {
  if (activeDoc) return activeDoc.forward();
  else return Promise.reject(new Error("Can't forward, not active"));
}

function rewind() {
  if (activeDoc) return activeDoc.rewind();
  else return Promise.reject(new Error("Can't rewind, not active"));
}

function gotoPage(index) {
  if (activeDoc) return activeDoc.gotoPage(index);
  else return Promise.reject(new Error("Can't goto page, not active"));
}

function getCurrentPage() {
  if (activeDoc) return activeDoc.getCurrentPage();
  else return Promise.resolve(0);
}
