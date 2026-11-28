/* world-secrets.js — 우주 광장 「숨겨진 비밀 찾기」(이스터에그)
   대표 원문(2026-11-20): 「약간 gta같은 게임에서 제작자가 몰래 숨겨놓은 그런거 있잖아. 그런거 찾으면 보상주는것도 좋을 거 같은데?」
   같은 날 휴대폰 체험 지적: 「존나 뚝뚝 끊기고, 설명이 뭔소리하는건지 모르고 복잡해 … 디테일적으로 손봐야해」
   → 새 버튼·상시 패널·긴 설명 없음. 우연히 또는 NPC 힌트로 찾는다. 찾는 순간만 짧게(반짝 + 도장 2초 + 소리·진동).
   비밀 8개: 숨은 물건 3(극장 뒤 필름 · 섬 끝 바위 뒤 병 · 하늘의 눈알 행성) · 행동 3(밤 분수 10초 · 거울 앞 표현 · 섬 한 바퀴) · 채팅 암호 2(CODES).
   보상: 게임 안 코인(DP.give)·칭호·내 이름표 색만. 같은 비밀은 한 번만. 기록: localStorage dwk_secrets + DP.s.secrets(로그인 주민은 DP 저장 흐름으로 서버 백업).
   성능: 재질·파티클은 install 때 한 번 만들고 재사용 · 그림자 투사 끔 · 매 프레임 할당 없음 · 검사는 0.2초마다 · 끝에 EXT.warm().
   연결(주 작업자): window.__secrets.open() = 목록 시트 · .hint() = 아직 못 찾은 비밀 힌트 하나(NPC 대사용) · .hints() = 전부. */

// 영상·캐러셀에 숨길 채팅 암호(띄어쓰기·대소문자 무시). 바꾸려면 여기 한 곳만.
export const CODES = { code1: '알고싶지않아', code2: '일년버텨' };

// 비밀 표 — 이름·힌트·보상은 여기 한 곳에서 고친다
export const SECRETS = [
  { id: 'film', kind: '물건', name: '극장 뒤 필름 조각', hint: '극장 화면은 앞만 보여 줘. 뒤는 아무도 안 봐', coins: 30 },
  { id: 'bottle', kind: '물건', name: '바위 뒤 쪽지 병', hint: '아케이드와 전광판 사이, 섬 끝 바위가 뭘 감췄어', coins: 30 },
  { id: 'eye', kind: '물건', name: '하늘의 눈알 행성', hint: '하늘을 한 바퀴 둘러봐. 누가 너를 보고 있어', coins: 40, title: '하늘 관찰자' },
  { id: 'night', kind: '행동', name: '밤의 분수', hint: '밤에 분수 곁에서 열을 셀 동안 가만히', coins: 40, tag: 'night' },
  { id: 'mirror', kind: '행동', name: '거울 속 나', hint: '거울 앞에서 표현하면 거울도 대답할까', coins: 30, title: '거울 속 나' },
  { id: 'loop', kind: '행동', name: '섬 한 바퀴', hint: '광장 가운데를 밟지 말고 섬을 한 바퀴', coins: 40 },
  { id: 'code1', kind: '암호', name: '첫 번째 암호', hint: '영상 속 어딘가 적힌 말을 채팅에 쳐 봐', coins: 50 },
  { id: 'code2', kind: '암호', name: '두 번째 암호', hint: '캐러셀 마지막 장, 아주 작은 글씨', coins: 50 },
];
const ALL = { coins: 100, title: '비밀 수집가', tag: 'gold' }; // 8개 다 찾으면
export const HINTS = SECRETS.map(s => s.hint);

export function install(EXT) {
  const { THREE, DC, scene, world, camera, player, polar, el, COL } = EXT;
  const DP = EXT.DP || window.DP;
  const BY = Object.fromEntries(SECRETS.map(s => [s.id, s]));
  const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  const CODE_OF = Object.fromEntries(Object.entries(CODES).map(([id, w]) => [norm(w), id]));

  // ── 기록: 이 기기(dwk_secrets) + DP 저장(로그인 주민은 서버 백업) 둘을 합친다 ──
  const st = Object.assign({ found: {} }, DC.store.get('secrets', {}) || {});
  st.found ||= {};
  const merge = (src) => { let ch = false; for (const [k, v] of Object.entries(src?.found || {})) if (BY[k] && !st.found[k]) { st.found[k] = v; ch = true; } return ch; };
  merge(DP?.s?.secrets);
  const count = () => SECRETS.filter(s => st.found[s.id]).length;
  const persist = () => { DC.store.set('secrets', st); if (DP?.s) DP.s.secrets = { found: { ...st.found } }; };
  DP?.onChange?.((S) => { if (merge(S?.secrets)) { DC.store.set('secrets', st); applyTag(); } }); // 서버에서 기록을 불러오면 합친다

  // ── 옷: 발견 도장(한 개를 만들어 재사용) · 이름표 색 ──
  document.head.append(el('style', {}, `
body.world .sec-stamp{position:fixed;left:50%;top:calc(31% + env(safe-area-inset-top));z-index:55;pointer-events:none;transform:translate(-50%,-50%) rotate(-6deg);opacity:0;
  background:var(--paper);color:var(--ink);border:3px solid var(--ink);border-radius:10px;box-shadow:0 5px 0 var(--ink);padding:10px 16px 9px;text-align:center;white-space:nowrap}
body.world .sec-stamp b{display:block;font:700 22px/1.1 var(--pix);letter-spacing:1px}
body.world .sec-stamp b i{font-style:normal;color:var(--rose)}
body.world .sec-stamp small{display:block;margin-top:5px;font:700 11px/1.2 var(--pix);color:var(--mute)}
body.world .sec-stamp.on{animation:secStamp 2s steps(1,end) both}
body.world .sec-stamp.on.go{animation:secSlam 2s cubic-bezier(.2,1.6,.4,1) both}
@keyframes secSlam{0%{opacity:0;transform:translate(-50%,-50%) rotate(-14deg) scale(1.9)}12%{opacity:1;transform:translate(-50%,-50%) rotate(-6deg) scale(.94)}20%{transform:translate(-50%,-50%) rotate(-6deg) scale(1)}86%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(-6deg) scale(1)}}
body.world .tag.me.sec-night .nm{background:var(--sky)}
body.world .tag.me.sec-gold .nm{background:var(--paper);box-shadow:0 0 0 2px var(--ink),0 0 0 4px var(--sun),0 0 0 6px var(--ink)}
@media (prefers-reduced-motion:reduce){body.world .sec-stamp.on.go{animation:secFade 2s both}@keyframes secFade{0%,90%{opacity:1}100%{opacity:0}}}`));
  const stamp = el('div', { class: 'sec-stamp', role: 'status', 'aria-live': 'polite' }, el('b', {}), el('small', {})); document.body.append(stamp);
  let stampT = 0;
  function showStamp(s, got) {
    const n = count(); stamp.firstChild.replaceChildren('비밀 발견 ', el('i', {}, `${n}/${SECRETS.length}`));
    stamp.lastChild.textContent = `${s.name} · +${got} 코인${s.title ? ` · 칭호 「${s.title}」` : ''}${n === SECRETS.length ? ` · 전부 찾음! 칭호 「${ALL.title}」` : ''}`;
    stamp.className = 'sec-stamp'; void stamp.offsetWidth; stamp.className = 'sec-stamp on go';
    clearTimeout(stampT); stampT = setTimeout(() => { stamp.className = 'sec-stamp'; }, 2100);
  }
  function applyTag() {
    const t = player.tag?.el; if (!t) return;
    t.classList.toggle('sec-gold', count() === SECRETS.length); t.classList.toggle('sec-night', count() < SECRETS.length && !!st.found.night);
  }
  EXT.onSpawn(applyTag);

  // ── 반짝(미리 만든 점 묶음 하나를 숨겨 두고 재사용 · 별 배경과 같은 셰이더) ──
  const NP = 28, bPos = new Float32Array(NP * 3), bVel = new Float32Array(NP * 3), bCol = new Float32Array(NP * 3);
  const PAL = [[1, 0.81, 0.23], [0.5, 0.85, 1], [1, 0.44, 0.57], [1, 0.96, 0.86]];
  for (let i = 0; i < NP; i++) bCol.set(PAL[i % PAL.length], i * 3);
  const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
  const bMat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
  const burstPts = new THREE.Points(bGeo, bMat); burstPts.visible = false; burstPts.frustumCulled = false; scene.add(burstPts);
  let burstT = -1;
  function burst(x, y, z) {
    burstPts.position.set(x, y, z);
    for (let i = 0; i < NP; i++) { const a = i / NP * 6.283, up = 1.5 + (i % 5) * 0.6, sp = 1.4 + (i % 3) * 0.7; bPos[i * 3] = bPos[i * 3 + 1] = bPos[i * 3 + 2] = 0; bVel[i * 3] = Math.cos(a) * sp; bVel[i * 3 + 1] = up; bVel[i * 3 + 2] = Math.sin(a) * sp; }
    bGeo.attributes.position.needsUpdate = true; bMat.opacity = 1; burstPts.visible = true; burstT = 0;
  }

  // ── 숨은 물건(4번 그리기 · 그림자 투사 끔 · 재질은 기존 셰이더와 같은 종류) ──
  const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = false; world.add(o); return o; };
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  // ① 극장 화면 뒤(화면이 가리는 각도·충돌 원 밖) — 땅에 떨어진 필름 한 토막
  const [fx, fz] = polar(14.5, -2.12); // 극장 화면 바로 뒤 땅(화면 아래 틈으로 덜 보이게 충분히 뒤로)
  const filmTex = tex(128, 48, (c, w, h) => { c.fillStyle = '#1f1a2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff4dc'; for (let x = 6; x < w; x += 16) { c.fillRect(x, 4, 8, 6); c.fillRect(x, h - 10, 8, 6); } ['#ffcf3a', '#7fd8ff', '#ff6f91'].forEach((col, i) => { c.fillStyle = col; c.fillRect(8 + i * 40, 14, 32, 20); }); });
  const film = mk(new THREE.PlaneGeometry(0.9, 0.34).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: filmTex }), fx, 0.03, fz); film.rotation.y = 0.7;
  // ② 섬 끝 바위 뒤(아케이드와 전광판 사이 나무 옆) — 쪽지 든 병
  const [rx, rz] = polar(13.75, 2.34), [bx, bz] = polar(14.15, 2.385); // 병은 바위 옆으로 살짝 삐져나옴(바위 하나에 완전히 가려지면 못 찾는다)
  const rock = mk(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: 0x6b5a7a, roughness: 0.85, flatShading: true }), rx, 0.3, rz); rock.scale.set(1, 0.75, 1.1);
  COL.push({ x: rx, z: rz, r: 0.38 });
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0x9fe6c8, roughness: 0.3, emissive: 0x2a8f6a, emissiveIntensity: 0.4 });
  const bottle = mk(new THREE.CylinderGeometry(0.07, 0.11, 0.42, 10), bottleMat, bx, 0.14, bz); bottle.rotation.z = 1.25; bottle.rotation.y = 0.4;
  // ③ 하늘의 눈알 행성 — 카메라를 낮춰 그쪽 하늘을 봐야 보인다(가끔 깜빡)
  const eyeTex = tex(128, 128, (c) => { c.fillStyle = '#fff4dc'; c.strokeStyle = '#1f1a2e'; c.lineWidth = 7; c.beginPath(); c.arc(64, 64, 56, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = '#ff6f91'; c.beginPath(); c.arc(70, 60, 24, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = '#1f1a2e'; c.beginPath(); c.arc(72, 58, 11, 0, 6.283); c.fill(); c.fillStyle = '#fff'; c.fillRect(64, 48, 7, 7); });
  const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTex, transparent: true, depthWrite: false }));
  { const [ex, ez] = polar(60, 2.55); eye.position.set(ex, 13, ez); eye.scale.set(5, 5, 1); scene.add(eye); }
  const OBJ = [ // 화면에서 누를 물건: 가까이 가야 줍는다(멀면 그쪽으로 걸어감) · 눈알은 하늘이라 바로
    { id: 'film', o: film, y: 0.1, reach: 2.4, px: 40 },
    { id: 'bottle', o: bottle, y: 0.2, reach: 2.4, px: 40 },
    { id: 'eye', o: eye, y: 0, reach: 0, px: 46 },
  ];
  for (const it of OBJ) if (st.found[it.id] && it.id !== 'eye') it.o.visible = false;

  // ── 찾기 ──
  function unlock(id) {
    const s = BY[id]; if (!s || st.found[id]) return false;
    st.found[id] = DC.today ? DC.today() : new Date().toISOString().slice(0, 10);
    let got = s.coins; if (count() === SECRETS.length) got += ALL.coins;
    persist(); DP?.give?.(got); // give 가 DP 저장(로그인 주민은 서버 백업)까지 한다
    showStamp(s, got); DC.sfx('unlock'); setTimeout(() => DC.sfx('win'), 180); DC.buzz([20, 40, 20, 40, 60]);
    applyTag(); return true;
  }
  function tryCode(raw) {
    const id = CODE_OF[norm(raw)]; if (!id) return { ok: false };
    if (st.found[id]) { DC.toast('이미 찾은 암호야'); return { ok: true, id, again: true }; }
    const p = player.root.position; burst(p.x, 1.6, p.z); unlock(id); return { ok: true, id };
  }
  // 채팅 암호: 말하기 칸 제출을 문서 단계에서 먼저 본다(world.js 의 say 보다 먼저) → 암호면 방송하지 않고 여기서 끝낸다
  document.addEventListener('submit', (e) => {
    if (e.target?.id !== 'sayForm') return; const i = document.getElementById('say'); if (!i || !CODE_OF[norm(i.value)]) return;
    e.preventDefault(); e.stopImmediatePropagation(); const v = i.value; i.value = ''; i.blur(); tryCode(v);
  }, true);

  // 누르기: 물건의 화면 위치를 직접 잰다(가벼움 · 레이캐스트 없음)
  const sp = new THREE.Vector3(), wp = new THREE.Vector3(), dir = new THREE.Vector3(), ray = new THREE.Raycaster();
  // 가려졌나: 카메라와 물건 사이에 시설 건물(극장 화면 등)이 있으면 못 누른다 — 건물 너머로 「투시」해서 줍지 않게(누를 때만 잰다 · 나무·꽃·풀은 막지 않음)
  const blocked = (o) => { dir.copy(wp).sub(camera.position); const d = dir.length(); ray.set(camera.position, dir.normalize()); ray.far = d - 0.25; return ray.intersectObjects(world.children, true).some(h => h.object.userData.fac && h.object.visible); };
  let tapWhy = '';
  const tap = (e) => {
    for (const it of OBJ) {
      if (st.found[it.id] || !it.o.visible) continue;
      it.o.getWorldPosition(wp); wp.y += it.y; sp.copy(wp).project(camera); if (sp.z > 1 || sp.z < -1) continue;
      const x = (sp.x * 0.5 + 0.5) * innerWidth, y = (-sp.y * 0.5 + 0.5) * innerHeight;
      if (Math.hypot(e.clientX - x, e.clientY - y) > it.px) continue;
      if (it.reach && blocked(it.o)) { tapWhy = it.id + ':가려짐'; continue; }
      const p = player.root.position;
      if (it.reach && Math.hypot(p.x - wp.x, p.z - wp.z) > it.reach) { EXT.walkTo([wp.x * 0.97, wp.z * 0.97]); return true; }
      burst(wp.x, wp.y + 0.3, wp.z); if (it.id !== 'eye') it.o.visible = false; unlock(it.id); return true;
    }
    return false;
  };
  EXT.onTap(tap);

  // ── 행동 비밀(0.2초마다 검사) ──
  const [mx, mz] = EXT.facOf?.mirror?.at || polar(11.2, 1.3); const [gx, gz] = polar(12.6, 1.3);
  const kstH = () => { const d = new Date(Date.now() + 9 * 3600e3); return d.getUTCHours() + d.getUTCMinutes() / 60; };
  const isNight = () => { const s = window.__life?.sky?.(); if (s && typeof s.star === 'number') return s.star > 0.6; const h = kstH(); return h >= 20.5 || h < 5; };
  let chk = 0, still = 0, lastOnce = player.onceUntil || 0, loopA = null, loopSum = 0, blink = 0;
  EXT.onTick((dt, t) => {
    // 반짝 움직이기(보일 때만)
    if (burstT >= 0) {
      burstT += dt; const k = burstT / 0.9;
      for (let i = 0; i < NP; i++) { bVel[i * 3 + 1] -= 5 * dt; bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt; bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt; }
      bGeo.attributes.position.needsUpdate = true; bMat.opacity = Math.max(0, 1 - k);
      if (k >= 1) { burstPts.visible = false; burstT = -1; }
    }
    // 병이 은은히 빛난다 · 눈알이 가끔 깜빡
    if (bottle.visible) bottleMat.emissiveIntensity = 0.3 + Math.max(0, Math.sin(t * 2.2)) * 0.5;
    blink -= dt; if (blink < 0.18) eye.scale.y = 5 * Math.max(0.08, Math.abs(blink - 0.09) / 0.09); if (blink <= 0) { blink = 3 + (t * 7.3 % 3); eye.scale.y = 5; }
    chk += dt; if (chk < 0.2) return; const step = chk; chk = 0;
    if (!EXT.spawned()) return; const p = player.root.position;
    // ④ 밤에 분수 곁에서 10초 가만히
    if (!st.found.night) {
      if (Math.hypot(p.x, p.z) < 3.3 && !player.moving && isNight()) { still += step; if (still >= 10) { burst(0, 1.2, 0); unlock('night'); } } else still = 0;
    }
    // ⑤ 거울 앞에서 표현(표현이 시작되면 onceUntil 이 새로 잡힌다)
    const ou = player.onceUntil || 0;
    if (ou !== lastOnce) { const started = ou > lastOnce; lastOnce = ou; if (started && !st.found.mirror && Math.hypot(p.x - mx, p.z - mz) < 2.2) { burst(gx, 1.6, gz); unlock('mirror'); } }
    // ⑥ 가운데(반지름 5.5)를 밟지 않고 섬을 한 바퀴(순간 이동은 무효)
    if (!st.found.loop) {
      const r = Math.hypot(p.x, p.z), a = Math.atan2(p.x, p.z);
      if (r < 5.5) { loopA = null; loopSum = 0; }
      else if (loopA === null) loopA = a;
      else { let d = a - loopA; d = Math.atan2(Math.sin(d), Math.cos(d)); loopA = a; if (Math.abs(d) > 1) loopSum = 0; else loopSum += d; if (Math.abs(loopSum) >= 6.283) { burst(p.x, 1.4, p.z); unlock('loop'); } }
    }
  });

  // ── 목록 시트(버튼 연결은 주 작업자) ──
  function open() {
    const n = count(), titles = SECRETS.filter(s => st.found[s.id] && s.title).map(s => s.title); if (n === SECRETS.length) titles.push(ALL.title);
    const rows = SECRETS.map((s, i) => st.found[s.id]
      ? el('li', {}, el('span', { class: 'r' }, String(i + 1)), el('span', { class: 'n' }, el('b', {}, s.name), el('small', {}, `+${s.coins} 코인${s.title ? ` · 칭호 「${s.title}」` : ''}${s.tag === 'night' ? ' · 이름표 밤물빛' : ''}`)), el('span', { class: 'v' }, '찾음'))
      : el('li', {}, el('span', { class: 'r' }, '?'), el('span', { class: 'n' }, el('b', {}, '???'), el('small', {}, s.hint))));
    EXT.sheet('숨겨진 비밀', el('p', { class: 'lead' }, `${n} / ${SECRETS.length} 찾음`), el('ul', { class: 'list' }, rows),
      el('p', { class: 'note' }, `다 찾으면 +${ALL.coins} 코인 · 금테 이름표 · 칭호 「${ALL.title}」${titles.length ? ` · 내 칭호: ${titles.join(', ')}` : ''}`));
  }
  const unfound = () => SECRETS.filter(s => !st.found[s.id]);
  window.__secrets = {
    open, tryCode, SECRETS, CODES, get count() { return count(); }, get found() { return { ...st.found }; },
    hints: () => unfound().map(s => s.hint), hint() { const u = unfound(); return u.length ? u[Math.floor(Math.random() * u.length)].hint : null; },
    titles: () => SECRETS.filter(s => st.found[s.id] && s.title).map(s => s.title).concat(count() === SECRETS.length ? [ALL.title] : []),
    // 시험용(화면엔 안 보임)
    _unlock: unlock, _tap: (x, y) => { tapWhy = ''; return [tap({ clientX: x, clientY: y }), tapWhy]; }, _objs: () => [film, rock, bottle, eye, burstPts], _pos: { film: [fx, fz], bottle: [bx, bz], rock: [rx, rz], mirror: [mx, mz], eye: () => eye.position.toArray() },
    _state: () => ({ still: +still.toFixed(1), loopSum: +loopSum.toFixed(2), night: isNight() }),
  };
  EXT.warm?.();
}
