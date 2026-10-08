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
    var t = (performance.now() - t0) / 1000;
    // a slow sway, turned a little towards the panel
    m.rotation.y = -0.35 + Math.sin(t * 0.5) * 0.12;
    var an = m.userData.anim;
    if (an && A.clip('idle')) an.layers = [{ id: 'idle', t: t, w: 1 }];
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
  window.AMHero = { attach: attach, detach: detach, warm: warm };
})();
