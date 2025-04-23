
(function() {

    const url = "https://translate.google.com"

    const wiz$ = rxjs.defer(async () => {
        let wiz = await getSetting("gtWiz")
        if (wiz && wiz.expire > Date.now()) {
            console.debug("Wiz still valid")
        } else {
            console.debug("Fetching new wiz")
            wiz = await fetchWizGlobalData(url)
            wiz.expire = Date.now() + 3600*1000
            await updateSetting("gtWiz", wiz)
        }
        return wiz
    }).pipe(
        rxjs.timeout({
            first: 7500,
            with: () => rxjs.throwError(() => new Error("Timeout fetching " + url))
        }),
        rxjs.tap({
            error: err => console.error("Failed fetch wiz", err)
        }),
        rxjs.share({
            connector: () => new rxjs.ReplaySubject(1),
            resetOnComplete: false,
            resetOnError: false,
            resetOnRefCountZero: false
        })
    )

    var batchNumber = 0;


    async function batchExecute(rpcId, payload) {
        const wiz = await rxjs.firstValueFrom(wiz$)
        const {query, body} = getBatchExecuteParams(wiz, rpcId, payload)
        if (!body.at) delete body.at
        const res = {body: await ajaxPost(url + "/_/TranslateWebserverUi/data/batchexecute?" + urlEncode(query), body)}
        var match = res.body.match(/\d+/);
        const envelopes = JSON.parse(res.body.substr(match.index + match[0].length, Number(match[0])))
        var payload = envelopes[0][2];
        return JSON.parse(payload);
    }

    async function fetchWizGlobalData(url) {
        var propFinder = {
            "f.sid": /"FdrFJe":"(.*?)"/,
            "bl": /"cfb2h":"(.*?)"/,
            "at": /"SNlM0e":"(.*?)"/,
        }
        const res = {body: await ajaxGet(url)}
        var start = res.body.indexOf("WIZ_global_data = {");
        if (start == -1) throw new Error("Wiz not found");
        var end = res.body.indexOf("</script>", start);
        const text = res.body.substring(start, end)
        var wiz = {};
        for (var prop in propFinder) {
            var match = propFinder[prop].exec(text);
            if (match) wiz[prop] = match[1];
            else console.warn("Wiz property not found '" + prop + "'");
        }
        return wiz;
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
        try {
            await rxjs.firstValueFrom(
                wiz$.pipe(
                    rxjs.timeout(2500)
                )
            )
            return true
        } catch (err) {
            return false
        }
    }

    window.googleTranslateSynthesizeSpeech = async function(text, lang) {
        const payload = await batchExecute("jQ1olc", [text, lang, null])
        if (!payload) throw new Error("Failed to synthesize text '" + text.slice(0,25) + "…' in language " + lang)
        return "data:audio/mpeg;base64," + payload[0];
    }
})();
