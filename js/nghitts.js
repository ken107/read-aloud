
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
      Read Aloud uses this tab to synthesize NghiTTS voices. It will close automatically after 15 minutes of inactivity.
    </div>
  `
  document.body.prepend(ugaDialog)
})

//vars
let nghiTtsService


//handle messages from nghitts-service

const domDispatcher = makeDispatcher("nghitts-host", {
  advertiseVoices({voices}, sender) {
    browser.storage.local.set({nghiTtsVoices: voices})
    nghiTtsService = sender
    notifyServiceWorker("nghiTtsServiceReady")
  },
  onStart(args) {
    notifyServiceWorker("onNghiTtsEvent", [{type: "start", ...args}])
    engineIdle$.next(false)
  },
  onSentence(args) {
    notifyServiceWorker("onNghiTtsEvent", [{type: "sentence", ...args}])
  },
  onParagraph(args) {
    notifyServiceWorker("onNghiTtsEvent", [{type: "paragraph", ...args}])
  },
  onEnd(args) {
    notifyServiceWorker("onNghiTtsEvent", [{type: "end", ...args}])
    engineIdle$.next(true)
  },
  onError(args) {
    notifyServiceWorker("onNghiTtsEvent", [{type: "error", ...args}])
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
      send({to: "nghitts-service", type: "request", id, method, args})
      return domDispatcher.waitForResponse(id)
    }
  }
  domDispatcher.dispatch(event.data, sender, send)
})


//handle messages from extension service worker

const extDispatcher = makeDispatcher("nghitts-host", {
  areYouThere() {
    return true
  },
  speak(args) {
    if (!nghiTtsService) throw new Error("No service")
    return nghiTtsService.sendRequest("speak", args)
  },
  pause(args) {
    return nghiTtsService?.sendRequest("pause", args)
  },
  resume(args) {
    return nghiTtsService?.sendRequest("resume", args)
  },
  stop(args) {
    engineIdle$.next(true)
    return nghiTtsService?.sendRequest("stop", args)
  },
  forward(args) {
    return nghiTtsService?.sendRequest("forward", args)
  },
  rewind(args) {
    return nghiTtsService?.sendRequest("rewind", args)
  },
  seek(args) {
    return nghiTtsService?.sendRequest("seek", args)
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
  }).then(result => {
    if (result?.error) throw new Error(result.error)
    return result
  })
}
