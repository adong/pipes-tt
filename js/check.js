/* TT Pipe Connect: the headless check of the rules (no page needed: tools/check.js runs it in Node, game.check() in the page).
     levels   40 levels, 20 a tier; each a proper garden (one tap and flowers with one opening each, at most 7 x 7); no
              flower has water at the start; the solver (js/rules.js) finds a way to water every flower, and setting
              its pipes really does (PC.flow); the 3 stars are in reach (playing the brother's help needs no more turns
              than the 3-star goal)
     flow     the water: hand-made gardens with known answers, then thousands of random gardens where PC.flow must
              agree with a separate union-find of the pipes that face each other (which tiles are wet, which flowers,
              done or not, and every leak is a wet pipe opening onto nothing)
     help     the brother's help, from the start and from gardens after random taps: each pipe he turns brings the
              pipes the plan still needs down by exactly one, he only turns pipes that turn, and he always finishes
     board    the garden you play (js/board.js, with a stand-in for the 3D view): a tap turns a pipe a quarter and
              counts, bolted tiles refuse, the win comes once, the brother's turns don't count as taps, restart works
   PC.check({ sabotage, quick, seed }) returns { ok, groups: { name: { pass, fail, notes } }, failures: [...] }.
   Sabotage proves the check can fail: 'oneway' (water pours into a pipe whichever way it faces), 'stuck' (a level
   whose flower is walled in by rocks), 'lazy' (the brother turns a pipe one quarter, right or not). */
(function () {
  'use strict';
  const PC = (globalThis.PC = globalThis.PC || {});

  function check(opts = {}) {
    const sab = opts.sabotage || '';
    const quick = !!opts.quick;
    const rnd = PC.rng(opts.seed || 4242);
    const ri = (n) => Math.floor(rnd() * n);
    const groups = {};
    const failures = [];
    const group = (name) => (groups[name] = groups[name] || { pass: 0, fail: 0, notes: [] });
    const ok = (name, cond, msg) => {
      const g = group(name);
      if (cond) g.pass++;
      else {
        g.fail++;
        if (failures.length < 30) failures.push(`${name}: ${msg}`);
      }
      return cond;
    };
    PC.sabotage = sab === 'oneway' || sab === 'lazy' ? sab : '';
    let levels = PC.LEVELS.slice();
    if (sab === 'stuck') {
      // a flower behind rocks: no pipe can ever reach it
      levels = levels.concat([{ id: 'stuck', tier: 'easy', par: 2, rows: ['S2P5R0', 'P3P9R0', 'R0R0F2'] }]);
    }
    // the flow first (the solver stands on it), and a sabotaged run stops at the first group that fails
    const failed = () => sab && Object.values(groups).some((g) => g.fail > 0);
    try {
      for (const run of [checkFlow, () => checkLevels(levels), () => checkHelp(levels), checkBoard]) {
        run();
        if (failed()) break;
      }
    } finally {
      PC.sabotage = '';
    }

    // ------------------------------------------------------------ levels
    function checkLevels(list) {
      const tiers = { easy: 0, normal: 0 };
      for (const lv of list) if (tiers[lv.tier] !== undefined) tiers[lv.tier]++;
      if (sab !== 'stuck') {
        ok('levels', PC.LEVELS.length === 40, `${PC.LEVELS.length} levels, not 40`);
        ok('levels', PC.LEVELS.filter((l) => l.tier === 'easy').length === 20, 'not 20 EASY levels');
        ok('levels', new Set(PC.LEVELS.map((l) => l.id)).size === PC.LEVELS.length, 'two levels share an id');
      }
      let solved = 0, maxWork = 0;
      for (const lv of list) {
        const s = PC.parse(lv);
        const id = lv.id;
        ok('levels', s.w >= 3 && s.h >= 3 && s.w <= 7 && s.h <= 7 && lv.rows.every((r) => r.length === s.w * 2), `${id}: size ${s.w} x ${s.h}`);
        ok('levels', s.kind.filter((k) => k === 'S').length === 1 && PC.bits(s.start[s.src]) === 1, `${id}: not one tap with one opening`);
        ok('levels', s.flowers.length >= 1 && s.flowers.every((f) => PC.bits(s.start[f]) === 1), `${id}: a flower without exactly one opening`);
        ok('levels', s.kind.every((k, i) => ('.R'.includes(k) ? s.start[i] === 0 : s.start[i] > 0)), `${id}: grass with a pipe, or a pipe with no openings`);
        const fl = PC.flow(s, s.start);
        ok('levels', fl.flowers === 0, `${id}: a flower has water at the start`);
        const plan = PC.solve(s, s.start);
        if (!ok('levels', !!plan, `${id}: the solver found no way to water every flower`)) continue;
        maxWork = Math.max(maxWork, plan.work);
        // set the plan's pipes the shortest way round and look at the water
        const m = s.start.slice();
        for (const i of plan.cells) {
          const t = PC.turnsTo(m[i], plan.need[i]);
          if (t > 0 && s.turnable[i]) m[i] = PC.rotN(m[i], t);
        }
        const after = PC.flow(s, m);
        if (ok('levels', after.done, `${id}: the solver's pipes don't water every flower`)) solved++;
        // the stars: playing the brother's help from the start needs no more turns than the 3-star goal
        const b = PC.makeBoard(lv, stubView());
        let turns = 0;
        for (let k = 0; k < 400 && !b.won; k++) {
          const f = b.nextFix();
          if (!f) break;
          turns += f.turns;
          b.turn(f.i, f.turns, 'test');
        }
        ok('levels', b.won && turns <= PC.goal(lv.par), `${id}: the help took ${turns} turns, the 3-star goal is ${PC.goal(lv.par)}`);
      }
      group('levels').notes.push(`${solved} of ${list.length} levels watered by the solver (most search steps: ${maxWork})`);
      const ladder = PC.LEVELS.filter((l) => l.tier === 'easy').map((l) => PC.parse(l).n);
      ok('levels', ladder.every((n, k) => k === 0 || n >= ladder[k - 1] - 6), 'EASY gardens shrink a lot along the ladder');
    }

    // ------------------------------------------------------------ flow
    function checkFlow() {
      // hand-made gardens: S2 = a tap opening east, F8 = a flower opening west
      const cases = [
        { rows: ['S2PaF8'], done: true, wet: [1, 1, 1] },
        { rows: ['S2P5F8'], done: false, wet: [1, 0, 0] }, // the middle pipe stands up and down
        { rows: ['S2P6..', '..P1F8'], done: false, wet: [1, 0, 0, 0, 0, 0] }, // the corner faces away from the tap
        { rows: ['S2Pc..', '..P1F8'], done: false, wet: [1, 1, 0, 0, 1, 0] }, // the pipe below points up only
        { rows: ['S2Pc..', '..P3F8'], done: true, wet: [1, 1, 0, 0, 1, 1] },
        { rows: ['S2PeF8', '..P5..', '..F1..'], done: true, wet: [1, 1, 1, 0, 1, 0, 0, 1, 0] },
        { rows: ['S2PeF8', '..PaR0', '..F1..'], done: false, wet: [1, 1, 1, 0, 0, 0, 0, 0, 0] }, // the second flower's pipe lies sideways
        { rows: ['S4P5', 'PaF1', 'F2..'], done: false, wet: [1, 0, 0, 0, 0, 0] }, // the tap pours down into a sideways pipe
      ];
      for (const c of cases) {
        const s = PC.parse({ id: 'case', rows: c.rows });
        const fl = PC.flow(s, s.start);
        ok('flow', fl.done === c.done, `${c.rows.join('/')}: done ${fl.done}, expected ${c.done}`);
        ok('flow', Array.from(fl.wet).join('') === c.wet.join(''), `${c.rows.join('/')}: wet ${Array.from(fl.wet).join('')}, expected ${c.wet.join('')}`);
      }
      // random gardens against a union-find of the pipes that face each other
      const n = quick ? 600 : 4000;
      let agreed = 0, dones = 0;
      for (let t = 0; t < n; t++) {
        const w = 2 + ri(6), h = 2 + ri(6), cells = w * h;
        const kinds = [], masks = [];
        for (let i = 0; i < cells; i++) {
          const r = rnd();
          kinds.push(r < 0.15 ? '.' : 'P');
          masks.push(r < 0.15 ? 0 : 1 + ri(15));
        }
        const src = ri(cells);
        kinds[src] = 'S';
        const fl = [];
        for (let k = 0; k < 1 + ri(3); k++) {
          const f = ri(cells);
          if (f !== src && kinds[f] !== 'F') {
            kinds[f] = 'F';
            masks[f] = [1, 2, 4, 8][ri(4)];
            fl.push(f);
          }
        }
        if (!fl.length) continue;
        if (!masks[src]) masks[src] = 1 + ri(15);
        const rows = [];
        for (let y = 0; y < h; y++) rows.push(Array.from({ length: w }, (_, x) => kinds[y * w + x] + masks[y * w + x].toString(16)).join(''));
        const s = PC.parse({ id: 'rand', rows });
        const got = PC.flow(s, s.start);
        // union-find: join every pair of neighbours whose openings face each other
        const up = Array.from({ length: cells }, (_, i) => i);
        const find = (a) => (up[a] === a ? a : (up[a] = find(up[a])));
        for (let i = 0; i < cells; i++) {
          const x = i % w, y = Math.floor(i / w);
          if (x + 1 < w && masks[i] & 2 && masks[i + 1] & 8) up[find(i)] = find(i + 1);
          if (y + 1 < h && masks[i] & 4 && masks[i + w] & 1) up[find(i)] = find(i + w);
        }
        const root = find(src);
        let same = true, leaksOk = true;
        for (let i = 0; i < cells; i++) if (!!got.wet[i] !== (find(i) === root)) same = false;
        const want = fl.every((f) => find(f) === root);
        if (want) dones++;
        // every leak is a wet tile's opening with nothing facing back; every such opening is a leak
        const leakSet = new Set(got.leaks.map(([i, d]) => i * 4 + d));
        for (let i = 0; i < cells; i++) {
          if (find(i) !== root) continue;
          for (let d = 0; d < 4; d++) {
            if (!(masks[i] & PC.BIT[d])) continue;
            const j = PC.nb(s, i, d);
            const open = j < 0 || !(masks[j] & PC.DIRS[d][3]);
            if (open !== leakSet.has(i * 4 + d)) leaksOk = false;
          }
        }
        const good = ok('flow', same && got.done === want && got.flowers === fl.filter((f) => find(f) === root).length && leaksOk,
          `random ${w} x ${h} garden ${rows.join('/')}: PC.flow and the union-find disagree`);
        if (good) agreed++;
        if (failures.length >= 30) break;
      }
      group('flow').notes.push(`${agreed} random gardens agreed with the union-find (${dones} had every flower watered)`);
    }

    // ------------------------------------------------------------ the brother's help
    function checkHelp(list) {
      let fixes = 0, starts = 0, maxWork = 0;
      const walks = quick ? 2 : 6;
      for (const lv of list) {
        if (lv.id === 'stuck') continue;
        const s = PC.parse(lv);
        for (let w = 0; w <= walks; w++) {
          // from the start (w = 0), then after some random taps
          const m = s.start.slice();
          const turnable = s.kind.map((k, i) => i).filter((i) => s.turnable[i]);
          const taps = w === 0 ? 0 : 1 + ri(3 * turnable.length);
          for (let k = 0; k < taps; k++) {
            const i = turnable[ri(turnable.length)];
            m[i] = PC.rot(m[i]);
          }
          if (PC.flow(s, m).done) continue;
          starts++;
          let plan = PC.replan(s, m, null);
          if (!ok('help', !!plan, `${lv.id}: no plan after ${taps} random taps`)) continue;
          maxWork = Math.max(maxWork, plan.work || 0);
          let left = PC.wrong(s, m, plan), steps = 0;
          while (!PC.flow(s, m).done && steps < 200) {
            plan = PC.replan(s, m, plan);
            const before = PC.wrong(s, m, plan);
            const f = PC.fix(s, m, plan);
            if (!ok('help', !!f, `${lv.id}: no pipe to turn, but the flowers are dry`)) break;
            ok('help', s.turnable[f.i], `${lv.id}: he turned tile ${f.i}, which doesn't turn`);
            ok('help', f.to === PC.rotN(m[f.i], f.turns), `${lv.id}: the turn count doesn't match the new mask`);
            m[f.i] = f.to;
            const after = PC.wrong(s, m, plan);
            if (!ok('help', after === before - 1, `${lv.id}: a turn took the pipes still needed from ${before} to ${after}`)) break;
            fixes++;
            steps++;
          }
          ok('help', PC.flow(s, m).done && steps <= left, `${lv.id}: the help didn't finish in ${left} turns (${steps})`);
          if (failures.length >= 30) return;
        }
      }
      group('help').notes.push(`${fixes} pipes turned from ${starts} gardens (most search steps: ${maxWork})`);
    }

    // ------------------------------------------------------------ the board you play
    function checkBoard() {
      const lv = PC.LEVELS.find((l) => l.id === 'e4');
      const view = stubView();
      let wins = 0, nopes = 0;
      const b = PC.makeBoard(lv, view, { onWin: () => wins++, onNope: () => nopes++ });
      const s = b.spec;
      const pipe = s.kind.findIndex((k, i) => s.turnable[i]);
      const before = b.mask[pipe];
      ok('board', b.tap(pipe) && b.mask[pipe] === PC.rot(before) && b.taps === 1, 'a tap did not turn a pipe a quarter and count it');
      ok('board', !b.tap(s.src) && nopes === 1 && b.taps === 1, 'the tap tile turned');
      const fixed = s.kind.findIndex((k, i) => !s.turnable[i] && k !== 'S');
      if (fixed >= 0) ok('board', !b.tap(fixed) && b.taps === 1, 'a fixed tile turned');
      // the keyboard square: Space shows it, then turns the tile under it
      ok('board', b.key('turn', 0) && b.shown[0], 'Space did not show the square');
      b.restart();
      ok('board', b.taps === 0 && b.mask.join() === s.start.join() && !b.won, 'restart did not reset the garden');
      let n = 0;
      while (!b.won && n++ < 100) b.help('buddy');
      ok('board', b.won && wins === 1 && b.taps === 0 && b.helps > 0, `the brother's help: won ${b.won}, wins ${wins}, taps ${b.taps}`);
      ok('board', !b.tap(pipe) && wins === 1, 'a tap after the win still turned a pipe');
      ok('board', view.calls.water > 0 && view.calls.turn > 0, 'the view was never told');
    }

    const all = Object.values(groups);
    return { ok: all.every((g) => g.fail === 0) && all.length >= 4, sabotage: sab || null, groups, failures };
  }

  // a stand-in for the 3D view
  function stubView() {
    const calls = { turn: 0, water: 0, cursor: 0, hint: 0 };
    return { calls, busy: false, turn() { calls.turn++; }, water() { calls.water++; }, cursor() { calls.cursor++; }, hint() { calls.hint++; }, reset() {} };
  }

  PC.check = check;
})();
