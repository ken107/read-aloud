
//hide the Test form
document.querySelector("form").parentElement.style.display = "none"

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
const ugaDialog = document.createElement("DIV")
ugaDialog.innerHTML = `
  <div class="alert alert-warning text-center">
    Read Aloud uses this tab to synthesize Piper voices. It will close automatically after 15 minutes of inactivity.
  </div>
`
document.body.prepend(ugaDialog)

//vars
let piperService


//handle messages from piper-service

const domDispatcher = makeDispatcher("piper-host", {
  advertiseVoices({voices}, sender) {
    browser.storage.local.set({piperVoices: voices})
    piperService = sender
    notifyServiceWorker("piperServiceReady")
  },
  onStart(args) {
    notifyServiceWorker("onPiperEvent", [{type: "start", ...args}])
    engineIdle$.next(false)
  },
  onSentence(args) {
    notifyServiceWorker("onPiperEvent", [{type: "sentence", ...args}])
  },
  onParagraph(args) {
    notifyServiceWorker("onPiperEvent", [{type: "paragraph", ...args}])
  },
  onEnd(args) {
    notifyServiceWorker("onPiperEvent", [{type: "end", ...args}])
    engineIdle$.next(true)
  },
  onError(args) {
    notifyServiceWorker("onPiperEvent", [{type: "error", ...args}])
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
      send({to: "piper-service", type: "request", id, method, args})
      return domDispatcher.waitForResponse(id)
    }
  }
  domDispatcher.dispatch(event.data, sender, send)
})


//handle messages from extension service worker

const extDispatcher = makeDispatcher("piper-host", {
  areYouThere() {
    return true
  },
  speak(args) {
    if (!piperService) throw new Error("No service")
    return piperService.sendRequest("speak", args)
  },
  pause(args) {
    return piperService?.sendRequest("pause", args)
  },
  resume(args) {
    return piperService?.sendRequest("resume", args)
  },
  stop(args) {
    engineIdle$.next(true)
    return piperService?.sendRequest("stop", args)
  },
  forward(args) {
    return piperService?.sendRequest("forward", args)
  },
  rewind(args) {
    return piperService?.sendRequest("rewind", args)
  },
  seek(args) {
    return piperService?.sendRequest("seek", args)
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
