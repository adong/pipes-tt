#!/usr/bin/env node
/* Makes js/levels.js: the 40 levels of TT Pipe Connect, the same file every time (seeded).
     node tools/make-levels.js
   For each level in LADDER below: grow a random tree of pipes over the grid, put the tap on one leaf (an edge one if it
   can) and flowers on others, keep only the pipes on the way from the tap to the flowers, then turn some of them the
   wrong way. Tiles off the way become grass, rocks or loose "decoy" pipes. A level is kept only when the water doesn't
   already reach every flower, and the solver in js/rules.js finds a way quickly from the start.
   Ladder fields: w h (grid), f (flowers), len (pipes on the way to the farthest flower), wrong (pipes turned the wrong
   way: [lo, hi], or 'all' = every pipe on the way turned at random), decoy / rock (the share of the other tiles),
   bolt (the share of right pipes that are bolted down), par ([lo, hi] clockwise turns needed). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Map, Set, Error, Uint8Array, Int8Array, Int16Array };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'rules.js'), 'utf8'), ctx);
const PC = ctx.PC;

const E = (w, h, f, len, wrong, more = {}) => Object.assign({ tier: 'easy', w, h, f, len, wrong, decoy: 0, rock: 0.15, bolt: 0 }, more);
const N = (w, h, f, len, more = {}) => Object.assign({ tier: 'normal', w, h, f, len, wrong: 'all', decoy: 0.7, rock: 0.08, bolt: 0 }, more);
const LADDER = [
  // 🐣 EASY, for Tommy (5): tiny gardens, one flower, one or two pipes the wrong way; then a bit bigger
  E(3, 3, 1, [1, 2], [1, 1], { par: [1, 2] }),
  E(3, 3, 1, [2, 3], [1, 1], { par: [1, 3] }),
  E(3, 3, 1, [3, 4], [2, 2], { par: [2, 4] }),
  E(3, 4, 1, [3, 5], [2, 2], { par: [3, 5] }),
  E(4, 3, 1, [4, 6], [2, 3], { par: [3, 5], bolt: 0.3 }),
  E(4, 4, 1, [4, 7], [3, 3], { par: [4, 6], bolt: 0.3 }),
  E(4, 4, 2, [3, 5], [3, 3], { par: [4, 6], bolt: 0.3 }),
  E(4, 4, 1, [6, 9], [3, 4], { par: [4, 7], bolt: 0.3 }),
  E(4, 5, 1, [6, 10], [4, 4], { par: [5, 8], bolt: 0.25 }),
  E(5, 4, 2, [4, 7], [4, 4], { par: [5, 8], bolt: 0.25 }),
  E(4, 5, 2, [5, 8], [4, 5], { par: [6, 9], bolt: 0.2, decoy: 0.15 }),
  E(5, 5, 1, [8, 12], [4, 5], { par: [6, 9], bolt: 0.2, decoy: 0.2 }),
  E(5, 5, 2, [5, 9], [5, 5], { par: [7, 10], bolt: 0.2, decoy: 0.2 }),
  E(5, 5, 2, [6, 10], [5, 6], { par: [7, 11], bolt: 0.15, decoy: 0.25 }),
  E(5, 5, 2, [7, 11], [5, 6], { par: [8, 11], bolt: 0.15, decoy: 0.3 }),
  E(5, 5, 2, [8, 12], [6, 6], { par: [8, 12], bolt: 0.1, decoy: 0.3 }),
  E(5, 6, 2, [8, 13], [6, 7], { par: [9, 13], bolt: 0.1, decoy: 0.35 }),
  E(6, 5, 3, [6, 10], [6, 7], { par: [9, 13], bolt: 0.1, decoy: 0.35 }),
  E(5, 6, 3, [7, 12], [7, 7], { par: [10, 14], bolt: 0.1, decoy: 0.4 }),
  E(6, 6, 3, [8, 13], [7, 8], { par: [11, 15], bolt: 0.1, decoy: 0.4 }),
  // 🔥 NORMAL, for Teddy (8): every pipe on the way turned at random, loose pipes everywhere to fool you
  N(5, 5, 2, [5, 9], { par: [10, 15] }),
  N(5, 5, 2, [7, 11], { par: [11, 16] }),
  N(5, 6, 2, [8, 13], { par: [12, 17] }),
  N(6, 5, 3, [6, 11], { par: [13, 18] }),
  N(6, 6, 2, [10, 15], { par: [14, 19] }),
  N(6, 6, 3, [7, 12], { par: [15, 21], decoy: 0.75 }),
  N(6, 6, 3, [8, 13], { par: [16, 22], decoy: 0.75 }),
  N(6, 6, 3, [9, 15], { par: [17, 23], decoy: 0.8 }),
  N(6, 7, 3, [10, 16], { par: [18, 24], decoy: 0.8 }),
  N(7, 6, 3, [10, 16], { par: [19, 25], decoy: 0.8 }),
  N(6, 7, 4, [8, 14], { par: [20, 27], decoy: 0.85 }),
  N(7, 6, 4, [8, 14], { par: [21, 28], decoy: 0.85 }),
  N(7, 7, 3, [12, 18], { par: [22, 29], decoy: 0.85 }),
  N(7, 7, 3, [13, 19], { par: [23, 30], decoy: 0.9 }),
  N(7, 7, 4, [10, 16], { par: [24, 31], decoy: 0.9 }),
  N(7, 7, 4, [11, 17], { par: [25, 33], decoy: 0.9 }),
  N(7, 7, 4, [12, 18], { par: [26, 34], decoy: 0.95, rock: 0.05 }),
  N(7, 7, 4, [13, 19], { par: [27, 36], decoy: 0.95, rock: 0.05 }),
  N(7, 7, 5, [10, 17], { par: [28, 38], decoy: 1, rock: 0 }),
  N(7, 7, 5, [12, 19], { par: [30, 40], decoy: 1, rock: 0 }),
];

const rnd = PC.rng(20261021);
const ri = (n) => Math.floor(rnd() * n);
const pick = (a) => a[ri(a.length)];
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const { DIRS, BIT } = PC;

// a random spanning tree ("growing tree": mostly the newest cell, so the paths wind)
function tree(w, h) {
  const n = w * h, edge = new Int8Array(n), seen = new Uint8Array(n);
  const start = ri(n), active = [start];
  seen[start] = 1;
  while (active.length) {
    const k = rnd() < 0.75 ? active.length - 1 : ri(active.length);
    const i = active[k];
    const x = i % w, y = Math.floor(i / w);
    const opts = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx]) continue;
      opts.push(d);
    }
    if (!opts.length) {
      active.splice(k, 1);
      continue;
    }
    const d = pick(opts);
    const j = (y + DIRS[d][1]) * w + x + DIRS[d][0];
    edge[i] |= BIT[d];
    edge[j] |= DIRS[d][3];
    seen[j] = 1;
    active.push(j);
  }
  return edge;
}

function make(L) {
  const { w, h } = L, n = w * h;
  const spec0 = { w, h, n };
  for (let attempt = 0; attempt < 20000; attempt++) {
    const edge = tree(w, h);
    const leaves = [];
    for (let i = 0; i < n; i++) if (PC.bits(edge[i]) === 1) leaves.push(i);
    const onEdge = (i) => i % w === 0 || i % w === w - 1 || i < w || i >= n - w;
    const edgeLeaves = leaves.filter(onEdge);
    const src = edgeLeaves.length ? pick(edgeLeaves) : pick(leaves);
    // distances along the tree from the tap
    const dist = new Int16Array(n).fill(-1), par = new Int16Array(n).fill(-1), q = [src];
    dist[src] = 0;
    for (let a = 0; a < q.length; a++) {
      const i = q[a];
      for (let d = 0; d < 4; d++) {
        if (!(edge[i] & BIT[d])) continue;
        const j = PC.nb(spec0, i, d);
        if (dist[j] >= 0) continue;
        dist[j] = dist[i] + 1;
        par[j] = i;
        q.push(j);
      }
    }
    // the farthest flower has len pipes before it; the others at least one pipe away, not next to each other
    const far = leaves.filter((i) => i !== src && dist[i] - 1 >= L.len[0] && dist[i] - 1 <= L.len[1]);
    if (!far.length) continue;
    const flowers = [pick(far)];
    const rest = shuffle(leaves.filter((i) => i !== src && !flowers.includes(i) && dist[i] >= 2 && dist[i] - 1 <= L.len[1]));
    for (const i of rest) {
      if (flowers.length >= L.f) break;
      const near = flowers.some((f) => Math.abs((f % w) - (i % w)) + Math.abs(Math.floor(f / w) - Math.floor(i / w)) < 2);
      if (!near) flowers.push(i);
    }
    if (flowers.length < L.f) continue;
    // keep only the pipes on the way from the tap to the flowers
    const need = new Int8Array(n), on = new Uint8Array(n);
    for (const f of flowers) {
      for (let i = f; i !== src; i = par[i]) {
        const j = par[i];
        on[i] = on[j] = 1;
        for (let d = 0; d < 4; d++) {
          if (PC.nb(spec0, i, d) === j) {
            need[i] |= BIT[d];
            need[j] |= DIRS[d][3];
          }
        }
      }
    }
    const kind = new Array(n).fill('.'), mask = new Array(n).fill(0);
    const pipes = [];
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      mask[i] = need[i];
      if (i === src) kind[i] = 'S';
      else if (flowers.includes(i)) kind[i] = 'F';
      else if (need[i] === 15) kind[i] = 'X'; // a cross looks the same every way: bolt it
      else {
        kind[i] = 'P';
        pipes.push(i);
      }
    }
    // turn some of them the wrong way
    shuffle(pipes);
    let wrongN = 0;
    if (L.wrong === 'all') {
      for (const i of pipes) {
        mask[i] = PC.rotN(need[i], ri(4));
        if (mask[i] !== need[i]) wrongN++;
      }
    } else {
      wrongN = L.wrong[0] + ri(L.wrong[1] - L.wrong[0] + 1);
      if (wrongN > pipes.length) continue;
      pipes.forEach((i, k) => {
        if (k < wrongN) {
          const bad = PC.masks(need[i]).filter((m) => m !== need[i]);
          mask[i] = pick(bad);
        } else if (rnd() < L.bolt) kind[i] = 'X';
      });
    }
    // the other tiles: loose pipes, rocks or grass
    for (let i = 0; i < n; i++) {
      if (on[i]) continue;
      const r = rnd();
      if (r < L.decoy) {
        kind[i] = 'P';
        mask[i] = PC.rotN(pick([5, 5, 3, 3, 3, 7]), ri(4));
      } else if (r < L.decoy + L.rock) kind[i] = 'R';
    }
    const rows = [];
    for (let y = 0; y < h; y++) {
      let s = '';
      for (let x = 0; x < w; x++) s += kind[y * w + x] + mask[y * w + x].toString(16);
      rows.push(s);
    }
    const spec = PC.parse({ id: 'x', rows });
    const fl = PC.flow(spec, spec.start);
    if (fl.done || fl.flowers > 0) continue; // no flower has water at the start
    const plan = { need, cells: [...q.filter((i) => on[i])] };
    const turns = PC.turnsFor(spec, spec.start, plan);
    if (L.par && (turns < L.par[0] || turns > L.par[1])) continue;
    // the solver has to find a way quickly from the start (the brother's help runs it in the page)
    const sol = PC.search(spec, spec.start, 20000);
    if (!sol || sol.gaveUp) continue;
    return { rows, par: turns, wrong: wrongN, flowers: flowers.length, work: sol.work, attempt };
  }
  throw new Error('no level for ' + JSON.stringify(L));
}

const out = [];
const counts = { easy: 0, normal: 0 };
for (const L of LADDER) {
  const lv = make(L);
  const id = (L.tier === 'easy' ? 'e' : 'n') + ++counts[L.tier];
  out.push({ id, tier: L.tier, rows: lv.rows, par: lv.par });
  console.log(id.padEnd(4), `${L.w}x${L.h}`, 'flowers', lv.flowers, 'par', String(lv.par).padStart(2), 'wrong', String(lv.wrong).padStart(2), 'solver work', lv.work, 'tries', lv.attempt + 1);
}
const text = `/* TT Pipe Connect: the 40 levels (20 🐣 EASY, 20 🔥 NORMAL). Made by tools/make-levels.js: don't edit by hand.
   Each row is two characters a tile: the kind (. grass, R rock, S tap, F flower, P pipe, X bolted pipe), then the
   openings in hex (N 1, E 2, S 4, W 8). par: the clockwise turns the level was made to need. */
(function () {
  const PC = (globalThis.PC = globalThis.PC || {});
  PC.LEVELS = [
${out.map((l) => `    { id: '${l.id}', tier: '${l.tier}', par: ${l.par}, rows: ${JSON.stringify(l.rows).replace(/,/g, ', ')} },`).join('\n')}
  ];
})();
`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'levels.js'), text);
console.log('wrote js/levels.js:', out.length, 'levels');
