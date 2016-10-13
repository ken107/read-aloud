
chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.executeScript({ file: "js/jquery-3.1.1.min.js" }, function() {
    chrome.tabs.executeScript({ file: "js/content.js"}, function(content) {
      chrome.storage.sync.get("voiceName", function(saved) {
        chrome.tts.speak(content[0], {
          voiceName: saved.voiceName || "Google US English"
        });
      });
    })
  });
});
