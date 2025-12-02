try {
  importScripts(
    "js/rxjs.umd.min.js",
    "js/defaults.js",
    "js/messaging.js",
    "js/content-handlers.js",
    "js/events.js",
    "js/download.js"
  )
} catch (err) {
  console.error(err)
}

registerMessageListener("background", {
  async downloadSelectedText(text) {
    console.log("BG: synthesizing (no player)", text);

    const settings = await getSettings(["voiceName", "rate", "pitch", "voices"]);
    const voice = (settings.voices || [])[0]; // fallback

    const options = {
      voice,
      lang: voice.lang,
      rate: settings.rate,
      pitch: settings.pitch
    };

    // Create speech instance WITHOUT player
    const speech = new Speech([text], options);

    // Use engine directly
    const engine =
      speech.engine ||
      speech._engine ||
      speech.__engine;

    const url = await engine.getAudioUrl(text, options.voice, options.pitch);

    const blob = await fetch(url).then(r => r.blob());

    return await blobToBase64(blob);
  }
});


