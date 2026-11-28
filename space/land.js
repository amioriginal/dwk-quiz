/* land.js — 행성 착륙 (원버튼 아케이드)
   1부: 순수 로직 Land (DOM 없음 · node 로 시험 가능 · 고정 시간 간격)
   2부: 화면(Canvas 2D) — window.DC(dwk-core.js)가 있을 때만
   2026-11-28 게임판 디벨롭: 돈워너노우호 그림 · 빛이 고정된 행성 · 착륙 표지(완벽 착륙) · 빠른 낙하 · 착륙/폭발/행성 이동 연출 · 합성 효과음 · 난이도 곡선 */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const FF = '"Pretendard Variable", Pretendard, system-ui, sans-serif';
  const STEP = 1 / 120;            // 고정 시간 간격(초) — 프레임 속도와 무관
  const CAPW = 0.11;               // 우주선 반쪽 폭(라디안) — 겹침 판정
  const CAPR = 0.11;               // 우주선 반지름(행성 반지름=1 기준)
  const PADW = 0.085;              // 착륙 표지 반쪽 폭(라디안) — 여기 앉으면 「완벽」
  const HOVER_Y = -1.62, GRAV = 16, V0 = 2.4; // 누르는 순간 바로 떨어진다(약 0.14초)
  const LIVES = 3;                 // 7차: 목숨 3개(작은 우주선 아이콘) — 쾅 하면 하나 잃고 0이면 끝
  const TAKENW = 2 * CAPW;         // 이미 앉은 우주선 자리(양쪽 반쪽 폭) — 여기 떨어지면 부딪힌다. 화면에도 이 폭 그대로 빨갛게 칠한다(2차)
  // 연출이 실제 시간에 더하는 몫(초) — 난이도 실측(landbots.mjs)이 한 판 길이에 더한다
  const FX_TIME = { land: 0.07, perfect: 0.3, fail: 0.67, crash: 0.67 };
  // 7차(2026-11-29 · 총괄 지시 「설계를 줄인다」): 규칙은 색 셋뿐 — 초록 = 앉기 · 빨강/먼저 앉은 자리 = 쾅 · 금색 = 완벽.
  //  연료·과열·배율을 뺐다. 기다리면 손해는 「우주선마다 약 3초 카운트다운」 하나 — 다 되면 저절로 떨어진다.
  //  점수 = 앉은 우주선 수(완벽은 2점). 완벽 3연속이면 목숨 +1(최대 3).
  const TIMER = { base: 2.6, perStage: 0.1, min: 1.8 };

  const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
  const angDiff = (a, b) => { const d = Math.abs(norm(a) - norm(b)); return d > Math.PI ? TAU - d : d; };

  const CFG = {
    '1-1': { speed: 1.0, gaps: 2 }, '1-2': { speed: 0.95, gaps: 2 }, '1-3': { speed: 1.1, gaps: 3 }, '1-4': { speed: 0.9, gaps: 2 },
    '2-1': { speed: 1.1, gaps: 2 }, '2-2': { speed: 1.2, gaps: 3 }, '2-3': { speed: 1.15, gaps: 3 }, '3-1': { speed: 0.95, gaps: 2 },
    '3-2': { speed: 1.0, gaps: 2 }, '3-3': { speed: 0.85, gaps: 3 }, '4-1': { speed: 1.05, gaps: 2 }, '4-2': { speed: 1.1, gaps: 3 },
  };
  const cfgOf = (id) => CFG[id] || { speed: 1, gaps: 2 };

  // 난이도 곡선 — 한 곳에서 정한다. 첫 행성은 흔들림 없이 「도는 행성 + 한 번 누름」만, 셋째 행성부터 우주선이 좌우로 흔들린다.
  function stageParams(stage, cfg) {
    return {
      need: [3, 4, 4, 5][Math.min(stage, 3)],
      speed: Math.min(2.6, (1.1 + 0.09 * stage) * cfg.speed),
      dir: stage % 2 === 0 ? 1 : -1,
      gaps: stage < 1 ? 2 : stage < 3 ? 3 : 4,          // 7차: 목숨 3개로 돌아와 첫 행성은 빨강 2곳으로 시작
      gapW: Math.min(0.95, 0.68 + 0.045 * stage),
      amp: stage < 2 ? 0 : Math.min(0.7, 0.26 + 0.07 * (stage - 2)),
      swayW: 1.5 + 0.1 * stage,
      timer: Math.max(TIMER.min, TIMER.base - TIMER.perStage * stage),
    };
  }

  const defSeed = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const defRng = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  function makeZones(rand, stage, cfg) {
    const P = stageParams(stage, cfg), n = P.gaps;
    let gapW = P.gapW; const MIN_SAFE = 0.7;
    if (TAU - n * gapW < n * MIN_SAFE) gapW = (TAU - n * MIN_SAFE) / n;
    const safeTotal = TAU - n * gapW;
    const ws = Array.from({ length: n }, () => 0.6 + rand() * 0.8);
    const sum = ws.reduce((a, b) => a + b, 0);
    let a = rand() * TAU; const zones = [];
    for (let i = 0; i < n; i++) {
      const sw = safeTotal * ws[i] / sum;
      zones.push({ a0: norm(a), w: sw, type: 'safe', side: rand() < 0.5 ? 0 : 1 }); a += sw;
      zones.push({ a0: norm(a), w: gapW, type: 'gap' }); a += gapW;
    }
    return zones;
  }
  // 금색 표지는 빨강 바로 옆(빨강 끝에서 0.13라디안) — 완벽을 노리면 빨강에 가까워진다 = 위험 감수 보상
  const PAD_OFF = 0.13;
  const makePads = (zones) => zones.filter(z => z.type === 'safe' && z.w >= 0.45).map(z => ({ a: norm(z.side ? z.a0 + z.w - PAD_OFF : z.a0 + PAD_OFF), used: false }));

  function classify(a, zones, landed) {
    for (const l of landed) if (angDiff(a, l) < TAKENW) return 'crash';
    for (const z of zones) if (norm(a - z.a0) < z.w) return z.type;
    return 'gap';
  }
  const contactAngle = (dx) => Math.asin(Math.max(-1, Math.min(1, dx)));

  function createSim(o) {
    o = o || {};
    const seedFn = o.seedFn || defSeed, rngF = o.rngF || defRng;
    const ids = (o.planetIds && o.planetIds.length) ? o.planetIds.slice() : ['1-1'];
    const seedStr = o.seedStr || ('free|' + Math.floor(Math.random() * 1e9));
    const offset = o.daily ? seedFn(seedStr) % ids.length : 0;
    const s = {
      daily: !!o.daily, seedStr, ids, offset, stage: 0, planetId: null, zones: [], pads: [], landed: [],
      need: 3, hits: 0, rot: 0, dir: 1, speed: 1, t: 0, ht: 0, amp: 0, swayW: 1.6, lives: LIVES, timer: TIMER.base,
      score: 0, combo: 0, bestCombo: 0, perfects: 0, pstreak: 0, bestPstreak: 0, landings: 0, autos: 0, drops: [], phase: 'hover', dx: 0, y: HOVER_Y, vy: 0, wait: 0, pendingTap: false,
      stageFails: 0, perfectStages: 0, over: false, why: null, lastLand: null, clearing: false, ship: 0,
    };
    function setupStage() {
      s.planetId = ids[(offset + s.stage) % ids.length];
      const cfg = cfgOf(s.planetId), P = stageParams(s.stage, cfg);
      s.zones = makeZones(rngF(seedFn(seedStr + '|' + s.stage)), s.stage, cfg); s.pads = makePads(s.zones);
      s.landed = []; s.hits = 0; s.stageFails = 0;
      s.need = P.need; s.speed = P.speed; s.dir = P.dir; s.amp = P.amp; s.swayW = P.swayW; s.timer = P.timer;
      s.rot = norm(rngF(seedFn(seedStr + '|r' + s.stage))() * TAU);
    }
    setupStage();

    const sim = {
      s, tap() { if (!s.over && s.phase === 'hover') s.pendingTap = true; },
      step(dt) {
        const ev = [];
        if (s.over) return ev;
        s.t += dt; s.rot = norm(s.rot + s.dir * s.speed * dt);
        if (s.phase === 'hover') {
          s.ht += dt; s.dx = s.amp * Math.sin(s.swayW * s.ht); s.y = HOVER_Y; s.vy = 0;
          const auto = !s.pendingTap && s.ht >= s.timer; // 카운트다운이 다 되면 저절로 떨어진다
          if (s.pendingTap || auto) { s.pendingTap = false; s.phase = 'fall'; s.vy = V0; s.auto = auto; if (auto) s.autos++; ev.push({ type: 'drop', auto }); }
        } else if (s.phase === 'fall') {
          s.vy += GRAV * dt; s.y += s.vy * dt;
          const surf = -Math.sqrt(Math.max(0, 1 - s.dx * s.dx));
          if (s.y + CAPR >= surf) {
            const a = norm(contactAngle(s.dx) - s.rot);
            const res = classify(a, s.zones, s.landed);
            s.lastLand = { a, dx: s.dx, res };
            if (res === 'safe') {
              const pad = s.auto ? null : s.pads.find(p => !p.used && angDiff(a, p.a) < PADW), perfect = !!pad; // 저절로 떨어진 우주선은 점수 0 · 완벽 없음
              if (pad) pad.used = true;
              for (const p of s.pads) if (!p.used && angDiff(a, p.a) < 2 * CAPW) p.used = true;
              const gain = s.auto ? 0 : perfect ? 2 : 1;
              s.landings++; s.hits++; s.landed.push(a); s.score += gain; s.combo++; s.ship++;
              if (perfect) { s.perfects++; s.pstreak++; if (s.pstreak > s.bestPstreak) s.bestPstreak = s.pstreak; } else s.pstreak = 0;
              if (s.combo > s.bestCombo) s.bestCombo = s.combo;
              s.drops.push(true);
              ev.push({ type: 'land', a, gain, combo: s.combo, perfect, pstreak: s.pstreak, auto: s.auto });
              if (perfect && s.pstreak % 3 === 0 && s.lives < LIVES) { s.lives++; ev.push({ type: 'heal', lives: s.lives }); }
              if (s.hits >= s.need) {
                const clean = s.stageFails === 0; if (clean) s.perfectStages++;
                const nid = ids[(offset + s.stage + 1) % ids.length], NP = stageParams(s.stage + 1, cfgOf(nid));
                ev.push({ type: 'clear', stage: s.stage, perfect: clean, next: nid, nextRot: norm(rngF(seedFn(seedStr + '|r' + (s.stage + 1)))() * TAU), nextSpin: NP.dir * NP.speed });
                s.phase = 'wait'; s.wait = 1.35; s.clearing = true;
              } else { s.phase = 'wait'; s.wait = 0.24; s.clearing = false; }
            } else {
              s.lives--; s.stageFails++; s.combo = 0; s.pstreak = 0; s.drops.push(false); s.ship++;
              ev.push({ type: res === 'crash' ? 'crash' : 'fail', a, dx: s.dx, lives: s.lives });
              if (s.lives <= 0) { s.over = true; s.phase = 'over'; s.why = res; ev.push({ type: 'over', why: res }); }
              else { s.phase = 'wait'; s.wait = 0.6; s.clearing = false; }
            }
          }
        } else if (s.phase === 'wait') {
          s.wait -= dt;
          if (s.wait <= 0) {
            if (s.clearing) { s.stage++; setupStage(); ev.push({ type: 'stage', stage: s.stage, planetId: s.planetId }); }
            s.clearing = false; s.phase = 'hover'; s.ht = 0; ev.push({ type: 'spawn' });
          }
        }
        return ev;
      },
    };
    return sim;
  }
  function predict(s) {
    const c = createSim({ planetIds: s.ids, seedStr: s.seedStr }); Object.assign(c.s, JSON.parse(JSON.stringify(s)));
    c.s.pendingTap = false; c.s.lives = 99; c.tap();
    for (let i = 0; i < 240; i++) { const e = c.step(STEP); const h = e.find(x => x.type === 'land' || x.type === 'fail' || x.type === 'crash'); if (h) return h; }
    return { type: 'none' };
  }

  const Land = { TAU, STEP, CAPW, CAPR, PADW, TAKENW, LIVES, TIMER, PAD_OFF, CFG, FX_TIME, cfgOf, stageParams, norm, angDiff, makeZones, makePads, classify, contactAngle, createSim, predict };
  if (typeof module !== 'undefined' && module.exports) module.exports = Land;
  else root.Land = Land;

  /* ───────────── 2부: 화면 ───────────── */
  if (typeof window === 'undefined' || !window.DC || typeof document === 'undefined') return;
  const DC = window.DC, D = window.DWK, el = DC.el;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cvs = document.getElementById('game'), ctx = cvs.getContext('2d'), ui = document.getElementById('ui');
  DC.stars(document.getElementById('stars'));

  const ACH = {
    first10: '착륙 10회', combo5: '콤보 5', combo10: '콤보 10', stage3: '세 번째 행성 도착', perfect: '실패 없이 행성 클리어', daily: '오늘의 행성 도전',
  };
  const award = (id) => { try { if (DC.endings.add('land', id, ACH[id])) DC.toast(`업적 · ${ACH[id]}`); } catch (e) { /* 업적 저장 실패는 게임을 멈추지 않는다 */ } };

  // ── 소리: Web Audio 합성(파일 없음) · 소리 끄기는 DC.sfx 설정을 그대로 따른다 ──
  const AU = { c: null, out: null, nb: null };
  function au() {
    if (!(DC.sfx.on ? DC.sfx.on() : true)) return null;
    try {
      if (!AU.c) {
        const c = AU.c = new (window.AudioContext || window.webkitAudioContext)();
        const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
        AU.out = c.createGain(); AU.out.gain.value = 0.55; AU.out.connect(comp);
        AU.nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = AU.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (AU.c.state === 'suspended') AU.c.resume();
      return AU.c;
    } catch { return null; }
  }
  function osc(c, type, f0, f1, t0, dur, vol, att = 0.004) {
    const o = c.createOscillator(), g = c.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(AU.out); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(c, t0, dur, vol, ftype, f0, f1, q = 0.8) {
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); n.buffer = AU.nb;
    f.type = ftype; f.Q.value = q; f.frequency.setValueAtTime(f0, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f).connect(g).connect(AU.out); n.start(t0, Math.random() * 0.5); n.stop(t0 + dur + 0.03);
  }
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
  const SND = {
    drop: (c, t) => { noise(c, t, 0.16, 0.22, 'bandpass', 2400, 500, 1.2); osc(c, 'square', 720, 260, t, 0.05, 0.035); },
    land: (c, t, k) => { osc(c, 'sine', 170, 52, t, 0.2, 0.55); noise(c, t, 0.09, 0.12, 'lowpass', 900, 200); osc(c, 'triangle', SCALE[k], 0, t + 0.01, 0.28, 0.16); osc(c, 'sine', SCALE[k] * 2, 0, t + 0.01, 0.16, 0.04); },
    perfect: (c, t, k) => { SND.land(c, t, k); const f = SCALE[Math.min(SCALE.length - 1, k + 2)]; osc(c, 'sine', f * 2, 0, t + 0.06, 0.7, 0.11, 0.01); osc(c, 'sine', f * 3, 0, t + 0.1, 0.5, 0.05, 0.01); noise(c, t + 0.04, 0.25, 0.05, 'highpass', 6000); },
    fail: (c, t) => { noise(c, t, 0.7, 0.7, 'lowpass', 1600, 120); osc(c, 'sine', 95, 32, t, 0.55, 0.6); osc(c, 'sawtooth', 160, 60, t + 0.02, 0.3, 0.05); },
    crash: (c, t) => { osc(c, 'square', 330, 250, t, 0.22, 0.07); osc(c, 'square', 349, 262, t, 0.22, 0.06); noise(c, t, 0.5, 0.55, 'lowpass', 2200, 150); osc(c, 'sine', 90, 35, t, 0.45, 0.5); },
    heal: (c, t) => [660, 880, 1320].forEach((f, i) => osc(c, 'sine', f, 0, t + i * 0.07, 0.25, 0.12)),
    clear: (c, t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => osc(c, 'triangle', f, 0, t + i * 0.075, 0.3, 0.13)); noise(c, t + 0.2, 0.9, 0.2, 'bandpass', 300, 2600, 1.5); },
    over: (c, t) => [392, 330, 262, 196].forEach((f, i) => osc(c, 'triangle', f, f * 0.97, t + i * 0.16, 0.36, 0.13)),
    spawn: (c, t) => osc(c, 'sine', 1400, 1900, t, 0.05, 0.025),
  };
  const snd = (name, k = 0) => { const c = au(); if (c) try { SND[name](c, c.currentTime + 0.005, Math.max(0, Math.min(SCALE.length - 1, k))); } catch { /* 소리 없이 진행 */ } };

  // ── 화면 배치 ──
  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 100;
  let idle = true; // 시작·끝 화면: 행성을 글 반대편으로(폰 = 위, 컴퓨터·가로 = 오른쪽)
  function fit() {
    DPR = Math.min(devicePixelRatio || 1, 3); W = innerWidth; H = innerHeight;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    // 게임 중: 점수판 아래 ~ 화면 아래 60px 사이에 「떠 있는 우주선 + 행성 + 콤보」가 다 들어가게(위 2.25R · 아래 1.2R)
    // 3차: 점수판이 커졌고(HUD_H) 점수판과 우주선 사이 띠에 알림이 앉는다 — 위 여유 164→180, 높이 몫 3.45→3.5(폰 390×844는 R이 폭으로 정해져 그대로)
    const hb = (document.body.classList.contains('l-play') ? 100 : 140), avail = Math.max(200, H - 40 - hb); // 7차: 머리 줄이 숨으면 위 여유 100 // 6차: 계기판이 한 줄이 되어 위 여유 180 → 140
    R = Math.min(W * 0.37, H * 0.27, avail / 3.3); cx = W / 2; cy = Math.max(hb + 2.25 * R, Math.min(H - 1.25 * R - 30, 0.45 * H + R)); // 7차 검수 6회: 행성 꼭대기(착지점)를 화면 높이 45%에 // 검수 1회: 앉은 우주선이 화면 옆에서 잘렸다(1.49R > 반폭) → 0.36W → 0.31W
    if (idle) {
      if (W >= 900 || W > H * 1.3) { R = Math.min(W * 0.2, H * 0.26); cx = W * 0.7; cy = H * 0.55; }
      else { R = Math.min(W * 0.32, H * 0.19); cy = H * 0.31; }
    }
    shadeCache = null; if (typeof sprites !== 'undefined') sprites.clear();
  }
  addEventListener('resize', fit);

  // ── 행성 그림: 기존 3D 렌더(img/) · 그림 속 행성 원을 찾아 꽉 맞추고, 빛은 화면에 고정(행성만 돈다) ──
  const imgs = {}, meta = {};
  const getImg = (src) => {
    if (!src) return null; if (imgs[src]) return imgs[src];
    const im = new Image(); im.src = src; imgs[src] = im; im.onload = () => { if (!(meta[src] && meta[src].fixed)) analyse(src, im); }; return im;
  };
  function analyse(src, im) { // 행성 원(중심·반지름)과 대표 색을 잰다 — 그림 아래 편 번호 글자·후광에 끌려가지 않게 「폭」과 「위쪽 끝」만 쓴다
    try {
      const N = 120, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(im, 0, 0, N, N); const d = x.getImageData(0, 0, N, N).data, lum = (k) => d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11;
      const mid = []; for (let y = N * 0.4 | 0; y < N * 0.6; y++) for (let i = N * 0.4 | 0; i < N * 0.6; i++) mid.push(lum((y * N + i) * 4)); mid.sort((p, q) => p - q);
      const T = Math.max(40, mid[mid.length >> 1] * 0.4);
      const rows = new Array(N).fill(0), cols = new Array(N).fill(0); let r = 0, g = 0, b = 0, n = 0;
      for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) { const k = (y * N + i) * 4; if (lum(k) > T) { rows[y]++; cols[i]++; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; } }
      const th = N * 0.1, x0 = cols.findIndex(v => v > th), x1 = N - 1 - [...cols].reverse().findIndex(v => v > th), y0 = rows.findIndex(v => v > th), y1 = N - 1 - [...rows].reverse().findIndex(v => v > th);
      const rw = (x1 - x0 + 1) / 2 / N, rh = (y1 - y0 + 1) / 2 / N, u = (x0 + x1 + 1) / 2 / N;
      // 키가 더 크면(아래 글자·후광) 폭에 맞추고 위 끝에서 잰다 · 옆으로 넓으면(도넛·TV) 키에 맞춰 원을 꽉 채운다
      let rad = rh >= rw ? rw : rh, v = rh >= rw ? y0 / N + rw : (y0 + y1 + 1) / 2 / N;
      if (x0 < 0 || y0 < 0 || rad < 0.25 || rad > 0.53) { rad = 0.46; v = 0.5; }
      meta[src] = { u, v, rad: rad * 0.975, col: n ? [r / n, g / n, b / n].map(Math.round) : [120, 140, 200] };
    } catch { meta[src] = { u: 0.5, v: 0.5, rad: 0.44, col: [120, 140, 200] }; }
  }
  const colOf = (src, a = 1, lift = 0) => { const c = (meta[src] && meta[src].col) || [140, 160, 220]; return `rgba(${c.map(v => Math.round(Math.max(0, Math.min(255, lift >= 0 ? v + (255 - v) * lift : v * (1 + lift))))).join(',')},${a})`; };
  let shadeCache = null; // 고정 빛(왼쪽 위에서) · 그림자 · 대기 — 반지름마다 한 번만 그린다
  function shadeLayer(r) {
    if (shadeCache && shadeCache.r === r) return shadeCache.c;
    const S = Math.ceil(r * 3.2), c = document.createElement('canvas'); c.width = c.height = Math.ceil(S * DPR); const x = c.getContext('2d'); x.scale(DPR, DPR); const o = S / 2;
    let g = x.createRadialGradient(o - r * 0.38, o - r * 0.42, r * 0.1, o - r * 0.1, o - r * 0.1, r * 1.25);
    g.addColorStop(0, 'rgba(255,248,230,0.20)'); g.addColorStop(0.35, 'rgba(255,248,230,0)'); g.addColorStop(0.62, 'rgba(0,0,8,0.10)'); g.addColorStop(0.9, 'rgba(0,0,12,0.62)'); g.addColorStop(1, 'rgba(0,0,12,0.82)');
    x.beginPath(); x.arc(o, o, r, 0, TAU); x.fillStyle = g; x.fill();
    g = x.createRadialGradient(o, o, r * 0.86, o, o, r); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,0.45)'); x.fillStyle = g; x.fill(); // 가장자리 두께감
    shadeCache = { r, c, S }; return c;
  }
  // 4차(2026-11-28): 흰 행성(온천)은 대기 빛까지 흰색이라 날아갈 때 가장자리가 흰 안개로 뭉개졌다 → 밝은 행성일수록 대기 빛을 줄이고 밝힘(lift)을 뺀다.
  //  가장자리는 얇은 어두운 테로 또렷하게. 그림자 층은 반지름이 바뀔 때마다 새로 그리던 것(행성 이동 중 매 프레임 큰 캔버스 생성) → 한 번 그린 것을 늘려 쓴다.
  const lumOf = (src) => { const c = (meta[src] && meta[src].col) || [140, 160, 220]; return c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; };
  function drawPlanet(c, src, x, y, r, rot, alpha = 1, o = {}) {
    const im = getImg(src), m = meta[src], bright = Math.max(0, Math.min(1, (lumOf(src) - 135) / 75)), gk = (o.glow ?? 1) * (1 - 0.7 * bright), lf = 1 - bright;
    c.save(); c.globalAlpha = alpha;
    const ag = c.createRadialGradient(x, y, r * 0.95, x, y, r * 1.5); ag.addColorStop(0, colOf(src, 0.42 * gk, 0.35 * lf)); ag.addColorStop(0.35, colOf(src, 0.12 * gk, 0.2 * lf)); ag.addColorStop(1, colOf(src, 0, 0)); // 대기 빛
    c.fillStyle = ag; c.beginPath(); c.arc(x, y, r * 1.5, 0, TAU); c.fill();
    c.save(); c.translate(x, y); c.beginPath(); c.arc(0, 0, r * (m && m.full ? 1.02 : 1), 0, TAU); c.fillStyle = colOf(src, 1, -0.4); c.fill(); c.clip(); c.rotate(rot); // 5차: 3D 행성 세트는 돌출(나무·산)이 원 밖으로 나와서 자르지 않는다
    if (im && im.complete && im.naturalWidth && m) { const sc = r / (m.rad * im.naturalWidth); c.drawImage(im, -m.u * im.naturalWidth * sc, -m.v * im.naturalHeight * sc, im.naturalWidth * sc, im.naturalHeight * sc); }
    c.restore();
    if (c === ctx) {
      const sh = shadeLayer(R), S = shadeCache.S * r / R; c.drawImage(sh, x - S / 2, y - S / 2, S, S);
      if (!idle && m && m.full) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = 'rgba(0,0,14,.3)'; c.fill(); } // 검수 1회: 표면이 바빠 고리가 묻혔다 → 게임 중에는 행성 몸통을 한 톤 낮춘다
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = Math.max(1, r * 0.012); c.strokeStyle = `rgba(0,0,12,${0.35 + 0.3 * bright})`; c.stroke();
    }
    c.restore();
  }

  // ── 돈워너노우호 — 2차(2026-11-28): 외곽선 만화 스프라이트 → 행성과 같은 빛을 받는 금속 우주선 ──
  //  행성 그림자 층과 같은 광원(화면 왼쪽 위)에서 빛을 받는다. 몸통·머리·띠는 원통 음영 + 반사광, 창은 유리 반사, 이음선·리벳.
  //  행성 뒤편(빛 반대쪽)에 앉은 우주선은 그만큼 어두워진다(o.dark). 그림은 빛 방향·어둡기별로 한 번만 그려 둔다(sprite 캐시).
  const INK = '#1f1a2e';
  const LIGHT = [-0.6, -0.8];          // 화면 기준 빛이 오는 쪽(왼쪽 위) — shadeLayer와 같다
  const hexc = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const tone = (h, k) => { const c = hexc(h); return `rgb(${c.map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))).join(',')})`; }; // k>0 밝게 · k<0 어둡게
  const sprites = new Map();
  function shipSprite(h, lx, dark, win) {
    const key = `${Math.round(h * 2)}|${lx.toFixed(1)}|${dark.toFixed(2)}|${win || ''}`; let sp = sprites.get(key);
    if (sp) return sp;
    if (sprites.size > 240) sprites.clear();
    const u = h / 2.6, Wd = 2.5 * u, Ht = 3.0 * u, dpr = Math.max(1, DPR || 1), cv = document.createElement('canvas');
    cv.width = Math.ceil(Wd * dpr); cv.height = Math.ceil(Ht * dpr); const c = cv.getContext('2d'); c.scale(dpr, dpr); c.translate(Wd / 2, Ht - 0.2 * u);
    const hp = Math.max(0.16, Math.min(0.84, 0.5 + 0.34 * lx)), dk = dark;
    // 원통 음영: 빛 쪽 반사광 → 가운데 본색 → 반대쪽 그림자 → 가장자리 되비침(행성 대기 빛)
    const cyl = (x0, x1, base, spec = 0.62, metal = false) => {
      const g = c.createLinearGradient(x0, 0, x1, 0), far = lx < 0 ? 1 : 0, sd = (p) => (far ? p : 1 - p);
      g.addColorStop(0, tone(base, -Math.min(0.92, (far ? 0.18 : 0.62) + dk)));
      g.addColorStop(Math.max(0.03, hp - 0.24), tone(base, -Math.min(0.9, 0.06 + dk)));
      g.addColorStop(hp, tone(base, spec * (1 - dk) - dk * 0.6));
      if (metal) { g.addColorStop(Math.min(0.97, hp + 0.07), tone(base, -Math.min(0.9, 0.22 + dk))); g.addColorStop(Math.min(0.98, hp + 0.16), tone(base, 0.1 * (1 - dk) - dk * 0.7)); }
      g.addColorStop(Math.min(0.985, sd(0.84)), tone(base, -Math.min(0.94, 0.5 + dk)));
      g.addColorStop(1, tone(base, -Math.min(0.9, (far ? 0.62 : 0.18) + dk) + 0.12));
      return g;
    };
    const edge = () => { c.lineWidth = Math.max(0.6, u * 0.045); c.strokeStyle = `rgba(8,6,16,${0.55 + 0.3 * dk})`; c.stroke(); };
    // 날개(다리 겸) — 빛 반대쪽 날개는 그늘
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 0.56 * u, -1.08 * u); c.quadraticCurveTo(s * 1.0 * u, -0.62 * u, s * 1.08 * u, -0.02 * u); c.lineTo(s * 0.86 * u, 0); c.lineTo(s * 0.55 * u, -0.36 * u); c.closePath();
      const lit = (s < 0) === (lx < 0), g = c.createLinearGradient(s * 0.5 * u, -1.0 * u, s * 1.05 * u, 0);
      g.addColorStop(0, tone('#ff6f91', (lit ? 0.18 : -0.38) * (1 - dk) - dk * 0.7)); g.addColorStop(1, tone('#d8486c', (lit ? -0.05 : -0.55) - dk * 0.6));
      c.fillStyle = g; c.fill(); edge();
    }
    // 분사구 — 어두운 강철 종
    c.beginPath(); c.moveTo(-0.33 * u, -0.44 * u); c.lineTo(0.33 * u, -0.44 * u); c.quadraticCurveTo(0.4 * u, -0.2 * u, 0.5 * u, -0.06 * u); c.lineTo(-0.5 * u, -0.06 * u); c.quadraticCurveTo(-0.4 * u, -0.2 * u, -0.33 * u, -0.44 * u); c.closePath();
    c.fillStyle = cyl(-0.5 * u, 0.5 * u, '#59617a', 0.55, true); c.fill(); edge();
    c.beginPath(); c.ellipse(0, -0.06 * u, 0.5 * u, 0.09 * u, 0, 0, TAU); c.fillStyle = tone('#1a1d2a', -dk * 0.5); c.fill();
    // 몸통 — 크림색 도장 금속
    c.beginPath(); c.moveTo(-0.72 * u, -0.4 * u); c.lineTo(0.72 * u, -0.4 * u); c.lineTo(0.62 * u, -1.7 * u); c.lineTo(-0.62 * u, -1.7 * u); c.closePath();
    c.fillStyle = cyl(-0.72 * u, 0.72 * u, '#f1e6cf', 0.7); c.fill();
    c.save(); c.clip();
    let g = c.createLinearGradient(0, -0.4 * u, 0, -0.75 * u); g.addColorStop(0, `rgba(30,20,10,${0.38 + 0.2 * dk})`); g.addColorStop(1, 'rgba(30,20,10,0)'); c.fillStyle = g; c.fillRect(-u, -0.8 * u, 2 * u, 0.4 * u); // 아래 그늘(날개 틈)
    g = c.createLinearGradient(0, -1.7 * u, 0, -1.5 * u); g.addColorStop(0, 'rgba(30,20,10,.32)'); g.addColorStop(1, 'rgba(30,20,10,0)'); c.fillStyle = g; c.fillRect(-u, -1.7 * u, 2 * u, 0.2 * u); // 머리 밑 그늘
    c.strokeStyle = `rgba(70,55,40,${0.42 * (1 - dk * 0.5)})`; c.lineWidth = Math.max(0.5, u * 0.03);
    c.beginPath(); c.moveTo(-u, -1.02 * u); c.lineTo(u, -1.02 * u); c.moveTo(-u, -0.52 * u); c.lineTo(u, -0.52 * u); c.moveTo(0.34 * u * Math.sign(-lx || 1), -1.62 * u); c.lineTo(0.38 * u * Math.sign(-lx || 1), -1.02 * u); c.stroke(); // 판 이음선
    c.fillStyle = `rgba(60,45,30,${0.5 * (1 - dk * 0.5)})`; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 0.26 * u, -0.94 * u, Math.max(0.4, u * 0.028), 0, TAU); c.fill(); } // 리벳
    c.restore(); c.beginPath(); c.moveTo(-0.72 * u, -0.4 * u); c.lineTo(0.72 * u, -0.4 * u); c.lineTo(0.62 * u, -1.7 * u); c.lineTo(-0.62 * u, -1.7 * u); c.closePath(); edge();
    // 띠 — 금 도금(반사가 날카로운 금속)
    c.beginPath(); c.rect(-0.75 * u, -0.86 * u, 1.5 * u, 0.2 * u); c.fillStyle = cyl(-0.75 * u, 0.75 * u, '#e7b13a', 0.75, true); c.fill(); edge();
    // 머리 — 분홍 도장 원뿔 + 둥근 반사점
    c.beginPath(); c.moveTo(-0.64 * u, -1.68 * u); c.quadraticCurveTo(-0.5 * u, -2.35 * u, 0, -2.62 * u); c.quadraticCurveTo(0.5 * u, -2.35 * u, 0.64 * u, -1.68 * u); c.closePath();
    c.fillStyle = cyl(-0.64 * u, 0.64 * u, '#ff6f91', 0.45); c.fill();
    c.save(); c.clip(); const hx = (hp - 0.5) * 1.1 * u; g = c.createRadialGradient(hx, -2.05 * u, 0, hx, -2.05 * u, 0.42 * u); g.addColorStop(0, `rgba(255,240,245,${0.55 * (1 - dk)})`); g.addColorStop(1, 'rgba(255,240,245,0)'); c.fillStyle = g; c.fillRect(-u, -2.7 * u, 2 * u, u); c.restore();
    c.beginPath(); c.moveTo(-0.64 * u, -1.68 * u); c.quadraticCurveTo(-0.5 * u, -2.35 * u, 0, -2.62 * u); c.quadraticCurveTo(0.5 * u, -2.35 * u, 0.64 * u, -1.68 * u); c.closePath(); edge();
    // 창 — 강철 테 + 유리(하늘 반사·초승달 반사·반짝)
    c.beginPath(); c.arc(0, -1.3 * u, 0.34 * u, 0, TAU); g = c.createLinearGradient(-0.34 * u, -1.64 * u, 0.34 * u, -0.96 * u);
    g.addColorStop(0, tone('#c9ced8', 0.3 * (1 - dk) - dk * 0.6)); g.addColorStop(0.5, tone('#6c7488', -dk * 0.6)); g.addColorStop(1, tone('#2a2f3c', -dk * 0.4)); c.fillStyle = g; c.fill(); edge();
    c.beginPath(); c.arc(0, -1.3 * u, 0.25 * u, 0, TAU);
    if (win) c.fillStyle = win; else { g = c.createRadialGradient(0, -1.2 * u, 0.02 * u, 0, -1.3 * u, 0.27 * u); g.addColorStop(0, tone('#3fa9d6', -dk * 0.6)); g.addColorStop(0.7, tone('#123a52', -dk * 0.5)); g.addColorStop(1, '#07141e'); c.fillStyle = g; }
    c.fill();
    if (!win) { c.save(); c.clip(); c.globalAlpha = 0.75 * (1 - dk * 0.6); c.fillStyle = '#eaf8ff'; const sx2 = lx < 0 ? -1 : 1;
      c.beginPath(); c.ellipse(sx2 * 0.09 * u, -1.42 * u, 0.16 * u, 0.07 * u, sx2 * -0.6, 0, TAU); c.fill(); c.globalAlpha *= 0.8; c.beginPath(); c.arc(-sx2 * 0.1 * u, -1.18 * u, 0.03 * u, 0, TAU); c.fill(); c.restore(); }
    sp = { c: cv, w: Wd, h: Ht, oy: Ht - 0.2 * u }; sprites.set(key, sp); return sp;
  }
  // 화면 각도 ang로 선 우주선이 받는 빛: lx = 몸 기준 옆 방향 빛(-1 왼쪽 ~ 1 오른쪽)
  const lightX = (ang) => LIGHT[0] * Math.cos(ang) + LIGHT[1] * Math.sin(ang);
  // ── 5차(게임 3D): Blender로 렌더한 우주선 함대·착륙 먼지·폭발·분사 불꽃 스프라이트(img/g3d/land/ · 목록 land.json) ──
  //  우주선은 빛 방향 3가지(l·c·r = 몸 왼쪽·정면·오른쪽에서 빛)로 렌더했다. 화면 각도마다 빛이 오는 쪽을 골라 쓴다. 못 받으면 옛 그림(shipSprite)으로 그린다.
  const G3 = { ok: false, ships: [], fx: {}, img: {}, dark: new Map() };
  const g3img = (f) => { if (G3.img[f]) return G3.img[f]; const im = new Image(); im.decoding = 'async'; im.src = 'img/g3d/land/' + f; G3.img[f] = im; return im; };
  const g3ready = (im) => im && im.complete && im.naturalWidth > 0;
  fetch('img/g3d/land/land.json').then(r => r.ok ? r.json() : null).then(j => {
    if (!j) return; G3.ships = j.ships || []; G3.fx = j.fx || {}; G3.ok = G3.ships.length > 0;
    for (const sh of G3.ships) for (const k of ['l', 'c', 'r']) g3img(sh.files[k]);
    for (const f of Object.values(G3.fx)) for (const n of f.files) g3img(n);
  }).catch(() => { /* 그림 목록이 없으면 옛 그림으로 */ });
  // 어두운 쪽(행성 뒤편)에 앉은 우주선: 같은 그림에 검은 막을 씌운 사본을 한 번만 만든다
  function g3dark(im, dk, grey) {
    const b = Math.round(dk * 5); if (!b && !grey) return im; const key = im.src + '|' + b + (grey ? 'g' : ''); let c = G3.dark.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d');
    if (grey) x.filter = 'saturate(0.25) brightness(0.85)';
    x.drawImage(im, 0, 0); x.filter = 'none'; x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(6,6,16,${b / 5 * 0.85})`; x.fillRect(0, 0, c.width, c.height); G3.dark.set(key, c); return c;
  }
  // 우주선 3D 그림 — (0,0) = 우주선 바닥 가운데, 위쪽 = -y, 높이 h(바닥~꼭대기)
  function ship3d(c, v, h, lx, dk, grey) {
    const sh = G3.ships[((v % G3.ships.length) + G3.ships.length) % G3.ships.length]; if (!sh) return false;
    const im = g3img(sh.files[lx < -0.33 ? 'l' : lx > 0.33 ? 'r' : 'c']); if (!g3ready(im)) return false;
    const k = 1.22 * h / ((sh.base - sh.top) * im.naturalHeight), w = im.naturalWidth * k, hh = im.naturalHeight * k; // 3D 로켓은 옛 그림보다 가늘어 1.22배
    c.drawImage(g3dark(im, dk, grey), -sh.cx * w, -sh.base * hh, w, hh); return true;
  }
  // 효과 연속 장면 한 장: name = boom·dust·flame · t 0~1 · (0,0) = 앵커(땅 닿는 점 / 분사구) · size = 그림 폭(px)
  const BOOM_SEQ = [0, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9]; // 저폴리 폭발 10장: 불꽃(4~5)·연기(6~7)에 조금 더 머문다
  function fx3d(c, name, t, size, alpha = 1, add = false, seq = null) {
    const f = G3.fx[name]; if (!f) return false; const n = seq ? seq.length : f.files.length, k = Math.min(n - 1, Math.max(0, Math.floor(t * n))), i = Math.min(f.files.length - 1, seq ? seq[k] : k), im = g3img(f.files[i]); if (!g3ready(im)) return false;
    const w = size, hh = size * im.naturalHeight / im.naturalWidth; c.save(); c.globalAlpha *= alpha; if (add) c.globalCompositeOperation = 'lighter';
    c.drawImage(im, -f.ax * w, -f.ay * hh, w, hh); c.restore(); return true;
  }
  function ship(c, x, y, ang, h, o = {}) {
    const u = h / 2.6, sx = o.sx || 1, sy = o.sy || 1;
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(sx, sy); c.globalAlpha = o.alpha ?? 1;
    const use3 = G3.ok && !o.old;
    if (o.flame > 0.02 && use3 && G3.fx.flame && fx3d(c, 'flame', (performance.now() / 1000 * 9 % 1), u * (0.9 + 0.9 * o.flame), 0.95, !o.soft)) { /* 3D 불꽃 */ }
    else if (o.flame > 0.02) { // 분사 불꽃
      const L = u * (0.9 + 1.9 * o.flame) * (0.85 + Math.random() * 0.3), fw = u * 0.34;
      c.globalCompositeOperation = o.soft ? 'source-over' : 'lighter'; // 4차: 행성 위를 떠나는 우주선 불꽃은 더하기 합성을 안 쓴다(흰 행성 위에서 하얗게 타 버림)
      let g = c.createLinearGradient(0, -u * 0.1, 0, L); g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.4, 'rgba(255,170,60,.75)'); g.addColorStop(1, 'rgba(255,80,40,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-fw, -u * 0.1); c.quadraticCurveTo(-fw * 0.9, L * 0.55, 0, L); c.quadraticCurveTo(fw * 0.9, L * 0.55, fw, -u * 0.1); c.fill();
      g = c.createLinearGradient(0, 0, 0, L * 0.55); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-fw * 0.45, 0); c.quadraticCurveTo(0, L * 0.6, fw * 0.45, 0); c.fill();
      c.globalCompositeOperation = 'source-over';
    }
    const lx0 = o.lx ?? lightX(ang), dk0 = Math.max(0, Math.min(0.85, o.dark || 0));
    if (!(use3 && ship3d(c, o.v ?? curShip, h, lx0, dk0, o.grey))) { const sp = shipSprite(h, lx0, dk0, o.win); c.drawImage(sp.c, -sp.w / 2, -sp.oy, sp.w, sp.h); }
    else if (o.win && o.win !== '#333') { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.55); g.addColorStop(0, 'rgba(255,70,50,.75)'); g.addColorStop(1, 'rgba(255,70,50,0)'); c.fillStyle = g; c.fillRect(-h, -h * 1.1, 2 * h, 1.2 * h); } // 부딪힌 우주선은 붉게 달아오른다
    c.restore();
  }

  // 5차: 「행성 합치기」 담당이 만든 새 3D 행성 세트(img/g3d/planets/planets.json · 1024px 투명 webp)가 있으면 그 세트로 착륙한다.
  //  json 모양이 정해지기 전이라 이름 몇 가지를 다 받는다(id · name/이름 · color/col/대표색 · r/radius/ratio/반지름비율). 없으면 옛 행성 그림(data.js) 그대로.
  const NP = { list: null, by: {} };
  const hexArr = (c) => Array.isArray(c) ? c.slice(0, 3).map(Number) : (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.trim()) ? hexc('#' + c.trim().replace('#', '')) : null);
  fetch('img/g3d/planets/planets.json').then(r => r.ok ? r.json() : null).then(j => {
    const arr = j && (Array.isArray(j) ? j : (j.planets || j.list));
    if (!arr || !arr.length) return;
    const l = [];
    // 합치기 담당 형식(2026-11-28): r = 몸통 원 반지름 / 그림 반폭 · (cx, cy) = 중심(그림 비율) · src = 그림 경로 · tier = 순서 · color = 몸통 대표 색
    for (const p of arr.slice().sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))) {
      if (!p || !p.id) continue; const img = p.src || ('img/g3d/planets/' + p.id + '.webp');
      let r = +(p.r ?? 0.9) / 2; if (!(r > 0.15 && r <= 0.5)) r = 0.45;
      const col = hexArr(p.color ?? p.col);
      meta[img] = { u: +(p.cx ?? 0.5), v: +(p.cy ?? 0.5), rad: r, col: col || [140, 160, 220], fixed: true, full: true };
      const it = { id: 'g3-' + p.id, name: p.name || p.id, img, ep: l.length }; l.push(it); NP.by[it.id] = it;
    }
    if (l.length >= 3) { NP.list = l; for (const it of l.slice(0, 3)) getImg(it.img); if (idle && !running && sim) sim = createSim({ planetIds: l.map(p => p.id), seedStr: 'idle' }); } // 검수 2회: 시작 화면도 실제 첫 행성으로
  }).catch(() => { /* 새 행성 세트가 아직 없다 */ });
  const pList = () => { if (NP.list) return NP.list; const l = DC.planets().filter(p => !p.id.startsWith('4-')).sort((a, b) => a.ep - b.ep); return l.length ? l : [{ id: '1-1', name: '해바라기 행성', img: 'img/p01_1.jpg' }]; };
  const pInfo = (id) => NP.by[id] || DC.planet(id) || { id, name: id, img: '' };

  // ── 상태 ──
  const loadFonts = () => Promise.all([document.fonts.load('800 40px "Pretendard Variable"'), document.fonts.load('600 40px "Pretendard Variable"')]).catch(() => {});
  let sim = null, running = false, hitstop = 0, slow = 0, slowK = 1, shakeAmp = 0, punch = 0, flash = 0, flashCol = '255,77,77', scorePop = 0, comboPop = 0;
  let parts = [], floats = [], acc = 0, last = 0, tapped = false, kick = 0, landSquash = 0, spawnT = 1, zoneIn = 1, healAnim = 0;
  let trans = null, card = null, beam = null, lastShown = 0;
  // 2차 연출: 충격 방향 흔들림(thud) · 완벽 빛기둥(pillar) · 행성 둘레를 도는 금빛 물결(wave) · 「완벽!」 도장(stamp) · 점수로 날아가는 숫자(flies) · 앉은 자리 빨강 등장 시각(takenAt)
  let thud = null, pillar = null, wave = null, stamp = null, whiteout = 0, flies = [], helpOffShown = false;
  const takenAt = new Map();
  // 3차(2026-11-28): 알림 자리를 나눈다 — 띠 알림(banner: 클리어·실패, 점수판과 떠 있는 우주선 사이 빈 띠) · 빛기둥 옆 쪽지(helpNote: 「이제 색 힌트 없이!」)
  //  폭발(boom)은 행성에 붙여 행성과 같이 돈다(터진 자리가 행성과 함께 움직여야 「어디서」가 보인다) · 부딪힌 앉은 우주선은 휘청(knock)
  let banner = null, helpNote = null, boom = null, knock = null, headA = 0;
  // 7차: 목숨 아이콘 깨짐(lifeAnim) · 앉은 우주선 종류(shipVar: 행성 기준 각 → 함대 번호) · 지금 우주선 종류(curShip) · 착륙 먼지(dust3)
  let lifeAnim = [0, 0, 0], tagLine = null, curShip = 0, dust3 = null; const shipVar = new Map();
  // 4차: 시험용으로 마지막에 그린 안내 자리를 남긴다(읽기 전용 훅 __land.fx) · 행성 이동 카메라 값(cam)
  let labelRect = null, guideRect = null, camView = null;

  const surfPt = (phi, rr) => [cx + Math.sin(phi) * R * rr, cy - Math.cos(phi) * R * rr];
  const P = (o) => { if (parts.length < 420) parts.push(o); };
  function dust(x, y, phi, col, n, spd) { // 표면 접선 방향으로 퍼지는 흙먼지
    for (let i = 0; i < n; i++) { const side = Math.random() < 0.5 ? -1 : 1, an = phi - Math.PI / 2 + side * (Math.PI / 2 - 0.15 - Math.random() * 0.6), v = (0.35 + Math.random()) * spd;
      P({ k: 'dot', x, y, vx: Math.sin(an) * v, vy: -Math.cos(an) * v, g: 0, drag: 3.2, life: 0.45 + Math.random() * 0.4, t: 0, c: col, r: (1.5 + Math.random() * 3.2) * R / 140 }); }
  }
  function sparks(x, y, col, n, spd) {
    for (let i = 0; i < n; i++) { const an = Math.random() * TAU, v = (0.4 + Math.random()) * spd; P({ k: 'spark', x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 260, drag: 1.5, life: 0.3 + Math.random() * 0.35, t: 0, c: col, r: 1.4 }); }
  }
  // 3차: 네모 조각 → 우주선 도장 색의 들쭉날쭉한 금속 파편(돌면서 빛을 받았다 잃었다 한다 · 반은 달군 가장자리) + 큰 조각 둘(분홍 머리·날개)
  //  표면 바깥쪽(법선)으로 튄다 — 행성 속으로 박히지 않게
  function debris(x, y, phi, n, spd) {
    const pal = ['#f1e6cf', '#ff6f91', '#e7b13a', '#59617a', '#f1e6cf', '#d8486c'], nrm = Math.atan2(-Math.cos(phi), Math.sin(phi));
    const poly = (r, m, sq = 0.7) => { const pts = []; for (let j = 0; j < m; j++) { const t = j / m * TAU + (Math.random() - .5) * 0.9, rr = r * (0.45 + Math.random() * 0.75); pts.push([Math.cos(t) * rr, Math.sin(t) * rr * sq]); } return pts; };
    for (let i = 0; i < n; i++) { const an = nrm + (Math.random() - .5) * 2.6, v = (0.35 + Math.random()) * spd, r = (0.03 + Math.random() * 0.055) * R;
      P({ k: 'shard', x, y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 420, drag: 0.7, life: 0.9 + Math.random() * 0.7, t: 0, c: pal[i % pal.length], pts: poly(r, 3 + (Math.random() * 3 | 0)), rot: Math.random() * TAU, vr: (Math.random() - .5) * 16, hot: Math.random() < 0.5 }); }
    const big = (pts, c, an) => P({ k: 'shard', x, y, vx: Math.cos(an) * spd * 0.75, vy: Math.sin(an) * spd * 0.75, g: 420, drag: 0.5, life: 1.5, t: 0, c, pts, rot: Math.random() * TAU, vr: (Math.random() - .5) * 10, hot: true });
    const u = R * 0.36 / 2.6;
    big([[-0.62 * u, 0.3 * u], [0.62 * u, 0.3 * u], [0.2 * u, -0.5 * u], [0, -0.75 * u], [-0.25 * u, -0.45 * u]], '#ff6f91', nrm - 0.7); // 머리 원뿔
    big([[-0.3 * u, -0.5 * u], [0.25 * u, 0.4 * u], [-0.45 * u, 0.42 * u]], '#d8486c', nrm + 0.8); // 날개
    // 연기는 drawBoom이 불덩이 뒤에서 그린다(여기서 그리면 불 앞에 검은 공이 생긴다 — 3차 촬영에서 확인)
  }
  const ring = (x, y, col, r0, r1, life, w) => P({ k: 'ring', x, y, vx: 0, vy: 0, g: 0, drag: 0, life, t: 0, c: col, r0, r1, w });
  const pop = (x, y, text, col, size, life = 0.95) => floats.push({ x, y, text, c: col, size, t: 0, life });

  function handle(ev) {
    const s = sim.s, info = pInfo(s.planetId);
    for (const e of ev) {
      if (e.type === 'drop') { /* 소리·흔들림은 누른 순간(doTap)에 이미 냈다 */ }
      else if (e.type === 'spawn') { spawnT = 0; if (running) snd('spawn'); }
      else if (e.type === 'land') {
        const phi = e.a + s.rot, [x, y] = surfPt(phi, 1.02), col = colOf(info.img, 1, 0.25), nx = Math.sin(phi), ny = -Math.cos(phi);
        landSquash = 1; comboPop = 1;
        thud = { nx, ny, t: 0, amp: (e.perfect ? 0.075 : 0.045) * R }; // 행성이 충격 방향으로 밀렸다 돌아온다
        dust(x, y, phi, col, e.perfect ? 30 : 18, 165 * R / 140);
        ring(x, y, e.perfect ? '255,211,77' : '91,224,138', 4, R * (e.perfect ? 0.8 : 0.5), e.perfect ? 0.55 : 0.4, e.perfect ? 4 : 3);
        if (e.perfect) {
          hitstop = 0.14; // 완벽은 확실히 멈춘다(정지감)
          if (!REDUCE) { shakeAmp = 9; punch = 1.6; slow = 0.3; slowK = 0.35; }
          sparks(x, y, '#ffe9a0', 30, 300 * R / 140); flash = 0.7; flashCol = '255,211,77'; whiteout = REDUCE ? 0 : 0.55;
          pillar = { phi, t: 0 }; wave = { phi, t: 0 };
          stamp = { t: 0, end: 0.8, text: e.pstreak >= 2 ? `완벽 ${e.pstreak}연속!` : '완벽!', sub: '+2' };
        } else {
          hitstop = 0.06;
          if (!REDUCE) { shakeAmp = 3; punch = 0.6; }
        }
        const [tx, ty] = surfPt(phi, 1.25), side = Math.sin(phi) >= 0 ? 1 : -1;
        if (!e.perfect && e.gain > 0) flies.push({ x0: tx + side * R * 0.38, y0: ty, t: 0, text: `+${e.gain}`, c: '#7ff0a6', size: 26 }); else if (e.perfect) scorePop = 1; // 7차: 판정 글자는 하나 — 보통은 「+1」, 완벽은 도장(+2)
        shipVar.set(e.a, s.ship - 1); dust3 = { a: e.a, t: 0, big: e.perfect };
        snd(e.perfect ? 'perfect' : 'land', e.combo - 1); DC.buzz(e.perfect ? [25, 40, 35] : 18);
        if (e.combo >= 5) award('combo5'); if (e.combo >= 10) award('combo10');
        const tot = (DC.store.get('land_total', 0) || 0) + 1; DC.store.set('land_total', tot); if (tot >= 10) award('first10');
      } else if (e.type === 'heal') { healAnim = 1; snd('heal'); }
      else if (e.type === 'fail' || e.type === 'crash') {
        const phi = e.a + s.rot, [x, y] = surfPt(phi, 1.06);
        if (!G3.fx.boom) debris(x, y, phi, 24, 250 * R / 140); sparks(x, y, '#ffb46b', G3.fx.boom ? 18 : 30, 320 * R / 140); // 5차: 3D 폭발에 파편이 들어 있어 2D 조각은 거들기만
        // 3차: 불덩이·충격 고리·그을음은 행성에 붙인다(boom.a = 행성 기준 각) — 느려진 동안 행성이 돌아도 터진 자리를 따라간다
        boom = { a: e.a, t: 0, blobs: Array.from({ length: 8 }, (_, i) => ({ ox: (Math.random() - .5) * 0.7, oy: 0.1 + Math.random() * 0.55, r: 0.55 + Math.random() * 0.5, d: i * 0.012 + Math.random() * 0.03 })) };
        if (e.type === 'crash') { let best = null, bd = 9; for (const l of s.landed) { const d = angDiff(l, e.a); if (d < bd) { bd = d; best = l; } } knock = best === null ? null : { a: best, t: 0, dir: Math.sin(e.a - best) >= 0 ? -1 : 1 }; } // 맞은 쪽 반대로 휘청
        hitstop = 0.25; // 6차(검수 4회 「실패가 아프지 않다」): 0.1 → 0.25초. 3차: 닿는 순간 멈춘다 — 행성이 멈춘 채 터져 터진 자리가 보인다
        if (!REDUCE) { shakeAmp = 22; punch = -1.2; slow = 0.42; slowK = 0.3; }
        flash = 1; flashCol = '255,60,50'; lifeAnim[e.lives] = 1; beam = null; helpNote = null;
        showBanner(e.type === 'crash' ? '먼저 앉은 우주선과 쾅' : '빨강에 떨어졌어', e.lives > 0 ? `남은 우주선 ${e.lives}대` : '마지막 우주선이었어', '#ff6b6b', 1.05, 0);
        snd(e.type); DC.buzz([45, 30, 70]);
      } else if (e.type === 'clear') {
        snd('clear'); DC.buzz([20, 40, 20]); if (e.perfect) award('perfect');
        trans = { t: 0, from: s.planetId, to: e.next, landed: s.landed.slice(), rot: s.rot, spin: s.dir * s.speed, perfect: e.perfect, nextRot: e.nextRot, nextSpin: e.nextSpin };
        // 4차: 다음 행성 이름표는 새 행성이 화면 가운데로 올라오는 동안(0.65초~) 그 행성을 따라 함께 들어온다
        card = { t: -0.65, n: s.stage + 2, id: e.next, name: pInfo(e.next).name, sway: stageParams(s.stage + 1, cfgOf(e.next)).amp > 0 && stageParams(s.stage, cfgOf(e.next)).amp === 0 };
        // 3차: 순서대로 — 「이제 색 힌트 없이!」 쪽지가 떠 있으면 0.2초 안에 접고, 「완벽!」 도장이 있으면 도장이 물러난 뒤에 띠 알림을 띄운다
        let wait = 0;
        if (helpNote) { helpNote.t = Math.max(helpNote.t, helpNote.life - 0.2); wait = 0.2; }
        if (stamp) { stamp.end = Math.min(stamp.end, 0.55); wait = Math.max(wait, stamp.end + 0.25 - stamp.t); }
        showBanner('행성 클리어', e.perfect ? '한 번도 안 터지고 넘었어' : `${ordK(s.stage + 2)} 행성으로`, '#ffd34d', 1.25, wait);
        flash = 0.45; flashCol = '255,211,77';
      } else if (e.type === 'stage') {
        if (e.stage >= 2) award('stage3');
        zoneIn = 0; takenAt.clear(); boom = null; knock = null; shipVar.clear(); dust3 = null;
        if (!card || card.id !== e.planetId) card = { t: 0, n: e.stage + 1, id: e.planetId, name: pInfo(e.planetId).name, sway: s.amp > 0 && stageParams(e.stage - 1, cfgOf(e.planetId)).amp === 0 };
      } else if (e.type === 'over') { snd('over'); slow = REDUCE ? 0 : 0.8; slowK = 0.3; setTimeout(showEnd, 1300); }
    }
  }

  // ── 그리기 ──
  const ordK = (n) => n === 1 ? '첫 번째' : `${n}번째`; // 검수 2회: 「1번째」 → 「첫 번째」
  const playing = () => document.body.classList.contains('l-play'); // 7차: 플레이 중에는 사이트 머리 줄을 숨기고(land.css) 계기판을 위로 올린다
  const hudTop = () => (playing() ? 10 : 52) + (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0);
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const back = (t) => { t = Math.min(1, Math.max(0, t)); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  // ── 3차: 글 받침·자리 나누기 ──
  //  점수판(hudTop ~ +HUD_H) · 빈 띠(점수판과 떠 있는 우주선 사이: 첫 목표·클리어·실패 알림) · 행성 가운데(다음 행성 이름표) · 빛기둥 옆(첫 안내·힌트 끝 쪽지)
  const HUD_H = 52; // 6차: 한 줄 계기판
  const shipTipY = () => cy + (HOVER_Y + CAPR) * R - R * 0.36;
  const bandY = () => (hudTop() + HUD_H + shipTipY()) / 2;
  function plate(x, y, w, h, fill, line, r = 10) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (line) { ctx.lineWidth = 1.5; ctx.strokeStyle = line; ctx.stroke(); } }
  function showBanner(text, sub, col, life, wait) { banner = { text, sub, col, life, t: -wait }; }
  function drawBanner() {
    const b = banner; if (!b || b.t < 0) return;
    const k = b.t, a = Math.min(1, k / 0.1) * Math.min(1, Math.max(0, (b.life - k) / 0.25)), sc = 0.7 + 0.3 * back(Math.min(1, k / 0.22));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, bandY()); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 24px ${FF}`; const tw = ctx.measureText(b.text).width; ctx.font = `700 14px ${FF}`; const sw = b.sub ? ctx.measureText(b.sub).width : 0;
    const pw = Math.min(W - 24, Math.max(tw, sw) + 48), ph = b.sub ? 64 : 46;
    plate(-pw / 2, -ph / 2, pw, ph, 'rgba(8,8,18,.9)', b.col, 12);
    ctx.font = `900 24px ${FF}`; ctx.fillStyle = b.col; ctx.fillText(b.text, 0, b.sub ? -10 : 1);
    if (b.sub) { ctx.font = `700 14px ${FF}`; ctx.fillStyle = '#f4f1ea'; ctx.fillText(b.sub, 0, 18); }
    ctx.restore();
  }
  // 4차(2026-11-28): 첫 5초 안내를 하나로 — 3차는 큰 제목(초록에 내려앉혀)·색 범례·행성 이름표·빛기둥 옆 화살표 글·화면 아래 손 아이콘·「아무 데나 탭」이 한꺼번에 떴다.
  //  이제 점수판과 떠 있는 우주선 사이 빈 띠에 받침 판 하나: [두드리는 손] 「이 빛이 초록·금색일 때 / 화면 아무 데나 탭」 + 빛기둥까지 짧은 화살표.
  //  빈 띠는 우주선 꼭대기보다 위라서, 행성 둘레를 도는 금색 표지(빛 끝 = 행성 중심에서 1.38R)와 어떤 각에서도 겹치지 않는다.
  const handImg = new Image();
  handImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V4.5a1.5 1.5 0 013 0V10m0-.5V8a1.5 1.5 0 013 0v2m0 0a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-1a6 6 0 01-4.8-2.4L4 15a1.5 1.5 0 012.3-1.9L9 15"/></svg>'); // icons.js 「tap」과 같은 선
  function drawGuide(s) {
    if (headA < 0.01) { guideRect = null; return; }
    const now = performance.now(), h = R * 0.36, bx = cx + s.dx * R, yb = cy + (HOVER_Y + CAPR) * R, ys = cy - Math.sqrt(Math.max(0, 1 - s.dx * s.dx)) * R, my = (yb + ys) / 2;
    const l1 = helpOn(s) ? [['이 빛이 ', '#f0f0fa'], ['초록', '#6eec9c'], ['·', '#f0f0fa'], ['금색', '#ffd34d'], ['일 때', '#f0f0fa']] : [['빛 끝이 ', '#f0f0fa'], ['초록', '#6eec9c'], ['에 닿을 때', '#f0f0fa']], l2 = '화면 아무 데나 탭'; // 오늘 문제는 색 힌트가 없다
    ctx.save(); ctx.globalAlpha = headA; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = `700 15px ${FF}`; const w1 = l1.reduce((t, [w]) => t + ctx.measureText(w).width, 0); ctx.font = `800 19px ${FF}`; const w2 = ctx.measureText(l2).width;
    const ic = 34, pw = Math.min(W - 24, ic + 12 + Math.max(w1, w2) + 30), ph = 60, px = W / 2 - pw / 2, py = Math.min(bandY() - ph / 2, shipTipY() - ph - 14);
    plate(px, py, pw, ph, 'rgba(8,8,18,.92)', 'rgba(240,240,250,.4)', 14);
    const tp = (now / 1000) % 1.1 / 1.1, press = tp < 0.4 ? Math.sin(tp / 0.4 * Math.PI) : 0, ix = px + 14, iy = py + (ph - ic) / 2; // 손이 톡 두드린다
    if (press > 0.05) { ctx.strokeStyle = `rgba(255,255,255,${0.5 * press})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ix + ic * 0.38, iy + ic * 0.22, 4 + 9 * press, 0, TAU); ctx.stroke(); }
    if (handImg.complete && handImg.naturalWidth) ctx.drawImage(handImg, ix, iy + 3 * press, ic, ic);
    let tx = ix + ic + 12; for (const [w, c] of l1) { ctx.font = `700 15px ${FF}`; ctx.fillStyle = c; ctx.fillText(w, tx, py + 20); tx += ctx.measureText(w).width; }
    ctx.font = `800 19px ${FF}`; ctx.fillStyle = '#ffffff'; ctx.fillText(l2, ix + ic + 12, py + 41);
    // 짧은 화살표: 판 아래 → 우주선 날개 바깥으로 휘어 → 빛기둥 오른쪽 가장자리
    const ax0 = Math.min(px + pw - 20, bx + h * 1.25), ay0 = py + ph, ax1 = bx + h * 0.34, ay1 = my, ccx = bx + h * 1.3, ccy = (ay0 + ay1) / 2 + 10;
    ctx.globalAlpha = headA * (0.8 + 0.2 * Math.sin(now / 200)); ctx.strokeStyle = 'rgba(240,240,250,.85)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.quadraticCurveTo(ccx, ccy, ax1, ay1); ctx.stroke();
    const an = Math.atan2(ay1 - ccy, ax1 - ccx); ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax1 - 8 * Math.cos(an - 0.45), ay1 - 8 * Math.sin(an - 0.45)); ctx.moveTo(ax1, ay1); ctx.lineTo(ax1 - 8 * Math.cos(an + 0.45), ay1 - 8 * Math.sin(an + 0.45)); ctx.stroke();
    ctx.restore();
    guideRect = { x: px, y: py, w: pw, h: ph, hand: { x: ix, y: iy, w: ic, h: ic + 3 } };
  }
  // 「이제 색 힌트 없이!」 — 첫 안내가 있던 빛기둥 옆 자리에 받침 쪽지로(띠 알림과 자리가 다르다)
  function drawHelpNote(s) {
    const n = helpNote; if (!n) return;
    const a = Math.min(1, n.t / 0.15) * Math.min(1, Math.max(0, (n.life - n.t) / 0.2)), h = R * 0.36, bx = cx + s.dx * R;
    const yb = cy + (HOVER_Y + CAPR) * R, ys = cy - Math.sqrt(Math.max(0, 1 - s.dx * s.dx)) * R, my = (yb + ys) / 2, x0 = bx + h * 0.42 + 18;
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const t1 = '이제 색 힌트 없이!', t2 = '빛이 하얗게 바뀌어 · 혼자 맞혀'; ctx.font = `800 15px ${FF}`; const w1 = ctx.measureText(t1).width; ctx.font = `600 12px ${FF}`; const w2 = ctx.measureText(t2).width;
    const pw = Math.max(w1, w2) + 22, px = Math.min(W - 8 - pw, x0);
    plate(px, my - 24, pw, 48, 'rgba(8,8,18,.9)', 'rgba(240,240,250,.55)', 10);
    ctx.strokeStyle = 'rgba(240,240,250,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, my); ctx.lineTo(bx + h * 0.36, my); ctx.stroke();
    ctx.font = `800 15px ${FF}`; ctx.fillStyle = '#ffffff'; ctx.fillText(t1, px + 11, my - 9); ctx.font = `600 12px ${FF}`; ctx.fillStyle = '#c9c9d6'; ctx.fillText(t2, px + 11, my + 11);
    ctx.restore();
  }
  // 폭발 — 행성에 붙은 불덩이·충격 고리·그을음(행성과 같이 돈다)
  function drawBoom(s) {
    const b = boom; if (!b) return;
    const phi = b.a + s.rot, t = b.t, nx = Math.sin(phi), ny = -Math.cos(phi), tx = -ny, ty = nx, [gx, gy] = surfPt(phi, 1.0);
    // 그을음: 표면에 검게 탄 자국 + 식어 가는 불씨 테
    const sa = Math.max(0, 1 - Math.max(0, t - 1.4) / 0.6);
    if (sa > 0) { ctx.save(); ctx.translate(gx, gy); ctx.rotate(phi); ctx.globalAlpha = sa;
      let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.24); g.addColorStop(0, 'rgba(10,6,6,.9)'); g.addColorStop(0.6, 'rgba(20,10,8,.55)'); g.addColorStop(1, 'rgba(20,10,8,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.24, R * 0.09, 0, 0, TAU); ctx.fill();
      const em = Math.max(0, 1 - t / 1.6); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,120,40,${0.7 * em})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.17, R * 0.06, 0, 0, TAU); ctx.stroke();
      ctx.restore(); }
    // 충격 고리(터진 자리 중심)
    // 5차: 불덩이·연기·파편은 Blender 볼륨 폭발 연속 장면(행성에 붙어 같이 돈다). 그림이 없을 때만 아래 2D 불덩이로 그린다
    if (G3.fx.boom && t < 1.25) { ctx.save(); ctx.translate(gx, gy); ctx.rotate(phi); const ok = fx3d(ctx, 'boom', t / 1.25, R * 2.2, Math.min(1, (1.25 - t) / 0.2), false, BOOM_SEQ); ctx.restore(); // 검수 1회: 뿌연 볼륨 폭발이 각진 우주선과 그림체가 따로 놀아 저폴리 공 폭발(fxlp.py)로 바꿨다
      if (ok) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (t < 0.1) { const k = t / 0.1, rr = R * 0.65 * (0.5 + k), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr, 0, TAU); ctx.fill(); }
        ctx.restore(); return; } }
    if (t > 1.3) return;
    const at = (o, k, sp) => [gx + (nx * o.oy + tx * o.ox) * R * sp * k, gy + (ny * o.oy + ty * o.ox) * R * sp * k];
    // 연기: 불이 잦아든 뒤(0.15초~) 솟아오르는 잿빛 덩이
    for (const o of b.blobs) { const k = ease((t - 0.12 - o.d) / 0.5); if (k <= 0) continue; const A = 0.62 * k * Math.max(0, 1 - (t - 0.12) / 1.15), [x, y] = at(o, 0.5 + k, 0.62), rr = R * 0.3 * o.r * (0.6 + 0.8 * k);
      ctx.fillStyle = `rgba(52,44,50,${A})`; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    // 불덩이: 바탕 위에 그대로 칠한다(밝은 행성 위에서도 보이게) — 흰 속 → 노랑 → 주황 → 붉은 가장자리, 바깥으로 부풀며 솟는다
    for (const o of b.blobs) { const k = ease((t - o.d) / 0.2); if (k <= 0) continue; const A = Math.max(0, 1 - Math.max(0, t - o.d - 0.12) / 0.45); if (A <= 0) continue;
      const [x, y] = at(o, k, 0.5), rr = R * 0.36 * o.r * (0.35 + 0.75 * k), g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(255,246,210,${A})`); g.addColorStop(0.35, `rgba(255,176,60,${A})`); g.addColorStop(0.72, `rgba(228,70,30,${0.85 * A})`); g.addColorStop(1, 'rgba(120,20,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (t < 0.45) { const A = 1 - t / 0.45, rr = R * (0.55 + 0.3 * ease(t / 0.2)), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, `rgba(255,190,90,${0.55 * A})`); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr, 0, TAU); ctx.fill(); } // 번지는 불빛
    if (t < 0.1) { const k = t / 0.1, rr = R * 0.65 * (0.5 + k), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rr); g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, rr, 0, TAU); ctx.fill(); } // 첫 순간 흰 섬광
    ctx.restore();
  }
  // 5차: 착륙 흙먼지 3D 연속 장면 — 앉은 자리에 붙어 행성과 같이 돈다. 행성 대표 색을 살짝 입힌다(source-atop 대신 곱하기 느낌은 투명도로)
  function drawDust3(s) {
    const d = dust3; if (!d || !G3.fx.dust) return; const phi = d.a + s.rot, [x, y] = surfPt(phi, 1.0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(phi); fx3d(ctx, 'dust', d.t / 0.75, R * (d.big ? 1.25 : 1.0), 0.95); ctx.restore();
  }
  function drawZones(s, a) {
    if (a <= 0.01) return;
    const t = performance.now() / 1000; ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'butt';
    // 6차(검수 3회): 판정 띠가 행성 장식에 묻혔다 → 띠 밑에 어두운 받침 고리를 깔아 띠가 화면의 주인공이 되게
    ctx.strokeStyle = 'rgba(4,4,12,.82)'; ctx.lineWidth = R * 0.15; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, 0, TAU); ctx.stroke();
    for (const z of s.zones) {
      const a0 = z.a0 + s.rot - Math.PI / 2, a1 = a0 + z.w;
      if (z.type === 'safe') {
        ctx.strokeStyle = 'rgba(91,224,138,.16)'; ctx.lineWidth = R * 0.16; ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, a0 + 0.02, a1 - 0.02); ctx.stroke();
        ctx.strokeStyle = 'rgba(110,236,156,.95)'; ctx.lineWidth = R * 0.045; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, a0 + 0.02, a1 - 0.02); ctx.stroke();
      } else {
        const p = 0.55 + 0.45 * Math.sin(t * 6);
        ctx.strokeStyle = `rgba(255,70,60,${0.14 + 0.16 * p})`; ctx.lineWidth = R * 0.22; ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, a0, a1); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,92,80,.95)'; ctx.lineWidth = R * 0.07; ctx.setLineDash([R * 0.05, R * 0.035]); ctx.lineDashOffset = -t * R * 0.08 * s.dir;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, a0, a1); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    // 이미 앉은 우주선 자리 = 빨강(2차). 판정 폭(TAKENW) 그대로 칠한다 — 「초록에 내렸는데 쾅」이 없도록 눈에 보이는 규칙으로.
    const nowS = performance.now() / 1000;
    for (const l of s.landed) {
      if (!takenAt.has(l)) takenAt.set(l, nowS);
      const k = ease((nowS - takenAt.get(l)) / 0.35), hw = TAKENW * k, mid = l + s.rot - Math.PI / 2, pulse = Math.max(0, 1 - (nowS - takenAt.get(l)) / 0.6);
      ctx.strokeStyle = 'rgba(14,8,12,.9)'; ctx.lineWidth = R * 0.075; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, mid - hw, mid + hw); ctx.stroke(); // 초록을 덮는다
      ctx.strokeStyle = `rgba(255,70,60,${0.16 + 0.5 * pulse})`; ctx.lineWidth = R * 0.2; ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, mid - hw, mid + hw); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,92,80,.95)'; ctx.lineWidth = R * 0.06; ctx.setLineDash([R * 0.022, R * 0.03]); ctx.lineDashOffset = 0;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, mid - hw, mid + hw); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const p of s.pads) { // 착륙 표지 — 금색 띠 + 위로 솟는 빛
      if (p.used) continue; const phi = p.a + s.rot, a0 = phi - Math.PI / 2 - PADW, pl = 0.6 + 0.4 * Math.sin(t * 5 + p.a * 3);
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = R * 0.075; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, a0, a0 + 2 * PADW); ctx.stroke();
      const [x0, y0] = surfPt(phi, 1.06), [x1, y1] = surfPt(phi, 1.06 + 0.32 * pl), g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(255,211,77,.7)'); g.addColorStop(1, 'rgba(255,211,77,0)'); ctx.strokeStyle = g; ctx.lineWidth = R * 0.1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.restore();
  }
  // 앉은 우주선: 행성 위 빛을 그대로 받는다 — 빛 반대편(아래·오른쪽)에 앉은 것은 그늘에 잠겨 덜 튄다(2차 · 「거꾸로 쌓인 우주선이 어지럽다」)
  const sunAt = (phi) => -LIGHT[0] * -Math.sin(phi) + -LIGHT[1] * Math.cos(phi); // 표면 법선·빛 내적(1 = 정면으로 받음)
  // 첫 착륙 때만: 빨개진 자리 바깥에 이름표가 따라 돈다 — 규칙을 그 순간 그 자리에서 알려 준다(앉은 우주선 위에 그려 가려지지 않게)
  function drawTakenLabel(s) {
    labelRect = null; const l = s.landed[0]; if (s.stage !== 0 || s.daily || l === undefined || !takenAt.has(l)) return;
    const age = performance.now() / 1000 - takenAt.get(l); if (age >= 2.6) return;
    if (boom || banner) { labelRect = null; return; } // 3차: 터지는 순간·띠 알림과 겹치지 않게 물러난다
    // 4차: 화면 모서리 쪽지 + 긴 줄(줄이 앉은 우주선을 가로질렀다) → 빨간 자리 바로 옆, 행성 도는 방향 앞쪽에 한 줄 꼬리표.
    //  꼬리표 가운데 = 앉은 자리에서 0.64라디안 앞 · 반지름 1.34R(앉은 우주선 끝은 1.37R, 폭 ±0.14라디안 → 꼬리표와 떨어져 있다). 줄은 빨간 자리 끝까지 약 0.3R.
    const phi = l + s.rot, la = Math.min(1, age / 0.2) * Math.min(1, (2.6 - age) / 0.4), sd = s.dir >= 0 ? 1 : -1;
    const t1 = '여기 또 내리면 터져';
    ctx.save(); ctx.globalAlpha = la; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 13px ${FF}`; const pw = ctx.measureText(t1).width + 20, ph = 26;
    const [lx, ly] = surfPt(phi + sd * (TAKENW + 0.42), 1.34), px = Math.max(14, Math.min(W - 14 - pw, lx - pw / 2)), py = Math.max(hudTop() + HUD_H + 4, Math.min(H - ph - 8, ly - ph / 2));
    const [ex, ey] = surfPt(phi + sd * TAKENW, 1.1), qx = Math.max(px, Math.min(px + pw, ex)), qy = Math.max(py, Math.min(py + ph, ey));
    ctx.strokeStyle = 'rgba(255,120,110,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, TAU); ctx.fill();
    plate(px, py, pw, ph, 'rgba(14,6,10,.92)', 'rgba(255,92,80,.85)', 13);
    ctx.fillStyle = '#ffd6d2'; ctx.fillText(t1, px + pw / 2, py + ph / 2 + 0.5);
    ctx.restore();
    labelRect = { x: px, y: py, w: pw, h: ph, line: Math.hypot(qx - ex, qy - ey) };
  }
  function drawLanded(list, rot, k = 0, lift = 0) {
    const h = R * 0.22; // 7차: 화면 옆에서 잘리지 않게 더 작게 · 검수 2회: 앉은 우주선이 띠를 가리고 지금 우주선과 헷갈렸다 → 작게, 색을 빼서(grey)
    for (const a of list) {
      const phi = a + rot, up = lift * lift * R * 3, [x, y] = surfPt(phi, 1.075 + up / R), lit = sunAt(phi), dark = lift ? 0 : Math.max(0, Math.min(0.4, 0.3 - 0.5 * lit)); // 검수 1회: 고리 바깥에 선다 · 뒤편 그늘은 옅게(반투명처럼 보였다)
      if (!lift) { const t = lightX(phi) > 0 ? -1 : 1, [sx, sy] = surfPt(phi, 1.065); ctx.save(); ctx.translate(sx, sy); ctx.rotate(phi); ctx.fillStyle = `rgba(0,0,0,${0.45 - 0.2 * dark})`; ctx.beginPath(); ctx.ellipse(t * h * 0.22, 0, h * 0.55, h * 0.075, 0, 0, TAU); ctx.fill(); ctx.restore(); } // 빛 반대쪽으로 드리운 그림자
      const sq = k > 0 && a === list[list.length - 1] ? k : 0;
      const hit = !lift && knock && a === knock.a, kn = hit ? knock.dir * 0.42 * Math.exp(-knock.t * 4) * Math.cos(knock.t * 22) : 0; // 3차: 부딪힌 우주선은 맞은 쪽 반대로 휘청
      ship(ctx, x, y, phi + kn, h, { grey: !lift, v: shipVar.get(a) ?? 0, sx: 1 + 0.28 * sq, sy: 1 - 0.3 * sq, flame: lift ? 0.4 + lift : 0, soft: !!lift, dark: hit ? Math.max(dark, 0.3) : dark, win: hit && knock.t < 0.6 ? '#ff5a4a' : null });
    }
  }
  function draw() {
    const s = sim.s; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    let ox = 0, oy = 0; if (shakeAmp > 0.2 && !REDUCE) { ox = (Math.random() - .5) * shakeAmp * 2; oy = (Math.random() - .5) * shakeAmp * 2; }
    if (thud && !REDUCE) { const d = thud.amp * Math.exp(-thud.t * 13) * Math.cos(thud.t * 34); ox -= thud.nx * d; oy -= thud.ny * d; } // 착지 충격 방향으로 행성이 밀렸다 튕겨 온다
    const zs = 1 + 0.025 * punch;
    ctx.save(); ctx.translate(cx + ox, cy + oy); ctx.scale(zs, zs); ctx.translate(-cx, -cy);
    const info = pInfo(s.planetId);
    camView = null;
    if (trans) { // 행성 클리어 — 4차: 카메라가 다음 행성으로 내려간다(두 행성이 한 화면에 함께 있다)
      // 3차까지는 옛 행성이 0.9초에 화면 위로 빠진 뒤 새 행성이 화면 아래 밖에서 올라와, 약 0.75~1.05초 동안 화면이 거의 비었다.
      //  이제 다음 행성은 처음부터 바로 아래(2.7R)에 있다(첫 프레임부터 화면 아래 끝에 걸려 보인다). 카메라는 0.15~1.2초에 걸쳐 내려가고,
      //  중간에 살짝 물러나(최대 0.8배) 두 행성이 동시에 다 보인다. 옛 행성은 계속 돈다. 빠르게 지나가는 먼지 줄로 「이동」을 느끼게 한다.
      const t = trans.t, k = Math.min(1, Math.max(0, (t - 0.15) / 1.05)), cam = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const D = R * 2.7, z = 1 - 0.2 * Math.sin(Math.PI * cam), fromI = pInfo(trans.from), toI = pInfo(trans.to), oldRot = trans.rot + t * trans.spin;
      const k2 = Math.min(1, Math.max(0, (t - 0.14) / 1.05)), cam2 = k2 < 0.5 ? 4 * k2 * k2 * k2 : 1 - Math.pow(-2 * k2 + 2, 3) / 2, vel = Math.max(0, (cam2 - cam) / 0.01) * D; // 카메라 속도(px/초)
      camView = { cam, z, D, nextY: cy + z * D * (1 - cam) };
      if (vel > 30 && !REDUCE) { // 지나가는 먼지 줄(앞쪽 층) — 카메라가 내려가니 위로 흐른다
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < 26; i++) { const sx = ((i * 97.3) % W), base = (i * 151.7) % (H + 200), y = ((base - cam * D * 1.8) % (H + 200) + H + 200) % (H + 200) - 100, L = Math.min(90, vel * 0.06 * (0.6 + (i % 3) * 0.3));
          ctx.strokeStyle = `rgba(220,228,255,${Math.min(0.45, vel / 1800) * (0.5 + (i % 4) * 0.17)})`; ctx.lineWidth = 1 + (i % 3) * 0.5; ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + L); ctx.stroke(); }
        ctx.restore();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy - cam * D);
      drawPlanet(ctx, toI.img, cx, cy + D, R * 0.95, trans.nextRot - Math.max(0, 1.35 - t) * trans.nextSpin, 1, { glow: 0.7 });
      // 옛 행성은 점수판 밑으로 들어가는 후반에 옅어진다(점수판 글자가 행성 무늬 위에서 안 읽히지 않게)
      const fo = Math.min(1, Math.max(0, (cam - 0.45) / 0.5)), oa = 1 - 0.8 * fo * fo * (3 - 2 * fo);
      ctx.globalAlpha = oa; drawPlanet(ctx, fromI.img, cx, cy, R * 0.95, oldRot, oa, { glow: 0.7 }); drawLanded(trans.landed, oldRot, 0, Math.min(1, t / 0.5)); ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      drawPlanet(ctx, info.img, cx, cy, R * 0.95, s.rot); // 6차: 행성은 띠 안쪽에 조금 작게
      drawZones(s, ease(zoneIn));
      if (wave) { // 완벽: 앉은 자리에서 행성 둘레를 따라 양쪽으로 달리는 금빛
        const k = ease(wave.t / 0.65), a = Math.max(0, 1 - wave.t / 0.65), base = wave.phi - Math.PI / 2;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const sgn of [-1, 1]) { const m = base + sgn * Math.PI * k; ctx.strokeStyle = `rgba(255,214,90,${0.85 * a})`; ctx.lineWidth = R * 0.1 * (0.5 + a); ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, m - 0.28, m + 0.28); ctx.stroke(); }
        ctx.strokeStyle = `rgba(255,230,150,${0.35 * a})`; ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, base - Math.PI * k, base + Math.PI * k); ctx.stroke(); ctx.restore();
      }
      drawBoom(s); drawLanded(s.landed, s.rot, landSquash); drawDust3(s);
      if (pillar) { // 완벽: 앉은 자리에서 하늘로 솟는 빛기둥
        const a = Math.max(0, 1 - pillar.t / 0.8), grow = ease(pillar.t / 0.12), phi = pillar.phi, [px, py] = surfPt(phi, 1.0), L = R * 1.7 * grow, wd = R * (0.1 + 0.22 * a);
        ctx.save(); ctx.beginPath(); ctx.rect(-W, hudTop() + HUD_H + 4, 3 * W, 3 * H); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(px, py); ctx.rotate(phi); // 검수 1회: 빛기둥이 점수판을 덮었다
        let g = ctx.createLinearGradient(0, 0, 0, -L); g.addColorStop(0, `rgba(255,236,160,${0.9 * a})`); g.addColorStop(0.5, `rgba(255,211,77,${0.4 * a})`); g.addColorStop(1, 'rgba(255,211,77,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-wd, 0); ctx.lineTo(wd, 0); ctx.lineTo(wd * 0.45, -L); ctx.lineTo(-wd * 0.45, -L); ctx.fill();
        g = ctx.createLinearGradient(0, 0, 0, -L * 0.8); g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-wd * 0.18, -L * 0.8, wd * 0.36, L * 0.8);
        ctx.restore();
      }
    }
    // 떠 있는/떨어지는 우주선
    if (idle && !trans) { const an = 0.9, [ix, iy] = surfPt(an, 1.42 + 0.03 * Math.sin(performance.now() / 500)); ship(ctx, ix, iy, an - 0.25, R * 0.36, { flame: 0.3 + 0.1 * Math.sin(performance.now() / 50) }); } // 시작·끝 화면: 행성 옆을 도는 우주선
    else if (!trans && (s.phase === 'hover' || s.phase === 'fall')) {
      const h = R * 0.36, sp = idle ? 1 : back(spawnT / 0.28), bob = s.phase === 'hover' ? Math.sin(performance.now() / 260) * R * 0.012 : 0;
      const x = cx + s.dx * R, y = cy + (s.y + CAPR) * R + bob - (1 - sp) * R * 0.5;
      if (s.phase === 'hover' && !idle) { // 조준 빛: 첫 행성에서는 「지금 누르면」 결과 색으로 알려 준다
        const sy0 = cy - Math.sqrt(Math.max(0, 1 - s.dx * s.dx)) * R;
        let col = '255,255,255', al = 0.16;
        if (helpOn(s)) { const r = beam || 'land'; col = r === 'land' ? (beamPerfect ? '255,211,77' : '110,236,156') : '255,92,80'; al = s.landings === 0 ? 0.5 + 0.12 * Math.sin(performance.now() / 160) : 0.4; }
        const g = ctx.createLinearGradient(0, y, 0, sy0); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},${al * 0.35})`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - h * 0.16, y); ctx.lineTo(x + h * 0.16, y); ctx.lineTo(x + h * 0.32, sy0); ctx.lineTo(x - h * 0.32, sy0); ctx.fill();
        ctx.fillStyle = `rgba(${col},${Math.min(1, al * 2)})`; ctx.beginPath(); ctx.ellipse(x, sy0, h * 0.34, h * 0.07, Math.asin(Math.max(-1, Math.min(1, s.dx))), 0, TAU); ctx.fill();
        // 검수 1회: 「우주선 바로 아래 고리 조각이 가장 얇다」 → 지금 바로 아래 고리 조각을 두껍게 짚어 준다(그 조각의 색 그대로)
        { const ca = contactAngle(s.dx), typ = classify(norm(ca - s.rot), s.zones, s.landed), sa = ca - Math.PI / 2, uc = typ === 'safe' ? '110,236,156' : '255,92,80';
          ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, sa - 0.07, sa + 0.07); ctx.stroke();
          ctx.strokeStyle = `rgb(${uc})`; ctx.lineWidth = R * 0.085; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, sa - 0.07, sa + 0.07); ctx.stroke(); ctx.restore(); }
      }
      const fall = s.phase === 'fall', st = fall ? Math.min(0.32, s.vy * 0.045) : 0.08 * kick;
      if (fall) { for (let i = 1; i <= 3; i++) ship(ctx, x, y - s.vy * R * 0.018 * i, 0, h, { alpha: 0.16 / i, sx: 1 - st * 0.4, sy: 1 + st }); } // 잔상
      // 7차: 기다리면 손해 = 우주선마다 짧은 카운트다운. 우주선 둘레 고리가 줄어들고(초록 → 노랑 → 빨강), 불꽃도 함께 작아진다. 다 줄면 저절로 떨어진다(점수 0)
      const left = fall ? 0 : Math.max(0, 1 - s.ht / s.timer), urgent = !fall && left < 0.3;
      if (!fall && !idle) { const ox = x, oy = y - h * 0.5, rr = h * 0.78, col = '240,240,250', // 7차 검수 6회: 빨강은 「쾅」 색이라 카운트다운 고리는 흰색만
        _c = 0, pul = urgent ? 0.6 + 0.4 * Math.sin(performance.now() / 60) : 1;
        ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(ox, oy, rr, 0, TAU); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},${pul})`; ctx.beginPath(); ctx.arc(ox, oy, rr, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke(); ctx.restore(); }
      const hotNow = urgent;
      ship(ctx, x + (hotNow ? (Math.random() - 0.5) * 2.5 : 0), y, 0, h * sp, { sx: (1 - st * 0.4) * (1 + 0.12 * kick), sy: (1 + st) * (1 - 0.18 * kick), flame: fall ? 0 : (0.08 + 0.32 * left) * (0.85 + 0.15 * Math.sin(performance.now() / 45)) });
    }
    // 파티클
    for (const p of parts) {
      const a = Math.max(0, 1 - p.t / p.life);
      if (p.k === 'ring') { const k = ease(p.t / p.life); ctx.strokeStyle = `rgba(${p.c},${a * 0.9})`; ctx.lineWidth = p.w * a + 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * k, 0, TAU); ctx.stroke(); }
      else if (p.k === 'spark') { ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (p.k === 'shard') { // 3차: 금속 파편 — 돌면서 빛을 받았다 잃었다 하고, 달군 조각은 불꼬리를 끈다
        const l = Math.cos(p.rot * 1.3), hot = p.hot && p.t < 0.55 ? 1 - p.t / 0.55 : 0;
        if (hot > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,150,60,${0.6 * hot})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke(); ctx.restore(); }
        ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.6); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); p.pts.forEach(([u, v], j) => j ? ctx.lineTo(u, v) : ctx.moveTo(u, v)); ctx.closePath();
        const g = ctx.createLinearGradient(-6, -6, 6, 6); g.addColorStop(0, tone(p.c, 0.35 * l + 0.05)); g.addColorStop(1, tone(p.c, -0.45 + 0.25 * l)); ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = hot > 0 ? `rgba(255,170,80,${0.4 + 0.6 * hot})` : 'rgba(8,6,16,.7)'; ctx.stroke(); ctx.restore(); }
      else if (p.k === 'smoke') { ctx.fillStyle = p.c + (a * 0.45) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t * 1.6), 0, TAU); ctx.fill(); }
      else { ctx.globalAlpha = a; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    // 떠오르는 글자(흔들림과 무관하게 읽히도록 바깥에서)
    for (const f of floats) {
      const k = f.t / f.life, sc = back(Math.min(1, f.t / 0.22)), a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(f.x, f.y - ease(k) * 34); ctx.scale(sc, sc);
      ctx.font = `800 ${f.size}px ${FF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineJoin = 'round'; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.c; ctx.fillText(f.text, 0, 0); ctx.restore();
    }
    if (whiteout > 0.01) { ctx.fillStyle = `rgba(255,238,190,${whiteout * 0.38})`; ctx.fillRect(0, 0, W, H); }
    if (stamp) { // 「완벽!」 도장 — 크게 찍혀 들어와 잠깐 머문다
      const k = stamp.t, a = k > stamp.end ? Math.max(0, 1 - (k - stamp.end) / 0.25) : 1, sl = Math.min(1, k / 0.13), sc = 2.6 - 1.6 * (sl * sl), y = Math.max(hudTop() + HUD_H + 58, (hudTop() + 112 + cy - (1.9 + 0.05) * R) / 2);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, y); ctx.rotate(-0.07); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      if (k < 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 130); g.addColorStop(0, `rgba(255,214,90,${0.5 * (1 - k / 0.3)})`); g.addColorStop(1, 'rgba(255,214,90,0)'); ctx.fillStyle = g; ctx.fillRect(-140, -140, 280, 280); ctx.restore(); }
      ctx.font = `900 54px ${FF}`; ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(40,22,0,.85)'; ctx.strokeText(stamp.text, 0, 0);
      const g = ctx.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffd34d'); g.addColorStop(1, '#e09a10'); ctx.fillStyle = g; ctx.fillText(stamp.text, 0, 0);
      ctx.font = `800 16px ${FF}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(stamp.sub, 0, 40); ctx.fillStyle = '#fff1c2'; ctx.fillText(stamp.sub, 0, 40);
      ctx.restore();
    }
    if (flash > 0.02) { // 화면 가장자리만 물든다(가운데 행성은 그대로 보이게)
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, `rgba(${flashCol},0)`); g.addColorStop(1, `rgba(${flashCol},${flash * 0.45})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (card && card.t >= 0) { // 다음 행성 이름표 — 3차: 짙은 받침 판(행성 색 테) 위 흰 글씨
      // 4차: 흰 행성(온천) 위에서 받침이 반투명(0.88 × 0.2초 페이드)이라 회색으로 비쳤다 → 거의 불투명(0.96)·그림자·0.1초 등장. 이동 중에는 새 행성을 따라온다.
      const k = card.t, a = k < 0.1 ? k / 0.1 : k > 1.35 ? Math.max(0, 1 - (k - 1.35) / 0.3) : 1, sc = 0.85 + 0.15 * back(Math.min(1, k / 0.22)), ci = pInfo(card.id || s.planetId).img;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, camView ? camView.nextY : cy); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const t0 = `${ordK(card.n)} 행성`; ctx.font = `800 28px ${FF}`; const nw = ctx.measureText(card.name).width;
      const pw = Math.min(W - 24, Math.max(nw, card.sway ? 150 : 110) + 52), ph = card.sway ? 100 : 76;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 4; plate(-pw / 2, -ph / 2, pw, ph, 'rgba(6,6,14,.96)', null, 14); ctx.restore();
      plate(-pw / 2, -ph / 2, pw, ph, 'rgba(6,6,14,0)', colOf(ci, 0.95, 0.35), 14);
      ctx.fillStyle = colOf(ci, 1, 0.5); ctx.font = `800 13px ${FF}`; ctx.fillText(t0, 0, -ph / 2 + 19);
      ctx.fillStyle = '#ffffff'; ctx.font = `800 28px ${FF}`; ctx.fillText(card.name, 0, -ph / 2 + 47);
      if (card.sway) { ctx.fillStyle = '#ffd34d'; ctx.font = `800 14px ${FF}`; ctx.fillText('이제 우주선이 흔들려', 0, -ph / 2 + 78); }
      ctx.restore();
    }
    if (idle) return; // 시작·끝 화면에서는 점수판을 그리지 않는다(글과 겹침)
    // 점수판 — 검수 3회(6차): 다섯 줄(점수·연료·행성 이름·점·콤보) → 한 줄 계기판 [점수 | 연료 막대 | 콤보 배수 · 남은 착륙 점]. 행성 이름은 넘어갈 때 이름표로만 보인다
    const top = hudTop(), rowY = top + HUD_H / 2, hw = Math.min(W, 440), hx0 = (W - hw) / 2; ctx.textBaseline = 'middle'; // 넓은 화면에서도 계기판은 가운데 440px 안에
    ctx.save(); ctx.translate(hx0 + 16, rowY); const ps = 1 + 0.28 * back(1 - scorePop) * scorePop; ctx.scale(ps, ps); ctx.lineJoin = 'round'; ctx.textAlign = 'left';
    ctx.font = `800 30px ${FF}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(String(s.score), 0, 1); ctx.fillStyle = '#ffffff'; ctx.fillText(String(s.score), 0, 1); ctx.restore();
    // 7차: 연료 막대 → 목숨 = 작은 우주선 3대(가운데). 잃으면 아이콘이 깨져 흩어진다
    for (let i = 0; i < LIVES; i++) {
      const lx = W / 2 + (i - 1) * 30, la = lifeAnim[i], alive = i < s.lives, hs = (i === s.lives - 1 && healAnim > 0) ? 1 + 0.5 * healAnim : 1;
      if (!alive && la > 0) { // 깨지는 순간: 두 조각으로 갈라져 떨어지며 붉게 번쩍
        const k = 1 - la; ctx.save(); ctx.globalAlpha = Math.max(0, la);
        for (const sd of [-1, 1]) { ctx.save(); ctx.translate(lx + sd * 10 * k, rowY + 10 + 26 * k * k); ctx.rotate(sd * 0.9 * k); ctx.beginPath(); ctx.rect(sd < 0 ? -20 : 0, -30, 20, 40); ctx.clip(); ship(ctx, 0, 0, 0, 24, { win: '#ff5a4a', v: 0 }); ctx.restore(); }
        const g = ctx.createRadialGradient(lx, rowY, 0, lx, rowY, 24); g.addColorStop(0, `rgba(255,90,60,${0.8 * la})`); g.addColorStop(1, 'rgba(255,90,60,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 24, rowY - 24, 48, 48); ctx.restore();
      } else ship(ctx, lx, rowY + 11, 0, 24 * hs, { alpha: alive ? 1 : 0.18, grey: !alive, v: 0 }); // 총괄 11-29: 목숨 아이콘은 한 모양으로 고정(비교 검수 「목숨 색이 매번 바뀌어 지금 탈 우주선과 헷갈림」)
    }
    // 7차 검수 6회: 점이 무엇을 세는지 안 읽혔다 → 「착륙 2/4」 글자로(다 채우면 다음 행성)
    ctx.save(); ctx.textAlign = 'right'; ctx.font = `800 14px ${FF}`; ctx.fillStyle = 'rgba(244,241,234,.75)'; const pr = `${s.hits}/${s.need}`; ctx.fillText(pr, hx0 + hw - 16, rowY + 0.5); const pw2 = ctx.measureText(pr).width; ctx.font = `700 12px ${FF}`; ctx.fillStyle = 'rgba(244,241,234,.5)'; ctx.fillText('착륙', hx0 + hw - 22 - pw2, rowY + 0.5); ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // 4차: 빛기둥 옆 화살표 글(2차)과 빈 띠 큰 제목(3차)을 drawGuide 하나로 합쳤다
    drawTags();
    for (const f of flies) { // 점수로 날아가는 숫자
      const k = Math.min(1, f.t / 0.6), e2 = 0, x1 = f.x0, y1 = f.y0 - 40, hold = Math.min(1, f.t / 0.18); // 7차 검수 6회: 「+점수」는 착지점에서 떠오른다
      const x = f.x0 + (x1 - f.x0) * Math.max(0, (e2 - 0.15) / 0.85), y = f.y0 - 18 * hold + (y1 - f.y0 + 18) * Math.max(0, (e2 - 0.15) / 0.85), sc = back(hold) * (1 - 0.35 * k);
      ctx.font = `800 ${f.size}px ${FF}`; const fw = ctx.measureText(f.text).width * sc / 2 + 16; // 검수 5회: 화면 왼쪽 끝에서 잘렸다 → 양옆 16px 안으로
      ctx.save(); ctx.translate(Math.max(fw, Math.min(W - fw, x)), y); ctx.scale(sc, sc); ctx.font = `800 ${f.size}px ${FF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.c; ctx.fillText(f.text, 0, 0); ctx.restore();
    }
    drawTakenLabel(s); drawGuide(s); drawHelpNote(s); drawBanner(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  }
  // 5차: 착륙 점수 꼬리표 — 「+N」 아래에 정확도·빠름·아슬아슬·콤보 배수 · 연료 +x
  function drawTags() {
    const L2 = tagLine; if (!L2) return; const k = L2.t, a = Math.min(1, k / 0.08) * Math.min(1, Math.max(0, (1.1 - k) / 0.3)); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `800 13px ${FF}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const items = L2.tags; if (!items.length) { ctx.restore(); return; } const _u = 0, ws = items.map(([t]) => ctx.measureText(t).width + 14), tot = ws.reduce((p, q) => p + q + 4, -4);
    let x = Math.max(8, Math.min(W - 8 - tot, L2.x - tot / 2)); const y = L2.y - 10 * ease(k / 0.3);
    items.forEach(([t, c], i) => { plate(x, y - 10, ws[i], 20, 'rgba(8,8,18,.82)', null, 10); ctx.fillStyle = c; ctx.fillText(t, x + 7, y + 0.5); x += ws[i] + 4; });
    ctx.restore();
  }
  let beamPerfect = false;
  // 첫 행성 처음 두 번만 「지금 누르면」 색을 보여 준다(2차 — 계속 켜 두면 첫 행성은 거의 못 죽는다)
  function helpOn(s) { return s.stage === 0 && !s.daily && s.hits < 2; }

  function frame(now) {
    if (!running) return;
    const raw = Math.min(0.1, (now - last) / 1000); last = now;
    let dt = raw; if (slow > 0) { slow -= raw; dt = raw * slowK; }
    if (hitstop > 0) hitstop -= raw;
    else { acc += dt; while (acc >= STEP) { acc -= STEP; handle(sim.step(STEP)); if (hitstop > 0) { acc = 0; break; } } }
    const s = sim.s;
    if (s.phase === 'hover' && helpOn(s) && !trans) { const p = predict(s); beam = p.type; beamPerfect = p.type === 'land' && s.pads.some(q => !q.used && angDiff(p.a, q.a) < PADW); }
    // 7차: 「이제 색 힌트 없이!」 쪽지는 뺐다(화면 글 줄이기) — 힌트 빛은 조용히 하얗게 바뀐다
    const goalOn = s.stage === 0 && s.landings === 0 && !trans && !banner && s.phase !== 'over';
    headA = goalOn ? Math.min(1, headA + raw * 5) : Math.max(0, headA - raw * 5);
    if (banner) { banner.t += raw; if (banner.t > banner.life) banner = null; }
    if (helpNote) { helpNote.t += raw; if (helpNote.t > helpNote.life) helpNote = null; }
    if (boom) { boom.t += raw; if (boom.t > 2.0) boom = null; } // 불덩이는 실제 시간으로 「펑」 — 느려짐은 파편만
    if (knock) { knock.t += raw; if (knock.t > 1.2) knock = null; }
    const pdt = hitstop > 0 ? 0 : dt; // 멈춤 순간엔 파편도 같이 멈춘다(정지감)
    for (const p of parts) { p.t += pdt; p.vx *= Math.exp(-p.drag * pdt); p.vy *= Math.exp(-p.drag * pdt); p.vy += p.g * pdt; p.x += p.vx * pdt; p.y += p.vy * pdt; if (p.vr) p.rot += p.vr * pdt; }
    parts = parts.filter(p => p.t < p.life);
    for (const f of floats) f.t += raw; floats = floats.filter(f => f.t < f.life);
    if (trans) { trans.t += dt; if (s.phase !== 'wait') trans = null; }
    if (card) { card.t += raw; if (card.t > 1.65) card = null; }
    if (thud) { thud.t += raw; if (thud.t > 0.5) thud = null; }
    if (pillar) { pillar.t += pdt || (pillar.t < 0.12 ? raw : 0); if (pillar.t > 0.8) pillar = null; }
    if (wave) { wave.t += raw; if (wave.t > 0.65) wave = null; }
    if (stamp) { stamp.t += raw; if (stamp.t > stamp.end + 0.25) stamp = null; }
    whiteout = Math.max(0, whiteout - raw * 5);
    for (const f of flies) { f.t += raw; if (f.t >= 0.6 && !f.done) { f.done = true; scorePop = 1; } } flies = flies.filter(f => !f.done);
    shakeAmp *= Math.pow(0.0008, raw); punch *= Math.pow(0.002, raw); kick = Math.max(0, kick - raw * 7); landSquash = Math.max(0, landSquash - raw * 5);
    scorePop = Math.max(0, scorePop - raw * 3.5); comboPop = Math.max(0, comboPop - raw * 4); flash = Math.max(0, flash - raw * 2.6); healAnim = Math.max(0, healAnim - raw * 2); for (let i = 0; i < LIVES; i++) lifeAnim[i] = Math.max(0, lifeAnim[i] - raw * 1.4);
    curShip = s.ship; if (dust3) { dust3.t += pdt; if (dust3.t > 0.75) dust3 = null; } if (tagLine) { tagLine.t += raw; if (tagLine.t > 1.1) tagLine = null; }
    spawnT = Math.min(1, spawnT + raw); zoneIn = Math.min(1, zoneIn + raw * 3);
    draw(); lastShown = now; requestAnimationFrame(frame);
  }

  // 누른 그 순간: 소리·진동·우주선 움찔(다음 프레임을 기다리지 않는다)
  function doTap() {
    if (!running) return;
    if (!tapped) { tapped = true; DC.store.set('land_seen', true); }
    const s = sim.s; if (s.phase !== 'hover' || s.over || trans) return;
    kick = 1; snd('drop'); DC.buzz(8);
    // 7차 검수 6회: 누른 순간의 흰 고리는 멈춤 동안 남아 판정 원처럼 보여 뺐다(움찔·소리·진동은 그대로)
    sim.tap();
  }
  cvs.addEventListener('pointerdown', (e) => { e.preventDefault(); doTap(); });
  addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { if (running) { e.preventDefault(); if (!e.repeat) doTap(); } } });
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  // ── 시작/종료 화면 ──
  const clearUI = () => { ui.replaceChildren(); };
  const setIdle = (v) => { idle = v; fit(); };
  const row = (k, v) => el('div', {}, el('dt', {}, k), el('dd', {}, v));
  const panel = (...kids) => el('div', { class: 'panel' }, el('div', { class: 'l-cap' }, ...kids));
  function showStart() {
    running = false; document.body.classList.remove('l-play'); clearUI(); setIdle(true); const best = DC.store.get('land_best', 0), dBest = DC.store.get('land_best_' + DC.today(), 0);
    const n = Object.keys(DC.endings.all().land || {}).length;
    sim = createSim({ planetIds: pList().map(p => p.id), seedStr: 'idle' }); trans = null; card = null; idleSpin();
    ui.append(panel(
      el('p', { class: 'gx-eyebrow' }, el('span', {}, '03'), '1분 게임'),
      el('h1', { class: 'gx-h1' }, '행성 착륙'),
      el('p', { class: 'gx-sub' }, el('b', {}, '초록'), '에 앉히면 1점, ', el('b', {}, '금색'), '이면 완벽 2점. ', el('b', {}, '빨강'), '·먼저 앉은 우주선 자리는 쾅 — 3번 쾅이면 끝.'),
      el('div', { class: 'gx-acts' },
        el('button', { class: 'gx-btn main', type: 'button', onclick: () => start('free') }, '시작', el('i')),
        el('button', { class: 'gx-btn', type: 'button', onclick: () => start('daily') }, '오늘 문제')),
      el('dl', { class: 'gx-rows' },
        row('내 최고', best ? `${best}점` : '아직 없음'),
        row('오늘 문제 · 모두 같은 순서', dBest ? `${dBest}점` : '아직 안 함'),
        row('업적', `${n} / ${Object.keys(ACH).length}`)),
      DC.followCta()));
  }
  // 시작·끝 화면 뒤에서 행성만 천천히 돈다(입력 없음)
  let spin = 0;
  function idleSpin() {
    cancelAnimationFrame(spin); let t0 = performance.now();
    const f = (now) => { if (running || !idle) return; sim.s.rot = (sim.s.rot + (now - t0) / 1000 * 0.25) % TAU; t0 = now; draw(); spin = requestAnimationFrame(f); };
    spin = requestAnimationFrame(f);
  }
  function start(m) {
    window.dwkT?.gameStart('land', { mode: m });
    document.body.classList.add('l-play'); clearUI(); setIdle(false); const ids = pList().map(p => p.id);
    sim = createSim({ planetIds: ids, daily: m === 'daily', seedStr: m === 'daily' ? 'land|' + DC.today() : undefined, seedFn: DC.seed, rngF: DC.rng });
    parts = []; floats = []; acc = 0; hitstop = 0; slow = 0; shakeAmp = 0; punch = 0; flash = 0; trans = null; beam = null; thud = null; pillar = null; wave = null; stamp = null; whiteout = 0; flies = []; helpOffShown = false; takenAt.clear(); banner = null; helpNote = null; boom = null; knock = null; headA = 0; kick = 0; landSquash = 0; spawnT = 0; zoneIn = 0; lifeAnim = [0, 0, 0]; tagLine = null; curShip = 0; shipVar.clear();
    card = null; // 4차: 첫 행성 이름표는 띄우지 않는다(점수판 알약에 이름이 있다) — 첫 5초 안내는 drawGuide 하나
    tapped = DC.store.get('land_seen', false);
    if (m === 'daily') award('daily');
    au(); // 시작 단추를 누른 손짓으로 소리 장치를 깨운다(폰 사파리)
    for (const p of ids) getImg(pInfo(p).img); // 다음 행성 그림을 미리 받아 둔다
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }

  let cardCanvas = null;
  async function drawResultCard(s) {
    await loadFonts(); const c = el('canvas', { width: 1080, height: 1350 }), x = c.getContext('2d'), Wd = 1080, Hd = 1350;
    const g = x.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, '#0b0d1f'); g.addColorStop(1, '#05060d'); x.fillStyle = g; x.fillRect(0, 0, Wd, Hd);
    const rr = DC.rng(DC.seed('card' + s.score)); x.fillStyle = '#fff';
    for (let i = 0; i < 120; i++) { x.globalAlpha = rr() * .7 + .1; x.fillRect(rr() * Wd, rr() * Hd, 2, 2); } x.globalAlpha = 1;
    const info = pInfo(s.planetId); x.textAlign = 'center';
    x.fillStyle = 'rgba(240,240,250,.72)'; x.font = `600 34px ${FF}`; x.fillText(s.daily ? `행성 착륙 · 오늘의 행성 ${DC.today()}` : '행성 착륙', Wd / 2, 120);
    x.fillStyle = '#f4f1ea'; x.font = `800 64px ${FF}`; x.fillText(`착륙 ${s.landings}번 성공`, Wd / 2, 205);
    const im = getImg(info.img); await new Promise(ok => { if (!im || im.complete) ok(); else { im.addEventListener('load', ok); im.addEventListener('error', ok); } });
    if (im && im.naturalWidth && !meta[info.img]) analyse(info.img, im);
    drawPlanet(x, info.img, Wd / 2, 590, 290, 0);
    const sh = x.createRadialGradient(Wd / 2 - 110, 590 - 120, 30, Wd / 2 - 30, 560, 360); sh.addColorStop(0, 'rgba(255,248,230,.18)'); sh.addColorStop(0.4, 'rgba(255,248,230,0)'); sh.addColorStop(0.85, 'rgba(0,0,12,.55)'); sh.addColorStop(1, 'rgba(0,0,12,.8)');
    x.fillStyle = sh; x.beginPath(); x.arc(Wd / 2, 590, 290, 0, TAU); x.fill();
    ship(x, Wd / 2 + Math.sin(0.55) * 292, 590 - Math.cos(0.55) * 292, 0.55, 120);
    x.fillStyle = '#f0f0fa'; x.font = `800 76px ${FF}`; x.fillText(`${s.score}점`, Wd / 2, 990);
    x.fillStyle = '#f4f1ea'; x.font = `600 46px ${FF}`; x.fillText(`최고 콤보 ${s.bestCombo} · 완벽 ${s.perfects}번`, Wd / 2, 1075);
    const ds = s.drops.slice(0, 16), sz = 40, gap = 12, x0 = Wd / 2 - (ds.length * (sz + gap) - gap) / 2;
    ds.forEach((d, i) => { x.fillStyle = d ? '#5be08a' : '#ff6b6b'; x.beginPath(); x.roundRect(x0 + i * (sz + gap), 1130, sz, sz, 8); x.fill(); });
    x.fillStyle = '#f4f1ea'; x.font = `800 40px ${FF}`; x.fillText(`@${D.site.handle}`, Wd / 2, 1275);
    return c;
  }
  const emojiLines = (s) => { const e = s.drops.map(d => d ? '🟩' : '🟥'); const rows = []; for (let i = 0; i < e.length; i += 10) rows.push(e.slice(i, i + 10).join('')); return rows.join('\n'); };
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); DC.toast('복사했어'); }
    catch { const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select(); try { document.execCommand('copy'); DC.toast('복사했어'); } catch { DC.toast('복사가 막혀 있어'); } ta.remove(); }
  }
  async function showEnd() {
    running = false; const s = sim.s;
    window.dwkT?.gameEnd('land', { score: s.score, why: s.why || 'gap', at: s.stage + 1 }); document.body.classList.remove('l-play'); clearUI(); cardCanvas = null; parts = []; floats = []; flash = 0; shakeAmp = 0; punch = 0; trans = null; card = null; thud = null; pillar = null; wave = null; stamp = null; whiteout = 0; flies = []; banner = null; helpNote = null; boom = null; knock = null; headA = 0; setIdle(true); idleSpin();
    const key = s.daily ? 'land_best_' + DC.today() : 'land_best', old = DC.store.get(key, 0), isBest = s.score > old; if (isBest) DC.store.set(key, s.score);
    if (isBest && s.score > 0) snd('clear');
    window.DP?.event('play', { game: 'land', score: s.score }); // 레벨·코인·미션(dwk-prog.js)
    const prev = el('canvas', { class: 'gx-preview', width: 270, height: 338, 'aria-label': '공유할 결과 카드' });
    // 3차: 「한 판 더」가 폰 첫 화면 아래로 잘려 스크롤해야 눌렀다 → 점수·기록 표시 바로 아래로 올리고, 기록 줄은 그 아래로
    const endPanel = panel(
      el('p', { class: 'gx-eyebrow' }, el('span', {}, '끝'), `우주선 3대를 다 썼어 · ${pInfo(s.planetId).name}${s.daily ? ' · 오늘 문제' : ''}`),
      el('div', { class: 'l-scoreline' },
        el('p', { class: 'gx-score' }, String(s.score), el('small', {}, '점')),
        el('p', { class: 'gx-flag' + (isBest ? '' : ' off') }, isBest ? '내 최고 기록' : `내 최고 ${Math.max(old, s.score)}점`)),
      el('div', { class: 'gx-acts' },
        el('button', { class: 'gx-btn main', type: 'button', onclick: () => start(s.daily ? 'daily' : 'free') }, '한 판 더', el('i')),
        el('button', { class: 'gx-btn', type: 'button', onclick: async () => { cardCanvas = cardCanvas || await drawResultCard(s); DC.shareCanvas(cardCanvas, 'planet-land.png', `행성 착륙 ${s.landings}번 · 최고 콤보 ${s.bestCombo}`); } }, '결과 공유'),
        s.daily ? el('button', { class: 'gx-txt', type: 'button', onclick: () => copyText(`행성 착륙 ${DC.today()} ${s.score}점\n${emojiLines(s)}\n${location.origin}${location.pathname}`) }, '결과 줄 복사') : null),
      el('dl', { class: 'gx-rows' }, row('앉힌 우주선', `${s.landings}대 · 쾅 ${s.drops.length - s.landings}번`), row('완벽 착륙', `${s.perfects}번 · 최고 ${s.bestPstreak}연속`), row('도착한 행성', `${s.stage + 1}번째`), row('버틴 시간', `${Math.round(s.t)}초`)),
      el('p', { class: 'emojis', 'aria-label': '착륙 결과' }, s.drops.map(d => DI.sq(d ? 'g' : 'r'))),
      el('ul', { class: 'gx-rows', 'aria-label': '다른 곳으로' },
        el('li', {}, el('a', { href: 'find.html' }, '다음 게임 · 빈틈 찾기', el('small', {}, '장면마다 8초'))),
        el('li', {}, el('a', { href: 'arcade.html' }, '게임 전부 보기')),
        el('li', {}, el('button', { type: 'button', onclick: showStart }, '이 게임 처음 화면')),
        el('li', {}, el('a', { href: 'start.html' }, '입구로'))),
      s.daily ? null : prev,
      DC.followCta());
    endPanel.classList.add('l-end'); if (isBest && s.score > 0) endPanel.classList.add('l-best'); ui.append(endPanel); // 7차: 신기록이면 점수를 금색으로 튀게(land.css)
    cardCanvas = await drawResultCard(s); if (!s.daily) prev.getContext('2d').drawImage(cardCanvas, 0, 0, 270, 338);
  }
  window.__land = { get sim() { return sim; }, get meta() { return meta; }, planetTo(cv, src) { const x = cv.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, cv.width, cv.height); drawPlanet(x, src, cv.width / 2, cv.height / 2, cv.width * 0.36, 0); }, get fx() { return { parts: parts.length, floats: floats.length, trans: !!trans, card: !!card, beam, note: !!helpNote, banner: banner ? banner.text : null, stamp: !!stamp, boom: !!boom, labelRect, guideRect, cam: camView, cardT: card ? card.t : null, cardY: camView ? camView.nextY : cy, layout: { cx, cy, R, W, H } }; } }; // 시험용 훅(읽기 전용 용도) · 4차: 안내 자리·카메라·배치
  DI.sound(document.getElementById('snd'));
  fit();
  for (const p of pList().slice(0, 3)) getImg(pInfo(p.id).img);
  loadFonts().then(showStart);
})(typeof window !== 'undefined' ? window : globalThis);
