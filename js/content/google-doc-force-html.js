
var brapi = (typeof chrome != 'undefined') ? chrome : (typeof browser != 'undefined' ? browser : {});

(function() {
    var link = document.createElement('link');
    link.id = "_docs_force_html_by_ext";
    document.documentElement.appendChild(link);

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = brapi.runtime.getURL('js/page/google-doc-force-html.js');
    document.documentElement.appendChild(script);
})()
