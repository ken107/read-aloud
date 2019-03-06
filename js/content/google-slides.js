
var readAloudDoc = new function() {
  var scroller = $(".punch-filmstrip-scroll").get(0);

  this.getCurrentIndex = function() {
    var currentSlide = getCurrentSlide();
    return currentSlide ? getSlides().indexOf(currentSlide) : 0;
  }

  this.getTexts = function(index, quietly) {
    var slide = getSlides()[index];
    if (slide) {
      if (!quietly) {
        simulateClick(slide);
        scroller.scrollTop = $(slide).offset().top - $(scroller.firstChild).offset().top;
      }
      return getTexts(slide);
    }
    else return null;
  }

  function getTexts(slide) {
    return $(slide).find("[id*=paragraph]")
      .get()
      .map(function(para) {
        return $(para).find("text")
          .get()
          .map(function(elem) {return elem.textContent})
          .join(" ")
      })
  }

  function getSlides() {
    return $(".punch-filmstrip-thumbnail").get();
  }

  function getCurrentSlide() {
    return $(".punch-filmstrip-thumbnail-background[fill]").parent().get(0);
  }
}
