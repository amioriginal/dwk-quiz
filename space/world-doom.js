/* world-doom.js — 우주 광장·탑승 대기장의 「세계 옷」을 릴스 돈워너노우호 v13 앞부분과 같은 세계로(2026-11-28 · 편장부 H33)
   대표 원문(11-28): 「영상 처음이랑 실제로 게임하는거랑 달라서 좀 몰입감이 깨진다 게임을 디벨롭 시켜야할듯.」
   바꾸는 것 = 겉모습과 연출만: 하늘(검은 우주·별) · 발밑 멸망 지구(용암 균열·불타는 대기·운석) · 빛(따뜻한 주광 + 청록 윤곽광 + 붉은 사이렌) · 땅(잔디 → 발사대 금속 갑판)
   안 바꾸는 것 = 캐릭터·주민 등록·팔로우 확인 코드·채팅·시설·미션 등 게임 기능 전부(그 코드는 건드리지 않는다).
   끄기: world.html?skin=cute → 옛 옷 그대로(이전/이후 비교용). 원본 = 릴스 장면 코드 ship2.js(dwk-doom.js 머리 주석). */
import { makeDoomEarth, doomSky, deckTexture } from './dwk-doom.js?v=1';

export const DOOM_ON = !/[?&]skin=cute\b/.test(location.search);

export function install(EXT) {
  if (!DOOM_ON) return;
  const { THREE, scene, world, camera, renderer } = EXT;
  document.body.classList.add('doom');
  // ── 하늘: 옛 별·성운 번짐·만화 행성 그림을 숨기고 릴스 하늘로 ──
  for (const o of scene.children) {
    if (o.isPoints || (o.isSprite && o.parent === scene)) o.visible = false;
    else if (o.isGroup && o !== world && o.children.length && o.children.every((c) => c.isSprite)) o.visible = false;   // skyPlanets(만화 행성 그림)
  }
  // 늦게 붙는 만화 행성 그림도 숨긴다(그림 불러오기가 비동기)
  const hideLateSprites = () => { for (const o of scene.children) if (o.isGroup && o !== world && o.children.length && o.children.every((c) => c.isSprite)) o.visible = false; };
  setTimeout(hideLateSprites, 1500); setTimeout(hideLateSprites, 5000);
  scene.background = new THREE.Color('#020308');
  const sky = doomSky(THREE, innerHeight * renderer.getPixelRatio(), { horizon: 1.0 }); scene.add(sky.group);
  addEventListener('resize', () => sky.setHeight(innerHeight * renderer.getPixelRatio()));
  camera.far = 2600; camera.updateProjectionMatrix();
  // ── 발밑 멸망 지구: 광장·대기장이 갈라지는 지구 표면 위에 선 발사장 ──
  const R = 260; const earth = makeDoomEarth(THREE, { R, rep: [34, 20], meteors: EXT.LITE ? 4 : 7, meteorScale: 1.6, meteorBox: 1.6, lite: !!EXT.LITE });
  earth.group.position.set(0, -1.32 - R, -14); scene.add(earth.group);
  // 불타는 대기: 릴스(배 아래 지구 바깥 껍질)처럼 카메라보다 아래에 두어 지평선만 붉게 번지게
  earth.fireAtm.scale.setScalar((R + 1.1) / (R * 1.06));
  // ── 빛: 릴스와 같은 주광(따뜻한 흰빛) + 차가운 윤곽광 + 어두운 하늘빛 + 붉은 사이렌 ──
  let hemi = null, rim = null; const sun = EXT.sun;
  scene.traverse((o) => { if (o.isHemisphereLight) hemi = o; else if (o.isDirectionalLight && o !== sun && !rim) rim = o; });
  if (hemi) { hemi.color.set('#56628a'); hemi.groundColor.set('#3a1810'); hemi.intensity = 1.25; }
  if (sun) { sun.color.set('#fff0dc'); sun.intensity = 3.0; }
  if (rim) { rim.color.set('#8fb0ff'); rim.intensity = 2.4; rim.position.set(-12, 9, -48); }
  const lava = new THREE.DirectionalLight('#ff5a1e', 0.9); lava.position.set(6, -4, -30); lava.target.position.set(0, 2, -20); scene.add(lava, lava.target);   // 갈라진 땅에서 올라오는 붉은 반사
  const [sx0, sz0] = EXT.SHIP_AT; const shipKey = new THREE.DirectionalLight('#fff0dc', 2.4); shipKey.position.set(sx0 + 12, 16, sz0 + 40); shipKey.target.position.set(sx0, 12, sz0); scene.add(shipKey, shipKey.target);
  const siren = new THREE.PointLight('#ff2a1a', 0, 40, 1.4); siren.position.set(EXT.SHIP_AT[0] + 7, 3, EXT.SHIP_AT[1] + 5); scene.add(siren);
  scene.environmentIntensity = 0.42;
  // ── 땅: 잔디·크림 포장 → 발사대 금속 갑판(릴스 갑판 무늬) · 섬 밑 바위 → 검은 현무암 ──
  const deck = deckTexture(THREE, [2.6, 2.6]); const deckL = deckTexture(THREE, [2.4, 2.4]);
  const RECOLOR = new Map([
    [0x86c76f, { map: deck, color: '#ffffff', roughness: 0.85, metalness: 0.3 }],   // 광장 잔디 윗면
    [0xe9e1d0, { map: deckL, color: '#ffffff', roughness: 0.85, metalness: 0.3 }],  // 대기장 바닥
    [0x6aa95a, { color: '#2a2d33', roughness: 0.6, metalness: 0.5 }], [0xb9ad97, { color: '#2a2d33', roughness: 0.6, metalness: 0.5 }],   // 가장자리 턱
    [0x6b5a7a, { color: '#2a201f', roughness: 0.95 }],                               // 섬 밑 바위
    [0xeadfca, { color: '#5d636d', roughness: 0.7, metalness: 0.35 }],              // 포장길
    [0xd9ccb4, { color: '#8d939c', roughness: 0.45, metalness: 0.6 }],              // 분수 돌·기둥
  ]);
  // 캐릭터(뼈대 있는 몸)는 건드리지 않는다
  const charRoots = () => { const s = new Set(); scene.traverse((o) => { if (o.isSkinnedMesh) { let p = o; while (p.parent && p.parent !== scene && p.parent !== world) p = p.parent; s.add(p); } }); return s; };
  const isGreen = (c) => c.g > c.r * 1.15 && c.g > c.b * 1.05 && c.g > 0.18;
  const ash = new THREE.Color('#3b302b'), ember = new THREE.Color('#ff4a12');
  const deckMat = new THREE.MeshStandardMaterial({ map: deck, roughness: 0.85, metalness: 0.3 }); deckMat.userData.doom = true;
  const deckMatL = new THREE.MeshStandardMaterial({ map: deckL, roughness: 0.85, metalness: 0.3 }); deckMatL.userData.doom = true;
  function reskin() {
    const skip = charRoots(); const seen = new Set();
    world.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh) return; let p = o; while (p && p !== world) { if (skip.has(p)) return; p = p.parent; }
      const gp = o.geometry?.parameters || {};
      if (o.geometry?.type === 'CylinderGeometry' && gp.radiusTop === 16 && gp.height === 1.2) { o.material = deckMat; return; }      // 광장 섬 윗면(world-life 가 잔디 그림으로 바꿔 둔 것)
      if (o.geometry?.type === 'CylinderGeometry' && gp.radiusTop === 15 && gp.height === 1.2) { o.material = deckMatL; return; }     // 대기장 바닥
      if (o.isInstancedMesh && o.geometry?.type === 'IcosahedronGeometry' && gp.radius === 0.065) { o.visible = false; return; }       // 꽃송이(타 버린 땅엔 없다)
      if (o.isInstancedMesh && o.instanceColor && !o.userData.doom && o.material?.color && isGreen(o.material.color)) {          // 풀포기: 잿빛 · 몇 포기는 불씨
        o.userData.doom = true; const c = new THREE.Color(); for (let i = 0; i < o.count; i++) { const k = (Math.sin(i * 91.7) * 43758.5) % 1; o.setColorAt(i, k > 0.82 ? c.set('#7a2a12') : c.set('#4a403a').multiplyScalar(0.8 + Math.abs(k) * 0.4)); } o.instanceColor.needsUpdate = true; }
      if (!o.userData.doomPave && o.material?.map && !o.material.userData.doom && o.material.map.image && /RingGeometry|PlaneGeometry/.test(o.geometry?.type) && o.position.y < 0.05 && Math.abs(o.rotation.x) < 0.01) { /* 돌길(world-life 벽돌) → 어두운 금속 */ o.userData.doomPave = true; o.material.color.set('#8a9099'); o.material.metalness = 0.35; o.material.roughness = 0.7; o.material.needsUpdate = true; }
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!m || seen.has(m) || !m.color || m.userData.doom) continue; seen.add(m); m.userData.doom = true;
        const hx = m.color.getHex(); const r = RECOLOR.get(hx);
        if (r) { if (r.map) m.map = r.map; m.color.set(r.color); if (r.roughness !== undefined) m.roughness = r.roughness; if (r.metalness !== undefined) m.metalness = r.metalness; m.needsUpdate = true; continue; }
        // 풀·나무·꽃의 초록 → 타 버린 잿빛(지구 멸망 직전 땅) · 잎 끝에 불씨
        if (!m.map && isGreen(m.color) && !m.emissive?.getHex?.()) { m.color.copy(ash); if (m.emissive) { m.emissive.copy(ember); m.emissiveIntensity = 0.08; } m.needsUpdate = true; }
        else if (m.map && isGreen(m.color)) { m.color.multiplyScalar(0.35).lerp(ash, 0.6); m.needsUpdate = true; }
      }
    });
    EXT.bakeShadows?.();
  }
  reskin(); for (const ms of [800, 2500, 6000, 12000]) setTimeout(reskin, ms);   // 나중에 불러오는 소품(GLB 나무·꽃)까지
  EXT.onTick((dt, t) => { sky.tick(t); earth.tick(dt, t, camera); siren.intensity = Math.max(0, Math.sin(t * 2.6)) * 6; });
  window.__doom = { earth, sky, reskin };
}
