(function() {
  var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});
  var bgPage = connectToBackgroundPage(
      function() {
        return pageScript.invoke.apply(pageScript, arguments);
      })
  var pageScript = loadAndConnectToPageScript(
      function() {
        return bgPage.invoke.apply(bgPage, arguments);
      })

  function loadAndConnectToPageScript(onInvoke, onDisconnect) {
    var peer = new RpcPeer(new DocumentMessagingPeer("GoogleTranslateToPageScript", "GoogleTranslateToContentScript"));
    peer.onInvoke = onInvoke;
    peer.onDisconnect = onDisconnect;
    loadPageScript("https://assets.lsdsoftware.com/read-aloud/page-scripts/google-translate.js");
    return peer;
  }

  function connectToBackgroundPage(onInvoke, onDisconnect) {
    var port = brapi.runtime.connect({name: "GoogleTranslateTtsWorker"});
    var peer = new RpcPeer(new ExtensionMessagingPeer(port));
    peer.onInvoke = onInvoke;
    peer.onDisconnect = onDisconnect;
    return peer;
  }

  function loadPageScript(url) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    document.head.appendChild(script);
  }
})()
