
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
        $("#azure-tts-key").val(obfuscate(items.azureCreds.subKey));
        $("#azure-tts-region").val(obfuscate(items.azureCreds.region));
      }
    })
  $(".status").hide();
  $("#aws-save-button").click(awsSave);
  $("#gcp-save-button").click(gcpSave);
  $("#ibm-save-button").click(ibmSave);
  $("#azure-save-button").click(azureSave);
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


function azureSave() {
  $(".status").hide();
  var subKey = $("#azure-tts-key").val().trim();
  var region = $("#azure-tts-region").val().trim();
  if (subKey && region) {
    $("#azure-progress").show();
    testAzure(subKey, region);
  }
  else if (!subKey && !region) {
    clearSettings(["azureCreds"])
      .then(function() {
        $("#azure-success").text("Azure Cognitive Services voices are disabled.").show();
      })
  }
  else {
    $("#azure-error").text("Missing required fields.").show();
  }
}

function testAzure(subKey, region) {
  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subKey, region);
  const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();

  const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
  synthesizer.speakTextAsync("Azure Congitive Services test",
      result => {
          if (result) {
              console.log(JSON.stringify(result));
          }
          synthesizer.close();
          $("#azure-progress").hide();
          updateSettings({azureCreds: {subscriptionKey: subKey, region: region}});
          $("#azure-success").text("Azure Cognitive Services voices are enabled.").show();
          $("#azure-tts-key").val(obfuscate(subKey));
          $("#azure-tts-region").val(obfuscate(region));
      },
      error => {
          console.log(error);
          synthesizer.close();
          $("#azure-progress").hide();
          $("#azure-error").text("Test failed: " + err.message).show();
      });
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
  return requestPermissions({origins: [url + "/*"]})
    .then(function(granted) {
      if (!granted) throw new Error("Permission not granted");
    })
    .then(function() {
      return bgPageInvoke("ibmFetchVoices", [apiKey, url]);
    })
}
