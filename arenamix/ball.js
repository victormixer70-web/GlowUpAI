/* ARENA MIX match ball: white stars on deep violet panels with neon line art.
   Twelve five-point stars sit on the vertices of an icosahedron, their tips reaching for their five
   neighbours, so the stars interlock and the twenty triangles between them are the dark panels.
   Each panel carries the game's lightning bolt drawn as a neon line (lime or pink) over a swirled,
   dotted violet. Painted straight on the sphere (no pole stretching).
   AMBall.material() gives a glossy material ready for SphereGeometry. */
(function () {
  var T = window.THREE, tex = null;
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  // icosahedron: 12 vertices (the stars) and 20 faces (the panels)
  var G = (1 + Math.sqrt(5)) / 2;
  var V = [[-1, G, 0], [1, G, 0], [-1, -G, 0], [1, -G, 0], [0, -1, G], [0, 1, G], [0, -1, -G], [0, 1, -G], [G, 0, -1], [G, 0, 1], [-G, 0, -1], [-G, 0, 1]].map(norm);
  var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  var NB = Math.acos(dot(V[0], V[1]));   // angle between neighbouring stars
  // each star: a tangent frame with its first tip pointing at a neighbour (then all five do)
  var SF = V.map(function (v) {
    var n = V.filter(function (q) { return q !== v && Math.abs(Math.acos(Math.max(-1, Math.min(1, dot(v, q)))) - NB) < 1e-3; })[0];
    var d = dot(v, n), u = norm([n[0] - v[0] * d, n[1] - v[1] * d, n[2] - v[2] * d]);
    return { v: v, u: u, w: cross(v, u) };
  });
  // each panel: its centre and a frame
  var PF = F.map(function (f, k) {
    var c = norm([V[f[0]][0] + V[f[1]][0] + V[f[2]][0], V[f[0]][1] + V[f[1]][1] + V[f[2]][1], V[f[0]][2] + V[f[1]][2] + V[f[2]][2]]);
    var a = V[f[0]], d = dot(c, a), u = norm([a[0] - c[0] * d, a[1] - c[1] * d, a[2] - c[2] * d]);
    return { c: c, u: u, w: cross(c, u), k: k };
  });
  var R_OUT = NB / 2 + 0.02, R_IN = NB * 0.255;   // star tips just meet their neighbours' tips
  var A36 = Math.PI / 5, TIPX = R_OUT, IX = R_IN * Math.cos(A36), IY = R_IN * Math.sin(A36);
  var EX = IX - TIPX, EY = IY, EL = Math.hypot(EX, EY);
  // the lightning bolt, in a panel's own plane (radians from its centre)
  var BOLT = [[0.02, -0.17], [-0.085, 0.015], [-0.005, 0.015], [-0.04, 0.17], [0.085, -0.03], [0.005, -0.03], [0.05, -0.17]];
  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(px - ax - vx * t, py - ay - vy * t);
  }
  var WHITE = [247, 248, 252], INK = [16, 10, 40], V1 = [58, 26, 128], V2 = [112, 34, 140], V3 = [30, 18, 90];
  var LIME = [214, 255, 46], PINK = [255, 58, 170];
  function paint(W, H) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (var j = 0; j < H; j++) {
      var th = (j + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (var i = 0; i < W; i++) {
        // three.js SphereGeometry: x = -cos(phi) sin(theta), y = cos(theta), z = sin(phi) sin(theta)
        var ph = (i + 0.5) / W * Math.PI * 2, P = [-Math.cos(ph) * st, ct, Math.sin(ph) * st];
        // the nearest star, and the star shape around it
        var bi = 0, bd = -2;
        for (var n = 0; n < 12; n++) { var dd = dot(P, V[n]); if (dd > bd) { bd = dd; bi = n; } }
        var S = SF[bi], a = Math.acos(Math.min(1, bd));
        var ang = Math.atan2(dot(P, S.w), dot(P, S.u));
        var f = ((ang % (2 * A36)) + 2 * A36) % (2 * A36); if (f > A36) f = 2 * A36 - f;   // folded: 0 at a tip, 36 deg at an inner corner
        var qx = a * Math.cos(f), qy = a * Math.sin(f);
        // signed distance to the star's edge (positive inside)
        var sd = ((qx - TIPX) * EY - qy * EX) / EL * -1;
        var inStar = smooth(-0.004, 0.004, sd);
        var o = (j * W + i) * 4;
        if (sd > 0.012) {
          // well inside a star: white, maybe the neon ring at its heart
          var rg = (1 - smooth(0.006, 0.011, Math.abs(a - 0.06))) * 0.9, rc = bi % 2 ? PINK : LIME;
          d[o] = WHITE[0] + (rc[0] - WHITE[0]) * rg; d[o + 1] = WHITE[1] + (rc[1] - WHITE[1]) * rg; d[o + 2] = WHITE[2] + (rc[2] - WHITE[2]) * rg; d[o + 3] = 255;
          continue;
        }
        // the panel underneath: swirled violet with fine dots
        var pi = 0, pd = -2;
        for (var m = 0; m < 20; m++) { var pq = dot(P, PF[m].c); if (pq > pd) { pd = pq; pi = m; } }
        var Q = PF[pi], lx = dot(P, Q.u), ly = dot(P, Q.w);
        var sw = 0.5 + 0.5 * Math.sin(lx * 22 + Math.sin(ly * 17 + pi) * 2.2 + pi * 1.7);
        var col = [V3[0] + (V1[0] - V3[0]) * sw, V3[1] + (V1[1] - V3[1]) * sw, V3[2] + (V1[2] - V3[2]) * sw];
        var sw2 = Math.pow(0.5 + 0.5 * Math.sin(ly * 30 - lx * 12 + pi), 6);
        col = [col[0] + (V2[0] - col[0]) * sw2 * 0.8, col[1] + (V2[1] - col[1]) * sw2 * 0.8, col[2] + (V2[2] - col[2]) * sw2 * 0.8];
        var dots = 0.5 + 0.5 * Math.sin(lx * 260) * Math.sin(ly * 260);
        var dk = 0.86 + 0.14 * dots; col = [col[0] * dk, col[1] * dk, col[2] * dk];
        // the neon bolt: an outline with a soft glow, lime on half the panels, pink on the rest
        var bdist = 9, b2 = 9, near = Math.abs(lx) < 0.14 && Math.abs(ly) < 0.22;
        if (near) for (var e = 0; e < BOLT.length; e++) { var A = BOLT[e], B = BOLT[(e + 1) % BOLT.length]; bdist = Math.min(bdist, segDist(lx, ly, A[0], A[1], B[0], B[1])); }
        var neon = pi % 2 ? PINK : LIME, other = pi % 2 ? LIME : PINK;
        var glow = Math.exp(-bdist * 70) * 0.55, line = 1 - smooth(0.004, 0.008, bdist);
        // a second, offset outline in the other colour (the line-art look)
        if (near) for (var e2 = 0; e2 < BOLT.length; e2++) { var A2 = BOLT[e2], B2 = BOLT[(e2 + 1) % BOLT.length]; b2 = Math.min(b2, segDist(lx - 0.014, ly + 0.01, A2[0], A2[1], B2[0], B2[1])); }
        var line2 = (1 - smooth(0.0025, 0.005, b2)) * 0.85;
        for (var q = 0; q < 3; q++) { col[q] += (neon[q] - col[q]) * glow; col[q] += (other[q] - col[q]) * line2; col[q] += (neon[q] - col[q]) * line; }
        // star over panel, with a dark seam round the star
        var seam = (1 - smooth(0.0, 0.007, Math.abs(sd))) * 0.9;
        for (var q2 = 0; q2 < 3; q2++) { col[q2] += (WHITE[q2] - col[q2]) * inStar; col[q2] += (INK[q2] - col[q2]) * seam; }
        // a small neon ring at the heart of every star
        var ring = (1 - smooth(0.006, 0.011, Math.abs(a - 0.06)));
        for (var q3 = 0; q3 < 3; q3++) col[q3] += ((bi % 2 ? PINK : LIME)[q3] - col[q3]) * ring * inStar * 0.9;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  // the design is baked once into assets/ball/starball.webp (painting it here took half a second on a phone);
  // until the picture arrives the ball is plain white, and if it cannot load, it is painted here after all
  function texture() {
    if (!tex && T) {
      var c = document.createElement('canvas'); c.width = c.height = 4; var cx = c.getContext('2d'); cx.fillStyle = '#F7F8FC'; cx.fillRect(0, 0, 4, 4);
      tex = new T.CanvasTexture(c);
      tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
      var im = new Image();
      im.onload = function () { tex.image = im; tex.needsUpdate = true; };
      im.onerror = function () { tex.image = paint(1024, 512); tex.needsUpdate = true; };
      im.src = 'assets/ball/starball.webp?v=1';
    }
    return tex;
  }
  function material() {
    var M = T.MeshPhysicalMaterial || T.MeshStandardMaterial;
    var m = new M({ map: texture(), roughness: 0.32, metalness: 0 });
    if (m.isMeshPhysicalMaterial) { m.clearcoat = 0.7; m.clearcoatRoughness = 0.25; }
    return m;
  }
  window.AMBall = { texture: texture, material: material, paint: paint };
})();
