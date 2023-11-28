
var readAloudDoc = new function() {
  check()
  setInterval(check, 1000)

  function check() {
    for (const el of document.querySelectorAll("[data-message-author-role=assistant]")) {
      if (!el.querySelector(".btn-readaloud")) {
        $("<img>")
          .attr("src", brapi.runtime.getURL("img/icon.png"))
          .addClass("btn-readaloud")
          .css({
            position: "absolute",
            width: "1.5rem",
            "margin-left": "-2.25rem",
            "margin-top": ".5rem",
            cursor: "pointer"
          })
          .click(() => readThis(getText(el)))
          .prependTo(el)
      }
    }
  }

  this.getCurrentIndex = function() {
    throw new Error(JSON.stringify({code: "error_chatgpt"}))
  }

  this.getTexts = function(index) {
    return null
  }

  function getText(el) {
    return el.innerText.trim()
  }

  async function readThis(text) {
    try {
      await bgPageInvoke("playText", [text])
    }
    catch (err) {
      alert(err.message)
    }
  }
}
