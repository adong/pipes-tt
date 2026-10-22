/* TT Pipe Connect: the game's own sounds, built on Kit.sound.tone / hiss (all synthesised, no files).
   PC.sfx.kit(name, ...args) plays a kit effect; the rest are ours. Every call is a silent no-op until
   Kit.sound.init() has run from the first tap. */
(function () {
  'use strict';
  const PC = (window.PC = window.PC || {});
  const S = Kit.sound;
  const tone = (o) => S.tone(o);
  const hiss = (o) => S.hiss(o);

  const sfx = {
    kit(name, ...args) {
      if (S[name]) S[name](...args);
    },
    // a pipe turns a quarter: a metal clunk with a little squeak
    turn() {
      tone({ type: 'triangle', f: 520, to: 380, dur: 0.07, vol: 0.1 });
      tone({ type: 'square', f: 1400, to: 1700, dur: 0.04, vol: 0.02, lp: 2600, at: 0.03 });
      hiss({ filter: 'bandpass', f: 2200, q: 2, dur: 0.05, vol: 0.04 });
    },
    // a tile that doesn't turn: a gentle bonk
    nope() {
      tone({ f: 220, dur: 0.08, vol: 0.08 });
      tone({ f: 180, dur: 0.1, vol: 0.08, at: 0.09 });
    },
    // water rushes on through the pipes: a soft gurgle
    gurgle() {
      hiss({ filter: 'bandpass', f: 600, to: 1400, q: 3, dur: 0.35, vol: 0.06 });
      [0, 0.08, 0.17].forEach((at, i) => tone({ type: 'sine', f: 300 + i * 90, to: 520 + i * 120, dur: 0.07, vol: 0.05, at }));
    },
    // a flower gets water and pops open: a rising chime
    bloom(k = 0) {
      const base = [784, 880, 988, 1047, 1175][k % 5];
      [1, 1.25, 1.5].forEach((m, i) => tone({ type: 'triangle', f: base * m, at: i * 0.07, dur: 0.22, vol: 0.09 }));
      hiss({ filter: 'highpass', f: 5000, dur: 0.2, vol: 0.03 });
    },
    // the cursor moves
    tick() { tone({ type: 'square', f: 1200, dur: 0.025, vol: 0.025, lp: 3000 }); },
    // the fanfare, then one ding per star
    win(stars = 3) {
      [523, 659, 784].forEach((f) => tone({ type: 'triangle', f: f * 2, at: 0.0, dur: 0.6, vol: 0.07 }));
      hiss({ filter: 'highpass', f: 6000, dur: 0.5, vol: 0.05 });
      for (let i = 0; i < stars; i++) tone({ type: 'triangle', f: 988 + i * 260, at: 0.55 + i * 0.28, dur: 0.3, vol: 0.1 });
    },
    // the other side won the race: a soft wah-wah, never harsh
    lose() {
      [392, 370, 349, 311].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.22, dur: i === 3 ? 0.5 : 0.22, vol: 0.09 }));
    },
    // 3, 2, 1, GO
    beep(go) { tone({ type: 'square', f: go ? 1046 : 523, dur: go ? 0.35 : 0.15, vol: 0.06, lp: 3200 }); },
    // your brother turns a pipe for you
    magic() { [660, 880, 1320, 1760].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.05, dur: 0.16, vol: 0.07 })); },
    // your brother pops in (and out)
    pop() {
      tone({ f: 300, to: 900, dur: 0.12, vol: 0.1 });
      hiss({ f: 2000, to: 6000, dur: 0.15, vol: 0.05 });
    },
    // the high five: a clap
    clap() {
      hiss({ filter: 'bandpass', f: 1500, q: 0.8, dur: 0.09, vol: 0.22 });
      hiss({ filter: 'highpass', f: 3000, dur: 0.05, vol: 0.1, at: 0.01 });
    },
    // Froggy or Foxy turns a pipe: a ribbit or a yip
    think(fox) {
      if (fox) [880, 1175].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.06, vol: 0.04, at: i * 0.08 }));
      else tone({ type: 'square', f: 180, to: 140, dur: 0.12, vol: 0.04, lp: 900 });
    },
  };

  PC.sfx = sfx;
})();
