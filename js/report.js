$(function() {
  var queryString = getQueryString();
  if (queryString.referer) {
    $("button.close").show()
      .click(function() {
        location.href = queryString.referer;
      })
  }

  getState("lastUrl").then(function(url) {$("#txt-url").val(url)});
  $("#txt-comment").focus();
  $("#btn-submit").click(submit);
});

function submit() {
  $("#btn-submit, #lbl-status, #lbl-error").hide();
  $("#img-spinner").show();
  bgPageInvoke("reportIssue", [$("#txt-url").val(), $("#txt-comment").val()])
    .then(function() {
      $("#img-spinner").hide();
      $("#lbl-status").text("Issue has been reported, thank you!").show();
    },
    function() {
      $("#img-spinner").hide();
      $("#lbl-error").text("Server could not be contacted, please email me directly at hai.phan@gmail.com. Thank you!").show();
    })
}
