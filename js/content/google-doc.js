
var readAloudDoc = (function() {
  if ($(".kix-canvas-tile-content > svg").length) return new SvgReadAloudDoc()
  if ($(".kix-paragraphrenderer").length) return new LegacyReadAloudDoc()
  return new AddonReadAloudDoc()
})();


async function altGetTexts() {
  const text = Array.from(document.body.children)
    .filter(el => el.tagName == "SCRIPT")
    .map(el => el.innerText)
    .filter(text => text.startsWith("DOCS_modelChunk = ") && text.endsWith("; DOCS_modelChunkLoadStart = new Date().getTime(); _getTimingInstance().incrementTime('mp', DOCS_modelChunkLoadStart - DOCS_modelChunkParseStart); DOCS_warmStartDocumentLoader.loadModelChunk(DOCS_modelChunk); DOCS_modelChunk = undefined;"))
    .map(text => text.slice(18, -237))
    .map(JSON.parse)
    .map(data => data[0].s)
    .join("")
    .trim()
  if (!text) throw new Error("No text found")
  return text.split(/\s*\r?\n\s*/)
}



function AddonReadAloudDoc() {
  var addonFailed = false
  var $popup = createPopup();
  var cache = {expires: 0}
  var shouldShowPopupOnError = new WeakMap()

  addEventListener("message", function(event) {
    if (event.data.type == "ra-advertise") {
      cache = {
        source: event.source,
        expires: Date.now() + 1250
      }
    }
  })

  this.getCurrentIndex = function() {
    return invoke({method: "ra-getCurrentIndex"})
      .then(function(result) {
        addonFailed = false
        return result
      },
      function(err) {
        addonFailed = true
        return altGetTexts()
          .then(() => 0)
          .catch(function() {
            if (shouldShowPopupOnError.has(err)) showPopup()
            throw err
          })
      })
  }

  this.getTexts = function(index) {
    if (addonFailed) {
      return index == 0 ? altGetTexts() : null
    }
    return invoke({method: "ra-getTexts", index: index})
  }

  function invoke(args) {
    return Promise.resolve(cache.expires > Date.now() ? cache.source : getSource(7000))
      .then(function(source) {
        return new Promise(function(fulfill, reject) {
          var req = Object.assign({}, args, {
            id: String(Math.random())
          })
          source.postMessage(req, "*")
          var onMessage = function(event) {
            if (event.data.id == req.id) {
              removeEventListener("message", onMessage)
              if (event.data.error) reject(new Error(event.data.error))
              else fulfill(event.data.value)
            }
          }
          addEventListener("message", onMessage)
        })
      })
  }

  function getSource(waitDuration) {
    console.log("Waiting for addon to advertise...")
    return new Promise(function(fulfill, reject) {
      var menu = $(".goog-menuitem-content").filter(function() {
        return $(this).text().startsWith("Read Aloud TTS")
      })
      if (!menu.length) reject(new Error("'Read Aloud TTS' addon not found"))
      simulateClick(menu.get(0))
      setTimeout(fulfill, 250)
    })
    .then(function() {
      var menu = $(".goog-menuitem-content").filter(function() {
        return $(this).text().startsWith("Open sidebar")
      })
      if (!menu.length) throw new Error("'Open sidebar' menu not found")
      simulateClick(menu.get(0))
      menu.parent().parent().hide()
      return waitForSource(waitDuration)
    })
    .catch(function(err) {
      shouldShowPopupOnError.set(err, true)
      throw err
    })
  }

  function waitForSource(waitDuration) {
    return new Promise(function(fulfill, reject) {
      var timeout = setTimeout(function() {
        removeEventListener("message", onMessage)
        reject(new Error("Timeout waiting for response from addon"))
      }, waitDuration)
      var onMessage = function(event) {
        if (event.data.type == "ra-advertise") {
          clearTimeout(timeout)
          removeEventListener("message", onMessage)
          fulfill(event.source)
        }
      }
      addEventListener("message", onMessage)
    })
  }

  function showPopup() {
    $popup.show();
    $(document.body).one("click", function() {
      $popup.hide();
    })
  }

  function createPopup() {
    if ($("#docs-extensions-menu").length) return createAddonInstructionPopup();
    else return createSaveInstructionPopup();
  }

  function createAddonInstructionPopup() {
    var $anchor = $("#docs-extensions-menu")
    var anchorOffset = $anchor.offset()
    var anchorDimension = {
      width: $anchor.outerWidth(),
      height: $anchor.outerHeight()
    }
    var $popup = $("<div>")
      .appendTo(document.body)
      .data("message", "You need to install the Read Aloud Google Workspace add-on to read aloud this document.")
      .css({
        position: "absolute",
        left: anchorOffset.left + anchorDimension.width/2 - 160,
        top: anchorOffset.top + anchorDimension.height,
        width: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 999000,
        fontSize: "larger",
      })
    var $arrow = $("<div>")
      .appendTo($popup)
      .css({
        width: 0,
        height: 0,
        borderLeft: ".5em solid transparent",
        borderRight: ".5em solid transparent",
        borderBottom: ".5em solid #333",
      })
    var $text = $("<div>")
      .appendTo($popup)
      .html("Please use this menu to find and install the Read Aloud Google Workspace add-on.  For instructions, see <a style='color:yellow' target='_blank' href='https://blog.readaloud.app/2021/09/google-docs-update.html'>this post</a>.")
      .css({
        backgroundColor: "#333",
        color: "#fff",
        padding: "1em",
        borderRadius: ".5em",
      })
    return $popup.hide();
  }

  function createSaveInstructionPopup() {
    var $anchor = $("#docs-file-menu")
    var anchorOffset = $anchor.offset()
    var anchorDimension = {
      width: $anchor.outerWidth(),
      height: $anchor.outerHeight()
    }
    var $popup = $("<div>")
      .appendTo(document.body)
      .data("message", "You need to use the Read Aloud Google Workspace add-on to read aloud this document.")
      .css({
        position: "absolute",
        left: anchorOffset.left + anchorDimension.width/2 - 300,
        top: anchorOffset.top + anchorDimension.height,
        width: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 999000,
        fontSize: "larger",
      })
    var $arrow = $("<div>")
      .appendTo($popup)
      .css({
        width: 0,
        height: 0,
        borderLeft: ".5em solid transparent",
        borderRight: ".5em solid transparent",
        borderBottom: ".5em solid #333",
      })
    var $text = $("<div>")
      .appendTo($popup)
      .html("The Add-ons menu is available only in Edit mode, you are currently in Read-only mode.<br><br>Please click 'File' - 'Make a copy' to open a copy of this document in Edit mode.")
      .css({
        marginLeft: 10 - Math.min(0, anchorOffset.left + anchorDimension.width/2 - 300),
        backgroundColor: "#333",
        color: "#fff",
        padding: "1em",
        borderRadius: ".5em",
      })
    return $popup.hide();
  }
}




function LegacyReadAloudDoc() {
  var viewport = $(".kix-appview-editor").get(0);
  var pages = $(".kix-page");

  this.getCurrentIndex = function() {
    if (getSelectedText()) return 9999;

    for (var i=0; i<pages.length; i++) if (pages.eq(i).position().top > viewport.scrollTop+$(viewport).height()/2) break;
    return i-1;
  }

  this.getTexts = function(index, quietly) {
    if (index == 9999) return [getSelectedText()];

    var page = pages.get(index);
    if (page) {
      var oldScrollTop = viewport.scrollTop;
      viewport.scrollTop = $(page).position().top;
      return tryGetTexts(getTexts.bind(page), 2000)
        .then(function(result) {
          if (quietly) viewport.scrollTop = oldScrollTop;
          return result;
        })
    }
    else return null;
  }

  function getTexts() {
    return $(".kix-paragraphrenderer", this).get()
      .map(getInnerText)
      .map(removeDumbChars)
      .filter(isNotEmpty)
  }

  function getSelectedText() {
    hack();
    var doc = googleDocsUtil.getGoogleDocument();
    return removeDumbChars(doc.selectedText);
  }

  function removeDumbChars(text) {
    return text && text.replace(/[\n\u200c]+/g, '');
  }

  function hack() {
    var selections = $(".kix-selection-overlay").get();
    var windowHeight = $(window).height();

    //find one selection-overlay inside viewport
    var index = binarySearch(selections, function(el) {
      var viewportOffset = el.getBoundingClientRect();
      if (viewportOffset.top < 120) return 1;
      if (viewportOffset.top >= windowHeight) return -1;
      return 0;
    })

    if (index != -1) {
      var validSelections = [selections[index]];

      //identify the contiguous selection region
      var line = selections[index].parentNode;
      while (true) {
        line = findPreviousLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      line = selections[index].parentNode;
      while (true) {
        line = findNextLine(line);
        if (line && $(line).hasClass("kix-lineview") && $(line.firstElementChild).hasClass("kix-selection-overlay")) validSelections.push(line.firstElementChild);
        else break;
      }

      //remove all other selection-overlays
      if (selections.length != validSelections.length) $(selections).not(validSelections).remove();
    }
    else {
      $(selections).remove();
    }
  }

  function binarySearch(arr, testFn) {
    var m = 0;
    var n = arr.length - 1;
    while (m <= n) {
      var k = (n + m) >> 1;
      var cmp = testFn(arr[k]);
      if (cmp > 0) m = k + 1;
      else if (cmp < 0) n = k - 1;
      else return k;
    }
    return -1;
  }

  function findPreviousLine(line) {
    return line.previousElementSibling ||
      line.parentNode.previousElementSibling && line.parentNode.previousElementSibling.lastElementChild ||
      $(line).closest(".kix-page").prev().find(".kix-page-content-wrapper .kix-lineview").get(-1)
  }

  function findNextLine(line) {
    return line.nextElementSibling ||
      line.parentNode.nextElementSibling && line.parentNode.nextElementSibling.firstElementChild ||
      $(line).closest(".kix-page").next().find(".kix-page-content-wrapper .kix-lineview").get(0)
  }
}




function SvgReadAloudDoc() {
  var currentPageMarker, currentPageNumber

  this.getCurrentIndex = function() {
    currentPageMarker = markPage(getCurrentlyVisiblePage(getPages()))
    return currentPageNumber = 1000
  }

  this.getTexts = async function(nextPageNumber, quietly) {
    var pages = getPages(), head = 0, tail = pages.length-1

    // find index of current page and next page
    const currentIndex = pages.findIndex(currentPageMarker.matches)
    if (currentIndex == -1) return null
    var nextIndex = currentIndex + (nextPageNumber - currentPageNumber)

    // function to remove overlap between pages (in Pageless mode)
    const overlapRemover = nextPageNumber == currentPageNumber +1
      ? makeOverlapRemover(pages[currentIndex])
      : () => true;

    // if the next page is not loaded and is an earlier page
    if (nextIndex < head) {
      pages[head].scrollIntoView(); await waitMillis(500)
      nextIndex -= head
      const headMarker = markPage(pages[head])
      pages = getPages()
      nextIndex += pages.findIndex(headMarker.matches)
      if (outOfBounds(nextIndex, pages)) return null
    }

    // if the next page is not loaded and is a later page
    if (nextIndex > tail) {
      pages[tail].scrollIntoView(false); await waitMillis(500)
      nextIndex -= tail
      const tailMarker = markPage(pages[tail])
      pages = getPages()
      nextIndex += pages.findIndex(tailMarker.matches)
      if (outOfBounds(nextIndex, pages)) return null
    }

    // set next page as current
    const currentPage = pages[nextIndex]
    currentPageMarker = markPage(currentPage)
    currentPageNumber = nextPageNumber

    // scroll into view and return text
    if (!quietly) currentPage.scrollIntoView()
    return $("svg > g[role=paragraph]", currentPage).get()
      .flatMap(para => {
        return $(para).children("rect").get()
          .map(el => el.getAttribute("aria-label"))
          .filter(overlapRemover)
          .filter(makeDeduper())
          .join(" ") || []
      })
  }

  this.getSelectedText = function() {
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    const page = getCurrentlyVisiblePage(getPages())
    const selectionRects = $(".kix-canvas-tile-selection > svg > rect", page).get()
      .map(el => el.getBoundingClientRect())
    return $("svg > g[role=paragraph] > rect", page).get()
      .map(el => ({el: el, rect: el.getBoundingClientRect()}))
      .filter(item => selectionRects.some(rect => overlaps(item.rect, rect)))
      .map(item => item.el.getAttribute("aria-label"))
      .filter(makeDeduper())
      .join(" ")
  }

  function getDocContainer() {
    if($(".kix-page-paginated").length) {
      console.log("Paginated google doc detected.");
      return $(".kix-page-paginated").get();
    } else if($(".kix-rotatingtilemanager-content").length) {
      console.log("Pageless google doc detected.");
      return $(".kix-rotatingtilemanager-content").children().get();
    } else {
      console.log("Could not detect paginated or pageless google doc.");
    }
  }

  function getPages() {
      return getDocContainer()
      .map(page => ({page: page, top: page.getBoundingClientRect().top}))
      .sort((a,b) => a.top-b.top)
      .map(item => item.page)
  }

  function getCurrentlyVisiblePage(pages) {
    const halfHeight = $(window).height() / 2
    for (var i=pages.length-1; i>=0; i--) if (pages[i].getBoundingClientRect().top < halfHeight) return pages[i]
    throw new Error("Can't get the currently visible page")
  }

  function markPage(page) {
    const top = page.style.top
    return {
      matches: x => x.style.top == top
    }
  }

  function outOfBounds(index, arr) {
    return index < 0 || index >= arr.length
  }

  function makeDeduper() {
    let prev
    return function(text) {
      if (text == prev) return false
      prev = text
      return true
    }
  }

  function makeOverlapRemover(prevPage) {
    const prevPageTexts = Array.from(prevPage.querySelectorAll("svg > g[role=paragraph] > rect"))
      .map(rect => rect.getAttribute("aria-label"))
    var indexOfLastMatch = null
    return function(text) {
      if (indexOfLastMatch == null) {
        //find index of the start of the overlapping section
        indexOfLastMatch = prevPageTexts.lastIndexOf(text)
        if (indexOfLastMatch != -1) console.debug("Overlap detected", prevPageTexts.length-indexOfLastMatch)
      }
      else if (indexOfLastMatch > 0) {
        //if subsequent lines match, keep incrementing index
        if (prevPageTexts[indexOfLastMatch +1] == text) indexOfLastMatch += 1
        else indexOfLastMatch = -1
      }
      //return false to filter out matches
      return indexOfLastMatch > 0 ? false : true
    }
  }
}
