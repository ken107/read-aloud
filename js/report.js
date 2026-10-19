let hasDataConsentSupport = false;
$(function() {
  var queryString = getQueryString();
  if (queryString.referer) {
    $("button.close").show()
      .click(function() {
        history.back();
      })
  }

  brapi.storage.local.get("lastUrl").then(({lastUrl}) => $("#txt-url").val(lastUrl));
  $("#txt-comment").focus();
  $("#btn-submit").prop("disabled", true).click(submit);
  brapi.permissions.getAll().then(permissions => {
    hasDataConsentSupport = Array.isArray(permissions.data_collection);
    $("#btn-submit").prop("disabled", false);
  }).catch(console.error);
});

function submit() {
  // Request from the click handler to preserve Firefox's user gesture.
  const consent = hasDataConsentSupport
    ? brapi.permissions.request({data_collection: ["technicalAndInteraction"]})
    : Promise.resolve(true);
  $("#btn-submit, #lbl-status, #lbl-error").hide();
  $("#img-spinner").show();
  consent.then(granted => granted
    ? bgPageInvoke("reportIssue", [$("#txt-url").val(), $("#txt-comment").val()])
    : false)
    .then(function(sent) {
      $("#img-spinner").hide();
      if (sent === false) {
        $("#lbl-error").text("Permission to send technical and interaction data is needed to submit this report.").show();
        $("#btn-submit").show();
        return;
      }
      $("#lbl-status").text("Issue has been reported, thank you!").show();
    })
    .catch(function() {
      $("#img-spinner").hide();
      $("#lbl-error").text("Server could not be contacted, please email me directly at hai.phan@gmail.com. Thank you!").show();
    })
}
