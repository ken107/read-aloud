// Reader mode: an in-page overlay that shows the text being read, styled like
// an article, with highlighting and a floating control bar. Runs as a content
// script in the top frame; the page DOM is left untouched underneath.
var readAloudReader = readAloudReader || immediate(() => {
  const HOST_TAG = "read-aloud-reader"
  const ICONS = {
    rewind: "M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z",
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    stop: "M6 6h12v12H6z",
    forward: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z",
    settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    expand: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  }
  const FONT_SUBSETS = {
    "latin-ext": /[Ā-ʺḀ-ẟ]/,
    "vietnamese": /[ĂăĐđĨĩŨũƠơƯưẠ-ỹ]/,
  }
  const message = (key, value) => brapi.i18n.getMessage(key, value)

  let host, root, els
  let tabId, favIconUrl, articleInfo
  let mode = "closed"   //expanded | minimized | closed
  let savedOverflow
  let pollTimer
  let current = {state: "STOPPED", isSource: false, texts: null, position: null}
  let chunkParts = []
  let lastUserScroll = 0
  const loadedFontSubsets = new Set()
  const playbackEstimate = createPlaybackEstimate()

  registerMessageListener("readerOverlay", {
    show,
    getState: () => mode,
    showError,
  })


  async function show(opts) {
    tabId = opts.tabId
    if (opts.favIconUrl) favIconUrl = opts.favIconUrl
    if (!host) await create()
    if (!host.isConnected) document.documentElement.appendChild(host)
    showHost()
    setMode("expanded")
    renderHeader()
    els.scroller.focus({preventScroll: true})
    startPolling()
    loadFonts(["latin"])
  }

  async function create() {
    host = document.createElement(HOST_TAG)
    const hostStyles = {
      "position": "fixed",
      "inset": "0",
      "width": "100%",
      "height": "100%",
      "max-width": "none",
      "max-height": "none",
      "margin": "0",
      "padding": "0",
      "border": "0",
      "background": "transparent",
      "overflow": "visible",
      "display": "block",
      "z-index": "2147483647",
      "color-scheme": "normal",
    }
    for (const [name, value] of Object.entries(hostStyles)) host.style.setProperty(name, value, "important")
    const shadow = host.attachShadow({mode: "closed"})
    shadow.innerHTML = `
      <div class="ra-root" part="root">
        <div class="ra-scroller" tabindex="-1">
          <article class="ra-page">
            <div class="ra-column">
              <header>
                <div class="ra-site"><img alt="" referrerpolicy="no-referrer"><span class="ra-site-name"></span></div>
                <h1 class="ra-title"></h1>
                <div class="ra-byline"></div>
              </header>
              <div class="ra-body"></div>
            </div>
          </article>
        </div>
        <div class="ra-error" role="alert" hidden></div>
        <div class="ra-menu" hidden></div>
        <div class="ra-bar" role="toolbar">
          ${button("rewind", "reader_rewind")}
          <span class="ra-loading" hidden></span>
          ${button("play", "reader_play", "ra-primary")}
          ${button("pause", "reader_pause", "ra-primary")}
          ${button("stop", "reader_stop")}
          ${button("forward", "reader_forward")}
          <span class="ra-status"></span>
          <span class="ra-sep"></span>
          <button type="button" class="ra-text-button" data-action="display" title="${escapeHtml(message("reader_display_settings"))}" aria-label="${escapeHtml(message("reader_display_settings"))}">Aa</button>
          ${button("settings", "reader_settings")}
          ${button("expand", "reader_expand")}
          ${button("close", "reader_close")}
        </div>
      </div>`
    applyStyles(shadow)
    const $ = selector => shadow.querySelector(selector)
    els = {
      root: $(".ra-root"),
      scroller: $(".ra-scroller"),
      favicon: $(".ra-site img"),
      siteName: $(".ra-site-name"),
      title: $(".ra-title"),
      byline: $(".ra-byline"),
      body: $(".ra-body"),
      error: $(".ra-error"),
      menu: $(".ra-menu"),
      loading: $(".ra-loading"),
      status: $(".ra-status"),
      buttons: Object.fromEntries(Array.from(shadow.querySelectorAll(".ra-bar button")).map(b => [b.dataset.action, b])),
    }
    root = els.root
    els.favicon.addEventListener("error", () => els.favicon.hidden = true)
    shadow.querySelector(".ra-bar").addEventListener("click", event => {
      const target = event.target.closest("button")
      if (target) onAction(target.dataset.action)
    })
    els.error.addEventListener("click", event => {
      if (event.target.closest("a")) {
        event.preventDefault()
        bgPageInvoke("openPopupWindow", [tabId]).catch(console.error)
      }
    })
    for (const type of ["wheel", "touchmove"]) els.scroller.addEventListener(type, () => lastUserScroll = Date.now(), {passive: true})
    //keep page shortcuts and scroll handlers from reacting to events inside the overlay
    for (const type of ["keydown", "keyup", "keypress", "wheel"]) {
      host.addEventListener(type, event => {
        if (mode == "expanded") event.stopPropagation()
      })
    }
    host.addEventListener("keydown", event => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) lastUserScroll = Date.now()
    })
    window.addEventListener("keydown", event => {
      if (event.key == "Escape" && mode != "closed" && !els.menu.hidden) {
        els.menu.hidden = true
        event.stopPropagation()
      }
      else if (event.key == "Escape" && mode == "expanded") {
        event.stopPropagation()
        event.preventDefault()
        close()
      }
    }, true)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && mode != "closed") update()
    })
    //single-page apps sometimes replace the document content; put the overlay back
    new MutationObserver(() => {
      if (mode != "closed" && !host.isConnected) {
        document.documentElement.appendChild(host)
        showHost()
      }
    }).observe(document.documentElement, {childList: true})

    buildMenu()
    await applyDisplaySettings()
    settingsChange$.subscribe(changes => {
      if (changes.readerTheme || changes.readerTextSize || changes.readerTypography || changes.darkMode) applyDisplaySettings()
    })
  }

  function button(action, labelKey, className) {
    const label = escapeHtml(message(labelKey))
    return `<button type="button" data-action="${action}" class="${className || ""}" title="${label}" aria-label="${label}">`
      + `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[action]}"/></svg></button>`
  }

  function applyStyles(shadow) {
    try {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(readAloudReaderCss)
      shadow.adoptedStyleSheets = [sheet]
    }
    catch (err) {
      console.warn("Falling back to style element", err)
      const style = document.createElement("style")
      style.textContent = readAloudReaderCss
      shadow.appendChild(style)
    }
  }

  function showHost() {
    try {
      if (!host.popover) host.popover = "manual"
      if (!host.matches(":popover-open")) host.showPopover()
    }
    catch (err) {
      //no popover support; the fixed position and z-index still apply
    }
  }


  /**
   * Modes
   */
  function setMode(newMode) {
    mode = newMode
    root.classList.toggle("minimized", mode == "minimized")
    host.style.setProperty("pointer-events", mode == "expanded" ? "auto" : "none", "important")
    if (mode == "expanded") {
      if (savedOverflow == null) {
        savedOverflow = document.documentElement.style.getPropertyValue("overflow")
        document.documentElement.style.setProperty("overflow", "hidden", "important")
      }
    }
    else if (savedOverflow != null) {
      document.documentElement.style.removeProperty("overflow")
      if (savedOverflow) document.documentElement.style.setProperty("overflow", savedOverflow)
      savedOverflow = null
    }
    if (mode == "closed") {
      stopPolling()
      els.menu.hidden = true
      try { host.hidePopover() } catch (err) {}
      host.remove()
    }
    updateButtons()
  }

  function isActive() {
    return current.isSource && ["PLAYING", "PAUSED", "LOADING"].includes(current.state)
  }

  function close() {
    if (isActive()) setMode("minimized")
    else setMode("closed")
  }


  /**
   * Playback state
   */
  function startPolling() {
    if (!pollTimer) pollTimer = setInterval(() => {
      if (!document.hidden) update()
    }, 500)
    update()
  }

  function stopPolling() {
    clearInterval(pollTimer)
    pollTimer = null
  }

  async function update() {
    let stateInfo, playingTabId
    try {
      [stateInfo, {playingTabId}] = await Promise.all([
        bgPageInvoke("getPlaybackState"),
        brapi.storage.local.get(["playingTabId"]),
      ])
    }
    catch (err) {
      console.error(err)
      return
    }
    const isSource = playingTabId == tabId
    const state = isSource ? stateInfo.state : "STOPPED"
    const speech = isSource ? stateInfo.speechInfo : null
    if (isSource && stateInfo.playbackError) showError(stateInfo.playbackError)
    current.state = state
    current.isSource = isSource
    root.classList.toggle("is-source", isActive())
    if (speech && speech.texts && speech.texts.length) {
      if (!current.texts || current.texts.length != speech.texts.length || current.texts.some((text, i) => text != speech.texts[i])) {
        current.texts = speech.texts
        current.position = null
        renderBody(speech)
        loadFonts(Object.keys(FONT_SUBSETS).filter(subset => speech.texts.some(text => FONT_SUBSETS[subset].test(text))))
      }
      if (!current.position || positionDiffers(current.position, speech.position)) {
        current.position = speech.position
        updateHighlighting()
      }
    }
    else if (!current.texts) {
      renderPlaceholder(state == "LOADING")
    }
    if (!isActive() && current.position) {
      current.position = null
      clearHighlighting()
    }
    updateStatus(state, speech)
    updateButtons()
  }

  function updateButtons() {
    if (!els) return
    const {state} = current
    const active = isActive()
    const b = els.buttons
    els.loading.hidden = !(active && state == "LOADING")
    b.play.hidden = active && state != "PAUSED"
    b.pause.hidden = !(active && state == "PLAYING")
    b.stop.hidden = !active
    b.forward.hidden = b.rewind.hidden = !(active && (state == "PLAYING" || state == "PAUSED"))
    b.expand.hidden = mode != "minimized"
    b.close.hidden = mode == "minimized" && active
  }

  function updateStatus(state, speech) {
    const estimate = playbackEstimate.update(state, speech, performance.now())
    let text = ""
    if (isActive()) {
      const uiLanguage = brapi.i18n.getUILanguage()
      const voice = speech && speech.voiceName || message("playback_status_preparing_voice")
      let progress = estimate ? new Intl.NumberFormat(uiLanguage, {style: "percent"}).format(estimate.percent / 100) : ""
      if (estimate && estimate.seconds != null) {
        progress = estimate.seconds < 60 ? message("playback_status_less_than_minute")
          : message("playback_status_minutes_left", new Intl.NumberFormat(uiLanguage).format(Math.ceil(estimate.seconds / 60)))
      }
      if (state == "LOADING") progress = speech && speech.engine ? message("playback_status_loading_engine", speech.engine) : message("playback_status_loading")
      else if (state == "PAUSED") progress = message("playback_status_paused") + (progress ? ` · ${progress}` : "")
      text = state == "LOADING" ? progress : [voice, progress].filter(Boolean).join(" · ")
    }
    if (els.status.textContent != text) els.status.textContent = text
  }


  /**
   * Controls
   */
  async function onAction(action) {
    try {
      switch (action) {
        case "play":
          hideError()
          if (current.isSource && current.state == "PAUSED") await bgPageInvoke("resume")
          else await bgPageInvoke("playTab", [tabId])
          break
        case "pause": await bgPageInvoke("pause"); break
        case "stop": await bgPageInvoke("stop"); break
        case "forward": await bgPageInvoke("forward"); break
        case "rewind": await bgPageInvoke("rewind"); break
        case "settings": await bgPageInvoke("openOptionsPage"); break
        case "display": els.menu.hidden = !els.menu.hidden; break
        case "expand": setMode("expanded"); els.scroller.focus({preventScroll: true}); break
        case "close": close(); break
      }
    }
    catch (err) {
      showError(err)
    }
    if (mode != "closed") update()
  }

  function seek(index) {
    if (isActive()) bgPageInvoke("seek", [index]).catch(showError)
  }

  function showError(err) {
    if (!err || err.name == "CancellationException") return
    if (/^{/.test(err.message)) {
      const errInfo = JSON.parse(err.message)
      els.error.innerHTML = formatError(errInfo)
    }
    else {
      els.error.textContent = err.message || String(err)
    }
    els.error.hidden = false
  }

  function hideError() {
    els.error.hidden = true
  }


  /**
   * Display settings
   */
  async function applyDisplaySettings() {
    const settings = await getSettings(["readerTheme", "readerTextSize", "readerTypography", "darkMode"])
    const theme = settings.readerTheme
      || (settings.darkMode === true || settings.darkMode == null && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    const size = settings.readerTextSize || "medium"
    const typography = settings.readerTypography || "serif"
    root.className = root.className.replace(/\b(theme|size|type)-\w+/g, "").trim()
    root.classList.add("theme-" + theme, "size-" + size, "type-" + typography)
    if (els.menu) {
      for (const btn of els.menu.querySelectorAll("button")) {
        const selected = {readerTheme: theme, readerTextSize: size, readerTypography: typography}[btn.dataset.setting] == btn.dataset.value
        btn.classList.toggle("selected", selected)
        btn.setAttribute("aria-pressed", String(selected))
      }
    }
  }

  function buildMenu() {
    const groups = [
      ["reader_text_size", "readerTextSize", [["small", "reader_size_small"], ["medium", "reader_size_medium"], ["large", "reader_size_large"]]],
      ["reader_typography", "readerTypography", [["serif", "reader_serif"], ["sans", "reader_sans"]]],
      ["reader_theme", "readerTheme", [["light", "reader_theme_light"], ["dark", "reader_theme_dark"]]],
    ]
    els.menu.innerHTML = groups.map(([labelKey, setting, options]) =>
      `<span>${escapeHtml(message(labelKey))}</span><div class="ra-group">`
      + options.map(([value, key]) => `<button type="button" data-setting="${setting}" data-value="${value}">${escapeHtml(message(key))}</button>`).join("")
      + `</div>`
    ).join("")
    els.menu.addEventListener("click", event => {
      const btn = event.target.closest("button")
      if (btn) updateSettings({[btn.dataset.setting]: btn.dataset.value})
    })
  }


  /**
   * Fonts are fetched and cached by the extension, then registered on the
   * document from bytes so the page's font-src policy doesn't apply.
   */
  async function loadFonts(subsets) {
    subsets = subsets.filter(subset => !loadedFontSubsets.has(subset))
    if (!subsets.length) return
    subsets.forEach(subset => loadedFontSubsets.add(subset))
    try {
      const fonts = await bgPageInvoke("getReaderFonts", [subsets])
      for (const font of fonts) {
        const face = new FontFace(font.family, base64ToBytes(font.data), {
          style: font.style,
          weight: font.weight,
          unicodeRange: font.unicodeRange,
        })
        document.fonts.add(await face.load())
      }
    }
    catch (err) {
      console.warn("Reader fonts unavailable, using system fonts", err)
    }
  }

  function base64ToBytes(data) {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }


  /**
   * Article header
   */
  function renderHeader() {
    articleInfo = getArticleInfo()
    els.favicon.hidden = !articleInfo.favicon
    if (articleInfo.favicon) els.favicon.src = articleInfo.favicon
    els.siteName.textContent = articleInfo.siteName
    if (!els.title.querySelector(".ra-chunk")) els.title.textContent = articleInfo.title
    els.byline.textContent = ""
    const parts = []
    if (articleInfo.author) parts.push(message("reader_by", articleInfo.author))
    if (articleInfo.date) parts.push(articleInfo.date)
    parts.forEach((part, i) => {
      if (i) els.byline.appendChild(Object.assign(document.createElement("span"), {className: "ra-divider", textContent: "|"}))
      els.byline.appendChild(document.createTextNode(part))
    })
    els.byline.hidden = !parts.length && !articleInfo.title
    root.setAttribute("dir", articleInfo.dir)
  }

  function getArticleInfo() {
    const meta = name => {
      const elem = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      return elem && elem.content && elem.content.trim() || null
    }
    const text = elem => elem ? elem.textContent.replace(/\s+/g, " ").trim() : null
    const ld = getJsonLdArticle()
    const siteName = meta("og:site_name") || ld && ld.publisher && ld.publisher.name || location.hostname.replace(/^www\./, "")
    const h1 = text(document.querySelector("article h1")) || text(document.querySelector("h1"))
    const title = stripSiteName(meta("og:title") || ld && ld.headline || h1 || document.title || "", siteName)

    let author = ld && personNames(ld.author)
      || meta("author") || meta("dc.creator") || meta("byl")
      || text(document.querySelector("a[rel=author], [itemprop=author] [itemprop=name], .byline .author, .byline"))
    if (author) author = author.replace(/^by\s+/i, "")
    if (!author || author.length > 80 || /^https?:/.test(author)) author = null

    const rawDate = meta("article:published_time") || ld && ld.datePublished
      || (document.querySelector("article time[datetime], time[datetime]") || {}).dateTime
    let date = null
    if (rawDate) {
      const parsed = new Date(rawDate)
      if (!isNaN(parsed)) date = new Intl.DateTimeFormat(brapi.i18n.getUILanguage(), {dateStyle: "medium"}).format(parsed)
    }

    let favicon = favIconUrl
    if (!favicon) {
      const link = document.querySelector("link[rel~=icon][href]")
      favicon = link ? link.href : location.origin + "/favicon.ico"
    }
    if (!/^(https?|data):/.test(favicon)) favicon = null

    const dir = document.documentElement.dir || document.body && getComputedStyle(document.body).direction || "ltr"
    return {title, h1, siteName, author, date, favicon, dir: dir == "rtl" ? "rtl" : "ltr"}
  }

  function getJsonLdArticle() {
    const isArticle = item => item && /Article|BlogPosting|Report|WebPage/.test([].concat(item["@type"]).join(" "))
    for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
      try {
        const queue = [JSON.parse(script.textContent)]
        while (queue.length) {
          const item = queue.shift()
          if (Array.isArray(item)) queue.push(...item)
          else if (item && item["@graph"]) queue.push(...[].concat(item["@graph"]))
          else if (isArticle(item) && (item.headline || item.author)) return item
        }
      }
      catch (err) {
      }
    }
    return null
  }

  function personNames(value) {
    const names = [].concat(value || []).map(person => typeof person == "string" ? person : person && person.name).filter(Boolean)
    return names.length ? names.join(", ") : null
  }

  function stripSiteName(title, siteName) {
    title = title.replace(/\s+/g, " ").trim()
    const parts = title.split(/\s+[|\-–—:·»]\s+/)
    if (parts.length > 1) {
      const site = normalize(siteName)
      const last = normalize(parts[parts.length - 1])
      const first = normalize(parts[0])
      if (last && (last == site || site.includes(last) || last.includes(site))) return title.slice(0, title.lastIndexOf(parts[parts.length - 1])).replace(/\s+[|\-–—:·»]\s*$/, "")
      if (first && (first == site || site.includes(first))) return title.slice(parts[0].length).replace(/^\s*[|\-–—:·»]\s+/, "")
    }
    return title
  }

  function normalize(text) {
    return (text || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
  }


  /**
   * Article body: chunks rendered as paragraphs, highlighted like the popup
   */
  function renderPlaceholder(loading) {
    els.body.textContent = ""
    if (loading) els.body.appendChild(Object.assign(document.createElement("p"), {className: "ra-placeholder", textContent: message("playback_status_loading")}))
  }

  function renderBody(speech) {
    const texts = speech.texts
    els.body.textContent = ""
    els.body.style.direction = speech.isRTL ? "rtl" : ""
    if (els.title.querySelector(".ra-chunk")) els.title.textContent = articleInfo.title
    chunkParts = texts.map(() => [])
    let paragraph = newParagraph()
    let isFirstParagraph = true
    texts.forEach((text, index) => {
      const pieces = text.split(/((?:\r?\n\s*){2,})/)
      let offset = 0
      pieces.forEach((piece, k) => {
        const length = piece.length
        if (k % 2) {
          if (paragraph.childNodes.length) paragraph = newParagraph()
          isFirstParagraph = false
        }
        else if (piece) {
          const span = document.createElement("span")
          span.className = "ra-chunk"
          span.addEventListener("click", () => seek(index))
          //the page's heading is usually the first thing read; show it as the title
          if (isFirstParagraph && index == 0 && k == 0 && pieces.length > 1 && isTitle(piece)) {
            //drop the period Speech adds to headings
            if (/\.$/.test(piece) && !/\.$/.test(articleInfo.title)) piece = piece.slice(0, -1)
            els.title.textContent = ""
            els.title.appendChild(span)
          }
          else {
            paragraph.appendChild(span)
          }
          setSpanText(span, piece)
          chunkParts[index].push({span, start: offset, text: piece})
        }
        offset += length
      })
    })
    if (!paragraph.childNodes.length) paragraph.remove()
  }

  function isTitle(text) {
    const value = normalize(text)
    return value && [articleInfo.title, articleInfo.h1].some(title => normalize(title) == value)
  }

  function newParagraph() {
    return els.body.appendChild(document.createElement("p"))
  }

  function setSpanText(span, text) {
    span.textContent = ""
    text.split(/\r?\n/).forEach((line, i) => {
      if (i) span.appendChild(document.createElement("br"))
      span.appendChild(document.createTextNode(line))
    })
  }

  function clearHighlighting() {
    for (const parts of chunkParts) {
      for (const part of parts) {
        if (part.marked) {
          setSpanText(part.span, part.text)
          part.marked = false
        }
        part.span.classList.remove("active")
      }
    }
  }

  function updateHighlighting() {
    clearHighlighting()
    const pos = current.position
    const parts = chunkParts[pos.index]
    if (!parts || !parts.length) return
    parts.forEach(part => part.span.classList.add("active"))
    const section = pos.word || pos.sentence
    let target = parts[0].span
    if (section && section.endIndex > section.startIndex) {
      for (const part of parts) {
        const start = Math.max(section.startIndex, part.start) - part.start
        const end = Math.min(section.endIndex, part.start + part.text.length) - part.start
        if (end <= start) continue
        part.span.textContent = ""
        const mark = document.createElement("mark")
        appendText(part.span, part.text.slice(0, start))
        appendText(mark, part.text.slice(start, end))
        part.span.appendChild(mark)
        appendText(part.span, part.text.slice(end))
        part.marked = true
        if (target == parts[0].span) target = mark
      }
    }
    scrollToTarget(target)
  }

  function appendText(parent, text) {
    const temp = document.createElement("span")
    setSpanText(temp, text)
    parent.append(...temp.childNodes)
  }

  function scrollToTarget(target) {
    if (mode != "expanded" || Date.now() - lastUserScroll < 4000) return
    const scroller = els.scroller
    const rect = target.getBoundingClientRect()
    const height = scroller.clientHeight
    if (rect.top < height * 0.15 || rect.bottom > height * 0.7) {
      scroller.scrollTo({top: scroller.scrollTop + rect.top - height * 0.3, behavior: "smooth"})
    }
  }

  function positionDiffers(left, right) {
    function rangeDiffers(a, b) {
      if (a == null && b == null) return false
      if (a != null && b != null) return a.startIndex != b.startIndex || a.endIndex != b.endIndex
      return true
    }
    return left.index != right.index ||
      rangeDiffers(left.paragraph, right.paragraph) ||
      rangeDiffers(left.sentence, right.sentence) ||
      rangeDiffers(left.word, right.word)
  }

  return {show}
})
