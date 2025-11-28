brapi.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "downloadSelectedText") {
    console.log("Received selected text:", msg.text);

    // next step: convert to audio
    startDownloadProcess(msg.text);
  }
});
