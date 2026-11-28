/* town-doom.js — 「내 땅」 화면의 세계 옷 + 하나의 큰 행성 연출(2026-11-28 · 편장부 H33·H37·H38)
   대표 원문(11-28): 「영상 처음이랑 실제로 게임하는거랑 달라서 좀 몰입감이 깨진다 게임을 디벨롭 시켜야할듯.」
   H37(대표 결정 · 총괄 전달): 모두가 같은 거대한 행성 하나에 내린다 · 좌석 번호 = 그 행성 위 내 땅 번호.
   H38(대표 「빨리 댓글을 달수록 이점을 줘야지」 · 총괄 전달): 명당 1,000석(탈출문 앞·식량 창고 옆·의무실 옆·관측창 앞 각 225 + 조종석 바로 뒤 100)
       — 착륙하면 좌석 배치가 그대로 땅 배치: 탈출문 앞 좌석 땅 = 착륙 경사로 앞 · 식량 창고 옆 = 창고 옆 · 의무실 옆 = 의무 천막 옆.
   바꾸는 것: 하늘(검은 우주·별) · 멀리 타는 지구 · 빛(주광 + 청록 윤곽광) · 우주선(분홍 → 은색 착륙선/본선) · 땅 구획선·번호·명당 빛 · 화면 틀 색
   안 바꾸는 것: 꾸미기·캐릭터·행성 고르기·사진·자랑·코드 등 기능 전부.
   ?shot=land 이면 녹화용 연출: ① 우주에서 본 큰 행성(땅 100,000칸 · 이미 탄 사람들의 불빛) → ② 착륙지로 내려감 → ③ 착륙한 본선 둘레 번호 땅 → ④ 내 땅.
   ?skin=cute 이면 이 파일을 쓰지 않는다(town.js 가 부르지 않음). */
import { doomSky, makeDoomEarth, makeNewWorld, makeSilverShip } from './dwk-doom.js?v=1';

export async function install(G) {
  const { THREE, scene, camera, renderer, R, QS } = G;
  const V3 = THREE.Vector3;
  document.body.classList.add('doom');
  const SHOT = QS.get('shot') === 'land';
  const MYNO = Math.max(1, Math.min(100000, +(QS.get('no') || 1225)));
  const BOARDED = +((window.DWK && window.DWK.ship && window.DWK.ship.boarded) || 2909);
  let cover = null; if (SHOT) { cover = document.createElement('div'); Object.assign(cover.style, { position: 'fixed', inset: '0', background: '#020308', zIndex: 39, pointerEvents: 'none' }); document.body.append(cover); }
  // ── 하늘·빛 ──
  for (const o of scene.children) if (o.isPoints) o.visible = false;
  const sky = doomSky(THREE, innerHeight * renderer.getPixelRatio()); scene.add(sky.group);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  camera.far = 3000; camera.updateProjectionMatrix();
  const rim = new THREE.DirectionalLight('#8fb0ff', 1.8); scene.add(rim, rim.target);
  // 멀리 두고 온 지구(용암 균열 · 붉은 대기) — 새 행성 하늘에 작게
  const far = makeDoomEarth(THREE, { R: 34, rep: [5, 3], meteors: 0, lite: true }); far.group.position.set(-230, 160, -380); scene.add(far.group);

  // ── 땅 구획: 착륙한 본선(PAD) 둘레로 좌석 배치와 같은 고리 모양 ──
  const N0 = G.PAD().clone().normalize();
  const Z0 = G.northAt(N0, new V3()).normalize(), X0 = new V3().crossVectors(N0, Z0).normalize();
  const RING0 = 1.75, RW = 2.0, RINGS = 4;                  // 고리 안쪽 반지름 · 고리 폭(땅 한 칸 깊이) · 고리 수
  const nOf = (k) => Math.max(8, Math.round(2 * Math.PI * (RING0 + RW * (k + 0.5)) / 2.2));   // 고리마다 칸 수(칸 폭 약 2.2 · 집 한 채 + 마당)
  // 경사로·창고·의무 천막 방향(본선 둘레 각도) · 명당 = 안쪽 고리에서 그 셋에 붙은 칸
  const AZ = { ramp: 0.0, store: 2.15, med: -2.15 };
  const dirAt = (rho, az) => { const a = rho / R; return N0.clone().multiplyScalar(Math.cos(a)).addScaledVector(X0.clone().multiplyScalar(Math.cos(az)).addScaledVector(Z0, Math.sin(az)), Math.sin(a)).normalize(); };
  const cellAt = (k, i) => { const n = nOf(k); const az = (i + 0.5) / n * Math.PI * 2 - Math.PI; return { k, i, n, az, rho: RING0 + RW * (k + 0.5), dir: dirAt(RING0 + RW * (k + 0.5), az) }; };
  const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const primeKind = (k, i) => { if (k > 0) return null; const c = cellAt(k, i); for (const [kind, az] of Object.entries(AZ)) if (angDiff(c.az, az) < 0.5) return kind; return null; };
  // 내 땅: 세 번째 고리 · 경사로와 창고 사이(카메라가 내 땅 뒤에서 본선·경사로·창고 쪽 명당을 함께 본다)
  const MY_K = 2, MY_I = Math.round(((Math.PI * 0.36) + Math.PI) / (Math.PI * 2) * nOf(2) - 0.5) % nOf(2);
  const mine = cellAt(MY_K, MY_I);
  // 칸 번호: 명당(안쪽 고리 명당 칸)이 앞 번호, 그다음 고리 순 — 내 땅만 MYNO(녹화 견본)
  const numbers = new Map(); { let no = 1; for (let k = 0; k < RINGS; k++) for (let i = 0; i < nOf(k); i++) if (primeKind(k, i)) numbers.set(k + ':' + i, no++);
    no = 1001; for (let k = 0; k < RINGS; k++) for (let i = 0; i < nOf(k); i++) if (!numbers.has(k + ':' + i)) numbers.set(k + ':' + i, no++); numbers.set(MY_K + ':' + MY_I, MYNO); }
  // 구획선 셰이더(땅 위 얇은 껍질)
  const primeMask = []; for (let i = 0; i < nOf(0); i++) primeMask.push(primeKind(0, i) ? 1 : 0);
  const plotU = { uN: { value: N0 }, uX: { value: X0 }, uZ: { value: Z0 }, uR: { value: R }, uT: { value: 0 }, uMyK: { value: MY_K }, uMyI: { value: MY_I }, uPrime: { value: primeMask.concat(Array(64 - primeMask.length).fill(0)) }, uN0: { value: nOf(0) }, uShow: { value: 1 } };
  const plotMat = new THREE.ShaderMaterial({ uniforms: plotU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uN, uX, uZ; uniform float uR, uT, uMyK, uMyI, uN0, uShow; uniform float uPrime[64]; varying vec3 vP;
      const float RING0 = ${RING0.toFixed(2)}, RW = ${RW.toFixed(2)}; const float PI = 3.14159265;
      float nOf(float k){ return max(8.0, floor(2.0 * PI * (RING0 + RW * (k + 0.5)) / 2.2 + 0.5)); }
      void main(){
        float c = clamp(dot(vP, uN), -1.0, 1.0); float rho = acos(c) * uR; if (rho > RING0 + RW * ${RINGS}.0 + 0.05) discard;
        float az = atan(dot(vP, uZ), dot(vP, uX));
        float kk = (rho - RING0) / RW; if (kk < -0.05) discard; float k = floor(kk); float fk = fract(kk);
        float n = nOf(k); float ii = (az + PI) / (2.0 * PI) * n; float i = floor(ii); float fi = fract(ii);
        float wR = 0.035 / RW, wA = 0.035 / (2.0 * PI * rho / n);
        float line = max(1.0 - smoothstep(0.0, wR, min(fk, 1.0 - fk)), 1.0 - smoothstep(0.0, wA, min(fi, 1.0 - fi)));
        line *= 1.0 - smoothstep(${RINGS}.0 - 0.6, ${RINGS}.0, kk) * 0.7;
        vec3 col = vec3(0.32, 0.9, 1.0) * line * 0.55;
        float prime = 0.0; if (k < 0.5) { for (int j = 0; j < 64; j++) { if (float(j) == i) prime = uPrime[j]; } }
        float edge = 1.0 - smoothstep(0.0, 0.16, min(min(fk, 1.0 - fk) * RW, min(fi, 1.0 - fi) * 2.0 * PI * rho / n));
        float pulse = 0.75 + 0.25 * sin(uT * 3.0 + i);
        col += vec3(1.0, 0.72, 0.25) * prime * (edge * 1.6 + 0.16) * pulse;
        float me = step(abs(k - uMyK), 0.1) * step(abs(i - uMyI), 0.1);
        col += vec3(1.0, 0.95, 0.75) * me * (edge * 2.6 + 0.3) * (0.8 + 0.2 * sin(uT * 5.0));
        gl_FragColor = vec4(col * uShow, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
  const plots = new THREE.Mesh(new THREE.SphereGeometry(R + 0.07, 160, 120), plotMat); plots.renderOrder = 4; scene.add(plots);
  // 칸 번호(땅에 칠한 번호판 · 작은 기둥) — 안쪽 4고리
  const tag = (d, text, { prime = false, me = false } = {}) => {
    const g = new THREE.Group(); g.position.copy(d).multiplyScalar(R); g.quaternion.copy(G.frameQuat(d)); scene.add(g);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8).translate(0, 0.275, 0), new THREE.MeshStandardMaterial({ color: '#9aa2ad', metalness: 0.8, roughness: 0.35 })); g.add(post);
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = me ? '#ffd34d' : prime ? '#ffb347' : '#0a1018'; x.fillRect(0, 0, 256, 96); x.strokeStyle = me ? '#fff3c4' : prime ? '#ffe2a8' : '#5fe8ff'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
    x.fillStyle = (me || prime) ? '#1a1206' : '#dff6ff'; x.font = "900 58px 'Pretendard Variable', Pretendard, system-ui, sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 52);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false }); if (me || prime) m.color.setScalar(1.4);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.23), m); plate.position.y = 0.62; g.add(plate); g.userData.plate = plate; return g;
  };
  const tags = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i < nOf(k); i++) { const c = cellAt(k, i); const no = numbers.get(k + ':' + i); const me = k === MY_K && i === MY_I; tags.push(tag(dirAt(c.rho - RW * 0.36, c.az), String(no).padStart(4, '0'), { prime: !!primeKind(k, i), me })); }

  if (SHOT && G.items && G.removeItem) for (const it of [...G.items]) G.removeItem(it);
  // ── 착륙한 본선 · 경사로 · 식량 창고 · 의무 천막 ──
  const holder = new THREE.Group(); holder.position.copy(N0).multiplyScalar(R); holder.quaternion.copy(G.frameQuat(N0)); scene.add(holder);
  const big = makeSilverShip(THREE, { seats: 100000, boarded: BOARDED, S: 0.34, tower: false, lite: true });
  big.group.rotation.y = (Math.PI / 2 - AZ.ramp) - big.doorDir; holder.add(big.group);   // 문(경사로 쪽)이 AZ.ramp 를 보게(로컬: +x=X0·+z=Z0 → atan2 각 변환)
  G.hideSmallShip?.();
  // 경사로(문 → 땅) · 불빛 줄
  const local = (az, rho, y = 0) => new V3(Math.cos(az) * rho, y, Math.sin(az) * rho);   // holder 로컬(평면 근사 · 가까운 거리)
  let medCross = null;
  const steel = new THREE.MeshStandardMaterial({ color: '#a7adb6', metalness: 0.65, roughness: 0.4 });
  { const top = local(AZ.ramp, 0.43, 1.42), bot = local(AZ.ramp, 1.9, 0.02); const d = bot.clone().sub(top); const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, d.length()), steel); ramp.position.copy(top).add(bot).multiplyScalar(0.5); ramp.castShadow = true; holder.add(ramp);
    ramp.quaternion.setFromUnitVectors(new V3(0, 0, 1), d.clone().normalize());
    for (const s of [-1, 1]) { const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, d.length()), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe9ff').multiplyScalar(2) })); strip.position.set(s * 0.17, 0.02, 0); ramp.add(strip); } }
  // 식량 창고(금속 컨테이너 2개 + 노란 띠 + 나무 상자 무늬 없이 · 상자 그림 기호)
  const crateIcon = (bg, draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 128, 128); draw(x); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  { const g = new THREE.Group(); g.position.copy(local(AZ.store, 2.05)); g.rotation.y = -AZ.store; holder.add(g);
    const box = new THREE.MeshStandardMaterial({ color: '#5d6570', metalness: 0.6, roughness: 0.45 });
    for (const [x, y, s] of [[0, 0.22, 1], [0.05, 0.6, 0.85]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.75 * s, 0.38, 0.5 * s), box); b.position.set(x, y, 0); b.castShadow = true; g.add(b); }
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.06, 0.52), new THREE.MeshStandardMaterial({ color: '#ffcf3a', emissive: '#ffb020', emissiveIntensity: 0.6 })); band.position.y = 0.3; g.add(band);
    const icon = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: crateIcon('#ffcf3a', (x) => { x.fillStyle = '#1a1206'; x.fillRect(30, 46, 68, 52); x.fillRect(22, 34, 84, 14); x.fillStyle = '#ffcf3a'; x.fillRect(56, 54, 16, 10); }), toneMapped: false }));
    icon.position.set(-0.385, 0.25, 0); icon.rotation.y = -Math.PI / 2; g.add(icon); const icon2 = icon.clone(); icon2.position.x = 0.385; icon2.rotation.y = Math.PI / 2; g.add(icon2); }
  // 의무 천막(흰 천막 + 청록 십자 · 국제 적십자 표장과 구분되게 청록)
  { const g = new THREE.Group(); g.position.copy(local(AZ.med, 2.05)); g.rotation.y = -AZ.med; holder.add(g);
    const tent = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 6).translate(0, 0.35, 0), new THREE.MeshStandardMaterial({ color: '#e9eef3', roughness: 0.8, flatShading: true })); tent.castShadow = true; g.add(tent);
    const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: crateIcon('#e9eef3', (x) => { x.fillStyle = '#18c9d6'; x.fillRect(48, 20, 32, 88); x.fillRect(20, 48, 88, 32); }), toneMapped: false })); cross.position.set(0, 0.62, 0); g.add(cross); g.userData.cross = cross; medCross = cross; }
  // 명당 표시: 칸 가운데 짧은 빛기둥(경사로 앞·창고 옆·천막 옆)
  const beams = []; for (let i = 0; i < nOf(0); i++) if (primeKind(0, i)) { const c = cellAt(0, i); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 1.1, 10, 1, true).translate(0, 0.55, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb347'), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const h = new THREE.Group(); h.position.copy(c.dir).multiplyScalar(R); h.quaternion.copy(G.frameQuat(c.dir)); h.add(b); scene.add(h); beams.push(b); }
  // ── 내 땅으로 캐릭터를 옮기고, 이름표를 「내 땅 · No.」로 ──
  G.player.dir.copy(dirAt(mine.rho - 0.1, mine.az)); G.cam.dir.copy(G.player.dir); G.cam.fwd.copy(G.northAt(G.player.dir));
  { const tg = N0.clone().addScaledVector(G.player.dir, -N0.dot(G.player.dir)).normalize(); G.cam.fwd.copy(tg); }   // 카메라가 내 땅 뒤에서 착륙한 본선 쪽을 본다
  G.player.face.copy(N0).sub(G.player.dir).addScaledVector(G.player.dir, -N0.clone().sub(G.player.dir).dot(G.player.dir)).normalize().negate();
  const kind = document.querySelector('#nameKind'), txt = document.querySelector('#nameText'); if (kind) kind.textContent = '내 땅'; if (txt) txt.textContent = 'No.' + String(MYNO).padStart(4, '0');
  if (SHOT) { const coach = document.querySelector('#coach'); coach?.classList.add('hidden'); try { window.DC?.store?.set('town_coach', true); } catch {} }

  const residents = [];
  // ── 매 프레임: 렌더 직전에 끼어든다(하늘·지구·주민·윤곽광 · 녹화용 연출 카메라) ──
  const orig = renderer.render.bind(renderer); const clock = new THREE.Clock(); let tt = 0;
  const _q = new THREE.Quaternion(), _p = new V3(), _l = new V3(), _m = new THREE.Matrix4();
  let intro = null;
  renderer.render = (s, c) => {
    const dt = Math.min(0.05, clock.getDelta()); tt += dt;
    if (s === scene) {
      sky.tick(tt); far.tick(dt, tt, c); plotU.uT.value = tt; big.tick(dt, tt, c); beams.forEach((b, i) => { b.material.opacity = 0.28 + 0.14 * Math.sin(tt * 3 + i); });
      for (const r of residents) { r.mixer.update(dt); const az = r.c.az + (r.walk ? Math.sin(tt * 0.4 + r.n) * 0.18 : 0); const d = dirAt(r.c.rho - 0.15 + (r.walk ? Math.cos(tt * 0.4 + r.n) * 0.2 : 0), az); r.root.position.copy(d).multiplyScalar(R); r.root.quaternion.copy(G.frameQuat(d)); r.root.rotateY(r.walk ? -tt * 0.4 + r.n : r.n * 2.1); }
      // 윤곽광: 카메라 반대편 위에서
      rim.target.position.set(0, 0, 0); rim.position.copy(c.position).multiplyScalar(-1).add(G.cam.dir.clone().multiplyScalar(R * 2)).setLength(30);
      for (const g of tags) g.userData.plate.lookAt(c.position); if (medCross) medCross.lookAt(c.position);
      if (intro && intro.phase === 'land') intro.landCam(c);
    }
    if (intro && intro.phase === 'space') return orig(intro.scene, intro.cam);
    return orig(s, c);
  };
  // 녹화 손잡이: 내 땅 안 한 점(가운데에서 깊이 drho·옆 daz) → 화면 좌표(CSS px) — 녹화가 「내 땅」 안을 정확히 탭하게
  const plotScreen = (pts) => pts.map(([drho, daz]) => { const v = dirAt(mine.rho + drho, mine.az + daz).multiplyScalar(R).project(camera); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; });
  // 녹화 손잡이: 내 땅 안 한 점에 소품을 놓는다(게임의 실제 놓기 함수 window.__town.place 를 쓴다 — 저장·개수·연출 모두 같은 길)
  const plotPlace = (id, drho, daz) => { const d = dirAt(mine.rho + drho, mine.az + daz); const [la, lo] = G.C.toIdx(d.x, d.y, d.z); window.__town?.place(id, la, lo); return window.__town?.items.length; };
  window.__townDoom = { N0, mine, numbers, residents, big, plots, plotScreen, plotPlace };

  // ── 녹화용 연출(?shot=land): 주민을 불러오는 동안 이미 우주 장면이 돈다 ──
  if (SHOT) { intro = makeIntro(); cover?.remove(); }
  // 다른 주민(이웃 땅 · 캐릭터 + 작은 집·텐트)
  const spots = [[1, 3, 'house'], [1, 9, 'tent'], [2, MY_I + 2, 'cabin'], [2, MY_I - 2, 'tent'], [3, 5, 'house'], [0, 4, 'campfire'], [3, MY_I * 2 % nOf(3), 'cabin'], [1, 14, 'campfire']];
  for (const [k, i0] of spots) { const i = ((i0 % nOf(k)) + nOf(k)) % nOf(k); if (k === MY_K && i === MY_I) continue; }
  const keys = G.C.CHARS.slice(0, 6);
  await Promise.all(spots.map(async ([k, i0, prop], n) => {
    const i = ((i0 % nOf(k)) + nOf(k)) % nOf(k); if (k === MY_K && i === MY_I) return; const c = cellAt(k, i);
    const tpl = G.propTemplate(prop); if (tpl) { const h = new THREE.Group(); const d = dirAt(c.rho + 0.25, c.az + 0.12); h.position.copy(d).multiplyScalar(R); h.quaternion.copy(G.frameQuat(d)); const body = tpl.clone(true); body.rotation.y = n * 1.3; body.scale.setScalar(0.8); h.add(body); scene.add(h); }
    const gl = await G.load(G.charModel(keys[n % keys.length])); if (!gl) return;
    const o = G.SkeletonUtils.clone(gl.scene); o.scale.setScalar(G.CH_S); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; } });
    const root = new THREE.Group(); root.add(o); scene.add(root);
    const mixer = new THREE.AnimationMixer(o); const clip = gl.animations.find((a) => a.name === (n % 3 === 0 ? 'walk' : 'idle')) || gl.animations[0]; if (clip) mixer.clipAction(clip).play();
    residents.push({ root, mixer, c, n, walk: n % 3 === 0 });
  }));

  if (intro) await intro.done;
  if (SHOT) { G.cam.elev = 1.12; G.cam.distT = 9.5; }   // 녹화: 꾸미기 시트(화면 아래 42%)에 내 땅이 가리지 않게 조금 더 위에서
  window.__landDone = true;
  return null;

  function makeIntro() {
    const isc = new THREE.Scene(); isc.background = new THREE.Color('#020308');
    const s2 = doomSky(THREE, innerHeight * renderer.getPixelRatio()); isc.add(s2.group);
    const icam = new THREE.PerspectiveCamera(camera.fov, camera.aspect, 0.05, 4000);
    const key = new THREE.DirectionalLight('#fff0dc', 2.6); isc.add(key, key.target); isc.add(new THREE.HemisphereLight('#3a4566', '#0d0a10', 0.6)); isc.environment = scene.environment;
    const W = makeNewWorld(THREE, { boarded: BOARDED }); const RW_ = 20; W.group.scale.setScalar(RW_); isc.add(W.group);
    const T = W.targetDir.clone(); const side = new V3(0.45, 0.25, 1).normalize();
    const camDir0 = T.clone().multiplyScalar(0.55).add(side.clone().multiplyScalar(0.45)).normalize();
    const flash = document.createElement('div'); Object.assign(flash.style, { position: 'fixed', inset: '0', background: '#eaf6ff', opacity: '0', zIndex: 40, pointerEvents: 'none', transition: 'opacity .18s' }); document.body.append(flash);
    const D0 = 3.0, D1 = 1.16, MS = 3000; let t0 = performance.now();
    const st = { phase: 'space', scene: isc, cam: icam };
    let res; st.done = new Promise((r) => (res = r));
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / MS); const e = 1 - Math.pow(1 - k, 2.4);
      const dist = Math.exp(Math.log(D0) + (Math.log(D1) - Math.log(D0)) * e) * RW_;
      const dir = camDir0.clone().lerp(T, Math.pow(e, 1.4)).normalize();
      icam.position.copy(dir).multiplyScalar(dist); const look = T.clone().multiplyScalar(RW_ * e * 0.98); icam.up.set(0, 1, 0); icam.lookAt(look);
      key.position.copy(icam.position).add(new V3(30, 40, 10)); key.target.position.set(0, 0, 0);
      W.uniforms.uFine.value = Math.min(1, Math.max(0, (k - 0.25) / 0.35)); W.tick(performance.now() / 1000); s2.tick(performance.now() / 1000);
      if (k > 0.9) flash.style.opacity = String(Math.min(1, (k - 0.9) / 0.1));
      if (k < 1) return requestAnimationFrame(step);
      // ② → ③ 땅: 하늘 높이에서 착륙한 본선과 번호 땅을 내려다보다가 내 땅으로
      st.phase = 'land'; flash.style.opacity = '0'; setTimeout(() => flash.remove(), 400);
      const L0 = performance.now(), LMS = 3200;
      st.landCam = (c) => {
        const u = Math.min(1, (performance.now() - L0) / LMS); const e2 = u * u * (3 - 2 * u);
        const endPos = c.position.clone(), endQ = c.quaternion.clone();   // town 카메라가 지금 잡은 자리(내 땅)
        const az0 = mine.az + 0.9; const top = N0.clone().multiplyScalar(R + 11).add(X0.clone().multiplyScalar(Math.cos(az0) * 5)).add(Z0.clone().multiplyScalar(Math.sin(az0) * 5));
        _p.copy(top).lerp(endPos, e2); c.position.copy(_p);
        _l.copy(N0).multiplyScalar(R).lerp(G.player.dir.clone().multiplyScalar(R), e2); _q.setFromRotationMatrix(_m.lookAt(_p, _l, N0)).slerp(endQ, Math.pow(e2, 2.2)); c.quaternion.copy(_q);
        if (u >= 1) { st.phase = 'done'; res(); }
      };
    };
    requestAnimationFrame(step);
    return st;
  }
}
