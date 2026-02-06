
Promise.all([
  browserTtsEngine.getVoices().then(voices => voices.some(isSpeechDispatcher)),
  getSetting('useSpeechDispatcher').then(b => !!b),
  domReady()
]).then(([hasSpeechdVoices, useSpeechd]) => {
  $("#speechd-panel").toggle(hasSpeechdVoices || useSpeechd)
  $("#speechd-toggle").prop("checked", useSpeechd)
    .change(function() {
      updateSetting("useSpeechDispatcher", this.checked)
    })
})


$(function() {
  getSettings(["awsCreds", "gcpCreds", "ibmCreds", "azureCreds"])
    .then(function(items) {
      if (items.awsCreds) {
        $("#aws-access-key-id").val(obfuscate(items.awsCreds.accessKeyId));
        $("#aws-secret-access-key").val(obfuscate(items.awsCreds.secretAccessKey));
      }
      if (items.gcpCreds) {
        $("#gcp-api-key").val(obfuscate(items.gcpCreds.apiKey));
      }
      if (items.ibmCreds) {
        $("#ibm-api-key").val(obfuscate(items.ibmCreds.apiKey));
        $("#ibm-url").val(obfuscate(items.ibmCreds.url));
      }
      if (items.azureCreds) {
        $("#azure-region").val(items.azureCreds.region)
        $("#azure-key").val(obfuscate(items.azureCreds.key))
      }
    })
  $(".status").hide();
  $("#aws-save-button").click(awsSave);
  $("#gcp-save-button").click(gcpSave);
  $("#ibm-save-button").click(ibmSave);
  $("#azure-save-button").click(azureSave)
})

function obfuscate(key) {
  return key.replace(/./g, function(m, i) {
    return i < key.length-5 ? "*" : m;
  })
}


function awsSave() {
  $(".status").hide();
  var accessKeyId = $("#aws-access-key-id").val().trim();
  var secretAccessKey = $("#aws-secret-access-key").val().trim();
  if (accessKeyId && secretAccessKey) {
    $("#aws-progress").show();
    testAws(accessKeyId, secretAccessKey)
      .then(function() {
        $("#aws-progress").hide();
        updateSettings({awsCreds: {accessKeyId: accessKeyId, secretAccessKey: secretAccessKey}});
        $("#aws-success").text("Amazon Polly voices are enabled.").show();
        $("#aws-access-key-id").val(obfuscate(accessKeyId));
        $("#aws-secret-access-key").val(obfuscate(secretAccessKey));
      })
      .catch(function(err) {
        $("#aws-progress").hide();
        $("#aws-error").text("Test failed: " + err.message).show();
      })
  }
  else if (!accessKeyId && !secretAccessKey) {
    clearSettings(["awsCreds"])
      .then(function() {
        $("#aws-success").text("Amazon Polly voices are disabled.").show();
      })
  }
  else {
    $("#aws-error").text("Missing required fields.").show();
  }
}

function testAws(accessKeyId, secretAccessKey) {
      var polly = new AwsPolly({
        region: "us-east-1",
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      })
      return polly.describeVoices().promise();
}


function gcpSave() {
  $(".status").hide();
  var apiKey = $("#gcp-api-key").val().trim();
  if (apiKey) {
    $("#gcp-progress").show();
    testGcp(apiKey)
      .then(function() {
        $("#gcp-progress").hide();
        updateSettings({gcpCreds: {apiKey: apiKey}});
        $("#gcp-success").text("Google Wavenet voices are enabled.").show();
        $("#gcp-api-key").val(obfuscate(apiKey));
      })
      .catch(function(err) {
        $("#gcp-progress").hide();
        $("#gcp-error").text("Test failed: " + err.message).show();
      })
  }
  else {
    clearSettings(["gcpCreds"])
      .then(function() {
        $("#gcp-success").text("Google Wavenet voices are disabled.").show();
      })
  }
}

function testGcp(apiKey) {
      return ajaxGet("https://texttospeech.googleapis.com/v1beta1/voices?key=" + apiKey);
}


function ibmSave() {
  $(".status").hide();
  var apiKey = $("#ibm-api-key").val().trim();
  var url = $("#ibm-url").val().trim();
  if (apiKey && url) {
    $("#ibm-progress").show();
    testIbm(apiKey, url)
      .then(function() {
        $("#ibm-progress").hide();
        updateSettings({ibmCreds: {apiKey: apiKey, url: url}});
        $("#ibm-success").text("IBM Watson voices are enabled.").show();
        $("#ibm-api-key").val(obfuscate(apiKey));
        $("#ibm-url").val(obfuscate(url));
      })
      .catch(function(err) {
        $("#ibm-progress").hide();
        $("#ibm-error").text("Test failed: " + err.message).show();
      })
  }
  else if (!apiKey && !url) {
    clearSettings(["ibmCreds"])
      .then(function() {
        $("#ibm-success").text("IBM Watson voices are disabled.").show();
      })
  }
  else {
    $("#ibm-error").text("Missing required fields.").show();
  }
}

function testIbm(apiKey, url) {
  return brapi.permissions.request({origins: [url + "/*"]})
    .then(function(granted) {
      if (!granted) throw new Error("Permission not granted");
    })
    .then(function() {
      return bgPageInvoke("ibmFetchVoices", [apiKey, url]);
    })
}


async function azureSave() {
  $(".status").hide()
  const region = $("#azure-region").val().trim()
  const key = $("#azure-key").val().trim()
  if (region && key) {
    $("#azure-progress").show()
    try {
      await testAzure(region, key)
      await updateSettings({azureCreds: {region, key}})
      $("#azure-success").text("Azure voices are enabled.").show()
      $("#azure-key").val(obfuscate(key))
    }
    catch (err) {
      $("#azure-error").text("Test failed: " + err.message).show()
    }
    finally {
      $("#azure-progress").hide()
    }
  }
  else if (!region && !key) {
    await clearSettings(["azureCreds"])
    $("#azure-success").text("IBM Watson voices are disabled.").show()
  }
  else {
    $("#azure-error").text("Missing required fields.").show()
  }
}

async function testAzure(region, key) {
  await azureTtsEngine.fetchVoices(region, key)
}



//OpenAI
$(function() {
  const creds$ = observeSetting("openaiCreds")
  const editMode$ = new rxjs.BehaviorSubject(false)
  const status$ = new rxjs.BehaviorSubject({type: "IDLE"})

  rxjs.combineLatest(creds$, editMode$).subscribe(([creds, editMode]) => {
    $(".openai .view-new").toggle(creds == null && !editMode)
    $(".openai .view-exist").toggle(creds != null && !editMode)
    $(".openai .view-edit").toggle(editMode)
  })

  creds$.subscribe(creds => {
    const endpointUrl = creds && creds.url || openaiTtsEngine.defaultEndpointUrl
    const apiKey = creds && creds.apiKey || ""
    const voiceList = creds && creds.voiceList || openaiTtsEngine.defaultVoiceList
    $(".openai .endpoint-url").text(endpointUrl)
    $(".openai .api-key").text(apiKey && (apiKey.slice(0,13) + "*****" + apiKey.slice(-5)))
    $(".openai .voice-list").text(voiceList.map(x => x.voice).join(", "))
    $(".openai .txt-endpoint-url").val(endpointUrl)
    $(".openai .txt-api-key").val(apiKey)
    $(".openai .txt-voice-list").val(JSON.stringify(voiceList, null, 2))
  })

  status$.subscribe(status => {
    $(".openai .status.progress").toggle(status.type == "PROGRESS")
    $(".openai .status.success").toggle(status.type == "SUCCESS")
    $(".openai .status.error").toggle(status.type == "ERROR")
      .text(status.type == "ERROR" ? status.error.message : "")
  })

  //actions
  $(".openai .btn-add").click(() => {
    status$.next({type: "IDLE"})
    editMode$.next(true)
  })
  $(".openai .btn-edit").click(() => {
    status$.next({type: "IDLE"})
    editMode$.next(true)
  })
  $(".openai .btn-delete").click(() => {
    clearSettings(["openaiCreds"])
    editMode$.next(false)
  })
  $(".openai .btn-save").click(async () => {
    try {
      const openaiCreds = {
        url: $(".openai .txt-endpoint-url").val(),
        apiKey: $(".openai .txt-api-key").val(),
        voiceList: JSON.parse($(".openai .txt-voice-list").val())
      }
      status$.next({type: "PROGRESS"})
      await openaiTtsEngine.test(openaiCreds)
      await updateSettings({openaiCreds})
      editMode$.next(false)
      status$.next({type: "IDLE"})
    } catch (err) {
      status$.next({type: "ERROR", error: err})
    }
  })
  $(".openai .btn-cancel").click(() => {
    editMode$.next(false)
  })
})
