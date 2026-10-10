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
          prepKit(root, box);
          tpl[c.id] = { root: root, box: box, head: measureHead(root) };
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
      var n = pos.count, kit = new Float32Array(n * 3), names = m.skeleton.bones.map(function (b) { return b.name; });
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
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        kit[i * 3] = z; kit[i * 3 + 1] = (v.x - cx) / H; kit[i * 3 + 2] = (v.y - box.min.y) / H;
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
      var lum = [1, 1, 1, 1, 1].map(function (d, z) { return cnt[z] ? Math.max(0.02, sum[z] / cnt[z]) : 0.2; });
      m.userData.kitLum = [lum[1], lum[2], lum[3], lum[4]];
      m.userData.kitable = true;
      m.userData.keepSkin = /elvis/i.test(m.name) ? 1 : 0;
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
      f.position.set(ex, ey + (st && fx.stY || 0) * fs, ez + R * 0.04);
      attach(f);
    }
  }
  var PAT = { solid: 0, stripes: 1, pin: 2, hoops: 3, halves: 4, centre: 5, sash: 6, diag: 7, band: 8 };
  function col(c, fb) {
    if (c == null) return new T.Color(fb);
    return (c.isColor ? c.clone() : new T.Color(c)).convertSRGBToLinear();
  }
  function kitMaterial(base, kit, lum, keepSkin) {
    var m = base.clone();
    var U = {
      uKitA: { value: col(kit.primary, '#ffffff') }, uKitB: { value: col(kit.secondary, '#141B2D') },
      uShorts: { value: col(kit.shorts, '#141B2D') }, uSocks: { value: col(kit.socks, '#ffffff') }, uShoes: { value: col(kit.shoe, '#F2F5FA') },
      uPat: { value: PAT[kit.pattern] || 0 }, uLum: { value: lum }, uKeepSkin: { value: keepSkin || 0 }
    };
    m.onBeforeCompile = function (sh) {
      Object.keys(U).forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aKit;\nvarying vec4 vZone;\nvarying vec2 vKitP;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZone = vec4(step(0.5, aKit.x) * step(aKit.x, 1.5), step(1.5, aKit.x) * step(aKit.x, 2.5), step(2.5, aKit.x) * step(aKit.x, 3.5), step(3.5, aKit.x));\nvKitP = aKit.yz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', ['#include <common>', 'varying vec4 vZone;', 'varying vec2 vKitP;',
          'uniform vec3 uKitA; uniform vec3 uKitB; uniform vec3 uShorts; uniform vec3 uSocks; uniform vec3 uShoes;',
          'uniform float uPat; uniform vec4 uLum; uniform float uKeepSkin;',
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
          '{',
          '  vec3 c = diffuseColor.rgb, sc = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));',
          '  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));',
          '  float skin = uKeepSkin * step(0.2, sc.r) * step(sc.g, sc.r * 0.95) * step(sc.r * 0.45, sc.g) * step(sc.r * 0.25, sc.b) * step(sc.b, sc.g);',
          '  vec3 shirt = mix(uKitA, uKitB, kitPattern(vKitP));',
          '  float zl = dot(vZone, uLum) + 0.0001;',
          '  vec3 kitC = shirt * vZone.x + uShorts * vZone.y + uSocks * vZone.z + uShoes * vZone.w;',
          '  float w = clamp(vZone.x * (1.0 - skin) + vZone.y + vZone.z + vZone.w, 0.0, 1.0);',
          '  vec3 painted = kitC * clamp(lum / zl, 0.35, 1.6);',
          '  diffuseColor.rgb = mix(c, painted, w);',
          '}'].join('\n'));
    };
    m.customProgramCacheKey = function () { return 'amkit1'; };
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
    var size = t.box.getSize(new T.Vector3()), s = HEIGHT / size.y;
    holder.scale.setScalar(s);
    holder.position.set(-(t.box.min.x + t.box.max.x) / 2 * s, -t.box.min.y * s, -(t.box.min.z + t.box.max.z) / 2 * s);
    holder.add(model); g.add(holder);
    // dress the character: an explicit kit, your Taquilla outfit, or the team colours the game passes
    var kit = o.kit || (o.you && !o.noOutfit ? outfit(o.sport) : null);
    if (!kit && o.shirt != null) kit = { primary: o.shirt, secondary: o.trimCss, pattern: 'solid', shorts: o.shorts, socks: o.socks, shoe: o.boot };
    if (kit) model.traverse(function (m) { if (m.isSkinnedMesh && m.userData.kitable) m.material = kitMaterial(m.material, kit, new T.Vector4().fromArray(m.userData.kitLum), m.userData.keepSkin); });
    var gear = [];
    // the accessories only go on your own character, not on teammates who share the kit
    if (kit && (o.you || o.gear) && !o.noGear) dress(id, kit, g, s, holder.position, function (obj) { gear.push(obj); });
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
    g.userData = { body: body, legs: legs, arms: arms, head: head, mixamo: id, apply: apply, anim: anim };
    apply();
    return g;
  }

  window.AMChars = { list: LIST, pref: pref, setPref: setPref, load: load, ready: ready, onReady: onReady, make: make, clip: clipInfo, outfit: outfit };
})();
