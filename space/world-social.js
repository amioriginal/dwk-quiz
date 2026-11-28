/* world-social.js — 우주 광장 「같이 노는 재미」 (2026-11-19 · 대표 「광장이 비어 보임」 · 「같이 노는 재미」)
   world.js 확장 연결부(EXT)로만 꽂는다. world.js 는 고치지 않는다.
   1) 표현 바퀴: 오른쪽 아래 손 버튼 → 8가지 동작. 내 화면과 남의 화면에서 같이 움직인다.
   2) 벤치에 앉기: 벤치 옆에 서면 「앉기」. 한 벤치에 둘이 나란히 앉을 수 있다.
   3) 하이파이브: 다른 주민 가까이서 요청 → 3초 안에 상대가 받으면 둘 다 +5 코인(같은 상대는 하루 1번).
   4) 광장 OX 퀴즈: 매시 00·20·40분에 60초. 서버 없이 시각·날짜 씨앗으로 모든 기기가 같은 문제를 고른다.
   5) 주민 카드: 다른 주민을 누르면 이름·칭호·특기·출신 행성 + 하이파이브 · 따라가기 · 하트 주러 가기.
   주고받는 신호(EXT.send): emo {n} · sit {x,z,r,on} · h5 {k:'req'|'ok', to:{c,x,z}}
   — 상대를 고를 땐 서버 열쇠 대신 「생존자 코드 + 서 있는 자리」로 짚는다(열쇠는 화면에 안 보여서). */

export function install(EXT) {
  const { THREE, K, DC, el, $ } = EXT; const DP = EXT.DP; const V3 = THREE.Vector3;
  const player = EXT.player, peers = EXT.peers;
  const nowMs = () => performance.now();

  // ───────── 옷(world.css 토큰 그대로 · 크림 종이 + 잉크 테두리 + 딱 떨어지는 그림자) ─────────
  document.head.append(el('style', {}, `
body.world .soc-wheel { position: fixed; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom)); z-index: 8; width: min(336px, calc(100vw - 24px)); padding: 10px 10px 8px; background: var(--paper); border: 3px solid var(--ink); border-radius: 16px; box-shadow: 0 5px 0 var(--ink); animation: socUp .16s steps(3); }
body.world .soc-wheel::after { content: ''; position: absolute; right: 22px; bottom: -11px; width: 14px; height: 14px; background: var(--paper); border-right: 3px solid var(--ink); border-bottom: 3px solid var(--ink); transform: rotate(45deg); }
body.world .soc-wheel .hd { display: flex; justify-content: space-between; align-items: center; font: 700 12px/1 var(--pix); color: var(--mute); padding: 0 2px 8px; }
body.world .soc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
body.world .soc-grid button { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; min-height: 66px; padding: 6px 2px 5px; font: 700 12px/1 var(--pix); color: var(--ink); background: #fff; border: 2.5px solid var(--ink); border-radius: 10px; box-shadow: 0 3px 0 var(--ink); cursor: pointer; -webkit-tap-highlight-color: transparent; }
body.world .soc-grid button:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--ink); background: var(--sun); }
body.world .soc-grid button kbd { position: absolute; left: 4px; top: 3px; font: 700 9px/1 var(--pix); color: var(--mute); }
body.world .px { display: block; width: 26px; height: 26px; image-rendering: pixelated; }
body.world .px svg { width: 100%; height: 100%; display: block; }
@keyframes socUp { from { transform: translateY(16px); } }
/* 머리 위 도트 풍선 */
body.world .soc-bub { display: block; width: fit-content; margin: 0 auto 6px; padding: 5px 6px; background: #fff; border: 2.5px solid var(--ink); border-radius: 9px; box-shadow: 0 3px 0 var(--ink); position: relative; animation: socPop .5s cubic-bezier(.2,1.8,.4,1) both; }
body.world .soc-bub .px { width: 24px; height: 24px; }
body.world .soc-bub::after { content: ''; position: absolute; left: 50%; bottom: -8px; width: 9px; height: 9px; background: #fff; border-right: 2.5px solid var(--ink); border-bottom: 2.5px solid var(--ink); transform: translateX(-50%) rotate(45deg); }
@keyframes socPop { 0% { transform: scale(.2) translateY(14px); } 100% { transform: none; } }
/* 상황 버튼 줄(앉기 · 하이파이브 · 받기 · 따라가기) — 「들어가기」 버튼이 떠 있으면 그 위로 올라간다 */
body.world .soc-row { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(150px + env(safe-area-inset-bottom)); z-index: 6; display: flex; flex-wrap: wrap-reverse; justify-content: center; gap: 8px; width: max-content; max-width: calc(100vw - 24px); pointer-events: none; transition: bottom .12s steps(2); }
body.world .soc-row.up { bottom: calc(216px + env(safe-area-inset-bottom)); }
body.world .soc-row > * { pointer-events: auto; }
body.world .soc-chip { position: relative; overflow: hidden; min-height: 48px; padding: 0 14px; font-size: 14px; white-space: nowrap; animation: socUp .16s steps(3); }
body.world .soc-chip .px { width: 22px; height: 22px; }
body.world .soc-chip.hot { background: var(--rose); }
body.world .soc-chip.mint { background: var(--leaf); }
body.world .soc-chip small { font: 400 11px/1 'Galmuri14', var(--pix); color: var(--ink); opacity: .7; }
body.world .soc-chip .left { position: absolute; left: 0; bottom: 0; height: 4px; background: var(--ink); transform-origin: left; animation: socLeft linear both; }
@keyframes socLeft { from { transform: scaleX(1); } to { transform: scaleX(0); } }
/* OX 퀴즈 */
body.world .sox { position: fixed; left: 50%; top: calc(124px + env(safe-area-inset-top)); transform: translateX(-50%); z-index: 6; width: min(380px, calc(100vw - 24px)); background: var(--paper); color: var(--ink); border: 3px solid var(--ink); border-radius: 14px; box-shadow: 0 5px 0 var(--ink); padding: 0 12px 10px; text-align: center; animation: socUp .18s steps(3); }
body.world .sox .hd { display: flex; justify-content: space-between; align-items: center; margin: 0 -12px 8px; padding: 8px 12px 6px; background: var(--ink); color: var(--paper); border-radius: 10px 10px 0 0; font: 700 13px/1 var(--pix); }
body.world .sox .hd .t { color: var(--sun); font-size: 15px; }
body.world .sox .q { margin: 2px 0 8px; font-size: 16px; font-weight: 800; line-height: 1.4; word-break: keep-all; }
body.world .sox .bar { height: 10px; border: 2px solid var(--ink); border-radius: 4px; background: #fff; overflow: hidden; margin: 0 0 8px; }
body.world .sox .bar i { display: block; height: 100%; background: var(--sun); width: 100%; }
body.world .sox .bar.hurry i { background: var(--rose); }
body.world .sox .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
body.world .sox .two .k { min-height: 46px; flex-direction: column; gap: 4px; font-size: 18px; }
body.world .sox .two .k small { font: 400 11px/1 'Galmuri14', var(--pix); }
body.world .sox .two .o { background: var(--sky); } body.world .sox .two .x { background: #ffb3c4; }
body.world .sox .two .k.here { outline: 3px solid var(--ink); outline-offset: 2px; }
body.world .sox .two .k.win { background: var(--leaf); } body.world .sox .two .k.lose { opacity: .45; }
body.world .sox .note { margin: 8px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--mute); word-break: keep-all; }
body.world .sox .ans { margin: 4px 0 6px; font: 700 22px/1.2 var(--pix); }
body.world .sox.pre { width: auto; max-width: calc(100vw - 24px); display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px; border-width: 2.5px; box-shadow: 0 3px 0 var(--ink); font: 700 13px/1 var(--pix); white-space: nowrap; }
body.world .sox.pre .k { min-height: 44px; padding: 0 10px; font-size: 12px; border-radius: 9px; box-shadow: 0 3px 0 var(--ink); }
body.world.ox-on .w-log { top: calc(330px + env(safe-area-inset-top)); }
/* 휴대폰 세로: 오른쪽 버튼 줄(미션·도감·펫…)을 가리지 않게 왼쪽에 붙인다 */
@media (max-width: 600px) and (orientation: portrait) { body.world .sox:not(.pre) { left: 12px; right: 80px; width: auto; transform: none; } body.world .sox .q { font-size: 15px; } }
/* 주민 카드 */
body.world .soc-card { display: grid; grid-template-columns: 92px 1fr; gap: 12px; align-items: center; text-align: left; background: #fff; border: 2.5px solid var(--ink); border-radius: 12px; padding: 10px; margin: 0 0 6px; }
body.world .soc-card img { width: 92px; height: 92px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--ink); display: block; }
body.world .soc-card .nm { font: 700 17px/1.25 var(--pix); word-break: keep-all; }
body.world .soc-card .tt { display: inline-block; margin: 6px 0 4px; font: 700 11px/1 var(--pix); padding: 5px 7px 4px; border: 2px solid var(--ink); border-radius: 6px; background: var(--sun); }
body.world .soc-card p { margin: 3px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--mute); }
body.world .soc-card p b { color: var(--ink); }
body.world .w-box .btn .px { width: 24px; height: 24px; }
body.world .soc-flash { position: fixed; inset: 0; z-index: 7; pointer-events: none; background: radial-gradient(circle at 50% 45%, rgba(255,207,58,.38), rgba(255,207,58,0) 60%); animation: socFade .7s steps(5) both; }
@keyframes socFade { to { opacity: 0; } }
body.kb-open .soc-row, body.kb-open .soc-wheel { display: none; }
@media (max-height: 520px) and (orientation: landscape) {
  body.world .soc-row { bottom: 80px; } body.world .soc-row.up { bottom: 142px; }
  body.world .sox { top: 104px; left: 12px; transform: none; width: min(330px, 40vw); } body.world .sox .q { font-size: 14px; margin-bottom: 6px; }
  body.world .sox .two .k { min-height: 44px; font-size: 15px; }
  body.world .soc-wheel { bottom: 80px; }
  body.world.ox-on .w-log { left: calc(min(330px, 40vw) + 24px); top: 100px; max-width: 20vw; }
}
@media (hover: hover) and (pointer: fine) { body.world .sox { top: 70px; } body.world.ox-on .w-log { top: 290px; } }
`));

  // ───────── 도트 아이콘(직접 그린 9칸 그림 · 이모지 대신) ─────────
  // '#'=잉크 · 'o'=색 · 'w'=흰색 · '.'=비움
  const INK = '#1f1a2e';
  const PIX = {
    hand: ['...#.#.#..', '..#o#o#o#.', '..#o#o#o#.', '#.#o#o#o#.', '#o#ooooo#.', '.#oooooo#.', '.#oooooo#.', '..#oooo#..', '...#ooo#..', '...#####..'],
    yes: ['.........#', '........#o', '.......#o#', '#.....#o#.', 'o#...#o#..', '#o#.#o#...', '.#o#o#....', '..#o#.....', '...#......'],
    no: ['##.....##', '#o#...#o#', '.#o#.#o#.', '..#o#o#..', '...#o#...', '..#o#o#..', '.#o#.#o#.', '#o#...#o#', '##.....##'],
    up: ['....#....', '...#o#...', '..#ooo#..', '.#ooooo#.', '###ooo###', '..#ooo#..', '..#ooo#..', '..#ooo#..', '..#####..'],
    note: ['...######', '...#oooo#', '...######', '...#....#', '...#....#', '.###..###', '#oo#.#oo#', '#ooo##oo#', '.###..##.'],
    zz: ['#####....', '...#.....', '..#......', '.#.......', '#####.###', '.......#.', '......#..', '.....###.', '.........'],
    dizzy: ['..#####..', '.#.....#.', '#..###..#', '#.#...#.#', '#.#.#.#.#', '#.#..##.#', '#..#....#', '.#..###..', '..#......'],
    flag: ['#######..', '#ooooo#..', '#oooooo#.', '#ooooo#..', '#######..', '#........', '#........', '#........', '###......'],
    star: ['....#....', '...#o#...', '###ooo###', '#ooooooo#', '.#ooooo#.', '.#ooooo#.', '#oo#.#oo#', '##.....##', '.........'],
    heart: ['.##..##.', '#oo##oo#', '#oooooo#', '#oooooo#', '.#oooo#.', '..#oo#..', '...##...'],
    bench: ['.........', '#########', '#ooooooo#', '#########', '.#.....#.', '#########', '#ooooooo#', '#########', '.#.....#.'],
    walk: ['...##....', '...##....', '..####...', '.#.##.#..', '...##....', '..#..#...', '.#....#..', '.#.....#.', '.........'],
    q: ['..#####..', '.#ooooo#.', '#oo###oo#', '.##..#oo#', '....#oo#.', '...#oo#..', '...####..', '...#oo#..', '...####..'],
  };
  function pix(name, fill = '#ffcf3a') {
    const rows = PIX[name] || PIX.star; const w = Math.max(...rows.map(r => r.length)), h = rows.length; let r = '';
    rows.forEach((row, y) => [...row].forEach((c, x) => { const col = c === '#' ? INK : c === 'o' ? fill : c === 'w' ? '#fff' : null; if (col) r += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${col}"/>`; }));
    const s = el('span', { class: 'px', 'aria-hidden': 'true' }); s.innerHTML = `<svg viewBox="-.5 -.5 ${w + 1} ${h + 1}" shape-rendering="crispEdges">${r}</svg>`; return s;
  }
  const COL = { sun: '#ffcf3a', sky: '#7fd8ff', leaf: '#8be07a', rose: '#ff6f91', paper: '#fff4dc' };

  // ───────── 공용: 이름 · 거리 · 내 코드 ─────────
  const peerName = (o) => o?.tag?.el.querySelector('.nm')?.textContent || '주민';
  const myCode = () => K.encodeChar(EXT.me());
  const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const finite = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 40;
  const sstore = () => { const s = DC.store.get('social', null) || {}; if (s.day !== DC.today()) { s.day = DC.today(); s.h5 = []; } s.h5 ||= []; s.ox ||= { streak: 0, best: 0, last: null, right: 0 }; return s; };
  const sSave = (s) => DC.store.set('social', s);
  function headBubble(tag, icon, fill) {
    if (!tag) return; tag.el.querySelector('.soc-bub')?.remove(); const b = el('span', { class: 'soc-bub' }, pix(icon, fill)); tag.el.prepend(b);
    clearTimeout(b._t); setTimeout(() => b.remove(), 2600);
  }

  // ───────── 반짝임(하이파이브 · 퀴즈 정답) ─────────
  const starTex = EXT.canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(28, 6, 8, 52); c.fillRect(6, 28, 52, 8); c.fillRect(22, 22, 20, 20); });
  const bursts = [];
  function burst(at, cols = [0xffcf3a, 0x7fd8ff, 0xff6f91, 0xfff4dc], n = 26) {
    if (EXT.reduce) n = 8;
    const g = new THREE.BufferGeometry(); const p = new Float32Array(n * 3), c = new Float32Array(n * 3), v = [];
    for (let i = 0; i < n; i++) { p.set([at.x, at.y, at.z], i * 3); const col = new THREE.Color(cols[i % cols.length]); c.set([col.r, col.g, col.b], i * 3); const a = Math.random() * 6.283, up = 1.6 + Math.random() * 2.4, sp = 1.2 + Math.random() * 1.8; v.push([Math.cos(a) * sp, up, Math.sin(a) * sp]); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const m = new THREE.PointsMaterial({ size: 0.26, map: starTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.2, sizeAttenuation: true });
    const pts = new THREE.Points(g, m); EXT.scene.add(pts); bursts.push({ pts, v, t: 0 });
  }
  function stepBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.t += dt; const a = b.pts.geometry.attributes.position;
      for (let k = 0; k < b.v.length; k++) { const v = b.v[k]; v[1] -= 6 * dt; a.array[k * 3] += v[0] * dt; a.array[k * 3 + 1] += v[1] * dt; a.array[k * 3 + 2] += v[2] * dt; }
      a.needsUpdate = true; b.pts.material.opacity = Math.max(0, 1 - b.t / 1.1);
      if (b.t > 1.1) { EXT.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }
  }
  function screenFlash() { if (EXT.reduce) return; const d = el('div', { class: 'soc-flash' }); document.body.append(d); setTimeout(() => d.remove(), 800); }

  // ───────── 동작(내 캐릭터 · 남의 캐릭터 같은 함수) ─────────
  // hold = 움직일 때까지 그 자세로 멈춤 · seq = 여러 동작을 번갈아(춤)
  const EMO = [
    { id: 'hi', name: '인사', clip: 'emote-yes', icon: 'hand', fill: COL.sun },
    { id: 'yes', name: '끄덕', clip: 'interact-right', icon: 'yes', fill: COL.leaf },
    { id: 'no', name: '절레', clip: 'emote-no', icon: 'no', fill: COL.rose },
    { id: 'jump', name: '점프', clip: 'jump', icon: 'up', fill: COL.sky },
    { id: 'dance', name: '춤', seq: ['jump', 'interact-left', 'interact-right', 'emote-yes', 'jump', 'interact-right', 'interact-left', 'emote-yes'], icon: 'note', fill: COL.rose },
    { id: 'sit', name: '앉기', clip: 'sit', hold: true, icon: 'zz', fill: COL.sky },
    { id: 'faint', name: '기절', clip: 'die', hold: true, icon: 'dizzy', fill: COL.sun },
    { id: 'follow', name: '따라와', clip: 'interact-right', icon: 'flag', fill: COL.leaf },
  ];
  const EMO_BY = Object.fromEntries(EMO.map(e => [e.id, e]));
  function act(h, id) {
    const e = EMO_BY[id]; if (!h?.ch || !e) return 0;
    h._seq = null; h._hold = !!e.hold;
    if (e.seq) { h._seq = { list: e.seq, i: 0 }; nextSeq(h); return e.seq.length * 0.6; }
    const d = h.ch.anim(e.clip, { once: true }); h.onceUntil = nowMs() + (e.hold ? 1e9 : d * 1000); return d;
  }
  function nextSeq(h) {
    const s = h._seq; if (!s || !h.ch) return;
    if (s.i >= s.list.length) { h._seq = null; h.onceUntil = 0; return; }
    const d = h.ch.anim(s.list[s.i++], { once: true }); s.until = nowMs() + Math.max(250, d * 1000 * 0.8); h.onceUntil = s.until + 300;
  }
  function release(h) { if (!h) return; h._seq = null; h._hold = false; h._seat = null; h.onceUntil = 0; if (h.root) h.root.position.y = 0; }

  // ───────── 1) 표현 바퀴 ─────────
  let wheel = null, lastEmo = 0;
  function closeWheel() { wheel?.remove(); wheel = null; }
  function openWheel() {
    if (wheel) return closeWheel();
    const grid = el('div', { class: 'soc-grid' }, EMO.map((e, i) => el('button', { type: 'button', 'aria-label': e.name, onclick: () => { closeWheel(); doEmote(e.id); } }, EXT.fine ? el('kbd', {}, String(i + 1)) : null, pix(e.icon, e.fill), e.name)));
    wheel = el('div', { class: 'soc-wheel', role: 'menu', 'aria-label': '표현 고르기' }, el('div', { class: 'hd' }, el('span', {}, '표현하기'), el('span', {}, EXT.fine ? 'Q 열기 · 숫자로 바로' : '다른 주민 화면에도 보여')), grid);
    document.body.append(wheel); DC.sfx('tick');
  }
  function doEmote(id) {
    if (!EXT.spawned() || !player.ch) return; const t = nowMs(); if (t - lastEmo < 500) return; lastEmo = t;
    if (id === 'sit') { const s = nearSeat(); if (s) return sitOn(s); }
    standUp(true); followStop();
    const e = EMO_BY[id]; act(player, id); headBubble(player.tag, e.icon, e.fill);
    if (e.hold) { holdAt = { x: player.root.position.x, z: player.root.position.z }; holdKind = id; }
    EXT.send('emo', { n: id }); DC.sfx(id === 'faint' ? 'bad' : id === 'dance' ? 'win' : 'good'); DC.buzz(12);
    if (id === 'follow') EXT.log('', '「따라와!」 — 근처 주민 화면에 「따라가기」 버튼이 떠', false, true);
  }
  let holdAt = null, holdKind = null; // 땅에 앉기·기절 자리·종류(새로 들어온 주민에게 다시 알려 줄 때)
  const eb = $('#emote'); if (eb) { eb.onclick = openWheel; eb.setAttribute('aria-label', '표현 고르기'); }
  addEventListener('pointerdown', (e) => { if (wheel && !wheel.contains(e.target) && !eb?.contains(e.target)) closeWheel(); }, true);
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || !$('#sheet').classList.contains('hidden')) return;
    const k = e.key.toLowerCase();
    if (k === 'q') { openWheel(); e.preventDefault(); }
    else if (k === 'escape') closeWheel();
    else if (/^[1-8]$/.test(k)) { closeWheel(); doEmote(EMO[+k - 1].id); }
  });

  // ───────── 2) 벤치에 앉기 ─────────
  // 벤치: world.js 와 같은 자리 polar(6.4, a), 방향 a+π(분수를 본다). 벤치 하나에 자리 둘(왼쪽·오른쪽).
  const BENCH_A = [0.36, -0.36, 1.25, -1.25, 2.5, -2.5]; const SEAT_OFF = 0.42, SEAT_IN = 0.06; const TUNE = { y: 0.0 }; // y = 앉았을 때 엉덩이를 벤치 높이로 올리는 값(실측으로 맞춤)
  const SEATS = BENCH_A.flatMap((a, bi) => [-1, 1].map(side => {
    const [cx, cz] = EXT.polar(6.4, a); const tx = Math.cos(a), tz = -Math.sin(a); const rx = Math.sin(a), rz = Math.cos(a);
    return { key: `${bi}${side > 0 ? 'r' : 'l'}`, bench: bi, cx, cz, x: cx + tx * SEAT_OFF * side - rx * SEAT_IN, z: cz + tz * SEAT_OFF * side - rz * SEAT_IN, r: a + Math.PI };
  }));
  let seat = null; // 내가 앉은 자리
  const taken = (s) => { for (const o of peers.values()) if (o._seat && Math.hypot(o._seat.x - s.x, o._seat.z - s.z) < 0.3) return true; return false; };
  function nearBench() { const p = player.root.position; let best = null, bd = 1.3; for (let i = 0; i < BENCH_A.length; i++) { const s = SEATS[i * 2]; const d = Math.hypot(p.x - s.cx, p.z - s.cz); if (d < bd) { bd = d; best = i; } } return best; }
  function nearSeat() {
    const b = nearBench(); if (b == null) return null; const p = player.root.position;
    const two = SEATS.filter(s => s.bench === b && !taken(s)).sort((a, c) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - c.x, p.z - c.z));
    return two[0] || 'full';
  }
  function sitOn(s) {
    if (s === 'full') { DC.toast('여긴 자리가 꽉 찼어. 다른 벤치로 가 볼까?'); return; }
    followStop(); standUp(true); seat = s; player.target = null; act(player, 'sit'); player._hold = true;
    headBubble(player.tag, 'bench', COL.sun); DC.sfx('land'); DC.buzz(15);
    EXT.send('sit', { on: true, x: +s.x.toFixed(2), z: +s.z.toFixed(2), r: +s.r.toFixed(2) });
    const buddy = [...peers.values()].find(o => o._seat && Math.hypot(o._seat.x - s.x, o._seat.z - s.z) < 1.1);
    if (buddy) EXT.log('', `${peerName(buddy)} 옆에 앉았어`, false, true);
  }
  function standUp(quiet = false) {
    if (seat) { seat = null; EXT.send('sit', { on: false }); }
    else if (player._hold || player._seq) EXT.send('emo', { n: '_stand' }); // 남의 화면에서도 일어나게
    holdAt = null; holdKind = null; release(player);
  }

  // ───────── 상황 버튼 줄 ─────────
  const row = el('div', { class: 'soc-row', 'aria-live': 'polite' }); document.body.append(row);
  const chips = new Map(); // id → { node, sig }
  function chip(id, sig, make) { // sig 가 같으면 다시 안 그린다(깜빡임 방지)
    const c = chips.get(id); if (c && c.sig === sig) return; c?.node.remove(); const node = make(); node.dataset.soc = id; row.append(node); chips.set(id, { node, sig });
  }
  function unchip(id) { const c = chips.get(id); if (!c) return; c.node.remove(); chips.delete(id); }
  const chipBtn = (cls, icon, fill, label, onclick, sub, ms) => el('button', { class: 'k soc-chip ' + cls, type: 'button', onclick }, pix(icon, fill), el('span', {}, label), sub ? el('small', {}, sub) : null, ms ? el('i', { class: 'left', style: `animation-duration:${ms}ms` }) : null);

  // ───────── 3) 하이파이브 ─────────
  let h5Out = null;     // 내가 보낸 요청 { peerId, until }
  const h5In = new Map(); // 받은 요청 peerId → until
  const H5_MS = 3000;
  function nearestPeer(r) { const p = player.root.position; let best = null, bd = r; for (const [id, o] of peers) { if (!o.ch) continue; const d = flat(o.cur, p); if (d < bd) { bd = d; best = [id, o]; } } return best; }
  function h5Ask(id, o) {
    if (!o) return; const t = nowMs(); if (h5Out && h5Out.until > t) return;
    if (h5In.get(id) > t) return h5Accept(id, o); // 상대도 막 눌렀다 → 바로 성립
    h5Out = { peerId: id, until: t + H5_MS + 600 }; faceTo(player, o.cur);
    EXT.send('h5', { k: 'req', to: { c: o.code, x: +o.cur.x.toFixed(2), z: +o.cur.z.toFixed(2) } });
    EXT.playerAnim('interact-right'); headBubble(player.tag, 'hand', COL.sun); DC.sfx('swipe');
    EXT.log('', `${peerName(o)}에게 하이파이브! 상대가 3초 안에 받으면 성공`, false, true);
  }
  function h5Accept(id, o) {
    h5In.delete(id); unchip('h5in-' + id);
    EXT.send('h5', { k: 'ok', to: { c: o.code, x: +o.cur.x.toFixed(2), z: +o.cur.z.toFixed(2) } });
    h5Done(id, o);
  }
  function h5Done(id, o) {
    h5Out = null; standUp(true); faceTo(player, o.cur); o.ry = Math.atan2(player.root.position.x - o.cur.x, player.root.position.z - o.cur.z);
    EXT.playerAnim('interact-right'); if (o.ch) { const d = o.ch.anim('interact-right', { once: true }); o.onceUntil = nowMs() + d * 1000; }
    const mid = new V3((player.root.position.x + o.cur.x) / 2, 1.25, (player.root.position.z + o.cur.z) / 2);
    setTimeout(() => { burst(mid); screenFlash(); DC.sfx('win'); DC.buzz([20, 30, 20]); }, EXT.reduce ? 0 : 220);
    headBubble(player.tag, 'star', COL.sun); headBubble(o.tag, 'star', COL.sun);
    const s = sstore(); const key = o.code || id;
    if (!s.h5.includes(key)) { s.h5.push(key); s.h5n = (s.h5n || 0) + 1; sSave(s); DP?.give(5); DP?.flash(['하이파이브!', '+5 코인']); }
    else DP?.flash(['하이파이브!', '오늘 이 주민 코인은 받았어']);
    EXT.log('', `${peerName(o)}랑 하이파이브 성공!`, false, true);
  }
  function faceTo(h, at) { const p = h.root.position; h.root.rotation.y = Math.atan2(at.x - p.x, at.z - p.z); }
  const forMe = (to) => to && typeof to === 'object' && to.c === myCode() && finite(to.x) && finite(to.z) && Math.hypot(player.root.position.x - to.x, player.root.position.z - to.z) < 2.6;

  // ───────── 따라가기(테일즈런너 광장처럼 · 조이스틱을 만지면 풀린다) ─────────
  let fol = null; const folT = new V3();
  function followStart(id, o, then = null) {
    if (!o) return; standUp(true); fol = { id, then }; DC.sfx('tap');
    EXT.log('', `${peerName(o)} 따라가는 중 · 조이스틱을 밀면 멈춰`, false, true);
  }
  function followStop(msg) { if (!fol) return; fol = null; unchip('fol'); if (player.target === folT) player.target = null; if (msg) DC.toast(msg); }
  function stepFollow() {
    if (!fol) return; const o = peers.get(fol.id); if (!o) return followStop('따라가던 주민이 광장을 나갔어');
    if (player.target && player.target !== folT) return followStop(); // 다른 곳을 눌렀다
    if (!player.target && player.moving) return followStop();         // 조이스틱·키보드를 썼다
    const p = player.root.position; const d = flat(o.cur, p);
    if (fol.then === 'h5' && d < 1.5) { const id = fol.id; followStop(); h5Ask(id, o); return; }
    if (d > 1.35) { const ry = o.root.rotation.y; folT.set(o.cur.x - Math.sin(ry) * 1.0, 0, o.cur.z - Math.cos(ry) * 1.0); if (flat(folT, p) > 0.3) player.target = folT; }
  }

  // ───────── 신호 받기 ─────────
  EXT.onMsg('emo', (d, id, o) => {
    if (!o || !d || typeof d.n !== 'string') return;
    if (d.n === '_stand') { release(o); return; }
    const e = EMO_BY[d.n]; if (!e || !o.ch) return;
    act(o, d.n); headBubble(o.tag, e.icon, e.fill);
    if (e.hold) o._holdAt = { x: o.cur.x, z: o.cur.z };
    if (d.n === 'follow' && flat(o.cur, player.root.position) < 10 && !fol) {
      const until = nowMs() + 5000; o._folAsk = until;
      chip('folask-' + id, until, () => chipBtn('mint', 'walk', COL.leaf, `${peerName(o)} 따라가기`, () => { unchip('folask-' + id); followStart(id, o); }, '「따라와!」', 5000));
    }
  });
  EXT.onMsg('sit', (d, id, o) => {
    if (!o || !d) return;
    if (!d.on) { release(o); return; }
    if (!finite(d.x) || !finite(d.z) || !finite(d.r)) return;
    o._seat = { x: d.x, z: d.z, r: d.r }; o.tgt.set(d.x, 0, d.z); o.ry = d.r; o._hold = true;
    if (o.ch) { o.ch.anim('sit', { once: true }); o.onceUntil = nowMs() + 1e9; }
    if (seat && Math.hypot(seat.x - d.x, seat.z - d.z) < 0.3) { standUp(); DC.toast('같은 자리에 누가 앉아서 일어났어'); } // 거의 동시에 같은 자리에 앉은 경우
  });
  EXT.onMsg('h5', (d, id, o) => {
    if (!o || !d || !forMe(d.to)) return;
    if (d.k === 'req') {
      if (h5Out && h5Out.peerId === id) { h5Accept(id, o); return; } // 둘이 동시에 눌렀다
      const until = nowMs() + H5_MS; h5In.set(id, until); o.ry = Math.atan2(player.root.position.x - o.cur.x, player.root.position.z - o.cur.z);
      headBubble(o.tag, 'hand', COL.sun); DC.sfx('good'); DC.buzz([15, 40, 15]);
      chip('h5in-' + id, until, () => chipBtn('hot', 'hand', COL.sun, `${peerName(o)} 하이파이브 받기`, () => h5Accept(id, o), null, H5_MS));
    } else if (d.k === 'ok' && h5Out && h5Out.peerId === id && h5Out.until > nowMs()) h5Done(id, o);
  });

  // 새 주민이 들어오면 지금 앉아 있다는 것만 다시 알려 준다(필요할 때만 보내서 서버를 가볍게)
  const seenPeers = new Set(); let greetT = 0;
  function stepGreet(t) {
    if (t - greetT < 1000) return; greetT = t; let fresh = false;
    for (const id of peers.keys()) if (!seenPeers.has(id)) { seenPeers.add(id); fresh = true; }
    for (const id of seenPeers) if (!peers.has(id)) { seenPeers.delete(id); h5In.delete(id); unchip('h5in-' + id); unchip('folask-' + id); }
    if (!fresh) return;
    if (seat) EXT.send('sit', { on: true, x: +seat.x.toFixed(2), z: +seat.z.toFixed(2), r: +seat.r.toFixed(2) });
    else if (player._hold && holdKind) EXT.send('emo', { n: holdKind });
  }

  // ───────── 4) 광장 OX 퀴즈 ─────────
  const PERIOD = 20 * 60e3, RUN = 60e3, SHOW = 9e3, PRE = 120e3;
  const ZONE = { o: { x: -1.95, z: 8.65 }, x: { x: 1.95, z: 8.65 } }; const ZR = 1.45; // 남쪽 길(분수·벤치·가로등 피해서)
  const per = EXT.D?.plaza?.perDay || 3;
  const BASEQ = [
    // 우주 상식(사실 확인한 것만)
    { q: '태양계에서 가장 큰 행성은 목성이다.', a: true, why: '목성 안에 지구가 1,300개쯤 들어가.' },
    { q: '수성은 태양과 제일 가까우니까 태양계에서 제일 뜨거운 행성이다.', a: false, why: '제일 뜨거운 건 금성. 두꺼운 구름이 열을 가둬.' },
    { q: '금성은 하루(한 바퀴 자전)가 1년(태양 한 바퀴)보다 길다.', a: true, why: '자전에 약 243일, 공전에 약 225일 걸려.' },
    { q: '달에서 크게 소리치면 옆 사람이 들을 수 있다.', a: false, why: '공기가 없어서 소리가 퍼지지 않아. 무전기가 필요해.' },
    { q: '토성은 엄청 큰 욕조가 있다면 물에 뜰 만큼 가볍다.', a: true, why: '평균 밀도가 물보다 낮아.' },
    { q: '태양빛이 지구까지 오는 데 약 8분 걸린다.', a: true, why: '약 8분 20초. 지금 보는 해는 8분 전 모습이야.' },
    { q: '우주에서 맨눈으로 만리장성이 보인다.', a: false, why: '너무 가늘어서 우주비행사들도 맨눈으론 못 봤대.' },
    { q: '화성의 낮 하늘은 지구처럼 파랗다.', a: false, why: '낮엔 누런 분홍빛이고, 오히려 해 질 녘이 파래.' },
    { q: '목성에도 고리가 있다.', a: true, why: '토성보다 아주 희미하지만 있어.' },
    { q: '지구에서는 늘 달의 같은 쪽 얼굴만 보인다.', a: true, why: '달이 한 바퀴 도는 동안 딱 한 번 자전해서야.' },
    { q: '별똥별은 하늘의 별이 떨어지는 것이다.', a: false, why: '우주 먼지·돌이 대기에 부딪혀 타면서 빛나는 거야.' },
    { q: '국제우주정거장은 지구를 하루에 딱 한 바퀴 돈다.', a: false, why: '약 90분에 한 바퀴. 하루에 15바퀴 넘게 돌아.' },
    { q: '태양계에서 태양과 가장 먼 행성은 해왕성이다.', a: true, why: '명왕성은 2006년부터 왜소행성으로 분류돼.' },
    // 광장 상식(이 사이트의 실제 규칙)
    { q: '캡슐 뽑기는 현금으로도 할 수 있다.', a: false, why: '광장 코인·티켓으로만 돼. 현금 결제는 없어.' },
    { q: `주민 자랑 하트는 한 기기에서 하루 ${per}개까지 줄 수 있다.`, a: true, why: `매일 ${per}개. 아껴서 마음에 드는 주민한테!` },
    { q: '아케이드 게임기는 모두 5대다.', a: false, why: '4대야. 행성 합치기·행성 생존·빈틈 찾기·행성 착륙.' },
    { q: '명예의 전당 순위는 매주 새로 시작한다.', a: true, why: '월요일부터 일요일까지가 한 주야.' },
    { q: '광장 채팅에 전화번호를 적어도 된다.', a: false, why: '연락처·링크는 안전 규칙상 못 보내.' },
    { q: '연속 출석 7일째엔 캡슐 티켓을 준다.', a: true, why: '7일째엔 100코인 + 캡슐 티켓!' },
    { q: '오늘의 미션 3개를 다 깨면 캡슐 티켓을 1장 받는다.', a: true, why: '오른쪽 「미션」 버튼에서 받을 수 있어.' },
    { q: '광장 분수 위에는 작은 행성이 떠서 돈다.', a: true, why: '돈워너노우 광장의 상징이야.' },
    { q: '광장 OX 퀴즈는 매시 00분·20분·40분에 열린다.', a: true, why: '하루에 72번! 정답 맞히면 10코인.' },
    { q: '같은 주민이랑은 하이파이브를 하루에 몇 번이든 코인을 받을 수 있다.', a: false, why: '같은 주민과는 하루 1번만 코인이 나와. 여러 주민이랑 해 봐!' },
    // 너라면?(정답 없음 — 서 있기만 하면 다 정답)
    { q: '너라면 디저트 행성에서 1년 버틸 수 있다?', a: null, o: '버틴다', x: '못 버틴다' },
    { q: '매일 밤 새 침대에서 자는 쇼핑몰 행성, 살아 볼래?', a: null, o: '산다', x: '안 산다' },
    { q: '끝없는 여름(해바라기 행성) vs 눈 덮인 산 온천(온천 행성)', a: null, o: '여름', x: '온천' },
    { q: '고래가 헤엄치는 물방울 행성 vs 양 위의 구름 행성', a: null, o: '물방울', x: '구름' },
    { q: '우주여행 공짜 티켓이 생기면 내일 바로 간다?', a: null, o: '간다', x: '안 간다' },
    { q: '우주 어딘가에 외계인이 있다고 믿는다?', a: null, o: '믿는다', x: '안 믿는다' },
    { q: '1년 버티기, 친구랑 같이 vs 혼자서', a: null, o: '친구랑', x: '혼자' },
    { q: '밤마다 반딧불이 떠오르는 호숫가라면 1년 내내 캠핑 가능?', a: null, o: '가능', x: '불가능' },
  ];
  // 영상 속 행성 소개(pitch)로 만드는 문제 — data.js 에 새 편이 들어오면 저절로 늘어난다. 반전 규칙(rule)은 절대 안 쓴다.
  function pitchQs() {
    const ps = DC.planets(); const out = [];
    ps.forEach((p, i) => {
      const line = String(p.pitch || '').replace(/\s*\n\s*/g, ' ').trim(); if (!line) return;
      const other = ps[(i + 1 + (i % 3)) % ps.length];
      if (i % 2 === 0 || other.id === p.id) out.push({ q: `「${line}」 — ${p.name} 소개다.`, a: true, why: `${p.ep}편 ${p.name}. 영상에서 확인해 봐!` });
      else out.push({ q: `「${line}」 — ${other.name} 소개다.`, a: false, why: `이건 ${p.ep}편 ${p.name} 소개야.` });
    });
    (EXT.D?.episodes || []).forEach((e, i) => { const n = e.planets.length; const t = i % 2 === 0; out.push({ q: `돈워너노우 ${e.no}편에는 행성이 ${t ? n : n + 1}개 나온다.`, a: t, why: `${e.no}편 「${e.title}」은 행성 ${n}개야.` }); });
    return out;
  }
  const QS = [...BASEQ, ...pitchQs()];
  function questionFor(round) {
    const dayMs = 86400e3, day = Math.floor(round * PERIOD / dayMs), first = Math.ceil(day * dayMs / PERIOD);
    const idx = QS.map((_, i) => i); const r = DC.rng(DC.seed('dwk-ox-' + day + '-' + QS.length));
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return QS[idx[(round - first) % idx.length]];
  }
  function phaseAt(t) {
    const round = Math.floor(t / PERIOD), start = round * PERIOD, since = t - start;
    if (since < RUN) return { ph: 'run', round, left: RUN - since };
    if (since < RUN + SHOW) return { ph: 'show', round, left: RUN + SHOW - since };
    const next = start + PERIOD; if (next - t <= PRE) return { ph: 'pre', round: round + 1, left: next - t };
    return { ph: 'idle', round: round + 1, left: next - t };
  }
  // 바닥 O·X 구역
  const zoneMat = {}; const zoneGlow = {};
  for (const k of ['o', 'x']) {
    const z = ZONE[k]; const tex = EXT.canvasTex(256, 256, (c) => {
      c.beginPath(); c.arc(128, 128, 122, 0, 6.283); c.fillStyle = '#fff4dc'; c.fill(); c.lineWidth = 10; c.strokeStyle = '#1f1a2e'; c.stroke();
      c.beginPath(); c.arc(128, 128, 104, 0, 6.283); c.setLineDash([16, 12]); c.lineWidth = 5; c.stroke(); c.setLineDash([]);
      c.lineCap = 'square'; c.lineWidth = 30; c.strokeStyle = '#1f1a2e';
      const draw = () => { if (k === 'o') { c.beginPath(); c.arc(128, 128, 54, 0, 6.283); c.stroke(); } else { c.beginPath(); c.moveTo(82, 82); c.lineTo(174, 174); c.moveTo(174, 82); c.lineTo(82, 174); c.stroke(); } };
      c.save(); c.translate(0, 7); draw(); c.restore(); c.lineWidth = 22; c.strokeStyle = k === 'o' ? '#3fb8ff' : '#ff6f91'; draw();
    });
    zoneMat[k] = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 });
    const m = new THREE.Mesh(new THREE.CircleGeometry(ZR, 48).rotateX(-Math.PI / 2), zoneMat[k]); m.position.set(z.x, 0.022, z.z); m.receiveShadow = true; EXT.world.add(m);
    const g = new THREE.Mesh(new THREE.CylinderGeometry(ZR, ZR, 1.2, 40, 1, true), new THREE.MeshBasicMaterial({ color: k === 'o' ? 0x7fd8ff : 0xff6f91, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    g.position.set(z.x, 0.6, z.z); g.visible = false; EXT.world.add(g); zoneGlow[k] = g;
  }
  const oxTag = EXT.makeTag('fac', 'OX 퀴즈 · 매시 00·20·40분'); oxTag.pos.set(0, 2.3, 8.65);
  const inZone = (p) => Math.hypot(p.x - ZONE.o.x, p.z - ZONE.o.z) < ZR ? 'o' : Math.hypot(p.x - ZONE.x.x, p.z - ZONE.x.z) < ZR ? 'x' : null;
  const mm = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  let oxEl = null, oxKey = '', oxSeen = {}, oxLast = { round: -1, zone: null }, lastTickSec = -1;
  function oxNode(cls) { if (!oxEl || oxEl.dataset.cls !== cls) { oxEl?.remove(); oxEl = el('div', { class: 'sox ' + cls, role: 'status' }); oxEl.dataset.cls = cls; document.body.append(oxEl); } return oxEl; }
  function oxClear() { oxEl?.remove(); oxEl = null; oxKey = ''; document.body.classList.remove('ox-on'); for (const k of ['o', 'x']) zoneGlow[k].visible = false; }
  function counts() { const c = { o: 0, x: 0 }; const me = inZone(player.root.position); if (me) c[me]++; for (const o of peers.values()) { const z = inZone(o.cur); if (z) c[z]++; } return c; }
  function zoneBtns(q, c, mine, res) {
    const lab = (k) => q.a === null ? (k === 'o' ? q.o : q.x) : (k === 'o' ? '맞다' : '아니다');
    return el('div', { class: 'two' }, ['o', 'x'].map(k => el('button', { class: `k ${k}${mine === k ? ' here' : ''}${res ? (q.a === null || (q.a ? 'o' : 'x') === k ? ' win' : ' lose') : ''}`, type: 'button', onclick: () => { EXT.walkTo([ZONE[k].x, ZONE[k].z]); followStop(); standUp(true); } }, k.toUpperCase(), el('small', {}, `${lab(k)} · ${c[k]}명`))));
  }
  let oxRes = null; // 이번 판 내 결과(표시용)
  function judge(round, q) {
    const s = sstore(); if (s.ox.last === round) return; s.ox.last = round;
    const mine = oxLast.round === round ? oxLast.zone : null; const right = q.a === null ? !!mine : mine === (q.a ? 'o' : 'x');
    // 남들 반응도 내 화면에서 그린다(신호 없이 · 서 있는 자리만 보고)
    for (const o of peers.values()) { const z = inZone(o.cur); if (!z || !o.ch || o._seat) continue; const ok = q.a === null || z === (q.a ? 'o' : 'x'); const d = o.ch.anim(ok ? 'jump' : 'emote-no', { once: true }); o.onceUntil = nowMs() + d * 1000; }
    if (!mine) { oxRes = { kind: 'none' }; sSave(s); return; }
    if (right) {
      s.ox.streak++; s.ox.best = Math.max(s.ox.best, s.ox.streak); s.ox.right++; sSave(s); DP?.give(10);
      oxRes = { kind: 'right', streak: s.ox.streak }; standUp(true); EXT.playerAnim('jump'); burst(new V3(player.root.position.x, 1.5, player.root.position.z)); DC.sfx('win'); DC.buzz([20, 30, 20]);
      DP?.flash([q.a === null ? '참여 완료!' : '정답!', '+10 코인', s.ox.streak > 1 && `연속 정답 ${s.ox.streak}`].filter(Boolean));
    } else {
      s.ox.streak = 0; sSave(s); oxRes = { kind: 'wrong' }; standUp(true); EXT.playerAnim('emote-no'); DC.sfx('bad'); DC.buzz(40);
      DP?.flash(['땡!', `정답은 ${q.a ? 'O' : 'X'}`]);
    }
  }
  let oxUiT = 0;
  function stepOX(t) {
    const ph = phaseAt(Date.now());
    { const want = ph.ph === 'idle' ? 0.28 : 1; for (const k in zoneMat) { const m = zoneMat[k]; if (Math.abs(m.opacity - want) > 0.01) m.opacity += (want - m.opacity) * 0.06; } } // 퀴즈 없을 땐 바닥 원판을 흐리게(점검 B6)
    // 판정은 매 프레임 확인(마감 순간을 놓치지 않게) · 화면 글씨는 초당 4번만
    // 답 = 마감 직전 마지막 화면에서 서 있던 구역. 화면이 느린 폰도 마감 뒤 2분 안에 한 번은 판정한다
    if (ph.ph === 'run') { oxSeen[ph.round] = true; oxLast = { round: ph.round, zone: inZone(player.root.position) }; }
    else { const r = ph.ph === 'show' ? ph.round : ph.round - 1; if (oxSeen[r] && EXT.spawned() && Date.now() - (r * PERIOD + RUN) < 120e3) judge(r, questionFor(r)); }
    if (ph.ph === 'run') { const sec = Math.ceil(ph.left / 1000); if (sec <= 5 && sec !== lastTickSec) { lastTickSec = sec; DC.sfx('tick'); } }
    for (const k of ['o', 'x']) { const g = zoneGlow[k]; if (g.visible) g.material.opacity = (ph.ph === 'show' ? 0.32 : 0.18) + Math.sin(t / 1000 * 5) * 0.08; }
    if (t - oxUiT < 250) return; oxUiT = t;
    // 퀴즈가 없을 땐 이름표를 멀리서만 보이게(O·X 바닥 근처에 서 있으면 화면 한가운데를 가리지 않게)
    const far = Math.hypot(player.root.position.x, player.root.position.z - ZONE.o.z) > 4.5;
    oxTag.el.style.visibility = ph.ph !== 'idle' || far ? '' : 'hidden';
    if (ph.ph === 'idle') { if (oxEl) oxClear(); oxTag.el.querySelector('.nm').textContent = 'OX 퀴즈 · 매시 00·20·40분'; return; }
    if (ph.ph === 'pre') {
      document.body.classList.remove('ox-on'); for (const k of ['o', 'x']) zoneGlow[k].visible = false;
      const n = oxNode('pre'); const key = 'pre' + ph.round;
      if (oxKey !== key) { oxKey = key; n.replaceChildren(pix('q', COL.sun), el('span', { class: 'cd' }), el('button', { class: 'k sun', type: 'button', onclick: () => { if (EXT.navTo) EXT.navTo([0, ZONE.o.z], { label: 'OX 퀴즈 자리' }); else EXT.walkTo([0, ZONE.o.z]); followStop(); standUp(true); } }, 'O·X 자리로')); oxRes = null; }
      n.querySelector('.cd').textContent = `OX 퀴즈 ${mm(ph.left)} 뒤`; oxTag.el.querySelector('.nm').textContent = `OX 퀴즈 ${mm(ph.left)} 뒤`; return;
    }
    const q = questionFor(ph.round); const c = counts(); const mine = inZone(player.root.position);
    document.body.classList.add('ox-on'); for (const k of ['o', 'x']) zoneGlow[k].visible = ph.ph === 'run' || (q.a === null || (q.a ? 'o' : 'x') === k);
    const n = oxNode('run');
    if (ph.ph === 'run') {
      oxTag.el.querySelector('.nm').textContent = `OX 퀴즈 · ${Math.ceil(ph.left / 1000)}초`;
      const key = 'run' + ph.round; if (oxKey !== key && document.getElementById('sheet')?.classList.contains('hidden') !== false) { oxKey = key; DC.sfx('unlock'); EXT.toast('OX 퀴즈 시작! 위 카드의 「O·X 자리로」를 누르면 데려다줄게'); }
      n.replaceChildren(el('div', { class: 'hd' }, el('span', {}, 'OX 퀴즈'), el('span', { class: 't' }, `${Math.ceil(ph.left / 1000)}초`)),
        el('p', { class: 'q' }, q.q), el('div', { class: 'bar' + (ph.left < 10e3 ? ' hurry' : '') }, el('i', { style: `width:${(ph.left / RUN * 100).toFixed(1)}%` })),
        zoneBtns(q, c, mine, false), el('p', { class: 'note' }, mine ? `${mine.toUpperCase()}에 서 있어. 마감 때 서 있는 쪽이 내 답이야` : '버튼을 누르면 그 바닥으로 걸어가. 마감 때 서 있는 쪽이 답!'));
    } else {
      oxTag.el.querySelector('.nm').textContent = q.a === null ? 'OX 퀴즈 · 결과' : `OX 퀴즈 · 정답 ${q.a ? 'O' : 'X'}`;
      const key = 'show' + ph.round; if (oxKey === key) { n.querySelectorAll('.two small').forEach((s2, i) => { const k = i ? 'x' : 'o'; s2.textContent = s2.textContent.replace(/\d+명$/, `${c[k]}명`); }); return; } oxKey = key;
      const sub = !oxRes ? '이번 판은 구경만 했어' : oxRes.kind === 'none' ? 'O·X 바닥에 안 서 있어서 이번 판은 구경만 했어' : oxRes.kind === 'wrong' ? '아깝다! 다음 판에 다시 도전' : q.a === null ? '+10 코인 · 정답 없는 문제라 참여만 해도 정답' : `+10 코인${oxRes.streak > 1 ? ` · 연속 정답 ${oxRes.streak}` : ''}`;
      const big = q.a === null ? (c.o === c.x ? '반반으로 갈렸어' : `${c.o > c.x ? q.o : q.x} 쪽이 더 많아`) : `정답은 ${q.a ? 'O' : 'X'}`;
      n.replaceChildren(el('div', { class: 'hd' }, el('span', {}, 'OX 퀴즈 결과'), el('span', { class: 't' }, oxRes?.kind === 'right' ? '맞혔다!' : oxRes?.kind === 'wrong' ? '땡!' : '')),
        el('p', { class: 'q' }, q.q), el('p', { class: 'ans' }, big), zoneBtns(q, c, mine, true), el('p', { class: 'note' }, [q.why, sub].filter(Boolean).join(' · ')));
    }
  }

  // ───────── 5) 주민 카드(다른 주민을 누르면) ─────────
  const cv = EXT.renderer.domElement; let down = null; const pv = new V3();
  cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; }); // 시각은 입력 시각(e.timeStamp) — 화면이 느려도 「짧게 누름」을 바르게 잰다
  cv.addEventListener('pointerup', (e) => {
    const d = down; down = null; if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || e.timeStamp - d.t > 500) return;
    const cam = EXT.camera; const focal = innerHeight / (2 * Math.tan(cam.fov * Math.PI / 360)); let best = null, bd = Infinity;
    for (const [id, o] of peers) {
      if (!o.ch) continue; pv.set(o.root.position.x, 0.62, o.root.position.z); const dist = pv.distanceTo(cam.position); pv.project(cam); if (pv.z > 1) continue;
      const sx = (pv.x * 0.5 + 0.5) * innerWidth, sy = (-pv.y * 0.5 + 0.5) * innerHeight, r = 0.62 * focal / dist;
      const dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy); if (dx < Math.max(22, r * 0.62) && dy < Math.max(30, r * 1.05) && dx + dy < bd) { bd = dx + dy; best = [id, o]; }
    }
    if (!best) return; player.target = null; // world.js 가 방금 걸어 둔 땅 이동을 취소
    setTimeout(() => openCard(...best), 90); // 바로 열면 뒤따르는 click 이 막 뜬 시트 바깥을 눌러 시트가 닫힌다
  });
  function openCard(id, o) {
    const s = K.decodeChar(o.code || '') || null; const nm = peerName(o);
    const pl = s ? DC.planet(s.p) : null; DC.sfx('tap');
    const near = () => flat(o.cur, player.root.position) < 1.6;
    const info = el('div', { class: 'soc-card' }, pl ? el('img', { src: pl.img, alt: '' }) : el('div', {}),
      el('div', {}, el('div', { class: 'nm' }, s ? K.charName(s) : nm), el('span', { class: 'tt' }, s ? K.TITLES[s.title].name : '구경 중'),
        nm !== (s && K.charName(s)) ? el('p', {}, '광장 이름 ', el('b', {}, nm)) : null,
        s && el('p', {}, '특기 ', el('b', {}, K.SKILLS[s.skill])), pl && el('p', {}, '출신 ', el('b', {}, pl.name))));
    const today = sstore().h5.includes(o.code || id);
    EXT.sheet('주민 카드', info,
      el('button', { class: 'btn k sun', type: 'button', onclick: () => { EXT.closeSheet(); if (near()) h5Ask(id, o); else followStart(id, o, 'h5'); } }, pix('hand', COL.sun), near() ? '하이파이브' : '다가가서 하이파이브'),
      el('button', { class: 'btn k sky', type: 'button', onclick: () => { EXT.closeSheet(); followStart(id, o); } }, pix('walk', COL.sky), '따라가기'),
      o.code && el('button', { class: 'btn k', type: 'button', onclick: () => EXT.go('plaza.html#c=' + encodeURIComponent(o.code)) }, pix('heart', COL.rose), '하트 주러 가기'),
      el('p', { class: 'note' }, today ? '오늘 이 주민과 하이파이브 코인은 이미 받았어. 그래도 하이파이브는 몇 번이든 돼!' : '하이파이브가 성공하면 둘 다 +5 코인 (같은 주민은 하루 1번).'));
  }

  // ───────── 매 프레임 ─────────
  const actBtn = $('#act');
  let uiT = 0;
  EXT.onTick((dt, t, now) => {
    stepBursts(dt);
    if (!EXT.spawned() || !player.ch) return;
    const p = player.root.position;
    // 내 상태: 움직이면 일어난다 · 앉아 있으면 자리에 고정(벤치 충돌원이 밀어내도 다시 앉힌다)
    if (player.moving && (seat || player._hold || player._seq)) { standUp(); DC.sfx('tap'); }
    else if (seat) { p.x = seat.x; p.z = seat.z; p.y = TUNE.y; player.root.rotation.y = seat.r; }
    if (player._seq && now > player._seq.until) nextSeq(player);
    // 남의 상태
    for (const o of peers.values()) {
      if (o._seq && now > o._seq.until) nextSeq(o);
      if (o._seat) { o.tgt.set(o._seat.x, 0, o._seat.z); o.ry = o._seat.r; if (o.cur.distanceTo(o.tgt) < 0.05) o.root.position.y = TUNE.y; if (o.ch && !(o.onceUntil > now)) { o.ch.anim('sit', { once: true }); o.onceUntil = now + 1e9; } }
      else if (o._hold && o._holdAt) o.tgt.set(o._holdAt.x, 0, o._holdAt.z); // 접속 갱신(presence)이 옛 자리로 끌어도 버틴다
    }
    stepFollow(); stepGreet(now); stepOX(now);
    if (now - uiT < 120) return; uiT = now;
    // 상황 버튼 줄
    row.classList.toggle('up', !!actBtn && !actBtn.classList.contains('hidden'));
    for (const [id, until] of h5In) if (until < now) { h5In.delete(id); unchip('h5in-' + id); }
    for (const [id, c] of chips) if (id.startsWith('folask-')) { const o = peers.get(id.slice(7)); if (!o || !(o._folAsk > now) || fol) unchip(id); }
    if (seat) chip('seat', 'up', () => chipBtn('', 'up', COL.sky, '일어나기', () => { standUp(); }));
    else { const s = nearBench() != null && !fol ? nearSeat() : null; if (s) chip('seat', 'sit', () => chipBtn('', 'bench', COL.sun, '앉기', () => { const s2 = nearSeat(); if (s2) sitOn(s2); })); else unchip('seat'); }
    const np = !fol && !(h5Out && h5Out.until > now) ? nearestPeer(1.6) : null;
    if (np && !h5In.has(np[0])) chip('h5', np[0], () => chipBtn('', 'hand', COL.sun, '하이파이브', () => { const n2 = nearestPeer(1.8); if (n2) h5Ask(...n2); }, peerName(np[1]))); else unchip('h5');
    if (h5Out && h5Out.until > now) chip('h5wait', h5Out.peerId, () => chipBtn('', 'hand', COL.paper, '기다리는 중…', () => {}, null, Math.max(0, h5Out.until - now))); else { unchip('h5wait'); if (h5Out && h5Out.until <= now) { h5Out = null; DC.toast('상대가 못 봤나 봐. 다시 해 볼까?'); } }
    if (fol) { const o = peers.get(fol.id); chip('fol', fol.id + fol.then, () => chipBtn('mint', 'walk', COL.leaf, fol.then === 'h5' ? '다가가는 중 · 그만' : `${peerName(o)} 따라가는 중 · 그만`, () => followStop())); } else unchip('fol');
  });
  window.__social = { TUNE, openWheel, doEmote, sitOn, nearSeat, SEATS, h5Ask, followStart, followStop, openCard, phaseAt, questionFor, QS, ZONE, inZone, get seat() { return seat; }, get fol() { return fol; }, get h5Out() { return h5Out; }, sstore };
}
