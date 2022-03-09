
if (!location.href.includes("mode=html")) {
    if (location.href.includes("?")) location.href = location.href.replace("?", "?mode=html&");
    else if (location.href.includes("#")) location.href = location.href.replace("#", "?mode=html#");
    else location.href += "?mode=html";
}

if (!window._docs_force_html_by_ext) window._docs_force_html_by_ext = true
forceHtmlRenderingMode(100)

function forceHtmlRenderingMode(n) {
    if (window._docs_flag_initialData) window._docs_flag_initialData['kix-awcp'] = true;
    else if (n > 0) setTimeout(forceHtmlRenderingMode.bind(null, n-1), 0);
    else console.warn("Could not set kix-awcp flag");
}
