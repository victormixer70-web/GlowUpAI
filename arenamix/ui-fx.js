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
    // screen wipe: two skewed bands, cyan then yellow, across the stage
    '#fx-wipe{position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden}',
    '#fx-wipe i{position:absolute;top:-20%;bottom:-20%;left:0;width:140%;transform:translateX(-120%) skewX(-18deg)}',
    '#fx-wipe i:nth-child(1){background:#22D3EE}',
    '#fx-wipe i:nth-child(2){background:#FFC53D}',
    '#fx-wipe i:nth-child(3){background:#0B0B14}',
    '#fx-wipe.go i{animation:fxWipe .62s cubic-bezier(.7,0,.3,1) both}',
    '#fx-wipe.go.back i{animation-name:fxWipeBack}',
    '#fx-wipe.go i:nth-child(2){animation-delay:.05s}',
    '#fx-wipe.go i:nth-child(3){animation-delay:.1s}',
    '@keyframes fxWipe{0%{transform:translateX(-120%) skewX(-18deg)}45%,55%{transform:translateX(-15%) skewX(-18deg)}100%{transform:translateX(110%) skewX(-18deg)}}',
    '@keyframes fxWipeBack{0%{transform:translateX(110%) skewX(-18deg)}45%,55%{transform:translateX(-15%) skewX(-18deg)}100%{transform:translateX(-120%) skewX(-18deg)}}',
    // the new screen, and its controls one after another (individual transform properties, so the
    // elements' own transforms are left alone)
    '.fx-screen{animation:fxScreen .55s cubic-bezier(.2,1.25,.35,1) both}',
    '.fx-screen.back{animation-name:fxScreenBack}',
    '@keyframes fxScreen{from{opacity:0;translate:46px 0;scale:.96}to{opacity:1;translate:0 0;scale:1}}',
    '@keyframes fxScreenBack{from{opacity:0;translate:-46px 0;scale:.96}to{opacity:1;translate:0 0;scale:1}}',
    '.fx-pop{animation:fxPop .5s cubic-bezier(.2,1.6,.4,1) both}',
    '@keyframes fxPop{from{opacity:0;translate:0 16px;scale:.86}to{opacity:1;translate:0 0;scale:1}}',
    '.fx-slide{animation:fxSlide .38s cubic-bezier(.2,1.25,.35,1) both}',
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

  var wipe = document.createElement('div'); wipe.id = 'fx-wipe'; wipe.innerHTML = '<i></i><i></i><i></i>';
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
    wipe.className = ''; void wipe.offsetWidth; wipe.className = 'go' + (back ? ' back' : '');
  });
  var lastRoot = null;
  var enter = function (root) {
    if (!root || root === lastRoot || root.id === 'fx-wipe' || root.id === 'fx-layer') return;
    lastRoot = root;
    mountFx();
    if (inGame()) return;
    root.classList.remove('fx-screen', 'back'); void root.offsetWidth;
    root.classList.add('fx-screen'); if (back) root.classList.add('back');
    // its buttons and cards pop in one after another
    var items = root.querySelectorAll('a[href], button, [role="tab"], [role="button"], [role="listitem"], [role="option"]');
    var n = 0;
    for (var k = 0; k < items.length && n < 28; k++) {
      var el = items[k];
      if (!el.offsetParent) continue;
      el.classList.remove('fx-pop'); el.style.animationDelay = (0.12 + n * 0.035).toFixed(3) + 's'; el.classList.add('fx-pop');
      n++;
    }
    setTimeout(function () { for (var q = 0; q < items.length; q++) { items[q].classList.remove('fx-pop'); items[q].style.animationDelay = ''; } }, 1800);
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
    burst(stageXY(e));
    // a tab: the new content comes in from the side of the tab you picked
    slideDir = 0;
    if (el.getAttribute('role') === 'tab') {
      var tabs = Array.prototype.slice.call((el.closest('[role="tablist"]') || el.parentNode).querySelectorAll('[role="tab"]'));
      var cur = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; }), nx = tabs.indexOf(el);
      if (cur >= 0 && nx >= 0 && nx !== cur) slideDir = nx > cur ? 1 : -1;
    }
    watchUntil = performance.now() + 450;
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
