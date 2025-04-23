
var langList = [
  {code: "ab", name: "аҧсуа бызшәа, аҧсшәа"},
  {code: "aa", name: "Afaraf"},
  {code: "af", name: "Afrikaans"},
  {code: "ak", name: "Akan"},
  {code: "sq", name: "Shqip"},
  {code: "am", name: "አማርኛ"},
  {code: "ar", name: "العربية"},
  {code: "hy", name: "Հայերեն"},
  {code: "as", name: "অসমীয়া"},
  {code: "av", name: "авар мацӀ, магӀарул мацӀ"},
  {code: "ae", name: "avesta"},
  {code: "ay", name: "aymar aru"},
  {code: "az", name: "azərbaycan dili, تۆرکجه"},
  {code: "bm", name: "bamanankan"},
  {code: "ba", name: "башҡорт теле"},
  {code: "eu", name: "euskara, euskera"},
  {code: "be", name: "беларуская мова"},
  {code: "bn", name: "বাংলা"},
  {code: "bi", name: "Bislama"},
  {code: "bs", name: "bosanski jezik"},
  {code: "br", name: "brezhoneg"},
  {code: "bg", name: "български език"},
  {code: "my", name: "ဗမာစာ"},
  {code: "ca", name: "català, valencià"},
  {code: "ch", name: "Chamoru"},
  {code: "ce", name: "нохчийн мотт"},
  {code: "ny", name: "chiCheŵa, chinyanja"},
  {code: "zh", name: "中文 (Zhōngwén), 汉语, 漢語"},
  {code: "cv", name: "чӑваш чӗлхи"},
  {code: "kw", name: "Kernewek"},
  {code: "co", name: "corsu, lingua corsa"},
  {code: "cr", name: "ᓀᐦᐃᔭᐍᐏᐣ"},
  {code: "hr", name: "hrvatski jezik"},
  {code: "cs", name: "čeština, český jazyk"},
  {code: "da", name: "dansk"},
  {code: "dv", name: "ދިވެހި"},
  {code: "nl", name: "Nederlands, Vlaams"},
  {code: "dz", name: "རྫོང་ཁ"},
  {code: "en", name: "English"},
  {code: "et", name: "eesti, eesti keel"},
  {code: "ee", name: "Eʋegbe"},
  {code: "fo", name: "føroyskt"},
  {code: "fj", name: "vosa Vakaviti"},
  {code: "fi", name: "suomi, suomen kieli"},
  {code: "fr", name: "français"},
  {code: "ff", name: "Fulfulde, Pulaar, Pular"},
  {code: "gl", name: "Galego"},
  {code: "ka", name: "ქართული"},
  {code: "de", name: "Deutsch"},
  {code: "el", name: "ελληνικά"},
  {code: "gn", name: "Avañe'ẽ"},
  {code: "gu", name: "ગુજરાતી"},
  {code: "ht", name: "Kreyòl ayisyen"},
  {code: "ha", name: "(Hausa) هَوُسَ"},
  {code: "he", name: "עברית"},
  {code: "hz", name: "Otjiherero"},
  {code: "hi", name: "हिन्दी, हिंदी"},
  {code: "ho", name: "Hiri Motu"},
  {code: "hu", name: "magyar"},
  {code: "ia", name: "Interlingua"},
  {code: "id", name: "Bahasa Indonesia"},
  {code: "ga", name: "Gaeilge"},
  {code: "ig", name: "Asụsụ Igbo"},
  {code: "ik", name: "Iñupiaq, Iñupiatun"},
  {code: "is", name: "Íslenska"},
  {code: "it", name: "Italiano"},
  {code: "iu", name: "ᐃᓄᒃᑎᑐᑦ"},
  {code: "ja", name: "日本語 (にほんご)"},
  {code: "jv", name: "ꦧꦱꦗꦮ, Basa Jawa"},
  {code: "kl", name: "kalaallisut, kalaallit oqaasii"},
  {code: "kn", name: "ಕನ್ನಡ"},
  {code: "ks", name: "कश्मीरी, كشميري‎"},
  {code: "kk", name: "қазақ тілі"},
  {code: "km", name: "ខ្មែរ, ខេមរភាសា, ភាសាខ្មែរ"},
  {code: "ki", name: "Gĩkũyũ"},
  {code: "rw", name: "Ikinyarwanda"},
  {code: "ky", name: "Кыргызча, Кыргыз тили"},
  {code: "kv", name: "коми кыв"},
  {code: "kg", name: "Kikongo"},
  {code: "ko", name: "한국어"},
  {code: "ku", name: "Kurdî, کوردی‎"},
  {code: "kj", name: "Kuanyama"},
  {code: "la", name: "latine, lingua latina"},
  {code: "lb", name: "Lëtzebuergesch"},
  {code: "lg", name: "Luganda"},
  {code: "li", name: "Limburgs"},
  {code: "ln", name: "Lingála"},
  {code: "lo", name: "ພາສາລາວ"},
  {code: "lt", name: "lietuvių kalba"},
  {code: "lu", name: "Kiluba"},
  {code: "lv", name: "latviešu valoda"},
  {code: "gv", name: "Gaelg, Gailck"},
  {code: "mk", name: "македонски јазик"},
  {code: "mg", name: "fiteny malagasy"},
  {code: "ms", name: "Bahasa Melayu, بهاس ملايو‎"},
  {code: "ml", name: "മലയാളം"},
  {code: "mt", name: "Malti"},
  {code: "mi", name: "te reo Māori"},
  {code: "mr", name: "मराठी"},
  {code: "mh", name: "Kajin M̧ajeļ"},
  {code: "mn", name: "Монгол хэл"},
  {code: "na", name: "Dorerin Naoero"},
  {code: "nv", name: "Diné bizaad"},
  {code: "nd", name: "isiNdebele"},
  {code: "ne", name: "नेपाली"},
  {code: "ng", name: "Owambo"},
  {code: "nb", name: "Norsk Bokmål"},
  {code: "nn", name: "Norsk Nynorsk"},
  {code: "no", name: "Norsk"},
  {code: "ii", name: "ꆈꌠ꒿ Nuosuhxop"},
  {code: "nr", name: "isiNdebele"},
  {code: "oc", name: "occitan, lenga d'òc"},
  {code: "cu", name: "ѩзыкъ словѣньскъ"},
  {code: "om", name: "Afaan Oromoo"},
  {code: "or", name: "ଓଡ଼ିଆ"},
  {code: "os", name: "ирон ӕвзаг"},
  {code: "pa", name: "ਪੰਜਾਬੀ, پنجابی‎"},
  {code: "fa", name: "فارسی"},
  {code: "pl", name: "język polski, polszczyzna"},
  {code: "ps", name: "پښتو"},
  {code: "pt", name: "Português"},
  {code: "qu", name: "Runa Simi, Kichwa"},
  {code: "rm", name: "Rumantsch Grischun"},
  {code: "rn", name: "Ikirundi"},
  {code: "ro", name: "Română, Moldovenească"},
  {code: "ru", name: "русский"},
  {code: "sa", name: "संस्कृतम्, 𑌸𑌂𑌸𑍍𑌕𑍃𑌤𑌮𑍍"},
  {code: "sc", name: "sardu"},
  {code: "sd", name: "सिन्धी, سنڌي، سندھی‎"},
  {code: "se", name: "Davvisámegiella"},
  {code: "sm", name: "gagana fa'a Samoa"},
  {code: "sg", name: "yângâ tî sängö"},
  {code: "sr", name: "српски језик"},
  {code: "gd", name: "Gàidhlig"},
  {code: "sn", name: "chiShona"},
  {code: "si", name: "සිංහල"},
  {code: "sk", name: "Slovenčina, Slovenský jazyk"},
  {code: "sl", name: "Slovenski jezik, Slovenščina"},
  {code: "so", name: "Soomaaliga, af Soomaali"},
  {code: "st", name: "Sesotho"},
  {code: "es", name: "Español"},
  {code: "su", name: "Basa Sunda"},
  {code: "sw", name: "Kiswahili"},
  {code: "ss", name: "SiSwati"},
  {code: "sv", name: "Svenska"},
  {code: "ta", name: "தமிழ்"},
  {code: "te", name: "తెలుగు"},
  {code: "tg", name: "тоҷикӣ, toçikī, تاجیکی‎"},
  {code: "th", name: "ไทย"},
  {code: "ti", name: "ትግርኛ"},
  {code: "bo", name: "བོད་ཡིག"},
  {code: "tk", name: "Türkmen, Түркмен"},
  {code: "tl", name: "Wikang Tagalog"},
  {code: "tn", name: "Setswana"},
  {code: "to", name: "Faka Tonga"},
  {code: "tr", name: "Türkçe"},
  {code: "ts", name: "Xitsonga"},
  {code: "tt", name: "татар теле, tatar tele"},
  {code: "ty", name: "Reo Tahiti"},
  {code: "ug", name: "ئۇيغۇرچە‎, Uyghurche"},
  {code: "uk", name: "Українська"},
  {code: "ur", name: "اردو"},
  {code: "uz", name: "Oʻzbek, Ўзбек, أۇزبېك‎"},
  {code: "ve", name: "Tshivenḓa"},
  {code: "vi", name: "Tiếng Việt"},
  {code: "wa", name: "Walon"},
  {code: "cy", name: "Cymraeg"},
  {code: "wo", name: "Wollof"},
  {code: "fy", name: "Frysk"},
  {code: "xh", name: "isiXhosa"},
  {code: "yo", name: "Yorùbá"},
  {code: "za", name: "Saɯ cueŋƅ, Saw cuengh"},
  {code: "zu", name: "isiZulu"},
]

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
  createCheckboxes(voices);

  //toggle check state
  var selectedLangs = immediate(() => {
    if (settings.languages) return settings.languages.split(',')
    if (settings.languages == '') return []
    const accept = new Set(acceptLangs.map(x => x.split('-',1)[0]))
    const langs = Object.keys(groupVoicesByLang(voices)).filter(x => accept.has(x))
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

function createCheckboxes(voices) {
  $("#lang-list").empty()

  const voicesForLang = groupVoicesByLang(voices)
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
