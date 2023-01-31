
(function() {
  try {
    const text = Array.from(document.body.children)
      .filter(el => el.tagName == "SCRIPT")
      .map(el => el.innerText)
      .filter(text => text.startsWith("DOCS_modelChunk = ") && text.endsWith("; DOCS_modelChunkLoadStart = new Date().getTime(); _getTimingInstance().incrementTime('mp', DOCS_modelChunkLoadStart - DOCS_modelChunkParseStart); DOCS_warmStartDocumentLoader.loadModelChunk(DOCS_modelChunk); DOCS_modelChunk = undefined;"))
      .map(text => text.slice(18, -237))
      .map(JSON.parse)
      .map(data => data[0].s)
      .join("")
      .trim()
    if (!text) throw new Error("No text found")
    window.postMessage({type: "ReadAloudText", texts: text.split(/\s*\r?\n\s*/)}, "*")
  }
  catch (err) {
    console.error(err)
    window.postMessage({type: "ReadAloudText", error: err.message}, "*")
  }
})();
