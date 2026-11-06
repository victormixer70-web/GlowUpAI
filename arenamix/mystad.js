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
  function def() { return { name: 'Estadio ' + me(), c1: '#22D3EE', c2: '#FFC53D', pitch: 'rayas', grass: 'verde', time: 'auto' }; }
  function clean(v) {
    var d = def(); v = v || {};
    var ok = function (k, list) { return list.some(function (x) { return x[0] === v[k]; }) ? v[k] : d[k]; };
    return {
      name: String(v.name || d.name).replace(/[<>]/g, '').slice(0, 22) || d.name,
      c1: /^#[0-9a-fA-F]{6}$/.test(v.c1 || '') ? v.c1 : d.c1, c2: /^#[0-9a-fA-F]{6}$/.test(v.c2 || '') ? v.c2 : d.c2,
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
    return clean({ name: pick(AINAMES), c1: pick(COLORS), c2: pick(COLORS), pitch: pick(PATTERNS)[0], grass: pick(GRASS)[0], time: pick(TIMES)[0] });
  }
  window.AMStad = { get: get, set: set, ai: ai, clean: clean, COLORS: COLORS, PATTERNS: PATTERNS, GRASS: GRASS, TIMES: TIMES };
})();
