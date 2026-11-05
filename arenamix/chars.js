/* ARENA MIX characters: Mixamo models (GLB) driven by the same rig every sport already animates.
   AMChars.make(o) returns a group whose userData has proxy joints { body, legs, arms, head }
   (identical to the procedural players), so animate() code works unchanged; the proxies are
   copied onto the Mixamo bones right before the model is drawn. */
(function () {
  var T = window.THREE;
  var LIST = [
    { id: 'ty', name: 'Ty', file: 'assets/chars/ty.glb' },
    { id: 'vegas', name: 'Big Vegas', file: 'assets/chars/vegas.glb' },
    { id: 'granny', name: 'Granny', file: 'assets/chars/granny.glb' },
    { id: 'remy', name: 'Remy', file: 'assets/chars/remy.glb' },
    { id: 'leo', name: 'Leo', file: 'assets/chars/leo.glb' },
    { id: 'nico', name: 'Nico', file: 'assets/chars/nico.glb' },
    { id: 'dani', name: 'Dani', file: 'assets/chars/dani.glb' }
  ];
  var KEY = 'arenamix.char.v1', HEIGHT = 1.86, NECK_H = 1.55, HEAD_K = 0.78;
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
          prepKit(root, box);
          var nb = null; root.traverse(function (b) { if (b.isBone && b.name === 'mixamorigNeck') nb = b; });
          tpl[c.id] = { root: root, box: box, head: measureHead(root), neck: nb ? new T.Vector3().setFromMatrixPosition(nb.matrixWorld).y - box.min.y : (box.max.y - box.min.y) * 0.83 };
          if (onStep) onStep();
          res(true);
        }, null, function () { if (onStep) onStep(); res(false); });
      });
    }))).then(function () {
      try { footballers(); } catch (e) { console.warn('kit transplant', e); }
      var ok = ready();
      if (ok) waiters.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
      return ok;
    });
    return loading;
  }
  /* ---------- everyone a footballer ----------
     Dani is the only model that comes in a football kit. The other realistic models (same Mixamo rig) get
     Dani's shirt, shorts, socks and boots in place of their street clothes: every kit vertex is carried
     from Dani's bones to the same bones of the other skeleton, scaled to the model's height. */
  var KIT_SRC = 'dani', KIT_MESH = /(Shorts|Shirt|Socks|Shoes|Body)$/;
  // models with no legs under their trousers borrow Dani's (thigh to ankle), tinted to their skin
  var LEGS = { leo: '#F2E2D8', nico: '#8A6450', remy: '#FFE6D8' };
  // per model fit: offsets from each bone scaled a bit (borrowed legs sit just inside the model's own skin)
  var FIT = { remy: { Shorts: 1.1, Shirt: 1.04, Body: 0.94 } };
  var WEAR = { leo: /Ch23_(Suit|Belt|Shirt|Pants|Shoes)$/, nico: /Ch28_(Sneakers|Pants|Hoody)$/, remy: /^(Shoes|Tops|Bottoms)$/ };
  var DROP = { ty: /Scarf/ };
  var TRIM = { remy: /(Spine|Spine1|Spine2|Shoulder|Neck)$/ };
  function footballers() {
    var src = tpl[KIT_SRC];
    Object.keys(DROP).forEach(function (id) {
      var t = tpl[id]; if (!t) return;
      var rm = []; t.root.traverse(function (m) { if (m.isMesh && DROP[id].test(m.name)) rm.push(m); });
      rm.forEach(function (m) { m.parent.remove(m); });
    });
    if (!src) return;
    src.root.updateMatrixWorld(true);
    var srcH = src.box.max.y - src.box.min.y;
    Object.keys(WEAR).forEach(function (id) {
      var t = tpl[id]; if (!t) return;
      var root = t.root; root.updateMatrixWorld(true);
      var tb = {}; root.traverse(function (b) { if (b.isBone && !tb[b.name]) tb[b.name] = b; });
      var old = []; root.traverse(function (m) { if (m.isSkinnedMesh && WEAR[id].test(m.name)) old.push(m); });
      if (!old.length) return;
      var ref = old[0], k = (t.box.max.y - t.box.min.y) / srcH, inv = new T.Matrix4().copy(ref.matrixWorld).invert();
      var made = [];
      src.root.traverse(function (m) {
        if (!m.isSkinnedMesh || !KIT_MESH.test(m.name)) return;
        var sb = m.skeleton.bones, bones = sb.map(function (b) { return tb[b.name]; });
        if (bones.some(function (b) { return !b; })) return;
        var isBody = /Body$/.test(m.name);
        if (isBody && !LEGS[id]) return;
        var sp = sb.map(function (b) { return new T.Vector3().setFromMatrixPosition(b.matrixWorld); });
        var tp = bones.map(function (b) { return new T.Vector3().setFromMatrixPosition(b.matrixWorld); });
        var geo = m.geometry.clone();
        if (isBody) {
          // keep only the triangles the leg bones move
          var bn = sb.map(function (b) { return b.name; }), gi = geo.index, sI = geo.attributes.skinIndex, sW = geo.attributes.skinWeight, keep = [];
          var legV = function (x) { var best = 0, bw = -1; for (var q = 0; q < 4; q++) { var ww = sW.array[x * 4 + q]; if (ww > bw) { bw = ww; best = sI.array[x * 4 + q]; } } return /(UpLeg|Leg)$/.test(bn[best] || ''); };
          for (var f = 0; f < gi.count; f += 3) { var a = gi.getX(f), b2 = gi.getX(f + 1), c2 = gi.getX(f + 2); if (legV(a) && legV(b2) && legV(c2)) keep.push(a, b2, c2); }
          geo.setIndex(keep);
        }
        var pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
        var part = (m.name.match(/(Shorts|Shirt|Socks|Shoes|Body)$/) || [])[1], kf = k * ((FIT[id] || {})[part] || 1);
        var v = new T.Vector3(), acc = new T.Vector3(), d = new T.Vector3();
        for (var i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(m.geometry.attributes.position, i);
          m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld);
          acc.set(0, 0, 0);
          var tw = 0;
          for (var j = 0; j < 4; j++) {
            var w = sw.array[i * 4 + j]; if (!(w > 0)) continue;
            var bi = si.array[i * 4 + j];
            d.copy(v).sub(sp[bi]).multiplyScalar(kf).add(tp[bi]);
            acc.addScaledVector(d, w); tw += w;
          }
          if (tw > 0) acc.multiplyScalar(1 / tw); else acc.copy(v);
          acc.applyMatrix4(inv);
          pos.setXYZ(i, acc.x, acc.y, acc.z);
        }
        pos.needsUpdate = true; geo.computeBoundingSphere();
        var mat = m.material;
        if (isBody) { mat = m.material.clone(); mat.color = new T.Color(LEGS[id]); }
        var nm = new T.SkinnedMesh(geo, mat);
        nm.name = isBody ? 'Legs_Body' : m.name; nm.castShadow = true; nm.frustumCulled = false;
        nm.position.copy(ref.position); nm.quaternion.copy(ref.quaternion); nm.scale.copy(ref.scale);
        made.push({ mesh: nm, bones: bones });
      });
      if (!made.length) return;
      var parent = ref.parent;
      old.forEach(function (m) { m.parent.remove(m); });
      // skin of the torso that the old (lower cut) shirt showed would poke through the new one
      if (TRIM[id]) root.traverse(function (m) {
        if (!m.isSkinnedMesh || !/^Body$|_Body$/.test(m.name) || m.name === 'Legs_Body') return;
        var geo = m.geometry.clone(), names = m.skeleton.bones.map(function (b) { return b.name; }), si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, gi = geo.index, keep = [];
        if (!gi) return;
        var tor = function (x) { var best = 0, bw = -1; for (var q = 0; q < 4; q++) { var w = sw.array[x * 4 + q]; if (w > bw) { bw = w; best = si.array[x * 4 + q]; } } return TRIM[id].test(names[best] || ''); };
        for (var f = 0; f < gi.count; f += 3) { var a2 = gi.getX(f), b2 = gi.getX(f + 1), c2 = gi.getX(f + 2); if (!(tor(a2) || tor(b2) || tor(c2))) keep.push(a2, b2, c2); }
        geo.setIndex(keep); m.geometry = geo;
      });
      made.forEach(function (o) {
        parent.add(o.mesh); o.mesh.updateMatrixWorld(true);
        o.mesh.bind(new T.Skeleton(o.bones), o.mesh.matrixWorld.clone());
      });
      root.updateMatrixWorld(true);
      prepKit(root, t.box);
    });
    ['dani', 'leo', 'nico'].forEach(addArms);
    ['leo', 'nico', 'remy'].forEach(function (id) { addNeck(id); });
    Object.keys(HEADS).forEach(function (id) { headOnBody(id); if (tpl[id] && HEADS[id].face !== KIT_SRC) addNeck(id, 1.25, FACE_ARM[HEADS[id].face]); });
    // the same build for everyone: torsos as wide as Dani's (measured, so close models barely change)
    var w0 = torsoW('dani');
    LIST.forEach(function (c) { var t = tpl[c.id], w = torsoW(c.id); if (t && w0 && w) t.wx = Math.max(0.85, Math.min(1.15, w0 / w)); });
    LIST.forEach(function (c) { prepMuscle(c.id); });
    // heads sat a little high on the athletic build: bring every head down onto the neck (the head bone's
    // offset from the neck is shortened; the measured head boxes move with it, so hats and glasses still fit)
    LIST.forEach(function (c) {
      var t = tpl[c.id]; if (!t) return;
      var hb = null; t.root.traverse(function (b) { if (b.isBone && b.name === 'mixamorigHead' && !hb) hb = b; });
      if (!hb) return;
      t.root.updateMatrixWorld(true);
      var p0 = new T.Vector3().setFromMatrixPosition(hb.matrixWorld);
      hb.position.multiplyScalar(HEAD_K);
      t.root.updateMatrixWorld(true);
      var d = new T.Vector3().setFromMatrixPosition(hb.matrixWorld).sub(p0);
      ['skull', 'all', 'eyes'].forEach(function (k) { var b = t.head && t.head[k]; if (b && !b.isEmpty()) b.translate(d); });
      if (t.head && t.head.front != null) t.head.front += d.z;
    });
  }
  // width of the torso (hips to chest) at rest, in units of the neck height
  function torsoW(id) {
    var t = tpl[id]; if (!t) return 0;
    var box = new T.Box3(), v = new T.Vector3();
    t.root.updateMatrixWorld(true);
    t.root.traverse(function (m) {
      if (!m.isSkinnedMesh || m.userData.bareArms) return;
      var names = m.skeleton.bones.map(function (b) { return b.name; }), pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
      if (!si || !sw) return;
      for (var i = 0; i < pos.count; i += 2) {
        var best = 0, bw = -1;
        for (var k = 0; k < 4; k++) { var w = sw.array[i * 4 + k]; if (w > bw) { bw = w; best = si.array[i * 4 + k]; } }
        if (!/(Hips|Spine|Spine1|Spine2)$/.test(names[best] || '')) continue;
        v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld); box.expandByPoint(v);
      }
    });
    return box.isEmpty() ? 0 : (box.max.x - box.min.x) / (t.neck || 1);
  }
  /* ---------- cartoon characters as real footballers ----------
     Ty, Big Vegas and Granny get a real face (the head of one of the realistic models) on Dani's body and kit,
     and keep what makes them who they are: what their cartoon head has that isn't skin (hair, cap, curlers,
     glasses...), fitted over the real skull. Everyone has the same height and build. */
  var HEADS = {
    // the face model's own hair, recoloured (it fits the real skull); the rest comes from the Taquilla gear
    ty: { face: 'remy', hair: '#D8A846', noLash: true, dy: 0.012 },
    vegas: { face: 'leo', hair: '#121216', dy: 0.005, fix: { fz: 0.07 } },
    granny: { face: 'dani', hair: '#E4E4EA', fix: { fz: 0.11, hatY: -0.05 } }
  };
  // Dani's skin tinted to each face's (multiplier on his texture), and the colour of the bare arms
  var SIGNATURE = { vegas: { face: 'sun' }, granny: { hat: 'cap', hatColor: '#2BB3C0', face: 'round' } };
  var FACE_TINT = { dani: '#FFFFFF', leo: '#F2E2D8', remy: '#FFE6D8' };
  var FACE_ARM = { dani: '#C99A7E', leo: '#D9AE93', remy: '#D2A88A' };
  // the bones the head bone carries
  function headSet(root) {
    var hb = null, set = {};
    root.traverse(function (b) { if (b.isBone && b.name === 'mixamorigHead' && !hb) hb = b; });
    if (hb) hb.traverse(function (b) { if (b.isBone) set[b.name] = 1; });
    return { bone: hb, set: set };
  }
  function domBone(sw, si, i) { var best = 0, bw = -1; for (var q = 0; q < 4; q++) { var w = sw.array[i * 4 + q]; if (w > bw) { bw = w; best = si.array[i * 4 + q]; } } return best; }
  /* the head pieces of a model, in its world space: [{ P, N, uv, idx, groups, material, name }]
     triTest(mesh, a, b, c, P) decides which triangles to keep */
  function headPieces(t, meshTest, triTest) {
    var out = [], hs = headSet(t.root), v = new T.Vector3(), nv = new T.Vector3(), nmW = new T.Matrix3();
    t.root.updateMatrixWorld(true);
    t.root.traverse(function (m) {
      if (!m.isSkinnedMesh || !meshTest(m)) return;
      var geo = m.geometry, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, nrm = geo.attributes.normal;
      if (!si || !sw) return;
      var names = m.skeleton.bones.map(function (b) { return b.name; }), n = pos.count;
      var P = new Float32Array(n * 3), N = new Float32Array(n * 3), inH = new Uint8Array(n);
      nmW.getNormalMatrix(m.matrixWorld);
      for (var i = 0; i < n; i++) {
        inH[i] = hs.set[names[domBone(sw, si, i)]] ? 1 : 0;
        v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld);
        P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
        if (nrm) { nv.fromBufferAttribute(nrm, i).applyMatrix3(nmW).normalize(); N[i * 3] = nv.x; N[i * 3 + 1] = nv.y; N[i * 3 + 2] = nv.z; }
      }
      var idx = geo.index, cnt = idx ? idx.count : n, keep = [];
      var groups = geo.groups && geo.groups.length ? geo.groups : [{ start: 0, count: cnt, materialIndex: 0 }], ng = [];
      groups.forEach(function (gr) {
        var st = keep.length;
        for (var f = gr.start; f < gr.start + gr.count; f += 3) {
          var a = idx ? idx.getX(f) : f, b = idx ? idx.getX(f + 1) : f + 1, c = idx ? idx.getX(f + 2) : f + 2;
          if (inH[a] && inH[b] && inH[c] && triTest(m, a, b, c, gr.materialIndex)) keep.push(a, b, c);
        }
        if (keep.length > st) ng.push({ start: st, count: keep.length - st, materialIndex: gr.materialIndex });
      });
      if (keep.length) out.push({ P: P, N: nrm ? N : null, uv: geo.attributes.uv, idx: keep, groups: ng, material: m.material, name: m.name });
    });
    return out;
  }
  // texture colour under a vertex (sRGB 0..1), for telling skin from hair and accessories
  var pixCache = new Map();
  function texel(mt, uv, i) {
    var img = mt && mt.map && mt.map.image; if (!img || !uv) return null;
    var px = pixCache.get(img);
    if (!px) { try { var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; var c = cv.getContext('2d'); c.drawImage(img, 0, 0, 256, 256); px = c.getImageData(0, 0, 256, 256).data; } catch (e) { px = null; } pixCache.set(img, px || 0); }
    if (!px) return null;
    var u = uv.getX(i), w = uv.getY(i); u -= Math.floor(u); w -= Math.floor(w);
    if (mt.map.flipY !== false) w = 1 - w;
    var o = (Math.min(255, Math.floor(w * 256)) * 256 + Math.min(255, Math.floor(u * 256))) * 4;
    return [px[o] / 255, px[o + 1] / 255, px[o + 2] / 255];
  }
  // pieces → meshes on a holder (fixed to a bone), each vertex moved by fn(vector)
  function placePieces(pieces, holder, fn, box, boxHair) {
    var v = new T.Vector3();
    pieces.forEach(function (pc) {
      var n = pc.P.length / 3, P = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { v.set(pc.P[i * 3], pc.P[i * 3 + 1], pc.P[i * 3 + 2]); fn(v); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
      var g2 = new T.BufferGeometry();
      g2.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      if (pc.uv) g2.setAttribute('uv', pc.uv);
      g2.setIndex(pc.idx);
      if (pc.N) g2.setAttribute('normal', new T.Float32BufferAttribute(pc.N, 3)); else g2.computeVertexNormals();
      pc.groups.forEach(function (gr) { g2.addGroup(gr.start, gr.count, gr.materialIndex); });
      var mats = [].concat(pc.material).map(function (mt) { var c2 = mt.clone(); c2.skinning = false; c2.morphTargets = false; return c2; });
      var mesh = new T.Mesh(g2, mats.length > 1 ? mats : mats[0]);
      if (mats.length === 1) g2.clearGroups();
      mesh.name = 'Head_' + pc.name; mesh.castShadow = true; mesh.frustumCulled = false;
      pc.idx.forEach(function (x) { v.set(P[x * 3], P[x * 3 + 1], P[x * 3 + 2]); (pc.hair ? boxHair : box).expandByPoint(v); });
      holder.add(mesh);
    });
  }
  function headOnBody(id) {
    var src = tpl[id], base = tpl[KIT_SRC], cfg = HEADS[id], face = tpl[cfg && cfg.face];
    if (!src || !base || !cfg || !face) return;
    var root = T.SkeletonUtils.clone(base.root);
    root.updateMatrixWorld(true);
    var dh = headSet(root), hB = dh.bone, fh = headSet(face.root), sh = headSet(src.root);
    if (!hB || !fh.bone || !sh.bone) return;
    var ownFace = cfg.face === KIT_SRC, tint = new T.Color(FACE_TINT[cfg.face] || '#FFFFFF');
    var drop = [];
    root.traverse(function (m) {
      if (!m.isSkinnedMesh) return;
      if ((!ownFace && /Hair$/.test(m.name)) || (!ownFace && /Eyelashes$/.test(m.name))) { drop.push(m); return; }
      if (ownFace && /Hair$/.test(m.name)) { m.material = hairTint(m.material, cfg.hair); return; }
      if (m.userData.bareArms) { m.material = m.material.clone(); m.material.color = new T.Color(FACE_ARM[cfg.face] || '#C99A7E').convertSRGBToLinear(); return; }
      if (!/Body$/.test(m.name)) return;
      m.material = m.material.clone(); m.material.color = tint.clone();
      if (ownFace) return;
      // Dani's skin without his head (the top of the neck stays, so no gap shows under the new one)
      var geo = m.geometry.clone(), names = m.skeleton.bones.map(function (b) { return b.name; }), si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, gi = geo.index, keep = [];
      var hp = geo.attributes.position, hv = new T.Vector3(), cut = base.head.skull.min.y + (base.head.skull.max.y - base.head.skull.min.y) * 0.07;
      var isHead = function (x) { if (!dh.set[names[domBone(sw, si, x)]]) return false; hv.fromBufferAttribute(hp, x); m.boneTransform(x, hv); hv.applyMatrix4(m.matrixWorld); return hv.y > cut; };
      for (var f = 0; f < gi.count; f += 3) { var a = gi.getX(f), b = gi.getX(f + 1), c = gi.getX(f + 2); if (!(isHead(a) && isHead(b) && isHead(c))) keep.push(a, b, c); }
      geo.setIndex(keep); m.geometry = geo;
    });
    drop.forEach(function (m) { m.parent.remove(m); });
    var holder = new T.Group(); holder.matrixAutoUpdate = false; holder.name = 'NewHead';
    holder.matrix.copy(hB.matrixWorld).invert();
    hB.add(holder);
    var pD = new T.Vector3().setFromMatrixPosition(hB.matrixWorld);
    // a face model whose chin hangs lower under its head bone is lifted, so the neck shows under the jaw
    if (cfg.dy) pD.y += cfg.dy * (base.neck || 1);
    // the real face: the head of the face model, moved from its head bone to Dani's, at Dani's scale
    var real = { min: base.head.skull.min.clone(), max: base.head.skull.max.clone(), eyes: base.head.eyes, front: base.head.front };
    if (!ownFace) {
      var pF = new T.Vector3().setFromMatrixPosition(fh.bone.matrixWorld), kf = (base.neck || 1) / (face.neck || 1);
      var fp = headPieces(face, function (m) { return !/Shirt|Tops|Hoody|Suit|Scarf|Neck_Body/i.test(m.name) && !m.userData.neckFill && !(cfg.noLash && /Lash/i.test(m.name)); }, function () { return true; });
      var fb = new T.Box3(), fbh = new T.Box3();
      placePieces(fp, holder, function (v) { v.sub(pF).multiplyScalar(kf).add(pD); }, fb, fbh);
      holder.children.forEach(function (mh) { if (/Hair/i.test(mh.name)) mh.material = hairTint(mh.material, cfg.hair); });
      // where the new skull is (eyes and lashes don't count)
      var sk0 = face.head.skull;
      real.min.copy(sk0.min).sub(pF).multiplyScalar(kf).add(pD); real.max.copy(sk0.max).sub(pF).multiplyScalar(kf).add(pD);
      // the eyes and the bridge of the nose, where glasses rest
      var mv = function (p) { return p.clone().sub(pF).multiplyScalar(kf).add(pD); };
      real.eyes = face.head.eyes ? new T.Box3(mv(face.head.eyes.min), mv(face.head.eyes.max)) : null;
      real.front = face.head.front != null ? (face.head.front - pF.z) * kf + pD.z : null;
    }
    var abh = new T.Box3();
    holder.children.forEach(function (mh) { if (/Hair/i.test(mh.name)) abh.union(new T.Box3().setFromObject(mh)); });
    root.updateMatrixWorld(true);
    var skull = new T.Box3(real.min, real.max), all = skull.clone().union(abh);
    tpl[id] = { root: root, box: new T.Box3().setFromObject(root), neck: base.neck, head: { skull: skull, all: all, eyes: real.eyes, front: real.front } };
    HEADFIX[id] = cfg.fix || {};
  }
  /* hair in a new colour: the texture's light and shade (and its alpha, for the strands) kept, the colour
     replaced, so dark hair can become blond or grey */
  function hairTint(mat, hex) {
    if (!hex || !mat) return mat;
    var m = mat.clone(), tint = new T.Color(hex).convertSRGBToLinear(), gain = 1;
    // the texture's average brightness, so the new colour comes out at its own brightness
    try {
      var img = m.map && m.map.image, cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      var c = cv.getContext('2d'); c.drawImage(img, 0, 0, 64, 64);
      var d = c.getImageData(0, 0, 64, 64).data, sum = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; var l = Math.pow((0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, 2.2); sum += l; n++; }
      gain = n ? 0.85 / Math.max(0.01, sum / n) : 1;
    } catch (e) {}
    m.color = new T.Color(1, 1, 1);
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uHairTint = { value: tint }; sh.uniforms.uHairGain = { value: gain };
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHairTint;\nuniform float uHairGain;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float hl = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)); diffuseColor.rgb = uHairTint * clamp(hl * uHairGain, 0.0, 1.6); }');
    };
    m.customProgramCacheKey = function () { return 'hair|' + hex; };
    return m;
  }
  // the skin colour at the front of a cartoon face (sRGB), sampled from its texture
  function faceSkin(t, m, mt) {
    var geo = m.geometry, pos = geo.attributes.position, uv = geo.attributes.uv, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
    var hs = headSet(t.root), names = m.skeleton.bones.map(function (b) { return b.name; }), sk = t.head.skull, cx = (sk.min.x + sk.max.x) / 2;
    var y0 = sk.min.y + (sk.max.y - sk.min.y) * 0.25, y1 = sk.min.y + (sk.max.y - sk.min.y) * 0.45, best = -Infinity, bi = -1, v = new T.Vector3();
    for (var i = 0; i < pos.count; i++) {
      if (!hs.set[names[domBone(sw, si, i)]]) continue;
      v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld);
      if (v.y < y0 || v.y > y1 || Math.abs(v.x - cx) > (sk.max.x - sk.min.x) * 0.12) continue;
      if (v.z > best) { best = v.z; bi = i; }
    }
    return bi >= 0 ? texel(mt, uv, bi) : null;
  }
  /* ---------- sleeves and size (Taquilla) ---------- */
  var FIT_KEY = 'arenamix.fit.v1', FIT_DEF = { sleeve: 'short', size: 'M' };
  // how much the shirt and shorts are let out, in metres
  var SIZES = { S: -0.0025, M: 0, L: 0.012, XL: 0.026 };
  function fitPref() {
    try { var v = JSON.parse(localStorage.getItem(FIT_KEY) || 'null'); if (v) return { sleeve: v.sleeve === 'long' ? 'long' : 'short', size: SIZES[v.size] != null ? v.size : 'M' }; } catch (e) {}
    return { sleeve: FIT_DEF.sleeve, size: FIT_DEF.size };
  }
  function setFit(f) { try { localStorage.setItem(FIT_KEY, JSON.stringify(fitPref() && Object.assign(fitPref(), f))); } catch (e) {} }
  // skin tone of the arms bared by short sleeves
  var SKIN = { ty: '#F6CBAA', vegas: '#F0C29C', granny: '#BFD3C6', dani: '#C99A7E', leo: '#D9AE93', nico: '#5E3E2E', remy: '#D2A88A' };
  /* models with nothing under the shirt get arms: a tube along the arm bones, as thick as the sleeve
     around it, skinned to the shoulder, elbow and wrist */
  /* a neck that reaches down into the collar: the transplanted shirt is cut lower than each model's own,
     so without it a gap (or a hard edge of skin) shows between the head and the shirt */
  function addNeck(id, top, col) {
    var t = tpl[id]; if (!t) return;
    var shirt = null, body = []; t.root.traverse(function (m) { if (!m.isSkinnedMesh) return; if (/Shirt$/.test(m.name)) shirt = m; else if (/Body$|Head$/.test(m.name) && !m.userData.bareArms && m.name !== 'Legs_Body') body.push(m); });
    if (!shirt) return;
    t.root.updateMatrixWorld(true);
    var by = {}; t.root.traverse(function (b) { if (b.isBone && !by[b.name]) by[b.name] = b; });
    var bS = by.mixamorigSpine2, bN = by.mixamorigNeck, bH = by.mixamorigHead; if (!bS || !bN || !bH) return;
    var pS = new T.Vector3().setFromMatrixPosition(bS.matrixWorld), pN = new T.Vector3().setFromMatrixPosition(bN.matrixWorld), pH = new T.Vector3().setFromMatrixPosition(bH.matrixWorld);
    // the radius of the model's own neck, from its skin between the neck and head bones
    var ds = [], v = new T.Vector3(), ax = pH.clone().sub(pN), L2 = ax.lengthSq();
    body.forEach(function (m) {
      var pos = m.geometry.attributes.position;
      for (var i = 0; i < pos.count; i += 2) {
        v.fromBufferAttribute(pos, i); m.boneTransform(i, v); v.applyMatrix4(m.matrixWorld);
        var tt = v.clone().sub(pN).dot(ax) / L2; if (tt < 0.15 || tt > 0.7) continue;
        ds.push(v.distanceTo(pN.clone().addScaledVector(ax, tt)));
      }
    });
    var H = t.box.max.y - t.box.min.y, R = H * 0.034;
    if (ds.length > 20) { ds.sort(function (a, b) { return a - b; }); R = Math.min(R * 1.4, ds[Math.floor(ds.length * 0.3)] * 0.93); }
    var mat = new T.MeshStandardMaterial({ color: new T.Color(col || NECK[id] || SKIN[id] || '#D9AE93').convertSRGBToLinear(), roughness: 0.62, metalness: 0 });
    mat.skinning = true;
    var inv = new T.Matrix4().copy(shirt.matrixWorld).invert(), RING = 16, P = [], SI = [], SW = [], IDX = [], ST = 8;
    // from the top of the chest (inside the shirt) to just under the jaw, a little forward like a real neck
    var y0 = pS.clone().lerp(pN, 0.8), y1 = pN.clone().lerp(pH, top || 0.75);
    for (var k = 0; k <= ST; k++) {
      // at the bottom it widens towards the shoulders and the back (the inside of the collar never shows)
      var u = k / ST, c = y0.clone().lerp(y1, u), r = R * (1.0 - 0.06 * u), fl = Math.max(0, 1 - u / 0.45);
      for (var j = 0; j < RING; j++) {
        var a = j / RING * Math.PI * 2, sz = Math.sin(a), p = new T.Vector3(c.x + Math.cos(a) * r * (1 + 0.45 * fl), c.y, c.z - R * 0.2 * fl + sz * r * (sz < 0 ? 0.95 + 0.35 * fl : 0.95)).applyMatrix4(inv);
        P.push(p.x, p.y, p.z);
        var wH = Math.max(0, (u - 0.6) / 0.4), wS = Math.max(0, 1 - u / 0.45);
        SI.push(0, 1, 2, 0); SW.push(wS, 1 - wS - wH, wH, 0);
      }
    }
    for (var k2 = 0; k2 < ST; k2++) for (var j2 = 0; j2 < RING; j2++) {
      var a0 = k2 * RING + j2, a1 = k2 * RING + (j2 + 1) % RING;
      IDX.push(a0, a1, a0 + RING, a1, a1 + RING, a0 + RING);
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(SI, 4));
    geo.setAttribute('skinWeight', new T.Float32BufferAttribute(SW, 4));
    geo.setIndex(IDX); geo.computeVertexNormals();
    mat.side = T.DoubleSide;
    var mesh = new T.SkinnedMesh(geo, mat);
    mesh.name = 'Neck_Body'; mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.neckFill = true;
    mesh.position.copy(shirt.position); mesh.quaternion.copy(shirt.quaternion); mesh.scale.copy(shirt.scale);
    shirt.parent.add(mesh); mesh.updateMatrixWorld(true);
    mesh.bind(new T.Skeleton([bS, bN, bH]), mesh.matrixWorld.clone());
  }
  var NECK = { leo: '#E8BFA8', nico: '#5E3C2C', remy: '#EBC6B4' };
  /* ---------- build: athletes, not office workers ----------
     Every skinned mesh gets aMus (metres to push out along the normal, from the bones that move each vertex):
     x for the upper body (chest, shoulders, arms, neck), y for the legs and hips. The same push goes on skin
     and clothes alike, so the shirt still covers the chest it covers now. BUILD scales it per character. */
  var MUS = {
    Spine2: [0.026, 0], Spine1: [0.015, 0], Spine: [0.006, 0], Neck: [0, 0],
    LeftShoulder: [0.02, 0], RightShoulder: [0.02, 0], LeftArm: [0.028, 0], RightArm: [0.028, 0],
    LeftForeArm: [0.016, 0], RightForeArm: [0.016, 0],
    Hips: [0, 0.008], LeftUpLeg: [0, 0.014], RightUpLeg: [0, 0.014]
  };
  // men strong; women in good shape (toned, lighter up top)
  var BUILD = {};
  function prepMuscle(id) {
    var t = tpl[id]; if (!t) return;
    var H = t.box.max.y - t.box.min.y;
    t.root.updateMatrixWorld(true);
    t.root.traverse(function (m) {
      if (!m.isSkinnedMesh) return;
      var geo = m.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; if (!si || !sw) return;
      var ws = new T.Vector3(); m.getWorldScale(ws);
      m.userData.musUnit = (H / HEIGHT) / (ws.x || 1);
      if (geo.attributes.aMus) return;
      var names = m.skeleton.bones.map(function (b) { return MUS[b.name.replace('mixamorig', '')] || null; }), n = geo.attributes.position.count, a = new Float32Array(n * 2), any = false;
      for (var i = 0; i < n; i++) for (var k = 0; k < 4; k++) {
        var w = sw.array[i * 4 + k], mu = w > 0 && names[si.array[i * 4 + k]]; if (!mu) continue;
        a[i * 2] += w * mu[0]; a[i * 2 + 1] += w * mu[1]; any = true;
      }
      if (!any) return;
      geo.setAttribute('aMus', new T.Float32BufferAttribute(a, 2));
    });
  }
  function muscleMat(mat, unit, k) {
    var m = mat.clone(), prev = mat.onBeforeCompile, key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '';
    var U = { value: new T.Vector2(k[0] * unit, k[1] * unit) };
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.uniforms.uMus = U;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aMus;\nuniform vec2 uMus;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += objectNormal * dot(aMus, uMus);');
    };
    m.customProgramCacheKey = function () { return key + '|mus'; };
    return m;
  }
  function addArms(id) {
    var t = tpl[id]; if (!t) return;
    var shirt = null; t.root.traverse(function (m) { if (m.isSkinnedMesh && /Shirt$/.test(m.name)) shirt = m; });
    if (!shirt) return;
    t.root.updateMatrixWorld(true);
    var by = {}; t.root.traverse(function (b) { if (b.isBone && !by[b.name]) by[b.name] = b; });
    var sp = []; var pos = shirt.geometry.attributes.position, v = new T.Vector3();
    for (var i = 0; i < pos.count; i += 1) { v.fromBufferAttribute(pos, i); shirt.boneTransform(i, v); v.applyMatrix4(shirt.matrixWorld); sp.push(v.clone()); }
    var mat = new T.MeshStandardMaterial({ color: new T.Color(SKIN[id] || '#D9AE93').convertSRGBToLinear(), roughness: 0.62, metalness: 0 });
    mat.skinning = true;
    var inv = new T.Matrix4().copy(shirt.matrixWorld).invert(), H = t.box.max.y - t.box.min.y;
    ['Left', 'Right'].forEach(function (side) {
      var bA = by['mixamorig' + side + 'Arm'], bF = by['mixamorig' + side + 'ForeArm'], bH = by['mixamorig' + side + 'Hand'];
      if (!bA || !bF || !bH) return;
      var pA = new T.Vector3().setFromMatrixPosition(bA.matrixWorld), pF = new T.Vector3().setFromMatrixPosition(bF.matrixWorld), pH = new T.Vector3().setFromMatrixPosition(bH.matrixWorld);
      var at = function (u) { return u <= 1 ? pA.clone().lerp(pF, u) : pF.clone().lerp(pH, u - 1); };
      var dirAt = function (u) { return (u <= 1 ? pF.clone().sub(pA) : pH.clone().sub(pF)).normalize(); };
      // sleeve radius along the arm (bins of u), from the shirt vertices around it
      var NB = 20, rs = [], i2, b;
      for (b = 0; b < NB; b++) rs.push([]);
      sp.forEach(function (q) {
        var best = null;
        [[pA, pF, 0], [pF, pH, 1]].forEach(function (sg) {
          var d = sg[1].clone().sub(sg[0]), L2 = d.lengthSq(), tt = q.clone().sub(sg[0]).dot(d) / L2;
          if (tt < 0 || tt > 1) return;
          var dist = q.distanceTo(sg[0].clone().addScaledVector(d, tt));
          if (!best || dist < best.d) best = { d: dist, u: sg[2] + tt };
        });
        if (best && best.d < H * 0.07) rs[Math.min(NB - 1, Math.floor(best.u / 2 * NB))].push(best.d);
      });
      var rad = rs.map(function (a) { if (!a.length) return null; a.sort(function (x, y) { return x - y; }); return a[Math.floor(a.length * 0.35)]; });
      var radAt = function (u) {
        var k = Math.max(0, Math.min(NB - 1, Math.floor(u / 2 * NB))), r = rad[k];
        for (var j = 1; r == null && j < NB; j++) r = rad[Math.max(0, k - j)] || rad[Math.min(NB - 1, k + j)];
        // a little inside the sleeve, tapering to the wrist
        var lim = H * (u < 1 ? 0.034 - 0.008 * u : 0.026 - 0.008 * (u - 1));
        return Math.min(r != null ? r * 0.82 : lim, lim);
      };
      var RING = 14, us = [], u0 = 0.3, u1 = 1.97;
      for (var s2 = 0; s2 <= 22; s2++) us.push(u0 + (u1 - u0) * s2 / 22);
      var P = [], SI = [], SW = [], IDX = [], ref = new T.Vector3(0, 0, 1);
      var rad0 = us.map(radAt);
      // smooth the radii
      var rsm = rad0.map(function (r, k) { return (rad0[Math.max(0, k - 1)] + r * 2 + rad0[Math.min(rad0.length - 1, k + 1)]) / 4; });
      us.forEach(function (u, k) {
        var c = at(u), d = dirAt(u), x = new T.Vector3().crossVectors(d, ref); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize();
        var y = new T.Vector3().crossVectors(d, x).normalize();
        for (var r = 0; r < RING; r++) {
          var a = r / RING * Math.PI * 2, p2 = c.clone().addScaledVector(x, Math.cos(a) * rsm[k]).addScaledVector(y, Math.sin(a) * rsm[k] * 0.92).applyMatrix4(inv);
          P.push(p2.x, p2.y, p2.z);
          // weights: shoulder bone, blended over the elbow, then the forearm (and the hand at the end)
          var wF = Math.max(0, Math.min(1, (u - 0.85) / 0.3)), wH = Math.max(0, Math.min(1, (u - 1.85) / 0.12));
          SI.push(0, 1, 2, 0); SW.push(1 - wF, wF * (1 - wH), wF * wH, 0);
        }
      });
      for (var k2 = 0; k2 < us.length - 1; k2++) for (var r2 = 0; r2 < RING; r2++) {
        var a0 = k2 * RING + r2, a1 = k2 * RING + (r2 + 1) % RING, b0 = a0 + RING, b1 = a1 + RING;
        IDX.push(a0, b0, a1, a1, b0, b1);
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(SI, 4));
      geo.setAttribute('skinWeight', new T.Float32BufferAttribute(SW, 4));
      geo.setIndex(IDX); geo.computeVertexNormals();
      // the winding may face inwards depending on the side: flip so normals point out
      var c0 = at(1), n0 = new T.Vector3().fromBufferAttribute(geo.attributes.normal, 11 * RING), p0 = new T.Vector3().fromBufferAttribute(geo.attributes.position, 11 * RING).applyMatrix4(shirt.matrixWorld);
      if (n0.transformDirection(shirt.matrixWorld).dot(p0.sub(c0)) < 0) { for (var f = 0; f < IDX.length; f += 3) { var tmp = IDX[f + 1]; IDX[f + 1] = IDX[f + 2]; IDX[f + 2] = tmp; } geo.setIndex(IDX); geo.computeVertexNormals(); }
      var mesh = new T.SkinnedMesh(geo, mat);
      mesh.name = side + 'Arm_Body'; mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.bareArms = true;
      mesh.position.copy(shirt.position); mesh.quaternion.copy(shirt.quaternion); mesh.scale.copy(shirt.scale);
      shirt.parent.add(mesh); mesh.updateMatrixWorld(true);
      mesh.bind(new T.Skeleton([bA, bF, bH]), mesh.matrixWorld.clone());
    });
  }
  // the cartoon models are one piece: their clothes are painted as a kit when no outfit is given
  var PAINT = { ty: 1, vegas: 1, granny: 1 };
  var HOME_KIT = { primary: '#F4F6FA', secondary: '#1E3A8A', pattern: 'solid', shorts: '#1E2A55', socks: '#F4F6FA', shoe: '#1A1D24' };
  function onReady(f) { if (ready()) f(); else waiters.push(f); }

  /* ---------- kits: the outfit chosen in Taquilla painted over each character's own clothes ----------
     Every vertex of the clothing meshes gets a zone from the bone that moves it most (torso and arms:
     shirt, hips and thighs: shorts, shins: socks, feet: boots; head and hands keep their look) and its
     T-pose position, for patterns. The shader keeps the texture's folds and shading. */
  // a mesh called just "Body" (Remy, Ch23...) is the bare skin under the clothes: never painted
  var SKIP_MESH = /hair|head|hand|eye|brow|mouth|lens|scarf|teeth|tongue|(^|_)body$/i;
  function zoneOf(name) {
    var n = name.replace('mixamorig', '');
    if (/Hand|Head|Neck|Eye|Hair|Visor|Whistle|Scart/.test(n)) return 0;
    if (/Foot|Toe/.test(n)) return 4;
    if (/UpLeg|Hips|Butt/.test(n)) return 2;
    if (/Leg/.test(n)) return 3;
    if (/Spine|Shoulder|Arm|Cape|Peck|Collar|Belly|Sleeve|Breast|Hood/.test(n)) return 1;
    return 0;
  }
  // skin-coloured texels stay as they are (open shirts, bare arms)
  function isSkin(r, g, b) { return r > 0.2 && g < r * 0.95 && g > r * 0.45 && b > r * 0.25 && b < g; }
  function prepKit(root, box) {
    var H = box.max.y - box.min.y, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, v = new T.Vector3();
    root.traverse(function (m) {
      if (!m.isSkinnedMesh || SKIP_MESH.test(m.name)) return;
      var mt = m.material;
      if (Array.isArray(mt) || mt.transparent || !mt.map) return;
      var geo = m.geometry, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, uv = geo.attributes.uv;
      if (!si || !sw) return;
      var n = pos.count, kit = new Float32Array(n * 3), arm = new Float32Array(n), names = m.skeleton.bones.map(function (b) { return b.name; }), isShirt = /shirt|tops/i.test(m.name);
      // where each bone sits at rest, for the sleeve coordinate (0 shoulder .. 1 elbow .. 2 wrist)
      var bwp = {}; m.skeleton.bones.forEach(function (b) { bwp[b.name] = new T.Vector3().setFromMatrixPosition(b.matrixWorld); });
      var armAt = function (bn, p) {
        var mm = /^(mixamorig)?(Left|Right)(Arm|ForeArm|Hand)/.exec(bn); if (!mm) return -1;
        var pre = (mm[1] || '') + mm[2];
        if (mm[3] !== 'Arm' && mm[3] !== 'ForeArm') return 2;
        var a = bwp[pre + mm[3]], b = bwp[pre + (mm[3] === 'Arm' ? 'ForeArm' : 'Hand')];
        if (!a || !b) return mm[3] === 'Arm' ? 0.5 : 1.5;
        var dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
        var t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) / L2));
        return (mm[3] === 'Arm' ? 0 : 1) + t;
      };
      // texture pixels, to know each zone's average brightness (the recolour keeps relative shading)
      var px = null, W = 128, Hh = 128;
      try {
        var cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
        var cx2 = cv.getContext('2d'); cx2.drawImage(mt.map.image, 0, 0, W, Hh); px = cx2.getImageData(0, 0, W, Hh).data;
      } catch (e) { px = null; }
      var sum = [0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0];
      for (var i = 0; i < n; i++) {
        var best = 0, bw = -1;
        for (var k = 0; k < 4; k++) { var w = sw.array[i * 4 + k]; if (w > bw) { bw = w; best = si.array[i * 4 + k]; } }
        var z = zoneOf(names[best] || '');
        // a shirt is all shirt, down to its hem (the hip bones move the hem, but it is not the shorts)
        if (z === 2 && isShirt) z = 1;
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        kit[i * 3] = z; kit[i * 3 + 1] = (v.x - cx) / H; kit[i * 3 + 2] = (v.y - box.min.y) / H;
        arm[i] = z === 1 ? armAt(names[best] || '', v) : -1;
        if (px && uv && z) {
          var u = uv.getX(i), w2 = uv.getY(i);
          u -= Math.floor(u); w2 -= Math.floor(w2);
          var o = (Math.min(Hh - 1, Math.floor(w2 * Hh)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
          var r = Math.pow(px[o] / 255, 2.2), g = Math.pow(px[o + 1] / 255, 2.2), b = Math.pow(px[o + 2] / 255, 2.2);
          if (z === 1 && /elvis/i.test(m.name) && isSkin(px[o] / 255, px[o + 1] / 255, px[o + 2] / 255)) continue;
          sum[z] += 0.2126 * r + 0.7152 * g + 0.0722 * b; cnt[z]++;
        }
      }
      geo.setAttribute('aKit', new T.Float32BufferAttribute(kit, 3));
      geo.setAttribute('aArm', new T.Float32BufferAttribute(arm, 1));
      // model units per metre (the kit is let out or taken in by a few centimetres)
      var ws = new T.Vector3(); m.getWorldScale(ws);
      m.userData.unit = (H / HEIGHT) / (ws.x || 1);
      // a separate shirt (a body under it) is cut short; a one-piece model is painted skin instead
      m.userData.sleeveCut = /shirt|tops/i.test(m.name) ? 1 : 0;
      var lum = [1, 1, 1, 1, 1].map(function (d, z) { return cnt[z] ? Math.max(0.02, sum[z] / cnt[z]) : 0.2; });
      m.userData.kitLum = [lum[1], lum[2], lum[3], lum[4]];
      m.userData.kitable = true;
      m.userData.keepSkin = 0;
    });
  }
  /* head size and where the eyes are, from the vertices the head bone moves (T-pose, model units):
     skull (face and scalp), all (with the hair), eyes (eyeballs / lashes, if the model has them) */
  function measureHead(root) {
    var skull = new T.Box3(), all = new T.Box3(), eyes = new T.Box3(), v = new T.Vector3(), pts = [];
    root.traverse(function (m) {
      if (!m.isSkinnedMesh) return;
      var names = m.skeleton.bones.map(function (b) { return b.name; }), geo = m.geometry, pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
      if (!si || !sw) return;
      var isHair = /hair/i.test(m.name), isEye = /eye|lash/i.test(m.name), skip = /brow|mouth|hood|shirt|scarf|teeth|tongue/i.test(m.name);
      for (var i = 0; i < pos.count; i++) {
        var best = 0, bw = -1;
        for (var k = 0; k < 4; k++) { var w = sw.array[i * 4 + k]; if (w > bw) { bw = w; best = si.array[i * 4 + k]; } }
        if (!/Head|Eye/.test(names[best] || '')) continue;
        if (skip) continue;
        // where the vertex really is with the model's own pose (its bones need not sit at the bind pose)
        if (m.boneTransform) m.boneTransform(i, v); else v.fromBufferAttribute(pos, i);
        v.applyMatrix4(m.matrixWorld);
        all.expandByPoint(v);
        if (isEye) eyes.expandByPoint(v);
        else if (!isHair) { skull.expandByPoint(v); pts.push(v.x, v.y, v.z); }
      }
    });
    // the front of the face at eye height (the bridge of the nose), where glasses rest
    var h = skull.max.y - skull.min.y, cx = (skull.min.x + skull.max.x) / 2, hw = (skull.max.x - skull.min.x) / 2;
    var ey = eyes.isEmpty() ? skull.min.y + h * 0.5 : (eyes.min.y + eyes.max.y) / 2, front = -Infinity;
    for (var j = 0; j < pts.length; j += 3) {
      if (pts[j + 1] > ey - h * 0.03 && pts[j + 1] < ey + h * 0.06 && Math.abs(pts[j] - cx) < hw * 0.3) front = Math.max(front, pts[j + 2]);
    }
    return { skull: skull, all: all, eyes: eyes.isEmpty() ? null : eyes, front: isFinite(front) ? front : null };
  }
  // Taquilla gear (AMGear) on the head bone: a hat on top of the hair, glasses / moustache on the eyes
  var HEADFIX = { ty: { eyeY: 0.55, stY: 0.1, stS: 0.6 }, granny: { stY: 0.3, stS: 0.8 }, vegas: { hatS: 1.3, hatY: -0.12, hatZ: 0.12 } };
  function dress(id, kit, g, s, off, attach) {
    var G = window.AMGear, hd = tpl[id] && tpl[id].head;
    if (!G || !hd || hd.skull.isEmpty() || (!kit.hat && !kit.face)) return;
    var toG = function (p) { return p.clone().multiplyScalar(s).add(off); };
    var sk0 = toG(hd.skull.min), sk1 = toG(hd.skull.max), a0 = toG(hd.all.min), a1 = toG(hd.all.max);
    var R = Math.max((sk1.x - sk0.x) / 2, (a1.x - a0.x) / 2 * 0.9), fx = HEADFIX[id] || {};
    var zs = Math.max(0.95, Math.min(1.3, (a1.z - a0.z) / 2 / R));
    var h = kit.hat && kit.hat !== 'none' && G.hat(kit.hat, kit.hatColor);
    if (h) {
      if (kit.hat === 'band' || kit.hat === 'phones') fx = {};
      var hs = R * (fx.hatS || 1);
      h.scale.set(hs, hs, hs * zs);
      h.position.set((sk0.x + sk1.x) / 2, a1.y - R * 0.88 + R * (fx.hatY || 0), (a0.z + a1.z) / 2 + R * (fx.hatZ || 0));
      attach(h);
    }
    fx = HEADFIX[id] || {};
    var f = kit.face && kit.face !== 'none' && G.face(kit.face);
    if (f) {
      var ey, ez, ex = (sk0.x + sk1.x) / 2;
      if (hd.eyes) { var e0 = toG(hd.eyes.min), e1 = toG(hd.eyes.max); ey = (e0.y + e1.y) / 2; ez = e1.z; }
      else { ey = sk0.y + (sk1.y - sk0.y) * (fx.eyeY || 0.5); ez = sk1.z; }
      if (hd.front != null) ez = Math.max(ez, hd.front * s + off.z - R * 0.12);
      var fs = (sk1.x - sk0.x) / 2 * 0.9, st = kit.face === 'stache';
      f.scale.setScalar(fs * (st && fx.stS || 1));
      f.position.set(ex, ey + (st && fx.stY || 0) * fs, ez + R * 0.04 - R * (fx.fz || 0));
      attach(f);
    }
  }
  var PAT = { solid: 0, stripes: 1, pin: 2, hoops: 3, halves: 4, centre: 5, sash: 6, diag: 7, band: 8 };
  function col(c, fb) {
    if (c == null) return new T.Color(fb);
    return (c.isColor ? c.clone() : new T.Color(c)).convertSRGBToLinear();
  }
  function kitMaterial(base, kit, lum, keepSkin, fit, unit, sleeveCut, skin) {
    var m = base.clone();
    var U = {
      uKitA: { value: col(kit.primary, '#ffffff') }, uKitB: { value: col(kit.secondary, '#141B2D') },
      uShorts: { value: col(kit.shorts, '#141B2D') }, uSocks: { value: col(kit.socks, '#ffffff') }, uShoes: { value: col(kit.shoe, '#F2F5FA') },
      uPat: { value: PAT[kit.pattern] || 0 }, uLum: { value: lum }, uKeepSkin: { value: keepSkin || 0 },
      uPaint: { value: kit.none ? 0 : 1 }, uInflate: { value: (fit && fit.inflate || 0) * (unit || 1) },
      uSleeve: { value: fit && fit.sleeve === 'long' ? 0 : (sleeveCut ? 1 : 2) }, uSkin: { value: col(skin, '#E8B896') }
    };
    m.onBeforeCompile = function (sh) {
      Object.keys(U).forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aKit;\nattribute float aArm;\nvarying vec4 vZone;\nvarying vec2 vKitP;\nvarying float vArm;\nuniform float uInflate;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvArm = aArm;\ntransformed += objectNormal * uInflate * (step(0.5, aKit.x) * step(aKit.x, 2.5));\nvZone = vec4(step(0.5, aKit.x) * step(aKit.x, 1.5), step(1.5, aKit.x) * step(aKit.x, 2.5), step(2.5, aKit.x) * step(aKit.x, 3.5), step(3.5, aKit.x));\nvKitP = aKit.yz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', ['#include <common>', 'varying vec4 vZone;', 'varying vec2 vKitP;',
          'uniform vec3 uKitA; uniform vec3 uKitB; uniform vec3 uShorts; uniform vec3 uSocks; uniform vec3 uShoes;',
          'uniform float uPat; uniform vec4 uLum; uniform float uKeepSkin; uniform float uPaint; uniform float uSleeve; uniform vec3 uSkin;', 'varying float vArm;',
          'float kitPattern(vec2 p) {',
          '  if (uPat < 0.5) return 0.0;',
          '  if (uPat < 1.5) return step(0.5, fract(p.x * 14.0 + 0.25));',
          '  if (uPat < 2.5) return step(0.82, fract(p.x * 20.0));',
          '  if (uPat < 3.5) return step(0.5, fract(p.y * 14.0));',
          '  if (uPat < 4.5) return step(0.0, p.x);',
          '  if (uPat < 5.5) return step(abs(p.x), 0.045);',
          '  if (uPat < 6.5) return step(abs(p.x + (p.y - 0.62) * 0.9), 0.05);',
          '  if (uPat < 7.5) return step(0.0, p.x + (p.y - 0.62));',
          '  return step(abs(p.y - 0.66), 0.03);',
          '}'].join('\n'))
        .replace('#include <map_fragment>', ['#include <map_fragment>',
          // short sleeves end halfway down the upper arm
          'float bare = step(0.5, uSleeve) * step(0.55, vArm) * step(vArm, 1.98);',
          'if (bare > 0.5 && uSleeve < 1.5) discard;',
          '{',
          '  vec3 c = diffuseColor.rgb, sc = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));',
          '  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));',
          '  float skin = uKeepSkin * step(0.2, sc.r) * step(sc.g, sc.r * 0.95) * step(sc.r * 0.45, sc.g) * step(sc.r * 0.25, sc.b) * step(sc.b, sc.g);',
          '  vec3 shirt = mix(uKitA, uKitB, kitPattern(vKitP));',
          '  float zl = dot(vZone, uLum) + 0.0001;',
          '  vec3 kitC = shirt * vZone.x + uShorts * vZone.y + uSocks * vZone.z + uShoes * vZone.w;',
          '  float w = clamp(vZone.x * (1.0 - skin) + vZone.y + vZone.z + vZone.w, 0.0, 1.0);',
          '  vec3 painted = kitC * clamp(lum / zl, 0.35, 1.6);',
          '  diffuseColor.rgb = mix(c, painted, w * uPaint);',
          '  if (bare > 0.5) diffuseColor.rgb = uSkin * clamp(lum / max(zl, 0.0001), 0.55, 1.25);',
          '}'].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'amkit2'; };
    return m;
  }
  // the outfit equipped in Taquilla for a sport (null if none saved yet)
  function outfit(sport) {
    try { var o = JSON.parse(localStorage.getItem('arenamix.outfit.v1') || 'null'); return o && o[sport || 'futbol'] || null; } catch (e) { return null; }
  }

  var BONES = {
    hips: 'mixamorigHips', neck: 'mixamorigNeck',
    lUp: 'mixamorigLeftUpLeg', lLeg: 'mixamorigLeftLeg', rUp: 'mixamorigRightUpLeg', rLeg: 'mixamorigRightLeg',
    lArm: 'mixamorigLeftArm', lFore: 'mixamorigLeftForeArm', rArm: 'mixamorigRightArm', rFore: 'mixamorigRightForeArm'
  };

  // how far back the torso goes at chest height (in the character's own space, at rest), measured once per model
  var backCache = {};
  function backOf(id, model, at) {
    if (backCache[id] !== undefined) return backCache[id];
    var v = new T.Vector3(), minZ = Infinity;
    model.updateMatrixWorld(true);
    model.traverse(function (m) {
      if (!m.isSkinnedMesh || !m.userData.kitable) return;
      var pos = m.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 6000));
      for (var i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        if (m.boneTransform) m.boneTransform(i, v);
        v.applyMatrix4(m.matrixWorld);
        if (Math.abs(v.y - at.y) < 0.09 && Math.abs(v.x - at.x) < 0.1 && v.z < minZ) minZ = v.z;
      }
    });
    backCache[id] = isFinite(minZ) ? minZ : null;
    return backCache[id];
  }
  var texCache = {};
  function backTex(num, name, col) {
    var k = num + '|' + name + '|' + col;
    if (texCache[k]) return texCache[k];
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    var c = cv.getContext('2d');
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    if (name) {
      var nm = name.toUpperCase().slice(0, 12), fs = Math.min(46, 330 / Math.max(5, nm.length));
      c.font = '800 ' + fs + 'px "Barlow Condensed", Arial'; c.lineWidth = 7; c.strokeStyle = 'rgba(5,5,10,.75)';
      c.strokeText(nm, 128, 40); c.fillStyle = col; c.fillText(nm, 128, 40);
    }
    c.font = '800 168px "Barlow Condensed", Arial'; c.lineWidth = 12; c.strokeStyle = 'rgba(5,5,10,.8)';
    c.strokeText(num, 128, name ? 152 : 132); c.fillStyle = col; c.fillText(num, 128, name ? 152 : 132);
    var t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 4;
    texCache[k] = t;
    return t;
  }
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
    // everyone the same height: the neck at the same height (hair and big heads don't shrink the body)
    var s = NECK_H / t.neck;
    holder.scale.setScalar(s);
    holder.position.set(-(t.box.min.x + t.box.max.x) / 2 * s, -t.box.min.y * s, -(t.box.min.z + t.box.max.z) / 2 * s);
    holder.add(model); g.add(holder);
    // dress the character: an explicit kit, your Taquilla outfit, or the team colours the game passes
    var kit = o.kit || (o.you && !o.noOutfit ? outfit(o.sport) : null);
    if (!kit && o.shirt != null) kit = { primary: o.shirt, secondary: o.trimCss, pattern: 'solid', shorts: o.shorts, socks: o.socks, shoe: o.boot };

    // sleeves and size: yours from Taquilla, everyone else in short sleeves and their own size
    var fit = o.fit || ((o.you || o.gear) ? fitPref() : FIT_DEF), fz = SIZES[fit.size] != null ? SIZES[fit.size] : 0;
    var fk = { sleeve: fit.sleeve, inflate: fz }, short = fit.sleeve !== 'long';
    model.traverse(function (m) {
      if (m.isSkinnedMesh && m.userData.kitable) m.material = kitMaterial(m.material, kit || { none: 1 }, new T.Vector4().fromArray(m.userData.kitLum), m.userData.keepSkin, fk, m.userData.unit, m.userData.sleeveCut, SKIN[id]);
      if (m.userData.bareArms) m.visible = short;
    });
    var bk = BUILD[id] || [1, 1]; if (window.__amMusK != null) bk = [bk[0] * window.__amMusK, bk[1] * window.__amMusK];
    model.traverse(function (m) {
      if (!m.isSkinnedMesh || !m.geometry.attributes.aMus || !m.userData.musUnit) return;
      // clothes a touch more than skin, so a bulge of skin never shows through them
      var ku = m.userData.musUnit * (m.userData.kitable ? 1.18 : 1);
      m.material = Array.isArray(m.material) ? m.material.map(function (x) { return muscleMat(x, ku, bk); }) : muscleMat(m.material, ku, bk);
    });
    var gear = [], sig = SIGNATURE[id];
    // a character's own accessories (Vegas's shades, Granny's cap and glasses) unless the Taquilla gives others
    if (sig && !o.noGear) {
      var k2 = Object.assign({}, kit || { none: 1 });
      if (!k2.hat || k2.hat === 'none') { k2.hat = sig.hat || 'none'; k2.hatColor = sig.hatColor || ''; }
      if (!k2.face || k2.face === 'none') k2.face = sig.face || 'none';
      dress(id, k2, g, s, holder.position, function (obj) { gear.push(obj); });
    }
    // the accessories only go on your own character, not on teammates who share the kit
    if (!sig && kit && (o.you || o.gear) && !o.noGear) dress(id, kit, g, s, holder.position, function (obj) { gear.push(obj); });
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
    // gear placed in g's space at the rest pose rides on the head bone
    var headBone = by['mixamorigHead'] || by[BONES.neck];
    if (headBone) gear.forEach(function (obj) {
      var r = info.get(headBone), a = new T.Group(), q = r.wq.clone().invert();
      a.quaternion.copy(q); a.scale.setScalar(1 / r.ws);
      a.position.copy(r.wp).negate().applyQuaternion(q).multiplyScalar(1 / r.ws);
      a.add(obj); headBone.add(a);
    });
    // the shirt number (and your name) printed on the back: a patch riding on the chest bone
    var chest = by['mixamorigSpine2'] || by['mixamorigSpine1'];
    if (o.number && chest && !o.noNumber) {
      var rc = info.get(chest), bz = backOf(id, model, rc.wp);
      if (bz != null) {
        var tex = backTex(String(o.number), o.backName || '', o.numCol || (typeof o.trimCss === 'string' ? o.trimCss : '#F4F4FA'));
        var plate = new T.Mesh(new T.PlaneGeometry(0.3, 0.3), new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        plate.position.set(rc.wp.x, rc.wp.y - 0.03, bz - 0.012); plate.rotation.y = Math.PI; plate.renderOrder = 2;
        var pa = new T.Group(), pq = rc.wq.clone().invert();
        pa.quaternion.copy(pq); pa.scale.setScalar(1 / rc.ws);
        pa.position.copy(rc.wp).negate().applyQuaternion(pq).multiplyScalar(1 / rc.ws);
        pa.add(plate); chest.add(pa);
      }
    }
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
    // and the same build: the torso as wide as everyone else's (a finishing touch on top of the pose)
    if (t.wx && Math.abs(t.wx - 1) > 0.01) { holder.scale.x *= t.wx; holder.scale.z *= t.wx; holder.position.x *= t.wx; holder.position.z *= t.wx; }
    g.userData = { body: body, legs: legs, arms: arms, head: head, mixamo: id, apply: apply, anim: anim };
    apply();
    return g;
  }

  window.AMChars = { fitPref: fitPref, setFit: setFit, sizes: Object.keys(SIZES), list: LIST, pref: pref, setPref: setPref, load: load, ready: ready, onReady: onReady, make: make, clip: clipInfo, outfit: outfit };
})();
