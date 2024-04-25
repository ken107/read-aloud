
document.querySelector("form").parentElement.style.display = "none"

const ugaPromise = new Promise(fulfill => {
  const ugaDialog = document.createElement("DIV")
  ugaDialog.innerHTML = `
    <div class="modal d-block" style="background-color: rgba(0,0,0,.5)" tabIndex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Permission Required</h5>
            <button type="button" class="btn-close" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            This tab synthesizes Piper voices. Please allow audio playback and keep it open.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary">Allow</button>
          </div>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(ugaDialog)
  document.addEventListener("click", () => {
    document.body.removeChild(ugaDialog)
    fulfill()
  }, {
    once: true
  })
})

let isUserActivated = false
ugaPromise.then(() => isUserActivated = true)

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
  },
  onSentence(args) {
    notifyServiceWorker("onPiperEvent", [{type: "sentence", ...args}])
  },
  onParagraph(args) {
    notifyServiceWorker("onPiperEvent", [{type: "paragraph", ...args}])
  },
  onEnd(args) {
    notifyServiceWorker("onPiperEvent", [{type: "end", ...args}])
  },
  onError(args) {
    notifyServiceWorker("onPiperEvent", [{type: "error", ...args}])
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
    return {requestFocus: !isUserActivated}
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
    return piperService?.sendRequest("stop", args)
  },
  forward(args) {
    return piperService?.sendRequest("forward", args)
  },
  rewind(args) {
    return piperService?.sendRequest("rewind", args)
  },
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
