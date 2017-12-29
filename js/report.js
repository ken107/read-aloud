$(function() {
  getState("lastUrl").then(function(url) {$("#txt-url").val(url)});
  $("#txt-comment").focus();
  $("#btn-submit").click(submit);
});

function submit() {
  $("#btn-submit").hide();
  $("#img-spinner").show();
  Promise.all([getBackgroundPage(), getSettings()])
    .then(spread(function(master, settings) {
      settings.browser = config.browser;
      var url = $("#txt-url").val();
      var comment = $("#txt-comment").val();
      return master.reportIssue(url + "\n" + JSON.stringify(settings), comment);
    }))
    .then(function() {
      $("#img-spinner").hide();
      $("#lbl-status").text("Issue has been reported, thank you!").toggleClass("error", false);
    })
    .catch(function() {
      $("#img-spinner").hide();
      $("#lbl-status").text("Server could not be contacted, please email me directly at hai.phan@gmail.com. Thank you!").toggleClass("error", true);
    })
}
