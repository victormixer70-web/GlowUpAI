/* ARENA MIX menu music: an upbeat stadium-anthem loop synthesised live with Web Audio (no audio files,
   nothing to license). It plays on the menu screens and fades out as soon as a match starts. Browsers only
   let sound start after a tap, so it begins on the first touch. Personal setting: Configuración > Música. */
(function () {
  var GAME = /^#\/(Partido|Duelo|Baloncesto|Tenis|Voley)\b/;
  var BPM = 118, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = 16;
  var ctx = null, master = null, bus = null, noise = null, timer = null;
  var playing = false, step = 0, nextT = 0;

  function vol() { var p = window.AMPlay ? window.AMPlay() : {}; return p.music == null ? 0.6 : +p.music; }
  function wanted() { return vol() > 0 && !GAME.test(location.hash) && !document.hidden; }

  var hz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  // Am – F – C – G, two bars each
  var CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], ROOT = [45, 41, 48, 43];
  // a hook over 16 bars (8 per half), as [step within the 2-bar chord, midi, length in steps]; null = rest
  var HOOK = [
    [[0, 76, 3], [4, 74, 2], [6, 72, 2], [8, 74, 4], [14, 72, 2], [16, 69, 6], [24, 72, 4], [28, 74, 4]],
    [[0, 72, 3], [4, 72, 2], [6, 74, 2], [8, 76, 6], [16, 77, 4], [20, 76, 4], [24, 74, 8]],
    [[0, 76, 3], [4, 79, 3], [8, 76, 2], [10, 74, 2], [12, 72, 4], [16, 74, 4], [20, 72, 4], [24, 71, 8]],
    [[0, 74, 4], [4, 76, 4], [8, 79, 8], [16, 81, 4], [20, 79, 4], [24, 76, 8]]
  ];

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(master);
    var len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(type, f, t, dur, peak, a, dest, cut) {
    var o = ctx.createOscillator(), g = ctx.createGain(), out = g;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (cut) { var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); fl.connect(g); }
    else o.connect(g);
    env(g, t, a, peak, dur);
    out.connect(dest || bus);
    o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function hit(t, dur, peak, type, freq) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    s.connect(f); f.connect(g); g.connect(bus);
    env(g, t, 0.002, peak, dur);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(g); g.connect(bus); env(g, t, 0.002, 0.9, 0.28);
    o.start(t); o.stop(t + 0.35);
  }

  function play(s, t) {
    var bar = Math.floor(s / BAR), i = s % BAR, chord = Math.floor(bar / 2) % 4, sec = Math.floor(bar / 8) % 4;
    var intro = sec === 0 && bar < 2;           // the first two bars build up without the drums
    // drums: four on the floor, clap on 2 and 4, off-beat hats, a fill at the end of every 8 bars
    if (!intro) {
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) hit(t, 0.16, 0.45, 'bandpass', 1800);
      if (i % 4 === 2) hit(t, 0.05, 0.22, 'highpass', 8000);
      else if (i % 2 === 1) hit(t, 0.03, 0.08, 'highpass', 9000);
      if (bar % 8 === 7 && i >= 12) hit(t, 0.09, 0.3, 'bandpass', 1200 + (i - 12) * 300);
    }
    // bass: driving eighths on the root, an octave jump on the off-beat
    if (i % 2 === 0) osc('sawtooth', hz(ROOT[chord] - 12 + (i % 8 === 6 ? 12 : 0)), t, STEP * 1.6, 0.32, 0.005, null, 420);
    // pad: the chord, held for two bars, with a slow swell
    if (i === 0 && bar % 2 === 0) CH[chord].forEach(function (m, k) {
      [-6, 6].forEach(function (det) {
        var o = osc('sawtooth', hz(m), t, BEAT * 7.5, 0.05, BEAT * 0.6, null, 1400);
        o.detune.value = det + k;
      });
    });
    // arpeggio: sixteenth-note pluck up and down the chord
    var arp = CH[chord], seq = [0, 1, 2, 1];
    if (!intro) osc('square', hz(arp[seq[i % 4]] + 12 * (i % 8 < 4 ? 0 : 1)), t, STEP * 0.9, 0.045, 0.003, null, 2600);
    // hook: only in the 2nd and 4th section, so it comes and goes
    if (sec % 2 === 1) {
      var ph = (bar % 2) * BAR + i;
      (HOOK[chord] || []).forEach(function (n) {
        if (n[0] === ph) { osc('triangle', hz(n[1]), t, STEP * n[2], 0.16, 0.01); osc('square', hz(n[1]), t, STEP * n[2], 0.03, 0.01, null, 3000); }
      });
    }
  }

  function tick() {
    while (nextT < ctx.currentTime + 0.25) { play(step, nextT); step = (step + 1) % (BAR * 32); nextT += STEP; }
  }

  function start() {
    init();
    if (!ctx || playing) return;
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    step = 0; nextT = ctx.currentTime + 0.08;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.5 * vol(), now + 1.5);
    timer = setInterval(tick, 60); tick();
  }
  function stop() {
    if (!ctx || !playing) return;
    playing = false;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(function () { if (!playing) { clearInterval(timer); timer = null; } }, 700);
  }
  function update() {
    if (wanted()) {
      if (!playing) start();
      else { var now = ctx.currentTime; master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(master.gain.value, now); master.gain.linearRampToValueAtTime(0.5 * vol(), now + 0.3); }
    } else stop();
  }

  window.AMMusic = { update: update };
  var first = function () { if (ctx && ctx.state === 'suspended') ctx.resume(); update(); };
  ['pointerdown', 'keydown', 'touchend'].forEach(function (e) { window.addEventListener(e, first, { passive: true }); });
  window.addEventListener('hashchange', function () { if (ctx) update(); });
  document.addEventListener('visibilitychange', function () { if (ctx) update(); });
})();
