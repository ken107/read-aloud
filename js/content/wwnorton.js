
var rad = readAloudDoc
var prevBtn = document.getElementById("control_previous_page")
var nextBtn = document.getElementById("control_next_page")
var currentIndex = 0

readAloudDoc = {
    getCurrentIndex: function() {
        return currentIndex = 0
    },
    getTexts: function(index) {
        var promise = Promise.resolve()
        var rewind = function() {
            $(prevBtn).click()
            return waitMillis(2500)
        }
        var forward = function() {
            $(nextBtn).click()
            return waitMillis(2500)
        }
        for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
        for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
        return promise.then(function() {
            return rad.getTexts(rad.getCurrentIndex())
        })
    }
}
