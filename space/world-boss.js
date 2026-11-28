/* world-boss.js — 우주 광장 「주인장 채찍질」(비공개 이벤트)
   대표 원문(2026-11-22): 「채널 주인장 채찍질하기 > 이거 카피라이팅을 디벨롭해서 게임안에 주인장 채찍질을 하는 게임을 내부에 넣는거야.
     주인장은 에너지드링크와 소주를 쌓아놓고있고, 노트북을 들고 도망다니는거지 / 접속하는 사람들이 모두 주인장 1명을 쫒아 다니고,
     채찍질을 하면 보상을 주는거지, 그리고 채찍질을 하면 피드백권이나 더 참여시키고 팔로워들의 데이터를 모으고 그게 실제로 영상에 반영되도록」
     「이 게임은 … 현재 비공개 게임이다 / 댓글달면 게임할 수 있는 링크주겠다」
   근거: reports/돈워너노우_게임_20261119/주인장_채찍질/기획.md (R1 레퍼런스 · R2 댓글 DM 퍼널 · R3 카피)

   규칙(한 판 3분, 모든 접속자가 같은 시계로 같은 판을 본다 — 서버 없이 시각으로 맞춘다):
     0:00~0:15  아지트에서 소주 한 잔  → 가만히 있음 · 잡으면 「현장 검거」 코인 2배
     0:15~2:30  노트북 들고 도주      → 에너지드링크 마시면 잠깐 질주 · 우리보다 살짝 느리다(쫓으면 잡힌다)
     2:30~3:00  아지트에서 마감 작업   → 방해 금지, 이번 판 결산
   채찍(가까이 가면 큰 버튼 · F키) = 코인 1 · 뒤에서 치면 「기습」 2 · 내 채찍 10번마다 피드백권 1장(하루 3장)
   피드백권 = 「다음 편에 넣을 한 줄」 → 코드가 붙은 댓글 문구를 복사해 최신 편 인스타 댓글로 보낸다(주인장이 그 코드부터 읽는다).
   반영된 피드백은 data.js world.boss.applied 에 넣으면 아지트 게시판에 이름과 함께 걸린다.
   비공개: data.js world.boss.invite 의 초대말로 들어온 기기만(?boss=초대말 · 이 기기에 기억). 초대 없는 사람에겐 아지트에서 자는 주인장 + 초대받는 법.
   모든 숫자는 게임 안 숫자다. 판마다 채찍 수는 이 기기가 본 것(내 것 + 광장 신호로 받은 것)만 센다. */

const CYCLE = 180, T_BAR = 15, T_RUN = 150; // 한 판(초) · 소주 끝 · 도주 끝
const RUN_V = 2.9, SPRINT_V = 4.6, SPRINT_T = 2.6; // 우리 걸음(3.4)보다 느리게, 질주는 더 빠르게
const REACH = 2.3, COOLDOWN = 380, TICKET_EVERY = 10, TICKET_DAY = 3;
const LINES = {
  hit: ['아 쓰고 있다고!', '한 컷만 더 하고!', '렌더 돌리는 중이야!', '알았어 알았어 편집한다', '그 댓글 봤어, 반영할게', '피드백은 고맙다…', '자막만 달면 돼!', '노트북은 치지 마!'],
  sneak: ['뒤에서?!', '기습은 반칙이지!', '언제 왔어?!'],
  bar: ['소주 딱 한 잔만…', '이거 마시고 할게', '오늘 마감 아니잖아(맞음)'],
  sprint: ['에너지 충전!', '못 잡지롱', '마감은 내일의 내가…'],
  run: ['노트북 배터리 간당간당', '아이디어 떠오르는 중이야!', '산책도 작업이야', '편집 프로그램 켜 놨어 진짜로'],
  work: ['작업 중… 방해 금지', '타닥타닥', '이번 판 채찍 덕분에 진도 나갔다'],
  sleep: ['쿨… 초대장 없으면 못 깨워', '쿨… 인스타 댓글로 초대받아'],
};

export function install(EXT) {
  const { THREE, DC, scene, player, polar, el, COL, V3 } = EXT;
  const DP = EXT.DP || window.DP;
  const D = window.DWK || {};
  const CFG = Object.assign({ invite: ['일해'], applied: [], keyword: '일해', handle: '@dontwannaknow.kr' }, D.world?.boss || {});
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

  // ── 초대(비공개) ──
  const qInv = EXT.Q?.get?.('boss');
  if (qInv && CFG.invite.map(norm).includes(norm(qInv))) DC.store.set('boss_inv', true);
  const invited = () => !!DC.store.get('boss_inv', false);

  // ── 기록(이 기기) ──
  const day = DC.today();
  const st = Object.assign({ day, mine: 0, total: 0, tickets: 0, givenToday: 0, used: [] }, DC.store.get('boss', {}) || {});
  if (st.day !== day) { st.day = day; st.givenToday = 0; }
  const save = () => DC.store.set('boss', st);

  // ── 아지트(에너지드링크 캔 탑 + 소주 상자 + 접이식 책상) ── 상표·글자 없음(실제 제품과 닮지 않게 색만)
  const A_DEN = 0, R_DEN = 12.4; // 들어오면 바로 보이는 정면 바깥쪽(게시판 0.72·타운 -0.72·가로등 ±0.39 사이 빈 땅)
  const [dx, dz] = polar(R_DEN, A_DEN);
  const den = new THREE.Group(); den.position.set(dx, 0, dz); den.rotation.y = Math.atan2(-dx, -dz); scene.add(den);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
  const canG = new THREE.CylinderGeometry(0.11, 0.11, 0.3, 14), bandG = new THREE.CylinderGeometry(0.112, 0.112, 0.08, 14);
  const canM = [M(0x2b6cff, { metalness: 0.4 }), M(0x9dff3a, { metalness: 0.3 }), M(0xff3d7f, { metalness: 0.35 })], bandM = M(0xf4f4f4);
  let row = 0; for (const n of [5, 4, 3, 2, 1]) { for (let i = 0; i < n; i++) { const c = new THREE.Mesh(canG, canM[(i + row) % 3]); c.position.set(-1.35 + (i - (n - 1) / 2) * 0.235, 0.15 + row * 0.305, -0.2); den.add(c); const b = new THREE.Mesh(bandG, bandM); b.position.copy(c.position); den.add(b); } row++; }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.62), M(0x2f9e5a)); crate.position.set(1.25, 0.21, -0.15); den.add(crate);
  const botM = new THREE.MeshStandardMaterial({ color: 0x3fbf6f, roughness: 0.15, transparent: true, opacity: 0.72 }), botG = new THREE.CylinderGeometry(0.075, 0.085, 0.36, 10), neckG = new THREE.CylinderGeometry(0.03, 0.06, 0.16, 10);
  for (let i = 0; i < 8; i++) { const x = 0.92 + (i % 4) * 0.21, z = -0.3 + ((i / 4) | 0) * 0.3; const b = new THREE.Mesh(botG, botM); b.position.set(x, 0.6, z); den.add(b); const k = new THREE.Mesh(neckG, botM); k.position.set(x, 0.86, z); den.add(k); }
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.6), M(0xd9b38c)); desk.position.set(0, 0.62, 0.15); den.add(desk);
  for (const [lx, lz] of [[-0.5, -0.1], [0.5, -0.1], [-0.5, 0.4], [0.5, 0.4]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), M(0x6b5340)); l.position.set(lx, 0.3, lz); den.add(l); }
  den.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  COL.push({ x: dx, z: dz, r: 1.25 }); // 아지트는 통과 못 함
  const [fx, fz] = polar(R_DEN - 1.9, A_DEN); // 아지트 앞(주인장이 서는 곳)
  const denFront = new V3(fx, 0, fz);
  const sign = EXT.makeTag('fac', '주인장 아지트'); sign.pos.set(dx, 2.3, dz);

  // ── 노트북(주인장이 가슴 앞에 든다) ──
  function makeLaptop() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.24), M(0x2a2a33)); g.add(base);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.015), M(0x2a2a33)); lid.position.set(0, 0.11, -0.12); lid.rotation.x = -0.25; g.add(lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), new THREE.MeshBasicMaterial({ color: 0x8fe3ff })); scr.position.set(0, 0.11, -0.11); scr.rotation.x = -0.25; g.add(scr);
    return g;
  }

  // ── 주인장 ──
  let boss = null;
  (async () => {
    const ch = await EXT.K.makeCharacter(EXT.K.normalizeChar({ ...EXT.K.defaultChar(), b: 2, skin: 1, hair: 1, c1: 3, c2: 0, hat: 0, pose: 0 })); if (!ch) return;
    const root = new THREE.Group(); ch.root.scale.setScalar(EXT.CH_S); root.add(ch.root);
    const lap = makeLaptop(); lap.position.set(0, 0.78, 0.26); lap.rotation.y = Math.PI; root.add(lap);
    root.position.copy(denFront); scene.add(root);
    const tag = EXT.makeTag('npc', '주인장'); const nm = tag.el.querySelector('.nm'); nm.textContent = ''; nm.append(el('i', {}, '도망 중'), '주인장'); tag.obj = root; tag.h = 1.55;
    boss = { ch, root, tag, nm, lap, anim: '', hitUntil: 0, bubAt: 0, lastPhase: '' }; // 셰이더 예열은 world.js 가 모듈 뒤 2.5초·7초에 한다(동시에 부르면 compileAsync 가 서로 꼬인다)
  })().catch(e => console.warn('주인장 못 만듦', e));

  // ── 판 경로: 판 번호로 씨앗을 정해 모든 기기가 같은 길을 만든다 ──
  const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const cache = new Map();
  function plan(round) {
    if (cache.has(round)) return cache.get(round);
    const r = rng(round * 7919 + 13); const pts = [denFront.clone()]; let a = A_DEN;
    for (let i = 0; i < 16; i++) { a += (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.8); const rad = r() < 0.75 ? 3.4 + r() * 4.6 : 8 + r() * 3.4; /* 대부분 안쪽 잔디·길(시설은 바깥 링에 몰려 있다) */ const [x, z] = polar(rad, a); pts.push(new V3(x, 0, z)); }
    pts.push(denFront.clone());
    const seg = []; let L = 0; for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); seg.push({ a: pts[i], b: pts[i + 1], s: L, l }); L += l; }
    const sprints = [0.18, 0.47, 0.76].map(k => T_BAR + k * (T_RUN - T_BAR) + r() * 6); // 에너지드링크 3번
    const p = { seg, L, sprints }; cache.set(round, p); if (cache.size > 4) cache.delete(cache.keys().next().value); return p;
  }
  const distAt = (p, t) => { let d = (t - T_BAR) * RUN_V; for (const s of p.sprints) d += Math.max(0, Math.min(t, s + SPRINT_T) - s) * (SPRINT_V - RUN_V); return d; };
  const tmp = new V3();
  function bossState(nowS) {
    const round = Math.floor(nowS / CYCLE), t = nowS - round * CYCLE;
    if (t < T_BAR) return { round, t, phase: 'bar', pos: denFront };
    if (t >= T_RUN) return { round, t, phase: 'work', pos: denFront };
    const p = plan(round); let d = distAt(p, t) % (p.L * 2); if (d > p.L) d = p.L * 2 - d; // 끝까지 가면 되돌아 뛴다
    const s = p.seg.find(q => d <= q.s + q.l) || p.seg[p.seg.length - 1]; tmp.copy(s.a).lerp(s.b, Math.min(1, (d - s.s) / (s.l || 1)));
    for (const c of COL) { if (c.r > 3) continue; const ox = tmp.x - c.x, oz = tmp.z - c.z, dd = Math.hypot(ox, oz), rr = c.r + 0.35; if (dd < rr && dd > 1e-4) { tmp.x = c.x + ox / dd * rr; tmp.z = c.z + oz / dd * rr; } } // 시설은 비켜 간다(모든 기기 같은 계산)
    const rr = Math.hypot(tmp.x, tmp.z); if (rr > 14.2) { tmp.x *= 14.2 / rr; tmp.z *= 14.2 / rr; }
    const sprinting = p.sprints.some(s => t >= s && t < s + SPRINT_T);
    return { round, t, phase: 'run', pos: tmp, sprinting };
  }
  const nowS = () => Date.now() / 1000;

  // ── 화면 장치 ──
  const css = el('style', {}, `
.bs-whip{position:fixed;right:16px;bottom:calc(150px + env(safe-area-inset-bottom));z-index:7;width:84px;height:84px;border-radius:50%;border:3px solid var(--ink,#1f1a2e);background:var(--sun,#ffcf3a);box-shadow:0 5px 0 var(--ink,#1f1a2e);font:700 17px/1.05 var(--pix,system-ui);color:var(--ink,#1f1a2e);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.bs-whip small{font:400 11px/1 var(--dot,system-ui)}
.bs-whip:active{transform:translateY(4px);box-shadow:0 1px 0 var(--ink,#1f1a2e)}
.bs-whip.ask{background:var(--paper,#fff4dc);font-size:13px}
.bs-hud{position:fixed;left:12px;top:calc(136px + env(safe-area-inset-top));z-index:5;width:min(300px,calc(100vw - 96px));box-sizing:border-box;padding:7px 12px 8px;background:var(--paper,#fff4dc);border:2.5px solid var(--ink,#1f1a2e);border-radius:10px;box-shadow:0 3px 0 var(--ink,#1f1a2e);font:400 12px/1.3 var(--dot,system-ui);color:var(--ink,#1f1a2e);text-align:center;pointer-events:auto}
.bs-hud b{font:700 13px/1.2 var(--pix,system-ui)}
.bs-hud .bs-l1,.bs-hud .bs-l2{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.45}
.bs-hud .bs-l2{font-weight:700}
.bs-bar{height:8px;margin-top:5px;border:2px solid var(--ink,#1f1a2e);border-radius:5px;background:#fff;overflow:hidden}
.bs-bar i{display:block;height:100%;width:0;background:#ff5c7a;transition:width .25s}
.bs-pop{position:fixed;z-index:8;pointer-events:none;font:700 22px/1 var(--pix,system-ui);color:#fff;-webkit-text-stroke:1px #1f1a2e;text-shadow:0 2px 0 #1f1a2e;animation:bsPop .7s ease-out forwards}
@keyframes bsPop{0%{opacity:0;transform:translate(-50%,0) scale(.6)}20%{opacity:1;transform:translate(-50%,-8px) scale(1.15)}100%{opacity:0;transform:translate(-50%,-46px) scale(1)}}
.bs-fb textarea{width:100%;min-height:70px;padding:10px;border:2.5px solid var(--ink,#1f1a2e);border-radius:10px;font:400 15px/1.4 var(--dot,system-ui);background:#fff;box-sizing:border-box}
.bs-fb .copy{margin:10px 0 0;padding:10px;border:2px dashed var(--ink,#1f1a2e);border-radius:10px;font:400 14px/1.4 var(--dot,system-ui);word-break:keep-all;background:#fff}
.bs-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.bs-row>*{flex:1 1 140px}
.bs-rules li{margin:4px 0}
body.kb-open .bs-whip,body.ox-on .bs-hud{display:none}
@media (orientation:landscape) and (max-height:560px){.bs-whip{bottom:calc(84px + env(safe-area-inset-bottom));right:calc(84px + env(safe-area-inset-right))}.bs-hud{top:calc(140px + env(safe-area-inset-top));width:min(280px,36vw)}}
@media (prefers-reduced-motion:reduce){.bs-pop{animation-duration:.01s}}`);
  document.head.append(css);
  const btn = el('button', { class: 'bs-whip', type: 'button', hidden: true, 'aria-label': '주인장 채찍질' }, el('span', {}, '채찍!'), el('small', {}, 'F'));
  const bar = el('i');
  const hudTxt = el('span');
  const hud = el('div', { class: 'bs-hud', hidden: true, role: 'button', tabindex: '0', 'aria-label': '주인장 채찍질 규칙과 피드백권' }, el('b', {}, '주인장 채찍질'), el('br'), hudTxt, el('div', { class: 'bs-bar' }, bar));
  document.body.append(btn, hud);
  const pop = (text, x, y) => { const p = el('div', { class: 'bs-pop', style: `left:${x}px;top:${y}px` }, text); document.body.append(p); setTimeout(() => p.remove(), 750); };

  // ── 채찍 그리기(손 → 주인장, 0.25초 휙) ──
  const whipMat = new THREE.LineBasicMaterial({ color: 0x5a3a22, transparent: true, opacity: 0 });
  const whipGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
  const whipLine = new THREE.Line(whipGeo, whipMat); whipLine.frustumCulled = false; scene.add(whipLine);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const spark = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.32, 18), sparkMat); scene.add(spark);
  let whipT = -1; const wA = new V3(), wB = new V3();
  function drawWhip(from, to) { wA.copy(from).setY(1.05); wB.copy(to).setY(1.0); whipT = 0; spark.position.copy(wB); }

  // ── 판 시작마다 그 판 기록 ──
  let roundSeen = -1, roundHits = 0, comboN = 0, comboAt = 0, lastWhip = 0;
  const goal = () => 30 * Math.max(1, Math.min(6, (EXT.room()?.count?.() || 1)));

  function whip() {
    if (!boss || !invited()) return;
    const now = performance.now(); if (now - lastWhip < COOLDOWN) return;
    const s = bossState(nowS()); if (s.phase === 'work') { EXT.bubble(boss.tag, pick(LINES.work)); return; }
    const pp = player.root.position, bp = boss.root.position, dist = Math.hypot(pp.x - bp.x, pp.z - bp.z); if (dist > REACH) return;
    lastWhip = now; EXT.playerAnim('interact-right');
    // 뒤에서 쳤나: 주인장이 보는 방향과 나를 향한 방향이 반대면 기습
    const fwx = Math.sin(boss.root.rotation.y), fwz = Math.cos(boss.root.rotation.y); const sneak = ((pp.x - bp.x) * fwx + (pp.z - bp.z) * fwz) / (dist || 1) < -0.35;
    const caught = s.phase === 'bar';
    comboN = now - comboAt < 3000 ? comboN + 1 : 1; comboAt = now;
    const coins = (sneak ? 2 : 1) * (caught ? 2 : 1);
    DP?.give?.(coins); st.mine++; st.total++; roundHits++; save();
    let ticket = false; if (st.mine % TICKET_EVERY === 0 && st.givenToday < TICKET_DAY) { st.tickets++; st.givenToday++; save(); ticket = true; }
    drawWhip(pp, bp); react(caught ? '현장 검거?!' : sneak ? pick(LINES.sneak) : pick(LINES.hit));
    DC.sfx(ticket ? 'unlock' : 'tap'); DC.buzz(ticket ? [20, 40, 20] : 18);
    const r = btn.getBoundingClientRect();
    pop(ticket ? '피드백권 +1' : `${caught ? '검거 ' : sneak ? '기습 ' : ''}+${coins}${comboN > 2 ? ` · ${comboN}연속` : ''}`, r.left + r.width / 2, r.top - 40);
    if (ticket) EXT.toast?.('피드백권 1장! 위 「주인장 채찍질」을 눌러 다음 편에 넣을 한 줄을 남겨');
    queueWhip(s.round);
    hudUpdate(true);
  }
  function react(line) {
    if (!boss) return; boss.hitUntil = performance.now() + 450; const d = boss.ch.anim('emote-no', { once: true }); boss.onceUntil = performance.now() + Math.min(600, d * 1000);
    if (line && performance.now() > boss.bubAt - 3500) { EXT.bubble(boss.tag, line); boss.bubAt = performance.now() + 5200; }
  }
  // 채찍 신호는 1초에 한 번만 묶어서 보낸다(2026-11-22 실서버 시험: 무료 한도는 프로젝트 전체 초당 신호 수라, 칠 때마다 보내면 사람이 늘수록 금방 끊긴다)
  let wq = 0, wqR = -1, wqT = 0, wqLast = 0;
  function queueWhip(r) {
    if (r !== wqR) { flushWhip(); wqR = r; } wq++;
    if (!wqT) wqT = setTimeout(flushWhip, Math.max(0, 1000 - (performance.now() - wqLast)));
  }
  function flushWhip() { if (wqT) { clearTimeout(wqT); wqT = 0; } if (wq > 0) { EXT.send('whip', { r: wqR, n: wq }); wqLast = performance.now(); } wq = 0; }
  EXT.onMsg('whip', (data, id) => {
    const s = bossState(nowS()); if (data?.r !== s.round) return; const n = Math.max(1, Math.min(6, data.n | 0 || 1)); roundHits += n; st.total += n; save(); // 1초에 칠 수 있는 최대(쿨다운 0.38초 → 3번)보다 넉넉히만 받는다
    const peer = EXT.peers?.get?.(id); const from = peer?.root?.position; if (from && boss) drawWhip(from, boss.root.position); react(Math.random() < 0.25 ? pick(LINES.hit) : null); hudUpdate();
  });
  // 늦게 들어온 사람도 이번 판 채찍 수를 같이 본다(2026-11-22 동시 접속 시험: 판 중간에 들어온 창이 「이번 판 0」으로 보였다).
  // 들어오면 한 번 묻고(bossAsk), 이미 있던 사람 중 한 명만 답한다 — 답은 0~1.5초 늦춰 보내고, 남이 먼저 같은 값 이상을 답했으면 안 보낸다(신호 수를 아낀다).
  let replyT = 0;
  // 묻는 때: 광장 방이 실제로 연결된 뒤 1.5초(world.js 는 spawned 를 방 연결보다 먼저 켠다 — 그때 보내면 신호가 사라진다 · 11-22 시험에서 발견)
  let askAt = 0, asked = false;
  EXT.onTick(() => {
    if (asked || !EXT.spawned() || !EXT.room() || !invited()) return;
    const now = performance.now(); if (!askAt) { askAt = now + 1500; return; } if (now < askAt) return;
    asked = true; const s = bossState(nowS()); if (s.phase !== 'work') EXT.send('bossAsk', { r: s.round });
  });
  EXT.onMsg('bossAsk', (data) => {
    if (data?.r !== roundSeen || bossState(nowS()).round !== roundSeen || roundHits <= 0 || replyT) return; // roundHits 는 roundSeen 판의 수다
    replyT = setTimeout(() => { replyT = 0; if (roundSeen === data.r && bossState(nowS()).round === roundSeen && roundHits > 0) EXT.send('bossCnt', { r: roundSeen, n: roundHits }); }, Math.random() * 1500);
  });
  EXT.onMsg('bossCnt', (data) => {
    if (data?.r !== roundSeen || bossState(nowS()).round !== roundSeen) return;
    const n = Math.max(0, Math.min(100000, data.n | 0)); // 남이 보낸 숫자는 믿지 않는 범위로 자른다
    if (replyT && n >= roundHits) { clearTimeout(replyT); replyT = 0; }
    if (n > roundHits) { roundHits = n; hudUpdate(); }
  });
  btn.onclick = () => (invited() ? whip() : openInvite());
  addEventListener('keydown', (e) => { if ((e.key === 'f' || e.key === 'F') && !e.target.closest?.('input,textarea')) whip(); });
  hud.onclick = () => openMain();
  hud.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMain(); } };

  function hudUpdate(bump) {
    const s = bossState(nowS()); const left = s.phase === 'bar' ? T_BAR - s.t : s.phase === 'run' ? T_RUN - s.t : CYCLE - s.t;
    const mm = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    const what = s.phase === 'bar' ? `소주 마시는 중 · 지금 잡으면 2배 · ${mm}` : s.phase === 'run' ? `도주 중 · 판 끝까지 ${mm}` : `마감 작업 중 · 다음 판 ${mm}`;
    // 두 줄로 고정: 1줄 = 지금 단계·남은 시간, 2줄 = 이번 판 수·피드백권 (11-22 실측: 한 줄로 이어 쓰면 360px 폰에서 「피드백 / 권」으로 끊겼다)
    hudTxt.replaceChildren(el('span', { class: 'bs-l1' }, what), el('span', { class: 'bs-l2' }, `이번 판 ${roundHits}/${goal()} · 피드백권 ${st.tickets}장`));
    const anchor = [...document.querySelectorAll('.w-guest, .w-stat')].filter(e => !e.classList.contains('hidden') && e.offsetParent).map(e => e.getBoundingClientRect().bottom).sort((a, b) => b - a)[0];
    if (anchor > 0) hud.style.top = `${Math.round(anchor + 8)}px`; // 손님 안내 줄·레벨 판 바로 아래 — 겹치지 않게
    bar.style.width = Math.min(100, roundHits / goal() * 100) + '%';
    if (bump) hud.animate?.([{ transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 160 });
  }

  // ── 시트: 규칙 · 피드백권 · 반영된 피드백 ──
  function latestEp() { const e = (D.episodes || [])[0]; return e?.links?.instagram || D.site?.links?.instagram || 'https://www.instagram.com/dontwannaknow.kr/'; }
  function openMain() {
    const applied = (CFG.applied || []).slice(0, 5);
    EXT.sheet('주인장 채찍질',
      el('p', { class: 'lead' }, '노트북 들고 도망간 주인장을 다 같이 쫓아가서 채찍질해. 맞을수록 일한다.'),
      el('ol', { class: 'bs-rules' },
        el('li', {}, '가까이 가면 노란 「채찍!」 버튼이 떠. 누르면 코인 +1, 뒤에서 치면 +2.'),
        el('li', {}, '판 처음 15초는 아지트에서 소주 마시는 중 — 이때 잡으면 2배.'),
        el('li', {}, '에너지드링크 마시면 잠깐 빨라져. 그래도 쫓으면 잡혀.'),
        el('li', {}, `내 채찍 ${TICKET_EVERY}번마다 피드백권 1장(하루 ${TICKET_DAY}장). 다음 편에 넣을 한 줄을 남길 수 있어.`)),
      el('p', {}, `내 채찍 ${st.mine}번 · 피드백권 ${st.tickets}장`),
      el('div', { class: 'bs-row' },
        el('button', { class: 'btn k sun', type: 'button', onclick: openFeedback, disabled: st.tickets < 1 }, st.tickets < 1 ? `피드백권 모으는 중 (${st.mine % TICKET_EVERY}/${TICKET_EVERY})` : '피드백권 쓰기'),
        el('button', { class: 'btn k', type: 'button', onclick: () => { EXT.closeSheet(); EXT.navTo?.('boss-den'); } }, '아지트로 가기')),
      el('h4', {}, '영상에 반영된 피드백'),
      applied.length ? el('ul', {}, applied.map(a => el('li', {}, `${a.ep ? a.ep + ' · ' : ''}${a.who || '익명'} — ${a.what}`)))
        : el('p', { class: 'muted' }, '아직 없어. 첫 번째로 반영되면 여기에 아이디와 함께 걸린다.'));
  }
  function code() { const k = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 3; i++) s += k[(Math.random() * k.length) | 0]; return s; }
  function openFeedback() {
    if (st.tickets < 1) return openMain();
    const ta = el('textarea', { maxlength: '60', placeholder: '예) 다음 편엔 바다 행성 해 줘 / 주인장 대사 더 웃기게', 'aria-label': '다음 편에 넣을 한 줄' });
    const out = el('p', { class: 'copy', hidden: true });
    const go = el('button', { class: 'btn k sun', type: 'button' }, '피드백권 1장 쓰기');
    go.onclick = async () => {
      const t = ta.value.trim().replace(/\s+/g, ' '); if (t.length < 2) { ta.focus(); return; }
      const c = code(); const line = `[채찍#${c}] ${t}`;
      st.tickets--; st.used.push({ c, t, at: Date.now() }); save();
      out.textContent = line; out.hidden = false; go.disabled = true; ta.disabled = true;
      try { await navigator.clipboard.writeText(line); EXT.toast?.('복사했어. 최신 편 댓글에 붙여 넣어 줘'); } catch (e) { EXT.toast?.('아래 글을 길게 눌러 복사해 줘'); }
      send.hidden = false;
    };
    const send = el('a', { class: 'btn k sun', href: latestEp(), target: '_blank', rel: 'noopener', hidden: true }, '최신 편 댓글 열기 ↗');
    EXT.sheet('피드백권 쓰기', el('div', { class: 'bs-fb' },
      el('p', { class: 'lead' }, '다음 편에 넣을 한 줄. 주인장은 「채찍#」 코드가 붙은 댓글부터 읽는다.'),
      ta, el('div', { class: 'bs-row' }, go, send), out,
      el('p', { class: 'muted' }, '반영되면 아지트 게시판과 영상 끝에 네 아이디가 걸린다. 아이디·글 말고는 아무것도 모으지 않아.')));
  }
  function openInvite() {
    EXT.sheet('비공개 게임', el('p', { class: 'lead' }, '주인장 채찍질은 팔로워 전용 비공개 게임이야.'),
      el('p', {}, `인스타 ${CFG.handle} 팔로우하고, 게시물에 「${CFG.keyword}」 댓글을 남기면 DM으로 초대 링크를 보내 줘.`),
      el('a', { class: 'btn k sun', href: latestEp(), target: '_blank', rel: 'noopener' }, '인스타 게시물 열기 ↗'));
  }
  EXT.addFac?.({ id: 'boss-den', name: '주인장 아지트', icon: 'home', act: '주인장 채찍질', at: [fx, fz], tag: false, open: () => (invited() ? openMain() : openInvite()) });

  // ── 매 프레임 ──
  let chk = 0;
  EXT.onTick((dt) => {
    const now = performance.now();
    if (whipT >= 0) { whipT += dt; const k = whipT / 0.25; const arr = whipGeo.attributes.position.array; for (let i = 0; i < 14; i++) { const u = i / 13; const x = wA.x + (wB.x - wA.x) * u, z = wA.z + (wB.z - wA.z) * u; const y = wA.y + (wB.y - wA.y) * u + Math.sin(u * Math.PI) * (0.9 - k * 0.8) * (1 - u * 0.3); arr.set([x, y, z], i * 3); } whipGeo.attributes.position.needsUpdate = true; whipMat.opacity = Math.max(0, 1 - k); sparkMat.opacity = Math.max(0, 1 - k) * 0.9; spark.scale.setScalar(1 + k * 2); spark.lookAt(EXT.camera.position); if (k >= 1) { whipT = -1; whipMat.opacity = 0; sparkMat.opacity = 0; } }
    if (!boss) return;
    const inv = invited(); const s = inv ? bossState(nowS()) : { phase: 'sleep', pos: denFront, t: 0, round: -1 };
    if (s.round !== roundSeen) { if (roundSeen >= 0 && roundHits >= goal()) EXT.toast?.('지난 판 목표 달성! 주인장이 편집을 좀 했대'); roundSeen = s.round; roundHits = 0; }
    const b = boss.root.position; const ox = b.x, oz = b.z;
    if (s.phase === 'run') b.lerp(s.pos, Math.min(1, dt * 10)); else b.lerp(denFront, Math.min(1, dt * 4));
    const mx = b.x - ox, mz = b.z - oz, moving = Math.hypot(mx, mz) > dt * 0.6;
    if (moving) { const want = Math.atan2(mx, mz); let d = want - boss.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); boss.root.rotation.y += d * Math.min(1, dt * 10); }
    else { const want = Math.atan2(dx - b.x, dz - b.z) + (s.phase === 'sleep' || s.phase === 'work' ? Math.PI : 0); let d = want - boss.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); boss.root.rotation.y += d * Math.min(1, dt * 3); }
    const want = s.phase === 'sleep' ? 'sit' : s.phase === 'work' ? 'sit' : s.phase === 'bar' ? 'interact-right' : moving ? (s.sprinting ? 'sprint' : 'walk') : 'idle';
    if ((boss.onceUntil || 0) < now && boss.anim !== want) { boss.ch.anim(want); boss.anim = want; }
    boss.ch.mixer.timeScale = s.phase === 'bar' ? 0.5 : 1; boss.ch.mixer.update(dt);
    boss.lap.visible = s.phase !== 'bar';
    if (s.phase !== boss.lastPhase) { boss.lastPhase = s.phase; boss.nm.firstChild.textContent = { sleep: '자는 중', bar: '소주 중', run: '도망 중', work: '작업 중' }[s.phase]; const L = { sleep: LINES.sleep, bar: LINES.bar, run: LINES.sprint, work: LINES.work }[s.phase]; EXT.bubble(boss.tag, pick(L)); boss.bubAt = now + 9000; }
    if (s.phase === 'run' && s.sprinting && now > boss.bubAt) { EXT.bubble(boss.tag, pick(LINES.sprint)); boss.bubAt = now + 9000; }
    else if (now > boss.bubAt + 6000) { EXT.bubble(boss.tag, pick(s.phase === 'run' ? LINES.run : s.phase === 'sleep' ? LINES.sleep : s.phase === 'bar' ? LINES.bar : LINES.work)); boss.bubAt = now + 12000; }
    // 버튼·안내 — 0.2초마다
    if ((chk -= dt) > 0) return; chk = 0.2;
    const pp = player.root.position, dist = Math.hypot(pp.x - b.x, pp.z - b.z);
    const near = EXT.spawned() && dist < (inv ? REACH + 0.4 : 3.2) && (inv ? s.phase !== 'work' : true);
    btn.hidden = !near; btn.classList.toggle('ask', !inv); btn.firstChild.textContent = inv ? '채찍!' : '초대받기'; btn.lastChild.hidden = !inv;
    hud.hidden = !(inv && EXT.spawned()); if (!hud.hidden) hudUpdate();
  });
  window.__boss = { state: () => bossState(nowS()), invite: () => { DC.store.set('boss_inv', true); }, whip, get st() { return { ...st }; }, get boss() { return boss; } };
}
