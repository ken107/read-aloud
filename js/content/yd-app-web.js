const $btnNext = $("#app > div > div.read-bar > div > div:nth-child(2) > div");
const $btnPrev = $("#app > div > div.read-bar > div > div:nth-child(1) > div");
const t = "#app > div > div.chapter > div > div:nth-child(2) > div.title";
const p = "#app > div > div.chapter > div > div:nth-child(2) > div:nth-child(2) > p";

// 一些异常转义符号，朗读卡住
const re = new RegExp('&[a-z]+;', 'g');

const readAloudDoc = new function() {
    let currentIndex = 0;

    this.getCurrentIndex = function() {
        return currentIndex = 0;
    }
    this.getTexts = function(index) {
        let promise = Promise.resolve();
        const rewind = function () {
            const oldEl = findFrame();
            $btnPrev.click()
            return waitFrameChange(oldEl)
        };
        const forward = function () {
            const oldEl = findFrame();
            $btnNext.click()
            return waitFrameChange(oldEl)
        };

        for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
        for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
        return promise.then(getTexts)
    }
}

function findFrame() {
    let s = ''
    $(t).get().map(function (item) {
        s += item.innerHTML.trim()
    })
    console.log(s)
    return s
}

function waitFrameChange(oldEl) {
    return repeat({
        action: findFrame,
        until: function(el) {return el && el !== oldEl},
        max: 10,
        delay: 500
    })
}


function getTexts() {
    const texts = [];
    let s = $(t).get(0).innerText + "\n";

    $(p).get().map(function (item) {
        s += item.innerHTML.trim() + "\n"
        if (s.length > 100) {
            s = s.trim().replace(re ,"")
            texts.push(s)
            s = ''
        }
    })
    return texts
}

