
var queryString = getQueryString();
var couponCode = queryString.code;

$(function() {
  $("#btn-refresh").click(refreshResult);
  $("#ddl-num-pages").change(refreshResult);
  refreshResult();
})

function refreshResult() {
  clearResult();
  getInstallationId().then(loadResult).then(updateResult);
}

function clearResult() {
  $("#tbl-result tr").slice(1).remove();
}

function loadResult(installationId) {
  return new Promise(function(fulfill) {
    $.get(config.serviceUrl + "/read-aloud/history/" + installationId + (couponCode ? "/" + couponCode : "") + "?n=" + $("#ddl-num-pages").val(), function(data) {
      var lines = data.split("\n").reverse();
      var entries = [];
      for (var i=0; i<lines.length; i++) {
        try {entries.push(JSON.parse(lines[i]))}
        catch (err) {}
      }
      fulfill(entries);
    })
  })
}

function updateResult(entries) {
  entries.forEach(function(entry) {
    var tr = $("<tr>").appendTo($("#tbl-result"));
    $("<td>").appendTo(tr).text(formatDate(entry.time));
    $("<td>").appendTo(tr).text(entry.ip);
    $("<td>").appendTo(tr).text(entry.voiceId);
    $("<td>").appendTo(tr).text(entry.text);
    $("<td>").appendTo(tr).text(entry.billedChars);
    $("<td>").appendTo(tr).text(entry.balance);
    $("<td>").appendTo(tr).text(couponCode || "FREE");
  })
}

function formatDate(when) {
  function twoDigits(n) {
    return n < 10 ? '0' + n : n;
  }
  var d = new Date(when);
  return d.getFullYear() + "-" + twoDigits(d.getMonth()+1) + "-" + twoDigits(d.getDate()) + " " + twoDigits(d.getHours()) + ":" + twoDigits(d.getMinutes()) + ":" + twoDigits(d.getSeconds());
}
