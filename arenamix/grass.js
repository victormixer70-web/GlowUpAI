/* ARENA MIX grass: the real lawn texture (ambientCG Grass005) over a painted pitch (mowing stripes and
   lines, its own UVs), made to read as a real lawn from the match cameras:
   - the lawn texture at two scales (fine blades and a coarse, turned layer) so it never looks tiled or flat
   - large soft patches of colour (lusher, drier) and wear where play is heaviest (goal mouths, centre spot)
   - the mowing stripes catch the light differently depending on where you look from, like real cut grass
   - a soft sheen at grazing angles and fine darkening between blades
   AMGrass.material(pitchTex, w, h) gives the ground; AMGrass.shells(pitchTex, w, h, n) gives n thin layers
   of blades on top (a short pile with real depth near the camera). */
(function () {
  var T = window.THREE, tex = null, wait = new Map();
  var MEAN = 'vec3(0.1326, 0.2317, 0.0254)', MEAN_LUM = '0.1957', TILE = 2.2;

  function load() {
    if (tex || !T) return tex;
    var L = new T.TextureLoader();
    var one = function (f, srgb) {
      var t = L.load('assets/grass/' + f, function () { (wait.get(t) || []).splice(0).forEach(function (x) { x.image = t.image; x.needsUpdate = true; }); });
      wait.set(t, []);
      t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8;
      if (srgb) t.encoding = T.sRGBEncoding;
      return t;
    };
    tex = { color: one('color.jpg', true), normal: one('normal.jpg'), rough: one('rough.jpg') };
    return tex;
  }
  function clone(src, rep) {
    var c = src.clone(); c.repeat.copy(rep);
    if (src.image) c.needsUpdate = true; else wait.get(src).push(c);
    return c;
  }

  // shared GLSL: hash noise, fbm, the pitch's look (w, h in metres)
  function glsl(w, h) {
    return [
      'float amH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float amN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(amH(i), amH(i + vec2(1.0, 0.0)), f.x), mix(amH(i + vec2(0.0, 1.0)), amH(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'float amF(vec2 p) { return amN(p) * 0.5 + amN(p * 2.07 + 17.3) * 0.3 + amN(p * 4.13 + 41.1) * 0.2; }',
      'const vec2 AM_SIZE = vec2(' + w.toFixed(2) + ', ' + h.toFixed(2) + ');',
      // colour of the lawn at a point (metres, pitch centred), from the painted pitch colour pC
      'vec3 amLawn(vec3 pC, vec2 m, float paint) {',
      '  float big = amF(m * 0.07), mid = amF(m * 0.32 + 5.0);',
      // lusher / drier patches
      '  float fine = amN(m * 3.3) * 0.6 + amN(m * 7.1 + 3.0) * 0.4;',
      '  vec3 c = pC * (0.8 + 0.4 * big) * (0.84 + 0.32 * mid) * (0.9 + 0.2 * fine);',
      // real turf: a touch less saturated and deeper than paint
      '  c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), 0.16 * (1.0 - paint)) * mix(0.9, 1.0, paint);',
      '  c *= mix(vec3(1.0), vec3(0.96, 1.0, 1.12), 0.5 * (1.0 - paint));',
      '  c = mix(c, c * vec3(1.18, 1.08, 0.72), smoothstep(0.6, 0.85, big) * 0.35 * (1.0 - paint));',
      // wear: goal mouths and the centre spot, a little sandy and thinner
      '  float gx = AM_SIZE.x * 0.5 - 7.0 - 2.0;',
      '  float wear = max(exp(-pow(length((m - vec2(-gx, 0.0)) / vec2(3.2, 4.2)), 2.0)), exp(-pow(length((m - vec2(gx, 0.0)) / vec2(3.2, 4.2)), 2.0)));',
      '  wear = max(wear, 0.6 * exp(-pow(length(m / 2.2), 2.0)));',
      '  wear *= 0.55 + 0.45 * amN(m * 1.7);',
      '  c = mix(c, vec3(0.20, 0.17, 0.08) * (0.8 + 0.4 * mid), wear * 0.5 * (1.0 - paint));',
      '  return c;',
      '}',
      // mowing stripes (3.75 m, the painted ones): light or dark depending on the direction you look at them
      'float amStripe(vec2 m) { float s = mod(floor((m.x + AM_SIZE.x * 0.5) / 3.75), 2.0); return s * 2.0 - 1.0; }'
    ].join('\n');
  }

  function material(pitchTex, w, h) {
    var t = load();
    if (!t) return new T.MeshStandardMaterial({ map: pitchTex, roughness: 0.95 });
    var c = clone(t.color, new T.Vector2(w / TILE, h / TILE)), n = clone(t.normal, new T.Vector2(w / TILE, h / TILE));
    var m = new T.MeshStandardMaterial({ map: c, normalMap: n, normalScale: new T.Vector2(0.9, 0.9), roughness: 0.92, metalness: 0, envMapIntensity: 0.5 });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.pitchMap = { value: pitchTex };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;\nvarying vec3 vAmW;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPitchUv = uv;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvAmW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;\nvarying vec3 vAmW;\nuniform sampler2D pitchMap;\n' + glsl(w, h))
        .replace('#include <map_fragment>', [
          'vec2 amM = (vPitchUv - 0.5) * AM_SIZE;',
          'vec4 pC = mapTexelToLinear(texture2D(pitchMap, vPitchUv));',
          'float paint = smoothstep(0.35, 0.7, dot(pC.rgb, vec3(0.333)));',
          // the lawn texture: fine, and coarse turned 37 degrees, as brightness detail
          'vec3 g1 = mapTexelToLinear(texture2D(map, vUv)).rgb;',
          'vec2 ruv = mat2(0.8, -0.6, 0.6, 0.8) * vUv * 0.29 + 0.37;',
          'vec3 g2 = mapTexelToLinear(texture2D(map, ruv)).rgb;',
          'float l1 = dot(g1, vec3(0.2126, 0.7152, 0.0722)) / ' + MEAN_LUM + ', l2 = dot(g2, vec3(0.2126, 0.7152, 0.0722)) / ' + MEAN_LUM + ';',
          'float det = clamp(mix(l1, l2, 0.45), 0.25, 2.2);',
          'det = mix(1.0, pow(det, 1.6), 1.0 - 0.85 * paint);',
          'vec3 hue = mix(vec3(1.0), clamp(g1 / ' + MEAN + ', 0.4, 2.0), 0.12 * (1.0 - paint));',
          'vec3 lawn = amLawn(pC.rgb, amM, paint);',
          // stripes that flip with the view: blades lean away (light) or towards you (dark)
          'vec3 vd = normalize(vAmW - cameraPosition);',
          'float st = amStripe(amM) * (0.5 + 0.5 * vd.x * sign(vd.x + 0.0001)) * sign(vd.x + 0.0001);',
          'lawn *= 1.0 + 0.14 * st * (1.0 - paint);',
          // a soft sheen at grazing angles
          'float graze = pow(1.0 - clamp(-vd.y, 0.0, 1.0), 3.0);',
          'lawn = mix(lawn, lawn * vec3(1.25, 1.3, 1.05) + vec3(0.01, 0.015, 0.0), graze * 0.35 * (1.0 - paint));',
          'diffuseColor.rgb *= lawn * det * hue;'
        ].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'amgrass2'; };
    return m;
  }

  /* blades: n thin layers just above the ground. Each layer keeps the points where a blade is still that
     tall (a per-blade height from a hash on a fine grid), coloured like the ground under it, darker at the
     root. They fade out with distance, where blades are smaller than a pixel. */
  function shells(pitchTex, w, h, n) {
    var g = new T.Group(), geo = new T.PlaneGeometry(w, h), HMAX = 0.045;
    for (var k = 1; k <= n; k++) {
      var f = k / n;
      var m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.4 });
      (function (f) {
        m.onBeforeCompile = function (sh) {
          sh.uniforms.pitchMap = { value: pitchTex }; sh.uniforms.uF = { value: f };
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;\nvarying vec3 vAmW;')
            .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPitchUv = uv;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvAmW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;\nvarying vec3 vAmW;\nuniform sampler2D pitchMap;\nuniform float uF;\n' + glsl(w, h))
            .replace('#include <map_fragment>', [
              'vec2 amM = (vPitchUv - 0.5) * AM_SIZE;',
              'float dcam = length(vAmW - cameraPosition);',
              'float fade = 1.0 - smoothstep(5.0, 18.0, dcam);',
              'if (fade <= 0.01) discard;',
              // blades scattered at random (a jittered, turned grid), each its own height, leaning a little
              'vec2 q = mat2(0.866, -0.5, 0.5, 0.866) * amM * 70.0;',
              'vec2 cell = floor(q);',
              'float best = 9.0, hgt = 0.0; vec2 id = cell;',
              'for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {',
              '  vec2 c2 = cell + vec2(float(i), float(j));',
              '  vec2 lean = (vec2(amH(c2 + 3.1), amH(c2 + 9.7)) - 0.5) * 0.9 * uF;',
              '  vec2 o = vec2(amH(c2), amH(c2 + 1.7)) + lean;',
              '  float d = length(q - c2 - o);',
              '  if (d < best) { best = d; id = c2; hgt = 0.3 + 0.7 * amH(c2 + 5.3); }',
              '}',
              'hgt *= 0.7 + 0.6 * amN(amM * 0.9);',
              'float keep = step(uF, hgt) * step(best, 0.42 * (1.0 - uF * 0.8));',
              'vec2 cellH = id;',
              'if (keep < 0.5) discard;',
              'vec4 pC = sRGBToLinear(texture2D(pitchMap, vPitchUv));',
              'float paint = smoothstep(0.35, 0.7, dot(pC.rgb, vec3(0.333)));',
              'vec3 c = amLawn(pC.rgb, amM, paint);',
              'vec3 vd = normalize(vAmW - cameraPosition);',
              'c *= 1.0 + 0.14 * amStripe(amM) * sign(vd.x + 0.0001) * (1.0 - paint);',
              // darker at the root, light at the tips, a few blades a shade off
              'c *= mix(0.55, 1.18, uF) * (0.85 + 0.3 * amH(cellH + 7.0));',
              'diffuseColor.rgb = c;',
              'diffuseColor.a = fade * (1.0 - uF * 0.35);'
            ].join('\n'));
        };
        m.customProgramCacheKey = function () { return 'amshell'; };
      })(f);
      var mesh = new T.Mesh(geo, m);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = f * HMAX; mesh.renderOrder = -1 + k * 0.01; mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  }

  window.AMGrass = { load: load, material: material, shells: shells };
  load();
})();
