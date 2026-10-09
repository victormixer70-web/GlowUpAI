/* ARENA MIX "juice": coins and gems that fly to their counter when you earn them, animated notices
   (mission done, level up) that drop in over any screen, and the free daily prize wheel. */
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var css = document.createElement('style');
  css.textContent = [
    '#jc-layer{position:absolute;inset:0;z-index:46;pointer-events:none;overflow:hidden}',
    '.jc-coin{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;filter:drop-shadow(0 3px 4px #0009)}',
    '.jc-plus{position:absolute;margin:-12px 0 0 -40px;width:80px;text-align:center;font:800 italic 20px "Barlow Condensed",sans-serif;text-shadow:0 2px 0 #05050A}',
    // notices
    '.jc-toast{position:absolute;left:50%;top:10px;min-width:280px;max-width:520px;translate:-50% 0;display:flex;align-items:center;gap:12px;padding:8px 18px 8px 10px;border-radius:18px;background:linear-gradient(180deg,#1E1F45,#0E0E22);box-shadow:inset 0 2px 0 #ffffff22,inset 0 -3px 0 #0008,0 0 0 2px #05050A,0 0 0 4px var(--tc),0 10px 28px #000a,0 0 30px var(--tc);color:#F4F4FA;font-family:Exo2,sans-serif;animation:jcIn .55s cubic-bezier(.2,1.5,.4,1) both}',
    '.jc-toast.out{animation:jcOut .35s ease-in forwards}',
    '@keyframes jcIn{from{transform:translateY(-120px) scale(.7) rotate(-4deg)}}',
    '@keyframes jcOut{to{transform:translateY(-120px) scale(.8);opacity:0}}',
    '.jc-toast .ic{flex:none;width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--tc);box-shadow:inset 0 2px 0 #fff8,inset 0 -3px 0 #0004;animation:jcIc 1s .4s ease-in-out 2}',
    '@keyframes jcIc{50%{transform:rotate(-12deg) scale(1.15)}}',
    '.jc-toast b{display:block;font:800 italic 22px "Barlow Condensed",sans-serif;letter-spacing:1px;line-height:1;color:var(--tc);text-shadow:0 2px 0 #05050A}',
    '.jc-toast span{display:block;margin-top:3px;font-size:12px;font-weight:700;color:#CACAE0}',
    '.jc-conf{position:absolute;width:7px;height:11px;border-radius:2px}',
    // the wheel
    '.jc-wheel{position:absolute;inset:0;pointer-events:auto;display:flex;align-items:center;justify-content:center;gap:34px;background:radial-gradient(60% 80% at 40% 50%,#2A1C5ECC,#05050AEE);animation:jcFade .25s both}',
    '@keyframes jcFade{from{opacity:0}}',
    '.jc-wheel .wbox{position:relative;width:290px;height:290px;animation:jcPop .45s cubic-bezier(.2,1.5,.4,1) both}',
    '@keyframes jcPop{from{transform:scale(.4) rotate(-40deg);opacity:0}}',
    '.jc-wheel .rim{position:absolute;inset:-12px;border-radius:50%;background:conic-gradient(#FFC53D,#FF8A3D,#FFC53D,#FFE38A,#FFC53D);box-shadow:0 0 0 3px #05050A,0 0 40px #FFC53D88,inset 0 0 0 3px #05050A}',
    '.jc-wheel .bulbs i{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px;border-radius:50%;background:#FFF6C8;box-shadow:0 0 8px #FFE38A;animation:jcBulb 1s infinite}',
    '@keyframes jcBulb{50%{opacity:.25}}',
    '.jc-wheel svg.disc{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;transition:transform 4.6s cubic-bezier(.12,.75,.12,1)}',
    '.jc-wheel .pin{position:absolute;left:50%;top:-26px;width:34px;height:42px;margin-left:-17px;z-index:2;filter:drop-shadow(0 4px 4px #000a)}',
    '.jc-wheel .hub{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px;border:0;border-radius:50%;z-index:2;background:radial-gradient(circle at 40% 35%,#FFF2B0,#FFC53D 55%,#C98A12);box-shadow:0 0 0 4px #05050A,0 6px 0 #6E4A05,0 0 20px #FFC53D;font:800 italic 22px "Barlow Condensed",sans-serif;color:#2A1C02;cursor:pointer}',
    '.jc-wheel .hub:disabled{filter:grayscale(.6) brightness(.8);cursor:default}',
    '.jc-wheel .side{display:flex;flex-direction:column;gap:10px;max-width:260px;animation:jcPop .5s .1s cubic-bezier(.2,1.5,.4,1) both}',
    '.jc-wheel .side h2{margin:0;font:800 italic 40px/1 "Barlow Condensed",sans-serif;color:#FFC53D;text-shadow:0 4px 0 #05050A,0 0 20px #FFC53D66}',
    '.jc-wheel .side p{margin:0;font:700 13px/1.4 Exo2,sans-serif;color:#E2D6FA}',
    '.jc-wheel .close{align-self:flex-start;height:40px;padding:0 20px;border:0;border-radius:14px;background:#26264A;color:#F4F4FA;font:800 14px Exo2,sans-serif;box-shadow:inset 0 2px 0 #ffffff1c,inset 0 -3px 0 #0008,0 0 0 2px #05050A;cursor:pointer}',
    '.jc-wheel .won{font:800 italic 30px/1 "Barlow Condensed",sans-serif;color:#FFFFFF;text-shadow:0 3px 0 #05050A;animation:jcPop .5s cubic-bezier(.2,1.8,.4,1) both}'
  ].join('\n');
  document.head.appendChild(css);
  var layer = document.createElement('div'); layer.id = 'jc-layer';
  var mount = function () { if (!layer.parentNode) stage.appendChild(layer); };
  var K = function () { return stage.getBoundingClientRect().width / 844 || 1; };
  var inGame = function () { return !!stage.querySelector('[data-am-game]'); };
  var lastTap = { x: 422, y: 195, t: 0 };
  document.addEventListener('pointerdown', function (e) {
    var r = stage.getBoundingClientRect(), k = K();
    lastTap = { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, t: performance.now() };
  }, true);
  var COIN = '<svg viewBox="0 0 24 24" width="26" height="26"><circle cx="12" cy="12" r="10" fill="#FFC53D"/><circle cx="12" cy="12" r="7" fill="none" stroke="#B7791F" stroke-width="1.5"/><text x="12" y="16" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="11" fill="#7A4E0E">V</text></svg>';
  var GEM = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M7 3h10l4 6l-9 12L3 9z" fill="#FF5CC8"/><path d="M7 3h10l-2 6H9z" fill="#FFC2EC" opacity=".8"/></svg>';
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  // ---- coins and gems fly from where you tapped to their counter, which bumps and counts up ----
  var target = function (kind) {
    var sel = kind === 'vcd' ? 'svg.am-coin' : 'svg path[d^="M7 3h10l4 6"]', list = stage.querySelectorAll(sel), best = null, by = 1e9;
    var sr = stage.getBoundingClientRect(), k = K();
    for (var i = 0; i < list.length; i++) {
      var host = list[i].closest('a, button, span, div');
      if (!host || host.closest('#jc-layer')) continue;
      var r = host.getBoundingClientRect();
      if (!r.width || r.top < sr.top - 2 || r.bottom > sr.bottom) continue;
      if (r.top < by) { by = r.top; best = { el: host, x: (r.left - sr.left + r.width / 2) / k, y: (r.top - sr.top + r.height / 2) / k }; }
    }
    return best;
  };
  var countUp = function (el, total, delta) {
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node = null, n;
    while ((n = walk.nextNode())) if (/\d/.test(n.nodeValue)) { node = n; break; }
    if (!node) return;
    var from = Math.max(0, total - delta), t0 = performance.now();
    var step = function () {
      var u = Math.min(1, (performance.now() - t0) / 650);
      if (!node.isConnected) return;
      node.nodeValue = node.nodeValue.replace(/[\d.]+/, fmt(from + (total - from) * (1 - Math.pow(1 - u, 3))));
      if (u < 1) requestAnimationFrame(step);
    };
    step();
  };
  var fly = function (kind, delta, total) {
    mount();
    var tg = target(kind) || { el: null, x: kind === 'vcd' ? 690 : 790, y: 24 };
    var o = performance.now() - lastTap.t < 2500 ? lastTap : { x: 422, y: 230 };
    var n = Math.min(12, 4 + Math.round(Math.log2(1 + Math.abs(delta)))), arrived = false;
    for (var i = 0; i < n; i++) (function (i) {
      var c = document.createElement('div'); c.className = 'jc-coin'; c.innerHTML = kind === 'vcd' ? COIN : GEM;
      c.style.left = o.x + 'px'; c.style.top = o.y + 'px'; c.style.opacity = '0';
      layer.appendChild(c);
      var a = Math.random() * Math.PI * 2, sx = Math.cos(a) * (30 + Math.random() * 40), sy = Math.sin(a) * (24 + Math.random() * 30) - 20;
      var dx = tg.x - o.x, dy = tg.y - o.y;
      var an = c.animate([
        { transform: 'translate(0,0) scale(.3) rotate(0deg)', opacity: 0 },
        { transform: 'translate(' + sx + 'px,' + sy + 'px) scale(1.15) rotate(' + (Math.random() * 120 - 60) + 'deg)', opacity: 1, offset: 0.3 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.55) rotate(0deg)', opacity: 1 }
      ], { duration: 820 + i * 35, delay: i * 50, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
      an.onfinish = function () {
        c.remove();
        if (tg.el && tg.el.isConnected) tg.el.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.16)', filter: 'brightness(1.6)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 260 });
        if (!arrived) { arrived = true; if (tg.el && total != null) countUp(tg.el, total, delta); if (window.AMSfx && window.AMSfx.coin) try { window.AMSfx.coin(); } catch (e) {} }
      };
    })(i);
    var plus = document.createElement('div'); plus.className = 'jc-plus'; plus.textContent = '+' + fmt(delta) + (kind === 'vcd' ? ' VCD' : ' BOB');
    plus.style.left = tg.x + 'px'; plus.style.top = (tg.y + 26) + 'px'; plus.style.color = kind === 'vcd' ? '#FFE38A' : '#FFC2EC';
    layer.appendChild(plus);
    plus.animate([{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.2 }, { transform: 'translateY(-10px)', opacity: 1, offset: 0.8 }, { transform: 'translateY(-16px)', opacity: 0 }], { duration: 1500, delay: 750, fill: 'forwards' }).onfinish = function () { plus.remove(); };
  };
  window.addEventListener('am:wallet', function (e) {
    var d = e.detail || {};
    if (d.delta > 0 && !inGame()) setTimeout(function () { fly(d.kind, d.delta, d.total); }, 80);
  });

  // ---- notices that drop in over any screen, one after another ----
  var queue = [], showing = false;
  var confetti = function (x, y, col) {
    var C = [col, '#FFFFFF', '#FFC53D', '#22D3EE', '#FF5C8A'];
    for (var i = 0; i < 18; i++) {
      var c = document.createElement('div'); c.className = 'jc-conf'; c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.background = C[i % C.length];
      layer.appendChild(c);
      var a = Math.random() * Math.PI, d = 60 + Math.random() * 90;
      c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d * 0.9 + 60) + 'px) rotate(' + (Math.random() * 720) + 'deg)', opacity: 0 }], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = (function (c) { return function () { c.remove(); }; })(c);
    }
  };
  var ICONS = {
    mission: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B0B14" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l7-7M16 4h3v3"/></svg>',
    level: '<svg width="26" height="26" viewBox="0 0 24 24" fill="#0B0B14"><path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z"/></svg>',
    pass: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B0B14" stroke-width="2.6" stroke-linejoin="round"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/></svg>',
    gift: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B0B14" stroke-width="2.6" stroke-linejoin="round"><path d="M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9C9 9 7 4 10 4s2 5 2 5zM12 9c3 0 5-5 2-5s-2 5-2 5z"/></svg>'
  };
  var next = function () {
    if (showing || !queue.length) return;
    if (inGame()) { setTimeout(next, 1500); return; }
    showing = true; mount();
    var q = queue.shift(), t = document.createElement('div');
    t.className = 'jc-toast'; t.style.setProperty('--tc', q.color || '#22D3EE');
    t.innerHTML = '<div class="ic">' + (ICONS[q.icon] || ICONS.level) + '</div><div><b></b><span></span></div>';
    t.querySelector('b').textContent = q.title; t.querySelector('span').textContent = q.sub || '';
    layer.appendChild(t);
    setTimeout(function () { confetti(422, 40, q.color || '#22D3EE'); }, 300);
    if (window.AMSfx && window.AMSfx.coin) try { window.AMSfx.coin(); } catch (e) {}
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); showing = false; next(); }, 380); }, 2600);
  };
  var toast = function (q) { queue.push(q); setTimeout(next, 50); };
  window.addEventListener('am:toast', function (e) { if (e.detail) toast(e.detail); });

  // ---- the daily prize wheel ----
  var SEG = [
    { label: '50', sub: 'VCD', kind: 'vcd', n: 50, c: '#22D3EE' },
    { label: '1', sub: 'BOB', kind: 'bob', n: 1, c: '#FF5CC8' },
    { label: '150', sub: 'VCD', kind: 'vcd', n: 150, c: '#FFC53D' },
    { label: 'COFRE', sub: 'común', kind: 'chest', k: 'common', c: '#53D88E' },
    { label: '3', sub: 'BOB', kind: 'bob', n: 3, c: '#A78BFA' },
    { label: '300', sub: 'VCD', kind: 'vcd', n: 300, c: '#FF8A3D' },
    { label: 'COFRE', sub: 'raro', kind: 'chest', k: 'rare', c: '#6FB6FF' },
    { label: '100', sub: 'VCD', kind: 'vcd', n: 100, c: '#FF5C5C' }
  ];
  var WEIGHT = [24, 6, 18, 12, 2, 7, 4, 27];
  var day = function () { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  var ready = function () { try { var w = JSON.parse(localStorage.getItem('arenamix.wheel.v1') || 'null'); return !w || w.day !== day(); } catch (e) { return true; } };
  var disc = function () {
    var n = SEG.length, R = 140, out = '';
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + Math.PI * 2 / n;
      var x0 = 150 + Math.cos(a0) * R, y0 = 150 + Math.sin(a0) * R, x1 = 150 + Math.cos(a1) * R, y1 = 150 + Math.sin(a1) * R;
      out += '<path d="M150 150L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Z" fill="' + SEG[i].c + '" stroke="#05050A" stroke-width="3"/>';
      out += '<path d="M150 150L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Z" fill="url(#jcShade)"/>';
      var am = (i / n) * 360;
      out += '<g transform="rotate(' + am + ' 150 150)"><text x="150" y="58" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="' + (SEG[i].label.length > 3 ? 22 : 30) + '" fill="#0B0B14">' + SEG[i].label + '</text><text x="150" y="78" text-anchor="middle" font-family="Exo2, sans-serif" font-weight="800" font-size="12" fill="#0B0B14" opacity=".75">' + SEG[i].sub.toUpperCase() + '</text></g>';
    }
    return '<svg class="disc" viewBox="0 0 300 300"><defs><radialGradient id="jcShade"><stop offset=".55" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>' + out + '</svg>';
  };
  var open = function () {
    mount();
    var w = document.createElement('div'); w.className = 'jc-wheel';
    var bulbs = ''; for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; bulbs += '<i style="transform:translate(' + (Math.cos(a) * 152).toFixed(1) + 'px,' + (Math.sin(a) * 152).toFixed(1) + 'px);animation-delay:' + (i % 2 ? '-.5s' : '0s') + '"></i>'; }
    var can = ready();
    w.innerHTML = '<div class="wbox"><div class="rim"></div><div class="bulbs">' + bulbs + '</div>' + disc() + '<svg class="pin" viewBox="0 0 34 42"><path d="M17 40L3 12a14 14 0 1 1 28 0z" fill="#FF3B5C" stroke="#05050A" stroke-width="3"/><circle cx="17" cy="14" r="5" fill="#fff"/></svg><button class="hub" type="button">' + (can ? 'GIRAR' : 'MAÑANA') + '</button></div>'
      + '<div class="side"><h2>RULETA DIARIA</h2><p>' + (can ? 'Una tirada gratis cada día. ¡Toca GIRAR y a ver qué cae!' : 'Ya has girado hoy. Vuelve mañana para otra tirada gratis.') + '</p><div class="res"></div><button class="close" type="button">Cerrar</button></div>';
    layer.appendChild(w);
    var hub = w.querySelector('.hub'), d = w.querySelector('svg.disc'), res = w.querySelector('.res');
    if (!can) hub.disabled = true;
    w.querySelector('.close').onclick = function () { w.remove(); window.dispatchEvent(new Event('am:wheel')); };
    w.addEventListener('pointerdown', function (e) { if (e.target === w) { w.remove(); window.dispatchEvent(new Event('am:wheel')); } });
    hub.onclick = function () {
      if (!ready()) return;
      hub.disabled = true;
      try { localStorage.setItem('arenamix.wheel.v1', JSON.stringify({ day: day() })); } catch (e) {}
      setTimeout(function () { daily.check(); }, 6500);
      // pick a prize by weight, then turn the wheel so it stops under the pin
      var tot = WEIGHT.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * tot, k = 0;
      while (r > WEIGHT[k]) { r -= WEIGHT[k]; k++; }
      var seg = 360 / SEG.length, jitter = (Math.random() - 0.5) * seg * 0.6;
      d.style.transform = 'rotate(' + (360 * 6 - k * seg + jitter) + 'deg)';
      var ticks = 0, tk = setInterval(function () { if (window.AMSfx && window.AMSfx.tick) try { window.AMSfx.tick(); } catch (e) {} if (++ticks > 26) clearInterval(tk); }, 150);
      setTimeout(function () {
        var s = SEG[k], P = window.AMProgress, rect = hub.getBoundingClientRect(), sr = stage.getBoundingClientRect(), kk = K();
        lastTap = { x: (rect.left - sr.left + rect.width / 2) / kk, y: (rect.top - sr.top + rect.height / 2) / kk, t: performance.now() };
        res.innerHTML = '<div class="won"></div>'; res.firstChild.textContent = '¡' + s.label + ' ' + (s.kind === 'chest' ? s.sub.toUpperCase() : s.sub) + '!';
        confetti(lastTap.x, lastTap.y - 40, s.c);
        hub.textContent = 'MAÑANA';
        if (!P) return;
        if (s.kind === 'vcd') P.addCoins(s.n);
        else if (s.kind === 'bob') P.addGems(s.n);
        else if (s.kind === 'chest' && P.rollChest) { var out = P.rollChest(s.k); out.milestone = { name: 'Ruleta diaria', prize: 'chest', chest: s.k }; setTimeout(function () { if (window.AMResults) window.AMResults.reward(out, function () {}); }, 600); }
      }, 4700);
    };
  };
  // daily mini-games: one go each per day
  var daily = {
    ready: function (id) { if (id === 'wheel') return ready(); try { var d = JSON.parse(localStorage.getItem('arenamix.daily.v1') || 'null'); return !d || d.day !== day() || !d[id]; } catch (e) { return true; } },
    mark: function (id) { setTimeout(function () { daily.check(); }, 2200); var d = null; try { d = JSON.parse(localStorage.getItem('arenamix.daily.v1') || 'null'); } catch (e) {} if (!d || d.day !== day()) d = { day: day() }; d[id] = 1; try { localStorage.setItem('arenamix.daily.v1', JSON.stringify(d)); } catch (e) {} },
    count: function () { return ['wheel', 'pens', 'fk'].filter(function (id) { return daily.ready(id); }).length; },
    // weekly streak: playing all three on a day adds a day; skipping a day starts again
    REWARDS: [{ t: 'vcd', n: 50 }, { t: 'vcd', n: 80 }, { t: 'chest', k: 'common' }, { t: 'vcd', n: 120 }, { t: 'bob', n: 1 }, { t: 'vcd', n: 150 }, { t: 'bob', n: 3, chest: 'rare' }],
    streak: function () {
      var st = null; try { st = JSON.parse(localStorage.getItem('arenamix.streak.v1') || 'null'); } catch (e) {}
      st = st || { n: 0, last: 0 };
      var y = new Date(); y.setDate(y.getDate() - 1); var yd = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
      if (st.last !== day() && st.last !== yd) st = { n: 0, last: st.last };
      return { n: st.n, today: st.last === day() };
    },
    check: function () {
      if (daily.count() > 0) return;
      var st = daily.streak();
      if (st.today) return;
      var n = st.n % 7 + 1;
      try { localStorage.setItem('arenamix.streak.v1', JSON.stringify({ n: n, last: day() })); } catch (e) {}
      var r = daily.REWARDS[n - 1], P = window.AMProgress;
      setTimeout(function () {
        toast({ title: '¡RACHA DÍA ' + n + '!', sub: n === 7 ? 'Semana completa: ¡premio gordo!' : 'Vuelve mañana para seguir la racha', color: '#FF8A3D', icon: 'gift' });
        if (!P) return;
        if (r.t === 'vcd') P.addCoins(r.n);
        if (r.t === 'bob') P.addGems(r.n);
        var ck = r.t === 'chest' ? r.k : r.chest;
        if (ck && P.rollChest) { var out = P.rollChest(ck); out.milestone = { name: 'Racha de minijuegos', prize: 'chest', chest: ck }; setTimeout(function () { if (window.AMResults) window.AMResults.reward(out, function () {}); }, 1400); }
        window.dispatchEvent(new Event('am:wheel'));
      }, 1800);
    }
  };
  window.AMJuice = { daily: daily, fly: fly, toast: toast, confetti: function (x, y, c) { mount(); confetti(x, y, c); }, wheel: { open: open, ready: ready } };
})();
