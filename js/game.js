/* TT Pipe Connect: the game. Turn the pipes so the water runs from the tap (🚰) to every flower.
   Modes (the home screen):
     PUZZLES  40 levels: 20 🐣 EASY for Tommy (tiny gardens, a pipe or two the wrong way) and 20 🔥 NORMAL for Teddy
              (bigger gardens, every pipe turned at random, loose pipes to fool you). Stars by taps. 1 player: you and
              your brother on call. 2 players: TEAM, both on one garden at once (a yellow and a blue square).
     RACE     the same garden twice, the first to water every flower wins the round, first to 2 rounds wins. 1 player
              races Froggy 🐸 (EASY) or Foxy 🦊 (NORMAL); 2 players race each other.
   Your brother (1 player, T or his face): pops in, signature, treat, then he turns one pipe right (js/buddy.js).
   window.game is a test hook: see the README. */
(function () {
  'use strict';
  const T = THREE;
  const PC = window.PC;
  const S = Kit.sound;
  const ST = PC.stage;
  const { rand, pick } = Kit.gfx;
  const $ = (id) => document.getElementById(id);

  const CFG = {
    elev: 1.0, // the camera looks down at about 57°
    people: 0.8, // the boys' size next to a garden of 1 m tiles
    race: { toWin: 2, pool: { easy: ['e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11', 'e12'], normal: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] } },
    cpu: {
      easy: { id: 'froggy', name: 'FROGGY', emoji: '🐸', tag: '#3fbf4e', think: [2.4, 3.4], slip: 0.3 },
      normal: { id: 'foxy', name: 'FOXY', emoji: '🦊', tag: '#ff8a1f', think: [1.5, 2.2], slip: 0.2 },
    },
    demoLevel: 'e12',
  };
  PC.CFG = CFG;
  const LEVELS = PC.LEVELS;
  const tierOf = (tier) => LEVELS.filter((l) => l.tier === tier);
  const NAME = { teddy: 'TEDDY', tommy: 'TOMMY' };

  // ---------------------------------------------------------------- saves

  const SAVE = 'pipeConnectTT.v1';
  const save = { prefs: { players: 1, who: 'teddy', tier: 'easy' }, stars: { teddy: {}, tommy: {}, team: {} } };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE) || 'null');
    if (s && s.prefs) Object.assign(save.prefs, s.prefs);
    if (s && s.stars) for (const k of ['teddy', 'tommy', 'team']) Object.assign(save.stars[k], s.stars[k] || {});
  } catch (e) { /* storage blocked: play without saving */ }
  function store() {
    try { localStorage.setItem(SAVE, JSON.stringify(save)); } catch (e) { /* storage blocked */ }
  }
  const prefs = save.prefs;
  const profile = () => (G.players === 2 ? 'team' : G.who);
  const starsFor = (prof, id) => (save.stars[prof][id] ? save.stars[prof][id].s : 0);

  // ---------------------------------------------------------------- state

  const G = {
    state: 'boot', mode: 'puzzle', players: 1, who: 'teddy', tier: 'easy', level: null, boards: [], timers: [], held: false, last: 0,
    race: null, cpu: null, demo: null, pausedFrom: null, focus: 0, result: null, auto: false, autoT: 0, wins: 0, pending: null, count: 0,
  };
  let ui = null, art = null, flyers = null, bursts = null;
  const people = { teddy: PC.makeActor(), tommy: PC.makeActor() };
  const homes = { teddy: { x: 0, z: 0, face: Math.PI }, tommy: { x: 0, z: 0, face: Math.PI } };
  const spots = { buddy: { x: 0, z: 0, face: Math.PI }, friend: { x: 0, z: 0 } };
  const friend = { group: null, sprite: null, tag: null, t: 0, hopV: 0, hopY: 0, spin: 0, cfg: null };

  const later = (secs, fn) => G.timers.push({ t: secs, fn });

  // ---------------------------------------------------------------- toasts and bits

  function toast(text, cls = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + cls;
    d.textContent = text;
    ui.toasts.appendChild(d);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => d.remove(), cls === 'save' ? 3100 : 2100);
  }
  function show(el, on) {
    el.classList.toggle('hidden', !on);
  }
  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
  const faceImg = (id) => `<img src="${art[id]}" alt="">`;
  const levelNo = (lv) => tierOf(lv.tier).indexOf(lv) + 1;

  // ---------------------------------------------------------------- gardens

  function newBoard(level, k, opts = {}) {
    const spec = PC.parse(level);
    let board = null;
    const view = PC.makeGrid(spec, { flyers, color: opts.color, onBloom: (i) => bloomShown(board, i) });
    ST.scene.add(view.group);
    board = PC.makeBoard(level, view, Object.assign({
      onTurn: (info, B) => turned(B, info),
      onWin: (B) => watered(B),
      onNope: (i, B) => {
        B.view.nope(i);
        PC.sfx.nope();
      },
    }, opts));
    board.k = k;
    return board;
  }
  function clearBoards() {
    for (const b of G.boards) b.view.dispose();
    G.boards = [];
    if (G.demo) {
      G.demo.board.view.dispose();
      G.demo = null;
    }
    G.pending = null;
    for (const k of [0, 1]) show(ui['tag' + k], false);
  }
  const humanBoard = () => G.boards.find((b) => b.human) || G.boards[0];

  // ---------------------------------------------------------------- layout

  // Where the gardens and the boys go, then the camera. Wide screens: gardens side by side, the boys at the sides.
  // Tall screens: one garden with the boys in front of it, or two gardens one above the other with the boys beside them.
  function arrange() {
    const boards = G.demo ? [G.demo.board] : G.boards;
    if (!boards.length) return;
    const wide = ST.W / ST.H >= 1.05;
    const n = boards.length;
    const sz = boards[0].view.size;
    const tw = sz.w, th = sz.h;
    const at = [];
    if (n === 1) at.push([0, 0]);
    else if (wide) at.push([-(tw / 2 + 1.3), 0], [tw / 2 + 1.3, 0]);
    else at.push([0, -(th / 2 + 1.05)], [0, th / 2 + 1.05]);
    boards.forEach((b, k) => b.view.group.position.set(at[k][0], 0, at[k][1]));
    const side = (k, dir) => ({ x: at[k][0] + dir * (tw / 2 + 0.95), z: at[k][1] + 0.5, face: Math.PI - dir * 0.45 });
    const front = (dir) => ({ x: dir * Math.max(tw / 2 - 0.55, 1.2), z: th / 2 + 1.3, face: Math.PI - dir * 0.2 });
    const sideOf = (k, dir) => (n === 1 && !wide ? front(dir) : n === 2 && !wide ? { x: at[k][0] + dir * (tw / 2 + 0.8), z: at[k][1] + 0.5, face: Math.PI - dir * 0.45 } : side(k, dir));
    if (G.demo || (G.mode === 'puzzle' && G.players === 2)) {
      Object.assign(homes.teddy, sideOf(0, -1));
      Object.assign(homes.tommy, sideOf(0, 1));
    } else if (G.mode === 'puzzle') {
      Object.assign(homes[G.who], sideOf(0, 1));
      Object.assign(spots.buddy, sideOf(0, -1));
    } else if (G.players === 2) {
      Object.assign(homes.teddy, n === 2 && !wide ? sideOf(0, 1) : sideOf(0, -1));
      Object.assign(homes.tommy, sideOf(1, 1));
    } else {
      Object.assign(homes[G.who], n === 2 && !wide ? sideOf(0, 1) : sideOf(0, -1));
      Object.assign(spots.friend, sideOf(1, 1));
      Object.assign(spots.buddy, wide ? { x: 0, z: 0.5, face: Math.PI } : sideOf(0, -1));
    }
    for (const id of ['teddy', 'tommy']) {
      const a = people[id];
      if (!a.visible) continue;
      if (!PC.highFive.on) a.place(homes[id].x, 0, homes[id].z);
      a.faceDefault = homes[id].face;
    }
    if (friend.group) friend.group.position.set(spots.friend.x, 0, spots.friend.z);
    if (PC.buddy.on) PC.buddy.actor.place(spots.buddy.x, 0, spots.buddy.z); // the screen turned while he was here
    fitCamera();
  }

  function fitCamera() {
    const boards = G.demo ? [G.demo.board] : G.boards;
    const pts = [];
    for (const b of boards) b.view.corners(pts);
    const h = 2.15 * CFG.people;
    const add = (p) => {
      pts.push(new T.Vector3(p.x - 0.5, 0, p.z), new T.Vector3(p.x + 0.5, 0, p.z), new T.Vector3(p.x, h, p.z));
    };
    for (const id of ['teddy', 'tommy']) if (people[id].visible) add(homes[id]);
    if (G.mode === 'race' && G.players === 1 && !G.demo) add(spots.friend);
    if (G.mode === 'puzzle' && G.players === 1 && !G.demo) add(spots.buddy);
    if (G.players === 2 && !G.demo && G.boards.length) for (const p of buddyApi.meet()) add(p); // where they high-five
    const wide = ST.W / ST.H >= 1.05;
    let m;
    if (G.state === 'home' || G.demo) {
      m = wide ? { l: 60, r: ST.W * 0.55, t: 20, b: 20 } : { l: 56, r: 14, t: 16, b: ST.H * 0.6 };
    } else {
      const hb = ui.hudtop.getBoundingClientRect().bottom || 80;
      const cb = ui.callBtn.getBoundingClientRect();
      const cw = cb.width || 100;
      const tags = G.mode === 'race' ? 40 : 0;
      // the kit's ?, A文 and speaker buttons sit on the left edge: keep the gardens and the boys clear of them
      m = wide ? { l: 86, r: cw + 22, t: hb + 6 + tags, b: 10 } : { l: 70, r: 12, t: hb + 6 + tags, b: cw + 18 };
    }
    ST.fit(pts, CFG.elev, m);
    placeTags();
  }

  // the race: each garden's flower count just above it
  const tagV = new T.Vector3(), tagP = { x: 0, y: 0 };
  function placeTags() {
    if (G.mode !== 'race' || G.demo) return;
    G.boards.forEach((b, k) => {
      const el = ui['tag' + k];
      const g = b.view.group.position;
      tagV.set(g.x, 0.5, g.z - b.view.size.h / 2 - 0.05);
      ST.toScreen(tagV, tagP);
      el.style.left = `${tagP.x}px`;
      el.style.top = `${tagP.y - 4}px`;
    });
  }

  function layout() {
    ST.resize();
    PC.fx.overlay.resize();
    arrange();
  }

  // ---------------------------------------------------------------- home

  function setPref(k, v) {
    prefs[k] = v;
    G.players = prefs.players;
    G.who = prefs.who;
    G.tier = prefs.tier;
    store();
    refreshHome();
  }
  function refreshHome() {
    for (const b of ui.segPlayers.children) b.classList.toggle('on', +b.dataset.v === prefs.players);
    for (const b of ui.segWho.children) b.classList.toggle('on', b.dataset.v === prefs.who);
    for (const b of ui.segLevel.children) b.classList.toggle('on', b.dataset.v === prefs.tier);
    ui.segWho.classList.toggle('gone', prefs.players === 2);
    const prof = prefs.players === 2 ? 'team' : prefs.who;
    const got = tierOf(prefs.tier).reduce((n, l) => n + starsFor(prof, l.id), 0);
    ui.prog.textContent = `⭐ ${got} / ${tierOf(prefs.tier).length * 3}`;
  }

  function goHome() {
    G.timers = [];
    G.count = 0;
    G.race = null;
    G.cpu = null;
    PC.buddy.reset();
    PC.highFive.cancel();
    clearBoards();
    PC.fx.overlay.clear();
    flyers.clear();
    G.state = 'home';
    G.mode = 'puzzle';
    G.players = prefs.players;
    G.who = prefs.who;
    G.tier = prefs.tier;
    for (const el of [ui.hud, ui.callBtn, ui.levels, ui.winPanel, ui.raceOver, ui.pause, ui.count]) show(el, false);
    show(ui.home, true);
    friend.group.visible = false;
    // the demo: a garden turns its own pipes while both boys watch
    const level = LEVELS.find((l) => l.id === CFG.demoLevel);
    const board = newBoard(level, 0, { canAct: () => false, onTurn: () => demoTurned(), onWin: () => demoWon() });
    G.demo = { board, t: 1.6, wait: 0 };
    for (const id of ['teddy', 'tommy']) {
      people[id].visible = true;
      people[id].react('idle');
      people[id].face = null;
    }
    refreshHome();
    layout();
    S.music('title');
  }
  function demoTurned() {
    if (Math.random() < 0.3) pick([people.teddy, people.tommy]).react('hop');
  }
  function demoWon() {
    const b = G.demo.board;
    later(1.6, () => {
      if (!G.demo || G.demo.board !== b) return;
      people.teddy.react('signature');
      people.tommy.react('signature');
    });
    G.demo.wait = 5.5;
  }
  function demoUpdate(dt) {
    const d = G.demo;
    if (!d) return;
    if (d.wait > 0) {
      d.wait -= dt;
      if (d.wait <= 0) {
        d.board.restart();
        d.t = 1.6;
      }
      return;
    }
    d.t -= dt;
    if (d.t <= 0 && !d.board.view.busy && !d.board.won) {
      d.t = 0.55;
      d.board.help('demo');
    }
  }

  // ---------------------------------------------------------------- the level picker

  function showLevels(tier) {
    if (tier) setPref('tier', tier);
    G.timers = [];
    PC.buddy.reset();
    PC.highFive.cancel();
    if (G.state !== 'home') {
      clearBoards();
      goHome();
    }
    G.state = 'levels';
    G.players = prefs.players;
    G.who = prefs.who;
    G.tier = prefs.tier;
    show(ui.home, false);
    show(ui.levels, true);
    for (const el of [ui.winPanel, ui.raceOver, ui.pause]) show(el, false);
    buildGrid();
  }
  function buildGrid() {
    const prof = profile();
    ui.lvFace.src = prof === 'team' ? art.tommy : art[G.who];
    for (const b of ui.lvTier.children) b.classList.toggle('on', b.dataset.v === G.tier);
    const list = tierOf(G.tier);
    let got = 0;
    const next = list.findIndex((l) => !starsFor(prof, l.id));
    ui.lvGrid.innerHTML = '';
    list.forEach((l, k) => {
      const s = starsFor(prof, l.id);
      got += s;
      const b = document.createElement('button');
      const spec = PC.parse(l);
      b.className = 'lv' + (l.tier === 'easy' && spec.n <= 9 ? ' tiny' : '') + (k === next ? ' next' : '') + (k === G.focus ? ' focus' : '');
      b.setAttribute('aria-label', `Level ${k + 1}`);
      b.innerHTML = `<span class="n">${k + 1}</span><span class="s" data-no-lang>${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span><span class="f" data-no-lang>${'🌷'.repeat(spec.flowers.length)}</span>`;
      b.addEventListener('click', () => {
        gesture();
        startLevel(l);
      });
      ui.lvGrid.appendChild(b);
    });
    ui.lvStars.textContent = `${got} / ${list.length * 3}`;
  }
  function moveFocus(d) {
    const n = tierOf(G.tier).length;
    G.focus = (G.focus + d + n) % n;
    [...ui.lvGrid.children].forEach((b, k) => b.classList.toggle('focus', k === G.focus));
    PC.sfx.tick();
  }

  // ---------------------------------------------------------------- puzzles

  function startLevel(level, opts = {}) {
    G.timers = [];
    G.count = 0;
    PC.buddy.reset();
    PC.highFive.cancel();
    clearBoards();
    PC.fx.overlay.clear();
    flyers.clear();
    G.mode = 'puzzle';
    G.players = opts.players || prefs.players;
    G.who = opts.who || prefs.who;
    G.tier = level.tier;
    G.level = level;
    G.focus = tierOf(level.tier).indexOf(level);
    G.result = null;
    const b = newBoard(level, 0, { canAct: () => G.state === 'play' });
    b.human = true;
    G.boards = [b];
    setupPeople();
    G.state = 'play';
    for (const el of [ui.home, ui.levels, ui.winPanel, ui.raceOver, ui.pause, ui.count]) show(el, false);
    show(ui.hud, true);
    show(ui.callBtn, true);
    refreshHud();
    layout();
    S.music('play');
    if (G.players === 2) toast('TEAM TT: BOTH OF YOU TURN PIPES!', 'buddy');
  }

  function setupPeople() {
    friend.group.visible = false;
    for (const id of ['teddy', 'tommy']) {
      const a = people[id];
      a.react('idle');
      a.face = null;
      a.drop();
      a.visible = G.players === 2 || id === G.who;
    }
    if (G.players === 1) {
      PC.buddy.setFor(G.who);
      ui.callFace.src = art[Kit.roster.buddyFor(G.who)];
      ui.callBtn.setAttribute('aria-label', 'Call your brother');
      ui.callBtn.title = `Call ${NAME[Kit.roster.buddyFor(G.who)]} (T)`;
    } else {
      ui.callFace.src = '';
      ui.callBtn.setAttribute('aria-label', 'High five!');
      ui.callBtn.title = 'High five! (T)';
    }
    ui.callFace.classList.toggle('gone', G.players === 2);
    const five = ui.callBtn.querySelector('.five');
    if (G.players === 2 && !five) {
      const s = document.createElement('span');
      s.className = 'five';
      s.textContent = '🙌';
      ui.callBtn.insertBefore(s, ui.callBtn.firstChild);
    } else if (G.players === 1 && five) five.remove();
  }

  const flowersOf = (b) => `🌷 ${b.flow.flowers} / ${b.spec.flowers.length}`;

  function refreshHud() {
    const race = G.mode === 'race';
    ui.lvlPill.classList.toggle('gone', race);
    ui.tapsPill.classList.toggle('gone', race);
    ui.raceBar.classList.toggle('gone', !race);
    ui.restartBtn.classList.toggle('gone', race);
    if (!race && G.boards[0]) {
      const lv = G.level, b = G.boards[0];
      ui.lvlName.textContent = `${lv.tier === 'easy' ? '🐣' : '🔥'} LEVEL ${levelNo(lv)}`;
      ui.flowers.textContent = flowersOf(b);
      ui.taps.textContent = b.taps;
      ui.goal.textContent = PC.goal(lv.par);
    }
    if (race && G.race) {
      const [a, c] = G.race.sides;
      ui.raceA.innerHTML = faceImg(a);
      ui.raceB.innerHTML = c === 'cpu' ? `<span class="emo">${G.cpu.cfg.emoji}</span>` : faceImg(c);
      const dots = (el, n) => {
        el.innerHTML = '';
        for (let i = 0; i < CFG.race.toWin; i++) {
          const d = document.createElement('i');
          if (i < n) d.className = 'on';
          el.appendChild(d);
        }
      };
      dots(ui.dotsA, G.race.wins[0]);
      dots(ui.dotsB, G.race.wins[1]);
      G.boards.forEach((bd, k) => {
        const el = ui['tag' + k];
        show(el, true);
        el.querySelector('.pill').textContent = flowersOf(bd);
      });
    }
  }

  // a pipe turned on board B
  function turned(B, info) {
    if (G.demo && B === G.demo.board) {
      PC.sfx.turn();
      return;
    }
    if (info.by !== 'buddy') PC.sfx.turn();
    if (B.flow.order.length > (B.lastWet || 1)) PC.sfx.gurgle();
    B.lastWet = B.flow.order.length;
    if (G.mode === 'puzzle') {
      if (info.by === 'you' || info.by === 'test') {
        ui.taps.textContent = B.taps;
        bump(ui.taps);
        PC.buddy.moved(info.i);
      }
      ui.flowers.textContent = flowersOf(B);
    } else {
      ui['tag' + B.k].querySelector('.pill').textContent = flowersOf(B);
      if (B.human && B.k === 0 && info.by === 'you') PC.buddy.moved(info.i);
    }
  }

  // a flower popped open (the water got there on screen)
  function bloomShown(B, i) {
    if (!B) return;
    const k = B.spec.flowers.indexOf(i);
    PC.sfx.bloom(k);
    const p = B.view.cellWorld(i);
    if (!(G.demo && B === G.demo.board)) bursts.add('BLOOM!', p.x, p.y + 1.3, p.z, 1.3, '#ff8fc8', '#e8372c');
    for (let n = 0; n < 6; n++) flyers.add(pick(['🌸', '✨', '💧']), p.x, p.y + 0.8, p.z, rand(-1.4, 1.4), rand(1.2, 2.6), 0.3, 0.8, rand(-3, 3), 4);
    if (G.mode === 'puzzle' && !(G.demo && B === G.demo.board)) {
      const who = G.players === 2 ? ['teddy', 'tommy'] : [G.who];
      for (const id of who) people[id].react('cheer');
      bump(ui.flowers);
    } else if (G.mode === 'race' && B.human) {
      const side = G.race.sides[B.k];
      if (side !== 'cpu') people[side].react('cheer');
      bump(ui['tag' + B.k].querySelector('.pill'));
    } else if (G.mode === 'race') friend.hopV = 3;
  }

  // every flower on board B has water: the celebration waits until they're all open on screen
  function watered(B) {
    if (G.demo && B === G.demo.board) return;
    if (G.state !== 'play') return;
    G.state = 'won';
    PC.buddy.moved(-1);
    for (const b of G.boards) b.hideCursors();
    G.pending = { B, t: 0 };
  }
  function pendingUpdate(dt) {
    const p = G.pending;
    if (!p) return;
    p.t += dt;
    if (p.B.view.bloomed() < p.B.spec.flowers.length && p.t < 4) return;
    G.pending = null;
    if (G.mode === 'puzzle') puzzleWon(p.B);
    else raceWon(p.B);
  }

  function puzzleWon(B) {
    const lv = G.level;
    const s = PC.stars(lv.par, B.taps);
    const prof = profile();
    const was = save.stars[prof][lv.id];
    const record = !was || B.taps < was.t;
    save.stars[prof][lv.id] = { s: Math.max(s, was ? was.s : 0), t: Math.min(B.taps, was ? was.t : 1e9) };
    store();
    G.result = { stars: s, taps: B.taps, goal: PC.goal(lv.par), helps: B.helps, record, was: was ? was.t : null };
    G.wins++;
    const who = G.players === 2 ? ['teddy', 'tommy'] : [G.who];
    later(0.3, () => {
      for (const id of who) people[id].react('signature');
      const p = ST.toScreen(B.view.cellWorld(B.spec.flowers[0]));
      PC.fx.overlay.burst(p.x, p.y, 40, ['⭐', '🎉', '🌷', '💧'], 1.2);
      PC.fx.overlay.rain(90);
      PC.sfx.win(s);
      S.music('over');
    });
    later(2.0, () => {
      for (const id of who) people[id].react('over');
      showWinPanel(B);
    });
  }

  function showWinPanel(B) {
    const r = G.result;
    ui.wFace.innerHTML = G.players === 2 ? faceImg('teddy') + faceImg('tommy') : faceImg(G.who);
    ui.wTitle.textContent = G.players === 2 ? 'TEAM TT DID IT!' : `YOU DID IT, ${NAME[G.who]}!`;
    // the stars light up one by one
    [...ui.wStars.children].forEach((st, k) => {
      st.classList.remove('on');
      if (k < r.stars) setTimeout(() => st.classList.add('on'), 250 + k * 280);
    });
    ui.wInfo.innerHTML = '';
    const line = (label, value, cls = '') => {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      const a = document.createElement('span');
      a.textContent = label;
      d.appendChild(a);
      if (value !== undefined) {
        d.appendChild(document.createTextNode(' '));
        const b = document.createElement('b');
        b.textContent = value;
        d.appendChild(b);
      }
      ui.wInfo.appendChild(d);
    };
    line('TAPS', r.taps);
    line('⭐⭐⭐ GOAL', r.goal);
    if (r.helps && G.players === 1) line(`${NAME[Kit.roster.buddyFor(G.who)]} TURNED`, r.helps);
    if (r.record && r.was !== null) line('NEW RECORD!', undefined, 'rec');
    else if (r.was !== null) line('YOUR RECORD', Math.min(r.was, r.taps));
    const all = LEVELS;
    ui.wNext.classList.toggle('gone', all.indexOf(G.level) === all.length - 1);
    G.state = 'result';
    show(ui.winPanel, true);
  }

  function nextLevel() {
    const k = LEVELS.indexOf(G.level);
    if (k < 0 || k >= LEVELS.length - 1) return showLevels();
    const lv = LEVELS[k + 1];
    if (lv.tier !== G.level.tier) setPref('tier', lv.tier);
    startLevel(lv, { players: G.players, who: G.who });
  }

  function restartLevel() {
    if (G.mode === 'race') return;
    if (G.state === 'paused') show(ui.pause, false);
    startLevel(G.level, { players: G.players, who: G.who });
  }

  // ---------------------------------------------------------------- the race

  function startRace(opts = {}) {
    G.players = opts.players || prefs.players;
    G.who = opts.who || prefs.who;
    G.tier = opts.tier || prefs.tier;
    G.race = { round: 0, wins: [0, 0], used: [], sides: G.players === 2 ? ['teddy', 'tommy'] : [G.who, 'cpu'], levelId: opts.level };
    G.cpu = G.players === 1 ? { cfg: CFG.cpu[G.tier], t: 0, moves: 0, slips: 0 } : null;
    raceRound();
  }

  function raceRound() {
    G.timers = [];
    PC.buddy.reset();
    PC.highFive.cancel();
    clearBoards();
    PC.fx.overlay.clear();
    flyers.clear();
    G.mode = 'race';
    const R = G.race;
    R.round++;
    // a garden from the pool for this level, not one already raced this time
    const ids = CFG.race.pool[G.tier];
    let pool = ids.filter((id) => !R.used.includes(id));
    if (!pool.length) pool = ids.slice();
    const id = R.levelId || pick(pool);
    const level = LEVELS.find((l) => l.id === id);
    R.levelId = null;
    R.used.push(id);
    G.level = level;
    G.boards = R.sides.map((side, k) => {
      const b = newBoard(level, k, { canAct: () => G.state === 'play', color: k ? '#18d4ff' : '#ffd400' });
      b.human = side !== 'cpu';
      return b;
    });
    setupPeople();
    if (G.cpu) {
      friend.cfg = G.cpu.cfg;
      friend.sprite.material.map = Kit.gfx.emojiTexture(G.cpu.cfg.emoji);
      friend.sprite.material.needsUpdate = true;
      setFriendTag(G.cpu.cfg);
      friend.group.visible = true;
      G.cpu.t = rand(...G.cpu.cfg.think) + 0.6;
    }
    G.state = 'count';
    for (const el of [ui.home, ui.levels, ui.winPanel, ui.raceOver, ui.pause]) show(el, false);
    show(ui.hud, true);
    show(ui.callBtn, true);
    refreshHud();
    layout();
    S.music('play');
    G.count = 3.6;
    countShow('3');
    PC.sfx.beep(false);
  }
  function countShow(t) {
    ui.count.innerHTML = '';
    const s = document.createElement('span');
    s.textContent = t;
    ui.count.appendChild(s);
    show(ui.count, !!t);
  }
  function countUpdate(dt) {
    const before = G.count;
    G.count -= dt;
    for (const [at, txt] of [[2.6, '2'], [1.6, '1'], [0.6, 'GO!']]) {
      if (before > at && G.count <= at) {
        countShow(txt);
        PC.sfx.beep(txt === 'GO!');
        if (txt === 'GO!' && G.state === 'count') G.state = 'play';
      }
    }
    if (G.count <= 0) countShow('');
  }

  // Froggy / Foxy: a quarter turn of the next pipe the plan needs every second or two, and now and then a slip
  function cpuUpdate(dt) {
    const c = G.cpu, b = G.boards[1];
    if (!c || !b || b.won || G.state !== 'play') return;
    c.t -= dt;
    if (c.t > 0 || b.view.busy) return;
    c.t = rand(...c.cfg.think);
    PC.sfx.think(c.cfg.id === 'foxy');
    friend.hopV = 3;
    c.moves++;
    if (Math.random() < c.cfg.slip) {
      const all = b.spec.kind.map((k, i) => i).filter((i) => b.spec.turnable[i]);
      if (all.length) {
        c.slips++;
        b.turn(pick(all), 1, 'cpu');
        return;
      }
    }
    b.help('cpu');
  }

  function raceWon(B) {
    const R = G.race;
    const k = B.k, other = 1 - k;
    R.wins[k]++;
    R.lastWinner = k;
    const side = R.sides[k], lose = R.sides[other];
    refreshHud();
    later(0.3, () => {
      if (side === 'cpu') {
        friend.spin = 1.2;
        PC.sfx.lose();
      } else {
        people[side].react('signature');
        const p = ST.toScreen(B.view.cellWorld(B.spec.flowers[0]));
        PC.fx.overlay.burst(p.x, p.y, 36, ['⭐', '🎉', '🌷'], 1.1);
        PC.sfx.win(3);
      }
      if (lose !== 'cpu') people[lose].react('shrug');
      if (side !== 'cpu' && lose === 'cpu') friend.hopV = 2;
    });
    const over = R.wins[k] >= CFG.race.toWin;
    later(2.2, () => {
      if (over && side !== 'cpu') {
        PC.fx.overlay.rain(110);
        people[side].react('over');
      }
      showRacePanel(over);
    });
  }
  const nameOf = (side) => (side === 'cpu' ? G.cpu.cfg.name : NAME[side]);
  function showRacePanel(over) {
    const R = G.race, k = R.lastWinner, side = R.sides[k];
    ui.rFace.innerHTML = side === 'cpu' ? `<span class="big">${G.cpu.cfg.emoji}</span>` : faceImg(side);
    ui.rTitle.textContent = over ? `${nameOf(side)} WINS THE RACE!` : `${nameOf(side)} WATERED THEM FIRST!`;
    const face = (s) => (s === 'cpu' ? `<span class="emo">${G.cpu.cfg.emoji}</span>` : faceImg(s));
    ui.rScore.innerHTML = `${face(R.sides[0])}<span>${R.wins[0]}</span><span class="dash">–</span><span>${R.wins[1]}</span>${face(R.sides[1])}`;
    ui.rNext.classList.toggle('gone', over);
    ui.rAgain.classList.toggle('gone', !over);
    G.state = over ? 'raceover' : 'between';
    S.music('over');
    show(ui.raceOver, true);
  }

  function setFriendTag(cfg) {
    if (friend.tag) {
      friend.group.remove(friend.tag);
      friend.tag.material.map.dispose();
    }
    friend.tag = Kit.gfx.nameTag(cfg.name, cfg.tag);
    friend.tag.position.y = 2.2;
    friend.group.add(friend.tag);
  }
  function buildFriend() {
    const g = new T.Group();
    const podium = new T.Mesh(new T.CylinderGeometry(0.55, 0.65, 0.35, 20), Kit.gfx.std('#ffffff', { roughness: 0.5 }));
    podium.position.y = 0.17;
    g.add(podium);
    const ring = new T.Mesh(new T.CylinderGeometry(0.57, 0.57, 0.08, 20), Kit.gfx.std('#ffd400'));
    ring.position.y = 0.3;
    g.add(ring);
    const sp = new T.Sprite(new T.SpriteMaterial({ depthWrite: false, transparent: true }));
    sp.scale.setScalar(1.35);
    sp.position.y = 1.05;
    g.add(sp);
    g.visible = false;
    ST.scene.add(g);
    friend.group = g;
    friend.sprite = sp;
  }
  function friendUpdate(dt) {
    if (!friend.group.visible) return;
    friend.t += dt;
    friend.hopV -= 14 * dt;
    friend.hopY = Math.max(0, friend.hopY + friend.hopV * dt);
    if (friend.hopY === 0 && friend.hopV < 0) friend.hopV = 0;
    friend.sprite.position.y = 1.05 + friend.hopY + Math.sin(friend.t * 3) * 0.05;
    if (friend.spin > 0) {
      friend.spin -= dt;
      friend.sprite.material.rotation = Math.sin(friend.spin * 10) * 0.4;
      if (Math.random() < dt * 8) flyers.add('⭐', spots.friend.x, 1.6, spots.friend.z, rand(-1.5, 1.5), rand(1, 3), 0.35, 0.8, rand(-3, 3), 3);
    } else friend.sprite.material.rotation = 0;
  }

  // ---------------------------------------------------------------- your brother

  function call() {
    gesture();
    if (G.state !== 'play' && G.state !== 'won' && G.state !== 'count' && G.state !== 'result') return 'not now';
    if (G.players === 2) return PC.highFive.start();
    return PC.buddy.call();
  }

  const buddyApi = {
    toast,
    get flyers() { return flyers; },
    scale: () => CFG.people,
    spot: () => spots.buddy,
    player: () => people[G.who],
    players: () => [people.teddy, people.tommy],
    homes: () => [homes.teddy, homes.tommy],
    meet() {
      const a = homes.teddy, c = homes.tommy;
      const mx = (a.x + c.x) / 2, mz = Math.max(a.z, c.z) + 0.6;
      const wide = ST.W / ST.H >= 1.05;
      if (!wide && G.boards.length === 2) return [{ x: a.x, z: (a.z + c.z) / 2 - 0.35 }, { x: c.x, z: (a.z + c.z) / 2 + 0.35 }];
      const front = G.boards.length ? G.boards[0].view.size.h / 2 + 1.1 : 3;
      const z = wide ? front : mz;
      return [{ x: mx - 0.45, z }, { x: mx + 0.45, z }];
    },
    canHint: () => G.state === 'play' && humanBoard() && !humanBoard().won,
    over: () => G.state !== 'play' && G.state !== 'count',
    // the pipe he'll turn: a gold square and a 👇 on it
    showHint() {
      const b = humanBoard();
      const f = b.nextFix();
      if (!f) return null;
      b.view.hint(f.i);
      return f;
    },
    // turn it the right way (the plan as the garden is now, in case it changed while he pointed)
    doFix(h) {
      const b = humanBoard();
      b.view.hint(null);
      if (!b || b.won || G.state !== 'play') return null;
      const f = b.nextFix() || h;
      return b.help('buddy', f);
    },
    clearHint() {
      for (const b of G.boards) b.view.hint(null);
    },
    hintWorld(out) {
      const b = humanBoard();
      const h = b && b.view.hinted;
      if (h === null || h === undefined) return out.set(0, 0, 0);
      return b.view.cellWorld(h, out);
    },
  };

  // ---------------------------------------------------------------- input

  let gestured = false;
  function gesture() {
    if (gestured) return;
    gestured = true;
    S.init();
    S.music(G.state === 'home' ? 'title' : 'play');
  }

  function bindInput() {
    const tap = (el, fn) => el.addEventListener('click', (e) => {
      gesture();
      fn(e);
    });
    tap(ui.goPuzzles, () => showLevels());
    tap(ui.goRace, () => startRace());
    for (const b of ui.segPlayers.children) tap(b, () => setPref('players', +b.dataset.v));
    for (const b of ui.segWho.children) tap(b, () => setPref('who', b.dataset.v));
    for (const b of ui.segLevel.children) tap(b, () => setPref('tier', b.dataset.v));
    for (const b of ui.lvTier.children) tap(b, () => {
      setPref('tier', b.dataset.v);
      G.tier = prefs.tier;
      G.focus = 0;
      buildGrid();
    });
    tap(ui.lvHome, goHome);
    ui.callBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      call();
    });
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, () => (G.mode === 'race' ? (show(ui.pause, false), startRace({ players: G.players, who: G.who, tier: G.tier })) : restartLevel()));
    tap(ui.pLevels, () => showLevels());
    tap(ui.pHome, goHome);
    tap(ui.restartBtn, restartLevel);
    tap(ui.muteBtn, toggleMute);
    tap(ui.wNext, nextLevel);
    tap(ui.wAgain, restartLevel);
    tap(ui.wLevels, () => showLevels());
    tap(ui.wHome, goHome);
    tap(ui.rNext, raceRound);
    tap(ui.rAgain, () => startRace({ players: G.players, who: G.who, tier: G.tier }));
    tap(ui.rHome, goHome);

    // a tap on a pipe turns it (each finger on its own garden in a 2-player race)
    ui.canvas.addEventListener('pointerdown', (e) => {
      gesture();
      if (G.state !== 'play') return;
      const ray = ST.ray(e.clientX, e.clientY);
      for (const b of G.boards) {
        if (!b.human) continue;
        const i = b.view.pick(ray);
        if (i >= 0) {
          b.tap(i);
          break;
        }
      }
    });

    addEventListener('keydown', (e) => {
      gesture();
      const k = e.key.toLowerCase();
      if (k === 'm' && !e.repeat) return toggleMute();
      if (e.repeat && !k.startsWith('arrow') && !'wasd'.includes(k)) return;
      if (k.startsWith('arrow') || k === ' ') e.preventDefault();
      if (G.state === 'home') {
        if (k === '1' || k === 'enter' || k === ' ') showLevels();
        else if (k === '2') startRace();
        else if (k === 'arrowleft' || k === 'arrowright') setPref('who', prefs.who === 'teddy' ? 'tommy' : 'teddy');
        else if (k === 'arrowup' || k === 'arrowdown') setPref('players', prefs.players === 1 ? 2 : 1);
        else if (k === 'l') setPref('tier', prefs.tier === 'easy' ? 'normal' : 'easy');
        return;
      }
      if (G.state === 'levels') {
        const cols = getComputedStyle(ui.lvGrid).gridTemplateColumns.split(' ').length || 5;
        if (k === 'arrowleft' || k === 'a') moveFocus(-1);
        else if (k === 'arrowright' || k === 'd') moveFocus(1);
        else if (k === 'arrowup' || k === 'w') moveFocus(-cols);
        else if (k === 'arrowdown' || k === 's') moveFocus(cols);
        else if (k === 'enter' || k === ' ') startLevel(tierOf(G.tier)[G.focus]);
        else if (k === 'l') {
          setPref('tier', prefs.tier === 'easy' ? 'normal' : 'easy');
          G.tier = prefs.tier;
          G.focus = 0;
          buildGrid();
        } else if (k === 'escape' || k === 'h') goHome();
        return;
      }
      if (k === 't') return call();
      if (G.state === 'paused') {
        if (k === 'escape' || k === 'p' || k === 'enter' || k === ' ') pause(false);
        else if (k === 'r') ui.pRestart.click();
        else if (k === 'l') showLevels();
        else if (k === 'h') goHome();
        return;
      }
      if (G.state === 'won') return;
      if (G.state === 'result') {
        if (k === 'enter' || k === ' ' || k === 'n') nextLevel();
        else if (k === 'r') restartLevel();
        else if (k === 'l') showLevels();
        else if (k === 'escape' || k === 'h') goHome();
        return;
      }
      if (G.state === 'between' || G.state === 'raceover') {
        if (k === 'enter' || k === ' ') (G.state === 'between' ? raceRound : () => startRace({ players: G.players, who: G.who, tier: G.tier }))();
        else if (k === 'escape' || k === 'h') goHome();
        return;
      }
      if (k === 'escape' || k === 'p') return pause(true);
      if (G.state !== 'play' && G.state !== 'count') return;
      if (k === 'r') return restartLevel();
      if (G.state !== 'play') return;
      // W A S D + Space / F: the yellow square; the arrows + Enter: the blue one (on the right garden in a 2-player
      // race). One player: both sets move the same square.
      const P1 = { w: 'up', a: 'left', s: 'down', d: 'right', ' ': 'turn', f: 'turn' };
      const P2 = { arrowup: 'up', arrowleft: 'left', arrowdown: 'down', arrowright: 'right', enter: 'turn' };
      const two = G.players === 2;
      let act = P1[k], board = G.boards[0], p = 0;
      if (!act && P2[k]) {
        act = P2[k];
        if (two) {
          if (G.mode === 'race') board = G.boards[1];
          else p = 1;
        }
      }
      if (act && board && board.human && board.key(act, p) && act !== 'turn') PC.sfx.tick();
    });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => (document.hidden ? S.suspend() : S.resume()));
    Kit.lang.onChange(() => {
      if (G.state === 'levels') buildGrid();
      if (G.state !== 'home') refreshHud();
      layout();
    });
  }

  function pause(on) {
    if (on && (G.state === 'play' || G.state === 'count')) {
      G.pausedFrom = G.state;
      G.state = 'paused';
      show(ui.pause, true);
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = G.pausedFrom || 'play';
      show(ui.pause, false);
      S.music('play');
    }
  }

  function toggleMute() {
    const muted = S.toggleMute();
    ui.muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------------------------------------------------------------- the loop

  function step(dt) {
    dt = Math.min(dt, 0.1);
    // the window can start at 0 x 0 (a hidden tab) and resize without an event reaching us: re-fit when it changes
    if ((innerWidth || 1) !== ST.W || (innerHeight || 1) !== ST.H) layout();
    const running = G.state !== 'paused' && G.state !== 'boot';
    if (running) {
      for (let i = G.timers.length - 1; i >= 0; i--) {
        const tm = G.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) {
          G.timers.splice(i, 1);
          tm.fn();
        }
      }
      if (G.state === 'home' || G.state === 'levels') demoUpdate(dt);
      if (G.count > 0) countUpdate(dt); // 3, 2, 1, GO! (the GO! stays up a moment after the race starts)
      if (G.state === 'play') {
        cpuUpdate(dt);
        if (G.auto) autoUpdate(dt);
      }
      for (const b of G.boards) b.view.update(dt);
      if (G.demo) G.demo.board.view.update(dt);
      pendingUpdate(dt);
      ST.update(dt);
      flyers.update(dt);
      bursts.update(dt);
      people.teddy.update(dt);
      people.tommy.update(dt);
      friendUpdate(dt);
      PC.buddy.update(dt);
      PC.highFive.update(dt);
      placeTags();
    }
    PC.fx.overlay.update(dt);
    ui.callBtn.classList.toggle('here', PC.buddy.on || PC.highFive.on);
    ST.render();
  }

  // the test bot: a quarter turn of the plan's next pipe on the human gardens
  function autoUpdate(dt) {
    G.autoT -= dt;
    if (G.autoT > 0) return;
    G.autoT = G.autoGap || 0.5;
    for (const b of G.boards) {
      if (!b.human || b.won || b.view.busy) continue;
      const f = b.nextFix();
      if (f) b.tap(f.i);
      if (G.mode === 'puzzle') break;
    }
  }

  function frame(now) {
    const dt = G.last ? (now - G.last) / 1000 : 0.016;
    G.last = now;
    if (!G.held) step(dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- boot

  function boot() {
    const ids = ['canvas:game', 'home', 'hud', 'logo', 'goPuzzles', 'goRace', 'prog', 'segPlayers', 'segWho', 'segLevel', 'levels', 'lvFace', 'lvTier', 'lvStars',
      'lvGrid', 'lvHome', 'pauseBtn', 'lvlPill', 'lvlName', 'flowers', 'tapsPill', 'taps', 'goal', 'raceBar', 'raceA', 'raceB', 'dotsA', 'dotsB',
      'restartBtn', 'muteBtn', 'tag0', 'tag1', 'callBtn', 'callFace', 'toasts', 'count', 'winPanel', 'wFace', 'wTitle', 'wStars', 'wInfo', 'wNext', 'wAgain',
      'wLevels', 'wHome', 'raceOver', 'rFace', 'rTitle', 'rScore', 'rNext', 'rAgain', 'rHome', 'pause', 'pResume', 'pRestart', 'pLevels', 'pHome'];
    ui = {};
    for (const s of ids) {
      const [k, id] = s.includes(':') ? s.split(':') : [s, s];
      ui[k] = $(id);
    }
    ui.hudtop = document.querySelector('.hudtop');
    // the logo: "TT" small on top, the rest big ("Pipe Connect")
    const words = window.PC_TITLE.split(' ');
    ui.logo.querySelector('small').textContent = words.length > 1 ? words[0] : '';
    ui.logo.querySelector('big').textContent = words.length > 1 ? words.slice(1).join(' ') : words[0];
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    ST.init(ui.canvas);
    PC.fx.overlay.init($('fx'));
    flyers = PC.fx.flyers(ST.scene, 80);
    bursts = PC.fx.bursts(ST.scene, 6);
    for (const id of ['teddy', 'tommy']) {
      people[id].attach(ST.scene, flyers);
      people[id].set(id, CFG.people);
    }
    buildFriend();
    art = Kit.portraits(['teddy', 'tommy'].map((id) => Kit.roster.get(id)), { size: 160 });
    ui.segWho.children[0].querySelector('img').src = art.teddy;
    ui.segWho.children[1].querySelector('img').src = art.tommy;
    PC.buddy.init(buddyApi);
    bindInput();
    goHome();
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- test hook

  window.game = {
    // advance `secs` of game time in 1/60 s steps, rendering once at the end (works while the pane is hidden)
    step(secs = 0.1) {
      const n = Math.max(1, Math.round(secs * 60));
      for (let i = 0; i < n; i++) step(1 / 60);
      return game.info();
    },
    hold(on = true) { G.held = on; },
    // start({ mode: 'puzzle' | 'race', players: 1 | 2, who: 'teddy' | 'tommy', tier: 'easy' | 'normal', level: 'e3' })
    start(opts = {}) {
      gesture();
      for (const k of ['players', 'who', 'tier']) if (opts[k]) setPref(k, opts[k]);
      if (opts.mode === 'race') startRace(opts);
      else startLevel(LEVELS.find((l) => l.id === (opts.level || 'e1')) || LEVELS[0], opts);
      return game.info();
    },
    home: () => goHome(),
    levels: (tier) => showLevels(tier),
    tap: (i, k = 0) => G.boards[k].tap(i, 'test'),
    key: (k) => dispatchEvent(new KeyboardEvent('keydown', { key: k })),
    // the pipe the brother would turn next { i, to, turns }
    hint: (k = 0) => G.boards[k].nextFix(),
    // turn the plan's pipes straight away until every flower on garden k has water
    solve(k = 0) {
      const b = G.boards[k];
      for (let n = 0; n < 300 && !b.won; n++) {
        const f = b.nextFix();
        if (!f) break;
        for (let t = 0; t < f.turns; t++) b.tap(f.i, 'test');
      }
      return game.info();
    },
    auto(on = true, gap = 0.5) {
      G.auto = on;
      G.autoGap = gap;
    },
    restart: () => restartLevel(),
    next: () => (G.mode === 'race' ? raceRound() : nextLevel()),
    call: () => call(),
    pause: (on = true) => pause(on),
    check: (opts) => PC.check(opts),
    info() {
      const bs = G.boards.map((b) => ({ level: b.level.id, taps: b.taps, helps: b.helps, won: b.won, human: !!b.human, flowers: b.flow.flowers, of: b.spec.flowers.length, bloomed: b.view.bloomed(), busy: b.view.busy, hint: b.view.hinted, cursor: b.cursor.slice(), shown: b.shown.slice() }));
      return {
        state: G.state, mode: G.mode, players: G.players, who: G.who, tier: G.tier, level: G.level && G.level.id, boards: bs,
        result: G.result, race: G.race && { round: G.race.round, wins: G.race.wins.slice(), sides: G.race.sides.slice() }, cpu: G.cpu && { moves: G.cpu.moves, slips: G.cpu.slips },
        buddy: PC.buddy.info(), people: { teddy: { visible: people.teddy.visible, pose: people.teddy.pose }, tommy: { visible: people.tommy.visible, pose: people.tommy.pose } },
        panel: ['winPanel', 'raceOver', 'pause', 'levels'].find((p) => !ui[p].classList.contains('hidden')) || null,
      };
    },
    // a tile's place on the screen (for taps in tests)
    screen(i, k = 0) {
      const b = G.boards[k] || (G.demo && G.demo.board);
      return ST.toScreen(b.view.cellWorld(i));
    },
    get G() { return G; },
    get save() { return save; },
    CFG,
  };

  let booted = false;
  const go = () => {
    if (booted) return;
    booted = true;
    boot();
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go);
  setTimeout(go, 1500);
})();
