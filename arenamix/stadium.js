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
})();
