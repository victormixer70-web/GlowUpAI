/* ARENA MIX results screen: after the final whistle, what the match gave you, played back in a few seconds:
   the experience coming in line by line into your level bar (with a level-up burst), your coins counting up
   over a pile of 3D coins, how far the weekly track moved and your daily missions ticking over.
   AMResults.show(summary, onClose) with the summary from AMProgress.recordMatch(). */
(function () {
  var css = document.createElement('style');
  css.textContent = [
    '#am-res{position:absolute;inset:0;z-index:60;overflow:hidden;font-family:Exo2,sans-serif;color:#F4F4FA;animation:amResIn .35s ease-out both}',
    '@keyframes amResIn{from{opacity:0}to{opacity:1}}',
    '#am-res.out{animation:amResOut .3s ease-in both}@keyframes amResOut{to{opacity:0;transform:scale(1.04)}}',
    '#am-res .bg{position:absolute;inset:0;background:radial-gradient(70% 90% at 50% 0%,var(--rc2) 0%,#0B0B1A 55%,#05050A 100%)}',
    '#am-res .rays{position:absolute;left:50%;top:-260px;width:900px;height:900px;margin-left:-450px;background:repeating-conic-gradient(from 0deg,var(--rc3) 0deg 8deg,transparent 8deg 22deg);animation:amResSpin 30s linear infinite;opacity:.5;mask:radial-gradient(closest-side,#000 20%,transparent 75%);-webkit-mask:radial-gradient(closest-side,#000 20%,transparent 75%)}',
    '@keyframes amResSpin{to{rotate:360deg}}',
    '#am-res .k{position:absolute;left:0;right:0;top:12px;text-align:center;font-size:11px;font-weight:800;letter-spacing:4px;color:#A3A3C2}',
    '#am-res .t{position:absolute;left:0;right:0;top:24px;text-align:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-style:italic;font-size:58px;line-height:1;letter-spacing:2px;color:var(--rc);text-shadow:0 5px 0 #05050A,0 0 30px var(--rc);animation:amResPop .55s .1s cubic-bezier(.2,1.8,.4,1) both}',
    '@keyframes amResPop{from{transform:scale(.3) rotate(-6deg);opacity:0}to{transform:scale(1) rotate(-3deg);opacity:1}}',
    '#am-res .sc{position:absolute;left:0;right:0;top:84px;text-align:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:26px;letter-spacing:3px;color:#F4F4FA}',
    '#am-res .row{position:absolute;left:28px;right:28px;top:124px;height:166px;display:flex;gap:12px}',
    '#am-res .pn{position:relative;flex:1;padding:12px 14px;box-sizing:border-box;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);background:linear-gradient(160deg,#1B1B40EE,#0E0E22EE);box-shadow:inset 0 0 0 1px #2E2E58;animation:amResUp .45s cubic-bezier(.2,1.3,.4,1) both}',
    '@keyframes amResUp{from{opacity:0;translate:0 30px}to{opacity:1;translate:0 0}}',
    '#am-res .h{font-size:10px;font-weight:800;letter-spacing:2px;color:var(--pc)}',
    '#am-res .xpl{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#CACAE0;opacity:0;translate:-10px 0;transition:opacity .25s,translate .25s}',
    '#am-res .xpl.on{opacity:1;translate:0 0}#am-res .xpl b{color:#22D3EE}',
    '#am-res .lv{position:absolute;right:12px;top:8px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(160deg,#7EF0FF,#22D3EE 60%,#0E8FA3);color:#0B0B14;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:22px}',
    '#am-res .lv.up{animation:amResLv .6s cubic-bezier(.2,2,.4,1)}@keyframes amResLv{0%{transform:scale(1)}40%{transform:scale(1.5) rotate(10deg)}100%{transform:scale(1)}}',
    '#am-res .bar{position:absolute;left:14px;right:14px;bottom:14px;height:10px;background:#26264A;clip-path:polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)}',
    '#am-res .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22D3EE,#7EF0FF);box-shadow:0 0 10px #22D3EE}',
    '#am-res .bl{position:absolute;left:14px;right:14px;bottom:28px;display:flex;justify-content:space-between;font-size:10px;font-weight:800;color:#A3A3C2}',
    '#am-res .lvup{position:absolute;left:0;right:0;top:44%;text-align:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-style:italic;font-size:30px;color:#FFC53D;text-shadow:0 3px 0 #05050A,0 0 18px #FFC53D;opacity:0;pointer-events:none}',
    '#am-res .lvup.on{animation:amResLvUp 1.6s ease-out both}@keyframes amResLvUp{0%{opacity:0;transform:scale(.4)}20%{opacity:1;transform:scale(1.15)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-20px)}}',
    '#am-res .pile{position:absolute;left:50%;top:22px;width:108px;height:96px;margin-left:-54px;object-fit:contain;filter:drop-shadow(0 8px 10px #000a);animation:amResBob 2.4s ease-in-out infinite}',
    '@keyframes amResBob{0%,100%{translate:0 0}50%{translate:0 -6px}}',
    '#am-res .cn{position:absolute;left:0;right:0;bottom:12px;text-align:center}',
    '#am-res .cn b{display:block;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:34px;line-height:1;color:#FFE38A;text-shadow:0 0 14px #FFC53D88}',
    '#am-res .cn span{font-size:12px;font-weight:800;color:#FFC53D}',
    '#am-res .wk{display:flex;align-items:center;gap:10px;margin-top:8px}',
    '#am-res .pn:has(.ps) .pile{top:14px;width:90px;height:80px;margin-left:-45px}#am-res .pn:has(.ps) .cn{bottom:34px}',
    '#am-res .ps{position:absolute;left:12px;right:12px;bottom:10px;display:flex;align-items:center;gap:8px;font:800 11px Exo2,sans-serif;letter-spacing:1px;color:#FFB37A}',
    '#am-res .ps i{flex:1;height:6px;background:#26264A;overflow:hidden}#am-res .ps i u{display:block;height:100%;background:linear-gradient(90deg,#FF8A3D,#FFC53D);transition:width 1s ease-out}',
    '#am-res .ps.up b{color:#FFC53D;animation:amResPop .5s ease-out}',
    '#am-res .wk img{width:76px;height:76px;object-fit:contain;filter:drop-shadow(0 6px 8px #000a)}',
    '#am-res .dots{display:flex;gap:3px;margin-top:10px}#am-res .dots i{flex:1;height:7px;background:#26264A;transition:background .3s,box-shadow .3s}',
    '#am-res .dots i.on{background:#22D3EE;box-shadow:0 0 6px #22D3EE}#am-res .dots i.m{outline:1px solid #FFC53D88}#am-res .dots i.new{background:#FFC53D;box-shadow:0 0 10px #FFC53D}',
    '#am-res .ms{position:absolute;left:28px;right:244px;bottom:16px;height:62px;display:flex;gap:8px}',
    '#am-res .mi{flex:1;display:flex;flex-direction:column;justify-content:center;gap:5px;padding:0 10px;background:#11112AE6;box-shadow:inset 0 0 0 1px #2E2E58;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);animation:amResUp .4s cubic-bezier(.2,1.3,.4,1) both}',
    '#am-res .mi .tx{display:flex;justify-content:space-between;gap:6px;font-size:11px;font-weight:800;white-space:nowrap}',
    '#am-res .mi .tx span:last-child{color:#A3A3C2}#am-res .mi.done .tx span:last-child{color:#53D88E}',
    '#am-res .mi .pb{height:6px;background:#26264A}#am-res .mi .pb i{display:block;height:100%;background:#53D88E;box-shadow:0 0 8px #53D88E;transition:width 1s cubic-bezier(.3,1.2,.4,1)}',
    '#am-res .go{position:absolute;right:28px;bottom:16px;height:56px;padding:0 34px;border:0;transform:skewX(-10deg);background:linear-gradient(135deg,#7EF0FF,#22D3EE 55%,#0EA5C0);box-shadow:0 5px 0 #0E8FA3;color:#0B0B14;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-style:italic;font-size:26px;letter-spacing:2px;cursor:pointer;animation:amResUp .4s 1.6s both}',
    '#am-res .go span{display:inline-block;transform:skewX(10deg)}',
    '#am-res .spark{position:absolute;width:8px;height:8px;border-radius:2px;pointer-events:none;animation:amResSpark 1.3s ease-out forwards}',
    '@keyframes amResSpark{from{transform:translate(0,0) rotate(0);opacity:1}to{transform:translate(var(--dx),var(--dy)) rotate(540deg);opacity:0}}'
  ].join('\n');
  document.head.appendChild(css);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

  function show(S, onClose) {
    var stage = document.getElementById('stage');
    if (!stage || !S) { if (onClose) onClose(); return; }
    var old = document.getElementById('am-res'); if (old) old.remove();
    var col = S.won ? ['#22D3EE', '#0F3A4A', '#22D3EE22'] : S.lost ? ['#FF5C5C', '#3A1420', '#FF5C5C18'] : ['#F4F4FA', '#25254A', '#ffffff14'];
    var G = window.AMGear, P = function (k) { return G ? G.prize(k) : ''; };
    var nextM = (S.milestones || []).find(function (m) { return !m.claimed; });
    var readyM = (S.milestones || []).filter(function (m) { return m.reached && !m.claimed; }).length;
    var weekText = readyM ? '¡Tienes ' + (readyM === 1 ? 'un premio' : readyM + ' premios') + ' en la Tienda!' : nextM ? 'Te ' + (nextM.at - S.weekAfter === 1 ? 'falta 1 victoria' : 'faltan ' + (nextM.at - S.weekAfter) + ' victorias') + ' para: ' + nextM.name : '¡Has completado la semana!';
    var el = document.createElement('div'); el.id = 'am-res';
    el.style.setProperty('--rc', col[0]); el.style.setProperty('--rc2', col[1]); el.style.setProperty('--rc3', col[2]);
    var dots = ''; for (var i = 1; i <= 10; i++) dots += '<i data-n="' + i + '" class="' + ((S.milestones || []).some(function (m) { return m.at === i; }) ? 'm' : '') + '"></i>';
    el.innerHTML =
      '<div class="bg"></div><div class="rays"></div>' +
      '<div class="k">FINAL DEL PARTIDO</div>' +
      '<div class="t">' + (S.won ? '¡VICTORIA!' : S.lost ? 'DERROTA' : 'EMPATE') + '</div>' +
      '<div class="sc">' + S.home + ' – ' + S.away + '</div>' +
      '<div class="row">' +
        '<div class="pn" style="--pc:#22D3EE;animation-delay:.25s"><div class="h">EXPERIENCIA</div><div class="lv">' + S.before.level + '</div>' +
          '<div class="xpls" style="display:flex;flex-direction:column;gap:4px;margin-top:10px;margin-right:52px">' +
          S.xpLines.map(function (l) { return '<div class="xpl"><span>' + esc(l.label) + '</span><b>+' + l.xp + '</b></div>'; }).join('') + '</div>' +
          '<div class="bl"><span class="lvl">NIVEL ' + S.before.level + '</span><span class="xpn">+0 XP</span></div><div class="bar"><i></i></div><div class="lvup"></div></div>' +
        '<div class="pn" style="--pc:#FFC53D;animation-delay:.4s;flex:.8"><div class="h">CARRASCOS</div><img class="pile" src="' + P(S.coinsGain + S.levelBonus > 60 ? 'coins:14' : 'coins:6') + '" alt=""><div class="cn"><b class="cv">' + fmt(S.coinsBefore) + '</b><span>+' + (S.coinsGain + S.levelBonus) + (S.levelBonus ? ' (incluye subida de nivel)' : '') + '</span></div>' +
          (S.pass ? '<div class="ps' + (S.pass.after > S.pass.before ? ' up' : '') + '"><b>PASE NV. ' + S.pass.after + '</b><i><u style="width:' + (S.pass.after >= 30 ? 100 : S.pass.into / S.pass.need * 100).toFixed(0) + '%"></u></i>' + (S.pass.ready ? '<span style="color:#FFC53D">' + S.pass.ready + ' 🎁</span>' : '') + '</div>' : '') + '</div>' +
        '<div class="pn" style="--pc:#A78BFA;animation-delay:.55s"><div class="h">ESTA SEMANA · ' + S.weekAfter + '/10 VICTORIAS</div>' +
          '<div class="dots">' + dots + '</div>' +
          '<div class="wk"><img src="' + (nextM ? P(nextM.icon + (nextM.reached ? ':open' : '')) : P('chest:legend:open')) + '" alt=""><span style="font-size:12px;font-weight:800;line-height:1.35;color:#CACAE0">' + esc(weekText) + '</span></div></div>' +
      '</div>' +
      '<div class="ms">' + (S.missions || []).map(function (m, i) {
        return '<div class="mi' + (m.done ? ' done' : '') + '" style="animation-delay:' + (1.1 + i * 0.12) + 's"><div class="tx"><span>' + esc(m.text) + '</span><span>' + (m.done ? '✓ +' + m.coins : m.have + '/' + m.n) + '</span></div><div class="pb"><i style="width:' + (m.was / m.n * 100) + '%" data-to="' + (m.have / m.n * 100) + '"></i></div></div>';
      }).join('') + '</div>' +
      '<button type="button" class="go"><span>CONTINUAR</span></button>';
    stage.appendChild(el);
    var q = function (s) { return el.querySelector(s); }, lines = el.querySelectorAll('.xpl');
    var t0 = performance.now(), raf = 0, xpShown = 0, lvShown = S.before.level, popped = {};
    var burst = function (x, y, n, colors) {
      for (var k = 0; k < n; k++) {
        var s = document.createElement('i'); s.className = 'spark';
        var a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
        s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.background = colors[k % colors.length];
        s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d - 30).toFixed(0) + 'px');
        el.appendChild(s); setTimeout(function (s) { return function () { s.remove(); }; }(s), 1400);
      }
    };
    if (S.won) setTimeout(function () { burst(422, 60, 40, ['#22D3EE', '#FFC53D', '#FF5C8A', '#53D88E', '#FFFFFF']); }, 350);
    var sfx = window.AMSfx;
    var step = function (now) {
      var t = (now - t0) / 1000;
      // experience lines arrive one by one, then the bar fills (rolling over on a level up)
      lines.forEach(function (l, i) { if (t > 0.6 + i * 0.22 && !l.classList.contains('on')) { l.classList.add('on'); if (sfx && sfx.tick) sfx.tick(); } });
      var tb = Math.max(0, Math.min(1, (t - 0.7 - lines.length * 0.22) / 1.1)), e = 1 - Math.pow(1 - tb, 3);
      var xpNow = Math.round(S.xpGain * e);
      if (xpNow !== xpShown) {
        xpShown = xpNow;
        var L = window.AMProgress.levelOf(window.AMProgress.xp() - S.xpGain + xpNow);
        q('.bar i').style.width = (L.pct * 100).toFixed(1) + '%';
        q('.xpn').textContent = '+' + xpNow + ' XP · ' + L.into + '/' + L.need;
        if (L.level !== lvShown) {
          lvShown = L.level;
          q('.lv').textContent = L.level; q('.lv').classList.remove('up'); void q('.lv').offsetWidth; q('.lv').classList.add('up');
          q('.lvl').textContent = 'NIVEL ' + L.level;
          var up = q('.lvup'); up.textContent = '¡NIVEL ' + L.level + '!  +100 carrascos'; up.classList.remove('on'); void up.offsetWidth; up.classList.add('on');
          burst(170, 200, 30, ['#FFC53D', '#22D3EE', '#FFFFFF']);
          if (sfx && sfx.levelUp) sfx.levelUp();
        }
      }
      // coins count up
      var tc = Math.max(0, Math.min(1, (t - 0.9) / 1.2)), ec = 1 - Math.pow(1 - tc, 2);
      q('.cv').textContent = fmt(Math.round(S.coinsBefore + (S.coinsGain + S.levelBonus) * ec));
      if (tc > 0 && tc < 1 && sfx && sfx.coin && Math.random() < 0.25) sfx.coin();
      // the weekly dots light up to this week's wins, the new one in gold
      if (t > 1.2 && !popped.week) {
        popped.week = 1;
        el.querySelectorAll('.dots i').forEach(function (d) { var n = +d.getAttribute('data-n'); if (n <= S.weekAfter) d.classList.add(n > S.weekBefore ? 'new' : 'on'); });
      }
      if (t > 1.5 && !popped.miss) {
        popped.miss = 1;
        el.querySelectorAll('.mi .pb i').forEach(function (b) { b.style.width = b.getAttribute('data-to') + '%'; });
      }
      if (t < 4) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    q('.go').addEventListener('click', function () {
      cancelAnimationFrame(raf);
      el.classList.add('out');
      setTimeout(function () { el.remove(); if (onClose) onClose(); }, 280);
    });
  }
  /* ---------- opening a prize: the chest drops in, shakes, bursts open and shows what was inside ---------- */
  var css2 = document.createElement('style');
  css2.textContent = [
    '#am-rw{position:absolute;inset:0;z-index:62;overflow:hidden;font-family:Exo2,sans-serif;color:#F4F4FA;background:radial-gradient(60% 80% at 50% 45%,#2A1E5A 0%,#0B0B1A 60%,#05050A 100%);animation:amResIn .3s both;cursor:pointer}',
    '#am-rw .rays{position:absolute;left:50%;top:50%;width:1100px;height:1100px;margin:-550px 0 0 -550px;background:repeating-conic-gradient(from 0deg,#FFC53D22 0deg 7deg,transparent 7deg 20deg);animation:amResSpin 18s linear infinite;opacity:0;transition:opacity .4s;mask:radial-gradient(closest-side,#000 15%,transparent 70%);-webkit-mask:radial-gradient(closest-side,#000 15%,transparent 70%)}',
    '#am-rw.open .rays{opacity:1}',
    '#am-rw .ch{position:absolute;left:50%;top:50%;width:230px;height:230px;margin:-150px 0 0 -115px;object-fit:contain;filter:drop-shadow(0 18px 20px #000c);animation:amRwDrop .6s cubic-bezier(.3,1.6,.5,1) both}',
    '@keyframes amRwDrop{from{transform:translateY(-320px) scale(.6)}to{transform:none}}',
    '#am-rw .ch.s1{animation:amRwShake .32s ease-in-out}#am-rw .ch.s2{animation:amRwShake2 .32s ease-in-out}#am-rw .ch.s3{animation:amRwShake3 .4s ease-in-out}',
    '@keyframes amRwShake{0%,100%{transform:none}30%{transform:rotate(-6deg) scale(1.04)}70%{transform:rotate(6deg) scale(1.04)}}',
    '@keyframes amRwShake2{0%,100%{transform:none}25%{transform:rotate(-10deg) scale(1.08)}50%{transform:rotate(9deg) scale(1.1)}75%{transform:rotate(-7deg) scale(1.08)}}',
    '@keyframes amRwShake3{0%,100%{transform:none}20%{transform:rotate(-13deg) scale(1.12) translateY(-10px)}40%{transform:rotate(12deg) scale(1.16) translateY(-16px)}60%{transform:rotate(-10deg) scale(1.18)}80%{transform:rotate(8deg) scale(1.14)}}',
    '#am-rw.open .ch{animation:amRwOpen .5s cubic-bezier(.2,1.6,.4,1) both;margin-top:-190px;width:190px;height:190px;margin-left:-95px}',
    '@keyframes amRwOpen{from{transform:scale(1.4)}to{transform:none}}',
    '#am-rw .fl{position:absolute;inset:0;background:#FFF;opacity:0;pointer-events:none}#am-rw.open .fl{animation:amRwFlash .5s ease-out}@keyframes amRwFlash{0%{opacity:.9}100%{opacity:0}}',
    '#am-rw .tap{position:absolute;left:0;right:0;bottom:48px;text-align:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-style:italic;font-size:24px;letter-spacing:2px;color:#FFE38A;animation:amRwTap 1s ease-in-out infinite}',
    '@keyframes amRwTap{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}',
    '#am-rw.open .tap{display:none}',
    '#am-rw .k{position:absolute;left:0;right:0;top:22px;text-align:center;font-size:12px;font-weight:800;letter-spacing:4px;color:#C4B5FD}',
    '#am-rw .loot{position:absolute;left:0;right:0;top:162px;display:none;justify-content:center;gap:16px}#am-rw.open .loot{display:flex}',
    '#am-rw .it{width:150px;padding:10px 8px 12px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:4px;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);background:linear-gradient(160deg,#3A2A0A,#1E1A10);box-shadow:inset 0 0 0 2px #FFC53D;animation:amRwItem .5s cubic-bezier(.2,1.7,.4,1) both}',
    '#am-rw .it img{width:70px;height:70px;object-fit:contain;filter:drop-shadow(0 6px 8px #000a)}',
    '#am-rw .it b{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:22px;line-height:1;text-align:center}#am-rw .it span{font-size:10px;font-weight:800;letter-spacing:1.5px;color:#FFC53D}',
    '@keyframes amRwItem{from{opacity:0;transform:translateY(40px) scale(.5) rotate(-8deg)}to{opacity:1;transform:none}}',
    '#am-rw .ok{position:absolute;left:50%;bottom:12px;transform:translateX(-50%) skewX(-10deg);display:none;height:48px;padding:0 34px;border:0;background:linear-gradient(135deg,#7EF0FF,#22D3EE 55%,#0EA5C0);box-shadow:0 5px 0 #0E8FA3;color:#0B0B14;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-style:italic;font-size:22px;letter-spacing:2px;cursor:pointer}',
    '#am-rw.open .ok{display:block;animation:amResUp .4s .5s both}'
  ].join('\n');
  document.head.appendChild(css2);
  function reward(r, onClose) {
    var stage = document.getElementById('stage');
    if (!stage || !r) { if (onClose) onClose(); return; }
    var m = r.milestone || {}, G = window.AMGear, P = function (k) { return G ? G.prize(k) : ''; }, sfx = window.AMSfx;
    var isChest = m.prize === 'chest';
    var el = document.createElement('div'); el.id = 'am-rw';
    var loot = (r.items || []).map(function (it) { return '<div class="it"><img src="' + it.pic + '" alt=""><span>¡NUEVO!</span><b>' + esc(it.name) + '</b></div>'; });
    if (r.coins) loot.push('<div class="it" style="animation-delay:.12s"><img src="' + P(r.coins >= 300 ? 'coins:14' : 'coins:6') + '" alt=""><span>CARRASCOS</span><b>+' + r.coins + '</b></div>');
    el.innerHTML = '<div class="rays"></div><div class="k">' + esc((m.name || 'PREMIO').toUpperCase()) + '</div>' +
      '<img class="ch" src="' + (isChest ? P('chest:' + m.chest) : (m.pic || P(m.icon))) + '" alt="">' +
      '<div class="fl"></div><div class="tap">' + (isChest ? '¡TOCA PARA ABRIR!' : '¡TOCA PARA RECOGER!') + '</div>' +
      '<div class="loot">' + loot.join('') + '</div><button type="button" class="ok">' + (r.items && r.items.length ? 'GENIAL' : 'RECOGER') + '</button>';
    stage.appendChild(el);
    var ch = el.querySelector('.ch'), taps = 0, opened = false;
    var open = function () {
      if (opened) return; opened = true;
      if (isChest) ch.src = P('chest:' + m.chest + ':open');
      el.classList.add('open');
      if (sfx && sfx.chest) sfx.chest();
      // confetti
      for (var k = 0; k < 46; k++) {
        var s = document.createElement('i'); s.className = 'spark';
        var a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 220;
        s.style.cssText = 'position:absolute;left:422px;top:150px;width:9px;height:9px;border-radius:2px;pointer-events:none;background:' + ['#22D3EE', '#FFC53D', '#FF5C8A', '#53D88E', '#A78BFA', '#FFFFFF'][k % 6] + ';animation:amResSpark 1.4s ease-out forwards';
        s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d * 0.7 - 40).toFixed(0) + 'px');
        el.appendChild(s);
      }
    };
    // a chest needs three taps (it shakes harder each time); it also opens by itself if you wait
    var auto = setTimeout(open, 3200);
    el.addEventListener('click', function (e) {
      if (e.target.classList.contains('ok')) {
        clearTimeout(auto);
        el.classList.add('out'); el.style.animation = 'amResOut .3s ease-in both';
        setTimeout(function () { el.remove(); if (onClose) onClose(); }, 280);
        return;
      }
      if (opened) return;
      if (!isChest) { open(); return; }
      taps++;
      ch.className = 'ch'; void ch.offsetWidth; ch.className = 'ch s' + Math.min(3, taps);
      if (sfx && sfx.thud) sfx.thud(taps);
      if (taps >= 3) setTimeout(open, 380);
    });
  }
  window.AMResults = { show: show, reward: reward };
})();
