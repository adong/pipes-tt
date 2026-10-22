/* TT Pipe Connect: one garden you play, with no Three.js in it (the checks drive it with a stand-in view).
   PC.makeBoard(level, view, opts) keeps the pipes' masks, the taps, the keyboard squares (one per player) and the plan
   the brother's help follows, and turns taps, keys and help into quarter turns through PC.rot. After every turn it
   works out the water again (PC.flow) and tells the view, and calls onWin once when every flower has water.
     opts: canAct()  may the player turn pipes now
           onTurn(info, B)  a pipe turned: { i, by, turns }      onNope(i, B)  a tile that doesn't turn was tapped
           onBloom(list, B) flowers that just got water           onWin(B)  every flower has water
   The view (js/grid.js, or the checks' stand-in) gets: turn(i, mask, n, by), water(flow, by), cursor(p, i, shown),
   hint(i or null), and has .busy while a pipe is still turning. */
(function () {
  'use strict';
  const PC = (globalThis.PC = globalThis.PC || {});

  function makeBoard(level, view, opts = {}) {
    const spec = PC.parse(level);
    const B = {
      level, spec, view, k: 0, human: true, won: false, taps: 0, helps: 0,
      mask: spec.start.slice(), flow: null, plan: null, cursor: [0, 0], shown: [false, false],
    };
    const can = () => (opts.canAct ? opts.canAct(B) : true);

    function start() {
      B.mask = spec.start.slice();
      B.taps = 0;
      B.helps = 0;
      B.won = false;
      B.plan = null;
      B.flow = PC.flow(spec, B.mask);
      // both squares start on the first tile after the tap
      const d = [0, 1, 2, 3].find((dd) => spec.start[spec.src] & PC.BIT[dd]);
      const j = PC.nb(spec, spec.src, d === undefined ? 1 : d);
      B.cursor = [j < 0 ? 0 : j, j < 0 ? 0 : j];
      B.shown = [false, false];
      if (view.reset) view.reset(B);
      view.water(B.flow, 'start');
    }

    // turn tile i a quarter clockwise n times; by: 'you' (a tap or a key), 'buddy', 'cpu', 'demo', 'test'
    function turn(i, n = 1, by = 'you') {
      if (!spec.turnable[i] || n < 1) return false;
      for (let k = 0; k < n; k++) B.mask[i] = PC.rot(B.mask[i]);
      if (by === 'you' || by === 'cpu' || by === 'test') B.taps++;
      if (by === 'buddy') B.helps++;
      view.turn(i, B.mask[i], n, by);
      const was = B.flow;
      B.flow = PC.flow(spec, B.mask);
      view.water(B.flow, by);
      const bloomed = spec.flowers.filter((f) => B.flow.wet[f] && !was.wet[f]);
      if (opts.onTurn) opts.onTurn({ i, by, turns: n }, B);
      if (bloomed.length && opts.onBloom) opts.onBloom(bloomed, B);
      if (B.flow.done && !B.won) {
        B.won = true;
        view.hint(null);
        if (opts.onWin) opts.onWin(B);
      }
      return true;
    }

    // a tap (or Space on the keyboard square) on tile i
    function tap(i, by = 'you') {
      if (B.won || !can() || i < 0 || i >= spec.n) return false;
      if (!spec.turnable[i]) {
        if (opts.onNope) opts.onNope(i, B);
        return false;
      }
      return turn(i, 1, by);
    }

    // the keyboard: player p's square moves, or turns the pipe under it
    function key(act, p = 0) {
      if (B.won || !can()) return false;
      if (act === 'turn') {
        if (!B.shown[p]) {
          B.shown[p] = true;
          view.cursor(p, B.cursor[p], true);
          return true;
        }
        return tap(B.cursor[p]);
      }
      const d = { up: 0, right: 1, down: 2, left: 3 }[act];
      if (d === undefined) return false;
      if (B.shown[p]) {
        const j = PC.nb(spec, B.cursor[p], d);
        if (j < 0) return false;
        B.cursor[p] = j;
      }
      B.shown[p] = true;
      view.cursor(p, B.cursor[p], true);
      return true;
    }
    function hideCursors() {
      for (const p of [0, 1]) {
        if (B.shown[p]) view.cursor(p, B.cursor[p], false);
        B.shown[p] = false;
      }
    }

    // The brother's help (and Froggy's and Foxy's moves): the next pipe the plan needs, without turning it yet.
    function nextFix() {
      if (B.won) return null;
      B.plan = PC.replan(spec, B.mask, B.plan);
      return PC.fix(spec, B.mask, B.plan);
    }
    // turn it the whole way (the brother) or one quarter (a friend in the race)
    function help(by = 'buddy', f = nextFix()) {
      if (!f) return null;
      turn(f.i, by === 'buddy' ? f.turns : 1, by);
      return f;
    }

    start();
    return Object.assign(B, { start, restart: start, turn, tap, key, hideCursors, nextFix, help });
  }

  PC.makeBoard = makeBoard;
})();
