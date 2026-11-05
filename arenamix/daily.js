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
    '#am-daily .go:active{transform:translateY(3px)}'
  ].join('\n');
  document.head.appendChild(css);
  function show(force) {
    var st = state(), stage = document.getElementById('stage');
    if (!stage || (!st.ready && !force) || document.getElementById('am-daily')) return;
    var G = window.AMGear, P = function (k) { try { return G ? G.prize(k) : ''; } catch (e) { return ''; } };
    var el = document.createElement('div'); el.id = 'am-daily';
    el.innerHTML = '<div class="bx"><h2>RECOMPENSA DIARIA</h2><div class="sub">Entra cada día: los premios crecen. Si fallas un día, la semana vuelve a empezar.</div><div class="row">' +
      DAYS.map(function (d, i) { return '<div class="d' + (i < st.idx ? ' got' : '') + (i === st.idx && st.ready ? ' now' : '') + (i === 6 ? ' big' : '') + '"><b>DÍA ' + (i + 1) + '</b><img src="' + P(d.pic) + '" alt=""><span>' + d.label + '</span></div>'; }).join('') +
      '</div><button type="button" class="go">' + (st.ready ? '¡RECOGER!' : 'VUELVE MAÑANA') + '</button></div>';
    stage.appendChild(el);
    el.querySelector('.go').addEventListener('click', function () {
      var close = function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 280); };
      if (!st.ready) { close(); return; }
      var d = DAYS[st.idx], PR = window.AMProgress;
      put({ last: today(), idx: st.idx });
      close();
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
