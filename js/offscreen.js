
(function() {
  var audio

  registerMessageListener("offscreen", {
    play: play,
    pause: pause,
    resume: resume,
  })

  sendToPlayer({method: "offscreenCheckIn"})
    .catch(console.error)




  async function play(url, options, startTime) {
    audio = playAudioHere(url, options, startTime)
    audio.endPromise
      .then(() => sendToPlayer({method: "offscreenPlaybackEnded"}),
        err => sendToPlayer({method: "offscreenPlaybackEnded", args: [errorToJson(err)]}))
    await audio.startPromise
  }

  function pause() {
    if (audio) audio.pause()
    return true
  }

  function resume() {
    return audio.resume()
  }



  async function sendToPlayer(message) {
    message.dest = "player"
    const result = await brapi.runtime.sendMessage(message)
    if (result && result.error) throw result.error
    else return result
  }
})();
