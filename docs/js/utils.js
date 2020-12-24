
queryString = {};
if (location.search)
    location.search.substr(1).split('&').forEach(function(token) {
        var pair = token.split('=');
        queryString[decodeURIComponent(pair[0])] = pair.length > 1 ? decodeURIComponent(pair[1]) : true;
    })

function validateReturnUrl(url) {
    return /^https:\/\/\w+\.extensions\.allizom\.org\/$/.test(url)
        || /^https:\/\/\w+\.chromiumapp\.org\/$/.test(url)
}

function ajaxGet(url) {
    return new Promise(function(fulfill, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status == 200) fulfill(xhr.response);
                else reject(new Error("Failed to fetch " + url.substr(0, 100)));
            }
        };
        xhr.send(null);
    })
}

function getCookie(name) {
    if (document.cookie.length > 0) {
        var start = document.cookie.indexOf(name + "=");
        if (start != -1) {
            start += name.length + 1;
            var end = document.cookie.indexOf(";", start);
            if (end == -1) {
                end = document.cookie.length;
            }
            return unescape(document.cookie.substring(start, end));
        }
    }
    return "";
}

function setCookie(name, value, expiredays) {
    var cookie;
    if (expiredays == null) {
        cookie = name + "=" + escape(value) + "; path=/";
    }
    else {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + expiredays);
        cookie = name + "=" + escape(value) + "; path=/" + "; expires=" + exdate.toGMTString();
    }
    document.cookie = cookie;
    if (getCookie(name) != value) document.cookie = cookie + "; SameSite=None; Secure";
}
