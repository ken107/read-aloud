
var langList = config.langList

Promise.all([getVoices(), getSettings(["languages", "preferredVoices"]), domReady()]).then(spread(initialize));

function initialize(voices, settings) {
  setI18nText();

  //create checkboxes
  var langs = voices.groupBy(function(voice) {
    if (voice.lang) {
      var code = voice.lang.split('-',1)[0]
      var alias = {
        yue: "zh",
        cmn: "zh",
      }
      return alias[code] || code
    }
    else {
      return "<any>"
    }
  })
  createCheckboxes(langs);

  //toggle check state
  var selectedLangs = settings.languages ? settings.languages.split(',') : [];
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
  $("#back-button").click(function() {
    location.href = "options.html";
  })
}

function createCheckboxes(voicesForLang) {
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
