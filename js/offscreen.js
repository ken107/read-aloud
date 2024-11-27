
(function() {
  registerMessageListener("offscreen", {
    play: play,
    pause: pause,
    resume: resume,
  })

  sendToPlayer({method: "offscreenCheckIn"})
    .catch(console.error)



  const current$ = new rxjs.BehaviorSubject(null)

  current$.pipe(
    rxjs.switchMap(current => {
      if (current) {
        return playAudioHere(Promise.resolve(current.url), current.options, current.playbackState$).pipe(
          rxjs.catchError(err => rxjs.of({type: "error", error: errorToJson(err)})),
          rxjs.tap(event => {
            sendToPlayer({method: "offscreenPlaybackEvent", args: [event]})
              .catch(console.error)
          })
        )
      } else {
        return rxjs.EMPTY
      }
    })
  ).subscribe()



  function play(url, options) {
    current$.next({
      url,
      options,
      playbackState$: new rxjs.BehaviorSubject("resumed")
    })
    return true
  }

  function pause() {
    current$.value.playbackState$.next("paused")
    return true
  }

  function resume() {
    current$.value.playbackState$.next("resumed")
    return true
  }



  async function sendToPlayer(message) {
    message.dest = "player"
    const result = await brapi.runtime.sendMessage(message)
    if (result && result.error) throw result.error
    else return result
  }
})();
