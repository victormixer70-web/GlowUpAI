/* ARENA MIX online: rooms between phones, peer to peer (WebRTC data channels through PeerJS).
   The host's phone runs the match; the others send their controls and draw what the host sends back.
   A room is found by its code: the host's peer id is "arenamix-<CODE>" on the PeerJS signalling server.

   AMOnline.host(code, name, on) / AMOnline.join(code, name, on) return a room:
     room.isHost, room.me (peer id), room.send(msg) (guest: to the host; host: to everyone),
     room.sendTo(id, msg), room.close(), room.ping (ms to the host, for guests), room.pings[id] (host),
     room.listen(fn) adds a listener fn(kind, ...args) for the same events and returns its remover
   on = { open(), msg(from, msg), join(id), leave(id), error(text) } — every handler optional. */
(function () {
  var PREFIX = 'arenamix-';
  var ICE = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // relay for phones behind strict mobile NATs, when a direct link is impossible
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ];

  function opts() {
    var o = { config: { iceServers: ICE }, debug: 0 };
    // a private signalling server can be set for testing: localStorage "arenamix.peer.v1" = {"host":"localhost","port":9000,"path":"/","secure":false}
    try { var s = JSON.parse(localStorage.getItem('arenamix.peer.v1') || 'null'); if (s) Object.assign(o, s); } catch (e) {}
    return o;
  }
  function available() { return !!(window.Peer && window.RTCPeerConnection); }

  function myName() {
    try {
      var n = localStorage.getItem('arenamix.name.v1');
      if (n) return n;
      n = 'Jugador_' + (1000 + Math.floor(Math.random() * 9000));
      localStorage.setItem('arenamix.name.v1', n);
      return n;
    } catch (e) { return 'Jugador'; }
  }
  function setName(n) { try { localStorage.setItem('arenamix.name.v1', String(n).slice(0, 16)); } catch (e) {} }
  function newCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    for (var i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }
  var ERR = {
    'peer-unavailable': 'No hay ninguna sala con ese código.',
    'unavailable-id': 'Ese código de sala ya está en uso.',
    'network': 'Sin conexión con el servidor de salas. Revisa tu internet.',
    'server-error': 'El servidor de salas no responde. Prueba en un momento.',
    'socket-error': 'Se ha cortado la conexión con el servidor de salas.',
    'browser-incompatible': 'Este navegador no permite jugar online.',
    'webrtc': 'No se ha podido conectar con el otro móvil.'
  };
  function errText(e) { return ERR[e && e.type] || 'Error de conexión.'; }

  function room(isHost, code, name, on) {
    on = on || {};
    var R = { isHost: isHost, code: code, me: null, ping: 0, pings: {}, conns: {}, closed: false, subs: [] };
    var call = function (k) {
      var a = [].slice.call(arguments, 1), f = on[k];
      if (f) try { f.apply(null, a); } catch (e) { console.error(e); }
      R.subs.slice().forEach(function (s) { try { s.apply(null, [k].concat(a)); } catch (e) { console.error(e); } });
    };
    // extra listeners (the match screen): fn(kind, ...args); returns a function that removes it
    R.listen = function (fn) { R.subs.push(fn); return function () { R.subs = R.subs.filter(function (x) { return x !== fn; }); }; };
    var peer = new window.Peer(isHost ? PREFIX + code : undefined, opts());
    R.peer = peer;
    function wire(c) {
      c.on('data', function (m) {
        if (!m || typeof m !== 'object') return;
        if (m.t === '_ping') { try { c.send({ t: '_pong', ts: m.ts }); } catch (e) {} return; }
        if (m.t === '_pong') { var rtt = Math.round(performance.now() - m.ts); if (isHost) R.pings[c.peer] = rtt; else R.ping = rtt; return; }
        call('msg', c.peer, m);
      });
      c.on('close', function () { if (R.conns[c.peer] === c) { delete R.conns[c.peer]; delete R.pings[c.peer]; call('leave', c.peer); } });
      c.on('error', function () {});
    }
    peer.on('open', function (id) {
      R.me = id;
      if (isHost) { call('open'); return; }
      var c = peer.connect(PREFIX + code, { serialization: 'json', reliable: true, metadata: { name: name } });
      var timer = setTimeout(function () { if (!c.open) call('error', 'La sala no responde.'); }, 12000);
      c.on('open', function () { clearTimeout(timer); R.conns[c.peer] = c; wire(c); call('open'); });
    });
    peer.on('connection', function (c) {
      if (!isHost) { c.close(); return; }
      c.on('open', function () { R.conns[c.peer] = c; wire(c); call('join', c.peer, (c.metadata && c.metadata.name) || 'Jugador'); });
    });
    peer.on('error', function (e) { call('error', errText(e), e && e.type); });
    peer.on('disconnected', function () { if (!R.closed) try { peer.reconnect(); } catch (e) {} });
    R.send = function (m) { for (var k in R.conns) { try { R.conns[k].send(m); } catch (e) {} } };
    R.sendTo = function (id, m) { var c = R.conns[id]; if (c) try { c.send(m); } catch (e) {} };
    R.count = function () { return Object.keys(R.conns).length; };
    R.close = function () {
      R.closed = true; clearInterval(R.pt);
      for (var k in R.conns) { try { R.conns[k].close(); } catch (e) {} }
      R.conns = {};
      try { peer.destroy(); } catch (e) {}
    };
    // latency, both ways, every 2 s
    R.pt = setInterval(function () { R.send({ t: '_ping', ts: performance.now() }); }, 2000);
    return R;
  }

  window.AMOnline = {
    available: available, myName: myName, setName: setName, newCode: newCode,
    host: function (code, name, on) { return room(true, code, name, on); },
    join: function (code, name, on) { return room(false, code, name, on); }
  };
})();
