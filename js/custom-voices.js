
$(function() {
  getSettings(["awsCreds", "gcpCreds", "ibmCreds", "rivaCreds", "openaiCreds", "azureCreds"])
    .then(function(items) {
      if (items.awsCreds) {
        $("#aws-access-key-id").val(obfuscate(items.awsCreds.accessKeyId));
        $("#aws-secret-access-key").val(obfuscate(items.awsCreds.secretAccessKey));
      }
      if (items.gcpCreds) {
        $("#gcp-api-key").val(obfuscate(items.gcpCreds.apiKey));
        $("#gcp-enable-studio").prop('checked', items.gcpCreds.enableStudio);
      }
      if (items.ibmCreds) {
        $("#ibm-api-key").val(obfuscate(items.ibmCreds.apiKey));
        $("#ibm-url").val(obfuscate(items.ibmCreds.url));
      }
      if (items.rivaCreds) {
        $("#riva-url").val(obfuscate(items.rivaCreds.url));
      }
      if (items.openaiCreds) {
        $("#openai-api-key").val(obfuscate(items.openaiCreds.apiKey))
        $("#openai-url").val(items.openaiCreds.url || "")
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
  $("#riva-save-button").click(rivaSave);
  $("#openai-save-button").click(openaiSave)
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
      },
      function(err) {
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
      var polly = new AWS.Polly({
        region: "us-east-1",
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      })
      return polly.describeVoices().promise();
}


function gcpSave() {
  $(".status").hide();
  var apiKey = $("#gcp-api-key").val().trim();
  var enableStudio = $("#gcp-enable-studio").is(':checked');
  if (apiKey) {
    $("#gcp-progress").show();
    testGcp(apiKey)
      .then(function() {
        $("#gcp-progress").hide();
        updateSettings({gcpCreds: {apiKey: apiKey, enableStudio: enableStudio}});
        if (enableStudio) {
          $("#gcp-success").text("Google Wavenet & Studio voices are enabled.").show();
        } else {
          $("#gcp-success").text("Google Wavenet voices are enabled.").show();
        }
        $("#gcp-api-key").val(obfuscate(apiKey));
      },
      function(err) {
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
      },
      function(err) {
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
  return requestPermissions({origins: [url + "/*"]})
    .then(function(granted) {
      if (!granted) throw new Error("Permission not granted");
    })
    .then(function() {
      return ibmWatsonTtsEngine.fetchVoices(apiKey, url);
    })
}

function rivaSave() {
  $(".status").hide();
  var url = $("#riva-url").val().trim();
  if (url) {
    $("#riva-progress").show();
    testRiva(url)
      .then(function() {
        $("#riva-progress").hide();
        updateSettings({rivaCreds: {url: url}});
        $("#riva-success").text("Nvidia Riva voices are enabled.").show();
        $("#riva-url").val(obfuscate(url));
      },
      function(err) {
        $("#riva-progress").hide();
        $("#riva-error").text("Test failed: " + err.message).show();
      })
  }
  else if (!url) {
    clearSettings(["rivaCreds"])
      .then(function() {
        $("#riva-success").text("Nvidia Riva voices are disabled.").show();
      })
  }
  else {
    $("#riva-error").text("Missing required fields.").show();
  }
}

function testRiva(url) {
  return requestPermissions({origins: [url + "/*"]})
  .then(function(granted) {
    if (!granted) throw new Error("Permission not granted");
  })
  .then(function() {
    return nvidiaRivaTtsEngine.fetchVoices(url);
  })
}


async function openaiSave() {
  $(".status").hide()
  const apiKey = $("#openai-api-key").val().trim()
  const url = $("#openai-url").val().trim()
  if (apiKey) {
    $("#openai-progress").show()
    try {
      await openaiTtsEngine.test(apiKey, url)
      await updateSettings({openaiCreds: {apiKey, url}})
      $("#openai-success").text("ChatGPT voices are enabled.").show()
      $("#openai-api-key").val(obfuscate(apiKey))
    }
    catch (err) {
      $("#openai-error").text("Test failed: " + err.message).show()
    }
    finally {
      $("#openai-progress").hide()
    }
  }
  else {
    await clearSettings(["openaiCreds"])
    $("#openai-success").text("ChatGPT voices are disabled.").show()
  }
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
