/* find.js — 빈틈 찾기 (돈워너노우 팬 사이트 · 서버 없음 · 개인정보 없음)
   문제 = SETS(탁자 위 3D 장면 세트 · img/g3d/find/<장면>_<판>.jpg). 좌표는 그림 가로 = 1 단위(y는 0~세로/가로).
   모양: {t:'c',x,y,r} 원 · {t:'r',x,y,w,h} 사각형 · {t:'e',x,y,rx,ry} 타원
   2026-11-28 게임판 디벨롭: 누르는 즉시 손끝 표시 · 두 손가락/휠 확대 · 찾으면 카메라가 다가가며 동그라미·입자·점수 날림 ·
   틀리면 X·시간 깎임·붉은 테 · 장면마다 시간이 짧아지는 난이도 곡선 · 힌트(-2초) · 합성 효과음 · 행성 소개 컷 · 끝 화면 도장
   2026-11-28 2차(검수 6~6.5점 지적): 정답 자리를 실제 빈틈 크기로 좁힘(다각형 판정·손끝 오차 10px) · 헛손질 벌점 누적+0.4초 잠금 ·
   확대 상한을 원본 해상도에 맞춤 + 낟알로 밴딩 흩뜨림 · 단계형 힌트 3단 · 점수 팝업이 점수 숫자에 겹치지 않게 · 누른 자리 파동·연속 연출 강화
   2026-11-28 3차(검수 6.5~7점 지적): 힌트 문장은 처음엔 숨기고 단추로 단계 공개(문장 → 넓은 영역 → 좁은 영역 → 정답 자리) · 난이도를 「보자마자 보이나」 기준으로 정렬, 한 판에 같은 행성 한 번 ·
   장면 그림을 한 번 고화질로 다시 그려 씀(어두운 온천 밝게 · 반딧불 둥근 빛 번짐) · 틀린 탭 = 그 자리에 큰 X·붉은 파동·「틀렸어」·판 흔들림·시계 옆 −초 ·
   시간은 장면 소개(첫 장면은 하는 법 포함)가 완전히 걷힌 뒤 시작, 소개 중 누르면 바로 시작 · 끝 화면 = 공유 카드가 날아와 앉는 순간이 주인공
   2026-11-28 4차(검수 6.5~7점 · 새 그림 없이): 정답을 그림 속 「한 점」 크기로(반지름 ≤ 그림 짧은 변 12%) — 한 점을 정할 수 없는 장면 4개는 이번 판에서 뺌(off) ·
   폰에서 판을 세로로 화면 높이만큼(그림은 원본 해상도 이하, 넘치는 옆은 끌어서 둘러봄) · 맞히면 0.4초 안에 카메라가 정답으로 다가가고 금빛 고리·입자·점수 튐 ·
   장면 소개는 저절로 안 걷힌다 — 화면 아무 데나 누르면 걷히고 그때부터 시간이 간다
   2026-11-28 5차(새 3D 장면 세트): 행성 편 720px 장면 대신 「이상한 곳 찾기」용으로 처음부터 설계한 탁자 위 정물 장면 8개(Poly Haven 실사 소품 ·
   같은 조명·렌즈 · 1080×1500 세로판). 장면마다 깨끗한 판(=「빈틈 없음」 함정) + 이상한 곳이 다른 자리에 있는 판 셋 → 문제 32개.
   정답 자리는 렌더 때 proj_rect로 자동 기록(손으로 옮긴 좌표 없음). 한 판 = 장면 5개(진짜 4 + 함정 1) · 난이도 목표 1→4 · 오늘 문제는 날짜 씨앗으로 날마다 다르게 */
(() => {
  'use strict';
  // 5차: 장면 세트 — reports/돈워너노우_게임3D_20261128/find/build_data.py가 렌더 meta.json에서 아래 SETS를 만든다(손으로 고치지 않는다).
  //   rect = 그림 좌표 0~1 [왼쪽, 위, 너비, 높이] · v.k 0 = 깨끗한 판 · d(데모) = 메뉴 보기 그림 전용(문제 풀 밖)
  /*SETS-BEGIN*/
  const SETS = [
    {"id": "kitchen", "name": "부엌 식탁", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "recolor", "rect": [0.67086, 0.45452, 0.15805, 0.11986], "ok": "사과가 새파래. 이런 색 사과는 없어."}, {"k": 2, "kind": "planet", "rect": [0.46107, 0.29083, 0.20616, 0.12969], "ok": "리치 옆에 고리 달린 작은 행성이 굴러다녀."}, {"k": 3, "kind": "float", "rect": [0.01428, 0.4548, 0.17085, 0.35574], "ok": "레몬이 탁자 위 한 뼘 높이에 떠 있어. 그림자만 탁자에 떨어져 있어."}, {"k": "d", "kind": "float", "rect": [0.38876, 0.65044, 0.21352, 0.22323], "ok": "메뉴 보기 그림 전용"}]},
    {"id": "workshop", "name": "작업대", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "glow", "rect": [0.64741, 0.59935, 0.18174, 0.12069], "ok": "전구가 꽂힌 데도 없는데 혼자 켜져 있어."}, {"k": 2, "kind": "invert", "rect": [0.54637, 0.24706, 0.12731, 0.1563], "ok": "기름통이 거꾸로, 주둥이 끝 하나로 서 있어."}, {"k": 3, "kind": "gold", "rect": [0.59277, 0.41452, 0.38893, 0.16611], "ok": "망치가 자루까지 통째로 금이야. 이걸로는 못을 못 박아."}]},
    {"id": "tea", "name": "찻상", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "gold", "rect": [0.68402, 0.59271, 0.17801, 0.11957], "ok": "크루아상 하나가 금덩이야. 먹을 수가 없어."}, {"k": 2, "kind": "giant", "rect": [0.25634, 0.45229, 0.21086, 0.19005], "ok": "리치 한 알이 케이크만 해. 다른 리치는 엄지만 한데."}, {"k": 3, "kind": "recolor", "rect": [0.68796, 0.35821, 0.0929, 0.08405], "ok": "레몬이 보라색이야. 껍질 색이 말이 안 돼."}]},
    {"id": "study", "name": "서재 책상", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "float", "rect": [0.1513, 0.27907, 0.20633, 0.37137], "ok": "자명종이 책상 위 한 뼘 높이에 둥 떠 있어. 그림자만 책상에."}, {"k": 2, "kind": "planet", "rect": [0.4151, 0.33478, 0.21602, 0.13891], "ok": "책상 한가운데 고리 달린 작은 행성이 놓여 있어."}, {"k": 3, "kind": "giant", "rect": [0.58842, 0.36376, 0.21371, 0.11933], "ok": "회중시계가 접시만 해. 주머니에 안 들어가."}]},
    {"id": "garden", "name": "정원 탁자", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "gold", "rect": [0.61636, 0.51921, 0.25059, 0.22541], "ok": "모종삽이 통째로 금이야. 흙 파는 데 쓸 물건이 아니야."}, {"k": 2, "kind": "planet", "rect": [0.42829, 0.3079, 0.20973, 0.13324], "ok": "화분 자리에 작은 행성이 놓여 있어. 고리까지 달렸어."}, {"k": 3, "kind": "giant", "rect": [0.66724, 0.23336, 0.2924, 0.24169], "ok": "양파 하나가 화분만 해. 옆 양파들은 주먹만 한데."}]},
    {"id": "antique", "name": "골동품 탁자", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "float", "rect": [0.62804, 0.31362, 0.27161, 0.38568], "ok": "소라 껍데기가 한 뼘 높이에 떠 있어. 그림자는 따로 떨어져 있어."}, {"k": 2, "kind": "invert", "rect": [0.37575, 0.27552, 0.16097, 0.12866], "ok": "나무 코끼리가 거꾸로 뒤집힌 채 등으로 서 있어. 넘어지지도 않아."}, {"k": 3, "kind": "giant", "rect": [0.34334, 0.44645, 0.23353, 0.12018], "ok": "회중시계가 접시만 해. 다른 시계들은 손톱만 한데."}]},
    {"id": "living", "name": "거실 탁자", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "float", "rect": [0.74725, 0.42324, 0.2344, 0.39337], "ok": "고무 오리가 물도 없는데 한 뼘 높이에 떠 있어."}, {"k": 2, "kind": "gold", "rect": [0.23874, 0.52787, 0.12317, 0.10556], "ok": "야구공 하나가 통째로 금이야. 실밥까지 번쩍여."}, {"k": 3, "kind": "giant", "rect": [0.45359, 0.38489, 0.14457, 0.15601], "ok": "리치 한 알이 야구공보다 커. 다른 리치는 엄지만 한데."}]},
    {"id": "market", "name": "과일 가판", "w": 1080, "h": 1500, "v": [{"k": 0, "kind": "none"}, {"k": 1, "kind": "gold", "rect": [0.1903, 0.49111, 0.15562, 0.12528], "ok": "사과 하나가 금으로 돼 있어. 빛이 번쩍여."}, {"k": 2, "kind": "planet", "rect": [0.39926, 0.28254, 0.2031, 0.12798], "ok": "과일 사이에 고리 달린 작은 행성이 섞여 있어."}, {"k": 3, "kind": "float", "rect": [0.71105, 0.23152, 0.20374, 0.36044], "ok": "아보카도가 한 뼘 높이에 떠 있어. 그림자만 탁자에."}]}
  ];
  /*SETS-END*/
  // 좌표 규칙(5차): 판정·배치는 「그림 가로 = 1」 단위, y는 0~AR(세로/가로) — 세로로 긴 그림에서도 원이 원이 되게
  const IMG = (id) => `img/g3d/find/${id}.jpg`;
  const AR0 = 1500 / 1080;
  // 난이도(5차 검수 1회 「곡선이 거꾸로다 — 금 사과가 마지막, 그림자 간격이 처음」): 종류가 먼저 — 색·금·빛·행성은 한눈에(1~2), 크기·거꾸로는 한 번 더 봐야(3), 떠 있음은 그림자를 읽어야(4)
  const KIND_D = { glow: 1, gold: 1, recolor: 1, planet: 2, giant: 2, invert: 3, tilt: 3, float: 4, glass: 4 };
  const where = (x, y) => `탁자 ${y < 0.45 ? '안쪽(벽 가까이)' : y > 0.72 ? '앞쪽' : '한가운데'} ${x < 0.36 ? '왼편' : x > 0.64 ? '오른편' : '가운데'}을 잘 봐.`;
  const QS = []; let DEMO = null;
  SETS.forEach((st) => {
    const AR = st.h / st.w;
    st.v.forEach((v) => {
      const id = `${st.id}_${v.k}`;
      if (v.kind === 'none') {
        QS.push({ id, sid: st.id, name: st.name, AR, trap: true, shapes: [], hint: '이 탁자, 수상한 데가 있나?', trap2: '정말 이상한 데가 있어? 의심만 하면 지는 판도 있어.',
          ok: `빈틈 없음! 이번 ${st.name}은 진짜로 멀쩡해. 의심만 한다고 다 맞는 건 아니야.` });
        return;
      }
      const [x, y, w, h] = v.rect, cx = x + w / 2, cy = (y + h / 2) * AR;
      const rx = Math.max(0.036, w / 2 * 1.1), ry = Math.max(0.036, h * AR / 2 * 1.1), size = Math.max(w, h * AR);
      const g = Math.sqrt(w * h * AR); // 정답 물건의 겉보기 크기(그림 가로 대비) — 아주 작으면 한 단계 어렵게
      const d = Math.max(1, Math.min(4, (KIND_D[v.kind] || 3) + (g < 0.11 ? 1 : 0)));
      const q = { id, sid: st.id, name: st.name, AR, kind: v.kind, d, size, shapes: [{ t: 'e', x: cx, y: cy, rx, ry }], f: [cx, cy, Math.max(rx, ry)], hint: where(cx, y + h / 2), ok: v.ok };
      if (v.k === 'd') DEMO = q; else QS.push(q);
    });
  });
  window.FIND_QS = QS;
  const DC = window.DC;
  if (!DC) return;
  const { el } = DC;

  const PFF = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
  // 난이도 곡선: 장면이 갈수록 시간이 줄고(10→6.5초), 정답 자리가 작은 문제가 뒤로 간다. 3번째 장면부터 힌트 글은 시간이 40% 지나야 나온다.
  // 2차: 정답 자리가 좁아진 만큼 시간을 1초씩 돌려주고(11→7.5초), 오답 벌점은 「헛손질이 쌓일수록」 커진다(1.0→1.5→2.0초 · 20→30→40점).
  //   틀린 직후 0.4초는 누름을 받지 않는다 — 화면을 마구 두드려 맞히는 길을 막는다.
  const LIMITS = [16000, 15000, 14000, 13000, 12000]; // 5차: 작은 한 점을 넓은 탁자에서 찾는다 — 16→12초
  // 3차: 시간은 소개 덮개가 완전히 걷힌 뒤(INTRO_FADE_MS) 시작한다. 첫 장면 소개는 하는 법까지 담아 1.5초(그동안 시간 안 감 · 누르면 바로 시작).
  // 4차: 소개는 누를 때까지 기다린다(예전 INTRO_MS 0.76초 · FIRST_INTRO_MS 1.5초 자동 걷힘은 뺌)
  const ROUND = 5, INTRO_FADE_MS = 240, AUTO_NEXT_MS = 4600, MISS_LOCK_MS = 400;
  const PEN = [{ ms: 1000, pt: 20 }, { ms: 1500, pt: 30 }, { ms: 2000, pt: 40 }];
  const PENALTY_PT = 30; // 「빈틈 없음」을 잘못 누른 값
  // 단계형 힌트(3차): 문장 한 줄 → 넓은 원 → 좁은 원 → 정답 자리. 문장은 처음엔 숨긴다(검수 「힌트 문장이 정답을 거의 그대로 알려 준다」).
  const HINTS = [{ ms: 500, text: true, label: '힌트' }, { ms: 1000, r: 0.30, dim: 0.38, label: '영역 보기' }, { ms: 1500, r: 0.17, dim: 0.56, label: '더 좁게' }, { ms: 2000, r: 0, dim: 0.7, label: '정답 자리' }];
  const BONUS_MUL = [1, 0.85, 0.6, 0.35, 0.1]; // 힌트 단계별 시간 보너스 배율
  const TOL_PX = 10; // 손끝 오차 — 화면 기준 10px(확대하면 그림 기준으로는 그만큼 작아진다)
  const GRADES = [
    { id: 'S', min: 1000, name: '빈틈 사냥꾼', line: '어디가 이상한지 한눈에 봤어.' },
    { id: 'A', min: 800, name: '눈치 빠른 생존자', line: '이 정도면 1년은 버텨.' },
    { id: 'B', min: 500, name: '아슬아슬 생존자', line: '몇 개는 놓쳤지만 살아는 있어.' },
    { id: 'C', min: -1e9, name: '행성 신입', line: '아직 행성이 널 안 믿어.' },
  ];
  // 4차: 문제가 줄어 한 판 장면 수가 5보다 적을 수 있다 → 등급 기준을 장면 수에 비례(기준은 5장면 값)
  const gradeOf = (s, n = ROUND) => GRADES.find(g => s >= g.min * Math.max(1, n) / 5);
  // 확대 상한 = 원본 해상도(2차): 장면 원본이 720px뿐이라, 그림 1px이 화면 1px(CSS)보다 커지기 전까지만 키운다.
  //   폰(판 390px)에서는 약 1.75배, 판이 큰 컴퓨터에서는 1.25배. 숨결(5%)까지 셈에 넣는다.
  const ZCAP = 2.0; // 5차: 원본 1080px — 검수 2회 「2.6배 확대는 뭉개진다」(폰 화면 배율 2~3) → 2배까지
  const zmaxFor = (natural, W) => Math.max(1.25, Math.min(ZCAP, (natural || 1080) / (Math.max(1, W) * 1.05)));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 5차: 낟알·그림 다시 그리기(720px 원본 보정용)는 뺐다 — 새 렌더는 1080×1500 원본 그대로 쓴다.

  // ── 도형 판정 ── tol = 그림 비율 단위 손끝 오차
  function inPoly(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function segDist(px, py, [ax, ay], [bx, by]) {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function hit(sh, x, y, tol = 0.026) {
    if (sh.t === 'c') return Math.hypot(x - sh.x, y - sh.y) <= sh.r + tol;
    if (sh.t === 'r') return x >= sh.x - tol && x <= sh.x + sh.w + tol && y >= sh.y - tol && y <= sh.y + sh.h + tol;
    if (sh.t === 'e') { const a = (x - sh.x) / (sh.rx + tol), b = (y - sh.y) / (sh.ry + tol); return a * a + b * b <= 1; }
    if (sh.t === 'p') { if (inPoly(sh.pts, x, y)) return true; for (let i = 0, j = sh.pts.length - 1; i < sh.pts.length; j = i++) if (segDist(x, y, sh.pts[j], sh.pts[i]) <= tol) return true; return false; }
    return false;
  }
  window.FIND_HIT = hit;
  window.FIND_TOL = (z, W) => TOL_PX / (Math.max(1, W) * z);
  // 도형 → 가운데·반지름(그림 비율). 정답 동그라미·카메라 초점에 쓴다.
  const box = (sh) => {
    if (sh.t === 'c') return { x: sh.x, y: sh.y, rx: sh.r, ry: sh.r };
    if (sh.t === 'e') return { x: sh.x, y: sh.y, rx: sh.rx, ry: sh.ry };
    if (sh.t === 'p') { const xs = sh.pts.map(p => p[0]), ys = sh.pts.map(p => p[1]), a = Math.min(...xs), b = Math.max(...xs), c = Math.min(...ys), d = Math.max(...ys); return { x: (a + b) / 2, y: (c + d) / 2, rx: (b - a) / 2, ry: (d - c) / 2 }; }
    return { x: sh.x + sh.w / 2, y: sh.y + sh.h / 2, rx: sh.w / 2, ry: sh.h / 2 };
  };
  // 정답 안쪽 한 점(시험 촬영 · 힌트 목표가 정답 밖일 때 대비)
  function answerPt(q) {
    if (!q || q.trap || !q.shapes.length) return null;
    if (q.f && q.shapes.some(s => hit(s, q.f[0], q.f[1], 0))) return [q.f[0], q.f[1]];
    const b = box(q.shapes[0]); if (q.shapes[0].t !== 'p') return [b.x, b.y];
    let best = null;
    for (let i = 1; i < 40; i++) for (let j = 1; j < 40; j++) { const x = i / 40, y = j / 40; if (hit(q.shapes[0], x, y, 0)) { const d = Math.hypot(x - b.x, y - b.y); if (!best || d < best[2]) best = [x, y, d]; } }
    return best ? [best[0], best[1]] : [b.x, b.y];
  }
  window.FIND_ANSWER_PT = answerPt;

  // ── 효과음: Web Audio 합성(파일 없음). 소리 끄기는 DC.sfx 설정을 따른다 ──
  const AU = { ctx: null, noise: null };
  function ac() {
    if (!(DC.sfx.on?.() ?? true)) return null;
    try {
      AU.ctx = AU.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (AU.ctx.state === 'suspended') AU.ctx.resume();
      if (!AU.noise) { const n = AU.ctx.sampleRate * 0.5, b = AU.ctx.createBuffer(1, n, AU.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; AU.noise = b; }
      return AU.ctx;
    } catch { return null; }
  }
  function osc(c, f, t0, dur, type = 'sine', vol = 0.1, f2 = 0) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function hiss(c, t0, dur, vol, type, f1, f2, q = 1) {
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = AU.noise; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f1, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl).connect(g).connect(c.destination); s.start(t0); s.stop(t0 + dur + 0.03);
  }
  const SND = {
    press() { const c = ac(); if (!c) return; const t = c.currentTime; hiss(c, t, 0.03, 0.05, 'highpass', 3500); osc(c, 1900, t, 0.025, 'sine', 0.03); },
    found(combo) { const c = ac(); if (!c) return; const t = c.currentTime, k = Math.pow(2, Math.min(combo, 6) / 12);
      osc(c, 90, t, 0.18, 'sine', 0.16, 55); hiss(c, t, 0.12, 0.05, 'bandpass', 2400, 6000, 0.8);
      [0, 4, 7, 12].forEach((s, i) => { const f = 523.25 * k * Math.pow(2, s / 12); osc(c, f, t + 0.05 + i * 0.055, 0.32, 'triangle', 0.075); osc(c, f * 2, t + 0.05 + i * 0.055, 0.2, 'sine', 0.025); });
      hiss(c, t + 0.22, 0.45, 0.025, 'highpass', 7000); },
    wrong() { const c = ac(); if (!c) return; const t = c.currentTime; osc(c, 150, t, 0.22, 'sine', 0.2, 55); osc(c, 196, t, 0.16, 'square', 0.03, 98); hiss(c, t, 0.14, 0.08, 'lowpass', 900, 200); },
    whoosh() { const c = ac(); if (!c) return; const t = c.currentTime; hiss(c, t, 0.42, 0.06, 'bandpass', 260, 2600, 1.4); osc(c, 220, t + 0.3, 0.3, 'sine', 0.04, 330); },
    beat(n) { const c = ac(); if (!c) return; const t = c.currentTime; osc(c, 64, t, 0.12, 'sine', 0.22, 44); osc(c, 58, t + 0.16, 0.1, 'sine', 0.14, 40); osc(c, 1320 - n * 120, t, 0.04, 'square', 0.02); },
    timeout() { const c = ac(); if (!c) return; const t = c.currentTime; osc(c, 233, t, 0.5, 'sawtooth', 0.05, 110); osc(c, 77, t, 0.6, 'sine', 0.2, 40); hiss(c, t, 0.4, 0.05, 'lowpass', 1200, 150); },
    hint(lv = 1) { const c = ac(); if (!c) return; const t = c.currentTime, k = Math.pow(2, (lv - 1) * 3 / 12); [880, 1175, 1568].forEach((f, i) => osc(c, f * k, t + i * 0.06, 0.4, 'sine', 0.04)); hiss(c, t, 0.35, 0.03, 'bandpass', 3000 * k, 900, 2); },
    count() { const c = ac(); if (!c) return; osc(c, 2200, c.currentTime, 0.02, 'square', 0.012); },
    stamp(top) { const c = ac(); if (!c) return; const t = c.currentTime; osc(c, 70, t, 0.5, 'sine', 0.3, 38); hiss(c, t, 0.25, 0.12, 'lowpass', 1800, 120);
      (top ? [523, 659, 784, 1047, 1319] : [392, 494, 587]).forEach((f, i) => osc(c, f, t + 0.18 + i * 0.07, 0.5, 'triangle', 0.06)); },
  };

  // ── 문제 뽑기: 출시된(장면 있는) 행성만 · 한 판에 같은 행성은 한 번(3차 — 손 숲 다음에 손자국 창이 나오면 답이 샌다) ·
  //    「보자마자 보이나」(d) 순서로 쉬운 것부터(같으면 정답 자리가 넓은 것부터) · 함정은 넷째 자리 ──
  // 5차 한 판: 장면 5개 = 진짜 찾기 4 + 「빈틈 없음」 함정 1 · 같은 장면은 한 판에 한 번 ·
  //   진짜 넷은 난이도 목표 1→2→3→4에 가장 가까운 것(같은 판 구성·같은 곡선) · 함정은 2~4번째 중 한 자리(첫·마지막은 진짜 찾기)
  function pick(rnd) {
    const sh = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    // 검수 2회 「뒤로 가도 어려워지지 않는다」: 장면을 먼저 고르면 그 장면들에 어려운 문제가 없을 때 곡선이 끊겼다 →
    //   문제 전체에서 난이도 목표(1→2→3→4)마다 고르고(같은 장면은 한 번), 함정은 아직 안 쓴 장면에서
    const used = new Set(), out = [];
    for (const want of [1, 2, 3, 4]) {
      let best = null;
      for (const q of sh(QS.filter(q => !q.trap && !used.has(q.sid)))) if (!best || Math.abs(q.d - want) < Math.abs(best.d - want)) best = q;
      if (best) { out.push(best); used.add(best.sid); }
    }
    if (!out.length) return [];
    out.sort((a, b) => a.d - b.d || b.size - a.size);
    const trap = sh(QS.filter(q => q.trap && !used.has(q.sid)))[0];
    if (trap) out.splice(Math.min(out.length - 1, 1 + Math.floor(rnd() * 3)), 0, trap);
    return out;
  }

  window.FIND_PICK = (seed) => pick(DC.rng(DC.seed(seed))).map(q => q.id); // 시험용: 그날 문제 목록
  const app = document.getElementById('app');
  const state = { mode: 'menu' };
  const sndBtn = document.getElementById('snd');
  DI.sound(sndBtn);
  const mmss = (ms) => Math.round(ms / 1000);
  const todayStr = () => DC.today();
  const later = (fn, ms) => { const t = setTimeout(fn, ms); (G?.timers || []).push(t); return t; };

  // ── 메뉴: 첫 5초 안에 「이상한 곳을 콕 → 동그라미 → 점수」를 그림으로 보여 준다 ──
  function menu() {
    stopTimer(); clearTimers(); state.mode = 'menu';
    const daily = DC.store.get('find_daily', null);
    const doneToday = daily && daily.date === todayStr();
    const best = DC.store.get('find_best', 0);
    const got = DC.endings.got('find');
    app.classList.add('gx-wide');
    const nScenes = pick(() => 0.5).length;
    const demo = el('div', { class: 'f-demo', 'aria-hidden': 'true' },
      el('img', { src: DEMO ? IMG(DEMO.id) : IMG('kitchen_0'), alt: '', decoding: 'async', style: demoPos().img }), // 5차: 문제 풀 밖 데모 판(정답이 문제에 안 나옴)
      el('span', { class: 'f-demo-ring', style: demoPos().ring }), el('span', { class: 'f-demo-pts' }, '+180'),
      el('span', { class: 'f-demo-dots' }, ...Array.from({ length: 8 }, (_, i) => el('i', { style: `--a:${i * 45}deg` }))),
      el('span', { class: 'f-demo-hand' }, DI.ic('tap')),
      el('span', { class: 'f-demo-cap' }, '이상한 곳? 콕'));
    app.replaceChildren(el('section', { class: 'gx-hero f-hero' },
      el('img', { class: 'gx-bg', src: IMG('study_0'), alt: '', decoding: 'async' }),
      el('div', { class: 'gx-cap' },
        demo,
        el('p', { class: 'gx-eyebrow' }, el('span', {}, '04'), '1분 게임'),
        el('h1', { class: 'gx-h1' }, '빈틈 찾기'),
        el('p', { class: 'gx-sub' }, '탁자 위 어딘가 말이 안 되는 게 하나 있어. 콕 눌러. ', el('b', {}, `장면 ${nScenes}개, 갈수록 시간이 짧아져.`), ' 아무 이상 없으면 「빈틈 없음」.'),
        el('div', { class: 'gx-acts' },
          doneToday
            ? el('button', { class: 'gx-btn main', type: 'button', onclick: () => resultScreen(daily, true) }, '오늘 문제 결과', el('i'))
            : el('button', { class: 'gx-btn main', type: 'button', onclick: () => start('daily') }, '오늘 문제', el('i')),
          el('button', { class: 'gx-btn', type: 'button', onclick: () => start('free') }, '연습하기')),
        el('p', { class: 'gx-note' }, `문제 ${QS.length}개 중 ${nScenes}개 · 오늘 문제는 날마다 바뀌고 모두 같은 판. 막히면 힌트(시간이 깎여). 두 손가락으로 벌리면 크게 볼 수 있어.`),
        el('dl', { class: 'gx-rows' },
          el('div', {}, el('dt', {}, '내 최고'), el('dd', {}, best ? `${best}점` : '아직 없음')),
          el('div', {}, el('dt', {}, '받아 본 등급 · S A B C'), el('dd', {}, `${got.length} / 4`)),
          el('div', {}, el('dt', {}, '오늘 문제'), el('dd', {}, doneToday ? `${daily.grade} · ${daily.score}점` : '아직 안 함'))),
        DC.followCta())));
    scrollTo(0, 0);
  }

  // 메뉴 보기 그림(16:10 칸)에 데모 정답이 고리 자리(가로 52.5% · 세로 37%)에 오게 그림 세로 위치를 정한다
  function demoPos() {
    if (!DEMO) return { img: '', ring: '' };
    const AR = DEMO.AR, BH = 0.625, b = DEMO.shapes[0], off = Math.max(0, Math.min(AR - BH, b.y - 0.37 * BH));
    const rx = Math.max(b.rx * 1.25, 0.07), ry = Math.max(b.ry * 1.25, 0.07);
    return { img: `object-position: 50% ${(off / (AR - BH) * 100).toFixed(1)}%`,
      ring: `left:${((b.x - rx) * 100).toFixed(1)}%;top:${((b.y - ry - off) / BH * 100).toFixed(1)}%;width:${(rx * 200).toFixed(1)}%;height:${(ry * 2 / BH * 100).toFixed(1)}%` };
  }

  // ── 한 판 ──
  let G = null;
  function clearTimers() { if (G?.timers) { G.timers.forEach(clearTimeout); G.timers.length = 0; } }
  function start(mode) {
    const rnd = mode === 'daily' ? DC.rng(DC.seed('find-' + todayStr())) : Math.random;
    const qs = pick(rnd);
    if (!qs.length) { DC.toast('아직 문제가 없어'); return; }
    clearTimers();
    G = { mode, qs, i: 0, score: 0, shown: 0, combo: 0, maxCombo: 0, marks: [], used: [], phase: 'idle', timers: [], coached: false };
    ac(); SND.press();
    window.dwkT?.gameStart('find', { mode });
    const q0 = qs[0]; let went = false; const go = () => { if (went || G?.qs !== qs) return; went = true; scene(); };
    const im0 = new Image(); im0.src = IMG(q0.id); (im0.decode ? im0.decode() : Promise.resolve()).then(go, go); setTimeout(go, 700); // 늦어도 0.7초 안에는 시작
  }
  const isTall = () => innerWidth < 600 && innerHeight > innerWidth * 1.3;

  let timer = null;
  function stopTimer() { if (timer) { cancelAnimationFrame(timer.raf); timer = null; } }

  // 카메라(확대·이동) — .f-cam 은 원점 0,0 기준 translate+scale, .f-drift 는 장면이 천천히 다가오는 숨결
  const cam = { z: 1, tx: 0, ty: 0 };
  // 4차: 그림(.f-cam) 한 변 S는 판 너비·높이 중 큰 쪽 — 폰 세로 화면에선 판보다 넓어서 옆으로 끌어 둘러본다(확대 1배에서도)
  const zmax = () => G?.ui ? zmaxFor(G.ui.img.naturalWidth, G.ui.stage.clientWidth) : 1.25;
  // 5차: 그림 = 가로 S · 세로 SH(=S×AR). 판은 그림과 같은 비율이라 확대 1배에서 그림 전체가 보인다
  const camSize = () => { const st = G.ui.stage, S = st.clientWidth; return { W: S, H: st.clientHeight, S, SH: S * (G.ui.q.AR || AR0) }; };
  function camApply(ease) {
    const c = G?.ui?.cam; if (!c) return;
    c.classList.toggle('ease', !!ease);
    c.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.z})`;
    G.ui.zoomBtn.hidden = cam.z <= 1.02 || G.phase !== 'play';
    const pb = G.ui.panbar; if (pb) { // 지금 보이는 부분이 그림 가로의 어디인지(넘치는 화면에서만)
      const { W, S } = camSize(), w = W / (S * cam.z);
      pb.hidden = w >= 0.985 || G.phase === 'reveal';
      if (!pb.hidden) { pb.firstChild.style.width = (w * 100).toFixed(1) + '%'; pb.firstChild.style.left = (-cam.tx / (S * cam.z) * 100).toFixed(1) + '%'; }
    }
  }
  function camClamp() {
    const { W, H, S, SH } = camSize();
    cam.z = Math.min(zmax(), Math.max(1, cam.z));
    const cw = S * cam.z, ch = SH * cam.z;
    cam.tx = cw >= W ? Math.min(0, Math.max(W - cw, cam.tx)) : (W - cw) / 2; cam.ty = ch >= H ? Math.min(0, Math.max(H - ch, cam.ty)) : (H - ch) / 2;
  }
  // 처음 자리 = 확대 1배 · 가운데
  function camHome() { const { W, H, S, SH } = camSize(); cam.z = 1; cam.tx = (W - S) / 2; cam.ty = (H - SH) / 2; }
  // 판 크기 맞추기(4차 · 검수 「폰에서 그림이 정사각 한 판뿐이라 아래 약 170px이 빈다」): 폰 세로 화면이면 판을 아래 단추 줄 바로 위까지 키운다.
  //   그림은 정사각형이라 판 높이에 맞춘 한 변 S가 판 너비보다 크다 → 옆은 끌어서 본다. S는 원본(720px)을 넘지 않는다.
  // 5차: 판 = 그림과 같은 세로 비율(1080×1500). 폰 세로 화면에서 아래 단추 줄까지 자리가 모자라면 판 너비를 줄여(가운데) 그림 전체가 들어오게
  function fitStage() {
    const u = G?.ui; if (!u) return;
    const st = u.stage, play = st.closest('.f-play'), tall = isTall(), AR = u.q.AR || AR0;
    play.classList.toggle('tall', tall);
    st.style.width = ''; st.style.marginLeft = st.style.marginRight = '';
    // 줄인 판은 화면 가운데에 — 폰에선 판이 바깥 여백(20px)까지 꽉 차는 규칙(margin 0 -20px)이라 부모 기준으로 왼쪽 여백을 직접 계산
    const shrink = (w) => { w = Math.max(220, Math.floor(w)); const pw = st.parentElement.clientWidth; st.style.width = w + 'px'; st.style.marginLeft = ((pw - w) / 2) + 'px'; st.style.marginRight = '0px'; };
    if (tall) {
      const btnH = u.btnH || (u.btnH = u.under.querySelector('.f-btns')?.offsetHeight || 48);
      u.under.style.height = btnH + 'px';
      const pad = parseFloat(getComputedStyle(play).paddingBottom) || 0, gap = parseFloat(getComputedStyle(u.under).marginTop) || 0;
      const avail = Math.floor(innerHeight - (st.getBoundingClientRect().top + scrollY) - gap - btnH - pad);
      if (avail < st.clientWidth * AR) shrink(avail / AR);
      const extra = document.documentElement.scrollHeight - innerHeight; // 바깥 틀 여백까지 셈 — 그래도 넘치면 그만큼 더 줄임
      if (extra > 0) shrink((st.clientHeight - extra) / AR);
    } else { u.under.style.height = ''; }
    u.S = st.clientWidth;
    u.cam.style.width = u.S + 'px'; u.cam.style.height = (u.S * AR) + 'px';
  }
  // 그림 비율 좌표 ↔ 화면 좌표 (확대·숨결이 다 반영된 실제 위치)
  function toPic(cx, cy) { const r = G.ui.drift.getBoundingClientRect(); return [(cx - r.left) / r.width, (cy - r.top) / r.width]; } // 5차: y도 가로 단위
  window.FIND_TO_SCREEN = (fx, fy) => { const r = G.ui.drift.getBoundingClientRect(), s = G.ui.stage.getBoundingClientRect();
    return [Math.min(s.right - 4, Math.max(s.left + 4, r.left + fx * r.width)), Math.min(s.bottom - 4, Math.max(s.top + 4, r.top + fy * r.width))]; };
  window.FIND_CUR = () => G?.ui?.q || null;
  window.FIND_PLAYING = () => !!G && G.phase === 'play';
  window.FIND_PT = () => PT.length; // 시험용: 지금 화면의 입자 수

  function scene() {
    clearTimers();
    const q = G.qs[G.i], limit = LIMITS[Math.min(G.i, LIMITS.length - 1)];
    G.phase = 'intro'; G.wrong = 0; G.hinted = false; G.hintLv = 0; G.lockUntil = 0; G.limit = limit; G.left = limit; G.lastSec = 4;
    cam.z = 1; cam.tx = 0; cam.ty = 0;
    const nxt = G.qs[G.i + 1]; if (nxt) new Image().src = IMG(nxt.id);
    const bar = el('div', { class: 'f-bar' }, el('i', {}));
    const clock = el('b', { class: 'f-clock' }, (limit / 1000).toFixed(1));
    const hudScore = el('b', { class: 'score' }, `${G.score}`);
    const hudCombo = el('b', { class: 'f-combo' }, G.combo > 0 ? `x${G.combo}` : '–');
    const img = el('img', { src: IMG(q.id), alt: '', draggable: 'false', decoding: 'async', onerror: () => stage.classList.add('err') });
    const marks = el('div', { class: 'f-marks' });
    const drift = el('div', { class: 'f-drift' }, img, marks);
    const sceneTok = G.tok = (G.tok || 0) + 1;
    drift.style.animationDuration = limit + 'ms'; // 4차: 숨결은 소개가 걷힌 뒤부터(소개 중엔 CSS가 멈춰 둠)
    const camEl = el('div', { class: 'f-cam' }, drift);
    const fx = el('canvas', { class: 'f-fx', 'aria-hidden': 'true' });
    // 「원래 크기」는 판 안에 있어 누르면 판의 누름으로도 잡혔다(2차에서 발견 — 1차 판에서 이 단추를 누르면 그 자리가 답으로 판정됐다). 누름을 판까지 올려 보내지 않는다.
    const zoomBtn = el('button', { class: 'f-zoom', type: 'button', hidden: '', onpointerdown: (e) => e.stopPropagation(), onpointerup: (e) => e.stopPropagation(), onclick: (e) => { e.stopPropagation(); camHome(); camApply(true); } }, '원래 크기');
    const panbar = el('span', { class: 'f-panbar', hidden: '', 'aria-hidden': 'true' }, el('i'));
    // 장면 소개 — 첫 장면은 하는 법까지 여기에 담는다(3차: 예전엔 하는 법 덮개가 시간이 도는 동안 판 아래를 가렸다)
    const first = G.i === 0 && !G.coached;
    const intro = el('div', { class: 'f-intro' + (first ? ' first' : ''), 'aria-hidden': 'true' },
      el('p', {}, el('small', {}, `장면 ${G.i + 1} / ${G.qs.length}`), el('b', {}, q.name),
        el('span', {}, `${(limit / 1000).toFixed(limit % 1000 ? 1 : 0)}초`)),
      first ? el('div', { class: 'f-intro-how' }, el('span', { class: 'f-coach-hand' }, DI.ic('tap')), el('b', {}, '이상한 곳을 콕'), el('small', {}, '말이 안 되는 게 딱 하나 · 없으면 「빈틈 없음」 · 두 손가락으로 확대')) : null,
      el('em', { class: 'f-intro-go' }, '아무 데나 누르면 시작'));
    const stage = el('div', { class: 'f-stage is-intro', role: 'img', 'aria-label': `${q.name} 장면. 이상하다고 생각하는 곳을 누르기` }, camEl, fx, panbar, zoomBtn, intro);
    // 3차: 힌트 문장은 처음엔 숨긴다 — 그 자리엔 힌트 단추 안내만(줄 높이는 그대로라 판이 들썩이지 않음)
    const hintP = el('p', { class: 'f-hint idle' }, '막히면 「힌트」 — 실마리 한 줄부터');
    const hintBtn = el('button', { class: 'gx-btn f-hintbtn', type: 'button', onclick: () => useHint() }, HINTS[0].label, el('small', {}, `−${HINTS[0].ms / 1000}초`));
    const noneB = el('button', { class: 'gx-btn f-none', type: 'button', onclick: () => noneBtn() }, '빈틈 없음');
    const under = el('div', { class: 'f-under' }, el('div', { class: 'f-btns' }, hintBtn, noneB));
    const best = DC.store.get('find_best', 0);
    G.ui = { bar, clock, hudScore, hudCombo, stage, cam: camEl, drift, marks, fx, under, q, hintP, zoomBtn, img, panbar };
    const timerow = el('div', { class: 'f-timerow wait' }, bar, clock); G.ui.timerow = timerow;
    app.classList.remove('gx-wide');
    app.replaceChildren(el('div', { class: 'f-play' },
      el('div', { class: 'gx-hud f-hud' },
        el('div', {}, el('small', {}, G.mode === 'daily' ? '오늘 · 장면' : '장면'), el('b', {}, `${G.i + 1}/${G.qs.length}`)),
        el('div', {}, el('small', {}, '점수'), hudScore),
        el('div', { class: 'dim' }, el('small', {}, '내 최고'), el('b', {}, best ? String(best) : '–')),
        el('div', { class: 'push' }, el('small', {}, '콤보'), hudCombo)),
      timerow,
      el('p', { class: 'f-q' }, `${q.name}, 어디가 이상해?`),
      hintP,
      stage, under));
    fitStage();
    fxSize();
    camHome(); camApply(false);
    bindStage(stage);
    SND.whoosh();
    // 4차(검수 「소개 중에도 시간이 줄고, 구석을 눌러도 소개가 안 걷힌다」): 소개는 저절로 걷히지 않는다.
    //   화면 어디든(판 밖 · 단추 · 빈 곳) 누르거나 키를 누르면 걷히고, 덮개가 다 걷힌 순간(INTRO_FADE_MS)부터 시간이 간다.
    //   걷히는 동안은 'ready' — 그 누름이 힌트·빈틈 없음 단추나 답으로 이어지지 않게 막는다.
    G.introEnd = () => {
      if (!G || G.phase !== 'intro' || G.tok !== sceneTok) return;
      G.introEnd = null; if (first) G.coached = true;
      stage.classList.remove('is-intro'); G.phase = 'ready'; G.swallowUntil = performance.now() + 450;
      later(() => {
        if (!G || G.phase !== 'ready' || G.tok !== sceneTok) return;
        G.phase = 'play'; camApply(false);
        timerow.classList.remove('wait'); timerow.classList.add('go'); runTimer();
      }, RM ? 0 : INTRO_FADE_MS);
      // 다음 장면 그림은 지금(이 장면 플레이 중 첫 순간이 아니라) 말고 정답 공개 뒤에 그린다 — finish() 참고
    };
  }
  // 소개 걷기: 문서 전체에서 먼저 잡는다(판 밖 구석을 눌러도 걷힘)
  const introTap = () => { if (G && G.phase === 'intro' && G.introEnd) G.introEnd(); };
  document.addEventListener('pointerdown', introTap, true);
  document.addEventListener('keydown', (e) => { if (!e.repeat && !['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) introTap(); }, true);

  function runTimer() {
    stopTimer();
    timer = { raf: 0, last: performance.now() };
    const loop = (now) => {
      if (!timer || !G || G.phase !== 'play') return;
      const dt = Math.min(now - timer.last, 100); timer.last = now; G.left -= dt;
      const f = Math.max(0, G.left / G.limit);
      G.ui.bar.firstChild.style.transform = `scaleX(${f})`;
      G.ui.clock.textContent = Math.max(0, G.left / 1000).toFixed(1);
      const low = G.left < 3000;
      G.ui.bar.classList.toggle('low', low); G.ui.clock.classList.toggle('low', low); G.ui.stage.classList.toggle('low', low);
      const sec = Math.ceil(G.left / 1000);
      if (G.left > 0 && sec < G.lastSec && sec <= 3) { G.lastSec = sec; SND.beat(sec); DC.buzz(10); }
      if (G.left <= 0) { finish('timeout'); return; }
      timer.raf = requestAnimationFrame(loop);
    };
    timer.raf = requestAnimationFrame(loop);
  }

  // ── 입력: 누르는 순간(포인터 다운) 손끝 표시, 뗄 때 판정. 두 손가락 = 확대, 확대 중 끌기 = 이동, 휠 = 확대 ──
  function bindStage(stage) {
    const P = new Map(); let gest = null;
    const local = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    stage.addEventListener('pointerdown', (e) => {
      if (!G || (G.phase !== 'play' && G.phase !== 'intro')) return; // 'ready'(소개가 걷히는 0.24초)는 받지 않음
      e.preventDefault();
      try { stage.setPointerCapture(e.pointerId); } catch { /* 합성 입력 */ }
      P.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() });
      if (G.phase === 'intro') { G.introEnd?.(); gest = { tap: false, pan: { tx: cam.tx, ty: cam.ty } }; return; } // 소개 건너뛰기 — 이 누름은 답이 아님
      if (P.size === 1) {
        gest = { tap: true, pan: { tx: cam.tx, ty: cam.ty } };
        if (G.phase === 'play') { pressDot(e.clientX, e.clientY, performance.now() < G.lockUntil); SND.press(); stage.classList.add('press'); }
      } else if (P.size === 2 && gest) {
        const [a, b] = [...P.values()], [lx, ly] = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        gest = { tap: false, pinch: { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: cam.z, L: [(lx - cam.tx) / cam.z, (ly - cam.ty) / cam.z] } };
        stage.classList.remove('press'); dropPressDot();
      }
    });
    stage.addEventListener('pointermove', (e) => {
      const p = P.get(e.pointerId); if (!p || !gest) return;
      p.x = e.clientX; p.y = e.clientY;
      if (gest.pinch && P.size >= 2) {
        const [a, b] = [...P.values()], [lx, ly] = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
        cam.z = gest.pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gest.pinch.d0;
        cam.z = Math.min(zmax(), Math.max(1, cam.z));
        cam.tx = lx - gest.pinch.L[0] * cam.z; cam.ty = ly - gest.pinch.L[1] * cam.z; camClamp(); camApply(false);
      } else if (P.size === 1 && Math.hypot(p.x - p.x0, p.y - p.y0) > 12) {
        gest.tap = false; stage.classList.remove('press'); dropPressDot();
        const { W, H, S, SH } = camSize(); // 그림이 판보다 크면(확대 중) 끌어서 둘러본다
        if (S * cam.z > W + 1 || SH * cam.z > H + 1) { cam.tx = gest.pan.tx + (p.x - p.x0); cam.ty = gest.pan.ty + (p.y - p.y0); camClamp(); camApply(false); }
      }
    });
    const up = (e) => {
      const p = P.get(e.pointerId); if (!p) return;
      P.delete(e.pointerId); stage.classList.remove('press');
      if (gest && gest.tap && P.size === 0 && e.type === 'pointerup' && performance.now() - p.t0 < 650) onTap(e.clientX, e.clientY);
      else dropPressDot();
      if (P.size === 0) gest = null;
    };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => {
      if (!G || G.phase !== 'play') return;
      e.preventDefault();
      const [lx, ly] = local(e), z0 = cam.z, L = [(lx - cam.tx) / z0, (ly - cam.ty) / z0];
      cam.z = Math.min(zmax(), Math.max(1, z0 * Math.exp(-e.deltaY * 0.0016)));
      cam.tx = lx - L[0] * cam.z; cam.ty = ly - L[1] * cam.z; camClamp(); camApply(false);
    }, { passive: false });
  }
  let pdot = null;
  function pressDot(cx, cy, locked) {
    dropPressDot();
    const r = G.ui.stage.getBoundingClientRect();
    pdot = el('span', { class: 'f-press' + (locked ? ' lock' : '') }); pdot.style.left = (cx - r.left) + 'px'; pdot.style.top = (cy - r.top) + 'px';
    G.ui.stage.append(pdot);
  }
  function dropPressDot() { if (pdot) { const d = pdot; pdot = null; d.classList.add('out'); setTimeout(() => d.remove(), 220); } }

  function onTap(cx, cy) {
    if (!G || G.phase !== 'play') return;
    if (performance.now() < G.lockUntil) { dropPressDot(); return; } // 틀린 직후 0.4초는 받지 않음(마구 두드리기 막기)
    if (G.coach) { G.coach.remove(); G.coach = null; G.coached = true; }
    const [x, y] = toPic(cx, cy);
    const q = G.ui.q, tol = TOL_PX / G.ui.drift.getBoundingClientRect().width;
    if (pdot) { pdot.remove(); pdot = null; }
    if (!q.trap && q.shapes.some(s => hit(s, x, y, tol))) { G.hitIdx = q.shapes.findIndex(s => hit(s, x, y, tol)); finish('hit', x, y, cx, cy); }
    else penalty(x, y, cx, cy, q.trap);
  }
  function noneBtn() {
    if (!G || G.phase !== 'play' || performance.now() < (G.swallowUntil || 0)) return; // 소개를 걷은 그 누름이 단추로 이어지지 않게
    if (G.coach) { G.coach.remove(); G.coach = null; G.coached = true; }
    if (G.ui.q.trap) finish('none-ok'); else finish('none-bad');
  }
  // ── 단계형 힌트(3차): 1단계 문장 한 줄(처음엔 숨김) → 2단계 넓은 원(정답이 그 안 어딘가) → 3단계 좁은 원 → 4단계 정답 자리.
  //   값: 0.5초 → 1.0초 → 1.5초 → 2.0초. 힌트를 쓰면 연속이 끊기고, 시간 보너스가 BONUS_MUL만큼 준다.
  function useHint() {
    if (!G || G.phase !== 'play' || G.hintLv >= HINTS.length || performance.now() < (G.swallowUntil || 0)) return;
    const q = G.ui.q, H = HINTS[G.hintLv];
    G.hintLv++; G.hinted = true; G.left -= H.ms; G.combo = 0;
    G.ui.hudCombo.textContent = '–';
    SND.hint(G.hintLv); DC.buzz(12);
    const btn = G.ui.under.querySelector('.f-hintbtn'), hp = G.ui.hintP;
    const say = (t) => { hp.textContent = t; hp.classList.remove('idle', 'on'); void hp.offsetWidth; hp.classList.add('on'); };
    if (H.text) say(q.hint);
    else if (q.trap) { say(q.trap2 || q.hint); G.hintLv = HINTS.length; }
    else {
      const [fx, fy, fr] = q.f || [box(q.shapes[0]).x, box(q.shapes[0]).y, Math.max(box(q.shapes[0]).rx, box(q.shapes[0]).ry)];
      let R = H.r, cx = fx, cy = fy;
      if (R > 0) { // 정답이 원 안에 들어오게 하되 가운데에 두지 않는다
        const room = Math.max(0, R - fr) * 0.6, a = Math.random() * Math.PI * 2, d = room * (0.45 + Math.random() * 0.55);
        cx = fx + Math.cos(a) * d; cy = fy + Math.sin(a) * d;
      } else R = Math.max(fr * 1.15, 0.075);
      // 바깥 어둡게 = 판 크기 덮개 한 장의 원형 그라데이션(300vmax 그림자는 큰 화면에서 프레임을 멈췄다 — 2차 실측)
      let ring = G.ui.marks.querySelector('.f-hintring'), dim = G.ui.marks.querySelector('.f-hintdim');
      if (!ring) {
        dim = el('span', { class: 'f-hintdim' }); ring = el('span', { class: 'f-hintring' }); G.ui.marks.append(dim, ring);
        place(ring, { x: 0.5, y: 0.5, rx: 0.75, ry: 0.75 }, 1); void ring.offsetWidth;
      }
      const lv = G.hintLv - 1; // 영역 단계 1·2·3
      ring.className = 'f-hintring lv' + lv;
      place(ring, { x: cx, y: cy, rx: R, ry: R }, 1);
      const AR = q.AR || AR0; dim.style.setProperty('--hx', (cx * 100).toFixed(2) + '%'); dim.style.setProperty('--hy', (cy / AR * 100).toFixed(2) + '%');
      dim.style.setProperty('--hr', (Math.max(R, 0.06) * 100).toFixed(2) + '%'); dim.style.setProperty('--hry', (Math.max(R, 0.06) / AR * 100).toFixed(2) + '%'); dim.style.setProperty('--hd', String(H.dim));
      // 4차: 그림이 판보다 넓으면(폰 세로 화면) 힌트 고리가 화면 밖일 수 있다 → 고리 쪽으로 화면을 옮긴다(확대 배율은 그대로)
      const cs = camSize();
      if (cs.S * cam.z > cs.W + 1 || cs.SH * cam.z > cs.H + 1) { cam.tx = cs.W / 2 - cx * cs.S * cam.z; cam.ty = cs.H / 2 - cy * cs.S * cam.z; camClamp(); G.ui.cam.style.setProperty('--ease', '.45s'); camApply(true); }
    }
    if (btn) {
      const nx = HINTS[G.hintLv];
      if (nx) btn.replaceChildren(nx.label, el('small', {}, `−${nx.ms / 1000}초`)); else btn.setAttribute('disabled', '');
    }
    clockPop(`−${H.ms / 1000}초`);
    G.ui.bar.classList.remove('hit'); void G.ui.bar.offsetWidth; G.ui.bar.classList.add('hit');
  }
  // 시계 옆에 깎인 초가 튀어나온다(힌트·오답 공통)
  function clockPop(txt) {
    const row = G?.ui?.timerow; if (!row) return;
    const n = el('span', { class: 'f-clockpop' }, txt); row.append(n); setTimeout(() => n.remove(), 900);
  }
  // 그림 좌표 상자를 .f-marks 안 %로 배치
  function place(n, b, k = 1.12) {
    const rx = Math.max(b.rx * k, 0.045), ry = Math.max(b.ry * k, 0.045), AR = G?.ui?.q?.AR || AR0;
    n.style.left = (b.x - rx) * 100 + '%'; n.style.top = (b.y - ry) / AR * 100 + '%'; n.style.width = rx * 200 + '%'; n.style.height = ry * 200 / AR + '%';
  }
  function floatAt(parent, fx, fy, txt, kind, fixedTop) {
    const n = el('span', { class: 'f-float ' + kind }, txt);
    n.style.left = Math.min(txt.length > 6 ? 76 : 86, Math.max(txt.length > 6 ? 24 : 14, fx * 100)) + '%'; n.style.top = (fixedTop ? 8 : Math.max(8, fy / (G?.ui?.q?.AR || AR0) * 100)) + '%';
    parent.append(n); setTimeout(() => n.remove(), 950);
  }
  function edgeFlash(kind) {
    const f = el('span', { class: 'f-edge ' + kind }); G.ui.stage.append(f); setTimeout(() => f.remove(), 600);
  }
  // 누른 자리에서 퍼지는 파동(2차): 맞히면 금빛 두 겹(연속이면 한 겹 더) + 빛 번짐, 틀리면 붉은 한 겹
  function wave(px, py, kind, n = 1) {
    if (RM || !G?.ui?.stage) return;
    for (let i = 0; i < n; i++) {
      const w = el('span', { class: 'f-wave ' + kind }); w.style.left = px + 'px'; w.style.top = py + 'px'; w.style.animationDelay = (i * 90) + 'ms';
      G.ui.stage.append(w); setTimeout(() => w.remove(), 760 + i * 90);
    }
    const f = el('span', { class: 'f-flash' + (kind === 'good' ? '' : ' bad') }); f.style.left = px + 'px'; f.style.top = py + 'px'; G.ui.stage.append(f); setTimeout(() => f.remove(), 520);
  }

  // 오답(3차 · 검수 「구석에 작은 X와 −1초만 뜬다」): 누른 그 자리에 큰 X + 붉은 파동 두 겹 + 붉은 번짐 + 「틀렸어 / −1초 · −20」 ·
  //   판 전체가 세게 흔들리고(틀릴수록 더) 시계 옆에서 −초가 튄다. 구석을 눌러도 표시가 판 안에 다 들어오게 안쪽으로 당긴다.
  function penalty(x, y, cx, cy, trap) {
    const pen = PEN[Math.min(G.wrong, PEN.length - 1)];
    G.wrong++; G.score = Math.max(0, G.score - pen.pt); G.combo = 0; G.left -= pen.ms; G.lockUntil = performance.now() + MISS_LOCK_MS;
    SND.wrong(); DC.buzz(45);
    const st = G.ui.stage, r = st.getBoundingClientRect(), W = r.width, H = r.height;
    const lx = cx - r.left, ly = cy - r.top;
    const mx = Math.min(W - 30, Math.max(30, lx)), my = Math.min(H - 30, Math.max(30, ly)); // X·파동 자리(판 안쪽으로)
    const xm = el('span', { class: 'f-x' }); xm.style.left = mx + 'px'; xm.style.top = my + 'px'; st.append(xm); setTimeout(() => xm.remove(), 900);
    const tx = Math.min(W - 78, Math.max(78, mx)), up = my > 96, ty = up ? my - 62 : my + 62; // 글자는 위(자리가 없으면 아래)
    const pop = el('span', { class: 'f-misspop' + (up ? '' : ' below') }, el('b', {}, trap ? '진짜 있어?' : '틀렸어'), el('small', {}, `−${pen.ms / 1000}초 · −${pen.pt}`));
    pop.style.left = tx + 'px'; pop.style.top = ty + 'px'; st.append(pop); setTimeout(() => pop.remove(), 1000);
    burst(mx, my, 'bad', 18);
    wave(mx, my, 'bad', 2);
    edgeFlash('bad');
    if (!RM) { const k = 1 + Math.min(2, G.wrong - 1) * 0.35, s = (v) => (v * k).toFixed(1);
      st.animate([{ transform: 'none' }, { transform: `translate(${s(-9)}px,${s(2)}px) rotate(${s(-0.8)}deg)` }, { transform: `translate(${s(8)}px,${s(-3)}px) rotate(${s(0.7)}deg)` },
        { transform: `translate(${s(-6)}px,${s(2)}px)` }, { transform: `translate(${s(4)}px,0)` }, { transform: 'none' }], { duration: 340, easing: 'ease-out' }); }
    clockPop(`−${pen.ms / 1000}초`);
    st.classList.add('locked'); later(() => G?.ui?.stage?.classList.remove('locked'), MISS_LOCK_MS);
    G.ui.bar.classList.remove('hit'); void G.ui.bar.offsetWidth; G.ui.bar.classList.add('hit');
    G.ui.hudScore.textContent = `${G.score}`; G.shown = G.score; G.ui.hudCombo.textContent = '–';
  }

  // ── 입자(찾으면 금빛·흰빛 불꽃, 틀리면 붉은 부스러기) — 캔버스 하나, 입자가 있을 때만 돈다 ──
  const PT = []; let ptRaf = 0, slow = 1;
  function fxSize() {
    const c = G?.ui?.fx; if (!c) return; const d = Math.min(2, devicePixelRatio || 1);
    c.width = Math.round(c.clientWidth * d) || 1; c.height = Math.round(c.clientHeight * d) || 1; c.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', () => { if (G?.ui?.stage?.isConnected) { fitStage(); camClamp(); camApply(false); } fxSize(); });
  function burst(x, y, kind, n) {
    if (RM || !G?.ui?.fx) return;
    const good = kind === 'good', cols = good ? ['#fff6d6', '#ffd25e', '#ffffff', '#ffb648', '#8ff0b0'] : ['#ff6b6b', '#ff9a8a', '#5a1d1d'];
    n = n || (good ? 34 : 12);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (good ? 2.4 : 1.6) + Math.random() * (good ? 5.2 : 2.6);
      PT.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (good ? 1.6 : 0.6), life: 1, dec: 0.016 + Math.random() * 0.02, r: good ? 1.6 + Math.random() * 3 : 1.5 + Math.random() * 2.4, c: cols[i % cols.length], star: good && i % 4 === 0 });
    }
    if (!ptRaf) ptRaf = requestAnimationFrame(ptLoop);
  }
  function ptLoop() {
    const c = G?.ui?.fx; if (!c) { PT.length = 0; ptRaf = 0; return; }
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    for (let i = PT.length - 1; i >= 0; i--) {
      const p = PT[i]; p.x += p.vx * slow; p.y += p.vy * slow; p.vy += 0.16 * slow; p.vx *= 0.985; p.life -= p.dec * slow;
      if (p.life <= 0) { PT.splice(i, 1); continue; }
      x.globalAlpha = Math.min(1, p.life * 1.4); x.fillStyle = p.c;
      if (p.star) { const r = p.r * 2.2 * p.life; x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.3 : r; x.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); } x.closePath(); x.fill(); }
      else { x.beginPath(); x.arc(p.x, p.y, p.r * (0.4 + p.life * 0.6), 0, Math.PI * 2); x.fill(); }
    }
    x.globalAlpha = 1;
    ptRaf = PT.length ? requestAnimationFrame(ptLoop) : 0;
  }

  // 점수: 누른 자리에서 「+점수」가 튀어 오른 뒤 점수판 쪽으로 날아가며 작아지고, 점수 숫자에 닿기 전에 사라진다(2차 — 1차는 숫자 위에 겹쳐 앉았다).
  //   사라지는 순간 점수판 숫자가 금빛으로 튀며 올라간다.
  function flyScore(cx, cy, gain) {
    const tgt = G.ui.hudScore.getBoundingClientRect();
    const n = el('span', { class: 'f-fly' }, `+${gain}`); document.body.append(n);
    n.style.left = cx + 'px'; n.style.top = cy + 'px';
    const ex = tgt.left + Math.min(tgt.width, 60) / 2 - cx, ey = tgt.bottom + 22 - cy; // 끝점 = 점수 숫자 바로 아래
    // 4차: 처음 0.4초는 누른 자리에서 크게 튄다(0.5 → 1.7 → 1.35배, 40px 솟음) — 그 뒤 점수판으로 날아간다
    const dur = RM ? 10 : 760;
    n.classList.add('pop');
    const a = n.animate([
      { transform: 'translate(-50%,-50%) scale(.5)', opacity: 0 },
      { transform: 'translate(-50%,-110%) scale(1.7)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%,-140%) scale(1.35)', opacity: 1, offset: 0.53 },
      { transform: `translate(calc(-50% + ${ex * 0.8}px), calc(-50% + ${ey * 0.8}px)) scale(.75)`, opacity: 0.85, offset: 0.82 },
      { transform: `translate(calc(-50% + ${ex}px), calc(-50% + ${ey}px)) scale(.4)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
    a.onfinish = () => n.remove();
    setTimeout(countUp, RM ? 0 : dur * 0.86);
  }
  function countUp() {
    if (!G) return;
    const b = G.ui.hudScore, from = G.shown, to = G.score, t0 = performance.now(), dur = 420; let lastTick = 0;
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      b.textContent = String(v); if (now - lastTick > 55 && k < 1) { lastTick = now; SND.count(); }
      if (k < 1) requestAnimationFrame(step); else G.shown = to;
    };
    requestAnimationFrame(step);
  }

  function finish(kind, x, y, cx, cy) {
    if (!G || G.phase !== 'play') return;
    G.phase = 'reveal'; stopTimer();
    if (G.coach) { G.coach.remove(); G.coach = null; }
    G.ui.stage.classList.remove('low', 'press'); G.ui.stage.classList.add('done');
    G.ui.under.querySelectorAll('button').forEach(b => b.setAttribute('disabled', ''));
    const q = G.ui.q, used = G.limit - Math.max(0, G.left), lastScene = G.i >= G.qs.length - 1, hitIdx = kind === 'hit' ? (G.hitIdx ?? -1) : -1;
    const success = kind === 'hit' || kind === 'none-ok'; let gain = 0, mark;
    if (success) {
      const clean = G.wrong === 0 && !G.hinted;
      const bonus = Math.round(Math.max(0, G.left) / G.limit * 100 * BONUS_MUL[Math.min(G.hintLv, BONUS_MUL.length - 1)]);
      G.combo = clean ? G.combo + 1 : 0;
      const cb = clean ? Math.min(100, (G.combo - 1) * 20) : 0;
      gain = 100 + bonus + cb; G.score += gain; mark = clean ? 'g' : 'y';
      G.maxCombo = Math.max(G.maxCombo, G.combo);
      SND.found(G.combo); DC.buzz([12, 30, 18]);
    } else {
      mark = 'r'; G.combo = 0;
      if (kind === 'none-bad') { G.score = Math.max(0, G.score - PENALTY_PT); gain = -PENALTY_PT; }
      kind === 'timeout' ? SND.timeout() : SND.wrong(); DC.buzz(70);
      if (!RM) DC.shake(G.ui.stage, 2);
      edgeFlash('bad');
    }
    G.marks.push(mark); G.used.push(kind === 'timeout' ? G.limit : used);
    G.ui.hudCombo.textContent = G.combo > 0 ? `x${G.combo}` : '–';
    G.ui.marks.querySelectorAll('.f-glow, .f-hintring, .f-hintdim').forEach(n => n.remove());
    // 정답 자리 동그라미(다각형이면 윤곽을 그려 나감) + 주변 어둡게(정답 자리가 하나일 때) + 카메라가 다가감(원본 해상도 상한 안에서)
    const bxs = q.shapes.map(box);
    // 4차: 카메라·주변 어둡게의 초점 = 플레이어가 찾은 그 한 점(정답 자리가 여럿이면 누른 것) · 못 찾았으면 정답이 하나일 때 그것
    const focus = hitIdx >= 0 ? bxs[hitIdx] : bxs.length === 1 ? bxs[0] : null;
    q.shapes.forEach((sh, k) => {
      if (sh.t === 'p') {
        const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), path = document.createElementNS(NS, 'path');
        svg.setAttribute('class', 'f-trace ' + (success ? 'ok' : 'miss')); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
        path.setAttribute('d', 'M' + sh.pts.map(p => (p[0] * 100).toFixed(2) + ' ' + (p[1] * 100).toFixed(2)).join('L') + 'Z'); path.setAttribute('pathLength', '1');
        path.style.animationDelay = (k * 120) + 'ms'; svg.append(path); G.ui.marks.append(svg);
      } else {
        if (focus && focus === bxs[k]) { // 주변 어둡게 — 덮개 한 장의 그라데이션(큰 그림자는 큰 화면에서 프레임을 멈췄다)
          const b = bxs[k], AR = q.AR || AR0, rx = Math.max(b.rx * 1.12, 0.045) * 100, ry = Math.max(b.ry * 1.12, 0.045) * 100 / AR, d = el('span', { class: 'f-spotdim' });
          d.style.background = `radial-gradient(ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${(b.x * 100).toFixed(2)}% ${(b.y / AR * 100).toFixed(2)}%, transparent 97%, rgba(0, 0, 0, .46) 100%)`;
          G.ui.marks.append(d);
        }
        // 4차: 찾은 자리 고리는 금빛 두 겹(안쪽 금 · 바깥 흰 파동)으로 튀어 들어온다 — 검수 「초록 외곽선 한 겹뿐」
        const ring = el('span', { class: 'f-ring ' + (success ? 'ok' : 'miss') + (focus === bxs[k] && success ? ' found' : '') }); ring.style.animationDelay = (focus === bxs[k] ? 0 : 120 + k * 70) + 'ms'; place(ring, bxs[k]); G.ui.marks.append(ring);
      }
    });
    // 카메라(4차): 0.4초 안에 초점으로 살짝 다가간다(원본 해상도 상한 안 · 폰 세로 화면은 아래 해설 덮개를 피해 초점을 판 위쪽 38%에) ·
    //   초점이 없으면(정답 여럿·못 찾음) 확대 1배로 정답들 가운데를 보여 준다
    const { W, H, S } = camSize(), vy = G.ui.stage.closest('.f-play')?.classList.contains('tall') ? 0.38 : 0.5;
    if (bxs.length && !RM) {
      if (focus) { const z = Math.min(1.9, zmax(), Math.max(1.2, 0.42 / Math.max(focus.rx * 2, focus.ry * 2))); cam.z = z; cam.tx = W / 2 - focus.x * S * z; cam.ty = H * vy - focus.y * S * z; }
      else { const xs = bxs.map(b => b.x), ys = bxs.map(b => b.y); cam.z = 1; cam.tx = W / 2 - (Math.min(...xs) + Math.max(...xs)) / 2 * S; cam.ty = H * vy - (Math.min(...ys) + Math.max(...ys)) / 2 * S; }
      camClamp();
      G.ui.cam.style.setProperty('--ease', lastScene && success ? '1.1s' : '.4s');
      camApply(true);
    } else { camHome(); camApply(true); }
    if (success) {
      const r = G.ui.stage.getBoundingClientRect();
      const px = cx != null ? cx : r.left + r.width / 2, py = cy != null ? cy : r.top + r.height / 2;
      if (!RM) { G.ui.stage.classList.add('hitstop'); setTimeout(() => G?.ui?.stage?.classList.remove('hitstop'), 90); }
      slow = lastScene ? 0.4 : 1; if (lastScene) later(() => { slow = 1; }, 700);
      const cmb = Math.min(G.combo, 5);
      burst(px - r.left, py - r.top, 'good', 34 + cmb * 10);
      wave(px - r.left, py - r.top, 'good', G.combo >= 3 ? 3 : 2);
      edgeFlash(G.combo >= 3 ? 'good hot' : 'good');
      if (!RM) G.ui.stage.animate([{ transform: 'scale(1)' }, { transform: `scale(${1.018 + cmb * 0.004})` }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,1.4,.4,1)' });
      if (G.combo >= 2) {
        const cbn = el('span', { class: 'f-combopop' + (G.combo >= 3 ? ' hot' : '') }, el('small', {}, '연속'), `x${G.combo}`, el('em', {}, `보너스 +${Math.min(100, (G.combo - 1) * 20)}`));
        G.ui.stage.append(cbn); setTimeout(() => cbn.remove(), 1250);
        G.ui.hudCombo.classList.remove('bump'); void G.ui.hudCombo.offsetWidth; G.ui.hudCombo.classList.add('bump');
      }
      flyScore(px, py, gain);
    } else {
      G.ui.hudScore.textContent = `${G.score}`; G.shown = G.score;
      if (kind === 'timeout') floatAt(G.ui.stage, 0.5, 0.45, '시간 끝', 'bad big');
    }
    const head = kind === 'none-ok' ? (mark === 'g' ? '맞아, 빈틈 없어!' : '맞아, 빈틈 없었어') : success ? (mark === 'g' ? (G.combo >= 3 ? '정확해, 연속이야' : '찾았어!') : '찾았어, 헤맸지만') : (kind === 'timeout' ? '시간 끝! 이번 장면 0점' : kind === 'none-bad' ? '빈틈이 있었어' : '놓쳤어');
    const nextB = el('button', { class: 'gx-btn main f-next', type: 'button', onclick: () => next() }, lastScene ? '결과 보기' : '다음 장면', el('i'));
    nextB.style.setProperty('--auto', AUTO_NEXT_MS + 'ms');
    G.ui.under.replaceChildren(el('div', { class: 'f-explain' + (success ? ' good' : ' bad') },
      el('h3', { class: success ? 'ok' : 'no' }, head, gain ? el('span', { class: 'f-gain' }, gain > 0 ? `+${gain}` : `${gain}`) : null),
      el('p', {}, q.ok),
      el('div', {}, nextB)));
    const nq = G.qs[G.i + 1]; if (nq) later(() => { const i = new Image(); i.src = IMG(nq.id); i.decode?.().catch(() => {}); (G.pre = G.pre || []).push(i); }, 1200);
    // 마지막 장면이면 끝 화면 카드에 들어갈 그림(낙원 쪽 a)을 미리 풀어 둔다 — 끝 화면이 열리는 순간 프레임이 덜 끊긴다
    else later(() => G?.qs.forEach(z => { const i = new Image(); i.src = IMG(z.sid + '_0'); i.decode?.().catch(() => {}); (G.pre = G.pre || []).push(i); }), 1200);
    later(() => next(), AUTO_NEXT_MS);
  }
  function next() {
    if (!G || G.phase !== 'reveal') return;
    clearTimers(); SND.press(); G.i++;
    if (G.i >= G.qs.length) return end();
    scene();
  }

  // ── 끝 ──
  function end() {
    const g = gradeOf(G.score, G.qs.length);
    const res = { mode: G.mode, date: todayStr(), score: G.score, grade: g.id, marks: G.marks.slice(), sec: mmss(G.used.reduce((a, b) => a + b, 0)), pids: G.qs.map(q => q.id), maxCombo: G.maxCombo };
    const miss = G.marks.findIndex(m => m === 'r');
    window.dwkT?.gameEnd('find', { score: G.score, why: 'done', at: miss < 0 ? 0 : miss + 1 });
    const fresh = DC.endings.add('find', g.id, g.name);
    const best = DC.store.get('find_best', 0); const isBest = res.score > best;
    if (isBest) DC.store.set('find_best', res.score);
    window.DP?.event('play', { game: 'find', score: res.score }); // 레벨·코인·미션(dwk-prog.js)
    if (G.mode === 'daily') DC.store.set('find_daily', res);
    G.phase = 'done'; DC.buzz([20, 40, 20, 40, 40]);
    resultScreen(res, false, fresh, isBest, true);
  }

  // 결과 칸 그림: 5차 id(kitchen_2) → 새 그림, 옛 기록(1-2b) → 옛 장면 · clean = 깨끗한 판(공유 카드엔 반전이 안 보이게)
  const thumbSrc = (p, clean) => { const m = /^([a-z]+)_(\w)$/.exec(p); if (m) return IMG(clean ? m[1] + '_0' : p); const o = /^(\d+-\d+)([ab])$/.exec(p); return o ? DC.scene(o[1], clean ? 'a' : o[2]) : null; };
  const EMO = { g: '🟩', y: '🟨', r: '🟥' };
  const shareText = (r) => `돈워너노우 빈틈 찾기${r.mode === 'daily' ? ' · 오늘의 빈틈 ' + r.date.slice(5) : ''}\n${r.marks.map(m => EMO[m]).join('')} · ${r.sec}초`;
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); DC.toast('복사했어'); return; } catch { /* 폴백 */ }
    const ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); DC.toast('복사했어'); } catch { DC.toast('복사가 안 됐어'); } ta.remove();
  }

  // ── 끝 화면(3차 · 검수 「거대한 A와 글자 위주, 공유 카드가 첫 화면에 안 보인다」) ──
  //   주인공 = 공유 카드. 카드가 아래에서 날아와 비스듬히 앉고 → 등급 도장이 카드와 옆에 동시에 쾅 → 점수가 올라가고 → 장면 칸이 하나씩 켜지고 → 빛이 카드를 훑는다.
  //   카드는 결과 카드(1080×1350)와 같은 배치를 DOM으로 줄여 그린 것이다 — 끝 화면에서 큰 캔버스를 그리지 않아 프레임이 안 끊긴다(공유를 누를 때만 그림).
  //   폰 첫 화면(390×844) 안에 카드·등급·점수·「한 판 더」·「카드 공유」가 다 들어온다.
  function miniCard(res, g, live) {
    const cg = el('b', { class: 'cg' }, g.id), sc = el('b', { class: 'cs' }, `${live ? 0 : res.score}점 · ${res.sec}초`);
    const cells = el('div', { class: 'cc' }, ...res.pids.map((p, i) => {
      const src = thumbSrc(p, true);
      return el('span', { class: 'c ' + (res.marks[i] || 'r'), style: `--d:${live ? 760 + i * 120 : 0}ms` },
        src ? el('img', { src, alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null, el('i', {}));
    }));
    const card = el('div', { class: 'f-card' + (live ? ' live' : '') + (g.id === 'S' || g.id === 'A' ? ' top' : ''), role: 'img', 'aria-label': `공유할 결과 카드 · ${g.id} 등급 ${res.score}점` },
      el('span', { class: 'c1' }, '돈워너노우'), el('span', { class: 'c2' }, '빈틈 찾기'),
      el('span', { class: 'c3' }, res.mode === 'daily' ? `오늘의 빈틈 · ${res.date}` : '연습 판'),
      cg, el('span', { class: 'cn' }, g.name), cells, sc,
      el('span', { class: 'cq' }, '너라면 어디가 이상한지 찾을 수 있어?'), el('span', { class: 'ch' }, '@' + window.DWK.site.handle));
    return { card, sc };
  }
  function resultScreen(res, replay, fresh, isBest, live) {
    stopTimer(); clearTimers(); state.mode = 'result';
    const g = GRADES.find(x => x.id === res.grade) || GRADES[3];
    const best = DC.store.get('find_best', 0);
    const { card, sc } = miniCard(res, g, live);
    const scoreB = el('b', { class: 'f-endscore' }, `${live ? 0 : res.score}`, el('small', {}, '점'));
    const gradeP = el('p', { class: 'f-grade' + (live ? ' stamp' : ''), 'aria-label': `${g.id} 등급` }, g.id, el('small', {}, g.name));
    const sparks = el('span', { class: 'f-sparks', 'aria-hidden': 'true' }, ...Array.from({ length: 12 }, (_, i) => el('i', { style: `--a:${i * 30}deg;--r:${70 + (i % 3) * 22}px` })));
    const legend = el('p', { class: 'f-legend' }, el('i', { class: 'g' }), '바로 찾음 ', el('i', { class: 'y' }), '헤맴 ', el('i', { class: 'r' }), '놓침');
    const thumbs = el('div', { class: 'f-thumbs', 'aria-label': '장면별 결과' }, ...res.pids.map((p, i) => {
      const src = thumbSrc(p, false);
      return el('span', { class: 'f-thumb ' + (res.marks[i] || 'r'), style: `--d:${live ? 760 + i * 120 : 0}ms` },
        src ? el('img', { src, alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null, el('i', {}));
    }));
    const shareB = el('button', { class: 'gx-btn f-sharebtn', type: 'button', onclick: () => shareCard(res) }, '카드 공유');
    app.classList.remove('gx-wide');
    app.replaceChildren(el('section', { class: 'f-endgrid' },
      el('div', { class: 'gx-end' },
        el('p', { class: 'gx-eyebrow' }, el('span', {}, '끝'), res.mode === 'daily' ? `오늘 문제 · ${res.date.slice(5).replace('-', '/')}` : '빈틈 찾기 연습'),
        el('div', { class: 'f-endhero' + (live ? ' live' : '') },
          el('div', { class: 'f-cardwrap' }, sparks, card),
          el('div', { class: 'f-endside' },
            gradeP,
            el('p', { class: 'f-endline' }, g.line),
            scoreB,
            el('p', { class: 'f-endmeta' }, `걸린 시간 ${res.sec}초`, res.maxCombo > 1 ? ` · 최대 연속 x${res.maxCombo}` : '', ` · 내 최고 ${Math.max(best, res.score)}점`),
            el('div', { class: 'l-flags' },
              isBest ? el('span', { class: 'gx-flag f-newbest' }, '내 최고 기록') : null,
              fresh ? el('span', { class: 'gx-flag' }, '새 등급') : null))),
        thumbs, legend,
        el('div', { class: 'gx-acts f-endacts' },
          replay ? null : el('button', { class: 'gx-btn main', type: 'button', onclick: () => start('free') }, '한 판 더', el('i')),
          shareB,
          el('button', { class: 'gx-txt', type: 'button', onclick: () => copyText(shareText(res)) }, '결과 줄 복사')),
        el('p', { class: 'gx-note' }, '공유 카드엔 반전 해설이 없어. 친구는 직접 찾아야 해.'),
        el('ul', { class: 'gx-rows', 'aria-label': '다른 곳으로' },
          el('li', {}, el('a', { href: 'merge.html' }, '다음 게임 · 행성 합치기', el('small', {}, '같은 행성끼리 합치기'))),
          el('li', {}, el('a', { href: 'arcade.html' }, '게임 전부 보기')),
          el('li', {}, el('button', { type: 'button', onclick: menu }, '이 게임 처음 화면')),
          el('li', {}, el('a', { href: 'start.html' }, '입구로'))),
        DC.followCta())));
    scrollTo(0, 0);
    if (live) {
      // 카드 착지(0.55초) → 도장 쾅(0.45초) → 점수 올라감(0.6~1.4초) → 장면 칸(0.76초~) → 빛 훑기(1.5초) → 공유 단추 한 번 숨쉬기(2.0초)
      setTimeout(() => { SND.stamp(g.id === 'S' || g.id === 'A'); if (!RM) { DC.shake(gradeP, 1.4); card.animate([{ translate: '0 0' }, { translate: '0 4px' }, { translate: '0 0' }], { duration: 180, easing: 'ease-out' }); } }, RM ? 0 : 450);
      const t0 = performance.now() + (RM ? 0 : 600), dur = 800; let lastTick = 0;
      const step = (now) => {
        const k = Math.max(0, Math.min(1, (now - t0) / dur)), v = Math.round(res.score * (1 - Math.pow(1 - k, 3)));
        scoreB.firstChild.textContent = String(v); sc.textContent = `${v}점 · ${res.sec}초`;
        if (k > 0 && k < 1 && now - lastTick > 60) { lastTick = now; SND.count(); }
        if (k < 1) requestAnimationFrame(step);
        else { scoreB.classList.add('done'); if (isBest) setTimeout(() => DC.sfx('unlock'), 120); }
      };
      requestAnimationFrame(step);
      setTimeout(() => shareB.classList.add('nudge'), RM ? 0 : 2000);
    }
  }
  async function shareCard(res) {
    await DC.fonts();
    const c = await drawCard(res, true);
    try { await DC.shareCanvas(c, `dwk-find-${res.date}.png`, shareText(res)); }
    catch { const c2 = await drawCard(res, false); await DC.shareCanvas(c2, `dwk-find-${res.date}.png`, shareText(res)); }
  }

  // ── 결과 카드 1080×1350 (반전 해설 없음 · 낙원 쪽 썸네일만) ──
  const loadImg = (src) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  async function drawCard(res, withImgs) {
    try { await document.fonts.load('800 40px Pretendard'); } catch {}
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); const g = GRADES.find(v => v.id === res.grade) || GRADES[3];
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#000'); bg.addColorStop(1, '#0c0e18'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    const r = DC.rng(DC.seed('card' + res.date + res.score)); x.fillStyle = '#fff';
    for (let i = 0; i < 120; i++) { x.globalAlpha = r() * .6 + .1; x.beginPath(); x.arc(r() * W, r() * H, r() * 2 + .6, 0, 6.28); x.fill(); }
    x.globalAlpha = 1; x.textAlign = 'center';
    x.fillStyle = 'rgba(240,240,250,.72)'; x.font = '800 44px ' + PFF; x.fillText('돈워너노우', W / 2, 120);
    x.fillStyle = '#f4f1ea'; x.font = '800 92px ' + PFF; x.fillText('빈틈 찾기', W / 2, 235);
    x.fillStyle = '#a9a7b8'; x.font = '600 36px ' + PFF; x.fillText(res.mode === 'daily' ? `오늘의 빈틈 · ${res.date}` : '연습 판', W / 2, 300);
    x.fillStyle = '#f0f0fa'; x.font = '800 380px ' + PFF; x.fillText(g.id, W / 2, 640);
    x.fillStyle = '#f4f1ea'; x.font = '800 64px ' + PFF; x.fillText(g.name, W / 2, 740);
    const sz = 170, gap = 30, y0 = 820, n = res.marks.length;
    const col = { g: '#5be08a', y: '#ffd34d', r: '#ff6b6b' };
    const imgs = withImgs ? await Promise.all(res.pids.map(p => { const src = thumbSrc(p, true); return src ? loadImg(src) : null; })) : [];
    const xs = (W - (sz * n + gap * Math.max(0, n - 1))) / 2;
    for (let i = 0; i < n; i++) {
      const px = xs + i * (sz + gap);
      x.save(); x.beginPath(); x.roundRect ? x.roundRect(px, y0, sz, sz, 18) : x.rect(px, y0, sz, sz); x.clip();
      if (imgs[i]) { const im = imgs[i], s0 = Math.min(im.width, im.height); x.drawImage(im, (im.width - s0) / 2, (im.height - s0) / 2, s0, s0, px, y0, sz, sz); } // 5차: 세로 그림은 가운데 정사각으로 else { x.fillStyle = '#1c2040'; x.fillRect(px, y0, sz, sz); }
      x.restore();
      x.fillStyle = col[res.marks[i]]; x.fillRect(px, y0 + sz + 14, sz, 16);
    }
    x.fillStyle = '#f4f1ea'; x.font = '800 72px ' + PFF; x.fillText(`${res.score}점 · ${res.sec}초`, W / 2, 1120);
    x.fillStyle = '#a9a7b8'; x.font = '600 34px ' + PFF; x.fillText('너라면 어디가 이상한지 찾을 수 있어?', W / 2, 1185);
    x.fillStyle = '#f0f0fa'; x.font = '800 44px ' + PFF; x.fillText('@' + window.DWK.site.handle, W / 2, 1280);
    if (withImgs) x.getImageData(0, 0, 1, 1); // 오염된 캔버스면 여기서 던져 폴백(예전 toDataURL 전체 인코딩은 끝 화면에서 프레임을 끊었다)
    return c;
  }

  menu();
})();
