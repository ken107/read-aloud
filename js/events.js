
chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.executeScript({ file: "js/jquery-3.1.1.min.js" }, function() {
    chrome.tabs.executeScript({ file: "js/content.js"});
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.method == "speak") {
    speak(request, sendResponse);
    return true;
  }
});

function speak(request, sendResponse) {
  chrome.storage.sync.get("voiceName", function(saved) {
    chrome.tts.speak(request.text, {
      voiceName: saved.voiceName || "Google US English",
      onEvent: function(event) {
        if (event.type == "end") sendResponse({ method: "onComplete" });
      }
    });
  });
}
