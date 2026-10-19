const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../js/events.js'), 'utf8');
const reportSource = source.slice(source.indexOf('async function reportIssue('), source.indexOf('function authWavenet('));
for (const [name, permissions, expected] of [
  ['denied', {data_collection: []}, false],
  ['granted', {data_collection: ['technicalAndInteraction']}, true],
  ['legacy Firefox', {}, true],
]) {
  test(`report transmission honors consent: ${name}`, async () => {
    let requests = 0;
    const ctx = vm.createContext({
      brapi: {permissions: {getAll: async () => permissions}, runtime: {getManifest: () => ({version: 'test'})}},
      getSettings: async () => ({}), navigator: {userAgent: 'test'}, config: {serviceUrl: 'https://example.test'},
      ajaxPost: async () => {requests++},
    });
    vm.runInContext(reportSource, ctx);
    assert.equal(await ctx.reportIssue('https://example.test/page', 'Test report'), expected);
    assert.equal(requests, expected ? 1 : 0);
  });
}
