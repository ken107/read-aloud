domReady().then(() => {
  setI18nText()
})

rxjs.combineLatest(
  voices$,
  domReady()
).subscribe(async ([voices]) => {
  const [settings, acceptLangs] = await Promise.all([
    getSettings(["languages"]),
    brapi.i18n.getAcceptLanguages().catch(err => {console.error(err); return []}),
  ])

  //create checkboxes
  createCheckboxes(voices);

  //toggle check state
  var selectedLangs = immediate(() => {
    if (settings.languages) return settings.languages.split(',')
    if (settings.languages == '') return []
    const accept = new Set(acceptLangs.map(x => x.split('-',1)[0]))
    const langs = Object.keys(groupVoicesByLang(voices)).filter(x => accept.has(x))
    return langs.length ? langs : []
  })
  $("input[data-lang]").filter(function() {
    return selectedLangs.includes($(this).data("lang"));
  }).prop("checked", true);

  //event hooks
  $("input[data-lang]").click(function() {
    saveLanguages();
  })
})

function createCheckboxes(voices) {
  $("#lang-list").empty()

  const voicesForLang = groupVoicesByLang(voices)
  for (var item of langList) {
    if (!voicesForLang[item.code]) continue;

    var div = $("<div>").addClass("form-check").appendTo("#lang-list");
    var label = $("<label>").addClass("form-check-label").appendTo(div);
    $("<input>").attr("type", "checkbox").addClass("form-check-input").attr("data-lang", item.code).appendTo(label);
    $("<span>").text(item.name).appendTo(label);
  }
}

function saveLanguages() {
  updateSettings({
    languages: $("input[data-lang]:checked")
      .get()
      .map(function(elem) {return $(elem).data("lang")})
      .join(',')
  })
}
