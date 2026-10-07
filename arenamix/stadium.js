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
  /* A full goal like a real 11-a-side one: a round white frame, a box net (flat roof at crossbar height,
     sagging a little, straight back), and two padded blue poles behind it with the ropes that hold the net
     up. Local frame: goal line on z = 0, net towards +z, posts at x = ±w/2, ground at y = 0. Returns
     { group, net } where net is the back net that gives (AMNet), centred at z = d. */
  function boxGoal(w, h, d) {
    var G = new T.Group(), r = 0.06, hw = w / 2;
    var white = new T.MeshStandardMaterial({ color: 0xf6f7fa, roughness: 0.35, metalness: 0.15 });
    [-1, 1].forEach(function (s) {
      var post = new T.Mesh(new T.CylinderGeometry(r, r, h + r, 20), white); post.position.set(s * (hw + r), (h + r) / 2, 0); post.castShadow = true; G.add(post);
    });
    var bar = new T.Mesh(new T.CylinderGeometry(r, r, w + 4 * r, 20), white); bar.rotation.z = Math.PI / 2; bar.position.set(0, h + r, 0); bar.castShadow = true; G.add(bar);
    // the net: roof, sides and the back that gives
    var top = h + r;
    G.add(sheet([[-hw, top, 0], [hw, top, 0], [hw, top, d], [-hw, top, d]], [0, -1, 0], 0.16));
    [-1, 1].forEach(function (s) {
      var x = s * hw;
      G.add(sheet([[x, 0, 0], [x, 0, d], [x, top, d], [x, top, 0]], [-s, 0, 0], 0.06));
    });
    var net = window.AMNet(w, top);
    net.mesh.position.set(0, 0, d); G.add(net.mesh);
    // the padded poles behind, and the ropes from the top back corners of the net
    var blue = new T.MeshStandardMaterial({ color: 0x1d5fd6, roughness: 0.6 }), grey = new T.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.4 });
    var rope = new T.LineBasicMaterial({ color: 0xdfe4ea });
    [-1, 1].forEach(function (s) {
      var px = s * (hw + 0.55), pz = d + 0.55, ph = top + 0.25;
      var pad = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, ph - 0.1, 14), blue); pad.position.set(px, (ph - 0.1) / 2, pz); pad.castShadow = true; G.add(pad);
      var tip = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.3, 10), grey); tip.position.set(px, ph + 0.05, pz); G.add(tip);
      var lg = new T.BufferGeometry().setFromPoints([new T.Vector3(s * hw, top, d), new T.Vector3(px, ph + 0.15, pz)]);
      G.add(new T.Line(lg, rope));
    });
    return { group: G, net: net };
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
