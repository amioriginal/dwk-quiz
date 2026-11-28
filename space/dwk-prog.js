/* dwk-prog.js — 돈워너노우 「계속 돌아오게 만드는 장치」 한 곳 (광장·게임 4개가 같이 쓴다)
   대표 「중독성 매우 강하게」(2026-11-19). 근거: ../../돈워너노우_게임_20261119/조사_E_세계최고_사이트_중독설계.md
   장치: 레벨·XP · 코인 · 연속 출석(7일 달력) · 오늘의 미션 3개(날짜로 같은 미션) · 캡슐 뽑기(코인만, 확률 공개, 10번에 1번 희귀 이상 보장)
         · 카드 도감(영상 속 행성 = 일반 / 그 행성의 반전 규칙 = 빈틈 카드 / 황금 카드) · 겹친 카드는 별가루 → 원하는 카드로 교환
   선: 현금 결제 없음 · 가짜 마감·가짜 숫자 없음 · 확률은 화면에 그대로 · 저장은 이 기기(서버 켜면 dwk-net 으로 옮김)
   의존: data.js · dwk-core.js(window.DC). 게임은 끝날 때 DP.event('play', { game, score }) 한 줄만 부른다. */
(() => {
  'use strict';
  const DC = window.DC; if (!DC) { console.error('dwk-prog: dwk-core.js 를 먼저 불러야 합니다'); return; }
  const KEY = 'prog';
  const fresh = () => ({ v: 1, xp: 0, lv: 1, coins: 0, dust: 0, tickets: 0, pulls: 0, sincePity: 0,
    streak: { last: null, n: 0, best: 0 }, daily: { day: null, ids: [], got: [0, 0, 0], claimed: [false, false, false], bonus: false },
    cards: {}, first: {}, stats: {}, best: {}, freeze: 1, started: false });
  let S = Object.assign(fresh(), DC.store.get(KEY, {}));
  const save = () => { DC.store.set(KEY, S); subs.forEach(f => { try { f(S); } catch (e) { console.error(e); } }); push(); };
  // ── 서버(있으면): 점수 올리기 · 성장 기록 백업. 서버가 없거나 로그인 전이면 조용히 건너뛴다(이 기기 기록은 그대로) ──
  let netP = null, pushT = 0;
  const getNet = () => (netP ||= window.__dwkNetP ? window.__dwkNetP : window.DWK.world?.backend ? import('./dwk-net.js?v=8').then(m => m.createNet()).catch(e => { console.warn('서버 연결 실패 — 이 기기 기록만 남김', e); return null; }) : Promise.resolve(null));
  function push() { if (!window.DWK.world?.backend) return; clearTimeout(pushT); pushT = setTimeout(() => getNet().then(n => n?.user() && n.prog.save(S)), 2500); }
  const rank = (x) => (x?.lv || 0) * 1e6 + (x?.xp || 0) + (x?.pulls || 0);
  async function pullRemote() { const n = await getNet(); if (!n?.user()) return false; const r = await n.prog.load(); if (r && rank(r) > rank(S)) { S = Object.assign(fresh(), r); DC.store.set(KEY, S); subs.forEach(f => f(S)); return true; } return false; }
  const subs = [];

  // ── 레벨: 다음 레벨까지 필요한 XP = 100 + (레벨-1)×60 (초반엔 빨리, 뒤로 갈수록 천천히) ──
  const need = (lv) => 100 + (lv - 1) * 60;
  const TITLES = ['', '새내기 우주인', '두 번째 밤', '행성 적응 중', '빈틈 사냥꾼', '노련한 우주인', '행성 여행가', '은하 단골', '전설의 우주인'];
  const lvTitle = (lv) => TITLES[Math.min(TITLES.length - 1, Math.floor((lv + 1) / 2))];
  function addXp(n) {
    S.xp += n; const ups = [];
    while (S.xp >= need(S.lv)) { S.xp -= need(S.lv); S.lv++; S.coins += 50; ups.push(S.lv); }
    return ups;
  }

  // ── 오늘의 미션: 날짜로 고르므로 모두 같은 미션을 받는다(친구끼리 「오늘 미션 했어?」) ──
  const Q = {
    play_any: { t: '아무 게임 2판', goal: 2, on: (e) => e.type === 'play' },
    play_merge: { t: '행성 합치기 1판', goal: 1, on: (e) => e.type === 'play' && e.game === 'merge' },
    play_survive: { t: '행성 생존 1판', goal: 1, on: (e) => e.type === 'play' && e.game === 'survive' },
    play_find: { t: '빈틈 찾기 1판', goal: 1, on: (e) => e.type === 'play' && e.game === 'find' },
    play_land: { t: '행성 착륙 1판', goal: 1, on: (e) => e.type === 'play' && e.game === 'land' },
    merge_2000: { t: '행성 합치기 2,000점 넘기기', goal: 1, on: (e) => e.type === 'play' && e.game === 'merge' && e.score >= 2000 },
    survive_120: { t: '행성 생존 120일 버티기', goal: 1, on: (e) => e.type === 'play' && e.game === 'survive' && e.score >= 120 },
    chat_2: { t: '광장에서 2번 말 걸기', goal: 2, on: (e) => e.type === 'chat' },
    capsule_1: { t: '캡슐 1번 뽑기', goal: 1, on: (e) => e.type === 'capsule' },
    hall_1: { t: '명예의 전당 구경하기', goal: 1, on: (e) => e.type === 'visit' && e.place === 'hall' },
  };
  const PLAY_Q = ['play_merge', 'play_survive', 'play_find', 'play_land', 'play_any'];
  function rollDaily() {
    const day = DC.today(); if (S.daily.day === day) return;
    const r = DC.rng(DC.seed('dwk-daily-' + day)); const ids = [PLAY_Q[Math.floor(r() * PLAY_Q.length)]];
    const rest = Object.keys(Q).filter(k => !ids.includes(k));
    while (ids.length < 3) { const k = rest.splice(Math.floor(r() * rest.length), 1)[0]; if (!(ids.some(i => i.startsWith('play_')) && k === 'play_any')) ids.push(k); }
    S.daily = { day, ids, got: [0, 0, 0], claimed: [false, false, false], bonus: false }; save();
  }

  // ── 연속 출석: 하루 한 번. 7일째는 크게(코인 100 + 캡슐 티켓). 하루 빠지면 1일부터 ──
  const DAY_REWARD = [20, 25, 30, 35, 40, 50, 100];
  function checkin() {
    rollDaily(); const day = DC.today(); if (S.streak.last === day) return null;
    const y = new Date(); y.setDate(y.getDate() - 1); const yd = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    const y2 = new Date(); y2.setDate(y2.getDate() - 2); const yd2 = `${y2.getFullYear()}-${String(y2.getMonth() + 1).padStart(2, '0')}-${String(y2.getDate()).padStart(2, '0')}`;
    let saved = false; // 하루 빠졌으면 보호권 1장으로 이어 준다(Duolingo 주말 보호권 근거 — 조사 E)
    if (S.streak.last === yd2 && S.freeze > 0) { S.freeze--; saved = true; }
    S.streak.n = (S.streak.last === yd || saved) ? S.streak.n + 1 : 1; S.streak.last = day;
    if (S.streak.n % 7 === 0) S.freeze = Math.min(2, S.freeze + 1); // 7일 채울 때마다 보호권 +1(최대 2)
    S.streak.best = Math.max(S.streak.best || 0, S.streak.n); // (2026-11-20 버그 수정: 이 문장이 주석 안에 있어 「최고 0일」로 보였다)
    const idx = (S.streak.n - 1) % 7; const coins = DAY_REWARD[idx]; S.coins += coins; const ticket = idx === 6; if (ticket) S.tickets++;
    const ups = addXp(20); save(); return { streak: S.streak.n, idx, coins, ticket, ups, saved };
  }

  // ── 게임 보상: 기본 + 실력 보너스(상한) · 그 게임의 오늘 첫 판은 2배 ──
  const SKILL = { merge: (s) => Math.min(20, Math.floor(s / 400)), survive: (s) => Math.min(20, Math.floor(s / 20)), find: (s) => Math.min(20, Math.floor(s / 150)), land: (s) => Math.min(20, Math.floor(s / 3)) };
  function event(type, data = {}) {
    rollDaily(); const e = { type, ...data }; let coins = 0, xp = 0, firstBonus = false;
    if (type === 'play') {
      const base = 8 + (SKILL[e.game]?.(e.score || 0) || 0); const k = e.game + ':' + DC.today(); firstBonus = !S.first[k];
      S.first[k] = true; coins = base * (firstBonus ? 2 : 1); xp = coins * 2;
      S.stats[e.game] = (S.stats[e.game] || 0) + 1; getNet().then(n => n?.user() && n.scores.submit(e.game, e.score || 0));
      const prevBest = S.best[e.game] || 0; if ((e.score || 0) > prevBest) S.best[e.game] = e.score;
      // 아깝게 진 판엔 「최고까지 N」을 크게 — 근접 실패가 「한 판 더」를 부른다(Clark 2009 · 조사 E)
      e.near = prevBest > 0 && e.score < prevBest ? prevBest - e.score : 0; e.record = prevBest > 0 && e.score > prevBest;
      for (const key of Object.keys(S.first)) if (!key.endsWith(DC.today())) delete S.first[key]; // 어제 기록 정리
    } else if (type === 'chat') xp = 2;
    S.daily.ids.forEach((id, i) => { const q = Q[id]; if (q && q.on(e) && S.daily.got[i] < q.goal) { S.daily.got[i]++; if (S.daily.got[i] === q.goal) toastQuest(q.t); } });
    S.coins += coins; const ups = addXp(xp); save();
    if (coins || xp >= 10) flash([e.record && '신기록!', e.near && e.near <= Math.max(10, (S.best[e.game] || 0) * 0.25) && `최고 기록까지 ${e.near.toLocaleString()}`, xp && `경험치 +${xp}`, coins && `+${coins} 코인`, firstBonus && '오늘 첫 판 2배'].filter(Boolean));
    ups.forEach(levelUp);
    return { coins, xp, ups, firstBonus };
  }
  function claim(i) {
    rollDaily(); const id = S.daily.ids[i], q = Q[id]; if (!q || S.daily.got[i] < q.goal || S.daily.claimed[i]) return null;
    S.daily.claimed[i] = true; S.coins += 40; const ups = addXp(60); let bonus = false;
    if (S.daily.claimed.every(Boolean) && !S.daily.bonus) { S.daily.bonus = true; S.tickets++; bonus = true; }
    save(); DC.sfx('good'); flash(['경험치 +60', '+40 코인', bonus && '미션 3개 다 깼다! 캡슐 티켓 +1'].filter(Boolean)); ups.forEach(levelUp); return { bonus };
  }

  // ── 카드: 영상 속 행성마다 일반 · 빈틈(반전 규칙이 있는 행성만) · 황금 ──
  const CARDS = (() => {
    const out = [];
    for (const p of DC.planets()) {
      out.push({ id: `${p.id}:n`, pid: p.id, tier: 'n', name: p.name, img: p.img, text: p.pitch.split('\n')[0] });
      if (p.rule) out.push({ id: `${p.id}:r`, pid: p.id, tier: 'r', name: `${p.name}의 빈틈`, img: p.img, text: p.rule, spoiler: true });
      out.push({ id: `${p.id}:g`, pid: p.id, tier: 'g', name: `황금 ${p.name}`, img: p.img, text: `${p.ep}편에서 처음 발견된 행성` });
    }
    return out;
  })();
  const ODDS = { n: 0.75, r: 0.2, g: 0.05 }; const TIER_NAME = { n: '일반', r: '빈틈', g: '황금' }; const PRICE = 30, DUST = { n: 5, r: 15, g: 40 }, EXCHANGE = 60;
  function capsule(useTicket = false) {
    if (useTicket) { if (S.tickets < 1) return { ok: false, msg: '캡슐 티켓이 없어' }; S.tickets--; }
    else { if (S.coins < PRICE) return { ok: false, msg: `코인이 ${PRICE - S.coins}개 모자라. 게임 한 판 하고 와!` }; S.coins -= PRICE; }
    S.pulls++; S.sincePity++;
    let roll = Math.random(), tier = roll < ODDS.g ? 'g' : roll < ODDS.g + ODDS.r ? 'r' : 'n';
    if (tier === 'n' && S.sincePity >= 10) tier = 'r'; // 10번에 1번은 빈틈 이상 보장
    if (tier !== 'n') S.sincePity = 0;
    const pool = CARDS.filter(c => c.tier === tier); const card = pool[Math.floor(Math.random() * pool.length)];
    const dup = !!S.cards[card.id]; S.cards[card.id] = (S.cards[card.id] || 0) + 1; if (dup) S.dust += DUST[tier];
    const ups = addXp(15); save(); event('capsule'); ups.forEach(levelUp);
    return { ok: true, card, tier, dup, dust: dup ? DUST[tier] : 0 };
  }
  function exchange(id) { const c = CARDS.find(x => x.id === id); if (!c || S.cards[id] || S.dust < EXCHANGE * (c.tier === 'g' ? 3 : c.tier === 'r' ? 2 : 1)) return false; S.dust -= EXCHANGE * (c.tier === 'g' ? 3 : c.tier === 'r' ? 2 : 1); S.cards[id] = 1; save(); DC.sfx('unlock'); return true; }
  const owned = () => CARDS.filter(c => S.cards[c.id]).length;

  // ── 화면 효과(종이 패널 옷) ──
  // 게임 결과 화면에서는 점수·등급·버튼을 가리지 않도록 보상 칩·레벨업을 화면 맨 아래(가로 화면은 오른쪽 아래 세로 줄)에 모아 띄운다.
  // 광장(body.world)은 기존처럼 위쪽. 칩은 눌림을 막지 않고(pointer-events:none), 레벨업·「광장에서 보상 받기」만 눌린다.
  const css = `.dp-stack{position:fixed;left:50%;bottom:calc(10px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;width:max-content;max-width:94vw}
body.world .dp-stack{bottom:auto;top:calc(120px + env(safe-area-inset-top))}
.dp-flash{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}\n.dp-one b{white-space:nowrap;max-width:92vw;overflow:hidden;text-overflow:ellipsis}
.dp-flash b,.dp-flash a{font:700 13px/1 'Galmuri11',Pretendard,sans-serif;color:#1f1a2e;background:#ffcf3a;border:2.5px solid #1f1a2e;border-radius:8px;box-shadow:0 3px 0 #1f1a2e;padding:7px 9px 6px;animation:dpIn .5s cubic-bezier(.2,1.6,.4,1) both}
.dp-flash a{pointer-events:auto;text-decoration:none;background:#fff4dc;min-height:44px;display:inline-flex;align-items:center;padding:0 12px}
.dp-flash b:nth-child(2){animation-delay:.08s;background:#7fd8ff}.dp-flash b:nth-child(3){animation-delay:.16s;background:#ff6f91}
@keyframes dpIn{from{transform:translateY(24px) scale(.6);opacity:0}}
body.world .dp-flash b{animation-name:dpInTop}@keyframes dpInTop{from{transform:translateY(-24px) scale(.6);opacity:0}}
.dp-lv{pointer-events:auto;display:flex;align-items:center;gap:10px;min-height:44px;background:#fff4dc;color:#1f1a2e;border:3px solid #1f1a2e;border-radius:12px;box-shadow:0 3px 0 #1f1a2e;padding:4px 14px;font:700 13px/1.2 'Galmuri11',Pretendard,sans-serif;white-space:nowrap;cursor:pointer;animation:dpPop .55s cubic-bezier(.2,1.7,.4,1) both}
.dp-lv strong{font-size:24px;line-height:1}.dp-lv small{display:block;font-size:11px;color:#7a6f86;margin-top:2px}
@keyframes dpPop{from{transform:scale(.4)}}
@media (orientation:landscape) and (max-height:520px){body:not(.world) .dp-stack{left:auto;right:8px;transform:none;align-items:flex-end;bottom:calc(8px + env(safe-area-inset-bottom))}body:not(.world) .dp-flash{flex-direction:column;align-items:flex-end;flex-wrap:nowrap}.dp-flash b,.dp-flash a{font-size:12px;padding:5px 7px 4px}.dp-flash a{min-height:44px}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
  const inWorld = () => document.body.classList.contains('world');
  const stack = () => document.querySelector('.dp-stack') || document.body.appendChild(DC.el('div', { class: 'dp-stack' }));
  const tidy = () => { const s = document.querySelector('.dp-stack'); if (s && !s.children.length) s.remove(); };
  function flash(lines, link) {
    if (!lines.length) return;
    if (!inWorld()) { // 11-28 게임 화면: 칩 여러 개가 끝 화면을 덮는다(검수 4게임 공통 지적) → 한 줄 하나만, 앞의 것은 지우고 조용히
      document.querySelectorAll('.dp-flash').forEach(x => x.remove());
      const d = DC.el('div', { class: 'dp-flash dp-one', role: 'status' }, DC.el('b', {}, lines.join(' · ')));
      stack().append(d); setTimeout(() => { d.remove(); tidy(); }, 2200); return;
    }
    const kids = lines.map(l => DC.el('b', {}, l));
    const withLink = link && !inWorld();
    if (withLink && inWorld()) kids.push(DC.el('a', { href: 'world.html?from=prog' }, '광장에서 보상 받기 ▸')); // 11-28 광장 잠금(탑승 3만 명 전) — 게임 화면에선 잠긴 광장으로 보내지 않는다
    const d = DC.el('div', { class: 'dp-flash', role: 'status' }, kids); stack().append(d); setTimeout(() => { d.remove(); tidy(); }, withLink ? 5200 : 2400);
  }
  function levelUp(lv) {
    if (!inWorld()) { DC.sfx('unlock'); flash([`레벨 ${lv} · ${lvTitle(lv)}`]); return; } // 게임 화면은 한 줄로(끝 화면을 가리지 않게)
    DC.sfx('win'); DC.buzz([30, 50, 30, 50, 60]);
    document.querySelectorAll('.dp-lv').forEach(x => x.remove());
    const d = DC.el('button', { class: 'dp-lv', type: 'button', role: 'status', onclick: () => { d.remove(); tidy(); } }, DC.el('strong', {}, `레벨 ${lv}`), DC.el('span', {}, `레벨 업! ${lvTitle(lv)}`, DC.el('small', {}, '+50 코인 · 눌러서 닫기')));
    stack().prepend(d); setTimeout(() => { d.remove(); tidy(); }, 3200);
  }
  function toastQuest(t) { DC.sfx('unlock'); inWorld() ? flash(['미션 완료!', t, '오른쪽 「미션」에서 보상 받기'], true) : flash([`미션 완료 · ${t}`]); }

  // 도감은 처음부터 2칸 채워 준다(출발 진척 효과 · 조사 E) — 가장 최근 편의 일반 카드 2장
  if (!S.started) { S.started = true; CARDS.filter(c => c.tier === 'n').slice(0, 2).forEach(c => { S.cards[c.id] = 1; }); S.coins += 30; DC.store.set(KEY, S); }
  rollDaily();
  window.DP = {
    get s() { return S; }, need, lvTitle, checkin, event, claim, capsule, exchange, owned, CARDS, ODDS, TIER_NAME, PRICE, EXCHANGE, DAY_REWARD, flash,
    quests: () => { rollDaily(); return S.daily.ids.map((id, i) => ({ id, t: Q[id].t, goal: Q[id].goal, got: S.daily.got[i], claimed: S.daily.claimed[i] })); },
    onChange: (f) => subs.push(f), pullRemote,
    spend(n, why = '') { if (S.coins < n) return false; S.coins -= n; save(); return true; }, // 상점(world-pets.js) 등
    give(n) { S.coins += n; save(); }, // 광장 이벤트 보상(운석 줍기 등)
    reset: () => { S = fresh(); save(); }, // 시험용
  };
})();
