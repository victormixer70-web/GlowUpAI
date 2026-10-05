/* ARENA MIX sky: Poly Haven "Orlando Stadium" HDRI. A JPG of it is the sky behind the stands and a
   small HDR version lights the scene (image-based light: soft daylight and reflections). */
(function () {
  var T = window.THREE, bg = null, hdr = null, hdrP = null;
  function load() {
    if (!T || bg) return;
    bg = new T.TextureLoader().load('assets/sky/stadium_bg.jpg');
    bg.encoding = T.sRGBEncoding;
    if (T.RGBELoader) hdrP = new Promise(function (res) {
      new T.RGBELoader().setDataType(T.UnsignedByteType).load('assets/sky/stadium_env.hdr', function (t) { hdr = t; res(t); }, null, function () { res(null); });
    });
  }
  // prefiltered environment for one renderer (each screen has its own WebGL context)
  function env(renderer) {
    load();
    if (!hdrP) return Promise.resolve(null);
    return hdrP.then(function (t) {
      if (!t) return null;
      var pm = new T.PMREMGenerator(renderer), e = pm.fromEquirectangular(t).texture;
      pm.dispose();
      return e;
    });
  }
  window.AMSky = { load: load, bg: function () { load(); return bg; }, env: env, fog: 0x8f99a6 };
  load();
})();
