
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
        return got.get(url)
            .then(function(res) {
                var start = res.body.indexOf("WIZ_global_data = {");
                if (start == -1) throw new Error("Wiz not found");
                var end = res.body.indexOf("};", start);
                return res.body.substring(start+18, end+1);
            })
            .then(JSON.parse)
    }


    function getBatchExecuteParams(wiz, rpcId, payload) {
        if (!Array.isArray(payload)) throw new Error("Payload must be an array");
        return {
            query: {
                "rpcids": rpcId,
                "f.sid": wiz["FdrFJe"],
                "bl": wiz["cfb2h"],
                "hl": "en",
                "soc-app": 1,
                "soc-platform": 1,
                "soc-device": 1,
                "_reqid": (++batchNumber * 100000) + Math.floor(1000 + (Math.random() * 9000)),
                "rt": "c"
            },
            body: {
                "f.req": JSON.stringify([[[rpcId, JSON.stringify(payload), null, "generic"]]]),
                "at": wiz["SNlM0e"]
            }
        }
    }


    window.googleTranslateReady = function() {
        return batchExecute("jQ1olc", [], {validateOnly: true});
    }

    window.googleTranslateSynthesizeSpeech = function(text, lang) {
        return batchExecute("jQ1olc", [text, lang, null])
            .then(function(payload) {
                return "data:audio/mpeg;base64," + payload[0];
            })
    }
})();
