
var config = {
    serviceUrl: "https://support.readaloud.app"
};

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

function repeat(action, opt) {
    if (!opt) opt = {};
    return iter(0);

    function iter(n) {
        return Promise.resolve()
            .then(action)
            .then(function(result) {
                if (opt.until && opt.until(result)) return result;
                if (opt.max && n+1 >= opt.max) return result;
                if (!opt.delay) return iter(n+1);
                return new Promise(function(f) {setTimeout(f, opt.delay)}).then(iter.bind(null, n+1));
            })
    }
}

function StateMachine(states) {
    if (!states.IDLE) throw new Error("Missing IDLE state");
    var currentStateName = "IDLE";
    var lock = 0;
    this.trigger = function(eventName) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (lock) throw new Error("Cannot trigger an event while inside an event handler");
        lock++;
        try {
            var currentState = states[currentStateName];
            if (currentState[eventName]) {
                var nextStateName = (typeof currentState[eventName] == "string") ? currentState[eventName] : currentState[eventName].apply(currentState, args);
                if (nextStateName) {
                    if (typeof nextStateName == "string") {
                        if (states[nextStateName]) {
                            currentStateName = nextStateName;
                            if (states[currentStateName].onTransitionIn) states[currentStateName].onTransitionIn();
                        }
                        else throw new Error("Unknown next-state " + nextStateName);
                    }
                    else throw new Error("Event handler must return next-state's name or null to stay in same state");
                }
            }
            else throw new Error("No handler '" + eventName + "' in state " + currentStateName);
        }
        finally {
            lock--;
        }
    }
    this.getState = function() {
        return currentStateName;
    }
}

if (!Promise.prototype.finally) {
    Object.defineProperty(Promise.prototype, 'finally', {
        value: function(callback) {
            var promise = this;
            function chain() {
                return Promise.resolve(callback()).then(function() {return promise});
            }
            return promise.then(chain, chain);
        },
        configurable: true,
        writable: true
    })
}
