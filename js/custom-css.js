
$(function() {
  getSettings(["customCss"])
    .then(function(items) {
      let css = items.customCss || ''
      const $element = $("#custom-css-code")
      function update () {
        $("#css-save-button").get(0).disabled = $element.val() === css;
      }
      $("#css-save-button").click(function () {
        updateSettings({ customCss: (css = $element.val()) });
        update();
      });
      $element.val(css);
      $element.keyup(function () {
        update();
      });
      update();
    })
})
