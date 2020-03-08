
var langList = [
  {code: "ab", name: "Abkhazian"},
  {code: "aa", name: "Afar"},
  {code: "af", name: "Afrikaans"},
  {code: "ak", name: "Akan"},
  {code: "sq", name: "Albanian"},
  {code: "am", name: "Amharic"},
  {code: "ar", name: "Arabic"},
  {code: "an", name: "Aragonese"},
  {code: "hy", name: "Armenian"},
  {code: "as", name: "Assamese"},
  {code: "av", name: "Avaric"},
  {code: "ae", name: "Avestan"},
  {code: "ay", name: "Aymara"},
  {code: "az", name: "Azerbaijani"},
  {code: "bm", name: "Bambara"},
  {code: "ba", name: "Bashkir"},
  {code: "eu", name: "Basque"},
  {code: "be", name: "Belarusian"},
  {code: "bn", name: "Bengali"},
  {code: "bh", name: "Bihari languages"},
  {code: "bi", name: "Bislama"},
  {code: "bs", name: "Bosnian"},
  {code: "br", name: "Breton"},
  {code: "bg", name: "Bulgarian"},
  {code: "my", name: "Burmese"},
  {code: "ca", name: "Catalan, Valencian"},
  {code: "ch", name: "Chamorro"},
  {code: "ce", name: "Chechen"},
  {code: "ny", name: "Chichewa, Chewa, Nyanja"},
  {code: "zh", name: "Chinese"},
  {code: "cv", name: "Chuvash"},
  {code: "kw", name: "Cornish"},
  {code: "co", name: "Corsican"},
  {code: "cr", name: "Cree"},
  {code: "hr", name: "Croatian"},
  {code: "cs", name: "Czech"},
  {code: "da", name: "Danish"},
  {code: "dv", name: "Divehi, Dhivehi, Maldivian"},
  {code: "nl", name: "Dutch, Flemish"},
  {code: "dz", name: "Dzongkha"},
  {code: "en", name: "English"},
  {code: "eo", name: "Esperanto"},
  {code: "et", name: "Estonian"},
  {code: "ee", name: "Ewe"},
  {code: "fo", name: "Faroese"},
  {code: "fj", name: "Fijian"},
  {code: "fi", name: "Finnish"},
  {code: "fr", name: "French"},
  {code: "ff", name: "Fulah"},
  {code: "gl", name: "Galician"},
  {code: "ka", name: "Georgian"},
  {code: "de", name: "German"},
  {code: "el", name: "Greek (modern)"},
  {code: "gn", name: "Guaraní"},
  {code: "gu", name: "Gujarati"},
  {code: "ht", name: "Haitian, Haitian Creole"},
  {code: "ha", name: "Hausa"},
  {code: "he", name: "Hebrew (modern)"},
  {code: "hz", name: "Herero"},
  {code: "hi", name: "Hindi"},
  {code: "ho", name: "Hiri Motu"},
  {code: "hu", name: "Hungarian"},
  {code: "ia", name: "Interlingua"},
  {code: "id", name: "Indonesian"},
  {code: "ie", name: "Interlingue"},
  {code: "ga", name: "Irish"},
  {code: "ig", name: "Igbo"},
  {code: "ik", name: "Inupiaq"},
  {code: "io", name: "Ido"},
  {code: "is", name: "Icelandic"},
  {code: "it", name: "Italian"},
  {code: "iu", name: "Inuktitut"},
  {code: "ja", name: "Japanese"},
  {code: "jv", name: "Javanese"},
  {code: "kl", name: "Kalaallisut, Greenlandic"},
  {code: "kn", name: "Kannada"},
  {code: "kr", name: "Kanuri"},
  {code: "ks", name: "Kashmiri"},
  {code: "kk", name: "Kazakh"},
  {code: "km", name: "Central Khmer"},
  {code: "ki", name: "Kikuyu, Gikuyu"},
  {code: "rw", name: "Kinyarwanda"},
  {code: "ky", name: "Kirghiz, Kyrgyz"},
  {code: "kv", name: "Komi"},
  {code: "kg", name: "Kongo"},
  {code: "ko", name: "Korean"},
  {code: "ku", name: "Kurdish"},
  {code: "kj", name: "Kuanyama, Kwanyama"},
  {code: "la", name: "Latin"},
  {code: "lb", name: "Luxembourgish, Letzeburgesch"},
  {code: "lg", name: "Ganda"},
  {code: "li", name: "Limburgan, Limburger, Limburgish"},
  {code: "ln", name: "Lingala"},
  {code: "lo", name: "Lao"},
  {code: "lt", name: "Lithuanian"},
  {code: "lu", name: "Luba-Katanga"},
  {code: "lv", name: "Latvian"},
  {code: "gv", name: "Manx"},
  {code: "mk", name: "Macedonian"},
  {code: "mg", name: "Malagasy"},
  {code: "ms", name: "Malay"},
  {code: "ml", name: "Malayalam"},
  {code: "mt", name: "Maltese"},
  {code: "mi", name: "Maori"},
  {code: "mr", name: "Marathi"},
  {code: "mh", name: "Marshallese"},
  {code: "mn", name: "Mongolian"},
  {code: "na", name: "Nauru"},
  {code: "nv", name: "Navajo, Navaho"},
  {code: "nd", name: "North Ndebele"},
  {code: "ne", name: "Nepali"},
  {code: "ng", name: "Ndonga"},
  {code: "nb", name: "Norwegian Bokmål"},
  {code: "nn", name: "Norwegian Nynorsk"},
  {code: "no", name: "Norwegian"},
  {code: "ii", name: "Sichuan Yi, Nuosu"},
  {code: "nr", name: "South Ndebele"},
  {code: "oc", name: "Occitan"},
  {code: "oj", name: "Ojibwa"},
  {code: "cu", name: "Church Slavic, Church Slavonic, Old Church Slavonic, Old Slavonic, Old Bulgarian"},
  {code: "om", name: "Oromo"},
  {code: "or", name: "Oriya"},
  {code: "os", name: "Ossetian, Ossetic"},
  {code: "pa", name: "Panjabi, Punjabi"},
  {code: "pi", name: "Pali"},
  {code: "fa", name: "Persian"},
  {code: "pl", name: "Polish"},
  {code: "ps", name: "Pashto, Pushto"},
  {code: "pt", name: "Portuguese"},
  {code: "qu", name: "Quechua"},
  {code: "rm", name: "Romansh"},
  {code: "rn", name: "Rundi"},
  {code: "ro", name: "Romanian, Moldavian, Moldovan"},
  {code: "ru", name: "Russian"},
  {code: "sa", name: "Sanskrit"},
  {code: "sc", name: "Sardinian"},
  {code: "sd", name: "Sindhi"},
  {code: "se", name: "Northern Sami"},
  {code: "sm", name: "Samoan"},
  {code: "sg", name: "Sango"},
  {code: "sr", name: "Serbian"},
  {code: "gd", name: "Gaelic, Scottish Gaelic"},
  {code: "sn", name: "Shona"},
  {code: "si", name: "Sinhala, Sinhalese"},
  {code: "sk", name: "Slovak"},
  {code: "sl", name: "Slovenian"},
  {code: "so", name: "Somali"},
  {code: "st", name: "Southern Sotho"},
  {code: "es", name: "Spanish, Castilian"},
  {code: "su", name: "Sundanese"},
  {code: "sw", name: "Swahili"},
  {code: "ss", name: "Swati"},
  {code: "sv", name: "Swedish"},
  {code: "ta", name: "Tamil"},
  {code: "te", name: "Telugu"},
  {code: "tg", name: "Tajik"},
  {code: "th", name: "Thai"},
  {code: "ti", name: "Tigrinya"},
  {code: "bo", name: "Tibetan"},
  {code: "tk", name: "Turkmen"},
  {code: "tl", name: "Tagalog"},
  {code: "tn", name: "Tswana"},
  {code: "to", name: "Tonga (Tonga Islands)"},
  {code: "tr", name: "Turkish"},
  {code: "ts", name: "Tsonga"},
  {code: "tt", name: "Tatar"},
  {code: "tw", name: "Twi"},
  {code: "ty", name: "Tahitian"},
  {code: "ug", name: "Uighur, Uyghur"},
  {code: "uk", name: "Ukrainian"},
  {code: "ur", name: "Urdu"},
  {code: "uz", name: "Uzbek"},
  {code: "ve", name: "Venda"},
  {code: "vi", name: "Vietnamese"},
  {code: "vo", name: "Volapük"},
  {code: "wa", name: "Walloon"},
  {code: "cy", name: "Welsh"},
  {code: "wo", name: "Wolof"},
  {code: "fy", name: "Western Frisian"},
  {code: "xh", name: "Xhosa"},
  {code: "yi", name: "Yiddish"},
  {code: "yo", name: "Yoruba"},
  {code: "za", name: "Zhuang, Chuang"},
  {code: "zu", name: "Zulu"}
]

Promise.all([getVoices(), getSettings(["languages", "preferredVoices"]), domReady()]).then(spread(initialize));

function initialize(voices, settings) {
  setI18nText();

  //create checkboxes
  var langs = voices.groupBy(function(voice) {
    return voice.lang ? voice.lang.split('-',1)[0] : "<any>";
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
