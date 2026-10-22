#!/usr/bin/env node
/* Run the headless checks from a terminal, with the same files the page loads (js/rules.js, js/levels.js, js/board.js, js/check.js).
     node tools/check.js                      every level solvable, the water's flow, the brother's help and the board
     node tools/check.js --quick              fewer random gardens (a second or two)
     node tools/check.js --sabotage oneway    proves the flow check can fail: water pours into pipes facing any way
     node tools/check.js --sabotage stuck     proves the level check can fail: a flower walled in by rocks
     node tools/check.js --sabotage lazy      proves the help check can fail: the brother turns a pipe one quarter, right or not */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Map, Set, Error, Infinity, Uint8Array, Int8Array, Int16Array, String };
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/rules.js', 'js/levels.js', 'js/board.js', 'js/check.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : undefined;
};
const t0 = Date.now();
const out = ctx.PC.check({ sabotage: opt('sabotage'), quick: args.includes('--quick'), seed: opt('seed') ? +opt('seed') : undefined });
out.seconds = +((Date.now() - t0) / 1000).toFixed(1);
console.log(JSON.stringify(out, null, 1));
console.log(out.ok ? 'CHECK PASSED' : 'CHECK FAILED');
process.exitCode = out.ok ? 0 : 1;
