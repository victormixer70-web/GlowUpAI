/* ARENA MIX — runtime that plays the .dc.html screens as a standalone app. */
(function () {
  'use strict';
  var h = preact.h, render = preact.render, PComponent = preact.Component;

  var SCREENS = ['Main', 'Idioma', 'Deportes', 'Modos', 'Rangos', 'Taquilla', 'Tienda', 'Estadisticas',
    'Rapida', 'Competitivo', 'Entrenamiento', 'Penaltis1v1', 'TirosLibres1v1', 'Online2v2',
    'Baloncesto', 'Beisbol', 'Voley', 'Partido', 'Duelo', 'Avatar', 'RangosTabla'];
  var registry = {};
  var helmetDone = {};

  /* ---------- template evaluation ---------- */
  var WHOLE = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
  var ANY = /\{\{\s*([^{}]+?)\s*\}\}/g;

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var cur;
    for (var i = scope.length - 1; i >= 0; i--) {
      if (scope[i] && Object.prototype.hasOwnProperty.call(scope[i], parts[0])) { cur = scope[i][parts[0]]; break; }
    }
    for (var j = 1; j < parts.length && cur != null; j++) cur = cur[parts[j]];
    return cur;
  }
  function interp(str, scope) {
    return str.replace(ANY, function (_, p) { var v = lookup(p, scope); return v == null ? '' : String(v); });
  }
  function value(str, scope) {
    var m = WHOLE.exec(str);
    if (m) return lookup(m[1], scope);
    return str.indexOf('{{') >= 0 ? interp(str, scope) : str;
  }
  function camel(s) { return s.replace(/-([a-z0-9])/g, function (_, c) { return c.toUpperCase(); }); }

  function children(node, scope) {
    var out = [];
    for (var c = node.firstChild; c; c = c.nextSibling) {
      var r = build(c, scope);
      if (r == null) continue;
      if (Array.isArray(r)) Array.prototype.push.apply(out, r); else out.push(r);
    }
    return out;
  }
  function build(node, scope) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!/\S/.test(t)) return ' ';
      return t.indexOf('{{') >= 0 ? interp(t, scope) : t;
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'helmet' || tag === 'script') return null;
    if (tag === 'sc-if') return value(node.getAttribute('value') || '', scope) ? children(node, scope) : null;
    if (tag === 'sc-for') {
      var list = value(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      var res = [];
      for (var i = 0; i < list.length; i++) {
        var sc = {}; sc[as] = list[i]; sc.$index = i;
        Array.prototype.push.apply(res, children(node, scope.concat([sc])));
      }
      return res;
    }
    if (tag === 'dc-import') {
      var name = node.getAttribute('name');
      var Comp = registry[name];
      if (!Comp) return null;
      var props = {};
      for (var a = 0; a < node.attributes.length; a++) {
        var at = node.attributes[a];
        if (at.name === 'name' || at.name.indexOf('hint-') === 0) continue;
        props[camel(at.name)] = value(at.value, scope);
      }
      return h(Comp, props);
    }
    var p = {};
    for (var k = 0; k < node.attributes.length; k++) {
      var att = node.attributes[k], n = att.name, v = value(att.value, scope);
      if (n.indexOf('hint-') === 0) continue;
      if (n === 'for') n = 'htmlFor';
      p[n] = v;
    }
    return h.apply(null, [tag, p].concat(children(node, scope)));
  }

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
    return m && registry[m[1]] ? m[1] : 'Main';
  }
  function App() { PComponent.call(this); this.state = { screen: current() }; }
  App.prototype = Object.create(PComponent.prototype);
  App.prototype.componentDidMount = function () {
    var self = this;
    window.addEventListener('hashchange', function () { self.setState({ screen: current() }); });
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
    btn.setAttribute('style', 'position:fixed;right:12px;bottom:12px;z-index:20;height:44px;padding:0 18px;border:0;border-radius:22px;background:#22D3EE;color:#0B0B14;font:800 15px system-ui,sans-serif;box-shadow:0 4px 0 #0E8FA3,0 8px 24px #0008;cursor:pointer');
    var tip = document.createElement('div');
    tip.setAttribute('style', 'display:none;position:fixed;right:12px;bottom:66px;z-index:20;max-width:260px;padding:12px 14px;border-radius:14px;background:#17172A;border:1px solid #2E2E52;color:#F4F4FA;font:600 13px/1.45 system-ui,sans-serif');
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
    box.innerHTML = '<div>' + msg + '</div><button type="button" style="height:44px;padding:0 22px;border:0;border-radius:22px;background:#22D3EE;color:#0B0B14;font:800 15px system-ui,sans-serif">Reintentar</button>';
    box.querySelector('button').onclick = function () {
      var jobs = [];
      if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
      if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
      Promise.all(jobs).then(function () { location.replace(location.pathname + '?r=' + Date.now()); }, function () { location.reload(); });
    };
  }
  var hang = setTimeout(function () { stuck('La app está tardando demasiado en cargar.'); }, 15000);
  Promise.all(SCREENS.map(load)).then(function () {
    clearTimeout(hang);
    var box = document.getElementById('loading');
    if (box) box.remove();
    render(h(App), document.getElementById('stage'));
  }).catch(function (err) {
    clearTimeout(hang);
    stuck('No se pudo cargar la app (' + err.message + ').');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw && nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) location.reload();
        });
      });
      setInterval(function () { reg.update(); }, 60000);
    });
  }
})();
