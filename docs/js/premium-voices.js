
//if authToken is passed in queryString, remove it from queryString (store in cookie)
if (queryString.t) {
  setCookie("authToken", queryString.t);
  location.href = location.href.split("?")[0];
}

var voices = [
  {"voice_name": "Amazon Australian English (Nicole)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Australian English (Russell)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Brazilian Portuguese (Ricardo)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Brazilian Portuguese (Vitoria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon British English (Amy)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon British English (Brian)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon British English (Emma)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Canadian French (Chantal)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Castilian Spanish (Conchita)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Castilian Spanish (Enrique)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Danish (Mads)", "lang": "da-DK", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Danish (Naja)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Dutch (Lotte)", "lang": "nl-NL", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Dutch (Ruben)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon French (Celine)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon French (Mathieu)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon German (Hans)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon German (Marlene)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Icelandic (Dora)", "lang": "is-IS", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Icelandic (Karl)", "lang": "is-IS", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Indian English (Raveena)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Italian (Carla)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Italian (Giorgio)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Norwegian (Liv)", "lang": "nb-NO", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Polish (Ewa)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Polish (Jacek)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Polish (Jan)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Polish (Maja)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Portuguese (Cristiano)", "lang": "pt-PT", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Portuguese (Ines)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Romanian (Carmen)", "lang": "ro-RO", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Russian (Maxim)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Russian (Tatyana)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Swedish (Astrid)", "lang": "sv-SE", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Turkish (Filiz)", "lang": "tr-TR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Ivy)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Joey)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Justin)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Kendra)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Kimberly)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US English (Salli)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US Spanish (Miguel)", "lang": "es-US", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon US Spanish (Penelope)", "lang": "es-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Welsh (Gwyneth)", "lang": "cy-GB", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Amazon Welsh English (Geraint)", "lang": "en-GB-WLS", "gender": "male", "event_types": ["start", "end", "error"]},

  {"voice_name": "Microsoft Australian English (Catherine)", "lang": "en-AU", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Australian English (James)", "lang": "en-AU", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Austrian German (Michael)", "lang": "de-AT", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Belgian Dutch (Bart)", "lang": "nl-BE", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Brazilian Portuguese (Daniel)", "lang": "pt-BR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Brazilian Portuguese (Maria)", "lang": "pt-BR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft British English (George)", "lang": "en-GB", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft British English (Hazel)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft British English (Susan)", "lang": "en-GB", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Bulgarian (Ivan)", "lang": "bg-BG", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Canadian English (Linda)", "lang": "en-CA", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Canadian English (Richard)", "lang": "en-CA", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Canadian French (Caroline)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Canadian French (Claude)", "lang": "fr-CA", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Canadian French (Nathalie)", "lang": "fr-CA", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Catalan (Herena)", "lang": "ca-ES", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Chinese (Huihui)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Chinese (Kangkang)", "lang": "zh-CN", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Chinese (Yaoyao)", "lang": "zh-CN", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft ChineseHK (Danny)", "lang": "zh-HK", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft ChineseHK (Tracy)", "lang": "zh-HK", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Croatian (Matej)", "lang": "hr-HR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Czech (Jakub)", "lang": "cs-CZ", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Danish (Helle)", "lang": "da-DK", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Dutch (Frank)", "lang": "nl-NL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Egyptian Arabic (Hoda)", "lang": "ar-EG", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Finnish (Heidi)", "lang": "fi-FI", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft French (Hortense)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft French (Julie)", "lang": "fr-FR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft French (Paul)", "lang": "fr-FR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft German (Hedda)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft German (Katja)", "lang": "de-DE", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft German (Stefan)", "lang": "de-DE", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Greek (Stefanos)", "lang": "el-GR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Hebrew (Asaf)", "lang": "he-IL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Hindi (Hemant)", "lang": "hi-IN", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Hindi (Kalpana)", "lang": "hi-IN", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Hungarian (Szabolcs)", "lang": "hu-HU", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Indian English (Heera)", "lang": "en-IN", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Indian English (Ravi)", "lang": "en-IN", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Indonesian (Andika)", "lang": "id-ID", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Irish English (Sean)", "lang": "en-IE", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Italian (Cosimo)", "lang": "it-IT", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Italian (Elsa)", "lang": "it-IT", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Japanese (Ayumi)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Japanese (Haruka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Japanese (Ichiro)", "lang": "ja-JP", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Japanese (Sayaka)", "lang": "ja-JP", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Korean (Heami)", "lang": "ko-KR", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Malay (Rizwan)", "lang": "ms-MY", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Mexican Spanish (Raul)", "lang": "es-MX", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Mexican Spanish (Sabina)", "lang": "es-MX", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Norwegian (Jon)", "lang": "nb-NO", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Polish (Adam)", "lang": "pl-PL", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Polish (Paulina)", "lang": "pl-PL", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Portuguese (Helia)", "lang": "pt-PT", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Romanian (Andrei)", "lang": "ro-RO", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Russian (Irina)", "lang": "ru-RU", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Russian (Pavel)", "lang": "ru-RU", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Saudi Arabic (Naayf)", "lang": "ar-SA", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Slovak (Filip)", "lang": "sk-SK", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Slovenian (Lado)", "lang": "sl-SI", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Spanish (Helena)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Spanish (Laura)", "lang": "es-ES", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Spanish (Pablo)", "lang": "es-ES", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Swedish (Bengt)", "lang": "sv-SE", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Swiss French (Guillaume)", "lang": "fr-CH", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Swiss German (Karsten)", "lang": "de-CH", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Tamil (Valluvar)", "lang": "ta-IN", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Thai (Pattara)", "lang": "th-TH", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Turkish (Tolga)", "lang": "tr-TR", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft US English (David)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft US English (Mark)", "lang": "en-US", "gender": "male", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft US English (Zira)", "lang": "en-US", "gender": "female", "event_types": ["start", "end", "error"]},
  {"voice_name": "Microsoft Vietnamese (An)", "lang": "vi-VI", "gender": "male", "event_types": ["start", "end", "error"]},
]

var audio = document.createElement("AUDIO");
selectedVoice = null;

var authToken = getCookie("authToken");
account = null;
purchasePending = false;
progress = 0;
error = null;

var stripe = Stripe('pk_live_51HdFjrBsdeZYuZrZcEGtMIHv4218IvMfSg88C4WJpOFqeCL5a0sxkeJLLPGC09UxHYJfvDjxgrYmAR0YTRg0k2SW00mvsXPwh6');


if (authToken) {
  if (queryString.s == 1) {
    purchasePending = true;
    repeat(refreshAccountInfo, {
        until: function() {return !account.pendingPurchase},
        max: 20,
        delay: 3000
      })
      .then(function() {
        if (account.pendingPurchase) error = new Error("Purchase incomplete, please contact us at support@lsdsoftware.com about order " + account.pendingPurchase);
      })
      .finally(function() {
        purchasePending = false;
      })
  }
  else if (queryString.s == 2) {
    error = new Error("Purchase cancelled");
    refreshAccountInfo();
  }
  else {
    refreshAccountInfo();
  }
}
else {
  error = new Error("Not logged in");
}

$(function() {
  $("[data-toggle]").click(onToggle);
  $(".page-loading").hide();
})



function populateTestVoices(elem) {
  voices.forEach(function(voice) {
    $("<option>")
      .text(voice.voice_name)
      .val(JSON.stringify(voice))
      .appendTo(elem)
  })
  selectedVoice = JSON.parse(elem.value);
}

function createCheckoutSession(qty) {
  return new Promise(function(fulfill, reject) {
    $.ajax({
      method: "POST",
      url: config.serviceUrl + "/read-aloud/checkout",
      contentType: "application/json",
      data: JSON.stringify({authToken: authToken, qty: qty}),
      dataType: "json",
      success: fulfill,
      error: function() {
        reject(new Error("Failed to create checkout session"));
      }
    })
  })
}



function onBuy(qty) {
  error = null;
  progress++;
  createCheckoutSession(qty)
    .then(function(session) {
      return stripe.redirectToCheckout({sessionId: session.id});
    })
    .then(function(result) {
      if (result.error) throw result.error;
    })
    .catch(function(err) {error = err})
    .finally(function() {progress--})
}

function onTestVoice(elem) {
  if ($(elem).text() == "Stop") {
    audio.pause();
    $(elem).text("Test");
  }
  else {
    audio.src = config.serviceUrl + "/read-aloud/speak/" + selectedVoice.lang + "/" + encodeURIComponent(selectedVoice.voice_name) + "?q=demo";
    audio.onended = onTestVoice.bind(null, arguments);
    audio.play();
    $(elem).text("Stop");
  }
}

function onToggle() {
  var target = $(this).data("target");
  var parent = $(target).data("parent");
  var current = $(parent).data("current");
  $(current).slideToggle(200);
  $(target).slideToggle(200);
  $(parent).data("current", target);
  return false;
}



function refreshAccountInfo() {
  progress++;
  return ajaxGet(config.serviceUrl + "/read-aloud/get-account?t=" + authToken)
    .then(JSON.parse)
    .then(function(res) {
      res.balance += res.freeBalance;
      account = res;
    })
    .catch(function(err) {error = err})
    .finally(function() {progress--})
}

function formatLastPurchaseDate(timestamp) {
  var d = new Date(timestamp);
  return (d.getMonth() +1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes();
}
