
var rad = readAloudDoc
var $prevBtn = $("div.previousPage button")
var $nextBtn = $("div.nextPage button")
var currentIndex = 0

readAloudDoc = {
    getCurrentIndex: function() {
        return currentIndex = 0
    },
    getTexts: function(index) {
        var promise = Promise.resolve()
        var rewind = function() {
            var oldFrame = document.getElementById("contentIframe")
            $prevBtn.click()
            return waitFrameChange(oldFrame)
        }
        var forward = function() {
            var oldFrame = document.getElementById("contentIframe")
            $nextBtn.click()
            return waitFrameChange(oldFrame)
        }
        for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
        for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
        return promise.then(function() {
            return rad.getTexts(rad.getCurrentIndex())
        })
    }
}

function waitFrameChange(oldFrame) {
    return repeat({
        action: function() {return document.getElementById("contentIframe")},
        until: function(frame) {return frame && frame != oldFrame},
        max: 20,
        delay: 500
    })
    .then(function(frame) {
        return new Promise(function(fulfill) {
            return $(frame.contentDocument).ready(fulfill)
        })
    })
}
