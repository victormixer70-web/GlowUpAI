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
  /* A real goal: round white posts and crossbar, a short roof, the back net sloping from the roof down to the
     ground, curved white supports behind and bars along the ground. Local frame: goal line on z = 0, net
     towards +z, posts at x = ±w/2, ground at y = 0; d is how deep the net is at the ground.
     Returns { group, net }: the net (roof and back) gives where the ball presses into it, and net.contact()
     tells the match physics exactly where that net is, so the ball and the drawing always agree. */
  function boxGoal(w, h, d) {
    var G = new T.Group(), r = 0.06, hw = w / 2, H = h + r, d2 = d, d1 = d * 0.47;
    var white = new T.MeshStandardMaterial({ color: 0xf6f7fa, roughness: 0.35, metalness: 0.15 });
    [-1, 1].forEach(function (s) {
      var post = new T.Mesh(new T.CylinderGeometry(r, r, h + r, 20), white); post.position.set(s * (hw + r), (h + r) / 2, 0); post.castShadow = true; G.add(post);
    });
    var bar = new T.Mesh(new T.CylinderGeometry(r, r, w + 4 * r, 20), white); bar.rotation.z = Math.PI / 2; bar.position.set(0, h + r, 0); bar.castShadow = true; G.add(bar);
    // the supports behind: from the top of each post back along the roof, then curving down to the ground
    var thin = 0.035;
    [-1, 1].forEach(function (s) {
      var x = s * (hw + r * 0.5);
      var curve = new T.CatmullRomCurve3([new T.Vector3(x, H, 0.02), new T.Vector3(x, H, d1 * 0.7), new T.Vector3(x, H * 0.92, d1 * 1.08), new T.Vector3(x, H * 0.5, (d1 + d2) / 2 + 0.06), new T.Vector3(x, thin, d2)], false, 'catmullrom', 0.2);
      var arm = new T.Mesh(new T.TubeGeometry(curve, 28, thin, 8, false), white); arm.castShadow = true; G.add(arm);
      var gb = new T.Mesh(new T.CylinderGeometry(thin, thin, d2, 10), white); gb.rotation.x = Math.PI / 2; gb.position.set(x, thin, d2 / 2); G.add(gb);
    });
    var back = new T.Mesh(new T.CylinderGeometry(thin, thin, w + r, 10), white); back.rotation.z = Math.PI / 2; back.position.set(0, thin, d2); G.add(back);
    // side nets: the goal's profile (goal line, roof, sloping back), a little slack in the middle
    [-1, 1].forEach(function (s) {
      var x = s * hw, nz = Math.ceil(d2 / 0.2), ny = Math.ceil(H / 0.2), pos = [], uv = [], idx = [];
      for (var j = 0; j <= ny; j++) for (var i = 0; i <= nz; i++) {
        var y = H * j / ny, zb = Math.min(d1 + (d2 - d1) * (1 - y / H), d2), z = zb * i / nz;
        var sag = 0.05 * Math.sin(Math.PI * i / nz) * Math.sin(Math.PI * j / ny);
        pos.push(x - s * sag, y, z); uv.push(z / CELL, y / CELL);
      }
      for (j = 0; j < ny; j++) for (i = 0; i < nz; i++) { var a = j * (nz + 1) + i; idx.push(a, a + 1, a + nz + 2, a, a + nz + 2, a + nz + 1); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      var m = new T.Mesh(g, material()); m.renderOrder = 2; G.add(m);
    });
    var net = shellNet(w, H, d1, d2);
    G.add(net.mesh);
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
      var k = Math.max(0, 1 - Math.abs(sl - d1) / 0.25);
      if (k > 0) { ny = ny * (1 - k * 0.5) + (sl <= d1 ? nb[1] : 1) * k * 0.5; nz = nz * (1 - k * 0.5) + (sl <= d1 ? nb[0] : 0) * k * 0.5; var l = Math.hypot(ny, nz); ny /= l; nz /= l; }
      // and a little slack: the roof sags, the back hangs out
      var slack = 0.07 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      y -= (sl <= d1 ? slack : 0); z += (sl > d1 ? slack * 0.6 : 0);
      pos.push(x, y, z); rest.push(x, y, z); nrm.push(ny, nz); gv.push(give(u, v)); uu.push(x); vv.push(sl);
      uv.push(u * w / CELL, sl / CELL);
    }
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) { var a = j * (nu + 1) + i; idx.push(a, a + 1, a + nu + 2, a, a + nu + 2, a + nu + 1); }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    var mesh = new T.Mesh(geo, material()); mesh.renderOrder = 2; mesh.frustumCulled = false;
    var P = geo.attributes.position, A = 0, vA = 0, cx = 0, cs = 0, cg = 1, pushed = -1, rip = 0, tt = 0, live = false;
    return {
      mesh: mesh, contact: contact, dims: { w: w, H: H, d1: d1, d2: d2 },
      // the ball (centre x across, dep deep, zc high, radius R) where it is now
      press: function (x, dep, zc, R) {
        var c = contact(x, dep, zc, R);
        if (c.pen > 0 && c.pen > pushed) { pushed = Math.min(c.pen, c.give); cx = x; cs = c.v * total; cg = Math.max(0.2, give(c.u, c.v)); }
      },
      step: function (dt) {
        dt = Math.min(0.05, Math.max(0, dt));
        if (pushed > 0) { vA = (pushed - A) / Math.max(dt, 0.008); A = pushed; live = true; }
        else if (Math.abs(A) > 0.001 || Math.abs(vA) > 0.01) { var om = 11, z = 0.1; vA += (-om * om * A - 2 * z * om * vA) * dt; A += vA * dt; live = true; }
        pushed = -1;
        tt += dt; rip += (Math.min(0.1, Math.abs(vA) * 0.01) - rip) * Math.min(1, dt * 5);
        if (!live) return;
        if (Math.abs(A) < 0.001 && Math.abs(vA) < 0.01 && rip < 0.002) { A = 0; vA = 0; live = false; }
        var s2 = 2 * 0.6 * 0.6;
        for (var n = 0; n < gv.length; n++) {
          var dx = uu[n] - cx, ds = vv[n] - cs, r2 = dx * dx + ds * ds, r = Math.sqrt(r2);
          // a dent the shape of the ball, the whole sheet billowing a little with it, ripples after
          var amt = gv[n] / cg * (A * (0.8 * Math.exp(-r2 / s2) + 0.2 * Math.exp(-r2 / 6))) + gv[n] * rip * Math.sin(r * 5 - tt * 16) * Math.exp(-r * 0.8);
          P.array[n * 3] = rest[n * 3];
          P.array[n * 3 + 1] = rest[n * 3 + 1] + nrm[n * 2] * amt;
          P.array[n * 3 + 2] = rest[n * 3 + 2] + nrm[n * 2 + 1] * amt;
        }
        P.needsUpdate = true;
      }
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
