# TTS limit verification — 2026-10-10

These limits have different origins: WordBreaker is a duration heuristic for a
historical browser/voice bug; CharBreaker manages synthesis request sizes. The
750-character default and 200-character paragraph packing threshold are project
policy, not claimed server limits. No production chunking settings were changed
as part of this verification.

## Google native voices: historical evidence, live reproduction inconclusive

A [firsthand report by Hadrien Gardeur, dated April 3, 2024](https://github.com/HadrienGardeur/read-aloud-best-practices/issues/3)
describes desktop Chrome's Google voices stopping after about 14 seconds without
an error callback. It links [Chromium issue 332002367](https://issues.chromium.org/issues/332002367)
and [Chromium issue 40747712](https://issues.chromium.org/issues/40747712).
The first linked Chromium page required sign-in during this investigation; its
current resolution status was not verified. The public report corroborates an
approximate 14–15-second cutoff, not an exact cross-version API guarantee.

The original implementation's author reports the same problem through both
`chrome.tts` and Web Speech. This investigation tested Web Speech only; it did not
independently reproduce the `chrome.tts` route or establish that the browser
extension's internals are the root cause.

### Browser observations

The local probe ran in Chrome with reported user agent
`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36`.
This is the browser-reported user agent, not an independently measured OS version.
209 voices were listed, including Google US English (`localService=false`).
At rate 1:

| Voice | Text length (UTF-16 units) | Observed events |
| --- | ---: | --- |
| Google US English | 28 | `end` after 0.014 s; no `start`; `charIndex=0` |
| Google US English | 1,584 | `end` after 0.004 s; no `start`; `charIndex=0` |
| Samantha, local control | 28 | `end` after 0.012 s; no `start`; `charIndex=0` |

These wall-clock durations are measured from the `speak` call. The events'
`elapsedTime` values were 7.4, 3.5, and 11.6 respectively, inconsistent with those
wall-clock observations. Because even the short local control did not establish
normal playback, this session cannot confirm or refute the historical cutoff.
No acoustic measurement was performed. In particular, absence of an `end` event
alone would not prove when audio stopped.

### Reproduce

1. From the repository root, run
   `python3 -m http.server 8765 --bind 127.0.0.1 --directory tests/manual`.
2. Open `http://127.0.0.1:8765/tts-limits.html` in desktop Chrome.
3. Select Google US English and run **Speak short control**. Require normal
   `start`, audible speech, and `end` before treating the environment as valid.
4. Run **Speak long test**, keeping the page foreground. Record the audible
   cutoff time and events. The harness cancels at 35 seconds; that cancellation
   and any resulting event are test actions, not a natural speech completion.
5. Repeat with a local voice as a control. A normal long local utterance can still
   be speaking when the test cancels it. Testing `chrome.tts` separately requires
   an extension context and is outside this standalone Web Speech harness.

Read Aloud's 32/36-word budgets are language- and rate-adjusted duration estimates,
not measured guarantees. `TimeoutTtsEngine` separately waits 3 seconds for initial
activity (retrying once on timeout), then starts a 16-second deadline upon the
`start` event. If no normal end arrives, it stops the engine and emits a synthetic
`end` with `charIndex=text.length`. This advances playback; it does not recover
any words lost to a cutoff.

## Google Translate: 200-character boundary reproduced for ASCII English

The current implementation in `js/google-translate.js` uses
`POST https://translate.google.com/_/TranslateWebserverUi/data/batchexecute`, RPC
`jQ1olc`, with payload `[text, lang, null]`. This is distinct from the older
`/translate_tts` endpoint, so reports about that older API alone do not verify the
current implementation.

The production code obtains WIZ request metadata, caches it as `gtWiz`, and sends
an `at` field when present. The live probe did **not** read that cache, retrieve
WIZ data, or use cookies or authentication tokens. The endpoint accepted
anonymous requests with just `rpcids=jQ1olc&hl=en&rt=c` and an `f.req` body.
Thus a token was not necessary for this particular experiment; this does not
establish that every session or deployment can omit it.

The probe repeated and truncated the synthetic sentence
“The small garden beside the river is quiet this morning. ” to exact lengths,
using language `en`:

| Input length | HTTP status | Decoded audio bytes | Result |
| ---: | ---: | ---: | --- |
| 28 | 200 | 16,704 | Audio payload with MP3 header |
| 199 | 200 | 106,944 | Audio payload with MP3 header |
| 200 | 200 | 109,632 | Audio payload with MP3 header |
| 201 | 200 | 0 | Null RPC payload |
| 250 | 200 | 0 | Null RPC payload |
| 750 | 200 | 0 | Null RPC payload |

HTTP success alone does not indicate synthesis success. The production code
already rejects a falsy RPC payload. This experiment supports retaining the
200-character cap for this endpoint. Audio was checked for a decoded MP3 header,
not listened to or checked for a complete transcript. These ASCII inputs do not
distinguish UTF-16 units, Unicode code points, or UTF-8 byte limits; multilingual
boundary semantics remain unverified. This is observed behavior of an
undocumented web endpoint, not a published Google API contract.

Reproduce with `node tests/manual/probe-google-translate.mjs` (Node.js 18+ with
network access). It sends six synthetic requests and prints only status and
payload measurements. It is deliberately excluded from `npm test`: live network
behavior should not make the deterministic chunking suite flaky.
