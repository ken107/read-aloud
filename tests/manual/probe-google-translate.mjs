// Opt-in live probe of the same RPC/payload used by js/google-translate.js.
// No cookies, cached settings, WIZ data, or authentication tokens are read.
// Run: node tests/manual/probe-google-translate.mjs
const sentence = 'The small garden beside the river is quiet this morning. ';
for (const length of [28, 199, 200, 201, 250, 750]) {
  const text = sentence.repeat(Math.ceil(length / sentence.length)).slice(0, length);
  const body = new URLSearchParams({
    'f.req': JSON.stringify([[['jQ1olc', JSON.stringify([text, 'en', null]), null, 'generic']]])
  });
  const response = await fetch('https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=jQ1olc&hl=en&rt=c', {
    method: 'POST', body, signal: AbortSignal.timeout(15000)
  });
  const raw = await response.text();
  const match = raw.match(/\d+/);
  let payload, parseError;
  try {
    const envelopes = JSON.parse(raw.substr(match.index + match[0].length, Number(match[0])));
    const envelope = envelopes.find(row => row[1] === 'jQ1olc');
    payload = JSON.parse(envelope[2]);
  } catch (error) { parseError = error.message; }
  const audio = typeof payload?.[0] === 'string' ? Buffer.from(payload[0], 'base64') : null;
  console.log(JSON.stringify({
    length, httpStatus: response.status, responseBytes: Buffer.byteLength(raw),
    payloadPresent: !!payload, audioBytes: audio?.length || 0,
    mp3Header: !!audio && (audio.subarray(0, 3).toString() === 'ID3' || (audio[0] === 255 && (audio[1] & 224) === 224)),
    ...(parseError ? {parseError} : {})
  }));
}
