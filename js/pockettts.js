
//auto close
const engineIdle$ = new rxjs.BehaviorSubject(true)
const inactivityTimeout = 15
engineIdle$.pipe(
  rxjs.distinctUntilChanged(),
  rxjs.switchMap(isIdle =>
    rxjs.iif(
      () => !isIdle,
      rxjs.EMPTY,
      rxjs.merge(
        rxjs.timer(inactivityTimeout*60*1000),
        rxjs.merge(
          rxjs.fromEvent(document, "mousemove"),
          rxjs.fromEvent(document, "keydown"),
          rxjs.fromEvent(document, "touchstart")
        ).pipe(
          rxjs.map(() => {throw "reset"})
        )
      ).pipe(
        rxjs.retry({delay: 1000})
      )
    )
  )
).subscribe(closeSelf)

//orphan detection: close if Read Aloud has replaced this tab with another, or is no longer reachable
rxjs.interval(60*1000).pipe(
  rxjs.filter(() => engineIdle$.getValue()),
  rxjs.exhaustMap(() => requestServiceWorker("isEngineTabSuperseded", ["pockettts"])
    .then(isSuperseded => isSuperseded === true, () => true))
).subscribe(isOrphaned => {
  if (isOrphaned) closeSelf()
})

function closeSelf() {
  //window.close() is refused for tabs not opened by script (e.g. restored by session restore), so ask the background page to remove the tab
  requestServiceWorker("closeEngineTab")
    .then(res => {
      if (res?.error) throw res.error
    })
    .catch(() => window.close())
}

//keep-it-open billboard
document.addEventListener("DOMContentLoaded", () => {
  const ugaDialog = document.createElement("DIV")
  ugaDialog.innerHTML = `
    <div class="alert alert-warning text-center">
      Read Aloud uses this tab to synthesize Pocket TTS voices. It will close automatically after 15 minutes of inactivity.
    </div>
  `
  document.body.prepend(ugaDialog)
})

//vars
let pocketTtsService


//handle messages from pocket-service

const domDispatcher = makeDispatcher("pocket-host", {
  advertiseVoices({voices}, sender) {
    browser.storage.local.set({pocketTtsVoices: voices})
    pocketTtsService = sender
    notifyServiceWorker("pocketTtsServiceReady")
  },
  onStart(args) {
    notifyServiceWorker("onPocketTtsEvent", [{type: "start", ...args}])
    engineIdle$.next(false)
  },
  onSentence(args) {
    notifyServiceWorker("onPocketTtsEvent", [{type: "sentence", ...args}])
  },
  onParagraph(args) {
    notifyServiceWorker("onPocketTtsEvent", [{type: "paragraph", ...args}])
  },
  onEnd(args) {
    notifyServiceWorker("onPocketTtsEvent", [{type: "end", ...args}])
    engineIdle$.next(true)
  },
  onError(args) {
    notifyServiceWorker("onPocketTtsEvent", [{type: "error", ...args}])
    engineIdle$.next(true)
  },
  audioPlay(args) {
    return requestServiceWorker("audioPlay", [args.src, args])
  },
  audioPause() {
    return requestServiceWorker("audioPause")
  },
  audioResume() {
    return requestServiceWorker("audioResume")
  }
})

window.addEventListener("message", event => {
  const send = message => event.source.postMessage(message, {targetOrigin: event.origin})
  const sender = {
    sendRequest(method, args) {
      const id = String(Math.random())
      send({to: "pocket-service", type: "request", id, method, args})
      return domDispatcher.waitForResponse(id)
    }
  }
  domDispatcher.dispatch(event.data, sender, send)
})


//handle messages from extension service worker

const extDispatcher = makeDispatcher("pocket-host", {
  areYouThere() {
    return true
  },
  speak(args) {
    if (!pocketTtsService) throw new Error("No service")
    return pocketTtsService.sendRequest("speak", args)
  },
  pause(args) {
    return pocketTtsService?.sendRequest("pause", args)
  },
  resume(args) {
    return pocketTtsService?.sendRequest("resume", args)
  },
  stop(args) {
    engineIdle$.next(true)
    return pocketTtsService?.sendRequest("stop", args)
  },
  forward(args) {
    return pocketTtsService?.sendRequest("forward", args)
  },
  rewind(args) {
    return pocketTtsService?.sendRequest("rewind", args)
  },
  seek(args) {
    return pocketTtsService?.sendRequest("seek", args)
  }
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return extDispatcher.dispatch(message, sender, res => {
    if (res.error instanceof Error || res.error instanceof DOMException) {
      res.error = {
        name: res.error.name,
        message: res.error.message,
        stack: res.error.stack
      }
    }
    sendResponse(res)
  })
})

function notifyServiceWorker(method, args) {
  browser.runtime.sendMessage({
    to: "service-worker",
    type: "notification",
    method,
    args
  })
}

function requestServiceWorker(method, args) {
  return browser.runtime.sendMessage({
    to: "service-worker",
    type: "request",
    id: String(Math.random()),
    method,
    args
  })
}
