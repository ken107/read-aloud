
//if authToken is passed in queryString, remove it from queryString (store in cookie)
if (queryString.t) {
  setCookie("authToken", queryString.t);
  location.href = location.href.split("?")[0];
}

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



async function populateTestVoices(elem) {
  try {
    const res = await fetch(config.serviceUrl + "/read-aloud/list-voices/premium")
    if (!res.ok) throw new Error("Failed to fetch voices, status " + res.status)
    const voices = await res.json()
    voices.forEach(function(voice) {
      $("<option>")
        .text(voice.voiceName)
        .val(JSON.stringify(voice))
        .appendTo(elem)
    })
    selectedVoice = JSON.parse(elem.value);
  } catch (err) {
    error = err
  }
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
    audio.src = config.serviceUrl + "/read-aloud/speak/" + selectedVoice.lang + "/" + encodeURIComponent(selectedVoice.voiceName) + "?q=demo";
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
