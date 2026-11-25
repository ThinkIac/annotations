const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.argv[2];
if (!root) throw Error('Usage: node scripts/check-legacy.cjs /path/to/old/annotations');
const old = require(path.resolve(root,'parsers.cjs'));
const current = require('../parsers.cjs');
const fn = function sample(){};
const bases=['','@description empty','@register router x','@register router /x','@register_router /x','@register hook changed','@register_hook changed','@register_tool x','@register tool x','@register_command x','@register_predicate x','@register_middleware x','@register_module x'];
const options=['','\n@public false','\n@method POST\n@offline cache','\n@param {string[]} names - Names\n@only ready','\n@param {("a"|"b")?} mode - Mode\n@reach always','\n@param {string} name - Name\n@alias n\n@order name','\n@upload file 2 5mb memory\n@stream\n@auth','\n@priority 5\n@after http\n@events changed'];
let count=0;
for(const [name,parse] of Object.entries(current).filter(([n,v])=>n.startsWith('parse') && typeof v==='function' && n!=='parseOffline')) for(const base of bases) for(const option of options){
 const doc=base+option;
 const run=f=>{try{return {value:f(fn,doc)}}catch(e){return {error:e.message}}};
 assert.deepEqual(run(parse),run(old[name]),name+' '+doc);count++;
}
console.log(count+' legacy parser comparisons passed');
