/* ARENA MIX — languages.
   The screens are written in Spanish. When another language is chosen (Idioma), every text the player
   sees is swapped as it appears: whole texts by exact match, and texts with numbers in them through a
   template where each number is a '#' ("Faltan # victorias" -> "# wins to go"). The dictionaries live
   in i18n-<lang>.js as window.AM_I18N_<LANG>. Spanish needs nothing. */
(function () {
  var KEY = 'arenamix.lang.v1';
  var lang = 'es';
  try { lang = localStorage.getItem(KEY) || 'es'; } catch (e) {}
  var DICT = (window['AM_I18N_' + lang.toUpperCase()]) || null;
  var NUM = /\d+(?:[.,]\d+)*/g;
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  var cache = new Map();

  function tr(s) {
    if (!DICT || !s) return null;
    if (cache.has(s)) return cache.get(s);
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2], out = null;
    if (core) {
      if (Object.prototype.hasOwnProperty.call(DICT, core)) out = DICT[core];
      else {
        var nums = core.match(NUM);
        if (nums) {
          var t = DICT[core.replace(NUM, '#')];
          if (typeof t === 'string') { var i = 0; out = t.replace(/#/g, function () { return nums[i++] || ''; }); }
        }
      }
    }
    // a known start or end around a name or other free text ("Celebración equipada: X", "X se ha desconectado")
    if (out === null && core) {
      var P = window['AM_I18N_' + lang.toUpperCase() + '_PRE'] || [], S = window['AM_I18N_' + lang.toUpperCase() + '_SUF'] || [];
      for (var k = 0; k < P.length && out === null; k++) if (core.indexOf(P[k][0]) === 0) { var rest = core.slice(P[k][0].length), rt = tr(rest); out = P[k][1] + (rt === null ? rest : rt); }
      for (var j = 0; j < S.length && out === null; j++) { var sf = S[j][0]; if (core.length > sf.length && core.slice(-sf.length) === sf) { var head = core.slice(0, -sf.length), ht = tr(head); out = (ht === null ? head : ht) + S[j][1]; } }
    }
    var res = out === null ? null : m[1] + out + m[3];
    if (cache.size > 6000) cache.clear();
    cache.set(s, res);
    return res;
  }

  function doText(n) {
    var p = n.parentNode;
    if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA') return;
    if (p.closest && p.closest('[translate="no"]')) return;
    var v = n.nodeValue, t = tr(v);
    if (t !== null && t !== v) n.nodeValue = t;
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (v) { var t = tr(v); if (t !== null && t !== v) el.setAttribute(a, t); }
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }

  if (DICT) {
    var start = function () {
      walk(document.body);
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doAttrs(m.target);
          else for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k]);
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      document.documentElement.lang = lang;
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  window.AMI18n = {
    lang: function () { return lang; },
    // the languages that are translated so far
    ready: function (l) { return l === 'es' || !!window['AM_I18N_' + String(l).toUpperCase()]; },
    set: function (l) { try { localStorage.setItem(KEY, l); } catch (e) {} if (l !== lang) location.reload(); },
    t: function (s) { var r = tr(s); return r === null ? s : r; }
  };
})();
