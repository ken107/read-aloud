$(function() {
  getState("lastUrl").then(function(url) {$("#txt-url").val(url)});
  $("#txt-comment").focus();
  $("#btn-submit").click(submit);
});

function submit() {
  $("#btn-submit").hide();
  $("#img-spinner").show();
  $.ajax({
    method: "POST",
    url: "http://app.diepkhuc.com:30112/read-aloud/report-issue",
    data: {
      url: $("#txt-url").val(),
      comment: $("#txt-comment").val()
    }
  })
  .done(function() {
    $("#img-spinner").hide();
    $("#lbl-status").text("Issue has been reported, thank you!").toggleClass("error", false);
  })
  .fail(function() {
    $("#img-spinner").hide();
    $("#lbl-status").text("Server could not be contacted, please email me directly at hai.phan@gmail.com. Thank you!").toggleClass("error", true);
  });
}
