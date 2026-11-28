/* world-lobby.js — 우주 광장 북쪽 「우주선 탑승 대기장」
   대표 원문(2026-11-27): 「광장을 더 키워서 우주선 탑승 대기하는곳으로 만들면되겠다.」
   줄거리(릴스 manseok_ship v11.1과 같은 말): 지구 멸망 직전 → 이 우주선이 유일한 탈출구 → 좌석 100,000개 → 팔로우하면 좌석에 아이디가 새겨짐
     → 10,000명이 타면 우주선 광장이 열림 → 100,000명이면 출발 → 도착하면 내 행성(town.html).
   배치(world.js LOBBY · SHIP_AT · GATE_AT): 광장 분수 → 북쪽 큰길(줄 서는 기둥) → 탑승구 + 현황판 → 발사대 위 모선(오른쪽 탑승탑·다리).
     왼쪽 = 좌석 벽(스스로 건 탑승객) · 오른쪽 = 명예의 전당(world.js 에서 옮겨 둠).
   숫자는 data.js DWK.ship 한 곳(boarded · asOf · seats · openAt · wall). 가짜 숫자를 만들지 않는다 — 벽 아이디는 스스로 건 탑승객만(11-29). */
import { makeMothership } from './dwk-ship.js?v=3';
import { makeSilverShip } from './dwk-doom.js?v=1';
import { DOOM_ON } from './world-doom.js?v=1';
const DOOR_FACE = Math.atan2(0.9, 0.43);   // 문이 바라볼 방향(atan2(x, z)) — 오른쪽 철골 탑 쪽 + 카메라 쪽으로 살짝

export function install(EXT) {
  const { THREE, mesh, mat, sign, canvasTex, el, ic, DC, D, world, COL, SHIP_AT, GATE_AT, faceTo } = EXT;
  const S = Object.assign({ boarded: 0, seats: 100000, openAt: 10000, asOf: '', wall: [] }, D.ship || {});
  // 11-29 좌석 벽 = 탑승권 화면(pass.html)에서 스스로 건 사람만(서버 함수 ship_wall · 견본 sample_ 뺌) · 못 읽으면 data.js 기본값(1번 우리 배)
  { const BW = D.world && D.world.backend; if (BW && BW.url && BW.anonKey) fetch(`${BW.url}/rest/v1/rpc/ship_wall`, { method: 'POST', headers: { apikey: BW.anonKey, Authorization: `Bearer ${BW.anonKey}`, 'content-type': 'application/json' }, body: '{}' })
      .then((r) => (r.ok ? r.json() : null)).then((w) => { const L = w && Array.isArray(w.list) ? w.list.filter((x) => x && x.no && x.id).sort((a, b) => a.no - b.no) : []; if (L.length) S.wall = L; }).catch(() => {}); }
  const FONT = "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif";
  const n = (v) => Number(v).toLocaleString('ko-KR');
  const seatNo = (v) => 'No.' + String(v).padStart(6, '0');
  const tagFac = (g, id) => g.traverse(m => { m.userData.fac = id; });
  const [sx, sz] = SHIP_AT, [gx, gz] = GATE_AT;
  const ticks = [];

  // ── 발사대 + 모선 ──
  // 11-28(편장부 H33 · 대표 「영상 처음이랑 실제로 게임하는거랑 달라서 좀 몰입감이 깨진다」): 분홍 만화 로켓 → 릴스 돈워너노우호와 같은 은색 우주선·빨간 철골 탑·탑승 다리 4개(dwk-doom.js · 원본 ship2.js)
  //   ?skin=cute 이면 옛 모선(makeMothership) 그대로 — 이전/이후 비교용
  const pad = new THREE.Group(); pad.position.set(sx, 0, sz); world.add(pad);
  let ship;
  if (DOOM_ON) {
    ship = makeSilverShip(THREE, { seats: S.seats, boarded: S.boarded, S: 2.0, lite: !!EXT.LITE });
    ship.group.rotation.y = DOOR_FACE - ship.doorDir;   // 탑승 문·다리가 광장 쪽 오른편(+x · 살짝 앞)을 보게
    pad.add(ship.group);
    // 대기장 바닥과 발사대 사이 받침 고리(어두운 금속 + 노란 경고 띠)
    pad.add(mesh(new THREE.CylinderGeometry(5.9, 6.1, 0.12, 64), mat(0x2a2d33, { roughness: 0.6, metalness: 0.5 }), 0, 0.03, 0, false));
    const tw = ship.towerAt.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ship.group.rotation.y);
    COL.push({ x: sx + tw.x, z: sz + tw.z, r: 1.4 });
    ticks.push((dt, t) => ship.tick(dt, t, EXT.camera));
  } else {
    pad.add(mesh(new THREE.CylinderGeometry(5.7, 6.0, 0.36, 56), mat(0x3a3f58, { roughness: 0.9 }), 0, 0.18, 0));
    const hz = canvasTex(512, 512, (c, w) => { c.translate(w / 2, w / 2); for (let i = 0; i < 64; i++) { c.fillStyle = i % 2 ? '#1f1a2e' : '#ffcf3a'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, w / 2, i / 64 * 6.283, (i + 1) / 64 * 6.283); c.closePath(); c.fill(); } });
    pad.add(mesh(new THREE.RingGeometry(5.05, 5.6, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: hz, roughness: 0.8 }), 0, 0.37, 0, false));
    pad.add(mesh(new THREE.CircleGeometry(4.2, 48).rotateX(-Math.PI / 2), mat(0x2b2f45, { roughness: 0.6, metalness: 0.2 }), 0, 0.365, 0, false));
    const padLights = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const l = mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), Math.sin(a) * 4.75, 0.42, Math.cos(a) * 4.75, false); pad.add(l); padLights.push(l); }
    ship = makeMothership(THREE, { seats: S.seats, boarded: S.boarded }); ship.group.position.y = 0.36; pad.add(ship.group);
    ticks.push((dt, t) => { ship.tick(dt); padLights.forEach((l, i) => l.material.color.setHex(Math.floor(t * 4 - i * 0.25) % 4 === 0 ? 0xffffff : 0x7fd8ff)); });
  }
  tagFac(pad, 'ship'); COL.push({ x: sx, z: sz, r: 5.5 });

  // 탑승탑(오른쪽) + 문까지 이어진 다리 — 옛 옷에서만(새 옷은 은색 우주선이 빨간 철골 탑·다리 4개를 함께 짓는다)
  if (!DOOM_ON) {
  const tw = new THREE.Group(); tw.position.set(sx + 7.2, 0, sz); world.add(tw);
  const steel = mat(0x2b2f45, { roughness: 0.5, metalness: 0.4 }), red = mat(0xff6f91);
  for (const [px, pz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) tw.add(mesh(new THREE.BoxGeometry(0.22, 21, 0.22), steel, px, 10.5, pz));
  const beamGeo = new THREE.BoxGeometry(1.8, 0.14, 0.14), beams = new THREE.InstancedMesh(beamGeo, steel, 44); let bi = 0; const M4 = new THREE.Matrix4(), Qn = new THREE.Quaternion(), V = new THREE.Vector3(), One = new THREE.Vector3(1, 1, 1);
  for (let y = 1.5; y < 21; y += 1.9) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; Qn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a); V.set(Math.sin(a) * 0.8, y, Math.cos(a) * 0.8); M4.compose(V, Qn, One); if (bi < 44) beams.setMatrixAt(bi++, M4); }
  beams.count = bi; beams.castShadow = true; tw.add(beams);
  tw.add(mesh(new THREE.BoxGeometry(2.1, 0.3, 2.1), red, 0, 21.1, 0));
  const cab = mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), mat(0xffcf3a), 0, 1.0, 0); tw.add(cab); // 오르내리는 엘리베이터
  const bridgeLen = 7.2 - 3.65 - 0.9;
  const bridge = new THREE.Group(); bridge.position.set(-0.9 - bridgeLen / 2, 7.05, 0); tw.add(bridge);
  bridge.add(mesh(new THREE.BoxGeometry(bridgeLen, 0.22, 1.5), steel));
  bridge.add(mesh(new THREE.BoxGeometry(bridgeLen, 1.5, 0.08), mat(0x7fd8ff, { transparent: true, opacity: 0.45, roughness: 0.2 }), 0, 0.85, 0.72, false));
  bridge.add(mesh(new THREE.BoxGeometry(bridgeLen, 1.5, 0.08), mat(0x7fd8ff, { transparent: true, opacity: 0.45, roughness: 0.2 }), 0, 0.85, -0.72, false));
  bridge.add(mesh(new THREE.BoxGeometry(bridgeLen, 0.16, 1.6), red, 0, 1.65, 0));
  const beaconT = mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4d6d }), 0, 21.55, 0, false); tw.add(beaconT);
  ticks.push((dt, t) => { cab.position.y = 1.0 + (0.5 - 0.5 * Math.cos(t * 0.45)) * 5.9; beaconT.visible = Math.sin(t * 3.1) > 0; });
  tagFac(tw, 'ship'); COL.push({ x: sx + 7.2, z: sz, r: 1.4 });
  }

  // ── 탑승구 + 현황판 ──
  const gate = new THREE.Group(); gate.position.set(gx, 0, gz); world.add(gate); // 앞(+z)이 광장 쪽
  for (const px of [-3.0, 3.0]) { gate.add(mesh(new THREE.BoxGeometry(0.8, 8.4, 0.8), DOOM_ON ? mat(0x9aa2ad, { roughness: 0.4, metalness: 0.72 }) : mat(0xfff4dc), px, 4.2, 0)); gate.add(mesh(new THREE.BoxGeometry(0.86, 0.5, 0.86), mat(0xffcf3a), px, 0.25, 0)); COL.push({ x: gx + px, z: gz, r: 0.55 }); }
  gate.add(mesh(new THREE.BoxGeometry(6.9, 0.8, 0.9), DOOM_ON ? mat(0xb9433a, { roughness: 0.55, metalness: 0.5 }) : mat(0xff6f91), 0, 4.4, 0));
  const gs = sign('탑승구 · GATE 1', 5.2, 0.62, '#1f1a2e', '#ffcf3a'); gs.position.set(0, 4.4, 0.47); gate.add(gs);
  for (const px of [-1.25, 1.25]) { gate.add(mesh(new THREE.BoxGeometry(0.32, 1.0, 0.8), mat(0x2b2f45), px, 0.5, 0)); gate.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.62), new THREE.MeshBasicMaterial({ color: 0x9dff8f }), px, 1.02, 0.15, false)); COL.push({ x: gx + px, z: gz, r: 0.28 }); }
  const lane = mesh(new THREE.PlaneGeometry(1.6, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffcf3a, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0.02, -1.4, false); gate.add(lane);
  // 현황판(문 위) — 숫자는 data.js DWK.ship
  const boardTex = canvasTex(1024, 400, (c, w, h) => {
    c.fillStyle = DOOM_ON ? '#06080d' : '#0d0f1d'; c.fillRect(0, 0, w, h); c.strokeStyle = DOOM_ON ? '#5fe8ff' : '#ffcf3a'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.fillStyle = '#ffcf3a'; c.font = `800 38px ${FONT}`; c.fillText('탑승 현황', 44, 70);
    c.textAlign = 'right'; c.fillStyle = '#a9a7b8'; c.font = `600 28px ${FONT}`; if (S.asOf) c.fillText(`${S.asOf} 기준`, w - 44, 68);
    c.textAlign = 'center'; c.fillStyle = DOOM_ON ? '#ffd34d' : '#fff4dc'; c.font = `900 120px ${FONT}`; const big = n(S.boarded), sm = ` / ${n(S.seats)}명`;
    const bw = c.measureText(big).width; c.font = `800 52px ${FONT}`; const swd = c.measureText(sm).width; const x0 = w / 2 - (bw + swd) / 2;
    c.textAlign = 'left'; c.font = `900 120px ${FONT}`; c.fillText(big, x0, 196); c.fillStyle = '#7fd8ff'; c.font = `800 52px ${FONT}`; c.fillText(sm, x0 + bw, 196);
    const bx = 60, by = 236, bwid = w - 120, bh = 30, pct = Math.min(1, S.boarded / S.seats);
    c.fillStyle = '#262a44'; c.fillRect(bx, by, bwid, bh); c.fillStyle = '#ffcf3a'; c.fillRect(bx, by, Math.max(10, bwid * pct), bh);
    const mx = bx + bwid * (S.openAt / S.seats); c.fillStyle = DOOM_ON ? '#ff4a2a' : '#ff6f91'; c.fillRect(mx - 3, by - 10, 6, bh + 20);
    c.font = `700 26px ${FONT}`; c.textAlign = 'center'; c.fillStyle = DOOM_ON ? '#ff8a6a' : '#ff9ab3'; c.fillText(`${n(S.openAt)} 광장 오픈`, Math.max(140, mx), by + bh + 40);
    c.textAlign = 'right'; c.fillStyle = DOOM_ON ? '#e8f4ff' : '#fff4dc'; c.fillText(`${n(S.seats)} 출발`, bx + bwid, by + bh + 40);
    c.textAlign = 'center'; c.fillStyle = '#ffcf3a'; c.font = `800 36px ${FONT}`; c.fillText(`${n(S.seats)}명이 다 타면 출발`, w / 2, h - 30);
  });
  // 11-28 대표 「전광판 디자인이 존나 짜쳐」 → 새 옷: 릴스 화면 숫자와 같은 결(갈무리 굵은 글꼴 · 노란 숫자 + 검은 테 · 청록 HUD 선 · 빛나는 진행 막대)
  //   편장부 H41(11-28): 출발은 100,000명이 모이면 한 번에 · 10,000명 = 탑승 대기장 열림 표시 · 숫자는 data.js DWK.ship 그대로(가짜 숫자 없음)
  //   인스타·유튜브 합산(H40)은 S.sources = { instagram, youtube } 가 들어오면 출처 줄을 함께 그린다
  const boardMap = DOOM_ON ? doomBoardTex() : boardTex;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.58), DOOM_ON ? new THREE.MeshBasicMaterial({ map: boardMap, toneMapped: false, transparent: true }) : new THREE.MeshStandardMaterial({ map: boardTex, emissive: 0xffffff, emissiveMap: boardTex, emissiveIntensity: 0.85, roughness: 0.6 }));
  board.position.set(0, 6.55, 0.47); gate.add(board); gate.add(mesh(new THREE.BoxGeometry(6.9, 2.85, 0.22), mat(0x15172a), 0, 6.55, 0.33)); // 기둥(앞면 z 0.4)보다 앞에 둬야 판 양끝이 안 가려진다
  tagFac(gate, 'gate');
  // 줄 서는 기둥(공항 줄) — 걷는 길은 막지 않는다(충돌 없음)
  const post = mat(DOOM_ON ? 0xc9ced6 : 0xd9ccb4, { metalness: DOOM_ON ? 0.85 : 0.5, roughness: 0.3 }), rope = new THREE.MeshStandardMaterial({ color: 0xd0344f, roughness: 0.7 });
  for (const px of [-1.05, 1.05]) for (let i = 0; i < 4; i++) {
    const z = gz + 4.3 - i * 1.05; world.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.95, 10), post, gx + px, 0.48, z)); world.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.06, 14), post, gx + px, 0.03, z));
    if (i < 3) { const r = mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8).rotateX(Math.PI / 2), rope, gx + px, 0.84, z - 0.525, false); world.add(r); }
  }
  // 바닥 글씨(큰길 위 · 광장에서 읽힌다)
  const floorTex = canvasTex(1024, 320, (c, w, h) => { c.fillStyle = DOOM_ON ? '#ffcf3a' : '#1f1a2e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 150px ${FONT}`; c.fillText('탑승 대기장', w / 2, h / 2 - 10); c.fillStyle = DOOM_ON ? '#5fe8ff' : '#ff6f91'; c.fillRect(w / 2 - 40, h - 46, 80, 18); });
  world.add(mesh(new THREE.PlaneGeometry(3.2, 1.0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, opacity: 0.85 }), 0, 0.02, -8.2, false)); // 분수 쪽 기존 포장길 위(풀이 안 나는 자리)
  // 큰길 가로등 4개
  for (const [lx, lz] of [[-3.9, -15.4], [3.9, -15.4], [-4.6, -25.6], [4.6, -25.6]]) {
    world.add(mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.0, 10), mat(0x2b2f45), lx, 1.5, lz)); world.add(mesh(new THREE.SphereGeometry(0.26, 14, 10), new THREE.MeshBasicMaterial({ color: DOOM_ON ? new THREE.Color('#bff4ff').multiplyScalar(1.6) : 0xfff1b8 }), lx, 3.12, lz, false)); COL.push({ x: lx, z: lz, r: 0.2 });
  }

  // ── 좌석 벽(왼쪽 · 큰길을 본다) ──
  const wall = new THREE.Group(); wall.position.set(-9.6, 0, -23.5); faceTo(wall, 0, -23.5); world.add(wall);
  const wallTex = canvasTex(1024, 540, (c, w, h) => {
    c.fillStyle = DOOM_ON ? '#c9ced6' : '#fff4dc'; c.fillRect(0, 0, w, h); c.strokeStyle = DOOM_ON ? '#5b636e' : '#1f1a2e'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    c.fillStyle = '#1f1a2e'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `900 46px ${FONT}`; c.fillText('좌석 벽', 36, 52); c.font = `700 26px ${FONT}`; c.fillStyle = '#5b5270'; c.fillText('탑승하면 좌석 번호와 아이디가 새겨져', 200, 54);
    const plates = [...(S.wall || []).slice(0, 6).map(s => ({ no: s.no, id: '@' + s.id })), { gap: true }, { no: S.boarded + 1, id: '다음 자리 · 너?', next: true }, { no: S.boarded + 2, id: '비어 있음', empty: true }, { no: S.boarded + 3, id: '비어 있음', empty: true }];
    const cw = 232, ch = 116, gx0 = 36, gy0 = 96, gap = 12; let k = 0;
    for (const p of plates) {
      const col = k % 4, row = Math.floor(k / 4), x = gx0 + col * (cw + gap), y = gy0 + row * (ch + gap);
      if (p.gap) { c.fillStyle = '#1f1a2e'; c.font = `800 26px ${FONT}`; c.textAlign = 'center'; c.fillText(`⋯ ${n(S.boarded)}번 자리까지 탑승 ⋯`, x + cw + gap / 2, y + ch / 2); k += 2; continue; }
      c.fillStyle = p.next ? '#ffcf3a' : p.empty ? (DOOM_ON ? '#aab1bb' : '#efe6d2') : (DOOM_ON ? '#e6e9ee' : '#d9ccb4'); c.fillRect(x, y, cw, ch); c.strokeStyle = '#1f1a2e'; c.lineWidth = 5; c.strokeRect(x, y, cw, ch);
      c.textAlign = 'center'; c.fillStyle = p.empty ? '#9a90a8' : '#1f1a2e'; c.font = `800 30px ${FONT}`; c.fillText(seatNo(p.no), x + cw / 2, y + 42);
      c.font = `${p.next ? 800 : 700} ${p.id.length > 16 ? 20 : 24}px ${FONT}`; c.fillStyle = p.empty ? '#9a90a8' : p.next ? '#1f1a2e' : '#3a3150'; c.fillText(p.id, x + cw / 2, y + 86); k++;
    }
    c.fillStyle = '#7a6f86'; c.font = `600 22px ${FONT}`; c.textAlign = 'center'; c.fillText('아이디는 탑승권 화면에서 스스로 건 사람만 보여', w / 2, h - 30);
  });
  wall.add(mesh(new THREE.BoxGeometry(7.4, 4.2, 0.4), mat(0x2b2f45), 0, 2.35, -0.05));
  wall.add(mesh(new THREE.BoxGeometry(7.7, 0.3, 0.6), mat(0xffcf3a), 0, 4.55, 0));
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.69), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.6 })); wf.position.set(0, 2.3, 0.16); wall.add(wf);
  tagFac(wall, 'seatwall'); for (const dz of [-2.6, 0, 2.6]) COL.push({ x: -9.75, z: -23.5 + dz, r: 1.25 });

  // ── 시설 등록(들어가기 버튼 · 지도 · 이름표) ──
  EXT.addFac({ id: 'gate', name: '탑승구', icon: 'arrow', act: '탑승 안내 보기', at: [gx, gz + 2.6], open: openGate, tagAt: [gx, gz], tagY: 8.4 });
  EXT.addFac({ id: 'seatwall', name: '좌석 벽', icon: 'board', act: '좌석 벽 보기', at: [-6.6, -23.5], open: openWall, tagAt: [-9.6, -23.5], tagY: 5.1 });
  EXT.addFac({ id: 'ship', name: '우주선 · 좌석 100,000', icon: 'arrow', act: '우주선 탑승 안내', at: [sx - 3.2, sz + 6.4], open: openGate, tagAt: [sx, sz + 3.4], tagY: 6.2 });

  // ── 안내 화면 ──
  function progress() {
    const pct = Math.min(100, S.boarded / S.seats * 100), mk = S.openAt / S.seats * 100;
    return el('div', { class: 'lb-prog' },
      el('div', { class: 'lb-count' }, el('b', {}, n(S.boarded)), el('span', {}, ` / ${n(S.seats)}명 탑승`)),
      el('div', { class: 'lb-bar', role: 'img', 'aria-label': `${n(S.seats)}석 중 ${n(S.boarded)}명 탑승` }, el('i', { style: `width:${Math.max(1.2, pct).toFixed(2)}%` }), el('em', { style: `left:${mk}%` })),
      el('div', { class: 'lb-marks' }, el('span', { style: `left:${mk}%` }, `${n(S.openAt)} 광장 오픈`), el('span', { class: 'end' }, `${n(S.seats)} 출발`)));
  }
  function joinBtn() {
    const pr = EXT.profile();
    if (EXT.GUEST) return el('a', { class: 'btn k', href: 'maker.html?flow=join' }, ic('user'), '내 캐릭터 만들고 주민 등록');
    if (!pr) return el('button', { class: 'btn k', type: 'button', onclick: () => EXT.join(0) }, ic('user'), '주민 등록하기');
    if (pr.follow !== 'ok') return el('button', { class: 'btn k', type: 'button', onclick: () => EXT.join(2) }, ic('check'), '팔로우 확인 코드 받기');
    return el('p', {}, el('span', { class: 'pill ok' }, '팔로우 확인됨 · 탑승 대기 중'));
  }
  function openGate() {
    EXT.sheet('탑승구 · GATE 1',
      el('p', { class: 'lead' }, `지구 멸망 직전. 이 우주선이 유일한 탈출구야. 좌석은 ${n(S.seats)}개.`),
      progress(),
      el('ol', { class: 'lb-steps' },
        el('li', {}, el('b', {}, '@dontwannaknow.kr 팔로우'), ' = 탑승'),
        el('li', {}, '좌석 벽에 ', el('b', {}, '내 좌석 번호와 아이디'), '가 새겨져'),
        el('li', {}, el('b', {}, `${n(S.openAt)}명`), '이 타면 우주선 광장이 열려'),
        el('li', {}, el('b', {}, `${n(S.seats)}명`), '이 다 타면 출발'),
        el('li', {}, '도착하면 ', el('b', {}, '내 행성'), '이 생겨')),
      el('a', { class: 'btn k sun', href: D.site.links.instagram, target: '_blank', rel: 'noopener' }, ic('heart'), '인스타에서 팔로우하고 탑승'),
      joinBtn(),
      el('a', { class: 'btn k', href: 'town.html' }, ic('home'), '내 행성 미리 꾸미기'),
      el('p', { class: 'note' }, `${S.asOf ? S.asOf + ' 기준 팔로워 수 · ' : ''}좌석 번호 고르기는 준비 중이야.`));
  }
  function openWall() {
    EXT.sheet('좌석 벽',
      el('p', { class: 'lead' }, '탑승하면 좌석 번호와 인스타 아이디가 이 벽에 새겨져.'),
      el('ul', { class: 'list' }, (S.wall || []).slice(0, 6).map(s => el('li', {}, el('span', { class: 'n' }, el('b', {}, seatNo(s.no)), el('small', {}, '@' + s.id))))),
        el('li', { class: 'lb-next' }, el('span', { class: 'n' }, el('b', {}, seatNo(S.boarded + 1)), el('small', {}, `다음 자리 · ${n(S.boarded)}명 다음이 너야`)))),
      el('a', { class: 'btn k sun', href: D.site.links.instagram, target: '_blank', rel: 'noopener' }, ic('heart'), '팔로우하고 내 자리 받기'),
      el('a', { class: 'btn k', href: 'pass.html' }, ic('board'), '내 탑승권 찾기'),
      el('p', { class: 'note' }, '아이디는 탑승권 화면에서 스스로 건 사람만 보여. 좌석 번호는 팔로우한 순서대로 새겨져.'));
  }


  function doomBoardTex() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400; const x = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const PIX = "'Galmuri11', 'Pretendard Variable', Pretendard, sans-serif"; const goal = +(S.seats || 100000), open = +(S.openAt || 10000); const got = Math.min(S.boarded, goal);
    const sk = (txt, X, Y, px, col, lw = 0.17, al = 'left') => { x.font = `700 ${px}px ${PIX}`; x.textAlign = al; x.lineJoin = 'round'; x.lineWidth = px * lw; x.strokeStyle = 'rgba(0,0,0,.92)'; x.strokeText(txt, X, Y); x.fillStyle = col; x.fillText(txt, X, Y); };
    const paint = () => {
      x.clearRect(0, 0, 1024, 400);
      const g = x.createLinearGradient(0, 0, 0, 400); g.addColorStop(0, 'rgba(6,12,20,.94)'); g.addColorStop(1, 'rgba(3,6,10,.96)'); x.fillStyle = g; x.fillRect(8, 8, 1008, 384);
      x.fillStyle = 'rgba(95,232,255,.05)'; for (let y = 12; y < 392; y += 6) x.fillRect(8, y, 1008, 2);   // 주사선
      x.strokeStyle = 'rgba(95,232,255,.55)'; x.lineWidth = 3; x.strokeRect(10, 10, 1004, 380);
      x.strokeStyle = '#5fe8ff'; x.lineWidth = 8; for (const [px, py, dx, dy] of [[10, 10, 1, 1], [1014, 10, -1, 1], [10, 390, 1, -1], [1014, 390, -1, -1]]) { x.beginPath(); x.moveTo(px, py + dy * 46); x.lineTo(px, py); x.lineTo(px + dx * 46, py); x.stroke(); }   // 모서리 꺾쇠
      x.textBaseline = 'middle'; sk('탑승 현황', 44, 58, 40, '#5fe8ff', 0.12);
      if (S.live) { x.fillStyle = (performance.now() / 600 | 0) % 2 ? '#ff3b2f' : '#7a1a14'; x.beginPath(); x.arc(850, 58, 11, 0, 6.283); x.fill(); sk(`LIVE ${S.asOf}`, 980, 58, 30, '#ffb4a8', 0.12, 'right'); }
      else if (S.asOf) sk(`${S.asOf} 기준`, 980, 58, 30, '#9fb4c8', 0.12, 'right');
      const big = n(Math.round(got)), sm = ` / ${n(goal)}`; x.font = `700 150px ${PIX}`; const bw = x.measureText(big).width; x.font = `700 62px ${PIX}`; const sw = x.measureText(sm).width; const x0 = 512 - (bw + sw) / 2;
      sk(big, x0, 168, 150, '#ffd84a', 0.16); sk(sm, x0 + bw + 6, 190, 62, '#e8f4ff', 0.16);
      // 진행 막대(릴스 막대 결: 어두운 통 + 노란 채움 + 끝 빛 점)
      const bx = 64, by = 268, bwid = 896, bh = 22, pct = got / goal, fx = bx + Math.max(14, bwid * pct);
      x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(bx, by, bwid, bh); x.strokeStyle = 'rgba(95,232,255,.45)'; x.lineWidth = 2; x.strokeRect(bx, by, bwid, bh);
      for (let i = 1; i < 10; i++) { x.fillStyle = 'rgba(95,232,255,.35)'; x.fillRect(bx + bwid * i / 10 - 1, by - 6, 2, bh + 12); }
      const fg = x.createLinearGradient(bx, 0, fx, 0); fg.addColorStop(0, '#c99a12'); fg.addColorStop(1, '#ffd84a'); x.fillStyle = fg; x.fillRect(bx, by, fx - bx, bh);
      const rg = x.createRadialGradient(fx, by + bh / 2, 0, fx, by + bh / 2, 34); rg.addColorStop(0, 'rgba(255,245,200,1)'); rg.addColorStop(0.35, 'rgba(255,216,74,.85)'); rg.addColorStop(1, 'rgba(255,216,74,0)'); x.fillStyle = rg; x.fillRect(fx - 34, by + bh / 2 - 34, 68, 68);
      const ox = bx + bwid * open / goal; x.fillStyle = '#5fe8ff'; x.fillRect(ox - 2, by - 12, 4, bh + 24); sk(`${n(open)} 대기장 열림`, ox - 6, by + 56, 28, '#5fe8ff', 0.12, 'left');
      sk(`${n(goal)} 출발`, bx + bwid, by + 56, 32, '#ffd84a', 0.14, 'right');
      const src = S.sources; const line = src && src.instagram != null && src.youtube != null ? `인스타 ${n(src.instagram)} + 유튜브 ${n(src.youtube)}` : `남은 자리 ${n(Math.max(0, goal - got))}`;
      sk(line, 512, 364, 34, '#e8f4ff', 0.13, 'center');
      t.needsUpdate = true;
    };
    paint(); document.fonts?.load(`700 40px 'Galmuri11'`).then(paint).catch(() => {});
    t.userData.paint = paint;
    return t;
  }
  // ── 라이브 탑승 인원(11-28 대표 「라이브로 올라가게」「녹화+라이브 진행」) ──
  //   Supabase public.ship_stats(id=1)를 1분마다 읽는다(anon 키 = 읽기만). 로컬 집계 탑승집계.py --push 가 30분마다 공식 API 값으로 쓴다.
  //   숫자가 늘면 전광판 숫자가 1.6초 동안 차르르 올라가고, 다 오르면 우주선 창 불빛도 그만큼 켜진다. 녹화(backend 없음)에선 돌지 않는다.
  const BE = D.world && D.world.backend;
  if (DOOM_ON && BE && BE.url && BE.anonKey && boardMap.userData.paint) {
    const paintBoard = boardMap.userData.paint; let anim = null;
    const fmtAt = (iso) => { const d = new Date(iso); if (isNaN(d)) return ''; const k = new Date(d.getTime() + 9 * 3600e3); return `${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`; };
    const poll = async () => {
      try {
        const r = await fetch(`${BE.url}/rest/v1/ship_stats?id=eq.1&select=boarded,instagram,youtube,as_of`, { headers: { apikey: BE.anonKey, Authorization: `Bearer ${BE.anonKey}` }, cache: 'no-store' });
        if (!r.ok) return; const [row] = await r.json(); if (!row || !Number.isFinite(row.boarded) || row.boarded < 0) return;
        S.live = true; S.asOf = fmtAt(row.as_of); S.sources = { instagram: row.instagram, youtube: row.youtube };
        if (row.boarded !== Math.round(S.boarded)) anim = { from: S.boarded, to: row.boarded, t0: performance.now() }; else paintBoard();
      } catch (e) { console.warn('탑승 인원 라이브 읽기 실패', e?.message); }
    };
    poll(); setInterval(() => { if (!document.hidden) poll(); }, 60000);
    let lastBlink = 0;
    ticks.push(() => {
      const now = performance.now();
      if (anim) { const k = Math.min(1, (now - anim.t0) / 1600), e = 1 - Math.pow(1 - k, 3); S.boarded = anim.from + (anim.to - anim.from) * e; paintBoard();
        if (k >= 1) { S.boarded = anim.to; ship.setBoarded?.(anim.to); anim = null; } }
      else if (S.live && now - lastBlink > 600) { lastBlink = now; paintBoard(); }   // LIVE 점 깜빡임
    });
  }

  EXT.onTick((dt, t) => { for (const f of ticks) f(dt, t); });
  window.__lobby = { S, ship, openGate, openWall, pad, gate, wall };
}
