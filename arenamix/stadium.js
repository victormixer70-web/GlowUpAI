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

  /* A goal's back net that gives: a grid w wide and h high in its local x/y plane, pushed out along +z.
     Each frame, push() it where the ball is pressing into it (how far past its rest plane), then step():
     while the ball presses, the net wraps round it; when the ball drops away, it springs back and wobbles. */
  var netTex = null;
  window.AMNet = function (w, h, mat) {
    var cell = 0.16, nx = Math.ceil(w / 0.12), ny = Math.ceil(h / 0.12);
    if (!mat) {
      if (!netTex) {
        var cv = document.createElement('canvas'); cv.width = cv.height = 128;
        var c = cv.getContext('2d'); c.strokeStyle = '#ffffff'; c.lineWidth = 5;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(128, 128); c.moveTo(128, 0); c.lineTo(0, 128); c.stroke();
        netTex = new T.CanvasTexture(cv); netTex.wrapS = netTex.wrapT = T.RepeatWrapping; netTex.anisotropy = 4;
      }
      mat = new T.MeshStandardMaterial({ map: netTex, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.9 });
    }
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
    var mesh = new T.Mesh(geo, mat);
    var d = 0, vd = 0, cx = 0, cy = h / 2, pushed = -1, lastT = 0;
    return {
      mesh: mesh,
      push: function (x, y, depth) { if (depth > 0 && depth > pushed) { pushed = depth; cx = x; cy = y; } },
      step: function (dt) {
        dt = Math.min(0.05, Math.max(0, dt));
        if (pushed > 0) { vd = dt > 0 ? (pushed + 0.06 - d) / Math.max(dt, 0.008) : 0; d = pushed + 0.06; }
        else if (Math.abs(d) > 0.001 || Math.abs(vd) > 0.01) {
          var om = 16, z = 0.16; vd += (-om * om * d - 2 * z * om * vd) * dt; d += vd * dt;
        } else { d = 0; vd = 0; }
        pushed = -1;
        if (d === 0 && lastT === 0) return;
        lastT = d;
        var s2 = 2 * 0.6 * 0.6;
        for (var i = 0; i < pos.count; i++) {
          var dx = base[i * 3] - cx, dy = base[i * 3 + 1] - cy;
          pos.array[i * 3 + 2] = d * win[i] * Math.exp(-(dx * dx + dy * dy) / s2);
        }
        pos.needsUpdate = true;
      }
    };
  };
})();
