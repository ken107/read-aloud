
$(onDomReady)

function onDomReady() {
  $("button.close").click(function() {
    if (history.length > 1) history.back()
    else window.close()
  })

  refresh()
  brapi.tts.onVoicesChanged?.addListener(refresh)
  //onVoicesChanged may be missing in older versions of Chrome
  setInterval(refresh, 3000)
}

let lastStatus

async function refresh() {
  const voices = await new Promise(f => brapi.tts.getVoices(f)) || []
  const naturalVoices = voices.filter(isGoogleNaturalVoice)
  const enabled = naturalVoices.length > 0
  const text = enabled
    ? `Google Natural voices are enabled (${naturalVoices.length} voices). You can close this tab now.`
    : "Google Natural voices are not enabled yet."
  if (text != lastStatus) {
    lastStatus = text
    $("#status").text(text).toggleClass("enabled", enabled)
    $("#voice-list").toggle(enabled)
    $("#voice-list ul").empty()
      .append(naturalVoices.map(voice => $("<li>").text(`${voice.voiceName} (${voice.lang})`)))
    selectStatus()
  }
}

//Reading mode shows the selected text when opened on an extension page,
//so keep the status selected for it to show when the voices are enabled
function selectStatus() {
  const range = document.createRange()
  range.selectNodeContents(document.getElementById("status"))
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}
