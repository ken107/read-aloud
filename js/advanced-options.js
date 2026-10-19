
Promise.all([getSettings(), domReady()]).then(([settings]) => {
  setI18nText()

  $("button.close")
    .show()
    .click(() => history.back())

  $("#fix-bt-silence-gap")
    .prop("checked", settings.fixBtSilenceGap)
    .change(function() {
      updateSettings({fixBtSilenceGap: this.checked})
        .catch(console.error)
    })

  const wordReplacements = $("#word-replacements")
    .attr("placeholder", brapi.i18n.getMessage("advanced_word_replacements_placeholder"))
    .val(typeof settings.wordReplacements == "string" ? settings.wordReplacements : "")
  const saveStatus = $("#word-replacements-status")
  let savedText = wordReplacements.val()
  let saveTimer
  let statusTimer

  function showSaveStatus(key, fade) {
    clearTimeout(statusTimer)
    const text = brapi.i18n.getMessage(key)
    if (saveStatus.text() != text) saveStatus.text(text)
    saveStatus.addClass("visible")
    if (fade) statusTimer = setTimeout(() => saveStatus.removeClass("visible"), 2000)
  }

  function showWordReplacementErrors() {
    const {errors} = parseWordReplacements(wordReplacements.val())
    $("#word-replacements-errors").empty().append(errors.map(error => {
      const line = String(error.line)
      const text = error.code == "missing_separator" ? brapi.i18n.getMessage("advanced_word_replacements_error_separator", [line])
        : error.code == "missing_word" ? brapi.i18n.getMessage("advanced_word_replacements_error_missing_word", [line])
        : brapi.i18n.getMessage("advanced_word_replacements_error_duplicate", [line, error.from, String(error.firstLine)])
      return $("<li>").text(text)
    }))
  }

  function saveWordReplacements() {
    clearTimeout(saveTimer)
    showWordReplacementErrors()
    const text = wordReplacements.val()
    if (text == savedText) {
      showSaveStatus("advanced_word_replacements_saved", true)
      return
    }
    showSaveStatus("advanced_word_replacements_saving")
    updateSettings({wordReplacements: text})
      .then(() => {
        savedText = text
        if (wordReplacements.val() == text) showSaveStatus("advanced_word_replacements_saved", true)
      })
      .catch(err => {
        console.error(err)
        showSaveStatus("advanced_word_replacements_save_failed")
      })
  }

  wordReplacements
    .on("input", () => {
      clearTimeout(saveTimer)
      showSaveStatus("advanced_word_replacements_saving")
      saveTimer = setTimeout(saveWordReplacements, 750)
    })
    .on("change", saveWordReplacements)

  showWordReplacementErrors()
})
