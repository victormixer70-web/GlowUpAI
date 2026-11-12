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
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); R = null; busy = false; });
      R.setPixelRatio(1.6); R.setSize(W, H, false);   // sharper on big screens and sharp phone displays
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
  // the gold cup on its plinth (the season pass and the cup share it)
  function trophy(sc) {
    var gold = new T.MeshStandardMaterial({ color: new T.Color('#FFC53D').convertSRGBToLinear(), metalness: 0.7, roughness: 0.25, emissive: new T.Color('#5A3A00'), emissiveIntensity: 0.4 });
    var cup = new T.Group();
    var prof = [[0, 0], [0.36, 0], [0.36, 0.1], [0.14, 0.18], [0.1, 0.5], [0.16, 0.56], [0.34, 0.75], [0.42, 1.05], [0.44, 1.25], [0.4, 1.27], [0, 1.0]].map(function (q) { return new T.Vector2(q[0], q[1]); });
    cup.add(new T.Mesh(new T.LatheGeometry(prof, 40), gold));
    [-1, 1].forEach(function (sd) { var h = new T.Mesh(new T.TorusGeometry(0.17, 0.035, 10, 24, Math.PI * 1.2), gold); h.position.set(sd * 0.46, 1.0, 0); h.rotation.z = sd > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; cup.add(h); });
    var base = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 0.5, 30), std('#2A1B6E', { r: 0.4 })); base.position.y = 0.25;
    var band = new T.Mesh(new T.CylinderGeometry(0.505, 0.505, 0.07, 30), new T.MeshBasicMaterial({ color: 0xa855f7 })); band.position.y = 0.36;
    cup.position.set(0, 0.5, 0); cup.scale.setScalar(0.95);
    var g = new T.Group(); g.add(base); g.add(band); g.add(cup); g.scale.setScalar(sc || 1); return g;
  }
  // a board with text drawn on it (a league table, today's challenges)
  function textBoard(w, h, draw) {
    var c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    draw(c.getContext('2d'), c.width, c.height);
    var tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding;
    var g = new T.Group();
    var fr = new T.Mesh(new T.BoxGeometry(w + 0.12, h + 0.12, 0.08), std('#1A1448', { r: 0.4 })); g.add(fr);
    var face = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, toneMapped: false })); face.position.z = 0.045; g.add(face);
    return g;
  }
  // bits of confetti hanging in the air
  function confetti(S, n, box) {
    var cols = ['#FFC53D', '#22D3EE', '#EC4899', '#A855F7', '#FFFFFF'];
    for (var i = 0; i < n; i++) {
      var r = function (k) { var x = Math.sin((i + 1) * (k + 3) * 12.9898) * 43758.5453; return x - Math.floor(x); };
      var q = new T.Mesh(new T.PlaneGeometry(0.09, 0.05), new T.MeshBasicMaterial({ color: new T.Color(cols[i % cols.length]), side: T.DoubleSide }));
      q.position.set(box[0] + r(1) * (box[1] - box[0]), box[2] + r(2) * (box[3] - box[2]), box[4] + r(3) * (box[5] - box[4]));
      q.rotation.set(r(4) * 6, r(5) * 6, r(6) * 6); S.add(q);
    }
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
    } else if (kind === 'copa') {
      // the cup: you and your team round the trophy, gold light and confetti
      add(patch(3.6));
      var tr = trophy(1.25); tr.position.set(0, 0, -0.6); S.add(tr);
      var mt = others(2);
      add(player({ char: mt[0], kit: homeKit(), x: -1.35, z: -0.9, face: 0.45, t: 0.8 }));
      add(player({ char: mt[1], kit: homeKit(), x: 1.35, z: -0.9, face: -0.45, t: 1.4 }));
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: -0.75, z: 0.7, face: 0.25, t: 0.2 }));
      var gl = new T.PointLight(0xffc53d, 2.2, 7); gl.position.set(0, 2.6, 1.0); S.add(gl);
      confetti(S, 60, [-2.4, 2.4, 1.2, 3.6, -1.6, 1.2]);
      look = { pos: [0, 2.3, 8.6], at: [0, 1.05, -0.3] };
    } else if (kind === 'liga') {
      // the league: the table on a big board behind, you and your rival face to face
      add(patch(3.6));
      add(line(0, -3.5, 0, 3.5));
      var tb = textBoard(3.4, 2.0, function (c, w, h) {
        var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2B1270'); g.addColorStop(1, '#12082F'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#A855F7'; c.fillRect(0, 0, w, 44);
        c.font = 'italic 800 32px Barlow Condensed, Arial'; c.fillStyle = '#FFFFFF'; c.textBaseline = 'middle'; c.fillText('LIGA ARENA · CLASIFICACIÓN', 18, 23);
        var rows = [['1', 'TU EQUIPO', '13', '#FFC53D'], ['2', 'RAYO', '11', '#22D3EE'], ['3', 'ATLÉTICO MIX', '9', '#EC4899'], ['4', 'DEPORTIVO', '7', '#4ADE80'], ['5', 'UNIÓN', '4', '#F97316'], ['6', 'REAL ARENA', '2', '#94A3B8']];
        rows.forEach(function (r, i) {
          var y = 66 + i * 34;
          if (i === 0) { c.fillStyle = 'rgba(255,197,61,.22)'; c.fillRect(8, y - 15, w - 16, 30); }
          c.fillStyle = r[3]; c.fillRect(18, y - 11, 8, 22);
          c.font = '800 24px Arial'; c.fillStyle = '#FFFFFF'; c.fillText(r[0], 38, y + 1);
          c.font = 'italic 800 25px Barlow Condensed, Arial'; c.fillText(r[1], 70, y + 1);
          c.textAlign = 'right'; c.fillStyle = i === 0 ? '#FFE38A' : '#DDD6FE'; c.fillText(r[2] + ' PTS', w - 22, y + 1); c.textAlign = 'left';
        });
      });
      tb.position.set(0, 2.0, -2.6); S.add(tb);
      add(ball(0, 0.5));
      var rv = others(1)[0];
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: -1.0, z: 0.4, face: Math.PI / 2 - 0.5, t: 0.3 }));
      add(player({ char: rv, kit: KIT_AWAY, x: 1.0, z: 0.2, face: -Math.PI / 2 + 0.5, t: 1.1 }));
      look = { pos: [0, 2.5, 9.6], at: [0, 1.25, -0.6] };
    } else if (kind === 'retos') {
      // today's challenges: targets glowing in the goal and the day's three challenges on a board
      add(patch(3.6));
      var mg = window.AMNet && window.AMNet.goal ? window.AMNet.goal(3.2, 1.5, 1.0) : null;
      if (mg) { mg.group.rotation.y = Math.PI; mg.group.position.set(0.3, 0, -2.4); add(mg.group); }
      [[-0.9, 1.15, 0xec4899], [1.5, 1.15, 0x22d3ee], [0.3, 0.45, 0xffc53d]].forEach(function (t) {
        var ring = new T.Mesh(new T.TorusGeometry(0.28, 0.045, 12, 36), new T.MeshBasicMaterial({ color: t[2] }));
        ring.position.set(t[0], t[1], -2.3); S.add(ring);
        var dot = new T.Mesh(new T.CircleGeometry(0.1, 20), new T.MeshBasicMaterial({ color: t[2] })); dot.position.set(t[0], t[1], -2.31); S.add(dot);
        var pl = new T.PointLight(t[2], 0.8, 2.5); pl.position.set(t[0], t[1], -1.9); S.add(pl);
      });
      var rb = textBoard(1.5, 1.25, function (c, w, h) {
        var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#DB2777'); g.addColorStop(1, '#7C3AED'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#FFFFFF';
        c.font = 'italic 800 56px Barlow Condensed, Arial'; c.fillText('HOY', w / 2, 70);
        c.font = 'italic 800 150px Barlow Condensed, Arial'; c.fillStyle = '#FFE38A'; c.fillText('3', w / 2, 210);
        c.font = 'italic 800 52px Barlow Condensed, Arial'; c.fillStyle = '#FFFFFF'; c.fillText('RETOS', w / 2, 330);
        c.font = '800 40px Arial'; c.fillText('★ ★ ★', w / 2, 390);
      });
      rb.position.set(-2.0, 1.25, -1.2); rb.rotation.y = 0.45; S.add(rb);
      add(ball(0.15, 1.3));
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 0.9, z: 1.9, face: Math.PI - 0.35, t: 0.4 }));
      look = { pos: [0.6, 2.4, 9.4], at: [-0.1, 1.0, -0.8] };
    } else if (kind === 'shirt') {
      // a shirt on its own, in 3D: the game's real kit painted in the team's colours, laid out with the arms open
      var kit = JSON.parse(key.slice(6));
      var m = A && A.ready() ? A.make({ char: 'dani', kit: { primary: kit.primary, secondary: kit.secondary, pattern: kit.pattern, shorts: kit.primary, socks: kit.primary, shoe: '#F2F5FA' }, noRing: true, noGear: true, fit: { sleeve: 'short', size: 'M' } }) : null;
      if (m) {
        m.traverse(function (o) { if (o.isMesh && !/Shirt/i.test(o.name)) o.visible = false; });
        S.add(m); m.updateMatrixWorld(true);
        var bx = new T.Box3(); m.traverse(function (o) { if (o.isMesh && o.visible) bx.expandByObject(o); });
        var cn = bx.getCenter(new T.Vector3()), sz = bx.getSize(new T.Vector3());
        // the crest on the left of the chest
        var cc = document.createElement('canvas'); cc.width = cc.height = 64;
        var cx = cc.getContext('2d'); cx.fillStyle = kit.secondary || '#150925'; cx.strokeStyle = '#FFFFFF'; cx.lineWidth = 4;
        cx.beginPath();
        if (kit.crestShape === 'circle') cx.arc(32, 32, 26, 0, Math.PI * 2);
        else if (kit.crestShape === 'diamond') { cx.moveTo(32, 4); cx.lineTo(60, 32); cx.lineTo(32, 60); cx.lineTo(4, 32); cx.closePath(); }
        else { cx.moveTo(8, 6); cx.lineTo(56, 6); cx.lineTo(56, 30); cx.quadraticCurveTo(54, 50, 32, 60); cx.quadraticCurveTo(10, 50, 8, 30); cx.closePath(); }
        cx.fill(); cx.stroke();
        cx.fillStyle = kit.primary || '#FFFFFF'; cx.font = '800 22px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText((kit.crest || '').slice(0, 2), 32, 33);
        var ct = new T.CanvasTexture(cc); ct.encoding = T.sRGBEncoding;
        var crest = new T.Mesh(new T.PlaneGeometry(0.125, 0.125), new T.MeshStandardMaterial({ map: ct, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
        crest.position.set(0.095, cn.y + sz.y * 0.2 + 0.014, 0.17); S.add(crest);
        // (the box is the bind pose, arms out: frame on the torso's height, centred on the body)
        cn.x = 0; var d = (sz.y / 2) / 0.6 / Math.tan(16 * Math.PI / 180);
        look = { pos: [cn.x + d * 0.18, cn.y + d * 0.06, cn.z + d], at: [cn.x, cn.y, cn.z] };
      }
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
    } else if (kind === 'pass') {
      // the season kit, gold and black, next to the season trophy
      add(patch(3.0));
      add(player({ char: you ? me : 'ty', kit: { primary: '#FFC53D', secondary: '#0B0B14', pattern: 'stripes', shorts: '#0B0B14', socks: '#FFC53D', shoe: '#0B0B14' }, x: -0.55, z: 0.2, face: 0.35, t: 0.5 }));
      var gold = new T.MeshStandardMaterial({ color: new T.Color('#FFC53D').convertSRGBToLinear(), metalness: 0.7, roughness: 0.25, emissive: new T.Color('#5A3A00'), emissiveIntensity: 0.4 });
      var cup = new T.Group();
      var prof = [[0, 0], [0.36, 0], [0.36, 0.1], [0.14, 0.18], [0.1, 0.5], [0.16, 0.56], [0.34, 0.75], [0.42, 1.05], [0.44, 1.25], [0.4, 1.27], [0, 1.0]].map(function (q) { return new T.Vector2(q[0], q[1]); });
      cup.add(new T.Mesh(new T.LatheGeometry(prof, 40), gold));
      [-1, 1].forEach(function (sd) { var h = new T.Mesh(new T.TorusGeometry(0.17, 0.035, 10, 24, Math.PI * 1.2), gold); h.position.set(sd * 0.46, 1.0, 0); h.rotation.z = sd > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; cup.add(h); });
      var base = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 0.5, 30), std('#141428', { r: 0.4 })); base.position.y = 0.25; S.add(base);
      cup.position.set(0, 0.5, 0); cup.scale.setScalar(0.95);
      var stand = new T.Group(); stand.add(base); stand.add(cup); stand.position.set(0.95, 0, -0.1); S.add(stand);
      var glow = new T.PointLight(0xffc53d, 1.4, 6); glow.position.set(0.9, 2.2, 1.2); S.add(glow);
      look = { pos: [0.2, 1.7, 6.4], at: [0.2, 1.0, 0] };
    } else if (kind === 'card') {
      // the profile card's portrait: you in your kit, from the knees up, lit like a trading card
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 0, z: 0, face: 0.28, t: 0.35 }));
      var spot = new T.PointLight(0xffffff, 0.9, 8); spot.position.set(1.5, 2.6, 2.4); S.add(spot);
      look = { pos: [0.12, 1.4, 3.1], at: [0, 1.18, 0] };
    } else if (kind === 'full') {
      // you, head to boots, standing on nothing (for screens that put you on their own ground)
      add(player({ char: you ? me : 'ty', kit: homeKit(), you: true, x: 0, z: 0, face: 0.28, t: 0.35 }));
      var spot2 = new T.PointLight(0xffffff, 0.9, 8); spot2.position.set(1.5, 2.6, 2.4); S.add(spot2);
      look = { pos: [0.1, 1.05, 5.4], at: [0, 0.93, 0] };
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
    var url = R.domElement.toDataURL('image/webp', 0.86); if (url.indexOf('data:image/webp') !== 0) url = R.domElement.toDataURL('image/png');
    S.traverse(function (o) { if (o.geometry && o.geometry !== undefined) o.geometry.dispose(); });
    return url;
  }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    setTimeout(function () {
      var job = queue.shift();
      try { if (!cache[job.key]) { cache[job.key] = render(job.key); store(job.key, cache[job.key]); } } catch (e) { cache[job.key] = ''; console.error(e); }
      job.cbs.forEach(function (f) { try { f(cache[job.key]); } catch (e) {} });
      busy = false; pump();
    }, 30);
  }
  // kept on the phone too, so the cards have their pictures straight away next time the app is opened
  var PKEY = 'arenamix.poster4.';   // 4: box goals
  // the pictures kept by an older version were smaller: let them go
  try { for (var oi = localStorage.length - 1; oi >= 0; oi--) { var ok = localStorage.key(oi); if (ok && (ok.indexOf('arenamix.poster.') === 0 || ok.indexOf('arenamix.poster2.') === 0 || ok.indexOf('arenamix.poster3.') === 0)) localStorage.removeItem(ok); } } catch (e) {}
  function stored(key) { try { return localStorage.getItem(PKEY + key); } catch (e) { return null; } }
  function store(key, url) {
    if (!url) return;
    try { localStorage.setItem(PKEY + key, url); } catch (e) {
      // full: forget the old pictures and try once more
      try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(PKEY) === 0) localStorage.removeItem(k); } localStorage.setItem(PKEY + key, url); } catch (e2) {}
    }
  }
  function get(key, onReady) {
    if (cache[key] != null) return cache[key];
    var st = stored(key); if (st) { cache[key] = st; return st; }
    if (!stage() || !window.AMChars || !window.AMChars.ready()) return '';
    var job = queue.find(function (j) { return j.key === key; });
    if (job) { if (onReady) job.cbs.push(onReady); }
    else queue.push({ key: key, cbs: onReady ? [onReady] : [] });
    pump();
    return '';
  }
  // the card portrait changes with your character and kit: its key carries them
  function cardKey() { var A = window.AMChars; return 'card:' + (A ? A.pref() : '') + ':' + JSON.stringify(homeKit()); }
  function fullKey() { return 'full' + cardKey().slice(4); }
  window.AMPosters = { get: get, cardKey: cardKey, fullKey: fullKey };
})();
