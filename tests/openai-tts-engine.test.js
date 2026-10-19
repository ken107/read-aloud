const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');

// Skip global engine initialization; retain the real cache and engine functions.
const source = readFileSync(require.resolve('../js/tts-engines.js'), 'utf8');
const engineSource = source.slice(source.indexOf('//synthesized audio cache'));

async function speechRequest(voiceInfo) {
  let request;
  const context = vm.createContext({
    assert,
    getSettings: async () => ({openaiCreds: {
      url: 'https://tts.example/v1',
      voiceList: [voiceInfo],
    }}),
    fetch: async (url, options) => {
      request = {url, ...options, body: JSON.parse(options.body)};
      return {ok: true, blob: async () => new Blob(['audio'])};
    },
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    playAudio: promise => promise,
  });
  vm.runInContext(engineSource, context);
  const engine = new context.OpenaiTtsEngine();
  await engine.speak('Hola mundo', {voice: {voiceName: 'OpenAI ' + voiceInfo.voice}});
  return request;
}

test('forwards custom voice parameters and excludes voice-selection metadata', async () => {
  const voice = {
    model: 'kokoro', voice: 'ef_dora', lang: 'es', langs: ['es-ES'],
    language: 'es', stream: false, speed: 0.9,
    backend_options: {seed: 0},
  };
  const original = structuredClone(voice);
  const request = await speechRequest(voice);
  assert.equal(request.url, 'https://tts.example/v1/audio/speech');
  assert.equal(request.method, 'POST');
  assert.deepEqual(request.body, {
    model: 'kokoro', voice: 'ef_dora', language: 'es', stream: false,
    speed: 0.9, backend_options: {seed: 0},
    input: 'Hola mundo', response_format: 'mp3',
  });
  assert.deepEqual(voice, original);
});

test('preserves the existing standard voice request including instructions', async () => {
  const {body} = await speechRequest({
    model: 'tts-1', voice: 'alloy', instructions: 'Speak warmly.',
  });
  assert.deepEqual(body, {
    model: 'tts-1', voice: 'alloy', instructions: 'Speak warmly.',
    input: 'Hola mundo', response_format: 'mp3',
  });
});

test('voice configuration cannot replace the spoken text or MP3 format', async () => {
  const {body} = await speechRequest({
    model: 'kokoro', voice: 'ef_dora', input: 'Wrong text', response_format: 'pcm',
  });
  assert.equal(body.input, 'Hola mundo');
  assert.equal(body.response_format, 'mp3');
});
