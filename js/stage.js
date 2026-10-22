/* TT Pipe Connect: the renderer, the back garden and the camera (from TT Slide Escape). The garden beds are js/grid.js.
     fit(points, elev, margins)  aim the camera so world points fill the screen minus margins (in pixels)
     ray(x, y)                   the camera ray through a screen point (for picking tiles)
     toScreen(v)                 a world point in screen pixels
     shake(secs)                 the camera shakes for a moment */
(function () {
  'use strict';
  const T = THREE;
  const PC = (window.PC = window.PC || {});
  const { makeCanvas, toTexture, std, rand, pick: pickOne } = Kit.gfx;

  let renderer = null, W = 1, H = 1;
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, 0.1, 400);
  const camBase = new T.Vector3();
  const fx = { shake: 0, t: 0 };

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    buildGarden();
    resize();
  }

  function resize() {
    W = Math.max(1, innerWidth || 1);
    H = Math.max(1, innerHeight || 1);
    if (renderer) renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- the garden

  function lawnTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = '#86d65f';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#7bcc55';
    for (let i = 0; i < 4; i++) g.fillRect(0, i * 64, 256, 32);
    for (let i = 0; i < 1100; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(30,90,10,0.08)';
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 5);
    }
    return toTexture(c, true);
  }

  // round trees: a trunk and a few green balls
  const trunkMat = std('#8a5a32', { roughness: 0.9 });
  const leafMats = [std('#3f9e3a'), std('#4cb244'), std('#5cc24e')];
  function tree(x, z, s = 1) {
    const g = new T.Group();
    const trunk = new T.Mesh(new T.CylinderGeometry(0.18 * s, 0.24 * s, 2 * s, 8), trunkMat);
    trunk.position.y = s;
    g.add(trunk);
    for (let k = 0; k < 4; k++) {
      const b = new T.Mesh(new T.SphereGeometry(rand(0.9, 1.25) * s, 14, 10), pickOne(leafMats));
      b.position.set(rand(-0.6, 0.6) * s, (2.3 + rand(0, 0.9)) * s, rand(-0.5, 0.5) * s);
      g.add(b);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  // a white picket fence along a line
  const fenceMat = std('#ffffff', { roughness: 0.7 });
  function fence(x0, x1, z) {
    const n = Math.round((x1 - x0) / 0.5);
    const picket = new T.BoxGeometry(0.3, 1.1, 0.08), tip = new T.ConeGeometry(0.21, 0.25, 4);
    for (let k = 0; k <= n; k++) {
      const x = x0 + k * 0.5;
      const p = new T.Mesh(picket, fenceMat);
      p.position.set(x, 0.55, z);
      scene.add(p);
      const t = new T.Mesh(tip, fenceMat);
      t.position.set(x, 1.22, z);
      t.rotation.y = Math.PI / 4;
      scene.add(t);
    }
    for (const y of [0.35, 0.85]) {
      const rail = new T.Mesh(new T.BoxGeometry(x1 - x0 + 0.4, 0.12, 0.06), fenceMat);
      rail.position.set((x0 + x1) / 2, y, z - 0.07);
      scene.add(rail);
    }
  }

  function buildGarden() {
    scene.background = new T.Color('#a8e2ff');
    scene.fog = new T.Fog('#a8e2ff', 40, 90);
    scene.add(new T.HemisphereLight('#ffffff', '#5a8a3a', 0.85));
    const sun = new T.DirectionalLight('#fff3dc', 1.0);
    sun.position.set(-5, 14, 8);
    scene.add(sun);

    const tex = lawnTexture();
    tex.repeat.set(36, 36);
    const ground = new T.Mesh(new T.PlaneGeometry(160, 160), std('#ffffff', { map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // a fence across the back, trees behind it and along the sides, well clear of the beds and the boys
    fence(-16, 16, -11.5);
    for (let x = -30; x <= 30; x += 3.2) tree(x + rand(-0.6, 0.6), -14.5 + rand(-1.5, 1.5), rand(0.9, 1.3));
    for (let z = -9; z <= 8; z += 3.4) {
      tree(-19 + rand(-1, 1), z, rand(0.9, 1.15));
      tree(19 + rand(-1, 1), z, rand(0.9, 1.15));
    }
    // round bushes and flowers on the lawn
    const leaf = [std('#3f9e3a'), std('#4cb244'), std('#378c33')];
    const bush = (x, z, s) => {
      for (let i = 0; i < 3; i++) {
        const b = new T.Mesh(new T.SphereGeometry(0.7 * s, 14, 10), leaf[i]);
        b.position.set(x + (i - 1) * 0.6 * s, 0.45 * s + (i === 1 ? 0.25 * s : 0), z + (i % 2) * 0.2);
        scene.add(b);
      }
    };
    for (const [x, z] of [[-15, -9], [15, -9], [-15.5, 2], [15.5, 2], [-9, -11.5], [9, -11.5]]) bush(x, z, 1.3);
    const petals = ['#ff6f91', '#ffd23f', '#ffffff', '#a77bff', '#ff8a1f'];
    const stem = std('#2f8a2a'), centre = std('#ffcc00');
    for (let i = 0; i < 140; i++) {
      const x = rand(-18, 18), z = rand(-12, 12);
      if (Math.abs(x) < 13.5 && z > -10.5) continue; // keep the middle clear: it's where the beds and the boys go
      const f = new T.Group();
      const s = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.35, 5), stem);
      s.position.y = 0.17;
      f.add(s);
      const head = new T.Mesh(new T.SphereGeometry(0.11, 8, 6), std(pickOne(petals)));
      head.position.y = 0.38;
      head.scale.y = 0.6;
      f.add(head);
      const dot = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), centre);
      dot.position.y = 0.43;
      f.add(dot);
      f.position.set(x, 0, z);
      scene.add(f);
    }
  }

  // ---------------------------------------------------------------- camera

  // Aim the camera down at `elev` radians from the front so the world points `pts` fill the screen minus margins
  // { l, r, t, b } in pixels. It fits them in a box of that size in the middle of the picture, then slides the
  // picture (the camera's view offset) so the box sits over the free part of the screen. (From TT Tic-Tac-Toe.)
  const right = new T.Vector3(), up = new T.Vector3(), tmp = new T.Vector3();
  function fit(pts, elev, m) {
    cam.clearViewOffset();
    const dir = new T.Vector3(0, Math.sin(elev), Math.cos(elev));
    const center = new T.Vector3();
    pts.forEach((p) => center.add(p));
    center.multiplyScalar(1 / pts.length);
    const hw = Math.max(0.1, (W - m.l - m.r) / W), hh = Math.max(0.1, (H - m.t - m.b) / H);
    const box = { x0: -hw, x1: hw, y0: -hh, y1: hh };
    const place = (d) => {
      cam.position.copy(center).addScaledVector(dir, d);
      cam.lookAt(center);
      cam.updateMatrixWorld(true);
    };
    const bounds = () => {
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) {
        tmp.copy(p).project(cam);
        x0 = Math.min(x0, tmp.x);
        x1 = Math.max(x1, tmp.x);
        y0 = Math.min(y0, tmp.y);
        y1 = Math.max(y1, tmp.y);
      }
      return { x0, x1, y0, y1 };
    };
    for (let iter = 0; iter < 4; iter++) {
      let lo = 2, hi = 300;
      for (let i = 0; i < 32; i++) {
        const mid = (lo + hi) / 2;
        place(mid);
        const b = bounds();
        if (b.x0 >= box.x0 && b.x1 <= box.x1 && b.y0 >= box.y0 && b.y1 <= box.y1) hi = mid;
        else lo = mid;
      }
      place(hi);
      const b = bounds();
      const dx = (b.x0 + b.x1) / 2 - (box.x0 + box.x1) / 2;
      const dy = (b.y0 + b.y1) / 2 - (box.y0 + box.y1) / 2;
      const d = cam.position.distanceTo(center);
      const halfH = d * Math.tan((cam.fov * Math.PI) / 360), halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      center.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH);
    }
    const bx = (m.l + W - m.r) / 2, by = (m.t + H - m.b) / 2;
    cam.setViewOffset(W, H, W / 2 - bx, H / 2 - by, W, H);
    cam.updateMatrixWorld(true);
    camBase.copy(cam.position);
    return center;
  }

  const raycaster = new T.Raycaster(), ndc = new T.Vector2();
  function ray(x, y) {
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, cam);
    return raycaster.ray;
  }

  function toScreen(v, out = { x: 0, y: 0 }) {
    tmp.copy(v).project(cam);
    out.x = ((tmp.x + 1) / 2) * W;
    out.y = ((1 - tmp.y) / 2) * H;
    return out;
  }

  function shake(secs = 0.3) {
    fx.shake = Math.max(fx.shake, secs);
  }

  function update(dt) {
    fx.t += dt;
    if (fx.shake > 0) {
      fx.shake -= dt;
      const a = Math.max(0, fx.shake) * 0.25;
      cam.position.set(camBase.x + rand(-a, a), camBase.y + rand(-a, a), camBase.z);
      cam.updateMatrixWorld(true);
    } else if (!cam.position.equals(camBase) && camBase.lengthSq()) {
      cam.position.copy(camBase);
      cam.updateMatrixWorld(true);
    }
  }

  function render() {
    if (renderer) renderer.render(scene, cam);
  }

  PC.stage = {
    init, resize, render, update, fit, ray, toScreen, shake, scene, cam,
    get W() { return W; },
    get H() { return H; },
    get renderer() { return renderer; },
  };
})();
