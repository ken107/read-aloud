
var readAloudDoc = location.pathname.startsWith("/sample/") ? new KindleSample() : new KindleDoc()


function KindleDoc() {
  var currentIndex = 0;
  const cache = new Map()
  const ocr = makeOcr()

  this.getCurrentIndex = function() {
    cache.clear()
    return currentIndex = 0;
  }

  this.getTexts = async function(index) {
    await seek(index)
    if (!cache.has(index)) cache.set(index, fetchTexts())
    const texts = await cache.get(index)
    if (!cache.has(index+1)) cache.set(index+1, prefetchTexts(index))
    return texts
  }

  function seek(index) {
    for (; currentIndex<index; currentIndex++) simulateClick(document.getElementById("kr-chevron-right"))
    for (; currentIndex>index; currentIndex--) simulateClick(document.getElementById("kr-chevron-left"))
    return waitMillis(150)
  }

  async function fetchTexts() {
    const image = await capturePage()
    return ocr.getTexts(image, true)
  }

  async function prefetchTexts(index) {
    try {
      await seek(index + 1)
      const image = await capturePage()
      return ocr.getTexts(image, false)
    }
    finally {
      await seek(index)
    }
  }

  function capturePage() {
    const img = $(".kg-full-page-img > img").get(0)
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0)
    return new Promise(f => canvas.toBlob(f))
  }
}


function KindleSample() {
  this.getCurrentIndex = function() {
    return 0
  }

  this.getTexts = function(index) {
    return index == 0 ? getTexts() : null
  }

  function getTexts() {
    const elems = $("#kr-renderer").find("div[data-pid]").get()
      .filter(el => el.firstChild && el.firstChild.tagName != "DIV")
    const index = elems.findIndex(el => el.getBoundingClientRect().top > 100)
    return elems.slice(index)
      .map(getInnerText)
      .filter(text => /[\p{L}\p{Nl}\p{Nd}]/u.test(text))
  }
}


function makeOcr() {
  $("<link>")
    .attr({rel: "stylesheet", type: "text/css", href: brapi.runtime.getURL("css/bootstrap.min.css")})
    .appendTo("head")

  const servicePromise = new Promise(fulfill => {
    const domDispatcher = makeDispatcher("ocr-host", {
      onServiceReady(args, sender) {
        fulfill(sender)
      }
    })
    addEventListener("message", event => {
      const send = message => event.source.postMessage(message, {targetOrigin: event.origin})
      const sender = {
        sendRequest(method, args) {
          const id = String(Math.random())
          send({to: "ocr-service", type: "request", id, method, args})
          return domDispatcher.waitForResponse(id)
        }
      }
      domDispatcher.dispatch(event.data, sender, send)
    })
    const frame = document.createElement("IFRAME")
    frame.src = "https://ttstool.com/ocr.html"
    frame.style.display = "none"
    document.body.appendChild(frame)
  })

  const langPromise = immediate(async () => {
    const service = await servicePromise
    const languageList = await service.sendRequest("getLanguageList")
    const $dialog = $(`
      <div class="modal d-block" style="background-color: rgba(0,0,0,.5)" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <form class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Select Book's Language</h5>
            </div>
            <div class="modal-body">
              <select class="form-control" name="lang" value="eng">
                <option value="eng">English</option>
                ${languageList
                  .filter(({code}) => code != "eng")
                  .map(({code, name}) => `<option value="${code}">${name}</option>`)
                  .join("\n")}
              </select>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Continue</button>
            </div>
          </form>
        </div>
      </div>
    `)
    try {
      $dialog.appendTo("body")
      return await new Promise(fulfill => {
        $dialog.submit(event => {
          fulfill(event.target.lang.value)
          return false
        })
      })
    }
    finally {
      $dialog.remove()
    }
  })

  const progressInd = immediate(() => {
    const $el = $(`
      <div>
        <img style="height: 2em" src="${brapi.runtime.getURL("img/loading.gif")}">
        <span class="ml-3">Working...</span
      </div>
    `)
      .css({
        position: "absolute",
        top: "1em",
        left: "50%",
        transform: "translateX(-50%)",
        border: "1px solid #888",
        padding: "1em",
        backgroundColor: "#d9f7f7",
        display: "flex",
        alignItems: "center",
      })
      .hide()
      .appendTo("body")
    return {
      show() {
        $el.fadeIn(100)
      },
      hide() {
        $el.fadeOut(100)
      }
    }
  })

  return {
    async getTexts(image, showProgressInd) {
      const [service, lang] = await Promise.all([servicePromise, langPromise])
      if (showProgressInd) progressInd.show()
      try {
        const start = performance.now()
        const result = await service.sendRequest("recognize", {lang, image})
        console.log("OCR took", Math.round(performance.now()-start), "ms", result)
        const lines = result.lines.map(line => line.text.trim())
        return fixParagraphs(lines)
      }
      finally {
        if (showProgressInd) progressInd.hide()
      }
    }
  }
}
