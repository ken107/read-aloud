
chrome.browserAction.onClicked.addListener(function() {
  chrome.storage.sync.get(["voiceName", "spchletMaxLen", "lastParaMinLen"], function(settings) {
    chrome.tabs.executeScript({ file: "js/jquery-3.1.1.min.js" }, function() {
      chrome.tabs.executeScript({ file: "js/content.js" }, function(results) {
        speak(results[0], settings);
      });
    });
  });
});

function speak(texts, settings) {
    if (!texts.length) return;
    var text = texts.shift();
    var sentences = getSentences(text);
    var group = {
      sentences: [],
      wordCount: 0
    };
    var wordLimit = settings.spchletMaxLen || defaults.spchletMaxLen;
    var wordCount = getWords(sentences[0]).length;
    if (wordCount > wordLimit) {
      sentences = getPhrases(sentences[0]).concat(sentences.slice(1));
      wordCount = getWords(sentences[0]).length;
    }
    do {
      group.sentences.push(sentences.shift());
      group.wordCount += wordCount;
      if (!sentences.length) break;
      wordCount = getWords(sentences[0]).length;
    }
    while (group.wordCount + wordCount <= wordLimit);
    if (sentences.length) texts.unshift(sentences.join(""));

    if (group.wordCount > wordLimit) {
      if (group.sentences.length > 1) throw new Error("This should never happen");
      var words = getWords(group.sentences[0]);
      var splitPoint = Math.min(words.length/2, wordLimit);
      group.sentences[0] = words.slice(0, splitPoint).join(" ");
      texts.unshift(words.slice(splitPoint).join(" "));
    }
    text = group.sentences.join("");
    chrome.tts.speak(text, {
      voiceName: settings.voiceName || defaults.voiceName,
      onEvent: function(event) {
        if (event.type == "end") speak(texts, settings);
      }
    });
}

function getSentences(text) {
  var tokens = text.split(/([.!?]+\s)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getPhrases(text) {
  var tokens = text.split(/([,;:\u2014]|\s-+\s)/);
  var result = [];
  for (var i=0; i<tokens.length; i+=2) {
    if (i+1 < tokens.length) result.push(tokens[i] + tokens[i+1]);
    else result.push(tokens[i]);
  }
  return result;
}

function getWords(sentence) {
  return sentence.trim().split(/\s+/);
}
