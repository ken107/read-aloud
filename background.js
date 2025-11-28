try {
  importScripts(
    "js/rxjs.umd.min.js",
    "js/defaults.js",
    "js/messaging.js",
    "js/content-handlers.js",
    "js/events.js",
    "js/download.js"
  )
}
catch (err) {
  console.error(err)
}
