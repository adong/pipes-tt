/* TT Pipe Connect: one garden bed in 3D, the view for js/board.js.
   PC.makeGrid(spec, opts) builds a wooden bed of tiles: cream tiles carry pipes you can turn, grey ones bolted pipes,
   green ones grass (some with a rock), the blue water tank (🚰) and the flower pots. Pipes are chunky grey tubes that
   turn blue as the water runs through them, tile by tile from the tap, and a flower's sprout (🌱) pops into a bloom
   when the water gets there. Pipes that open onto nothing drip 💧.
     turn(i, mask, n, by)   spin tile i n quarter turns          water(flow, by)   run (or drain) the water to match
     cursor(p, i, shown)    player p's keyboard square            hint(i | null)    the brother's gold square and 👇
     nope(i)                a fixed tile wiggles                  pick(ray)         the tile under a ray, or -1
     cellWorld(i, out)      a tile's centre in the world          bloomed()         how many flowers are in bloom
   opts: flyers (for 💧 and ⭐), onBloom(i) when a flower pops open, color (the race's frame colour). */
(function () {
  'use strict';
  const T = THREE;
  const PC = (window.PC = window.PC || {});
  const { std, emojiTexture, rand } = Kit.gfx;

  const TOP = 0.42; // the top of the tiles
  const PY = TOP + 0.17; // the pipes' middle
  const R = 0.15; // a pipe's radius
  const STEP = 0.085; // seconds for the water to cross a tile
  const BLOOMS = ['🌷', '🌻', '🌼', '🌸', '🌺'];

  // ---------------------------------------------------------------- shared geometry and materials
  let G = null;
  function shared() {
    if (G) return G;
    const box = (w, h, d) => new T.BoxGeometry(w, h, d);
    // an arm points north (-z) from the tile's middle to its edge
    const arm = new T.CylinderGeometry(R, R, 0.5, 14);
    arm.rotateX(Math.PI / 2);
    arm.translate(0, 0, -0.25);
    // the water: a slightly fatter blue tube, 0 to -1 along z, scaled to the length that's wet
    const water = new T.CylinderGeometry(R + 0.025, R + 0.025, 1, 14);
    water.rotateX(Math.PI / 2);
    water.translate(0, 0, -0.5);
    const collar = new T.CylinderGeometry(R + 0.045, R + 0.045, 0.08, 14);
    collar.rotateX(Math.PI / 2);
    collar.translate(0, 0, -0.46);
    G = {
      tile: box(0.9, 0.16, 0.9), arm, water, collar,
      hub: new T.SphereGeometry(R + 0.03, 16, 12), hubWet: new T.SphereGeometry(R + 0.055, 16, 12),
      bolt: new T.CylinderGeometry(0.045, 0.045, 0.03, 8),
      tuft: new T.ConeGeometry(0.045, 0.16, 5),
      rock: new T.DodecahedronGeometry(0.26, 0),
      tank: new T.CylinderGeometry(0.33, 0.36, 0.56, 22), tankTop: new T.CylinderGeometry(0.3, 0.3, 0.02, 22), band: new T.TorusGeometry(0.35, 0.025, 6, 24),
      pot: new T.CylinderGeometry(0.27, 0.2, 0.32, 18), potRim: new T.TorusGeometry(0.27, 0.04, 8, 20), soil: new T.CylinderGeometry(0.24, 0.24, 0.02, 18),
      frameBar: box(1, 1, 1),
      mats: {
        tile: std('#fbefcf', { roughness: 0.75 }), bolted: std('#b9c4d2', { roughness: 0.7 }), grass: std('#8edc63', { roughness: 0.95 }),
        tuft: std('#5cb83c'), rock: std('#9aa3ad', { roughness: 0.9, flatShading: true }), boltHead: std('#6b7a8c', { metalness: 0.4, roughness: 0.4 }),
        pipe: std('#dde4ec', { roughness: 0.35, metalness: 0.15 }), pipeFixed: std('#9eabbb', { roughness: 0.4, metalness: 0.2 }),
        collar: std('#7d8ea3', { roughness: 0.35, metalness: 0.3 }),
        water: std('#23a0ff', { roughness: 0.2, emissive: '#0b5cbf', emissiveIntensity: 0.35 }),
        tank: std('#3d8bff', { roughness: 0.5 }), tankTop: std('#8fdcff', { emissive: '#2a9dff', emissiveIntensity: 0.25 }), band: std('#ffffff', { roughness: 0.4 }),
        pot: std('#e2733c', { roughness: 0.8 }), soil: std('#6b4423', { roughness: 1 }),
        wood: std('#b77b42', { roughness: 0.8 }), bed: std('#6d4b2c', { roughness: 1 }),
      },
    };
    return G;
  }

  function frameMat(color) {
    const m = new T.MeshBasicMaterial({ color, transparent: true, depthWrite: false });
    return m;
  }
  // a square outline from four flat bars, for the keyboard squares and the brother's gold square
  function square(color, size = 0.98, thick = 0.08) {
    const g = new T.Group();
    const mat = frameMat(color);
    const geoH = new T.BoxGeometry(size, 0.04, thick), geoV = new T.BoxGeometry(thick, 0.04, size);
    for (const [geo, x, z] of [[geoH, 0, -size / 2], [geoH, 0, size / 2], [geoV, -size / 2, 0], [geoV, size / 2, 0]]) {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, 0, z);
      m.renderOrder = 5;
      g.add(m);
    }
    g.visible = false;
    return g;
  }

  function makeGrid(spec, opts = {}) {
    const S = shared(), M = S.mats;
    const group = new T.Group();
    const w = spec.w, h = spec.h;
    const size = { w: w + 0.5, h: h + 0.5 };
    const cx = (i) => (i % w) - (w - 1) / 2, cz = (i) => Math.floor(i / w) - (h - 1) / 2;

    // the wooden bed
    const bed = new T.Mesh(S.frameBar, M.bed);
    bed.scale.set(w + 0.2, 0.3, h + 0.2);
    bed.position.y = 0.17;
    group.add(bed);
    const rim = opts.color ? std(opts.color, { roughness: 0.6 }) : M.wood;
    for (const [sx, sz, x, z] of [[w + 0.5, 0.15, 0, -(h + 0.35) / 2], [w + 0.5, 0.15, 0, (h + 0.35) / 2], [0.15, h + 0.2, -(w + 0.35) / 2, 0], [0.15, h + 0.2, (w + 0.35) / 2, 0]]) {
      const b = new T.Mesh(S.frameBar, rim);
      b.scale.set(sx, 0.48, sz);
      b.position.set(x, 0.24, z);
      group.add(b);
    }

    const tiles = [];
    const tmp = new T.Vector3();
    for (let i = 0; i < spec.n; i++) {
      const k = spec.kind[i], m0 = spec.start[i];
      const g = new T.Group();
      g.position.set(cx(i), 0, cz(i));
      group.add(g);
      const grassy = k === '.' || k === 'R';
      const slab = new T.Mesh(S.tile, grassy ? M.grass : k === 'X' || (k === 'P' && !spec.turnable[i]) ? M.bolted : k === 'P' ? M.tile : M.grass);
      slab.position.y = TOP - 0.08;
      g.add(slab);
      const t = { i, k, g, slab, pipes: new T.Group(), arms: [], hubWet: null, r: 0, rot: 0, rotTo: 0, wet: false, from: -1, u: 0, delay: 0, leaks: [], wig: 0, press: 0, plant: null, bloom: false, bloomT: 0 };
      t.pipes.position.y = PY;
      g.add(t.pipes);
      if (grassy) {
        for (let n = 0; n < 3; n++) {
          const tf = new T.Mesh(S.tuft, M.tuft);
          tf.position.set(rand(-0.3, 0.3), TOP + 0.06, rand(-0.3, 0.3));
          g.add(tf);
        }
        if (k === 'R') {
          const r = new T.Mesh(S.rock, M.rock);
          r.position.y = TOP + 0.14;
          r.rotation.set(rand(0, 3), rand(0, 3), 0);
          r.scale.set(1.15, 0.8, 1);
          g.add(r);
        }
      }
      const fixed = k === 'X' || (k === 'P' && !spec.turnable[i]);
      if (fixed) {
        for (const [bx, bz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
          const b = new T.Mesh(S.bolt, M.boltHead);
          b.position.set(bx, TOP + 0.01, bz);
          g.add(b);
        }
      }
      // the arms, for the openings it starts with; the whole pipe group turns
      if (m0) {
        const pm = fixed || k === 'S' || k === 'F' ? M.pipeFixed : M.pipe;
        for (let d = 0; d < 4; d++) {
          if (!(m0 & PC.BIT[d])) continue;
          const a = new T.Group();
          a.rotation.y = -d * Math.PI / 2;
          a.add(new T.Mesh(S.arm, pm));
          a.add(new T.Mesh(S.collar, M.collar));
          const wm = new T.Mesh(S.water, M.water);
          wm.visible = false;
          a.add(wm);
          t.pipes.add(a);
          t.arms.push({ d, water: wm });
        }
        if (k === 'P' || k === 'X') {
          t.pipes.add(new T.Mesh(S.hub, pm));
          t.hubWet = new T.Mesh(S.hubWet, M.water);
          t.hubWet.visible = false;
          t.pipes.add(t.hubWet);
        }
      }
      if (k === 'S') {
        const tank = new T.Mesh(S.tank, M.tank);
        tank.position.y = TOP + 0.28;
        g.add(tank);
        const top = new T.Mesh(S.tankTop, M.tankTop);
        top.position.y = TOP + 0.565;
        g.add(top);
        for (const y of [0.12, 0.44]) {
          const band = new T.Mesh(S.band, M.band);
          band.rotation.x = Math.PI / 2;
          band.position.y = TOP + y;
          g.add(band);
        }
        const sign = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('🚰'), transparent: true, depthWrite: false }));
        sign.scale.setScalar(0.58);
        sign.position.y = TOP + 0.86;
        sign.renderOrder = 6;
        g.add(sign);
        t.sign = sign;
      }
      if (k === 'F') {
        const pot = new T.Mesh(S.pot, M.pot);
        pot.position.y = TOP + 0.16;
        g.add(pot);
        const prim = new T.Mesh(S.potRim, M.pot);
        prim.rotation.x = Math.PI / 2;
        prim.position.y = TOP + 0.32;
        g.add(prim);
        const soil = new T.Mesh(S.soil, M.soil);
        soil.position.y = TOP + 0.3;
        g.add(soil);
        const plant = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('🌱'), transparent: true, depthWrite: false }));
        plant.center.set(0.5, 0.08);
        plant.position.y = TOP + 0.3;
        plant.scale.setScalar(0.55);
        plant.renderOrder = 6;
        g.add(plant);
        t.plant = plant;
        t.flower = BLOOMS[spec.flowers.indexOf(i) % BLOOMS.length];
      }
      tiles.push(t);
    }

    const cursors = [square('#ffd400', 1.0, 0.09), square('#18d4ff', 0.84, 0.09)];
    for (const c of cursors) group.add(c);
    const gold = square('#ffb000', 1.04, 0.13);
    group.add(gold);
    const point = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('👇'), transparent: true, depthWrite: false, depthTest: false }));
    point.scale.setScalar(0.75);
    point.visible = false;
    point.renderOrder = 23;
    group.add(point);

    const V = {
      group, size, spec, tiles, hinted: null, clock: 0,
      get busy() { return tiles.some((t) => t.rot !== t.rotTo); },
    };

    // ---------------------------------------------------------------- actions

    V.turn = (i, mask, n = 1, by = 'you') => {
      const t = tiles[i];
      t.r += n;
      t.rotTo = -t.r * Math.PI / 2;
      t.speed = by === 'buddy' ? 9 : 14; // radians a second
      t.press = 1;
      if (by === 'buddy' && opts.flyers) {
        tmp.set(cx(i), PY + 0.3, cz(i));
        group.localToWorld(tmp);
        for (let k = 0; k < 8; k++) opts.flyers.add(k % 2 ? '⭐' : '✨', tmp.x, tmp.y, tmp.z, rand(-1.6, 1.6), rand(1, 2.6), 0.32, 0.7, rand(-3, 3), 3);
      }
    };

    V.nope = (i) => {
      tiles[i].wig = 0.35;
    };

    // Run the water to match a fresh PC.flow. Newly wet tiles fill one after another from the nearest to the tap,
    // after any pipe that's still turning; tiles that lost the water drain at once.
    V.water = (fl, by) => {
      let dmin = 1e9;
      const turning = tiles.reduce((s, t) => Math.max(s, Math.abs(t.rotTo - t.rot) / (t.speed || 14)), 0);
      const changed = [];
      for (const t of tiles) {
        const wet = !!fl.wet[t.i];
        const from = fl.from[t.i];
        const moving = t.rot !== t.rotTo;
        if (wet && (!t.wet || t.from !== from || moving)) {
          changed.push(t);
          dmin = Math.min(dmin, fl.depth[t.i]);
        } else if (!wet && t.wet) {
          t.wet = false;
        }
      }
      for (const t of changed) {
        if (!t.wet || t.from !== fl.from[t.i] || t.rot !== t.rotTo) t.u = 0;
        t.wet = true;
        t.from = fl.from[t.i];
        t.delay = turning + (fl.depth[t.i] - dmin) * STEP + (by === 'start' ? 0.5 : 0);
      }
      for (const t of tiles) t.leaks = [];
      for (const [i, d] of fl.leaks) tiles[i].leaks.push(d);
    };

    V.cursor = (p, i, shown) => {
      const c = cursors[p];
      c.visible = shown;
      c.position.set(cx(i), TOP + 0.03, cz(i));
    };

    V.hint = (i) => {
      V.hinted = i === null || i === undefined ? null : i;
      gold.visible = V.hinted !== null;
      point.visible = V.hinted !== null;
      if (V.hinted !== null) {
        gold.position.set(cx(i), TOP + 0.05, cz(i));
        point.position.set(cx(i), TOP + 1.25, cz(i));
      }
    };

    V.reset = (B) => {
      // back to the start: every pipe as the level has it, no water
      for (const t of tiles) {
        t.r = 0;
        t.rot = t.rotTo = 0;
        t.pipes.rotation.y = 0;
        t.wet = false;
        t.u = 0;
        t.from = -1;
        t.bloom = false;
        if (t.plant) {
          t.plant.material.map = emojiTexture('🌱');
          t.plant.material.needsUpdate = true;
        }
      }
      for (const c of cursors) c.visible = false;
      V.hint(null);
    };

    // the tile under a ray (from the camera through a tap), or -1
    const local = new T.Vector3();
    V.pick = (ray) => {
      group.updateMatrixWorld(true);
      const y = group.position.y + TOP + 0.05;
      if (Math.abs(ray.direction.y) < 1e-6) return -1;
      const s = (y - ray.origin.y) / ray.direction.y;
      if (s < 0) return -1;
      local.copy(ray.direction).multiplyScalar(s).add(ray.origin);
      group.worldToLocal(local);
      const x = Math.round(local.x + (w - 1) / 2), z = Math.round(local.z + (h - 1) / 2);
      if (x < 0 || z < 0 || x >= w || z >= h) return -1;
      return z * w + x;
    };

    V.cellWorld = (i, out = new T.Vector3()) => {
      out.set(cx(i), PY, cz(i));
      group.updateMatrixWorld(true);
      return group.localToWorld(out);
    };

    V.corners = (pts) => {
      const add = (x, y, z) => {
        const v = new T.Vector3(x, y, z).add(group.position);
        pts.push(v);
      };
      const hw = size.w / 2, hh = size.h / 2;
      for (const [x, z] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) {
        add(x, 0, z);
        add(x, 0.5, z);
      }
      // the tank's sign sticks up
      add(cx(spec.src), TOP + 1.4, cz(spec.src));
    };

    V.bloomed = () => tiles.filter((t) => t.bloom).length;

    V.dispose = () => {
      if (group.parent) group.parent.remove(group);
    };

    // ---------------------------------------------------------------- the animation

    V.update = (dt) => {
      V.clock += dt;
      for (const t of tiles) {
        // turning
        if (t.rot !== t.rotTo) {
          const step = (t.speed || 14) * dt;
          t.rot = Math.abs(t.rotTo - t.rot) <= step ? t.rotTo : t.rot + Math.sign(t.rotTo - t.rot) * step;
          t.pipes.rotation.y = t.rot;
        }
        // a tap squashes the tile a little; a fixed one wiggles
        if (t.press > 0) t.press = Math.max(0, t.press - dt * 6);
        t.g.position.y = -0.04 * Math.sin(t.press * Math.PI);
        if (t.wig > 0) {
          t.wig = Math.max(0, t.wig - dt);
          t.g.rotation.y = Math.sin(t.wig * 40) * 0.12 * (t.wig / 0.35);
        }
        // the water
        if (t.wet && t.rot === t.rotTo) {
          if (t.delay > 0) t.delay -= dt;
          else t.u = Math.min(1, t.u + dt / (STEP * 1.6));
        } else if (!t.wet) t.u = Math.max(0, t.u - dt * 7);
        paintWater(t);
        // the flower
        if (t.plant) {
          const open = t.wet && t.u >= 1;
          if (open && !t.bloom) {
            t.bloom = true;
            t.bloomT = 0;
            t.plant.material.map = emojiTexture(t.flower);
            t.plant.material.needsUpdate = true;
            if (opts.onBloom) opts.onBloom(t.i);
          } else if (!t.wet && t.bloom) {
            t.bloom = false;
            t.plant.material.map = emojiTexture('🌱');
            t.plant.material.needsUpdate = true;
          }
          t.bloomT += dt;
          const pop = t.bloom ? (t.bloomT < 0.35 ? 1 + Math.sin((t.bloomT / 0.35) * Math.PI) * 0.45 : 1) : 1;
          t.plant.scale.setScalar((t.bloom ? 0.95 : 0.55) * pop);
          t.plant.material.rotation = Math.sin(V.clock * 2 + t.i) * (t.bloom ? 0.08 : 0.04);
        }
        // drips from pipes that open onto nothing
        if (t.leaks.length && t.wet && t.u >= 1 && opts.flyers && Math.random() < dt * 1.3 * t.leaks.length) {
          const d = t.leaks[Math.floor(Math.random() * t.leaks.length)];
          tmp.set(cx(t.i) + PC.DIRS[d][0] * 0.5, PY, cz(t.i) + PC.DIRS[d][1] * 0.5);
          group.localToWorld(tmp);
          opts.flyers.add('💧', tmp.x, tmp.y, tmp.z, PC.DIRS[d][0] * rand(0.4, 0.9), rand(0.6, 1.2), 0.2, 0.55, 0, 5, PC.DIRS[d][1] * rand(0.4, 0.9));
        }
      }
      for (const c of cursors) if (c.visible) c.position.y = TOP + 0.03 + Math.abs(Math.sin(V.clock * 4)) * 0.03;
      if (point.visible) {
        point.position.y = TOP + 1.2 + Math.abs(Math.sin(V.clock * 5)) * 0.25;
        gold.children[0].material.opacity = 0.65 + Math.sin(V.clock * 8) * 0.35;
      }
    };

    // the blue in a tile's pipes for its fill u: the arm the water came in by fills from the edge to the middle
    // (the first half of u), then the hub, then the other arms from the middle out (the second half)
    function paintWater(t) {
      if (!t.arms.length) return;
      const u = t.u;
      const rIn = t.k === 'S' ? -1 : ((t.from - t.r) % 4 + 4) % 4; // the arm (as built) the water comes in by
      for (const a of t.arms) {
        const entry = a.d === rIn;
        const L = entry ? Math.min(1, u * 2) * 0.5 : Math.max(0, u * 2 - 1) * 0.5;
        a.water.visible = L > 0.01;
        if (!a.water.visible) continue;
        a.water.scale.set(1, 1, L);
        a.water.position.z = entry ? -(0.5 - L) : 0;
      }
      if (t.hubWet) t.hubWet.visible = u >= 0.5;
      if (t.k === 'S') {
        // the tank is always full: its arm runs as soon as it's wet
        for (const a of t.arms) {
          const L = Math.min(1, u) * 0.5;
          a.water.visible = L > 0.01;
          a.water.scale.set(1, 1, L);
          a.water.position.z = 0;
        }
      }
    }

    return V;
  }

  PC.makeGrid = makeGrid;
  PC.gridDims = { TOP, PY };
})();
