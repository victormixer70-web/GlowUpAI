/* ARENA MIX — runtime that plays the .dc.html screens as a standalone app. */
(function () {
  'use strict';
  var h = preact.h, render = preact.render, PComponent = preact.Component;

  var SCREENS = ['Main', 'Idioma', 'Deportes', 'Modos', 'Rangos', 'Taquilla', 'Tienda', 'Estadisticas',
    'Rapida', 'Competitivo', 'Privada', 'Entrenamiento', 'Tutorial', 'Perfil', 'Logros', 'Ajustes',
    'Baloncesto', 'Tenis', 'Voley', 'Partido', 'Duelo', 'Avatar', 'RangosTabla', 'Nav', 'Pase', 'EntrenoLibre', 'Minijuegos', 'Torneo'];
  var registry = {};
  var helmetDone = {};

  /* ---------- template evaluation ---------- */
  var WHOLE = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
  var ANY = /\{\{\s*([^{}]+?)\s*\}\}/g;

  /* Templates are compiled once into small functions (a template is walked only the first time it renders);
     after that a re-render only evaluates bindings and builds vnodes. */
  function getter(path) {
    path = path.trim();
    if (path === 'true') return function () { return true; };
    if (path === 'false') return function () { return false; };
    if (path === 'null') return function () { return null; };
    if (/^-?\d+(\.\d+)?$/.test(path)) { var num = Number(path); return function () { return num; }; }
    if (/^'.*'$|^".*"$/.test(path)) { var lit = path.slice(1, -1); return function () { return lit; }; }
    var parts = path.split('.'), head = parts[0], rest = parts.slice(1), nr = rest.length;
    return function (scope) {
      var cur;
      for (var i = scope.length - 1; i >= 0; i--) {
        var sc = scope[i];
        if (sc && Object.prototype.hasOwnProperty.call(sc, head)) { cur = sc[head]; break; }
      }
      for (var j = 0; j < nr && cur != null; j++) cur = cur[rest[j]];
      return cur;
    };
  }
  // a string with bindings: whole-binding keeps the value's type, mixed text becomes a string
  function compileValue(str) {
    var m = WHOLE.exec(str);
    if (m) return getter(m[1]);
    if (str.indexOf('{{') < 0) return function () { return str; };
    var bits = [], last = 0, mm;
    ANY.lastIndex = 0;
    while ((mm = ANY.exec(str))) { if (mm.index > last) bits.push(str.slice(last, mm.index)); bits.push(getter(mm[1])); last = ANY.lastIndex; }
    if (last < str.length) bits.push(str.slice(last));
    var nb = bits.length;
    return function (scope) {
      var out = '';
      for (var i = 0; i < nb; i++) { var b = bits[i]; if (typeof b === 'string') out += b; else { var v = b(scope); if (v != null) out += v; } }
      return out;
    };
  }
  function value(str, scope) { return compileValue(str)(scope); }
  function camel(s) { return s.replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); }); }

  // compile(node) -> function(scope, out): pushes the node's vnodes (or strings) onto out
  function compileKids(node) {
    var fns = [];
    for (var c = node.firstChild; c; c = c.nextSibling) { var f = compile(c); if (f) fns.push(f); }
    var n = fns.length;
    return function (scope, out) { for (var i = 0; i < n; i++) fns[i](scope, out); };
  }
  function compile(node) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!/\S/.test(t)) return function (scope, out) { out.push(' '); };
      if (t.indexOf('{{') < 0) return function (scope, out) { out.push(t); };
      var tv = compileValue(t);
      return function (scope, out) { var v = tv(scope); out.push(v == null ? '' : String(v)); };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'helmet' || tag === 'script') return null;
    if (tag === 'sc-if') {
      var cond = compileValue(node.getAttribute('value') || ''), kidsIf = compileKids(node);
      return function (scope, out) { if (cond(scope)) kidsIf(scope, out); };
    }
    if (tag === 'sc-for') {
      var listOf = compileValue(node.getAttribute('list') || ''), as = node.getAttribute('as') || 'item', kidsFor = compileKids(node);
      return function (scope, out) {
        var list = listOf(scope) || [];
        for (var i = 0; i < list.length; i++) { var sc = {}; sc[as] = list[i]; sc.$index = i; kidsFor(scope.concat([sc]), out); }
      };
    }
    var attrs = [];
    for (var k = 0; k < node.attributes.length; k++) {
      var at = node.attributes[k], an = at.name;
      if (an.indexOf('hint-') === 0) continue;
      if (tag === 'dc-import') { if (an === 'name') continue; an = camel(an); }
      else if (an === 'for') an = 'htmlFor';
      attrs.push([an, compileValue(at.value)]);
    }
    var na = attrs.length;
    if (tag === 'dc-import') {
      var cname = node.getAttribute('name');
      return function (scope, out) {
        var Comp = registry[cname];
        if (!Comp) return;
        var props = {};
        for (var i = 0; i < na; i++) props[attrs[i][0]] = attrs[i][1](scope);
        out.push(h(Comp, props));
      };
    }
    var kidsEl = compileKids(node);
    return function (scope, out) {
      var p = {};
      for (var i = 0; i < na; i++) p[attrs[i][0]] = attrs[i][1](scope);
      var kids = [];
      kidsEl(scope, kids);
      out.push(h.apply(null, [tag, p].concat(kids)));
    };
  }
  function children(node, scope) {
    var f = node.__amc || (node.__amc = compileKids(node));
    var out = [];
    f(scope, out);
    return out;
  }

  /* ---------- game controller: one reader for every screen, and moving around the menus with it ----------
     AMPad.on(fn) calls fn(state, previous) every frame while a controller is connected (state: ax, ay, rx, ry and
     b[] for the buttons, standard mapping). A screen that is playing calls AMPad.hold() each frame so the menu
     navigation keeps out of the way (the match reads the controller itself). */
  (function () {
    var subs = [], prev = null, raf = null, holdAt = 0;
    function read() {
      var ps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < (ps ? ps.length : 0); i++) if (ps[i] && ps[i].connected !== false && ps[i].buttons && ps[i].buttons.length) return ps[i];
      return null;
    }
    function frame() {
      raf = null;
      var p = null;
      try { p = read(); } catch (e) {}
      if (!p) { prev = null; return; }
      var st = { ax: p.axes[0] || 0, ay: p.axes[1] || 0, rx: p.axes[2] || 0, ry: p.axes[3] || 0, b: [] };
      for (var k = 0; k < 17; k++) { var bt = p.buttons[k]; st.b.push(!!(bt && (bt.pressed || bt.value > 0.5))); }
      var pv = prev || st;
      prev = st;
      subs.slice().forEach(function (fn) { try { fn(st, pv); } catch (e) { console.error(e); } });
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('gamepadconnected', kick);
    setInterval(function () { try { if (!raf && read()) kick(); } catch (e) {} }, 1200);
    window.AMPad = {
      on: function (fn) { subs.push(fn); kick(); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      hold: function () { holdAt = performance.now(); },
      held: function () { return performance.now() - holdAt < 250; },
      connected: function () { try { return !!read(); } catch (e) { return false; } }
    };

    // menus: the stick / d-pad moves a highlight between the buttons, A presses, B goes back, LB/RB change tab
    var cur = null, rep = { dir: null, at: 0 }, SEL = 'button:not([disabled]), a[href], [role="tab"], [role="radio"], input[type="range"], input[type="text"], [tabindex]:not([tabindex="-1"])';
    var css = document.createElement('style');
    css.textContent = '.am-padfocus{outline:3px solid #FFC53D !important;outline-offset:3px;box-shadow:0 0 0 7px #FFC53D40,0 0 22px #FFC53DAA !important;transition:outline-color .2s}';
    document.head.appendChild(css);
    function visible(el) {
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || +cs.opacity === 0) return false;
      // not covered by something else (a dialog on top, the results screen...)
      var x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      var top = document.elementFromPoint(x, y);
      return !!top && (top === el || el.contains(top) || top.contains(el));
    }
    function all() { return Array.prototype.filter.call(document.querySelectorAll(SEL), function (el) { return !el.closest('.am-nopad') && visible(el); }); }
    function setCur(el) {
      if (cur && cur !== el) cur.classList.remove('am-padfocus');
      cur = el;
      if (!el) return;
      el.classList.add('am-padfocus');
      try { el.focus({ preventScroll: true }); } catch (e) {}
      try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
    }
    function centre(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    function first(list) {
      // the screen's main button if there is one, else the one nearest the middle
      var main = list.filter(function (el) { return /bc-btn|tn-go|am-shine|mj-go/.test(el.className || ''); })[0];
      if (main) return main;
      var c = { x: innerWidth / 2, y: innerHeight / 2 };
      return list.slice().sort(function (a, b) { var p = centre(a), q = centre(b); return Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y); })[0] || null;
    }
    function move(dx, dy) {
      var list = all();
      if (!list.length) return;
      if (!cur || list.indexOf(cur) < 0) { setCur(first(list)); return; }
      var o = centre(cur), best = null, bs = Infinity;
      list.forEach(function (el) {
        if (el === cur) return;
        var p = centre(el), vx = p.x - o.x, vy = p.y - o.y, along = vx * dx + vy * dy, side = Math.abs(vx * dy - vy * dx);
        if (along <= 2) return;
        var sc = along + side * 2.2;
        if (sc < bs) { bs = sc; best = el; }
      });
      if (best) setCur(best);
    }
    function press(el) {
      if (!el) return;
      if (el.tagName === 'INPUT' && el.type === 'text') { el.focus(); return; }
      var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      var o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 77, pointerType: 'mouse', isPrimary: true, button: 0 };
      try { el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); } catch (e) {}
      el.click();
    }
    function nudge(el, d) {
      // a slider: left / right move it
      var step = (+el.max - +el.min) / 10 || 1;
      el.value = Math.max(+el.min, Math.min(+el.max, +el.value + d * step));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    window.AMPad.on(function (st, pv) {
      if (window.AMPad.held()) { if (cur) { cur.classList.remove('am-padfocus'); cur = null; } return; }
      var now = performance.now(), dz = 0.55;
      var dir = st.b[12] || st.ay < -dz ? 'u' : st.b[13] || st.ay > dz ? 'd' : st.b[14] || st.ax < -dz ? 'l' : st.b[15] || st.ax > dz ? 'r' : null;
      if (dir && (dir !== rep.dir || now > rep.at)) {
        rep.at = now + (dir !== rep.dir ? 380 : 150); rep.dir = dir;
        if (cur && cur.tagName === 'INPUT' && cur.type === 'range' && (dir === 'l' || dir === 'r') && document.contains(cur)) nudge(cur, dir === 'l' ? -1 : 1);
        else move(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0);
      }
      if (!dir) rep.dir = null;
      if (st.b[0] && !pv.b[0]) { if (cur && document.contains(cur) && visible(cur)) press(cur); else move(0, 0); }
      if (st.b[1] && !pv.b[1]) { var back = all().filter(function (el) { return /^(Volver|Atrás|Cerrar|Back|Close)$/i.test(el.getAttribute('aria-label') || ''); })[0]; if (back) press(back); }
      if ((st.b[4] && !pv.b[4]) || (st.b[5] && !pv.b[5])) {
        var tabs = all().filter(function (el) { return el.getAttribute('role') === 'tab'; });
        var i = tabs.findIndex(function (el) { return el.getAttribute('aria-selected') === 'true'; });
        var t = tabs[(i + (st.b[5] ? 1 : -1) + tabs.length) % tabs.length];
        if (t) press(t);
      }
      // the highlighted button went away (new screen): pick again on the next move
      if (cur && !document.contains(cur)) cur = null;
    });
  })();

  /* ---------- gameplay settings (Configuración > Jugabilidad), read by the match screens ---------- */
  window.AMPlay = function () {
    // only personal settings (what you see): the rules of a match are the same for everybody online
    var d = { music: 0.6, sfx: 0.8, cam: 'normal', names: true, gfx: 'auto', passMark: true, narr: true };
    try { var v = JSON.parse(localStorage.getItem('arenamix.play.v1') || 'null'); if (v) for (var k in d) if (v[k] != null) d[k] = v[k]; } catch (e) {}
    return d;
  };

  /* ---------- DC component base ---------- */
  function DCLogic(props, ctx) { PComponent.call(this, props, ctx); }
  DCLogic.prototype = Object.create(PComponent.prototype);
  DCLogic.prototype.constructor = DCLogic;
  DCLogic.prototype.render = function () {
    var vals = this.renderVals ? this.renderVals() : {};
    var kids = children(this.__tpl, [vals || {}]).filter(function (k) { return typeof k !== 'string' || /\S/.test(k); });
    return kids.length === 1 && typeof kids[0] === 'object' ? kids[0] : h('div', { style: 'display: contents' }, kids);
  };

  function load(name) {
    return fetch('screens/' + name + '.dc.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (src) {
      var doc = new DOMParser().parseFromString(src, 'text/html');
      var xdc = doc.querySelector('x-dc');
      var helmet = xdc.querySelector('helmet');
      if (helmet) {
        Array.prototype.forEach.call(helmet.children, function (el) {
          var key = el.outerHTML;
          if (helmetDone[key]) return;
          helmetDone[key] = true;
          var copy = document.createElement(el.localName);
          Array.prototype.forEach.call(el.attributes, function (a) { copy.setAttribute(a.name, a.value); });
          copy.textContent = el.textContent;
          document.head.appendChild(copy);
        });
      }
      var code = doc.querySelector('script[data-dc-script]').textContent;
      var Cls = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
      Cls.prototype.__tpl = xdc;
      Cls.displayName = name;
      registry[name] = Cls;
    });
  }

  /* ---------- app shell ---------- */
  function current() {
    var m = /^#\/([A-Za-z0-9]+)/.exec(location.hash);
    var name = m && registry[m[1]] ? m[1] : 'Main';
    // nobody gets past the entrance without a player name
    var O = window.AMOnline;
    if (name !== 'Main' && name !== 'Idioma' && O && O.hasName && !O.hasName()) { try { history.replaceState(null, '', '#/Main'); } catch (e) {} return 'Main'; }
    return name;
  }
  function App() { PComponent.call(this); this.state = { screen: current() }; }
  App.prototype = Object.create(PComponent.prototype);
  App.prototype.componentDidMount = function () {
    var self = this;
    window.addEventListener('hashchange', function () {
      var go = function () { self.setState({ screen: current() }); };
      // with the interface motion loaded, the change happens under its covering wipe
      if (window.AMFX && window.AMFX.swap && current() !== self.state.screen) window.AMFX.swap(go); else go();
    });
  };
  App.prototype.render = function () {
    var Comp = registry[this.state.screen];
    return h(Comp, { key: this.state.screen });
  };

  function fit() {
    var stage = document.getElementById('stage');
    var s = Math.min(window.innerWidth / 844, window.innerHeight / 390);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    var m = /^\/?([A-Za-z0-9]+)\.dc\.html$/.exec(href);
    if (m) { e.preventDefault(); location.hash = '#/' + m[1]; return; }
    if (href === '#') e.preventDefault();
  }, true);

  document.addEventListener('pointerdown', function once() {
    document.removeEventListener('pointerdown', once);
    var el = document.documentElement;
    if (!window.matchMedia('(display-mode: standalone)').matches && el.requestFullscreen) {
      el.requestFullscreen().then(function () {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
      }).catch(function () {});
    } else if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
  });

  /* ---------- install button ---------- */
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var deferred = null;
  function installUI(mode) {
    if (standalone || document.getElementById('install')) return;
    var btn = document.createElement('button');
    btn.id = 'install';
    btn.type = 'button';
    btn.textContent = 'Instalar app';
    btn.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:20;height:44px;padding:0 18px;border:0;border-radius:22px;background:#22D3EE;color:#0B0B14;font:800 15px Exo2,system-ui,sans-serif;box-shadow:0 4px 0 #0E8FA3,0 8px 24px #0008;cursor:pointer');
    var tip = document.createElement('div');
    tip.setAttribute('style', 'display:none;position:fixed;left:12px;bottom:66px;z-index:20;max-width:260px;padding:12px 14px;border-radius:14px;background:#17172A;border:1px solid #2E2E52;color:#F4F4FA;font:600 13px/1.45 Exo2,system-ui,sans-serif');
    tip.innerHTML = isIOS ? 'En iPhone: toca el botón <b>Compartir</b> (cuadrado con flecha) y elige <b>Añadir a pantalla de inicio</b>.' : 'Abre el menú del navegador <b>⋮</b> y elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; btn.remove(); tip.remove(); }); }
      else tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
    });
    document.body.appendChild(tip);
    document.body.appendChild(btn);
    var onMain = function () {
      var main = !/^#\/[A-Za-z0-9]/.test(location.hash) || /^#\/Main\b/.test(location.hash);
      btn.style.display = main ? '' : 'none';
      if (!main) tip.style.display = 'none';
    };
    window.addEventListener('hashchange', onMain);
    onMain();
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; installUI(); });
  window.addEventListener('appinstalled', function () { var b = document.getElementById('install'); if (b) b.remove(); });
  setTimeout(function () { installUI(); }, 2500);

  window.addEventListener('resize', fit);
  fit();
  /* If startup fails or hangs, show why and offer a clean restart (drops old caches and service worker). */
  function stuck(msg) {
    var box = document.getElementById('loading');
    if (!box) return;
    box.setAttribute('style', 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#F4F4FA;font:600 15px system-ui,sans-serif;background:#0B0B14');
    box.innerHTML = '<div>' + msg + '</div><button type="button" style="height:44px;padding:0 22px;border:0;border-radius:22px;background:#22D3EE;color:#0B0B14;font:800 15px Exo2,system-ui,sans-serif">Reintentar</button>';
    box.querySelector('button').onclick = function () {
      var jobs = [];
      if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
      if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
      Promise.all(jobs).then(function () { location.replace(location.pathname + '?r=' + Date.now()); }, function () { location.reload(); });
    };
  }
  var hang = setTimeout(function () { stuck('La app está tardando demasiado en cargar.'); }, 15000);
  /* Loading screen: the bar follows the real loading of the screens, but never faster than ~2.5 s so it can be seen */
  var total = SCREENS.length, done = 0, t0 = Date.now(), MIN_MS = 2500, shown = 0, ready = false, finished = false;
  function setProgress(p) {
    var v = Math.round(p * 100), f = document.getElementById('ld-fill'), t = document.getElementById('ld-pct'), box = document.getElementById('loading');
    if (!f || !t) return;
    f.style.left = (15 + 68.4 * p).toFixed(2) + '%'; f.style.opacity = p >= 0.995 ? '0' : '1'; t.textContent = v + '%';
    if (box) box.setAttribute('aria-valuenow', String(v));
  }
  // tips that take turns on the loading screen
  var TIPS = ['Mejora tu control del balón y domina la liga.', 'Mantén CHUT para cargar el tiro: más carga, más altura.', 'Con SPRINT y PASE juntos mandas el balón al hueco.', 'Mantén PASE para bombear el balón por encima.', 'Regatea en el momento justo y te sale una filigrana perfecta.', 'Llena la barra SÚPER y tu próximo chut saldrá ardiendo.', 'En el último medio minuto los goles valen doble.', 'Gira la ruleta diaria: un premio gratis cada día.', 'Equípate en la Taquilla y luce tu estilo en el campo.'];
  var tipK = 0, tipT = setInterval(function () {
    var el = document.getElementById('ld-tip');
    if (!el || finished) { clearInterval(tipT); return; }
    el.style.opacity = '0';
    setTimeout(function () { tipK = (tipK + 1) % TIPS.length; el.textContent = TIPS[tipK]; el.style.opacity = '1'; }, 300);
  }, 2200);
  function pump() {
    if (finished) return;
    var target = Math.min(done / total, Math.min(1, (Date.now() - t0) / MIN_MS));
    shown += (target - shown) * 0.18;
    if (target >= 1 && shown > 0.995) shown = 1;
    setProgress(shown);
    if (shown >= 1 && ready) {
      finished = true;
      var box = document.getElementById('loading');
      if (box) { box.classList.add('out'); setTimeout(function () { if (box.parentNode) box.remove(); }, 450); }
      return;
    }
    requestAnimationFrame(pump);
  }
  requestAnimationFrame(pump);
  /* the 3D characters count towards the bar too, but a slow connection never blocks the app on them */
  var NC = window.AMChars ? window.AMChars.list.length : 0;
  var chars = window.AMChars ? (total += NC, new Promise(function (res) {
    var got = 0, t = setTimeout(function () { done += NC - got; got = NC; res(); }, 12000);
    window.AMChars.load(function () { if (got < NC) { got++; done++; } }).then(function () { clearTimeout(t); done += NC - got; got = NC; res(); });
  })) : Promise.resolve();
  /* the 3D stadium too, with the same rule */
  var stad = window.AMStadium ? (total += 1, new Promise(function (res) {
    var t = setTimeout(function () { done++; res(); }, 9000);
    window.AMStadium.load().then(function () { clearTimeout(t); done++; res(); }, function () { clearTimeout(t); done++; res(); });
  })) : Promise.resolve();
  /* While you are on the menus, the 3D pictures of the Modos cards, the Tienda and the season pass are drawn
     one at a time in idle moments, so those screens open at once the first time too (never during a match). */
  function prewarm() {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(function () { f({ timeRemaining: function () { return 8; } }); }, 120); };
    var G = function () { return window.AMGear; };
    var jobs = [];
    // the Taquilla's 3D viewer with your character, its shaders compiled
    jobs.push(function () {
      if (window.AMHero) window.AMHero.warm();
    });
    ['team:1', 'team:2', 'team:3', 'team:4', 'pen', 'free', 'private', 'train', 'tut', 'pass'].forEach(function (k) { jobs.push(function () { if (window.AMPosters) window.AMPosters.get(k); }); });
    ['coins:4', 'coins:5', 'coins:6', 'coins:8', 'coins:12', 'coins:14', 'coins:16', 'bag', 'boots:#E5484D', 'chest:common', 'chest:common:open', 'chest:rare', 'chest:rare:open', 'chest:epic', 'chest:epic:open', 'chest:legend', 'chest:legend:open', 'trophy', 'target', 'shield:#C07A3E', 'gems:1', 'gems:2', 'gems:3', 'shield:#A78BFA'].forEach(function (k) {
      jobs.push(function () { if (G()) G().prize(k); });
    });
    ['h10', 'h11', 'f6', 's6', 's7', 's8', 'h5', 'h6'].forEach(function (id) { jobs.push(function () { if (window.AMProgress) window.AMProgress.itemPic(id); }); });
    var busy = function () { return /^#\/(Partido|Duelo|Entrenamiento|Tutorial|Competitivo|Rapida|Privada|Baloncesto|Tenis|Voley)\b/.test(location.hash); };
    var next = function (dl) {
      if (!jobs.length) return;
      if (busy() || !(window.AMChars && window.AMChars.ready())) { setTimeout(function () { idle(next, { timeout: 4000 }); }, 1500); return; }
      if (dl && dl.timeRemaining && dl.timeRemaining() < 6) { idle(next, { timeout: 4000 }); return; }
      try { jobs.shift()(); } catch (e) {}
      setTimeout(function () { idle(next, { timeout: 4000 }); }, 60);
    };
    setTimeout(function () { idle(next, { timeout: 4000 }); }, 2500);
  }

  Promise.all(SCREENS.map(function (n) { return load(n).then(function () { done++; }); }).concat([chars, stad])).then(function () {
    clearTimeout(hang);
    render(h(App), document.getElementById('stage'));
    ready = true;
    prewarm();
  }).catch(function (err) {
    finished = true;
    clearTimeout(hang);
    stuck('No se pudo cargar la app (' + err.message + ').');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      if (!reg) return;
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw && nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) location.reload();
        });
      });
      setInterval(function () { reg.update(); }, 60000);
    }).catch(function () {});
  }
})();
