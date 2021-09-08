
var rad = readAloudDoc
var prevBtn = document.getElementById("control_previous_page")
var nextBtn = document.getElementById("control_next_page")
var contentFrame = document.getElementById("section_iframe")
var currentIndex = 0

readAloudDoc = {
    getCurrentIndex: function() {
        return currentIndex = 0
    },
    getTexts: function(index) {
        var promise = Promise.resolve()
        var rewind = function() {
            var oldUrl = contentFrame.contentDocument.location.href
            $(prevBtn).click()
            return waitFrameChange(oldUrl)
        }
        var forward = function() {
            var oldUrl = contentFrame.contentDocument.location.href
            $(nextBtn).click()
            return waitFrameChange(oldUrl)
        }
        for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
        for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
        return promise.then(function() {
            return rad.getTexts(rad.getCurrentIndex())
        })
    }
}

function waitFrameChange(oldUrl) {
    return repeat({
        action: function() {return contentFrame.contentDocument.location.href},
        until: function(url) {return url != oldUrl},
        max: 20,
        delay: 500
    })
    .then(function() {
        return new Promise(function(fulfill) {
            return $(contentFrame.contentDocument).ready(fulfill)
        })
    })
}
