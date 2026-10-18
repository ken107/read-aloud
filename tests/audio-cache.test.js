const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function makeCache() {
  const source=fs.readFileSync(require.resolve('../js/tts-engines.js'),'utf8');
  const start=source.indexOf('const cache =');
  return vm.runInNewContext(source.slice(start,source.indexOf('\n}',start)+2)+'; cache');
}
test('deduplicates concurrent requests and retries failures', async()=>{
  const cache=makeCache();let calls=0;
  const fetch=async()=>{calls++;return 'audio'};
  const a=cache.fetchCached('x',fetch), b=cache.fetchCached('x',fetch);
  assert.equal(a,b);assert.equal(await a,'audio');assert.equal(calls,1);
  await assert.rejects(cache.fetchCached('bad',()=>Promise.reject(new Error('failed'))));
  assert.equal(await cache.fetchCached('bad',fetch),'audio');assert.equal(calls,2);
});
test('promotes cache hits and disposes evicted in-flight results once resolved',async()=>{
  const cache=makeCache();cache.maxEntries=2;let resolve;const destroyed=[];
  const pending=cache.fetchCached('a',()=>new Promise(r=>resolve=r),v=>destroyed.push(v));
  await Promise.resolve();
  await cache.fetchCached('b',()=> 'b');
  cache.fetchCached('a',()=>assert.fail('cache miss'));
  await cache.fetchCached('c',()=> 'c');assert.equal(cache.entries.has('b'),false);
  await cache.fetchCached('d',()=> 'd');assert.equal(cache.entries.has('a'),false);
  resolve('a');await pending;await Promise.resolve();assert.deepEqual(destroyed,['a']);
});
test('prefetches two chunks only when the next chunk is shorter than 100 characters',()=>{
  const source=fs.readFileSync(require.resolve('../js/speech.js'),'utf8');
  const start=source.indexOf('          } else if (engine.prefetch');
  const body=source.slice(start+17,source.indexOf('\n          break',start));
  for(const length of [0,99,100,101]) {
    const calls=[];
    vm.runInNewContext(body,{engine:{prefetch:text=>calls.push(text)},texts:['current','x'.repeat(length),'following'],options:{},playlist:{getIndex:()=>0}});
    assert.equal(calls.length,length===0?0:length<100?2:1);
  }
});
