# Offscreen playback verification

Use an unpacked build and a voice that plays audio through `playAudio`, rather
than native browser TTS. Use local/test audio when available. Inspect both the
player and service-worker consoles for unhandled rejections.

| Case | Expected |
| --- | --- |
| Cold start | One offscreen document, audio starts |
| Stop/start rapidly; pause during startup | No audio after stop/pause; next start works |
| Pause longer than 30 seconds, then resume | Discarded document recreated; current segment restarts |
| Resume around the 30-second idle boundary | Playback recovers or reports a bounded error; no stuck operation |
| Reload service worker with document alive | Existing document reused |
| Close player, then open another | New player receives only its session events |
| Two player pages request playback | Creation coordinated; stale cleanup cannot stop the newer session |
| Break offscreen script loading | Bounded readiness error; after fixing/reloading, a new attempt works |
| Deny/fail creation | Error surfaces; next attempt is not locked out |
| Chrome/Edge with hasDocument | Normal lifecycle works |
| Browser with getContexts but no hasDocument | Same behavior via context lookup |
| Chrome 109–115 | Exact-URL clients lookup from service worker works |
| Browser without offscreen API (Firefox build) | Existing in-page audio fallback works |

Automated tests cover API detection, concurrency, readiness, timeouts, creation
races, retry, cancellation and session isolation with mocks. They do not establish
real-browser audio or extension lifecycle behavior. Do not force-close an
unresponsive existing document automatically: it may contain another player's
active audio. The operation reports an error instead.
