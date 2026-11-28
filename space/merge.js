/* 행성 합치기 — 떨어뜨려서 같은 행성끼리 합치는 물리 퍼즐 (60초 한 판)
   레퍼런스: 「떨어뜨려 합치기」 장르(수박게임류 · 2024-06 누적 1,000만 다운로드 [Aladdin X 발표 · Siliconera]).
   장르·손맛만 가져오고 그림·이름·단계는 전부 돈워너노우 행성. 물리: Matter.js 0.19.0(MIT).
   2026-11-28 게임 품질: 3D 렌더 그림을 배경 지운 스프라이트로(굴러가는 회전·그늘·바닥 그림자) · 누름 즉시 쥐는 반응 · 조준선·떨어질 자리 ·
   합칠 때 빨려 들어감·튀어나옴·고리·불꽃·흔들림·멈칫·느려짐 · 단계별 음 높이 합성음 · 위험선 초읽기 · 60초 + 큰 합치기 보너스 시간 · 끝 장면.
   2026-11-28 3차: 시간제 → 「넘치면 끝」 + 30초 뒤 빨간 선이 내려오는 압박(한 판 약 1분) · 시작 때 바닥 한 줄이 쏟아져 차는 판 · 안내는 위쪽 떨어뜨리는 자리로 ·
   연출은 판 안에서 튕기고(잘림 없음) 새 행성 뒤에 · 넘침은 멈춤 → 받침판 선언 · 단계 색 대기 빛 · 폰 끝 화면 공유 카드는 작은 미리보기.
   2026-11-28 4차: 점수 팝업은 연쇄 합계 하나만(겹침 없음) · 합치기는 짧은 「뽕」(작은 단계 0.2초 안, 큰 단계만 강하게) · 위험은 선 근처 띠 + 점수줄 초읽기 ·
   「넘쳤어!」는 다 보인 뒤 최소 1.5초·30프레임(그려진 프레임 기준) · 작은 행성 테 얇게 · 반딧불 호수 보라 톤 · 점수줄~판 빈 띠 정리.
   의존: data.js → dwk-core.js(window.DC) → matter.min.js */
(() => {
  'use strict';
  const DC = window.DC, D = window.DWK, M = window.Matter;
  const { el } = DC;
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const seat = (params.get('seat') || '').replace(/\D/g, '').slice(0, 3);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 작은 행성 → 큰 행성 (10단계). 마지막 두 개가 합쳐지면 「새 은하」로 사라지며 큰 점수.
  // cut = 공 모양이 아닌 행성(도넛·양·손) — 원으로 자르지 않고 검은 배경만 지운다
  const CUT = new Set(['3-1', '3-3', '2-3']);
  // 2차(2026-11-28 검수): 둘레가 「완전 검정」이 아니라 어두운 빛 번짐인 행성 — 밝기(가장 밝은 채널) lo 이하는 배경, lo~hi는 반투명으로 녹인다.
  // 도넛 원본은 둘레 번짐이 밝기 30~75라 예전 기준(26)으로는 안 지워져 네모난 얼룩이 남았다(화면에서 실측: 아래 번짐 최대 74).
  // 양(3-3)은 얼굴이 검어서 아래쪽(가운데에서 반지름 0.5배 아래)은 예전 기준(거의 검정만 배경)을 그대로 쓴다 — 셋째 값
  const KEY = { '3-1': [78, 132], '2-3': [16, 46], '3-3': [44, 100, 0.5] };
  // 그림이 원본 가장자리에 닿아 일자로 잘린 행성(가시 손) — 둥글게 사라지게 해 네모 잘림이 안 보이게
  const EDGE = new Set(['2-3']);
  // 가로로 넓은 행성(도넛·양) — 반지름을 긴 쪽 기준으로 잡아 몸통 원 안에 들어오게(예전엔 짧은 쪽 기준이라 도넛 양 끝이 원에 잘리고, 양은 벽 밖으로 삐져나왔다)
  const WIDE = new Set(['3-1', '3-3']);
  // 4차: 푸른 칸을 보라 쪽으로(빨강 += 파랑×kr, 초록 ×kg) — 반딧불 호수만
  const TINT = { '1-4': [0.62, 0.7] };
  // 원본 렌더 아래쪽에 찍힌 번호 글씨(01·02)가 있는 줄 — 이 줄부터 아래는 배경으로 본다(420px 원본 기준 · 화면에서 직접 잼)
  const LABEL_Y = { '1-4': 400, '1-1': 385, '1-2': 402, '3-1': 395, '1-3': 403 };
  // 3차: 단계 색(행성 둘레 대기 빛 · 사다리 테 · 합칠 때 빛)을 이웃 단계끼리 색상환에서 멀게 다시 골랐다.
  // 예전엔 흰색·회색 계열이 넷(온천 #e8f1ff · 쇼핑몰 #c7cfdb · 구름 #fff · 하얀 숲 #f2f2f2)이라 작은 크기에서 흰 달과 회색 쇼핑몰이 헷갈렸다(2차 검수).
  const TIERS = [
    { id: '1-4', name: '반딧불 호수', col: '#ffd23f' },  // 노랑
    { id: '3-2', name: '물방울', col: '#38d6ff' },       // 하늘
    { id: '1-1', name: '해바라기', col: '#8fe34a' },     // 연두
    { id: '1-2', name: '온천', col: '#b07cff' },         // 보라(흰 달 → 보라 대기)
    { id: '3-1', name: '디저트', col: '#ff6fae' },       // 분홍
    { id: '2-1', name: '호수', col: '#3f7dff' },         // 파랑
    { id: '1-3', name: '쇼핑몰', col: '#ff9a2e' },       // 주황(회색 쇼핑몰 → 주황 대기)
    { id: '3-3', name: '구름', col: '#3ff0c0' },         // 청록
    { id: '2-2', name: '하얀 산맥', col: '#ff4d5e' },    // 빨강
    { id: '2-3', name: '하얀 숲', col: '#ffe9a0' },      // 금빛
  ].map((t, i) => { const img = (DC.planet(t.id) || {}).img || ''; return { ...t, i, img, icon: img, cut: CUT.has(t.id), r: 18.5 * Math.pow(1.255, i), pts: (i + 1) * (i + 2) / 2 }; });
  const SPAWN_MAX = 4;          // 떨어뜨리는 건 0~4단계만
  // 3차: 시간제 대신 「넘치면 끝」(수박 게임과 같다). 한 판 약 1분은 빨간 선이 내려오는 압박으로 맞춘다 —
  // 첫 행성을 놓고 LINE_T0 뒤부터 선이 초당 LINE_V씩 내려오고(최대 LINE_MAX), 큰 합치기는 선을 밀어 올린다.
  const LINE_T0 = 25000, LINE_V = 7, LINE_MAX = 380;
  const GRACE = 2000;           // 빨간 선 위에 이만큼 머물면 끝
  // 3차: 넘친 뒤 순서 = 마지막 합치기 연출이 마저 끝나는 동안 판이 멈춤(STOP_MS) → 「넘쳤어!」 선언(받침판) → (4차) 선언이 다 보인 뒤 HOLD_MS·HOLD_FR가 지나면 결과 화면
  // 4차: 결과 화면은 시계(END_MS)가 아니라 「선언이 다 보인 첫 프레임」부터 HOLD_MS가 지나고, 그 뒤로 실제로 그린 프레임이 HOLD_FR장 넘을 때 넘어간다
  //   (예전엔 넘친 순간부터 2.6초 시계라, 프레임이 밀리면 선언이 반쯤 그려진 채 결과 화면으로 넘어갈 수 있었다 — 검수 지적)
  const STOP_MS = 520, POP_MS = 220, HOLD_MS = 1500, HOLD_FR = 30;
  const W = 400, H = 600, WALL = 14, TOP = 96, DANGER = 120;
  // 2차: 세로로 긴 폰에서는 판 위쪽(떨어뜨리는 자리)만 EX만큼 늘린다 — 바닥~빨간 선 거리(쌓을 수 있는 양)는 어느 화면에서나 같다.
  // 예전엔 판이 폭에 맞춰 350×525로 고정돼 390×844 폰에서 사다리 아래 약 136px이 비었다(실측).
  // 4차: 판(BY)을 캔버스 맨 위 6까지 올리고, 들고 있는 행성은 판 위 가장자리에 매달리듯(위 맞춤) — 점수줄과 판 사이 약 90px 빈 띠 정리
  let EX = 0, BY = 6, BH = H - 8;
  const holdY = (tier = st ? st.cur : 0) => BY + 12 + TIERS[tier].r;
  const BX = WALL - 4, BW = W - (WALL - 4) * 2;
  const STEP = 1000 / 60;

  // ── 그림: 3D 렌더(img/*.jpg, 검은 배경)를 투명 배경 스프라이트로 바꿔 둔다 ──
  const SPR = 128; // 스프라이트 안에서 행성 반지름(px)
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const IMG = TIERS.map(t => { const im = new Image(); im.src = t.img; return im; });
  const SPRITES = TIERS.map(() => null);
  function makeSprite(im, t) {
    const N = im.naturalWidth, NH = im.naturalHeight, c = mk(N, NH), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, N, NH), p = d.data, n = N * NH;
    const ly = LABEL_Y[t.id]; if (ly) { const y0 = Math.round(ly * NH / 420); for (let k = y0 * N * 4; k < p.length; k += 4) { p[k] = p[k + 1] = p[k + 2] = 0; } }
    // 가장자리에서 이어진 검은 칸 = 배경
    const bg = new Uint8Array(n), q = new Int32Array(n); let h = 0, tl = 0;
    const key = KEY[t.id], mxOf = (k) => { const o = k << 2; return Math.max(p[o], p[o + 1], p[o + 2]); };
    const dark = (k) => { const o = k << 2; return p[o] < 26 && p[o + 1] < 26 && p[o + 2] < 32; };
    let keyY = 1e9; // 이 줄(원본 픽셀 y)보다 아래는 빛 번짐 기준을 안 쓴다(양 얼굴 보호) — 가운데·반지름은 아래에서 다시 잼, 여기선 원본 비율로 어림
    if (key && key[2]) keyY = NH * (0.5 + 0.42 * key[2]);
    const isBg = key ? (k) => ((k / N) | 0) < keyY ? mxOf(k) < key[1] : dark(k) : dark;
    const seed = (k) => { if (bg[k]) return; if (isBg(k)) { bg[k] = 1; q[tl++] = k; } };
    for (let i = 0; i < N; i++) { seed(i); seed((NH - 1) * N + i); }
    for (let j = 0; j < NH; j++) { seed(j * N); seed(j * N + N - 1); }
    while (h < tl) { const k = q[h++], xx = k % N; if (xx > 0) seed(k - 1); if (xx < N - 1) seed(k + 1); if (k >= N) seed(k - N); if (k < n - N) seed(k + N); }
    // 떨어진 작은 조각(그림 아래 번호 글씨·별 점)은 배경으로 — 가장 큰 덩어리의 4%보다 작은 덩어리를 지운다
    const lab = new Int32Array(n), sizes = [0]; let big = 0;
    for (let k0 = 0; k0 < n; k0++) {
      if (bg[k0] || lab[k0]) continue; const id = sizes.length; let cnt = 0; h = 0; tl = 0; lab[k0] = id; q[tl++] = k0;
      while (h < tl) { const k = q[h++], xx = k % N; cnt++; const nb = [xx > 0 ? k - 1 : -1, xx < N - 1 ? k + 1 : -1, k >= N ? k - N : -1, k < n - N ? k + N : -1]; for (const m of nb) if (m >= 0 && !bg[m] && !lab[m]) { lab[m] = id; q[tl++] = m; } }
      sizes.push(cnt); if (cnt > big) big = cnt;
    }
    const minKeep = Math.max(400, big * 0.04);
    for (let k = 0; k < n; k++) if (!bg[k] && sizes[lab[k]] < minKeep) bg[k] = 1;
    // 행·열마다 행성이 차지한 폭으로 상자 → 가운데·반지름 (별 점·아래 번호 글씨처럼 작은 것은 무시)
    const rows = new Uint16Array(NH), cols = new Uint16Array(N);
    for (let k = 0; k < n; k++) if (!bg[k]) { rows[(k / N) | 0]++; cols[k % N]++; }
    const span = (arr, len, lim) => { let a = 0, b = len - 1; while (a < len - 1 && arr[a] < lim) a++; while (b > a && arr[b] < lim) b--; return [a, b]; };
    const [y0, y1] = span(rows, NH, N * 0.08), [x0, x1] = span(cols, N, NH * 0.08);
    const ccx = (x0 + x1) / 2, ccy = (y0 + y1) / 2;
    const R = Math.max(24, WIDE.has(t.id) ? Math.max(x1 - x0, y1 - y0) / 2 * 0.97 : Math.min(x1 - x0, y1 - y0) / 2);
    // 투명도: 공 모양 = 원 안 전부(그늘진 가장자리까지) · 그 밖 = 배경만 지우고 부드럽게
    // keep(그림을 남기는 원)은 스프라이트 칸(반지름 1.36R) 안쪽이어야 네모로 잘리지 않는다
    const A = new Float32Array(n), keep = R * (t.cut ? 1.3 : 1.0);
    // 원본 가장자리에 닿은 그림은 원본 테두리 4px 안쪽에서 둥글게 사라지게(폭 0.16R)
    const rEdge = EDGE.has(t.id) ? Math.min(keep, ccx - 4, N - 4 - ccx, ccy - 4, NH - 4 - ccy) : 0, fw = R * 0.16;
    for (let k = 0; k < n; k++) {
      const xx = k % N, yy = (k / N) | 0, dd = Math.hypot(xx - ccx, yy - ccy);
      // 공 모양도 가장자리 띠(반지름 86% 밖)에서는 배경을 지워 검은 테가 안 남게 · 빛 번짐 행성은 밝기에 따라 반투명
      let a = 1;
      if (bg[k] && (t.cut || dd > R * 0.86)) a = key ? Math.max(0, Math.min(1, (mxOf(k) - key[0]) / (key[1] - key[0]))) : 0;
      if (rEdge) a *= Math.max(0, Math.min(1, (rEdge - dd) / fw));
      A[k] = a * Math.max(0, Math.min(1, (keep - dd) / 1.6 + 0.5));
    }
    { // 가장자리 계단 줄이기(3×3 평균)
      const B = A.slice();
      for (let yy = 1; yy < NH - 1; yy++) for (let xx = 1; xx < N - 1; xx++) { const k = yy * N + xx; A[k] = Math.min(B[k], (B[k - 1] + B[k + 1] + B[k - N] + B[k + N] + B[k - N - 1] + B[k - N + 1] + B[k + N - 1] + B[k + N + 1] + B[k]) / 9 * 1.25); }
    }
    for (let k = 0; k < n; k++) p[(k << 2) + 3] = Math.round(A[k] * 255);
    // 4차: 1단계(반딧불 호수)와 2단계(물방울)가 둘 다 파랑이라 작은 크기에서 헷갈렸다(검수) — 새 그림 없이 반딧불 호수의 푸른 칸만 보라 쪽으로 옮긴다.
    //   노란 반딧불(빨강 > 파랑인 칸)은 그대로 둔다. 원본 파일은 안 바뀐다(불러온 뒤 화면용 사본만)
    if (TINT[t.id]) { const [kr, kg] = TINT[t.id]; for (let k = 0; k < n; k++) { const o = k << 2, r0 = p[o], g0 = p[o + 1], b0 = p[o + 2]; if (b0 > r0 + 6) { p[o] = Math.min(255, r0 * 0.55 + b0 * kr); p[o + 1] = g0 * kg; } } }
    x.putImageData(d, 0, 0);
    const S = Math.ceil(SPR * 2 * 1.36), o = mk(S, S), ox = o.getContext('2d'), k = SPR / R;
    ox.imageSmoothingQuality = 'high';
    ox.drawImage(c, S / 2 - ccx * k, S / 2 - ccy * k, N * k, NH * k);
    // 작은 그림(다음·사다리·시작 화면) — 투명 배경
    // 모양 행성(도넛·양·손)은 그림이 반지름의 1.3배까지 뻗으므로 작게 넣어 칸(112) 밖으로 네모나게 잘리지 않게
    const ic = mk(112, 112), icx = ic.getContext('2d'), kk = (t.cut ? 41 : 50) / SPR;
    icx.imageSmoothingQuality = 'high'; icx.drawImage(o, 56 - S / 2 * kk, 56 - S / 2 * kk, S * kk, S * kk);
    if (!t.cut) { icx.drawImage(SHADE, 6, 6, 100, 100); }
    return { img: o, S, icon: ic.toDataURL('image/png') };
  }
  // 고정 빛(굴러도 빛 방향은 그대로): 가장자리 어둡게 · 왼쪽 위 밝게 · 얇은 테두리 빛
  const SHADE = (() => {
    const s = SPR * 2, c = mk(s, s), x = c.getContext('2d');
    x.beginPath(); x.arc(SPR, SPR, SPR, 0, 6.283); x.clip();
    let g = x.createRadialGradient(SPR, SPR, SPR * 0.5, SPR, SPR, SPR); g.addColorStop(0, 'rgba(0,0,14,0)'); g.addColorStop(1, 'rgba(0,0,14,.48)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    g = x.createLinearGradient(SPR * 0.4, SPR * 0.3, SPR * 1.75, SPR * 1.85); g.addColorStop(0, 'rgba(0,0,10,0)'); g.addColorStop(1, 'rgba(0,0,10,.32)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    g = x.createRadialGradient(SPR * 0.62, SPR * 0.52, 0, SPR * 0.62, SPR * 0.52, SPR * 0.62); g.addColorStop(0, 'rgba(255,255,255,.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.lineWidth = SPR * 0.045; x.strokeStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.arc(SPR, SPR, SPR * 0.975, Math.PI * 1.02, Math.PI * 1.62); x.stroke();
    return c;
  })();
  // 바닥 그림자(부드러운 검은 원)
  const SHADOW = (() => { const s = SPR * 3, c = mk(s, s), x = c.getContext('2d'), g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.55, 'rgba(0,0,0,.32)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; })();
  // 단계 색 빛 무리
  const GLOW = TIERS.map(t => { const s = 128, c = mk(s, s), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, t.col); g.addColorStop(.35, hexA(t.col, .45)); g.addColorStop(1, hexA(t.col, 0)); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; });
  const WGLOW = (() => { const s = 128, c = mk(s, s), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); return c; })();
  function hexA(hex, a) { const v = parseInt(hex.slice(1), 16); return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`; }
  IMG.forEach((im, i) => {
    const go = () => { try { SPRITES[i] = makeSprite(im, TIERS[i]); TIERS[i].icon = SPRITES[i].icon; refreshIcons(); } catch (e) { console.warn('행성 그림 처리 실패 — 색 원으로 그린다', TIERS[i].id, e); } };
    if (im.complete && im.naturalWidth) go(); else im.addEventListener('load', go, { once: true });
  });
  function refreshIcons() {
    document.querySelectorAll('[data-tier]').forEach(n => { const t = TIERS[+n.dataset.tier]; if (t && !n.classList.contains('unknown-i')) n.style.backgroundImage = `url(${t.icon})`; });
  }
  // 행성 하나 그리기(게임판·공유 카드 공용)
  function drawPlanet(c, tier, x, y, r, ang = 0, sx = 1, sy = 1, alpha = 1) {
    const t = TIERS[tier], s = SPRITES[tier], k = r / SPR;
    c.save(); c.globalAlpha = alpha; c.translate(x, y); if (sx !== 1 || sy !== 1) c.scale(sx, sy);
    if (s) {
      c.rotate(ang); c.drawImage(s.img, -s.S / 2 * k, -s.S / 2 * k, s.S * k, s.S * k); c.rotate(-ang);
      if (!t.cut) c.drawImage(SHADE, -r, -r, r * 2, r * 2);
    } else {
      const g = c.createRadialGradient(-r * .35, -r * .4, r * .05, 0, 0, r); g.addColorStop(0, '#fff'); g.addColorStop(.3, t.col); g.addColorStop(1, '#1a1d33');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill();
    }
    c.restore();
  }

  // ── 소리: Web Audio 합성(파일 없음). 끄기는 DC.sfx 설정을 그대로 따른다. 큰 순간은 DC.sfx 것을 쓴다 ──
  const SND = (() => {
    let ac = null, out = null, nb = null, lastLand = 0;
    const on = () => !DC.sfx.on || DC.sfx.on();
    function ctx() {
      if (!on()) return null;
      try {
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
          out = ac.createGain(); out.gain.value = 0.85; out.connect(comp); comp.connect(ac.destination);
          const len = (ac.sampleRate * 0.5) | 0; nb = ac.createBuffer(1, len, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
      } catch (e) { console.warn('소리 준비 실패 — 소리 없이 진행', e); return null; }
    }
    function tone(f, t0, dur, type = 'sine', vol = 0.1, f2 = 0, att = 0.005) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(t0, dur, vol, f1, f2 = 0, qv = 1.2, type = 'bandpass') {
      const s = ac.createBufferSource(); s.buffer = nb; const bf = ac.createBiquadFilter(); bf.type = type; bf.Q.value = qv; bf.frequency.setValueAtTime(f1, t0); if (f2) bf.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(bf).connect(g).connect(out); s.start(t0); s.stop(t0 + dur + 0.02);
    }
    // 합칠 때 음: 단계가 오를수록 한 칸씩 높아지는 5음 음계 · 콤보면 반음씩 더 높게
    const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
    const play = (fn) => { if (ctx()) try { fn(ac.currentTime); } catch (e) { console.warn('소리 재생 실패', e); } };
    return {
      unlock: () => ctx(),
      grab: () => play((t) => tone(1046, t, 0.035, 'sine', 0.03)),
      drop: (tier) => play((t) => { noise(t, 0.12, 0.045, 2200, 600, 0.8); tone(460 - tier * 30, t, 0.1, 'sine', 0.07, 250 - tier * 18); }),
      land: (r, v) => { const now = performance.now(); if (now - lastLand < 45) return; lastLand = now; play((t) => { const vol = Math.min(0.17, 0.03 + v * 0.02), f = 210 - Math.min(150, r * 1.3); tone(f + 50, t, 0.14, 'sine', vol, f * 0.6); noise(t, 0.05, vol * 0.45, 900, 300, 0.7, 'lowpass'); }); },
      merge: (nt, combo) => play((t) => {
        const f = SCALE[Math.min(9, nt)] * Math.pow(2, Math.min(7, combo - 1) / 12);
        tone(f * 0.5, t, 0.07, 'sine', 0.13, f * 1.05);             // 뽁(아래에서 위로)
        tone(f, t + 0.03, 0.24, 'triangle', 0.09);
        tone(f * 1.5, t + 0.07, 0.28, 'sine', 0.045);
        noise(t, 0.07, 0.06, 3200, 1400, 1.5);
        if (nt < 5) { noise(t, 0.12, 0.07, 5200, 2600, 2); tone(f * 2, t + 0.05, 0.12, 'sine', 0.04); } // 2차: 작은 합치기도 「팡」 반짝 소리
        if (nt >= 5) { tone(f * 2, t + 0.1, 0.45, 'sine', 0.035); tone(f / 4, t, 0.4, 'sine', 0.16, f / 8); }
      }),
      warn: () => play((t) => tone(740, t, 0.07, 'square', 0.03)),
      lineDown: () => play((t) => { tone(330, t, 0.18, 'triangle', 0.06, 220); tone(330, t + 0.2, 0.24, 'triangle', 0.06, 196); }), // 3차: 선이 내려오기 시작
      bonus: () => play((t) => { tone(1568, t, 0.1, 'triangle', 0.05); tone(2093, t + 0.06, 0.14, 'triangle', 0.045); }),
      boom: () => play((t) => { tone(95, t, 0.7, 'sine', 0.24, 38); noise(t, 0.55, 0.13, 700, 80, 0.7, 'lowpass'); }),
      stop: () => play((t) => { tone(160, t, 0.16, 'sine', 0.16, 70); noise(t, 0.08, 0.08, 500, 120, 0.7, 'lowpass'); }), // 3차: 넘친 순간 「뚝」 멈춤
    };
  })();

  // ── 상태 ──
  let engine, world, cv, cx, bgc = null, scale = 1, dpr = 1, raf = 0;
  let bodies = [], parts = [], rings = [], pops = [], ghosts = [], flashes = [], sparks = [];
  let st = null;
  const lat = []; // 누름 → 화면 반영까지(ms) 실측

  function home() {
    cancelAnimationFrame(raf);
    const box = $('#stage'); box.replaceChildren();
    const best = DC.store.get('best_merge', 0);
    const got = DC.endings.got('merge').length;
    const done = DC.store.get('mergeDaily_' + DC.today(), null);
    // 행성 10단계가 화면 폭을 채우게: 가장 큰 것 = 폭의 약 1/5
    const gap = innerWidth >= 900 ? 14 : 6, wide = Math.min(document.documentElement.clientWidth, 1180) - (innerWidth >= 900 ? 80 : 40) - gap * 9, big = Math.min(150, wide / 4.45), k = big / Math.pow(1.255, 9);
    box.classList.add('gx-wide');
    box.append(
      el('section', { class: 'gx-hero m-hero' },
        el('div', { class: 'chain', 'aria-hidden': 'true' }, TIERS.map(t => { const d = Math.round(k * Math.pow(1.255, t.i)), z = t.cut ? Math.round(d * 50 / 41) : d, m = (d - z) / 2; /* 모양 행성 아이콘은 칸 안에 작게 그려 두었으니(네모 잘림 방지) 칸을 키워 같은 크기로 보이게 */ return el('span', { class: 'chip', title: t.name, 'data-tier': t.i, style: `background-image:url(${t.icon});width:${z}px;height:${z}px;margin:0 ${m}px ${m}px` }); })),
        el('div', { class: 'gx-cap' },
          el('p', { class: 'gx-eyebrow' }, el('span', {}, '01'), '1분 게임'),
          el('h1', { class: 'gx-h1' }, '행성 합치기'),
          el('p', { class: 'gx-sub' }, '같은 행성끼리 닿으면 한 단계 큰 행성이 돼. 25초가 지나면 빨간 선이 점점 내려와. ', el('b', {}, '선 위로 넘치면 끝.')),
          el('div', { class: 'gx-acts' },
            el('button', { class: 'gx-btn main', type: 'button', onclick: () => start(false) }, '시작', el('i')),
            el('button', { class: 'gx-btn', type: 'button', onclick: () => start(true) }, done ? '오늘 문제 다시' : '오늘 문제')),
          el('dl', { class: 'gx-rows' },
            el('div', {}, el('dt', {}, '내 최고'), el('dd', {}, best ? `${best.toLocaleString()}점` : '아직 없음')),
            el('div', {}, el('dt', {}, '만난 행성'), el('dd', {}, `${Math.max(got, SPAWN_MAX + 1)} / ${TIERS.length}`)),
            el('div', {}, el('dt', {}, `오늘 문제 · 모두 같은 순서`), el('dd', {}, done ? `${done.score.toLocaleString()}점` : '아직 안 함'))),
          DC.followCta())));
    scrollTo(0, 0);
  }

  function start(daily) {
    cancelAnimationFrame(raf);
    const rnd = daily ? DC.rng(DC.seed('merge' + DC.today())) : Math.random;
    // 난이도 곡선(떨어뜨린 개수 기준 — 오늘 문제는 모두 같은 순서): 첫 둘은 같은 행성(바로 합쳐 보며 규칙을 안다) → 작은 것 위주 → 점점 큰 것도
    // 3차: 첫 손에 든 행성은 1단계(조금 더 크게) — 판에 미리 깔린 1단계 위에 놓으면 바로 합쳐지고, 옆의 2단계와 이어 합쳐질 수 있다
    const spawn = (k) => {
      const r = rnd();
      if (k < 2) return 1;
      if (k < 12) return r < 0.45 ? 0 : r < 0.8 ? 1 : 2;
      if (k < 30) return r < 0.32 ? 0 : r < 0.62 ? 1 : r < 0.85 ? 2 : 3;
      return r < 0.26 ? 0 : r < 0.52 ? 1 : r < 0.74 ? 2 : r < 0.9 ? 3 : 4;
    };
    st = { daily, spawn, k: 2, score: 0, combo: 0, comboT: 0, cur: spawn(0), next: spawn(1), x: W / 2, canDrop: true, holdPop: 1, grip: 0, down: false,
      over: false, reason: '', overT: 0, warnT: 0, maxTier: 0, drops: 0, merges: 0, galaxies: 0,
      shake: 0, flash: 0, freeze: 0, slow: 0, started: false, el: 0, lastSec: 0, dz: DANGER, dzT: DANGER, lineOn: false, lineSoon: false, intro: 1, endT: 0, declared: false, banner: null, firstMerge: false, t0: 0 };
    const box = $('#stage'); box.replaceChildren(); box.classList.remove('gx-wide'); hwLast = '';
    cv = el('canvas', { id: 'board', 'aria-label': '행성 합치기 판' });
    const best = DC.store.get('best_merge', 0);
    box.append(el('div', { class: 'm-play' },
      el('div', { class: 'gx-hud m-hud' },
        el('div', {}, el('small', {}, daily ? '오늘 문제' : '점수'), el('b', { id: 'score' }, '0')),
        el('div', { class: 'm-time', id: 'timebox' }, el('small', {}, '버틴 시간'), el('b', { id: 'time' }, '0')),
        el('div', { class: 'dim' }, el('small', {}, '내 최고'), el('b', {}, best ? best.toLocaleString() : '–')),
        el('div', { class: 'm-warn', 'aria-live': 'assertive' }, el('small', {}, '넘치기 직전!'), el('b', { id: 'warnsec' }, '')),
        el('div', { class: 'nextbox push' }, el('small', {}, '다음'), el('span', { id: 'next', class: 'chip', 'data-tier': st.next }))),
      el('div', { class: 'boardwrap' }, cv),
      el('div', { class: 'ladder', id: 'ladder', 'aria-label': '행성 단계' })));
    renderLadder();
    setupPhysics();
    fit(); addEventListener('resize', fit);
    bindInput();
    if (!DC.store.get('seen_merge', false)) { box.querySelector('.boardwrap').append(el('div', { class: 'coach', id: 'coach' }, el('div', { class: 'hand' }, DI.ic('tap')))); placeCoach(); }
    // 3차: 판이 빈 채로 시작하지 않게 — 시작하자마자 작은 행성 13개가 위에서 차례로 쏟아져 바닥 두 줄을 채운다(첫 1.5초 안에 판 아래 약 3분의 1이 찬다).
    // 이웃끼리는 다른 단계라 저절로 합쳐지지 않는다(아랫줄 이웃·윗줄 이웃·위아래로 닿는 둘 모두). 1단계는 첫 손 행성과 같아 바로 합칠 자리, 그 곁 2단계·3단계는 이어 합쳐질 자리.
    const PILE = [[0, 33], [3, 89], [2, 155], [1, 207], [0, 249], [3, 304], [0, 358], // 아랫줄: 지름 합 361 ≤ 판 안쪽 폭 372
      [2, 61], [1, 122], [0, 181], [3, 228], [1, 276], [2, 331]];                     // 윗줄: 아랫줄 두 행성 사이 골에 앉는다
    PILE.forEach(([tier, x], i) => setTimeout(() => { if (!st || st.over || cv !== $('#board')) return; const b = addPlanet(tier, x, st.dz + 24 + (i % 2) * 18); M.Body.setVelocity(b, { x: 0, y: 7 }); b.plugin.pre = true; }, 60 + i * 70 + (i >= 7 ? 180 : 0)));
    updHud();
    let last = performance.now(), acc = 0;
    const loop = (t) => {
      const dt = Math.min(100, t - last); last = t;
      frame(dt);
      // 물리: 멈칫(큰 합치기) 동안은 멈추고, 느려짐 동안은 0.35배
      if (!st.over) {
        if (st.freeze > 0) st.freeze -= dt;
        else { acc += dt * (st.slow > 0 ? 0.35 : 1); while (acc >= STEP) { step(STEP); acc -= STEP; } }
      }
      draw();
      if (st.over && st.fullT && performance.now() - st.fullT >= HOLD_MS && st.fullFr >= HOLD_FR) { st.heldMs = Math.round(performance.now() - st.fullT); showEnd(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function setupPhysics() {
    // 3차: 중력 1.1 → 1.35 — 떨어지는 시간이 줄어 손맛이 빨라진다(첫 행성이 바닥까지 한참 걸린다는 지적)
    engine = M.Engine.create({ gravity: { x: 0, y: 1.35 }, positionIterations: 8, velocityIterations: 6 });
    world = engine.world; bodies = []; parts = []; rings = []; pops = []; ghosts = []; flashes = []; sparks = [];
    const opt = { isStatic: true, friction: 0.4, restitution: 0.1 };
    M.Composite.add(world, [
      M.Bodies.rectangle(W / 2, H + 40 - 2, W + 200, 80, opt),
      M.Bodies.rectangle(-40 + WALL, H / 2, 80, H * 3, opt),
      M.Bodies.rectangle(W + 40 - WALL, H / 2, 80, H * 3, opt),
    ]);
    M.Events.on(engine, 'collisionStart', (ev) => {
      for (const pr of ev.pairs) {
        const a = pr.bodyA, b = pr.bodyB, ta = a.plugin.tier, tb = b.plugin.tier;
        // 부딪힘 손맛: 처음 닿을 때 찌그러짐 + 크기에 맞는 쿵
        const v = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        for (const o of [a, b]) if (o.plugin.tier !== undefined && (!o.plugin.landed || v > 4)) { o.plugin.landed = true; if (v > 1.2) { o.plugin.sq = Math.min(1, v / 7); SND.land(TIERS[o.plugin.tier].r, v); } }
        if (ta === undefined || tb === undefined) continue;
        if (ta !== tb || a.plugin.gone || b.plugin.gone || st.over) continue;
        a.plugin.gone = b.plugin.gone = true;
        st.pending = st.pending || []; st.pending.push([a, b]);
      }
    });
  }
  function addPlanet(tier, x, y, born = 0) {
    const t = TIERS[tier];
    const body = M.Bodies.circle(x, y, t.r, { restitution: 0.14, friction: 0.12, frictionStatic: 0.4, frictionAir: 0.004, density: 0.0012 + tier * 0.0002 });
    body.plugin = { tier, born: performance.now() + born, pop: 1, sq: 0, landed: false };
    M.Composite.add(world, body); bodies.push(body);
    return body;
  }

  // 실제 시간으로 흐르는 것(시간·연출)
  function frame(dt) {
    if (st.over) {
      if (!st.declared && performance.now() - st.endT > STOP_MS) { st.declared = true; DC.sfx('die'); DC.buzz(120); }
      tickFx(dt); return;
    }
    if (st.started) {
      st.el += dt;
      const sec = Math.floor(st.el / 1000);
      if (sec !== st.lastSec) { st.lastSec = sec; updTime(); }
      // 3차: 시계로 끝내지 않는다. LINE_T0가 지나면 빨간 선이 내려오며 판을 조인다(큰 합치기는 선을 밀어 올림)
      if (!st.lineSoon && st.el > LINE_T0 - 3000) { st.lineSoon = true; say('3초 뒤 빨간 선이 내려와!', '#ff8a92'); }
      if (!st.lineOn && st.el > LINE_T0) { st.lineOn = true; SND.lineDown(); DC.buzz([15, 40, 15]); say('빨간 선이 내려온다 · 합쳐서 버텨!', '#ff8a92'); updTime(); }
      if (st.lineOn && st.freeze <= 0) st.dzT = Math.min(LINE_MAX, st.dzT + LINE_V * dt / 1000);
      st.dz += (st.dzT - st.dz) * Math.min(1, dt / 160);
    }
    st.intro = st.started ? Math.max(0, st.intro - dt / 350) : 1;
    st.grip += ((st.down ? 1 : 0) - st.grip) * Math.min(1, dt / 70);
    st.holdPop = Math.min(1, st.holdPop + dt / 220);
    st.slow = Math.max(0, st.slow - dt);
    tickFx(dt);
  }
  function tickFx(dt) {
    const k = dt / 16.67;
    parts = parts.filter(p => (p.life -= dt) > 0); for (const p of parts) { p.px = p.x; p.py = p.y; p.x += p.vx * k; p.y += p.vy * k; p.vy += (p.g || 0.12) * k; p.vx *= 0.985; if (!p.puff) bounce(p); }
    rings = rings.filter(r => (r.t += dt) < r.life);
    pops = pops.filter(p => (p.t += dt) < p.life);
    ghosts = ghosts.filter(g => (g.t += dt) < g.life);
    flashes = flashes.filter(f => (f.t += dt) < f.life);
    sparks = sparks.filter(p => (p.t += dt) < p.life); for (const p of sparks) { p.x += p.vx * k; p.y += p.vy * k; p.vy += 0.05 * k; p.vx *= 0.97; p.rot += 0.08 * k; bounce(p); }
    if (st.banner && (st.banner.t += dt) > st.banner.life) st.banner = null;
    if (st.msg && (st.msg.t += dt) > st.msg.life) st.msg = null;
    st.shake = Math.max(0, st.shake - dt / 320);
    st.flash = Math.max(0, st.flash - dt / 260);
    for (const b of bodies) { b.plugin.pop = Math.max(0, b.plugin.pop - dt / (b.plugin.popMs || 340)); b.plugin.sq = Math.max(0, b.plugin.sq - dt / 170); }
  }

  // 3차: 불꽃·즙은 판 벽·바닥에 닿으면 잘려 사라지는 대신 튕겨 나온다(바닥·왼쪽 벽 합치기에서 연출이 잘린다는 지적)
  function bounce(p) {
    const lo = BX + 4, hi = BX + BW - 4, fl = H - 4;
    if (p.x < lo) { p.x = lo + (lo - p.x); p.vx = Math.abs(p.vx) * 0.6; p.px = p.x; }
    else if (p.x > hi) { p.x = hi - (p.x - hi); p.vx = -Math.abs(p.vx) * 0.6; p.px = p.x; }
    if (p.y > fl) { p.y = fl - (p.y - fl); p.vy = -Math.abs(p.vy) * 0.45; p.vx *= 0.8; p.py = p.y; }
  }
  // 3차: 판 위쪽(떨어뜨리는 자리)에 짧은 알림 띠 — 판 가운데를 가리지 않는다
  function say(txt, col = '#ffe066', life = 2200) { st.msg = { txt, col, t: 0, life }; }

  function step(dt) {
    M.Engine.update(engine, dt);
    if (st.pending && st.pending.length) { for (const [a, b] of st.pending) merge(a, b); st.pending = []; }
    if (st.comboT > 0) { st.comboT -= dt; if (st.comboT <= 0) st.combo = 0; }
    // 끝 판정: 떨어진 지 1초 지난 행성이 빨간 선 위에 2초 머물면 끝(그동안 초읽기)
    const now = performance.now();
    st.offenders = bodies.filter(b => now - b.plugin.born > 1000 && b.position.y - TIERS[b.plugin.tier].r < st.dz && Math.abs(b.velocity.y) < 1.2);
    st.overT = st.offenders.length ? st.overT + dt : Math.max(0, st.overT - dt * 2);
    if (st.offenders.length) { st.warnT -= dt; if (st.warnT <= 0) { SND.warn(); DC.buzz(10); st.warnT = 420; } } else st.warnT = 0;
    if (st.overT > GRACE && !st.over) finish('over');
  }

  function merge(a, b) {
    const tier = a.plugin.tier;
    const x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
    // 빨려 들어가는 두 행성(그림만) — 0.09초 동안 가운데로 모이며 작아짐
    ghosts.push({ tier, ax: a.position.x, ay: a.position.y, bx: b.position.x, by: b.position.y, aa: a.angle, ba: b.angle, x, y, t: 0, life: 90 });
    M.Composite.remove(world, a); M.Composite.remove(world, b);
    bodies = bodies.filter(o => o !== a && o !== b);
    if (st.comboT <= 0) st.chainBase = st.score; // 4차: 연쇄가 시작될 때의 점수 — 팝업은 「이 연쇄로 오른 점수」 하나만 보여 점수판과 맞는다
    st.combo = st.comboT > 0 ? st.combo + 1 : 1; st.comboT = 1000; st.merges++;
    let gain, nt = tier + 1;
    if (tier === TIERS.length - 1) { // 최고 단계 둘 = 새 은하
      nt = tier; gain = 500 * st.combo; st.galaxies++;
      burst(x, y, '#ffe17a', 90, 9); burst(x, y, '#ffffff', 40, 6); flashes.push({ x, y, r: 90, t: 0, life: 520, tier: 0 });
      rings.push({ x, y, r0: 20, r1: 260, t: 0, life: 900, col: '#ffe17a', w: 10 });
      st.shake = 1.6; st.flash = 0.7; st.freeze = 120; st.slow = 900; liftLine(70);
      DC.sfx('win'); SND.boom(); DC.buzz([30, 50, 30]);
      st.banner = { tier, title: '새 은하 탄생!', sub: `+${gain}`, t: 0, life: 1800 };
      DC.endings.add('merge', 'galaxy', '새 은하 탄생'); DC.rewards.add('badge-galaxy', '은하 배지', '행성 합치기');
    } else {
      const nb = addPlanet(nt, x, y, -1000); nb.plugin.pop = 1; nb.plugin.landed = true;
      M.Body.setAngle(nb, (a.angle + b.angle) / 2);
      M.Body.setVelocity(nb, { x: (a.velocity.x + b.velocity.x) / 2, y: Math.min(0, (a.velocity.y + b.velocity.y) / 2) - 0.6 });
      // 둘레 행성을 살짝 밀어냄(합쳐지는 힘)
      const R = TIERS[nt].r;
      for (const o of bodies) { if (o === nb) continue; const dx = o.position.x - x, dy = o.position.y - y, d = Math.hypot(dx, dy) || 1; if (d < R + TIERS[o.plugin.tier].r + 12) M.Body.setVelocity(o, { x: o.velocity.x + dx / d * 1.3, y: o.velocity.y + dy / d * 1.0 - 0.4 }); }
      gain = TIERS[nt].pts * Math.max(1, st.combo);
      const t = TIERS[nt];
      // 4차: 수박 게임처럼 짧고 깔끔한 「뽕」 — 검수: 폭죽·원형 파동·반짝이가 한꺼번에 터져 합쳐진 행성이 가려졌다.
      //   작은 단계(새 행성 0~4): 새 행성이 0.2초 안에 톡 튀어나오고(POP), 가장자리에서 얇은 고리 하나 + 즙 몇 방울이 0.2초 안에 사라진다. 흔들림·번쩍·반짝이 없음
      //   중간(5~6): 고리 둘 + 즙 + 작은 반짝이 몇 개 · 약한 흔들림
      //   큰 단계(7~): 예전의 강한 연출(빛 무리·고리 셋·불꽃·반짝이·흔들림·하얀 번쩍임·멈칫)
      const big = nt >= 7, mid = nt >= 5 && !big;
      nb.plugin.popMs = big ? 380 : mid ? 300 : 200;
      if (big) {
        burst(x, y, t.col, 22 + nt * 5, 3.2 + nt * 0.55, R * 0.85); burst(x, y, '#ffffff', 8 + nt * 2, 2.6 + nt * 0.4, R * 0.85); puff(x, y, nt);
        flashes.push({ x, y, r: R, t: 0, life: 260 + nt * 20, tier: nt });
        for (let i = 0; i < 5 + nt; i++) { const a = Math.random() * 6.283, sp = 1.6 + Math.random() * (2 + nt * 0.3); sparks.push({ x: x + Math.cos(a) * R * 0.95, y: y + Math.sin(a) * R * 0.95, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, t: 0, life: 620 + Math.random() * 320, size: 6 + Math.random() * 4 + nt * 0.7, rot: Math.random() * 3, col: i % 2 ? '#ffffff' : t.col }); }
        rings.push({ x, y, r0: R * 1.02, r1: R * 2.1 + 18, t: 0, life: 300, col: '#ffffff', w: 4 });
        rings.push({ x, y, r0: R * 1.0, r1: R * 2.5 + 20, t: 0, life: 480 + nt * 30, col: t.col, w: 7 + nt * 0.8 });
        rings.push({ x, y, r0: R, r1: R * 3 + 40, t: -60, life: 620, col: '#ffffff', w: 3 });
        st.shake = Math.max(st.shake, nt >= 8 ? 1.2 : 0.75); st.flash = Math.max(st.flash, nt >= 8 ? 0.35 : 0.2);
        st.freeze = 40 + (nt - 5) * 18; if (nt >= 8) st.slow = 500;
      } else if (mid) {
        drops(x, y, t.col, 12, 2.6, R * 0.9, 300);
        flashes.push({ x, y, r: R, t: 0, life: 220, tier: nt, soft: true });
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.7, sp = 2.2; sparks.push({ x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 320, size: 7, rot: 0, col: '#ffffff' }); }
        rings.push({ x, y, r0: R * 1.0, r1: R * 1.6 + 8, t: 0, life: 240, col: '#ffffff', w: 3 });
        rings.push({ x, y, r0: R * 1.0, r1: R * 1.9 + 12, t: 0, life: 320, col: t.col, w: 4 });
        st.shake = Math.max(st.shake, 0.3); st.freeze = 40;
      } else {
        drops(x, y, t.col, 6 + nt, 1.9 + nt * 0.25, R * 0.9, 190);
        rings.push({ x, y, r0: R * 1.0, r1: R * 1.45 + 4, t: 0, life: 190, col: t.col, w: 2.5 });
      }
      if (nt >= 8) liftLine(45); else if (nt >= 6) liftLine(24); else if (nt >= 5) liftLine(10);
      SND.merge(nt, st.combo); DC.buzz(nt >= 5 ? 30 : 12);
      if (nt > st.maxTier) {
        const first = DC.endings.add('merge', 'tier' + nt, t.name);
        st.maxTier = nt; renderLadder(nt);
        if (first && nt > SPAWN_MAX) { st.banner = { tier: nt, title: t.name, sub: '새 행성 발견', t: 0, life: 1600 }; DC.sfx('unlock'); }
      }
      // 3차: 「이렇게 합쳐져!」는 판 가운데가 아니라 위쪽 알림 띠에
      if (!st.firstMerge && st.started) { st.firstMerge = true; if (st.drops <= 3 && !DC.store.get('seen_merge2', false)) { DC.store.set('seen_merge2', true); say('이렇게 합쳐져! 더 크게 키워 봐'); } }
    }
    st.score += gain; st.lastMerge = { x, y, nt }; // 확인용(촬영 도구가 벽·바닥 합치기를 골라 찍는다)
    // 2차: 점수·콤보 글자는 흰색/노랑 + 단계 색 빛 테두리(예전 콤보는 단계 색이라 회색 단계에서 흐렸다)
    // 3차: 글자는 새 행성 위쪽에 띄워 합쳐진 결과를 가리지 않고, 판 안쪽으로 당겨 벽·바닥에 잘리지 않게(글자 폭은 draw에서 재서 맞춘다)
    const gcol = TIERS[Math.min(9, nt)].col, Rn = TIERS[Math.min(9, nt)].r, py = y - Rn - 14;
    // 4차: 점수 팝업은 늘 하나 — 앞 팝업을 지우고 연쇄 합계(점수판이 이번 연쇄로 오른 만큼)를 새 자리에 띄운다. 콤보 글자도 하나만
    pops = pops.filter(p => !p.kind);
    const chain = st.score - (st.chainBase || 0);
    pops.push({ kind: 'score', x, y: py, txt: `+${chain.toLocaleString()}`, val: chain, t: 0, life: 900, size: 20 + Math.min(14, nt * 1.6) + Math.min(6, (st.combo - 1) * 2), col: '#ffffff', glow: gcol, fit: true });
    if (st.combo > 1) pops.push({ kind: 'combo', x, y: py - 28 - Math.min(9, st.combo * 1.6), txt: `${st.combo}콤보`, t: 0, life: 900, size: 17 + Math.min(9, st.combo * 1.6), col: '#ffe066', glow: '#ff9d2e', fit: true });
    updHud(true);
  }
  // 3차: 큰 합치기 보상 = 내려온 빨간 선을 밀어 올림(예전의 「+초」 보상 자리). 선이 아직 안 내려왔으면 아무것도 안 한다
  function liftLine(u) { if (!st.started || st.over || st.dzT <= DANGER + 1) return; st.dzT = Math.max(DANGER, st.dzT - u); say('빨간 선이 올라갔어!', '#9fe8b4', 1400); SND.bonus(); }
  function burst(x, y, col, n, sp, r0 = 0) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, s = (0.4 + Math.random()) * sp, ox = x + Math.cos(a) * r0, oy = y + Math.sin(a) * r0; parts.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, life: 480 + Math.random() * 460, max: 940, col, w: 2 + Math.random() * 2.8, g: 0.13 }); } }
  // 4차: 작은 합치기의 즙 — 가장자리에서 짧게 튀고 life 안에 사라진다(불꽃 꼬리보다 짧은 방울)
  function drops(x, y, col, n, sp, r0, life) { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * 0.5, s = (0.7 + Math.random() * 0.5) * sp, ox = x + Math.cos(a) * r0, oy = y + Math.sin(a) * r0; parts.push({ x: ox, y: oy, px: ox, py: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: life * (0.75 + Math.random() * 0.25), max: life, col, w: 2.2 + Math.random() * 1.2, g: 0.1, drop: true }); } }
  function puff(x, y, nt) { for (let i = 0; i < 6 + nt; i++) { const a = Math.random() * 6.283, s = 0.6 + Math.random() * 1.4; parts.push({ x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 500 + Math.random() * 300, max: 800, col: TIERS[nt].col, gi: nt, puff: TIERS[nt].r * (0.35 + Math.random() * 0.3), g: -0.01 }); } }

  // ── 입력: 손가락으로 위치 잡고 떼면 떨어짐(누르는 순간 바로 쥐는 반응) ──
  function bindInput() {
    const pos = (e) => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
    cv.addEventListener('pointerdown', (e) => {
      if (st.over) return;
      st.down = true; st.downT = performance.now(); st.downSeen = false; cv.setPointerCapture(e.pointerId);
      st.x = clampX(pos(e)); hideCoach(); SND.unlock(); SND.grab();
    });
    cv.addEventListener('pointermove', (e) => { if (st.down || e.pointerType === 'mouse') st.x = clampX(pos(e)); });
    cv.addEventListener('pointerup', (e) => { if (!st.down) return; st.down = false; st.x = clampX(pos(e)); drop(); });
    cv.addEventListener('pointercancel', () => { st.down = false; });
    addEventListener('keydown', onKey);
  }
  const clampX = (x) => { const r = TIERS[st.cur].r; return Math.max(WALL + r + 1, Math.min(W - WALL - r - 1, x)); };
  function onKey(e) {
    if (!st || st.over) return;
    if (e.key === 'ArrowLeft') st.x = clampX(st.x - 18);
    if (e.key === 'ArrowRight') st.x = clampX(st.x + 18);
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); SND.unlock(); drop(); }
  }
  function hideCoach() { const c = $('#coach'); if (c) { c.remove(); DC.store.set('seen_merge', true); } }
  // 3차: 손가락 안내는 판 아래쪽(쌓이는 자리) 대신 손에 든 행성 바로 옆 높이에 — 판을 가리지 않는다
  function placeCoach() { const c = $('#coach'); if (!c || !cv) return; c.style.inset = 'auto 0 auto'; c.style.top = Math.round((holdY() + EX) * scale - 26) + 'px'; }
  function drop() {
    if (!st.canDrop || st.over) return;
    if (!st.started) { st.started = true; st.t0 = performance.now(); }
    st.canDrop = false; st.drops++; hideCoach();
    st.x = clampX(st.x);
    const b = addPlanet(st.cur, st.x, holdY()); M.Body.setVelocity(b, { x: 0, y: 5 }); M.Body.setAngle(b, st.holdAng || 0); // 3차: 처음 속도 3 → 5
    SND.drop(st.cur); DC.buzz(8);
    st.cur = st.next; st.next = st.spawn(st.k++);
    updHud();
    setTimeout(() => { if (!st.over) { st.canDrop = true; st.holdPop = 0; st.x = clampX(st.x); } }, 420);
  }

  // ── 그리기 ──
  function fit() {
    if (!cv) return;
    const wrap = cv.parentElement; let cw = Math.min(wrap.clientWidth, 440);
    const lad = $('#ladder'), ladH = lad ? lad.offsetHeight + 12 : 40; // 판 아래 사다리 자리
    const padB = parseFloat(getComputedStyle($('#stage')).paddingBottom) || 0;
    // 3차: 판 위쪽(떨어뜨리는 자리)을 판 좌표로 최소 80 남긴다 — 안내 띠가 빨간 선 아래(쌓이는 자리)로 내려오지 않게(컴퓨터 판이 그만큼 조금 좁아진다)
    const room = innerHeight - (cv.getBoundingClientRect().top + scrollY) - ladH - padB - 4; if (room > 300) cw = Math.min(cw, room * W / (H + 80));
    scale = cw / W; dpr = Math.min(2, devicePixelRatio || 1);
    EX = room > 300 ? Math.max(0, Math.min(110, Math.floor(room / scale - H))) : 0;
    BY = 6 - EX; BH = H - 8 + EX;
    const LH = H + EX;
    cv.style.width = cw + 'px'; cv.style.height = (LH * scale) + 'px';
    cv.width = Math.round(W * scale * dpr); cv.height = Math.round(LH * scale * dpr);
    cx = cv.getContext('2d'); cx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, EX * scale * dpr);
    buildBg(); placeCoach();
  }
  // 판 배경(한 번만 그려 둔다): 깊은 남색 우주 · 옅은 성운 · 작은 별 · 유리벽 반사 · 바닥 빛
  function buildBg() {
    bgc = mk(cv.width, cv.height); const x = bgc.getContext('2d'); x.setTransform(scale * dpr, 0, 0, scale * dpr, 0, EX * scale * dpr);
    const rr = (px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
    x.save(); rr(BX, BY, BW, BH, 14); x.clip();
    let g = x.createLinearGradient(0, BY, 0, H); g.addColorStop(0, '#0b0d26'); g.addColorStop(0.6, '#080a1c'); g.addColorStop(1, '#0d0f24'); x.fillStyle = g; x.fillRect(BX, BY, BW, BH);
    const neb = (px, py, r, c) => { const gg = x.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, c); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(BX, BY, BW, BH); };
    neb(90, 230, 240, 'rgba(118,74,196,.22)'); neb(330, 470, 260, 'rgba(46,104,214,.18)'); neb(250, 90, 180, 'rgba(196,74,140,.10)');
    let s = 12345; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) { const px = BX + rnd() * BW, py = BY + rnd() * BH, r = rnd() < 0.08 ? 1.3 : 0.6 + rnd() * 0.5; x.globalAlpha = 0.15 + rnd() * 0.55; x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, r, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
    // 위쪽(떨어뜨리는 자리)은 한 톤 어둡게
    g = x.createLinearGradient(0, BY, 0, DANGER + 10); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(BX, BY, BW, DANGER + 10 - BY);
    // 바닥 빛
    g = x.createLinearGradient(0, H - 70, 0, H); g.addColorStop(0, 'rgba(120,140,255,0)'); g.addColorStop(1, 'rgba(120,140,255,.16)'); x.fillStyle = g; x.fillRect(BX, H - 70, BW, 70);
    // 유리벽 반사(왼쪽 안쪽 세로 빛 한 줄)
    g = x.createLinearGradient(BX, 0, BX + 26, 0); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(BX, BY, 26, BH);
    x.restore();
    rr(BX + 0.5, BY + 0.5, BW - 1, BH - 1, 14); x.strokeStyle = 'rgba(240,240,250,.18)'; x.lineWidth = 1.2; x.stroke();
    x.strokeStyle = 'rgba(160,175,255,.35)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(BX + 14, H - 2.5); x.lineTo(BX + BW - 14, H - 2.5); x.stroke();
  }
  // 둥근 사각 경로(roundRect가 없는 옛 사파리에서도 돌게 arcTo로)
  function rpath(c, px, py, w, h, r) { c.beginPath(); c.moveTo(px + r, py); c.arcTo(px + w, py, px + w, py + h, r); c.arcTo(px + w, py + h, px, py + h, r); c.arcTo(px, py + h, px, py, r); c.arcTo(px, py, px + w, py, r); c.closePath(); }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const elastic = (u) => u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
  const backOut = (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
  // 떨어질 자리: 아래에 있는 행성 위 / 바닥
  function landingY(x, r) {
    let y = H - r - 2;
    for (const b of bodies) { const rb = TIERS[b.plugin.tier].r * popScale(b), R = r + rb, dx = Math.abs(b.position.x - x); if (dx < R) { const cy = b.position.y - Math.sqrt(R * R - dx * dx); if (cy < y) y = cy; } }
    return Math.max(holdY(), y);
  }
  // 3차: 안내판·알림 띠가 놓일 자리 = 손에 든 행성 아래 ~ 빨간 선 위(떨어뜨리는 자리). 판에 쌓이는 자리를 가리지 않는다.
  // 높이 h가 모자라면(컴퓨터처럼 위쪽이 낮은 판) 위에서부터 놓는다
  function zone(h) { const top = holdY() + TIERS[st.cur].r * 1.1 + 6, bot = st.dz - 20; return Math.max(top, Math.min((top + bot) / 2 - h / 2, bot - h)); }
  // 3차: 행성 둘레 단계 색 대기 빛 — 작은 크기에서도 흰 달·회색 쇼핑몰이 색으로 갈린다(모양 행성은 모양이 달라 빛 무리만)
  function rim(c, tier, x, y, r, sx = 1, sy = 1, a = 1) {
    const t = TIERS[tier]; if (t.cut) return;
    // 4차: 작은 단계(0~2)는 테를 얇고 옅게 — 검수: 진한 색 테두리가 스티커처럼 보였다. 3단계는 중간, 4단계부터 예전 굵기
    const th = tier <= 2 ? 0.45 : tier === 3 ? 0.7 : 1;
    c.save(); c.strokeStyle = t.col;
    c.globalAlpha = 0.3 * a * th; c.lineWidth = Math.max(3 * th, r * 0.15 * th); c.beginPath(); c.ellipse(x, y, r * sx + c.lineWidth * 0.35, r * sy + c.lineWidth * 0.35, 0, 0, 6.283); c.stroke();
    c.globalAlpha = (th < 1 ? 0.5 : 0.85) * a; c.lineWidth = th < 1 ? Math.max(0.9, r * 0.035) : Math.max(1.4, r * 0.05); c.beginPath(); c.ellipse(x, y, r * sx + 0.3, r * sy + 0.3, 0, 0, 6.283); c.stroke();
    c.restore();
  }
  function draw() {
    const now = performance.now();
    const sh = RM ? 0 : st.shake, sx = sh ? (Math.random() - 0.5) * 10 * sh : 0, sy = sh ? (Math.random() - 0.5) * 10 * sh : 0;
    cx.save(); cx.clearRect(-30, -30 - EX, W + 60, H + 60 + EX); cx.translate(sx, sy);
    cx.drawImage(bgc, 0, -EX, W, H + EX);
    const DZ = st.dz, live = !st.over;
    // 위험: 선에 가까울수록 선이 진해지고, 넘으면 위쪽이 붉게 숨 쉬며 초읽기. 3차: 끝난 뒤(멈춤·선언)에는 붉은 번짐을 끈다 — 선언 글자만 읽히게
    const warn = live ? Math.min(1, st.overT / GRACE) : 0, pulse = 0.5 + 0.5 * Math.sin(now / 90);
    let near = 0; for (const b of bodies) if (now - b.plugin.born > 600) near = Math.max(near, Math.min(1, (DZ + 110 - (b.position.y - TIERS[b.plugin.tier].r)) / 110));
    const alarm = live ? Math.max(warn, near > 0.55 ? (near - 0.55) / 0.45 : 0) : 0;
    st.near = near;
    const falling = live && st.lineOn && st.dzT > DANGER + 1;
    // 4차: 붉음은 선 근처 띠(선 위 30 · 아래 22)만 — 검수: 위험 순간 판 전체가 붉게 물들어 행성이 안 보였다
    { const ra = 0.05 + (falling ? 0.07 : 0) + 0.22 * alarm + (warn > 0 ? 0.22 * warn + 0.14 * pulse * warn : 0);
      let g = cx.createLinearGradient(0, DZ - 30, 0, DZ); g.addColorStop(0, 'rgba(255,50,60,0)'); g.addColorStop(1, `rgba(255,50,60,${ra})`); cx.fillStyle = g; cx.fillRect(BX, DZ - 30, BW, 30);
      g = cx.createLinearGradient(0, DZ, 0, DZ + 22); g.addColorStop(0, `rgba(255,50,60,${ra * 0.8})`); g.addColorStop(1, 'rgba(255,50,60,0)'); cx.fillStyle = g; cx.fillRect(BX, DZ, BW, 22); }
    const la = Math.min(1, 0.6 + 0.4 * alarm + (warn > 0 ? 0.3 * pulse : 0) + (falling ? 0.25 : 0));
    cx.save(); cx.lineCap = 'round';
    cx.strokeStyle = `rgba(255,70,80,${0.18 + 0.3 * alarm + (falling ? 0.12 : 0)})`; cx.lineWidth = 7 + 6 * alarm; cx.beginPath(); cx.moveTo(WALL + 2, DZ); cx.lineTo(W - WALL - 2, DZ); cx.stroke(); // 번짐
    cx.setLineDash(warn > 0 ? [] : [12, 8]); cx.lineDashOffset = (alarm > 0 || falling) && !RM ? -now / 25 : 0;
    cx.strokeStyle = `rgba(255,96,104,${la})`; cx.lineWidth = 2.2 + 1.6 * alarm + warn * 1.4 + (falling ? 0.8 : 0);
    cx.beginPath(); cx.moveTo(WALL + 2, DZ); cx.lineTo(W - WALL - 2, DZ); cx.stroke(); cx.setLineDash([]);
    // 선이 내려오는 중: 선 아래로 작은 ▼ 셋이 흐른다
    if (falling) { const o = RM ? 4 : (now / 40) % 12; cx.fillStyle = 'rgba(255,110,120,.75)'; for (const ax of [W * 0.25, W * 0.5, W * 0.75]) { const ay = DZ + 6 + o; cx.globalAlpha = 1 - o / 12; cx.beginPath(); cx.moveTo(ax - 6, ay); cx.lineTo(ax + 6, ay); cx.lineTo(ax, ay + 6); cx.closePath(); cx.fill(); } cx.globalAlpha = 1; }
    if (live && warn <= 0) { // 4차: 초읽기 중에는 판 위 선 글씨를 끈다(점수줄이 말한다 · 행성에 반쯤 가려 「다」만 보였다)
      cx.textAlign = 'right'; cx.textBaseline = 'bottom'; cx.font = '700 12px "Pretendard Variable", Pretendard, sans-serif'; cx.fillStyle = `rgba(255,120,128,${0.75 + 0.25 * alarm})`;
      cx.fillText(st.offenders && st.offenders.length ? '넘칠 것 같아' : falling ? '선이 내려온다' : alarm > 0 ? '꽉 차 간다' : '이 선 넘으면 끝', W - WALL - 8, DZ - 5);
    }
    cx.restore();
    // 조준선 + 떨어질 자리(안내판은 이 위에 불투명하게 덮어 글자를 가로지르지 않는다)
    const holding = live && st.canDrop, cr = TIERS[st.cur].r, HY = holdY();
    if (holding) {
      const ly = landingY(st.x, cr);
      cx.save(); cx.globalAlpha = 0.35 + 0.4 * st.grip; cx.strokeStyle = '#f0f0fa'; cx.lineWidth = 2; cx.setLineDash([2, 7]); cx.lineCap = 'round';
      cx.beginPath(); cx.moveTo(st.x, HY + cr + 6); cx.lineTo(st.x, ly); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha = 0.18 + 0.25 * st.grip; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(st.x, ly, cr, 0, 6.283); cx.stroke();
      cx.restore();
    }
    // 위쪽 안내 자리: 시작 안내판 → 첫 합치기 전 띠 → 알림 띠(하나만) — 3차: 조준선 위 · 행성 아래에 그린다. 조준선은 띠가 덮고, 떨어지는 행성은 띠 앞으로 지나간다

    if (st.intro > 0.01 && live) drawIntro(st.intro, now);
    else if (st.msg && live) drawMsg(st.msg);
    else if (st.started && !st.firstMerge && live && st.drops < 8 && st.canDrop) drawHint(now);
    // 바닥 그림자
    for (const b of bodies) { const r = TIERS[b.plugin.tier].r * popScale(b); cx.drawImage(SHADOW, b.position.x - r * 1.35 + r * 0.08, b.position.y - r * 1.35 + r * 0.2, r * 2.7, r * 2.7); }
    // 들고 있는 것과 같은 행성은 은은하게 빛남(어디에 놓으면 합쳐지는지)
    if (holding) for (const b of bodies) if (b.plugin.tier === st.cur && now - b.plugin.born > 300) { const r = TIERS[b.plugin.tier].r; cx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 220); cx.drawImage(GLOW[b.plugin.tier], b.position.x - r * 1.45, b.position.y - r * 1.45, r * 2.9, r * 2.9); cx.globalAlpha = 1; }
    // 3차: 번쩍·고리·연기는 행성 「뒤」에 — 합쳐진 새 행성이 늘 맨 위에 보인다. 빛 무리는 판 끝까지의 거리만큼만 퍼져 벽·바닥에서 잘린 가장자리가 안 생긴다
    cx.save(); rpath(cx, BX, BY, BW, BH, 14); cx.clip(); cx.globalCompositeOperation = 'lighter';
    for (const f of flashes) {
      const u = f.t / f.life, a = Math.pow(1 - u, 1.4), r = f.r * (0.9 + 1.3 * easeOut(u)), dE = Math.min(f.x - BX, BX + BW - f.x, H - f.y) + 2;
      const gr = Math.max(f.r * 1.05, Math.min(r * 1.6, dE * 1.25));
      cx.globalAlpha = a * (f.soft ? 0.6 : 1); cx.drawImage(GLOW[f.tier], f.x - gr, f.y - gr, gr * 2, gr * 2); if (f.soft) continue; cx.globalAlpha = a * 0.8; const wr = Math.min(gr, r * (0.9 - 0.4 * u)); cx.drawImage(WGLOW, f.x - wr, f.y - wr, wr * 2, wr * 2);
    }
    // 고리: 벽·바닥에 닿으면 안쪽으로 밀려 늘 온전한 원(잘린 반원 없음) · 행성 뒤라 합쳐진 결과를 가로지르지 않는다
    for (const r of rings) {
      if (r.t < 0) continue; const u = r.t / r.life, e = easeOut(u), lw = r.w * (1 - u) + 0.5, m = 4 + lw / 2;
      const rr = Math.min(r.r0 + (r.r1 - r.r0) * e, BW / 2 - m), x = Math.max(BX + m + rr, Math.min(BX + BW - m - rr, r.x)), y = Math.max(BY + m + rr, Math.min(H - m - rr, r.y));
      cx.globalAlpha = (1 - u) * 0.9; cx.strokeStyle = r.col; cx.lineWidth = lw; cx.beginPath(); cx.arc(x, y, rr, 0, 6.283); cx.stroke();
    }
    for (const p of parts) if (p.puff) { const a = Math.min(1, p.life / 300), pr = p.puff * (1.6 - p.life / p.max); cx.globalAlpha = a * 0.35; cx.drawImage(GLOW[p.gi], p.x - pr, p.y - pr, pr * 2, pr * 2); }
    cx.restore();
    // 행성들(굴러가는 회전 · 착지 찌그러짐 · 합쳐질 때 튀어나옴) + 단계 색 대기 빛
    for (const b of bodies) {
      const p = b.plugin, r = TIERS[p.tier].r * popScale(b), q = p.sq * 0.11;
      cx.globalAlpha = 0.42; const ar = r * 1.3; cx.drawImage(GLOW[p.tier], b.position.x - ar, b.position.y - ar, ar * 2, ar * 2); cx.globalAlpha = 1;
      if (p.pop > 0.4 && p.tier >= 5) { cx.globalAlpha = (p.pop - 0.4) * 1.2; const gr = r * 1.8; cx.drawImage(GLOW[p.tier], b.position.x - gr, b.position.y - gr, gr * 2, gr * 2); cx.globalAlpha = 1; }
      drawPlanet(cx, p.tier, b.position.x, b.position.y, r, b.angle, 1 + q, 1 - q);
      rim(cx, p.tier, b.position.x, b.position.y, r, 1 + q, 1 - q);
    }
    // 빨려 들어가는 두 행성
    for (const g of ghosts) { const u = easeOut(Math.min(1, g.t / g.life)), r = TIERS[g.tier].r * (1 - 0.35 * u); drawPlanet(cx, g.tier, g.ax + (g.x - g.ax) * u, g.ay + (g.y - g.ay) * u, r, g.aa, 1, 1, 1 - 0.5 * u); drawPlanet(cx, g.tier, g.bx + (g.x - g.bx) * u, g.by + (g.y - g.by) * u, r, g.ba, 1, 1, 1 - 0.5 * u); }
    // 들고 있는 행성: 누르면 쥐듯 살짝 커지고 빛남 · 새로 나올 땐 튀어나옴 · 가만히 있으면 둥실
    if (live) {
      const bob = Math.sin(now / 420) * 2 * (1 - st.grip), k = backOut(Math.min(1, st.holdPop)) * (1 + 0.07 * st.grip);
      st.holdAng = Math.sin(now / 900) * 0.15;
      if (st.canDrop) {
        if (st.grip > 0.02) { cx.globalAlpha = 0.35 * st.grip; const gr = cr * 1.9; cx.drawImage(GLOW[st.cur], st.x - gr, HY + bob - gr, gr * 2, gr * 2); cx.globalAlpha = 1; }
        cx.globalAlpha = 0.42; const ar = cr * k * 1.3; cx.drawImage(GLOW[st.cur], st.x - ar, HY + bob - ar, ar * 2, ar * 2); cx.globalAlpha = 1;
        drawPlanet(cx, st.cur, st.x, HY + bob, cr * Math.max(0.01, k), st.holdAng);
        rim(cx, st.cur, st.x, HY + bob, cr * Math.max(0.01, k));
      }
      if (st.down && !st.downSeen) { st.downSeen = true; lat.push(Math.round(now - st.downT)); if (lat.length > 50) lat.shift(); }
    }
    // 불꽃·즙(더하기 합성) — 새 행성 위에. 3차: 새 행성 가장자리에서 출발하고 벽·바닥에서 튕긴다
    cx.save(); rpath(cx, BX, BY, BW, BH, 14); cx.clip(); cx.globalCompositeOperation = 'lighter';
    for (const p of sparks) { const u = p.t / p.life, s = p.size * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85 * 0.6); cx.globalAlpha = Math.min(1, (1 - u) * 1.6); cx.fillStyle = p.col; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); for (let j = 0; j < 2; j++) { cx.beginPath(); cx.moveTo(0, -s); cx.lineTo(s * 0.22, 0); cx.lineTo(0, s); cx.lineTo(-s * 0.22, 0); cx.closePath(); cx.fill(); cx.rotate(Math.PI / 2); } cx.restore(); }
    for (const p of parts) if (p.drop) { const u = 1 - p.life / p.max; cx.globalAlpha = Math.min(1, (1 - u) * 1.8); cx.fillStyle = p.col; cx.beginPath(); cx.arc(p.x, p.y, p.w * (1 - 0.5 * u), 0, 6.283); cx.fill(); }
    for (const p of parts) if (!p.puff && !p.drop) { cx.globalAlpha = Math.min(1, p.life / 300); cx.strokeStyle = p.col; cx.lineWidth = p.w; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(p.px - (p.x - p.px) * 1.5, p.py - (p.y - p.py) * 1.5); cx.lineTo(p.x, p.y); cx.stroke(); }
    cx.restore();
    // 넘친 행성: 붉은 테 + 남은 시간 고리
    if (live && st.offenders && st.offenders.length) {
      for (const b of st.offenders) { const r = TIERS[b.plugin.tier].r + 5; cx.strokeStyle = `rgba(255,90,90,${0.5 + 0.5 * pulse})`; cx.lineWidth = 2; cx.beginPath(); cx.arc(b.position.x, b.position.y, r, 0, 6.283); cx.stroke(); cx.strokeStyle = '#ff6b6b'; cx.lineWidth = 4; cx.lineCap = 'round'; cx.beginPath(); cx.arc(b.position.x, b.position.y, r + 6, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - warn)); cx.stroke(); }
      // 4차: 판 테두리 깜빡임과 판 위 「넘치기 직전」 큰 글씨를 뺐다(행성을 덮었다) — 남은 시간은 판 밖 점수줄(hudWarn)에
    }
    hudWarn(live && warn > 0 ? Math.max(0, (GRACE - st.overT) / 1000) : -1);
    // 점수 튀김 — 3차: 글자 폭을 재서 판 안쪽으로 당긴다(벽·바닥에 잘리지 않게)
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const p of pops) {
      const u = p.t / p.life, k = p.still ? 1 : backOut(Math.min(1, p.t / 220));
      cx.save(); cx.font = `800 ${p.size}px "Pretendard Variable", Pretendard, sans-serif`; cx.lineJoin = 'round';
      let x = p.x, y = p.y - (p.still ? 0 : 34 * easeOut(u));
      if (p.fit) { const hw = cx.measureText(p.txt).width / 2 + 8; x = Math.max(BX + 6 + hw, Math.min(BX + BW - 6 - hw, x)); y = Math.max(BY + p.size, Math.min(H - p.size, y)); }
      cx.globalAlpha = Math.min(1, (1 - u) * 3); cx.translate(x, y); cx.scale(k, k);
      if (p.glow) { cx.lineWidth = 10; cx.strokeStyle = hexA(p.glow, 0.55); cx.strokeText(p.txt, 0, 0); }
      cx.lineWidth = 5; cx.strokeStyle = 'rgba(5,6,16,.9)'; cx.strokeText(p.txt, 0, 0); cx.fillStyle = p.col; cx.fillText(p.txt, 0, 0); cx.restore();
    }
    if (st.banner) drawBanner(st.banner);
    if (st.flash > 0) { cx.globalAlpha = st.flash * 0.6; cx.fillStyle = '#fff'; cx.fillRect(BX, BY, BW, BH); cx.globalAlpha = 1; }
    if (st.over) drawEnd(now);
    cx.restore();
  }
  // 4차: 0.72배에서 톡 튀어나와 약 10% 넘쳤다가 자리를 잡는다(예전 0.55배에서 0.34초 — 작게 생겼다 커지는 느낌이 길었다)
  const popScale = (b) => 0.72 + 0.28 * elastic(1 - b.plugin.pop);
  // 3차: 시작 안내 — 판 가운데 큰 카드 대신, 손에 든 행성 아래 떨어뜨리는 자리에 한 줄 판. 왼쪽 작은 그림에서 두 행성이 닿아 한 단계 큰 행성이 된다(2.4초 반복)
  function drawIntro(a, now) {
    const ph = 58, px = 28, pw = W - 56, py = zone(ph), cyy = py + ph / 2, ax = px + 44;
    cx.save(); cx.globalAlpha = a;
    cx.fillStyle = 'rgba(6,8,24,.95)'; rpath(cx, px, py, pw, ph, ph / 2); cx.fill(); cx.strokeStyle = 'rgba(255,224,102,.45)'; cx.lineWidth = 1.2; cx.stroke();
    const T = (now % 2400) / 2400, r0 = 11, r1 = 16;
    if (T < 0.42) { const u = easeOut(T / 0.42), d = 26 - (26 - r0) * u; drawPlanet(cx, 1, ax - d, cyy, r0, -u * 2.2); drawPlanet(cx, 1, ax + d, cyy, r0, u * 2.2); }
    else {
      const u = (T - 0.42) / 0.58, k = backOut(Math.min(1, u / 0.22));
      cx.save(); cx.globalCompositeOperation = 'lighter';
      if (u < 0.45) { const fa = 1 - u / 0.45, fr = r1 * (1 + u * 1.2); cx.globalAlpha = a * fa; cx.drawImage(GLOW[2], ax - fr * 1.4, cyy - fr * 1.4, fr * 2.8, fr * 2.8); cx.strokeStyle = '#ffffff'; cx.lineWidth = 3 * fa + 0.5; cx.beginPath(); cx.arc(ax, cyy, r1 * (1 + u * 0.7), 0, 6.283); cx.stroke(); }
      cx.restore(); cx.globalAlpha = a;
      drawPlanet(cx, 2, ax, cyy, r1 * Math.max(0.01, k));
    }
    cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillStyle = '#ffffff'; cx.font = '800 16px "Pretendard Variable", Pretendard, sans-serif'; cx.fillText('같은 행성끼리 닿으면 합쳐져', px + 88, cyy - 10);
    cx.fillStyle = 'rgba(240,240,250,.78)'; cx.font = '600 12.5px "Pretendard Variable", Pretendard, sans-serif'; cx.fillText('끌어서 옮기고, 손을 떼면 떨어져', px + 88, cyy + 11);
    cx.restore();
  }
  // 위쪽 안내 자리의 짧은 띠(알림·첫 합치기 전 안내 공용)
  function pill(msg, col, a = 1) {
    cx.save(); cx.globalAlpha = a; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = '800 16px "Pretendard Variable", Pretendard, sans-serif'; const w = cx.measureText(msg).width + 30, y = zone(34) + 17;
    cx.fillStyle = 'rgba(6,8,24,.92)'; rpath(cx, W / 2 - w / 2, y - 17, w, 34, 17); cx.fill(); cx.strokeStyle = hexA(col, 0.6); cx.lineWidth = 1.2; cx.stroke();
    cx.fillStyle = col; cx.fillText(msg, W / 2, y); cx.restore();
  }
  function drawMsg(m) { const u = m.t / m.life; pill(m.txt, m.col, Math.min(1, m.t / 120, (1 - u) * 4)); }
  // 첫 합치기 전까지: 들고 있는 것과 같은 행성 위에 「여기!」 화살표 — 떨어뜨린 뒤에도 무엇을 해야 하는지 보이게
  function drawHint(now) {
    let tgt = null; for (const b of bodies) if (b.plugin.tier === st.cur && now - b.plugin.born > 300 && (!tgt || b.position.y < tgt.position.y)) tgt = b;
    pill(tgt ? '같은 행성 위에 떨어뜨려 봐' : '하나 더 떨어뜨려 봐', '#ffe066');
    if (tgt) { const r = TIERS[tgt.plugin.tier].r, bob = Math.sin(now / 160) * 5, ay = tgt.position.y - r - 16 + bob; cx.save(); cx.fillStyle = '#ffe066'; cx.strokeStyle = 'rgba(6,8,24,.9)'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(tgt.position.x, ay + 10); cx.lineTo(tgt.position.x - 10, ay - 4); cx.lineTo(tgt.position.x + 10, ay - 4); cx.closePath(); cx.stroke(); cx.fill(); cx.restore(); }
  }
  function drawBanner(b) {
    const u = b.t / b.life, inK = backOut(Math.min(1, b.t / 260)), a = u > 0.8 ? (1 - u) / 0.2 : 1;
    cx.save(); cx.globalAlpha = a; cx.translate(W / 2, 228); cx.scale(inK, inK);
    const gr = 90; cx.globalAlpha = a * 0.5; cx.drawImage(GLOW[b.tier], -gr, -gr - 10, gr * 2, gr * 2); cx.globalAlpha = a;
    drawPlanet(cx, b.tier, 0, -16, 30, b.t / 900);
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
    cx.font = '600 13px "Pretendard Variable", Pretendard, sans-serif'; cx.lineWidth = 4; cx.strokeStyle = 'rgba(5,6,16,.85)'; cx.strokeText(b.sub, 0, 32); cx.fillStyle = 'rgba(240,240,250,.8)'; cx.fillText(b.sub, 0, 32);
    cx.font = '800 26px "Pretendard Variable", Pretendard, sans-serif'; cx.lineWidth = 6; cx.strokeText(b.title, 0, 58); cx.fillStyle = '#ffffff'; cx.fillText(b.title, 0, 58);
    cx.restore();
  }
  // 3차: 넘친 뒤 순서 — ① 멈춤(STOP_MS): 판은 그대로 서고, 마지막 합치기 연출만 마저 끝나며, 넘친 행성에 붉은 테 → ② 선언: 판을 어둡게 하고 받침판 위에 「넘쳤어!」
  function drawEnd(now) {
    const t = now - st.endT;
    for (const b of st.offenders || []) { const r = TIERS[b.plugin.tier].r + 5; cx.strokeStyle = '#ff5a64'; cx.lineWidth = 3; cx.beginPath(); cx.arc(b.position.x, b.position.y, r, 0, 6.283); cx.stroke(); }
    if (t < STOP_MS) return;
    const u = Math.min(1, (t - STOP_MS) / 200), k = backOut(Math.min(1, (t - STOP_MS) / POP_MS));
    // 4차: 받침판이 크기·진하기 모두 다 찬 첫 프레임을 적어 두고, 그 뒤 실제로 그린 프레임 수를 센다(결과 화면 전환 조건)
    if (t - STOP_MS >= POP_MS) { if (!st.fullT) st.fullT = now; st.fullFr = (st.fullFr || 0) + 1; }
    cx.fillStyle = `rgba(2,3,10,${0.58 * u})`; cx.fillRect(BX, BY, BW, BH);
    const pw = 270, ph = 138, cyy = (BY + H) / 2 - 10;
    cx.save(); cx.globalAlpha = Math.min(1, u * 1.5); cx.translate(W / 2, cyy); cx.scale(k, k);
    cx.fillStyle = 'rgba(14,6,14,.96)'; rpath(cx, -pw / 2, -ph / 2, pw, ph, 20); cx.fill();
    cx.strokeStyle = 'rgba(255,90,100,.85)'; cx.lineWidth = 2; cx.stroke();
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
    cx.font = '800 44px "Pretendard Variable", Pretendard, sans-serif'; cx.fillStyle = '#ff6b6b'; cx.fillText('넘쳤어!', 0, -24);
    cx.font = '800 22px "Pretendard Variable", Pretendard, sans-serif'; cx.fillStyle = '#ffffff'; cx.fillText(`${st.score.toLocaleString()}점`, 0, 22);
    cx.font = '600 13px "Pretendard Variable", Pretendard, sans-serif'; cx.fillStyle = 'rgba(240,240,250,.7)'; cx.fillText(`${Math.floor(st.el / 1000)}초 버팀 · 최고 ${TIERS[st.maxTier].name}`, 0, 48);
    cx.restore();
  }

  function updHud(bump) {
    const s = $('#score'); if (s) { s.textContent = st.score.toLocaleString(); if (bump) { s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); } }
    const n = $('#next'); if (n) { n.dataset.tier = st.next; n.style.backgroundImage = `url(${TIERS[st.next].icon})`; n.style.setProperty('--tc', TIERS[st.next].col); n.title = TIERS[st.next].name; n.classList.remove('swap'); void n.offsetWidth; n.classList.add('swap'); }
  }
  // 4차: 넘치기 직전 초읽기는 점수줄의 「내 최고」 칸 자리에(판 밖) — 0.1초 단위로 바뀔 때만 글자를 고친다
  let hwLast = '';
  function hudWarn(left) {
    const txt = left < 0 ? '' : left.toFixed(1); if (txt === hwLast) return; hwLast = txt;
    const hud = $('.m-hud'), b = $('#warnsec'); if (!hud || !b) return;
    hud.classList.toggle('danger', !!txt); b.textContent = txt ? txt + '초' : '';
  }
  function updTime() {
    const t = $('#time'), box = $('#timebox'); if (!t) return;
    t.textContent = Math.floor(st.el / 1000); box.classList.toggle('low', !!st.lineOn);
  }
  function renderLadder(fresh) {
    const l = $('#ladder'); if (!l) return; const got = new Set(DC.endings.got('merge'));
    l.replaceChildren(...TIERS.map((t, i) => {
      const seen = i <= SPAWN_MAX || got.has('tier' + i) || (st && st.maxTier >= i);
      const cls = 'step' + (seen ? '' : ' unknown') + (st && i <= st.maxTier ? ' reached' : '') + (st && i === st.maxTier ? ' now' : '') + (fresh === i ? ' new' : '');
      return el('span', { class: cls, title: seen ? t.name : '???' }, el('i', seen ? { 'data-tier': i, style: `background-image:url(${t.icon});--tc:${t.col}` } : { class: 'unknown-i' }), i < TIERS.length - 1 ? el('em', {}, '›') : null);
    }));
  }

  // ── 끝 ──
  function finish(reason) {
    if (st.over) return;
    st.over = true; st.reason = reason; st.endT = performance.now(); st.down = false;
    // 3차: 넘친 순간엔 「뚝」 멈춤만(흔들림·붉은 번짐 없음). 「넘쳤어!」 소리·진동은 STOP_MS 뒤 선언 때(frame)
    st.shake = 0; st.flash = 0; st.banner = null; st.msg = null; SND.stop(); DC.buzz(30);
    removeEventListener('keydown', onKey); removeEventListener('resize', fit);
    const best = DC.store.get('best_merge', 0); st.isBest = st.score > best; st.prevBest = best;
    if (st.isBest) DC.store.set('best_merge', st.score);
    if (st.daily) { const prev = DC.store.get('mergeDaily_' + DC.today(), null); if (!prev || st.score > prev.score) DC.store.set('mergeDaily_' + DC.today(), { score: st.score, top: st.maxTier }); }
  }
  function showEnd() {
    const isBest = st.isBest, best = st.prevBest, top = TIERS[st.maxTier];
    const box = $('#stage'); box.classList.add('gx-wide');
    // 3차: 폰에서는 공유 카드를 화면 맨 아래 잘린 어두운 조각 대신 「가장 크게 키운 행성」 줄 오른쪽의 작은 미리보기로(누르면 공유)
    const phone = innerWidth < 900;
    const card = el('canvas', { id: 'card', width: 1080, height: 1350, class: phone ? '' : 'gx-preview', 'aria-label': '공유할 결과 카드' });
    const sheet = el('section', { class: 'gx-endwrap m-endgrid' },
      el('div', { class: 'gx-end' },
        el('p', { class: 'gx-eyebrow' }, el('span', {}, st.reason === 'over' ? '넘쳤어' : '시간 끝'), st.daily ? `오늘 문제 · ${DC.today().slice(5).replace('-', '/')}` : '행성 합치기'),
        el('p', { class: 'gx-score' }, st.score.toLocaleString(), el('small', {}, '점')),
        el('p', { class: 'gx-flag' + (isBest ? '' : ' off') }, isBest ? '내 최고 기록' : `내 최고 ${Math.max(best, st.score).toLocaleString()}점`),
        el('div', { class: 'm-top' }, el('span', { class: 'bigorb', 'data-tier': st.maxTier, style: `background-image:url(${top.icon});--tc:${top.col}` }), el('p', {}, '가장 크게 키운 행성', el('b', {}, top.name)),
          phone ? el('button', { class: 'm-cardthumb', type: 'button', onclick: share, 'aria-label': '결과 카드 공유' }, card, el('small', {}, '공유 카드')) : null),
        el('dl', { class: 'gx-rows' },
          el('div', {}, el('dt', {}, '합친 횟수'), el('dd', {}, `${st.merges}번`)),
          el('div', {}, el('dt', {}, '떨어뜨린 행성'), el('dd', {}, `${st.drops}개`)),
          el('div', {}, el('dt', {}, '버틴 시간'), el('dd', {}, `${Math.floor(st.el / 1000)}초`)),
          st.galaxies ? el('div', {}, el('dt', {}, '새 은하'), el('dd', {}, `${st.galaxies}개`)) : null),
        el('div', { class: 'gx-acts' },
          el('button', { class: 'gx-btn main', type: 'button', onclick: () => start(st.daily) }, '한 판 더', el('i')),
          el('button', { class: 'gx-btn', type: 'button', onclick: share }, '결과 공유')),
        nextRows(),
        DC.followCta()),
      phone ? null : card);
    box.replaceChildren(sheet); drawCard(); scrollTo(0, 0);
    window.DP?.event('play', { game: 'merge', score: st.score }); // 레벨·코인·미션(dwk-prog.js) — 끝 화면이 뜬 뒤에
  }
  // 게임 사이 길: 다음 게임 · 게임 목록 · 입구
  function nextRows() {
    return el('ul', { class: 'gx-rows', 'aria-label': '다른 곳으로' },
      el('li', {}, el('a', { href: 'survive.html' }, '다음 게임 · 행성 생존', el('small', {}, '카드 넘겨 1년 버티기'))),
      el('li', {}, el('a', { href: 'arcade.html' }, '게임 전부 보기')),
      el('li', {}, el('button', { type: 'button', onclick: home }, '이 게임 처음 화면')),
      el('li', {}, el('a', { href: 'start.html' }, '입구로')));
  }
  async function drawCard() {
    await DC.fonts();
    const c = $('#card'); if (!c) return; const x = c.getContext('2d'), Wc = 1080, Hc = 1350;
    const g = x.createLinearGradient(0, 0, 0, Hc); g.addColorStop(0, '#0b0d26'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, Wc, Hc);
    x.fillStyle = '#fff'; for (let i = 0; i < 120; i++) { x.globalAlpha = Math.random() * .6 + .1; x.fillRect(Math.random() * Wc, Math.random() * Hc, 2, 2); } x.globalAlpha = 1;
    x.textAlign = 'center';
    x.fillStyle = 'rgba(240,240,250,.72)'; x.font = '600 40px "Pretendard Variable", Pretendard, sans-serif'; x.fillText(st.daily ? `오늘의 합치기 · ${DC.today()}` : `행성 합치기 · ${Math.floor(st.el / 1000)}초 버팀`, Wc / 2, 110);
    const top = TIERS[st.maxTier], R = 250, cy = 470;
    const gg = x.createRadialGradient(Wc / 2, cy, R * 0.6, Wc / 2, cy, R * 1.6); gg.addColorStop(0, hexA(top.col, .25)); gg.addColorStop(1, hexA(top.col, 0)); x.fillStyle = gg; x.fillRect(0, cy - R * 1.6, Wc, R * 3.2);
    drawPlanet(x, st.maxTier, Wc / 2, cy, R);
    x.fillStyle = '#f4f1ea'; x.font = '700 48px "Pretendard Variable", Pretendard, sans-serif'; x.fillText(`최고 행성 · ${top.name}`, Wc / 2, 820);
    x.fillStyle = '#f0f0fa'; x.font = '800 150px "Pretendard Variable", Pretendard, sans-serif'; x.fillText(`${st.score.toLocaleString()}`, Wc / 2, 1000);
    x.fillStyle = '#a9a7b8'; x.font = '600 44px "Pretendard Variable", Pretendard, sans-serif'; x.fillText('점 · 너는 몇 점?', Wc / 2, 1070);
    // 진화 사다리
    const n = TIERS.length, gap = 92, sx = Wc / 2 - (n - 1) * gap / 2;
    TIERS.forEach((t, i) => drawPlanet(x, i, sx + i * gap, 1175, 36, 0, 1, 1, i <= st.maxTier ? 1 : 0.25));
    x.globalAlpha = 1; x.fillStyle = '#f4f1ea'; x.font = '800 42px "Pretendard Variable", Pretendard, sans-serif'; x.fillText(`@${D.site.handle}${seat ? ` · 좌석 ${seat}` : ''}`, Wc / 2, 1295);
  }
  async function share() { await DC.shareCanvas($('#card'), `돈워너노우_행성합치기_${st.score}점.png`, `행성 합치기 ${st.score}점! 너는? @${D.site.handle}`); }

  if (!M) { $('#stage').replaceChildren(el('div', { class: 'gx-state', role: 'alert' }, el('p', {}, '게임 엔진을 불러오지 못했어. 인터넷 연결을 확인하고 다시 열어 줘.'), el('button', { class: 'gx-btn', type: 'button', onclick: () => location.reload() }, '다시 불러오기'), el('a', { class: 'gx-txt', href: 'arcade.html' }, '다른 게임 하기'))); return; }
  DI.sound($('#snd'));
  home();
  window.__merge = { get st() { return st; }, near: () => (st && st.near) || 0, get bodies() { return bodies.map(b => ({ x: b.position.x, y: b.position.y, tier: b.plugin.tier, r: TIERS[b.plugin.tier].r })); }, get n() { return bodies.length; }, dz: () => (st && st.dz) || DANGER, rim, TIERS, lat, drawPlanet, get sprites() { return SPRITES.filter(Boolean).length; }, get pops() { return pops.map(p => ({ kind: p.kind || null, txt: p.txt, val: p.val, t: Math.round(p.t) })); }, fxN: () => rings.length + parts.length + sparks.length + flashes.length, geo: () => ({ EX, BY, scale, holdY: st ? holdY() : null, hold: st ? TIERS[st.cur].r : null }) };
})();
