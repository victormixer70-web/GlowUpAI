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
  // a game on screen, whichever screen holds it (ranked, casual, private, training...): no menu effects then
  // (the frozen copy of the previous screen that a transition keeps for a moment does not count)
  // an element that already runs an animation of its own (a shine, a pulse, a float) does not get the pop-in:
  // the pop-in would replace it, and when the pop-in class came off its own animation started over (a jump)
  var ownAnim = function (el) { try { var n = getComputedStyle(el).animationName; return !!n && n !== 'none' && !el.classList.contains('fx-pop') && !el.classList.contains('fx-slide'); } catch (e) { return false; } };
  var inGame = function () { if (GAME.test(location.hash)) return true; if (!stage) return false; var L = stage.querySelectorAll('[data-am-game]'); for (var i = 0; i < L.length; i++) if (!L[i].closest('#fx-old')) return true; return false; };

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
    '#fx-sting i{position:absolute;top:-25%;bottom:-25%;left:0;width:150%;transform:translateX(105%) skewX(0deg)}',
    '#fx-sting i:nth-child(1){background:#FFC53D;animation:fxStIn .1s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting i:nth-child(2){background:#22D3EE;animation:fxStIn .1s .02s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting i:nth-child(3){background:#0B0B14;animation:fxStIn .1s .04s cubic-bezier(.6,0,.4,1) both}',
    '#fx-sting b{position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;animation:fxStLogo .3s .1s cubic-bezier(.2,1.6,.4,1) both}',
    '#fx-sting.out i{animation:fxStOut .22s cubic-bezier(.6,0,.4,1) both!important}',
    '#fx-sting.out i:nth-child(2){animation-delay:.03s!important}#fx-sting.out i:nth-child(1){animation-delay:.06s!important}',
    '#fx-sting.out b{animation:fxStLogoOut .16s ease-in both}',
    '@keyframes fxStIn{from{transform:translateX(105%) skewX(0deg)}to{transform:translateX(-18%) skewX(0deg)}}',
    '@keyframes fxStOut{from{transform:translateX(-18%) skewX(0deg)}to{transform:translateX(-130%) skewX(0deg)}}',
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
    '.am-shine::after{content:"";position:absolute;top:-20%;bottom:-20%;left:0;width:35%;background:linear-gradient(90deg,transparent,#ffffff40,transparent);transform:translateX(-200%) skewX(0deg);animation:amShine 4.5s ease-in-out infinite;pointer-events:none}',
    '@keyframes amShine{0%{transform:translateX(-200%) skewX(0deg)}50%,100%{transform:translateX(420%) skewX(0deg)}}',
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
    '.bc-title{display:inline-block;margin:0;padding:3px 16px 1px;border-radius:12px;background:linear-gradient(180deg,#1C1D3E,#0B0B14)!important;box-shadow:inset 0 2px 0 #ffffff1c,inset 0 -3px 0 #00000080,0 0 0 2px #0B0B14,0 0 0 3.5px #22D3EE88,0 6px 14px #0008;font-family:"Barlow Condensed",sans-serif!important;font-weight:800!important;font-style:italic!important;letter-spacing:1px;line-height:1.1;color:#F4F4FA!important;-webkit-text-fill-color:#F4F4FA;text-shadow:0 3px 0 #05050A;background-clip:border-box!important;filter:none!important}',
    // slanted shapes made with clip-path, so the text inside stays straight
    // chunky game-UI pieces: rounded, dark outline, a gloss on top and depth underneath
    '.bc-para{clip-path:none;border-radius:12px;outline:2px solid #05050Acc;outline-offset:-1px}',
    '.bc-cut{clip-path:inset(0 round 18px);border-radius:18px}',
    // a gloss on the top half of every chip and the pieces that used to be slanted
    '.bc-para{position:relative}',
    '.bc-para::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,#ffffff24,#ffffff08 45%,transparent 50%,#00000026);pointer-events:none}',
    '[style*="skewX(0deg)"]{border-radius:12px}',
    '.hm-pass{border-radius:20px!important;box-shadow:inset 0 2px 0 #FFFFFF66,inset 0 -4px 0 #7A2A05,0 0 0 2px #2A0E02,0 4px 0 #2A0E02,0 0 18px #FF8A3D55!important}',
    '.hm-pass::after{border-radius:inherit}',
    '.rs-board{border-radius:16px;overflow:hidden;box-shadow:0 0 0 2px #05050A,0 5px 0 #05050A,0 12px 24px #000a!important}',
    '.rs-chip{border-radius:12px}.rs-go{border-radius:18px!important}.rs-out{border-radius:14px!important}',
    '.bc-btn{clip-path:none;border-radius:16px!important;position:relative;background:linear-gradient(135deg,#7EF0FF,#22D3EE 55%,#0EA5C0)!important;color:#0B0B14!important;border:0!important;box-shadow:inset 0 3px 0 #FFFFFF99,inset 0 -5px 0 #0A7F93,0 0 0 2px #05343C,0 5px 0 #05343C,0 10px 22px #22D3EE44!important;font-family:"Barlow Condensed",sans-serif!important;font-style:italic!important;font-weight:800!important;letter-spacing:1.5px}',
    '.bc-btn-gold{clip-path:none;border-radius:16px!important;position:relative;background:linear-gradient(135deg,#FFE38A,#FFC53D 55%,#D9A520)!important;color:#2A1C02!important;border:0!important;box-shadow:inset 0 3px 0 #FFFFFFB0,inset 0 -5px 0 #B7871A,0 0 0 2px #4A3205,0 5px 0 #4A3205,0 10px 22px #FFC53D44!important;font-family:"Barlow Condensed",sans-serif!important;font-style:italic!important;font-weight:800!important;letter-spacing:1px}',
    // tile: a dark slanted card with a coloured strip on its leading edge
    '.bc-tile{position:relative;clip-path:inset(0 round 16px);border-radius:16px;background:linear-gradient(110deg,#1F2350,#13142C 70%)!important;border:0!important;box-shadow:inset 0 2px 0 #ffffff14,inset 0 -3px 0 #00000066,inset 0 0 0 1.5px #ffffff10!important}',
    '.bc-tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--bc-c,#22D3EE)}',
    '.bc-tile.on{background:linear-gradient(110deg,#0F4A5A,#13213A 70%)!important}',
    '.bc-tile.on::after{content:"";position:absolute;inset:0;border:2px solid var(--bc-c,#22D3EE);clip-path:inherit;pointer-events:none}',
    // glass panel with a diagonal edge and the gradient strip
    '.bc-glass{background:linear-gradient(160deg,#191936F2,#0E0E1EF2)!important;clip-path:inset(0 round 20px);border-radius:20px}',
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
    '@keyframes fxSpark{from{opacity:1;translate:0 0}to{opacity:0;translate:var(--sx) var(--sy)}}',
    // ---- a night-stadium backdrop for any full-screen panel (in-match screens too) ----
    '.am-arena{position:absolute;inset:0;overflow:hidden;background:radial-gradient(70% 60% at 50% 42%,#1D2A6B 0%,#0E1233 55%,#05060F 100%)}',
    '.am-arena::before{content:"";position:absolute;left:50%;top:44%;width:1100px;height:1100px;margin:-550px 0 0 -550px;background:repeating-conic-gradient(#22D3EE14 0 6deg,transparent 8deg 18deg);-webkit-mask-image:radial-gradient(closest-side,#000,transparent);mask-image:radial-gradient(closest-side,#000,transparent);animation:amSpin 70s linear infinite;pointer-events:none}',
    '.am-arena::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,#FFFFFF55 1px,transparent 1.6px) 0 0/11px 9px,radial-gradient(circle,#22D3EE55 1px,transparent 1.6px) 5px 4px/14px 12px;-webkit-mask-image:linear-gradient(180deg,transparent 4%,#000 14%,#000 36%,transparent 48%);mask-image:linear-gradient(180deg,transparent 4%,#000 14%,#000 36%,transparent 48%);opacity:.55}',
    '.am-arena>.aa-pitch{position:absolute;left:-60%;right:-60%;bottom:-20px;height:420px;transform:perspective(520px) rotateX(58deg);transform-origin:50% 100%;background:radial-gradient(circle at 50% 35%,transparent 64px,#FFFFFF33 65px 68px,transparent 69px),linear-gradient(90deg,transparent calc(50% - 2px),#FFFFFF33 calc(50% - 2px) calc(50% + 2px),transparent calc(50% + 2px)),repeating-linear-gradient(90deg,#1B5232 0 80px,#164529 80px 160px);-webkit-mask-image:linear-gradient(0deg,#000 30%,transparent 62%);mask-image:linear-gradient(0deg,#000 30%,transparent 62%);opacity:.8}',
    '.am-arena>.aa-beam{position:absolute;top:-30px;width:300px;height:520px;margin-left:-150px;background:linear-gradient(180deg,#E8F6FF30,transparent 75%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);transform-origin:50% 0;will-change:transform;animation:aaBeam 6s ease-in-out infinite alternate}',
    '.am-arena>.aa-beam.r{animation-delay:-3s;animation-direction:alternate-reverse}',
    '@keyframes aaBeam{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}',
    '.am-arena>.aa-flash{position:absolute;width:10px;height:10px;margin:-5px;border-radius:50%;background:radial-gradient(closest-side,#fff,#ffffff55 40%,transparent);opacity:0;animation:aaFlash 3.2s infinite}',
    '@keyframes aaFlash{0%,90%,100%{opacity:0}93%{opacity:1}}',
    '.am-arena~*{position:relative}',
    // spinning light rays: each on its own GPU layer, so it turns smoothly instead of being redrawn every frame
    '.am-arena::before,.md-rays,.em-rays,.rs-rays,.mm-beam,.jc-wheel .rays,.jc-wheel .won-card .wr,#am-res .rays,#am-rw .rays{will-change:transform,rotate;backface-visibility:hidden;-webkit-backface-visibility:hidden}',
    // ---- a living app: things that move on their own and answer your finger ----
    // main buttons beat now and then, asking to be pressed
    '.bc-btn,.bc-btn-gold,.rs-go{animation:amBeat 3.8s ease-in-out infinite}',
    '.bc-btn.fx-down,.bc-btn-gold.fx-down,.rs-go.fx-down{animation:none!important}',
    '@keyframes amBeat{0%,78%,100%{scale:1}84%{scale:1.07}88%{scale:.98}92%{scale:1.04}}',
    // motes of light rising through every menu
    '.am-motes{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.am-motes i{position:absolute;bottom:-8px;width:var(--s,4px);height:var(--s,4px);border-radius:50%;background:var(--c,#9BEFFF);box-shadow:0 0 8px var(--c,#9BEFFF);opacity:0;will-change:transform,opacity;animation:amMote var(--d,9s) linear infinite}',
    '@keyframes amMote{0%{transform:translate(0,0);opacity:0}12%{opacity:.85}50%{transform:translate(var(--dx,14px),-200px)}100%{transform:translate(0,-420px);opacity:0}}',
    // cards lean towards your finger while you hold them
    '.fx-tilt{transition:transform .12s ease-out!important;transform-style:preserve-3d}',
    '.fx-tilt-off{transition:transform .45s cubic-bezier(.3,1.8,.5,1)!important}',
    // a ball that hops away when you tap an empty spot
    '.fx-ball{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;pointer-events:none;animation:fxBallX 1.3s cubic-bezier(.25,.6,.5,1) forwards}',
    '.fx-ball b{position:relative;display:block;width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#E6E9F0 45%,#9AA3B5);box-shadow:inset -3px -3px 0 #0002,0 0 0 1.5px #0B0B14;animation:fxBallY 1.3s linear forwards,fxBallR 1.3s linear forwards}',
    '.fx-ball b::after{content:"";position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px;background:#17172A;clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)}',
    '@keyframes fxBallX{0%{translate:0 0;opacity:1}75%{opacity:1}100%{translate:var(--bx) 0;opacity:0}}',
    '@keyframes fxBallY{0%{translate:0 0}18%{translate:0 -70px;animation-timing-function:ease-in}36%{translate:0 0;animation-timing-function:ease-out}52%{translate:0 -34px;animation-timing-function:ease-in}66%{translate:0 0}76%{translate:0 -12px}86%,100%{translate:0 0}}',
    '@keyframes fxBallR{to{rotate:var(--br)}}',
    // ---- colour pass: the menus in richer purples, magentas and blues instead of near-black navy ----
    '#stage{background:#140C34!important}',
    '.bc-stage{background:radial-gradient(70% 90% at 15% 0%,#5B2BB8 0%,transparent 60%),radial-gradient(60% 80% at 95% 100%,#C0267A 0%,transparent 60%),radial-gradient(90% 120% at 50% 40%,#23207A 0%,#140E46 55%,#0B0822 100%)!important}',
    '.am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE55,transparent 70%),radial-gradient(30% 40% at 82% 72%,#EC489955,transparent 70%),radial-gradient(26% 34% at 70% 12%,#FFC53D38,transparent 70%),radial-gradient(30% 40% at 40% 90%,#8B5CF655,transparent 70%)!important}',
    '.am-arena{background:radial-gradient(60% 70% at 20% 10%,#6D28D9 0%,transparent 60%),radial-gradient(50% 60% at 90% 90%,#BE185D 0%,transparent 60%),radial-gradient(70% 60% at 50% 42%,#2B2A8A 0%,#151050 55%,#0A0824 100%)!important}',
    '.am-card{background:linear-gradient(160deg,#3A2380,#1E1650 55%,#160F3C)!important;border-color:#7C5CFF88!important;box-shadow:0 8px 22px #0007,inset 0 1px 0 #ffffff24,0 0 18px #7C5CFF33!important}',
    '.bc-glass{background:linear-gradient(160deg,#36217AF2,#1A1248F2 60%,#140E3AF2)!important;box-shadow:inset 0 0 0 1px #A78BFA55}',
    '.bc-tile{background:linear-gradient(110deg,color-mix(in srgb,var(--bc-c,#7C5CFF) 38%,#2A1B6E),#1A1448 72%)!important}',
    '.bc-tile.on{background:linear-gradient(110deg,color-mix(in srgb,var(--bc-c,#22D3EE) 60%,#1A1448),#1E1A58 72%)!important}',
    '.bc-title{background:linear-gradient(135deg,#7C3AED,#C026D3 55%,#DB2777)!important;box-shadow:inset 0 2px 0 #ffffff40,inset 0 -3px 0 #00000055,0 0 0 2px #1A0B33,0 0 18px #C026D366!important}',
    // each screen in its own colours (the app shell puts the screen's name on #stage)
    '#stage[data-screen="Modos"] .bc-stage,#stage[data-screen="Modos"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#7C3AED70 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#DB277760 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#2563EB50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Tienda"] .bc-stage,#stage[data-screen="Tienda"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#F59E0BD0 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#DB2777C0 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AEDA0 0%,transparent 60%),linear-gradient(160deg,#4A1A3A 0%,#1A0820 100%)!important}',
    '#stage[data-screen="Taquilla"] .bc-stage,#stage[data-screen="Taquilla"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#0EA5E9D0 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#7C3AEDC0 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#14B8A6A0 0%,transparent 60%),linear-gradient(160deg,#10225E 0%,#090A2E 100%)!important}',
    '#stage[data-screen="Pase"] .bc-stage,#stage[data-screen="Pase"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#F59E0BD0 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#7C3AEDC0 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#EC4899A0 0%,transparent 60%),linear-gradient(160deg,#34175E 0%,#130728 100%)!important}',
    '#stage[data-screen="Torneo"] .bc-stage,#stage[data-screen="Torneo"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#A855F770 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#F59E0B60 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#2563EB50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_tribuna.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Ajustes"] .bc-stage,#stage[data-screen="Ajustes"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#2563EBD0 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#06B6D4C0 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AEDA0 0%,transparent 60%),linear-gradient(160deg,#10206A 0%,#070B2E 100%)!important}',
    '#stage[data-screen="Perfil"] .bc-stage,#stage[data-screen="Perfil"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#06B6D470 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#EC489960 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Estadisticas"] .bc-stage,#stage[data-screen="Estadisticas"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#06B6D470 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#EC489960 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Social"] .bc-stage,#stage[data-screen="Social"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#0EA5E970 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#22C55E60 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_tribuna.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Modos"] .md-vig,#stage[data-screen="Torneo"] .tn-bg,#stage[data-screen="Social"] .so-bg,#stage[data-screen="Minijuegos"] .mj-hall,#stage[data-screen="Logros"] .lg-room,#stage[data-screen="Rangos"] .rg-bg{opacity:.38!important}',
    '#stage[data-screen="Clubes"] .bc-stage,#stage[data-screen="Clubes"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#0EA5E970 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#22C55E60 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_tribuna.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Ranking"] .bc-stage,#stage[data-screen="Ranking"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#0EA5E970 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#22C55E60 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_tribuna.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Minijuegos"] .bc-stage,#stage[data-screen="Minijuegos"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#EC489970 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#F9731660 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_tribuna.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Rangos"] .bc-stage{background:radial-gradient(45% 70% at 68% 38%,color-mix(in srgb,var(--rc,#1E8BFF) 38%,transparent) 0%,transparent 70%),radial-gradient(40% 60% at 10% 10%,#1E8BFF40 0%,transparent 60%),linear-gradient(180deg,#02040CB8 0%,#06102E66 45%,#02040CE0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Logros"] .bc-stage,#stage[data-screen="Logros"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#F59E0B70 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#EC489960 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_trofeos.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Rapida"] .bc-stage,#stage[data-screen="Rapida"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#06B6D470 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#7C3AED60 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#3B82F650 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Competitivo"] .bc-stage,#stage[data-screen="Competitivo"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#F59E0B70 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#DC262660 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Privada"] .bc-stage,#stage[data-screen="Privada"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#22C55E70 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#0EA5E960 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#7C3AED50 0%,transparent 60%),linear-gradient(180deg,#0E052A8C 0%,#0E052A14 40%,#0A0420B0 100%),url(assets/bg_estadio.jpg) center/cover no-repeat!important}',
    '#stage[data-screen="Idioma"] .bc-stage,#stage[data-screen="Idioma"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 75% at 12% 8%,#7C3AEDD0 0%,transparent 62%),radial-gradient(50% 70% at 92% 92%,#06B6D4C0 0%,transparent 60%),radial-gradient(40% 55% at 75% 15%,#EC4899A0 0%,transparent 60%),linear-gradient(160deg,#24145E 0%,#0C0830 100%)!important}',
    // the dark inline panels and chips the screens use, recoloured where they are
    '[style*="background: rgb(23, 23, 42)"]{background:linear-gradient(160deg,#35207A,#211858)!important}',
    '[style*="background: rgb(38, 38, 74)"]{background:linear-gradient(160deg,#4A2D9A,#2E2276)!important}',
    '[style*="background: rgb(14, 14, 28)"],[style*="background: rgb(18, 18, 38)"],[style*="background: rgb(20, 20, 40)"]{background:#1C1450!important}',
    '.bc-title.hd{position:relative;z-index:4;align-self:flex-start;display:inline-flex!important;align-items:center;justify-content:center;flex:none;height:38px;box-sizing:border-box;padding:4px 20px 0!important;margin:0!important;font:800 italic 23px/1 "Barlow Condensed",sans-serif!important;letter-spacing:1.5px!important;white-space:nowrap;color:#FFFFFF!important;border-radius:14px!important;overflow:hidden;isolation:isolate;text-shadow:0 2px 0 #00000088,0 0 14px #ffffff40!important;transform:none!important}',
    '.bc-title.hd::before{content:"";position:absolute;left:0;right:0;top:0;height:46%;background:linear-gradient(180deg,#ffffff38,#ffffff00);pointer-events:none;z-index:-1}',
    '.bc-title.hd::after{content:"";position:absolute;top:-30%;bottom:-30%;left:0;width:28%;background:linear-gradient(100deg,transparent,#ffffff66,transparent);transform:translateX(-160%) skewX(-18deg);animation:bcTitleShine 5s ease-in-out infinite;pointer-events:none}',
    '@keyframes bcTitleShine{0%,70%{transform:translateX(-160%) skewX(-18deg)}100%{transform:translateX(520%) skewX(-18deg)}}',
    '.bc-title.hd+span{margin-top:5px;display:block}',
    // the back buttons (the arrow next to every title) match it: black with an electric-blue edge
    '.bc-para,#stage a.bc-para{background:linear-gradient(150deg,#06102E 0%,#02040C 70%)!important;color:#7CC4FF!important;outline:2px solid #000000!important;box-shadow:inset 0 0 0 1.5px #1E8BFF,0 0 12px #0A6CFF66!important}',
    // the big play buttons (BUSCAR PARTIDA / JUGAR) in the logo's electric blue
    '.am-logo-btn,#stage .am-logo-btn{background:linear-gradient(100deg,#3DA9FF 0%,#1E8BFF 30%,#0A3DCC 70%,#06102E 100%)!important;background-size:200% 100%!important;animation:amLogoGo 4s ease-in-out infinite alternate!important;color:#FFFFFF!important;text-shadow:0 2px 0 #000A!important;box-shadow:inset 0 2px 0 #BFE3FF88,0 0 0 2px #000,0 0 0 3.5px #1E8BFF,0 6px 0 #02040C,0 10px 26px #0A6CFF88!important}',
    '.am-logo-btn svg{fill:#FFFFFF!important;filter:drop-shadow(0 2px 0 #000A)}',
    '@keyframes amLogoGo{from{background-position:0 0}to{background-position:100% 0}}',
    '.bc-para:hover,.bc-para:active{color:#FFFFFF!important;box-shadow:inset 0 0 0 1.5px #3DA9FF,0 0 18px #1E8BFFAA!important}',
    // header titles in the logo's colours: deep black into a strong electric blue, with a blue edge and glow
    '.bc-title.hd,#stage .bc-title.hd{background:linear-gradient(120deg,#02040C 0%,#06102E 32%,#0A3DCC 70%,#1E8BFF 100%)!important;box-shadow:inset 0 2px 0 #7CC4FF55,inset 0 -3px 0 #00000099,0 0 0 2px #000000,0 0 0 3.5px #1E8BFF,0 0 18px #0A6CFF99!important;text-shadow:0 2px 0 #000000CC,0 0 12px #3DA9FF88!important}',
    '[style*="border: 1px solid rgb(46, 46, 82)"],[style*="border: 2px solid rgb(46, 46, 82)"]{border-color:#7C5CFF99!important}',
    '#stage[data-theme="logo"] [style*="linear-gradient(180deg, rgb(42, 17, 112), rgb(76, 29, 149) 60%, rgb(107, 31, 126))"]{background:radial-gradient(60% 60% at 50% 30%,#1E8BFF88,transparent 70%),linear-gradient(180deg,#040A1C,#071230 60%,#0A1A44)!important}',
    '#stage[data-theme="logo"] [style*="rgb(126, 42, 142), rgb(58, 18, 102) 55%, rgb(30, 10, 62)"]{background:radial-gradient(70% 90% at 50% 0%,#3DA9FF55,transparent 70%),linear-gradient(180deg,#0A1A44,#040A1C 55%,#050B1F)!important;border-top-color:#6CC3FF!important;box-shadow:0 -4px 18px #1E8BFF88!important}',
    '#stage[data-theme="logo"] [style*="rgba(76, 29, 149, 0.95), rgba(46, 16, 101, 0.95) 55%, rgba(74, 14, 78, 0.95)"]{background:radial-gradient(60% 45% at 100% 0%,#1E8BFF66,transparent 70%),linear-gradient(160deg,#071230F2,#040A1CF2 55%,#02050FF2)!important}',
    '#stage[data-theme="logo"] [style*="rgb(124, 58, 237), rgb(192, 38, 211) 55%, rgb(219, 39, 119)"]{background:linear-gradient(135deg,#0057FF,#1E8BFF 55%,#3DA9FF)!important;box-shadow:inset 0 2px 0 #ffffff40,0 0 18px #1E8BFF88!important}',
    '#stage[data-theme="logo"] [style*="rgba(76, 29, 149, 0.9), rgba(131, 24, 67, 0.9)"]{background:linear-gradient(170deg,#071230E6,#040A1CE6)!important;border-color:#6CC3FF88!important;box-shadow:0 0 14px #1E8BFF66!important}',
    '#stage[data-theme="logo"] [style*="rgba(124, 58, 237, 0.8), rgba(219, 39, 119, 0.7)"]{background:linear-gradient(100deg,#0057FFCC,#0A6CFFB3 60%,#040A1CA6)!important;border-color:#6CC3FFAA!important;box-shadow:inset 0 1px 0 #ffffff33,0 0 16px #0A6CFF66!important}',
    '#stage[data-theme="logo"] [style*="rgb(79, 70, 229), rgb(124, 58, 237) 50%, rgb(157, 23, 77)"]{background:radial-gradient(70% 55% at 50% 30%,#3DA9FF88,transparent 70%),linear-gradient(160deg,#0057FF,#071230 55%,#040A1C)!important;border-color:#6CC3FF!important;box-shadow:inset 0 1px 0 #ffffff44,0 0 20px #0A6CFF66!important}',
    '#stage[data-theme="logo"] [style*="rgba(30, 58, 138, 0.8), rgba(91, 33, 182, 0.8), rgba(157, 23, 77, 0.8)"]{background:linear-gradient(90deg,#06154ACC,#0057FFCC,#071230CC)!important;border-color:#6CC3FF88!important}',
    '#stage[data-theme="logo"] [style*="rgb(139, 92, 246), rgb(219, 39, 119)"]{background:linear-gradient(135deg,#1E8BFF,#0057FF)!important;border-color:#A6DCFF!important}',
    '#stage[data-theme="logo"] [style*="rgb(76, 29, 149), rgb(157, 23, 77)"]{background:linear-gradient(135deg,#0057FF,#071230)!important;box-shadow:inset 0 0 0 1px #6CC3FF,0 0 14px #0A6CFF88!important}',
    '#stage[data-theme="logo"] [style*="rgb(37, 99, 235), rgb(124, 58, 237) 55%, rgb(219, 39, 119)"]{background:linear-gradient(135deg,#0A6CFF,#0057FF 55%,#040A1C)!important;box-shadow:inset 0 0 0 1px #6CC3FF,0 0 14px #0A6CFF88!important}',
    '#stage[data-theme="logo"] .tn-card{background:linear-gradient(170deg,#071230F2,#030817F2)!important}',
    '#stage[data-theme="logo"] .tn-violet{--tc:#3DA9FF}',
    '#stage[data-theme="logo"] .tn-side{background:radial-gradient(70% 60% at 100% 0%,color-mix(in srgb,var(--tc) 40%,transparent),transparent 70%),linear-gradient(165deg,color-mix(in srgb,var(--tc) 22%,#071230),#030817 70%)!important}',
    '#stage[data-theme="logo"] .cf-tile{background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 16%,#071230),#030817 60%)!important}',
    // ---- theme: the new logo's blues (#stage[data-theme="logo"]); remove the attribute to go back ----
    '#stage[data-theme="logo"] .bc-stage,#stage[data-theme="logo"] [style*="rgb(37, 19, 88) 0%, rgb(21, 9, 37) 65%"]{background:radial-gradient(55% 70% at 12% 8%,#0A6CFFB0 0%,transparent 62%),radial-gradient(50% 70% at 92% 95%,#0057FF99 0%,transparent 60%),radial-gradient(40% 55% at 75% 12%,#3DA9FF55 0%,transparent 60%),linear-gradient(160deg,#03060E 0%,#000000 100%)!important}',
    '#stage[data-theme="logo"] .am-arena{background:radial-gradient(55% 70% at 12% 8%,#0A6CFFB0 0%,transparent 62%),radial-gradient(50% 70% at 92% 95%,#0057FF99 0%,transparent 60%),radial-gradient(40% 55% at 75% 12%,#3DA9FF55 0%,transparent 60%),linear-gradient(160deg,#03060E 0%,#000000 100%)!important}',
    '#stage[data-theme="logo"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 82% 72%,#0057FF66,transparent 70%),radial-gradient(26% 34% at 70% 12%,#E2E8F02a,transparent 70%),radial-gradient(30% 40% at 40% 90%,#3DA9FF44,transparent 70%)!important}',
    '#stage[data-theme="logo"] .bc-title{background:linear-gradient(135deg,#0057FF,#1E8BFF 55%,#3DA9FF)!important;box-shadow:inset 0 2px 0 #ffffff55,inset 0 -3px 0 #0006,0 0 0 2px #04081A,0 0 18px #1E8BFF88!important}',
    '#stage[data-theme="logo"] .am-card{background:linear-gradient(160deg,#071230,#030817 55%,#02050F)!important;border-color:#3DA9FF88!important;box-shadow:0 8px 22px #0007,inset 0 1px 0 #ffffff24,0 0 18px #1E8BFF33!important}',
    '#stage[data-theme="logo"] .bc-glass{background:linear-gradient(160deg,#071230F2,#030817F2 60%,#02050FF2)!important;box-shadow:inset 0 0 0 1px #3DA9FF55}',
    '#stage[data-theme="logo"] .bc-tile{background:linear-gradient(110deg,color-mix(in srgb,var(--bc-c,#1E8BFF) 38%,#081633),#030815 72%)!important}',
    '#stage[data-theme="logo"] [style*="background: rgb(23, 23, 42)"]{background:linear-gradient(160deg,#071230,#040A1C)!important}',
    '#stage[data-theme="logo"] [style*="background: rgb(38, 38, 74)"]{background:linear-gradient(160deg,#0A1A44,#071230)!important}',
    '#stage[data-theme="logo"] [style*="background: rgb(14, 14, 28)"],#stage[data-theme="logo"] [style*="background: rgb(18, 18, 38)"],#stage[data-theme="logo"] [style*="background: rgb(20, 20, 40)"]{background:#040A1C!important}',
    '#stage[data-theme="logo"] [style*="background: rgb(37, 20, 67)"],#stage[data-theme="logo"] [style*="background: rgba(37, 20, 67, 0.8)"],#stage[data-theme="logo"] [style*="background: rgba(21, 9, 37, 0.8)"],#stage[data-theme="logo"] [style*="background: rgba(21, 9, 37, 0.667)"]{background:#040A1CD9!important}',
    '#stage[data-theme="logo"] [style*="border: 1px solid rgb(46, 46, 82)"],#stage[data-theme="logo"] [style*="border: 2px solid rgb(46, 46, 82)"],#stage[data-theme="logo"] [style*="border: 1px solid rgb(46, 46, 88)"]{border-color:#3DA9FF88!important}',
    '#stage[data-theme="logo"] .lb-pill,#stage[data-theme="logo"] .lb-ic .disc{--g-bg:linear-gradient(160deg,rgba(10,108,255,.62),rgba(2,5,15,.78))}',
    '#stage[data-theme="logo"] .lb-slot svg{fill:rgba(59,130,246,.14)!important;stroke:rgba(108,195,255,.75)!important}',
    '#stage[data-theme="logo"] .lb-slot .plus{background:linear-gradient(160deg,#3DA9FF,#0057FF)!important}',
    '#stage[data-theme="logo"] .lb-slot .lbl,#stage[data-theme="logo"] .lb-plate .nm{background:linear-gradient(160deg,rgba(10,108,255,.8),rgba(2,5,15,.85))!important;border-color:rgba(108,195,255,.6)!important}',
    '#stage[data-theme="logo"] .lb-party{background:linear-gradient(90deg,rgba(61,169,255,.7),rgba(0,87,255,.75))!important}',
    '#stage[data-theme="logo"] .lb-plate .dr{background:linear-gradient(160deg,#E2E8F0,#94A3B8)!important;color:#040A1C!important}',
    '#stage[data-theme="logo"] .lb-mode{box-shadow:0 0 0 2px #3DA9FF,0 0 0 4px rgba(226,232,240,.45),0 8px 26px rgba(10,108,255,.5)!important}',
    '#stage[data-theme="logo"] .lb-mode .chg{background:linear-gradient(90deg,#0057FF,#1E8BFF)!important}',
    '#stage[data-theme="logo"] .hm-pass{background:linear-gradient(120deg,rgba(255,197,61,.45),rgba(10,108,255,.45) 50%,rgba(2,5,15,.8))!important;border-color:rgba(108,195,255,.75)!important}',
    '#stage[data-theme="logo"] .lb-gear{background:linear-gradient(160deg,rgba(226,232,240,.35),rgba(0,87,255,.6))!important;border-color:rgba(166,220,255,.7)!important}',
    '#stage[data-theme="logo"] .lb-social{background:linear-gradient(160deg,rgba(61,169,255,.5),rgba(0,87,255,.62))!important}',
    '#stage[data-theme="logo"] [style*="rgba(124, 58, 237, 0.8) 0%, transparent 65%"]{background:radial-gradient(55% 70% at 12% 8%,#0A6CFFB0 0%,transparent 62%),radial-gradient(50% 70% at 92% 95%,#0057FF99 0%,transparent 60%),radial-gradient(40% 55% at 75% 12%,#3DA9FF55 0%,transparent 60%),linear-gradient(160deg,#03060E 0%,#000000 100%)!important}',
    '#stage[data-theme="logo"] .tn-bg{background:radial-gradient(55% 70% at 12% 8%,#0A6CFFB0 0%,transparent 62%),radial-gradient(50% 70% at 92% 95%,#0057FF99 0%,transparent 60%),radial-gradient(40% 55% at 75% 12%,#3DA9FF55 0%,transparent 60%),linear-gradient(160deg,#03060E 0%,#000000 100%)!important}',
    '#stage[data-theme="logo"] .cp-info .lb-go{background:linear-gradient(100deg,#3DA9FF,#0A6CFF 50%,#06154A)!important;box-shadow:inset 0 2px 0 #ffffff55,0 6px 0 #040A1C,0 10px 26px #0A6CFF77!important}',
    // ---- each screen: the logo's night blue with its own bright accent glowing in the corners ----
    '#stage[data-theme="logo"][data-screen="Tienda"] .bc-stage{--acc:#FFC53D;background:radial-gradient(55% 75% at 10% 4%,#FFC53DC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FFC53D66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Tienda"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FFC53D66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FFC53D2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Pase"] .bc-stage{--acc:#FFB020;background:radial-gradient(55% 75% at 10% 4%,#FFB020C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FFB02066 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Pase"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FFB02066,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FFB0202a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Logros"] .bc-stage{--acc:#FFC53D;background:radial-gradient(55% 75% at 10% 4%,#FFC53DC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FFC53D66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Logros"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FFC53D66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FFC53D2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Ranking"] .bc-stage{--acc:#22D3EE;background:radial-gradient(55% 75% at 10% 4%,#22D3EEC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#22D3EE66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Ranking"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#22D3EE2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Social"] .bc-stage{--acc:#2FBF71;background:radial-gradient(55% 75% at 10% 4%,#2FBF71C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#2FBF7166 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Social"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#2FBF7166,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#2FBF712a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Clubes"] .bc-stage{--acc:#14B8A6;background:radial-gradient(55% 75% at 10% 4%,#14B8A6C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#14B8A666 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Clubes"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#14B8A666,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#14B8A62a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Minijuegos"] .bc-stage{--acc:#EC4899;background:radial-gradient(55% 75% at 10% 4%,#EC4899C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#EC489966 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Minijuegos"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#EC489966,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#EC48992a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Torneo"] .bc-stage{--acc:#FF8A3D;background:radial-gradient(55% 75% at 10% 4%,#FF8A3DC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FF8A3D66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Torneo"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FF8A3D66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FF8A3D2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Perfil"] .bc-stage{--acc:#22D3EE;background:radial-gradient(55% 75% at 10% 4%,#22D3EEC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#22D3EE66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Perfil"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#22D3EE2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Estadisticas"] .bc-stage{--acc:#FF8A3D;background:radial-gradient(55% 75% at 10% 4%,#FF8A3DC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FF8A3D66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Estadisticas"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FF8A3D66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FF8A3D2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Ajustes"] .bc-stage{--acc:#3DA9FF;background:radial-gradient(55% 75% at 10% 4%,#3DA9FFC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#3DA9FF66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Ajustes"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#3DA9FF66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#3DA9FF2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Idioma"] .bc-stage{--acc:#22D3EE;background:radial-gradient(55% 75% at 10% 4%,#22D3EEC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#22D3EE66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Idioma"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#22D3EE2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="MiEstadio"] .bc-stage{--acc:#2FBF71;background:radial-gradient(55% 75% at 10% 4%,#2FBF71C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#2FBF7166 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="MiEstadio"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#2FBF7166,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#2FBF712a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Privada"] .bc-stage{--acc:#22D3EE;background:radial-gradient(55% 75% at 10% 4%,#22D3EEC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#22D3EE66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Privada"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#22D3EE2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Taquilla"] .bc-stage{--acc:#3DA9FF;background:radial-gradient(55% 75% at 10% 4%,#3DA9FFC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#3DA9FF66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Taquilla"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#3DA9FF66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#3DA9FF2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Modos"] .bc-stage{--acc:#2FBF71;background:radial-gradient(55% 75% at 10% 4%,#2FBF71C8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#2FBF7166 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Modos"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#2FBF7166,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#2FBF712a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Rapida"] .bc-stage{--acc:#22D3EE;background:radial-gradient(55% 75% at 10% 4%,#22D3EEC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#22D3EE66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Rapida"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#22D3EE66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#22D3EE2a,transparent 70%)!important}',
    '#stage[data-theme="logo"][data-screen="Competitivo"] .bc-stage{--acc:#FFC53D;background:radial-gradient(55% 75% at 10% 4%,#FFC53DC8 0%,transparent 62%),radial-gradient(50% 70% at 94% 96%,#0A3DCCB0 0%,transparent 62%),radial-gradient(38% 50% at 78% 10%,#FFC53D66 0%,transparent 62%),linear-gradient(160deg,#06102E 0%,#030A22 55%,#02040C 100%)!important}',
    '#stage[data-theme="logo"][data-screen="Competitivo"] .am-bg::before{background:radial-gradient(32% 42% at 18% 28%,#FFC53D66,transparent 70%),radial-gradient(30% 40% at 82% 72%,#1E8BFF55,transparent 70%),radial-gradient(30% 40% at 40% 90%,#FFC53D2a,transparent 70%)!important}',
    // ---- titles: Russo One, upright (no italic) ----
    '.bc-title,.bc-title.hd,#stage .bc-title.hd,#stage .tn-big,#stage .ttl,#am-daily h2,#am-res .t,#am-res .t .lt,#am-res .lvup,.jc-wheel .side h2,.jc-wheel .won-card b{font-family:"Titulos",sans-serif!important;font-style:normal!important;font-weight:400!important}',
    '.bc-title.hd,#stage .bc-title.hd{font-size:21px!important;letter-spacing:1px!important;padding:3px 18px 0!important}',
  ].join('\n');
  // the colour rules that match on inline styles ([style*=...]) are costly to re-check while a match updates its
  // HUD every frame: they live in their own sheet, switched off while a game is on screen
  var cssAttr = document.createElement('style'), lines = css.textContent.split('\n');
  cssAttr.textContent = lines.filter(function (l) { return l.indexOf('[style*=') >= 0; }).join('\n');
  css.textContent = lines.filter(function (l) { return l.indexOf('[style*=') < 0; }).join('\n');
  document.head.appendChild(css); document.head.appendChild(cssAttr);
  var syncAttr = function () { var off = inGame(); if (cssAttr.disabled !== off) cssAttr.disabled = off; };
  window.addEventListener('hashchange', function () { syncAttr(); setTimeout(syncAttr, 60); setTimeout(syncAttr, 450); });
  // a match starting or ending inside a screen (the lobbies embed it): checked as the page changes, not on a timer
  // (a mutation observer runs before the next paint, so the new screen is never drawn with the wrong colours)
  try { new MutationObserver(syncAttr).observe(stage || document.body, { childList: true, subtree: false, attributes: true, attributeFilter: ['data-screen'] }); } catch (e) {}
  setInterval(syncAttr, 1500);

  // ---- light menus for modest phones ----
  // looping effects that change a background position, a glow (box-shadow), a filter or a clip make the phone
  // repaint that part of the screen on every frame; a modest phone spends its time there and the menus stutter.
  // On such a phone (Gráficos: Baja, or Automático on a phone with few cores / little memory, or one that already had
  // to drop the shadows in a match) those loops are stopped at their first frame. Moves, fades and turns
  // (transform, opacity) are cheap and keep running.
  var liteMenus = function () {
    var P = {}; try { P = window.AMPlay ? window.AMPlay() : {}; } catch (e) {}
    if (P.gfx === 'baja') return true;
    if (P.gfx && P.gfx !== 'auto') return false;
    var A = null; try { A = JSON.parse(localStorage.getItem('arenamix.gfxdyn.v1') || 'null'); } catch (e) {}
    if (A) return !A.shadows;
    return (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  };
  var CHEAP = /^(offset|easing|composite|computedOffset|transform|opacity|translate|scale|rotate)$/;
  var stopped = typeof WeakSet === 'function' ? new WeakSet() : null;
  var calm = function () {
    if (!stopped || !document.getAnimations || inGame() || !liteMenus()) return;
    var L = document.getAnimations();
    for (var i = 0; i < L.length; i++) {
      var a = L[i];
      if (stopped.has(a) || a.playState !== 'running' || !a.effect || a.effect.getTiming().iterations !== Infinity) continue;
      stopped.add(a);
      var heavy = false;
      try { a.effect.getKeyframes().forEach(function (k) { for (var p in k) if (!CHEAP.test(p) && k[p] != null) heavy = true; }); } catch (e) {}
      if (heavy) { try { a.currentTime = 0; a.pause(); } catch (e) {} }
    }
  };
  if (!reduce) {
    window.addEventListener('hashchange', function () { setTimeout(calm, 400); setTimeout(calm, 1500); });
    setTimeout(calm, 1200); setInterval(calm, 2500);
  }
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
  var MODES = ['push', 'flip', 'zoom', 'iris', 'slash'];
  var lastMode = '', pending = null, tok = 0, sting = null;
  var cleanup = [];
  var clearAll = function () { cleanup.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); };
  // a still copy of the screen, canvases included (as far as the browser lets them be read)
  var freeze = function (old) {
    var c = old.cloneNode(true);
    c.id = 'fx-old'; c.removeAttribute('class'); c.className = old.className.replace(/\bfx-\S+/g, '');
    c.setAttribute('aria-hidden', 'true'); c.inert = true;
    // its backgrounds are set per screen (#stage[data-screen]): pin them on the copy, or while it leaves it would
    // switch to the next screen's photo for a moment
    var sel = '.bc-stage, .am-bg, .am-arena, .tn-bg, .lg-photo', oa = [old].concat([].slice.call(old.querySelectorAll(sel))), ca = [c].concat([].slice.call(c.querySelectorAll(sel)));
    for (var j = 0; j < oa.length && j < ca.length; j++) { try { var cs = getComputedStyle(oa[j]); ca[j].style.setProperty('background', 'none'); ca[j].style.setProperty('background-color', cs.backgroundColor, 'important'); ca[j].style.setProperty('background-image', cs.backgroundImage, 'important'); ca[j].style.setProperty('background-size', cs.backgroundSize, 'important'); ca[j].style.setProperty('background-position', cs.backgroundPosition, 'important'); } catch (e) {} }
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
        if (++n < 2 && performance.now() - t0 < 1500) { requestAnimationFrame(wait); return; }
        s.classList.add('out');
        setTimeout(function () { s.remove(); if (sting === s) sting = null; }, 320);
      };
      requestAnimationFrame(wait);
    }, 140);
  };
  window.AMFX = {
    swap: function (doSwap) {
      var tk = ++tok;
      clearAll();
      mountFx();
      var old = rootOf();
      // into or out of a game (or a screen with a live 3D view): the stinger, which covers the build-up
      if (!old || inGame() || GAME.test(prevHash) || old.querySelector('canvas:not([data-am-shared])')) { stinger(tk, doSwap); return; }
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
      if (!el.offsetParent || ownAnim(el)) continue;
      el.style.animationDelay = (lag + n * 0.014).toFixed(3) + 's'; el.classList.add('fx-pop');
      n++;
    }
    setTimeout(function () { for (var q = 0; q < items.length; q++) { items[q].classList.remove('fx-pop'); items[q].style.animationDelay = ''; } }, 900);
  };
  new MutationObserver(function () { var r = rootOf(); if (r) enter(r); }).observe(stage, { childList: true });

  // the backgrounds, decoded once and kept: no blank frame while a big photo is decoded again on each screen change
  window.__amBgs = ['assets/bg_estadio.jpg', 'assets/bg_tribuna.jpg', 'assets/bg_trofeos.jpg', 'assets/lobby_bg.jpg'].map(function (u) { var im = new Image(); im.src = u; if (im.decode) im.decode().catch(function () {}); return im; });

  // the coin and gem icons of the menus (flat drawings) get the 3D coin and gem: drawn once, used as the
  // background of those little svgs (their own shapes hidden), so the screens themselves don't change
  (function icon3d(tries) {
    var G = window.AMGear, c = G && G.prize ? G.prize('coin') : '', g = G && G.prize ? G.prize('gems:1') : '';
    if (!c || !g) { if (tries < 40) setTimeout(function () { icon3d(tries + 1); }, 500); return; }
    var st = document.createElement('style'), CO = 'svg.am-coin,svg:has(>circle[r="10"][fill="#FFC53D"])', GE = 'svg:has(>path[d="M7 3h10l4 6l-9 12L3 9z"])';
    st.textContent = CO + '{background:url(' + c + ') center/135% no-repeat;overflow:visible}' + CO.split(',').map(function (q) { return q + '>*'; }).join(',') + '{visibility:hidden}' +
      GE + '{background:url(' + g + ') center/140% no-repeat;overflow:visible}' + GE + '>*{visibility:hidden}';
    document.head.appendChild(st);
  })(0);

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
    var mine = Array.prototype.slice.call(layer.querySelectorAll('.fx-ring,.fx-spark'));
    setTimeout(function () { mine.forEach(function (n) { n.remove(); }); }, 600);
  };
  document.addEventListener('pointerdown', function (e) {
    if (inGame()) return;
    var el = e.target.closest && e.target.closest(pressable);
    if (!el || !stage.contains(el)) return;
    el.classList.add('fx-btn', 'fx-down'); down = el;
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (err) {}
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
        if (el.nodeType !== 1 || el.id === 'fx-layer' || el.closest('#fx-layer') || ownAnim(el)) continue;
        if (slideDir) { el.style.setProperty('--fx-dx', (slideDir * 34) + 'px'); el.classList.remove('fx-slide'); void el.offsetWidth; el.classList.add('fx-slide'); }
        else { el.style.animationDelay = (n * 0.03).toFixed(2) + 's'; el.classList.remove('fx-pop'); void el.offsetWidth; el.classList.add('fx-pop'); }
        n++;
      }
    });
  }).observe(stage, { childList: true, subtree: true });

  // ---- hold a card and it leans towards your finger ----
  var tiltEl = null, tiltTf = '', tiltLoopId = 0;
  // the screens redraw their own markup now and then: keep the lean applied while the finger is down
  var tiltPt = null;
  var tiltHold = function () {
    tiltLoopId = 0; if (!tiltEl) return;
    // the card was rebuilt under the finger: carry on with the new one
    if (!tiltEl.isConnected && tiltPt) { var nu = tiltable(document.elementFromPoint(tiltPt.x, tiltPt.y)); if (nu) tiltEl = nu; else { tiltEl = null; return; } } if (!tiltEl.classList.contains('fx-tilt')) tiltEl.classList.add('fx-tilt'); if (tiltTf && tiltEl.style.transform !== tiltTf) tiltEl.style.transform = tiltTf; tiltLoopId = requestAnimationFrame(tiltHold); };
  var tiltable = function (el) {
    if (!el || !stage.contains(el)) return null;
    var c = el.closest('button, a[href], [role="button"], .bc-tile, .am-card');
    // or a card laid out in a grid of cards
    // or any card-sized rounded panel with a background
    if (!c) for (var q = el, up = 0; q && q !== stage && up < 6; q = q.parentElement, up++) {
      var cs = getComputedStyle(q), rq = q.getBoundingClientRect(), sc = stage.getBoundingClientRect().width / 844;
      if ((parseFloat(cs.borderTopLeftRadius) >= 8 || /round/.test(cs.clipPath)) && (cs.backgroundImage !== 'none' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') && rq.width / sc >= 90 && rq.width / sc <= 420 && rq.height / sc >= 60 && rq.height / sc <= 330) { c = q; break; }
    }
    if (!c || c.closest('[role="tablist"]')) return null;
    var r = c.getBoundingClientRect(), s = stage.getBoundingClientRect().width / 844;
    if (r.width / s < 90 || r.height / s < 60) return null;
    if (c.style.transform || getComputedStyle(c).transform !== 'none') return null;
    return c;
  };
  var untilt = function () {
    if (!tiltEl) return;
    var el = tiltEl; tiltEl = null; tiltTf = ''; cancelAnimationFrame(tiltLoopId); tiltLoopId = 0;
    el.classList.remove('fx-tilt'); el.classList.add('fx-tilt-off'); el.style.transform = '';
    setTimeout(function () { el.classList.remove('fx-tilt-off'); }, 460);
  };
  document.addEventListener('pointerdown', function (e) {
    if (inGame()) return;
    var c = tiltable(e.target);
    if (!c) return;
    tiltEl = c; c.classList.add('fx-tilt'); tiltTf = ''; tiltPt = { x: e.clientX, y: e.clientY }; if (!tiltLoopId) tiltLoopId = requestAnimationFrame(tiltHold);
  }, true);
  var tiltMove = function (x, y) {
    if (!tiltEl) return;
    tiltPt = { x: x, y: y };
    var r = tiltEl.getBoundingClientRect(), u = (x - r.left) / r.width - 0.5, v = (y - r.top) / r.height - 0.5;
    tiltTf = 'perspective(600px) rotateY(' + (u * 14).toFixed(1) + 'deg) rotateX(' + (-v * 12).toFixed(1) + 'deg) scale(1.03)';
    tiltEl.style.transform = tiltTf;
  };
  // a finger keeps sending touch moves even after the browser takes the gesture over (the pointer is
  // cancelled then), so the lean follows touches and ends when the finger lifts
  document.addEventListener('pointermove', function (e) { tiltMove(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) tiltMove(t.clientX, t.clientY); }, { passive: true });
  document.addEventListener('pointerup', untilt, true);
  document.addEventListener('touchend', function (e) { if (!e.touches.length) untilt(); }, true);
  document.addEventListener('touchcancel', untilt, true);

  // ---- tap an empty spot: a ball hops away ----
  document.addEventListener('pointerdown', function (e) {
    if (inGame() || !stage.contains(e.target)) return;
    if (e.target.closest(pressable + ', input, select, textarea, label, iframe, canvas, [onclick], #jc-layer')) return;
    if (layer.querySelectorAll('.fx-ball').length > 3) return;
    mountFx();
    var p = stageXY(e), dir = p.x > 422 ? -1 : 1, d = (90 + Math.random() * 90) * dir;
    var ball = document.createElement('div'); ball.className = 'fx-ball';
    ball.style.left = p.x + 'px'; ball.style.top = p.y + 'px';
    ball.style.setProperty('--bx', d.toFixed(0) + 'px'); ball.style.setProperty('--br', (d * 4).toFixed(0) + 'deg');
    ball.appendChild(document.createElement('b'));
    layer.appendChild(ball);
    setTimeout(function () { ball.remove(); }, 1350);
  });

  // ---- motes of light in every menu backdrop ----
  var MC = ['#9BEFFF', '#FFE38A', '#C79BFF', '#9BEFFF', '#FF9AC8'];
  var motes = function (root) {
    if (!root || inGame()) return;
    var bgs = root.querySelectorAll('.am-bg');
    for (var k = 0; k < bgs.length; k++) {
      if (bgs[k].querySelector('.am-motes')) continue;
      var box = document.createElement('div'); box.className = 'am-motes';
      for (var j = 0; j < 14; j++) {
        var i = document.createElement('i');
        i.style.left = (Math.random() * 100).toFixed(1) + '%';
        i.style.setProperty('--s', (2 + Math.random() * 4).toFixed(1) + 'px');
        i.style.setProperty('--c', MC[j % MC.length]);
        i.style.setProperty('--d', (7 + Math.random() * 7).toFixed(1) + 's');
        i.style.setProperty('--dx', ((Math.random() - 0.5) * 60).toFixed(0) + 'px');
        i.style.animationDelay = '-' + (Math.random() * 12).toFixed(1) + 's';
        box.appendChild(i);
      }
      bgs[k].appendChild(box);
    }
  };
  new MutationObserver(function () { var r = rootOf(); if (r) motes(r); }).observe(stage, { childList: true });

  // first screen
  var first = rootOf(); if (first) { enter(first); motes(first); }
})();
