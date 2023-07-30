
var contentHandlers = [
  // Unsupported Sites --------------------------------------------------------
  {
    match: function(url) {
      return config.unsupportedSites.some(function(site) {
        return (typeof site == "string" && url.startsWith(site)) || (site instanceof RegExp && site.test(url));
      })
    },
    validate: function() {
      throw new Error(JSON.stringify({code: "error_page_unreadable"}));
    }
  },

  // PDF file:// --------------------------------------------------------------
  {
    match: function(url) {
      return /^file:.*\.pdf$/i.test(url.split("?")[0]);
    },
    validate: async function(tab) {
      await setTabUrl(tab.id, config.pdfViewerUrl)
      throw new Error(JSON.stringify({code: "error_upload_pdf"}))
    }
  },

  // file:// ------------------------------------------------------------------
  {
    match: function(url) {
      return /^file:/.test(url);
    },
    validate: function() {
      return new Promise(function(fulfill) {
        brapi.extension.isAllowedFileSchemeAccess(fulfill);
      })
      .then(function(allowed) {
        if (!allowed) throw new Error(JSON.stringify({code: "error_file_access"}));
      })
    }
  },

  // Google Docs ---------------------------------------------------------------
  {
    match: function(url) {
      return url.startsWith("https://docs.google.com/document/d/")
    },
    validate: function() {
      if (this.alreadyAsked) return
      else this.alreadyAsked = true
      const perms = {
        origins: ["https://docs.google.com/document/d/"]
      }
      return brapi.permissions.contains(perms)
        .then(has => {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms, reload: true}))
        })
    },
  },

  // Google Play Books ---------------------------------------------------------
  {
    match: function(url) {
      return /^https:\/\/play.google.com\/books\/reader/.test(url) || /^https:\/\/books.google.com\/ebooks\/app#reader/.test(url);
    },
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: ["https://books.googleusercontent.com/"]
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
        })
    },
    getFrameId: function(frames) {
      var frame = frames.find(function(frame) {
        return frame.url.startsWith("https://books.googleusercontent.com/");
      })
      return frame && frame.frameId;
    },
    extraScripts: ["js/content/google-play-book.js"]
  },

  // OneDrive Doc -----------------------------------------------------------
  {
    match: function(url, title) {
      return url.startsWith("https://onedrive.live.com/edit.aspx") && title.includes(".docx")
        || /^https:\/\/[^/]+\.sharepoint\.com\//.test(url)
        || url.startsWith("https://www.dropbox.com/") && url.split("?")[0].endsWith(".docx")
    },
    targetOrigins: [
      "https://word-edit.officeapps.live.com/",
      "https://usc-word-edit.officeapps.live.com/",
    ],
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: this.targetOrigins
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
        })
    },
    getFrameId: function(frames) {
      const frame = frames.find(frame => this.targetOrigins.some(origin => frame.url.startsWith(origin)))
      return frame && frame.frameId;
    },
    extraScripts: ["js/content/onedrive-doc.js"]
  },

  // Chegg NEW --------------------------------------------------------------
  {
    match: function(url) {
      return /^https:\/\/www\.chegg\.com\/reader\//.test(url);
    },
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: ["https://ereader-web-viewer.chegg.com/"]
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
        })
    },
    getFrameId: function(frames) {
      var frame = frames.find(function(frame) {
        return frame.url.startsWith("https://ereader-web-viewer.chegg.com/");
      })
      return frame && frame.frameId;
    },
    extraScripts: ["js/content/chegg-book.js"]
  },

  // VitalSource/Chegg ---------------------------------------------------------
  {
    match: function(url) {
      return /^https:\/\/\w+\.vitalsource\.com\/(#|reader)\/books\//.test(url) ||
        /^https:\/\/\w+\.chegg\.com\/(#|reader)\/books\//.test(url)
    },
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: ["https://jigsaw.vitalsource.com/", "https://jigsaw.chegg.com/"]
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}));
        })
    },
    getFrameId: function(frames) {
      const frame = frames.find(frame => {
        const url = new URL(frame.url)
        return url.hostname.startsWith("jigsaw.") && url.pathname.startsWith("/books/")
      })
      return frame && frame.frameId
    },
    extraScripts: ["js/content/vitalsource-book.js"]
  },

  // Liberty University ---------------------------------------------------------
  {
    match: function(url) {
      return url.startsWith("https://luoa.instructure.com/courses/")
    },
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: ["https://luoa-content.s3.amazonaws.com/"]
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}))
        })
    },
    getFrameId: function(frames) {
      var frame = frames.find(function(frame) {
        return frame.url && frame.url.startsWith("https://luoa-content.s3.amazonaws.com/")
      })
      return frame && frame.frameId
    }
  },

  // EPUBReader ---------------------------------------------------------------
  {
    match: function(url) {
      return /^chrome-extension:\/\/jhhclmfgfllimlhabjkgkeebkbiadflb\/reader.html/.test(url);
    },
    getSourceUri: function() {
      return "epubreader:jhhclmfgfllimlhabjkgkeebkbiadflb"
    }
  },

  // Read Aloud PDF viewer ---------------------------------------------------
  {
    match: url => url.startsWith(brapi.runtime.getURL("pdf-viewer.html")),
    getSourceUri: () => "pdfviewer:",
  },

  // Adobe Acrobat extension -------------------------------------------------
  {
    match: url => url.startsWith("chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj/"),
    async validate(tab) {
      const pdfUrl = tab.url.substr(52)
      if (pdfUrl.startsWith("file://")) {
        await setTabUrl(tab.id, config.pdfViewerUrl)
        throw new Error(JSON.stringify({code: "error_upload_pdf"}))
      }
      else {
        await openPdfViewer(tab.id, pdfUrl)
      }
    },
    getSourceUri: () => "pdfviewer:",
  },

  // Kami extension -----------------------------------------------------------
  {
    match: url => url.startsWith("https://web.kamihq.com/web/viewer.html?source=extension_pdfhandler&"),
    validate: tab => openPdfViewer(tab.id, new URL(tab.url).searchParams.get("file")),
    getSourceUri: () => "pdfviewer:",
  },

  // LibbyApp ---------------------------------------------------------------
  {
    match: function(url) {
      return url.startsWith("https://libbyapp.com/open/")
    },
    validate: function() {
      var perms = {
        permissions: ["webNavigation"],
        origins: ["https://*.read.libbyapp.com/"]
      }
      return hasPermissions(perms)
        .then(function(has) {
          if (!has) throw new Error(JSON.stringify({code: "error_add_permissions", perms: perms}))
        })
    },
    getFrameId: function(frames) {
      var frame = frames.find(function(frame) {
        return frame.url && new URL(frame.url).hostname.endsWith(".read.libbyapp.com")
      })
      return frame && frame.frameId
    },
    extraScripts: ["js/content/libbyapp.js"]
  },

  // default -------------------------------------------------------------------
  {
    match: function() {
      return true;
    }
  }
]
