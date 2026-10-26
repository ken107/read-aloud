const assert = require('node:assert/strict');
const {test} = require('node:test');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const rxjs = require('../js/rxjs.umd.min.js');

// Skip global engine initialization; retain the real cache and engine functions.
const source = readFileSync(require.resolve('../js/tts-engines.js'), 'utf8');
const engineSource = source.slice(source.indexOf('//synthesized audio cache'));

async function speechRequest(voiceInfo) {
  let request;
  const context = vm.createContext({
    assert, rxjs,
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
  await rxjs.lastValueFrom(engine.speak('Hola mundo', {voice: {voiceName: 'OpenAI ' + voiceInfo.voice}}));
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
    input: 'Hola mundo', response_format: 'wav',
  });
  assert.deepEqual(voice, original);
});

test('preserves the existing standard voice request including instructions', async () => {
  const {body} = await speechRequest({
    model: 'tts-1', voice: 'alloy', instructions: 'Speak warmly.',
  });
  assert.deepEqual(body, {
    model: 'tts-1', voice: 'alloy', instructions: 'Speak warmly.',
    input: 'Hola mundo', response_format: 'wav',
  });
});

test('voice configuration cannot replace the spoken text or WAV format', async () => {
  const {body} = await speechRequest({
    model: 'kokoro', voice: 'ef_dora', input: 'Wrong text', response_format: 'pcm',
  });
  assert.equal(body.input, 'Hola mundo');
  assert.equal(body.response_format, 'wav');
});

function wav({streaming = false, samples = 0, metadata = false} = {}) {
  const extra = metadata ? Buffer.from([74, 85, 78, 75, 1, 0, 0, 0, 42, 0]) : Buffer.alloc(0)
  const fmt = Buffer.alloc(24)
  fmt.write('fmt '); fmt.writeUInt32LE(16, 4); fmt.writeUInt16LE(1, 8)
  fmt.writeUInt16LE(1, 10); fmt.writeUInt32LE(24000, 12)
  fmt.writeUInt32LE(48000, 16); fmt.writeUInt16LE(2, 20); fmt.writeUInt16LE(16, 22)
  const data = Buffer.alloc(8 + samples)
  data.write('data'); data.writeUInt32LE(streaming ? 0xFFFFFFFF : samples, 4)
  const header = Buffer.alloc(12)
  header.write('RIFF'); header.writeUInt32LE(streaming ? 0xFFFFFFFF : 4 + extra.length + fmt.length + data.length, 4)
  header.write('WAVE', 8)
  return new Blob([header, extra, fmt, data], {type: 'audio/wav'})
}

function audioFixture(blob, {httpError, decoderError} = {}) {
  let requests = 0, decodes = 0
  const context = vm.createContext({assert, rxjs, console,
    getSettings: async () => ({openaiCreds: {url: 'https://tts.example/v1', voiceList: [{voice: 'test', model: 'kokoro'}]}}),
    fetch: async () => {requests++; return {ok: !httpError, json: async () => ({error: httpError}), blob: async () => blob}},
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    playAudio: () => {
      decodes++
      return decoderError ? rxjs.throwError(() => decoderError) : rxjs.of({type: 'start'}, {type: 'end'})
    },
  })
  vm.runInContext(engineSource, context)
  const engine = new context.OpenaiTtsEngine()
  const options = {voice: {voiceName: 'OpenAI test'}}
  return {engine, options, counts: () => ({requests, decodes}),
    speak: (state = new rxjs.BehaviorSubject('resumed')) => engine.speak('(...)', options, state)}
}

for (const [name, blob] of [
  ['zero bytes', new Blob()], ['empty WAV', wav()],
  ['metadata and padding', wav({metadata: true})], ['empty streaming WAV', wav({streaming: true})],
]) {
  test(`skips ${name} with start/end events, including cached playback`, async () => {
    const f = audioFixture(blob)
    for (let i = 0; i < 2; i++) {
      const events = await rxjs.lastValueFrom(f.speak().pipe(rxjs.toArray()))
      assert.deepEqual(events.map(x => x.type), ['start', 'end'])
    }
    assert.deepEqual(f.counts(), {requests: 1, decodes: 0})
  })
}

for (const streaming of [false, true]) {
  test(`nonempty ${streaming ? 'streaming' : 'standard'} WAV reaches decoder`, async () => {
    const f = audioFixture(wav({streaming, samples: 4800}))
    await rxjs.lastValueFrom(f.speak())
    assert.equal(f.counts().decodes, 1)
  })
}

test('empty audio waits for resume and respects cancellation', async () => {
  const f = audioFixture(wav())
  const state = new rxjs.BehaviorSubject('paused')
  const events = []
  const sub = f.speak(state).subscribe(x => events.push(x.type))
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(events, [])
  state.next('resumed')
  assert.deepEqual(events, ['start', 'end'])
  assert.equal(sub.closed, true)
  state.next('paused')
  const canceled = f.speak(state).subscribe(() => assert.fail('canceled playback emitted'))
  await new Promise(resolve => setImmediate(resolve))
  canceled.unsubscribe()
  state.next('resumed')
})

test('HTTP and malformed audio errors remain visible', async () => {
  const error = new Error('invalid audio')
  for (const blob of [new Blob(['not audio']), new Blob([Buffer.from('RIFF\xff\xff\xff\xffWAVEdata\0\0\0\0', 'binary')])]) {
    const f = audioFixture(blob, {decoderError: error})
    await assert.rejects(rxjs.lastValueFrom(f.speak()), err => err === error)
    assert.equal(f.counts().decodes, 1)
  }
  const f = audioFixture(new Blob(), {httpError: error})
  await assert.rejects(rxjs.lastValueFrom(f.speak()), err => err === error)
  assert.equal(f.counts().decodes, 0)
})

test('reading continues past empty audio into the following chunk', async () => {
  const empty = audioFixture(wav()), speech = audioFixture(wav({samples: 4800}))
  const events = await rxjs.lastValueFrom(rxjs.concat(empty.speak(), speech.speak()).pipe(rxjs.toArray()))
  assert.deepEqual(events.map(x => x.type), ['start', 'end', 'start', 'end'])
  assert.equal(speech.counts().decodes, 1)
})

test('invalid WAV format headers are not silently skipped', async () => {
  const bytes = Buffer.from(await wav().arrayBuffer())
  bytes.writeUInt16LE(0, 22) // Invalid channel count in an otherwise empty WAV.
  const error = new Error('invalid WAV format')
  const f = audioFixture(new Blob([bytes]), {decoderError: error})
  await assert.rejects(rxjs.lastValueFrom(f.speak()), err => err === error)
  assert.equal(f.counts().decodes, 1)
})

test('prefetched empty audio is reused without decoding or refetching', async () => {
  const f = audioFixture(wav())
  f.engine.prefetch('(...)', f.options)
  await new Promise(resolve => setImmediate(resolve))
  await rxjs.lastValueFrom(f.speak())
  assert.deepEqual(f.counts(), {requests: 1, decodes: 0})
})
