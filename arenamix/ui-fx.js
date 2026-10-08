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
    '.am-arena::before{content:"";position:absolute;left:50%;top:44%;width:1100px;height:1100px;margin:-550px 0 0 -550px;background:repeating-conic-gradient(#22D3EE14 0 7deg,transparent 7deg 18deg);-webkit-mask-image:radial-gradient(closest-side,#000,transparent);mask-image:radial-gradient(closest-side,#000,transparent);animation:amSpin 70s linear infinite;pointer-events:none}',
    '.am-arena::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,#FFFFFF55 1px,transparent 1.6px) 0 0/11px 9px,radial-gradient(circle,#22D3EE55 1px,transparent 1.6px) 5px 4px/14px 12px;-webkit-mask-image:linear-gradient(180deg,transparent 4%,#000 14%,#000 36%,transparent 48%);mask-image:linear-gradient(180deg,transparent 4%,#000 14%,#000 36%,transparent 48%);opacity:.55}',
    '.am-arena>.aa-pitch{position:absolute;left:-60%;right:-60%;bottom:-20px;height:420px;transform:perspective(520px) rotateX(58deg);transform-origin:50% 100%;background:radial-gradient(circle at 50% 35%,transparent 64px,#FFFFFF33 65px 68px,transparent 69px),linear-gradient(90deg,transparent calc(50% - 2px),#FFFFFF33 calc(50% - 2px) calc(50% + 2px),transparent calc(50% + 2px)),repeating-linear-gradient(90deg,#1B5232 0 80px,#164529 80px 160px);-webkit-mask-image:linear-gradient(0deg,#000 30%,transparent 62%);mask-image:linear-gradient(0deg,#000 30%,transparent 62%);opacity:.8}',
    '.am-arena>.aa-beam{position:absolute;top:-30px;width:300px;height:520px;margin-left:-150px;background:linear-gradient(180deg,#E8F6FF30,transparent 75%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);transform-origin:50% 0;will-change:transform;animation:aaBeam 6s ease-in-out infinite alternate}',
    '.am-arena>.aa-beam.r{animation-delay:-3s;animation-direction:alternate-reverse}',
    '@keyframes aaBeam{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}',
    '.am-arena>.aa-flash{position:absolute;width:10px;height:10px;margin:-5px;border-radius:50%;background:radial-gradient(closest-side,#fff,#ffffff55 40%,transparent);opacity:0;animation:aaFlash 3.2s infinite}',
    '@keyframes aaFlash{0%,90%,100%{opacity:0}93%{opacity:1}}',
    '.am-arena~*{position:relative}',
    // ---- a living app: things that move on their own and answer your finger ----
    // the backdrop drifts with the phone's tilt (or the finger): depth
    '.am-bg,.bc-beams,.rg-bg,.md-bg{transform:translate3d(calc(var(--px,0) * -12px),calc(var(--py,0) * -9px),0) scale(1.05);transition:transform .25s ease-out}',
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
    '@keyframes fxBallR{to{rotate:var(--br)}}'
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
  var MODES = ['push', 'flip', 'zoom', 'iris', 'slash'];
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
        if (el.nodeType !== 1 || el.id === 'fx-layer' || el.closest('#fx-layer')) continue;
        if (slideDir) { el.style.setProperty('--fx-dx', (slideDir * 34) + 'px'); el.classList.remove('fx-slide'); void el.offsetWidth; el.classList.add('fx-slide'); }
        else { el.style.animationDelay = (n * 0.03).toFixed(2) + 's'; el.classList.remove('fx-pop'); void el.offsetWidth; el.classList.add('fx-pop'); }
        n++;
      }
    });
  }).observe(stage, { childList: true, subtree: true });

  // ---- tilt the phone (or move a finger): the backdrop drifts behind the screen ----
  var tgt = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, gyro = false, tiltRaf = 0;
  var tiltLoop = function () {
    tiltRaf = 0;
    if (inGame()) return;
    cur.x += (tgt.x - cur.x) * 0.12; cur.y += (tgt.y - cur.y) * 0.12;
    stage.style.setProperty('--px', cur.x.toFixed(3)); stage.style.setProperty('--py', cur.y.toFixed(3));
    if (Math.abs(tgt.x - cur.x) > 0.002 || Math.abs(tgt.y - cur.y) > 0.002) tiltRaf = requestAnimationFrame(tiltLoop);
  };
  var aim = function (x, y) { tgt.x = Math.max(-1, Math.min(1, x)); tgt.y = Math.max(-1, Math.min(1, y)); if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltLoop); };
  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null || inGame()) return;
    gyro = true;
    // landscape: the phone's beta (front/back) moves things sideways, gamma up and down
    var land = Math.abs(window.orientation || 0) === 90 || (screen.orientation && /landscape/.test(screen.orientation.type));
    var a = land ? e.beta : e.gamma, b = land ? e.gamma : e.beta - 40;
    aim((a || 0) / 25, (b || 0) / 25);
  });
  document.addEventListener('pointermove', function (e) {
    if (gyro || inGame()) return;
    var p = stageXY(e); aim((p.x - 422) / 422, (p.y - 195) / 195);
  }, { passive: true });

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
    if (e.target.closest(pressable + ', input, select, textarea, canvas, [onclick]')) return;
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
