/* world.js — 돈워너노우 우주 광장
   흐름: start.html → maker.html?flow=join → world.html?join=1(주민 등록 4단계) → 소환 → 튜토리얼 4단계 → 광장
   설계: ../../돈워너노우_게임_20261119/광장_설계_v2.md · 서버 약속: dwk-net.js · 데이터: data.js world
   시설은 FAC 표 한 곳에서 늘리고 줄인다(위치·이름·눌렀을 때 할 일). */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as K from './dwk-char.js?v=6';
import { createNet } from './dwk-net.js?v=8';
import { makeShip } from './dwk-ship.js?v=3';

const DC = window.DC, D = window.DWK, W = D.world;
const HOOK = { tick: [], spawn: [], msg: {}, tap: [] }; // 확장 모듈 훅(파일 끝 EXT 참고) — 루프보다 먼저 있어야 해서 맨 위
const $ = (s) => document.querySelector(s); const el = DC.el;
const Q = new URLSearchParams(location.search);
const V3 = THREE.Vector3;
const ISLE = 16, WALK_R = 14.6, SPEED = 3.4, CH_S = 1.75; // 섬 반지름 · 걸을 수 있는 반지름 · 걷는 속도 · 캐릭터 배율(키 ≈ 1.15)
// 탑승 대기장(2026-11-27 · 대표 「광장을 더 키워서 우주선 탑승 대기하는곳으로 만들면되겠다.」) — 둥근 광장 북쪽(-z)에 발사대 섬을 붙여 섬 전체를 키웠다.
//   광장 가운데 분수 → 북쪽 큰길 → 탑승구(현황판) → 발사대 위 모선. 좌석 벽은 왼쪽, 명예의 전당은 오른쪽. 물건은 world-lobby.js, 땅·걷기 범위는 여기.
const LOBBY = { x: 0, z: -27, r: 15, walk: 13.6 }, SHIP_AT = [0, -33], GATE_AT = [0, -20];
const inLobby = (x, z, m = 0) => Math.hypot(x - LOBBY.x, z - LOBBY.z) < LOBBY.walk - m;
const walkable = (x, z) => Math.hypot(x, z) < WALK_R || inLobby(x, z);
function clampWalk(p) { // 두 원(광장 · 대기장) 밖으로 나가면 가까운 쪽 가장자리로 되돌린다
  if (walkable(p.x, p.z)) return false;
  const r = Math.hypot(p.x, p.z) || 1, ax = p.x * WALK_R / r, az = p.z * WALK_R / r;
  const dx = p.x - LOBBY.x, dz = p.z - LOBBY.z, d = Math.hypot(dx, dz) || 1, bx = LOBBY.x + dx * LOBBY.walk / d, bz = LOBBY.z + dz * LOBBY.walk / d;
  if (Math.hypot(p.x - ax, p.z - az) < Math.hypot(p.x - bx, p.z - bz)) { p.x = ax; p.z = az; } else { p.x = bx; p.z = bz; } return true;
}
const SHOT = ['lobby', 'wall'].includes(Q.get('shot')) ? Q.get('shot') : null; // 릴스·캐러셀 촬영용 고정 카메라(world.html?shot=lobby 대기장 전경 · ?shot=wall 좌석 벽 · &ui=1 이면 화면 장치 유지 · &still=1 이면 카메라 멈춤)
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────── 상태 ─────────
const net = await createNet();
window.__dwkNetP = Promise.resolve(net); // dwk-prog.js 가 같은 연결을 쓴다(연결 두 개 금지)
let profile = await net.profile.get();
const hasChar = !!DC.store.get('char', null);
const GUEST = Q.has('guest') || !hasChar;
let me = GUEST ? K.normalizeChar({ ...K.defaultChar(), b: Math.floor(Math.random() * 6), n: [Math.floor(Math.random() * 16), Math.floor(Math.random() * 16)] }) : K.myChar();
const canTalk = () => !GUEST && !!profile?.over14 && !!profile?.agree?.chat;

// ───────── 렌더러 · 장면 ─────────
const canvas = $('#scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('#loading').classList.remove('ship'); $('#loading').innerHTML = '<p>이 기기에선 3D 광장을 열 수 없어<br><br><a class="k sun" style="padding:14px 18px" href="arcade.html">아케이드로 가기</a></p>'; throw e; }
let DPR = Math.min(devicePixelRatio, fine ? 2 : 1.75); renderer.setPixelRatio(DPR); // 폰 1.5→1.75(11-22 대표 「3D 품질 극상」) — 느리면 아래 autoQuality 가 3초마다 한 단계씩 낮춘다
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
// 휴대폰(터치)은 실시간 그림자를 끄고 캐릭터 발밑에 가벼운 원형 그림자만 둔다 — 그림자 계산이 그리기 횟수를 두 배로 만들어 끊김의 큰 몫이었다(2026-11-20 실측)
const LITE = !fine || Q.get('lite') === '1';
if (Q.has('film') || (SHOT && !Q.has('ui'))) document.documentElement.classList.add('film'); // 첫 화면 배경 영상 촬영용: 화면 장치를 전부 숨긴다
// 그림자: PC는 매 장면 계산. 폰은 「한 번 굽는 그림자」 — 움직이지 않는 건물·나무·벤치 그림자를 가끔(15초)만 다시 그리고, 캐릭터는 발밑 원형 그림자.
// (11-20 폰 실측: 매 장면 그림자가 그리기 횟수를 두 배로 만들어 끊김의 큰 몫이었다 → 그때는 폰 그림자를 통째로 껐다. 11-22 대표 「3D 품질 극상」 → 굽는 방식으로 되살림)
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; if (LITE) renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070815);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2550, 1.5));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.position.set(9, 18, 7 - 12); sun.target.position.set(0, 0, -12); scene.add(sun.target); sun.castShadow = true; // 빛 방향은 그대로, 그림자 범위 중심만 광장+대기장 가운데로
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 }); sun.shadow.bias = -0.0005; scene.add(sun);
const rim = new THREE.DirectionalLight(0x8fb8ff, 0.9); rim.position.set(-10, 6, -12); scene.add(rim);
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 60 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

// 그래픽이 끊기면(휴대폰에서 앱을 내렸다 올릴 때 흔함) 다시 불러오기 안내
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (window.__glLost) return; const d = window.__glLost = el('div', { class: 'w-load' }, el('div', {}, el('p', {}, '화면이 잠깐 끊겼어'), el('button', { class: 'k sun', style: 'padding:14px 18px', type: 'button', onclick: () => location.reload() }, '다시 불러오기'))); document.body.append(d); });
// 그래픽이 다시 붙으면(브라우저가 스스로 되살림 — 앱을 내렸다 올릴 때 흔함) 안내를 걷고 그대로 이어 간다. 새로고침 없이 돌아오게(11-22 시험: 1~2초 뒤 다시 붙는데 「다시 불러오기」를 눌러야만 돌아왔다)
canvas.addEventListener('webglcontextrestored', () => { window.__glLost?.remove(); window.__glLost = null; if (LITE) setTimeout(() => window.__EXT?.bakeShadows?.(), 800); });
// 느린 휴대폰이면 화질을 한 단계 낮춘다(처음 4초 평균 프레임 기준)
// 셰이더 준비(warm)가 끝난 뒤 3초씩 재서, 느리면 해상도만 한 단계씩 낮춘다(그림자·재질은 건드리지 않음 — 바꾸면 전체를 다시 준비하느라 크게 멈춘다)
const perf = { n: 0, t0: 0, ready: false };
function autoQuality(now) {
  if (!perf.ready) return; if (!perf.t0) { perf.t0 = now; perf.n = 0; return; } perf.n++;
  if (now - perf.t0 < 3000) return; const fps = perf.n * 1000 / (now - perf.t0); perf.t0 = now; perf.n = 0; window.__fps = Math.round(fps);
  if (fps < 45 && DPR > 0.75) { DPR = Math.max(0.75, +(DPR - (DPR > 1 ? 0.25 : 0.125)).toFixed(3)); renderer.setPixelRatio(DPR); resize(); }
}
// 셰이더 미리 준비: 처음 보는 물체가 화면에 들어올 때 그 자리에서 준비하느라 멈추던 것(실측: 걸을 때마다 0.1~0.3초, 한 번은 1.9초)을 입장 때 한 번에 끝낸다.
// 숨겨 둔 물체(별똥별·파편 묶음 등)도 잠깐 보이게 해서 같이 준비한다.
async function warm() {
  // 조명이 든 묶음은 건드리지 않는다 — 숨은 조명을 켜면 조명 개수가 바뀌어, 실제로 안 쓰는 셰이더 한 벌을 통째로 더 만든다(실측 1.3초 멈춤)
  const hidden = []; scene.traverse(o => { if (o.visible || o.isLight) return; let lit = false; o.traverse(c => { if (c.isLight) lit = true; }); if (!lit) hidden.push(o); }); hidden.forEach(o => { o.visible = true; });
  let p; try { p = renderer.compileAsync ? renderer.compileAsync(scene, camera) : (renderer.compile(scene, camera), null); } finally { hidden.forEach(o => { o.visible = false; }); }
  try { await p; } catch (e) { console.warn('셰이더 미리 준비 실패', e?.message); }
}
// 원형 그림자(LITE 전용): 모든 캐릭터에 자동으로 붙인다(모듈이 쓰는 K.makeCharacter 도 감쌈)
const blobGeo = new THREE.CircleGeometry(0.3, 24).rotateX(-Math.PI / 2), blobMat = new THREE.MeshBasicMaterial({ color: 0x0a0818, transparent: true, opacity: 0.32, depthWrite: false });
const KX = !LITE ? K : { ...K, makeCharacter: async (...a) => { const ch = await K.makeCharacter(...a); if (ch?.root) { ch.root.traverse(o => { if (o.isMesh) o.castShadow = false; }); const b = new THREE.Mesh(blobGeo, blobMat); b.position.y = 0.012; b.renderOrder = -1; ch.root.add(b); } return ch; } }; // 모듈은 EXT.K 로 이걸 쓴다
// 휴대폰 자판이 올라오면 채팅 줄을 자판 위로 올린다
if (window.visualViewport) { const vv = visualViewport; const lift = () => { const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop); document.body.style.setProperty('--kb', kb + 'px'); document.body.classList.toggle('kb-open', kb > 80); }; vv.addEventListener('resize', lift); vv.addEventListener('scroll', lift); }
// ───────── 아이콘 한 벌(직접 그린 선 아이콘 · 이모지 대신) ─────────
const SV = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  back: SV('<path d="M15 5l-7 7 7 7"/>'), menu: SV('<path d="M4 7h16M4 12h16M4 17h16"/>'), x: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
  send: SV('<path d="M4 12l16-7-6 16-3-7z"/><path d="M11 14l9-9"/>'),
  wave: SV('<path d="M8 13V6.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-.5V6a1.5 1.5 0 013 0v7a7 7 0 01-7 7h-.5a6 6 0 01-5-2.7L3.3 14a1.6 1.6 0 012.6-1.8L8 14"/>'),
  trophy: SV('<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8M9 17h6"/>'),
  game: SV('<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10v5M5.5 12.5h5"/><circle cx="15.5" cy="11.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="14" r=".8" fill="currentColor"/>'),
  film: SV('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l4 2-4 2z" fill="currentColor"/><path d="M8 21h8"/>'),
  portal: SV('<circle cx="12" cy="12" r="8"/><path d="M12 7a5 5 0 105 5"/><path d="M12 10a2 2 0 102 2"/>'),
  heart: SV('<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'),
  mirror: SV('<ellipse cx="12" cy="10" rx="5" ry="7"/><path d="M12 17v4M9 21h6M10 7.5l2.5-1.5"/>'),
  board: SV('<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M8 15v6M16 15v6M7 8h6M7 11h9"/>'),
  user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'), lock: SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  check: SV('<path d="M5 12.5l4.5 4.5L19 7"/>'), copy: SV('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
  phone: SV('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'), star: SV('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
  chat: SV('<path d="M4 5h16v11H9l-5 4z"/>'), trash: SV('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), help: SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 014.6 1.3c0 1.7-2.1 2-2.1 3.5M12 17.5v.01"/>'),
  home: SV('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'), gift: SV('<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9c-1.5-4-6-4-6-1.5S12 9 12 9zm0 0c1.5-4 6-4 6-1.5S12 9 12 9z"/>'),
  play: SV('<path d="M7 4l13 8-13 8z"/>'), arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
const ic = (n) => { const s = el('span', { class: 'ic', 'aria-hidden': 'true' }); s.innerHTML = ICON[n] || ''; return s; };
// 안내봇 얼굴(튜토리얼 대화창) — 우리 광장의 안내 로봇 「삐삐」
const BOT = '<svg viewBox="0 0 48 48" fill="none" stroke="#1f1a2e" stroke-width="2.6" stroke-linejoin="round"><path d="M24 4v6"/><circle cx="24" cy="4" r="2.4" fill="#ff6f91"/><rect x="8" y="10" width="32" height="26" rx="7" fill="#fff4dc"/><rect x="13" y="16" width="22" height="13" rx="4" fill="#1f1a2e"/><circle cx="19" cy="22.5" r="2.6" fill="#7fd8ff" stroke="none"/><circle cx="29" cy="22.5" r="2.6" fill="#7fd8ff" stroke="none"/><path d="M14 36v6h20v-6M4 22h4M40 22h4"/></svg>';
for (const b of document.querySelectorAll('[data-ic]')) b.prepend(ic(b.dataset.ic));
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
const mesh = (geo, m, x = 0, y = 0, z = 0, shadow = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = shadow; o.receiveShadow = true; return o; };
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FONT = "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif";
const loadImg = (src) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
const faceCenter = (o) => { o.rotation.y = Math.atan2(-o.position.x, -o.position.z); return o; };

// ───────── 우주 배경 ─────────
{
  const n = 1800, p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 180 + Math.random() * 40, s = Math.sqrt(1 - u * u); p.set([Math.cos(a) * s * r, u * r, Math.sin(a) * s * r], i * 3); const k = 0.6 + Math.random() * 0.4, warm = Math.random() < 0.25; c.set(warm ? [k, k * 0.85, k * 0.6] : [k * 0.8, k * 0.9, k], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.3, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false })));
  const glow = (css, s, x, y, z) => { const t = canvasTex(256, 256, (x2) => { const gr = x2.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, css); gr.addColorStop(1, 'rgba(0,0,0,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 256, 256); }); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.setScalar(s); sp.position.set(x, y, z); scene.add(sp); };
  glow('rgba(120,80,255,.35)', 160, -60, 30, -120); glow('rgba(40,160,255,.25)', 140, 90, -10, -60); glow('rgba(255,120,180,.18)', 120, 40, 50, 110);
}
// 하늘에 뜬 영상 속 행성들(릴스와 같은 그림)
const skyPlanets = new THREE.Group(); scene.add(skyPlanets);
(async () => {
  const ps = DC.planets(); const R0 = 70;
  await Promise.all(ps.map(async (pl, i) => {
    const img = await loadImg(pl.img); if (!img) return;
    const t = canvasTex(256, 256, (x) => { x.save(); x.beginPath(); x.arc(128, 128, 112, 0, 6.283); x.clip(); const s = Math.max(256 / img.width, 256 / img.height) * 1.12; x.drawImage(img, 128 - img.width * s / 2, 118 - img.height * s / 2, img.width * s, img.height * s); x.restore(); const g = x.createRadialGradient(128, 128, 100, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(180,210,255,.35)'); g.addColorStop(1, 'rgba(180,210,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); const a = i / ps.length * 6.283 + 0.4;
    sp.position.set(Math.sin(a) * R0 * (0.85 + (i % 3) * 0.15), 14 + (i * 7) % 26, Math.cos(a) * R0 * (0.85 + (i % 3) * 0.15)); sp.scale.setScalar(9 + (i % 3) * 3); sp.userData.bob = Math.random() * 6; skyPlanets.add(sp);
  }));
})();

// ───────── 떠 있는 섬 ─────────
const world = new THREE.Group(); scene.add(world);
{
  const top = mesh(new THREE.CylinderGeometry(ISLE, ISLE - 0.6, 1.2, 72), mat(0x86c76f), 0, -0.6, 0, false); world.add(top);
  // 가장자리 턱: 대기장으로 이어지는 목(북쪽)은 비운다 — 두 원이 만나는 점에서 끊는다
  const neck = (R1, R2, cz) => { const z = (R1 * R1 - R2 * R2 + cz * cz) / (2 * cz); return [Math.sqrt(Math.max(0, R1 * R1 - z * z)), z]; }; // 두 원의 교점
  const [nx, nz] = neck(ISLE, LOBBY.r, LOBBY.z); // 광장 원(r16)과 대기장 원(r15)이 만나는 점 (±nx, nz)
  const t0 = Math.atan2(nz, nx), t1 = Math.atan2(nz, -nx); // 광장 턱이 끊기는 각(x=R cos t, z=R sin t)
  const edge = mesh(new THREE.TorusGeometry(ISLE - 0.05, 0.22, 8, 96, Math.PI * 2 - (t0 - t1 + Math.PI * 2) % (Math.PI * 2)).rotateX(Math.PI / 2), mat(0x6aa95a), 0, -0.05, 0, false); edge.rotation.y = -t0; world.add(edge);
  // 대기장 섬(발사대 바닥 · 밝은 포장) — 광장보다 1cm 낮게 둬서 겹치는 곳은 광장 잔디가 덮는다
  const deckMat = mat(0xe9e1d0, { roughness: 0.92 });
  world.add(mesh(new THREE.CylinderGeometry(LOBBY.r, LOBBY.r - 0.6, 1.2, 72), deckMat, LOBBY.x, -0.61, LOBBY.z, false));
  const u0 = Math.atan2(nz - LOBBY.z, -nx), u1 = Math.atan2(nz - LOBBY.z, nx); // 대기장 턱이 끊기는 각
  const dEdge = mesh(new THREE.TorusGeometry(LOBBY.r - 0.05, 0.22, 8, 96, Math.PI * 2 - (u0 - u1 + Math.PI * 2) % (Math.PI * 2)).rotateX(Math.PI / 2), mat(0xb9ad97), LOBBY.x, -0.06, LOBBY.z, false); dEdge.rotation.y = -u0; world.add(dEdge);
  const rock2 = new THREE.ConeGeometry(LOBBY.r - 0.6, 12, 40, 6, true); const rp = rock2.attributes.position;
  for (let i = 0; i < rp.count; i++) { const y = rp.getY(i); if (y < 5.9) { const k = 1 + (Math.sin(i * 78.233) * 43758.5453 % 1) * 0.12; rp.setX(i, rp.getX(i) * k); rp.setZ(i, rp.getZ(i) * k); } }
  rock2.computeVertexNormals(); world.add(mesh(rock2.rotateX(Math.PI), mat(0x6b5a7a, { flatShading: true }), LOBBY.x, -7.2, LOBBY.z, false));
  const rockG = new THREE.ConeGeometry(ISLE - 0.6, 11, 40, 6, true); const pos = rockG.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < 5.4) { const k = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.12; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); } }
  rockG.computeVertexNormals(); const rock = mesh(rockG.rotateX(Math.PI), mat(0x6b5a7a, { flatShading: true }), 0, -6.7, 0, false); world.add(rock);
  const pave = mat(0xeadfca, { roughness: 0.95 });
  world.add(mesh(new THREE.CircleGeometry(5.2, 64).rotateX(-Math.PI / 2), pave, 0, 0.012, 0, false));
  world.add(mesh(new THREE.RingGeometry(9.2, 10.4, 96).rotateX(-Math.PI / 2), pave, 0, 0.011, 0, false));
  world.add(mesh(new THREE.PlaneGeometry(3.4, 10).rotateX(-Math.PI / 2), pave, 0, 0.012, -14.6, false)); // 북쪽 큰길: 광장 → 탑승구
  for (const a of [0, 0.62, -0.62, 2.2, -2.2, Math.PI]) { const s = mesh(new THREE.PlaneGeometry(1.7, 5.2).rotateX(-Math.PI / 2), pave, Math.sin(a) * 7.4, 0.01, Math.cos(a) * 7.4, false); s.rotation.y = a; world.add(s); }
  // 가운데 분수: 작은 행성이 돈다(로고 역할)
  world.add(mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.5, 40), mat(0xd9ccb4), 0, 0.25, 0));
  world.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.06, 40), mat(0x5fc8ff, { roughness: 0.2, metalness: 0.1, emissive: 0x1a5f8a, emissiveIntensity: 0.5 }), 0, 0.5, 0, false));
  world.add(mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.3, 16), mat(0xd9ccb4), 0, 1.1, 0));
}
const core = new THREE.Group(); core.position.set(0, 2.45, 0); world.add(core);
{
  const pl = mesh(new THREE.SphereGeometry(0.75, 40, 28), mat(0xffd34d, { emissive: 0xff9d2e, emissiveIntensity: 0.55, roughness: 0.5 })); core.add(pl);
  const ring = mesh(new THREE.TorusGeometry(1.15, 0.05, 8, 64), mat(0x7fe3ff, { emissive: 0x7fe3ff, emissiveIntensity: 1.2 }), 0, 0, 0, false); ring.rotation.x = 1.25; core.add(ring); core.userData.ring = ring;
  const light = new THREE.PointLight(0xffc06a, 6, 9, 1.6); core.add(light);
}
// 걸을 때 부딪히는 원들
const COL = [{ x: 0, z: 0, r: 2.05 }];

// ───────── 시설(FAC 표) ─────────
const facGroup = new THREE.Group(); world.add(facGroup);
const polar = (r, a) => [Math.sin(a) * r, Math.cos(a) * r];
const latestEp = D.episodes[0];
const GAMES = [
  { id: 'merge', name: '행성 합치기', icon: '🪐', color: '#ffd34d', href: 'merge.html' },
  { id: 'survive', name: '행성 생존', icon: '🃏', color: '#7fe3ff', href: 'survive.html' },
  { id: 'find', name: '빈틈 찾기', icon: '🔍', color: '#ff8fd0', href: 'find.html' },
  { id: 'land', name: '행성 착륙', icon: '🚀', color: '#9dff8f', href: 'land.html' },
];
const A_ARC = 1.92, A_THE = -1.92, A_HALL = Math.PI, A_TOWN = -0.72, A_BOARD = 0.72, A_MIR = 1.3;
const HALL_POS = [9.4, -23.5], HALL_AT = [5.9, -23.5]; // 명예의 전당: 광장 북쪽 끝 → 대기장 오른쪽(큰길을 보고 선다 · 2026-11-27 옮김)
const faceTo = (o, tx, tz) => { o.rotation.y = Math.atan2(tx - o.position.x, tz - o.position.z); return o; };
const FAC = [
  { id: 'hall', name: '명예의 전당', icon: 'trophy', act: '명예의 전당 보기', at: HALL_AT, open: () => openHall(), tagAt: HALL_POS, tagY: 5.6 },
  { id: 'capsule', name: '캡슐 뽑기', icon: 'gift', act: '캡슐 뽑기', at: polar(6.4, -0.95), open: () => openCapsule() },
  ...GAMES.map((g, i) => ({ id: 'cab-' + g.id, name: g.name, icon: 'game', act: `${g.name} 한 판`, at: polar(8.7, A_ARC + (i - 1.5) * 0.17), open: () => go(g.href), small: true })),
  { id: 'theater', name: '이번 편 극장', icon: 'film', act: '이번 편 보기', at: polar(8.6, A_THE), open: () => openTheater() },
  { id: 'town', name: '내 행성', icon: 'portal', act: '내 행성으로 가기', at: polar(10.8, A_TOWN), open: () => go('town.html') },
  { id: 'board', name: '자랑 게시판', icon: 'heart', act: '자랑 게시판 열기', at: polar(10.8, A_BOARD), open: () => go('plaza.html') },
  { id: 'mirror', name: '꾸미기 거울', icon: 'mirror', act: '내 캐릭터 꾸미기', at: polar(11.2, A_MIR), open: () => go(GUEST ? 'maker.html?flow=join' : 'maker.html?flow=world') },
  ...W.ads.map((ad, i) => ({ id: ad.slot, name: ad.sponsor ? '광고' : '전광판', icon: 'board', act: ad.title, at: polar(12.2, i ? 2.75 : -2.75), open: () => open(ad.url, '_blank', 'noopener'), ad })),
];
const facOf = Object.fromEntries(FAC.map(f => [f.id, f]));
const FROM = { merge: 'cab-merge', survive: 'cab-survive', find: 'cab-find', land: 'cab-land', arcade: 'cab-merge', town: 'town', board: 'board', maker: 'mirror', theater: 'theater' };
function backFrom() {
  const f = facOf[FROM[Q.get('from')]]; if (!f) return false;
  const [fx, fz] = f.at; const k = 0.88; const px = fx * k, pz = fz * k; // 시설에서 광장 안쪽으로 조금
  player.root.position.set(px, 0, pz); player.root.rotation.y = Math.atan2(-px, -pz); // 광장 가운데를 보고 선다(시설은 등 뒤, 카메라는 앞에서 나와 시설을 함께 비춘다)
  camYaw = player.root.rotation.y; history.replaceState(null, '', location.pathname); return true;
}
function go(href) { DC.sfx('tap'); room?.leave(); location.href = href; }

const gltf = new GLTFLoader(); const cache = {};
const loadM = (p) => (cache[p] ||= gltf.loadAsync('assets/kenney/' + p).catch(e => { console.warn('모델 못 불러옴', p, e); return null; }));
async function prop(p, h, x, z, rot = 0) {
  const g = await loadM(p); if (!g) return null; const o = g.scene.clone(true); const b = new THREE.Box3().setFromObject(o); const k = h / (b.max.y - b.min.y);
  o.scale.setScalar(k); o.position.set(x, -b.min.y * k, z); o.rotation.y = rot; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); world.add(o); return o;
}
function sign(text, w = 2.6, h = 0.7, color = '#ffd34d', bg = 'rgba(16,18,34,1)') {
  const t = canvasTex(512, Math.round(512 * h / w), (x, W2, H2) => { x.fillStyle = bg; x.fillRect(0, 0, W2, H2); x.strokeStyle = color; x.lineWidth = 8; x.strokeRect(6, 6, W2 - 12, H2 - 12); x.fillStyle = color; x.font = `800 ${Math.round(H2 * 0.48)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W2 / 2, H2 / 2 + 2); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55, roughness: 0.6 }));
}

// 명예의 전당: 시상대 + 아치
const hallG = new THREE.Group(); { const [x, z] = HALL_POS; hallG.position.set(x, 0, z); faceTo(hallG, 0, z); world.add(hallG); COL.push({ x, z, r: 2.7 }); }
{
  const gold = mat(0xffd34d, { metalness: 0.6, roughness: 0.35 }), silver = mat(0xdfe6f0, { metalness: 0.6, roughness: 0.35 }), bronze = mat(0xd08a52, { metalness: 0.5, roughness: 0.4 }), stone = mat(0xf2ead8);
  [[0, 1.0, gold, '1'], [-1.45, 0.7, silver, '2'], [1.45, 0.45, bronze, '3']].forEach(([x, h, m, n]) => {
    const b = mesh(new THREE.BoxGeometry(1.35, h, 1.35), stone, x, h / 2, 0); hallG.add(b); hallG.add(mesh(new THREE.BoxGeometry(1.38, 0.08, 1.38), m, x, h + 0.04, 0));
    const s = sign(n, 0.5, 0.5, '#111', n === '1' ? '#ffd34d' : n === '2' ? '#dfe6f0' : '#d08a52'); s.position.set(x, h / 2, 0.68); hallG.add(s);
  });
  for (const sx of [-2.6, 2.6]) hallG.add(mesh(new THREE.CylinderGeometry(0.22, 0.26, 4, 16), mat(0xf2ead8), sx, 2, -0.9));
  const arch = mesh(new THREE.TorusGeometry(2.6, 0.2, 10, 40, Math.PI), gold, 0, 4, -0.9); hallG.add(arch);
  const s = sign('명예의 전당 · 이번 주 TOP 3', 3.4, 0.62); s.position.set(0, 4.9, -0.9); hallG.add(s);
}
hallG.traverse(m => { m.userData.fac = 'hall'; });
// 게임기 화면 그림(도트 느낌 · 이모지 대신)
const drawCab = {
  merge: (c) => { [[40, 84, 22], [80, 88, 16], [62, 50, 26]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }); },
  survive: (c) => { c.save(); c.translate(64, 64); c.rotate(-0.18); c.fillRect(-26, -36, 52, 72); c.fillStyle = '#120d22'; c.fillRect(-16, -24, 32, 6); c.fillRect(-16, -12, 22, 6); c.restore(); },
  find: (c) => { c.beginPath(); c.arc(56, 56, 26, 0, 6.283); c.stroke(); c.beginPath(); c.moveTo(76, 76); c.lineTo(102, 102); c.stroke(); },
  land: (c) => { c.beginPath(); c.moveTo(64, 20); c.lineTo(86, 78); c.lineTo(42, 78); c.closePath(); c.fill(); c.fillRect(54, 84, 20, 14); c.beginPath(); c.arc(64, 118, 30, 3.5, 5.9); c.stroke(); },
};
// 아케이드 건물 + 게임기 4대
{
  const [x, z] = polar(12.4, A_ARC); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 2.6 });
  g.add(mesh(new THREE.BoxGeometry(5.6, 3.4, 3), mat(0x3a2a6e), 0, 1.7, -0.4));
  g.add(mesh(new THREE.BoxGeometry(6, 0.3, 3.4), mat(0x24184a), 0, 3.55, -0.4));
  const s = sign('ARCADE', 3.6, 0.9, '#ff6bd6', '#120a2a'); s.position.set(0, 2.8, 1.12); g.add(s);
  g.add(mesh(new THREE.BoxGeometry(1.6, 2, 0.05), mat(0x7fe3ff, { emissive: 0x2a7fa0, emissiveIntensity: 0.8 }), 0, 1, 1.11, false));
  const neon = new THREE.PointLight(0xff6bd6, 5, 8, 1.5); neon.position.set(0, 2.6, 2.2); g.add(neon);
  GAMES.forEach((gm, i) => {
    const [cx, cz] = polar(9.9, A_ARC + (i - 1.5) * 0.17); const cab = new THREE.Group(); cab.position.set(cx, 0, cz); faceCenter(cab); world.add(cab); COL.push({ x: cx, z: cz, r: 0.5 });
    cab.add(mesh(new THREE.BoxGeometry(0.8, 1.7, 0.7), mat(0x1c1436), 0, 0.85, 0));
    const scr = canvasTex(128, 128, (c) => { c.fillStyle = '#120d22'; c.fillRect(0, 0, 128, 128); c.fillStyle = gm.color; c.strokeStyle = gm.color; c.lineWidth = 8; drawCab[gm.id](c); for (let y = 0; y < 128; y += 4) { c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, y, 128, 2); } });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: scr })); sc.position.set(0, 1.3, 0.36); cab.add(sc);
    cab.add(mesh(new THREE.BoxGeometry(0.82, 0.12, 0.72), new THREE.MeshStandardMaterial({ color: gm.color, emissive: gm.color, emissiveIntensity: 0.8 }), 0, 1.76, 0, false));
    cab.traverse(m => { m.userData.fac = 'cab-' + gm.id; });
  });
}
// 이번 편 극장: 큰 화면에 최신 편 행성들
{
  const [x, z] = polar(12.2, A_THE); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 2.6 });
  for (const sx of [-2.9, 2.9]) g.add(mesh(new THREE.BoxGeometry(0.3, 4.4, 0.3), mat(0x2b2f45), sx, 2.2, 0));
  g.add(mesh(new THREE.BoxGeometry(6.1, 3.5, 0.2), mat(0x15172a), 0, 2.6, -0.05));
  const scrMat = new THREE.MeshBasicMaterial({ color: 0x223 }); const scr = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 3.2), scrMat); scr.position.set(0, 2.6, 0.06); g.add(scr);
  (async () => {
    const imgs = await Promise.all(latestEp.planets.map(p => loadImg(p.img)));
    scrMat.map = canvasTex(1024, 576, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1b1f45'); gr.addColorStop(1, '#05060d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const n = imgs.length, R = Math.min(170, (w - 120) / n / 2); imgs.forEach((im, i) => { if (!im) return; const cx = w / 2 + (i - (n - 1) / 2) * (R * 2 + 30), cy = 250; c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 6.283); c.clip(); const s = Math.max(R * 2 / im.width, R * 2 / im.height) * 1.12; c.drawImage(im, cx - im.width * s / 2, cy - im.height * s / 2 - 6, im.width * s, im.height * s); c.restore(); });
      c.textAlign = 'center'; c.fillStyle = '#ffd34d'; c.font = `800 44px ${FONT}`; c.fillText(`${latestEp.no}편 · ${latestEp.title}`, w / 2, 490); c.fillStyle = '#a9a7b8'; c.font = `600 28px ${FONT}`; c.fillText('너라면 어디서 1년 버틸래?', w / 2, 538);
    }); scrMat.color.set(0xffffff); scrMat.needsUpdate = true;
  })();
  g.traverse(m => { m.userData.fac = 'theater'; });
}
// 타운 포털
let portalSwirl;
{
  const [x, z] = polar(11.6, A_TOWN); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 0.5 });
  g.add(mesh(new THREE.TorusGeometry(1.25, 0.14, 12, 48), mat(0x7fe3ff, { emissive: 0x3fc8ff, emissiveIntensity: 1.4 }), 0, 1.45, 0));
  const t = canvasTex(256, 256, (c) => { const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.4, 'rgba(127,227,255,.6)'); gr.addColorStop(1, 'rgba(60,40,200,0)'); c.fillStyle = gr; c.fillRect(0, 0, 256, 256); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 6; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(128, 128, 30 + i * 18, i, i + 2.2); c.stroke(); } });
  portalSwirl = new THREE.Mesh(new THREE.CircleGeometry(1.12, 48), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); portalSwirl.position.y = 1.45; g.add(portalSwirl);
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 32), mat(0x2b2f45), 0, 0.08, 0));
  g.traverse(m => { m.userData.fac = 'town'; });
}
// 주민 자랑 게시판(견본 주민 얼굴)
{
  const [x, z] = polar(11.6, A_BOARD); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 0.9 });
  for (const sx of [-1.15, 1.15]) g.add(mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), mat(0x8a5a3c), sx, 1.3, 0));
  const bm = new THREE.MeshStandardMaterial({ color: 0xffffff }); const b = mesh(new THREE.BoxGeometry(2.5, 1.7, 0.1), bm, 0, 1.75, 0); g.add(b);
  (async () => {
    // 휴대폰은 그래픽 화면(WebGL)을 여러 개 열면 끊긴다 → 얼굴 사진 대신 그림 글자로(그래픽 화면 1개 유지)
    const tones = ['#ffcf3a', '#7fd8ff', '#ff6f91'];
    bm.map = canvasTex(500, 340, (c, w, h) => { c.fillStyle = '#fff4dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#1f1a2e'; c.font = `800 38px ${FONT}`; c.textAlign = 'center'; c.fillText('주민 자랑', w / 2, 52);
      tones.forEach((col, i) => { const x = 30 + i * 150; c.fillStyle = col; c.fillRect(x, 80, 140, 200); c.strokeStyle = '#1f1a2e'; c.lineWidth = 5; c.strokeRect(x, 80, 140, 200); c.fillStyle = '#1f1a2e'; c.beginPath(); c.arc(x + 70, 150, 30, 0, 6.283); c.fill(); c.fillRect(x + 32, 186, 76, 60); c.fillStyle = '#fff4dc'; c.fillRect(x + 56, 144, 8, 8); c.fillRect(x + 76, 144, 8, 8); c.fillStyle = '#1f1a2e'; c.font = `800 22px ${FONT}`; c.fillText(`${i + 1}번`, x + 70, 272); });
      c.fillStyle = '#7a6f86'; c.font = `600 20px ${FONT}`; c.fillText('이번 주 출전은 인스타 DM으로', w / 2, 318); });
    bm.map.colorSpace = THREE.SRGBColorSpace; bm.needsUpdate = true;
  })();
  g.traverse(m => { m.userData.fac = 'board'; });
}
// 꾸미기 거울
{
  const [x, z] = polar(12.6, A_MIR); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 0.7 });
  const fr = mesh(new THREE.TorusGeometry(0.85, 0.09, 10, 48), mat(0xffd34d, { metalness: 0.7, roughness: 0.3 }), 0, 1.6, 0); fr.scale.y = 1.35; g.add(fr);
  const gl = mesh(new THREE.CircleGeometry(0.84, 48), mat(0xcfe6ff, { metalness: 1, roughness: 0.05, envMapIntensity: 1.6 }), 0, 1.6, -0.01, false); gl.scale.y = 1.35; g.add(gl);
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.22, 0.5), mat(0x8a5a3c), 0, 0.11, 0));
  g.traverse(m => { m.userData.fac = 'mirror'; });
}
// 캡슐 뽑기 기계(코인만 · 확률 공개) — 둥근 유리 안에 캡슐이 돈다
const capsuleBalls = new THREE.Group();
{
  const [x, z] = polar(7.5, -0.95); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 0.75 });
  g.add(mesh(new THREE.BoxGeometry(1.25, 1.1, 1.0), mat(0xff6f91), 0, 0.55, 0));
  g.add(mesh(new THREE.BoxGeometry(1.32, 0.12, 1.07), mat(0x1f1a2e), 0, 1.12, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 20).rotateX(Math.PI / 2), mat(0xffcf3a, { metalness: 0.5, roughness: 0.3 }), 0.3, 0.7, 0.52));
  g.add(mesh(new THREE.BoxGeometry(0.34, 0.26, 0.06), mat(0x1f1a2e), -0.28, 0.32, 0.5));
  const dome = mesh(new THREE.SphereGeometry(0.6, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshStandardMaterial({ color: 0xdff4ff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false }) /* 유리 투과(transmission)는 보일 때마다 광장 전체를 한 번 더 그려서 휴대폰 끊김의 주범 → 반투명으로 대신(2026-11-20 실측) */, 0, 1.18, 0, false); g.add(dome);
  const cols = [0xffcf3a, 0x7fd8ff, 0xff6f91, 0x8be07a, 0xffffff, 0xb59cff];
  for (let i = 0; i < 16; i++) { const b2 = mesh(new THREE.SphereGeometry(0.11, 12, 8), mat(cols[i % cols.length], { roughness: 0.35 }), 0, 0, 0, false); const a2 = i * 2.4, r2 = 0.18 + (i % 3) * 0.12; b2.position.set(Math.cos(a2) * r2, 1.32 + (i % 4) * 0.09, Math.sin(a2) * r2); capsuleBalls.add(b2); }
  capsuleBalls.position.set(0, 0, 0); g.add(capsuleBalls);
  const top = sign('CAPSULE', 1.3, 0.34, '#ffcf3a', '#1f1a2e'); top.position.set(0, 1.95, 0); g.add(top);
  g.traverse(m => { m.userData.fac = 'capsule'; });
}
// 전광판 2개(광고 자리) — data.js world.ads 를 바꾸면 그림이 바뀐다
W.ads.forEach((ad, i) => {
  const [x, z] = polar(14.2, i ? 2.75 : -2.75); const g = new THREE.Group(); g.position.set(x, 0, z); faceCenter(g); world.add(g); COL.push({ x, z, r: 0.6 });
  for (const sx of [-1.3, 1.3]) g.add(mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), mat(0x2b2f45), sx, 1.6, 0));
  const t = canvasTex(640, 360, (c, w, h) => { c.fillStyle = '#0d0f1d'; c.fillRect(0, 0, w, h); c.fillStyle = ad.color; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14); c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = `800 64px ${FONT}`; c.fillText(ad.title, w / 2, 170); c.fillStyle = ad.color; c.font = `700 40px ${FONT}`; c.fillText(ad.sub, w / 2, 240); if (ad.sponsor) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `700 26px ${FONT}`; c.textAlign = 'left'; c.fillText('광고', 22, 50); } });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.63), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.7 })); s.position.set(0, 2.45, 0.08); g.add(s);
  g.add(mesh(new THREE.BoxGeometry(3.1, 1.83, 0.12), mat(0x15172a), 0, 2.45, 0));
  g.traverse(m => { m.userData.fac = ad.slot; });
});

// 장식(Kenney CC0) — 시설 각도는 피해서 섬 가장자리에
(async () => {
  const avoid = [A_HALL, A_ARC, A_THE, A_TOWN, A_BOARD, A_MIR, 2.75, -2.75];
  const trees = ['nature/tree_oak.glb', 'nature/tree_default.glb', 'nature/tree_pineDefaultA.glb', 'nature/tree_palmShort.glb'];
  const jobs = [];
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * 6.283 + 0.11; const near = avoid.some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < (b === A_HALL ? 0.62 : 0.3)); if (near) continue; // 북쪽(대기장으로 가는 목)은 넓게 비운다
    const r = 14.4 + (i % 2) * 0.7; const [x, z] = polar(r, a); jobs.push(prop(trees[i % trees.length], 2.6 + (i % 3) * 0.6, x, z, i)); COL.push({ x, z, r: 0.6 });
    const [fx, fz] = polar(r - 1.4, a + 0.08); jobs.push(prop(['nature/flower_redA.glb', 'nature/flower_yellowA.glb', 'nature/flower_purpleA.glb'][i % 3], 0.45, fx, fz, i));
  }
  for (const a of [0.36, -0.36, 1.25, -1.25, 2.5, -2.5]) { const [x, z] = polar(6.4, a); const b = await prop('holiday/bench.glb', 0.7, x, z, a + Math.PI); if (b) COL.push({ x, z, r: 0.7 }); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.39; const [x, z] = polar(10.9, a); jobs.push(prop('holiday/lantern.glb', 1.3, x, z)); if (LITE) continue; const l = new THREE.PointLight(0xffc06a, 1.6, 4, 2); l.position.set(x, 1.4, z); world.add(l); } // 휴대폰: 점광원 8개 = 화면 모든 점마다 8번 더 계산 → 빼고 빛 번짐 그림(world-life lampGlow)만
  await Promise.all(jobs);
})();

// ───────── 이름표·말풍선(HTML) ─────────
const tagsEl = $('#tags'); const tags = new Set();
function makeTag(cls, text) { const t = el('div', { class: 'tag ' + cls, style: 'display:none' }, el('span', { class: 'nm' }, text)); tagsEl.append(t); const o = { el: t, pos: new V3(), h: 1.4, alive: true }; tags.add(o); return o; }
function bubble(tag, text) { tag.el.querySelector('.bub')?.remove(); const b = el('span', { class: 'bub' }, text); tag.el.prepend(b); clearTimeout(tag._t); tag._t = setTimeout(() => b.remove(), 5200); }
FAC.filter(f => !f.small).forEach(f => { const t = makeTag('fac', f.name); if (f.tagAt) { t.pos.set(f.tagAt[0], f.tagY ?? 3.1, f.tagAt[1]); f.tag = t; return; } const [x, z] = f.at; const k = f.id === 'theater' ? 12.2 / 8.6 : 1.08; t.pos.set(x * k, f.id === 'theater' ? 4.7 : f.ad ? 3.7 : 3.1, z * k); f.tag = t; });
{ const [x, z] = polar(12.4, A_ARC); const t = makeTag('fac', '아케이드'); t.pos.set(x, 4.1, z); }

// ───────── 캐릭터 ─────────
const player = { root: new THREE.Group(), ch: null, vel: new V3(), target: null, moving: false, onceUntil: 0, tag: null };
player.root.position.set((Math.random() - 0.5) * 3, 0, -10.6 - Math.random() * 1.4); player.root.rotation.y = Math.PI; scene.add(player.root); // 여럿이 같은 자리에 겹치지 않게 흩뜨린다 · 북쪽 큰길 시작점에 내려 탑승구·우주선을 보고 선다(2026-11-27 — 카메라(뒤 약 9칸)가 분수보다 앞에 오도록)
// 다른 화면에서 「← 우주 광장」으로 돌아오면(?from=) 방금 나갔던 시설 바로 앞에 선다 — 시설 표가 만들어진 뒤 backFrom()에서 옮긴다
async function dress(holder, code) {
  const ch = await KX.makeCharacter(typeof code === 'string' ? K.decodeChar(code) : code); if (!ch) return null;
  holder.root.clear(); ch.root.scale.setScalar(CH_S); holder.root.add(ch.root); holder.ch = ch; ch.anim('idle'); return ch;
}
const displayName = () => K.charName(me);
// 시상대 주민: 서버가 센 실제 TOP 3, 없으면 견본(견본이라고 표시)
const podium = [];
async function buildPodium() {
  const real = (await liveHall('hearts')).filter(r => K.decodeChar(r.code)).slice(0, 3); const list = real.length ? real.map(r => ({ code: r.code, label: r.name, sample: false })) : (D.plaza.samples || []).slice(0, 3).map(c => ({ code: c, label: '자리 비어 있음', sample: true }));
  const spots = [[0, 1.08], [-1.45, 0.78], [1.45, 0.53]];
  for (let i = list.length; i < 3; i++) { const t = makeTag('sample', `${i + 1}위 · 비어 있음 · 다음은 너?`); hallG.updateMatrixWorld(true); t.pos.copy(hallG.localToWorld(new V3(spots[i][0], spots[i][1] + 0.9, 0))); }
  for (let i = 0; i < list.length; i++) {
    const h = { root: new THREE.Group() }; const ch = await dress(h, list[i].code); if (!ch) continue;
    h.root.position.set(spots[i][0], spots[i][1], 0); h.root.rotation.y = 0; hallG.add(h.root); if (i === 0) ch.anim('emote-yes');
    const t = makeTag(list[i].sample ? 'sample' : '', `${i + 1}위 · ${list[i].label}`); t.obj = h.root; t.h = 1.35; podium.push({ h, ch, tag: t });
  }
}

// ───────── 입력: 조이스틱 · 키보드 · 탭 · 끌어서 돌리기 ─────────
const input = { x: 0, y: 0 }; const keys = new Set(); let camYaw = 0, camPitch = 0.3, camDist = 9.6; // 0.5→0.3: 북쪽 우주선이 화면에 더 들어오게(2026-11-27 · 화면 위쪽은 상단 버튼이 가린다)
{
  const joy = $('#joy'), knob = $('#knob'); let id = null, cx = 0, cy = 0; const R = 40;
  joy.addEventListener('pointerdown', (e) => { id = e.pointerId; try { joy.setPointerCapture(id); } catch { /* 합성 이벤트 */ } const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); e.preventDefault(); });
  const move = (e) => { if (e.pointerId !== id) return; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(${dx}px, ${dy}px)`; input.x = dx / R; input.y = dy / R; player.target = null; };
  joy.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; input.x = input.y = 0; };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}
addEventListener('keydown', (e) => { if (e.target.tagName === 'INPUT') return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); player.target = null; e.preventDefault(); } if (k === 'enter') { $('#say').focus(); e.preventDefault(); } if (k === 'e' && nearFac) nearFac.open(); });
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
{
  let down = null; const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); const pinch = new Map();
  canvas.addEventListener('pointerdown', (e) => { pinch.set(e.pointerId, [e.clientX, e.clientY]); down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, ly: e.clientY, moved: false }; try { canvas.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } });
  canvas.addEventListener('pointermove', (e) => {
    if (pinch.size === 2 && pinch.has(e.pointerId)) { const [a, b] = [...pinch.values()]; const d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); pinch.set(e.pointerId, [e.clientX, e.clientY]); const [c, d] = [...pinch.values()]; const d1 = Math.hypot(c[0] - d[0], c[1] - d[1]); camDist = THREE.MathUtils.clamp(camDist * d0 / d1, 5, 13); if (down) down.moved = true; return; }
    pinch.set(e.pointerId, [e.clientX, e.clientY]);
    if (!down) return; const dx = e.clientX - down.lx, dy = e.clientY - down.ly; down.lx = e.clientX; down.ly = e.clientY;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) down.moved = true;
    if (down.moved) { camYaw -= dx * 0.006; camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.004, 0.18, 1.05); }
  });
  canvas.addEventListener('pointerup', (e) => {
    pinch.delete(e.pointerId); if (!down) return; const d = down; down = null; if (d.moved || performance.now() - d.t > 500) return;
    if (HOOK.tap.some(f => { try { return f(e); } catch (er) { console.warn('tap 훅 오류', er); return false; } })) return; // 확장 모듈(NPC·조각 등)이 먼저 처리하면 땅 이동 안 함
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.children, true);
    const facHit = hits.find(h => h.object.userData.fac); const podHit = hits.find(h => podium.some(p => isChild(h.object, p.h.root)));
    if (facHit && facOf[facHit.object.userData.fac]) { walkTo(facOf[facHit.object.userData.fac].at); DC.sfx('tap'); return; }
    if (podHit) { walkTo(facOf.hall.at); return; }
    const p = new V3(); if (ray.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), 0), p) && walkable(p.x, p.z)) { walkTo([p.x, p.z]); showMarker(p); }
  });
  canvas.addEventListener('pointercancel', (e) => { pinch.delete(e.pointerId); down = null; });
  canvas.addEventListener('wheel', (e) => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, 5, 13); }, { passive: true });
}
const isChild = (o, root) => { while (o) { if (o === root) return true; o = o.parent; } return false; };
function walkTo([x, z]) { player.target = new V3(x, 0, z); }
const marker = mesh(new THREE.RingGeometry(0.25, 0.38, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0 }), 0, 0.03, 0, false); scene.add(marker);
function showMarker(p) { marker.position.set(p.x, 0.03, p.z); marker.material.opacity = 1; marker.scale.setScalar(1); }

// ───────── 길 안내(내비게이션) — 대표 「미션하러가기를 클릭하면 미션할 수 있는곳으로 네비게이션을 켜주던가」(2026-11-20) ─────────
// navTo('cab-merge' | [x,z] | () => [x,z], { label, onArrive }) → 캐릭터가 자동으로 걸어가고, 바닥에 화살표 길·목적지 위 표시·위쪽 안내칩이 뜬다.
// 조이스틱을 잡으면 자동 걷기만 멈추고 길 표시는 남는다(직접 가도 됨). 도착하면 저절로 꺼지고 그 시설의 들어가기 버튼이 반짝인다.
const NAV = { on: false, at: null, fac: null, label: '', onArrive: null, m: -1 };
const navMat = new THREE.MeshBasicMaterial({ color: 0xffcf3a, transparent: true, opacity: 0.95, depthWrite: false });
const navDots = new THREE.InstancedMesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.38, -0.2), new THREE.Vector2(0, 0.28), new THREE.Vector2(0.38, -0.2), new THREE.Vector2(0, -0.04)])).rotateX(-Math.PI / 2), navMat, 24);
navDots.count = 0; navDots.frustumCulled = false; navDots.renderOrder = 2; scene.add(navDots);
const navPin = new THREE.Group(); { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 4).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffcf3a })); const edge = new THREE.Mesh(cone.geometry, new THREE.MeshBasicMaterial({ color: 0x1f1a2e, side: THREE.BackSide })); edge.scale.setScalar(1.14); cone.add(edge); navPin.add(cone); } navPin.visible = false; scene.add(navPin);
const navChip = el('div', { class: 'w-nav hidden', role: 'status' }, el('span', { class: 'ar' }, ic('arrow')), el('span', { class: 't' }, el('b', { id: 'navName' }, ''), el('small', { id: 'navDist' }, '')), el('button', { class: 'x', type: 'button', 'aria-label': '길 안내 끄기', onclick: () => navStop(false) }, '끄기'));
document.body.append(navChip); const navArrow = navChip.querySelector('.ar .ic') || navChip.querySelector('.ar');
const navPos = (out) => { const a = NAV.at; const v = typeof a === 'function' ? a() : typeof a === 'string' ? facOf[a]?.at : a; if (!v) return null; out[0] = v[0]; out[1] = v[1]; return out; };
const navXY = [0, 0], navM4 = new THREE.Matrix4(), navQ = new THREE.Quaternion(), navS = new V3(1, 1, 1), navV = new V3(), navUp = new V3(0, 1, 0);
function navTo(at, { label, onArrive, auto = true, quiet = false } = {}) {
  const fac = typeof at === 'string' ? facOf[at] : null; if (typeof at === 'string' && !fac) return false;
  Object.assign(NAV, { on: true, at, fac, label: label || fac?.name || '목적지', onArrive: onArrive || null, m: -1, deg: null, auto, quiet });
  if (!quiet) closeSheet(); $('#navName').textContent = NAV.label; navChip.classList.toggle('hidden', quiet); navPin.visible = true;
  if (auto && navPos(navXY)) walkTo(navXY); if (!quiet) DC.sfx('tap'); return true;
}
function navStop(arrived) {
  if (!NAV.on) return; const fac = NAV.fac, cb = NAV.onArrive; NAV.on = false; navChip.classList.add('hidden'); navPin.visible = false; navDots.count = 0;
  if (!arrived) { if (NAV.auto) player.target = null; return; }
  DC.sfx('good'); DC.buzz(20); const b = $('#act'); if (fac && b) { b.classList.remove('nav-hl'); void b.offsetWidth; b.classList.add('nav-hl'); setTimeout(() => b.classList.remove('nav-hl'), 4200); }
  try { cb?.(); } catch (e) { console.error('길 안내 도착 처리 오류', e); }
}
function stepNav(t) {
  if (!NAV.on) return; if (!navPos(navXY)) { navStop(false); return; }
  const p = player.root.position, dx = navXY[0] - p.x, dz = navXY[1] - p.z, d = Math.hypot(dx, dz);
  if (d < (NAV.fac ? 1.5 : 1.0)) { navStop(true); return; }
  const m = Math.max(1, Math.round(d)); if (m !== NAV.m) { NAV.m = m; $('#navDist').textContent = `앞으로 ${m}걸음`; }
  // 칩의 화살표가 화면 기준 목적지 방향을 가리킨다(목적지가 화면 밖이어도 어느 쪽인지 보이게)
  const cy = camYaw, sx = dx * Math.cos(cy) - dz * Math.sin(cy), sy = -dx * Math.sin(cy) - dz * Math.cos(cy); const deg = Math.round(Math.atan2(-sy, sx) * 57.3);
  if (Math.abs(deg - (NAV.deg ?? 999)) > 3) { NAV.deg = deg; navArrow.style.transform = `rotate(${deg}deg)`; }
  if (NAV.auto && typeof NAV.at === 'function' && player.target && Math.hypot(player.target.x - navXY[0], player.target.z - navXY[1]) > 0.8) walkTo(navXY); // 움직이는 목표(친구·NPC)면 따라간다
  const ux = dx / d, uz = dz / d, ang = Math.atan2(ux, uz), ph = (t * 1.8) % 1.1; navQ.setFromAxisAngle(navUp, ang); let n = 0;
  for (let s2 = 1.0 + ph; s2 < d - 0.8 && n < 24; s2 += 1.1, n++) { navV.set(p.x + ux * s2, 0.05, p.z + uz * s2); navS.setScalar(1 - Math.max(0, (s2 - d + 3) / 3) * 0.4); navM4.compose(navV, navQ, navS); navDots.setMatrixAt(n, navM4); }
  navDots.count = n; navDots.instanceMatrix.needsUpdate = true;
  navPin.position.set(navXY[0], (NAV.fac ? 3.4 : 2.0) + Math.sin(t * 4) * 0.18, navXY[1]); navPin.rotation.y = t * 2;
}

// ───────── 이동·충돌·카메라 ─────────
const tmp = new V3();
function stepPlayer(dt) {
  let mx = 0, mz = 0;
  const kx = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  const ky = (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0);
  const ix = input.x + kx, iy = input.y + ky; const p = player.root.position;
  if (Math.hypot(ix, iy) > 0.12) { const s = Math.sin(camYaw), c = Math.cos(camYaw); mx = ix * c + iy * s; mz = -ix * s + iy * c; const m = Math.min(1, Math.hypot(mx, mz)); const n = Math.hypot(mx, mz) || 1; mx = mx / n * m; mz = mz / n * m; }
  else if (player.target) { tmp.subVectors(player.target, p); tmp.y = 0; const d = tmp.length(); if (d < 0.15) player.target = null; else { mx = tmp.x / d; mz = tmp.z / d; } }
  player.moving = mx !== 0 || mz !== 0;
  if (player.moving) {
    p.x += mx * SPEED * dt; p.z += mz * SPEED * dt; const want = Math.atan2(mx, mz); let d = want - player.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.root.rotation.y += d * Math.min(1, dt * 12);
    tut.moved += Math.hypot(mx, mz) * SPEED * dt;
  }
  for (const c of COL) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), r = c.r + 0.35; if (!(d < r && d > 0.0001)) continue;
    p.x = c.x + dx / d * r; p.z = c.z + dz / d * r;
    // 목표로 걷다 막히면 장애물 둘레를 따라 돌아간다(길 찾기 대신 미끄러지기)
    if (player.target) { let tx = -dz / d, tz = dx / d; const gx = player.target.x - p.x, gz = player.target.z - p.z; if (tx * gx + tz * gz < 0) { tx = -tx; tz = -tz; } p.x += tx * SPEED * dt; p.z += tz * SPEED * dt; }
  }
  if (clampWalk(p) && player.target) player.target = null;
  if (player.ch && player.onceUntil < performance.now()) player.ch.anim(player.moving ? 'walk' : 'idle');
}
const camPos = new V3(0, 6, 12), camLook = new V3(); let introCam = false;
function stepCamera(dt, snap = false) {
  const p = player.root.position; const want = new V3(p.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, p.y + 1 + Math.sin(camPitch) * camDist, p.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
  const k = snap ? 1 : 1 - Math.exp(-dt * 6); camPos.lerp(want, k); camLook.lerp(tmp.set(p.x, p.y + 1.0, p.z), k); camera.position.copy(camPos); camera.lookAt(camLook);
}

// ───────── 가까운 시설 ─────────
let nearFac = null;
function stepNear() {
  const p = player.root.position; let best = null, bd = 1.7;
  for (const f of FAC) { if (NAV.on && NAV.fac && f !== NAV.fac) continue; const d = Math.hypot(p.x - f.at[0], p.z - f.at[1]); if (d < bd) { bd = d; best = f; } } // 길 안내 중엔 목적지 버튼만
  if (best !== nearFac) {
    nearFac = best; const b = $('#act');
    if (best) { $('#actIcon').replaceChildren(ic(best.icon)); $('#actText').textContent = best.act; $('#actKey').hidden = !fine; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; DC.sfx('tick'); }
    else b.classList.add('hidden');
  }
}
$('#act').onclick = () => nearFac?.open();

// ───────── 다른 주민(실시간) ─────────
const peers = new Map(); let room = null;
function peerObj(id) {
  let o = peers.get(id); if (o) return o;
  o = { root: new THREE.Group(), ch: null, code: null, cur: new V3(), tgt: new V3(), ry: 0, tag: makeTag('', '…'), seen: Date.now() }; o.tag.obj = o.root; o.tag.h = 1.45; scene.add(o.root); peers.set(id, o); return o;
}
function onPeer(p) {
  const o = peerObj(p.id);
  if (p.code && p.code !== o.code) { o.code = p.code; dress(o, p.code); }
  if (p.name) o.tag.el.querySelector('.nm').textContent = p.name;
  if (p.st) { o.tgt.set(p.st.x, 0, p.st.z); o.ry = p.st.r; if (!o.placed) { o.cur.copy(o.tgt); o.placed = true; } }
  o.seen = Date.now(); updateOnline();
}
function onLeave({ id }) { const o = peers.get(id); if (!o) return; scene.remove(o.root); o.tag.el.remove(); tags.delete(o.tag); peers.delete(id); updateOnline(); }
function updateOnline() {
  const n = peers.size + 1; const e = $('#online');
  e.textContent = net.mode === 'local' ? (n > 1 ? `시험판 · 이 기기 창 ${n}개` : '시험판 · 나 혼자') : `지금 ${n}명`;
}
let sendT = 0, wasMoving = false;
function stepNet(now) {
  if (!room) return; const p = player.root.position;
  if ((player.moving && now - sendT > 400) || /* 1초 2.5번 — 2026-11-22 실서버 시험: 무료 한도는 프로젝트 전체 초당 신호 수(약 600)라 1초 6번이면 10명 남짓에서 끊겼다 */ (!player.moving && wasMoving)) { sendT = now; room.move({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), r: +player.root.rotation.y.toFixed(2) }); }
  wasMoving = player.moving;
}
function stepPeers(dt) {
  for (const o of peers.values()) {
    const d = o.cur.distanceTo(o.tgt); o.cur.lerp(o.tgt, Math.min(1, dt * 8)); o.root.position.copy(o.cur);
    let dr = o.ry - o.root.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); o.root.rotation.y += dr * Math.min(1, dt * 10);
    if (o.ch && !(o.onceUntil > performance.now())) o.ch.anim(d > 0.04 ? 'walk' : 'idle'); o.ch?.mixer.update(dt);
  }
}

// ───────── 채팅 ─────────
const BAD = ['시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅄ', 'ㅂㅅ', '좆', '존나', '졸라', '지랄', '개새', '새끼', '미친놈', '미친년', '닥쳐', '꺼져', '느금', '니애미', 'fuck', 'shit', 'bitch', '섹스', 'sex', '야동', '자살', '죽어'];
const CONTACT = /(\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4})|(https?:\/\/|www\.|\.com\b|\.kr\b|\.net\b|\.gg\b)|(카톡|오픈채팅|오카|kakao|텔레|telegram|디코|discord|라인\s?아이디|인스타\s?아이디|dm\s?줘|번호\s?줘)/i;
let lastSay = 0;
function clean(t) { t = String(t).replace(/\s+/g, ' ').trim().slice(0, 60); if (!t) return { ok: false }; if (CONTACT.test(t)) return { ok: false, msg: '연락처·링크·다른 메신저 얘기는 못 보내. 안전 규칙이야' }; let out = t; for (const w of BAD) out = out.split(w).join('♡'.repeat(Math.min(3, w.length))); return { ok: true, text: out }; }
function say(text, quick = false) {
  if (!quick && !canTalk()) { DC.toast(GUEST ? '구경 중엔 빠른 말만 보낼 수 있어 (비밀 암호는 돼)' : '자유 채팅은 캐릭터 저장(만 14세 이상) 뒤에 열려'); return false; }
  const now = Date.now(); if (now - lastSay < 1200) { DC.toast('조금만 천천히!'); return false; }
  const c = clean(text); if (!c.ok) { if (c.msg) { DC.toast(c.msg); DC.sfx('bad'); } return false; }
  lastSay = now; window.DP?.event('chat'); room?.say(c.text); if (player.tag) bubble(player.tag, c.text); log(displayName(), c.text, true); DC.sfx('tap'); tut.said = true; return true;
}
function log(name, text, mine = false, sys = false) {
  const ol = $('#log'); const li = el('li', { class: sys ? 'sys' : '' }, sys ? '' : el('b', {}, mine ? '나' : name), text); ol.append(li);
  while (ol.children.length > 5) ol.firstChild.remove(); setTimeout(() => li.classList.add('old'), 9000); setTimeout(() => li.remove(), 9800);
}
function onChat(m) { const o = peers.get(m.id); const c = clean(m.text); if (!c.ok) return; if (o) bubble(o.tag, c.text); log(m.name || '주민', c.text); }
W.quick.forEach(q => $('#quick').append(el('button', { type: 'button', onclick: () => say(q, true) }, q)));
$('#coachBot').innerHTML = BOT;
$('#sayForm').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#say'); if (say(i.value)) i.value = ''; i.blur(); });
// 구경 중에도 입력칸은 열린다 — 영상 속 비밀 암호를 칠 수 있게. 자유 채팅 전송은 say()가 여전히 막는다(암호는 world-secrets 가 먼저 가로채고 방송 안 함)
$('#emote').onclick = () => { if (!player.ch) return; const d = player.ch.anim('emote-yes', { once: true }); player.onceUntil = performance.now() + d * 1000; room?.say('👋'); if (player.tag) bubble(player.tag, '👋'); DC.sfx('good'); };

// ───────── 시트(공용) ─────────
function sheet(title, ...kids) { $('#sheetTitle').textContent = title; const b = $('#sheetBody'); b.replaceChildren(...kids.flat().filter(k => k != null && k !== false && k !== '')); $('#sheet').classList.remove('hidden'); $('#sheetClose').classList.toggle('hidden', !!sheet.locked); }
function closeSheet() { if (sheet.locked) return; $('#sheet').classList.add('hidden'); }
$('#sheetClose').onclick = closeSheet; $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

// 명예의 전당
const GAME_KEYS = { merge: ['best_merge', (v) => `${(v || 0).toLocaleString()}점`], survive: ['best_survive', (v) => `${v?.days || 0}일`], find: ['find_best', (v) => `${v || 0}점`], land: ['land_best', (v) => `${v || 0}점`] };
// 서버가 센 이번 주 순위(서버가 없으면 data.js world.hall). 이름 = 공개 동의한 인스타 아이디, 아니면 캐릭터 이름
const nameOf = (code, ig) => ig ? '@' + ig : K.charName(K.decodeChar(code) || K.defaultChar());
const FMT = { merge: (v) => `${v.toLocaleString()}점`, survive: (v) => `${v}일`, find: (v) => `${v.toLocaleString()}점`, land: (v) => `${v.toLocaleString()}점` };
async function liveHall(tab) {
  if (net.mode !== 'local') {
    try {
      if (tab === 'hearts') {
        const counts = await net.hearts.counts(); if (counts) { const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10); const names = await net.names(top.map(t => t[0])); return top.map(([code, n]) => ({ code, name: nameOf(code, names[code]), v: `${n} 하트` })); }
      } else { const top = await net.scores.top(tab, 10); if (top) return top.map(r => ({ code: r.code, name: nameOf(r.code, r.ig), v: FMT[tab](r.score) })); }
    } catch (e) { console.warn('순위를 못 불러옴', e); }
  }
  return tab === 'hearts' ? (W.hall.hearts || []).map(r => ({ code: r.code, name: nameOf(r.code, r.ig), v: `${r.likes} 하트` })) : (W.hall.games || []).filter(r => r.game === tab).map(r => ({ code: r.code, name: nameOf(r.code, r.ig), v: FMT[tab](r.score) }));
}
async function openHall(tab = 'hearts') {
  const tabs = [['hearts', '하트 순위'], ...GAMES.map(g => [g.id, g.name])];
  const bar = el('div', { class: 'tabs2', role: 'tablist' }, tabs.map(([id, n]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(id === tab), onclick: () => openHall(id) }, n)));
  const list = el('ol', { class: 'list' }); const empty = el('p', { class: 'note' }, '순위를 불러오는 중…');
  const mine = GAME_KEYS[tab] && el('p', { class: 'note' }, `내 최고 기록: ${GAME_KEYS[tab][1](DC.store.get(GAME_KEYS[tab][0], null))}`);
  const prize = el('div', { class: 'prize' }, W.prize ? [el('b', {}, ic('gift'), '이번 주 보상'), el('p', {}, W.prize.text), el('p', { class: 'note' }, W.prize.rule || '')] : [el('b', {}, ic('gift'), '주간 보상은 준비 중이야'), el('p', { class: 'note' }, '정해지면 여기랑 인스타에 먼저 공지할게.')]);
  const rule = el('p', { class: 'note' }, '순위엔 캐릭터 이름이 떠. 인스타 공개에 동의하면 아이디로 나와.');
  const btn = tab === 'hearts' ? el('a', { class: 'btn k sun', href: 'plaza.html' }, ic('heart'), '자랑 게시판에서 하트 주기 (새 화면)') : el('a', { class: 'btn k sun', href: GAMES.find(g => g.id === tab).href }, ic('game'), '한 판 하고 오기 (새 화면)');
  sheet('명예의 전당', el('p', { class: 'lead' }, '이번 주(월~일) 순위 · 일요일 밤 발표'), bar, list, empty, mine, prize, rule, btn);
  tut.hall = true; window.DP?.event('visit', { place: 'hall' });
  const rows = await liveHall(tab); if (!$('#sheet').contains(list)) return; // 그새 다른 화면으로 넘어감
  rows.forEach((r, i) => list.append(el('li', {}, el('span', { class: 'r' }, String(i + 1)), el('span', { class: 'n' }, el('b', {}, r.name)), el('span', { class: 'v' }, r.v))));
  empty.textContent = rows.length ? '' : (net.mode === 'local' ? '시험판이라 순위 서버가 꺼져 있어.' : '이번 주 첫 기록의 주인공이 돼 봐!'); if (!rows.length) empty.style.display = ''; else empty.remove();
}
// 이번 편 극장
function openTheater() {
  const link = latestEp.links?.instagram || D.site.links.instagram;
  sheet(`${latestEp.no}편 극장`, el('p', { class: 'lead' }, latestEp.title), el('div', { class: 'eps' }, latestEp.planets.map(p => el('a', { href: `index.html#${p.id}` }, el('img', { src: p.img, alt: '' }), p.name))),
    el('a', { class: 'btn k sun', href: link, target: '_blank', rel: 'noopener' }, ic('play'), '릴스로 보기'), el('a', { class: 'btn k', href: 'index.html' }, '나라면 어느 행성? 고르기 (새 화면)'));
}
// 광장 지도 — 시설 목록, 누르면 길 안내(점검 6번 「어디 있는지 모름」)
function openMap() {
  const seen = new Set(); const list = FAC.filter(f => { const k = f.name; if (!k || seen.has(k) || f.hidden) return false; seen.add(k); return true; });
  sheet('광장 지도', el('p', { class: 'lead' }, '가고 싶은 곳을 누르면 화살표로 데려다줄게.'),
    el('ul', { class: 'list' }, list.map(f => el('li', {}, el('span', { class: 'r' }, ic(f.icon || 'arrow')), el('span', { class: 'n' }, el('b', {}, f.name), el('small', {}, f.act || '')),
      el('button', { class: 'k sky', type: 'button', style: 'padding:9px 12px', onclick: () => navTo(f.id) }, '가기')))));
}
// 메뉴
$('#menuBtn').onclick = () => {
  const fol = profile?.follow === 'ok' ? el('span', { class: 'pill ok' }, '팔로우 확인됨') : null;
  sheet('메뉴',
    el('p', { class: 'lead' }, GUEST ? '구경 중이야' : `${displayName()}${profile?.ig ? ` · @${profile.ig}` : ''}`), fol,
    GUEST ? el('a', { class: 'btn k sun', href: 'maker.html?flow=join' }, ic('user'), '내 캐릭터 만들기') : !profile ? el('button', { class: 'btn k sun', type: 'button', onclick: () => join(0) }, ic('user'), '내 캐릭터 저장하기') : el('a', { class: 'btn k', href: 'maker.html?flow=world' }, ic('mirror'), '캐릭터 꾸미기'),
    el('button', { class: 'btn k', type: 'button', onclick: openMap }, ic('arrow'), '광장 지도 · 길 안내'),
    document.getElementById('bgmBtn') && el('button', { class: 'btn k', type: 'button', onclick: () => { document.getElementById('bgmBtn').click(); closeSheet(); } }, ic('play'), document.getElementById('bgmBtn').classList.contains('off') ? '소리 꺼짐 · 눌러서 켜기' : '소리 켜짐 · 눌러서 끄기'),
    profile && profile.follow !== 'ok' && el('button', { class: 'btn k', type: 'button', onclick: () => join(2) }, ic('gift'), '상 받는 법 (팔로우 확인)'),
    el('div', { class: 'row2' }, el('a', { class: 'btn k', href: 'arcade.html' }, ic('game'), '아케이드'), el('a', { class: 'btn k', href: 'town.html' }, ic('home'), '내 행성')),
    el('button', { class: 'btn k', type: 'button', onclick: () => { tutStart(true); closeSheet(); } }, ic('help'), '처음 안내 다시 보기'),
    el('button', { class: 'btn k', type: 'button', onclick: privacy }, ic('lock'), '개인정보 안내'),
    profile && el('button', { class: 'btn k', type: 'button', onclick: async () => { if (!confirm('이 기기에 저장된 내 정보를 지울까? (캐릭터는 남아)')) return; await net.profile.save(null); DC.store.set('profile', null); await net.signOut(); location.reload(); } }, ic('trash'), '내 정보 지우기'));
};
function privacy() {
  sheet('개인정보 안내',
    el('p', { class: 'lead' }, '돈워너노우 우주 광장이 받는 정보와 이유야.'),
    el('ul', { class: 'list' },
      el('li', {}, el('span', { class: 'n' }, el('b', {}, '인스타 아이디 (필수)'), el('small', {}, '계정 확인 · 팔로우 확인 · (동의한 경우) 명예의 전당 표시 · 보상 연락'))),
      el('li', {}, el('span', { class: 'n' }, el('b', {}, '성별 · 연령대 (선택)'), el('small', {}, '어떤 분들이 즐기는지 알고 콘텐츠를 맞추려고. 안 적어도 다 쓸 수 있어'))),
      el('li', {}, el('span', { class: 'n' }, el('b', {}, '로그인 정보'), el('small', {}, '구글·카카오 로그인 시 계정 식별값만. 비밀번호는 받지 않아'))),
      el('li', {}, el('span', { class: 'n' }, el('b', {}, '보관 기간'), el('small', {}, '「내 정보 지우기」 또는 탈퇴하면 바로 삭제'))),
      el('li', {}, el('span', { class: 'n' }, el('b', {}, '만 14세 미만'), el('small', {}, '저장은 만 14세 이상만. 그 전엔 구경과 게임만 할 수 있어')))),
    el('p', { class: 'note' }, net.mode === 'local' ? '지금은 시험판이라 모든 정보가 이 기기 안에만 저장돼(서버로 가지 않아).' : '정보는 광장 서버(Supabase · 서울)에 저장돼.'));
}

// ───────── 주민 등록(로그인 → 정보 → 팔로우 확인 → 동의) ─────────
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'DWK-' + Array.from({ length: 4 }, () => ALPH[Math.floor(Math.random() * ALPH.length)]).join('');
let draft = null;
function steps(n) { return el('div', { class: 'steps' }, [0, 1, 2, 3].map(i => el('i', { class: i <= n ? 'on' : '' }))); }
function join(step = 0) {
  draft ||= { ...(profile || {}), followCode: profile?.followCode || newCode(), agree: { ...(profile?.agree || {}) } };
  [joinLogin, joinInfo, joinFollow, joinAgree][step]();
}
function joinLogin() {
  const local = net.mode === 'local'; const err = el('p', { class: 'err' });
  const prov = W.providers || []; const b = (label, provId, cls, extra = {}) => el('button', { class: 'btn k ' + cls, type: 'button', disabled: provId !== 'device' && (local || !prov.includes(provId)) ? '' : null, ...extra, onclick: async () => { const r = await net.signIn(provId); if (!r.ok) { err.textContent = r.msg; return; } if (!r.redirect) join(1); } }, label);
  sheet('내 캐릭터 저장', steps(0), el('p', { class: 'lead' }, '내 캐릭터를 저장할게. 그래야 순위·채팅·내 행성을 쓸 수 있어.'),
    b([ic('phone'), '이 기기로 저장하기'], 'device', 'sun'), // 열린 로그인만 보인다(막힌 버튼은 숨김)
    !local && prov.includes('google') && b([el('b', { style: 'font:900 18px/1 Arial,sans-serif;color:#4285f4' }, 'G'), '구글로 계속하기'], 'google', ''), !local && prov.includes('kakao') && b([ic('chat'), '카카오로 계속하기'], 'kakao', '', { style: 'background:#fee500' }), err,
    el('button', { class: 'btn k', type: 'button', onclick: () => { closeSheet(); spawn(); } }, '저장은 나중에 · 먼저 둘러보기'));
}
function joinInfo() {
  const err = el('p', { class: 'err' }); const ig = el('input', { id: 'ig', inputmode: 'text', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false', placeholder: '인스타 아이디', value: draft.igRaw ?? draft.ig ?? '', maxlength: '30', oninput: (e) => { draft.igRaw = e.target.value; } });
  const chips = (key, opts) => el('div', { class: 'chips' }, opts.map(([v, n]) => { const btn = el('button', { type: 'button', 'aria-pressed': String(draft[key] === v), onclick: () => { draft[key] = draft[key] === v ? null : v; joinInfo(); } }, n); return btn; }));
  const noIg = el('input', { type: 'checkbox', ...(draft.noIg ? { checked: '' } : {}), onchange: (e) => { draft.noIg = e.target.checked; ig.disabled = e.target.checked; } }); ig.disabled = !!draft.noIg;
  const over = el('input', { type: 'checkbox', ...(draft.over14 ? { checked: '' } : {}), onchange: (e) => { draft.over14 = e.target.checked; } });
  sheet('기본 정보', steps(1), el('p', { class: 'lead' }, '순위에 뜰 이름이야. 인스타가 없으면 아래 칸만 체크해.'),
    el('div', { class: 'field' }, el('span', {}, '@'), ig),
    el('label', { class: 'chk' }, noIg, el('span', {}, '인스타가 없어', el('small', {}, '광장·게임은 다 할 수 있어. 시상대·보상만 빠져'))),
    el('h3', {}, '성별 (선택)'), chips('gender', [['m', '남'], ['f', '여'], ['x', '말 안 할래']]),
    el('h3', {}, '나이 (선택)'), chips('age', [['14', '14~16'], ['17', '17~19'], ['20', '20대'], ['30', '30대'], ['40', '40대 이상']]),
    el('label', { class: 'chk' }, over, el('span', {}, el('b', {}, '만 14세 이상이야 (필수)'), el('small', {}, '만 14세 미만은 구경·게임만 돼'))), err,
    el('button', { class: 'btn k sun', type: 'button', onclick: () => {
      const v = ig.value.trim().replace(/^@/, '');
      if (!draft.noIg && !/^[A-Za-z0-9._]{1,30}$/.test(v)) { err.textContent = '인스타 아이디는 영문·숫자·점(.)·밑줄(_)만 써'; return; }
      if (!draft.over14) { err.textContent = '만 14세 이상만 저장할 수 있어. 아니면 「나중에」로 구경해 줘'; return; }
      draft.ig = draft.noIg ? null : v.toLowerCase(); join(draft.noIg ? 3 : 2);
    } }, '다음'), el('button', { class: 'btn k', type: 'button', onclick: () => join(0) }, '← 뒤로'));
}
function joinFollow() {
  const dm = `https://ig.me/m/${D.site.handle}`;
  sheet('상 받는 법', steps(2), el('p', { class: 'lead' }, `순위 상을 받으려면 @${D.site.handle} 팔로우하고 이 코드를 DM으로 보내 줘. 지금 안 해도 돼.`),
    el('p', { class: 'code' }, draft.followCode),
    el('button', { class: 'btn k sun', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(draft.followCode); DC.toast('코드를 복사했어. DM 창에 붙여 넣어 줘'); } catch { DC.toast('코드를 길게 눌러 복사해 줘'); } open(dm, '_blank', 'noopener'); } }, ic('copy'), '코드 복사하고 DM 열기'),
    el('p', { class: 'note' }, net.mode === 'local' ? '시험판이라 아직 자동 확인이 안 돼. 서버를 켜면 DM이 오는 대로 확인돼.' : 'DM을 보내면 보통 1분 안에 확인돼.'),
    el('button', { class: 'btn k', type: 'button', onclick: () => join(3) }, profile ? '닫기' : '나중에 할게 · 다음'), el('button', { class: 'btn k', type: 'button', onclick: () => join(1) }, '← 뒤로'));
}
function joinAgree() {
  const a = draft.agree; const err = el('p', { class: 'err' });
  const box = (key, label, small, req) => el('label', { class: 'chk' }, el('input', { type: 'checkbox', ...(a[key] ? { checked: '' } : {}), onchange: (e) => { a[key] = e.target.checked; } }), el('span', {}, el('b', {}, `${label} (${req ? '필수' : '선택'})`), el('small', {}, small)));
  sheet('채팅 규칙 확인', steps(3),
    box('privacy', '개인정보 수집·이용 동의', `${draft.ig ? '인스타 아이디' : '캐릭터'}${draft.gender || draft.age ? '·성별·연령대' : ''} — 계정 확인과 순위 표시에만 써. 지우면 바로 삭제`, true),
    box('chat', '광장 채팅 규칙', '욕설·연락처·링크·광고 금지. 어기면 채팅이 막혀', true),
    !draft.noIg && box('podium', '명예의 전당에 인스타 아이디 공개', '안 하면 순위에 들어도 캐릭터 이름으로만 나와', false),
    el('button', { class: 'btn k', type: 'button', onclick: privacy }, ic('lock'), '자세히 보기'), err,
    el('button', { class: 'btn k sun', type: 'button', onclick: async () => {
      if (!a.privacy || !a.chat) { err.textContent = '필수 두 개에 동의해야 저장할 수 있어'; return; }
      if (!net.user()) { const r = await net.signIn('device'); if (!r.ok) { err.textContent = r.msg; return; } }
      const p = { ig: draft.ig, gender: draft.gender || null, age: draft.age || null, over14: true, agree: a, followCode: draft.followCode, follow: profile?.follow || 'pending', charCode: K.encodeChar(me) };
      const r = await net.profile.save(p); if (!r.ok) { err.textContent = '저장을 못 했어: ' + (r.msg || ''); return; }
      profile = p; sheet.locked = false; closeSheet(); $('#say').placeholder = '말하기…'; DC.sfx('win'); DC.buzz([20, 40, 20]); spawn();
    } }, ic('star'), '광장에 소환되기'), el('button', { class: 'btn k', type: 'button', onclick: () => join(draft.noIg ? 1 : 2) }, '← 뒤로'));
}

// ───────── 튜토리얼 ─────────
const tut = { i: -1, moved: 0, said: false, hall: false, beacon: null };
const TUT = [
  { text: () => fine ? 'W A S D 키를 누르거나, 가고 싶은 땅을 클릭해 봐.' : '왼쪽 아래 동그라미를 밀면 걸어가. 한번 해 봐!', done: () => tut.moved > 2.5 },
  { text: () => '잘했어! 아래 반짝이는 「안녕!」을 눌러 인사해 봐.', done: () => tut.said },
  { text: () => facOf.gate ? '바닥 노란 화살표를 따라 빛기둥(탑승구)까지 가 봐. 지금 몇 명 탔는지 거기 있어.' : '바닥 노란 화살표를 따라 빛기둥(명예의 전당)까지 가 봐.', done: () => { const f = facOf.gate || facOf.hall; return nearFac?.id === f.id || (!facOf.gate && tut.hall) || Math.hypot(player.root.position.x - f.at[0], player.root.position.z - f.at[1]) < 2.6; }, at: () => (facOf.gate || facOf.hall).at, nav: () => (facOf.gate ? 'gate' : 'hall') },
  { text: () => '마지막! 화살표 따라 게임기 앞에 서면 노란 버튼으로 바로 한 판 할 수 있어.', done: () => nearFac?.id?.startsWith('cab-'), at: () => facOf['cab-merge'].at, nav: 'cab-merge' },
];
// 안내봇 말은 한 글자씩(게임 대화창처럼). 움직임 줄이기 설정이면 바로
function typeText(node, text) { clearInterval(typeText.t); if (reduce) { node.textContent = text; return; } let i = 0; node.textContent = ''; typeText.t = setInterval(() => { node.textContent = text.slice(0, ++i); if (i % 3 === 0) DC.sfx('tick'); if (i >= text.length) clearInterval(typeText.t); }, 28); }
function tutStart(force = false) { if (!force && DC.store.get('world_tut', false)) return; tut.i = 0; tut.moved = 0; tut.said = false; tut.hall = false; tutShow(); }
function tutShow() {
  const c = $('#coach'); const on = tut.i >= 0 && tut.i < TUT.length; document.body.classList.toggle('tut-on', on); document.body.classList.toggle('tut-hi', on && tut.i === 1);
  if (!on) { c.classList.add('hidden'); beacon(null); if (NAV.on && NAV.quiet) navStop(false); return; }
  const nv0 = TUT[tut.i].nav, nv = typeof nv0 === 'function' ? nv0() : nv0; if (nv) navTo(nv, { auto: false, quiet: true }); else if (NAV.on && NAV.quiet) navStop(false);
  $('#coachDots').replaceChildren(...TUT.map((_, i) => el('i', { class: i <= tut.i ? 'on' : '' }))); typeText($('#coachText'), TUT[tut.i].text()); c.classList.remove('hidden');
  beacon(TUT[tut.i].at?.() || null);
}
function stepTut() {
  if (tut.i < 0 || tut.i >= TUT.length) return;
  if (TUT[tut.i].done()) { tut.i++; DC.sfx('good'); DC.buzz(15); if (tut.i >= TUT.length) tutEnd(); else tutShow(); }
}
function tutEnd() { tut.i = -1; DC.store.set('world_tut', true); tutShow(); log('', '안내 끝! 이제 마음대로 놀아 봐. 오른쪽 「미션」에 오늘 할 일이 있어', false, true); if (!GUEST) { DC.rewards.add('badge-resident', '광장 주민 배지', '광장 튜토리얼'); const r = DP?.checkin(); if (r) setTimeout(() => DC.toast(`출석 ${r.streak}일째 · +${r.coins}코인`), 900); } } // 창을 연달아 띄우지 않는다(점검 B8)
$('#coachSkip').onclick = () => { tut.i = -1; DC.store.set('world_tut', true); tutShow(); };
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.visible = false; scene.add(beam);
function beacon(at) { beam.visible = !!at && !SHOT; if (at) // 촬영 모드(?shot=)에선 튜토리얼 빛기둥이 우주선을 가려 숨긴다
 beam.position.set(at[0], 7, at[1]); }

// ───────── 소환 ─────────
let spawned = false;
async function spawn() {
  if (spawned) return; spawned = true;
  const back = backFrom(); stepCamera(0, true);
  await dress(player, me); player.tag = makeTag('me', GUEST ? '구경 중' : displayName()); player.tag.obj = player.root; player.tag.h = 1.45;
  const p = player.root.position;
  if (SHOT) { player.root.position.set(0.6, 0, -16.2); player.root.rotation.y = Math.PI; } // 촬영: 탑승구 줄 맨 앞에 선다
  if (SHOT) spawnDemoCrowd(); // 촬영 모드에서만 견본 주민 무리(실서비스 무영향)
  const dropIntro = !back && !reduce && !SHOT && !Q.has('from') && !Q.has('nodrop');
  let introDone = Promise.resolve();
  if (dropIntro) introDone = shipDrop(p); else {
  const fx = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 16, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  fx.position.set(p.x, 8, p.z); scene.add(fx); const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); ring.position.set(p.x, 0.04, p.z); scene.add(ring);
  const t0 = performance.now(), dur = reduce ? 1 : 1100; player.root.position.y = reduce ? 0 : 6;
  anims.push((now) => { const t = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - t, 3); player.root.position.y = reduce ? 0 : 6 * (1 - e) + (t > 0.85 ? Math.sin((t - 0.85) / 0.15 * Math.PI) * 0.15 : 0); fx.material.opacity = 0.55 * (1 - t); ring.scale.setScalar(1 + t * 6); ring.material.opacity = 1 - t; if (t >= 1) { player.root.position.y = 0; scene.remove(fx, ring); DC.sfx('land'); DC.buzz(30); return true; } });
  }
  room = net.room(W.room); room.on('peer', onPeer); room.on('leave', onLeave); room.on('chat', onChat); room.on('msg', (m) => (HOOK.msg[m.type] || []).forEach(f => { try { f(m.data, m.id, peers.get(m.id)); } catch (e) { console.error(e); } }));
  room.join({ code: K.encodeChar(me), name: GUEST ? '구경꾼' : displayName(), st: { x: p.x, z: p.z, r: player.root.rotation.y } }); updateOnline();
  log('', GUEST ? '탑승 대기장 구경 중 · 정면이 탑승구야' : back ? '탑승 대기장으로 돌아왔어' : `${displayName()} 탑승 대기장 도착 · 정면이 탑승구야`, false, true);
  HOOK.spawn.forEach(f => { try { f(); } catch (e) { console.error('확장 spawn 오류', e); } });
  if (!SHOT) introDone.then(() => setTimeout(() => { tutStart(); if (DP && !GUEST && DC.store.get('world_tut', false)) { const r = DP.checkin(); if (r) showCheckin(r); } }, reduce ? 200 : 700));
}
// ───────── 입장 연출: 우주선에서 뛰어내려 광장에 착지(대표 「배틀그라운드나 테일즈런너 … 우주선에서 떨어지는 느낌으로」 2026-11-20) ─────────
// 우주선이 광장 위를 가로지르다 문이 열리고(빛) 캐릭터가 뛰어내린다 → 카메라가 위에서 따라 떨어진다 → 발밑 분사로 속도를 줄이며 착지. 화면을 누르면 건너뛴다.
function shipDrop(p0) {
  const p = p0.clone(); // 착지점(플레이어 위치는 연출 중 계속 바뀌므로 복사)
  return new Promise((done) => {
    const H = 30, T_JUMP = 1.25, T_FALL = 2.1, T_LAND = 0.55, TOTAL = T_JUMP + T_FALL + T_LAND;
    const yaw = camYaw, side = new V3(Math.cos(yaw), 0, -Math.sin(yaw)), back = new V3(Math.sin(yaw), 0, Math.cos(yaw));
    const ship = makeShip(THREE); ship.group.scale.setScalar(1.7); ship.group.rotation.z = -Math.PI / 2; ship.group.rotation.y = yaw; ship.setThrust(0.8); scene.add(ship.group);
    const shipAt = (t) => tmp.copy(p).addScaledVector(side, -26 + t * 16).setY(H); // 초당 16칸
    const jumpFrom = new V3(); shipAt(T_JUMP); jumpFrom.copy(tmp).setY(H - 1.2);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(flash);
    const N = 26, lp = new Float32Array(N * 6); const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lp, 3)), new THREE.LineBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0 }));
    lines.frustumCulled = false; scene.add(lines); const seeds = Array.from({ length: N }, () => [(Math.random() - 0.5) * 5, Math.random() * 12, (Math.random() - 0.5) * 5]);
    const boot = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 12, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffcf3a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(boot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.62, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0, depthWrite: false })); ring.position.set(p.x, 0.05, p.z); scene.add(ring);
    const tag = player.tag?.el; if (tag) tag.style.visibility = 'hidden';
    document.body.classList.add('w-intro'); const cap = el('p', { class: 'w-introcap' }, '탑승 대기장 상공 · 문이 열리면 뛰어내려'); if (!Q.has('film')) document.body.append(cap);
    introCam = true; const t0 = performance.now(); let jumped = false, landed = false, finished = false;
    const camP = new V3(), camL = new V3();
    const end = () => { if (finished) return; finished = true; introCam = false; scene.remove(ship.group, flash, lines, boot, ring); player.root.position.set(p.x, 0, p.z); player.root.rotation.x = 0;
      if (tag) tag.style.visibility = ''; document.body.classList.remove('w-intro'); cap.remove(); camPos.copy(camera.position); camLook.copy(tmp.set(p.x, 1, p.z)); removeEventListener('pointerdown', skip, true); done(); };
    const skip = (e) => { if (e.target.closest?.('#sheet')) return; const t = (performance.now() - t0) / 1000; if (t < TOTAL - 0.3) { landFx(); end(); } };
    const landFx = () => { if (landed) return; landed = true; DC.sfx('land'); DC.buzz([30, 40, 30]); player.ch?.anim('jump', { once: true }); };
    setTimeout(() => addEventListener('pointerdown', skip, true), 350);
    DC.sfx('swipe');
    anims.push((now) => {
      if (finished) return true; const t = (now - t0) / 1000; ship.tick(0.016);
      shipAt(Math.min(t, TOTAL)); ship.group.position.copy(tmp); ship.group.position.y += Math.sin(t * 3) * 0.15;
      if (t < T_JUMP) { // 1) 우주선이 들어온다 — 캐릭터는 안에 있다
        player.root.position.copy(jumpFrom).setY(-50);
        camP.copy(p).addScaledVector(back, 9).setY(3.2); camL.copy(ship.group.position).lerp(MOTHER_LOOK, 0.42); camera.position.copy(camP); camera.lookAt(camL); // 셔틀과 발사대 위 모선이 한 화면에
        const k = Math.max(0, (t - (T_JUMP - 0.35)) / 0.35); flash.position.copy(ship.group.position).setY(H - 0.9); flash.material.opacity = k * 0.9; flash.scale.setScalar(0.6 + k);
      } else if (t < T_JUMP + T_FALL) { // 2) 뛰어내려 떨어진다
        if (!jumped) { jumped = true; DC.sfx('unlock'); cap.textContent = '탑승 대기장으로 낙하 중 · 누르면 바로 착지'; }
        const f = (t - T_JUMP) / T_FALL, e = f < 0.82 ? (f / 0.82) ** 2 * 0.93 : 0.93 + (1 - (1 - (f - 0.82) / 0.18) ** 2) * 0.07;
        player.root.position.lerpVectors(jumpFrom, tmp.set(p.x, 0, p.z), Math.min(1, f * 1.15)); player.root.position.y = jumpFrom.y * (1 - e);
        player.root.rotation.x = f < 0.8 ? 0.9 : 0.9 * (1 - (f - 0.8) / 0.2); player.root.rotation.y = yaw + Math.PI + Math.sin(t * 2) * 0.15;
        flash.material.opacity = Math.max(0, 0.9 - (t - T_JUMP) * 2);
        const q = player.root.position; camP.set(q.x, q.y + 5.5, q.z).addScaledVector(back, 4.5 + 3 * f); camL.set(q.x, q.y - 2.5, q.z); camera.position.copy(camP); camera.lookAt(camL);
        lines.material.opacity = f < 0.8 ? 0.7 : 0.7 * (1 - (f - 0.8) / 0.2);
        for (let i = 0; i < N; i++) { const s = seeds[i], yy = ((s[1] - t * 30) % 12 + 12) % 12 - 6; lp.set([q.x + s[0], q.y + yy, q.z + s[2], q.x + s[0], q.y + yy + 2.4, q.z + s[2]], i * 6); }
        lines.geometry.attributes.position.needsUpdate = true;
        boot.position.set(q.x, q.y - 0.15, q.z); boot.material.opacity = f > 0.78 ? Math.min(1, (f - 0.78) * 6) : 0; boot.scale.setScalar(0.8 + Math.random() * 0.4);
      } else { // 3) 착지
        landFx(); player.root.position.set(p.x, 0, p.z); player.root.rotation.x = 0; lines.material.opacity = 0; boot.material.opacity = 0;
        const k = (t - T_JUMP - T_FALL) / T_LAND; ring.material.opacity = 1 - k; ring.scale.setScalar(1 + k * 7);
        stepCamera(0.016); // 보통 카메라로 부드럽게 넘어간다
        if (k >= 1) { end(); return true; }
      }
    });
  });
}
const anims = [];
const MOTHER_LOOK = new V3(SHIP_AT[0], 14, SHIP_AT[1]);
// 촬영 카메라(?shot=lobby): 광장 큰길 위에서 탑승구·현황판·좌석 벽·발사대 모선을 한 화면에. 세로(휴대폰 9:16)와 가로를 따로 잡는다.
function stepShot(t) {
  const tall = innerWidth < innerHeight, still = Q.has('still') ? 0 : 1, s = Math.sin(t * 0.26) * still;
  if (SHOT === 'wall') { camera.position.set(tall ? 5.2 : -3.2, 2.4 + 0.15 * s, (tall ? -21.6 : -23.5) + 0.8 * s); /* 세로는 큰길 가로등을 화면 밖으로 빼려고 살짝 비스듬히 */ camera.lookAt(-9.6, 2.3, -23.5); return; } // 좌석 벽 정면
  if (tall && !Q.has('orbit')) { if (stepShot.t0 === undefined) stepShot.t0 = t; const u = Math.min(1, (t - stepShot.t0) / 12) * still, e = u * u * (3 - 2 * u) * 0.5 + u * 0.5; // 천천히 밀기(총괄 11-28): 12초에 걸쳐 3.2m 앞으로 · 고개는 살짝 내림
    camera.position.set(0.5 * s, 6.4 - 0.9 * e, 5.5 - 3.2 * e); camera.lookAt(0, 9.4 - 1.2 * e, -28); }
  else if (tall) { camera.position.set(1.0 * s, 6.4 + 0.3 * s, 5.5 - 1.5 * still * (0.5 + 0.5 * Math.sin(t * 0.13))); camera.lookAt(0, 9.4, -28); } // 분수 위로 넘겨 본다(분수는 화면 아래로 빠진다)
  else { camera.position.set(2.2 * s, 5.2, 11 - 1.5 * still * (0.5 + 0.5 * Math.sin(t * 0.13))); camera.lookAt(0, 8.2, -24); }
}

// 촬영 모드(?shot=lobby) 전용 견본 주민 무리 — 실제 서비스 화면(?shot 없음)에선 만들지도 움직이지도 않는다
// (총괄 11-28 「견본 주민 15~25명이 걸어 다니고 우주선 쪽으로 모이게 · 카메라는 천천히 밀어」 · 근거 기획/분석_v4_스노우빌리지.md §3·§6 「이미 사람이 북적인다」)
// &crowd=0 끔 · &crowd=N 인원(기본 22) · 움직임은 촬영 시작 뒤 경과 시간만으로 정해진다(고정 씨앗 → 같은 녹화를 다시 찍어도 같은 동선)
const DEMO = [];
async function spawnDemoCrowd() {
  if (SHOT !== 'lobby' || Q.get('crowd') === '0') return;
  const N = Math.max(0, Math.min(40, +(Q.get('crowd') || 22)));
  let sd = 1127; const rnd = () => ((sd = (Math.imul(sd, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff); const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const BODY = [0, 1, 2, 3, 4, 5, 0, 1, 7];
  for (let i = 0; i < N; i++) {
    const c = K.normalizeChar({ b: BODY[ri(0, BODY.length - 1)], skin: ri(0, 7), hair: ri(1, 14), c1: ri(1, 14), c2: ri(1, 14), hat: rnd() < 0.45 ? ri(1, 9) : 0, pose: 1, n: [ri(0, 15), ri(0, 15)] });
    // 절반은 탑승구 줄(플레이어 뒤로 한 줄 · 두 칸씩 엇갈림), 나머지는 대기장 안쪽 우주선 둘레로 모인다
    const q = i % 2 === 0; const k = i >> 1;
    const end = q ? [0.6 + (k % 2 ? 0.45 : -0.45), -15.3 + k * 0.85] : (() => { const a = Math.PI * (0.25 + 0.5 * rnd()) + (k % 2 ? 0 : Math.PI * 0.0); const r = 6.5 + 4.5 * rnd(); return [Math.cos(a) * r * (k % 2 ? 1 : -1), LOBBY.z + 5 - Math.sin(a) * r * 0.55]; })();
    const side = rnd() < 0.5 ? -1 : 1; const start = [side * (3 + 7 * rnd()), -2.5 - 9 * rnd()];
    if (Math.hypot(start[0], start[1]) < 3.6) start[0] += side * 3;   // 분수 피하기
    const mid = [end[0] * 0.4 + start[0] * 0.15, Math.min(start[1], end[1]) + (q ? 2.2 : 0.5)];
    const o = peerObj('demo' + i); o.demo = true; o.tag.el.remove(); tags.delete(o.tag);
    o.path = [start, mid, end]; o.speed = 1.2 + 0.7 * rnd(); o.delay = rnd() * 4.5 - (rnd() < 0.35 ? 3 : 0); o.wave = rnd() < 0.3 ? 1.5 + rnd() * 6 : -1;
    o.cur.set(start[0], 0, start[1]); o.tgt.copy(o.cur); o.root.position.copy(o.cur); o.placed = true;
    DEMO.push(o); dress(o, c);
  }
}
let demoT0 = -1;
function stepDemo(t) {
  if (!DEMO.length) return; if (demoT0 < 0) demoT0 = t; const ela = t - demoT0;
  for (const o of DEMO) {
    const [a, b, c] = o.path; const L1 = Math.hypot(b[0] - a[0], b[1] - a[1]), L2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    let d = Math.max(0, (ela - o.delay) * o.speed); let x, z, hx, hz;
    if (d < L1) { const u = d / L1; x = a[0] + (b[0] - a[0]) * u; z = a[1] + (b[1] - a[1]) * u; hx = b[0] - a[0]; hz = b[1] - a[1]; }
    else if (d < L1 + L2) { const u = (d - L1) / L2; x = b[0] + (c[0] - b[0]) * u; z = b[1] + (c[1] - b[1]) * u; hx = c[0] - b[0]; hz = c[1] - b[1]; }
    else { x = c[0]; z = c[1]; hx = SHIP_AT[0] - x; hz = SHIP_AT[1] - z; }   // 도착하면 우주선 쪽을 본다
    o.tgt.set(x, 0, z); o.ry = Math.atan2(hx, hz);
    if (o.wave > 0 && d >= L1 + L2 && ela > o.wave && o.ch && !(o.onceUntil > performance.now())) { const du = o.ch.anim('emote-yes', { once: true }); o.onceUntil = performance.now() + du * 1000; o.wave = -1; }
  }
}
// ───────── 루프 ─────────
const clock = new THREE.Clock(); let hidden = false; document.addEventListener('visibilitychange', () => { hidden = document.hidden; });
// 성능 측정(?prof=1 일 때만): 구간별 프레임 비용 → window.__prof()
const PROF = Q.get('prof') ? { t: {}, n: 0, f0: performance.now() } : null; let curMod = 'world';
const pt = (k, f) => { if (!PROF) return f(); const a = performance.now(); try { return f(); } finally { PROF.t[k] = (PROF.t[k] || 0) + performance.now() - a; } };
window.__prof = () => { if (!PROF) return null; const n = PROF.n || 1, o = {}; for (const [k, v] of Object.entries(PROF.t)) o[k] = +(v / n).toFixed(2); const i = renderer.info.render; return { frames: PROF.n, fps: +(PROF.n * 1000 / (performance.now() - PROF.f0)).toFixed(1), msPerFrame: o, calls: i.calls, tris: i.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, progs: renderer.info.programs?.length, tags: tags.size, dpr: DPR, shadow: renderer.shadowMap.enabled, hitch: PROF.hitch || [] }; };
window.__profReset = () => { if (PROF) { PROF.t = {}; PROF.n = 0; PROF.f0 = performance.now(); PROF.hitch = []; } };
function tick() {
  requestAnimationFrame(tick); if (hidden) return;
  if (PROF) { PROF.n++; const nowp = performance.now(), gap = PROF.last ? nowp - PROF.last : 0; PROF.last = nowp; const pg = renderer.info.programs?.length || 0, tx = renderer.info.memory.textures, gm = renderer.info.memory.geometries;
    if (gap > 45) (PROF.hitch ||= []).push({ at: +((nowp - PROF.f0) / 1000).toFixed(1), ms: Math.round(gap), progs: pg - (PROF.pg ?? pg), names: pg > (PROF.pg ?? pg) ? renderer.info.programs.slice(PROF.pg ?? pg).map(x => x.name + (x.cacheKey.includes(',true,') ? '' : '') + '#' + (x.cacheKey.match(/SKINNING|skinning/) ? 's' : '')).join(' ') : '', tex: tx - (PROF.tx ?? tx), geo: gm - (PROF.gm ?? gm), last: PROF.lastWhat }); PROF.pg = pg; PROF.tx = tx; PROF.gm = gm; }
  const dt = Math.min(0.05, clock.getDelta()), now = performance.now(), t = now / 1000;
  autoQuality(now);
  for (let i = anims.length - 1; i >= 0; i--) if (anims[i](now)) anims.splice(i, 1);
  if (spawned) pt('step', () => { if (!introCam) stepPlayer(dt); stepNear(); stepNet(now); stepTut(); stepNav(t); });
  pt('mixers', () => { player.ch?.mixer.update(dt); podium.forEach(p => p.ch.mixer.update(dt)); stepPeers(dt); }); if (SHOT) { stepDemo(t); stepShot(t); } else if (!introCam) stepCamera(dt);
  core.rotation.y = t * 0.5; core.position.y = 2.45 + Math.sin(t * 1.3) * 0.12; core.userData.ring.rotation.z = t * 0.8;
  if (portalSwirl) portalSwirl.rotation.z = -t * 1.6;
  capsuleBalls.rotation.y = t * (capsuleSpin > now ? 9 : 0.4);
  skyPlanets.rotation.y = t * 0.01; skyPlanets.children.forEach(s => { s.position.y += Math.sin(t * 0.5 + s.userData.bob) * 0.004; });
  if (marker.material.opacity > 0) { marker.material.opacity = Math.max(0, marker.material.opacity - dt * 1.4); marker.scale.multiplyScalar(1 + dt * 0.8); }
  beam.material.opacity = 0.3 + Math.sin(t * 4) * 0.12;
  for (const f of HOOK.tick) { try { if (PROF) pt('mod:' + f.mod, () => f(dt, t, now)); else f(dt, t, now); } catch (e) { console.error('확장 tick 오류', e); HOOK.tick.splice(HOOK.tick.indexOf(f), 1); } }
  pt('render', () => renderer.render(scene, camera)); pt('tags', placeTags);
}
const pv = new V3();
function placeTags() {
  const w = innerWidth, h = innerHeight;
  for (const tg of tags) {
    if (tg.obj) { tg.obj.getWorldPosition(pv); pv.y += tg.h; } else pv.copy(tg.pos);
    const dist = pv.distanceTo(camera.position); pv.project(camera);
    const sx = (pv.x * 0.5 + 0.5) * w, sy = (-pv.y * 0.5 + 0.5) * h;
    const vis = pv.z < 1 && pv.z > -1 && Math.abs(pv.x) < 1.15 && Math.abs(pv.y) < 1.15 && dist < 28 && !(sx > w - 92 && sy > 60 && sy < h * 0.72);
    tg.el.style.display = vis ? '' : 'none'; if (!vis) continue;
    const sc = THREE.MathUtils.clamp(9 / dist, 0.65, 1.1);
    if (!tg._hwAt || performance.now() - tg._hwAt > 2000) { tg._hw = tg.el.offsetWidth / 2; tg._hwAt = performance.now(); } // 이름표 너비는 2초마다만 잰다(매 프레임 재면 느려진다)
    const hw = (tg._hw || 0) * sc, cx = THREE.MathUtils.clamp(sx, hw + 6, Math.max(hw + 6, w - hw - 6)); // 화면 끝에서 잘리지 않게 안쪽으로 민다(11-22 실측: 「안내봇 삐」에서 잘림)
    tg.el.style.transform = `translate(${cx}px, ${sy}px) translate(-50%, -100%) scale(${sc})`;
  }
}

// ───────── 성장 장치 화면(레벨·코인·미션·출석·캡슐·도감) — 장치 자체는 dwk-prog.js ─────────
const DP = window.DP; let capsuleSpin = 0;
const TIER_COL = { n: '#fff4dc', r: '#7fd8ff', g: '#ffcf3a' };
function hud() {
  if (!DP) return; const s = DP.s, need = DP.need(s.lv);
  $('#lv').textContent = `Lv.${s.lv}`; $('#xpBar').style.width = `${Math.round(s.xp / need * 100)}%`; $('#coins').textContent = s.coins.toLocaleString();
  const ready = DP.quests().some(q => q.got >= q.goal && !q.claimed); $('#questBtn').classList.toggle('dot', ready);
  $('#bookCount').textContent = `도감 ${DP.owned()}/${DP.CARDS.length}`;
}
DP?.onChange(hud);
// 미션 → 할 수 있는 곳(길 안내 목적지). chat 은 장소가 아니라 채팅창으로 안내
const QUEST_PLACE = { play_merge: 'cab-merge', merge_2000: 'cab-merge', play_survive: 'cab-survive', survive_120: 'cab-survive', play_find: 'cab-find', play_land: 'cab-land', play_any: 'cab-merge', capsule_1: 'capsule', hall_1: 'hall', chat_2: 'chat' };
function goQuest(q) {
  const to = QUEST_PLACE[q.id];
  if (to === 'chat') { closeSheet(); const i = $('#say'); i?.focus(); DC.toast('아래 채팅창에 아무 말이나 쳐 봐'); return; }
  if (to && facOf[to]) navTo(to, { label: facOf[to].name });
}
function openQuests() {
  const s = DP.s; const qs = DP.quests();
  const rows = qs.map((q, i) => { const done = q.got >= q.goal;
    return el('li', {}, el('span', { class: 'r' }, q.claimed ? '✓' : String(i + 1)), el('span', { class: 'n' }, el('b', {}, q.t), el('small', {}, q.claimed ? '보상 받았어' : done ? '다 했어! 보상 받기' : `${Math.min(q.got, q.goal)} / ${q.goal} · 깨면 40코인`)),
      q.claimed ? el('span', { class: 'v' }, '받음') : done ? el('button', { class: 'k sun', type: 'button', style: 'padding:9px 12px', onclick: () => { DP.claim(i); openQuests(); } }, '받기')
        : QUEST_PLACE[q.id] ? el('button', { class: 'k sky', type: 'button', style: 'padding:9px 12px', onclick: () => goQuest(q) }, '가기') : null); });
  const next = qs.find(q => !q.claimed && q.got < q.goal && QUEST_PLACE[q.id]);
  const days = DP.DAY_REWARD.map((c, i) => { const n = (s.streak.n - 1) % 7; const done = s.streak.n > 0 && i <= n; return el('div', { class: 'day' + (done ? ' on' : '') + (i === 6 ? ' big' : '') }, el('small', {}, `${i + 1}일`), el('b', {}, i === 6 ? '100+티켓' : `${c}`)); });
  sheet('오늘의 미션', el('p', { class: 'lead' }, '미션은 매일 자정에 바뀌어. 3개 다 깨면 캡슐 티켓 1장!'), el('ol', { class: 'list' }, rows),
    el('h3', {}, `연속 출석 ${s.streak.n}일째 · 최고 ${s.streak.best}일`), el('div', { class: 'week' }, days),
    s.freeze ? el('p', { class: 'note' }, `하루 빠져도 ${s.freeze}번은 이어 줄게.`) : null,
    next ? el('button', { class: 'btn k sun', type: 'button', onclick: () => goQuest(next) }, ic('arrow'), '다음 미션 하러 가기(길 안내)') : null);
}
function showCheckin(r) {
  const days = DP.DAY_REWARD.map((c, i) => el('div', { class: 'day' + (i <= r.idx ? ' on' : '') + (i === r.idx ? ' now' : '') + (i === 6 ? ' big' : '') }, el('small', {}, `${i + 1}일`), el('b', {}, i === 6 ? '100+티켓' : `${c}`)));
  sheet('출석 체크', el('p', { class: 'lead' }, `연속 ${r.streak}일째 왔어!`), el('div', { class: 'week' }, days),
    el('p', { class: 'big-reward' }, `+${r.coins} 코인${r.ticket ? ' · 캡슐 티켓 +1' : ''}`),
    el('p', { class: 'note' }, r.saved ? '어제 빠졌는데 이어 줬어!' : `내일 오면 ${DP.DAY_REWARD[(r.idx + 1) % 7]}코인! 7일째엔 100코인.`),
    el('button', { class: 'btn k sun', type: 'button', onclick: () => { closeSheet(); openQuests(); } }, '오늘의 미션 보기'));
  DC.sfx('win'); DC.buzz([20, 40, 20]);
}
function cardEl(c, { big = false, hide = false } = {}) {
  const box = el('div', { class: `card t-${c.tier}${big ? ' big' : ''}${hide ? ' hide' : ''}` }, el('span', { class: 'tier' }, DP.TIER_NAME[c.tier]), el('img', { src: c.img, alt: '' }), el('b', {}, c.name));
  if (big) { const t = el('p', { class: 'txt' + (c.spoiler ? ' spoil' : '') }, c.spoiler ? '눌러서 빈틈 보기 · 영상 먼저 보면 더 재밌어' : c.text); if (c.spoiler) t.onclick = () => { t.textContent = c.text; t.classList.remove('spoil'); }; box.append(t); }
  return box;
}
function openCapsule(result) {
  const s = DP.s; const odds = Object.entries(DP.ODDS).map(([k, v]) => `${DP.TIER_NAME[k]} ${Math.round(v * 100)}%`).join(' · ');
  const stage = el('div', { class: 'cap-stage' }, result ? cardEl(result.card, { big: true }) : el('div', { class: 'cap-ball' }));
  if (result) stage.append(el('p', { class: 'note' }, result.dup ? `이미 있는 카드 → 별가루 +${result.dust}` : '새 카드! 도감에 붙였어'));
  const pull = async (ticket) => {
    const r = DP.capsule(ticket); if (!r.ok) { DC.toast(r.msg); DC.sfx('bad'); return; }
    capsuleSpin = performance.now() + 1400; DC.sfx('swipe'); DC.buzz([10, 30, 10, 30, 10]);
    stage.replaceChildren(el('div', { class: `cap-ball shake t-${r.tier}` })); await new Promise(ok => setTimeout(ok, reduce ? 50 : 1300));
    DC.sfx(r.tier === 'g' ? 'win' : r.tier === 'r' ? 'unlock' : 'good'); if (r.tier !== 'n') { DC.buzz([40, 60, 40]); confetti(r.tier); }
    openCapsule(r);
  };
  sheet('캡슐 뽑기', el('p', { class: 'lead' }, `${DP.PRICE}코인으로 행성 카드 1장! · 내 코인 ${s.coins}${s.tickets ? ` · 티켓 ${s.tickets}` : ''}`), stage,
    el('div', { class: 'row2' }, el('button', { class: 'btn k sun', type: 'button', onclick: () => pull(false) }, ic('gift'), `${DP.PRICE}코인`), el('button', { class: 'btn k sky', type: 'button', disabled: s.tickets ? null : '', onclick: () => pull(true) }, `티켓 (${s.tickets})`)),
    el('details', { class: 'odds' }, el('summary', {}, '확률 보기'), el('p', { class: 'note' }, `${odds} · 10번 안에 빈틈 카드 이상 1장 보장 · 현금 결제 없음`)),
    s.coins < DP.PRICE ? el('button', { class: 'btn k', type: 'button', onclick: openQuests }, ic('check'), '코인은 게임·미션으로 모여 · 미션 보기') : null,
    el('button', { class: 'btn k', type: 'button', onclick: openBook }, ic('board'), `카드 도감 ${DP.owned()}/${DP.CARDS.length}`));
}
function confetti(tier) {
  const n = tier === 'g' ? 60 : 30, cols = tier === 'g' ? ['#ffcf3a', '#fff4dc', '#ff6f91'] : ['#7fd8ff', '#fff4dc', '#8be07a'];
  for (let i = 0; i < n; i++) { const d = el('i', { class: 'conf', style: `left:${50 + (Math.random() - 0.5) * 30}%;background:${cols[i % cols.length]};--dx:${(Math.random() - 0.5) * 520}px;--dy:${-200 - Math.random() * 380}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * 0.12}s` }); document.body.append(d); setTimeout(() => d.remove(), 1600); }
}
function openBook() {
  const s = DP.s; const pct = Math.round(DP.owned() / DP.CARDS.length * 100);
  const grid = el('div', { class: 'book' }, DP.CARDS.map(c => { const have = !!s.cards[c.id]; const cel = cardEl(c, { hide: !have }); if (have) cel.onclick = () => sheet(c.name, cardEl(c, { big: true }), el('button', { class: 'btn k', type: 'button', onclick: openBook }, '도감으로')); else { const cost = DP.EXCHANGE * (c.tier === 'g' ? 3 : c.tier === 'r' ? 2 : 1); cel.title = `별가루 ${cost}로 교환`; cel.onclick = () => { if (DP.exchange(c.id)) { DC.toast(`${c.name} 교환 완료`); openBook(); } else DC.toast(`별가루 ${cost}개가 필요해 (지금 ${s.dust})`); }; } return cel; }));
  sheet('카드 도감', el('p', { class: 'lead' }, `${DP.CARDS.length}장 중 ${DP.owned()}장 모음${s.dust ? ` · 겹친 카드 조각 ${s.dust}` : ''}`), el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` })), grid,
    el('p', { class: 'note' }, s.dust ? '겹친 카드는 조각이 돼. 조각으로 없는 카드를 바꿀 수 있어.' : '새 편이 나오면 새 행성 카드가 생겨.'),
    el('button', { class: 'btn k sun', type: 'button', onclick: () => openCapsule() }, ic('gift'), '캡슐 뽑으러 가기'),
    window.__secrets ? el('button', { class: 'btn k', type: 'button', onclick: () => window.__secrets.open() }, ic('star'), `숨겨진 비밀 ${window.__secrets.count}/${window.__secrets.SECRETS?.length ?? 8}`) : null);
}
$('#questBtn')?.addEventListener('click', openQuests); $('#bookBtn')?.addEventListener('click', openBook); $('#stat')?.addEventListener('click', openQuests);

// ───────── 시작 ─────────
stepCamera(0, true); tick();
await buildPodium();
{ const ld = $('#loading'); ld.classList.add('open'); setTimeout(() => ld.classList.add('gone'), 520); setTimeout(() => ld.remove(), 1100); } // 우주선 문이 양옆으로 열리며 광장이 보인다
if (GUEST) $('#guestBar').classList.remove('hidden');
if (!canTalk()) $('#say').placeholder = GUEST ? '빠른 말·암호' : '저장 후 채팅';
if (!SHOT && !GUEST && !profile && (Q.has('join') || !DC.store.get('world_seen', false))) { DC.store.set('world_seen', true); join(0); }
else spawn();
if (profile && !GUEST && profile.charCode !== K.encodeChar(me)) { profile.charCode = K.encodeChar(me); net.profile.save(profile); } // 꾸미기를 바꿨으면 서버의 캐릭터 코드도 맞춘다
hud(); if (profile && DP) DP.pullRemote().then(ok => { if (ok) { hud(); DC.toast('서버에 있던 내 기록을 불러왔어'); } });
window.__world = { LOBBY, walkable, openMap, navTo, navStop, get nav() { return { ...NAV }; }, liveHall, openQuests, openCapsule, openBook, walkTo, net, player, peers, FAC, facOf, tut, say, join, spawn, openHall, get room() { return room; }, get nearFac() { return nearFac; }, camera, scene, renderer };

// ───────── 확장 연결부(2026-11-19) — 광장 기능은 world-*.js 모듈이 이 약속(EXT)으로 꽂는다 ─────────
// 새 기능을 만들 땐 world.js 를 고치지 말고 world-<이름>.js 에 export function install(EXT) 를 만들어 아래 EXT_MODULES 에 한 줄 추가.
const EXT = {
  THREE, K: KX, DC, DP, W, D, scene, world, camera, renderer, sun, player, peers, FAC, facOf, COL, polar, mesh, mat, canvasTex, sign, el, ic, $,
  sheet, closeSheet, makeTag, bubble, log, say, go, walkTo, navTo, navStop, toast: DC.toast, fine, reduce, GUEST, net,
  room: () => room, me: () => me, profile: () => profile, displayName, spawned: () => spawned, nearFac: () => nearFac,
  onTick(f) { f.mod = curMod; HOOK.tick.push(f); }, onTap(f) { HOOK.tap.push(f); }, onSpawn(f) { if (spawned) f(); else HOOK.spawn.push(f); },
  onMsg(type, f) { (HOOK.msg[type] ||= []).push(f); }, send(type, data) { room?.emit?.(type, data); },
  addFac(f) { FAC.push(f); facOf[f.id] = f; if (f.tag !== false) { const t = makeTag('fac', f.name); t.pos.set(f.tagAt?.[0] ?? f.at[0], f.tagY ?? 3.1, f.tagAt?.[1] ?? f.at[1]); f.tag = t; } return f; },
  addButton({ id, icon, label, onClick, dot = false }) { const b = el('button', { class: 'k', id, type: 'button' }, ic(icon), el('span', {}, label)); b.onclick = onClick; b.classList.toggle('dot', dot); document.querySelector('.w-side').append(b); return b; },
  playerAnim(name, once = true) { if (!player.ch) return 0; const d = player.ch.anim(name, { once }); if (once) player.onceUntil = performance.now() + d * 1000; return d; },
  LOBBY, SHIP_AT, GATE_AT, walkable, faceTo, SHOT, join, openHall, hallG,
  warm, LITE, dress, bakeShadows, CH_S, V3, Q, stepCameraSnap: () => stepCamera(0, true), get camYaw() { return camYaw; }, set camYaw(v) { camYaw = v; },
};
window.__EXT = EXT;
const EXT_MODULES = ['./world-doom.js?v=1', './world-life.js?v=8', './world-social.js?v=6', './world-pets.js?v=3', './world-spaceport.js?v=4', './world-secrets.js?v=1', './world-boss.js?v=10', './world-lobby.js?v=5'];
Promise.allSettled(EXT_MODULES.map(m => import(m).then(x => { curMod = m.slice(2).split('.')[0]; try { x.install?.(EXT); } finally { curMod = 'late'; } }).catch(e => console.warn('확장 모듈 건너뜀', m, e.message))))
  .then(() => warm()).then(() => { perf.ready = true; setTimeout(warm, 2500); setTimeout(warm, 7000); if (LITE) { shadowSample(); setTimeout(bakeShadows, 1500); setTimeout(bakeShadows, 8000); setInterval(bakeShadows, 15000); } }); // 늦게 불러온 캐릭터·NPC 까지 두 번 더

// 폰 그림자 굽기: 지난번과 자리가 바뀐 물체(걷는 펫·떨어지는 파편 등)는 「움직이는 것」으로 보고 그림자에서 뺀다 — 구운 그림자가 제자리에 남는 유령 그림자를 막는다
const shadowSnap = new Map();
function shadowSample() {
  scene.updateMatrixWorld(); let moved = 0;
  scene.traverse(o => { if (!o.isMesh || !o.castShadow) return; const e = o.matrixWorld.elements; const sig = `${e[12].toFixed(2)},${e[13].toFixed(2)},${e[14].toFixed(2)},${e[0].toFixed(3)},${e[8].toFixed(3)}`; const k = shadowSnap.get(o); if (k !== undefined && k !== sig) { o.castShadow = false; shadowSnap.delete(o); moved++; } else shadowSnap.set(o, sig); });
  return moved;
}
function bakeShadows() { if (!LITE || document.hidden) return; shadowSample(); renderer.shadowMap.needsUpdate = true; }
