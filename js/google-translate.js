
(function() {
    var got = {
        get: function(url) {
            return ajaxGet(url).then(function(x) {return {body: x}});
        },
        post: function(url, opts) {
            return ajaxPost(url + "?" + urlEncode(opts.searchParams), opts.form).then(function(x) {return {body: x}});
        }
    };

    var config = {
        get: function(key) {
            return getSettings([key]).then(function(settings) {return settings[key]});
        },
        set: function(key, value) {
            var settings = {};
            settings[key] = value;
            return updateSettings(settings);
        }
    };

    var batchNumber = 0;


    /**
     * @param {string} rpcId                    ID of service to call
     * @param {Array} payload                   Arguments for the service call
     * @param {string} [opts.tld="com"]         translate.google.[tld]
     * @param {number} [opts.tokensTTL=3600]    How long to cache tokens
     */
    function batchExecute(rpcId, payload, opts) {
        if (!opts) opts = {};
        if (!opts.tld) opts.tld = "com";
        if (!opts.tokensTTL) opts.tokensTTL = 3600;

        var url = "https://translate.google." + opts.tld;

        return Promise.resolve(config.get("wiz"))
            .then(function(wiz) {
                if (wiz && (wiz.timestamp + opts.tokensTTL * 1000) > Date.now()) return wiz;
                return fetchWizGlobalData(url)
                    .then(function(wiz) {
                        wiz.timestamp = Date.now();
                        config.set("wiz", wiz);
                        return wiz;
                    })
            })
            .then(function(wiz) {
                return getBatchExecuteParams(wiz, rpcId, payload);
            })
            .then(function(params) {
                if (opts.validateOnly) return;
                if (!params.body.at) delete params.body.at;
                return got.post(url + "/_/TranslateWebserverUi/data/batchexecute", {
                        searchParams: params.query,
                        form: params.body,
                        responseType: "text"
                    })
                    .then(function(res) {
                        var match = res.body.match(/\d+/);
                        return res.body.substr(match.index + match[0].length, Number(match[0]));
                    })
                    .then(JSON.parse)
                    .then(function(envelopes) {
                        var payload = envelopes[0][2];
                        return JSON.parse(payload);
                    })
            })
    }


    function fetchWizGlobalData(url) {
        var propFinder = {
            "f.sid": /"FdrFJe":"(.*?)"/,
            "bl": /"cfb2h":"(.*?)"/,
            "at": /"SNlM0e":"(.*?)"/,
        }
        return got.get(url)
            .then(function(res) {
                var start = res.body.indexOf("WIZ_global_data = {");
                if (start == -1) throw new Error("Wiz not found");
                var end = res.body.indexOf("</script>", start);
                return res.body.substring(start, end);
            })
            .then(function(text) {
                var wiz = {};
                for (var prop in propFinder) {
                    var match = propFinder[prop].exec(text);
                    if (match) wiz[prop] = match[1];
                    else console.warn("Wiz property not found '" + prop + "'");
                }
                return wiz;
            })
    }


    function getBatchExecuteParams(wiz, rpcId, payload) {
        if (!Array.isArray(payload)) throw new Error("Payload must be an array");
        return {
            query: {
                "rpcids": rpcId,
                "f.sid": wiz["f.sid"],
                "bl": wiz["bl"],
                "hl": "en",
                "soc-app": 1,
                "soc-platform": 1,
                "soc-device": 1,
                "_reqid": (++batchNumber * 100000) + Math.floor(1000 + (Math.random() * 9000)),
                "rt": "c"
            },
            body: {
                "f.req": JSON.stringify([[[rpcId, JSON.stringify(payload), null, "generic"]]]),
                "at": wiz["at"]
            }
        }
    }


    window.googleTranslateReady = async function() {
        const access = await getAccess()
        if (access.isDenied()) {
            access.renewDenial()
            throw new Error("Service unavailable")
        }
        return batchExecute("jQ1olc", [], {validateOnly: true});
    }

    window.googleTranslateSynthesizeSpeech = async function(text, lang) {
        const access = await getAccess()
        if (access.isDenied()) throw new Error("Server returns 429")
        access.use()

        const payload = await batchExecute("jQ1olc", [text, lang, null])
        if (!payload) throw new Error("Failed to synthesize text '" + text.slice(0,25) + "…' in language " + lang)
        return "data:audio/mpeg;base64," + payload[0];
    }

    async function getAccess() {
        const config = {
            continuousUseInterval: 60*60*1000,
            voluntaryGap: 5*60*1000,
            involuntaryGap: 15*60*1000
        }
        const state = await getState("gtAccess") || {lastUsed: 0, denyUntil: 0}
        const save = () => setState("gtAccess", state).catch(console.error)
        return {
            isDenied() {
                return state.denyUntil > Date.now()
            },
            renewDenial() {
                state.denyUntil = Date.now() + config.involuntaryGap
                save()
            },
            use() {
                const now = Date.now()
                if (now - state.lastUsed > config.voluntaryGap) state.intervalBegin = now
                else if (now - state.intervalBegin > config.continuousUseInterval) state.denyUntil = now + config.involuntaryGap
                state.lastUsed = now
                save()
            }
        }
    }
})();
