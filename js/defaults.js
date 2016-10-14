
var defaults = {
  voiceName: "Google US English",
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  spchletMaxLen: 36
};

function Slider(elem) {
  var min = $(elem).data("min");
  var max = $(elem).data("max");

  this.getValue = function() {
    return (elem.scrollLeft / getScrollWidth()) * (max - min) + min;
  };
  this.setValue = function(value) {
    if (value < min) value = min;
    if (value > max) value = max;
    elem.scrollLeft = getScrollWidth() * (value - min) / (max - min);
  };
  function getScrollWidth() {
    var current = elem.scrollLeft;
    elem.scrollLeft = elem.scrollWidth;
    var max = elem.scrollLeft;
    elem.scrollLeft = current;
    return max;
  }
}
