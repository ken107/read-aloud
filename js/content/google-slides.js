
var readAloudDoc = new function() {
  var scroller = $(".punch-filmstrip-scroll").get(0);
  var autoFlip;
  getSettings(["googleSlidesAutoFlip"])
    .then(function(items) {
      autoFlip = items.googleSlidesAutoFlip;
    })
    .then(createOptionsPanel)

  this.getCurrentIndex = function() {
    var currentSlide = getCurrentSlide();
    return currentSlide ? getSlides().indexOf(currentSlide) : 0;
  }

  this.getTexts = function(index, quietly) {
    var slide = getSlides()[index];
    if (slide && (autoFlip || slide == getCurrentSlide())) {
      if (!quietly) {
        simulateClick(slide);
        scroller.scrollTop = $(slide).offset().top - $(scroller.firstChild).offset().top;
      }
      const texts = getTexts(slide)
      texts.unshift("Slide " + (index +1) + ".")
      return texts
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
    return $(".punch-filmstrip-thumbnail-border[style^=stroke]").parent().get(0);
  }

  function createOptionsPanel() {
    if ($(".ra-options").length) return;
    var label = $("<label> Go to next slide automatically</label>")
      .addClass("ra-options")
      .css({
        marginLeft: "2em",
        color: "purple",
      })
      .appendTo("#docs-menubar")
    $("<input type='checkbox'>")
      .prop("checked", !!autoFlip)
      .prependTo(label)
      .change(function() {
        autoFlip = this.checked;
        updateSettings({googleSlidesAutoFlip: autoFlip});
      })
  }
}
