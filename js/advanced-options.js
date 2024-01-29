
Promise.all([getSettings(), domReady()])
  .then(spread(initialize));

function initialize(settings) {
  $("button.close")
    .show()
    .click(() => history.back())

  $("#fix-bt-silence-gap")
    .prop("checked", settings.fixBtSilenceGap)
    .change(function() {
      updateSettings({fixBtSilenceGap: this.checked})
        .catch(console.error)
    })
}
