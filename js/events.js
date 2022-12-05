
brapi.runtime.onInstalled.addListener(installContextMenus);
if (getBrowser() == "firefox") brapi.runtime.onStartup.addListener(installContextMenus);


/**
 * IPC handlers
 */
var handlers = {
  playText: playText,
  playTab: playTab,
  stop: stop,
  pause: pause,
  getPlaybackState: getPlaybackState,
  forward: forward,
  rewind: rewind,
  seek: seek,
  reportIssue: reportIssue,
  authWavenet: authWavenet,
  forwardToContentScript: sendToContentScript,
  ibmFetchVoices: function() {
    return sendToPlayer({method: "ibmFetchVoices"})
  },
}

registerMessageListener("serviceWorker", handlers)


/**
 * Context menu installer & handlers
 */
function installContextMenus() {
  if (brapi.contextMenus)
  brapi.contextMenus.create({
    id: "read-selection",
    title: brapi.i18n.getMessage("context_read_selection"),
    contexts: ["selection"]
  });
}

if (brapi.contextMenus)
brapi.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "read-selection")
    stop()
      .then(function() {
        if (tab && tab.id != -1) return detectTabLanguage(tab.id)
        else return undefined
      })
      .then(function(lang) {
        return playText(info.selectionText, {lang: lang})
      })
      .catch(console.error)
})


/**
 * Shortcut keys handlers
 */
function execCommand(command) {
  if (command == "play") {
    getPlaybackState()
      .then(function(state) {
        if (state == "PLAYING") return pause();
        else if (state == "STOPPED" || state == "PAUSED") return playTab()
      })
      .catch(console.error)
  }
  else if (command == "stop") stop();
  else if (command == "forward") forward();
  else if (command == "rewind") rewind();
}

if (brapi.commands)
brapi.commands.onCommand.addListener(function(command) {
  execCommand(command)
})



/**
 * METHODS
 */
async function playText(text, opts) {
  const hasPlayer = await stop().then(() => true).catch(err => false)
  if (!hasPlayer) await injectPlayer()
  await sendToPlayer({method: "playText", args: [text, opts]})
}

async function playTab(tabId) {
  const tab = tabId ? await getTab(tabId) : await getActiveTab()
  if (!tab) throw new Error({code: "error_page_unreadable"})
  if (!await contentScriptAlreadyInjected(tab)) await injectContentScript(tab)
  await setState("contentScriptTabId", tab.id)

  const hasPlayer = await stop().then(() => true).catch(err => false)
  if (!hasPlayer) await injectPlayer()  
  await sendToPlayer({method: "playTab"})
}

function stop() {
  return sendToPlayer({method: "stop"})
}

function pause() {
  return sendToPlayer({method: "pause"})
}

async function getPlaybackState() {
  try {
    return await sendToPlayer({method: "getPlaybackState"})
  }
  catch (err) {
    return {status: "STOPPED"}
  }
}

function forward() {
  return sendToPlayer({method: "forward"})
}

function rewind() {
  return sendToPlayer({method: "rewind"})
}

function seek(n) {
  return sendToPlayer({method: "seek", args: [n]})
}



function reportIssue(url, comment) {
  var manifest = brapi.runtime.getManifest();
  return getSettings()
    .then(function(settings) {
      if (url) settings.url = url;
      settings.version = manifest.version;
      settings.userAgent = navigator.userAgent;
      return ajaxPost(config.serviceUrl + "/read-aloud/report-issue", {
        url: JSON.stringify(settings),
        comment: comment
      })
    })
}

function authWavenet() {
  createTab("https://cloud.google.com/text-to-speech/#put-text-to-speech-into-action", true)
    .then(function(tab) {
      addRequestListener();
      brapi.tabs.onRemoved.addListener(onTabRemoved);
      return showInstructions();

      function addRequestListener() {
        brapi.webRequest.onBeforeRequest.addListener(onRequest, {
          urls: ["https://cxl-services.appspot.com/proxy*"],
          tabId: tab.id
        })
      }
      function onTabRemoved(tabId) {
        if (tabId == tab.id) {
          brapi.tabs.onRemoved.removeListener(onTabRemoved);
          brapi.webRequest.onBeforeRequest.removeListener(onRequest);
        }
      }
      function onRequest(details) {
        var parser = parseUrl(details.url);
        var qs = parser.search ? parseQueryString(parser.search) : {};
        if (qs.token) {
          updateSettings({gcpToken: qs.token});
          showSuccess();
        }
      }
      function showInstructions() {
        return brapi.scripting.executeScript({
          target: {tabId: tab.id},
          func: function() {
            var elem = document.createElement('DIV')
            elem.id = 'ra-notice'
            elem.style.position = 'fixed'
            elem.style.top = '0'
            elem.style.left = '0'
            elem.style.right = '0'
            elem.style.backgroundColor = 'yellow'
            elem.style.padding = '20px'
            elem.style.fontSize = 'larger'
            elem.style.zIndex = 999000
            elem.style.textAlign = 'center'
            elem.innerHTML = 'Please click the blue SPEAK-IT button, then check the I-AM-NOT-A-ROBOT checkbox.'
            document.body.appendChild(elem)
          }
        })
      }
      function showSuccess() {
        return brapi.scripting.executeScript({
          target: {tabId: tab.id},
          func: function() {
            var elem = document.getElementById('ra-notice')
            elem.style.backgroundColor = '#0d0'
            elem.innerHTML = 'Successful, you can now use Google Wavenet voices. You may close this tab.'
          }
        })
      }
    })
}



async function contentScriptAlreadyInjected(tab) {
  const items = await brapi.scripting.executeScript({
    target: {tabId: tab.id},
    func: function() {
      return typeof brapi != "undefined"
    }
  })
  return items[0].result == true
}

async function injectContentScript(tab) {
  await brapi.scripting.executeScript({
    target: {tabId: tab.id},
    files: [
      "js/jquery-3.1.1.min.js",
      "js/messaging.js",
      getPageSpecificScript(tab.url),
      "js/content.js",
    ]
  })
  function getPageSpecificScript(url) {
    //TODO
    return "js/content/html-doc.js"
  }
}

async function injectPlayer() {
  const promise = new Promise(f => handlers.playerCheckIn = f)
  const tab = await brapi.tabs.create({
    url: brapi.runtime.getURL("player.html"),
    index: 0,
    active: false,
  })
  await brapi.tabs.update(tab.id, {pinned: true})
  await promise
}



async function sendToContentScript(message) {
  message.dest = "contentScript"
  const tabId = await getState("contentScriptTabId")
  const result = await brapi.tabs.sendMessage(tabId, message)
    .catch(err => {
      clearState("contentScriptTabId")
      throw err
    })
  if (result && result.error) throw new Error(result.error)
  else return result
}

async function sendToPlayer(message) {
  message.dest = "player"
  const result = await brapi.runtime.sendMessage(message)
  if (result && result.error) throw new Error(result.error)
  else return result
}
