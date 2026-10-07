/* ARENA MIX mode posters: a little 3D scene for each game mode, drawn once on the phone and kept as a
   picture: your player and the others on a patch of pitch (1 vs 1 to 4 vs 4), the penalty spot in front of
   the goal, the free-kick wall, a training ground with cones. AMPosters.get(key, onReady) gives the picture
   (or '' the first time, then calls onReady when it is drawn); they are drawn one at a time, between frames. */
(function () {
  var T = window.THREE;
  if (!T) return;
  var W = 300, H = 380, R = null, cam = null, cache = {}, queue = [], busy = false;

  function stage() {
    if (R) return true;
    try {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setPixelRatio(1); R.setSize(W, H, false);
      R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.15;
      R.setClearColor(0, 0);
    } catch (e) { R = null; return false; }
    cam = new T.PerspectiveCamera(32, W / H, 0.1, 80);
    return true;
  }
  function std(c, o) { o = o || {}; return new T.MeshStandardMaterial({ color: new T.Color(c).convertSRGBToLinear(), roughness: o.r == null ? 0.6 : o.r, metalness: o.m || 0, transparent: !!o.op, opacity: o.op || 1, depthWrite: !o.op }); }
  function scene() {
    var S = new T.Scene();
    S.add(new T.HemisphereLight(0xdfe8ff, 0x1d3a24, 0.95));
    var k = new T.DirectionalLight(0xffffff, 1.25); k.position.set(4, 8, 6); S.add(k);
    var r = new T.DirectionalLight(0x22d3ee, 0.9); r.position.set(-6, 3, -5); S.add(r);
    var r2 = new T.DirectionalLight(0xffc53d, 0.5); r2.position.set(6, 2, -5); S.add(r2);
    return S;
  }
  // a round patch of striped grass with a glowing rim, fading into the card
  var grassTex = null;
  function patch(rad) {
    if (!grassTex) {
      var c = document.createElement('canvas'); c.width = c.height = 256;
      var x = c.getContext('2d');
      for (var i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#0F4D2A' : '#13593A'; x.fillRect(i * 32, 0, 32, 256); }
      var g = x.createRadialGradient(128, 128, 60, 128, 128, 128); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      grassTex = new T.CanvasTexture(c); grassTex.encoding = T.sRGBEncoding;
    }
    var gr = new T.Group();
    var d = new T.Mesh(new T.CircleGeometry(rad, 64), new T.MeshStandardMaterial({ map: grassTex, roughness: 0.9 }));
    d.rotation.x = -Math.PI / 2; gr.add(d);
    var rim = new T.Mesh(new T.RingGeometry(rad - 0.06, rad + 0.04, 72), new T.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 }));
    rim.rotation.x = -Math.PI / 2; rim.position.y = 0.01; gr.add(rim);
    return gr;
  }
  function ball(x, z) {
    var b = new T.Mesh(new T.SphereGeometry(0.11 * 1.6, 28, 18), window.AMBall ? window.AMBall.material() : std('#FFFFFF'));
    b.position.set(x, 0.11 * 1.6, z); return b;
  }
  function line(x0, z0, x1, z1) {
    var m = new T.Mesh(new T.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), 0.06), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0); m.position.set((x0 + x1) / 2, 0.012, (z0 + z1) / 2); return m;
  }
  function cone(x, z) {
    var g = new T.Group();
    g.add(new T.Mesh(new T.ConeGeometry(0.16, 0.42, 18), std('#FF8A3D', { r: 0.5 }))); g.children[0].position.y = 0.21;
    var s = new T.Mesh(new T.CylinderGeometry(0.105, 0.125, 0.07, 18), std('#FFFFFF')); s.position.y = 0.2; g.add(s);
    g.position.set(x, 0, z); return g;
  }
  var KIT_AWAY = { primary: '#2F7BFF', secondary: '#F4F4F6', pattern: 'solid', shorts: '#F4F4F6', socks: '#2F7BFF', shoe: '#F2F5FA' };
  function homeKit() {
    var o = window.AMChars && window.AMChars.outfit('futbol');
    return o ? Object.assign({}, o) : { primary: '#FF8A3D', secondary: '#0B0B14', pattern: 'solid', shorts: '#17172A', socks: '#F4F4FA', shoe: '#C8F031' };
  }
  // a player standing at (x, z), turned to face `face` (radians, 0 = towards the camera), in a pose
  function player(o) {
    var A = window.AMChars;
    if (!A || !A.ready()) return null;
    var m = A.make({ char: o.char, kit: o.kit, you: !!o.you, gear: !!o.you, noRing: true });
    if (!m) return null;
    m.position.set(o.x, 0, o.z); m.rotation.y = o.face || 0;
    var an = m.userData.anim, clip = o.clip || 'idle';
    if (an && A.clip(clip)) an.layers = [{ id: clip, t: o.t != null ? o.t : Math.random() * 2, w: 1 }];
    return m;
  }
  function others(n) {
    var A = window.AMChars, me = A.pref(), L = A.list.map(function (c) { return c.id; }).filter(function (id) { return id !== me; });
    var out = []; for (var i = 0; i < n; i++) out.push(L[(i * 3 + 1) % L.length]);
    return out;
  }
  function build(key) {
    var S = scene(), A = window.AMChars, me = A ? A.pref() : 'ty', you = me !== 'clasico';
    var add = function (o) { if (o) S.add(o); return o; };
    var p = key.split(':'), kind = p[0], look = { pos: [0, 2.6, 9], at: [0, 0.9, 0] };
    if (kind === 'team') {
      var n = +p[1] || 1, mates = others(n * 2), k = 0;
      add(patch(n > 2 ? 4.4 : 3.6));
      add(line(0, -(n > 2 ? 4.3 : 3.5), 0, n > 2 ? 4.3 : 3.5));
      add(ball(0, 0.6));
      // your side on the left, theirs on the right, facing each other a little towards the camera
      for (var i = 0; i < n; i++) {
        var row = n === 1 ? [0] : n === 2 ? [-0.9, 0.9] : n === 3 ? [-1.5, 0, 1.5] : [-2.1, -0.7, 0.7, 2.1];
        var z = row[i], x = 1.1 + Math.abs(z) * 0.35 + (n > 2 ? 0.4 : 0);
        add(player({ char: i === 0 && you ? me : mates[k++], kit: homeKit(), you: i === 0, x: -x, z: z * 0.8, face: Math.PI / 2 - 0.5, t: i * 0.7 }));
        add(player({ char: mates[k++], kit: KIT_AWAY, x: x, z: z * 0.8 - 0.2, face: -Math.PI / 2 + 0.5, t: i * 0.9 + 0.3 }));
      }
      look = n > 2 ? { pos: [0, 4.2, 13.5], at: [0, 0.8, 0] } : n === 2 ? { pos: [0, 3.4, 11.2], at: [0, 0.85, 0] } : { pos: [0, 3.0, 9.6], at: [0, 0.9, 0] };
    } else if (kind === 'pen' || kind === 'free') {
      add(patch(4.2));
      var goal = window.AMNet && window.AMNet.goal ? window.AMNet.goal(4.6, 1.9, 1.3) : null;
      if (goal) { goal.group.rotation.y = Math.PI; goal.group.position.set(0, 0, -3.1); add(goal.group); }
      add(player({ char: others(1)[0], kit: { primary: '#2FBF71', secondary: '#0B0B14', pattern: 'solid', shorts: '#0B0B14', socks: '#2FBF71', shoe: '#F2F5FA' }, x: 0.2, z: -2.6, face: 0, clip: 'gkIdle', t: 0.4 }));
      if (kind === 'free') {
        var wall = others(4).slice(1);
        [-0.55, 0, 0.55].forEach(function (x, i) { add(player({ char: wall[i], kit: KIT_AWAY, x: x - 0.3, z: -0.4, face: 0, t: i * 0.5 })); });
        add(ball(0.9, 2.2));
        add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 1.7, z: 3.1, face: Math.PI - 0.5, t: 0.2 }));
        look = { pos: [3.6, 3.0, 10.4], at: [0, 0.8, -0.4] };
      } else {
        add(ball(0, 1.1));
        add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 0.5, z: 2.4, face: Math.PI - 0.15, t: 0.2 }));
        look = { pos: [2.2, 2.7, 10.2], at: [0, 0.9, -0.6] };
      }
    } else if (kind === 'private') {
      add(patch(3.4));
      var fr = others(3);
      // you and your friends, side by side, with a ring of light round you
      add(player({ char: fr[0], kit: homeKit(), x: -1.15, z: -0.3, face: 0.35, t: 0.4 }));
      add(player({ char: fr[1], kit: homeKit(), x: 1.15, z: -0.3, face: -0.35, t: 1.2 }));
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 0, z: 0.45, face: 0, t: 0.1 }));
      add(ball(0.55, 1.25));
      look = { pos: [0, 2.8, 9.6], at: [0, 0.9, 0] };
    } else if (kind === 'train') {
      add(patch(3.6));
      [[-1.8, -1.2], [-0.6, -0.4], [0.6, -1.2], [1.8, -0.4]].forEach(function (c) { add(cone(c[0], c[1])); });
      var mini = window.AMNet && window.AMNet.goal ? window.AMNet.goal(2.4, 1.1, 0.8) : null;
      if (mini) { mini.group.rotation.y = Math.PI; mini.group.position.set(0, 0, -2.6); add(mini.group); }
      add(ball(-0.2, 1.1));
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: -0.9, z: 1.6, face: Math.PI - 0.6, t: 0.3 }));
      look = { pos: [1.4, 3.0, 9.8], at: [0, 0.75, -0.5] };
    } else if (kind === 'tut') {
      add(patch(3.2));
      add(cone(-1.5, -0.6)); add(cone(1.5, -0.6));
      // a coach's board on a stand
      var board = new T.Mesh(new T.BoxGeometry(1.5, 1.0, 0.06), std('#F4F4FA', { r: 0.4 })); board.position.set(1.2, 1.5, -1.2); board.rotation.y = -0.35; S.add(board);
      var leg = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1.1, 8), std('#2E2E52')); leg.position.set(1.2, 0.55, -1.25); S.add(leg);
      [[-0.4, 0.2, '#22D3EE'], [0.1, -0.15, '#FF8A3D'], [0.45, 0.25, '#22D3EE']].forEach(function (d) { var dot = new T.Mesh(new T.CircleGeometry(0.08, 16), new T.MeshBasicMaterial({ color: d[2] })); dot.position.set(d[0], d[1], 0.035); board.add(dot); });
      add(ball(-0.3, 0.9));
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: -0.6, z: 0.3, face: 0.5, t: 0.6 }));
      look = { pos: [0, 2.8, 9.4], at: [0, 0.9, -0.2] };
    } else {
      add(patch(3)); add(ball(0, 0));
    }
    cam.position.fromArray(look.pos); cam.lookAt(new T.Vector3().fromArray(look.at));
    return S;
  }
  function render(key) {
    var S = build(key);
    // twice: skinned models settle their pose on the first draw
    R.render(S, cam); R.render(S, cam);
    var url = R.domElement.toDataURL('image/png');
    S.traverse(function (o) { if (o.geometry && o.geometry !== undefined) o.geometry.dispose(); });
    return url;
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    setTimeout(function () {
      var job = queue.shift();
      try { if (!cache[job.key]) cache[job.key] = render(job.key); } catch (e) { cache[job.key] = ''; console.error(e); }
      job.cbs.forEach(function (f) { try { f(cache[job.key]); } catch (e) {} });
      busy = false; pump();
    }, 30);
  }
  function get(key, onReady) {
    if (cache[key] != null) return cache[key];
    if (!stage() || !window.AMChars || !window.AMChars.ready()) return '';
    var job = queue.find(function (j) { return j.key === key; });
    if (job) { if (onReady) job.cbs.push(onReady); }
    else queue.push({ key: key, cbs: onReady ? [onReady] : [] });
    pump();
    return '';
  }
  window.AMPosters = { get: get };
})();
