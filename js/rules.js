/* TT Pipe Connect: the rules, with no Three.js and no page in them (tools/check.js runs this file in Node too).
   A level is a grid of tiles. Each tile's openings are a 4-bit mask: N 1, E 2, S 4, W 8 (north is the far side).
     .  grass, nothing on it             R  a rock, nothing on it
     S  the water tap (fixed)            F  a flower pot (fixed, one opening)
     P  a pipe you can turn              X  a bolted pipe (fixed)
   Water runs from the tap through every pair of tiles whose openings face each other. A level is done when every
   flower has water. Pipes that open onto nothing just leak a bit: that's allowed.
     PC.flow(spec, mask)        where the water goes: { wet, depth, from, order, leaks, flowers, done }
     PC.solve(spec, mask)       a way to water every flower from here: { need, cells } (the edges each tile must
                                open, on the paths from the tap to the flowers), or null
     PC.fix(spec, mask, plan)   the brother's help: one pipe the plan needs turned, and how far: { i, to, turns }
   Levels are rows of two characters a tile: the kind, then the mask in hex ("S2" a tap opening east). */
(function () {
  'use strict';
  const PC = (globalThis.PC = globalThis.PC || {});

  // dx, dy, the bit, the opposite bit (N E S W, clockwise)
  const DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  const BIT = [1, 2, 4, 8];
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const rot = (m) => ((m << 1) | (m >> 3)) & 15; // a clockwise quarter turn
  const rotN = (m, n) => {
    for (let k = 0; k < ((n % 4) + 4) % 4; k++) m = rot(m);
    return m;
  };
  // the different masks a tile can show, starting with the one it has and going round clockwise
  function masks(m) {
    const out = [m];
    for (let k = 1, x = rot(m); k < 4; k++, x = rot(x)) if (!out.includes(x)) out.push(x);
    return out;
  }
  // clockwise turns from `from` to the first mask that opens every side in `need` (-1 if none does)
  function turnsTo(from, need) {
    for (let k = 0, x = from; k < 4; k++, x = rot(x)) if ((x & need) === need) return k;
    return -1;
  }
  const bits = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

  const TURNS = { P: 1 }; // the kinds a player can turn
  const isPipe = (k) => k === 'P' || k === 'X';

  // A level's text to a spec: { id, w, h, kind[], start[] (masks), src, flowers[], turnable[] }.
  function parse(level) {
    const h = level.rows.length, w = level.rows[0].length / 2;
    const kind = [], start = [];
    let src = -1;
    const flowers = [];
    level.rows.forEach((row, y) => {
      for (let x = 0; x < w; x++) {
        const k = row[x * 2], m = parseInt(row[x * 2 + 1], 16) || 0;
        const i = y * w + x;
        kind.push(k);
        start.push(m);
        if (k === 'S') src = i;
        if (k === 'F') flowers.push(i);
      }
    });
    const turnable = kind.map((k, i) => !!TURNS[k] && masks(start[i]).length > 1);
    return { id: level.id, level, w, h, n: w * h, kind, start, src, flowers, turnable };
  }

  const nb = (spec, i, d) => {
    const x = (i % spec.w) + DIRS[d][0], y = Math.floor(i / spec.w) + DIRS[d][1];
    return x < 0 || y < 0 || x >= spec.w || y >= spec.h ? -1 : y * spec.w + x;
  };

  // ---------------------------------------------------------------- where the water goes

  function flow(spec, mask) {
    const wet = new Uint8Array(spec.n), depth = new Int16Array(spec.n).fill(-1), from = new Int8Array(spec.n).fill(-1);
    const order = [], leaks = [];
    if (spec.src < 0) return { wet, depth, from, order, leaks, flowers: 0, done: false };
    wet[spec.src] = 1;
    depth[spec.src] = 0;
    order.push(spec.src);
    for (let q = 0; q < order.length; q++) {
      const i = order[q];
      for (let d = 0; d < 4; d++) {
        if (!(mask[i] & BIT[d])) continue;
        const j = nb(spec, i, d);
        let pours = j >= 0 && !!(mask[j] & DIRS[d][3]);
        // sabotage: water pours into any tile with a pipe, whichever way it faces (the flow check must catch this)
        if (PC.sabotage === 'oneway' && j >= 0 && mask[j]) pours = true;
        if (!pours) {
          leaks.push([i, d]); // a pipe opening onto nothing: it leaks
          continue;
        }
        if (wet[j]) continue;
        wet[j] = 1;
        depth[j] = depth[i] + 1;
        from[j] = (d + 2) % 4; // the side the water came in by
        order.push(j);
      }
    }
    let n = 0;
    for (const f of spec.flowers) n += wet[f];
    return { wet, depth, from, order, leaks, flowers: n, done: n === spec.flowers.length && n > 0 };
  }

  // ---------------------------------------------------------------- the solver

  // Search for masks that water every flower. Tiles are decided in the order the water reaches them: only a tile the
  // water is pouring into gets tried, each of its masks in turn (the one it shows now first). A branch gives up when
  // no undecided tile is being poured into, or when some flower can't be reached even if every undecided tile opened
  // every way. Returns the masks of a whole solution (undecided tiles keep theirs), or null. `limit` caps the work.
  function search(spec, cur, limit = 2e6) {
    const n = spec.n;
    const set = new Int8Array(n); // 1 = decided
    const m = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (!spec.turnable[i]) {
        set[i] = 1;
        m[i] = cur[i];
      }
    }
    const fx = spec.flowers.map((f) => [f % spec.w, Math.floor(f / spec.w)]);
    let work = 0;
    // could the water reach every flower if every undecided tile opened every way?
    const seen = new Uint8Array(n), queue = new Int16Array(n);
    function hopeful() {
      seen.fill(0);
      let a = 0, b = 0;
      queue[b++] = spec.src;
      seen[spec.src] = 1;
      while (a < b) {
        const i = queue[a++];
        const open = set[i] ? m[i] : 15;
        for (let d = 0; d < 4; d++) {
          if (!(open & BIT[d])) continue;
          const j = nb(spec, i, d);
          if (j < 0 || seen[j]) continue;
          if (set[j] && !(m[j] & DIRS[d][3])) continue;
          if (!set[j] && !cur[j]) continue; // grass and rocks never carry water
          seen[j] = 1;
          queue[b++] = j;
        }
      }
      for (const f of spec.flowers) if (!seen[f]) return false;
      return true;
    }
    function dfs() {
      if (++work > limit) return null;
      // the water through the decided tiles only
      const dm = m.map((v, i) => (set[i] ? v : 0));
      const fl = flow(spec, dm);
      if (fl.done) return true;
      if (!hopeful()) return false;
      // the undecided tiles the water is pouring into; try the one nearest a dry flower
      let best = -1, bestD = 1e9;
      for (const i of fl.order) {
        for (let d = 0; d < 4; d++) {
          if (!(dm[i] & BIT[d])) continue;
          const j = nb(spec, i, d);
          if (j < 0 || set[j] || !cur[j]) continue;
          const jx = j % spec.w, jy = Math.floor(j / spec.w);
          let near = 1e9;
          spec.flowers.forEach((f, k) => {
            if (!fl.wet[f]) near = Math.min(near, Math.abs(fx[k][0] - jx) + Math.abs(fx[k][1] - jy));
          });
          if (near < bestD) {
            bestD = near;
            best = j;
          }
        }
      }
      if (best < 0) return false;
      set[best] = 1;
      for (const v of masks(cur[best])) {
        m[best] = v;
        const r = dfs();
        if (r) return true;
        if (r === null) return null;
      }
      set[best] = 0;
      m[best] = 0;
      return false;
    }
    const r = dfs();
    if (!r) return r === null ? { gaveUp: true, work } : null;
    const out = m.map((v, i) => (set[i] ? v : cur[i]));
    out.work = work;
    return out;
  }

  // From whole-board masks that water every flower: the edges each tile must open, on the paths from the tap to the
  // flowers (water that goes anywhere else doesn't matter). { need: Int8Array, cells: [tiles in water order], depth }
  function planFrom(spec, full) {
    const fl = flow(spec, full);
    if (!fl.done) return null;
    const need = new Int8Array(spec.n);
    const on = new Uint8Array(spec.n);
    for (const f of spec.flowers) {
      // walk back from the flower to the tap along the way the water came
      let i = f;
      on[i] = 1;
      while (i !== spec.src) {
        const d = fl.from[i];
        const j = nb(spec, i, d);
        need[i] |= BIT[d];
        need[j] |= DIRS[d][3];
        i = j;
        on[i] = 1;
      }
    }
    const cells = fl.order.filter((i) => on[i]);
    return { need, cells, depth: fl.depth };
  }

  function solve(spec, cur, limit) {
    const full = search(spec, cur, limit);
    if (!full || full.gaveUp) return null;
    const plan = planFrom(spec, full);
    if (plan) plan.work = full.work;
    return plan;
  }

  // how many tiles the plan needs that don't open its way yet
  function wrong(spec, cur, plan) {
    let n = 0;
    for (const i of plan.cells) if ((cur[i] & plan.need[i]) !== plan.need[i]) n++;
    return n;
  }

  // clockwise turns a plan needs from these masks (the stars' par)
  function turnsFor(spec, cur, plan) {
    let n = 0;
    for (const i of plan.cells) n += Math.max(0, turnsTo(cur[i], plan.need[i]));
    return n;
  }

  // The brother's help: the first tile along the water's way (from the tap) that the plan needs turned.
  // { i, to (its new mask), turns } or null when there's nothing to turn.
  function fix(spec, cur, plan) {
    if (!plan) return null;
    for (const i of plan.cells) {
      if ((cur[i] & plan.need[i]) === plan.need[i]) continue;
      if (!spec.turnable[i]) continue;
      const t = turnsTo(cur[i], plan.need[i]);
      if (PC.sabotage === 'lazy') return { i, to: rot(cur[i]), turns: 1 }; // sabotage: one quarter turn, right or not
      return { i, to: rotN(cur[i], t), turns: t };
    }
    return null;
  }

  // A plan for the board as it is now: keep the old one unless a fresh search needs fewer tiles turned.
  function replan(spec, cur, old) {
    const fresh = solve(spec, cur);
    if (!old) return fresh;
    if (!fresh) return old;
    return wrong(spec, cur, fresh) < wrong(spec, cur, old) ? fresh : old;
  }

  // a seeded random number generator (the checks and the level maker)
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
  }

  // stars for a level: 3 near the par, 2 up to about twice it, 1 for any win
  function stars(par, taps) {
    if (taps <= par + 2 + Math.floor(par / 5)) return 3;
    if (taps <= par * 2 + 4) return 2;
    return 1;
  }
  const goal = (par) => par + 2 + Math.floor(par / 5);

  Object.assign(PC, { DIRS, BIT, OPP, rot, rotN, masks, turnsTo, bits, isPipe, parse, nb, flow, search, planFrom, solve, wrong, turnsFor, fix, replan, rng, stars, goal });
})();
