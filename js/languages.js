
Promise.all([getVoices(), getSettings(), domReady()]).then(spread(initialize));

function initialize(voices, settings) {
  setI18nText();

  var langs = voices.groupBy(function(voice) {
    return voice.lang ? voice.lang.split('-',1)[0] : "<any>";
  })
  var isUnavailable = function() {
    return !(langs["<any>"] || langs[$(this).data("lang")]);
  };
  $("input[data-lang]").filter(isUnavailable).parents(".form-check").hide();

  var selectedLangs = settings.languages ? settings.languages.split(',') : [];
  var isSelected = function() {
    return selectedLangs.includes($(this).data("lang"));
  };
  $("input[data-lang]").filter(isSelected).prop("checked", true);

  $("input[data-lang]").click(function() {
    updateSettings({
      languages: $("input[data-lang]:checked").map(function() {return $(this).data("lang")}).get().join(',')
    })
  })

  $("#back-button").click(function() {
    location.href = "options.html";
  })
}
