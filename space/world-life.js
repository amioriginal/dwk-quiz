/* world-life.js — 우주 광장 「살아 있는 광장 + 그래픽·손맛」 확장 (2026-11-19)
   대표 「좋은데 전체적으로 더 디벨롭」 · 가장 아쉬운 점 「광장이 비어 보임」.
   들어 있는 것: ① NPC 주민 4명(걷고 서고 말하고, 누르면 대화창) ② 한국 시각에 맞춘 낮·노을·밤 + 15분마다 1분 유성우
                 ③ 별똥별 조각 줍기(+2 코인 · 10분에 5개까지) ④ 손댄 뒤에만 켜지는 생성형 배경음·발걸음 소리
                 ⑤ 바닥 타일·풀·꽃·먼지·섬 아래 빛 띠·원경 행성 띠·반딧불 · 시설 들어갈 때 잉크 원 와이프
   약속: world.js 끝의 EXT 만 쓴다(world.js 는 고치지 않는다). three 는 EXT.THREE(같은 인스턴스여야 함).
   선: NPC 는 이름표에 「NPC」라고 쓰고 접속자 수(EXT.peers)에 넣지 않는다 · 가짜 마감·가짜 숫자 없음
       · 그래픽 화면 1개(새 WebGLRenderer 금지) · 많이 찍는 것은 인스턴싱(풀·꽃·먼지·소행성 = 각 1번 그리기)
   시험용: window.__life (시각 고정·유성우·조각 떨어뜨리기) */
export function install(EXT) {
  const { THREE, DC, scene, world, camera, renderer, sun, player, COL, polar, el } = EXT;
  const DP = EXT.DP || window.DP;
  const V3 = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const reduce = EXT.reduce, canvas = renderer.domElement, D = EXT.D;
  const life = Object.assign({ picks: [], snd: true }, DC.store.get('life', {}) || {}); // localStorage dwk_life
  const saveLife = () => DC.store.set('life', life);
  const FORCE = { h: null, shower: null }; // 시험용 고정값(window.__life)

  // ───────── 옷(world.css 토큰을 그대로 쓴다) ─────────
  document.head.append(el('style', {}, `
body.world .tag.npc .nm{display:inline-flex;align-items:center;gap:5px;background:var(--paper);color:var(--ink);outline:2px solid var(--ink);box-shadow:0 3px 0 var(--ink)}
body.world .tag.npc .nm i{font:700 9px/1 var(--pix);font-style:normal;background:var(--sky);border:1.5px solid var(--ink);border-radius:3px;padding:2px 3px 1px}
body.world .lf-talk{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:start;text-align:left;margin:2px 0 4px}
body.world .lf-face{width:72px;height:72px;border:2.5px solid var(--ink);border-radius:12px;display:grid;place-items:center;box-shadow:0 3px 0 var(--ink)}
body.world .lf-face svg{width:60px;height:60px}
body.world .lf-who{font:700 11px/1 var(--pix);color:var(--mute);display:flex;gap:6px;align-items:center}
body.world .lf-who i{font-style:normal;background:var(--ink);color:var(--paper);padding:3px 4px 2px;border-radius:3px}
body.world .lf-say{margin:8px 0 0;font-size:15.5px;font-weight:700;line-height:1.5;min-height:4.6em;word-break:keep-all;color:var(--ink)}
body.world .lf-say.done::after{content:'';display:inline-block;width:0;height:0;margin-left:6px;border:5px solid transparent;border-top:7px solid var(--ink);vertical-align:-2px;animation:lfBlink .7s steps(2) infinite}
@keyframes lfBlink{50%{opacity:0}}
body.world .lf-acts[hidden],body.world .lf-next[hidden]{display:none!important}
body.world .lf-pop{position:fixed;left:0;top:0;z-index:8;pointer-events:none;font:700 16px/1 var(--pix);color:var(--ink);background:var(--sun);border:2.5px solid var(--ink);border-radius:8px;box-shadow:0 3px 0 var(--ink);padding:6px 8px 5px;white-space:nowrap;animation:lfPop 1.15s steps(12) forwards}
@keyframes lfPop{0%{transform:translate(-50%,-60%) scale(.5)}18%{transform:translate(-50%,-115%) scale(1.15)}30%{transform:translate(-50%,-125%) scale(1)}100%{transform:translate(-50%,-260%) scale(1);opacity:0}}
body.world .lf-wipe-cover{position:fixed;inset:0;z-index:40;pointer-events:all;background:transparent}
body.world .lf-wipe-label{position:fixed;inset:0;z-index:41;display:grid;place-items:center;font:700 15px/1.4 var(--pix);color:var(--paper);pointer-events:none;animation:lfIn .2s steps(3) both}
body.world .lf-wipe-label b{background:var(--ink);border:2.5px solid var(--paper);border-radius:10px;padding:10px 14px 9px}
@keyframes lfIn{from{opacity:0}}
body.world #bgmBtn.off .ic{opacity:.4}
body.world #bgmBtn.off::before{content:'';position:absolute;left:12px;right:12px;top:50%;height:3px;background:var(--rose);border:1.5px solid var(--ink);transform:rotate(-35deg);transform-origin:center}
@media (max-height:520px) and (orientation:landscape){`));

  // ───────── 공용 그림 ─────────
  const tex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } t.anisotropy = 4; return t; };
  const glowTex = tex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const onPave = (x, z) => { const r = Math.hypot(x, z), a = Math.atan2(x, z); if (r < 5.5 || (r > 8.95 && r < 10.65)) return true; if (Math.abs(x) < 2.2 && z < -9 && z > -20) return true; /* 북쪽 큰길(탑승 대기장으로 · 2026-11-27) */ if (r > 4.6 && r < 10.2) for (const s of [0, 0.62, -0.62, 2.2, -2.2, Math.PI]) { const d = Math.atan2(Math.sin(a - s), Math.cos(a - s)); if (Math.abs(d) < 1.6 && Math.abs(Math.sin(d) * r) < 1.05 && Math.cos(d) > 0) return true; } return false; };
  const blocked = (x, z, pad = 0.3) => COL.some(c => Math.hypot(x - c.x, z - c.z) < c.r + pad);

  // ═════════ 1. 바닥·풀·꽃(그래픽 손맛) ═════════
  // 돌바닥: 가운데 원은 동심원 모자이크 한 장, 둥근 길은 길 따라 휘는 벽돌(UV를 각도·반지름으로 다시 매김), 갈래 길은 같은 벽돌
  const brick = (x, w, h, rows, cols) => {
    x.fillStyle = '#d9c9a8'; x.fillRect(0, 0, w, h); const bh = h / rows, bw = w / cols;
    for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
      const ox = (r % 2) * bw / 2, k = hash(r * 31 + c * 7), sx = c * bw + ox + 2, sy = r * bh + 2;
      x.fillStyle = `hsl(${38 + k * 8},${38 + k * 14}%,${84 + k * 7}%)`; x.beginPath(); x.roundRect(sx, sy, bw - 4, bh - 4, 4); x.fill();
      x.fillStyle = 'rgba(120,96,60,.08)'; for (let i = 0; i < 4; i++) x.fillRect(sx + hash(r * 9 + c * 3 + i) * (bw - 8), sy + hash(c * 5 + r * 11 + i) * (bh - 8), 2, 2);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(sx + 3, sy + 2, bw - 12, 2);
    }
  };
  const brickT = tex(256, 128, (x, w, h) => brick(x, w, h, 2, 2), true);
  world.children.forEach(o => {
    const g = o.geometry, p = g?.parameters; if (!o.isMesh || !p) return;
    if (g.type === 'CircleGeometry' && p.radius === 5.2) {
      o.material = new THREE.MeshStandardMaterial({ roughness: 0.95, map: tex(1024, 1024, (x, w) => {
        const c = w / 2, R = w / 2; x.fillStyle = '#d9c9a8'; x.fillRect(0, 0, w, w);
        for (let ring = 0; ring < 9; ring++) { const r0 = R * (0.18 + ring * 0.092), r1 = r0 + R * 0.088, n = Math.round(8 + ring * 7);
          for (let i = 0; i < n; i++) { const a0 = i / n * 6.283 + ring * 0.3, a1 = (i + 1) / n * 6.283 + ring * 0.3 - 0.035, k = hash(ring * 40 + i);
            x.fillStyle = ring % 3 === 1 ? `hsl(${30 + k * 10},${46 + k * 10}%,${78 + k * 6}%)` : `hsl(${40 + k * 8},${36 + k * 12}%,${85 + k * 6}%)`;
            x.beginPath(); x.arc(c, c, r1 - 3, a0, a1); x.arc(c, c, r0 + 3, a1, a0, true); x.closePath(); x.fill(); } }
        x.fillStyle = '#efe3c8'; x.beginPath(); x.arc(c, c, R * 0.17, 0, 6.283); x.fill(); // 분수 받침 밑(가려짐)
      }) }); o.material.map.anisotropy = 8;
    } else if (g.type === 'RingGeometry' && p.innerRadius === 9.2) {
      const uv = g.attributes.uv, pos = g.attributes.position, N = 64;
      for (let i = 0; i < uv.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let a = Math.atan2(z, x); if (a < 0) a += 6.283; if (i % (p.thetaSegments + 1) === p.thetaSegments) a = 6.283; uv.setXY(i, a / 6.283 * N, (Math.hypot(x, z) - 9.2) / 1.2); }
      uv.needsUpdate = true; const t = brickT.clone(); t.needsUpdate = true; t.repeat.set(1, 1); o.material = new THREE.MeshStandardMaterial({ roughness: 0.95, map: t });
    } else if (g.type === 'PlaneGeometry' && p.width === 1.7 && p.height === 5.2) {
      const t = brickT.clone(); t.needsUpdate = true; t.repeat.set(1, 5.2 / 1.7 * 1.0); o.material = new THREE.MeshStandardMaterial({ roughness: 0.95, map: t });
    } else if (g.type === 'CylinderGeometry' && p.radiusTop === 16) {
      // 섬 잔디: 얼룩덜룩한 초록(한 장을 8번 반복 · 이음매 없게 둘러 그린다)
      o.material = new THREE.MeshStandardMaterial({ roughness: 1, map: tex(512, 512, (x, w) => {
        x.fillStyle = '#86c76f'; x.fillRect(0, 0, w, w);
        for (let i = 0; i < 90; i++) { const cx = hash(i) * w, cy = hash(i + 99) * w, r = 20 + hash(i + 7) * 60, k = hash(i + 3); x.fillStyle = k < 0.5 ? `rgba(110,180,90,${0.25 + k * 0.3})` : `rgba(160,214,120,${0.15 + (k - 0.5) * 0.4})`;
          for (const dx of [-w, 0, w]) for (const dy of [-w, 0, w]) { x.beginPath(); x.ellipse(cx + dx, cy + dy, r, r * 0.7, k * 3, 0, 6.283); x.fill(); } }
        x.strokeStyle = 'rgba(70,130,60,.35)'; x.lineWidth = 2; for (let i = 0; i < 260; i++) { const cx = hash(i + 500) * w, cy = hash(i + 900) * w; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + 2, cy - 7); x.stroke(); }
      }, true) }); o.material.map.repeat.set(8, 8);
    }
  });

  // 풀포기·꽃 무더기 — 각각 InstancedMesh 1개(그리기 1번). 바람에 살랑(정점 셰이더)
  const wind = { value: 0 };
  const sway = (m, amt) => { m.onBeforeCompile = (s) => { s.uniforms.uWind = wind; s.vertexShader = 'uniform float uWind;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.5;
  float k = max(position.y, 0.0) * ${amt.toFixed(2)};
  transformed.x += sin(uWind * 1.6 + ph) * k; transformed.z += cos(uWind * 1.2 + ph) * k * 0.6;
#endif`); }; };
  const bladeGeo = (() => { const p = [], c = []; for (let b = 0; b < 5; b++) { const a = b / 5 * 3.14 + hash(b) * 0.4, lean = 0.05 + hash(b + 9) * 0.06, h = 0.22 + hash(b + 3) * 0.16, w = 0.035, ox = Math.cos(a) * 0.05, oz = Math.sin(a) * 0.05;
    const tx = Math.cos(a + 1.57) * w, tz = Math.sin(a + 1.57) * w; p.push(ox - tx, 0, oz - tz, ox + tx, 0, oz + tz, ox + Math.cos(a) * lean, h, oz + Math.sin(a) * lean); c.push(0.45, 0.62, 0.36, 0.45, 0.62, 0.36, 0.86, 1, 0.7); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.computeVertexNormals(); return g; })();
  const grassM = new THREE.MeshStandardMaterial({ color: 0x7fc56a, vertexColors: true, side: THREE.DoubleSide, roughness: 1 }); sway(grassM, 0.22);
  const spots = []; for (let i = 0; spots.length < 340 && i < 4000; i++) { const r = Math.sqrt(rnd(4.5 * 4.5, 14.7 * 14.7)), a = Math.random() * 6.283; const [x, z] = polar(r, a); if (onPave(x, z) || blocked(x, z, 0.35)) continue; spots.push([x, z]); }
  const grass = new THREE.InstancedMesh(bladeGeo, grassM, spots.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), pv = new V3(), col = new THREE.Color();
  spots.forEach(([x, z], i) => { q.setFromAxisAngle(new V3(0, 1, 0), Math.random() * 6.283); const s = rnd(0.8, 1.5); m4.compose(pv.set(x, 0, z), q, sc.set(s, s * rnd(0.8, 1.3), s)); grass.setMatrixAt(i, m4); grass.setColorAt(i, col.setHSL(0.27 + rnd(-0.03, 0.04), 0.45, rnd(0.42, 0.56))); });
  grass.receiveShadow = true; world.add(grass);
  const PETAL = [0xfff4dc, 0xff6f91, 0xffcf3a, 0x7fd8ff, 0xb59cff, 0xffffff]; const heads = [];
  for (let c = 0; heads.length < 170 && c < 400; c++) { const r = rnd(5.8, 14.2), a = Math.random() * 6.283; const [cx, cz] = polar(r, a); if (onPave(cx, cz) || blocked(cx, cz, 0.6)) continue; const pc = pick(PETAL), n = 4 + Math.floor(Math.random() * 5);
    for (let k = 0; k < n; k++) { const x = cx + rnd(-0.32, 0.32), z = cz + rnd(-0.32, 0.32); if (onPave(x, z)) continue; heads.push([x, z, Math.random() < 0.8 ? pc : pick(PETAL)]); } }
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.065, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), heads.length);
  const stems = new THREE.InstancedMesh(bladeGeo, grassM, heads.length);
  heads.forEach(([x, z, c], i) => { const h = rnd(0.2, 0.32); m4.compose(pv.set(x, h, z), q.setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 3), 0)), sc.set(1, 0.75, 1)); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, col.set(c));
    m4.compose(pv.set(x, 0, z), q.setFromAxisAngle(new V3(0, 1, 0), rnd(0, 6.28)), sc.set(0.55, h / 0.3, 0.55)); stems.setMatrixAt(i, m4); stems.setColorAt(i, col.setHSL(0.28, 0.4, 0.45)); });
  flowers.castShadow = false; world.add(flowers, stems);

  // 발밑 먼지 — 작은 덩어리 48개를 인스턴스 1개로 돌려 쓴다
  const DUST_N = 48; const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 1, flatShading: true, transparent: true, opacity: 0.9 }), DUST_N);
  dust.frustumCulled = false; dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage); const dp = Array.from({ length: DUST_N }, () => ({ life: 0, max: 1, p: new V3(), v: new V3(), s: 1 })); let dustI = 0;
  m4.makeScale(0, 0, 0); for (let i = 0; i < DUST_N; i++) dust.setMatrixAt(i, m4); scene.add(dust);
  const puff = (x, z, n = 2, power = 1, color) => { for (let k = 0; k < n; k++) { const d = dp[dustI = (dustI + 1) % DUST_N]; d.life = d.max = rnd(0.45, 0.8) * power; d.p.set(x + rnd(-0.15, 0.15), 0.06, z + rnd(-0.15, 0.15)); d.v.set(rnd(-0.6, 0.6) * power, rnd(0.5, 1.1) * power, rnd(-0.6, 0.6) * power); d.s = rnd(0.6, 1.2) * power; if (color) dust.setColorAt(dustI, col.set(color)); else if (dust.instanceColor) dust.setColorAt(dustI, col.set(0xf4ead2)); } if (dust.instanceColor) dust.instanceColor.needsUpdate = true; };
  function stepDust(dt) {
    let any = false; for (let i = 0; i < DUST_N; i++) { const d = dp[i]; if (d.life <= 0) continue; any = true; d.life -= dt; d.v.y -= dt * 1.6; d.v.multiplyScalar(1 - dt * 2.5); d.p.addScaledVector(d.v, dt); if (d.p.y < 0.03) d.p.y = 0.03;
      const k = Math.max(0, d.life / d.max); const s = d.s * (k < 0.7 ? k / 0.7 : 1) * (0.6 + (1 - k) * 0.8); m4.compose(d.p, q.identity(), sc.set(s, s, s)); dust.setMatrixAt(i, m4); if (d.life <= 0) { m4.makeScale(0, 0, 0); dust.setMatrixAt(i, m4); } }
    if (any || stepDust.was) dust.instanceMatrix.needsUpdate = true; stepDust.was = any;
  }

  // 섬 아래 은은한 빛 띠 + 떠다니는 작은 바위 + 원경 소행성 띠 + 고리 행성
  const band = (() => {
    const g = new THREE.RingGeometry(15, 24, 128, 1).rotateX(-Math.PI / 2); const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let a = Math.atan2(z, x); if (a < 0) a += 6.283; if (i % 129 === 128) a = 6.283; uv.setXY(i, a / 6.283 * 3, (Math.hypot(x, z) - 15) / 9); }
    const t = tex(512, 64, (x, w, h) => { const img = x.createImageData(w, h); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const v = yy / h; const fall = Math.exp(-Math.pow((v - 0.18) / 0.16, 2)) + 0.25 * Math.exp(-Math.pow((v - 0.55) / 0.12, 2)); const streak = 0.55 + 0.45 * Math.sin(xx / w * 6.283 * 7 + Math.sin(xx / w * 6.283 * 3) * 2) * Math.sin(xx / w * 6.283 * 2 + 1); const a = Math.max(0, fall * streak); const o = (yy * w + xx) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = Math.min(255, a * 255); } x.putImageData(img, 0, 0); }, true);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, color: 0x8fa0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.position.y = -2.2; scene.add(m); return m;
  })();
  const rockG = new THREE.DodecahedronGeometry(1, 0), rockM = new THREE.MeshStandardMaterial({ color: 0x8a7a9c, flatShading: true, roughness: 1, emissive: 0x231c3c, emissiveIntensity: 0.7 });
  const floaters = new THREE.InstancedMesh(rockG, rockM, 12); const fl = Array.from({ length: 12 }, (_, i) => ({ r: rnd(13, 19), a: i / 12 * 6.283 + rnd(-0.2, 0.2), y: rnd(-11, -5.5), s: rnd(0.35, 0.9), sp: rnd(0.02, 0.05) * (i % 2 ? 1 : -1), rx: rnd(0, 6) }));
  floaters.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(floaters);
  const belt = new THREE.Group(); belt.rotation.set(0.07, 0, 0.04); scene.add(belt);
  { const n = 360, b = new THREE.InstancedMesh(rockG, rockM, n); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(-0.01, 0.01), r = rnd(96, 116); m4.compose(pv.set(Math.sin(a) * r, rnd(-1.5, 1.5) - 9, Math.cos(a) * r), q.setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), 0)), sc.setScalar(rnd(0.25, 1.0))); b.setMatrixAt(i, m4); b.setColorAt(i, col.setHSL(rnd(0.68, 0.8), 0.18, rnd(0.45, 0.7))); } belt.add(b); }
  const ringed = new THREE.Group(); ringed.position.set(-120, 22, -150); scene.add(ringed);
  { const pt = tex(256, 128, (x, w, h) => { const cs = ['#ffb48a', '#ffd6a8', '#f39a8a', '#ffe3c2', '#e98a9b', '#ffcf9a']; for (let y = 0; y < h; y += 8) { x.fillStyle = cs[Math.floor(hash(y) * cs.length)]; x.fillRect(0, y, w, 8 + hash(y + 1) * 10); } x.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 30; i++) x.fillRect(hash(i) * w, hash(i + 40) * h, 30, 2); });
    ringed.add(new THREE.Mesh(new THREE.SphereGeometry(16, 40, 24), new THREE.MeshStandardMaterial({ map: pt, emissive: 0xffffff, emissiveMap: pt, emissiveIntensity: 0.28, roughness: 0.9 })));
    const rt = tex(256, 256, (x, w) => { for (let r = 128; r > 70; r -= 3) { x.strokeStyle = `rgba(255,236,210,${0.15 + hash(r) * 0.55})`; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, r, 0, 6.283); x.stroke(); } });
    const ring = new THREE.Mesh(new THREE.RingGeometry(21, 36, 96), new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.85 })); ring.rotation.set(1.2, 0.3, 0); ringed.add(ring); }

  // 가로등 빛 번짐(밤에 커짐) · 반딧불(밤에만) — 둘 다 점 묶음 1개씩
  const lampPos = []; for (let i = 0; i < 8; i++) { const [x, z] = polar(10.9, i / 8 * 6.283 + 0.39); lampPos.push(x, 1.05, z); }
  const lampGlow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3)), new THREE.PointsMaterial({ map: glowTex, color: 0xffb860, size: 3.2, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); scene.add(lampGlow);
  const lampLights = []; world.traverse(o => { if (o.isPointLight && o.distance === 4 && Math.abs(Math.hypot(o.position.x, o.position.z) - 10.9) < 0.1) lampLights.push(o); });
  const FF = 40, ffBase = [], ffPos = new Float32Array(FF * 3), ffCol = new Float32Array(FF * 3);
  for (let i = 0; i < FF; i++) { let x, z; for (let k = 0; k < 20; k++) { [x, z] = polar(rnd(5.8, 14), Math.random() * 6.283); if (!onPave(x, z)) break; } ffBase.push({ x, z, y: rnd(0.35, 1.4), ph: rnd(0, 6.28), sp: rnd(0.4, 0.9) }); }
  const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3)); ffGeo.setAttribute('color', new THREE.BufferAttribute(ffCol, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.32, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fireflies.frustumCulled = false; scene.add(fireflies);

  // ═════════ 2. 시간의 변화(한국 시각) ═════════
  const KST = 9 * 3600e3, Q15 = 15 * 60000;
  const hourNow = () => FORCE.h ?? (((Date.now() + KST) / 3600e3) % 24);
  const showerOn = () => FORCE.shower ?? (Date.now() % Q15 < 60000);
  const nextShower = () => Math.ceil((Date.now() + 1) / Q15) * Q15;
  const kstText = (ms) => { const d = new Date(ms + KST); const h = d.getUTCHours(), m = d.getUTCMinutes(); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}시${m ? ` ${m}분` : ''}`; };
  const C = (h) => new THREE.Color(h);
  const NIGHT = { top: C(0x04050d), mid: C(0x1a1840), bot: C(0x05060f), sun: 0.45, sunC: C(0x8fa4ff), sp: new V3(-8, 16, -6), hemi: 0.3, star: 1, lamp: 1, exp: 0.78, band: C(0x7f8bff) };
  const DAWN = { top: C(0x1d2150), mid: C(0xf2a08e), bot: C(0x241c45), sun: 1.3, sunC: C(0xffb894), sp: new V3(16, 6, 6), hemi: 1.1, star: 0.45, lamp: 0.4, exp: 1.02, band: C(0xffa0c8) };
  const DAY = { top: C(0x2e5cb0), mid: C(0x9fd2ff), bot: C(0x1c2f66), sun: 2.7, sunC: C(0xfff1d6), sp: new V3(9, 18, 7), hemi: 1.5, star: 0.1, lamp: 0, exp: 1.05, band: C(0x9fe0ff) };
  const SET = { top: C(0x2a2763), mid: C(0xff9466), bot: C(0x1d1638), sun: 1.8, sunC: C(0xff9d5c), sp: new V3(-16, 7, 5), hemi: 1.15, star: 0.35, lamp: 0.55, exp: 1.03, band: C(0xffb07f) };
  const DUSK = { top: C(0x0b0b26), mid: C(0x4c2f6e), bot: C(0x07071a), sun: 0.95, sunC: C(0xb9a4ff), sp: new V3(-12, 10, -2), hemi: 0.9, star: 0.85, lamp: 1, exp: 1.0, band: C(0xa98bff) };
  const KEYS = [[0, NIGHT], [4.8, NIGHT], [6, DAWN], [7.5, DAY], [16.3, DAY], [18, SET], [19.3, DUSK], [20.5, NIGHT], [24, NIGHT]];
  function skyAt(h) {
    for (let i = 0; i < KEYS.length - 1; i++) { const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1]; if (h < h0 || h > h1) continue; let k = h1 > h0 ? (h - h0) / (h1 - h0) : 0; k = k * k * (3 - 2 * k);
      const o = {}; for (const key in a) o[key] = a[key].isColor ? a[key].clone().lerp(b[key], k) : a[key].isVector3 ? a[key].clone().lerp(b[key], k) : a[key] + (b[key] - a[key]) * k; return o; }
    return NIGHT;
  }
  const bgC = document.createElement('canvas'); bgC.width = 4; bgC.height = 256; const bgX = bgC.getContext('2d'); const bgT = new THREE.CanvasTexture(bgC); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;
  const hemi = scene.children.find(o => o.isHemisphereLight);
  const stars = scene.children.find(o => o.isPoints && o.geometry.attributes.position.count >= 1000);
  const nebula = scene.children.filter(o => o.isSprite && o.material.blending === THREE.AdditiveBlending && o.scale.x >= 100);
  let SKY = skyAt(hourNow()), skyT = -1, lastPhase = null;
  function applySky(now, force = false) {
    if (!force && now - skyT < 1000) return; skyT = now; SKY = skyAt(hourNow()); const s = SKY;
    const g = bgX.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#' + s.top.getHexString()); g.addColorStop(0.5, '#' + s.mid.getHexString()); g.addColorStop(1, '#' + s.bot.getHexString()); bgX.fillStyle = g; bgX.fillRect(0, 0, 4, 256); bgT.needsUpdate = true;
    sun.intensity = s.sun; sun.color.copy(s.sunC); sun.position.copy(s.sp); if (hemi) hemi.intensity = s.hemi;
    if (stars) stars.material.opacity = 0.9 * s.star; nebula.forEach(n => { n.material.opacity = 0.25 + 0.75 * s.star; });
    lampLights.forEach(l => { l.intensity = 1.2 + 3.6 * s.lamp; l.distance = 4 + 2 * s.lamp; }); lampGlow.material.opacity = 0.75 * s.lamp;
    renderer.toneMappingExposure = s.exp; scene.environmentIntensity = 0.18 + 0.17 * (1 - s.star); band.material.color.copy(s.band); band.material.opacity = 0.3 + 0.35 * s.star; rockM.emissiveIntensity = 0.25 + 0.6 * s.star;
    const h = hourNow(); const phase = h >= 20.5 || h < 5 ? 'night' : h < 7.5 ? 'dawn' : h < 16.3 ? 'day' : h < 19.3 ? 'set' : 'dusk'; if (lastPhase && phase !== lastPhase && phase === 'night') EXT.log('', '밤이 됐어. 가로등이 켜지고 반딧불이 나와', false, true); lastPhase = phase;
  }
  applySky(0, true);

  // ═════════ 3. 유성우 · 별똥별 · 별똥별 조각 ═════════
  const streakTex = tex(256, 32, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(255,240,200,.85)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, w, h); const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, w, h); });
  const meteors = []; const MPOOL = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex, color: 0xfff2c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; scene.add(s); return s; });
  const a2 = new V3(), b2 = new V3(), fwd = new V3();
  function meteor(from, to, dur, width, frac, onEnd) { const sp = MPOOL.find(s => !s.visible); if (!sp) return false; sp.visible = true; meteors.push({ sp, from, to, t0: performance.now(), dur, width, frac, onEnd }); return true; }
  function stepMeteors(now) {
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; const t = Math.min(1, (now - m.t0) / m.dur); const head = a2.copy(m.from).lerp(m.to, t), tail = b2.copy(m.from).lerp(m.to, Math.max(0, t - m.frac));
      m.sp.position.copy(head).add(tail).multiplyScalar(0.5); const len = head.distanceTo(tail);
      const hp = head.clone().project(camera), tp = tail.clone().project(camera); m.sp.material.rotation = Math.atan2((hp.y - tp.y) * innerHeight, (hp.x - tp.x) * innerWidth);
      camera.getWorldDirection(fwd); const along = Math.abs(head.clone().sub(tail).normalize().dot(fwd)); m.sp.scale.set(Math.max(0.01, len * Math.sqrt(1 - along * along)), m.width, 1);
      m.sp.material.opacity = t > 0.85 ? (1 - t) / 0.15 : 1;
      if (t >= 1) { m.sp.visible = false; meteors.splice(i, 1); m.onEnd?.(); }
    }
  }
  function skyMeteor(big = false) { // 카메라 앞 하늘(지평선 위)을 가로지르는 별똥별
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); const right = new V3(-fwd.z, 0, fwd.x); const D2 = rnd(70, 110);
    const from = camera.position.clone().addScaledVector(fwd, D2).addScaledVector(right, rnd(-45, 55)).add(new V3(0, rnd(18, 48), 0));
    const dir = right.clone().multiplyScalar(-1).add(new V3(0, -0.55, 0)).addScaledVector(fwd, rnd(-0.2, 0.2)).normalize();
    meteor(from, from.clone().addScaledVector(dir, rnd(28, 45) * (big ? 1.4 : 1)), rnd(650, 1050), big ? 1.1 : 0.7, 0.35);
  }
  // 바닥 조각
  const shards = []; const shardGeo = new THREE.OctahedronGeometry(0.24, 0); const shardMat = new THREE.MeshStandardMaterial({ color: 0xffcf3a, emissive: 0xff9d2e, emissiveIntensity: 0.9, flatShading: true, roughness: 0.35 });
  const recentPicks = () => { const t = Date.now() - 10 * 60000; life.picks = (life.picks || []).filter(x => x > t); return life.picks.length; };
  function freeSpot() {
    const p = player.root.position;
    for (let k = 0; k < 40; k++) { let x, z; if (k < 25) { const a = Math.random() * 6.283, r = rnd(3, 7); x = p.x + Math.sin(a) * r; z = p.z + Math.cos(a) * r; } else [x, z] = polar(rnd(3, 13.8), Math.random() * 6.283);
      if (Math.hypot(x, z) > 13.9 || Math.hypot(x, z) < 2.6 || blocked(x, z, 0.6) || shards.some(s => Math.hypot(s.x - x, s.z - z) < 2)) continue; return [x, z]; }
    return null;
  }
  function dropShard(at) {
    if (recentPicks() + shards.length >= 5) return false; // 10분에 5개까지 — 떨어진 조각은 언제나 주울 수 있게 미리 센다
    const spot = at || freeSpot(); if (!spot) return false; const [x, z] = spot; const s = { x, z, landed: false, g: null }; shards.push(s);
    camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); const from = new V3(x, 0, z).addScaledVector(fwd, rnd(25, 35)).add(new V3(rnd(-12, 12), 38, 0));
    meteor(from, new V3(x, 0.2, z), reduce ? 200 : 1100, 0.9, 0.3, () => land(s)); return true;
  }
  function land(s) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); const m = new THREE.Mesh(shardGeo, shardMat); m.scale.set(1, 1.5, 1); m.castShadow = true; g.add(m);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd36a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); gl.scale.setScalar(1.8); g.add(gl);
    scene.add(g); s.g = g; s.m = m; s.gl = gl; s.landed = true; s.t0 = performance.now(); puff(s.x, s.z, 7, 1.3, 0xfff1c0); snd.thud(); if (Math.hypot(s.x - player.root.position.x, s.z - player.root.position.z) < 9) DC.buzz(12);
  }
  const prj = new V3();
  function popText(text, x, y, z) { prj.set(x, y, z).project(camera); if (prj.z > 1) return; const d = el('div', { class: 'lf-pop' }, text); d.style.left = `${(prj.x * 0.5 + 0.5) * innerWidth}px`; d.style.top = `${(-prj.y * 0.5 + 0.5) * innerHeight}px`; document.body.append(d); setTimeout(() => d.remove(), 1200); }
  function stepShards(now, t) {
    const p = player.root.position;
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i]; if (!s.landed) continue; const age = (now - s.t0) / 1000;
      s.m.position.y = 0.42 + Math.sin(t * 2.4 + i) * 0.08 + (age < 0.4 ? (0.4 - age) * -1 : 0); s.m.rotation.y = t * 1.8; s.gl.position.y = s.m.position.y; s.gl.scale.setScalar(1.6 + Math.sin(t * 5 + i) * 0.35);
      if (Math.hypot(p.x - s.x, p.z - s.z) < 0.85 && EXT.spawned()) {
        scene.remove(s.g); s.gl.material.dispose(); shards.splice(i, 1); life.picks.push(Date.now()); saveLife();
        DP?.give(2); DC.sfx('unlock'); DC.buzz([12, 30, 12]); popText('+2 코인', s.x, 1.6, s.z); puff(s.x, s.z, 8, 1.1, 0xffe58a);
        document.querySelector('#stat')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'steps(3)' });
        const n = recentPicks(); EXT.log('', n >= 5 ? '별똥별 조각 5개! 10분에 5개까지라 잠깐 쉬어 가' : `별똥별 조각 주움 · +2 코인 (10분에 ${n}/5)`, false, true);
      }
    }
  }
  let nextDrop = performance.now() + 14000, nextSky = performance.now() + rnd(6000, 15000), showerWas = false;
  function stepSkyEvents(now) {
    const on = showerOn();
    if (on !== showerWas) {
      showerWas = on;
      if (on) { EXT.log('', '유성우가 왔어! 하늘 봐 봐. 별똥별 조각도 더 자주 떨어져', false, true); snd.chime(); nextDrop = Math.min(nextDrop, now + 2500); }
    }
    if (now > nextSky) { if (on) { skyMeteor(Math.random() < 0.2); nextSky = now + rnd(160, 520); } else { if (SKY.star > 0.3) skyMeteor(); nextSky = now + rnd(14000, 30000); } }
    if (EXT.spawned() && now > nextDrop) { const max = on ? 3 : 2; if (shards.length < max) dropShard(); nextDrop = now + (on ? rnd(7000, 12000) : rnd(40000, 75000)); }
  }

  // ═════════ 4. 소리(손댄 뒤에만 · 낮/밤 다르게 · 발걸음) ═════════
  const snd = (() => {
    let ctx = null, master = null, padBus = null, bellBus = null, stepBus = null, timer = 0, noise = null, on = life.snd !== false && DC.sfx.on();
    const NOTES = { day: [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0]], night: [[110.0, 164.8, 196.0, 261.6], [87.3, 130.8, 174.6, 220.0], [98.0, 146.8, 196.0, 246.9], [82.4, 123.5, 164.8, 196.0]] };
    const PENTA = { day: [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5], night: [392.0, 440.0, 523.3, 587.3, 659.3, 784.0] };
    let ci = 0;
    function init() {
      if (ctx) return; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; return; }
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; padBus = ctx.createGain(); padBus.gain.value = 0.5; padBus.connect(lp).connect(master);
      const dl = ctx.createDelay(1); dl.delayTime.value = 0.38; const fb = ctx.createGain(); fb.gain.value = 0.38; const dlp = ctx.createBiquadFilter(); dlp.frequency.value = 2400;
      bellBus = ctx.createGain(); bellBus.gain.value = 0.55; bellBus.connect(master); bellBus.connect(dl); dl.connect(dlp).connect(fb).connect(dl); dlp.connect(master);
      stepBus = ctx.createGain(); stepBus.gain.value = 0.9; stepBus.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    }
    const night = () => SKY.star > 0.6;
    function chord() {
      if (!ctx || !on) return; const t = ctx.currentTime, set = NOTES[night() ? 'night' : 'day'][ci++ % 4], L = 9;
      set.forEach((f, i) => { for (const [type, det, v] of [['sine', 0, 0.05], ['triangle', 4, 0.022]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det + (i % 2 ? 3 : -3); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 3); g.gain.setValueAtTime(v, t + L - 3); g.gain.linearRampToValueAtTime(0.0001, t + L + 1); o.connect(g).connect(padBus); o.start(t); o.stop(t + L + 1.2); } });
    }
    function bell(f, when = 0, v = 0.06) { if (!ctx || !on) return; const t = ctx.currentTime + when; for (const [m, vv, dur] of [[1, v, 2.4], [2.76, v * 0.25, 1.1], [5.4, v * 0.08, 0.5]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vv, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(bellBus); o.start(t); o.stop(t + dur + 0.05); } }
    function loop() { clearTimeout(timer); if (!on || !ctx) return; chord(); const n = night(); const bells = n ? 2 : 3; for (let i = 0; i < bells; i++) if (Math.random() < 0.8) bell(pick(PENTA[n ? 'night' : 'day']), rnd(0.5, 7.5), n ? 0.035 : 0.045); timer = setTimeout(loop, 8000); }
    function start() { init(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.8); if (on) loop(); }
    function step(paved) { if (!ctx || !on || ctx.state !== 'running') return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; s.playbackRate.value = rnd(0.85, 1.15); f.type = 'bandpass'; f.frequency.value = paved ? rnd(1500, 2100) : rnd(500, 750); f.Q.value = paved ? 1.6 : 0.8; g.gain.value = paved ? 0.16 : 0.12; s.connect(f).connect(g).connect(stepBus); s.start(t); }
    return {
      start, step, get on() { return on; },
      set(v) { on = v; life.snd = v; saveLife(); if (DC.sfx.on() !== v) DC.sfx.toggle(); if (v) start(); else if (ctx) { clearTimeout(timer); master.gain.setTargetAtTime(0, ctx.currentTime, 0.15); } },
      chime() { if (!ctx || !on) return; [784, 988, 1175, 1568].forEach((f, i) => bell(f, i * 0.12, 0.05)); },
      thud() { if (!ctx || !on) return; bell(rnd(1300, 1700), 0, 0.03); },
      suspend(h) { if (!ctx) return; if (h) ctx.suspend(); else if (on) ctx.resume(); },
    };
  })();
  const firstTouch = () => { removeEventListener('pointerdown', firstTouch, true); removeEventListener('keydown', firstTouch, true); if (snd.on) snd.start(); };
  addEventListener('pointerdown', firstTouch, true); addEventListener('keydown', firstTouch, true);
  document.addEventListener('visibilitychange', () => snd.suspend(document.hidden));
  const SPK = (off) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/>${off ? '<path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>' : '<path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/>'}</svg>`;
  const bgmBtn = EXT.addButton({ id: 'bgmBtn', icon: 'play', label: '소리', onClick: () => { snd.set(!snd.on); paintBtn(); DC.sfx('tap'); EXT.toast(snd.on ? '소리 켬 · 배경음과 효과음' : '소리 끔'); } });
  const paintBtn = () => { bgmBtn.querySelector('.ic').innerHTML = SPK(!snd.on); bgmBtn.classList.toggle('off', !snd.on); bgmBtn.setAttribute('aria-label', snd.on ? '소리 끄기' : '소리 켜기'); }; paintBtn();

  // ═════════ 5. NPC 주민 ═════════
  // 진짜 접속자인 척하지 않는다: 이름표 「NPC」 · 대화창 첫 줄에서 밝힌다 · 접속자 수(peers)에 넣지 않는다
  const eps = D.episodes, latest = eps[0], planets = DC.planets();
  const pitch1 = (p) => p.pitch.replace(/\n/g, ' ');
  const rp = () => pick(planets);
  const shardLine = () => `별똥별 조각은 10분에 5개까지 주울 수 있어. 지금 ${recentPicks()}개 주웠네.`;
  const showerLine = () => showerOn() ? '지금 유성우 중이야! 고개 들고 하늘 봐 봐.' : `다음 유성우는 ${kstText(nextShower())}. 15분마다 1분씩 와.`;
  const timeLine = () => SKY.star > 0.6 ? '밤엔 가로등이 켜지고 반딧불이 나와. 지금이 제일 예쁠 때야.' : SKY.lamp > 0.3 ? '하늘 색 바뀌는 거 봤어? 이 광장 하늘은 한국 시각을 따라가.' : '낮엔 별이 잘 안 보여. 저녁 7시쯤부터 하늘이 바뀌어.';
  const W = () => window.__world || {};
  const FACE = {
    bot: '<svg viewBox="0 0 48 48" fill="none" stroke="#1f1a2e" stroke-width="2.6" stroke-linejoin="round"><path d="M24 4v6"/><circle cx="24" cy="4" r="2.4" fill="#ff6f91"/><rect x="8" y="10" width="32" height="26" rx="7" fill="#fff4dc"/><rect x="13" y="16" width="22" height="13" rx="4" fill="#1f1a2e"/><circle cx="19" cy="22.5" r="2.6" fill="#7fd8ff" stroke="none"/><circle cx="29" cy="22.5" r="2.6" fill="#7fd8ff" stroke="none"/><path d="M14 36v6h20v-6M4 22h4M40 22h4"/></svg>',
    merchant: '<svg viewBox="0 0 48 48" fill="none" stroke="#1f1a2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="24" cy="15" rx="20" ry="4" fill="#e6c47a"/><path d="M14 15c0-7 4-10 10-10s10 3 10 10" fill="#e6c47a"/><path d="M14 12h20" stroke="#c7413a" stroke-width="3"/><rect x="12" y="17" width="24" height="22" rx="9" fill="#ffd9b0"/><circle cx="19" cy="26" r="1.8" fill="#1f1a2e"/><circle cx="29" cy="26" r="1.8" fill="#1f1a2e"/><path d="M19 32c3 2.5 7 2.5 10 0"/><path d="M14 39l-3 6M34 39l3 6"/></svg>',
    traveler: '<svg viewBox="0 0 48 48" fill="none" stroke="#1f1a2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><circle cx="24" cy="23" r="18" fill="#cfefff"/><rect x="14" y="15" width="20" height="18" rx="8" fill="#ffd9b0"/><path d="M14 20c2-5 18-5 20 0" fill="#7a4a2a"/><circle cx="20" cy="25" r="1.8" fill="#1f1a2e"/><circle cx="28" cy="25" r="1.8" fill="#1f1a2e"/><path d="M21 29.5h6"/><path d="M33 9l3-3" stroke="#fff"/><path d="M10 40h28" stroke-width="3"/><circle cx="38" cy="16" r="2" fill="#ff5a5a"/></svg>',
    alien: '<svg viewBox="0 0 48 48" fill="none" stroke="#1f1a2e" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"><path d="M17 9l-4-5M31 9l4-5"/><circle cx="12.5" cy="3.8" r="2" fill="#9dff6a"/><circle cx="35.5" cy="3.8" r="2" fill="#9dff6a"/><path d="M24 8c11 0 16 8 16 16 0 9-8 16-16 16S8 33 8 24c0-8 5-16 16-16z" fill="#b59cff"/><ellipse cx="18" cy="23" rx="4" ry="5.5" fill="#1f1a2e"/><ellipse cx="30" cy="23" rx="4" ry="5.5" fill="#1f1a2e"/><circle cx="19" cy="21" r="1.4" fill="#fff" stroke="none"/><circle cx="31" cy="21" r="1.4" fill="#fff" stroke="none"/><path d="M21 32c2 1.5 4 1.5 6 0"/><path d="M36 40l3 4M12 40l-3 4"/></svg>',
  };
  const NPCS = [
    { id: 'pipi', name: '안내봇 삐삐', role: '광장 안내', face: 'bot', bg: '#7fd8ff', code: { b: 6, c1: 10, c2: 13, hat: 0, n: [0, 14] },
      spots: [[3.2, 0.35], [3.2, -0.45], [3.3, 1.15], [3.3, -1.25], [5.3, 0], [3.2, 2.1], [3.2, -2.15], [9.8, 0.2], [9.8, -0.4]],
      greet: () => EXT.GUEST ? '안녕! 처음이면 나 눌러 봐' : '어서 와! 나 누르면 안내해 줄게',
      ambient: () => ['땅을 톡 누르면 거기로 걸어가', '오늘의 미션 했어?', '이름표 달린 곳 앞에 서면 노란 버튼이 떠', '명예의 전당 발표는 일요일 밤!', '반짝이는 조각 보이면 주워 봐', showerLine()],
      talk: () => ['삐빅! 안내봇 삐삐야. 어디 데려다줄까?', EXT.GUEST ? '구경 중이면 「내 캐릭터 만들기」부터 해 봐. 그래야 순위에 올라가.' : '오늘의 미션 했어? 3개 다 깨면 캡슐 티켓 1장!'],
      acts: () => [DP && ['오늘의 미션 보기', () => W().openQuests?.()], W().openMap && ['광장 지도 보기', () => W().openMap()], ['명예의 전당까지 데려다줘', () => goTo('hall')]] },
    { id: 'dodo', name: '행성 상인 도도', role: '카드 수집가', face: 'merchant', bg: '#ffcf3a', code: { b: 4, skin: 2, hair: 2, c1: 4, c2: 2, hat: 1, n: [12, 5] },
      spots: [[6.9, -0.6], [7.2, -1.32], [5.6, -0.95], [9.8, -1.05], [9.8, -0.7]],
      greet: () => '어서 와, 구경하고 가',
      ambient: () => ['캡슐 하나 돌려 볼래?', '황금 카드 뽑은 사람 봤어?', '겹친 카드는 조각이 돼', '도감 몇 장 모았어?', `${rp().name} 카드 찾는 중이야`],
      talk: () => ['행성 카드 모으는 도도야. 캡슐 하나 돌려 볼래?', DP ? `한 번에 ${DP.PRICE}코인. 같은 카드가 또 나오면 조각이 돼.` : '캡슐 기계는 코인으로만 돌아가.'],
      acts: () => [['캡슐 기계 앞으로', () => goTo('capsule')], DP && ['카드 도감 보기', () => W().openBook?.()]] },
    { id: 'lulu', name: '여행자 루루', role: '행성 여행 중', face: 'traveler', bg: '#ff8fd0', code: { b: 1, skin: 3, hair: 2, c1: 9, c2: 14, hat: 5, n: [7, 4] },
      spots: [[9.8, -2.6], [9.8, -1.3], [9.8, -0.25], [9.8, 0.45], [9.8, 2.55], [9.8, -2.55], [7.3, -1.92], [6.8, 3.0]],
      greet: () => '오, 너도 여행 중이야?',
      ambient: () => { const p = rp(); return [`${p.name} 가 본 사람?`, `${latest.no}편 봤어?`, '다음엔 어느 행성 가지…', '1년이면 생각보다 길어', `${p.name}, ${p.pitch.split('\n')[0]}`]; },
      talk: () => ['여행자 루루야. 행성마다 1년씩 살아 보는 중!', `이번 ${latest.no}편은 「${latest.title}」. 너라면 어디서 1년 버틸래?`],
      acts: () => [['극장 앞으로', () => goTo('theater')]] },
    { id: 'nono', name: '별지기 노노', role: '하늘 관측', face: 'alien', bg: '#b59cff', code: { b: 7, c1: 8, c2: 3, hat: 0, n: [9, 11] },
      spots: [[12.9, 0.15], [12.9, -0.38], [12.9, -1.45], [12.9, 2.38], [12.9, -2.38], [12.9, 1.02], [12.6, -1.1]],
      greet: () => '쉿… 별 보는 중',
      ambient: () => ['하늘 좀 봐', showerLine(), timeLine(), '오늘 별똥별 많이 떨어지네'],
      talk: () => ['쉿, 별 보는 중. 별지기 노노야.', ((h) => h ? `이 광장엔 숨겨진 비밀이 있어. 힌트 줄게 — ${h}` : showerLine())(window.__secrets?.hint?.())].filter(Boolean),
      acts: () => [] },
  ];
  const PAIRS = [['오늘 광장 좀 붐비네', '나도 방금 왔어'], ['어느 행성 제일 좋았어?', () => `난 ${rp().name}!`], ['유성우 언제 와?', () => showerOn() ? '지금이잖아!' : `${kstText(nextShower())}에`], ['캡슐 돌려 봤어?', '아직. 코인 모으는 중'], ['1년 버틸 수 있을까?', '행성 나름이지']];
  const npcs = [];
  function goTo(id) { EXT.closeSheet(); const f = EXT.facOf[id]; if (!f) return; if (EXT.navTo) EXT.navTo(id); else EXT.walkTo(f.at); } // 길 안내로
  async function makeNpc(def) {
    const ch = await EXT.K.makeCharacter({ ...EXT.K.defaultChar(), skin: 0, hair: 0, pose: 0, ...def.code }); if (!ch) return;
    const root = new THREE.Group(); ch.root.scale.setScalar(EXT.CH_S); root.add(ch.root); ch.anim('idle');
    const sp = pick(def.spots); const [x, z] = polar(sp[0], sp[1]); root.position.set(x, 0, z); root.rotation.y = Math.atan2(-x, -z); scene.add(root);
    const tag = EXT.makeTag('npc', def.name); const nm = tag.el.querySelector('.nm'); nm.textContent = ''; nm.append(el('i', {}, 'NPC'), def.name); tag.obj = root; tag.h = 1.45;
    const n = { def, ch, root, tag, mode: 'idle', wait: rnd(1.5, 6), target: null, speed: rnd(1.3, 1.6), bubAt: performance.now() + rnd(3000, 12000), greetAt: 0, talkUntil: 0, onceUntil: 0, chk: { t: 0, x, z }, dustT: 0, spot: sp };
    npcs.push(n);
  }
  Promise.all(NPCS.map(makeNpc)).catch(e => console.warn('NPC 못 만듦', e));
  const say = (n, text) => { if (!text) return; EXT.bubble(n.tag, typeof text === 'function' ? text() : text); n.bubAt = performance.now() + rnd(14000, 26000); };
  const faceTo = (n, x, z, dt, k = 8) => { const want = Math.atan2(x - n.root.position.x, z - n.root.position.z); let d = want - n.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); n.root.rotation.y += d * Math.min(1, dt * k); };
  const once = (n, name) => { const d = n.ch.anim(name, { once: true }); n.onceUntil = performance.now() + d * 1000; };
  function pickTarget(n) {
    const options = n.def.spots.filter(s => s !== n.spot && !npcs.some(o => o !== n && o.target && Math.hypot(o.target.x - polar(s[0], s[1])[0], o.target.z - polar(s[0], s[1])[1]) < 1.5));
    n.spot = pick(options.length ? options : n.def.spots); const [x, z] = polar(n.spot[0] + rnd(-0.25, 0.25), n.spot[1] + rnd(-0.05, 0.05)); n.target = new V3(x, 0, z); n.mode = 'walk'; n.chk = { t: performance.now(), x: n.root.position.x, z: n.root.position.z };
  }
  function stepNpcs(dt, now) {
    const pp = player.root.position;
    for (const n of npcs) {
      const p = n.root.position; const dPl = Math.hypot(pp.x - p.x, pp.z - p.z); let moving = false;
      if (n.talkUntil > now) { faceTo(n, pp.x, pp.z, dt); }
      else if (n.mode === 'walk' && n.target) {
        const tx = n.target.x - p.x, tz = n.target.z - p.z, d = Math.hypot(tx, tz);
        if (d < 0.2) { n.mode = 'idle'; n.target = null; n.wait = rnd(4, 10); if (Math.random() < 0.35) once(n, n.def.id === 'dodo' ? 'interact-right' : 'emote-yes'); }
        else {
          const ox = p.x, oz = p.z; p.x += tx / d * n.speed * dt; p.z += tz / d * n.speed * dt;
          const obst = [...COL, { x: pp.x, z: pp.z, r: 0.35 }, ...npcs.filter(o => o !== n).map(o => ({ x: o.root.position.x, z: o.root.position.z, r: 0.3 }))];
          for (const c of obst) { const dx = p.x - c.x, dz = p.z - c.z, dd = Math.hypot(dx, dz), r = c.r + 0.35; if (!(dd < r && dd > 0.0001)) continue; p.x = c.x + dx / dd * r; p.z = c.z + dz / dd * r; let sx = -dz / dd, sz = dx / dd; if (sx * tx + sz * tz < 0) { sx = -sx; sz = -sz; } p.x += sx * n.speed * dt; p.z += sz * n.speed * dt; }
          const rr = Math.hypot(p.x, p.z); if (rr > 14.3) { p.x *= 14.3 / rr; p.z *= 14.3 / rr; }
          const mx = p.x - ox, mz = p.z - oz; if (Math.hypot(mx, mz) > 1e-4) faceTo(n, p.x + mx, p.z + mz, dt, 10); moving = true;
          if (now - n.chk.t > 2500) { if (Math.hypot(p.x - n.chk.x, p.z - n.chk.z) < 0.4) pickTarget(n); n.chk = { t: now, x: p.x, z: p.z }; }
          n.dustT -= dt; if (n.dustT <= 0) { n.dustT = 0.42; puff(p.x, p.z, 1, 0.6); }
        }
      } else {
        n.wait -= dt;
        if (dPl < 3 && EXT.spawned()) { faceTo(n, pp.x, pp.z, dt, 4); if (now > n.greetAt) { n.greetAt = now + 45000; say(n, n.def.greet); if (Math.random() < 0.6) once(n, 'emote-yes'); } }
        else if (n.wait <= 0) pickTarget(n);
        if (now > n.bubAt && dPl < 16) {
          const mate = npcs.find(o => o !== n && o.mode === 'idle' && o.talkUntil < now && Math.hypot(o.root.position.x - p.x, o.root.position.z - p.z) < 3.5);
          if (mate && Math.random() < 0.5) { const [a, b] = pick(PAIRS); n.wait += 3; mate.wait += 4; n.facing = mate; say(n, a); setTimeout(() => say(mate, b), 1800); mate.bubAt = now + 20000; }
          else say(n, pick(n.def.ambient()));
        }
        if (n.facing) { faceTo(n, n.facing.root.position.x, n.facing.root.position.z, dt, 4); if (n.wait <= 0) n.facing = null; }
      }
      n.ch.mixer.timeScale = moving ? 0.62 : 1;
      if (n.onceUntil < now) n.ch.anim(moving ? 'walk' : 'idle');
      n.ch.mixer.update(dt);
    }
  }
  // 손 흔들기(👋 버튼)를 하면 가까운 NPC 도 같이 흔들어 준다
  document.querySelector('#emote')?.addEventListener('click', () => { const pp = player.root.position; npcs.filter(n => Math.hypot(n.root.position.x - pp.x, n.root.position.z - pp.z) < 5).forEach((n, i) => setTimeout(() => { n.talkUntil = performance.now() + 2500; once(n, 'emote-yes'); say(n, pick(['반가워!', '안녕!', '오, 안녕'])); }, 300 + i * 250)); });

  // 대화창(종이 패널) — 한 글자씩, 「다음 ▸」, 마지막 줄에서 할 일 버튼
  let typeT = 0;
  function typeInto(node, text) { text = String(text ?? ''); clearInterval(typeT); node.classList.remove('done'); if (reduce) { node.textContent = text; node.classList.add('done'); return; } let i = 0; node.textContent = ''; typeT = setInterval(() => { node.textContent = text.slice(0, ++i); if (i % 3 === 0) DC.sfx('tick'); if (i >= text.length) { clearInterval(typeT); node.classList.add('done'); } }, 26); }
  function talk(n) {
    const now = performance.now(); n.talkUntil = now + 12000; n.mode = 'idle'; n.target = null; n.wait = 8; once(n, 'emote-yes'); DC.sfx('tap');
    const lines = n.def.talk(); let i = 0; const txt = el('p', { class: 'lf-say' });
    const next = el('button', { class: 'btn k lf-next', type: 'button' }, '다음 ▸');
    const acts = el('div', { class: 'lf-acts' }, (n.def.acts() || []).filter(Boolean).map(([label, f]) => el('button', { class: 'btn k sun', type: 'button', onclick: f }, label)), el('button', { class: 'btn k', type: 'button', onclick: () => EXT.closeSheet() }, '고마워, 안녕'));
    const show = () => { typeInto(txt, lines[i]); next.hidden = i >= lines.length - 1; acts.hidden = false; n.talkUntil = performance.now() + 12000; }; // 할 일은 첫 장부터(점검 7번)
    next.onclick = () => { if (i >= lines.length - 1) return; if (txt.textContent.length < lines[i].length) { clearInterval(typeT); txt.textContent = lines[i]; txt.classList.add('done'); return; } i++; show(); };
    const face = el('div', { class: 'lf-face', style: `background:${n.def.bg}` }); face.innerHTML = FACE[n.def.face];
    EXT.sheet(`NPC · ${n.def.name}`, el('div', { class: 'lf-talk' }, face, el('div', {}, el('span', { class: 'lf-who' }, el('i', {}, 'NPC'), n.def.role), txt)), next, acts);
    show();
  }
  // 누르기: 화면에서 NPC 몸 상자 · 별똥별 조각 근처를 직접 잰다(world.js 의 땅 누르기와 함께 돈다)
  let pd = null; const hp = new V3(), fp = new V3();
  canvas.addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  const tapTest = (e) => {
    const d = pd; pd = null; if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || performance.now() - d.t > 500) return false;
    let best = null, bd = 1e9;
    for (const n of npcs) { const p = n.root.position; fp.copy(p).project(camera); hp.set(p.x, 1.25, p.z).project(camera); if (fp.z > 1) continue;
      const fx = (fp.x * 0.5 + 0.5) * innerWidth, fy = (-fp.y * 0.5 + 0.5) * innerHeight, hy = (-hp.y * 0.5 + 0.5) * innerHeight, h = Math.max(30, fy - hy), w = Math.max(30, h * 0.6);
      if (Math.abs(e.clientX - fx) < w / 2 && e.clientY > hy - 12 && e.clientY < fy + 8) { const dist = camera.position.distanceTo(p); if (dist < bd) { bd = dist; best = n; } } }
    if (best) { player.target = null; talk(best); return true; }
    for (const s of shards) { if (!s.landed) continue; fp.set(s.x, 0.4, s.z).project(camera); if (Math.hypot(e.clientX - (fp.x * 0.5 + 0.5) * innerWidth, e.clientY - (-fp.y * 0.5 + 0.5) * innerHeight) < 44) { EXT.walkTo([s.x, s.z]); return true; } }
    return false;
  };
  if (EXT.onTap) EXT.onTap(tapTest); else canvas.addEventListener('pointerup', tapTest); // world.js 가 먼저 묻는다 → 땅 이동 표시가 겹치지 않음

  // ═════════ 6. 시설 들어갈 때 잉크 원 와이프(화면 넘어가는 시설만 · 시트 여는 시설·새 창 광고는 그대로) ═════════
  const NAV = (f) => f.id.startsWith('cab-') || ['town', 'board', 'mirror'].includes(f.id);
  let wiping = false;
  function wipe(f, orig, freeze) {
    if (wiping) return; if (reduce) { orig(); return; } wiping = true;
    player.root.updateMatrixWorld(); fp.set(player.root.position.x, 0.9, player.root.position.z).project(camera);
    const x = Math.round((fp.x * 0.5 + 0.5) * innerWidth), y = Math.round((-fp.y * 0.5 + 0.5) * innerHeight), R = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 10;
    // 잉크 원: 화면 전체 한 장에 원형 그라데이션(구멍 + 종이 테두리 + 잉크)을 9칸으로 끊어 줄인다(도트 게임 느낌 · 그림자 대신 가볍게)
    const cover = el('div', { class: 'lf-wipe-cover' }); document.body.append(cover);
    const paint = (r) => { cover.style.background = r <= 0 ? 'var(--ink)' : `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, var(--paper) ${r}px, var(--paper) ${r + 6}px, var(--ink) ${r + 6}px)`; };
    DC.sfx('swipe'); DC.buzz(15); paint(R); let k = 0; const N = 9;
    const iv = setInterval(() => { if (freeze && k >= freeze) { clearInterval(iv); return; } k++; const e = k / N; paint(Math.round(R * (1 - e) * (1 - e * 0.25))); if (k >= N) { clearInterval(iv); paint(0);
      document.body.append(el('div', { class: 'lf-wipe-label' }, el('b', {}, `${f.name} · 들어가는 중…`))); orig(); setTimeout(cleanup, 6000); } }, 46);
    const cleanup = () => { wiping = false; document.querySelectorAll('.lf-wipe-cover,.lf-wipe-label').forEach(x2 => x2.remove()); };
    addEventListener('pageshow', cleanup, { once: true });
  }
  for (const f of EXT.FAC) if (NAV(f) && !f._lifeWrap) { const orig = f.open; f.open = () => wipe(f, orig); f._lifeWrap = true; }

  // ═════════ 7. 매 프레임 ═════════
  let stepT = 0, pDustT = 0;
  let tickMs = 0;
  EXT.onTick((dt, t, now) => {
    const t0 = performance.now(); applySky(now); wind.value = t;
    // 별 반짝임은 밤에만 조금
    if (stars && SKY.star > 0.5) stars.material.opacity = 0.9 * SKY.star * (0.92 + Math.sin(t * 1.7) * 0.08);
    // 반딧불
    const ffOn = Math.max(0, SKY.star - 0.45) / 0.55; fireflies.visible = ffOn > 0.02;
    if (fireflies.visible) { for (let i = 0; i < FF; i++) { const f = ffBase[i], k = t * f.sp + f.ph; ffPos[i * 3] = f.x + Math.sin(k * 0.9) * 0.9; ffPos[i * 3 + 1] = f.y + Math.sin(k * 1.7) * 0.25; ffPos[i * 3 + 2] = f.z + Math.cos(k * 0.7) * 0.9; const b = ffOn * Math.max(0, Math.sin(k * 2.3)) ** 2; ffCol[i * 3] = b; ffCol[i * 3 + 1] = b * 0.95; ffCol[i * 3 + 2] = b * 0.45; } ffGeo.attributes.position.needsUpdate = true; ffGeo.attributes.color.needsUpdate = true; }
    // 섬 아래 빛 띠 · 떠다니는 바위 · 원경 띠
    band.rotation.y = t * 0.02; belt.rotation.y = t * 0.004; ringed.rotation.y = t * 0.01;
    fl.forEach((f, i) => { const a = f.a + t * f.sp; m4.compose(pv.set(Math.sin(a) * f.r, f.y + Math.sin(t * 0.6 + i) * 0.35, Math.cos(a) * f.r), q.setFromEuler(new THREE.Euler(f.rx + t * 0.2, t * 0.15 + i, 0)), sc.setScalar(f.s)); floaters.setMatrixAt(i, m4); }); floaters.instanceMatrix.needsUpdate = true;
    // 내 발걸음: 먼지 + 소리(돌길은 또각, 풀밭은 사각)
    const p = player.root.position;
    if (player.moving && EXT.spawned() && p.y < 0.01) { pDustT -= dt; stepT -= dt; if (pDustT <= 0) { pDustT = 0.11; puff(p.x - Math.sin(player.root.rotation.y) * 0.2, p.z - Math.cos(player.root.rotation.y) * 0.2, 1, 0.8); } if (stepT <= 0) { stepT = 0.3; snd.step(onPave(p.x, p.z)); } } else { stepT = 0.05; }
    stepDust(dt); stepNpcs(dt, now); stepMeteors(now); stepShards(now, t); stepSkyEvents(now);
    tickMs = tickMs * 0.95 + (performance.now() - t0) * 0.05; // 이 모듈이 한 프레임에 쓰는 시간(시험용 기록)
  });

  // 시험용 손잡이(화면엔 안 보임)
  window.__life = {
    setHour(h) { FORCE.h = h; applySky(performance.now(), true); }, shower(v) { FORCE.shower = v; }, drop: () => dropShard(), dropNear(d = 2.2) { const p = player.root.position; const a = player.root.rotation.y; return dropShard([p.x + Math.sin(a) * d, p.z + Math.cos(a) * d]); },
    talk: (i = 0) => npcs[i] && talk(npcs[i]), get npcs() { return npcs.map(n => ({ id: n.def.id, mode: n.mode, x: +n.root.position.x.toFixed(2), z: +n.root.position.z.toFixed(2) })); }, get shards() { return shards.length; }, picks: () => recentPicks(), sky: () => ({ h: hourNow(), ...SKY }), snd,
    get ms() { return +tickMs.toFixed(3); },
    simulate(sec = 10) { let now = performance.now(); for (let i = 0; i < sec * 20; i++) { now += 50; stepNpcs(0.05, now); } return this.npcs; }, // 그림 없이 NPC 걸음만 앞당겨 본다
    wipe(id = 'cab-merge', freeze) { const f = EXT.facOf[id]; wipe(f, () => {}, freeze); }, // 시험용: 이동 없이 와이프만(freeze = 그 칸에서 멈춤)
    objs: () => [grass, flowers, stems, dust, band, floaters, belt, ringed, lampGlow, fireflies, ...MPOOL, ...npcs.map(n => n.root)], // 시험용: 이 모듈이 더한 그림
  };
}
