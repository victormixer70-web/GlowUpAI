/* ARENA MIX grass: the real lawn texture (ambientCG Grass005) tiled over a pitch, while the painted
   pitch canvas (mowing stripes and lines) keeps its own UVs. AMGrass.material(pitchTex, w, h). */
(function () {
  var T = window.THREE, tex = null, wait = new Map();
  var MEAN = 'vec3(0.1326, 0.2317, 0.0254)', MEAN_LUM = '0.1957', TILE = 3.2;

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

  function material(pitchTex, w, h) {
    var t = load();
    if (!t) return new T.MeshStandardMaterial({ map: pitchTex, roughness: 0.95 });
    var rep = new T.Vector2(w / TILE, h / TILE);
    // each pitch gets its own clones so the repeat fits its size (images are shared)
    var c = t.color.clone(), n = t.normal.clone(), r = t.rough.clone();
    [[c, t.color], [n, t.normal], [r, t.rough]].forEach(function (x) {
      x[0].repeat.copy(rep);
      if (x[1].image) x[0].needsUpdate = true; else wait.get(x[1]).push(x[0]);
    });
    var m = new T.MeshStandardMaterial({ map: c, normalMap: n, normalScale: new T.Vector2(0.55, 0.55), roughness: 1, metalness: 0, envMapIntensity: 0.45 });
    r.dispose();
    m.onBeforeCompile = function (sh) {
      sh.uniforms.pitchMap = { value: pitchTex };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPitchUv = uv;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vPitchUv;\nuniform sampler2D pitchMap;')
        .replace('#include <map_fragment>', [
          'vec4 gC = mapTexelToLinear(texture2D(map, vUv));',
          'vec4 pC = mapTexelToLinear(texture2D(pitchMap, vPitchUv));',
          'float lr = dot(gC.rgb, vec3(0.2126, 0.7152, 0.0722)) / ' + MEAN_LUM + ';',
          'vec3 det = mix(vec3(lr), clamp(gC.rgb / ' + MEAN + ', 0.0, 3.0), 0.08);',
          // painted lines stay crisp white: the lawn detail only shows through faintly on them
          'float paint = smoothstep(0.35, 0.7, dot(pC.rgb, vec3(0.333)));',
          'diffuseColor.rgb *= pC.rgb * mix(vec3(1.0), det, 0.85 * (1.0 - 0.8 * paint));'
        ].join('\n'));
    };
    return m;
  }

  window.AMGrass = { load: load, material: material };
  load();
})();
