
var $prevBtn = $("svg.leftArrow").closest("button")
var $nextBtn = $("svg.rightArrow").closest("button")

if ($prevBtn.length == 0) $prevBtn = $("button[aria-label^=prev]")
if ($nextBtn.length == 0) $nextBtn = $("button[aria-label^=next]")

var rad = readAloudDoc
var currentIndex = 0

readAloudDoc = {
    getCurrentIndex() {
        return currentIndex = 0
    },
    async getTexts(index) {
        while (currentIndex < index) {
            if ($nextBtn.length == 0) return null
            const promise = waitFrameChange()
            $nextBtn.click()
            await promise
            currentIndex++
        }
        while (currentIndex > index) {
            if ($prevBtn.length == 0) return null
            const promise = waitFrameChange()
            $prevBtn.click()
            await promise
            currentIndex--
        }
        return rad.getTexts(rad.getCurrentIndex())
    }
}

function waitFrameChange() {
    return new Promise(fulfill => {
        const oldFrame = document.getElementById("contentIframe")
        const observer = new MutationObserver(() => {
            const newFrame = document.getElementById("contentIframe")
            if (newFrame && newFrame != oldFrame) {
                observer.disconnect()
                $(newFrame).on("load", fulfill)
            }
        })
        observer.observe(document.getElementById("viewer"), {childList: true})
    })
}
