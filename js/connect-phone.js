
$(onDomReady)

function onDomReady() {
  setState("loading")
  sendToPlayer({method: "startPairing"})
    .then(pairingCode => {
      $("#pairing-code").text(String(pairingCode).slice(0,3) + "-" + String(pairingCode).slice(3))
      setState("pairing")
      waitPairing()
    })
    .catch(err => {
      console.error(err)
      setState("fail")
    })

  //event handlers
  $("button.close").click(function() {
    history.back()
  })
  $("#try-again-button").click(function() {
    setState("pairing")
    waitPairing()
  })
}

function waitPairing() {
  repeat({
    action: () => sendToPlayer({method: "isPaired"}),
    until: x => x,
    delay: 1000,
    max: 120
  })
  .then(isPaired => {
    if (isPaired) setState("success")
    else setState("fail")
  })
  .catch(err => {
    console.error(err)
    setState("fail")
  })
}



function setState(newState) {
  for (const state of ["loading", "pairing", "success", "fail"]) {
    if (state == newState) $("#state-" + state).show()
    else $("#state-" + state).hide()
  }
}

async function sendToPlayer(message) {
  message.dest = "player"
  const result = await brapi.runtime.sendMessage(message)
  if (result && result.error) throw result.error
  else return result
}
