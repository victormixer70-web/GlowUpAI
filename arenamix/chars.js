/* ARENA MIX characters: Mixamo models (GLB) driven by the same rig every sport already animates.
   AMChars.make(o) returns a group whose userData has proxy joints { body, legs, arms, head }
   (identical to the procedural players), so animate() code works unchanged; the proxies are
   copied onto the Mixamo bones right before the model is drawn. */
(function () {
  var T = window.THREE;
  var LIST = [
    { id: 'ty', name: 'Ty', file: 'assets/chars/ty.glb' },
    { id: 'vegas', name: 'Big Vegas', file: 'assets/chars/vegas.glb' },
    { id: 'granny', name: 'Granny', file: 'assets/chars/granny.glb' }
  ];
  var KEY = 'arenamix.char.v1', HEIGHT = 1.86;
  var tpl = {}, loading = null, waiters = [], ANIM = null;

  function pref() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); if (v && v.pick) return v.pick; } catch (e) {}
    return 'ty';
  }
  function setPref(id) {
    try { localStorage.setItem(KEY, JSON.stringify({ pick: id })); } catch (e) {}
  }
  function ready() { return LIST.every(function (c) { return tpl[c.id]; }); }

  /* Mocap clips (Mixamo "Soccer Game Pack"), baked as per-bone world rotations relative to the
     T-pose, so one set of clips fits every character whatever its bone orientations. */
  function loadAnims() {
    return fetch('assets/chars/anims.json').then(function (r) { return r.json(); }).then(function (j) {
      var raw = atob(j.data), buf = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
      var clips = {};
      j.clips.forEach(function (c) {
        clips[c.id] = { fps: c.fps, n: c.n, loop: c.loop, dur: (c.n - 1) / c.fps,
          q: new Int16Array(buf.buffer, c.qOff, c.n * j.bones.length * 4), p: new Int16Array(buf.buffer, c.pOff, c.n * 3) };
      });
      ANIM = { bones: j.bones, clips: clips };
    }).catch(function () { ANIM = null; });
  }
  function clipInfo(id) { var c = ANIM && ANIM.clips[id]; return c ? { dur: c.dur, loop: c.loop } : null; }

  function load(onStep) {
    if (loading) return loading;
    if (!T || !T.GLTFLoader || !T.SkeletonUtils) return (loading = Promise.resolve(false));
    var loader = new T.GLTFLoader();
    loading = Promise.all([loadAnims()].concat(LIST.map(function (c) {
      return new Promise(function (res) {
        loader.load(c.file, function (gl) {
          var root = gl.scene;
          root.traverse(function (m) {
            if (!m.isMesh) return;
            m.castShadow = true; m.frustumCulled = false;
            [].concat(m.material).forEach(function (mt) { mt.metalness = 0; mt.roughness = 0.72; if (mt.transparent) mt.depthWrite = false; });
          });
          root.updateMatrixWorld(true);
          var box = new T.Box3().setFromObject(root);
          tpl[c.id] = { root: root, box: box };
          if (onStep) onStep();
          res(true);
        }, null, function () { if (onStep) onStep(); res(false); });
      });
    }))).then(function () {
      var ok = ready();
      if (ok) waiters.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
      return ok;
    });
    return loading;
  }
  function onReady(f) { if (ready()) f(); else waiters.push(f); }

  var BONES = {
    hips: 'mixamorigHips', neck: 'mixamorigNeck',
    lUp: 'mixamorigLeftUpLeg', lLeg: 'mixamorigLeftLeg', rUp: 'mixamorigRightUpLeg', rLeg: 'mixamorigRightLeg',
    lArm: 'mixamorigLeftArm', lFore: 'mixamorigLeftForeArm', rArm: 'mixamorigRightArm', rFore: 'mixamorigRightForeArm'
  };

  function make(o) {
    o = o || {};
    var id = o.char || (o.you ? pref() : null);
    if (id === 'clasico' || (!id && pref() === 'clasico')) return null;
    if (!ready()) return null;
    if (!id || !tpl[id]) {
      // everyone else: any of the others, so your character stands out
      var pool = LIST.filter(function (c) { return c.id !== pref(); });
      if (!pool.length) pool = LIST;
      id = pool[Math.floor(Math.random() * pool.length)].id;
    }
    var t = tpl[id], model = T.SkeletonUtils.clone(t.root);
    var g = new T.Group(), holder = new T.Group();
    var size = t.box.getSize(new T.Vector3()), s = HEIGHT / size.y;
    holder.scale.setScalar(s);
    holder.position.set(-(t.box.min.x + t.box.max.x) / 2 * s, -t.box.min.y * s, -(t.box.min.z + t.box.max.z) / 2 * s);
    holder.add(model); g.add(holder);
    // team colour ring under the feet, so sides can be told apart whatever the outfit
    if (o.shirt != null && !o.noRing) {
      var ring = new T.Mesh(new T.RingGeometry(0.42, 0.55, 40), new T.MeshBasicMaterial({ color: new T.Color(o.shirt), transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.renderOrder = 1; g.add(ring);
    }
    g.updateMatrixWorld(true);

    var by = {};
    model.traverse(function (b) { if (b.isBone && !by[b.name]) by[b.name] = b; });
    var bones = [];
    model.traverse(function (b) { if (b.isBone) bones.push(b); });
    // rest data, relative to g: world rotation, world position, local rotation
    var gInv = new T.Matrix4().copy(g.matrixWorld).invert(), tmpM = new T.Matrix4();
    var info = new Map();
    function rel(obj) {
      tmpM.multiplyMatrices(gInv, obj.matrixWorld);
      var p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
      tmpM.decompose(p, q, sc);
      return { p: p, q: q, s: sc.x };
    }
    bones.forEach(function (b) { var r = rel(b); info.set(b, { wq: r.q, wp: r.p, ws: r.s, lq: b.quaternion.clone(), parentBone: b.parent && b.parent.isBone ? b.parent : null }); });
    var hips = by[BONES.hips];
    if (!hips) return null;
    var hipsParent = rel(hips.parent), hipsBindPos = hips.position.clone(), hipsW = info.get(hips).wp.clone();

    // proxies, exactly like the procedural rig: legs[0]/arms[0] are on -x, legs[1]/arms[1] on +x
    var P = function () { return new T.Object3D(); };
    var body = P(), head = P();
    var legs = [{ hip: P(), knee: P() }, { hip: P(), knee: P() }];
    var arms = [{ sho: P(), elb: P(), s: -1 }, { sho: P(), elb: P(), s: 1 }];
    // the model faces +z, so its left side is +x
    var rz = function (a) { return new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), a); };
    var I = new T.Quaternion();
    var map = [];
    function bind(name, chain, rest) {
      var b = by[name];
      if (b) map.push({ b: b, chain: chain, rest: rest || I });
      return b;
    }
    bind(BONES.hips, [body]);
    bind(BONES.neck, [body, head]);
    bind(BONES.rUp, [body, legs[0].hip]); bind(BONES.rLeg, [body, legs[0].hip, legs[0].knee]);
    bind(BONES.lUp, [body, legs[1].hip]); bind(BONES.lLeg, [body, legs[1].hip, legs[1].knee]);
    // Mixamo arms rest in a T-pose; the procedural arms rest hanging down
    bind(BONES.rArm, [body, arms[0].sho], rz(Math.PI / 2)); bind(BONES.rFore, [body, arms[0].sho, arms[0].elb], rz(Math.PI / 2));
    bind(BONES.lArm, [body, arms[1].sho], rz(-Math.PI / 2)); bind(BONES.lFore, [body, arms[1].sho, arms[1].elb], rz(-Math.PI / 2));
    var mapOf = new Map(); map.forEach(function (m) { mapOf.set(m.b, m); });

    // things added to a proxy (e.g. a tennis racket in the hand) ride on the matching bone
    function socket(proxy, bone, rest, atOrigin) {
      if (!bone) return;
      var r = info.get(bone);
      proxy.add = function (child) {
        var a = new T.Group();
        var q = rest.clone().multiply(r.wq).invert();
        a.quaternion.copy(q); a.scale.setScalar(1 / r.ws);
        if (atOrigin) a.position.copy(r.wp).negate().applyQuaternion(q).multiplyScalar(1 / r.ws);
        a.add(child); bone.add(a);
        return proxy;
      };
    }
    socket(body, hips, I, true);
    socket(head, by[BONES.neck], I, false);
    socket(arms[0].elb, by[BONES.rFore], rz(Math.PI / 2), false); socket(arms[1].elb, by[BONES.lFore], rz(Math.PI / 2 * -1), false);
    socket(arms[0].sho, by[BONES.rArm], rz(Math.PI / 2), false); socket(arms[1].sho, by[BONES.lArm], rz(-Math.PI / 2), false);

    // clip bone index for every model bone (-1: not animated by the clips)
    var aIdx = new Map();
    if (ANIM) bones.forEach(function (b) { aIdx.set(b, ANIM.bones.indexOf(b.name)); });
    var anim = { layers: [] };
    var wn = new Map(), dn = new Map(), qa = new T.Quaternion(), qb = new T.Quaternion(), qc = new T.Quaternion(), v = new T.Vector3(), vc = new T.Vector3(), lastFrame = -1;
    var acc = new Float32Array(4), pc = new Float32Array(3);
    // the layers' clip pose for one bone (k = clip bone index): weighted, sign-aligned quaternion sum
    function sampleBone(k, out) {
      var L = anim.layers, tw = 0;
      acc[0] = acc[1] = acc[2] = acc[3] = 0;
      for (var i = 0; i < L.length; i++) {
        var l = L[i], c = ANIM.clips[l.id];
        if (!c || !(l.w > 0)) continue;
        var f = l.t * c.fps, n = c.n;
        if (c.loop) { f %= (n - 1); if (f < 0) f += n - 1; } else f = Math.max(0, Math.min(n - 1, f));
        var f0 = Math.floor(f), f1 = Math.min(n - 1, f0 + 1), u = f - f0, nb = ANIM.bones.length;
        var a = (f0 * nb + k) * 4, b = (f1 * nb + k) * 4, q = c.q;
        var s1 = (q[a] * q[b] + q[a + 1] * q[b + 1] + q[a + 2] * q[b + 2] + q[a + 3] * q[b + 3]) < 0 ? -1 : 1;
        var x = q[a] + (s1 * q[b] - q[a]) * u, y = q[a + 1] + (s1 * q[b + 1] - q[a + 1]) * u, z = q[a + 2] + (s1 * q[b + 2] - q[a + 2]) * u, ww = q[a + 3] + (s1 * q[b + 3] - q[a + 3]) * u;
        var len = Math.sqrt(x * x + y * y + z * z + ww * ww) || 1, s2 = (tw > 0 && acc[0] * x + acc[1] * y + acc[2] * z + acc[3] * ww < 0) ? -1 : 1, k2 = s2 * l.w / len;
        acc[0] += x * k2; acc[1] += y * k2; acc[2] += z * k2; acc[3] += ww * k2; tw += l.w;
      }
      out.set(acc[0], acc[1], acc[2], acc[3]).normalize();
      return Math.min(1, tw);
    }
    function samplePos() {
      var L = anim.layers, tw = 0;
      pc[0] = pc[1] = pc[2] = 0;
      for (var i = 0; i < L.length; i++) {
        var l = L[i], c = ANIM.clips[l.id];
        if (!c || !(l.w > 0)) continue;
        var f = l.t * c.fps, n = c.n;
        if (c.loop) { f %= (n - 1); if (f < 0) f += n - 1; } else f = Math.max(0, Math.min(n - 1, f));
        var f0 = Math.floor(f), f1 = Math.min(n - 1, f0 + 1), u = f - f0;
        for (var j = 0; j < 3; j++) pc[j] += (c.p[f0 * 3 + j] + (c.p[f1 * 3 + j] - c.p[f0 * 3 + j]) * u) / 8000 * l.w;
        tw += l.w;
      }
      if (tw > 0) { pc[0] /= tw; pc[1] /= tw; pc[2] /= tw; }
      return Math.min(1, tw);
    }
    function apply() {
      var useClip = ANIM && anim.layers.length > 0;
      bones.forEach(function (b) {
        var r = info.get(b), pw = r.parentBone ? wn.get(r.parentBone) : null, pd = r.parentBone ? dn.get(r.parentBone) : null;
        var m = mapOf.get(b), w = wn.get(b) || new T.Quaternion(), d = dn.get(b) || new T.Quaternion();
        // procedural world rotation change from the T-pose: proxies for rig joints, inherited otherwise
        if (m) {
          d.identity();
          m.chain.forEach(function (px) { qb.setFromEuler(px.rotation); d.multiply(qb); });
          d.multiply(m.rest);
        } else if (pd) d.copy(pd); else d.identity();
        if (useClip) {
          var k = aIdx.get(b);
          if (k >= 0) { var cw = sampleBone(k, qc); if (cw > 0) d.slerp(qc, cw); }
          else if (pd) d.copy(pd);
        }
        w.copy(d).multiply(r.wq);
        b.quaternion.copy(pw || hipsParent.q).invert().multiply(w);
        wn.set(b, w); dn.set(b, d);
      });
      // body offset, plus the procedural body pivoting at the feet instead of the hips
      qb.setFromEuler(body.rotation);
      v.copy(hipsW).applyQuaternion(qb).sub(hipsW).add(body.position);
      if (useClip) {
        var pw2 = samplePos();
        if (pw2 > 0) { vc.set(pc[0] * hipsW.y, pc[1] * hipsW.y - hipsW.y, pc[2] * hipsW.y); v.lerp(vc, pw2); }
      }
      v.applyQuaternion(qa.copy(hipsParent.q).invert()).multiplyScalar(1 / hipsParent.s);
      hips.position.copy(hipsBindPos).add(v);
    }
    model.traverse(function (m) {
      if (m.isMesh) m.onBeforeRender = function (r) { var f = r.info.render.frame; if (f !== lastFrame) { lastFrame = f; apply(); model.updateMatrixWorld(true); } };
    });
    g.userData = { body: body, legs: legs, arms: arms, head: head, mixamo: id, apply: apply, anim: anim };
    apply();
    return g;
  }

  window.AMChars = { list: LIST, pref: pref, setPref: setPref, load: load, ready: ready, onReady: onReady, make: make, clip: clipInfo };
})();
