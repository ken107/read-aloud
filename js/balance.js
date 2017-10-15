
$(function() {
  $("#frm-redeem .btn-submit").click(redeemCoupon)
  $("#btn-refresh-balance").click(loadCoupons);
  loadCoupons();
})

function loadCoupons() {
  $("#balance tr").slice(1).remove();
  billing.getBalance()
    .then(function(rs) {
      rs.forEach(function(r) {
        var tr = $("<tr>").appendTo($("#balance"));
        var td = $("<td>").appendTo(tr);
        $("<span>").appendTo(td).addClass("coupon-code").text(r.couponCode || "FREE");
        td = $("<td>").appendTo(tr);
        $("<a>").appendTo(td).attr("href", "usage_history.html?code=" + (r.couponCode || "")).text(r.balance);
        if (r.couponCode) {
          td = $("<td>").appendTo(tr);
          $("<i>").appendTo(td).addClass("material-icons").text("close").click(removeCoupon.bind(null, r.couponCode));
        }
      })
    })
}

function redeemCoupon() {
  $("#frm-redeem .error-message").hide();
  var couponCode = $("#frm-redeem .txt-coupon-code").val();
  if (couponCode) {
    billing.redeemCoupon(couponCode)
      .then(function() {
        $("#frm-redeem .txt-coupon-code").val("");
        loadCoupons();
      })
      .catch(function(err) {
        $("#frm-redeem .error-message").show().text(err.message);
      })
  }
}

function removeCoupon(couponCode) {
  billing.removeCoupon(couponCode)
    .then(loadCoupons)
    .catch(function(err) {
      alert(err.message);
    })
}
