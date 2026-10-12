/* ARENA MIX social: friends, friend requests and a party of up to four, with no server of our own.
   While the game is open you are reachable at the peer id "arenamix-u-<your name>" on the PeerJS signalling
   server (the same one the private rooms use), so another player can find you by your name.
   - Friends and requests live on this phone (arenamix.social.v1). A request to someone who isn't online is
     kept and sent again when they come online.
   - The party: the leader's phone hosts a small room; invited friends join it. When the leader presses PLAY the
     party moves to a private room (Privada) with the same people, on the same team.
   AMSocial.state() → { me, online, taken, friends:[{name, on}], incoming:[name], outgoing:[name], party }
   AMSocial.on(fn) → remover; fn() is called whenever anything changes. */
(function () {
  var KEY = 'arenamix.social.v1', PREFIX = 'arenamix-u-', MAX_PARTY = 4;
  var S = load(), peer = null, myId = '', online = false, taken = false, conns = {}, seen = {}, subs = [], party = null, invites = [], pollT = null, started = false;

  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v) return { friends: v.friends || [], incoming: v.incoming || [], outgoing: v.outgoing || [] }; } catch (e) {}
    return { friends: [], incoming: [], outgoing: [] };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} changed(); }
  function changed() { subs.slice().forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  function me() { return window.AMOnline ? window.AMOnline.myName() : 'Jugador'; }
  // a name as a peer id: lower case, no accents, only letters, digits, _ and -
  function idOf(name) {
    var n = String(name || '').trim().toLowerCase();
    try { n = n.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return PREFIX + n.replace(/ñ/g, 'n').replace(/[^a-z0-9_-]/g, '_');
  }
  function same(a, b) { return idOf(a) === idOf(b); }
  function has(list, name) { return list.some(function (x) { return same(x.name || x, name); }); }
  function drop(list, name) { return list.filter(function (x) { return !same(x.name || x, name); }); }
  function opts() {
    var o = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }] }, debug: 0 };
    try { var s = JSON.parse(localStorage.getItem('arenamix.peer.v1') || 'null'); if (s) Object.assign(o, s); } catch (e) {}
    return o;
  }

  /* ---------- being reachable ---------- */
  function start() {
    if (started || !window.Peer || !window.AMOnline || !window.AMOnline.hasName()) return;
    started = true;
    myId = idOf(me());
    peer = new window.Peer(myId, opts());
    peer.on('open', function () { online = true; taken = false; changed(); poll(); });
    peer.on('connection', function (c) { c.on('open', function () { wire(c); }); });
    peer.on('error', function (e) {
      if (e && e.type === 'unavailable-id') { taken = true; online = false; changed(); try { peer.destroy(); } catch (x) {} peer = null; started = false; return; }
      if (e && e.type === 'peer-unavailable') return;
    });
    peer.on('disconnected', function () { online = false; changed(); try { peer.reconnect(); } catch (e) {} });
    clearInterval(pollT); pollT = setInterval(poll, 20000);
  }
  function restart() { try { if (peer) peer.destroy(); } catch (e) {} peer = null; started = false; online = false; conns = {}; start(); }
  // a link to a player (reused while it lasts); cb(conn) or cb(null) if they aren't online
  function link(name, cb) {
    var id = idOf(name);
    if (id === myId) { cb(null); return; }
    var c0 = conns[id];
    if (c0 && c0.open) { cb(c0); return; }
    if (!peer || !online) { cb(null); return; }
    var c = peer.connect(id, { serialization: 'json', reliable: true, metadata: { name: me() } }), done = false;
    var fin = function (ok) { if (done) return; done = true; if (!ok) { try { c.close(); } catch (e) {} } cb(ok ? c : null); };
    c.on('open', function () { wire(c); fin(true); });
    c.on('error', function () { fin(false); });
    setTimeout(function () { fin(c.open); }, 6000);
  }
  function wire(c) {
    var id = c.peer;
    if (conns[id] && conns[id] !== c) { try { conns[id].close(); } catch (e) {} }
    conns[id] = c;
    if (!c.__am) {
      c.__am = true;
      c.on('data', function (m) { if (m && typeof m === 'object') onMsg(c, m); });
      c.on('close', function () { if (conns[id] === c) { delete conns[id]; delete seen[id]; changed(); } });
      try { c.send({ t: 'hi', name: me() }); } catch (e) {}
    }
  }
  function send(name, m, cb) { link(name, function (c) { if (c) { try { c.send(m); } catch (e) {} } if (cb) cb(!!c); }); }
  function isOn(name) { var c = conns[idOf(name)]; return !!(c && c.open); }

  // every so often: who of my friends is online, and resend the requests that are waiting
  function poll() {
    if (!online) return;
    S.friends.forEach(function (f) { if (!isOn(f.name)) link(f.name, function () { changed(); }); });
    S.outgoing.forEach(function (n) { send(n, { t: 'freq', name: me() }); });
  }

  /* ---------- messages between players ---------- */
  function onMsg(c, m) {
    var from = String(m.name || (c.metadata && c.metadata.name) || '').slice(0, 16);
    if (!from) return;
    seen[c.peer] = from;
    if (m.t === 'hi') { changed(); return; }
    if (m.t === 'freq') {
      if (has(S.friends, from)) { try { c.send({ t: 'facc', name: me() }); } catch (e) {} return; }
      // we had both asked: friends straight away
      if (S.outgoing.some(function (n) { return same(n, from); })) { befriend(from); try { c.send({ t: 'facc', name: me() }); } catch (e) {} return; }
      if (!S.incoming.some(function (n) { return same(n, from); })) { S.incoming.push(from); save(); notify('📨 ' + from + ' quiere ser tu amigo', 'Social.dc.html'); }
      return;
    }
    if (m.t === 'facc') { if (S.outgoing.some(function (n) { return same(n, from); }) || !has(S.friends, from)) { befriend(from); notify('🤝 ' + from + ' ha aceptado tu solicitud'); } return; }
    if (m.t === 'frej') { S.outgoing = drop(S.outgoing, from); save(); return; }
    if (m.t === 'funf') { S.friends = drop(S.friends, from); save(); return; }
    if (m.t === 'inv') {
      if (!has(S.friends, from)) return;
      invites = drop(invites, from); invites.push({ name: from, code: m.code, at: Date.now() });
      changed(); showInvite(from, m.code);
      return;
    }
    if (m.t === 'invno') { notify(from + ' no puede jugar ahora'); return; }
  }
  function befriend(name) {
    if (!has(S.friends, name)) S.friends.push({ name: name, since: Date.now() });
    S.outgoing = drop(S.outgoing, name); S.incoming = drop(S.incoming, name);
    save();
  }

  /* ---------- the party ---------- */
  function look() {
    var A = window.AMChars, o = A ? A.outfit('futbol') : null;
    return { char: A ? A.pref() : 'ty', hat: o ? o.hat || 'none' : 'none', hatColor: o ? o.hatColor || '' : '', face: o ? o.face || 'none' : 'none' };
  }
  function partyOut() { if (party && party.leader && party.room) party.room.send({ t: 'party', members: party.members }); changed(); }
  // lead a party: my phone hosts it
  function lead(cb) {
    if (party && party.leader) { cb && cb(party); return; }
    if (party) leave();
    var O = window.AMOnline, code = 'PT' + O.newCode();
    var P = party = { leader: true, code: code, members: [{ name: me(), id: null, look: look(), leader: true }], room: null, ready: false };
    P.room = O.host(code, me(), {
      open: function () { if (party !== P) return; P.ready = true; P.members[0].id = P.room.me; changed(); cb && cb(P); },
      join: function (id, name) {
        if (party !== P) return;
        if (P.members.length >= MAX_PARTY) { P.room.sendTo(id, { t: 'pfull' }); return; }
        P.members = drop(P.members, name).concat([{ name: name, id: id, look: null }]);
        notify('🎉 ' + name + ' se ha unido a tu equipo'); partyOut();
      },
      msg: function (id, m) { if (party === P && m.t === 'hello') { P.members = P.members.map(function (x) { return x.id === id ? Object.assign({}, x, { look: m.look || null }) : x; }); partyOut(); } },
      leave: function (id) { if (party !== P) return; var x = P.members.find(function (y) { return y.id === id; }); P.members = P.members.filter(function (y) { return y.id !== id; }); if (x) notify(x.name + ' ha salido del equipo'); partyOut(); },
      error: function (t, type) { if (party !== P) return; if (type === 'unavailable-id') { party = null; lead(cb); return; } notify('No se ha podido crear el equipo: ' + t); party = null; changed(); }
    });
    changed();
  }
  function joinParty(code, hostName) {
    if (party) leave();
    var O = window.AMOnline;
    var P = party = { leader: false, code: code, members: [], room: null, ready: false, hostName: hostName };
    P.room = O.join(code, me(), {
      open: function () { if (party !== P) return; P.ready = true; P.room.send({ t: 'hello', look: look() }); changed(); },
      msg: function (id, m) {
        if (party !== P) return;
        if (m.t === 'party') { P.members = m.members; changed(); }
        if (m.t === 'pfull') { notify('El equipo de ' + hostName + ' ya está completo'); leave(); }
        if (m.t === 'go') {
          // the leader pressed PLAY: to the private room, on the leader's team
          try { localStorage.setItem('arenamix.privJoin', JSON.stringify({ code: m.code, at: Date.now() })); } catch (e) {}
          location.hash = '#/Privada';
        }
        if (m.t === 'mm') {
          // the leader is searching a Competitivo / Informal match: into the same search room, same mode
          try {
            localStorage.setItem('arenamix.sel', JSON.stringify({ sport: 'futbol', cat: m.cat, id: m.id }));
            localStorage.setItem('arenamix.mmFollow', JSON.stringify({ code: m.code, cat: m.cat, id: m.id, at: Date.now() }));
          } catch (e) {}
          var dest = m.cat === 'comp' ? '#/Competitivo' : '#/Rapida';
          if (location.hash === dest) { location.hash = '#/Deportes'; setTimeout(function () { location.hash = dest; }, 80); } else location.hash = dest;
        }
        if (m.t === 'mmStop') notify('El líder ha cancelado la búsqueda');
      },
      leave: function () { if (party !== P) return; notify(hostName + ' ha cerrado el equipo'); party = null; changed(); },
      error: function (t) { if (party !== P) return; notify('No se ha podido entrar en el equipo'); party = null; changed(); }
    });
    changed();
  }
  function leave(quiet) {
    var P = party; party = null;
    if (P && P.room) try { P.room.close(); } catch (e) {}
    if (!quiet) changed(); else changed();
  }
  function invite(name) {
    if (!isOn(name)) { notify(name + ' no está conectado ahora'); return; }
    if (party && !party.leader) { notify('Solo el líder del equipo puede invitar'); return; }
    if (party && party.members.length >= MAX_PARTY) { notify('Tu equipo ya está completo (4)'); return; }
    lead(function (P) { send(name, { t: 'inv', name: me(), code: P.code }); notify('Invitación enviada a ' + name); });
  }
  // the leader presses PLAY with friends: everybody to a private room hosted by the leader
  function launch(fmt) {
    var P = party;
    if (!P || !P.leader || P.members.length < 2) return false;
    var code = window.AMOnline.newCode();
    try { localStorage.setItem('arenamix.privHost', JSON.stringify({ code: code, fmt: fmt || ('m' + Math.max(2, P.members.length)), party: P.members.map(function (x) { return x.name; }), at: Date.now() })); } catch (e) {}
    P.room.send({ t: 'go', code: code });
    return true;
  }
  // the leader's search room is open: bring the party in (Competitivo / Informal with friends)
  function partySend(m) { var P = party; if (P && P.leader && P.room) P.room.send(m); }
  function partyNames() { return party && party.leader ? party.members.map(function (x) { return x.name; }) : null; }

  /* ---------- on-screen: invitations and little notices, on any screen ---------- */
  function box() {
    var b = document.getElementById('am-social');
    if (b) return b;
    b = document.createElement('div'); b.id = 'am-social';
    b.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9998;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;font-family:Exo2,sans-serif';
    document.body.appendChild(b);
    return b;
  }
  function notify(text, href) {
    var n = document.createElement('div');
    n.style.cssText = 'pointer-events:auto;padding:9px 16px;border-radius:12px;background:#17172AF2;color:#F4F4FA;font-weight:800;font-size:13px;box-shadow:0 0 0 1px #A78BFA88,0 10px 24px #000a;cursor:' + (href ? 'pointer' : 'default') + ';transition:opacity .4s,transform .4s;transform:translateY(-10px);opacity:0';
    n.textContent = text;
    if (href) n.onclick = function () { location.hash = '#/' + href.replace('.dc.html', ''); n.remove(); };
    box().appendChild(n);
    requestAnimationFrame(function () { n.style.opacity = '1'; n.style.transform = 'none'; });
    setTimeout(function () { n.style.opacity = '0'; setTimeout(function () { n.remove(); }, 450); }, 3600);
    if (window.AMSfx && window.AMSfx.tick) try { window.AMSfx.tick(); } catch (e) {}
  }
  function showInvite(from, code) {
    var n = document.createElement('div');
    n.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:10px;padding:10px 12px 10px 16px;border-radius:14px;background:linear-gradient(120deg,#4C1D95,#17172A);color:#F4F4FA;box-shadow:0 0 0 2px #A78BFA,0 12px 28px #000c';
    var t = document.createElement('div'); t.style.cssText = 'display:flex;flex-direction:column;gap:2px';
    t.innerHTML = '<span style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:#C4B5FD">INVITACIÓN</span><span style="font-size:14px;font-weight:800"></span>';
    t.lastChild.textContent = from + ' te invita a su equipo';
    var yes = document.createElement('button'), no = document.createElement('button');
    var bs = 'height:34px;padding:0 14px;border:0;border-radius:10px;font:800 13px Exo2,sans-serif;cursor:pointer';
    yes.style.cssText = bs + ';background:#FFC53D;color:#1A1204'; yes.textContent = '¡VAMOS!';
    no.style.cssText = bs + ';background:#ffffff1a;color:#F4F4FA'; no.textContent = 'Ahora no';
    var close = function () { clearTimeout(tm); n.remove(); invites = drop(invites, from); changed(); };
    yes.onclick = function () { close(); joinParty(code, from); if (!/Deportes/.test(location.hash)) location.hash = '#/Deportes'; };
    no.onclick = function () { close(); send(from, { t: 'invno', name: me() }); };
    n.appendChild(t); n.appendChild(yes); n.appendChild(no);
    box().appendChild(n);
    var tm = setTimeout(close, 30000);
    if (window.AMSfx && window.AMSfx.coin) try { window.AMSfx.coin(); } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (e) {}
  }

  /* ---------- the API the screens use ---------- */
  window.AMSocial = {
    start: start, restart: restart,
    on: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    state: function () {
      return {
        me: me(), online: online, taken: taken,
        friends: S.friends.map(function (f) { return { name: f.name, since: f.since, on: isOn(f.name) }; }).sort(function (a, b) { return (b.on - a.on) || a.name.localeCompare(b.name); }),
        incoming: S.incoming.slice(), outgoing: S.outgoing.slice(),
        party: party ? { leader: party.leader, ready: party.ready, members: party.members.slice(), hostName: party.hostName || me() } : null
      };
    },
    // look a player up by name: cb('me' | 'friend' | 'online' | 'offline')
    find: function (name, cb) {
      name = String(name || '').trim();
      if (!name) { cb('offline'); return; }
      if (same(name, me())) { cb('me'); return; }
      if (has(S.friends, name)) { cb('friend'); return; }
      link(name, function (c) { cb(c ? 'online' : 'offline'); changed(); });
    },
    request: function (name, cb) {
      name = String(name || '').trim().slice(0, 16);
      if (!name || same(name, me()) || has(S.friends, name)) { cb && cb(false); return; }
      if (S.incoming.some(function (n) { return same(n, name); })) { this.accept(name); cb && cb(true); return; }
      if (!S.outgoing.some(function (n) { return same(n, name); })) { S.outgoing.push(name); save(); }
      send(name, { t: 'freq', name: me() }, function (ok) { cb && cb(ok); });
    },
    accept: function (name) { befriend(name); send(name, { t: 'facc', name: me() }); },
    reject: function (name) { S.incoming = drop(S.incoming, name); save(); send(name, { t: 'frej', name: me() }); },
    cancel: function (name) { S.outgoing = drop(S.outgoing, name); save(); },
    remove: function (name) { S.friends = drop(S.friends, name); save(); send(name, { t: 'funf', name: me() }); },
    invite: invite, leave: function () { leave(); }, launch: launch, partySend: partySend, partyNames: partyNames,
    kick: function (name) { var P = party; if (!P || !P.leader) return; var x = P.members.find(function (y) { return same(y.name, name) && !y.leader; }); if (x && P.room.conns[x.id]) try { P.room.conns[x.id].close(); } catch (e) {} },
    isOn: isOn, pending: function () { return S.incoming.length; }
  };
  // reachable as soon as the game is open (and once a name has been chosen)
  setTimeout(start, 1500);
  setInterval(function () { if (!started) start(); }, 5000);
})();
