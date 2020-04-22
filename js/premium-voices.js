
(function() {
  var audio = document.createElement("AUDIO");

  Promise.all([
    getItems(),
    getVoices().then(function(voices) {return voices.filter(isPremiumVoice)}),
    getAuthToken().then(function(token) {return token ? getAccountInfo(token) : null}),
    getState("pendingPurchaseSku"),
    domReady()
  ])
  .then(spread(initialize))
  .catch(function(err) {
    alert("An internal error occurred, please try again later.\n" + err.message);
  })

  function initialize(items, voices, account, pendingPurchaseSku) {
    populateTestVoices(voices);
    populateSubscriptionStatus(account);
    populateItemTable(items);

    $("#test-voices .btn-test").click(onTestVoice);
    $("#subscription-status .btn-login").click(onLogin);
    $("[data-toggle]").click(onToggle);
    $(".page-loading").hide();

    if (pendingPurchaseSku) {
      getAuthToken({interactive: true})
        .then(function(token) {
          if (token) monitorPendingPurchase(pendingPurchaseSku, token, 5000);
        })
    }
  }

  function getItems() {
    return new Promise(function(fulfill, reject) {
      google.payments.inapp.getSkuDetails({
        parameters: {env: "prod"},
        success: function(data) {
          fulfill(data.response.details.inAppProducts.filter(function(item) {
            return item.type == "inapp" && item.state == "ACTIVE";
          }));
        },
        failure: function(data) {
          reject(new Error(data.response.errorType));
        }
      })
    })
  }

  function getPurchases(authToken) {
    return new Promise(function(fulfill, reject) {
      $.ajax({
        url: "https://www.googleapis.com/chromewebstore/v1.1/items/" + brapi.runtime.id + "/payments",
        headers: {
          Authorization: "Bearer " + authToken
        },
        success: function(purchases) {
          fulfill(purchases);
        },
        error: function(xhr, textStatus, errorThrown) {
          reject(new Error(xhr.responseText || textStatus || errorThrown));
        }
      })
    })
  }

  function findPurchase(sku, authToken) {
    return getPurchases(authToken)
      .then(function(purchases) {
        return purchases.find(function(x) {return x.sku == sku});
      })
  }

  function preparePurchase(sku, authToken) {
    return ajaxGet(config.serviceUrl + "/read-aloud/prepare-purchase?t=" + authToken + "&sku=" + sku);
  }

  function consumePurchase(sku) {
    return new Promise(function(fulfill, reject) {
      google.payments.inapp.consumePurchase({
        parameters: {env: 'prod'},
        sku: sku,
        success: function(data) {
          fulfill(data.response);
        },
        failure: function(data) {
          reject(new Error(data.response.errorType));
        }
      })
    })
  }

  function purchase(sku) {
    return new Promise(function(fulfill, reject) {
      google.payments.inapp.buy({
        parameters: {env: 'prod'},
        sku: sku,
        success: function(data) {
          fulfill(data.response);
        },
        failure: function(data) {
          reject(new Error(data.response.errorType));
        }
      })
    })
  }



  function populateTestVoices(voices) {
    var card = $("#test-voices");
    voices.forEach(function(voice) {
      $("<option>")
        .text(voice.voiceName)
        .val(voice.lang + "," + voice.voiceName)
        .prop("selected", voice.voiceName.endsWith("(Matthew)"))
        .appendTo(card.find("select.voices"))
    })
  }

  function populateSubscriptionStatus(account) {
    var card = $("#subscription-status");
    if (account) {
      card.find(".btn-login").hide();
      card.find(".remaining-line").html("Total Characters Remaining: <span class='remaining'>" + numberWithCommas(account.balance) + "</span>").show();
    }
    else {
      card.find(".btn-login").show();
      card.find(".remaining-line").hide();
    }
    if (account && account.lastPurchaseDate) {
      card.find(".last-purchase-line").text("Last purchase made on " + formatLastPurchaseDate(account.lastPurchaseDate)).show();
    }
    else {
      card.find(".last-purchase-line").hide();
    }
  }

  function populateItemTable(items) {
    var card = $("#purchase-subscription");
    var tbody = card.find("table.items > tbody");
    tbody.children("tr:not(:first-child)").remove();
    items.forEach(function(item) {
      createItemRow(item).appendTo(tbody);
    })
  }

  function createItemRow(item) {
    var sku = item.sku;
    var title = item.localeData[0].title;
    var description = item.localeData[0].description;
    var price = (Number(item.prices[0].valueMicros) / 1000000).toFixed(2);
    var currency = item.prices[0].currencyCode;

    var tr = $("<tr>");
    $("<td>").text(title).appendTo(tr);
    $("<td>").text(description).appendTo(tr);
    $("<td>").html(price + "&nbsp;" + currency).appendTo(tr);
    var td = $("<td>").css("text-align", "right").appendTo(tr);
    $("<button type='button'>Purchase</button>")
      .addClass("btn btn-primary")
      .click(onBuy.bind(null, item))
      .appendTo(td);
    return tr;
  }

  function monitorPendingPurchase(sku, authToken, interval) {
    var card = $("#subscription-status");
    card.find(".purchase-status-line").html("A new purchase is PENDING <img src='img/loading.gif' style='height: 1em'/>").show();
    return retryUntil(getPurchaseState, isComplete, interval)
      .then(function(state) {
        if (state == "ACTIVE") card.find(".purchase-status-line").hide();
        else card.find(".purchase-status-line").text("Your last purchase was " + state).show();
      })
      .then(function() {setState("pendingPurchaseSku", null)})
      .then(function() {
        return getAccountInfo(authToken).then(populateSubscriptionStatus);
      })

    function getPurchaseState() {
      return findPurchase(sku, authToken)
        .then(function(purchase) {
          console.log("Checking purchase status", sku, purchase && purchase.state);
          return purchase ? purchase.state : "PENDING";
        })
    }
    function isComplete(state) {
      return state != "CANCELLED_BY_DEVELOPER" && state != "PENDING";
    }
  }



  function onBuy(item) {
    var card = $("#purchase-subscription");
    card.find(".alert").hide();
    var authToken;
    getAuthToken({interactive: true})
      .then(function(token) {
        if (!token) throw new Error("LOGIN_REQUIRED");
        authToken = token;
      })
      .then(function() {
        return getAccountInfo(authToken).then(populateSubscriptionStatus);
      })
      .then(function() {
        return findPurchase(item.sku, authToken)
          .then(function(purchase) {
            if (purchase) {
              if (purchase.state == "ACTIVE") return consumePurchase(item.sku);
              else if (purchase.state == "PENDING") throw new Error("PREVIOUS_PURCHASE_PENDING");
            }
          })
      })
      .then(function() {return preparePurchase(item.sku, authToken)})
      .then(function() {return purchase(item.sku)})
      .then(function() {return setState("pendingPurchaseSku", item.sku)})
      .then(function() {monitorPendingPurchase(item.sku, authToken, 2000)})
      .catch(function(err) {
        card.find(".alert-danger").text(err.message).show();
      })
  }

  function onTestVoice() {
    var card = $("#test-voices");
    var btnTest = card.find(".btn-test");
    if (btnTest.text() == "Stop") {
      audio.pause();
      btnTest.text("Test");
    }
    else {
      var voice = card.find("select.voices").val().split(",");
      audio.src = "https://support.lsdsoftware.com/read-aloud/speak/" + voice[0] + "/" + encodeURIComponent(voice[1]) + "?q=demo";
      audio.onended = onTestVoice;
      audio.play();
      btnTest.text("Stop");
    }
  }

  function onLogin() {
    getAuthToken({interactive: true})
      .then(function(token) {
        if (token) return getAccountInfo(token).then(populateSubscriptionStatus);
      })
      .catch(function(err) {
        alert(err.message);
      })
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



  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatLastPurchaseDate(timestamp) {
    var d = new Date(timestamp);
    return (d.getMonth() +1) + "/" + d.getDate() + "/" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
  }

  function retryUntil(getter, predicate, delay, maxRetries) {
    return Promise.resolve()
      .then(getter)
      .then(function(result) {
        var done = predicate(result);
        if (done || maxRetries <= 0) return result;
        return new Promise(function(f) {setTimeout(f, delay)})
          .then(retryUntil.bind(null, getter, predicate, delay, maxRetries && maxRetries-1))
      })
  }
})();
