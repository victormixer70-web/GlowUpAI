/* ARENA MIX progress: experience and level, coins, the weekly rewards track, daily missions and the chests.
   Everything is kept on the phone (localStorage). The match screens call AMProgress.recordMatch() at the
   final whistle and get back what changed, which the results screen (results.js) plays back. */
(function () {
  // real-money purchases (season pass premium, BOB packs): off until the store's billing is connected
  var PAYMENTS = false;
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- coins ---------- */
  function coins() { return (get('arenamix.wallet.v1', null) || { coins: 2450 }).coins; }
  // every change to the wallet is announced, so the screen can fly coins to the counter
  function told(kind, n, total) { try { if (n) window.dispatchEvent(new CustomEvent('am:wallet', { detail: { kind: kind, delta: n, total: total } })); } catch (e) {} }
  function addCoins(n) { var w = get('arenamix.wallet.v1', null) || { coins: 2450 }; w.coins = Math.max(0, w.coins + n); put('arenamix.wallet.v1', w); told('vcd', n, w.coins); return w.coins; }

  /* ---------- BOB: the gems (premium currency). Earned on level ups, daily missions and the season pass;
     spent on boosts in the Tienda ---------- */
  function gems() { return (get('arenamix.gems.v1', null) || { n: 20 }).n; }
  function addGems(n) { var g = get('arenamix.gems.v1', null) || { n: 20 }; g.n = Math.max(0, g.n + n); put('arenamix.gems.v1', g); told('bob', n, g.n); return g.n; }
  function spendGems(n) { if (gems() < n) return false; addGems(-n); return true; }


  /* ---------- AI difficulty (Informal and Entrenar; Competitivo follows your MMR) ---------- */
  var AI = { facil: 0.15, normal: 0.5, dificil: 0.85 };
  function aiPref() { var v = get('arenamix.ai.v1', 'normal'); return AI[v] != null ? v : 'normal'; }
  function setAiPref(v) { if (AI[v] != null) put('arenamix.ai.v1', v); }
  function aiLevel(mmr) { return mmr == null ? AI[aiPref()] : Math.max(0.3, Math.min(1, 0.4 + mmr / 3000)); }

  /* ---------- goal celebrations, bought with BOB: your player does the one you equip after scoring ---------- */
  var CELEBS = [
    { id: 'clasica', name: 'Brazos al cielo', desc: 'La de siempre: corre al córner con los brazos arriba', price: 0, color: '#22D3EE' },
    { id: 'rodillas', name: 'Rodillazo', desc: 'Se tira de rodillas por el césped con los brazos abiertos', price: 30, color: '#FFC53D' },
    { id: 'siu', name: '¡Siuuu!', desc: 'Carrera, salto con giro y aterrizaje con los brazos abajo', price: 45, color: '#FF5C8A' },
    { id: 'avion', name: 'El avión', desc: 'Vuela en zigzag con los brazos como alas', price: 30, color: '#53D88E' },
    { id: 'baile', name: 'El baile', desc: 'Un bailecito de lado a lado para la grada', price: 40, color: '#A78BFA' },
    { id: 'silencio', name: 'Silencio', desc: 'Dedo en los labios mirando a la afición rival', price: 35, color: '#FF8A3D' },
    { id: 'robot', name: 'El robot', desc: 'Baile a golpes, brazos rígidos y giros mecánicos', price: 40, color: '#3EA6FF' },
    { id: 'mortal', name: 'Mortal atrás', desc: 'Carrerilla y voltereta hacia atrás en el aire', price: 60, color: '#FF5A1F' },
    { id: 'corazon', name: 'Corazón', desc: 'Las manos en forma de corazón para la grada', price: 30, color: '#FF5C8A' },
    { id: 'saludo', name: 'El saludo', desc: 'Firme y saludo militar a la afición', price: 30, color: '#53D88E' }
  ];
  /* ---------- shot trails, bought with BOB: your hard shots leave a coloured trail in the match ---------- */
  var TRAILS = [
    { id: 'neon', name: 'Estela Neón', desc: 'Tus chutes fuertes dejan un rastro cian eléctrico', price: 35, color: '#22D3EE', cols: [[0.13, 0.83, 0.93], [0.6, 0.97, 1]] },
    { id: 'toxica', name: 'Estela Tóxica', desc: 'Un rastro verde ácido que brilla en la noche', price: 40, color: '#7CFF4F', cols: [[0.49, 1, 0.31], [0.85, 1, 0.3]] },
    { id: 'galaxia', name: 'Estela Galaxia', desc: 'Polvo de estrellas morado y blanco', price: 50, color: '#9B6BFF', cols: [[0.61, 0.42, 1], [1, 1, 1], [1, 0.36, 0.78]] },
    { id: 'arcoiris', name: 'Estela Arcoíris', desc: 'Todos los colores detrás de tu balón', price: 60, color: '#FF5CC8', cols: [[1, 0.3, 0.3], [1, 0.6, 0.15], [1, 0.9, 0.2], [0.3, 0.9, 0.4], [0.2, 0.7, 1], [0.6, 0.4, 1]] }
  ];
  function trailState() { var c = get('arenamix.trails.v1', null) || {}; c.own = c.own || []; c.on = c.on || null; return c; }
  function buyTrail(id) {
    var c = trailState(), x = TRAILS.find(function (k) { return k.id === id; });
    if (!x || c.own.indexOf(id) >= 0 || !spendGems(x.price)) return false;
    c.own.push(id); c.on = id; put('arenamix.trails.v1', c); return true;
  }
  // equip one you own (the same one again takes it off)
  function equipTrail(id) { var c = trailState(); if (c.own.indexOf(id) < 0) return false; c.on = c.on === id ? null : id; put('arenamix.trails.v1', c); return true; }
  function trailOn() { var c = trailState(), x = TRAILS.find(function (k) { return k.id === c.on; }); return x ? x.cols : null; }
  function celebState() { var c = get('arenamix.celebs.v1', null) || {}; c.own = c.own || ['clasica']; c.on = c.on || 'clasica'; return c; }
  function buyCeleb(id) {
    var c = celebState(), x = CELEBS.find(function (k) { return k.id === id; });
    if (!x || c.own.indexOf(id) >= 0 || !spendGems(x.price)) return false;
    c.own.push(id); c.on = id; put('arenamix.celebs.v1', c); return true;
  }
  function equipCeleb(id) { var c = celebState(); if (c.own.indexOf(id) < 0) return false; c.on = id; put('arenamix.celebs.v1', c); return true; }

  /* ---------- boosts, bought with BOB: each lasts some matches (the shield, one defeat) ---------- */
  var BOOSTS = [
    { id: 'xp2', name: 'Doble XP', desc: 'Experiencia x2 en tus próximos 3 partidos', uses: 3, price: 25, color: '#22D3EE', icon: 'xp' },
    { id: 'vcd2', name: 'Doble VCD', desc: 'VCD x2 al terminar tus próximos 3 partidos', uses: 3, price: 25, color: '#FFC53D', icon: 'vcd' },
    { id: 'pass2', name: 'Pase turbo', desc: 'El pase de temporada sube el doble durante 3 partidos', uses: 3, price: 35, color: '#FF8A3D', icon: 'pass' },
    { id: 'shield', name: 'Escudo de rango', desc: 'Tu próxima derrota competitiva no te quita MMR', uses: 1, price: 40, color: '#A78BFA', icon: 'shield' },
    { id: 'chest', name: 'Cofre exprés', desc: 'Abre ahora un cofre raro: un accesorio seguro', uses: 0, price: 50, color: '#53D88E', icon: 'chest' }
  ];
  function boosts() { return get('arenamix.boosts.v1', null) || {}; }
  function boostLeft(id) { return boosts()[id] || 0; }
  function buyBoost(id) {
    var b = BOOSTS.find(function (x) { return x.id === id; });
    if (!b || !spendGems(b.price)) return null;
    if (id === 'chest') { var r = rollChest('rare'); r.milestone = { name: 'Cofre exprés', prize: 'chest', chest: 'rare' }; return r; }
    var B = boosts(); B[id] = (B[id] || 0) + b.uses; put('arenamix.boosts.v1', B);
    return { ok: true, left: B[id] };
  }
  // spend one use of a boost if there is one
  function useBoost(id) { var B = boosts(); if (!B[id]) return false; B[id]--; put('arenamix.boosts.v1', B); return true; }

  /* ---------- experience: level n needs 150 + 50·n XP to reach n + 1 ---------- */
  function need(n) { return 150 + 50 * n; }
  function levelOf(xp) {
    var n = 1, left = xp;
    while (left >= need(n)) { left -= need(n); n++; }
    return { level: n, into: left, need: need(n), pct: left / need(n) };
  }
  function xp() { return (get('arenamix.xp.v1', null) || { xp: 0 }).xp; }
  function addXp(n) { var v = xp() + n; put('arenamix.xp.v1', { xp: v }); return v; }

  /* ---------- the weekly track: wins this week (Monday to Sunday) unlock guaranteed prizes ---------- */
  var MILESTONES = [
    { id: 'w1', at: 1, prize: 'coins', amount: 100, name: '100 VCD', sub: 'Moneda del juego', icon: 'coins:4' },
    { id: 'w2', at: 2, prize: 'chest', chest: 'common', name: 'Cofre común', sub: 'VCD o un accesorio', icon: 'chest:common' },
    { id: 'w5', at: 5, prize: 'chest', chest: 'rare', name: 'Cofre raro', sub: 'Accesorio de equipo', icon: 'chest:rare' },
    { id: 'w7', at: 7, prize: 'coins', amount: 300, name: '300 VCD', sub: 'Moneda del juego', icon: 'coins:14' },
    { id: 'w10', at: 10, prize: 'items', items: ['s4', 'h7'], name: 'Brote + Botas Carmesí', sub: 'Gran premio semanal', icon: 'boots:#E5484D' }
  ];
  function weekId(t) { var d = new Date(t || Date.now()); var day = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day); return d.getTime(); }
  function weekly() {
    var W = get('arenamix.weekly.v1', null), wk = weekId();
    if (!W || W.week !== wk) { W = { week: wk, wins: 0, claimed: [] }; put('arenamix.weekly.v1', W); }
    var ends = wk + 7 * 864e5;
    W.daysLeft = Math.max(1, Math.ceil((ends - Date.now()) / 864e5));
    W.milestones = MILESTONES.map(function (m) { return Object.assign({}, m, { reached: W.wins >= m.at, claimed: W.claimed.indexOf(m.id) >= 0 }); });
    return W;
  }
  function saveWeekly(W) { put('arenamix.weekly.v1', { week: W.week, wins: W.wins, claimed: W.claimed }); }

  /* ---------- items that chests can give (the Taquilla's accessories you can't buy for free) ---------- */
  var ITEMS = {
    h2: { cat: 'cabeza', kind: 'top', name: 'Sombrero de copa' }, h3: { cat: 'cabeza', kind: 'chef', name: 'Gorro de chef' },
    h5: { cat: 'cabeza', kind: 'prop', name: 'Gorro hélice' }, h8: { cat: 'cabeza', kind: 'phones', name: 'Auriculares' },
    h7: { cat: 'cabeza', kind: 'sprout', name: 'Brote' },
    f2: { cat: 'cara', kind: 'round', name: 'Gafas redondas' }, f3: { cat: 'cara', kind: 'star', name: 'Gafas estrella' }, f5: { cat: 'cara', kind: 'ski', name: 'Máscara de esquí' },
    s3: { cat: 'calzado', color: '#FF8A3D', name: 'Botas Naranja' }, s5: { cat: 'calzado', color: '#3EA6FF', name: 'Botas Celeste' }, s4: { cat: 'calzado', color: '#E5484D', name: 'Botas Carmesí' },
    // the season pass's own (Taquilla shows them as pass rewards)
    h6: { cat: 'cabeza', kind: 'crown', name: 'Corona' }, f6: { cat: 'cara', kind: 'stache', name: 'Bigote' }, s6: { cat: 'calzado', color: '#FFC53D', name: 'Botas Oro' },
    h10: { cat: 'cabeza', kind: 'cap', color: '#FF8A3D', name: 'Gorra Temporada' }, h11: { cat: 'cabeza', kind: 'band', color: '#FFC53D', name: 'Cinta Dorada' },
    s7: { cat: 'calzado', color: '#9B6BFF', name: 'Botas Galaxia' }, s8: { cat: 'calzado', color: '#FF5A1F', name: 'Botas Lava' },
    'futbol-5-0': { cat: 'kit', name: 'Equipación Temporada Oro', kit: ['#141414', '#FFC53D', 'stripes'] },
    'futbol-5-1': { cat: 'kit', name: 'Equipación Temporada Neón', kit: ['#0B0B14', '#22D3EE', 'diag'] },
    'futbol-5-2': { cat: 'kit', name: 'Equipación Temporada Lava', kit: ['#FF5A1F', '#2A0A0A', 'halves'] },
    'futbol-5-3': { cat: 'kit', name: 'Equipación Temporada Hielo', kit: ['#E8F7FF', '#3EA6FF', 'pin'] }
  };
  // a flat drawing of a shirt for the kits (data URL)
  function shirtPic(k) {
    var p = k[0], s = k[1], pat = k[2], body = 'M38 14 L50 22 L62 14 L84 24 L94 46 L80 52 L76 44 L76 92 L24 92 L24 44 L20 52 L6 46 L16 24 Z';
    var deco = pat === 'stripes' ? '<path d="M34 10h8v90h-8zM50 10h8v90h-8zM66 10h8v90h-8z" fill="' + s + '"/>' :
      pat === 'diag' ? '<path d="M0 70 L100 10 L100 26 L0 86 Z" fill="' + s + '"/>' :
      pat === 'halves' ? '<rect x="50" y="0" width="50" height="100" fill="' + s + '"/>' :
      pat === 'pin' ? '<path d="M30 0v100M42 0v100M54 0v100M66 0v100" stroke="' + s + '" stroke-width="2"/>' : '';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="c"><path d="' + body + '"/></clipPath>' +
      '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>' +
      '<g clip-path="url(#c)"><rect width="100" height="100" fill="' + p + '"/>' + deco + '<rect width="100" height="100" fill="url(#g)"/></g>' +
      '<path d="' + body + '" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M38 14 Q50 30 62 14" fill="none" stroke="' + s + '" stroke-width="4"/><circle cx="64" cy="36" r="4" fill="' + s + '" stroke="' + p + '" stroke-width="1"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function locker() { return get('arenamix.locker.v1', null) || { equip: null, bought: [] }; }
  function owns(id) { return (locker().bought || []).indexOf(id) >= 0; }
  function unlock(id) { var L = locker(); L.bought = L.bought || []; if (L.bought.indexOf(id) < 0) L.bought.push(id); put('arenamix.locker.v1', L); }
  function itemPic(id) {
    var it = ITEMS[id], G = window.AMGear;
    if (it && it.cat === 'kit') return shirtPic(it.kit);
    if (!it || !G) return '';
    return G.thumb(it.cat, { id: id, kind: it.kind, color: it.color });
  }
  // what is inside a chest, decided when you open it
  function rollChest(kind) {
    var pool = ['h2', 'h3', 'h5', 'h8', 'f2', 'f3', 'f5', 's3', 's5'].filter(function (id) { return !owns(id); });
    var itemChance = kind === 'common' ? 0.35 : 1;
    if (pool.length && Math.random() < itemChance) {
      var id = pool[Math.floor(Math.random() * pool.length)];
      unlock(id);
      var bonus = kind === 'rare' ? 120 : kind === 'epic' ? 300 : kind === 'legend' ? 700 : 0;
      if (bonus) addCoins(bonus);
      return { items: [{ id: id, name: ITEMS[id].name, pic: itemPic(id) }], coins: bonus };
    }
    var c = kind === 'rare' ? 500 : kind === 'epic' ? 900 : kind === 'legend' ? 1600 : 150 + Math.round(Math.random() * 10) * 10;
    addCoins(c);
    return { items: [], coins: c };
  }
  // claim a reached milestone of the weekly track: what you got
  function claim(id) {
    var W = weekly(), m = W.milestones.find(function (x) { return x.id === id; });
    if (!m || !m.reached || m.claimed) return null;
    var out;
    if (m.prize === 'coins') { addCoins(m.amount); out = { coins: m.amount, items: [] }; }
    else if (m.prize === 'chest') out = rollChest(m.chest);
    else { m.items.forEach(unlock); out = { coins: 0, items: m.items.map(function (i) { return { id: i, name: ITEMS[i].name, pic: itemPic(i) }; }) }; }
    W.claimed.push(id); saveWeekly(W);
    out.milestone = m;
    return out;
  }

  /* ---------- daily missions: three a day, the same for everyone on that day ---------- */
  var POOL = [
    { id: 'play2', text: 'Juega 2 partidos', key: 'played', n: 2, coins: 60, xp: 40 },
    { id: 'play3', text: 'Juega 3 partidos', key: 'played', n: 3, coins: 80, xp: 60 },
    { id: 'win1', text: 'Gana 1 partido', key: 'won', n: 1, coins: 80, xp: 60 },
    { id: 'win2', text: 'Gana 2 partidos', key: 'won', n: 2, coins: 120, xp: 80 },
    { id: 'goal3', text: 'Marca 3 goles', key: 'goals', n: 3, coins: 80, xp: 60 },
    { id: 'goal5', text: 'Marca 5 goles', key: 'goals', n: 5, coins: 120, xp: 80 },
    { id: 'shot6', text: 'Chuta 6 veces', key: 'shots', n: 6, coins: 50, xp: 40 },
    { id: 'pass8', text: 'Da 8 pases', key: 'passes', n: 8, coins: 60, xp: 40 },
    { id: 'skill3', text: 'Haz 3 regates', key: 'skills', n: 3, coins: 60, xp: 50 },
    { id: 'tack2', text: 'Roba 2 balones', key: 'tackles', n: 2, coins: 70, xp: 50 },
    { id: 'clean1', text: 'Deja la portería a cero', key: 'clean', n: 1, coins: 90, xp: 60 }
  ];
  function dayId(t) { var d = new Date(t || Date.now()); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function missions() {
    var M = get('arenamix.missions.v1', null), day = dayId();
    if (!M || M.day !== day) {
      // pick three different kinds of mission, from the date
      var seed = day % 9973, picked = [], used = {};
      for (var k = 0; picked.length < 3 && k < 50; k++) {
        seed = (seed * 7919 + 13) % 104729;
        var m = POOL[seed % POOL.length];
        if (!used[m.key]) { used[m.key] = 1; picked.push({ id: m.id, have: 0, claimed: false }); }
      }
      M = { day: day, list: picked };
      put('arenamix.missions.v1', M);
    }
    var end = new Date(); end.setHours(24, 0, 0, 0);
    return {
      day: M.day, hoursLeft: Math.max(1, Math.ceil((end - Date.now()) / 36e5)),
      list: M.list.map(function (x) { var p = POOL.find(function (m) { return m.id === x.id; }); return Object.assign({}, p, { have: Math.min(p.n, x.have), done: x.have >= p.n, claimed: x.claimed }); })
    };
  }
  function claimMission(id) {
    var M = get('arenamix.missions.v1', null);
    if (!M) return null;
    var x = M.list.find(function (m) { return m.id === id; }), p = POOL.find(function (m) { return m.id === id; });
    if (!x || !p || x.claimed || x.have < p.n) return null;
    x.claimed = true; put('arenamix.missions.v1', M);
    addCoins(p.coins); var before = levelOf(xp()); var after = levelOf(addXp(p.xp)); addPassXp(p.xp);
    if (after.level > before.level) addGems(2 * (after.level - before.level));
    return { coins: p.coins, gems: 0, xp: p.xp, levelUp: after.level > before.level ? after.level : 0 };
  }

  /* ---------- the season pass: 30 levels, a free row for everyone and a premium row for pass holders ----------
     Seasons last six weeks from Monday 5 October 2026. Pass XP is earned with the same experience as your level
     (matches and missions); every level needs 300. Premium is bought once per season (payment still to wire up). */
  var SEASON0 = new Date(2026, 9, 5).getTime(), SEASON_DAYS = 42, PASS_XP = 300;
  var C = function (n) { return { t: 'coins', n: n }; }, B = function (n) { return { t: 'gems', n: n }; }, X = function (k) { return { t: 'chest', k: k }; }, I = function (id) { return { t: 'item', id: id }; };
  var CE = function (id) { return { t: 'celeb', id: id }; }, TL = function (id) { return { t: 'trail', id: id }; };
  var FREE = [C(100), X('common'), C(150), X('common'), I('h11'), B(3), X('common'), C(200), X('rare'), I('s8'),
    C(200), TL('neon'), B(5), X('rare'), I('futbol-5-3'), C(250), CE('corazon'), C(300), X('rare'), I('h5'),
    B(5), X('common'), C(350), X('rare'), C(400), X('epic'), B(8), X('rare'), C(500), X('legend')];
  var PREM = [I('h10'), B(5), X('rare'), I('f6'), C(300), I('futbol-5-1'), X('rare'), B(8), I('s7'), X('epic'),
    C(400), X('rare'), B(8), I('futbol-5-2'), X('epic'), C(500), X('rare'), I('s6'), B(10), TL('galaxia'),
    C(600), X('rare'), B(10), X('epic'), I('h6'), CE('mortal'), X('epic'), C(800), X('legend'), I('futbol-5-0')];
  var CHEST_NAME = { common: 'Cofre común', rare: 'Cofre raro', epic: 'Cofre épico', legend: 'Cofre legendario' };
  function season(t) {
    var n = Math.max(0, Math.floor(((t || Date.now()) - SEASON0) / (SEASON_DAYS * 864e5)));
    var start = SEASON0 + n * SEASON_DAYS * 864e5, end = start + SEASON_DAYS * 864e5;
    return { n: n + 1, start: start, end: end, daysLeft: Math.max(1, Math.ceil((end - Date.now()) / 864e5)) };
  }
  function passState() {
    var se = season(), P = get('arenamix.pass.v1', null);
    if (!P || P.season !== se.n) { P = { season: se.n, xp: 0, premium: false, free: [], prem: [] }; put('arenamix.pass.v1', P); }
    return P;
  }
  function describe(r) {
    if (r.t === 'coins') return { name: r.n + ' VCD', icon: 'coins:' + (r.n >= 500 ? 16 : r.n >= 300 ? 12 : r.n >= 200 ? 8 : 5), rare: 0 };
    if (r.t === 'gems') return { name: r.n + ' BOB', icon: 'gems:' + (r.n >= 40 ? 3 : r.n >= 20 ? 2 : 1), rare: r.n >= 40 ? 2 : 1 };
    if (r.t === 'chest') return { name: CHEST_NAME[r.k], icon: 'chest:' + r.k, rare: { common: 0, rare: 1, epic: 2, legend: 3 }[r.k] };
    if (r.t === 'celeb') { var ce = CELEBS.find(function (k) { return k.id === r.id; }) || {}; return { name: 'Celebración: ' + ce.name, icon: 'celeb:' + ce.color, rare: 2 }; }
    if (r.t === 'trail') { var tl = TRAILS.find(function (k) { return k.id === r.id; }) || {}; return { name: tl.name, icon: 'trail:' + tl.color, rare: 2 }; }
    var it = ITEMS[r.id] || {};
    return { name: it.name, item: r.id, cat: it.cat, rare: it.cat === 'kit' ? 3 : 2 };
  }
  function pass() {
    var P = passState(), se = season(), level = Math.min(30, Math.floor(P.xp / PASS_XP));
    var row = function (list, key, open) {
      return list.map(function (r, i) {
        var d = describe(r), lv = i + 1, got = P[key].indexOf(lv) >= 0;
        var has = r.t === 'item' ? owns(r.id) : r.t === 'celeb' ? celebState().own.indexOf(r.id) >= 0 : r.t === 'trail' ? trailState().own.indexOf(r.id) >= 0 : false;
        return Object.assign(d, { lv: lv, reward: r, reached: level >= lv, open: open, claimed: got, ready: open && level >= lv && !got, owned: has && !got });
      });
    };
    var free = row(FREE, 'free', true), prem = row(PREM, 'prem', P.premium);
    return {
      season: se.n, daysLeft: se.daysLeft, xp: P.xp, level: level, into: level >= 30 ? PASS_XP : P.xp - level * PASS_XP, need: PASS_XP,
      premium: P.premium, free: free, prem: prem,
      ready: free.concat(prem).filter(function (x) { return x.ready; }).length,
      price: PAYMENTS ? '4,99 €' : 'PRONTO'
    };
  }
  function addPassXp(n) { var P = passState(), lv0 = Math.min(30, Math.floor(P.xp / PASS_XP)); P.xp += n; put('arenamix.pass.v1', P); return { before: lv0, after: Math.min(30, Math.floor(P.xp / PASS_XP)) }; }
  // give one pass reward; an item you already own turns into VCD
  function grantReward(r) {
    if (r.t === 'coins') { addCoins(r.n); return { coins: r.n, items: [] }; }
    if (r.t === 'gems') { addGems(r.n); return { coins: 0, gems: r.n, items: [] }; }
    if (r.t === 'chest') return rollChest(r.k);
    if (r.t === 'celeb' || r.t === 'trail') {
      var key = r.t === 'celeb' ? 'arenamix.celebs.v1' : 'arenamix.trails.v1', st = r.t === 'celeb' ? celebState() : trailState();
      if (st.own.indexOf(r.id) >= 0) { addCoins(250); return { coins: 250, items: [] }; }
      st.own.push(r.id); st.on = r.id; put(key, st);
      return { coins: 0, items: [] };
    }
    if (owns(r.id)) { addCoins(250); return { coins: 250, items: [] }; }
    unlock(r.id);
    return { coins: 0, items: [{ id: r.id, name: ITEMS[r.id].name, pic: itemPic(r.id) }] };
  }
  function claimPass(track, lv) {
    var P = passState(), level = Math.min(30, Math.floor(P.xp / PASS_XP)), key = track === 'prem' ? 'prem' : 'free';
    if (lv > level || P[key].indexOf(lv) >= 0 || (key === 'prem' && !P.premium)) return null;
    var r = (key === 'prem' ? PREM : FREE)[lv - 1], d = describe(r);
    P[key].push(lv); put('arenamix.pass.v1', P);
    var out = grantReward(r);
    out.milestone = r.t === 'chest' ? { name: d.name, prize: 'chest', chest: r.k } : { name: d.name, prize: r.t, icon: d.icon, pic: r.t === 'item' ? itemPic(r.id) : '' };
    return out;
  }
  // everything ready at once (no chest animation: a summary of what came out)
  function claimAllPass() {
    var S = pass(), tot = { coins: 0, items: [], count: 0 };
    S.free.concat(S.prem).forEach(function (x) {
      if (!x.ready) return;
      var r = claimPass(x.open && S.prem.indexOf(x) >= 0 ? 'prem' : 'free', x.lv);
      if (!r) return;
      tot.coins += r.coins || 0; tot.gems = (tot.gems || 0) + (r.gems || 0); tot.items = tot.items.concat(r.items || []); tot.count++;
    });
    tot.milestone = { name: tot.count + (tot.count === 1 ? ' premio del pase' : ' premios del pase'), prize: 'coins', icon: 'chest:legend:open' };
    return tot;
  }
  /* The premium purchase. There is no payment gateway yet (Google Play Billing / Stripe need a server), so this
     unlocks it on this phone only; the screen says so. */
  function buyPremium() { if (!PAYMENTS) return false; var P = passState(); P.premium = true; put('arenamix.pass.v1', P); return true; }

  /* ---------- the final whistle ---------- */
  // info: { home, away, kind: 'team'|'duel'|'mg', stats: { goals, shots, passes, skills, tackles } }
  function recordMatch(info) {
    var pen = info.pen && info.home === info.away ? info.pen : null;
    var st = info.stats || {}, won = info.home > info.away || !!(pen && pen[0] > pen[1]), lost = info.home < info.away || !!(pen && pen[0] < pen[1]), kind = info.kind || 'team';
    var goals = st.goals != null ? st.goals : (kind === 'team' ? 0 : info.home || 0);
    // experience
    var lines = [{ label: 'Partido jugado', xp: 50 }];
    if (won) lines.push({ label: pen ? 'Victoria en los penaltis' : 'Victoria', xp: pen ? 45 : 60 }); else if (!lost) lines.push({ label: 'Empate', xp: 25 }); else if (pen) lines.push({ label: 'Empate (penaltis perdidos)', xp: 20 });
    if (goals) lines.push({ label: goals === 1 ? '1 gol tuyo' : goals + ' goles tuyos', xp: goals * 15 });
    if (st.tackles) lines.push({ label: st.tackles + (st.tackles === 1 ? ' robo' : ' robos'), xp: st.tackles * 8 });
    if (kind === 'team' && !info.away) lines.push({ label: 'Portería a cero', xp: 20 });
    var gain = lines.reduce(function (a, l) { return a + l.xp; }, 0), used = [];
    // boosts from the Tienda
    if (useBoost('xp2')) { lines.push({ label: 'Doble XP', xp: gain }); gain *= 2; used.push('Doble XP'); }
    var passGain = gain;
    if (useBoost('pass2')) { passGain *= 2; used.push('Pase turbo'); }
    var x0 = xp(), before = levelOf(x0), after = levelOf(addXp(gain)), pv = addPassXp(passGain), ps = pass();
    // coins
    var coinsGain = won ? 40 : lost ? 10 : 20, levelBonus = 0;
    if (useBoost('vcd2')) { coinsGain *= 2; used.push('Doble VCD'); }
    for (var lv = before.level + 1; lv <= after.level; lv++) levelBonus += 100;
    var gemsGain = 2 * (after.level - before.level);
    if (gemsGain) addGems(gemsGain);
    var c0 = coins(); addCoins(coinsGain + levelBonus);
    // the weekly track
    var W = weekly(), w0 = W.wins;
    if (won) { W.wins++; saveWeekly(W); }
    var W2 = weekly();
    // the career tally on the back of the player card (Perfil)
    var C = get('arenamix.career.v1', { played: 0, won: 0, goals: 0, streak: 0, best: 0 });
    C.played++; C.goals += goals || 0;
    C.passes = (C.passes || 0) + (st.passes || 0); C.skills = (C.skills || 0) + (st.skills || 0); C.tackles = (C.tackles || 0) + (st.tackles || 0);
    C.topGoals = Math.max(C.topGoals || 0, goals || 0); if ((goals || 0) >= 3) C.hats = (C.hats || 0) + 1;
    if (won) { C.won++; C.streak++; C.best = Math.max(C.best, C.streak); } else C.streak = 0;
    put('arenamix.career.v1', C);
    // daily missions
    var M = get('arenamix.missions.v1', null); missions(); M = get('arenamix.missions.v1', null);
    var add = { played: 1, won: won ? 1 : 0, goals: goals, shots: st.shots || 0, passes: st.passes || 0, skills: st.skills || 0, tackles: st.tackles || 0, clean: kind === 'team' && !info.away ? 1 : 0 };
    var mBefore = missions().list;
    M.list.forEach(function (x) { var p = POOL.find(function (m) { return m.id === x.id; }); if (p) x.have = Math.min(p.n, x.have + (add[p.key] || 0)); });
    put('arenamix.missions.v1', M);
    var mAfter = missions().list;
    // notices for what this match unlocked (shown over whatever screen comes next)
    var notes = [];
    if (after.level > before.level) notes.push({ title: '¡SUBES DE NIVEL!', sub: 'Ya eres nivel ' + after.level + (gemsGain ? ' · +' + gemsGain + ' BOB' : ''), color: '#FFC53D', icon: 'level' });
    if (pv.after > pv.before) notes.push({ title: '¡PASE NIVEL ' + pv.after + '!', sub: 'Tienes premios del pase de temporada', color: '#FF8A3D', icon: 'pass' });
    mAfter.forEach(function (m, i) { if (m.done && !(mBefore[i] && mBefore[i].done)) notes.push({ title: '¡MISIÓN COMPLETADA!', sub: m.text || m.title || 'Recoge tu premio en inicio', color: '#53D88E', icon: 'mission' }); });
    if (W2.wins > w0 && W2.milestones.some(function (m) { return m.at === W2.wins; })) notes.push({ title: '¡PREMIO SEMANAL!', sub: W2.wins + ' victorias: recógelo en la Tienda', color: '#22D3EE', icon: 'gift' });
    notes.forEach(function (n, k) { setTimeout(function () { try { window.dispatchEvent(new CustomEvent('am:toast', { detail: n })); } catch (e) {} }, 4500 + k * 200); });
    return {
      home: info.home, away: info.away, pen: pen, won: won, lost: lost,
      xpLines: lines, xpGain: gain, before: before, after: after, levelUps: after.level - before.level,
      coinsBefore: c0, coinsGain: coinsGain, levelBonus: levelBonus,
      weekBefore: w0, weekAfter: W2.wins, milestones: W2.milestones,
      boostsUsed: used, gemsGain: gemsGain,
      pass: { before: pv.before, after: pv.after, into: ps.into, need: ps.need, ready: ps.ready },
      missions: mAfter.map(function (m, i) { return Object.assign({}, m, { was: mBefore[i] ? mBefore[i].have : 0 }); })
    };
  }

  window.AMProgress = {
    coins: coins, addCoins: addCoins, gems: gems, addGems: addGems, spendGems: spendGems,
    boostList: BOOSTS, boostLeft: boostLeft, buyBoost: buyBoost, useBoost: useBoost,
    aiPref: aiPref, setAiPref: setAiPref, aiLevel: aiLevel,
    celebList: CELEBS, celebs: celebState, buyCeleb: buyCeleb, equipCeleb: equipCeleb, rollChest: rollChest,
    trailList: TRAILS, trails: trailState, buyTrail: buyTrail, equipTrail: equipTrail, trailOn: trailOn,
    // everything waiting to be collected, by section (for the badges on the menu)
    pending: function () {
      var W = weekly(), P = pass(), M = missions();
      return { week: W.milestones.filter(function (m) { return m.reached && !m.claimed; }).length, pass: P.ready, missions: M.list.filter(function (m) { return m.done && !m.claimed; }).length };
    }, xp: xp, levelOf: levelOf, level: function () { return levelOf(xp()); },
    career: function () { return get('arenamix.career.v1', { played: 0, won: 0, goals: 0, streak: 0, best: 0 }); },
    payments: function () { return PAYMENTS; },
    weekly: weekly, claim: claim, missions: missions, claimMission: claimMission, recordMatch: recordMatch,
    items: ITEMS, itemPic: itemPic, milestones: MILESTONES,
    pass: pass, claimPass: claimPass, claimAllPass: claimAllPass, buyPremium: buyPremium, addPassXp: addPassXp
  };
})();
