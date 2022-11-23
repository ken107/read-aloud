try {
  importScripts(
    "js/defaults.js",
    "js/messaging.js",
    "js/google-translate.js",
    "js/aws-sdk.js",
    "js/tts-engines.js",
    "js/speech.js",
    "js/document.js",
    "js/events.js"
  )
}
catch (err) {
  console.error(err)
}
