
var langList = config.langList

domReady().then(() => {
  setI18nText()
})

rxjs.combineLatest(
  voices$,
  domReady()
).subscribe(async ([voices]) => {
  const [settings, acceptLangs] = await Promise.all([
    getSettings(["languages", "preferredVoices"]),
    brapi.i18n.getAcceptLanguages().catch(err => {console.error(err); return []}),
  ])

  //create checkboxes
  const voicesByLang = groupVoicesByLang(voices)
  createCheckboxes(voicesByLang)

  //toggle check state
  var selectedLangs = immediate(() => {
    if (settings.languages) return settings.languages.split(',')
    if (settings.languages == '') return []
    const accept = new Set(acceptLangs.map(x => parseLang(x).code))
    const langs = Object.keys(voicesByLang).filter(x => accept.has(x))
    return langs.length ? langs : []
  })
  var isSelected = function() {
    return selectedLangs.includes($(this).data("lang"));
  };
  $("input[data-lang]").filter(isSelected).prop("checked", true);

  $(".voice-list").hide().filter(isSelected).show();
  $(".voice-list").each(function() {
    var preferredVoice = settings.preferredVoices && settings.preferredVoices[$(this).data("lang")];
    if (preferredVoice) $("input[type=radio][data-voice='" + preferredVoice + "']", this).prop("checked", true);
    else $("input[type=radio]:first", this).prop("checked", true);
  })

  //event hooks
  $("input[data-lang]").click(function() {
    $(".voice-list[data-lang=" + $(this).data("lang") + "]").toggle(this.checked);
    saveLanguages();
  })
  $(".voice-list").change(function() {
    savePreferredVoices();
  })
})

function createCheckboxes(voicesForLang) {
  $("#lang-list").empty()

  for (var item of langList) {
    if (!voicesForLang[item.code]) continue;

    var div = $("<div>").addClass("form-check").appendTo("#lang-list");
    var label = $("<label>").addClass("form-check-label").appendTo(div);
    $("<input>").attr("type", "checkbox").addClass("form-check-input").attr("data-lang", item.code).appendTo(label);
    $("<span>").text(item.name).appendTo(label);

    div = $("<div>").addClass("form-check voice-list").attr("data-lang", item.code).appendTo("#lang-list");
    label = $("<label>").addClass("form-check-label d-block").appendTo(div);
    $("<input>").attr("type", "radio").attr("name", item.code).appendTo(label);
    $("<span>").text("Auto select").appendTo(label);
    for (var voice of voicesForLang[item.code]) {
      label = $("<label>").addClass("form-check-label d-block").appendTo(div);
      $("<input>").attr("type", "radio").attr("name", item.code).attr("data-voice", voice.voiceName).appendTo(label);
      $("<span>").text(voice.voiceName).appendTo(label);
    }
    for (var voice of voicesForLang["<any>"] || []) {
      label = $("<label>").addClass("form-check-label d-block").appendTo(div);
      $("<input>").attr("type", "radio").attr("name", item.code).attr("data-voice", voice.voiceName).appendTo(label);
      $("<span>").text(voice.voiceName).appendTo(label);
    }
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

function savePreferredVoices() {
  updateSettings({
    preferredVoices: $(".voice-list")
      .get()
      .groupBy(function(elem) {
        return $(elem).data("lang");
      },
      function(accum, elem) {
        return $("input[type=radio]:checked", elem).data("voice");
      })
  })
}
