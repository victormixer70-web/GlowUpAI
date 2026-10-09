/* ARENA MIX shared 3D viewer and the home screen's player.
   AMViewer() gives the one small 3D view the menus share (made once, kept for the whole visit: the Taquilla and
   the home screen move its canvas into themselves). AMHero.attach(holder) shows your own character there, in
   your kit, breathing in its idle pose; AMHero.detach() gives the view back. */
(function () {
  var T = window.THREE;
  function viewer() {
    var V = window.__amTaqV;
    if (V || !T) return V || null;
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; display: block';
    var R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    cv.setAttribute('data-am-shared', '1');
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.15;
    R.setClearColor(0x000000, 0);
    var S = new T.Scene();
    S.add(new T.HemisphereLight(0xdfe8ff, 0x2a2440, 0.9));
    var key = new T.DirectionalLight(0xffffff, 1.1); key.position.set(2, 4, 4); S.add(key);
    var rim = new T.DirectionalLight(0x22d3ee, 0.6); rim.position.set(-3, 2.5, -3); S.add(rim);
    V = window.__amTaqV = { cv: cv, R: R, S: S, cam: new T.PerspectiveCamera(28, 1, 0.1, 50), model: null, modelKey: '', sz: '', owner: null };
    if (window.AMSky) window.AMSky.env(R).then(function (e) { if (e) S.environment = e; });
    return V;
  }

  var raf = 0, token = 0, holder = null, t0 = 0;
  // tricks: tap your player (or wait a while) and he plays with a ball at his feet
  // kick: the moment in the clip the foot meets the ball, and how it flies off
  var ACTS = [
    { id: 'shot', clip: 'shot', dur: 1.25, kick: 0.42, v: [0.9, 5.2, 4.6] },
    { id: 'penalty', clip: 'penalty', dur: 1.45, kick: 0.62, v: [-1.2, 3.6, 5.4] },
    { id: 'pass', clip: 'pass', dur: 0.55, kick: 0.22, v: [2.6, 0.6, 2.2] },
    { id: 'spin', clip: 'idle', dur: 0.9, spin: true },
    { id: 'juggle', clip: 'idle', dur: 2.2, juggle: true }
  ];
  var act = null, nextAuto = 0, ball = null, bst = null;
  function ensureBall(V) {
    if (V.heroBall) return V.heroBall;
    var g = new T.SphereGeometry(0.11, 24, 16);
    var m = window.AMBall ? window.AMBall.material() : new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    V.heroBall = new T.Mesh(g, m); V.heroBall.visible = false; V.S.add(V.heroBall);
    return V.heroBall;
  }
  function play(kind) {
    if (act) return false;
    var list = ACTS.filter(function (a) { return !kind || a.id === kind; });
    var a = list[Math.floor(Math.random() * list.length)];
    act = { a: a, t0: performance.now() };
    bst = null;
    return true;
  }
  function heroKey() { var A = window.AMChars; return A ? A.pref() + '|' + JSON.stringify(A.outfit('futbol') || {}) : ''; }
  // your character for the home screen (kept, rebuilt only when you change character or kit)
  function prepare() {
    var V = viewer(), A = window.AMChars;
    if (!V || !A || !A.ready() || A.pref() === 'clasico') return null;
    var k = heroKey();
    if (V.heroKey !== k) {
      if (V.heroModel) V.S.remove(V.heroModel);
      V.heroModel = A.make({ you: true, noRing: true, gear: true });
      V.heroKey = k;
      if (V.heroModel) { V.heroModel.visible = false; V.S.add(V.heroModel); }
    }
    return V.heroModel;
  }
  function frame() {
    var V = window.__amTaqV, me = token;
    if (!V || V.owner !== me || !holder) return;
    raf = requestAnimationFrame(frame);
    var w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    if (V.sz !== w + 'x' + h) { V.sz = w + 'x' + h; V.R.setSize(w, h, false); V.cam.aspect = w / h; V.cam.updateProjectionMatrix(); }
    var m = prepare(), A = window.AMChars;
    if (!m) return;
    if (V.model) V.model.visible = false;
    m.visible = true;
    var now = performance.now(), t = (now - t0) / 1000;
    if (!nextAuto) nextAuto = now + 6000;
    if (!act && now > nextAuto) { play(); nextAuto = now + 9000 + Math.random() * 6000; }
    // a slow sway, turned a little towards the panel
    var baseRot = -0.35 + Math.sin(t * 0.5) * 0.12, extra = 0;
    var an = m.userData.anim, layers = [];
    var B = ensureBall(V);
    var ballAt = function () { var r = m.rotation.y, fx = Math.sin(r), fz = Math.cos(r); return [m.position.x + fx * 0.32 + fz * 0.12, 0.11, m.position.z + fz * 0.32 - fx * 0.12]; };
    if (act) {
      var a = act.a, k = (now - act.t0) / 1000, w = Math.min(1, k / 0.12, (a.dur - k) / 0.18);
      if (k >= a.dur) { act = null; nextAuto = now + 9000 + Math.random() * 6000; }
      else {
        if (a.spin) extra = Math.PI * 2 * (k / a.dur) * (k / a.dur) * (3 - 2 * (k / a.dur));
        if (an && A.clip(a.clip) && a.clip !== 'idle') layers.push({ id: a.clip, t: k, w: Math.max(0, w) });
        if (an && A.clip('idle')) layers.unshift({ id: 'idle', t: t, w: a.clip === 'idle' ? 1 : Math.max(0, 1 - w) });
        // the ball: at the feet, struck at the moment of the kick, flies off; or kept up in the air
        if (a.kick != null) {
          if (k < a.kick) { var p0 = ballAt(); B.position.set(p0[0], p0[1], p0[2]); B.visible = true; B.scale.setScalar(1); }
          else {
            if (!bst) { var r = m.rotation.y, fx = Math.sin(r), fz = Math.cos(r); bst = { p: B.position.clone(), v: new T.Vector3(fx * a.v[2] + fz * a.v[0], a.v[1], fz * a.v[2] - fx * a.v[0]), t: 0 }; }
            var dt = Math.min(0.05, (now - (bst.last || now)) / 1000); bst.last = now; bst.t += dt;
            bst.v.y -= 9.8 * dt; bst.p.addScaledVector(bst.v, dt);
            if (bst.p.y < 0.11) { bst.p.y = 0.11; bst.v.y = -bst.v.y * 0.5; bst.v.x *= 0.8; bst.v.z *= 0.8; }
            B.position.copy(bst.p); B.rotation.x += bst.v.length() * dt * 3;
            B.scale.setScalar(Math.max(0.01, 1 - Math.max(0, bst.t - 0.5) * 2));
          }
        } else if (a.juggle) {
          var p1 = ballAt(), hop = Math.abs(Math.sin(k / a.dur * Math.PI * 4));
          B.position.set(p1[0], 0.11 + hop * 0.75, p1[2]); B.rotation.x += 0.2; B.visible = true; B.scale.setScalar(1);
        }
      }
    }
    if (!act) {
      // back at his feet, popping back in after a kick
      var p2 = ballAt(); B.position.set(p2[0], p2[1], p2[2]); B.visible = true;
      B.scale.setScalar(Math.min(1, B.scale.x + 0.08));
    }
    m.rotation.y = baseRot + extra;
    if (an && A.clip('idle')) an.layers = layers.length ? layers : [{ id: 'idle', t: t, w: 1 }];
    var fov = V.cam.fov * Math.PI / 360;
    var fit = Math.max(2.05 / (2 * Math.tan(fov)), 0.9 / (2 * Math.tan(fov) * V.cam.aspect));
    V.cam.position.set(0, 1.0, fit);
    V.cam.lookAt(0, 0.92, 0);
    V.R.render(V.S, V.cam);
  }
  function attach(el) {
    var V = viewer();
    if (!V || !el) return false;
    holder = el; token = 'hero' + Math.random(); V.owner = token; t0 = performance.now();
    el.appendChild(V.cv);
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    return true;
  }
  function detach(el) {
    var V = window.__amTaqV;
    if (!V || el !== holder) return;
    cancelAnimationFrame(raf); raf = 0;
    // only if nobody else has taken the view meanwhile
    if (V.owner === token) {
      V.owner = null;
      if (V.heroModel) V.heroModel.visible = false;
      if (V.heroBall) V.heroBall.visible = false;
      if (V.model) V.model.visible = true;
    }
    if (V.cv.parentNode === el) el.removeChild(V.cv);
    holder = null;
  }
  // built ahead of time on the menus so the home screen shows you at once
  function warm() {
    var V = viewer(), m = prepare();
    if (!V || !m) return;
    var vis = m.visible; m.visible = true;
    try { V.R.compile(V.S, V.cam); } catch (e) {}
    m.visible = vis;
  }
  window.AMViewer = viewer;
  window.AMHero = { attach: attach, detach: detach, warm: warm, play: play };
})();
