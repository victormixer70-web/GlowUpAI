/* ARENA MIX match ball: a modern design painted straight on the sphere (no pole stretching).
   Four panels around the vertices of a tetrahedron, each with a curved ring in cyan or orange,
   a navy three-blade star and a yellow spark in the middle; thin grey seams between panels.
   AMBall.material() gives a glossy material ready for SphereGeometry. */
(function () {
  var T = window.THREE, tex = null;
  var S3 = 1 / Math.sqrt(3);
  var V = [[S3, S3, S3], [S3, -S3, -S3], [-S3, S3, -S3], [-S3, -S3, S3]];
  var RING = [[0, 196, 240], [255, 98, 20], [0, 196, 240], [255, 98, 20]];
  var NAVY = [23, 23, 42], WHITE = [246, 248, 252], SEAM = [168, 176, 194], SPARK = [255, 197, 61];
  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function paint(W, H) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data;
    for (var j = 0; j < H; j++) {
      var th = (j + 0.5) / H * Math.PI, st = Math.sin(th), ct = Math.cos(th);
      for (var i = 0; i < W; i++) {
        // three.js SphereGeometry: u = phi / 2pi, x = -cos(phi) sin(theta), y = cos(theta), z = sin(phi) sin(theta)
        var ph = (i + 0.5) / W * Math.PI * 2, px = -Math.cos(ph) * st, py = ct, pz = Math.sin(ph) * st;
        // nearest and second nearest panel centre
        var best = -2, second = -2, k = 0;
        for (var n = 0; n < 4; n++) {
          var dot = px * V[n][0] + py * V[n][1] + pz * V[n][2];
          if (dot > best) { second = best; best = dot; k = n; } else if (dot > second) second = dot;
        }
        var a = Math.acos(Math.min(1, best));
        // local frame around the panel centre for the star's angle
        var v = V[k], ux = -v[1], uy = v[0], uz = 0, ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
        var wx = v[1] * uz - v[2] * uy, wy = v[2] * ux - v[0] * uz, wz = v[0] * uy - v[1] * ux;
        var ang = Math.atan2(px * wx + py * wy + pz * wz, px * ux + py * uy + pz * uz) + k * 0.7;
        var col = WHITE.slice();
        var mix = function (c2, t) { for (var q = 0; q < 3; q++) col[q] += (c2[q] - col[q]) * t; };
        // curved ring, swept with the angle so it reads as a swoosh
        var r0 = 0.6 + 0.09 * Math.sin(ang * 3), ring = smooth(r0 - 0.17, r0 - 0.14, a) * (1 - smooth(r0 + 0.1, r0 + 0.13, a));
        var edge = smooth(r0 - 0.2, r0 - 0.17, a) * (1 - smooth(r0 + 0.13, r0 + 0.16, a)) - ring;
        mix(NAVY, Math.max(0, edge));
        mix(RING[k], ring);
        // thin inner ring in the other colour
        var r1 = r0 - 0.26, thin = smooth(r1 - 0.025, r1 - 0.01, a) * (1 - smooth(r1 + 0.01, r1 + 0.025, a));
        mix(RING[(k + 1) % 4], thin);
        // three-blade star in the middle
        var blade = Math.pow(Math.abs(Math.cos(ang * 1.5)), 5), sr = 0.1 + 0.24 * blade;
        mix(NAVY, 1 - smooth(sr - 0.02, sr + 0.01, a));
        mix(SPARK, 1 - smooth(0.05, 0.07, a));
        // panel seams (where two panels meet)
        var seam = 1 - smooth(0.004, 0.02, best - second);
        mix(SEAM, seam * 0.85);
        var o = (j * W + i) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function texture() {
    if (!tex && T) {
      tex = new T.CanvasTexture(paint(1024, 512));
      tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
    }
    return tex;
  }
  function material() {
    var M = T.MeshPhysicalMaterial || T.MeshStandardMaterial;
    var m = new M({ map: texture(), roughness: 0.32, metalness: 0 });
    if (m.isMeshPhysicalMaterial) { m.clearcoat = 0.7; m.clearcoatRoughness = 0.25; }
    return m;
  }
  window.AMBall = { texture: texture, material: material };
})();
