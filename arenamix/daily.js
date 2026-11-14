/* ARENA MIX daily login rewards: a 7-day calendar that pops up over the home screen the first time you open
   it each day. Rewards grow day by day; missing a day starts the week again. Day 7 is a legendary chest. */
(function () {
  var KEY = 'arenamix.daily.v1';
  var DAYS = [
    { coins: 100, label: '100 VCD', pic: 'coins:6' },
    { coins: 150, label: '150 VCD', pic: 'coins:6' },
    { gems: 5, label: '5 BOB', pic: 'gems:1' },
    { coins: 250, label: '250 VCD', pic: 'coins:14' },
    { gems: 10, label: '10 BOB', pic: 'gems:2' },
    { coins: 400, label: '400 VCD', pic: 'coins:14' },
    { coins: 600, gems: 25, label: 'COFRE ÉPICO', pic: 'chest:legend', chest: true }
  ];
  function get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { last: '', idx: 0 }; } catch (e) { return { last: '', idx: 0 }; } }
  function put(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function today(off) { var d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  // which day of the week you are on today (0..6), and whether it is still to collect
  function state() {
    var S = get(), t = today(), y = today(-1);
    if (S.last === t) return { idx: S.idx, ready: false };
    var idx = S.last === y ? (S.idx + 1) % 7 : 0;
    return { idx: idx, ready: true };
  }
  var css = document.createElement('style');
  css.textContent = [
    '#am-daily{position:absolute;inset:0;z-index:58;display:flex;align-items:center;justify-content:center;background:#04020FCC;font-family:Exo2,sans-serif;color:#fff;animation:dlIn .3s both}',
    '@keyframes dlIn{from{opacity:0}}#am-daily.out{animation:dlOut .3s both}@keyframes dlOut{to{opacity:0}}',
    '#am-daily .bx{position:relative;width:680px;padding:18px 20px 16px;box-sizing:border-box;border-radius:24px;background:radial-gradient(80% 60% at 50% 0%,#7C3AEDAA,transparent 70%),linear-gradient(165deg,#3B1A8A,#1A0B44);box-shadow:inset 0 0 0 1.5px #C4B5FD,0 0 40px #7C3AED88,0 20px 50px #000a;animation:dlPop .45s cubic-bezier(.2,1.5,.4,1) both}',
    '@keyframes dlPop{from{transform:scale(.7) translateY(30px);opacity:0}}',
    '#am-daily h2{margin:0;text-align:center;font:800 italic 34px/1 "Barlow Condensed",sans-serif;letter-spacing:1.5px;background:linear-gradient(180deg,#fff,#FDE68A);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #0D0418)}',
    '#am-daily .sub{text-align:center;font-size:11.5px;font-weight:700;color:#E9D5FF;margin:4px 0 14px}',
    '#am-daily .row{display:flex;gap:8px}',
    '#am-daily .d{position:relative;flex:1;height:120px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:7px 4px 8px;box-sizing:border-box;background:linear-gradient(170deg,#4C1D95,#2A1070);box-shadow:inset 0 0 0 1px #A78BFA88}',
    '#am-daily .d b{font:800 10px Exo2,sans-serif;letter-spacing:1px;color:#DDD6FE}',
    '#am-daily .d img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 4px 5px #000a)}',
    '#am-daily .d span{font:800 11px Exo2,sans-serif;white-space:nowrap}',
    '#am-daily .d.got{opacity:.55}#am-daily .d.got::after{content:"✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 40px Exo2;color:#4ADE80;text-shadow:0 0 12px #4ADE80}',
    '#am-daily .d.now{background:linear-gradient(170deg,#F59E0B,#B45309);box-shadow:inset 0 0 0 2px #FDE68A,0 0 20px #FBBF24;animation:dlNow 1.4s ease-in-out infinite}',
    '@keyframes dlNow{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '#am-daily .d.big{flex:1.5;background:linear-gradient(170deg,#DB2777,#7E22CE)}#am-daily .d.big.now{background:linear-gradient(170deg,#FBBF24,#DB2777)}',
    '#am-daily .go{display:block;margin:16px auto 0;height:50px;padding:0 44px;border:0;border-radius:16px;background:linear-gradient(135deg,#FDE68A,#FBBF24 50%,#F97316);color:#2A1400;font:800 italic 24px "Barlow Condensed",sans-serif;letter-spacing:1px;cursor:pointer;box-shadow:inset 0 2px 0 #fff8,0 5px 0 #92400E,0 0 22px #FBBF2488}',
    '#am-daily .go:active{transform:translateY(3px)}',
    // ---- the redesign: frosted night-blue glass, gold for today, day 7 a legendary chest ----
    '#am-daily{background:radial-gradient(60% 70% at 50% 45%,#0A3DCC55,transparent 70%),#02040CD9!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
    '#am-daily .bx{width:700px!important;border-radius:26px!important;background:radial-gradient(90% 50% at 50% 0%,#1E8BFF44,transparent 70%),linear-gradient(170deg,#0B1A44F2,#02040CF7 70%)!important;box-shadow:inset 0 0 0 1.5px #3DA9FF88,inset 0 1px 0 #ffffff33,0 24px 60px #000c,0 0 50px #1E8BFF44!important;animation:dlBx .5s cubic-bezier(.2,1.4,.4,1) both}',
    '@keyframes dlBx{from{opacity:0;transform:scale(.85) translateY(20px)}}',
    '#am-daily h2{font:400 32px/1 Titulos,sans-serif!important;font-style:normal!important;background:linear-gradient(180deg,#FFFFFF,#FFE7A3 50%,#FFC53D)!important;-webkit-background-clip:text!important;background-clip:text!important}',
    '#am-daily .sub{color:#9FC3F0!important;font:400 10px Titulos,sans-serif!important;letter-spacing:2px;margin:6px 0 14px!important}',
    '#am-daily .d{border-radius:16px!important;background:radial-gradient(90% 50% at 50% 0%,#1E8BFF2e,transparent 70%),linear-gradient(170deg,#0B1A44,#040A1C)!important;box-shadow:inset 0 0 0 1px #3DA9FF55,inset 0 1px 0 #ffffff22!important;animation:dlD .45s cubic-bezier(.2,1.4,.4,1) both}',
    '#am-daily .d:nth-child(1){animation-delay:.05s}#am-daily .d:nth-child(2){animation-delay:.1s}#am-daily .d:nth-child(3){animation-delay:.15s}#am-daily .d:nth-child(4){animation-delay:.2s}#am-daily .d:nth-child(5){animation-delay:.25s}#am-daily .d:nth-child(6){animation-delay:.3s}#am-daily .d:nth-child(7){animation-delay:.35s}',
    '@keyframes dlD{from{opacity:0;transform:translateY(16px) scale(.9)}}',
    '#am-daily .d b{font:400 9px Titulos,sans-serif!important;letter-spacing:1.5px!important;color:#7CC4FF!important}',
    '#am-daily .d span{font:400 10px Titulos,sans-serif!important;letter-spacing:.5px;color:#E6F2FF}',
    '#am-daily .d.got{opacity:.6}#am-daily .d.got::after{content:"";background:radial-gradient(circle,#22C55E 0 17px,transparent 18px) center/100% no-repeat;font-size:0!important}',
    '#am-daily .d.got::before{content:"✓";position:absolute;inset:0;z-index:2;display:flex;align-items:center;justify-content:center;font:900 22px Exo2;color:#02240F}',
    '#am-daily .d.now{background:radial-gradient(90% 60% at 50% 0%,#FFFFFF55,transparent 60%),linear-gradient(170deg,#FFD34D,#F59E0B 60%,#B45309)!important;box-shadow:inset 0 0 0 2px #FFF1B8,0 0 24px #FFC53DAA!important;overflow:hidden}',
    '#am-daily .d.now b,#am-daily .d.now span{color:#2A1400!important}',
    '#am-daily .d.now::before{content:"";position:absolute;top:-30%;bottom:-30%;left:0;width:40%;background:linear-gradient(100deg,transparent,#ffffffaa,transparent);transform:translateX(-200%) skewX(-18deg);animation:dlShine 2.2s ease-in-out infinite}',
    '@keyframes dlShine{0%,40%{transform:translateX(-200%) skewX(-18deg)}100%{transform:translateX(400%) skewX(-18deg)}}',
    '#am-daily .d.big{background:radial-gradient(70% 60% at 50% 30%,#FFC53D55,transparent 70%),conic-gradient(from 0deg at 50% 45%,#FFC53D22 0 10deg,transparent 10deg 30deg,#FFC53D22 30deg 40deg,transparent 40deg 60deg,#FFC53D22 60deg 70deg,transparent 70deg 90deg),linear-gradient(170deg,#0A3DCC,#06102E)!important;box-shadow:inset 0 0 0 2px #FFC53D,0 0 20px #FFC53D66!important}',
    '#am-daily .d.big img{width:66px!important;height:66px!important;animation:dlChest 2s ease-in-out infinite}',
    '@keyframes dlChest{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-4px) rotate(3deg)}}',
    '#am-daily .d.big.now{background:radial-gradient(90% 60% at 50% 0%,#FFFFFF66,transparent 60%),linear-gradient(170deg,#FFD34D,#F59E0B 60%,#B45309)!important}',
    '#am-daily .go{border-radius:18px!important;font:400 22px Titulos,sans-serif!important;font-style:normal!important;letter-spacing:2px!important;background:linear-gradient(180deg,#FFF0B0,#FFD34D 30%,#FFB020 70%,#F59E0B)!important;box-shadow:inset 0 2px 0 #ffffffcc,inset 0 -4px 0 #B7791F,0 6px 0 #7A4E0E,0 10px 26px #FFB02066!important}',
    // collecting: today pops and bursts before the window closes
    '#am-daily .d.claim{animation:dlClaim .6s cubic-bezier(.2,1.6,.4,1) both!important;z-index:3}',
    '@keyframes dlClaim{0%{transform:scale(1)}35%{transform:scale(1.25) rotate(-4deg);filter:brightness(1.6)}100%{transform:scale(1.1);filter:brightness(1.2)}}',
    '#am-daily .burst{position:absolute;width:10px;height:10px;border-radius:50%;pointer-events:none;animation:dlBurst .7s ease-out forwards}',
    '@keyframes dlBurst{to{transform:translate(var(--bx),var(--by)) scale(.3);opacity:0}}'
  ].join('\n');
  document.head.appendChild(css);
  function show(force) {
    var st = state(), stage = document.getElementById('stage');
    if (!stage || (!st.ready && !force) || document.getElementById('am-daily')) return;
    var G = window.AMGear, P = function (k) { try { return G ? G.prize(k) : ''; } catch (e) { return ''; } };
    var el = document.createElement('div'); el.id = 'am-daily';
    el.innerHTML = '<div class="bx"><h2>RECOMPENSA DIARIA</h2><div class="sub">VUELVE CADA DÍA · LOS PREMIOS CRECEN</div><div class="row">' +
      DAYS.map(function (d, i) { return '<div class="d' + (i < st.idx ? ' got' : '') + (i === st.idx && st.ready ? ' now' : '') + (i === 6 ? ' big' : '') + '"><b>DÍA ' + (i + 1) + '</b><img src="' + P(d.pic) + '" alt=""><span>' + d.label + '</span></div>'; }).join('') +
      '</div><button type="button" class="go">' + (st.ready ? '¡RECOGER!' : 'VUELVE MAÑANA') + '</button></div>';
    stage.appendChild(el);
    el.querySelector('.go').addEventListener('click', function () {
      var close = function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 280); };
      if (!st.ready) { close(); return; }
      var d = DAYS[st.idx], PR = window.AMProgress;
      put({ last: today(), idx: st.idx });
      // today's card pops and throws sparks, then the window goes
      var now = el.querySelector('.d.now');
      if (now) {
        now.classList.add('claim');
        var r = now.getBoundingClientRect(), br = el.getBoundingClientRect(), sc = br.width / el.offsetWidth || 1;
        for (var k = 0; k < 14; k++) { var sp = document.createElement('i'); sp.className = 'burst'; var a2 = k / 14 * Math.PI * 2, dd = 60 + (k % 3) * 22; sp.style.cssText = 'left:' + ((r.left - br.left) / sc + r.width / sc / 2) + 'px;top:' + ((r.top - br.top) / sc + r.height / sc / 2) + 'px;background:' + ['#FFC53D', '#3DA9FF', '#FFFFFF'][k % 3] + ';--bx:' + (Math.cos(a2) * dd).toFixed(0) + 'px;--by:' + (Math.sin(a2) * dd).toFixed(0) + 'px'; el.appendChild(sp); }
        if (window.AMSfx && window.AMSfx.coin) try { window.AMSfx.coin(); } catch (e) {}
      }
      setTimeout(close, now ? 650 : 0);
      if (d.chest && window.AMResults) {
        if (PR) { PR.addCoins(d.coins); PR.addGems(d.gems); }
        window.AMResults.reward({ milestone: { prize: 'chest', chest: 'legend', name: 'Día 7 · cofre épico' }, coins: d.coins, gems: d.gems, items: [] });
      } else if (PR) { setTimeout(function () { if (d.coins) PR.addCoins(d.coins); if (d.gems) PR.addGems(d.gems); }, 320); }
    });
  }
  var check = function () { if (/^#\/Deportes\b/.test(location.hash)) setTimeout(function () { if (/^#\/Deportes\b/.test(location.hash)) show(false); }, 1600); };
  window.addEventListener('hashchange', check);
  window.addEventListener('load', check);
  window.AMDaily = { show: show, state: state };
})();
