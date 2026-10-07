const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const nodes = Object.fromEntries(['recovery','timer','respawn','error'].map(id => [id, {hidden:true, disabled:true, textContent:'', addEventListener(type, fn) {this[type] = fn;}}]));
let listener, render, now = 1000, request;
vm.runInNewContext(fs.readFileSync('web/app.js','utf8'), {
  document:{getElementById:id => nodes[id]}, window:{addEventListener:(_, fn) => {listener = fn;}},
  Date:{now:() => now}, setInterval:fn => {render = fn;}, GetParentResourceName:() => 'feather-medical',
  fetch:async (url, options) => {request = {url, options};}
});
async function main() {
  listener({data:{type:'medical:condition', remaining:30}});
  assert.equal(nodes.respawn.textContent, '');
  assert.match(nodes.timer.textContent, /0:30/);
  now += 30000; render();
  assert.equal(nodes.respawn.textContent, 'Press [E] to respawn');
  assert.equal(request, undefined); // Timer expiration never submits a request.
  listener({data:{type:'medical:condition', remaining:0, key:'G'}});
  assert.equal(nodes.respawn.textContent, 'Press [G] to respawn');
  assert.equal(nodes.respawn.click, undefined);
  listener({data:{type:'medical:requesting'}});
  assert.equal(nodes.respawn.textContent, 'Requesting recovery…');
  listener({data:{type:'medical:error', message:'retry'}});
  assert.equal(nodes.respawn.textContent, 'Press [G] to respawn');
  listener({data:{type:'medical:hide'}});
  assert.equal(nodes.recovery.hidden, true);
  assert.equal(request, undefined);
  console.log('PASS recovery UI: countdown, configurable key prompt, no click/fetch, retry and hide');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
