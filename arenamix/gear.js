/* ARENA MIX gear: the Taquilla accessories (hats, glasses, boots) as real 3D models.
   AMGear.hat(kind, color) and AMGear.face(kind) build them in head units: R = 1 is half the head's
   width, +z is the face. Hats sit on y = 0 (the rim, around the forehead); face gear is centred on the
   eyes with z = 0 at the front of the eyes. AMChars measures each character's head and fits them on it.
   AMGear.thumb(cat, item) renders a shop picture of an item (cached), on a mannequin head or alone. */
(function () {
  var T = window.THREE;
  if (!T) return;

  function std(color, o) {
    o = o || {};
    return new T.MeshStandardMaterial({ color: new T.Color(color).convertSRGBToLinear(), roughness: o.r == null ? 0.55 : o.r, metalness: o.m || 0,
      transparent: !!o.op, opacity: o.op || 1, side: o.side || T.FrontSide, emissive: o.em ? new T.Color(o.em).convertSRGBToLinear() : new T.Color(0), emissiveIntensity: o.ei || 1 });
  }
  function mesh(geo, mat, x, y, z) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; return m; }
  // a dome: the top part of a sphere, down to `to` (radians from the top)
  function dome(r, to, mat, seg) { return mesh(new T.SphereGeometry(r, seg || 32, 16, 0, Math.PI * 2, 0, to), mat); }
  // a horn / curl: a chain of tapering segments along points
  function horn(pts, r0, r1, mat) {
    var g = new T.Group(), n = pts.length - 1;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[i + 1], len = a.distanceTo(b), ra = r0 + (r1 - r0) * i / n, rb = r0 + (r1 - r0) * (i + 1) / n;
      var c = mesh(new T.CylinderGeometry(rb, ra, len * 1.08, 14), mat);
      c.position.copy(a).add(b).multiplyScalar(0.5);
      c.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(c);
    }
    var tip = mesh(new T.SphereGeometry(r1, 10, 8), mat); tip.position.copy(pts[n]); g.add(tip);
    return g;
  }
  function star(rOut, rIn) {
    var s = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? rIn : rOut;
      if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  }
  function rounded(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function ext(shape, depth, mat, bevel) {
    var g = new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: bevel !== false, bevelThickness: depth * 0.4, bevelSize: depth * 0.4, bevelSegments: 2, curveSegments: 16 });
    g.translate(0, 0, -depth / 2);
    return mesh(g, mat);
  }
  // glasses arms, from the frame's outer edges back over the ears
  function temples(g, x, mat) {
    [-1, 1].forEach(function (s) {
      var t = mesh(new T.BoxGeometry(0.06, 0.07, 1.05), mat, s * x, 0.05, -0.5);
      t.rotation.y = s * 0.06; g.add(t);
    });
  }

  var HATS = {
    none: function () { return null; },
    band: function (c) {
      var g = new T.Group(), m = std(c || '#C8F031', { r: 0.8 });
      var b = mesh(new T.CylinderGeometry(1.04, 1.06, 0.26, 40, 1, true), std(c || '#C8F031', { r: 0.8, side: T.DoubleSide }), 0, -0.12, 0);
      g.add(b);
      var e = mesh(new T.TorusGeometry(1.05, 0.035, 8, 40), m, 0, -0.0, 0); e.rotation.x = Math.PI / 2; g.add(e);
      var e2 = e.clone(); e2.position.y = -0.24; g.add(e2);
      // a little white swoosh on the front
      var l = mesh(new T.BoxGeometry(0.3, 0.06, 0.04), std('#FFFFFF'), 0, -0.12, 1.06); l.rotation.z = 0.25; g.add(l);
      return g;
    },
    cap: function (c) {
      var g = new T.Group(), m = std(c || '#2F4BA8', { r: 0.7 }), dark = std(new T.Color(c || '#2F4BA8').multiplyScalar(0.6).getStyle(), { r: 0.7 });
      var d = dome(1.12, Math.PI / 2, m); d.scale.y = 0.85; d.position.y = -0.1; g.add(d);
      // panel seams
      for (var i = 0; i < 3; i++) { var s = mesh(new T.TorusGeometry(1.125, 0.014, 4, 40, Math.PI), dark); s.rotation.y = i * Math.PI / 3; s.scale.y = 0.85; s.position.y = -0.1; g.add(s); }
      var bt = mesh(new T.SphereGeometry(0.09, 12, 8), m, 0, 0.82, 0); g.add(bt);
      // visor: a flattened, curved disc out the front
      var v = mesh(new T.CylinderGeometry(0.85, 0.85, 0.05, 32, 1, false, -Math.PI / 2, Math.PI), dark, 0, -0.08, 0.72);
      v.scale.set(1.05, 1, 0.95); v.rotation.x = 0.12; g.add(v);
      var logo = mesh(new T.CircleGeometry(0.2, 20), std('#FFFFFF', { r: 0.5 }), 0, 0.3, 1.035); logo.rotation.x = -0.45; g.add(logo);
      return g;
    },
    top: function () {
      var g = new T.Group(), k = std('#1A1A22', { r: 0.35 });
      g.add(mesh(new T.CylinderGeometry(0.82, 0.78, 1.5, 36), k, 0, 0.75, 0));
      g.add(mesh(new T.CylinderGeometry(1.45, 1.45, 0.07, 40), k, 0, 0.02, 0));
      g.add(mesh(new T.CylinderGeometry(0.795, 0.79, 0.28, 36), std('#E5484D', { r: 0.5 }), 0, 0.22, 0));
      g.scale.setScalar(0.92);
      return g;
    },
    chef: function () {
      var g = new T.Group(), w = std('#FAFAFA', { r: 0.9 });
      g.add(mesh(new T.CylinderGeometry(1.02, 1.0, 0.75, 36), w, 0, 0.3, 0));
      [[0, 1.05, 0, 0.72], [0.55, 0.95, 0.2, 0.55], [-0.55, 0.95, 0.2, 0.55], [0.3, 0.95, -0.5, 0.55], [-0.3, 0.95, -0.5, 0.55], [0, 1.0, 0.55, 0.5]].forEach(function (p) {
        g.add(mesh(new T.SphereGeometry(p[3], 20, 14), w, p[0], p[1], p[2]));
      });
      return g;
    },
    viking: function () {
      var g = new T.Group(), steel = std('#9AA3B5', { r: 0.3, m: 0.8 }), gold = std('#D9A520', { r: 0.3, m: 0.9 }), bone = std('#F2E6C8', { r: 0.6 });
      var d = dome(1.1, Math.PI / 2, steel); d.scale.y = 0.95; d.position.y = -0.08; g.add(d);
      var band = mesh(new T.CylinderGeometry(1.13, 1.13, 0.22, 40, 1, true), std('#D9A520', { r: 0.3, m: 0.9, side: T.DoubleSide }), 0, -0.02, 0); g.add(band);
      var ridge = mesh(new T.TorusGeometry(1.06, 0.07, 8, 32, Math.PI), gold, 0, -0.08, 0); ridge.rotation.y = Math.PI / 2; ridge.scale.y = 0.95; g.add(ridge);
      for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; g.add(mesh(new T.SphereGeometry(0.06, 8, 6), gold, Math.sin(a) * 1.14, -0.02, Math.cos(a) * 1.14)); }
      [-1, 1].forEach(function (s) {
        var pts = [];
        for (var j = 0; j <= 6; j++) { var u = j / 6; pts.push(new T.Vector3(s * (0.95 + u * 0.75), 0.35 + u * 0.55 + u * u * 0.6, 0.05 + u * 0.15)); }
        g.add(horn(pts, 0.24, 0.03, bone));
      });
      // nose guard
      g.add(mesh(new T.BoxGeometry(0.16, 0.5, 0.08), steel, 0, -0.3, 1.1));
      return g;
    },
    prop: function () {
      var g = new T.Group(), cols = ['#E5484D', '#FFC53D', '#22D3EE', '#2FBF71'];
      for (var i = 0; i < 4; i++) {
        var d = mesh(new T.SphereGeometry(1.06, 12, 14, i * Math.PI / 2, Math.PI / 2, 0, Math.PI / 2), std(cols[i], { r: 0.6 }), 0, -0.1, 0);
        d.scale.y = 0.85; g.add(d);
      }
      var rim = mesh(new T.TorusGeometry(1.06, 0.05, 8, 40), std('#2E2E52'), 0, -0.1, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
      g.add(mesh(new T.CylinderGeometry(0.05, 0.05, 0.4, 8), std('#2E2E52'), 0, 0.9, 0));
      var p = new T.Group(); p.position.y = 1.1; g.add(p);
      [0, Math.PI].forEach(function (a, k) {
        var b = mesh(new T.SphereGeometry(0.5, 16, 8), std(k ? '#22D3EE' : '#2FBF71', { r: 0.4 }), Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
        b.scale.set(1, 0.08, 0.28); b.rotation.y = -a; b.rotation.x = 0.25; p.add(b);
      });
      p.add(mesh(new T.SphereGeometry(0.1, 10, 8), std('#FFC53D'), 0, 0.02, 0));
      // spins on its own while it's drawn
      p.children[0].onBeforeRender = function () { p.rotation.y = performance.now() / 120; };
      return g;
    },
    crown: function () {
      var g = new T.Group(), gold = std('#FFC53D', { r: 0.22, m: 1 }), ruby = std('#E5484D', { r: 0.1, m: 0.2, em: '#5A0A10' }), sap = std('#22D3EE', { r: 0.1, em: '#0A3A44' });
      g.add(mesh(new T.CylinderGeometry(0.92, 0.9, 0.4, 40, 1, true), std('#FFC53D', { r: 0.22, m: 1, side: T.DoubleSide }), 0, 0.12, 0));
      var b = mesh(new T.TorusGeometry(0.92, 0.05, 8, 40), gold, 0, -0.08, 0); b.rotation.x = Math.PI / 2; g.add(b);
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2, s = mesh(new T.ConeGeometry(0.17, 0.5, 4), gold, Math.sin(a) * 0.9, 0.55, Math.cos(a) * 0.9);
        s.rotation.y = a + Math.PI / 4; g.add(s);
        g.add(mesh(new T.SphereGeometry(0.07, 10, 8), gold, Math.sin(a) * 0.9, 0.82, Math.cos(a) * 0.9));
        g.add(mesh(new T.OctahedronGeometry(0.1), i % 2 ? sap : ruby, Math.sin(a) * 0.95, 0.12, Math.cos(a) * 0.95));
      }
      var vel = mesh(new T.SphereGeometry(0.85, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#8E1F2F', { r: 0.9 }), 0, 0.15, 0); vel.scale.y = 0.5; g.add(vel);
      g.rotation.z = -0.08;
      return g;
    },
    sprout: function () {
      var g = new T.Group(), gr = std('#2FBF71', { r: 0.5 }), lg = std('#53D88E', { r: 0.5 });
      g.add(horn([new T.Vector3(0, 0.45, 0), new T.Vector3(0.03, 0.9, 0), new T.Vector3(-0.02, 1.35, 0.02)], 0.07, 0.045, gr));
      [[-1, gr], [1, lg]].forEach(function (p) {
        var l = mesh(new T.SphereGeometry(0.36, 16, 10), p[1], p[0] * 0.32, 1.42, 0);
        l.scale.set(1, 0.18, 0.55); l.rotation.z = p[0] * 0.5; g.add(l);
      });
      return g;
    },
    phones: function () {
      var g = new T.Group(), dark = std('#17172A', { r: 0.4 }), cy = std('#22D3EE', { r: 0.35, em: '#0B4A55', ei: 0.6 });
      var arc = mesh(new T.TorusGeometry(1.14, 0.09, 10, 40, Math.PI), dark, 0, -0.45, 0); g.add(arc);
      [-1, 1].forEach(function (s) {
        var cup = mesh(new T.CylinderGeometry(0.42, 0.42, 0.3, 28), cy, s * 1.15, -0.55, 0); cup.rotation.z = Math.PI / 2; g.add(cup);
        var pad = mesh(new T.CylinderGeometry(0.36, 0.36, 0.12, 24), dark, s * 1.0, -0.55, 0); pad.rotation.z = Math.PI / 2; g.add(pad);
        var ring = mesh(new T.TorusGeometry(0.3, 0.04, 8, 24), std('#FFFFFF', { em: '#FFFFFF', ei: 0.5 }), s * 1.31, -0.55, 0); ring.rotation.y = Math.PI / 2; g.add(ring);
      });
      return g;
    }
  };

  var FACES = {
    none: function () { return null; },
    sun: function () {
      var g = new T.Group(), fr = std('#17172A', { r: 0.3 }), lens = std('#101828', { r: 0.05, m: 0.6 });
      [-1, 1].forEach(function (s) {
        var l = ext(rounded(0.62, 0.42, 0.16), 0.05, lens); l.position.set(s * 0.4, -0.02, 0.02); g.add(l);
        var f = ext(rounded(0.7, 0.5, 0.2), 0.03, fr); f.position.set(s * 0.4, -0.02, -0.02); g.add(f);
      });
      g.add(mesh(new T.BoxGeometry(0.2, 0.06, 0.06), fr, 0, 0.1, 0.02));
      temples(g, 0.76, fr);
      return g;
    },
    round: function () {
      var g = new T.Group(), gold = std('#C9A227', { r: 0.25, m: 1 }), glass = std('#BFE9FF', { r: 0.02, op: 0.25 });
      [-1, 1].forEach(function (s) {
        var r = mesh(new T.TorusGeometry(0.25, 0.035, 10, 32), gold, s * 0.38, 0, 0.03); g.add(r);
        var l = mesh(new T.CircleGeometry(0.25, 28), glass, s * 0.38, 0, 0.03); g.add(l);
      });
      var br = mesh(new T.TorusGeometry(0.09, 0.025, 8, 16, Math.PI), gold, 0, 0.04, 0.03); g.add(br);
      temples(g, 0.63, gold);
      return g;
    },
    star: function () {
      var g = new T.Group(), pink = std('#FF5C8A', { r: 0.35 }), glass = std('#FFD1E0', { r: 0.05, op: 0.45 });
      [-1, 1].forEach(function (s) {
        var f = ext(star(0.38, 0.17), 0.05, pink); f.position.set(s * 0.42, 0, 0); g.add(f);
        var l = ext(star(0.28, 0.12), 0.03, glass, false); l.position.set(s * 0.42, 0, 0.05); g.add(l);
      });
      g.add(mesh(new T.BoxGeometry(0.18, 0.05, 0.05), pink, 0, 0.06, 0.02));
      temples(g, 0.78, pink);
      return g;
    },
    d3: function () {
      var g = new T.Group(), w = std('#F4F4F6', { r: 0.5 });
      var f = ext(rounded(1.55, 0.48, 0.08), 0.05, w); g.add(f);
      g.add(mesh(new T.PlaneGeometry(0.58, 0.32), std('#E5484D', { r: 0.1, op: 0.85, em: '#5A0A10' }), -0.38, 0, 0.06));
      g.add(mesh(new T.PlaneGeometry(0.58, 0.32), std('#5B8CFF', { r: 0.1, op: 0.85, em: '#0A2060' }), 0.38, 0, 0.06));
      temples(g, 0.78, w);
      return g;
    },
    ski: function () {
      var g = new T.Group(), or = std('#FF8A3D', { r: 0.5, side: T.DoubleSide }), lens = std('#A78BFA', { r: 0.05, m: 0.7, side: T.DoubleSide, em: '#3A1A70', ei: 0.4 });
      // a curved visor that wraps the face, and a strap around the head
      var fr = mesh(new T.CylinderGeometry(1.08, 1.08, 0.5, 40, 1, true, -1.15, 2.3), or, 0, 0, -0.95); g.add(fr);
      var ln = mesh(new T.CylinderGeometry(1.1, 1.1, 0.36, 40, 1, true, -1.05, 2.1), lens, 0, 0, -0.95); g.add(ln);
      var st = mesh(new T.CylinderGeometry(1.03, 1.03, 0.2, 40, 1, true), std('#2E2E52', { side: T.DoubleSide }), 0, 0, -0.95); g.add(st);
      return g;
    },
    stache: function () {
      var g = new T.Group(), hair = std('#241811', { r: 0.85 });
      [-1, 1].forEach(function (s) {
        var pts = [];
        for (var j = 0; j <= 6; j++) { var u = j / 6; pts.push(new T.Vector3(s * (0.03 + u * 0.44), -0.66 - Math.sin(u * Math.PI) * 0.06 + u * u * 0.18, 0.08 - u * u * 0.34)); }
        g.add(horn(pts, 0.13, 0.04, hair));
      });
      return g;
    }
  };

  function hat(kind, color) { var f = HATS[kind]; return f ? f(color) : null; }
  function face(kind) { var f = FACES[kind]; return f ? f() : null; }

  // a football boot, for the shop: sole with studs, a shaped upper in the colour, white laces and swoosh
  function boot(color) {
    var g = new T.Group(), c = std(color || '#F2F5FA', { r: 0.4 }), sole = std('#F4F4FA', { r: 0.5 }), dk = std('#17172A', { r: 0.5 });
    var s = new T.Shape();
    s.moveTo(-1.0, 0); s.lineTo(1.05, 0); s.quadraticCurveTo(1.4, 0.05, 1.3, 0.3); s.quadraticCurveTo(1.0, 0.55, 0.4, 0.6);
    s.lineTo(-0.35, 0.95); s.quadraticCurveTo(-0.85, 1.05, -1.0, 0.85); s.quadraticCurveTo(-1.15, 0.4, -1.0, 0);
    var up = new T.ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 4, curveSegments: 20 });
    up.translate(0, 0, -0.31);
    g.add(mesh(up, c, 0, 0.12, 0));
    var so = mesh(new T.BoxGeometry(2.45, 0.12, 0.86), dk, 0.08, 0.06, 0); g.add(so);
    // the ankle opening and a contrast heel counter
    var col = mesh(new T.CylinderGeometry(0.34, 0.34, 0.06, 24), dk, -0.62, 1.08, 0); col.scale.z = 1.1; col.rotation.z = 0.15; g.add(col);
    var heel = mesh(new T.BoxGeometry(0.3, 0.55, 0.9), sole, -1.02, 0.42, 0); g.add(heel);
    [[-0.75, 0.25], [-0.75, -0.25], [0.35, 0.28], [0.35, -0.28], [0.8, 0.25], [0.8, -0.25], [1.1, 0]].forEach(function (p) {
      g.add(mesh(new T.CylinderGeometry(0.06, 0.08, 0.14, 10), sole, p[0], -0.04, p[1]));
    });
    for (var i = 0; i < 4; i++) { var l = mesh(new T.BoxGeometry(0.06, 0.04, 0.36), std('#FFFFFF'), 0.28 - i * 0.17, 0.78 + i * 0.07, 0); l.rotation.z = 0.35; g.add(l); }
    var sw = mesh(new T.TorusGeometry(0.45, 0.04, 6, 24, Math.PI * 0.7), dk, 0.15, 0.45, 0.47); sw.rotation.z = Math.PI * 1.08; g.add(sw);
    return g;
  }

  /* ---------- shop pictures ---------- */
  var R = null, S = null, cam = null, cache = {};
  function stage() {
    if (R) return true;
    try {
      var cv = document.createElement('canvas'); cv.width = cv.height = 192;
      R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
      R.setClearColor(0, 0); R.setSize(192, 192, false);
    } catch (e) { R = null; return false; }
    S = new T.Scene();
    S.add(new T.HemisphereLight(0xe8eeff, 0x302848, 1.0));
    var k = new T.DirectionalLight(0xffffff, 1.4); k.position.set(2, 4, 3); S.add(k);
    var r = new T.DirectionalLight(0x22d3ee, 0.9); r.position.set(-3, 1, -2); S.add(r);
    cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    return true;
  }
  // a matte mannequin head, so hats and glasses read at a glance
  function mannequin() {
    var g = new T.Group(), m = std('#3A3A66', { r: 0.6 });
    var h = mesh(new T.SphereGeometry(1, 32, 24), m, 0, -0.35, 0); h.scale.set(1, 1.18, 1.05); g.add(h);
    g.add(mesh(new T.CylinderGeometry(0.45, 0.5, 0.8, 20), m, 0, -1.5, -0.1));
    var n = mesh(new T.ConeGeometry(0.13, 0.32, 12), m, 0, -0.6, 1.08); n.rotation.x = Math.PI / 2; g.add(n);
    [-1, 1].forEach(function (s) { var e = mesh(new T.SphereGeometry(0.2, 12, 10), m, s * 1.0, -0.5, 0); e.scale.set(0.5, 1, 0.8); g.add(e); });
    return g;
  }
  function frame(obj, fill) {
    var box = new T.Box3().setFromObject(obj), sz = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
    var r = Math.max(sz.x, sz.y, sz.z) * 0.5 / (fill || 0.8), d = r / Math.tan(cam.fov * Math.PI / 360);
    var lift = obj.userData.low ? 0.12 : 0.3;
    cam.position.set(c.x + d * 0.45, c.y + d * lift, c.z + d * 0.84);
    cam.lookAt(c);
  }
  function snap(obj, fill) {
    S.add(obj); obj.updateMatrixWorld(true); frame(obj, fill);
    R.render(S, cam);
    var url = R.domElement.toDataURL('image/png');
    S.remove(obj);
    obj.traverse(function (m) { if (m.geometry) m.geometry.dispose(); });
    return url;
  }
  function thumb(cat, it) {
    if (!it) return '';
    var key = cat + ':' + it.id + ':' + (it.color || '');
    if (cache[key]) return cache[key];
    if (!stage()) return '';
    var g = new T.Group();
    if (cat === 'calzado') { var b = boot(it.color); b.rotation.y = 0.45; b.rotation.z = 0.08; g.add(b); }
    else {
      var head = mannequin(); g.add(head);
      if (cat === 'cabeza') { var h = hat(it.kind, it.color); if (h) { h.position.y = 0.08; g.add(h); } }
      if (cat === 'cara') { var f = face(it.kind); if (f) { f.position.set(0, -0.2, 1.0); g.add(f); } }
      if (it.kind === 'none') head.traverse(function (m) { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.35; } });
      g.rotation.y = -0.25;
    }
    g.userData.low = cat === 'calzado';
    cache[key] = snap(g, cat === 'calzado' ? 0.95 : 0.85);
    return cache[key];
  }

  window.AMGear = { hat: hat, face: face, boot: boot, thumb: thumb };
})();
