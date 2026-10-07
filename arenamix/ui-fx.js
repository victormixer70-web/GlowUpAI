/* ARENA MIX interface motion: a diagonal wipe in the brand colours between screens, the new screen
   swinging in with its buttons and cards popping in one after another, buttons that squash when pressed
   and spring back with a burst of light, and tab content sliding in from the side of the chosen tab.
   It works on every screen from the outside (no screen code changes) and stays out of the matches. */
(function () {
  var stage = document.getElementById('stage');
  if (!stage || !window.matchMedia) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GAME = /^#\/(Partido|Duelo|Baloncesto|Tenis|Voley)\b/;
  var inGame = function () { return GAME.test(location.hash); };

  var css = document.createElement('style');
  css.textContent = [
    // screen transitions: several styles, picked at random each time (all quick)
    '#fx-wipe{position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden;display:none}',
    '#fx-wipe.go{display:block}',
    '#fx-wipe i{position:absolute;display:block}',
    // 1 diagonal bands
    '#fx-wipe.diag i{top:-20%;bottom:-20%;left:0;width:140%;transform:translateX(-120%) skewX(-18deg);animation:fxDiag .42s cubic-bezier(.7,0,.3,1) both}',
    '#fx-wipe.diag.back i{animation-name:fxDiagB}',
    '#fx-wipe.diag i:nth-child(2){animation-delay:.03s}#fx-wipe.diag i:nth-child(3){animation-delay:.06s}',
    '@keyframes fxDiag{0%{transform:translateX(-120%) skewX(-18deg)}45%,55%{transform:translateX(-15%) skewX(-18deg)}100%{transform:translateX(110%) skewX(-18deg)}}',
    '@keyframes fxDiagB{0%{transform:translateX(110%) skewX(-18deg)}45%,55%{transform:translateX(-15%) skewX(-18deg)}100%{transform:translateX(-120%) skewX(-18deg)}}',
    // 2 iris: a circle grows from where you tapped, then opens from the centre
    '#fx-wipe.iris i{inset:0;clip-path:circle(0 at var(--fx-x,50%) var(--fx-y,50%));animation:fxIris .44s cubic-bezier(.6,0,.3,1) both}',
    '#fx-wipe.iris i:nth-child(2){animation-delay:.04s}#fx-wipe.iris i:nth-child(3){animation-delay:.08s}',
    '@keyframes fxIris{0%{clip-path:circle(0 at var(--fx-x,50%) var(--fx-y,50%))}50%{clip-path:circle(150% at var(--fx-x,50%) var(--fx-y,50%))}100%{clip-path:circle(150% at var(--fx-x,50%) var(--fx-y,50%));opacity:0}}',
    // 3 blinds: vertical strips flip in and out one after another
    '#fx-wipe.blinds i{top:0;bottom:0;transform:scaleY(0);transform-origin:top;animation:fxBlind .4s cubic-bezier(.6,0,.3,1) both}',
    '@keyframes fxBlind{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}',
    // 4 shutter: two halves close in the middle with a flash line, then open
    '#fx-wipe.shutter i{left:0;right:0;height:51%;animation:fxShutT .4s cubic-bezier(.7,0,.3,1) both}',
    '#fx-wipe.shutter i:nth-child(1){top:0;transform:translateY(-100%)}',
    '#fx-wipe.shutter i:nth-child(2){bottom:0;transform:translateY(100%);animation-name:fxShutB}',
    '#fx-wipe.shutter i:nth-child(3){top:50%;height:3px;margin-top:-1px;transform:scaleX(0);animation-name:fxShutL}',
    '@keyframes fxShutT{0%{transform:translateY(-100%)}45%,55%{transform:translateY(0)}100%{transform:translateY(-100%)}}',
    '@keyframes fxShutB{0%{transform:translateY(100%)}45%,55%{transform:translateY(0)}100%{transform:translateY(100%)}}',
    '@keyframes fxShutL{0%,35%{transform:scaleX(0);opacity:1}50%{transform:scaleX(1);opacity:1}100%{transform:scaleX(1);opacity:0}}',
    // 5 zoom: a bright burst from the centre
    '#fx-wipe.burst i{left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;animation:fxBurst .42s cubic-bezier(.5,0,.3,1) both}',
    '#fx-wipe.burst i:nth-child(2){animation-delay:.04s}#fx-wipe.burst i:nth-child(3){animation-delay:.08s}',
    '@keyframes fxBurst{0%{transform:scale(0);opacity:1}55%{transform:scale(30);opacity:1}100%{transform:scale(30);opacity:0}}',
    // the new screen comes in a different way too
    '.fx-screen{animation:fxScrR .38s cubic-bezier(.2,1.25,.35,1) both}',
    '.fx-screen.back{animation-name:fxScrL}',
    '.fx-screen.v1{animation-name:fxScrZoom}.fx-screen.v2{animation-name:fxScrUp}.fx-screen.v3{animation-name:fxScrTilt}',
    '@keyframes fxScrR{from{opacity:0;translate:46px 0;scale:.96}to{opacity:1;translate:0 0;scale:1}}',
    '@keyframes fxScrL{from{opacity:0;translate:-46px 0;scale:.96}to{opacity:1;translate:0 0;scale:1}}',
    '@keyframes fxScrZoom{from{opacity:0;scale:1.12}to{opacity:1;scale:1}}',
    '@keyframes fxScrUp{from{opacity:0;translate:0 40px}to{opacity:1;translate:0 0}}',
    '@keyframes fxScrTilt{from{opacity:0;transform:perspective(900px) rotateX(18deg) translateY(30px)}to{opacity:1;transform:none}}',
    '.fx-pop{animation:fxPop .38s cubic-bezier(.2,1.6,.4,1) both}',
    '.fx-pop.p1{animation-name:fxPopL}.fx-pop.p2{animation-name:fxPopZ}',
    '@keyframes fxPop{from{opacity:0;translate:0 16px;scale:.86}to{opacity:1;translate:0 0;scale:1}}',
    '@keyframes fxPopL{from{opacity:0;translate:-22px 0}to{opacity:1;translate:0 0}}',
    '@keyframes fxPopZ{from{opacity:0;scale:.5}to{opacity:1;scale:1}}',
    '.fx-slide{animation:fxSlide .3s cubic-bezier(.2,1.25,.35,1) both}',
    '@keyframes fxSlide{from{opacity:0;translate:var(--fx-dx,30px) 0}to{opacity:1;translate:0 0}}',
    // buttons: squash on press, spring back on release
    '.fx-btn{transition:scale .32s cubic-bezier(.3,2,.5,1),filter .2s}',
    '.fx-btn.fx-down{scale:.9;transition:scale .08s ease-out;filter:brightness(1.15)}',
    // light burst where you touched
    '#fx-layer{position:absolute;inset:0;z-index:39;pointer-events:none;overflow:hidden}',
    '.fx-ring{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #22D3EE;box-shadow:0 0 14px #22D3EE;animation:fxRing .5s ease-out forwards}',
    '.fx-spark{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#FFC53D;box-shadow:0 0 8px #FFC53D;animation:fxSpark .45s ease-out forwards}',
    '@keyframes fxRing{from{opacity:.95;scale:.4}to{opacity:0;scale:4.2}}',
    '@keyframes fxSpark{from{opacity:1;translate:0 0}to{opacity:0;translate:var(--sx) var(--sy)}}'
  ].join('\n');
  document.head.appendChild(css);
  if (reduce) return;

  var wipe = document.createElement('div'); wipe.id = 'fx-wipe';
  // each style: its pieces and their colours (cyan, yellow, dark)
  var STYLES = {
    diag: ['#22D3EE', '#FFC53D', '#0B0B14'],
    iris: ['#22D3EE', '#FFC53D', '#0B0B14'],
    blinds: null,
    shutter: ['#0B0B14', '#0B0B14', '#22D3EE'],
    burst: ['#FFC53D', '#22D3EE', '#0B0B14']
  };
  var lastStyle = '', lastTap = { x: 422, y: 195 };
  var playWipe = function () {
    var names = Object.keys(STYLES).filter(function (n) { return n !== lastStyle; });
    var st = names[Math.floor(Math.random() * names.length)]; lastStyle = st;
    var html = '';
    if (st === 'blinds') {
      for (var k = 0; k < 7; k++) html += '<i style="left:' + (k * 100 / 7).toFixed(3) + '%;width:' + (100 / 7 + 0.3).toFixed(3) + '%;background:' + (k % 2 ? '#FFC53D' : '#22D3EE') + ';animation-delay:' + (k * 0.022).toFixed(3) + 's"></i>';
    } else STYLES[st].forEach(function (c) { html += '<i style="background:' + c + '"></i>'; });
    wipe.innerHTML = html;
    wipe.style.setProperty('--fx-x', (lastTap.x / 844 * 100).toFixed(1) + '%'); wipe.style.setProperty('--fx-y', (lastTap.y / 390 * 100).toFixed(1) + '%');
    wipe.className = ''; void wipe.offsetWidth; wipe.className = 'go ' + st + (back ? ' back' : '');
    clearTimeout(playWipe.t); playWipe.t = setTimeout(function () { wipe.className = ''; }, 700);
  };
  var layer = document.createElement('div'); layer.id = 'fx-layer';
  var mountFx = function () { if (!wipe.parentNode) stage.appendChild(wipe); if (!layer.parentNode) stage.appendChild(layer); };

  // ---- screen changes: wipe across, then the new screen and its controls come in ----
  var history = [location.hash], back = false;
  window.addEventListener('hashchange', function () {
    var i = history.lastIndexOf(location.hash);
    back = i >= 0 && i === history.length - 2;
    if (back) history.pop(); else history.push(location.hash);
    if (history.length > 30) history.shift();
    mountFx();
    playWipe();
  });
  var lastRoot = null;
  var enter = function (root) {
    if (!root || root === lastRoot || root.id === 'fx-wipe' || root.id === 'fx-layer') return;
    lastRoot = root;
    mountFx();
    if (inGame()) return;
    root.classList.remove('fx-screen', 'back', 'v1', 'v2', 'v3'); void root.offsetWidth;
    root.classList.add('fx-screen');
    if (back) root.classList.add('back'); else { var v = Math.floor(Math.random() * 4); if (v) root.classList.add('v' + v); }
    var pv = Math.floor(Math.random() * 3);
    // its buttons and cards pop in one after another
    var items = root.querySelectorAll('a[href], button, [role="tab"], [role="button"], [role="listitem"], [role="option"]');
    var n = 0;
    for (var k = 0; k < items.length && n < 28; k++) {
      var el = items[k];
      if (!el.offsetParent) continue;
      el.classList.remove('fx-pop', 'p1', 'p2'); el.style.animationDelay = (0.08 + n * 0.022).toFixed(3) + 's'; el.classList.add('fx-pop'); if (pv) el.classList.add('p' + pv);
      n++;
    }
    setTimeout(function () { for (var q = 0; q < items.length; q++) { items[q].classList.remove('fx-pop', 'p1', 'p2'); items[q].style.animationDelay = ''; } }, 1200);
  };
  new MutationObserver(function () {
    var r = null;
    for (var c = stage.firstElementChild; c; c = c.nextElementSibling) if (c.id !== 'fx-wipe' && c.id !== 'fx-layer') { r = c; break; }
    if (r) enter(r);
  }).observe(stage, { childList: true });

  // ---- presses: squash and spring back, a burst of light; new content after a press slides or pops in ----
  var pressable = 'button, a[href], [role="tab"], [role="button"], [role="option"], [role="menuitem"]';
  var down = null, slideDir = 0, watchUntil = 0;
  var stageXY = function (e) {
    var r = stage.getBoundingClientRect(), s = r.width / 844;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  var burst = function (p) {
    mountFx();
    var ring = document.createElement('div'); ring.className = 'fx-ring'; ring.style.left = p.x + 'px'; ring.style.top = p.y + 'px'; layer.appendChild(ring);
    for (var k = 0; k < 6; k++) {
      var a = k / 6 * Math.PI * 2 + Math.random() * 0.5, d = 22 + Math.random() * 16, sp = document.createElement('div');
      sp.className = 'fx-spark'; sp.style.left = p.x + 'px'; sp.style.top = p.y + 'px';
      sp.style.setProperty('--sx', (Math.cos(a) * d).toFixed(1) + 'px'); sp.style.setProperty('--sy', (Math.sin(a) * d).toFixed(1) + 'px');
      layer.appendChild(sp);
    }
    setTimeout(function () { while (layer.firstChild) layer.removeChild(layer.firstChild); }, 600);
  };
  document.addEventListener('pointerdown', function (e) {
    if (inGame()) return;
    var el = e.target.closest && e.target.closest(pressable);
    if (!el || !stage.contains(el)) return;
    el.classList.add('fx-btn', 'fx-down'); down = el;
    lastTap = stageXY(e);
    burst(lastTap);
    // a tab: the new content comes in from the side of the tab you picked
    slideDir = 0;
    if (el.getAttribute('role') === 'tab') {
      var tabs = Array.prototype.slice.call((el.closest('[role="tablist"]') || el.parentNode).querySelectorAll('[role="tab"]'));
      var cur = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }), nx = tabs.indexOf(el);
      if (cur >= 0 && nx >= 0 && nx !== cur) slideDir = nx > cur ? 1 : -1;
    }
    watchUntil = performance.now() + 400;
  }, true);
  var up = function () { if (down) { down.classList.remove('fx-down'); down = null; } };
  document.addEventListener('pointerup', up, true);
  document.addEventListener('pointercancel', up, true);

  new MutationObserver(function (muts) {
    if (performance.now() > watchUntil || inGame()) return;
    var n = 0;
    muts.forEach(function (m) {
      if (m.target === stage) return;   // whole screens are handled above
      for (var k = 0; k < m.addedNodes.length && n < 16; k++) {
        var el = m.addedNodes[k];
        if (el.nodeType !== 1 || el.id === 'fx-layer' || el.closest('#fx-layer')) continue;
        if (slideDir) { el.style.setProperty('--fx-dx', (slideDir * 34) + 'px'); el.classList.remove('fx-slide'); void el.offsetWidth; el.classList.add('fx-slide'); }
        else { el.style.animationDelay = (n * 0.03).toFixed(2) + 's'; el.classList.remove('fx-pop'); void el.offsetWidth; el.classList.add('fx-pop'); }
        n++;
      }
    });
  }).observe(stage, { childList: true, subtree: true });

  // first screen
  var first = stage.firstElementChild; if (first) enter(first);
})();
