/* ARENA MIX interface motion: screen changes with no waiting (the new screen arrives from the first frame
   while a frozen copy of the old one leaves: push, card flip, zoom into your tap, iris, light slash or
   falling strips; a TV-replay stinger into and out of the games), cards popping in, buttons that squash when pressed
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
    // ---- screen transitions: the new screen is there from the first frame, never behind a curtain ----
    // the old screen is a frozen copy (#fx-old) that leaves while the new one arrives; one style each time
    '#fx-old{position:absolute!important;left:0;top:0;width:844px;height:390px;margin:0!important;pointer-events:none!important;z-index:30;will-change:transform,opacity,clip-path}',
    '#fx-old.under{z-index:1}',
    '.fx-in{will-change:transform,opacity,clip-path;z-index:2}',
    // 1 EMPUJE: the new screen pushes the old one off, a light edge between them
    '.fx-in.push{animation:fxPushIn .3s cubic-bezier(.22,.9,.26,1) both;box-shadow:-14px 0 30px #000a}',
    '.fx-in.push.back{animation-name:fxPushInB;box-shadow:14px 0 30px #000a}',
    '#fx-old.push{animation:fxPushOut .3s cubic-bezier(.22,.9,.26,1) both}',
    '#fx-old.push.back{animation-name:fxPushOutB}',
    '@keyframes fxPushIn{from{transform:translateX(100%)}to{transform:none}}',
    '@keyframes fxPushInB{from{transform:translateX(-100%)}to{transform:none}}',
    '@keyframes fxPushOut{to{transform:translateX(-32%) scale(.94);opacity:.25}}',
    '@keyframes fxPushOutB{to{transform:translateX(32%) scale(.94);opacity:.25}}',
    // 2 CARTA: the screen turns over like a player card
    '#fx-old.flip{animation:fxFlipOut .16s cubic-bezier(.55,0,.9,.4) both}',
    '.fx-in.flip{animation:fxFlipIn .22s .14s cubic-bezier(.1,.6,.3,1.15) both}',
    '.fx-in.flip.back,#fx-old.flip.back{animation-direction:normal}',
    '@keyframes fxFlipOut{to{transform:perspective(1100px) rotateY(88deg) scale(.92);filter:brightness(.5)}}',
    '@keyframes fxFlipIn{from{transform:perspective(1100px) rotateY(-88deg) scale(.92)}to{transform:none}}',
    // 3 ZOOM: you dive into the button you pressed, the new screen settles in
    '#fx-old.zoom{animation:fxZoomOut .28s cubic-bezier(.5,0,.75,0) both}',
    '.fx-in.zoom{animation:fxZoomIn .3s cubic-bezier(.16,.84,.3,1) both}',
    '@keyframes fxZoomOut{to{transform:scale(1.9);opacity:0}}',
    '@keyframes fxZoomIn{from{transform:scale(.86);opacity:0}to{transform:none;opacity:1}}',
    // 4 IRIS: the new screen opens in a circle from your finger, with a ring of light on its edge
    '.fx-in.iris{animation:fxIris .34s cubic-bezier(.5,0,.2,1) both}',
    '@keyframes fxIris{from{clip-path:circle(0 at var(--fx-x) var(--fx-y))}to{clip-path:circle(960px at var(--fx-x) var(--fx-y))}}',
    '.fx-iring{position:absolute;z-index:31;left:var(--fx-x);top:var(--fx-y);width:2px;height:2px;border-radius:50%;pointer-events:none;box-shadow:0 0 0 3px #22D3EE,0 0 24px 6px #22D3EEaa;animation:fxIring .34s cubic-bezier(.5,0,.2,1) both}',
    '@keyframes fxIring{from{transform:translate(-50%,-50%) scale(0)}to{transform:translate(-50%,-50%) scale(960);opacity:.2}}',
    // 5 TAJO: a diagonal slash of light cuts the screen open
    '.fx-in.slash{animation:fxSlash .32s cubic-bezier(.6,0,.2,1) both}',
    '@keyframes fxSlash{from{clip-path:polygon(58% 0,58% 0,42% 100%,42% 100%)}to{clip-path:polygon(-40% 0,140% 0,120% 100%,-60% 100%)}}',
    '.fx-blade{position:absolute;z-index:31;left:50%;top:-30%;width:6px;height:160%;margin-left:-3px;pointer-events:none;transform:rotate(17deg) scaleY(0);background:linear-gradient(#FFF0,#FFF 30%,#FFC53D 70%,#FFF0);box-shadow:0 0 22px 6px #FFC53D99;animation:fxBlade .32s cubic-bezier(.6,0,.2,1) both}',
    '.fx-blade.b2{background:linear-gradient(#FFF0,#7EF0FF 30%,#22D3EE 70%,#FFF0);box-shadow:0 0 22px 6px #22D3EE99;animation-name:fxBlade2}',
    '@keyframes fxBlade{0%{transform:rotate(17deg) scaleY(0)}35%{transform:rotate(17deg) scaleY(1);opacity:1}100%{transform:translateX(-520px) rotate(17deg) scaleY(1);opacity:0}}',
    '@keyframes fxBlade2{0%{transform:rotate(17deg) scaleY(0)}35%{transform:rotate(17deg) scaleY(1);opacity:1}100%{transform:translateX(520px) rotate(17deg) scaleY(1);opacity:0}}',
    // 6 TIRAS: the old screen breaks into strips that drop away in a wave
    '#fx-old.strip{animation:fxStrip .3s cubic-bezier(.55,0,.8,.3) both}',
    '#fx-old.strip.up{animation-name:fxStripUp}',
    '@keyframes fxStrip{to{transform:translateY(105%) rotate(2deg)}}',
    '@keyframes fxStripUp{to{transform:translateY(-105%) rotate(-2deg)}}',
    '.fx-in.strip{animation:fxStripIn .34s cubic-bezier(.16,.84,.3,1) both}',
    '@keyframes fxStripIn{from{transform:scale(.94);filter:brightness(.4)}to{transform:none;filter:none}}',
    // 7 REPETICIÓN (into and out of the games, which take a moment to build): a TV replay stinger
    '#fx-sting{position:absolute;inset:0;z-index:40;pointer-events:none;overflow:hidden}',
    '#fx-sting i{position:absolute;top:-25%;bottom:-25%;left:0;width:150%;transform:translateX(105%) skewX(-20deg)}',
    '#fx-sting i:nth-child(1){background:#FFC53D;animation:fxStIn .16s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting i:nth-child(2){background:#22D3EE;animation:fxStIn .16s .03s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting i:nth-child(3){background:#0B0B14;animation:fxStIn .16s .06s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting b{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;animation:fxStLogo .3s .1s cubic-bezier(.2,1.6,.4,1) both}',
    '#fx-sting.out i{animation:fxStOut .22s cubic-bezier(.6,0,.4,1) both!important}',
    '#fx-sting.out i:nth-child(2){animation-delay:.03s!important}#fx-sting.out i:nth-child(1){animation-delay:.06s!important}',
    '#fx-sting.out b{animation:fxStLogoOut .16s ease-in both}',
    '@keyframes fxStIn{from{transform:translateX(105%) skewX(-20deg)}to{transform:translateX(-18%) skewX(-20deg)}}',
    '@keyframes fxStOut{from{transform:translateX(-18%) skewX(-20deg)}to{transform:translateX(-130%) skewX(-20deg)}}',
    '@keyframes fxStLogo{from{transform:scale(0) rotate(-200deg)}to{transform:none}}',
    '@keyframes fxStLogoOut{to{transform:scale(2.2);opacity:0}}',
    // cards and buttons of the new screen settle in quickly after it
    '.fx-pop{animation:fxPop .24s cubic-bezier(.2,1.3,.4,1) both;will-change:transform,opacity}',
    '@keyframes fxPop{from{opacity:0;translate:0 10px;scale:.94}to{opacity:1;translate:0 0;scale:1}}',
    '.fx-slide{animation:fxSlide .24s cubic-bezier(.16,.84,.3,1) both;will-change:transform,opacity}',
    '@keyframes fxSlide{from{opacity:0;translate:var(--fx-dx,30px) 0}to{opacity:1;translate:0 0}}',
    // ---- shared look for the menus (used by the screens through these classes) ----
    // living background: soft colour orbs drifting over a faint pitch pattern
    '.am-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}',
    '.am-bg.under{z-index:-1}',
    // while a game is running inside a menu screen (private room, ranked, tutorial) its animated backdrop is
    // hidden: it sits under the 3D view anyway and redrawing it every frame costs the phone a lot
    '.bc-stage:has(canvas)>.am-bg,.bc-stage:has(canvas)>.bc-beams{display:none!important}',
    '.am-bg::before{content:"";position:absolute;inset:-20%;background:radial-gradient(30% 40% at 20% 30%,#22D3EE22,transparent 70%),radial-gradient(28% 36% at 80% 70%,#7C5CFF26,transparent 70%),radial-gradient(22% 30% at 70% 15%,#FFC53D14,transparent 70%);animation:amOrbs 14s ease-in-out infinite alternate}',
    '.am-bg::after{content:"";position:absolute;inset:0;background-image:linear-gradient(#ffffff06 1px,transparent 1px),linear-gradient(90deg,#ffffff06 1px,transparent 1px);background-size:32px 32px;mask-image:radial-gradient(80% 80% at 50% 50%,#000 30%,transparent 100%);-webkit-mask-image:radial-gradient(80% 80% at 50% 50%,#000 30%,transparent 100%)}',
    '@keyframes amOrbs{0%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(4%,-3%) rotate(8deg)}100%{transform:translate(-3%,4%) rotate(-6deg)}}',
    // glassy card with a gradient edge
    '.am-card{position:relative;background:linear-gradient(160deg,#1C1C3A,#121226 70%)!important;border:1px solid #2E2E58!important;box-shadow:0 8px 22px #0007,inset 0 1px 0 #ffffff12;overflow:hidden}',
    '.am-card.hot{border-color:#22D3EE!important;box-shadow:0 0 0 1px #22D3EE55,0 0 18px #22D3EE44,0 8px 22px #0007}',
    // light sweeping across, every few seconds
    '.am-shine{position:relative;overflow:hidden}',
    '.am-shine::after{content:"";position:absolute;top:-20%;bottom:-20%;left:0;width:35%;background:linear-gradient(90deg,transparent,#ffffff40,transparent);transform:translateX(-200%) skewX(-20deg);animation:amShine 4.5s ease-in-out infinite;pointer-events:none}',
    '@keyframes amShine{0%{transform:translateX(-200%) skewX(-20deg)}50%,100%{transform:translateX(420%) skewX(-20deg)}}',
    '.am-float{animation:amFloat 3.6s ease-in-out infinite}',
    '@keyframes amFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}',
    '.am-pulse{animation:amPulse 1.8s ease-in-out infinite}',
    '@keyframes amPulse{0%,100%{box-shadow:0 0 0 0 #22D3EE66,0 4px 0 #0E8FA3}50%{box-shadow:0 0 0 7px #22D3EE00,0 4px 0 #0E8FA3}}',
    '.am-pulse-gold{animation:amPulseG 1.8s ease-in-out infinite}',
    '@keyframes amPulseG{0%,100%{box-shadow:0 0 0 0 #FFC53D77}50%{box-shadow:0 0 0 7px #FFC53D00}}',
    '.am-bob{animation:amBob 2.2s ease-in-out infinite}',
    '@keyframes amBob{0%,100%{translate:0 0;rotate:-4deg}50%{translate:0 -4px;rotate:4deg}}',
    '.am-spin{animation:amSpin 6s linear infinite}',
    '@keyframes amSpin{to{rotate:360deg}}',
    '.am-coin{animation:amCoin 3s ease-in-out infinite}',
    '@keyframes amCoin{0%,70%,100%{transform:rotateY(0)}85%{transform:rotateY(180deg)}}',
    '.am-title{background:linear-gradient(90deg,#FFFFFF,#9BEFFF 60%,#22D3EE);-webkit-background-clip:text;background-clip:text;color:transparent!important;filter:drop-shadow(0 2px 8px #22D3EE55)}',
    '.am-bar-shine{position:relative;overflow:hidden}',
    '.am-bar-shine::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,#ffffff70,transparent);transform:translateX(-100%);animation:amBarShine 2.6s ease-in-out infinite}',
    '@keyframes amBarShine{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}',
    // main side bar: glowing active item
    'nav[aria-label="Principal"]{background:linear-gradient(180deg,#14142C,#0E0E1C)!important;border-right:1px solid #2A2A52!important;z-index:2}',
    'nav[aria-label="Principal"] a{transition:background .25s,color .25s,translate .25s}',
    'nav[aria-label="Principal"] a[style*="background: #22D3EE"]{background:linear-gradient(160deg,#7EF0FF,#22D3EE 60%,#0EA5C0)!important;box-shadow:0 0 16px #22D3EE88,inset 0 1px 0 #ffffff88}',
    'nav[aria-label="Principal"] a:not([style*="background: #22D3EE"]) svg{transition:translate .25s}',
    'nav[aria-label="Principal"] a:not([style*="background: #22D3EE"]):hover{color:#F4F4FA!important;background:#ffffff0d!important}',
    '@media (prefers-reduced-motion: reduce){.am-bg::before,.am-shine::after,.am-float,.am-pulse,.am-pulse-gold,.am-bob,.am-spin,.am-coin,.am-bar-shine::after{animation:none!important}}',
    // ---- broadcast style (the look of the home screen), shared by every menu ----
    // stage: night-stadium backdrop with two swinging floodlight beams
    '.bc-stage{background:radial-gradient(90% 120% at 40% 0%,#1D2350 0%,#0D0F24 45%,#07070F 100%)!important}',
    '.bc-beams{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}',
    '.bc-beams::before,.bc-beams::after{content:"";position:absolute;top:-60px;width:220px;height:520px;transform-origin:50% 0;background:linear-gradient(180deg,#E8F6FF40,#E8F6FF00 80%);clip-path:polygon(44% 0,56% 0,100% 100%,0 100%);filter:blur(6px);mix-blend-mode:screen}',
    '.bc-beams::before{left:22%;animation:bcBeamL 9s ease-in-out infinite}',
    '.bc-beams::after{left:62%;animation:bcBeamR 11s ease-in-out infinite}',
    '@keyframes bcBeamL{0%,100%{rotate:-14deg}50%{rotate:6deg}}',
    '@keyframes bcBeamR{0%,100%{rotate:14deg}50%{rotate:-6deg}}',
    // title: italic condensed on a slanted dark label with the cyan strip
    '.bc-title{display:inline-block;margin:0;padding:2px 16px 2px 14px;transform:skewX(-12deg);background:#0B0B14CC;border-left:4px solid #22D3EE;font-family:"Barlow Condensed",sans-serif!important;font-weight:800!important;font-style:italic!important;letter-spacing:1px;line-height:1.1;color:#F4F4FA!important;-webkit-text-fill-color:#F4F4FA;background-clip:border-box!important;filter:none!important}',
    // slanted shapes made with clip-path, so the text inside stays straight
    '.bc-para{clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)}',
    '.bc-cut{clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}',
    '.bc-btn{clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);background:linear-gradient(135deg,#7EF0FF,#22D3EE 55%,#0EA5C0)!important;color:#0B0B14!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-family:"Barlow Condensed",sans-serif!important;font-style:italic!important;font-weight:800!important;letter-spacing:1.5px}',
    '.bc-btn-gold{clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);background:linear-gradient(135deg,#FFE38A,#FFC53D 55%,#D9A520)!important;color:#2A1C02!important;border:0!important;border-radius:0!important;box-shadow:none!important;font-family:"Barlow Condensed",sans-serif!important;font-style:italic!important;font-weight:800!important;letter-spacing:1px}',
    // tile: a dark slanted card with a coloured strip on its leading edge
    '.bc-tile{position:relative;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px);background:linear-gradient(110deg,#1F2350,#13142C 70%)!important;border:0!important;border-radius:0!important;box-shadow:none!important}',
    '.bc-tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bc-c,#22D3EE)}',
    '.bc-tile.on{background:linear-gradient(110deg,#0F4A5A,#13213A 70%)!important}',
    '.bc-tile.on::after{content:"";position:absolute;inset:0;border:2px solid var(--bc-c,#22D3EE);clip-path:inherit;pointer-events:none}',
    // glass panel with a diagonal edge and the gradient strip
    '.bc-glass{background:linear-gradient(160deg,#191936F2,#0E0E1EF2)!important;clip-path:polygon(28px 0,100% 0,100% 100%,0 100%)}',
    // live ticker band
    '.bc-ticker{overflow:hidden;white-space:nowrap}',
    '.bc-ticker>span{display:inline-block;padding-left:100%;animation:bcTick 22s linear infinite}',
    '@keyframes bcTick{from{transform:translateX(0)}to{transform:translateX(-100%)}}',
    '@media (prefers-reduced-motion: reduce){.bc-beams::before,.bc-beams::after,.bc-ticker>span{animation:none!important}}',
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

  var layer = document.createElement('div'); layer.id = 'fx-layer';
  var mountFx = function () { if (!layer.parentNode) stage.appendChild(layer); };
  var lastTap = { x: 422, y: 195 };
  var rootOf = function () { for (var c = stage.firstElementChild; c; c = c.nextElementSibling) if (!c.id && !c.hasAttribute('data-fx')) return c; return null; };

  // ---- screen changes: a frozen copy of the old screen leaves while the new one arrives, at once ----
  var history = [location.hash], back = false, prevHash = location.hash, curHash = location.hash;
  window.addEventListener('hashchange', function () {
    prevHash = curHash; curHash = location.hash;
    var i = history.lastIndexOf(location.hash);
    back = i >= 0 && i === history.length - 2;
    if (back) history.pop(); else history.push(location.hash);
    if (history.length > 30) history.shift();
  });
  var MODES = ['push', 'flip', 'zoom', 'iris', 'slash', 'strip'];
  var lastMode = '', pending = null, tok = 0, sting = null;
  var cleanup = [];
  var clearAll = function () { cleanup.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); };
  // a still copy of the screen, canvases included (as far as the browser lets them be read)
  var freeze = function (old) {
    var c = old.cloneNode(true);
    c.id = 'fx-old'; c.removeAttribute('class'); c.className = old.className.replace(/\bfx-\S+/g, '');
    c.setAttribute('aria-hidden', 'true'); c.inert = true;
    var a = old.querySelectorAll('canvas'), b = c.querySelectorAll('canvas');
    for (var k = 0; k < a.length; k++) { try { b[k].getContext('2d').drawImage(a[k], 0, 0); } catch (e) {} }
    return c;
  };
  var addFx = function (cls, styleVars) {
    var d = document.createElement('div'); d.className = cls; d.setAttribute('data-fx', '1');
    if (styleVars) d.setAttribute('style', styleVars);
    stage.appendChild(d); return d;
  };
  var tapVars = function () { return '--fx-x:' + lastTap.x.toFixed(0) + 'px;--fx-y:' + lastTap.y.toFixed(0) + 'px;'; };
  var stinger = function (tk, doSwap) {
    // games build a 3D scene first: the stinger covers that moment, then opens on the game
    if (sting) sting.remove();
    sting = addFx('', '');
    sting.id = 'fx-sting';
    sting.innerHTML = '<i></i><i></i><i></i><b><svg viewBox="0 0 512 512" width="120" height="120"><rect width="512" height="512" rx="112" fill="#0B0B14" stroke="#22D3EE" stroke-width="14"/><text x="256" y="350" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-style="italic" font-size="270" letter-spacing="-6"><tspan fill="#F4F4FA">A</tspan><tspan fill="#22D3EE" dx="90">M</tspan></text><path d="M262 120L222 238h38l-26 104l80-140h-42l30-82z" fill="#FFC53D" stroke="#0B0B14" stroke-width="10" stroke-linejoin="round"/></svg></b>';
    var s = sting;
    setTimeout(function () {
      doSwap();
      var t0 = performance.now(), n = 0;
      var wait = function () {
        if (++n < 3 && performance.now() - t0 < 1500) { requestAnimationFrame(wait); return; }
        s.classList.add('out');
        setTimeout(function () { s.remove(); if (sting === s) sting = null; }, 320);
      };
      requestAnimationFrame(wait);
    }, 200);
  };
  window.AMFX = {
    swap: function (doSwap) {
      var tk = ++tok;
      clearAll();
      mountFx();
      var old = rootOf();
      // into or out of a game (or a screen with a live 3D view): the stinger, which covers the build-up
      if (!old || inGame() || GAME.test(prevHash) || old.querySelector('canvas')) { stinger(tk, doSwap); return; }
      var modes = MODES.filter(function (m) { return m !== lastMode; });
      var mode = modes[Math.floor(Math.random() * modes.length)]; lastMode = mode;
      var dur = mode === 'flip' ? 380 : 360;
      if (mode === 'strip') {
        // six strips of the old screen, falling away one after another, up and down in turn
        for (var k = 0; k < 6; k++) {
          var c = freeze(old);
          c.classList.add('strip'); if (k % 2) c.classList.add('up');
          c.style.clipPath = 'inset(0 ' + (100 - (k + 1) * 100 / 6).toFixed(3) + '% 0 ' + (k * 100 / 6).toFixed(3) + '%)';
          c.style.animationDelay = (k * 0.022).toFixed(3) + 's';
          stage.appendChild(c);
          (function (c) { cleanup.push(function () { c.remove(); }); })(c);
        }
      } else {
        var o = freeze(old);
        o.classList.add(mode); if (back) o.classList.add('back');
        if (mode === 'iris' || mode === 'slash' || mode === 'push') o.classList.add('under');
        if (mode === 'zoom') o.style.transformOrigin = lastTap.x.toFixed(0) + 'px ' + lastTap.y.toFixed(0) + 'px';
        stage.appendChild(o);
        cleanup.push(function () { o.remove(); });
      }
      if (mode === 'iris') { var ir = addFx('fx-iring', tapVars()); cleanup.push(function () { ir.remove(); }); }
      if (mode === 'slash') { var b1 = addFx('fx-blade'), b2 = addFx('fx-blade b2'); cleanup.push(function () { b1.remove(); b2.remove(); }); }
      pending = { mode: mode, back: back };
      doSwap();
      setTimeout(function () { if (tk === tok) clearAll(); }, dur + 60);
    }
  };
  var lastRoot = null;
  var enter = function (root) {
    if (!root || root === lastRoot) return;
    lastRoot = root;
    mountFx();
    var p = pending; pending = null;
    if (!p || inGame()) return;
    root.classList.remove('fx-in', 'push', 'flip', 'zoom', 'iris', 'slash', 'strip', 'back');
    root.style.setProperty('--fx-x', lastTap.x.toFixed(0) + 'px'); root.style.setProperty('--fx-y', lastTap.y.toFixed(0) + 'px');
    root.classList.add('fx-in', p.mode); if (p.back) root.classList.add('back');
    if (p.mode === 'zoom') root.style.transformOrigin = lastTap.x.toFixed(0) + 'px ' + lastTap.y.toFixed(0) + 'px';
    var end = function () { root.classList.remove('fx-in', 'push', 'flip', 'zoom', 'iris', 'slash', 'strip', 'back'); root.style.transformOrigin = ''; };
    setTimeout(end, 520);
    // its cards and buttons settle in right behind it
    var lag = p.mode === 'flip' ? 0.24 : 0.12;
    var items = root.querySelectorAll('a[href], button, [role="tab"], [role="listitem"], [role="option"]');
    var n = 0;
    for (var k = 0; k < items.length && n < 14; k++) {
      var el = items[k];
      if (!el.offsetParent) continue;
      el.style.animationDelay = (lag + n * 0.014).toFixed(3) + 's'; el.classList.add('fx-pop');
      n++;
    }
    setTimeout(function () { for (var q = 0; q < items.length; q++) { items[q].classList.remove('fx-pop'); items[q].style.animationDelay = ''; } }, 900);
  };
  new MutationObserver(function () { var r = rootOf(); if (r) enter(r); }).observe(stage, { childList: true });

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
  var first = rootOf(); if (first) enter(first);
})();
