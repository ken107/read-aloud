
Promise.all([getSettings(), domReady()]).then(([settings]) => {
  setI18nText()

  const infoButton = document.getElementById("word-replacements-info")
  const instructions = document.getElementById("word-replacements-instructions")
  const help = infoButton.parentElement
  infoButton.setAttribute("aria-label", brapi.i18n.getMessage("advanced_word_replacements_help"))
  const closeHelp = () => {
    instructions.hidden = true
    infoButton.setAttribute("aria-expanded", "false")
  }
  infoButton.addEventListener("click", () => {
    instructions.hidden = !instructions.hidden
    infoButton.setAttribute("aria-expanded", String(!instructions.hidden))
  })
  document.addEventListener("click", event => {
    if (!help.contains(event.target)) closeHelp()
  })
  document.addEventListener("focusin", event => {
    if (!help.contains(event.target)) closeHelp()
  })
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !instructions.hidden) {
      closeHelp()
      infoButton.focus()
      event.preventDefault()
    }
  })

  const wordReplacements = $("#word-replacements")
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
    brapi.storage.local.set({wordReplacements: text})
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
