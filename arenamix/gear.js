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

  /* a football boot, for the shop: a shoe last lofted from cross-sections (rounded heel, tapering toe, a low
     vamp and a high collar), painted with a contrast heel counter, a stripe along the side and the sole edge;
     a sole plate with studs underneath, laces over the tongue and a dark collar opening */
  function boot(color) {
    var g = new T.Group(), base0 = new T.Color(color || '#F2F5FA'), base = base0.clone().convertSRGBToLinear();
    var lum = 0.3 * base0.r + 0.59 * base0.g + 0.11 * base0.b;
    var acc = new T.Color(lum > 0.62 ? '#1E1B3A' : '#FFFFFF').convertSRGBToLinear(), soleC = new T.Color(lum > 0.62 ? '#2A2850' : '#F4F4FA').convertSRGBToLinear();
    var XH = -1.1, XT = 1.3, X0 = -0.35, N = 44, M = 36;
    var halfW = function (x) {
      var t = x < X0 ? (X0 - x) / (X0 - XH) : (x - X0) / (XT - X0), p = x < X0 ? 3 : 2.2;
      var env = Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, t), p)), 1 / p);
      return (x < X0 ? 0.38 : 0.38 + 0.06 * Math.sin(Math.min(1, t) * Math.PI)) * env;
    };
    var topH = function (x) {
      // collar at the heel, dropping to the tongue, the vamp, then down to the toe
      if (x < -0.55) return 0.98 - 0.25 * Math.pow((x + 0.55) / (XH + 0.55), 2);
      if (x < 0.15) return 0.98 - (x + 0.55) / 0.7 * 0.36;
      return 0.62 - 0.36 * Math.pow((x - 0.15) / (XT - 0.15), 1.4);
    };
    var P = [], C = [], I = [];
    for (var i = 0; i <= N; i++) {
      var u = i / N, x = XH + (XT - XH) * (1 - Math.cos(u * Math.PI)) / 2, w = halfW(x), H = Math.max(0.02, topH(x)), h0 = H * 0.42;
      for (var j = 0; j < M; j++) {
        var th = j / M * Math.PI * 2, cz = Math.cos(th), sy = Math.sin(th);
        var z = w * (cz < 0 ? -1 : 1) * Math.pow(Math.abs(cz), 0.55);
        var y = sy >= 0 ? h0 + (H - h0) * Math.pow(sy, 0.85) : h0 * (1 - Math.pow(-sy, 2.6));
        P.push(x, y + 0.06, z);
        var col = base.clone();
        var side = Math.abs(z) > w * 0.55;
        var band = y - (0.62 - 0.32 * (x + 0.85) / 1.7);
        if (x < -0.72 && y > 0.12) col.copy(acc);                                   // heel counter
        else if (side && x > -0.85 && x < 0.75 && Math.abs(band) < 0.055) col.copy(acc); // the stripe
        else if (y < 0.075) col.copy(soleC);                                         // sole edge
        else if (x > 1.0) col.multiplyScalar(0.9);                                   // toe cap, a shade darker
        C.push(col.r, col.g, col.b);
      }
    }
    for (var i2 = 0; i2 < N; i2++) for (var j2 = 0; j2 < M; j2++) {
      var a0 = i2 * M + j2, a1 = i2 * M + (j2 + 1) % M, b0 = a0 + M, b1 = a1 + M;
      I.push(a0, b0, a1, a1, b0, b1);
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    geo.setIndex(I); geo.computeVertexNormals();
    var upper = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.05, side: T.DoubleSide }));
    upper.castShadow = true; g.add(upper);
    // sole plate from the outline seen from above, a little wider than the upper
    var o = new T.Shape(), K = 40;
    for (var k = 0; k <= K; k++) { var xx = XH + (XT - XH) * k / K; var ww = halfW(xx) * 1.06 + 0.015; if (k === 0) o.moveTo(xx, ww); else o.lineTo(xx, ww); }
    for (var k2 = K; k2 >= 0; k2--) { var xx2 = XH + (XT - XH) * k2 / K; o.lineTo(xx2, -(halfW(xx2) * 1.06 + 0.015)); }
    var sg = new T.ExtrudeGeometry(o, { depth: 0.07, bevelEnabled: false });
    sg.rotateX(Math.PI / 2); sg.translate(0, 0.07, 0);
    var soleM = new T.MeshStandardMaterial({ color: soleC.clone(), roughness: 0.5 });
    g.add(mesh(sg, soleM, 0, 0, 0));
    // studs
    [[-0.85, 0.2], [-0.85, -0.2], [-0.55, 0], [0.3, 0.27], [0.3, -0.27], [0.7, 0.3], [0.7, -0.3], [1.02, 0.12], [1.02, -0.12]].forEach(function (q) {
      g.add(mesh(new T.CylinderGeometry(0.045, 0.075, 0.13, 10), soleM, q[0], -0.035, q[1]));
    });
    // the collar opening, a padded rim and the tongue
    var dk = std('#120E24', { r: 0.7 });
    var hole = mesh(new T.CircleGeometry(1, 28), dk, -0.78, 0.985, 0); hole.scale.set(0.3, 0.27, 1); hole.rotation.x = -Math.PI / 2; hole.rotation.y = 0; g.add(hole);
    hole.rotateOnWorldAxis(new T.Vector3(0, 0, 1), 0.18);
    var rim = mesh(new T.TorusGeometry(1, 0.09, 8, 28), new T.MeshStandardMaterial({ color: acc.clone(), roughness: 0.6 }), -0.78, 0.98, 0); rim.scale.set(0.3, 0.27, 0.5); rim.rotation.x = -Math.PI / 2; rim.rotateOnWorldAxis(new T.Vector3(0, 0, 1), 0.18); g.add(rim);
    // laces across the tongue, following the top of the upper
    var lace = std('#FFFFFF', { r: 0.6 });
    for (var l = 0; l < 5; l++) {
      var lx = -0.42 + l * 0.15, ly = topH(lx) + 0.06 + 0.012, lw = halfW(lx) * 0.75;
      var bar = mesh(new T.CylinderGeometry(0.024, 0.024, lw * 2, 8), lace, lx, ly, 0);
      bar.rotation.x = Math.PI / 2; bar.rotation.z = 0.12; g.add(bar);
    }
    return g;
  }

  /* ---------- shop pictures ---------- */
  var R = null, S = null, cam = null, cache = {};
  function stage() {
    if (R) return true;
    try {
      // 512 px: the pictures are shown big on large screens and phones with sharp displays
      var cv = document.createElement('canvas'); cv.width = cv.height = 512;
      R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      // if the browser takes the 3D context back (too many open), make a new one next time instead of drawing nothing
      cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); R = null; });
      R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
      R.setClearColor(0, 0); R.setSize(512, 512, false);
    } catch (e) { R = null; return false; }
    S = new T.Scene();
    try {
      var ev = document.createElement('canvas'); ev.width = 256; ev.height = 128;
      var ex = ev.getContext('2d'), eg = ex.createLinearGradient(0, 0, 0, 128);
      eg.addColorStop(0, '#FFFFFF'); eg.addColorStop(0.35, '#BFD8FF'); eg.addColorStop(0.5, '#FFE7C2'); eg.addColorStop(0.62, '#3A3550'); eg.addColorStop(1, '#0B0B18');
      ex.fillStyle = eg; ex.fillRect(0, 0, 256, 128);
      // soft boxes: bright patches that become the highlights on gold and on the facets of the gems
      [[40, 30, 26], [150, 22, 34], [215, 40, 18], [95, 52, 14]].forEach(function (q) { var rg = ex.createRadialGradient(q[0], q[1], 1, q[0], q[1], q[2]); rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ex.fillStyle = rg; ex.fillRect(q[0] - q[2], q[1] - q[2], q[2] * 2, q[2] * 2); });
      var et = new T.CanvasTexture(ev); et.mapping = T.EquirectangularReflectionMapping; et.encoding = T.sRGBEncoding;
      var pm = new T.PMREMGenerator(R); S.environment = pm.fromEquirectangular(et).texture; pm.dispose();
    } catch (e) {}
    S.add(new T.HemisphereLight(0xe8eeff, 0x302848, 0.8));
    var k = new T.DirectionalLight(0xffffff, 1.4); k.position.set(2, 4, 3); S.add(k);
    var r = new T.DirectionalLight(0x22d3ee, 1.0); r.position.set(-3, 1, -2); S.add(r);
    var r2 = new T.DirectionalLight(0xf472b6, 0.8); r2.position.set(3, 0.5, -2); S.add(r2);
    cam = new T.PerspectiveCamera(30, 1, 0.1, 50);
    return true;
  }
  // a matte mannequin head, so hats and glasses read at a glance
  function mannequin() {
    var g = new T.Group(), m = std('#7E72C8', { r: 0.45 });
    var h = mesh(new T.SphereGeometry(1, 32, 24), m, 0, -0.35, 0); h.scale.set(1, 1.18, 1.05); g.add(h);
    g.add(mesh(new T.CylinderGeometry(0.42, 0.48, 0.45, 20), m, 0, -1.35, -0.1));
    var n = mesh(new T.ConeGeometry(0.13, 0.32, 12), m, 0, -0.6, 1.08); n.rotation.x = Math.PI / 2; g.add(n);
    [-1, 1].forEach(function (s) { var e = mesh(new T.SphereGeometry(0.2, 12, 10), m, s * 1.0, -0.5, 0); e.scale.set(0.5, 1, 0.8); g.add(e); });
    return g;
  }
  function frame(obj, fill) {
    var box = new T.Box3().setFromObject(obj), sz = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
    var r = Math.max(sz.x, sz.y, sz.z) * 0.5 / (fill || 0.8), d = r / Math.tan(cam.fov * Math.PI / 360);
    var lift = obj.userData.low ? 0.45 : 0.3;
    cam.position.set(c.x + d * 0.45, c.y + d * lift, c.z + d * 0.84);
    cam.lookAt(c);
  }
  // the pictures are kept on the phone: drawing one costs a moment, and they were drawn again on every launch
  // (about twenty when the modes or the profile first open). Change GKEY when the drawings change.
  var GKEY = 'arenamix.gear1.';
  function kept(key) { try { return localStorage.getItem(GKEY + key) || ''; } catch (e) { return ''; } }
  function keep(key, url) { try { if (url) localStorage.setItem(GKEY + key, url); } catch (e) {} }
  function snap(obj, fill) {
    S.add(obj); obj.updateMatrixWorld(true); frame(obj, fill);
    R.render(S, cam);
    // webp: a fifth of the size of png, transparency included
    var url = R.domElement.toDataURL('image/webp', 0.9); if (url.indexOf('data:image/webp') !== 0) url = R.domElement.toDataURL('image/png');
    S.remove(obj);
    obj.traverse(function (m) { if (m.geometry) m.geometry.dispose(); });
    return url;
  }
  function thumb(cat, it) {
    if (!it) return '';
    var key = cat + ':' + it.id + ':' + (it.color || '');
    if (cache[key]) return cache[key];
    if ((cache[key] = kept('t:' + key))) return cache[key];
    if (!stage()) return '';
    var g = new T.Group();
    if (cat === 'calzado') { var b = boot(it.color); b.rotation.y = 0.45; b.rotation.z = 0.08; g.add(b); b.position.set(0.7, 0, 0.7); var b2 = boot(it.color); b2.rotation.y = 0.3; b2.position.set(-0.9, 0.0, -1.1); g.add(b2); }
    else {
      var head = mannequin(); g.add(head);
      if (cat === 'cabeza') { var h = hat(it.kind, it.color); if (h) { h.position.y = 0.08; g.add(h); } }
      if (cat === 'cara') { var f = face(it.kind); if (f) { f.position.set(0, -0.2, 1.0); g.add(f); } }
      if (it.kind === 'none') head.traverse(function (m) { if (m.material) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.35; } });
      g.rotation.y = -0.25;
    }
    g.userData.low = cat === 'calzado';
    cache[key] = snap(g, cat === 'calzado' ? 0.92 : 0.95);
    keep('t:' + key, cache[key]);
    return cache[key];
  }

  /* ---------- prizes for the shop and the weekly rewards: coin piles, treasure chests, the boots ---------- */
  var coinMats = null;
  function coinMaterials() {
    if (coinMats) return coinMats;
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), gr = x.createRadialGradient(54, 50, 6, 64, 64, 64);
    gr.addColorStop(0, '#FFF1B0'); gr.addColorStop(0.55, '#FFC53D'); gr.addColorStop(1, '#C98A12');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#A8700E'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 50, 0, Math.PI * 2); x.stroke();
    // an embossed star (it reads the same whichever way the cap's UVs turn)
    var star5 = function (cx, cy, r1, r2) { x.beginPath(); for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? r2 : r1; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); };
    x.fillStyle = '#9A6510'; star5(66, 68, 30, 13); x.fillStyle = '#FFE38A'; star5(63, 65, 30, 13);
    var face = new T.CanvasTexture(c); face.encoding = T.sRGBEncoding;
    var e = document.createElement('canvas'); e.width = 64; e.height = 8;
    var y = e.getContext('2d'); for (var i = 0; i < 64; i++) { y.fillStyle = i % 2 ? '#D8981C' : '#FFCF4D'; y.fillRect(i, 0, 1, 8); }
    var edge = new T.CanvasTexture(e); edge.encoding = T.sRGBEncoding; edge.wrapS = T.RepeatWrapping; edge.repeat.x = 6;
    var mk = function (map) { return new T.MeshStandardMaterial({ map: map, metalness: 0.35, roughness: 0.32, emissive: new T.Color('#5A3A00'), emissiveIntensity: 0.35 }); };
    var goldM = new T.MeshStandardMaterial({ color: '#FFAA00', metalness: 0.9, roughness: 0.28, envMapIntensity: 0.55, emissive: new T.Color('#7A4200'), emissiveIntensity: 0.45 });
    var starM = new T.MeshStandardMaterial({ color: '#FFD24A', metalness: 0.85, roughness: 0.15, envMapIntensity: 0.7, emissive: new T.Color('#8A5600'), emissiveIntensity: 0.5 });
    coinMats = [mk(edge), goldM, mk(face), starM];
    return coinMats;
  }
  var coinGeo = null, coinStar = null;
  function coin() {
    var gold = coinMaterials()[1];
    if (!coinGeo) {
      // the profile, from the middle of the bottom face out to the rim and back in over the top
      var P = [[0, -0.075], [0.8, -0.075], [0.84, -0.1], [0.97, -0.1], [1.0, -0.075], [1.0, 0.075], [0.97, 0.1], [0.84, 0.1], [0.8, 0.075], [0, 0.075]].map(function (q) { return new T.Vector2(q[0], q[1]); });
      coinGeo = new T.LatheGeometry(P, 48);
      var st = new T.Shape(); for (var k = 0; k < 10; k++) { var a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.22 : 0.5; if (k) st.lineTo(Math.cos(a) * r, Math.sin(a) * r); else st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      coinStar = new T.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 });
    }
    var g = new T.Group(), body = new T.Mesh(coinGeo, gold); body.castShadow = true; g.add(body);
    [1, -1].forEach(function (sd) { var sm = new T.Mesh(coinStar, coinMaterials()[3]); sm.rotation.x = -sd * Math.PI / 2; sm.position.y = sd * 0.075; g.add(sm); });
    return g;
  }
  // n coins: a few stacks, more coins = taller stacks and some lying around them
  function coinPile(n) {
    var g = new T.Group(), stacks = n < 8 ? 1 : n < 20 ? 3 : 5, per = Math.ceil(n / stacks), k = 0;
    var spots = [[0, 0], [1.9, 0.6], [-1.8, 0.7], [0.4, 1.9], [-0.6, -1.7]];
    for (var s = 0; s < stacks && k < n; s++) {
      var h = s === 0 ? per + 2 : per - s;
      for (var i = 0; i < h && k < n; i++, k++) {
        var c = coin(); c.position.set(spots[s][0] + (Math.random() - 0.5) * 0.12, 0.1 + i * 0.21, spots[s][1] + (Math.random() - 0.5) * 0.12);
        c.rotation.y = Math.random() * 6; g.add(c);
      }
    }
    // one coin standing up, leaning on the pile, face to the viewer
    var lean = coin(); lean.rotation.set(Math.PI / 2 - 0.35, 0, 0.15); lean.position.set(1.0, 0.95, 1.6); g.add(lean);
    return g;
  }
  /* a cartoon chest with a personality: chunky and rounded on stubby gold feet, team-kit stripes, a football
     for a padlock, and eyes: asleep while it's locked, wide awake (lid flung open, confetti) when it's yours */
  // a box with soft, rounded edges (w × h × d, corner radius r)
  function rbox(w, h, d, r, mat) {
    var b = Math.min(r, d / 2 - 0.01, 0.12), geo = new T.ExtrudeGeometry(rounded(w - 2 * b, h - 2 * b, Math.max(0.01, r - b)), { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -(d - 2 * b) / 2);
    return mesh(geo, mat);
  }
  /* Treasure chests, one material set per rarity: plank wood with iron (common), silver and a blue gem (rare),
     stained wood with gold and pink gems (epic), ebony with gold, glowing runes and a crown (legendary).
     A barrel lid hinged at the back, metal straps over body and lid, corner caps, rivets and a lock plate. */
  var CHESTS = {
    common: { wood: '#C07A3E', metal: '#8E98AA', gem: null, glow: '#FFE38A', enamel: '#D9482B' },
    rare: { wood: '#A0663A', metal: '#E3EDF7', gem: '#3DA9FF', glow: '#9FD4FF', enamel: '#1E6BFF' },
    epic: { wood: '#7A44B8', metal: '#FFC53D', gem: '#FF5CC8', glow: '#FFB3E6', enamel: '#C21E8A' },
    legend: { wood: '#2C2540', metal: '#FFD86B', gem: '#22D3EE', glow: '#7EF0FF', runes: true, enamel: '#0A3DCC' }
  };
  var woodTex = null;
  function planks() {
    if (woodTex) return woodTex;
    var cv = document.createElement('canvas'); cv.width = cv.height = 256;
    var x = cv.getContext('2d');
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, 256, 256);
    for (var r = 0; r < 4; r++) {
      var y0 = r * 64;
      // each plank a slightly different shade, with grain lines and a dark seam
      x.fillStyle = 'rgba(0,0,0,' + (0.04 + (r % 2) * 0.06) + ')'; x.fillRect(0, y0, 256, 64);
      for (var k = 0; k < 9; k++) {
        x.strokeStyle = 'rgba(60,30,10,' + (0.1 + Math.random() * 0.12) + ')'; x.lineWidth = 1 + Math.random() * 1.5;
        x.beginPath(); var yy = y0 + 6 + Math.random() * 52; x.moveTo(0, yy);
        for (var xx = 0; xx <= 256; xx += 32) x.lineTo(xx, yy + Math.sin(xx * 0.05 + k) * 2.5);
        x.stroke();
      }
      x.fillStyle = 'rgba(40,18,6,.55)'; x.fillRect(0, y0, 256, 3);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, y0 + 3, 256, 2);
    }
    woodTex = new T.CanvasTexture(cv); woodTex.encoding = T.sRGBEncoding; woodTex.wrapS = woodTex.wrapT = T.RepeatWrapping;
    return woodTex;
  }
  function chest(kind, open) {
    var C = CHESTS[kind] || CHESTS.common, g = new T.Group();
    var wood = std(C.wood, { r: 0.75 }); wood.map = planks();
    var metal = std(C.metal, { r: 0.3, m: 0.45, em: C.metal, ei: 0.1 });
    var dark = std('#120C08', { r: 0.9 });
    var W = 3, H = 1.55, D = 1.9, top = 0.08 + H;
    // the box
    var bx = rbox(W, H, D, 0.1, wood); bx.position.set(0, 0.08 + H / 2, 0); g.add(bx);
    // rims at the foot and at the top edge
    var foot = rbox(W + 0.16, 0.24, D + 0.16, 0.06, metal); foot.position.set(0, 0.12, 0); g.add(foot);
    var rim = rbox(W + 0.14, 0.16, D + 0.14, 0.05, metal); rim.position.set(0, top - 0.06, 0); g.add(rim);
    // two straps round the body, corner caps up the four edges
    [-0.88, 0.88].forEach(function (sx) { var st = rbox(0.34, H + 0.02, D + 0.1, 0.05, metal); st.position.set(sx, 0.08 + H / 2, 0); g.add(st); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var cp = rbox(0.32, H + 0.04, 0.32, 0.05, metal); cp.position.set(c[0] * (W / 2 - 0.08), 0.08 + H / 2, c[1] * (D / 2 - 0.08)); g.add(cp); });
    // rivets on the straps (front)
    [-0.88, 0.88].forEach(function (sx) { [0.45, 0.95, 1.4].forEach(function (yy) { g.add(mesh(new T.SphereGeometry(0.065, 10, 8), metal, sx, yy, D / 2 + 0.06)); }); });
    // the lid: a barrel, hinged at the back
    var lid = new T.Group(); lid.position.set(0, top, -D / 2);
    var R = D / 2, KY = 0.62;
    var barrel = new T.Mesh(new T.CylinderGeometry(R, R, W, 40, 1, false, 0, Math.PI), wood); barrel.rotation.z = Math.PI / 2; barrel.scale.set(1, 1, 1); barrel.position.set(0, 0, R);
    var lidG = new T.Group(); lidG.scale.y = KY; lidG.add(barrel);
    [-1, 1].forEach(function (e) {
      var cap = new T.Mesh(new T.CircleGeometry(R, 40, 0, Math.PI), wood); cap.rotation.y = e * Math.PI / 2; cap.position.set(e * W / 2, 0, R); lidG.add(cap);
      // metal edge round each end
      var ring = new T.Mesh(new T.CylinderGeometry(R + 0.05, R + 0.05, 0.14, 40, 1, true, 0, Math.PI), metal); ring.rotation.z = Math.PI / 2; ring.position.set(e * (W / 2 - 0.07), 0, R); lidG.add(ring);
    });
    [-0.88, 0.88].forEach(function (sx) { var bd = new T.Mesh(new T.CylinderGeometry(R + 0.04, R + 0.04, 0.34, 40, 1, true, 0, Math.PI), metal); bd.rotation.z = Math.PI / 2; bd.position.set(sx, 0, R); lidG.add(bd); });
    lidG.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.material.side = T.DoubleSide; } });
    lid.add(lidG);
    var lip = rbox(W + 0.14, 0.14, 0.16, 0.04, metal); lip.position.set(0, 0.02, D); lid.add(lip);
    for (var lx = -1.3; lx <= 1.31; lx += 0.26) lid.add(mesh(new T.SphereGeometry(0.045, 8, 6), metal, lx, 0.02, D + 0.09));
    if (C.gem) [-0.88, 0.88].forEach(function (sx) { var gm = mesh(new T.OctahedronGeometry(0.16), std(C.gem, { r: 0.08, m: 0.2, em: C.gem, ei: 0.55 }), sx, R * KY + 0.06, R); gm.scale.y = 1.25; lid.add(gm); });
    if (C.runes) {
      var crown = hat('crown'); crown.scale.setScalar(0.4); crown.position.set(0, R * KY + 0.05, R); lid.add(crown);
    }
    g.add(lid);
    // the lock plate with its keyhole, a gem above it for the better chests
    var plate = rbox(0.66, 0.74, 0.14, 0.08, metal); plate.position.set(0, top - 0.28, D / 2 + 0.08); g.add(plate);
    // under the lock, an enamelled shield with a star (the rarity's colour)
    var en = std(C.enamel, { r: 0.25, m: 0.1, em: C.enamel, ei: 0.15 });
    var sh = new T.Shape(); sh.moveTo(-0.32, 0.26); sh.lineTo(0.32, 0.26); sh.lineTo(0.32, -0.02); sh.quadraticCurveTo(0.3, -0.28, 0, -0.42); sh.quadraticCurveTo(-0.3, -0.28, -0.32, -0.02); sh.closePath();
    var shG = new T.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 2 });
    var shM = new T.Mesh(shG, metal); shM.position.set(0, 0.58, D / 2 + 0.02); g.add(shM);
    var shI = new T.Mesh(new T.ShapeGeometry(sh), en); shI.scale.setScalar(0.8); shI.position.set(0, 0.6, D / 2 + 0.115); g.add(shI);
    var st5 = new T.Shape(); for (var si = 0; si < 10; si++) { var sa = -Math.PI / 2 + si * Math.PI / 5, sr = si % 2 ? 0.07 : 0.16; if (si) st5.lineTo(Math.cos(sa) * sr, -Math.sin(sa) * sr); else st5.moveTo(Math.cos(sa) * sr, -Math.sin(sa) * sr); }
    var star = new T.Mesh(new T.ExtrudeGeometry(st5, { depth: 0.03, bevelEnabled: false }), metal); star.position.set(0, 0.56, D / 2 + 0.12); g.add(star);
    // studs along the top edge of the box
    for (var sx2 = -1.25; sx2 <= 1.26; sx2 += 0.25) if (Math.abs(Math.abs(sx2) - 0.88) > 0.2 && Math.abs(sx2) > 0.4) g.add(mesh(new T.SphereGeometry(0.05, 8, 6), metal, sx2, top - 0.06, D / 2 + 0.08));
    // a ring handle on each side
    [-1, 1].forEach(function (e) { var hd = mesh(new T.TorusGeometry(0.22, 0.05, 8, 20), metal, e * (W / 2 + 0.12), 0.08 + H * 0.62, 0); hd.rotation.y = Math.PI / 2; g.add(hd); var mt = rbox(0.06, 0.24, 0.42, 0.02, metal); mt.position.set(e * (W / 2 + 0.03), 0.08 + H * 0.78, 0); g.add(mt); });
    var hole = mesh(new T.CylinderGeometry(0.075, 0.075, 0.06, 14), dark, 0, top - 0.22, D / 2 + 0.16); hole.rotation.x = Math.PI / 2; g.add(hole);
    var slot = rbox(0.06, 0.18, 0.06, 0.01, dark); slot.position.set(0, top - 0.34, D / 2 + 0.16); g.add(slot);
    if (C.gem) g.add(mesh(new T.OctahedronGeometry(0.12), std(C.gem, { r: 0.08, em: C.gem, ei: 0.6 }), 0, top - 0.02, D / 2 + 0.17));
    if (C.runes) {
      // a glowing seam along the top rim
      var seam = new T.Mesh(new T.BoxGeometry(W + 0.18, 0.03, D + 0.18), new T.MeshBasicMaterial({ color: C.gem })); seam.position.set(0, top + 0.03, 0); g.add(seam);
    }
    if (open) {
      lid.rotation.x = -1.95;
      // light pouring out, the treasure heaped up, a few coins and sparks in the air
      g.add(mesh(new T.BoxGeometry(W - 0.2, 0.06, D - 0.2), new T.MeshBasicMaterial({ color: C.glow }), 0, top - 0.1, 0));
      var vel = mesh(new T.BoxGeometry(W - 0.16, 0.5, 0.06), std(C.enamel, { r: 0.9 }), 0, top - 0.3, -D / 2 + 0.12); g.add(vel);
      var heap = coinPile(14); heap.scale.setScalar(0.32); heap.position.set(-0.15, top - 0.12, 0.1); g.add(heap);
      if (C.gem) { var bg = mesh(new T.OctahedronGeometry(0.24), std(C.gem, { r: 0.08, em: C.gem, ei: 0.6 }), 0.7, top + 0.25, 0.2); bg.rotation.set(0.4, 0.6, 0.2); g.add(bg); }
      var glow = mesh(new T.CylinderGeometry(1.0, 1.45, 2.2, 28, 1, true), new T.MeshBasicMaterial({ color: C.glow, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }), 0, top + 1.1, 0);
      glow.scale.z = 0.6; g.add(glow);
      for (var c2 = 0; c2 < 4; c2++) { var fc = coin(); fc.scale.setScalar(0.22); fc.position.set(-1.0 + c2 * 0.7, top + 1.0 + (c2 % 2) * 0.4, 0.3); fc.rotation.set(1.2, c2, 0.4); g.add(fc); }
      var sc = ['#FFFFFF', C.glow, '#FFE38A'];
      for (var k = 0; k < 14; k++) { var a = (k / 14) * Math.PI * 2, rr2 = 0.7 + (k % 3) * 0.4; var sp = mesh(new T.OctahedronGeometry(0.06), new T.MeshBasicMaterial({ color: sc[k % 3] }), Math.cos(a) * rr2 * 1.2, top + 0.6 + (k % 4) * 0.4, Math.sin(a) * rr2 * 0.4); g.add(sp); }
    }
    g.rotation.z = open ? -0.04 : 0.03;
    return g;
  }
  var spark = null;
  function sparkTex() {
    if (spark) return spark;
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    var rg = x.createRadialGradient(32, 32, 0, 32, 32, 30); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.25, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(32, 2); x.lineTo(35, 29); x.lineTo(62, 32); x.lineTo(35, 35); x.lineTo(32, 62); x.lineTo(29, 35); x.lineTo(2, 32); x.lineTo(29, 29); x.closePath(); x.fill();
    spark = new T.CanvasTexture(c); return spark;
  }
  function prizeModel(kind) {
    var p = kind.split(':'), g = new T.Group();
    if (p[0] === 'coin') { var one = coin(); one.rotation.set(Math.PI / 2 - 0.32, 0, 0.18); g.add(one); }
    else if (p[0] === 'coins') { g.add(coinPile(+p[1] || 6)); g.rotation.y = -0.4; }
    else if (p[0] === 'chest') { var c = chest(p[1], p[2] === 'open'); c.rotation.y = 0.2; g.add(c); }
    else if (p[0] === 'bag') {
      // a sack of coins, tied, with coins spilling at its foot
      var cloth = std('#7A4A22', { r: 0.9 });
      var sack = mesh(new T.SphereGeometry(1.3, 28, 20), cloth, 0, 1.1, 0); sack.scale.set(1.18, 0.9, 1.05); g.add(sack);
      g.add(mesh(new T.CylinderGeometry(0.32, 0.6, 0.45, 20), cloth, 0, 2.2, 0));
      var ruff = mesh(new T.ConeGeometry(0.62, 0.5, 9, 1, true), std('#8A5A2C', { r: 0.9, side: T.DoubleSide }), 0, 2.62, 0); ruff.rotation.x = Math.PI; g.add(ruff);
      var tie = mesh(new T.TorusGeometry(0.42, 0.08, 8, 24), std('#FFC53D', { r: 0.3, m: 0.6 }), 0, 2.38, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
      var mark = coin(); mark.rotation.set(Math.PI / 2, 0, 0); mark.scale.setScalar(0.55); mark.position.set(0, 1.15, 1.36); g.add(mark);
      var pile = coinPile(7); pile.scale.setScalar(0.45); pile.position.set(1.4, 0, 0.8); g.add(pile);
      g.rotation.y = -0.3;
    } else if (p[0] === 'gems') {
      // BOB: cut gems (an octahedron stretched and faceted), a big one in front and smaller ones behind
      // a brilliant cut: a flat table, a crown of facets, a thin girdle and a deep pointed pavilion;
      // glassy, with the studio's reflections in the facets and a glow from inside
      var n = +p[1] || 1;
      var pink = new T.MeshStandardMaterial({ color: '#D80080', metalness: 0.25, roughness: 0.14, envMapIntensity: 0.22, emissive: new T.Color('#C0107A'), emissiveIntensity: 0.55, flatShading: true });
      var pale = new T.MeshStandardMaterial({ color: '#FF3FB4', metalness: 0.2, roughness: 0.1, envMapIntensity: 0.3, emissive: new T.Color('#FF2FA8'), emissiveIntensity: 0.45, flatShading: true });
      var gem = function (sc, x, y, z, ry) {
        var gg = new T.Group();
        var crown = new T.Mesh(new T.CylinderGeometry(0.58, 1.0, 0.42, 16, 1), pink); crown.position.y = 0.21; gg.add(crown);
        var girdle = new T.Mesh(new T.CylinderGeometry(1.0, 1.0, 0.06, 16, 1), pale); girdle.position.y = -0.03; gg.add(girdle);
        var pav = new T.Mesh(new T.ConeGeometry(1.0, 1.15, 16, 1), pink); pav.rotation.x = Math.PI; pav.position.y = -0.635; gg.add(pav);
        var table = new T.Mesh(new T.CylinderGeometry(0.58, 0.58, 0.02, 16), pale); table.position.y = 0.43; gg.add(table);
        // a star of light on the table
        var sp = new T.Sprite(new T.SpriteMaterial({ map: sparkTex(), color: '#FFFFFF', transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sp.scale.setScalar(0.9); sp.position.set(-0.25, 0.5, 0.35); gg.add(sp);
        gg.scale.setScalar(sc); gg.position.set(x, y, z); gg.rotation.set(0.28, ry, 0.1); return gg;
      };
      g.add(gem(1, 0, 1.0, 0, 0.3));
      if (n > 1) g.add(gem(0.6, -1.05, 0.55, -0.4, 0.8));
      if (n > 2) g.add(gem(0.55, 1.05, 0.5, -0.3, -0.5));
      g.rotation.y = -0.2;
    } else if (p[0] === 'trophy') {
      // a gold cup with two handles on a dark plinth with a gold band and a star
      var gold = std('#FFC53D', { r: 0.25, m: 0.85 });
      var prof = [[0, 0], [0.62, 0], [0.62, 0.14], [0.26, 0.3], [0.18, 0.86], [0.28, 0.96], [0.6, 1.3], [0.74, 1.8], [0.78, 2.15], [0.7, 2.2], [0, 1.75]].map(function (q) { return new T.Vector2(q[0], q[1]); });
      var cup = new T.Mesh(new T.LatheGeometry(prof, 48), gold); cup.position.y = 0.9; g.add(cup);
      [-1, 1].forEach(function (sd) { var h = new T.Mesh(new T.TorusGeometry(0.34, 0.07, 12, 28, Math.PI * 1.25), gold); h.position.set(sd * 0.8, 2.6, 0); h.rotation.z = sd > 0 ? -Math.PI * 0.62 : Math.PI * 1.62; g.add(h); });
      var plinth = rbox(1.5, 0.9, 1.5, 0.12, std('#1B1B33', { r: 0.4 })); plinth.position.y = 0.45; g.add(plinth);
      var band = mesh(new T.BoxGeometry(1.53, 0.14, 1.53), gold, 0, 0.62, 0); g.add(band);
      var st = new T.Shape(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.13 : 0.3; if (i) st.lineTo(Math.cos(a) * r, -Math.sin(a) * r); else st.moveTo(Math.cos(a) * r, -Math.sin(a) * r); }
      var star = new T.Mesh(new T.ExtrudeGeometry(st, { depth: 0.06, bevelEnabled: false }), std('#FFFFFF', { r: 0.3 })); star.position.set(0, 1.85, 0.62); star.rotation.x = -0.12; g.add(star);
      g.rotation.y = -0.35;
    } else if (p[0] === 'shield') {
      // the rank crest: a bevelled metal shield, a darker inset and a raised star
      var col = p[1] || '#C07A3E';
      var sh = function (s) { var q = new T.Shape(); q.moveTo(0, 1.1 * s); q.lineTo(0.95 * s, 0.78 * s); q.lineTo(0.95 * s, 0.05 * s); q.quadraticCurveTo(0.9 * s, -0.75 * s, 0, -1.15 * s); q.quadraticCurveTo(-0.9 * s, -0.75 * s, -0.95 * s, 0.05 * s); q.lineTo(-0.95 * s, 0.78 * s); q.lineTo(0, 1.1 * s); return q; };
      var outer = new T.Mesh(new T.ExtrudeGeometry(sh(1), { depth: 0.25, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3 }), std(col, { r: 0.3, m: 0.75 }));
      g.add(outer);
      var inner = new T.Mesh(new T.ExtrudeGeometry(sh(0.74), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }), std(new T.Color(col).multiplyScalar(0.45).getStyle(), { r: 0.5, m: 0.4 }));
      inner.position.z = 0.28; g.add(inner);
      var st2 = new T.Shape(); for (var j = 0; j < 10; j++) { var a2 = -Math.PI / 2 + j * Math.PI / 5, r2 = j % 2 ? 0.2 : 0.46; if (j) st2.lineTo(Math.cos(a2) * r2, -Math.sin(a2) * r2); else st2.moveTo(Math.cos(a2) * r2, -Math.sin(a2) * r2); }
      var star2 = new T.Mesh(new T.ExtrudeGeometry(st2, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }), std(new T.Color(col).lerp(new T.Color('#FFFFFF'), 0.45).getStyle(), { r: 0.25, m: 0.7 }));
      star2.position.set(0, 0, 0.42); g.add(star2);
      g.rotation.set(-0.08, 0.35, 0);
    } else if (p[0] === 'target') {
      // a target board, tilted back, with a dart in the bullseye
      var board = new T.Group(), cols = ['#F4F4FA', '#E5484D', '#F4F4FA', '#E5484D', '#FFC53D'];
      cols.forEach(function (c, k) { var r = 1.2 - k * 0.24; board.add(mesh(new T.CylinderGeometry(r, r, 0.2 + k * 0.03, 48), std(c, { r: 0.5 }), 0, k * 0.015, 0)); });
      board.add(mesh(new T.TorusGeometry(1.2, 0.09, 12, 56), std('#1E5A3A', { r: 0.5 }), 0, 0, 0)); board.children[board.children.length - 1].rotation.x = Math.PI / 2;
      board.rotation.x = Math.PI / 2 - 0.25; board.position.y = 1.3; g.add(board);
      var dart = new T.Group();
      dart.add(mesh(new T.CylinderGeometry(0.05, 0.05, 1.3, 12), std('#22D3EE', { r: 0.3, m: 0.4 }), 0, 0.65, 0));
      dart.add(mesh(new T.ConeGeometry(0.09, 0.3, 12), std('#D6DEE9', { r: 0.2, m: 0.9 }), 0, -0.1, 0)); dart.children[1].rotation.x = Math.PI;
      [0, 1, 2].forEach(function (k) { var f = mesh(new T.BoxGeometry(0.02, 0.36, 0.26), std('#53D88E', { r: 0.5 }), 0, 1.2, 0); f.rotation.y = k * Math.PI / 3; dart.add(f); });
      dart.scale.setScalar(1.45); dart.position.set(0.05, 1.4, 0.2); dart.rotation.set(-0.75, 0, -0.75); g.add(dart);
      g.rotation.y = 0.25;
    } else if (p[0] === 'trail') {
      // a ball flying out of a glowing trail of its colour
      var tc = p[1] || '#22D3EE', glow = std(tc, { r: 0.4, em: tc, ei: 0.9 });
      var ball = mesh(new T.IcosahedronGeometry(0.85, 1), std('#F4F4FA', { r: 0.35 }), 0.9, 1.3, 0); ball.material.flatShading = true; g.add(ball);
      [0, 1, 2].forEach(function (k) { var c = mesh(new T.ConeGeometry(0.55 - k * 0.12, 2.6 - k * 0.5, 18, 1, true), std(tc, { r: 0.5, em: tc, ei: 0.6 - k * 0.15, side: T.DoubleSide }), -0.9 - k * 0.2, 1.3 + (k - 1) * 0.5, 0); c.rotation.z = Math.PI / 2; c.material.transparent = true; c.material.opacity = 0.85 - k * 0.2; g.add(c); });
      [-1.6, -2.3, -1.2].forEach(function (x0, k) { g.add(mesh(new T.SphereGeometry(0.12 + k * 0.03, 10, 8), glow, x0, 0.5 + k * 0.9, 0.3)); });
      g.rotation.set(0.1, -0.35, 0.18);
    } else if (p[0] === 'celeb') {
      // a star burst in the celebration's colour, with sparks
      var cc = p[1] || '#FFC53D', shp = new T.Shape();
      for (var q = 0; q < 10; q++) { var aa = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? 0.55 : 1.35; if (q) shp.lineTo(Math.cos(aa) * rr, -Math.sin(aa) * rr); else shp.moveTo(Math.cos(aa) * rr, -Math.sin(aa) * rr); }
      var sb = new T.Mesh(new T.ExtrudeGeometry(shp, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 3 }), std(cc, { r: 0.3, m: 0.4, em: cc, ei: 0.25 }));
      sb.position.set(0, 1.4, 0); g.add(sb);
      [[1.5, 2.4], [-1.5, 2.2], [1.6, 0.4], [-1.4, 0.5], [0, 2.9]].forEach(function (pp, k) { g.add(mesh(new T.OctahedronGeometry(0.14 + (k % 2) * 0.06), std('#FFFFFF', { r: 0.2, em: '#FFFFFF', ei: 0.6 }), pp[0], pp[1], 0.3)); });
      g.rotation.y = -0.25;
    } else if (p[0] === 'boots') {
      var b = boot(p[1] || '#E5484D'); b.rotation.y = 0.45; g.add(b);
      var sp = hat('sprout'); sp.scale.setScalar(0.9); sp.position.set(-0.5, -0.1, 0); g.add(sp);
    }
    return g;
  }
  var pcache = {};
  function prize(kind) {
    if (pcache[kind]) return pcache[kind];
    if ((pcache[kind] = kept('p:' + kind))) return pcache[kind];
    if (!stage()) return '';
    var g = prizeModel(kind);
    g.userData.low = kind.indexOf('boots') === 0;
    pcache[kind] = snap(g, kind.indexOf('chest') === 0 ? 0.8 : 0.84);
    keep('p:' + kind, pcache[kind]);
    return pcache[kind];
  }

  window.AMGear = { hat: hat, face: face, boot: boot, thumb: thumb, prize: prize };
})();
