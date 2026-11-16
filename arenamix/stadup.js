/* ARENA MIX: your own stadium, built in one piece and remodelled with gems.
   One bowl round the pitch, a rounded rectangle like a real stadium: stepped stands rising from the pitch side, a
   band of LED between the tiers, up to three tiers, a façade that closes the back of the stands, a roof that
   springs from the top of the façade and covers the seats. The parts bought with gems change that same building.
   AMStadUp.PARTS / PRICE     the catalogue (level 0 free, each level needs the one before)
   AMStadUp.make(cfg, opts)   -> {
       half    the far half of the bowl (z <= 0) in world metres; a mirror image (scale z -1) makes the near half
       whole   what is not mirrored: the square round it, the towers, the screens, the video cube, beams, fireworks
       seats   the seats of the far half [[x, y, z]...] (for the crowd), size { x, z, h }, screenX,
       update(t), burst(t) }
   opts: { night }. Everything animated shares its geometry / texture between the half and its mirror. */
(function () {
  var T = window.THREE;
  var PARTS = [
    { id: 'fachada', name: 'Fachada', icon: 'M3 21V8l9-5l9 5v13M7 21v-6h10v6M3 12h18', levels: [
      ['Hormigón', 'Fachada de hormigón con ventanales'], ['Paneles del club', 'Paneles en tus dos colores'],
      ['Fachada LED', 'Una pantalla de luz con el nombre del estadio'], ['Envolvente de luz', 'Rombos de luz en tus colores por toda la fachada']] },
    { id: 'techo', name: 'Techo', icon: 'M2 12L12 4l10 8M5 10v10h14V10', levels: [
      ['Descubierto', 'Las gradas al aire libre'], ['Visera', 'Una cubierta sobre todas las gradas'],
      ['Cristal', 'Cubierta de cristal con costillas blancas'], ['Anillo de luz', 'Cristal con un borde de luz de colores']] },
    { id: 'aforo', name: 'Aforo', icon: 'M4 20h16M6 16h12M8 12h8M10 8h4', levels: [
      ['Una grada', 'Un anillo de gradas'], ['Grada superior', 'Un segundo anillo lleno de público'],
      ['Tercer anillo', 'Tres anillos: un estadio gigante']] },
    { id: 'pantallas', name: 'Videomarcadores', icon: 'M3 5h18v11H3zM8 20h8M12 16v4', levels: [
      ['Marcadores', 'Los dos marcadores de siempre'], ['Pantallas gigantes', 'Pantallas enormes en los fondos'],
      ['Videocubo', 'Un cubo de pantallas colgado sobre el centro del campo']] },
    { id: 'focos', name: 'Focos', icon: 'M12 2v4M5 5l3 3M19 5l-3 3M7 13a5 5 0 0 1 10 0v2H7zM9 19h6', levels: [
      ['Torres clásicas', 'Cuatro torres de focos'], ['Anillo de focos', 'Una fila de focos en todo el borde'],
      ['Focos de colores', 'Haces de luz en tus colores que barren el cielo']] },
    { id: 'deco', name: 'Decoración', icon: 'M5 21V4M5 4h11l-2 4l2 4H5', levels: [
      ['Nada', 'Sin adornos'], ['Banderas', 'Banderas de tus colores en lo alto'],
      ['Tifo gigante', 'Un mosaico enorme de la afición'], ['Fuegos artificiales', 'Fuegos sobre el estadio al salir al campo']] }
  ];
  var PRICE = [0, 10, 25, 50];
  function part(id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i]; return null; }

  // ---------- the plan: a rounded rectangle round the pitch (a superellipse), sampled at even steps ----------
  var AX = 35, AZ = 20.5, NE = 5;     // the front of the stands: 5 m behind the goal lines, 5.5 m off the touchlines
  function plan(n) {
    // the far half, from x = -AX (z = 0) round to x = +AX (z = 0), evenly spaced along its length
    var fine = [], L = [0], i;
    for (i = 0; i <= 2000; i++) {
      var a = Math.PI + Math.PI * i / 2000, c = Math.cos(a), s = Math.sin(a);
      var x = AX * Math.sign(c) * Math.pow(Math.abs(c), 2 / NE), z = AZ * Math.sign(s) * Math.pow(Math.abs(s), 2 / NE);
      fine.push([x, z]);
      if (i) L.push(L[i - 1] + Math.hypot(x - fine[i - 1][0], z - fine[i - 1][1]));
    }
    var tot = L[L.length - 1], out = [], k = 0;
    for (i = 0; i <= n; i++) {
      var want = tot * i / n; while (k < L.length - 2 && L[k + 1] < want) k++;
      var f = (want - L[k]) / Math.max(1e-6, L[k + 1] - L[k]), p = [fine[k][0] + (fine[k + 1][0] - fine[k][0]) * f, fine[k][1] + (fine[k + 1][1] - fine[k][1]) * f];
      // the outward normal (the gradient of |x/AX|^NE + |z/AZ|^NE)
      var gx = NE * Math.pow(Math.abs(p[0]) / AX, NE - 1) / AX * Math.sign(p[0]), gz = NE * Math.pow(Math.abs(p[1]) / AZ, NE - 1) / AZ * Math.sign(p[1]);
      if (i === 0) { gx = -1; gz = 0; } if (i === n) { gx = 1; gz = 0; }
      var gl = Math.hypot(gx, gz) || 1;
      out.push({ x: p[0], z: i === 0 || i === n ? 0 : p[1], nx: gx / gl, nz: gz / gl, s: want });
    }
    return out;
  }
  var PL = null;
  function P() { return PL || (PL = plan(160)); }
  // a band swept along the plan: profile points [d (metres outwards), y]; one flat-shaded strip per profile segment
  // colorOf(seg) gives a vertex colour per segment (or null); uv: u along the plan / tile, v across the segment
  function sweep(prof, opts) {
    opts = opts || {};
    // mirror: the near half (z >= 0), with its text still reading the right way round
    var pl = P(), pos = [], nor = [], uv = [], col = [], idx = [], base = 0, tile = opts.tile || 8, mz = opts.mirror ? -1 : 1;
    for (var k = 0; k < prof.length - 1; k++) {
      var a = prof[k], b = prof[k + 1], cc = opts.colorOf ? opts.colorOf(k) : null;
      for (var j = 0; j < pl.length; j++) {
        var q = pl[j];
        pos.push(q.x + q.nx * a[0], a[1], mz * (q.z + q.nz * a[0]), q.x + q.nx * b[0], b[1], mz * (q.z + q.nz * b[0]));
        // an approximate normal: across the profile segment, turned outward or inward
        var dd = b[0] - a[0], dy = b[1] - a[1], ln = Math.hypot(dd, dy) || 1, ny = dd / ln, nd = -dy / ln;
        nor.push(q.nx * nd, ny, mz * q.nz * nd, q.nx * nd, ny, mz * q.nz * nd);
        var u = (opts.uFlip ? -1 : 1) * mz * (q.s + (opts.uOff || 0)) / tile;
        uv.push(u, opts.v0 != null ? opts.v0 : 0, u, opts.v1 != null ? opts.v1 : 1);
        if (cc) col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
        if (j < pl.length - 1) { var i0 = base + j * 2; idx.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3); }
      }
      base += pl.length * 2;
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    if (col.length) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }
  function canvasTex(w, h, draw, repeat) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    if (repeat) { t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping; }
    return t;
  }
  function std(o) { return new T.MeshStandardMaterial(Object.assign({ roughness: 0.8, metalness: 0.05, side: T.DoubleSide }, o)); }
  // a point on the plan at a distance d outwards, at fraction f (0..1) along the far half
  function at(f, d) { var pl = P(), q = pl[Math.max(0, Math.min(pl.length - 1, Math.round(f * (pl.length - 1))))]; return { x: q.x + q.nx * d, z: q.z + q.nz * d, nx: q.nx, nz: q.nz }; }

  function make(cfg, opts) {
    opts = opts || {};
    var up = (cfg && cfg.up) || {}, L = function (id) { return Math.max(0, Math.min(part(id).levels.length - 1, up[id] | 0)); };
    var c1 = cfg.c1 || '#22D3EE', c2 = cfg.c2 || '#FFC53D', name = String(cfg.name || 'ARENA MIX').toUpperCase(), night = !!opts.night;
    var half = new T.Group(), whole = new T.Group(), anim = [], seats = [];
    var aforo = L('aforo'), fl = L('fachada'), tl = L('techo'), gl = L('focos'), sl = L('pantallas'), dl = L('deco');
    // seat colours: the club's (rows alternating), one colour, or the stadium's own blue
    var sc = cfg.seat === 'club' ? [c1, c2] : /^#/.test(cfg.seat || '') ? [cfg.seat, cfg.seat] : ['#2563EB', '#1D4ED8'];
    // vertex colours are linear: the hex colours converted, so the seats keep their real colour
    var lin = function (h) { return new T.Color(h).convertSRGBToLinear(); };
    var seatA = lin(sc[0]), seatB = lin(sc[1]), riser = lin('#8d93a3'), concrete = new T.Color('#c4c8d0');

    // ---------- the stands: tiers of steps, a band of LED between them ----------
    var tiers = [], d = 0, y = 1.3;
    // lower tier: a front wall, then 14 rows (0.9 m deep, 0.45 m up)
    var spec = [[14, 0.9, 0.45], [12, 0.9, 0.56], [11, 0.9, 0.62]];
    var concProf = [[0, 0], [0, 1.3]], ledBands = [];
    for (var ti = 0; ti <= aforo; ti++) {
      var sp = spec[ti], prof = [];
      if (ti > 0) {
        // the next tier starts over the back rows of the one below, behind a band of LED
        d -= 1.0; var y0 = y + 1.0, y1 = y + 3.4;
        ledBands.push([[d, y0], [d, y1]]);
        y = y1;
      }
      var start = [d, y]; prof.push([d, y]);
      for (var r = 0; r < sp[0]; r++) {
        prof.push([d + sp[1], y]);                  // the tread (seat row)
        seats.push({ d: d + sp[1] * 0.55, y: y, tier: ti });
        d += sp[1];
        if (r < sp[0] - 1) { prof.push([d, y + sp[2]]); y += sp[2]; }  // the riser
      }
      tiers.push({ prof: prof, start: start, end: [d, y] });
    }
    var dTop = d, yTop = y + 2.6;
    // treads in the seat colours (row by row), risers grey
    tiers.forEach(function (t2, ti) {
      var g = sweep(t2.prof, { colorOf: function (k) { var tread = k % 2 === 0; return tread ? ((Math.floor(k / 2) + ti) % 2 ? seatB : seatA) : riser; } });
      var m = new T.Mesh(g, std({ vertexColors: true, roughness: 0.85 })); m.castShadow = true; m.receiveShadow = true; half.add(m);
    });
    // the front wall of the lower tier and the back wall above the last row
    [concProf, [[dTop, y], [dTop, yTop]]].forEach(function (pr) { var m = new T.Mesh(sweep(pr), std({ color: concrete })); m.castShadow = true; m.receiveShadow = true; half.add(m); });
    // the walkway on top of the back wall, out to the façade
    var FB = dTop + 1.2, FT = dTop + 3.6;     // façade: bottom (at the ground) and top, leaning out
    half.add(new T.Mesh(sweep([[dTop, yTop], [FT, yTop]]), std({ color: concrete })));
    // LED bands between the tiers (the stadium's name running round)
    var ledTex = canvasTex(1024, 64, function (x, w, h) {
      x.fillStyle = '#05060f'; x.fillRect(0, 0, w, h); x.font = '40px Titulos, Arial'; x.textBaseline = 'middle';
      var tw = x.measureText(name + '  ★  ').width, n = Math.max(1, Math.floor(w / tw)), st = w / n;
      for (var i = 0; i < n; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillText(name + '  ★  ', i * st + (st - tw) / 2, 34); }
    }, true);
    var ledMat = new T.MeshBasicMaterial({ map: ledTex, toneMapped: false, side: T.DoubleSide });
    ledBands.forEach(function (pr) { [false, true].forEach(function (mr) { whole.add(new T.Mesh(sweep(pr, { tile: 34, mirror: mr }), ledMat)); }); });
    // the underside of each upper tier, so you never see through it
    tiers.forEach(function (t2, ti) { if (ti) half.add(new T.Mesh(sweep([[t2.start[0], t2.start[1] - 2.4], [t2.end[0], t2.start[1] - 2.4]]), std({ color: '#565c6a' }))); });
    if (ledBands.length) anim.push(function (t) { ledTex.offset.x = (t * 0.05) % 1; });

    // ---------- the façade: from the ground to the top of the stands, leaning out ----------
    var faTex = canvasTex(1024, 256, function (x, w, h) {
      if (fl === 0) {
        x.fillStyle = '#b9bec8'; x.fillRect(0, 0, w, h);
        for (var i = 0; i < 16; i++) { x.fillStyle = '#9097a4'; x.fillRect(i * 64, 0, 12, h); x.fillStyle = '#22314f'; x.fillRect(i * 64 + 20, 56, 32, 140); x.fillStyle = '#5b7fb8'; x.fillRect(i * 64 + 22, 58, 28, 54); }
        x.fillStyle = '#dfe3ea'; x.fillRect(0, 0, w, 18); x.fillRect(0, h - 22, w, 22);
      } else if (fl === 1) {
        for (var j = 0; j < 16; j++) { x.fillStyle = j % 2 ? c1 : c2; x.fillRect(j * 64, 0, 64, h); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(j * 64, 0, 5, h); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(j * 64 + 5, 0, 8, h); }
        x.fillStyle = '#1b2236'; x.fillRect(0, h - 26, w, 26); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, w, 14);
      } else {
        x.fillStyle = '#0a1030'; x.fillRect(0, 0, w, h);
        if (fl === 3) { x.lineWidth = 7; for (var k = -8; k < 24; k++) { x.strokeStyle = k % 2 ? c1 : c2; x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64 + 128, h); x.moveTo(k * 64 + 128, 0); x.lineTo(k * 64, h); x.stroke(); } }
        x.fillStyle = 'rgba(5,6,15,.85)'; x.fillRect(0, 92, w, 72);
        x.font = '46px Titulos, Arial'; x.textBaseline = 'middle';
        var tw = x.measureText(name + '  ★  ').width, n2 = Math.max(1, Math.floor(w / tw)), st2 = w / n2;
        for (var i2 = 0; i2 < n2; i2++) { x.fillStyle = n2 > 1 && i2 % 2 ? c1 : c2; x.fillText(name + '  ★  ', i2 * st2 + (st2 - tw) / 2, 130); }
      }
    }, true);
    var faMat = std({ map: faTex, emissive: fl >= 2 ? 0xffffff : 0x000000, emissiveMap: fl >= 2 ? faTex : null, emissiveIntensity: fl >= 2 ? (night ? 1.0 : 0.6) : 0, roughness: fl === 0 ? 0.9 : 0.5 });
    var faH = yTop + (tl ? 1.5 : 0.8);
    [false, true].forEach(function (mr) { var fc = new T.Mesh(sweep([[FB, 0], [FT, faH]], { tile: 46, uFlip: true, mirror: mr }), faMat); fc.castShadow = true; fc.receiveShadow = true; fc.userData.near = mr; whole.add(fc); });
    // structural fins on the façade
    var finM = std({ color: fl >= 2 ? '#1b2236' : '#e6e9ef', metalness: 0.3, roughness: 0.5 });
    for (var fi = 0; fi <= 24; fi++) {
      var p0 = at(fi / 24, FB), p1 = at(fi / 24, FT), len = Math.hypot(FT - FB, faH);
      var fin = new T.Mesh(new T.BoxGeometry(0.5, len, 0.9), finM);
      fin.position.set((p0.x + p1.x) / 2 + p0.nx * 0.4, faH / 2, (p0.z + p1.z) / 2 + p0.nz * 0.4);
      fin.rotation.y = Math.atan2(p0.nx, p0.nz); fin.rotateX(-Math.atan2(FT - FB, faH));
      fin.castShadow = true; half.add(fin);
    }
    if (fl >= 2) anim.push(function (t) { faTex.offset.x = (-t * 0.02) % 1; });

    // ---------- the roof: from the top of the façade over the seats ----------
    var roofY0 = faH, roofY1 = faH + 2.5, roofIn = Math.max(2, dTop * 0.12);
    var crownM = std({ color: fl >= 2 ? c1 : '#eef1f5', emissive: fl >= 2 ? c1 : '#000000', emissiveIntensity: fl >= 2 ? 0.7 : 0, metalness: 0.3 });
    if (tl === 0) {
      // open bowl: a crown along the top of the façade
      half.add(new T.Mesh(sweep([[FT - 0.2, faH], [FT - 0.2, faH + 1.3], [FT + 0.6, faH + 1.3]]), crownM));
    } else {
      var roofM = tl === 1 ? std({ color: new T.Color(c1).lerp(new T.Color('#ffffff'), 0.45), roughness: 0.55, metalness: 0.35 })
        : new T.MeshStandardMaterial({ color: 0xd8efff, transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.2, side: T.DoubleSide, depthWrite: false });
      var roof = new T.Mesh(sweep([[FT + 0.8, roofY0], [roofIn, roofY1]], { tile: 20 }), roofM); if (tl === 1) { roof.castShadow = true; roof.receiveShadow = true; } half.add(roof);
      // the edge beam of the roof (lit at level 3) and the rim on the façade
      var edgeM = tl === 3 ? new T.MeshBasicMaterial({ color: new T.Color(c2), side: T.DoubleSide }) : std({ color: '#eef1f5', metalness: 0.5, roughness: 0.3 });
      half.add(new T.Mesh(sweep([[roofIn, roofY1 - 0.6], [roofIn, roofY1 + 0.5], [roofIn + 0.8, roofY1 + 0.5]]), edgeM));
      half.add(new T.Mesh(sweep([[FT + 0.8, roofY0 - 0.6], [FT + 0.8, roofY0 + 0.4]]), crownM));
      if (tl >= 2) {
        // white ribs from the façade to the edge
        var ribM = std({ color: '#f2f5fa', metalness: 0.45, roughness: 0.35 });
        for (var ri = 0; ri <= 30; ri++) {
          var a0 = at(ri / 30, FT + 0.8), a1 = at(ri / 30, roofIn), v0 = new T.Vector3(a0.x, roofY0 + 0.3, a0.z), v1 = new T.Vector3(a1.x, roofY1 + 0.3, a1.z);
          var rib = new T.Mesh(new T.BoxGeometry(0.35, 0.6, v0.distanceTo(v1)), ribM); rib.position.copy(v0).add(v1).multiplyScalar(0.5); rib.lookAt(v1); half.add(rib);
        }
      }
    }

    // ---------- floodlights ----------
    var headM = new T.MeshBasicMaterial({ color: 0xf6f9ff });
    var size = { x: AX + FB + 1, z: AZ + FB + 1, h: Math.max(faH, roofY1) };
    if (gl === 0) {
      var towerM = std({ color: '#59606e', metalness: 0.6, roughness: 0.4 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
        var x = s[0] * (size.x * 0.82 + 4), z = s[1] * (size.z * 0.8 + 4), H = size.h + 14;
        var tw = new T.Mesh(new T.CylinderGeometry(0.5, 0.9, H, 6), towerM); tw.position.set(x, H / 2, z); tw.castShadow = true; whole.add(tw);
        var hd = new T.Mesh(new T.BoxGeometry(7, 4, 0.8), headM); hd.position.set(x, H + 1.5, z); hd.lookAt(0, 0, 0); whole.add(hd);
      });
    } else {
      // a row of lamps along the edge of the roof (or the top of the façade when it is open)
      var ld = tl ? roofIn + 0.6 : FT, ly = tl ? roofY1 - 0.9 : faH + 1.6;
      for (var li = 0; li <= 26; li++) { var q = at(li / 26, ld), lamp = new T.Mesh(new T.BoxGeometry(1.8, 1.0, 0.45), headM); lamp.position.set(q.x, ly, q.z); lamp.lookAt(0, 0, 0); half.add(lamp); }
      if (gl === 2) {
        var beamGeo = new T.CylinderGeometry(0.4, 4.5, 60, 12, 1, true); beamGeo.translate(0, 30, 0);
        for (var bj = 0; bj < 8; bj++) {
          var bq = at((bj % 4 + 0.5) / 4, FT), bz = bj < 4 ? 1 : -1;
          var bm = new T.MeshBasicMaterial({ color: new T.Color(bj % 2 ? c1 : c2), transparent: true, opacity: night ? 0.3 : 0.15, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
          var beam = new T.Mesh(beamGeo, bm); beam.position.set(bq.x, faH + 1, bq.z * bz); whole.add(beam);
          (function (beam, k) { anim.push(function (t) { beam.rotation.z = Math.sin(t * 0.7 + k) * 0.5; beam.rotation.x = Math.cos(t * 0.6 + k * 1.3) * 0.35; }); })(beam, bj);
        }
      }
    }

    // ---------- video boards ----------
    var screenX = AX + (tiers.length > 1 ? tiers[1].start[0] : dTop) + 0.6;
    if (sl >= 1) {
      var scrTex = canvasTex(512, 256, function (x, w, h) {
        var g2 = x.createLinearGradient(0, 0, w, h); g2.addColorStop(0, c1); g2.addColorStop(1, '#0b1230'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
        x.fillStyle = c2; x.beginPath(); x.moveTo(w / 2, 40); x.lineTo(w / 2 + 50, 60); x.lineTo(w / 2 + 50, 120); x.quadraticCurveTo(w / 2 + 50, 170, w / 2, 190); x.quadraticCurveTo(w / 2 - 50, 170, w / 2 - 50, 120); x.lineTo(w / 2 - 50, 60); x.closePath(); x.fill();
        x.fillStyle = '#ffffff'; x.font = '30px Titulos, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.slice(0, 20), w / 2, 225);
      });
      var scrM = new T.MeshBasicMaterial({ map: scrTex, toneMapped: false }), frameM = std({ color: '#1b2236', metalness: 0.5, roughness: 0.4 });
      // giant screens standing on the top of each end, facing the pitch
      [-1, 1].forEach(function (s) {
        var g3 = new T.Group(), fr = new T.Mesh(new T.BoxGeometry(1, 10, 22), frameM), scr = new T.Mesh(new T.PlaneGeometry(21, 9), scrM);
        scr.position.x = -s * 0.55; scr.rotation.y = -s * Math.PI / 2; g3.add(fr); g3.add(scr);
        g3.position.set(s * (AX + FT - 2), size.h + 5.5, 0); whole.add(g3);
      });
      if (sl === 2) {
        var cube = new T.Group(); cube.add(new T.Mesh(new T.BoxGeometry(10, 6, 10), frameM));
        for (var ci = 0; ci < 4; ci++) { var pn = new T.Mesh(new T.PlaneGeometry(9.4, 5.4), scrM), ca = ci * Math.PI / 2; pn.position.set(Math.sin(ca) * 5.05, 0, Math.cos(ca) * 5.05); pn.rotation.y = ca; cube.add(pn); }
        var cableM = std({ color: '#2a2f3a' });
        [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(function (q2) { var cb = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 14, 4), cableM); cb.position.set(q2[0], 10, q2[1]); cube.add(cb); });
        cube.position.set(0, Math.max(24, size.h + 2), 0); whole.add(cube);
        anim.push(function (t) { cube.rotation.y = t * 0.15; });
      }
    }

    // ---------- decoration ----------
    if (dl >= 1) {
      var flagG = new T.PlaneGeometry(3.2, 1.9, 6, 1); flagG.translate(1.6, 0, 0);
      var poleM = std({ color: '#dfe3ea', metalness: 0.5 }), fM = [std({ color: c1 }), std({ color: c2 })];
      var topY = tl ? roofY0 + 0.4 : faH + 1.3;
      for (var gi = 0; gi <= 12; gi++) {
        var fq = at(gi / 12, FT + 0.4), pole = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 6, 5), poleM); pole.position.set(fq.x, topY + 3, fq.z); half.add(pole);
        var fg = new T.Mesh(flagG, fM[gi % 2]); fg.position.set(fq.x, topY + 5, fq.z); fg.rotation.y = Math.atan2(fq.nx, fq.nz) + Math.PI / 2; half.add(fg);
      }
      anim.push(function (t) { var p = flagG.attributes.position; for (var v = 0; v < p.count; v++) { var u = p.getX(v); p.setZ(v, Math.sin(u * 1.8 - t * 6) * 0.3 * (u / 3.2)); } p.needsUpdate = true; });
    }
    if (dl >= 2) {
      // a tifo laid over the far side's lower tier: the club's stripes and the stadium's name
      var tifoTex = canvasTex(1024, 320, function (x, w, h) {
        for (var i = 0; i < 12; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * w / 12, 0, w / 12 + 1, h); }
        x.fillStyle = 'rgba(2,4,12,.78)'; x.fillRect(0, h * 0.3, w, h * 0.4);
        x.fillStyle = '#fff'; x.font = '80px Titulos, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name.slice(0, 18), w / 2, h / 2);
      });
      var t0 = tiers[0], tifo = new T.Mesh(new T.PlaneGeometry(40, Math.hypot(t0.end[0] - t0.start[0], t0.end[1] - t0.start[1]) * 0.9), std({ map: tifoTex, roughness: 0.9 }));
      var mid = [(t0.start[0] + t0.end[0]) / 2, (t0.start[1] + t0.end[1]) / 2 + 0.6];
      tifo.position.set(0, mid[1], -(AZ + mid[0])); tifo.rotation.x = -Math.atan2(t0.end[1] - t0.start[1], t0.end[0] - t0.start[0]); whole.add(tifo);
    }
    var fw = null;
    if (dl >= 3) {
      var N = 900, geo = new T.BufferGeometry(), P3 = new Float32Array(N * 3), C3 = new Float32Array(N * 3);
      geo.setAttribute('position', new T.BufferAttribute(P3, 3)); geo.setAttribute('color', new T.BufferAttribute(C3, 3));
      var pts = new T.Points(geo, new T.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      pts.frustumCulled = false; whole.add(pts);
      var sparks = [], next = 0;
      fw = function (t) {
        var n = 3 + (Math.random() * 3 | 0);
        for (var b = 0; b < n; b++) {
          var a = Math.random() * Math.PI * 2, o = new T.Vector3(Math.cos(a) * size.x * 0.7, size.h + 16 + Math.random() * 14, Math.sin(a) * size.z * 0.7), col = new T.Color(Math.random() < 0.5 ? c1 : c2), tb = t + b * 0.25;
          for (var k2 = 0; k2 < 90; k2++) sparks.push({ o: o, d: new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(9 + Math.random() * 4), t0: tb, c: col });
        }
        if (sparks.length > N) sparks.splice(0, sparks.length - N);
      };
      anim.push(function (t) {
        if (t > next) { fw(t); next = t + 4 + Math.random() * 2; }
        sparks = sparks.filter(function (p) { return t - p.t0 < 1.8; });
        var i = 0;
        sparks.forEach(function (p) {
          var u = Math.max(0, t - p.t0), f = 1 - Math.exp(-u * 2.2), k = u <= 0 ? 0 : Math.max(0, 1 - u / 1.8);
          P3[i * 3] = p.o.x + p.d.x * f; P3[i * 3 + 1] = p.o.y + p.d.y * f - u * u * 2; P3[i * 3 + 2] = p.o.z + p.d.z * f;
          C3[i * 3] = p.c.r * k; C3[i * 3 + 1] = p.c.g * k; C3[i * 3 + 2] = p.c.b * k; i++;
        });
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.setDrawRange(0, Math.max(1, i));
      });
    }

    // ---------- the square round the stadium ----------
    {
      var sh = new T.Shape(), hole = new T.Path(), pl = P(), RA = size.x + 22, RB = size.z + 22;
      for (var a2 = 0; a2 <= 64; a2++) { var an = a2 / 64 * Math.PI * 2, cx = Math.cos(an), sz = Math.sin(an); var X = RA * Math.sign(cx) * Math.pow(Math.abs(cx), 2 / NE), Z = RB * Math.sign(sz) * Math.pow(Math.abs(sz), 2 / NE); if (a2) sh.lineTo(X, Z); else sh.moveTo(X, Z); }
      // the hole: the stadium's own footprint (under the façade)
      for (var h2 = 64; h2 >= 0; h2--) { var hn = h2 / 64 * Math.PI * 2, hc = Math.cos(hn), hs = Math.sin(hn); var HX = (AX + FB - 0.5) * Math.sign(hc) * Math.pow(Math.abs(hc), 2 / NE), HZ = (AZ + FB - 0.5) * Math.sign(hs) * Math.pow(Math.abs(hs), 2 / NE); if (h2 === 64) hole.moveTo(HX, HZ); else hole.lineTo(HX, HZ); }
      sh.holes.push(hole);
      var plaza = new T.Mesh(new T.ShapeGeometry(sh, 4), std({ color: '#8b8f99', roughness: 0.95, side: T.FrontSide }));
      plaza.rotation.x = Math.PI / 2; plaza.position.y = 0.01; plaza.scale.z = -1; plaza.receiveShadow = true;
      whole.add(plaza);
      var poleM2 = std({ color: '#3a3f4c', metalness: 0.6, roughness: 0.4 }), lampM = new T.MeshBasicMaterial({ color: 0xfff1c9 });
      for (var pi = 0; pi < 18; pi++) {
        var aa = pi / 18 * Math.PI * 2, px = Math.cos(aa) * (RA - 6), pz = Math.sin(aa) * (RB - 6);
        var lp = new T.Mesh(new T.CylinderGeometry(0.18, 0.25, 9, 6), poleM2); lp.position.set(px, 4.5, pz); whole.add(lp);
        var lb = new T.Mesh(new T.SphereGeometry(0.7, 8, 6), lampM); lb.position.set(px, 9.2, pz); whole.add(lb);
      }
    }

    // ---------- the seats of the far half (for the crowd): along each row, every 0.9 m ----------
    var list = [], pl2 = P();
    seats.forEach(function (sr) {
      var acc = 0, prev = null;
      for (var j = 0; j < pl2.length; j++) {
        var q = pl2[j], p = [q.x + q.nx * sr.d, sr.y, q.z + q.nz * sr.d];
        if (prev) acc += Math.hypot(p[0] - prev[0], p[2] - prev[2]);
        prev = p;
        if (acc >= (sr.tier ? 1.15 : 0.9)) { acc = 0; if (p[2] < -0.3) list.push(p); }
      }
    });
    return {
      half: half, whole: whole, seats: list, size: size, screenX: screenX,
      update: function (t) { for (var i = 0; i < anim.length; i++) anim[i](t); },
      burst: function (t) { if (fw) fw(t); }
    };
  }
  window.AMStadUp = { PARTS: PARTS, PRICE: PRICE, part: part, make: make };
})();
