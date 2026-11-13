/* ARENA MIX team colours: who wears what, so the two sides never look alike.
   - 1 vs 1: each player picks a home colour and an away colour (AMTeams.prefs). The home side (you against the
     AI; the host online) wears its home colour; the visitor wears its home colour too unless it clashes, then
     its away colour, and if that clashes as well, the nearest colour that does not.
   - Bigger teams: the logo's colours (electric blue at home, black away), unless every player of a team
     belongs to the same club: then that team wears the club's colour (and the visitor changes if they clash).
   AMTeams.resolve1v1(local, visitor) and AMTeams.resolveTeams(homeClubs, awayClubs) give
   { home: { c, t }, away: { c, t } } (shirt colour and trim). */
(function () {
  var KEY = 'arenamix.teamcols.v1';
  // the colours you can pick (bright, different from each other)
  var PALETTE = ['#1E8BFF', '#E5484D', '#FF8A3D', '#FFC53D', '#2FBF71', '#14B8A6', '#22D3EE', '#8B5CF6', '#EC4899', '#F4F7FF', '#0A0F24', '#7C2D12'];
  var LOGO = { home: { c: '#1E8BFF', t: '#02040C' }, away: { c: '#0A0F24', t: '#3DA9FF' } };
  function rgb(h) { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lum(h) { var r = rgb(h); return (0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]) / 255; }
  // too alike to tell apart at a glance on the pitch
  function clash(a, b) { var x = rgb(a), y = rgb(b); return (Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2])) / 255 < 0.6; }
  function trimFor(c) { return lum(c) > 0.6 ? '#0A0F24' : '#F4F7FF'; }
  function far(from, avoid) {
    if (!clash(from, avoid)) return from;
    for (var i = 0; i < PALETTE.length; i++) if (!clash(PALETTE[i], avoid)) return PALETTE[i];
    return lum(avoid) > 0.5 ? '#0A0F24' : '#F4F7FF';
  }
  function outfitColor() { try { var o = window.AMChars && window.AMChars.outfit && window.AMChars.outfit('futbol'); return o && o.primary; } catch (e) { return null; } }
  function prefs() {
    var v = null; try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var home = (v && v.home) || outfitColor() || '#1E8BFF', away = (v && v.away) || '#F4F7FF';
    if (clash(home, away)) away = far('#F4F7FF', home);
    return { home: home, away: away };
  }
  function setPrefs(p) {
    var cur = prefs(), next = { home: p.home || cur.home, away: p.away || cur.away };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }
  // the club you belong to (id and colour), if any
  function myClub() { try { var S = window.AMSocial, c = S && S.club && S.club(); return c ? { id: c.id, color: c.color, tag: c.tag } : null; } catch (e) { return null; } }
  function resolve1v1(local, visitor) {
    var hc = local.home, vc = visitor.home;
    if (clash(vc, hc)) vc = clash(visitor.away, hc) ? far(visitor.away, hc) : visitor.away;
    return { home: { c: hc, t: trimFor(hc) }, away: { c: vc, t: trimFor(vc) } };
  }
  // clubs: one entry per player of the team (null = no club)
  function teamClub(clubs) {
    if (!clubs || !clubs.length) return null;
    var first = clubs[0];
    for (var i = 0; i < clubs.length; i++) if (!clubs[i] || !first || clubs[i].id !== first.id) return null;
    return first;
  }
  function resolveTeams(homeClubs, awayClubs) {
    var hClub = teamClub(homeClubs), aClub = teamClub(awayClubs);
    var hc = hClub ? hClub.color : LOGO.home.c, ht = hClub ? trimFor(hClub.color) : LOGO.home.t;
    var ac = aClub ? aClub.color : LOGO.away.c, at = aClub ? trimFor(aClub.color) : LOGO.away.t;
    if (clash(ac, hc)) { ac = aClub ? (clash(LOGO.away.c, hc) ? far(LOGO.home.c, hc) : LOGO.away.c) : far(LOGO.away.c, hc); at = trimFor(ac); }
    return { home: { c: hc, t: ht }, away: { c: ac, t: at } };
  }
  // an AI rival's colours: its club's colour if the mode gives one, else one picked from the palette by its name
  function aiPrefs(color, name) {
    if (color) return { home: color, away: clash(color, '#F4F7FF') ? '#0A0F24' : '#F4F7FF' };
    var h = 7, s = String(name || 'rival'); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var c = PALETTE[h % PALETTE.length];
    return { home: c, away: clash(c, '#F4F7FF') ? '#0A0F24' : '#F4F7FF' };
  }

  // the colour picker: two rows of swatches (home, away); a colour too close to the other row's choice is
  // greyed out. Opens over the current screen; onChange(prefs) after each pick.
  var NAMES = { '#1E8BFF': 'Azul', '#E5484D': 'Rojo', '#FF8A3D': 'Naranja', '#FFC53D': 'Amarillo', '#2FBF71': 'Verde', '#14B8A6': 'Turquesa', '#22D3EE': 'Celeste', '#8B5CF6': 'Morado', '#EC4899': 'Rosa', '#F4F7FF': 'Blanco', '#0A0F24': 'Negro', '#7C2D12': 'Granate' };
  function nameOf(c) { return NAMES[String(c).toUpperCase()] || 'Personalizado'; }
  function openPicker(onChange) {
    var host = document.getElementById('stage') || document.body;
    var old = document.getElementById('am-colpick'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'am-colpick';
    ov.style.cssText = 'position:absolute;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:radial-gradient(60% 70% at 50% 50%,#06102Ecc,#02040Cf0);font-family:Exo2,sans-serif;color:#E6F2FF';
    var card = document.createElement('div');
    card.style.cssText = 'width:560px;padding:16px 20px 18px;border-radius:20px;background:linear-gradient(180deg,#0B1A44,#02040C);box-shadow:0 0 0 2px #1E8BFF,0 0 40px #1E8BFF66;display:flex;flex-direction:column;gap:10px';
    ov.appendChild(card);
    function render() {
      var P = prefs();
      card.innerHTML = '';
      var head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;justify-content:space-between';
      head.innerHTML = '<span style="font:400 22px Titulos,sans-serif;letter-spacing:1px;color:#fff">MIS COLORES · 1 VS 1</span>';
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '✕';
      x.style.cssText = 'width:36px;height:36px;border-radius:12px;border:0;background:#06102E;box-shadow:0 0 0 1.5px #1E8BFF88;color:#fff;font:800 16px Exo2,sans-serif;cursor:pointer';
      x.onclick = function () { ov.remove(); };
      head.appendChild(x); card.appendChild(head);
      [['home', 'LOCAL', 'Cuando juegas en casa (contra la IA, o si creas tú la sala)'], ['away', 'VISITANTE', 'Si el rival viste un color parecido al tuyo']].forEach(function (row) {
        var k = row[0], other = k === 'home' ? P.away : P.home;
        var lab = document.createElement('div'); lab.style.cssText = 'display:flex;align-items:baseline;gap:8px';
        lab.innerHTML = '<b style="font:400 13px Titulos,sans-serif;letter-spacing:2px;color:#7CC4FF">' + row[1] + '</b><span style="font-size:11px;color:#9FB4D8">' + row[2] + '</span><span style="margin-left:auto;font:400 13px Titulos,sans-serif;color:#fff">' + nameOf(P[k]) + '</span>';
        card.appendChild(lab);
        var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(12,1fr);gap:7px';
        PALETTE.forEach(function (c) {
          var b = document.createElement('button'); b.type = 'button';
          var on = String(P[k]).toUpperCase() === c, bad = clash(c, other);
          b.setAttribute('aria-label', row[1] + ': ' + nameOf(c) + (bad ? ' (se parece al otro color)' : ''));
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.disabled = bad && !on;
          b.style.cssText = 'height:34px;border-radius:10px;border:0;cursor:' + (b.disabled ? 'default' : 'pointer') + ';background:radial-gradient(circle at 50% 30%,#ffffff66,' + c + ' 55%);opacity:' + (b.disabled ? '.22' : '1') + ';box-shadow:' + (on ? '0 0 0 2.5px #02040C,0 0 0 5px #fff,0 0 14px ' + c : '0 0 0 1.5px #ffffff33');
          b.onclick = function () { var n = {}; n[k] = c; var r = setPrefs(n); render(); if (onChange) try { onChange(r); } catch (e) {} };
          grid.appendChild(b);
        });
        card.appendChild(grid);
      });
      var note = document.createElement('div');
      note.style.cssText = 'margin-top:2px;padding:7px 10px;border-radius:10px;background:#06102E;font-size:11px;line-height:1.35;color:#BBD0F0';
      note.textContent = 'Solo en los partidos 1 VS 1 (también penaltis y faltas). En partidos por equipos se juega con los colores de ARENA MIX, salvo que todo un equipo sea del mismo club: entonces lleva el color del club.';
      card.appendChild(note);
    }
    render();
    ov.addEventListener('pointerdown', function (e) { if (e.target === ov) ov.remove(); });
    host.appendChild(ov);
  }
  window.AMTeams = { openPicker: openPicker, nameOf: nameOf, PALETTE: PALETTE, LOGO: LOGO, prefs: prefs, setPrefs: setPrefs, myClub: myClub, clash: clash, trimFor: trimFor, resolve1v1: resolve1v1, resolveTeams: resolveTeams, aiPrefs: aiPrefs };
})();
