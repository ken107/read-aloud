
Promise.all([getSettings(), domReady()]).then(([settings]) => {
  setI18nText()

  $("#fix-bt-silence-gap")
    .prop("checked", settings.fixBtSilenceGap)
    .change(function() {
      updateSettings({fixBtSilenceGap: this.checked})
        .catch(console.error)
    })

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

  const message = key => brapi.i18n.getMessage(key)
  const body = $("#word-replacements-rows")
  const notice = $("#word-replacements-notice")
  const status = $("#word-replacements-status").addClass("visible")
  let rows = normalizeWordReplacements(settings.wordReplacements)
  let editing = null
  let busy = false
  let deleted = null
  let undoTimer
  let highlight = null

  function sortRows() {
    rows.sort((a, b) => (a.type == "regex") - (b.type == "regex") ||
      (a.type == "regex" ? 0 : b.from.length - a.from.length))
  }
  function button(key, action, icon) {
    const result = $("<button type='button'>").attr({title: message(key), "aria-label": message(key)}).on("click", action)
    return icon ? result.append($("<span class='material-icons' aria-hidden='true'>").text(icon)) : result.text(message(key))
  }
  function showNotice() {
    notice.empty()
    if (deleted) notice.append($("<span>").text(message("wr_deleted") + " "), button("wr_undo", () => {
      const undo = deleted
      commit(() => rows.splice(undo.index, 0, undo.row), () => { deleted = null; clearTimeout(undoTimer) })
    }).prop("disabled", busy || editing !== null))
  }
  async function commit(change, success = () => {}) {
    if (busy) return
    busy = true
    status.text(message("advanced_word_replacements_saving"))
    body.find("button, input, select").prop("disabled", true)
    showNotice()
    const before = rows.slice()
    change()
    sortRows()
    try {
      await updateSettings({wordReplacements: rows})
      success()
      editing = null
      status.text(message("advanced_word_replacements_saved"))
      busy = false
      render()
    }
    catch (err) {
      rows = before
      busy = false
      status.text(message("advanced_word_replacements_save_failed"))
      showNotice()
      notice.find("button").prop("disabled", true)
      notice.append(button("wr_retry", () => commit(change, success)),
        button("wr_cancel", () => { status.text(""); render() }))
    }
  }
  function renderEditor(row) {
    const tr = $("<tr class='rule-editor'>").appendTo(body)
    const type = $("<select>").attr("aria-label", message("wr_type"))
      .append($("<option value='text'>").text(message("wr_text")), $("<option value='regex'>").text(message("wr_regex")))
      .val(row?.type || "text")
    const find = $("<input type='text' spellcheck='false'>").attr({"aria-label": message("wr_find"), "aria-describedby": "rule-error"}).val(row?.from || "")
    const replacement = $("<input type='text' spellcheck='false'>").attr("aria-label", message("wr_replace")).val(row?.to || "")
    const actions = $("<td class='rule-buttons'>")
    tr.append($("<td>").append(type), $("<td>").append(find), $("<td>").append(replacement), actions)
    const detail = $("<td colspan='4'>").appendTo($("<tr class='rule-detail'>").appendTo(body))
    const error = $("<div id='rule-error' role='alert'>").appendTo(detail)
    function submit() {
      const candidate = {type: type.val(), from: find.val().trim(), to: replacement.val()}
      const others = rows.filter(item => item !== row)
      const result = parseWordReplacements([...others, candidate])
      const problem = result.errors.find(item => item.line == others.length + 1)
      if (problem) {
        error.text(message(problem.code == "duplicate" ? "wr_duplicate" : problem.code == "invalid_regex" ? "wr_invalid" : "wr_required"))
        find.attr("aria-invalid", "true").trigger("focus")
        return
      }
      commit(() => {
        if (row) rows[rows.indexOf(row)] = candidate
        else rows.push(candidate)
      }, () => { highlight = candidate })
    }
    actions.append(button(row ? "wr_save" : "wr_add", submit))
    if (row) actions.append(button("wr_cancel", () => { editing = null; render() }))
    tr.on("keydown", event => {
      if (busy) return
      if (event.key == "Enter") { event.preventDefault(); submit() }
      if (event.key == "Escape" && row) { editing = null; render() }
    })
    if (row) find.trigger("focus")
  }
  function render() {
    body.empty()
    showNotice()
    rows.forEach((row, index) => {
      if (row === editing) return renderEditor(row)
      const tr = $("<tr>").toggleClass("rule-added", row === highlight).appendTo(body)
      const invalid = parseWordReplacements(rows).errors.some(error => error.line == index + 1)
      tr.append($("<td>").text(message(row.type == "regex" ? "wr_regex" : "wr_text")),
        $("<td class='rule-pattern'>").text(row.from),
        $("<td class='rule-pattern'>").text(row.to || message("wr_remove")))
      const actions = $("<td class='rule-buttons'>").appendTo(tr)
      actions.append(button("wr_edit", () => { editing = row; render() }, "edit"),
        button("wr_delete", () => commit(() => rows.splice(rows.indexOf(row), 1), () => {
          deleted = {row, index}
          clearTimeout(undoTimer)
          undoTimer = setTimeout(() => { deleted = null; showNotice() }, 10000)
        }), "delete_outline"))
      actions.find("button").addClass("existing-action").prop("disabled", editing !== null)
      if (invalid) $("<tr class='rule-detail'>").append($("<td colspan='4' class='rule-invalid'>").text(message("wr_existing_invalid"))).appendTo(body)
    })
    if (editing === null) renderEditor(null)
    highlight = null
  }
  sortRows()
  render()
})
