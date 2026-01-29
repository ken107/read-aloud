
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
).subscribe(() => {
  window.close()
})

//keep-it-open billboard
document.addEventListener("DOMContentLoaded", () => {
  const ugaDialog = document.createElement("DIV")
  ugaDialog.innerHTML = `
    <div class="alert alert-warning text-center">
      Read Aloud uses this tab to synthesize Supertonic voices. It will close automatically after 15 minutes of inactivity.
    </div>
  `
  document.body.prepend(ugaDialog)
})

//vars
let supertonicService


//handle messages from supertonic-service

const domDispatcher = makeDispatcher("supertonic-host", {
  advertiseVoices({voices}, sender) {
    browser.storage.local.set({supertonicVoices: voices})
    supertonicService = sender
    notifyServiceWorker("supertonicServiceReady")
  },
  onStart(args) {
    notifyServiceWorker("onSupertonicEvent", [{type: "start", ...args}])
    engineIdle$.next(false)
  },
  onSentence(args) {
    notifyServiceWorker("onSupertonicEvent", [{type: "sentence", ...args}])
  },
  onParagraph(args) {
    notifyServiceWorker("onSupertonicEvent", [{type: "paragraph", ...args}])
  },
  onEnd(args) {
    notifyServiceWorker("onSupertonicEvent", [{type: "end", ...args}])
    engineIdle$.next(true)
  },
  onError(args) {
    notifyServiceWorker("onSupertonicEvent", [{type: "error", ...args}])
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
      send({to: "supertonic-service", type: "request", id, method, args})
      return domDispatcher.waitForResponse(id)
    }
  }
  domDispatcher.dispatch(event.data, sender, send)
})


//handle messages from extension service worker

const extDispatcher = makeDispatcher("supertonic-host", {
  areYouThere() {
    return true
  },
  speak(args) {
    if (!supertonicService) throw new Error("No service")
    return supertonicService.sendRequest("speak", args)
  },
  pause(args) {
    return supertonicService?.sendRequest("pause", args)
  },
  resume(args) {
    return supertonicService?.sendRequest("resume", args)
  },
  stop(args) {
    engineIdle$.next(true)
    return supertonicService?.sendRequest("stop", args)
  },
  forward(args) {
    return supertonicService?.sendRequest("forward", args)
  },
  rewind(args) {
    return supertonicService?.sendRequest("rewind", args)
  },
  seek(args) {
    return supertonicService?.sendRequest("seek", args)
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
