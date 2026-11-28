/* dwk-doom.js — 릴스 「돈워너노우호」 v13 앞부분 3D 세계를 사이트로 옮긴 한 벌(2026-11-28 · 편장부 H33)
   대표 원문(11-28): 「영상 처음이랑 실제로 게임하는거랑 달라서 좀 몰입감이 깨진다 게임을 디벨롭 시켜야할듯.」
   원본 = reports/돈워너노우_manseok_ship_20261127/제작/scenes/ship2.js(릴스 장면 코드) — 선체 윤곽·금속 패널·청록 띠·창 셰이더·정거장 고리·트러스 팔·엔진·빨간 격자 탑·용암 균열 지구를 같은 수치로 옮겼다.
   릴스 쪽 코드는 손대지 않는다(읽기만). 여기 수치를 바꾸면 릴스와 어긋나니 ship2.js 와 나란히 보고 고친다.

   makeSilverShip(THREE, { seats, boarded, S })  → { group, door, doors, windows, radius, height, setBoarded(n), tick(dt, t, camera), towerAt }
       릴스 배(좌석 100,000 · 은색 금속 원통 · 창 100,000개 · 발사대 고리 · 빨간 철골 탑 · 탑승 다리 4개)를 S배로. 바닥(엔진 끝) = y 0.
       탑승한 사람 수만큼 문 가까운 창부터 객실 불이 켜진다(릴스 「벌써 2,909명이 탔어」 컷과 같은 순서).
   makeLander(THREE)  → makeShip 과 같은 모양의 약속({ group, flame, seat, window, setThrust, tick }) · 은색 소형 착륙선(릴스 15줄 착륙선 결)
   makeDoomEarth(THREE, { R })  → { group, tick(dt, t) } 용암 균열 지구 + 불타는 대기 + 운석 · 중심 (0,0,0)
   doomSky(THREE, H)  → { group, tick(t) } 거의 검정 하늘 + 반짝이는 별 3,200개(무한 거리)
   deckTexture(THREE, rep) → 발사대 갑판 무늬(어두운 금속 격자 + 노란 원) */

const hash = (i) => { let n = Math.imul(i | 0, 374761393) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; };
const rng = (seed) => { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 16807) % 2147483647 + 2147483647) % 2147483647) / 2147483647; };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

function canvasTex(THREE, w, h, draw, srgb = true, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8; return t; }
// 선체 금속 패널(ship2.js panelSet 그대로)
function panelSet(THREE, seed, rep, tone = 1) {
  const r = rng(seed), N = 8, S = 1024, cs = S / N; const cells = []; for (let i = 0; i < N * N; i++) cells.push({ v: r(), sub: r() < 0.35, stripe: r() < 0.025 ? (r() < 0.5 ? 1 : 2) : 0, dark: r() < 0.08 });
  const draw = (mode) => (g) => {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = cells[j * N + i]; const x = i * cs, y = j * cs;
      if (mode === 'col') { const b = Math.round((140 + (c.v - 0.5) * 16 - (c.dark ? 22 : 0)) * tone); g.fillStyle = `rgb(${b},${b + 5},${b + 12})`; }
      else if (mode === 'rough') { const b = Math.round(96 + c.v * 70); g.fillStyle = `rgb(${b},${b},${b})`; } else g.fillStyle = '#fff';
      g.fillRect(x, y, cs, cs);
      if (c.stripe && mode === 'col') { g.fillStyle = c.stripe === 1 ? '#c46a26' : '#2f5f9a'; g.fillRect(x, y + cs * 0.42, cs, cs * 0.12); }
      const line = (x0, y0, x1, y1, wd) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineWidth = wd; g.stroke(); };
      g.strokeStyle = mode === 'col' ? 'rgba(52,56,64,0.6)' : mode === 'rough' ? '#e6e6e6' : '#000'; line(x, y, x + cs, y, 3); line(x, y, x, y + cs, 3);
      if (c.sub) { g.strokeStyle = mode === 'col' ? 'rgba(50,55,62,0.55)' : mode === 'rough' ? '#cfcfcf' : '#555'; line(x + cs / 2, y, x + cs / 2, y + cs, 2); }
      g.fillStyle = mode === 'col' ? 'rgba(200,205,212,0.8)' : mode === 'rough' ? '#606060' : '#333';
      for (const [a, b] of [[8, 8], [cs - 8, 8], [8, cs - 8], [cs - 8, cs - 8]]) { g.beginPath(); g.arc(x + a, y + b, 2.6, 0, 6.283); g.fill(); } } };
  return { map: canvasTex(THREE, S, S, draw('col'), true, rep), rough: canvasTex(THREE, S, S, draw('rough'), false, rep), bump: canvasTex(THREE, S, S, draw('bump'), false, rep) };
}
export function deckTexture(THREE, rep = [6, 6]) {
  return canvasTex(THREE, 1024, 1024, (g, w, h) => { g.fillStyle = '#3c4048'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2d33'; g.lineWidth = 3; for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    g.strokeStyle = '#c9a227'; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, 300, 0, 6.283); g.stroke(); }, true, rep);
}

// ───────── 창 셰이더(ship2.js WIN_VS/WIN_FS 에서 고개 돌림·훑기만 뺀 판) ─────────
const WIN_VS = `
attribute float aLit; attribute float aSeed;
varying vec2 vUv; varying float vLit, vSeed; varying vec3 vN, vW;
void main(){ vUv = uv; vLit = aLit; vSeed = aSeed; mat4 m = modelMatrix * instanceMatrix; vec4 wp = m * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(m) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp; }`;
const WIN_FS = `
uniform vec3 uKeyDir, uCamPos; uniform float uAsp, uTime, uMark;
varying vec2 vUv; varying float vLit, vSeed; varying vec3 vN, vW;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 p = vUv - 0.5; p.y *= uAsp; vec2 hb = vec2(0.5, 0.5 * uAsp);
  float dO = sdRR(p, hb, 0.2); if (dO > 0.0) discard;
  vec2 gb = hb - vec2(0.12, 0.12); float dG = sdRR(p, gb, 0.13);
  vec3 N = normalize(vN), Vd = normalize(uCamPos - vW), L = normalize(uKeyDir);
  float ndl = max(dot(N, L), 0.0); float bev = smoothstep(0.0, -0.05, dO) * smoothstep(-0.005, 0.03, dG);
  vec3 frame = vec3(0.46, 0.49, 0.54) * (0.18 + 0.85 * ndl) * (0.75 + 0.35 * bev) + vec3(1.0) * pow(max(dot(reflect(-L, N), Vd), 0.0), 40.0) * 0.5;
  vec2 g = p / gb;
  float fres = pow(1.0 - max(dot(N, Vd), 0.0), 3.0);
  vec3 dark = mix(vec3(0.010, 0.013, 0.022), vec3(0.05, 0.07, 0.11), smoothstep(-0.8, 0.9, g.y + g.x * 0.3)) + vec3(0.55, 0.65, 0.8) * fres * 0.3;
  vec3 room = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.82, 0.52), smoothstep(-1.0, 1.0, g.y)) * 1.25;
  float back = sdRR(g - vec2(0.0, -0.30), vec2(0.56, 0.62), 0.3); float headR = sdRR(g - vec2(0.0, 0.52), vec2(0.34, 0.16), 0.14);
  vec3 inside = mix(room, vec3(0.20, 0.13, 0.12), smoothstep(0.03, -0.03, min(back, headR)) * 0.85);
  float side = vSeed > 0.5 ? 1.0 : -1.0; float bob = sin(uTime * 1.3 + vSeed * 40.0) * 0.03;
  vec2 hc = vec2(side * 0.07, 0.20 + bob);
  float head = length((g - hc) * vec2(1.0, 0.92)) - 0.30; float nose = length(g - (hc + vec2(side * 0.30, -0.04))) - 0.085;
  float neck = sdRR(g - vec2(hc.x * 0.6, -0.16), vec2(0.12, 0.12), 0.05); float sh = sdRR(g - vec2(0.0, -0.62), vec2(0.62, 0.36), 0.32);
  float pax = min(min(min(head, nose), neck), sh);
  inside = mix(inside, vec3(0.045, 0.035, 0.04), smoothstep(0.03, -0.03, pax));
  inside += vec3(1.0, 0.75, 0.45) * smoothstep(0.07, 0.0, abs(pax)) * 0.45 * smoothstep(-0.2, 0.3, g.y);
  inside *= 0.62 + 0.38 * smoothstep(1.3, 0.1, length(g));
  float empty = 1.0 - clamp(vLit, 0.0, 1.0);
  float rim = smoothstep(0.06, 0.0, abs(dG + 0.02)); dark += vec3(0.35, 0.85, 1.0) * uMark * empty * (0.35 + 0.65 * rim) * (0.75 + 0.25 * sin(uTime * 6.0 + vSeed * 6.28));
  vec3 glass = mix(dark, inside, clamp(vLit, 0.0, 1.5)) + vec3(0.6, 0.7, 0.85) * fres * 0.12;
  gl_FragColor = vec4(mix(frame, glass, smoothstep(0.005, -0.005, dG)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeSilverShip(THREE, { seats = 100000, boarded = 0, S = 2.0, tower = true, lite = false } = {}) {   // lite: 휴대폰 — 창 격자를 가로·세로 절반(약 25,000개)으로, 켜지는 비율은 그대로
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const R = 1.2, DECK_Y = -5.35;
  const hullP = (ph, yl, off = 0) => V((R + off) * Math.sin(ph), (R + off) * Math.cos(ph), -yl);
  const hullN = (ph) => V(Math.sin(ph), Math.cos(ph), 0), hullT = (ph) => V(Math.cos(ph), -Math.sin(ph), 0), AX = V(0, 0, -1);
  const hullW = (ph, yl, off = 0) => V((R + off) * Math.sin(ph), yl, (R + off) * Math.cos(ph));
  const outer = new THREE.Group(); outer.name = 'silverShip';
  const frame = new THREE.Group(); frame.scale.setScalar(S); frame.position.y = -DECK_Y * S; outer.add(frame);   // 릴스 좌표(갑판 y=-5.35) → 사이트(바닥 y=0)
  const rig = new THREE.Group(); rig.rotation.x = Math.PI / 2; frame.add(rig);
  const ship = new THREE.Group(); rig.add(ship);
  const hullSet = panelSet(THREE, 11, [6, 5]);
  const metal = (o = {}) => new THREE.MeshStandardMaterial({ map: hullSet.map, roughnessMap: hullSet.rough, bumpMap: hullSet.bump, bumpScale: 1.2, metalness: 0.72, roughness: 0.85, envMapIntensity: 1.0, ...o });
  // 선체(ship2.js 윤곽 그대로)
  const prof = []; const addP = (r, y) => prof.push(new THREE.Vector2(r, y));
  addP(0.0, 7.45); for (let i = 1; i <= 14; i++) { const k = i / 14; addP(0.02 + 1.18 * Math.sin(k * Math.PI / 2) ** 0.85, 7.45 - 2.3 * (1 - Math.cos(k * Math.PI / 2)) ** 0.7); }
  for (let i = 1; i <= 24; i++) addP(R, 5.15 - 6.7 * i / 24);
  addP(R + 0.05, -1.62); addP(R + 0.12, -1.7); addP(1.42, -1.78); addP(1.55, -1.95); for (let i = 1; i <= 8; i++) addP(1.55, -1.95 - 1.9 * i / 8); addP(1.5, -3.95); addP(1.32, -4.12); addP(1.12, -4.2); addP(0.0, -4.22);
  const hullG = new THREE.LatheGeometry(prof, lite ? 96 : 160); hullG.rotateX(-Math.PI / 2); hullG.computeVertexNormals();
  const hull = new THREE.Mesh(hullG, metal()); hull.castShadow = true; hull.receiveShadow = true; ship.add(hull);
  const rOf = (yl) => { for (let i = 1; i < prof.length; i++) { const a = prof[i - 1], b = prof[i]; if ((a.y - yl) * (b.y - yl) <= 0 && a.y !== b.y) return lerp(a.x, b.x, (yl - a.y) / (b.y - a.y)); } return R; };
  const glowMat = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
  const bandMat = glowMat('#5fe8ff', 2.2);
  for (const yl of [5.05, -1.5, -3.85]) { const t = new THREE.Mesh(new THREE.TorusGeometry(rOf(yl) + 0.012, 0.011, 8, 200), bandMat); t.position.z = -yl; ship.add(t); }
  for (const ph of [Math.PI / 2, -Math.PI / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 6.4), glowMat('#7ff0ff', 1.4)); b.position.copy(hullP(ph, 1.9, 0.01)); b.rotation.z = -ph; ship.add(b); }
  // 탑승 문 4개 · 창 100,000(문에서 가까운 순으로 불이 켜짐)
  const PHD = Math.PI - 0.45, BH = [-0.9, 0.6, 2.1, 3.6], ARM_YL = 3.75;
  const NC = lite ? 181 : 362, NR = lite ? 148 : 296, Y0 = -1.25, Y1 = 4.85, WW = lite ? 0.027 : 0.0135, WH = lite ? 0.033 : 0.0165;
  const N = Math.min(seats, NC * NR), RATIO = N / seats;   // 창 1개 = 좌석 seats/N 개(휴대폰 판)
  let cand = []; for (let j = 0; j < NR; j++) for (let i = 0; i < NC; i++) { const ph = (i + (j % 2) * 0.5) / NC * 2 * Math.PI - Math.PI; const yl = Y0 + (Y1 - Y0) * j / (NR - 1);
    let dd = ph - PHD; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    let nearDoor = 1e9; for (const b of BH) nearDoor = Math.min(nearDoor, Math.hypot(dd * R, (yl - b) * 0.9));
    if (Math.abs(dd * R) < 0.2 && BH.some((b) => Math.abs(yl - b) < 0.23)) continue;
    if (Math.abs(yl - ARM_YL) < 0.3 && Math.abs(Math.cos(ph)) < 0.3) continue;
    cand.push({ ph, yl, key: nearDoor * (1 + 0.5 * Math.max(0, -Math.sin(ph))) + 0.18 * (hash(i * 7 + j * 131) - 0.5) + 0.08 * Math.sin(ph * 5 + yl * 3) }); }
  cand.sort((a, b) => a.key - b.key); const wins = cand.slice(0, N); cand = null;
  const winG = new THREE.PlaneGeometry(1, WH / WW);
  const winU = { uKeyDir: { value: V(0.4, 0.8, 0.5) }, uCamPos: { value: V(0, 0, 0) }, uAsp: { value: WH / WW }, uTime: { value: 0 }, uMark: { value: 0.35 } };
  const winI = new THREE.InstancedMesh(winG, new THREE.ShaderMaterial({ uniforms: winU, vertexShader: WIN_VS, fragmentShader: WIN_FS }), N); winI.frustumCulled = false;
  const aLit = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), aSeed = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  winG.setAttribute('aLit', aLit); winG.setAttribute('aSeed', aSeed);
  const winFrame = (w) => { const m = new THREE.Matrix4().makeBasis(hullT(w.ph), AX.clone(), hullN(w.ph)); m.setPosition(hullP(w.ph, w.yl, 0.0035)); return m.scale(V(WW, WW, WW)); };
  wins.forEach((w, i) => { aSeed.array[i] = hash(i * 11 + 5); winI.setMatrixAt(i, winFrame(w)); }); ship.add(winI);
  // 켜진 창의 번짐(켜진 만큼만 그린다)
  const haloG = new THREE.PlaneGeometry(3.6, 3.6); const haloU = { uK: { value: 0.32 } };
  const haloI = new THREE.InstancedMesh(haloG, new THREE.ShaderMaterial({ uniforms: haloU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 wp = modelMatrix * instanceMatrix * vec4(position + vec3(0.,0.,0.08), 1.0); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform float uK; varying vec2 vUv; void main(){ float d = length(vUv - .5) * 2.; float k = exp(-d * d * 5.) * uK; gl_FragColor = vec4(vec3(1.0, .62, .28) * k, 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }), N);
  haloI.frustumCulled = false; haloI.renderOrder = 3; wins.forEach((w, i) => haloI.setMatrixAt(i, winFrame(w))); ship.add(haloI);
  function setBoarded(n) { const k = clamp(Math.round(n * RATIO), n > 0 ? 1 : 0, N); for (let i = 0; i < N; i++) aLit.array[i] = i < k ? 1 : 0; aLit.needsUpdate = true; haloI.count = k; return k; }
  setBoarded(boarded);
  // 탑승 문(빛나는 입구 + 테)
  const doorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.6) });
  const doorShape = (() => { const s = new THREE.Shape(); const w = 0.26, h = 0.34, r = 0.06; s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; })();
  const doors = BH.map((yl) => { const g = new THREE.Group(); const m = new THREE.Matrix4().makeBasis(hullT(PHD), AX.clone(), hullN(PHD)); m.setPosition(hullP(PHD, yl, 0.004)); g.applyMatrix4(m);
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(doorShape, 8), doorMat)); const fr = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 40), metal({ map: null, color: '#c9ced6', roughness: 0.35 })); fr.scale.set(0.75, 0.95, 1); g.add(fr); ship.add(g); return g; });
  // 정거장 고리 · 팔 · 조종석 띠 · 안테나 · 엔진
  const ringG = new THREE.Group(); ringG.position.z = 2.9; ship.add(ringG);
  const ringSet = panelSet(THREE, 23, [40, 2], 0.95);
  const ringEm = canvasTex(THREE, 1024, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let i = 0; i < 64; i++) { g.fillStyle = hash(i * 13) < 0.55 ? '#ffcf8a' : '#1a2230'; g.fillRect(i * 16 + 4, h * 0.44, 8, h * 0.12); } }, true, [10, 1]);
  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.3, 24, 200), metal({ map: ringSet.map, roughnessMap: ringSet.rough, bumpMap: ringSet.bump, emissive: '#ffffff', emissiveMap: ringEm, emissiveIntensity: 1.4 })); ringMesh.castShadow = true; ringG.add(ringMesh);
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 2.3, 16), metal()); sp.position.set(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0); sp.rotation.z = a - Math.PI / 2; ringG.add(sp); }
  const ringLights = []; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set(Math.cos(a) * 4.0, Math.sin(a) * 4.0, -0.3); ringG.add(m); ringLights.push(m); }
  const trussMat = new THREE.MeshStandardMaterial({ color: '#9aa2ad', metalness: 0.72, roughness: 0.4 });
  const navs = []; const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 6);
  for (const s of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(s * R * 0.98, 0, -ARM_YL); ship.add(arm); const L = 3.0;
    const parts = []; const cyl = (a, b, r) => { const d = b.clone().sub(a); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); parts.push(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(r, d.length(), r))); };
    const c = [[0.12, 0.12], [0.12, -0.12], [-0.12, -0.12], [-0.12, 0.12]]; const NSEG = 10;
    for (const [y, z] of c) cyl(V(0, y, z), V(s * L, y, z), 0.016);
    for (let i = 0; i <= NSEG; i++) { const x = s * L * i / NSEG; for (let k = 0; k < 4; k++) { const [y0, z0] = c[k], [y1, z1] = c[(k + 1) % 4]; cyl(V(x, y0, z0), V(x, y1, z1), 0.011); if (i < NSEG) cyl(V(x, y0, z0), V(x + s * L / NSEG, y1, z1), 0.009); } }
    const im = new THREE.InstancedMesh(unitCyl, trussMat, parts.length); parts.forEach((m, i) => im.setMatrixAt(i, m)); arm.add(im);
    const mod = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 8, 24), metal()); mod.rotation.x = Math.PI / 2; mod.position.x = s * (L + 0.25); mod.castShadow = true; arm.add(mod);
    const radTex = canvasTex(THREE, 512, 256, (g, w, h) => { g.fillStyle = '#1b2a44'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4d6a96'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    for (const z of [-0.55, 0.55]) { const rad = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.02, 0.62), new THREE.MeshStandardMaterial({ map: radTex, metalness: 0.5, roughness: 0.35, envMapIntensity: 1.4 })); rad.position.set(s * 1.55, 0, z); arm.add(rad); }
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: s < 0 ? '#ff2a2a' : '#2aff6a' })); nav.position.set(s * (L + 0.85), 0, 0); arm.add(nav); navs.push(nav); }
  { const yl = 6.25, r = rOf(yl); const cockTex = canvasTex(THREE, 1024, 64, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, 64); for (let i = 0; i < 48; i++) { g.fillStyle = '#9fe8ff'; g.fillRect(i * (w / 48) + 4, 18, w / 48 - 8, 28); } });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, rOf(yl - 0.18) + 0.004, 0.18, 128, 1, true), new THREE.MeshStandardMaterial({ color: '#0a1220', metalness: 0.2, roughness: 0.1, emissive: '#ffffff', emissiveMap: cockTex, emissiveIntensity: 2.0 }));
    band.rotation.x = -Math.PI / 2; band.position.z = -(yl - 0.09); ship.add(band); }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 1.1, 8), trussMat); ant.rotation.x = Math.PI / 2; ant.position.z = -7.95; ship.add(ant);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })); strobe.position.z = -8.5; ship.add(strobe);
  const eng = new THREE.Group(); eng.position.z = 4.2; ship.add(eng);
  const nozMat = new THREE.MeshStandardMaterial({ color: '#4b4f57', metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const nozProf = []; for (let i = 0; i <= 16; i++) { const k = i / 16; nozProf.push(new THREE.Vector2(0.13 + 0.15 * k * k + 0.02 * k, -k * 0.85)); }
  const nozG = new THREE.LatheGeometry(nozProf, 40); nozG.rotateX(-Math.PI / 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fc6ff') });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; const g = new THREE.Group(); g.position.set(Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.02); eng.add(g);
    g.add(new THREE.Mesh(nozG, nozMat)); const core = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), coreMat); core.position.z = 0.03; g.add(core); }
  const ringE = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.06, 16, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color('#58b8ff') })); ringE.position.z = 0.08; eng.add(ringE);
  // 발사대(작은 판 · 받침 집게 4개 · 바닥 등) — 릴스 갑판의 가운데 부분
  const padTex = deckTexture(THREE, [1.4, 1.4]);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.9, 0.18, 72), new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.85, metalness: 0.3 })); pad.position.y = DECK_Y + 0.09; pad.receiveShadow = true; frame.add(pad);
  const trench = new THREE.Mesh(new THREE.CircleGeometry(1.9, 48), new THREE.MeshBasicMaterial({ color: '#050506' })); trench.rotation.x = -Math.PI / 2; trench.position.y = DECK_Y + 0.185; frame.add(trench);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; const c = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: '#5a5f68', metalness: 0.7, roughness: 0.5 })); c.position.set(Math.cos(a) * 1.75, DECK_Y + 0.43, Math.sin(a) * 1.75); c.rotation.y = -a; c.castShadow = true; frame.add(c); }
  const deckLights = []; for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283; const m = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); m.position.set(Math.cos(a) * 2.75, DECK_Y + 0.19, Math.sin(a) * 2.75); frame.add(m); deckLights.push(m); }
  // 서비스 탑(빨간 격자) + 탑승 다리 4개(탑 → 문)
  const TW = V(2.3, 0, -5.0), TS = 1.0, TTOP = 4.6; const towerG = new THREE.Group(); let beacon = null;
  if (tower) { frame.add(towerG);
    const parts = []; const tm = new THREE.MeshStandardMaterial({ color: '#b9433a', metalness: 0.5, roughness: 0.55 });
    const memb = (a, b, r) => { const d = b.clone().sub(a); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); parts.push(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V(r, d.length(), r))); };
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [TW.x + x * TS / 2, TW.z + z * TS / 2]);
    for (const [x, z] of cs) memb(V(x, DECK_Y, z), V(x, TTOP, z), 0.045);
    const NL = 16; for (let i = 0; i <= NL; i++) { const y = DECK_Y + (TTOP - DECK_Y) * i / NL; for (let k = 0; k < 4; k++) { const [x0, z0] = cs[k], [x1, z1] = cs[(k + 1) % 4]; memb(V(x0, y, z0), V(x1, y, z1), 0.025); if (i < NL) { const y2 = DECK_Y + (TTOP - DECK_Y) * (i + 1) / NL; memb(V(x0, y, z0), V(x1, y2, z1), 0.018); } } }
    const im = new THREE.InstancedMesh(unitCyl, tm, parts.length); parts.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; towerG.add(im);
    beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3a2a' })); beacon.position.set(TW.x, TTOP + 0.15, TW.z); towerG.add(beacon);
    const elev = new THREE.Mesh(new THREE.BoxGeometry(TS * 0.7, TTOP - DECK_Y, TS * 0.7), new THREE.MeshStandardMaterial({ color: '#2b2f36', metalness: 0.4, roughness: 0.6 })); elev.position.set(TW.x, (TTOP + DECK_Y) / 2, TW.z); towerG.add(elev);
    const tbase = new THREE.Mesh(new THREE.BoxGeometry(TS * 1.6, 0.18, TS * 1.6), new THREE.MeshStandardMaterial({ map: padTex, roughness: 0.85, metalness: 0.3 })); tbase.position.set(TW.x, DECK_Y + 0.09, TW.z); towerG.add(tbase);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: '#a7adb6', metalness: 0.6, roughness: 0.45 }), railMat = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 0.7, roughness: 0.3 });
    const bLightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe9ff').multiplyScalar(2) });
    for (const y of BH) { const door = hullW(PHD, y, 0.02); const st = V(TW.x, y, TW.z).add(door.clone().setY(y).sub(V(TW.x, y, TW.z)).normalize().multiplyScalar(TS * 0.5));
      const d = door.clone().sub(st); const len = d.length(); const g = new THREE.Group(); g.position.copy(st).add(door).multiplyScalar(0.5); g.rotation.y = Math.atan2(d.x, d.z); towerG.add(g);
      const walk = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, len), bridgeMat); walk.position.y = -0.02; walk.castShadow = true; g.add(walk);
      for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, len), railMat); rail.position.set(s * 0.23, 0.075, 0); g.add(rail); const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.006, len), bLightMat); strip.position.set(s * 0.215, 0.002, 0); g.add(strip); } } }
  // 한 번 그려 보고 늘 그린다 — 바깥 장면의 그림자를 받게
  outer.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.material && !o.material.isMeshBasicMaterial && !o.material.isShaderMaterial) o.receiveShadow = true; });
  // 바깥에서 쓰는 자리(사이트 좌표 · outer 기준)
  const toOuter = (v) => V(v.x * S, (v.y - DECK_Y) * S, v.z * S);
  const doorPts = BH.map((y) => toOuter(hullW(PHD, y, 0)));
  const doorDir = Math.atan2(Math.sin(PHD), Math.cos(PHD));   // 문이 바라보는 방향(atan2(x, z)) — 사이트에서 이만큼 돌려 맞춘다
  const _cp = new THREE.Vector3();
  return {
    group: outer, doors: doorPts, door: doorPts[0], doorDir, radius: R * S, height: (8.55 - DECK_Y) * S, towerAt: tower ? toOuter(TW) : null, windows: N, setBoarded,
    tick(dt, t, camera) {
      winU.uTime.value = t; if (camera) { camera.getWorldPosition(_cp); winU.uCamPos.value.copy(_cp); }
      ringG.rotation.z = t * 0.05; ringLights.forEach((m, i) => { m.visible = Math.floor(t * 2 + i * 0.5) % 4 !== 0; });
      navs.forEach((n) => { n.visible = Math.sin(t * 3.2) > -0.2; }); strobe.visible = (t % 1.6) < 0.08; if (beacon) beacon.visible = Math.sin(t * 2.4) > 0;
      deckLights.forEach((m, i) => m.material.color.setScalar((Math.floor(t * 6) + i) % 8 === 0 ? 2.2 : 0.9));
      haloU.uK.value = 0.32 + Math.sin(t * 1.3) * 0.03;
    },
  };
}

// ───────── 착륙선(작은 은색 · makeShip 약속 그대로) ─────────
// 릴스 15줄 「그 행성에서 살아남아야 해」의 착륙선 결 + 본선 금속 패널·청록 띠 · 키 약 2.6 · 바닥 y=0
export function makeLander(THREE) {
  const g = new THREE.Group();
  const set = panelSet(THREE, 31, [3, 2]);
  const metal = (o = {}) => new THREE.MeshStandardMaterial({ map: set.map, roughnessMap: set.rough, bumpMap: set.bump, bumpScale: 1.0, metalness: 0.72, roughness: 0.75, envMapIntensity: 1.1, ...o });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  // 몸통: 둥근 머리 원통(본선 윤곽을 짧게)
  const prof = []; prof.push(new THREE.Vector2(0.0, 2.35)); for (let i = 1; i <= 12; i++) { const k = i / 12; prof.push(new THREE.Vector2(0.02 + 0.6 * Math.sin(k * Math.PI / 2) ** 0.85, 2.35 - 0.75 * (1 - Math.cos(k * Math.PI / 2)) ** 0.7)); }
  prof.push(new THREE.Vector2(0.62, 1.2), new THREE.Vector2(0.62, 0.62), new THREE.Vector2(0.7, 0.55), new THREE.Vector2(0.7, 0.36), new THREE.Vector2(0.55, 0.3), new THREE.Vector2(0.0, 0.29));
  add(new THREE.LatheGeometry(prof, 64), metal());
  const band = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5fe8ff').multiplyScalar(2.0) });
  for (const y of [1.55, 0.6]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.012, 8, 96), band); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  // 창(앞 · 노란 객실 불빛)
  const win = add(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc27a').multiplyScalar(1.4) }), 0, 1.25, 0.623);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 8, 32), metal({ map: null, color: '#c9ced6', roughness: 0.3 })); rim.position.set(0, 1.25, 0.63); g.add(rim);
  // 다리 3개(접이식 · 발판)
  const legM = new THREE.MeshStandardMaterial({ color: '#9aa2ad', metalness: 0.75, roughness: 0.4 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + Math.PI / 6; const lg = new THREE.Group(); lg.rotation.y = a; g.add(lg);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), legM); st.position.set(0, 0.42, 0.78); st.rotation.x = 0.55; st.castShadow = true; lg.add(st);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 16), legM); foot.position.set(0, 0.03, 1.0); lg.add(foot); }
  // 엔진 + 청록 고리
  const noz = add(new THREE.CylinderGeometry(0.22, 0.34, 0.28, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#4b4f57', metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide }), 0, 0.16, 0);
  const ringE = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#58b8ff') })); ringE.rotation.x = Math.PI / 2; ringE.position.y = 0.03; g.add(ringE);
  const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff3a2a' })); strobe.position.y = 2.38; g.add(strobe);
  // 불꽃: 릴스 엔진 기둥 색(청백)
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x7fc6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 14, 1, true).rotateX(Math.PI), flameMat); flame.position.y = -0.45; g.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.8, 12, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); flame2.position.y = -0.3; g.add(flame2);
  const seat = new THREE.Object3D(); seat.position.set(0, 2.42, 0); g.add(seat);
  let thrust = 0, t = 0;
  return {
    group: g, flame, seat, window: win,
    setThrust(v) { thrust = Math.max(0, Math.min(1, v)); },
    tick(dt) { t += dt; const f = thrust * (0.85 + Math.sin(t * 40) * 0.15); flame.scale.set(0.6 + f * 0.6, Math.max(0.01, f * 1.6), 0.6 + f * 0.6); flame2.scale.set(1, Math.max(0.01, f * 1.4), 1); flame.visible = flame2.visible = thrust > 0.02; flameMat.opacity = 0.6 + f * 0.35; strobe.visible = (t % 1.4) < 0.1; },
  };
}

// ───────── 멸망 직전 지구(ship2.js v10 그대로 · 반지름만 바꿀 수 있게) ─────────
export function makeDoomEarth(THREE, { R = 60, rep = [5, 3], meteors = 6, meteorScale = 1, meteorBox = 1, lite = false } = {}) {
  const grp = new THREE.Group(); grp.name = 'doomEarth';
  const vnE = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const hh = (a, b) => hash((((a % 4093) + 4093) % 4093) * 7027 + b * 9157 + sd); const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf); return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), sx), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), sx), sy); };
  const fbE = (x, y, sd) => vnE(x, y, sd) * 0.5 + vnE(x * 2.03, y * 2.03, sd + 7) * 0.27 + vnE(x * 4.1, y * 4.1, sd + 13) * 0.15 + vnE(x * 8.3, y * 8.3, sd + 19) * 0.08;
  const earthCol = canvasTex(THREE, 1024, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * 12, v = y / h * 6; const n = fbE(u, v, 3); const land = sstep(0.48, 0.53, n); const burn = fbE(u * 1.7 + 5, v * 1.7, 11);
      let c = land ? [lerp(70, 115, burn), lerp(48, 62, burn), lerp(38, 40, burn)] : [lerp(12, 28, n), lerp(26, 44, n), lerp(46, 70, n)]; if (land) c = [lerp(c[0], 40, 0.3), lerp(c[1], 30, 0.3), lerp(c[2], 26, 0.3)];
      const i = (y * w + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); });
  const crackTex = canvasTex(THREE, 1024, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * 12, v = y / h * 6; const r1 = 1 - Math.abs(fbE(u * 1.3, v * 1.3, 41) * 2 - 1); const r2 = 1 - Math.abs(fbE(u * 3.1 + 3, v * 3.1, 57) * 2 - 1);
      const f = Math.pow(r1, 8) * 0.75 + Math.pow(r2, 14) * 0.45; const val = Math.min(255, f * 255); const i = (y * w + x) * 4; img.data[i] = val; img.data[i + 1] = val; img.data[i + 2] = val; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); }, false);
  for (const tx of [earthCol, crackTex]) tx.repeat.set(rep[0], rep[1]);
  const earthU = { uTh: { value: 0.55 }, uLava: { value: 3.0 }, uT: { value: 0 } };
  const earthMat = new THREE.MeshStandardMaterial({ map: earthCol, emissiveMap: crackTex, emissive: '#ffffff', roughness: 0.95, metalness: 0.0 });
  earthMat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, earthU); sh.fragmentShader = 'uniform float uTh, uLava, uT;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
    `float cf = texture2D( emissiveMap, vEmissiveMapUv ).r; float cr = smoothstep(uTh, uTh + 0.06, cf); float flick = 0.85 + 0.15 * sin(uT * 7.0 + cf * 40.0);
     totalEmissiveRadiance = mix(vec3(1.0, 0.22, 0.04), vec3(1.0, 0.75, 0.3), smoothstep(uTh + 0.05, uTh + 0.3, cf)) * cr * uLava * flick;`); };
  earthMat.customProgramCacheKey = () => 'doomEarth10';
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, lite ? 96 : 160, lite ? 56 : 96), earthMat); earth.rotation.set(Math.PI / 2, 0.6, 0); earth.receiveShadow = true; grp.add(earth);
  const atmU = { uC: { value: new THREE.Color('#ff5a1e') }, uK: { value: 1.0 }, uT: { value: 0 } };
  const fireAtm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 96, 48), new THREE.ShaderMaterial({ uniforms: atmU, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uK, uT; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float k = pow(clamp(-dot(normalize(vN), normalize(vV)), 0., 1.), 2.2) * uK; float fl = 0.8 + 0.2 * sin(uT * 5.0 + vP.x * 0.3) * sin(uT * 3.1 + vP.z * 0.2); gl_FragColor = vec4(uC * k * fl * 1.6, 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }));
  fireAtm.renderOrder = -1; grp.add(fireAtm);
  // 운석(하늘에서 지구로 떨어지는 불줄기 · 땅에 닿으면 번쩍)
  const meteorTex = canvasTex(THREE, 256, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,120,40,0)'); gr.addColorStop(0.75, 'rgba(255,170,80,0.55)'); gr.addColorStop(1, 'rgba(255,245,220,1)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w * 0.92, h * 0.2); g.arc(w * 0.92, h / 2, h * 0.3, -Math.PI / 2, Math.PI / 2); g.lineTo(0, h / 2); g.fill(); });
  const flashTex = canvasTex(THREE, 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.3, 'rgba(255,120,40,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const ms = Array.from({ length: meteors }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), new THREE.MeshBasicMaterial({ map: meteorTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.renderOrder = 5; grp.add(m);
    const r = rng(300 + i); const imp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); grp.add(imp);
    // 떨어질 땅 자리: 지구 위쪽 둘레(사이트 땅 가까이 · 광장 둘레 먼 곳)
    const a = r() * Math.PI * 2, lat = 0.12 + r() * 0.25; const to = new THREE.Vector3(Math.cos(a) * Math.sin(lat), Math.cos(lat), Math.sin(a) * Math.sin(lat)).multiplyScalar(R);
    const from = to.clone().add(new THREE.Vector3((r() - 0.5) * 80, 60 + r() * 50, (r() - 0.5) * 80).multiplyScalar(meteorBox));
    return { m, imp, per: 2.2 + r() * 1.6, ph: r() * 3, from, to, sc: (6 + r() * 6) * meteorScale }; });
  const _d = new THREE.Vector3(), _X = new THREE.Vector3(1, 0, 0);
  return { group: grp, earth, fireAtm, R,
    tick(dt, t, camera) {
      earthU.uT.value = t; atmU.uT.value = t;
      for (const o of ms) { const k = ((t + o.ph) % o.per) / o.per; const fly = Math.min(1, k / 0.55);
        o.m.visible = k < 0.55; if (o.m.visible) { o.m.position.lerpVectors(o.from, o.to, fly); _d.subVectors(o.to, o.from).normalize(); o.m.scale.set(o.sc, o.sc, 1);
          o.m.quaternion.setFromUnitVectors(_X, _d); }
        const f = k >= 0.55 ? Math.max(0, 1 - (k - 0.55) / 0.3) : 0; o.imp.position.copy(o.to); o.imp.scale.setScalar(o.sc * 2.2 * (0.6 + f)); o.imp.material.opacity = f; }
    } };
}

// ───────── 하늘(ship2.js 그대로: 거의 검정 + 옅은 구름 + 별 3,200 · 무한 거리) ─────────
export function doomSky(THREE, H = 1920, { horizon = 0 } = {}) {   // horizon: 지평선 붉은 불빛 세기(땅이 타는 지구일 때 · 릴스 멸망 컷의 붉은 대기)
  const grp = new THREE.Group();
  const skyU = { uHz: { value: horizon }, uT: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform float uHz, uT; varying vec3 vD; float h(vec3 p){ p = fract(p*vec3(.1031,.103,.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }
      float n(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main(){ vec3 d = normalize(vD); float f = n(d*2.2)*.5 + n(d*5.1)*.3 + n(d*11.)*.2; vec3 c = vec3(.004,.005,.010);
        c += vec3(.035,.042,.075) * smoothstep(.45,.85,f) * .7 + vec3(.05,.025,.03) * smoothstep(.62,.9, n(d*3.1+7.)) * .35;
        c += vec3(.02,.03,.05) * smoothstep(0.1, -0.3, d.y);
        float hz = exp(-pow((d.y + 0.02) * 7.0, 2.0)) * (0.8 + 0.2 * n(d * 4.0 + vec3(uT * 0.05)));
        c += vec3(0.55, 0.12, 0.03) * hz * uHz + vec3(0.25, 0.05, 0.02) * smoothstep(0.35, -0.05, d.y) * uHz * 0.35;
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
      }` }));
  sky.frustumCulled = false; sky.renderOrder = -10; grp.add(sky);
  const starU = { uT: { value: 0 }, uS: { value: H / 1920 } };
  const r = rng(77); const N = 3200, Pp = new Float32Array(N * 3), A = new Float32Array(N), Ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { const z = r() * 2 - 1, a = r() * 6.283, s = Math.sqrt(1 - z * z); Pp.set([s * Math.cos(a) * 1200, z * 1200, s * Math.sin(a) * 1200], i * 3); A[i] = Math.pow(r(), 5) * 4.5 + 1.0; Ph[i] = r() * 6.28; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); g.setAttribute('a', new THREE.BufferAttribute(A, 1)); g.setAttribute('ph', new THREE.BufferAttribute(Ph, 1));
  const st = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: starU,
    vertexShader: 'attribute float a, ph; uniform float uS, uT; varying float vA; void main(){ vA = (.4 + .14*a) * (.75 + .25*sin(uT*2.1 + ph*7.)); gl_PointSize = a*uS*1.6; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(1.,.97,.92)*smoothstep(.5,0.,d)*vA, 1.); }' })); st.frustumCulled = false; st.renderOrder = -9; grp.add(st);
  return { group: grp, setHeight(h) { starU.uS.value = h / 1920; }, tick(t) { starU.uT.value = t; skyU.uT.value = t; } };
}

// ───────── 글씨 판(번호 · 내 땅) ─────────
export function labelSprite(THREE, text, { color = '#e8f4ff', bg = 'rgba(6,10,16,.78)', border = '#5fe8ff', h = 0.5, sub = '' } = {}) {
  const c = document.createElement('canvas'); const W = 512, H = sub ? 200 : 128; c.width = W; c.height = H; const x = c.getContext('2d');
  const F = "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif";
  x.font = `900 ${sub ? 68 : 72}px ${F}`; const tw = Math.min(W - 24, x.measureText(text).width + 56);
  const bx = (W - tw) / 2; x.fillStyle = bg; x.strokeStyle = border; x.lineWidth = 6; x.beginPath(); x.roundRect(bx, 6, tw, H - 12, 22); x.fill(); x.stroke();
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, sub ? 72 : H / 2 + 3);
  if (sub) { x.font = `800 46px ${F}`; x.fillStyle = border; x.fillText(sub, W / 2, 148); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false })); s.scale.set(h * W / H, h, 1); s.renderOrder = 20; return s;
}

// ───────── 새 행성(하나의 큰 행성 · 땅 100,000칸) ─────────
// 릴스 13줄 「도착하면 그 행성에 네 땅이 생겨」(편장부 H37: 모두 같은 거대한 행성 하나 · 좌석 번호 = 그 행성 위 내 땅 번호).
// 겉모습 = ship2.js 의 새 행성(초록·푸른 · 구름 · 청록 대기 테두리)과 같은 식 · 땅 위에 구획선(400×250 = 100,000칸)·구역선·이미 탄 사람들의 땅 불빛.
const PLOT_U = 400, PLOT_V = 250;
export function makeNewWorld(THREE, { boarded = 0, target = null } = {}) {
  const grp = new THREE.Group();
  const vn = (x, y, sd) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const hh = (a, b) => hash((((a % 4093) + 4093) % 4093) * 7027 + b * 9157 + sd); const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf); return lerp(lerp(hh(xi, yi), hh(xi + 1, yi), sx), lerp(hh(xi, yi + 1), hh(xi + 1, yi + 1), sx), sy); };
  const fb = (x, y, sd) => vn(x, y, sd) * 0.5 + vn(x * 2.03, y * 2.03, sd + 7) * 0.27 + vn(x * 4.1, y * 4.1, sd + 13) * 0.15 + vn(x * 8.3, y * 8.3, sd + 19) * 0.08;
  // uv(u: 0~1 경도, v: 0~1 위가 1) → 캔버스 픽셀식 (x/w*10, y/h*5)
  const landAt = (u, v) => fb(u * 10, (1 - v) * 5, 77) > 0.53;
  const edenTex = canvasTex(THREE, 1024, 512, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * 10, v = y / h * 5; const n = fb(u, v, 77); const land = sstep(0.5, 0.54, n); const cl = sstep(0.55, 0.75, fb(u * 1.6 + 9, v * 2.4, 91));
      let c = land ? [lerp(40, 110, n), lerp(120, 170, n), lerp(60, 70, n)] : [lerp(10, 30, n), lerp(80, 140, n), lerp(130, 190, n)]; c = [lerp(c[0], 245, cl * 0.85), lerp(c[1], 250, cl * 0.85), lerp(c[2], 255, cl * 0.85)];
      const i = (y * w + x) * 4; img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); });
  edenTex.wrapS = THREE.RepeatWrapping; edenTex.wrapT = THREE.ClampToEdgeWrapping;
  // 내 땅 자리: 앞쪽 북위 20° 둘레에서 땅인 칸을 고른다
  let tu = 0.3, tv = 0.62; if (target) [tu, tv] = target; else { let best = 9; for (let i = 0; i < 4000; i++) { const u = 0.18 + (i % 80) / 80 * 0.3, v = 0.56 + Math.floor(i / 80) / 50 * 0.14; if (!landAt(u, v) || !landAt(u + 0.01, v) || !landAt(u - 0.01, v) || !landAt(u, v + 0.012) || !landAt(u, v - 0.012)) continue; const d = Math.abs(u - 0.3) + Math.abs(v - 0.63); if (d < best) { best = d; tu = u; tv = v; } } }
  tu = (Math.floor(tu * PLOT_U) + 0.5) / PLOT_U; tv = (Math.floor(tv * PLOT_V) + 0.5) / PLOT_V;
  const dirOfUV = (u, v) => { const ph = u * Math.PI * 2, th = Math.PI * (1 - v); return new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); };
  const U = { uT: { value: 0 }, uFine: { value: 0 }, uTarget: { value: new THREE.Vector2(tu, tv) }, uMine: { value: 1 } };
  const mat = new THREE.MeshStandardMaterial({ map: edenTex, roughness: 0.8, emissive: '#123a2a', emissiveIntensity: 0.25 });
  mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U); sh.fragmentShader = 'uniform float uT, uFine, uMine; uniform vec2 uTarget;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { vec4 tx = texture2D(map, vMapUv); float land = smoothstep(0.0, 0.06, tx.g - tx.b) * (1.0 - smoothstep(0.75, 0.9, tx.b));
      vec2 fc = vMapUv * vec2(${PLOT_U}.0, ${PLOT_V}.0); vec2 fw = max(fwidth(fc), vec2(1e-4));
      vec2 gf = abs(fract(fc - 0.5) - 0.5) / fw; float lineF = 1.0 - min(min(gf.x, gf.y), 1.0);
      vec2 cc = vMapUv * vec2(20.0, 12.5); vec2 cw = max(fwidth(cc), vec2(1e-4)); vec2 gc = abs(fract(cc - 0.5) - 0.5) / (cw * 1.6); float lineC = 1.0 - min(min(gc.x, gc.y), 1.0);
      float fineVis = uFine * (1.0 - smoothstep(0.25, 0.6, max(fw.x, fw.y)));
      vec2 tc = floor(uTarget * vec2(${PLOT_U}.0, ${PLOT_V}.0)); vec2 myc = floor(fc); float isMe = step(abs(myc.x - tc.x) + abs(myc.y - tc.y), 0.5) * uMine;
      vec2 lc = fract(fc); float bd = min(min(lc.x, 1.0 - lc.x), min(lc.y, 1.0 - lc.y)); float myB = isMe * (1.0 - smoothstep(0.0, 0.14, bd));
      float pulse = 0.7 + 0.3 * sin(uT * 5.0);
      totalEmissiveRadiance += land * vec3(0.3, 0.85, 1.0) * (lineC * 0.22 + lineF * fineVis * 0.55) + vec3(1.0, 0.68, 0.2) * (myB * 3.2 + isMe * 0.5) * pulse; }`); };
  mat.customProgramCacheKey = () => 'newWorld1';
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat); grp.add(body);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.1, 96, 48), new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color('#7fffd0') } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main(){ float k = pow(clamp(-dot(normalize(vN), normalize(vV)), 0., 1.), 2.4) * 1.3; gl_FragColor = vec4(uC*k, 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' })); grp.add(atm);
  // 이미 탄 사람들의 땅 불빛(= 탑승 인원 수 · 내 땅 둘레 착륙 구역에 모여 있다)
  const r = rng(1225); const pts = []; for (let i = 0; pts.length < boarded && i < boarded * 40; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 0.11; const u = tu + Math.cos(a) * d, v = tv + Math.sin(a) * d * 0.62; if (!landAt(u, v)) continue;
    const cu = (Math.floor(u * PLOT_U) + 0.5) / PLOT_U, cv = (Math.floor(v * PLOT_V) + 0.5) / PLOT_V; if (Math.abs(cu - tu) < 1e-6 && Math.abs(cv - tv) < 1e-6) continue; pts.push(dirOfUV(cu, cv).multiplyScalar(1.0015)); }
  const pg = new THREE.BufferGeometry().setFromPoints(pts); const ph = new Float32Array(pts.length); for (let i = 0; i < ph.length; i++) ph[i] = r() * 6.28; pg.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const dotU = { uS: { value: 1 }, uT: { value: 0 } };
  const dots = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: dotU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float ph; uniform float uS, uT; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vA = 0.75 + 0.25 * sin(uT * 2.0 + ph); gl_PointSize = clamp(uS / -mv.z, 1.5, 9.0); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1.0, .72, .38) * smoothstep(.5, 0., d) * vA * 1.4, 1.); }' }));
  grp.add(dots);
  // 내 땅 표시: 빛기둥 + 글씨 판
  const tdir = dirOfUV(tu, tv);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.12, 8, 1, true).translate(0, 0.06, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc861').multiplyScalar(2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.copy(tdir); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tdir); grp.add(beam);
  return { group: grp, body, uniforms: U, dots, dotU, beam, targetDir: tdir, targetUV: [tu, tv], plots: PLOT_U * PLOT_V,
    tick(t, camDist = 3) { U.uT.value = t; dotU.uT.value = t; dotU.uS.value = 2.2; grp.rotation.y = 0; beam.material.opacity = 0.55 + 0.35 * Math.sin(t * 5); } };
}
