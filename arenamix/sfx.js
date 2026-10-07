/* ARENA MIX sound effects, all synthesised live with Web Audio (no files to download, nothing to license):
   the ball (strike, pass, bounce, the post), the net, the referee's whistle, a crowd that breathes with the
   play and roars at a goal, and the interface (coins, a level up, a chest bursting open).
   Personal volume: Configuración > Efectos de sonido. Sound can only start after a first tap. */
(function () {
  var ctx = null, out = null, noise = null, crowd = null;
  function vol() { var p = window.AMPlay ? window.AMPlay() : {}; return p.sfx == null ? 0.8 : +p.sfx; }
  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain(); out.gain.value = vol();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6;
    out.connect(comp); comp.connect(ctx.destination);
    var len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), last = 0;
    // pinkish noise (softer than white), for crowd, net and breath
    for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 3.2 + w * 0.15; }
    noise = buf;
    return ctx;
  }
  var unlock = function () { if (init() && ctx.state === 'suspended') ctx.resume(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(function (e) { window.addEventListener(e, unlock, { passive: true }); });
  function ready() { return ctx && ctx.state === 'running' && vol() > 0; }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, t, dur, peak, dest) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(g); g.connect(dest || out); env(g, t, 0.003, peak, dur);
    o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function hiss(t, dur, peak, type, freq, q, dest) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; s.loop = true; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    s.connect(f); f.connect(g); g.connect(dest || out); env(g, t, 0.004, peak, dur);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return { s: s, f: f, g: g };
  }
  function now() { return ctx.currentTime; }

  var S = {
    // a strike: the thump of the boot and the slap of the ball, stronger with power
    kick: function (power) {
      if (!ready()) return; var t = now(), p = Math.max(0.2, Math.min(1, power || 0.5));
      tone('sine', 150 + 60 * p, 45, t, 0.16 + 0.06 * p, 0.55 + 0.4 * p);
      hiss(t, 0.05, 0.35 + 0.3 * p, 'bandpass', 1800 + 900 * p, 1.2);
    },
    pass: function () { if (!ready()) return; var t = now(); tone('sine', 140, 55, t, 0.12, 0.4); hiss(t, 0.035, 0.22, 'bandpass', 1600, 1.2); },
    bounce: function (v) { if (!ready()) return; var t = now(), k = Math.min(1, (v || 3) / 8); tone('sine', 110, 50, t, 0.1, 0.12 + 0.25 * k); },
    post: function () {
      if (!ready()) return; var t = now();
      tone('triangle', 920, 880, t, 0.9, 0.35); tone('sine', 1460, 1420, t, 0.7, 0.18); tone('sine', 2610, 2580, t, 0.4, 0.08);
      hiss(t, 0.06, 0.4, 'highpass', 3000);
      S.ooh();
    },
    // the ball into the net: a swish and a rattle of the cords
    net: function () {
      if (!ready()) return; var t = now();
      var h = hiss(t, 0.55, 0.5, 'bandpass', 900, 0.8); h.f.frequency.setValueAtTime(2400, t); h.f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
      for (var i = 0; i < 5; i++) hiss(t + 0.05 + i * 0.05, 0.05, 0.12, 'bandpass', 3500 + i * 300, 4);
    },
    // the referee: short for the kick-off, three blows at full time
    whistle: function (n) {
      if (!ready()) return; var t = now(); n = n || 1;
      for (var i = 0; i < n; i++) {
        var t0 = t + i * 0.42, dur = i === n - 1 && n > 1 ? 0.75 : 0.3;
        var o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 2850; lfo.frequency.value = 32; lg.gain.value = 120;
        lfo.connect(lg); lg.connect(o.frequency); o.connect(g); g.connect(out);
        g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.22, t0 + 0.02); g.gain.setValueAtTime(0.22, t0 + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
        hiss(t0, dur, 0.05, 'bandpass', 3000, 2);
      }
    },
    /* the crowd: a bed of noise whose loudness and brightness follow the play (0 quiet … 1 a chance on goal) */
    crowd: function (level) {
      if (!ctx || ctx.state !== 'running') return;
      if (level <= 0) { if (crowd) { var c0 = crowd; crowd = null; c0.g.gain.setTargetAtTime(0.0001, now(), 0.4); setTimeout(function () { try { c0.s.stop(); c0.s2.stop(); } catch (e) {} }, 2500); } return; }
      if (!crowd) {
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), s2 = ctx.createBufferSource(), f2 = ctx.createBiquadFilter();
        s.buffer = noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.6;
        s2.buffer = noise; s2.loop = true; s2.playbackRate.value = 0.7; f2.type = 'lowpass'; f2.frequency.value = 400;
        s.connect(f); f.connect(g); s2.connect(f2); f2.connect(g); g.connect(out); g.gain.value = 0.0001;
        s.start(); s2.start(0, 0.8); crowd = { s: s, s2: s2, f: f, g: g, level: 0 };
      }
      var L = Math.max(0, Math.min(1, level)) * vol();
      crowd.g.gain.setTargetAtTime(0.06 + 0.22 * L, now(), 0.5);
      crowd.f.frequency.setTargetAtTime(550 + 600 * L, now(), 0.5);
    },
    // a goal: the stadium erupts (yours) or groans (theirs)
    roar: function (ours) {
      if (!ready()) return; var t = now();
      if (ours) {
        var h = hiss(t, 3.2, 0.9, 'bandpass', 900, 0.5); h.g.gain.cancelScheduledValues(t);
        h.g.gain.setValueAtTime(0.0001, t); h.g.gain.linearRampToValueAtTime(0.85, t + 0.35); h.g.gain.setTargetAtTime(0.0001, t + 1.6, 0.6);
        h.f.frequency.setValueAtTime(700, t); h.f.frequency.linearRampToValueAtTime(1300, t + 0.4);
        // horns
        [0, 0.5, 1.0].forEach(function (d) { tone('sawtooth', 233, 233, t + 0.4 + d, 0.35, 0.05); });
      } else {
        var o = hiss(t, 1.4, 0.4, 'lowpass', 500); o.f.frequency.setValueAtTime(700, t); o.f.frequency.exponentialRampToValueAtTime(250, t + 1.3);
      }
    },
    ooh: function () { if (!ready()) return; var t = now(); var h = hiss(t, 1.1, 0.45, 'bandpass', 800, 1.2); h.f.frequency.setValueAtTime(600, t); h.f.frequency.linearRampToValueAtTime(950, t + 0.3); h.f.frequency.linearRampToValueAtTime(500, t + 1.1); },
    /* interface */
    tick: function () { if (!ready()) return; tone('square', 1400, 1800, now(), 0.04, 0.04); },
    coin: function () { if (!ready()) return; var t = now(); tone('square', 1320, 0, t, 0.07, 0.05); tone('square', 1760, 0, t + 0.07, 0.16, 0.05); },
    levelUp: function () { if (!ready()) return; var t = now(); [523, 659, 784, 1047].forEach(function (f, i) { tone('triangle', f, 0, t + i * 0.09, 0.25, 0.18); }); },
    thud: function (n) { if (!ready()) return; var t = now(); tone('sine', 120 + n * 20, 40, t, 0.2, 0.5); hiss(t, 0.08, 0.2, 'lowpass', 800); },
    chest: function () {
      if (!ready()) return; var t = now();
      var h = hiss(t, 0.5, 0.5, 'bandpass', 600, 0.7); h.f.frequency.setValueAtTime(400, t); h.f.frequency.exponentialRampToValueAtTime(3000, t + 0.4);
      [784, 988, 1175, 1568, 1976].forEach(function (f, i) { tone('triangle', f, 0, t + 0.15 + i * 0.06, 0.4, 0.12); });
    },
    setVolume: function () { if (out) out.gain.value = vol(); }
  };
  window.AMSfx = S;
})();
