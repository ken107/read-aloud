
var readAloudDoc = new function() {
  var $btnPrev = $(".chapter-bar-prev-button")
  var $btnNext = $(".chapter-bar-next-button")
  var currentIndex;

  this.getCurrentIndex = function() {
    return currentIndex = 0;
  }

  this.getTexts = function(index) {
    var promise = Promise.resolve()
    var rewind = function() {
      var oldEl = findFrame()
      $btnPrev.click()
      return waitFrameChange(oldEl)
    }
    var forward = function() {
      var oldEl = findFrame()
      $btnNext.click()
      return waitFrameChange(oldEl)
    }
    for (; currentIndex<index; currentIndex++) promise = promise.then(forward)
    for (; currentIndex>index; currentIndex--) promise = promise.then(rewind)
    return promise.then(getTexts)
  }

  function findFrame() {
    var screenSpan = {start: 0, end: $(window).width()}
    return $(".reflowable iframe").get()
      .reduce(function(most, frame) {
        var offset = $(frame).offset()
        var span = {start: offset.left, end: offset.left + $(frame).width()}
        var coverage = intersect(span, screenSpan)
        return coverage > most.coverage ? {frame: frame, coverage: coverage} : most
      }, {
        frame: null,
        coverage: 0
      })
      .frame
  }

  function intersect(a, b) {
    if (b.start > a.end || a.start > b.end) return 0
    return Math.min(a.end, b.end) - Math.max(a.start, b.start)
  }

  function waitFrameChange(oldEl) {
    return repeat({
      action: findFrame,
      until: function(el) {return el && el != oldEl},
      max: 10,
      delay: 500
    })
  }

  function getTexts() {
    var frame = findFrame()
    var $paras = $("h1, h2, h3, h4, h5, h6, p", frame.contentDocument.body);
    var $dontRead = $paras.find("sup").hide();
    var texts = $paras.get().map(getInnerText).filter(isNotEmpty);
    $dontRead.show();
    return texts;
  }
}
