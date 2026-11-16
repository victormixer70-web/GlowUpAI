/* ARENA MIX: remodelling your stadium. Six parts, each with levels: level 0 is what every stadium has, the
   better ones are bought with gems (BOB), one after another. Mi estadio shows them and the 1 VS 1 matches are
   played among them (and the camera flies round them before kick-off).
   AMStadUp.PARTS             the catalogue
   AMStadUp.build(cfg, opts)  -> { group, near, far, update(t), burst() } for a Three.js scene
                                 opts: { kx, kz } (the stadium model's scale), night
   Everything sits round the stadium model (about ±50 m long, ±40 m wide, roofs at 20 m once scaled by 0.9).
   The rings are built in two halves: "far" (z < 0) and "near" (z > 0); a match hides the near half while the
   side-on camera plays, as it does with the near half of the stands. */
(function () {
  var T = window.THREE;
  var PARTS = [
    { id: 'fachada', name: 'Fachada', icon: 'M3 21V8l9-5l9 5v13M7 21v-6h10v6M3 12h18', levels: [
      ['Hormigón', 'Un anillo de hormigón con ventanales'], ['Paneles del club', 'Paneles en tus dos colores'],
      ['Fachada LED', 'Una banda de luz con el nombre del estadio'], ['Envolvente de luz', 'Toda la fachada brilla en tus colores']] },
    { id: 'techo', name: 'Techo', icon: 'M2 12L12 4l10 8M5 10v10h14V10', levels: [
      ['Original', 'El techo de siempre'], ['Visera', 'Una cubierta que rodea todo el estadio'],
      ['Cristal', 'Cubierta de cristal con costillas blancas'], ['Anillo de luz', 'Cristal con un borde de luz de colores']] },
    { id: 'aforo', name: 'Aforo', icon: 'M4 20h16M6 16h12M8 12h8M10 8h4', levels: [
      ['Una grada', 'El estadio de siempre'], ['Grada superior', 'Un segundo anillo lleno de público'],
      ['Tercer anillo', 'Tres anillos: un estadio gigante']] },
    { id: 'pantallas', name: 'Videomarcadores', icon: 'M3 5h18v11H3zM8 20h8M12 16v4', levels: [
      ['Sin pantallas', 'Solo las vallas LED'], ['Pantallas gigantes', 'Dos pantallas sobre los fondos'],
      ['Videocubo', 'Un cubo de pantallas colgado sobre el centro del campo']] },
    { id: 'focos', name: 'Focos', icon: 'M12 2v4M5 5l3 3M19 5l-3 3M7 13a5 5 0 0 1 10 0v2H7zM9 19h6', levels: [
      ['Torres clásicas', 'Cuatro torres de focos'], ['Anillo de focos', 'Una fila de focos en todo el techo'],
      ['Focos de colores', 'Haces de luz en tus colores que barren el cielo']] },
    { id: 'deco', name: 'Decoración', icon: 'M5 21V4M5 4h11l-2 4l2 4H5', levels: [
      ['Nada', 'Sin adornos'], ['Banderas', 'Banderas de tus colores en lo alto'],
      ['Tifo gigante', 'Un mosaico enorme de la afición'], ['Fuegos artificiales', 'Fuegos sobre el techo al salir al campo']] }
  ];
  // the price in gems of each level (level 0 is free; each one needs the one before)
  var PRICE = [0, 10, 25, 50];
  function part(id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i]; return null; }
  function hex(c) { return new T.Color(c); }
  // an ellipse ring band from (rx0, rz0, y0) to (rx1, rz1, y1), angle a0..a1 (z = rz sin a: a in [pi, 2pi] is the far half)
  function band(rx0, rz0, y0, rx1, rz1, y1, a0, a1, seg, rep) {
    var pos = [], uv = [], idx = [];
    for (var i = 0; i <= seg; i++) {
      var a = a0 + (a1 - a0) * i / seg, c = Math.cos(a), s = Math.sin(a);
      pos.push(rx0 * c, y0, rz0 * s, rx1 * c, y1, rz1 * s);
      // u runs clockwise seen from above, so text on the outside of a ring reads left to right
      uv.push((1 - i / seg) * rep, 0, (1 - i / seg) * rep, 1);
      if (i < seg) { var k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function canvasTex(w, h, draw, rep) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (rep) { t.wrapS = T.RepeatWrapping; }
    t.userData = { cv: cv };
    return t;
  }
  function std(o) { return new T.MeshStandardMaterial(Object.assign({ roughness: 0.75, metalness: 0.1, side: T.DoubleSide }, o)); }

  function build(cfg, opts) {
    opts = opts || {};
    var up = (cfg && cfg.up) || {}, L = function (id) { return Math.max(0, Math.min(part(id).levels.length - 1, up[id] | 0)); };
    var c1 = cfg.c1 || '#22D3EE', c2 = cfg.c2 || '#FFC53D', name = String(cfg.name || 'ARENA MIX').toUpperCase(), night = !!opts.night;
    var kx = (opts.kx || 0.9) / 0.9, kz = (opts.kz || 0.9) / 0.9;
    var group = new T.Group(), far = new T.Group(), near = new T.Group();
    group.add(far); group.add(near);
    var anim = [], halves = [[Math.PI, 2 * Math.PI, far], [0, Math.PI, near]];
    var aforo = L('aforo');
    // the outer shell grows with the stands
    var FX = [50, 56, 63][aforo] * kx, FZ = [42, 47, 54][aforo] * kz, FH = [21, 27, 34][aforo];
    var addHalves = function (mk) { halves.forEach(function (h) { var m = mk(h[0], h[1]); if (m) { h[2].add(m); } }); };

    // ---------- the square round the stadium: paving, lamp posts ----------
    {
      var plaza = new T.Mesh(new T.RingGeometry(1, 1.9, 72, 1), std({ color: 0x8b8f99, roughness: 0.95, side: T.FrontSide }));
      plaza.rotation.x = -Math.PI / 2; plaza.scale.set(FX, FZ, 1); plaza.position.y = 0.01; plaza.receiveShadow = true;
      group.add(plaza);
      var walk = new T.Mesh(new T.RingGeometry(1.9, 1.96, 72, 1), std({ color: 0xd6d9e0, side: T.FrontSide }));
      walk.rotation.x = -Math.PI / 2; walk.scale.set(FX, FZ, 1); walk.position.y = 0.02; group.add(walk);
      var poleM = std({ color: 0x3a3f4c, metalness: 0.6, roughness: 0.4 }), lampM = new T.MeshBasicMaterial({ color: 0xfff1c9 });
      for (var i = 0; i < 16; i++) {
        var a = i / 16 * Math.PI * 2, x = Math.cos(a) * FX * 1.45, z = Math.sin(a) * FZ * 1.45;
        var pole = new T.Mesh(new T.CylinderGeometry(0.18, 0.25, 9, 6), poleM); pole.position.set(x, 4.5, z); group.add(pole);
        var lamp = new T.Mesh(new T.SphereGeometry(0.7, 8, 6), lampM); lamp.position.set(x, 9.2, z); group.add(lamp);
      }
    }

    // ---------- façade ----------
    var fl = L('fachada');
    var faTex = canvasTex(1024, 256, function (x, w, h) {
      if (fl === 0) {
        x.fillStyle = '#9aa0ab'; x.fillRect(0, 0, w, h);
        for (var i = 0; i < 16; i++) { x.fillStyle = '#7d838f'; x.fillRect(i * 64, 0, 10, h); x.fillStyle = '#1f2a44'; x.fillRect(i * 64 + 18, 60, 36, 120); x.fillStyle = '#3d5a8a'; x.fillRect(i * 64 + 20, 62, 32, 50); }
        x.fillStyle = '#c7ccd5'; x.fillRect(0, 0, w, 20); x.fillRect(0, h - 26, w, 26);
      } else if (fl === 1) {
        for (var j = 0; j < 16; j++) { x.fillStyle = j % 2 ? c1 : c2; x.fillRect(j * 64, 0, 64, h); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(j * 64, 0, 4, h); }
        x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, w, 40); x.fillStyle = '#1b2236'; x.fillRect(0, h - 30, w, 30);
      } else {
        x.fillStyle = '#0b1230'; x.fillRect(0, 0, w, h);
        if (fl === 3) { x.strokeStyle = c1; x.lineWidth = 6; for (var k = -8; k < 24; k++) { x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64 + 128, h); x.moveTo(k * 64 + 128, 0); x.lineTo(k * 64, h); x.stroke(); } }
        x.fillStyle = c2; x.fillRect(0, 96, w, 64);
        x.font = '44px Titulos, Arial'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
        var tw = x.measureText(name + '  ★  ').width; for (var u = 10; u < w; u += tw) x.fillText(name + '  ★  ', u, 130);
      }
    }, true);
    var faRep = Math.max(2, Math.round(Math.PI * (FX + FZ) / 70));
    faTex.repeat.set(1, 1);
    var faMat = std({ map: faTex, emissive: fl >= 2 ? 0xffffff : 0x000000, emissiveMap: fl >= 2 ? faTex : null, emissiveIntensity: fl >= 2 ? (night ? 1.1 : 0.55) : 0, roughness: fl === 0 ? 0.9 : 0.55 });
    addHalves(function (a0, a1) { var m = new T.Mesh(band(FX, FZ, 0, FX, FZ, FH, a0, a1, 48, faRep / 2), faMat); m.castShadow = true; m.receiveShadow = true; return m; });
    // a crown along the top of the façade
    var crownM = std({ color: fl >= 2 ? hex(c1) : 0xd8dde6, emissive: fl >= 2 ? hex(c1) : 0x000000, emissiveIntensity: fl >= 2 ? 0.8 : 0 });
    addHalves(function (a0, a1) { return new T.Mesh(band(FX, FZ, FH, FX * 0.985, FZ * 0.985, FH + 1.2, a0, a1, 48, 1), crownM); });
    if (fl >= 2) anim.push(function (t) { faTex.offset.x = -t * 0.03; });
    if (fl === 3) anim.push(function (t) { faMat.emissiveIntensity = (night ? 1.0 : 0.5) + Math.sin(t * 2.2) * 0.25; });

    // ---------- more stands: a second and a third ring, with fans ----------
    if (aforo >= 1) {
      var tiers = [[46, 37, 14, 55.5, 46.5, 26]];
      if (aforo >= 2) tiers.push([55.5, 46.5, 26, 62.5, 53.5, 33.5]);
      var seatTex = canvasTex(512, 128, function (x, w, h) { x.fillStyle = '#2a3044'; x.fillRect(0, 0, w, h); for (var r = 0; r < 8; r++) { x.fillStyle = r % 2 ? c1 : c2; x.globalAlpha = 0.85; x.fillRect(0, r * 16 + 4, w, 9); } x.globalAlpha = 1; }, true);
      seatTex.repeat.set(10, 1);
      var tierM = std({ map: seatTex, roughness: 0.85 });
      tiers.forEach(function (tr) {
        addHalves(function (a0, a1) { var m = new T.Mesh(band(tr[0] * kx, tr[1] * kz, tr[2], tr[3] * kx, tr[4] * kz, tr[5], a0, a1, 40, 10), tierM); m.receiveShadow = true; return m; });
      });
      // the fans on the new rings
      var spots = [];
      tiers.forEach(function (tr) {
        for (var r = 0; r < 6; r++) {
          var f = (r + 0.5) / 6, rx = (tr[0] + (tr[3] - tr[0]) * f) * kx, rz = (tr[1] + (tr[4] - tr[1]) * f) * kz, y = tr[2] + (tr[5] - tr[2]) * f, n = Math.round(Math.PI * (rx + rz) / 0.9);
          for (var i = 0; i < n; i++) { if (((i * 7 + r * 13) % 10) > 7) continue; var a = i / n * Math.PI * 2; spots.push([Math.cos(a) * rx, y, Math.sin(a) * rz]); }
        }
      });
      [[far, function (q) { return q[2] < 0; }], [near, function (q) { return q[2] >= 0; }]].forEach(function (hp) {
        var list = spots.filter(hp[1]); if (!list.length) return;
        var im = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.75, 0.32), std({ roughness: 0.9, side: T.FrontSide }), list.length);
        var M4 = new T.Matrix4(), q4 = new T.Quaternion(), upv = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1), P = [c1, c2, '#F4F4FA', c1, '#1B2236'];
        list.forEach(function (q, i) { q4.setFromAxisAngle(upv, Math.atan2(-q[0], -q[2])); M4.compose(new T.Vector3(q[0], q[1] + 0.45, q[2]), q4, one); im.setMatrixAt(i, M4); im.setColorAt(i, new T.Color(P[i % P.length])); });
        hp[0].add(im);
      });
    }

    // ---------- roof ----------
    var tl = L('techo'), RIX = 38 * kx, RIZ = 27 * kz, RY0 = FH + 1, RY1 = FH - 2;
    if (tl >= 1) {
      var roofM = tl === 1 ? std({ color: hex(c1).lerp(new T.Color(0xffffff), 0.35), roughness: 0.6, metalness: 0.3 })
        : new T.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2, side: T.DoubleSide, depthWrite: false });
      addHalves(function (a0, a1) { var m = new T.Mesh(band(FX, FZ, RY0, RIX, RIZ, RY1, a0, a1, 48, 1), roofM); if (tl === 1) m.castShadow = true; return m; });
      if (tl >= 2) {
        // white ribs from the façade to the inner edge
        var ribM = std({ color: 0xf2f5fa, roughness: 0.4, metalness: 0.4 });
        for (var i = 0; i < 40; i++) {
          var a = i / 40 * Math.PI * 2, p0 = new T.Vector3(Math.cos(a) * FX, RY0, Math.sin(a) * FZ), p1 = new T.Vector3(Math.cos(a) * RIX, RY1, Math.sin(a) * RIZ);
          var len = p0.distanceTo(p1), rib = new T.Mesh(new T.BoxGeometry(0.35, 0.5, len), ribM);
          rib.position.copy(p0).add(p1).multiplyScalar(0.5); rib.lookAt(p1);
          (p0.z < 0 ? far : near).add(rib);
        }
      }
      // the inner edge of the roof: a beam, glowing at level 3
      var edgeM = tl === 3 ? new T.MeshBasicMaterial({ color: hex(c2) }) : std({ color: 0xe6eaf2, metalness: 0.5, roughness: 0.3 });
      addHalves(function (a0, a1) { return new T.Mesh(band(RIX, RIZ, RY1 - 0.4, RIX * 0.985, RIZ * 0.985, RY1 + 0.6, a0, a1, 48, 1), edgeM); });
      if (tl === 3) anim.push(function (t) { edgeM.color.set(c2).lerp(new T.Color(c1), 0.5 + 0.5 * Math.sin(t * 1.6)); });
    }

    // ---------- floodlights ----------
    var gl = L('focos'), headM = new T.MeshBasicMaterial({ color: 0xf6f9ff });
    if (gl === 0) {
      var towerM = std({ color: 0x59606e, metalness: 0.6, roughness: 0.4 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
        var x = s[0] * (FX + 6), z = s[1] * (FZ + 5), H = FH + 14, g = s[1] < 0 ? far : near;
        var tw = new T.Mesh(new T.CylinderGeometry(0.5, 0.9, H, 6), towerM); tw.position.set(x, H / 2, z); g.add(tw);
        var hd = new T.Mesh(new T.BoxGeometry(7, 4, 0.8), headM); hd.position.set(x, H + 1.5, z); hd.lookAt(0, 0, 0); g.add(hd);
      });
    } else {
      // a row of lamps along the inner edge of the roof (or of the façade top without one)
      var rx = tl >= 1 ? RIX * 1.03 : FX * 0.97, rz = tl >= 1 ? RIZ * 1.03 : FZ * 0.97, ry = tl >= 1 ? RY1 + 0.9 : FH + 1.6;
      for (var i = 0; i < 44; i++) {
        var a = i / 44 * Math.PI * 2, lamp = new T.Mesh(new T.BoxGeometry(2.2, 1.1, 0.5), headM);
        lamp.position.set(Math.cos(a) * rx, ry, Math.sin(a) * rz); lamp.lookAt(0, 0, 0); (lamp.position.z < 0 ? far : near).add(lamp);
      }
      if (gl === 2) {
        // coloured beams sweeping the sky
        var beamGeo = new T.CylinderGeometry(0.4, 4.5, 60, 12, 1, true); beamGeo.translate(0, 30, 0);
        for (var j = 0; j < 8; j++) {
          var b = j / 8 * Math.PI * 2, bm = new T.MeshBasicMaterial({ color: hex(j % 2 ? c1 : c2), transparent: true, opacity: night ? 0.32 : 0.16, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
          var beam = new T.Mesh(beamGeo, bm); beam.position.set(Math.cos(b) * FX * 0.9, FH + 1, Math.sin(b) * FZ * 0.9);
          beam.userData.b = b; group.add(beam);
          (function (beam, k) { anim.push(function (t) { beam.rotation.z = Math.sin(t * 0.7 + k) * 0.5; beam.rotation.x = Math.cos(t * 0.6 + k * 1.3) * 0.35; }); })(beam, j);
        }
      }
    }

    // ---------- video boards ----------
    var sl = L('pantallas');
    if (sl >= 1) {
      var scrTex = canvasTex(512, 256, function (x, w, h) {
        var g2 = x.createLinearGradient(0, 0, w, h); g2.addColorStop(0, c1); g2.addColorStop(1, '#0b1230'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
        x.fillStyle = c2; x.beginPath(); x.moveTo(w / 2, 40); x.lineTo(w / 2 + 50, 60); x.lineTo(w / 2 + 50, 120); x.quadraticCurveTo(w / 2 + 50, 170, w / 2, 190); x.quadraticCurveTo(w / 2 - 50, 170, w / 2 - 50, 120); x.lineTo(w / 2 - 50, 60); x.closePath(); x.fill();
        x.fillStyle = '#ffffff'; x.font = '30px Titulos, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.slice(0, 20), w / 2, 225);
      });
      var scrM = new T.MeshBasicMaterial({ map: scrTex, toneMapped: false });
      var frameM = std({ color: 0x1b2236, metalness: 0.5, roughness: 0.4 });
      if (sl >= 1) [-1, 1].forEach(function (s) {
        var g3 = new T.Group(), fr = new T.Mesh(new T.BoxGeometry(1, 9.5, 17), frameM), sc = new T.Mesh(new T.PlaneGeometry(16, 8.6), scrM);
        sc.position.x = -s * 0.55; sc.rotation.y = -s * Math.PI / 2; g3.add(fr); g3.add(sc);
        g3.position.set(s * FX * 0.93, FH + 6, 0); group.add(g3);
      });
      if (sl === 2) {
        var cube = new T.Group(), body = new T.Mesh(new T.BoxGeometry(10, 6, 10), frameM); cube.add(body);
        for (var i = 0; i < 4; i++) { var p = new T.Mesh(new T.PlaneGeometry(9.4, 5.4), scrM), a = i * Math.PI / 2; p.position.set(Math.sin(a) * 5.05, 0, Math.cos(a) * 5.05); p.rotation.y = a; cube.add(p); }
        var cableM = std({ color: 0x2a2f3a });
        [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(function (q) { var cb = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 14, 4), cableM); cb.position.set(q[0], 10, q[1]); cube.add(cb); });
        cube.position.set(0, Math.max(26, FH + 3), 0); group.add(cube); group.userData.cube = cube;
        anim.push(function (t) { cube.rotation.y = t * 0.15; });
      }
    }

    // ---------- decoration ----------
    var dl = L('deco');
    if (dl >= 1) {
      // flags along the top of the façade, waving
      var poleM2 = std({ color: 0xdfe3ea, metalness: 0.5 }), flags = [];
      for (var i = 0; i < 24; i++) {
        var a = i / 24 * Math.PI * 2, x = Math.cos(a) * FX, z = Math.sin(a) * FZ, g4 = z < 0 ? far : near;
        var pole = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 6, 5), poleM2); pole.position.set(x, FH + 4, z); g4.add(pole);
        var fg = new T.Mesh(new T.PlaneGeometry(3.2, 1.9, 6, 1), std({ color: hex(i % 2 ? c1 : c2), roughness: 0.8 }));
        fg.geometry.translate(1.6, 0, 0); fg.position.set(x, FH + 6, z); fg.rotation.y = a; g4.add(fg); flags.push(fg);
      }
      anim.push(function (t) { flags.forEach(function (f, k) { var p = f.geometry.attributes.position; for (var v = 0; v < p.count; v++) { var u = p.getX(v); p.setZ(v, Math.sin(u * 1.8 - t * 6 + k) * 0.25 * (u / 3.2)); } p.needsUpdate = true; }); });
    }
    if (dl >= 2) {
      // a huge tifo on the far stand: stripes of the club and the stadium's name
      var tifoTex = canvasTex(1024, 384, function (x, w, h) {
        for (var i = 0; i < 12; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * w / 12, 0, w / 12 + 1, h); }
        x.fillStyle = 'rgba(2,4,12,.75)'; x.fillRect(0, h * 0.32, w, h * 0.36);
        x.fillStyle = '#fff'; x.font = '84px Titulos, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.slice(0, 18), w / 2, h / 2);
      });
      var tifo = new T.Mesh(new T.PlaneGeometry(46 * kx, 13), std({ map: tifoTex, roughness: 0.9 }));
      tifo.position.set(0, 9.5, -33.5 * kz); tifo.rotation.x = -0.62; far.add(tifo);
    }
    var fw = null;
    if (dl >= 3) {
      // fireworks: bursts of sparks over the roof (on their own every few seconds, and when burst() is called)
      var N = 900, geo = new T.BufferGeometry(), P3 = new Float32Array(N * 3), C3 = new Float32Array(N * 3);
      geo.setAttribute('position', new T.BufferAttribute(P3, 3)); geo.setAttribute('color', new T.BufferAttribute(C3, 3));
      var pm = new T.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false });
      var pts = new T.Points(geo, pm); pts.frustumCulled = false; group.add(pts);
      var parts = [], next = 0;
      fw = function (t) {
        var n = 3 + (Math.random() * 3 | 0);
        for (var b = 0; b < n; b++) {
          var a = Math.random() * Math.PI * 2, o = new T.Vector3(Math.cos(a) * FX * 0.8, FH + 18 + Math.random() * 14, Math.sin(a) * FZ * 0.8), col = new T.Color(Math.random() < 0.5 ? c1 : c2), t0 = t + b * 0.25;
          for (var k = 0; k < 90; k++) { var d = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(9 + Math.random() * 4); parts.push({ o: o, d: d, t0: t0, c: col }); }
        }
        if (parts.length > N) parts.splice(0, parts.length - N);
      };
      anim.push(function (t) {
        if (t > next) { fw(t); next = t + 4 + Math.random() * 2; }
        var i = 0;
        parts = parts.filter(function (p) { return t - p.t0 < 1.8; });
        parts.forEach(function (p) {
          var u = Math.max(0, t - p.t0), f = 1 - Math.exp(-u * 2.2);
          P3[i * 3] = p.o.x + p.d.x * f; P3[i * 3 + 1] = p.o.y + p.d.y * f - u * u * 2; P3[i * 3 + 2] = p.o.z + p.d.z * f;
          var k = u <= 0 ? 0 : Math.max(0, 1 - u / 1.8); C3[i * 3] = p.c.r * k; C3[i * 3 + 1] = p.c.g * k; C3[i * 3 + 2] = p.c.b * k; i++;
        });
        for (var j = i; j < N; j++) { C3[j * 3] = C3[j * 3 + 1] = C3[j * 3 + 2] = 0; }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.setDrawRange(0, Math.max(1, i));
      });
    }
    return {
      group: group, far: far, near: near,
      size: { x: FX, z: FZ, h: FH },
      update: function (t) { for (var i = 0; i < anim.length; i++) anim[i](t); },
      burst: function (t) { if (fw) fw(t); }
    };
  }
  window.AMStadUp = { PARTS: PARTS, PRICE: PRICE, part: part, build: build };
})();
