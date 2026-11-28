/* dwk-ship.js — 돈워너노우 우주선(광장 정거장 · 행성 타운이 같이 쓴다)
   makeShip(THREE) → { group, flame, seat, setThrust(0~1), tick(dt) }  · 키 약 2.6, 바닥이 y=0
   warp(text, ms) → 화면 전체 워프(별줄기) 연출 Promise. 크림 종이·잉크 옷과 같은 색. 움직임 줄이기 설정이면 짧게.
   makeMothership(THREE, { seats, boarded }) → 탑승 대기장의 「좌석 100,000개」 모선(2026-11-27 · 대표 「광장을 더 키워서 우주선 탑승 대기하는곳으로」)
     키 약 24.5 · 바닥 y=0 · 문은 +x 쪽(탑승 다리가 붙는 자리) · 앞(+z)엔 이름 띠. 창 360개 중 「탑승 인원 / 좌석」 비율만큼 불이 켜진다. */
export function makeShip(THREE) {
  const g = new THREE.Group();
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, flatShading: true, ...o });
  const ink = new THREE.MeshBasicMaterial({ color: 0x1f1a2e, side: THREE.BackSide }); // 뒤집힌 셸 = 굵은 잉크 외곽선
  const add = (geo, mat, x = 0, y = 0, z = 0, outline = 1.06) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; g.add(o);
    if (outline) { const l = new THREE.Mesh(geo, ink); l.scale.setScalar(outline); o.add(l); }
    return o;
  };
  add(new THREE.CylinderGeometry(0.62, 0.72, 1.3, 16), m(0xfff4dc), 0, 1.05, 0);               // 몸통(크림)
  add(new THREE.ConeGeometry(0.62, 0.9, 16), m(0xff6f91), 0, 2.15, 0);                          // 머리(분홍)
  add(new THREE.CylinderGeometry(0.74, 0.74, 0.16, 16), m(0xffcf3a), 0, 0.78, 0, 1.04);         // 띠(노랑)
  const win = add(new THREE.CircleGeometry(0.26, 20), m(0x7fd8ff, { emissive: 0x2a7fa0, emissiveIntensity: 0.6 }), 0, 1.32, 0.61, 0); // 창
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.33, 20), new THREE.MeshBasicMaterial({ color: 0x1f1a2e })); rim.position.set(0, 1.32, 0.615); g.add(rim);
  for (let i = 0; i < 3; i++) { // 다리 겸 날개 3개
    const a = i / 3 * Math.PI * 2; const fin = add(new THREE.BoxGeometry(0.12, 0.9, 0.55), m(0xff6f91), Math.sin(a) * 0.68, 0.45, Math.cos(a) * 0.68, 1.08); fin.rotation.y = a;
  }
  add(new THREE.CylinderGeometry(0.34, 0.46, 0.3, 14), m(0x2b2f45), 0, 0.3, 0, 1.05);           // 분사구
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcf3a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.2, 14, 1, true).rotateX(Math.PI), flameMat); flame.position.y = -0.45; g.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 12, 1, true).rotateX(Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); flame2.position.y = -0.3; g.add(flame2);
  const seat = new THREE.Object3D(); seat.position.set(0, 2.6, 0); g.add(seat); // 「우주선 위에 올라타서」 — 캐릭터가 서는 자리(머리 위)
  let thrust = 0, t = 0;
  return {
    group: g, flame, seat, window: win,
    setThrust(v) { thrust = Math.max(0, Math.min(1, v)); },
    tick(dt) { t += dt; const f = thrust * (0.85 + Math.sin(t * 40) * 0.15); flame.scale.set(0.6 + f * 0.6, Math.max(0.01, f * 1.6), 0.6 + f * 0.6); flame2.scale.set(1, Math.max(0.01, f * 1.4), 1); flame.visible = flame2.visible = thrust > 0.02; flameMat.opacity = 0.6 + f * 0.35; },
  };
}

// 화면 전체 워프 — 잉크 바탕에 크림·노랑 별줄기가 가운데서 뻗어 나간다
export function warp(text = '', ms = 2200) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduce) ms = Math.min(ms, 500);
  return new Promise((done) => {
    const c = document.createElement('canvas'); Object.assign(c.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: 90, background: '#1f1a2e', opacity: '0', transition: 'opacity .25s' });
    const label = document.createElement('div'); label.textContent = text;
    Object.assign(label.style, { position: 'fixed', left: '50%', bottom: '18%', transform: 'translateX(-50%)', zIndex: 91, font: "700 15px/1.4 'Galmuri11', sans-serif", color: '#1f1a2e', background: '#fff4dc', border: '3px solid #1f1a2e', borderRadius: '12px', boxShadow: '0 4px 0 #000', padding: '10px 14px 9px', whiteSpace: 'nowrap', opacity: '0', transition: 'opacity .3s' });
    document.body.append(c, label); requestAnimationFrame(() => { c.style.opacity = '1'; if (text) label.style.opacity = '1'; });
    const dpr = Math.min(2, devicePixelRatio || 1); const W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr; const x = c.getContext('2d');
    const stars = Array.from({ length: 220 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() * 40, v: 0.6 + Math.random() * 2.4, c: Math.random() < 0.2 ? '#ffcf3a' : Math.random() < 0.3 ? '#7fd8ff' : '#fff4dc' }));
    const t0 = performance.now();
    (function frame(now) {
      const p = (now - t0) / ms; const sp = p < 0.5 ? p * 2 : 1; // 처음엔 점, 점점 길어진다
      x.fillStyle = 'rgba(31,26,46,0.35)'; x.fillRect(0, 0, W, H); x.lineCap = 'round';
      for (const s of stars) { const r0 = s.r; s.r += s.v * (4 + sp * 38) * dpr; const cx = W / 2, cy = H / 2;
        x.strokeStyle = s.c; x.lineWidth = (1 + sp * 2.5) * dpr; x.beginPath(); x.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); x.lineTo(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r); x.stroke();
        if (s.r > Math.hypot(W, H)) { s.r = Math.random() * 30; s.a = Math.random() * Math.PI * 2; } }
      if (p < 1) requestAnimationFrame(frame); else done({ remove: () => { c.style.opacity = '0'; label.style.opacity = '0'; setTimeout(() => { c.remove(); label.remove(); }, 300); } });
    })(t0);
  });
}

// ───────── 모선: 좌석 100,000개짜리 탈출선(탑승 대기장 발사대에 선다) ─────────
// 작은 우주선과 같은 옷(크림 몸통 · 분홍 머리 · 노란 띠 · 잉크 외곽선)을 크게 키운 모양. 창 불빛 = 탑승 비율.
export function makeMothership(THREE, { seats = 100000, boarded = 0 } = {}) {
  const g = new THREE.Group();
  const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true, ...o });
  const ink = new THREE.MeshBasicMaterial({ color: 0x1f1a2e, side: THREE.BackSide });
  const add = (geo, mat, x = 0, y = 0, z = 0, outline = 1.03) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o);
    if (outline) { const l = new THREE.Mesh(geo, ink); l.scale.setScalar(outline); o.add(l); }
    return o;
  };
  const cream = m(0xfff4dc), pink = m(0xff6f91), sun = m(0xffcf3a), dark = m(0x2b2f45, { roughness: 0.45, metalness: 0.3 });
  // 엔진 4개 + 치마
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; add(new THREE.CylinderGeometry(0.55, 1.05, 1.7, 18, 1, true), dark, Math.sin(a) * 1.45, 0.95, Math.cos(a) * 1.45, 1.05); }
  add(new THREE.CylinderGeometry(3.35, 3.0, 2.2, 36), dark, 0, 2.9, 0, 1.02);
  // 몸통(아래 · 띠 · 위)
  add(new THREE.CylinderGeometry(3.45, 3.6, 6.4, 40), cream, 0, 7.2, 0, 1.02);
  add(new THREE.CylinderGeometry(3.62, 3.62, 0.8, 40), sun, 0, 10.6, 0, 1.02);
  add(new THREE.CylinderGeometry(3.2, 3.45, 6.8, 40), cream, 0, 14.4, 0, 1.02);
  add(new THREE.CylinderGeometry(3.28, 3.28, 0.5, 40), sun, 0, 17.9, 0, 1.02);
  // 머리(둥근 끝 · 분홍)
  const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(Math.max(0.001, 3.2 * Math.cos(u * Math.PI / 2) ** 0.9), u * 6.4)); }
  add(new THREE.LatheGeometry(prof, 40), pink, 0, 18.1, 0, 1.02);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff4d6d })); tip.position.y = 24.55; g.add(tip);
  // 날개 겸 다리 4개(대각선 · 앞과 옆은 비운다 → 앞 이름 띠 · 옆 탑승 다리)
  const fs = new THREE.Shape([new THREE.Vector2(0, 9.2), new THREE.Vector2(0, 1.6), new THREE.Vector2(2.3, 0), new THREE.Vector2(2.75, 0), new THREE.Vector2(2.5, 3.4), new THREE.Vector2(0.6, 9.2)]);
  const finGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.5, bevelEnabled: false }).translate(0, 0, -0.25);
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const f = add(finGeo, pink, Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2, 1.04); f.rotation.y = a - Math.PI / 2; }
  // 이름 띠(몸통에 감긴 글씨)
  const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 512; const x = tc.getContext('2d');
  x.fillStyle = '#1f1a2e'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = "900 150px 'Pretendard Variable', Pretendard, system-ui, sans-serif"; x.fillText('돈워너노우 1호', 512, 190);
  x.fillStyle = '#ff6f91'; x.fillRect(150, 300, 724, 12); x.fillStyle = '#1f1a2e'; x.font = "800 92px 'Pretendard Variable', Pretendard, system-ui, sans-serif"; x.fillText('좌석 100,000', 512, 400);
  const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace; tt.anisotropy = 4;
  const decal = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.35, 3.4, 32, 1, true, -0.75, 1.5), new THREE.MeshStandardMaterial({ map: tt, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  decal.position.y = 14.6; g.add(decal);
  // 탑승문(+x) — 탑승 다리가 붙는 자리
  const door = new THREE.Group(); door.position.set(3.5, 8.2, 0); door.rotation.y = Math.PI / 2; g.add(door);
  door.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.6, 0.3), sun));
  const glowDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.15), new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); glowDoor.position.z = 0.16; door.add(glowDoor);
  // 창 360개(행 12 × 둘레 30) — 탑승 비율만큼 불이 켜진다
  const rows = [5.0, 5.9, 6.8, 7.7, 8.6, 9.5, 11.7, 12.6, 13.5, 14.4, 15.3, 16.2], cols = 30, slots = [];
  for (const y of rows) for (let c = 0; c < cols; c++) {
    const a = c / cols * Math.PI * 2 + 0.105; const front = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.8; const side = Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.42;
    if (front && y > 12.5 && y < 16.5) continue;           // 이름 띠 자리
    if (side && y > 6.6 && y < 9.9) continue;               // 탑승문 자리
    const r = y < 10.4 ? 3.45 + (10.4 - y) / 6.4 * 0.15 : 3.2 + (17.8 - y) / 6.8 * 0.25; slots.push({ a, y, r: r + 0.03 });
  }
  const winGeo = new THREE.CircleGeometry(0.2, 12), rimGeo = new THREE.CircleGeometry(0.28, 12);
  const wins = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), slots.length), rims = new THREE.InstancedMesh(rimGeo, new THREE.MeshBasicMaterial({ color: 0x1f1a2e }), slots.length);
  const M = new THREE.Matrix4(), Qn = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), E = new THREE.Euler();
  slots.forEach((s, i) => { E.set(0, s.a, 0); Qn.setFromEuler(E); P.set(Math.sin(s.a) * s.r, s.y, Math.cos(s.a) * s.r); M.compose(P, Qn, S); rims.setMatrixAt(i, M); P.set(Math.sin(s.a) * (s.r + 0.015), s.y, Math.cos(s.a) * (s.r + 0.015)); M.compose(P, Qn, S); wins.setMatrixAt(i, M); });
  g.add(rims, wins);
  const order = slots.map((_, i) => i).sort((a, b) => ((a * 7919) % 360) - ((b * 7919) % 360)); // 켜지는 순서(고정 · 흩어져 보이게)
  const on = new THREE.Color(0xffcf3a), off = new THREE.Color(0x34405e), C = new THREE.Color();
  function setBoarded(n) { const k = Math.max(n > 0 ? 1 : 0, Math.round(slots.length * Math.min(1, n / seats))); order.forEach((idx, j) => wins.setColorAt(idx, C.copy(j < k ? on : off))); wins.instanceColor.needsUpdate = true; return k; }
  setBoarded(boarded);
  // 엔진 아래 대기 불빛(이륙 전 · 약하게 숨 쉰다)
  const idle = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 1.2, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); idle.position.y = 0.6; g.add(idle);
  let t = 0;
  return {
    group: g, door, windows: slots.length, setBoarded,
    tick(dt) { t += dt; tip.material.color.setHex(Math.sin(t * 3) > 0.2 ? 0xff4d6d : 0x5a1d2a); idle.material.opacity = 0.12 + Math.sin(t * 1.6) * 0.06; },
  };
}
