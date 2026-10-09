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
    '.jc-wheel{position:absolute;inset:0;pointer-events:auto;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:40px;background:radial-gradient(55% 75% at 36% 50%,#3B1F7A,#16093A 60%,#05050A);animation:jcFade .25s both}',
    '@keyframes jcFade{from{opacity:0}}',
    '.jc-wheel .rays{position:absolute;left:36%;top:50%;width:1300px;height:1300px;margin:-650px 0 0 -650px;background:repeating-conic-gradient(#FFC53D16 0 7deg,transparent 7deg 18deg);-webkit-mask-image:radial-gradient(closest-side,#000,transparent);mask-image:radial-gradient(closest-side,#000,transparent);animation:jcRays 24s linear infinite;pointer-events:none}',
    '.jc-wheel.spinning .rays{animation-duration:3s}',
    '@keyframes jcRays{to{transform:rotate(360deg)}}',
    '.jc-wheel .stars i{position:absolute;width:4px;height:4px;border-radius:50%;background:#FFE38A;box-shadow:0 0 8px #FFC53D;animation:jcTw 2.4s ease-in-out infinite;pointer-events:none}',
    '@keyframes jcTw{0%,100%{opacity:.15;transform:scale(.6)}50%{opacity:1;transform:scale(1.3)}}',
    '.jc-wheel .wbox{position:relative;width:290px;height:290px;animation:jcPop .55s cubic-bezier(.2,1.5,.4,1) both}',
    '@keyframes jcPop{from{transform:scale(.3) rotate(-90deg);opacity:0}}',
    '.jc-wheel .glow{position:absolute;inset:-40px;border-radius:50%;background:radial-gradient(closest-side,#FFC53D55,transparent);animation:jcGlow 2s ease-in-out infinite}',
    '@keyframes jcGlow{50%{transform:scale(1.08);opacity:.6}}',
    '.jc-wheel .rim{position:absolute;inset:-16px;border-radius:50%;background:conic-gradient(from 20deg,#FFE38A,#C98A12,#FFF2B0,#B7791F,#FFE38A,#C98A12,#FFF2B0,#B7791F,#FFE38A);box-shadow:0 0 0 4px #05050A,0 14px 30px #000c,inset 0 0 0 4px #05050A}',
    '.jc-wheel .bulbs i{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#FFF6C8;box-shadow:0 0 10px #FFE38A,0 0 0 2px #05050A;animation:jcChase .72s steps(1) infinite}',
    '.jc-wheel.spinning .bulbs i{animation-duration:.24s}',
    '@keyframes jcChase{0%,49%{background:#FFF6C8;box-shadow:0 0 12px #FFE38A,0 0 0 2px #05050A}50%,100%{background:#FF5CC8;box-shadow:0 0 10px #FF5CC8,0 0 0 2px #05050A}}',
    '.jc-wheel svg.disc{position:absolute;inset:0;width:100%;height:100%;border-radius:50%}',
    '.jc-wheel .pin{position:absolute;left:50%;top:-34px;width:40px;height:52px;margin-left:-20px;z-index:2;transform-origin:50% 30%;filter:drop-shadow(0 5px 4px #000a)}',
    '.jc-wheel .pin.flick{animation:jcFlick .16s ease-out}',
    '@keyframes jcFlick{40%{transform:rotate(-22deg)}}',
    '.jc-wheel .hub{position:absolute;left:50%;top:50%;width:92px;height:92px;margin:-46px;border:0;border-radius:50%;z-index:2;cursor:pointer;background:radial-gradient(circle at 38% 30%,#FFFFFF,#FFE38A 25%,#FFC53D 55%,#B7791F);box-shadow:0 0 0 5px #05050A,0 0 0 9px #FF5CC8,0 7px 0 9px #05050A,0 0 30px #FFC53D;animation:jcHub 1.2s ease-in-out infinite}',
    '.jc-wheel .hub b{font:800 italic 24px "Barlow Condensed",sans-serif;color:#2A1C02;text-shadow:0 2px 0 #FFF6C8}',
    '@keyframes jcHub{50%{transform:scale(1.07)}}',
    '.jc-wheel .hub:disabled{animation:none;filter:grayscale(.5) brightness(.85);cursor:default}',
    '.jc-wheel .side{position:relative;display:flex;flex-direction:column;gap:10px;max-width:250px;animation:jcPop .55s .1s cubic-bezier(.2,1.5,.4,1) both}',
    '.jc-wheel .side h2{margin:0;font:800 italic 46px/.92 "Barlow Condensed",sans-serif;color:#FFE38A;text-shadow:0 0 8px #FFC53D,0 0 22px #FF8A3D,0 5px 0 #05050A}',
    '.jc-wheel .side p{margin:0;font:700 13px/1.4 Exo2,sans-serif;color:#E2D6FA}',
    '.jc-wheel .legend{display:flex;flex-wrap:wrap;gap:6px}',
    '.jc-wheel .legend span{display:flex;align-items:center;gap:4px;padding:2px 9px 2px 2px;border-radius:12px;background:#0B0B14B3;box-shadow:inset 0 0 0 1.5px var(--lc);font:800 11px Exo2,sans-serif;color:#F4F4FA}',
    '.jc-wheel .legend img{width:24px;height:24px;object-fit:contain}',
    '.jc-wheel .close{align-self:flex-start;height:40px;padding:0 20px;border:0;border-radius:14px;background:#26264A;color:#F4F4FA;font:800 14px Exo2,sans-serif;box-shadow:inset 0 2px 0 #ffffff1c,inset 0 -3px 0 #0008,0 0 0 2px #05050A;cursor:pointer}',
    '.jc-wheel .won-card{position:absolute;left:50%;top:50%;width:300px;padding:20px 18px 18px;margin:-150px 0 0 -150px;box-sizing:border-box;z-index:5;display:flex;flex-direction:column;align-items:center;gap:6px;border-radius:26px;background:radial-gradient(120% 80% at 50% 0%,color-mix(in srgb,var(--wc) 55%,#1E1F45),#0E0E22 70%);box-shadow:0 0 0 3px #05050A,0 0 0 6px var(--wc),0 0 40px var(--wc),0 20px 40px #000c;animation:jcWin .6s cubic-bezier(.2,1.6,.4,1) both;overflow:hidden}',
    '@keyframes jcWin{from{transform:scale(.2) rotate(-12deg);opacity:0}}',
    '.jc-wheel .won-card .wr{position:absolute;left:50%;top:40%;width:600px;height:600px;margin:-300px;background:repeating-conic-gradient(#ffffff1c 0 9deg,transparent 9deg 22deg);animation:jcRays 10s linear infinite;pointer-events:none}',
    '.jc-wheel .won-card .k{position:relative;font:800 12px Exo2,sans-serif;letter-spacing:2px;color:#FFFFFFcc}',
    '.jc-wheel .won-card img{position:relative;width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 8px 10px #000a);animation:jcFloat 2s ease-in-out infinite}',
    '@keyframes jcFloat{50%{transform:translateY(-8px) rotate(4deg)}}',
    '.jc-wheel .won-card b{position:relative;font:800 italic 40px/1 "Barlow Condensed",sans-serif;color:#FFFFFF;text-shadow:0 4px 0 #05050A,0 0 18px var(--wc)}',
    '.jc-wheel .won-card button{position:relative;margin-top:6px;height:46px;padding:0 30px;border:0;border-radius:16px;cursor:pointer;background:linear-gradient(135deg,#FFE38A,#FFC53D 55%,#D9A520);color:#2A1C02;font:800 italic 22px "Barlow Condensed",sans-serif;box-shadow:inset 0 3px 0 #FFFFFFB0,0 0 0 2px #4A3205,0 5px 0 #4A3205}'
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
  var pic = function (sg) {
    var G = window.AMGear; if (!G || !G.prize) return '';
    try { return G.prize(sg.kind === 'vcd' ? 'coins:' + (sg.n >= 300 ? 14 : sg.n >= 150 ? 8 : 4) : sg.kind === 'bob' ? 'gems:' + Math.max(1, sg.n) : 'chest:' + sg.k); } catch (e) { return ''; }
  };
  var disc = function () {
    var n = SEG.length, R = 140, out = '';
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n, a1 = a0 + Math.PI * 2 / n;
      var x0 = 150 + Math.cos(a0) * R, y0 = 150 + Math.sin(a0) * R, x1 = 150 + Math.cos(a1) * R, y1 = 150 + Math.sin(a1) * R;
      var path = 'M150 150L' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'A' + R + ' ' + R + ' 0 0 1 ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Z';
      out += '<path d="' + path + '" fill="' + SEG[i].c + '"/><path d="' + path + '" fill="url(#jcShade)"/><path d="' + path + '" fill="none" stroke="#FFF6C8" stroke-opacity=".55" stroke-width="2"/>';
      var am = (i / n) * 360, img = pic(SEG[i]);
      out += '<g transform="rotate(' + am + ' 150 150)">' + (img ? '<image href="' + img + '" x="126" y="44" width="48" height="48"/>' : '') + '<text x="150" y="40" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-style="italic" font-weight="800" font-size="' + (SEG[i].label.length > 3 ? 15 : 18) + '" fill="#FFFFFF" stroke="#05050A" stroke-width="3" paint-order="stroke">' + SEG[i].label + (SEG[i].kind === 'chest' ? '' : ' ' + SEG[i].sub) + '</text></g>';
    }
    // studs on the rim between segments
    for (var j = 0; j < n; j++) { var aa = (j / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n; out += '<circle cx="' + (150 + Math.cos(aa) * 133).toFixed(1) + '" cy="' + (150 + Math.sin(aa) * 133).toFixed(1) + '" r="4.5" fill="#FFE38A" stroke="#05050A" stroke-width="2"/>'; }
    return '<svg class="disc" viewBox="0 0 300 300"><defs><radialGradient id="jcShade"><stop offset=".25" stop-color="#000" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></radialGradient></defs><circle cx="150" cy="150" r="141" fill="#05050A"/>' + out + '</svg>';
  };
  var open = function () {
    mount();
    var w = document.createElement('div'); w.className = 'jc-wheel';
    var bulbs = ''; for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2; bulbs += '<i style="transform:translate(' + (Math.cos(a) * 156).toFixed(1) + 'px,' + (Math.sin(a) * 156).toFixed(1) + 'px);animation-delay:' + (-(i % 6) * 0.12).toFixed(2) + 's"></i>'; }
    var stars = ''; for (var k2 = 0; k2 < 18; k2++) stars += '<i style="left:' + (Math.random() * 100).toFixed(0) + '%;top:' + (Math.random() * 100).toFixed(0) + '%;animation-delay:-' + (Math.random() * 3).toFixed(1) + 's"></i>';
    var can = ready();
    var legend = SEG.filter(function (sg, q) { return SEG.findIndex(function (t) { return t.kind === sg.kind && t.k === sg.k; }) === q; }).map(function (sg) { var im = pic(sg); return '<span style="--lc:' + sg.c + '">' + (im ? '<img src="' + im + '" alt="">' : '') + (sg.kind === 'vcd' ? 'VCD' : sg.kind === 'bob' ? 'BOB · ¡rarísimo!' : 'Cofre ' + sg.sub) + '</span>'; }).join('');
    w.innerHTML = '<div class="rays"></div><div class="stars">' + stars + '</div>'
      + '<div class="wbox"><div class="glow"></div><div class="rim"></div><div class="bulbs">' + bulbs + '</div>' + disc()
      + '<svg class="pin" viewBox="0 0 40 52"><path d="M20 50L4 16a17 17 0 1 1 32 0z" fill="#FF3B5C" stroke="#05050A" stroke-width="3.5"/><path d="M20 6a11 11 0 0 1 10 6" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="20" cy="17" r="6" fill="#FFF6C8" stroke="#05050A" stroke-width="2"/></svg>'
      + '<button class="hub" type="button"><b>' + (can ? '¡GIRA!' : 'MAÑANA') + '</b></button></div>'
      + '<div class="side"><h2>RULETA<br>DIARIA</h2><p>' + (can ? '¡Una tirada gratis cada día! Toca el centro y que la suerte decida.' : 'Ya has girado hoy. Vuelve mañana para otra tirada gratis.') + '</p><div class="legend">' + legend + '</div><button class="close" type="button">Cerrar</button></div>';
    layer.appendChild(w);
    var hub = w.querySelector('.hub'), d = w.querySelector('svg.disc'), pin = w.querySelector('.pin');
    if (!can) hub.disabled = true;
    var close = function () { w.remove(); window.dispatchEvent(new Event('am:wheel')); };
    w.querySelector('.close').onclick = close;
    w.addEventListener('pointerdown', function (e) { if (e.target === w) close(); });
    hub.onclick = function () {
      if (!ready()) return;
      hub.disabled = true; w.classList.add('spinning');
      try { localStorage.setItem('arenamix.wheel.v1', JSON.stringify({ day: day() })); } catch (e) {}
      setTimeout(function () { daily.check(); }, 7500);
      var tot = WEIGHT.reduce(function (x, y) { return x + y; }, 0), r = Math.random() * tot, k = 0;
      while (r > WEIGHT[k]) { r -= WEIGHT[k]; k++; }
      var seg = 360 / SEG.length, end = 360 * 7 - k * seg + (Math.random() - 0.5) * seg * 0.6, t0 = performance.now(), DUR = 5200, lastSeg = 0;
      // turned frame by frame: the pin flicks at every peg and the ticks slow down with the wheel
      var step = function () {
        var u = Math.min(1, (performance.now() - t0) / DUR), e = 1 - Math.pow(1 - u, 4), ang = end * e;
        d.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
        var sNow = Math.floor((ang + seg / 2) / seg);
        if (sNow !== lastSeg) { lastSeg = sNow; pin.classList.remove('flick'); void pin.getBoundingClientRect(); pin.classList.add('flick'); if (window.AMSfx && window.AMSfx.tick) try { window.AMSfx.tick(); } catch (er) {} }
        if (u < 1) requestAnimationFrame(step); else win(k);
      };
      requestAnimationFrame(step);
    };
    var win = function (k) {
      var sg = SEG[k], P = window.AMProgress, img = pic(sg);
      w.classList.remove('spinning'); hub.querySelector('b').textContent = 'MAÑANA';
      confetti(300, 120, sg.c); setTimeout(function () { confetti(560, 120, '#FFC53D'); }, 200);
      var card = document.createElement('div'); card.className = 'won-card'; card.style.setProperty('--wc', sg.c);
      card.innerHTML = '<div class="wr"></div><span class="k">¡TE HA TOCADO!</span>' + (img ? '<img src="' + img + '" alt="">' : '') + '<b></b><button type="button">¡GENIAL!</button>';
      card.querySelector('b').textContent = sg.label + ' ' + (sg.kind === 'chest' ? sg.sub.toUpperCase() : sg.sub);
      w.appendChild(card);
      var sr = stage.getBoundingClientRect(), kk = K();
      card.querySelector('button').onclick = function () {
        var br = card.querySelector('img') ? card.querySelector('img').getBoundingClientRect() : card.getBoundingClientRect();
        lastTap = { x: (br.left - sr.left + br.width / 2) / kk, y: (br.top - sr.top + br.height / 2) / kk, t: performance.now() };
        card.remove(); close();
        if (!P) return;
        if (sg.kind === 'vcd') P.addCoins(sg.n);
        else if (sg.kind === 'bob') P.addGems(sg.n);
        else if (sg.kind === 'chest' && P.rollChest) { var out = P.rollChest(sg.k); out.milestone = { name: 'Ruleta diaria', prize: 'chest', chest: sg.k }; setTimeout(function () { if (window.AMResults) window.AMResults.reward(out, function () {}); }, 300); }
      };
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
