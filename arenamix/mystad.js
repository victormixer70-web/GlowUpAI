/* ARENA MIX: your own stadium. Its name (on the LED boards and the video screens), the colour of the seats and of
   the boards, how the grass is cut and the time of day. In a 1 VS 1 the match is played, by the toss of a coin, in
   your stadium or in your rival's. The AI rivals have stadiums of their own, always the same one for each name. */
(function () {
  var KEY = 'arenamix.mystad.v1';
  var COLORS = ['#22D3EE', '#FFC53D', '#FF5C5C', '#53D88E', '#A78BFA', '#FF5CC8', '#3B82F6', '#F97316', '#F4F4FA', '#111827'];
  var PATTERNS = [['rayas', 'Rayas'], ['anchas', 'Rayas anchas'], ['cuadros', 'Cuadros'], ['diagonal', 'Diagonal'], ['circulos', 'Círculos'], ['liso', 'Liso']];
  var GRASS = [['verde', 'Verde'], ['oscuro', 'Oscuro'], ['claro', 'Claro'], ['azulado', 'Invierno']];
  var TIMES = [['auto', 'Al azar'], ['dia', 'Día'], ['atardecer', 'Atardecer'], ['noche', 'Noche']];
  function me() { try { return window.AMOnline && window.AMOnline.myName ? window.AMOnline.myName() : 'Tú'; } catch (e) { return 'Tú'; } }
  // the seats: their original blue and red, the club's two colours (one stand row each) or one colour of the list
  var SEATS = [['orig', 'Originales'], ['club', 'Colores del club']];
  function def() { return { name: 'Estadio ' + me(), c1: '#22D3EE', c2: '#FFC53D', seat: 'orig', pitch: 'rayas', grass: 'verde', time: 'auto' }; }
  function clean(v) {
    var d = def(); v = v || {};
    var ok = function (k, list) { return list.some(function (x) { return x[0] === v[k]; }) ? v[k] : d[k]; };
    return {
      name: String(v.name || d.name).replace(/[<>]/g, '').slice(0, 22) || d.name,
      c1: /^#[0-9a-fA-F]{6}$/.test(v.c1 || '') ? v.c1 : d.c1, c2: /^#[0-9a-fA-F]{6}$/.test(v.c2 || '') ? v.c2 : d.c2,
      seat: v.seat === 'orig' || v.seat === 'club' || /^#[0-9a-fA-F]{6}$/.test(v.seat || '') ? v.seat : d.seat,
      pitch: ok('pitch', PATTERNS), grass: ok('grass', GRASS), time: ok('time', TIMES)
    };
  }
  function get() { try { return clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return def(); } }
  function set(v) { var c = clean(Object.assign(get(), v)); try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} return c; }
  // an AI rival's stadium: picked from its name, so the same rival always plays at home in the same place
  var AINAMES = ['Estadio del Puerto', 'La Caldera', 'El Fortín', 'Campo de la Ribera', 'Arena Norte', 'El Coliseo', 'La Bombonera Sur', 'Estadio Municipal', 'El Templo', 'La Olla'];
  function ai(seed) {
    var h = 7, s = String(seed || 'Rival');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var pick = function (list) { h = (h * 1103515245 + 12345) >>> 0; return list[h % list.length]; };
    return clean({ name: pick(AINAMES), c1: pick(COLORS), c2: pick(COLORS), pitch: pick(PATTERNS)[0], grass: pick(GRASS)[0], time: pick(TIMES)[0], seat: pick(['orig', 'club', 'club'].concat(COLORS)) });
  }
  /* The seats of the 3D stadium are two small strips of its texture (a blue one and an orange one, x 1738-1938,
     y 346-381 of the 2048 atlas). A few lines in the shader paint the coloured pixels of those strips in the chosen
     colours, keeping their light and shade; the grey frames between seats stay as they are.
     paintSeats(object3D, cfg[, U]) -> U (the uniforms, shared by every material it touched); setSeats(U, cfg) recolours live. */
  var SEAT_GLSL = [
    '#ifdef USE_MAP',
    'if (uSeatOn > 0.5 && vUv.x > 0.8486 && vUv.x < 0.9463 && vUv.y > 0.1680 && vUv.y < 0.1862) {',
    '  vec3 sc0 = diffuseColor.rgb; float smx = max(sc0.r, max(sc0.g, sc0.b)), smn = min(sc0.r, min(sc0.g, sc0.b));',
    '  if (smx - smn > 0.05) {',
    '    bool rowA = vUv.y < 0.1768; float sl = dot(sc0, vec3(0.2126, 0.7152, 0.0722)) / (rowA ? 0.192 : 0.232);',
    '    diffuseColor.rgb = (rowA ? uSeatA : uSeatB) * clamp(sl, 0.35, 1.7);',
    '  }',
    '}',
    '#endif'].join('\n');
  function seatCols(cfg) {
    var s = cfg && cfg.seat || 'orig';
    if (s === 'orig') return null;
    if (s === 'club') return [cfg.c1, cfg.c2];
    return [s, s];
  }
  function setSeats(U, cfg) {
    if (!U) return;
    var c = seatCols(cfg);
    U.uSeatOn.value = c ? 1 : 0;
    if (c) { U.uSeatA.value.set(c[0]).convertSRGBToLinear(); U.uSeatB.value.set(c[1]).convertSRGBToLinear(); }
  }
  function paintSeats(obj, cfg, U) {
    var T = window.THREE;
    if (!T || !obj) return U || null;
    U = U || { uSeatOn: { value: 0 }, uSeatA: { value: new T.Color() }, uSeatB: { value: new T.Color() } };
    obj.traverse(function (o) {
      if (!o.isMesh) return;
      [].concat(o.material).forEach(function (m) {
        if (!m || !m.map || (m.userData && m.userData.seatU)) return;
        m.userData.seatU = U;
        var prev = Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile') ? m.onBeforeCompile : null;
        m.onBeforeCompile = function (sh, r) {
          if (prev) prev.call(this, sh, r);
          sh.uniforms.uSeatOn = U.uSeatOn; sh.uniforms.uSeatA = U.uSeatA; sh.uniforms.uSeatB = U.uSeatB;
          sh.fragmentShader = 'uniform float uSeatOn;\nuniform vec3 uSeatA;\nuniform vec3 uSeatB;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + SEAT_GLSL);
        };
        var pk = Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') ? m.customProgramCacheKey : null;
        m.customProgramCacheKey = function () { return (pk ? pk.call(m) : '') + '|seats'; };
        m.needsUpdate = true;
      });
    });
    setSeats(U, cfg);
    return U;
  }
  window.AMStad = { get: get, set: set, ai: ai, clean: clean, paintSeats: paintSeats, setSeats: setSeats, SEATS: SEATS, COLORS: COLORS, PATTERNS: PATTERNS, GRASS: GRASS, TIMES: TIMES };
})();
