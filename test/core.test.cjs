const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const parsers = require('../parsers.cjs');
const jsdoc = require('../jsdoc.cjs');
const fn = function handler() {};
test('registration, route authorization and unsafe offline modes', () => {
  assert.equal(parsers.parseRoute(fn, '@register router /users\n@method GET').path, 'users');
  assert.equal(parsers.parseRoute(fn, '@register_router /users').path, '/users');
  assert.equal(parsers.parseRoute(fn, '@register router users').public, false);
  assert.equal(parsers.parseRoute(fn, '@register router users\n@public true').public, true);
  assert.throws(() => parsers.parseRoute(fn, '@register router'), /requires a name/);
  for (const doc of ['@offline queue', '@offline invalid']) assert.throws(() => parsers.parseOffline(doc));
  assert.throws(() => parsers.parseOffline('@offline cache', 'post'), /GET/);
});
test('parameter descriptions, arrays, enums, recovery and command aliases', () => {
  const doc = '@register tool find\n@param {String[]} names - Names\n@param {("a"|"b")?} mode - Mode\n@reach always\n@recovery idempotent';
  const tool = parsers.parseTool(fn, doc);
  assert.equal(tool.parameters[0].description, 'Names');
  assert.deepEqual(tool.parameters[1].enum, ['a','b']);
  assert.equal(tool.parameters[1].required, false);
  assert.equal(tool.recoveryPolicy, 'idempotent');
  const command = parsers.parseCommand(fn, '@register_command find\n@param {string} name - Name\n@alias n\n@order name');
  assert.deepEqual(command.parameters[0].aliases, ['n']);
  assert.deepEqual(command.order, ['name']);
  assert.throws(() => parsers.parseCommand(fn, '@register_command x\n@param {string} name\n@alias help'), /Conflicting/);
});
test('JSDoc association, hook priority and availability', async () => {
  const map = jsdoc.buildAboveDocMap('/** @register_tool handler */\nfunction handler() {}');
  assert.match(jsdoc.resolveDoc(fn, map), /register_tool/);
  assert.equal(parsers.parseHook(fn, '@register hook changed\n@priority 4').priority, 4);
  const {resolveConditions} = require('../conditions.cjs');
  assert.equal(await resolveConditions({only:['ready']}, {}), false);
  assert.equal(await resolveConditions({when:['ready']}, {ready:true}), true);
});
test('scanner cache and JSON schema array conversion', async () => {
  const generic = async (folder, parser, kind, transform) => [transform(parser(fn, '@register_tool x\n@param {Int[]} ids - IDs'))];
  const {createScanners} = require('..');
  assert.equal(createScanners(generic), createScanners(generic));
  const [tool] = await createScanners(generic).registerTools('pkg');
  assert.deepEqual(tool.parameters.properties.ids, {type:'array',items:{type:'integer'},description:'IDs'});
});
test('middleware snapshots and asynchronous next preserve invocation order', async () => {
  const log = [];
  const api = require('../middleware.cjs').create({
    registerPredicates: async () => [{name:'ready',call: async ctx => ctx.ready}],
    registerMiddlewares: async () => [{predicates:['ready'],call:async (ctx,next) => {log.push('before'); const value = await next(); log.push('after'); return value;}}]
  });
  const snapshot = await api.loadMiddlewareSnapshot('pkg');
  assert.equal((await api.resolveMiddlewares('pkg',{ready:false},snapshot)).length,0);
  const middleware = await api.resolveMiddlewares('pkg',{ready:true},snapshot);
  assert.equal(await api.runMiddlewares(middleware,{},() => {log.push('handler');return 42;}),42);
  assert.deepEqual(log,['before','handler','after']);
});
test('manifest through injected in-memory capabilities, no Node I/O', async () => {
  let written;
  const scanners = {resolveAgentFolder:x=>x, registerTools:async()=>[],registerHooks:async()=>[],registerRoutes:async()=>[],registerCommands:async()=>[]};
  const api = require('../manifest.cjs').create(scanners, {
    readPackage:async()=>({name:'demo'}),basename:x=>x,now:()=> 'fixed',
    writeManifest:async(folder,file,text)=>{written={folder,file,text};return folder+'/'+file;}
  });
  assert.equal(await api.writeManifest('pkg'), 'pkg/logos.json');
  assert.equal(JSON.parse(written.text).generatedAt,'fixed');
  assert.ok(written.text.endsWith('\n'));
});
test('portable core loads with native capabilities forbidden', () => {
  const original = Module._load;
  try {
    Module._load = function(id,...args) {if (/^(node:|fs$|path$|child_process$)/.test(id)) throw Error('forbidden native '+id); return original.call(this,id,...args);};
    for (const name of ['index','conditions','parsers','jsdoc','middleware','manifest']) {
      delete require.cache[require.resolve('../dist/'+name+'.cjs')];
      require('../dist/'+name+'.cjs');
    }
  } finally {Module._load=original;}
});
test('legacy Node manifest entrypoint writes a real snapshot', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'annotations-test-'));
  try {
    fs.writeFileSync(path.join(folder,'package.json'), JSON.stringify({name:'node-host'}));
    const scanners = {resolveAgentFolder:x=>x, registerTools:async()=>[],registerHooks:async()=>[],registerRoutes:async()=>[],registerCommands:async()=>[]};
    const api = require('../manifest.cjs').create(scanners);
    const target = await api.writeManifest(folder);
    assert.equal(JSON.parse(fs.readFileSync(target,'utf8')).name,'node-host');
    assert.ok(fs.readFileSync(target,'utf8').endsWith('\n'));
  } finally {fs.rmSync(folder,{recursive:true,force:true});}
});
