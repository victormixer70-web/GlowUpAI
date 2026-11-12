/* ARENA MIX stadium: "New Football Map" by kyrox (Sketchfab, CC BY 4.0), converted for the web:
   centred on the pitch (long axis on x, grass at y = 0), without its own goals and pitch-side glass,
   and opened on the TV-camera side (+z). seats.json lists the seats, so the crowd can sit in them. */
(function () {
  var T = window.THREE, p = null, scene = null, seats = null, goal = null;
  function load() {
    if (p || !T || !T.GLTFLoader) return p;
    var glb = new Promise(function (res) {
      new T.GLTFLoader().load('assets/stadium/stadium.glb', function (g) {
        g.scene.traverse(function (o) {
          if (!o.isMesh) return;
          o.receiveShadow = true;
          var m = o.material;
          if (m.map) m.map.anisotropy = 4;
          m.side = T.DoubleSide;
        });
        res(g.scene);
      }, null, function () { res(null); });
    });
    // the goal frame (posts, crossbar and ground bars with rounded corners) from the downloaded goal model
    var gl = new Promise(function (res) {
      new T.GLTFLoader().load('assets/stadium/goal.glb', function (g) {
        g.scene.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        goal = g.scene; res(goal);
      }, null, function () { res(null); });
    });
    var st = fetch('assets/stadium/seats.json').then(function (r) { return r.json(); }).catch(function () { return null; });
    p = Promise.all([glb, st, gl]).then(function (r) { scene = r[0]; seats = r[1]; return scene && seats ? api : null; });
    return p;
  }
  var api = {
    load: load,
    ready: function () { return !!(scene && seats); },
    // a copy for one scene (each screen has its own renderer; the geometry and texture are shared)
    model: function () { return scene ? scene.clone() : null; },
    seats: function () { return seats || []; },
    // the goal frame fitted to a goal: line at x = 0, net side towards +x (dir 1) or -x (dir -1),
    // opening w wide (outside of the posts) and h high (top of the crossbar), d deep
    goal: function (w, h, d, dir) {
      if (!goal) return null;
      var m = goal.clone(), box = new T.Box3().setFromObject(m), sz = box.getSize(new T.Vector3());
      var inner = new T.Group(); inner.add(m);
      // the model's frame faces +x with its net side at -x
      m.position.set(-box.max.x, -box.min.y, -(box.min.z + box.max.z) / 2);
      inner.scale.set(d / sz.x, h / sz.y, w / sz.z);
      var outer = new T.Group(); outer.add(inner);
      outer.rotation.y = dir > 0 ? Math.PI : 0;
      return outer;
    },
    credit: 'Estadio: "New Football Map" de kyrox (Sketchfab), CC BY 4.0'
  };
  window.AMStadium = api;
  load();

  // the net material: thick white cords on a transparent texture, blended rather than cut out, so far
  // away (where the cords shrink below a pixel) it still reads as a white mesh instead of vanishing
  var netMat = null, CELL = 0.13;
  function material() {
    if (netMat) return netMat;
    var cv = document.createElement('canvas'); cv.width = cv.height = 128;
    // square mesh, as on a real goal: a cord along two edges of each tile makes the grid when it repeats
    var c = cv.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 12); c.fillRect(0, 0, 12, 128);
    var tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = 8;
    netMat = new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, transparent: true, alphaTest: 0.02, depthWrite: false, side: T.DoubleSide, roughness: 0.9 });
    return netMat;
  }
  // a flat piece of net between four corners [x, y, z], cords of a constant size
  function quad(pts) {
    var v = pts.map(function (q) { return new T.Vector3(q[0], q[1], q[2]); });
    var wU = v[0].distanceTo(v[1]) / CELL, wV = v[0].distanceTo(v[3]) / CELL, pos = [], uv = [];
    [[v[0], 0, 0], [v[1], wU, 0], [v[2], wU, wV], [v[0], 0, 0], [v[2], wU, wV], [v[3], 0, wV]].forEach(function (e) { pos.push(e[0].x, e[0].y, e[0].z); uv.push(e[1], e[2]); });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    var m = new T.Mesh(g, material()); m.renderOrder = 2;
    return m;
  }
  // a piece of net between four corners [x, y, z] (a b c d round the edge, u along a→b, v along a→d),
  // sagging by up to sag metres along the direction n in the middle
  function sheet(pts, n, sag) {
    var v = pts.map(function (q) { return new T.Vector3(q[0], q[1], q[2]); });
    var W = v[0].distanceTo(v[1]), H = v[0].distanceTo(v[3]), nu = Math.max(2, Math.ceil(W / 0.3)), nv = Math.max(2, Math.ceil(H / 0.3));
    var pos = [], uv = [], idx = [], N = new T.Vector3(n[0], n[1], n[2]), p = new T.Vector3(), q = new T.Vector3();
    for (var j = 0; j <= nv; j++) for (var i = 0; i <= nu; i++) {
      var u = i / nu, w = j / nv;
      p.copy(v[0]).lerp(v[1], u); q.copy(v[3]).lerp(v[2], u); p.lerp(q, w);
      p.addScaledVector(N, sag * Math.sin(Math.PI * u) * Math.sin(Math.PI * w));
      pos.push(p.x, p.y, p.z); uv.push(u * W / CELL, w * H / CELL);
    }
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * (nu + 1) + i; idx.push(a, a + 1, a + nu + 2, a, a + nu + 2, a + nu + 1); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    var m = new T.Mesh(g, material()); m.renderOrder = 2;
    return m;
  }
  /* A net that behaves like one: every knot of the mesh is a point that moves (position-based, with its own
     speed), tied to its neighbours (the cords pull a dent into a cone round the ball and carry waves across the
     mesh) and, more loosely, to where it hangs at rest (so it settles back after a while, swaying a few times).
     The knots on the frame and on the ground are tied fast. The ball pushes the knots it touches out of its way
     along its path between frames, so a fast shot drags the mesh with it and the bag forms round the ball.
     geo: the sheet's geometry (a grid nu+1 by nv+1, row by row); free[k]: 0 tied fast .. 1 loose. */
  function cloth(geo, nu, nv, free, cellK, out) {
    var P = geo.attributes.position, n = P.count, rest = Float32Array.from(P.array), prev = Float32Array.from(P.array);
    var kr = new Float32Array(n), KL = cellK || 3200, live = false, quiet = 0, hits = [];
    for (var k = 0; k < n; k++) kr[k] = free[k] <= 0 ? 0 : 110 * (1 + 2.5 * (1 - free[k]));
    var W = nu + 1, H = 1 / 240;
    function collide(bx, by, bz, R) {
      var R2 = R * R, a = P.array;
      for (var k = 0; k < n; k++) {
        if (!kr[k]) continue;
        var ox = out[k * 3], oy = out[k * 3 + 1], oz = out[k * 3 + 2];
        var dx = a[k * 3] - bx, dy = a[k * 3 + 1] - by, dz = a[k * 3 + 2] - bz;
        // the ball is always inside the goal: a knot may not be inside it, nor behind it (between the ball and
        // the inside of the goal), or the ball would slip through the mesh. Such a knot goes to the ball's
        // surface on the outer side, where it is across the net's face.
        var on = dx * ox + dy * oy + dz * oz, lx = dx - on * ox, ly = dy - on * oy, lz = dz - on * oz, l2 = lx * lx + ly * ly + lz * lz;
        // a ball well outside the net (gone wide past the side net, over the roof) leaves it alone
        if (l2 >= R2 || on < -0.35) continue;
        var up = Math.sqrt(R2 - l2);
        if (on >= up) continue;
        a[k * 3] = bx + lx + ox * up; a[k * 3 + 1] = by + ly + oy * up; a[k * 3 + 2] = bz + lz + oz * up;
        live = true; quiet = 0;
      }
    }
    var nxt = new Float32Array(P.array.length);
    function sub() {
      var a = P.array, h2 = H * H, damp = 1 - 1.6 * H, maxV = 0;
      // every knot from the same moment (computed into a copy, then swapped in), or the sheet runs away
      nxt.set(a);
      for (var j = 1; j < nv; j++) for (var i = 1; i < nu; i++) {
        var k = j * W + i; if (!kr[k]) continue;
        for (var c = 0; c < 3; c++) {
          var q = k * 3 + c, x = a[q], disp = x - rest[q];
          // the cords: the knot pulled towards its four neighbours' displacement
          var lap = (a[q - 3] - rest[q - 3]) + (a[q + 3] - rest[q + 3]) + (a[q - W * 3] - rest[q - W * 3]) + (a[q + W * 3] - rest[q + W * 3]) - 4 * disp;
          var acc = -kr[k] * disp + KL * lap, v = (x - prev[q]) * damp;
          // cords rub on cords: a knot moving differently from its neighbours is slowed down, so kinks smooth out
          // at once while the big swing of the whole bag carries on
          var lv = (a[q - 3] - prev[q - 3]) + (a[q + 3] - prev[q + 3]) + (a[q - W * 3] - prev[q - W * 3]) + (a[q + W * 3] - prev[q + W * 3]) - 4 * (x - prev[q]);
          var nx = x + v + 0.12 * lv + acc * h2;
          // a net stretches only so far
          var lim = 1.1 * (0.25 + free[k]);
          if (nx - rest[q] > lim) nx = rest[q] + lim; else if (nx - rest[q] < -lim) nx = rest[q] - lim;
          nxt[q] = nx;
          var av = Math.abs(v); if (av > maxV) maxV = av;
        }
      }
      prev.set(a); a.set(nxt);
      return maxV;
    }
    return {
      // the ball (in the sheet's own frame) from where it was last frame to where it is now
      ball: function (x0, y0, z0, x1, y1, z1, R) { hits.push([x0, y0, z0, x1, y1, z1, R]); },
      step: function (dt) {
        dt = Math.min(0.05, Math.max(0, dt));
        if (!live && !hits.length) return;
        live = true;
        var m = Math.max(1, Math.round(dt / H)), maxV = 0;
        for (var s2 = 0; s2 < m; s2++) {
          var t = (s2 + 1) / m;
          for (var h = 0; h < hits.length; h++) { var b = hits[h]; collide(b[0] + (b[3] - b[0]) * t, b[1] + (b[4] - b[1]) * t, b[2] + (b[5] - b[2]) * t, b[6]); }
          maxV = Math.max(maxV, sub());
          // and the ball stays wrapped: the cords never pull a knot back inside it
          for (h = 0; h < hits.length; h++) { b = hits[h]; collide(b[0] + (b[3] - b[0]) * t, b[1] + (b[4] - b[1]) * t, b[2] + (b[5] - b[2]) * t, b[6]); }
        }
        hits.length = 0;
        P.needsUpdate = true;
        // asleep again once it has settled: back exactly where it hangs
        if (maxV < 2e-5) { if (++quiet > 30) { P.array.set(rest); prev.set(rest); P.needsUpdate = true; live = false; } } else quiet = 0;
      }
    };
  }
  /* A real goal: round white posts and crossbar, a short roof, the back net sloping from the roof down to the
     ground, curved white supports behind and bars along the ground. Local frame: goal line on z = 0, net
     towards +z, posts at x = ±w/2, ground at y = 0; d is how deep the net is at the ground.
     Returns { group, net }: the net (roof and back) gives where the ball presses into it, and net.contact()
     tells the match physics exactly where that net is, so the ball and the drawing always agree. */
  function boxGoal(w, h, d) {
    // a box goal, as in the big stadiums: the roof runs flat all the way back and the back net hangs straight
    // down, the net held taut from outside by dark poles at the back corners (no curved supports)
    var G = new T.Group(), r = 0.06, hw = w / 2, H = h + r, d2 = d, d1 = d;
    var white = new T.MeshStandardMaterial({ color: 0xf6f7fa, roughness: 0.35, metalness: 0.15 });
    [-1, 1].forEach(function (s) {
      var post = new T.Mesh(new T.CylinderGeometry(r, r, h + r, 20), white); post.position.set(s * (hw + r), (h + r) / 2, 0); post.castShadow = true; G.add(post);
    });
    var bar = new T.Mesh(new T.CylinderGeometry(r, r, w + 4 * r, 20), white); bar.rotation.z = Math.PI / 2; bar.position.set(0, h + r, 0); bar.castShadow = true; G.add(bar);
    var thin = 0.035;
    // the frame on the ground: a bar along each side and one across the back
    [-1, 1].forEach(function (s) {
      var x = s * (hw + r * 0.5);
      var gb = new T.Mesh(new T.CylinderGeometry(thin, thin, d2, 10), white); gb.rotation.x = Math.PI / 2; gb.position.set(x, thin, d2 / 2); G.add(gb);
    });
    // the dark poles that hold the net up from outside the back corners, a cord from each to the corner of the
    // roof, and the taut cords along the top edges of the box
    var dark = new T.MeshStandardMaterial({ color: 0x15161c, roughness: 0.55, metalness: 0.3 }), cordM = new T.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.8 });
    var cord = function (a, b2, rad) {
      var A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b2[0], b2[1], b2[2]), L = A.distanceTo(B);
      var m = new T.Mesh(new T.CylinderGeometry(rad, rad, L, 5), cordM);
      m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); G.add(m); return m;
    };
    [-1, 1].forEach(function (s) {
      var px = s * (hw + 0.45), pz = d2 + 0.45, ph = H + 0.4;
      var pole = new T.Mesh(new T.CylinderGeometry(0.05, 0.06, ph, 10), dark); pole.position.set(px, ph / 2, pz); pole.castShadow = true; G.add(pole);
      cord([px, ph - 0.05, pz], [s * hw, H, d2], 0.008);
      cord([s * hw, H, 0.05], [s * hw, H, d2], 0.012);
    });
    cord([-hw, H, d2], [hw, H, d2], 0.012);
    var back = new T.Mesh(new T.CylinderGeometry(thin, thin, w + r, 10), white); back.rotation.z = Math.PI / 2; back.position.set(0, thin, d2); G.add(back);
    var sides = [];
    // side nets: the goal's profile (goal line, roof, sloping back), a little slack in the middle
    [-1, 1].forEach(function (s) {
      var x = s * hw, nz = Math.ceil(d2 / 0.2), ny = Math.ceil(H / 0.2), pos = [], uv = [], idx = [];
      for (var j = 0; j <= ny; j++) for (var i = 0; i <= nz; i++) {
        var y = H * j / ny, zb = Math.min(d1 + (d2 - d1) * (1 - y / H), d2), z = zb * i / nz;
        var sag = 0.03 * Math.sin(Math.PI * i / nz) * Math.sin(Math.PI * j / ny);
        pos.push(x - s * sag, y, z); uv.push(z / CELL, y / CELL);
      }
      for (j = 0; j < ny; j++) for (i = 0; i < nz; i++) { var a = j * (nz + 1) + i; idx.push(a, a + 1, a + nz + 2, a, a + nz + 2, a + nz + 1); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var m = new T.Mesh(g, material()); m.renderOrder = 2; m.frustumCulled = false; G.add(m);
      // tied all round: posts, ground, roof and the back support
      var fr = new Float32Array((nz + 1) * (ny + 1));
      for (j = 0; j <= ny; j++) for (i = 0; i <= nz; i++) fr[j * (nz + 1) + i] = (i === 0 || j === 0 || j === ny || i === nz) ? 0 : Math.sqrt(Math.sin(Math.PI * i / nz) * Math.sin(Math.PI * j / ny));
      var so = new Float32Array(fr.length * 3); for (var q = 0; q < fr.length; q++) so[q * 3] = s;
      sides.push(cloth(g, nz, ny, fr, 1400, so));
    });
    var net = shellNet(w, H, d1, d2);
    G.add(net.mesh);
    // press() each frame while the ball is in the goal: the ball sweeps the mesh along its path since the last
    // frame (a fast shot drags the net with it), the roof, the back and the side nets alike
    var last = null, seen = false;
    net.press = function (x, dep, zc, R) {
      var a = last || [x, dep, zc];
      net.cloth.ball(a[0], a[2], a[1], x, zc, dep, R + 0.02);
      sides.forEach(function (sd) { sd.ball(a[0], a[2], a[1], x, zc, dep, R + 0.035); });
      last = [x, dep, zc]; seen = true;
    };
    net.step = function (dt) {
      // a frame without the ball in the goal: the next one starts a new path (no sweep from where it left)
      if (!seen) last = null;
      seen = false;
      net.cloth.step(dt); sides.forEach(function (sd) { sd.step(dt); });
    };
    return { group: G, net: net };
  }
  /* The roof and back of the net as one sheet: u across the goal (0..1), v along its profile from the crossbar
     (0) over the roof and down the back to the ground (1). contact(x, depth, height, R) gives how far a ball
     of radius R centred there presses through the resting net (pen > 0), the outward normal (in depth/height),
     the point on the net and how much that point can give (cords tied at the frame and the ground give least).
     press() each frame where the ball is, then step(): the net wraps round the ball and springs back after. */
  function shellNet(w, H, d1, d2) {
    var hw = w / 2, Lb = Math.hypot(d2 - d1, H), total = d1 + Lb, SMAX = 0.85;
    var nb = [H / Lb, (d2 - d1) / Lb];   // outward normal of the back, in (depth, height)
    function give(u, v) { return Math.sqrt(Math.max(0, Math.sin(Math.PI * u))) * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, v)))); }
    function contact(x, dep, zc, R) {
      var u = Math.min(1, Math.max(0, (x + hw) / w));
      // roof: flat at height H from the line to d1
      var tA = Math.min(1, Math.max(0, dep / d1)), inA = H - zc;
      // back: from (d1, H) down to (d2, 0)
      var tB = Math.min(1, Math.max(0, ((dep - d1) * (d2 - d1) + (zc - H) * -H) / (Lb * Lb)));
      var qd = d1 + tB * (d2 - d1), qz = H - tB * H, inB = (qd - dep) * nb[0] + (qz - zc) * nb[1];
      var useA = dep <= d1 + 0.05 && inA <= inB;
      var c = useA ? { pen: R - inA, n: [0, 1], q: [tA * d1, H], v: tA * d1 / total } : { pen: R - inB, n: nb, q: [qd, qz], v: (d1 + tB * Lb) / total };
      c.u = u; c.give = SMAX * give(u, c.v) + 0.03;
      return c;
    }
    var nu = Math.ceil(w / 0.13), nv = Math.ceil(total / 0.13), pos = [], uv = [], idx = [], rest = [], nrm = [], gv = [], uu = [], vv = [];
    for (var j = 0; j <= nv; j++) for (var i = 0; i <= nu; i++) {
      var u = i / nu, v = j / nv, sl = v * total, x = -hw + u * w, y, z, ny, nz;
      if (sl <= d1) { y = H; z = sl; ny = 1; nz = 0; } else { var t = (sl - d1) / Lb; y = H - t * H; z = d1 + t * (d2 - d1); ny = nb[1]; nz = nb[0]; }
      // round the corner between roof and back
      var k = Math.max(0, 1 - Math.abs(sl - d1) / 0.12);
      if (k > 0) { ny = ny * (1 - k * 0.5) + (sl <= d1 ? nb[1] : 1) * k * 0.5; nz = nz * (1 - k * 0.5) + (sl <= d1 ? nb[0] : 0) * k * 0.5; var l = Math.hypot(ny, nz); ny /= l; nz /= l; }
      // and a little slack: the roof sags, the back hangs out
      var slack = 0.035 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      y -= (sl <= d1 ? slack : 0); z += (sl > d1 ? slack * 0.6 : 0);
      pos.push(x, y, z); rest.push(x, y, z); nrm.push(ny, nz); gv.push(give(u, v)); uu.push(x); vv.push(sl);
      uv.push(u * w / CELL, sl / CELL);
    }
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * (nu + 1) + i; idx.push(a, a + 1, a + nu + 2, a, a + nu + 2, a + nu + 1); }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var mesh = new T.Mesh(geo, material()); mesh.renderOrder = 2; mesh.frustumCulled = false;
    var fr = new Float32Array(gv.length);
    for (j = 0; j <= nv; j++) for (i = 0; i <= nu; i++) fr[j * (nu + 1) + i] = (i === 0 || i === nu || j === 0 || j === nv) ? 0 : Math.max(0.05, gv[j * (nu + 1) + i]);
    var no = new Float32Array(fr.length * 3); for (var q = 0; q < fr.length; q++) { no[q * 3 + 1] = nrm[q * 2]; no[q * 3 + 2] = nrm[q * 2 + 1]; }
    var C = cloth(geo, nu, nv, fr, 3200, no);
    return {
      mesh: mesh, contact: contact, dims: { w: w, H: H, d1: d1, d2: d2 }, cloth: C,
      // the ball (centre x across, dep deep, zc high, radius R) where it is now
      press: function (x, dep, zc, R) { C.ball(x, zc, dep, x, zc, dep, R + 0.02); },
      step: function (dt) { C.step(dt); }
    };
  }
  /* A goal's back net that gives: a grid w wide and h high in its local x/y plane, pushed out along +z.
     Each frame, push() it where the ball is pressing into it (how far past its rest plane), then step():
     while the ball presses, the net wraps round it; when the ball drops away, it springs back and wobbles. */
  window.AMNet = function (w, h, mat) {
    var cell = CELL, nx = Math.ceil(w / 0.12), ny = Math.ceil(h / 0.12);
    mat = mat || material();
    var geo = new T.PlaneGeometry(w, h, nx, ny);
    geo.translate(0, h / 2, 0);
    var uv = geo.attributes.uv, pos = geo.attributes.position, base = Float32Array.from(pos.array);
    for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / cell, uv.getY(i) * h / cell);
    // edges are tied to the frame and the ground, so the bulge fades to nothing there
    var win = new Float32Array(pos.count);
    for (i = 0; i < pos.count; i++) {
      var u = (base[i * 3] + w / 2) / w, v = base[i * 3 + 1] / h;
      win[i] = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.5) * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, v * 1.15))), 0.5);
    }
    var mesh = new T.Mesh(geo, mat); mesh.renderOrder = 2;
    var d = 0, vd = 0, cx = 0, cy = h / 2, pushed = -1, lastT = 0, tt = 0, rip = 0;
    return {
      mesh: mesh,
      push: function (x, y, depth) { if (depth > 0 && depth > pushed) { pushed = depth; cx = x; cy = y; } },
      step: function (dt) {
        dt = Math.min(0.05, Math.max(0, dt));
        if (pushed > 0) { vd = dt > 0 ? (pushed + 0.06 - d) / Math.max(dt, 0.008) : 0; d = pushed + 0.06; }
        else if (Math.abs(d) > 0.001 || Math.abs(vd) > 0.01) {
          // let go: it swings back past its rest and ripples for a second or two
          var om = 12, z = 0.09; vd += (-om * om * d - 2 * z * om * vd) * dt; d += vd * dt;
        } else if (rip < 0.002) { d = 0; vd = 0; }
        pushed = -1;
        if (d === 0 && lastT === 0 && rip < 0.002) return;
        lastT = d;
        // ripples running out from where the ball hit, while the net is moving fast
        tt += dt; rip += (Math.min(0.12, Math.abs(vd) * 0.012) - rip) * Math.min(1, dt * 6);
        var s2 = 2 * 0.85 * 0.85;
        for (var i = 0; i < pos.count; i++) {
          var dx = base[i * 3] - cx, dy = base[i * 3 + 1] - cy;
          // a dent round the ball, plus the whole net billowing with it
          var r2 = dx * dx + dy * dy, r = Math.sqrt(r2);
          pos.array[i * 3 + 2] = win[i] * (d * (0.7 * Math.exp(-r2 / s2) + 0.3) + rip * Math.sin(r * 5 - tt * 16) * Math.exp(-r * 0.7));
        }
        pos.needsUpdate = true;
      }
    };
  };
  window.AMNet.material = material;
  window.AMNet.quad = quad;
  window.AMNet.goal = boxGoal;
})();
