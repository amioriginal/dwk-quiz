/* find.js — 빈틈 찾기 (돈워너노우 팬 사이트 · 서버 없음 · 개인정보 없음)
   문제는 행성 id 기준(QS). DC.planets()의 hasScene 행성만 쓰므로 새 편 장면(img/scene/<id>a|b.jpg)과
   QS 항목을 추가하면 자동으로 문제 풀에 들어간다. 좌표는 그림 좌표 0~1 비율.
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
   장면 소개는 저절로 안 걷힌다 — 화면 아무 데나 누르면 걷히고 그때부터 시간이 간다 */
(() => {
  'use strict';
  // 2차(2026-11-28 검수 「판정이 너무 후하다」): 정답 자리를 그림 속 실제 빈틈 크기로 좁혔다 — 좌표는 720px 원본을 눈으로 재서 0~1로 옮김.
  //   {t:'p', pts:[[x,y]…]} = 다각형(이빨 줄처럼 비스듬한 것) · f:[x,y,r] = 단계형 힌트가 좁혀 들어갈 목표
  const P = (a) => a.map(([x, y]) => [+(x / 720).toFixed(4), +(y / 720).toFixed(4)]);
  const QS = [
    // 4차 off: 빈틈이 「해바라기 수십 송이가 전부 이쪽을 본다」는 장면 전체라 한 점이 없다 — 한 송이만 정답으로 치면 다른 송이를 누른 사람이 억울하다
    { id: 'q-1-1b', off: '해바라기 전부가 빈틈(한 점 없음)', d: 3, pid: '1-1', v: 'b', hint: '집 안은 따뜻해. 근데 창밖이 이상해.', f: [0.62, 0.27, 0.11],
      shapes: [{ t: 'p', pts: P([[210, 0], [630, 0], [630, 410], [332, 410], [322, 300], [300, 258], [210, 245]]) }], // 창유리(사람 머리는 뺌)
      ok: '창밖 해바라기가 전부 이쪽, 불빛을 보고 있어.' },
    { id: 'q-1-2b', d: 4, pid: '1-2', v: 'b', hint: '김이 안 올라와. 탕 바닥을 잘 봐.', f: [0.5, 0.326, 0.1],
      shapes: [{ t: 'e', x: 0.5, y: 0.326, rx: 0.115, ry: 0.07 }], // 탕 바닥 한가운데 까만 구멍(4차: 구멍 안쪽만 — 반지름 0.135 → 0.115)
      ok: '탕에 물이 없어. 바닥 한가운데 까만 구멍으로 다 빠졌어.' },
    { id: 'q-1-3b', d: 3, pid: '1-3', v: 'b', hint: '쇼윈도 안에 뭔가 서 있어.', f: [0.507, 0.55, 0.07],
      // 4차: 마네킹 몸 전체(넷) → 수염·올림머리가 달린 얼굴 셋만. 마네킹에 얼굴이 있는 것이 빈틈이라 얼굴 하나하나가 「한 점」이다(왼쪽 끝 팔만 보이는 마네킹은 얼굴이 없어 뺌)
      shapes: [{ t: 'e', x: 0.192, y: 0.535, rx: 0.062, ry: 0.078 }, { t: 'e', x: 0.507, y: 0.55, rx: 0.058, ry: 0.07 },
               { t: 'e', x: 0.81, y: 0.52, rx: 0.062, ry: 0.078 }], // 마네킹 얼굴 셋
      ok: '마네킹 얼굴에 콧수염·턱수염·올림머리. 사람을 닮았어. 하나같이 이쪽을 보고 서 있어.' },
    { id: 'q-2-1a', d: 4, pid: '2-1', v: 'a', hint: '하얀 평원, 파란 호수. 호수가 좀… 이상해.', f: [0.522, 0.344, 0.1],
      shapes: [{ t: 'e', x: 0.522, y: 0.344, rx: 0.11, ry: 0.042 }], // 4차: 호수 전체(가로 반지름 0.238) → 한가운데 까만 동공과 그 둘레만(0.11)
      ok: '호수가 아니야. 눈동자야. 우리를 보고 있어.' },
    // 4차 off: 산맥 두 줄 전체가 이빨이라 빈틈이 그림 절반이다 — 한 점으로 좁히면 「억지 정답」
    { id: 'q-2-2a', off: '산맥 두 줄 전체가 빈틈(그림의 절반)', d: 2, pid: '2-2', v: 'a', hint: '산맥이 너무 하얗고, 두 줄로 늘어서 있어.', f: [0.13, 0.42, 0.1],
      shapes: [{ t: 'p', pts: P([[220, 15], [310, 15], [300, 95], [290, 215], [240, 235], [210, 330], [180, 400], [110, 460], [110, 560], [72, 600], [72, 720], [0, 720], [0, 255], [85, 190], [95, 125], [175, 80]]) },
               { t: 'p', pts: P([[430, 25], [530, 25], [555, 110], [625, 185], [700, 270], [720, 330], [720, 720], [605, 720], [600, 600], [555, 540], [540, 460], [500, 375], [488, 320], [470, 250], [455, 190], [440, 110]]) }], // 이빨 두 줄(잇몸·마을은 뺌)
      ok: '산맥처럼 보인 건 이빨이야. 마을은 그 사이 골짜기에 있어.' },
    // 4차 off: 나무 수십 그루가 전부 손이다 — 몇 그루만 정답으로 치면 다른 손을 누른 사람이 억울하다
    { id: 'q-2-3a', off: '나무 전부가 손(한 점 없음)', d: 2, pid: '2-3', v: 'a', hint: '조용한 숲. 나무 모양을 잘 봐.', f: [0.30, 0.19, 0.085],
      shapes: [{ t: 'c', x: 0.30, y: 0.19, r: 0.085 }, { t: 'c', x: 0.76, y: 0.25, r: 0.08 }, { t: 'c', x: 0.94, y: 0.10, r: 0.09 },
               { t: 'c', x: 0.03, y: 0.13, r: 0.08 }, { t: 'c', x: 0.13, y: 0.27, r: 0.06 }, { t: 'c', x: 0.235, y: 0.27, r: 0.05 }, { t: 'c', x: 0.48, y: 0.09, r: 0.06 }], // 손바닥들
      ok: '나무가 아니야. 전부 손이야. 손바닥이 하늘로 펴져 있어.' },
    // 4차 off: 손자국이 유리 네 칸 전체에 빽빽하다 — 아무 데나 눌러도 맞던 장면(검수 「탭 한 번에 맞는다」), 한 점이 없다
    { id: 'q-2-3b', off: '유리 네 칸 전체가 손자국(한 점 없음)', d: 1, pid: '2-3', v: 'b', hint: '통나무집 창문에 뭔가 묻어 있어.', f: [0.25, 0.6, 0.1],
      shapes: [{ t: 'r', x: 0.115, y: 0.333, w: 0.281, h: 0.299 }, { t: 'r', x: 0.4375, y: 0.368, w: 0.2425, h: 0.278 },
               { t: 'r', x: 0.111, y: 0.68, w: 0.285, h: 0.292 }, { t: 'r', x: 0.4375, y: 0.6875, w: 0.2425, h: 0.285 }], // 유리 네 칸(창틀·통나무는 뺌)
      ok: '유리에 손자국이 빽빽해. 숲의 손들이 창까지 왔어.' },
    // 함정 문제: 정답은 「빈틈 없음」 — 억지로 찾으면 오답 · trap2 = 힌트 둘째 단계 글
    { id: 'q-1-4b', pid: '1-4', v: 'b', trap: true, hint: '반딧불이 가득한 밤. 수상한 데가 있나?', trap2: '정말 이상한 데가 있어? 의심만 하면 지는 판도 있어.',
      shapes: [],
      ok: '빈틈 없음! 반딧불 호수엔 진짜로 함정이 없어. 의심만 한다고 다 맞는 건 아니야.' },
  ];
  window.FIND_QS = QS;
  const DC = window.DC;
  if (!DC) return;
  const { el } = DC;

  const PFF = "'Pretendard Variable', Pretendard, system-ui, sans-serif";
  // 난이도 곡선: 장면이 갈수록 시간이 줄고(10→6.5초), 정답 자리가 작은 문제가 뒤로 간다. 3번째 장면부터 힌트 글은 시간이 40% 지나야 나온다.
  // 2차: 정답 자리가 좁아진 만큼 시간을 1초씩 돌려주고(11→7.5초), 오답 벌점은 「헛손질이 쌓일수록」 커진다(1.0→1.5→2.0초 · 20→30→40점).
  //   틀린 직후 0.4초는 누름을 받지 않는다 — 화면을 마구 두드려 맞히는 길을 막는다.
  const LIMITS = [11000, 10000, 9000, 8000, 7500];
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
    { id: 'S', min: 850, name: '빈틈 사냥꾼', line: '어디가 이상한지 한눈에 봤어.' },
    { id: 'A', min: 600, name: '눈치 빠른 생존자', line: '이 정도면 1년은 버텨.' },
    { id: 'B', min: 350, name: '아슬아슬 생존자', line: '반은 놓쳤지만 살아는 있어.' },
    { id: 'C', min: -1e9, name: '행성 신입', line: '아직 행성이 널 안 믿어.' },
  ];
  // 4차: 문제가 줄어 한 판 장면 수가 5보다 적을 수 있다 → 등급 기준을 장면 수에 비례(기준은 5장면 값)
  const gradeOf = (s, n = ROUND) => GRADES.find(g => s >= g.min * Math.max(1, n) / 5);
  // 확대 상한 = 원본 해상도(2차): 장면 원본이 720px뿐이라, 그림 1px이 화면 1px(CSS)보다 커지기 전까지만 키운다.
  //   폰(판 390px)에서는 약 1.75배, 판이 큰 컴퓨터에서는 1.25배. 숨결(5%)까지 셈에 넣는다.
  const ZCAP = 2.2;
  const zmaxFor = (natural, W) => Math.max(1.25, Math.min(ZCAP, (natural || 720) / (Math.max(1, W) * 1.05)));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 낟알(2차): 원본 720px 그림을 키우면 매끈한 면에 계단(밴딩)이 보인다. 아주 옅은 잡음 한 장을 판 위에 고정으로 깔아 계단을 흩뜨린다(확대해도 낟알 크기는 그대로).
  try {
    const n = document.createElement('canvas'); n.width = n.height = 96; const g = n.getContext('2d'), im = g.createImageData(96, 96);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); document.documentElement.style.setProperty('--f-grain', `url(${n.toDataURL('image/png')})`);
  } catch { /* 낟알 없이 */ }

  // ── 장면 그림 고화질 다시 그리기(3차) ──
  //   저장소에 장면 원본은 720px jpg뿐이다(2·3차 검색). 브라우저가 그때그때 늘리면(쌍선형) 반딧불이 네모 점으로, 어두운 온천은 뭉개져 보였다.
  //   그래서 장면마다 한 번만: ①720px 원본에서 밝기 곡선(감마)을 고치고 ②밝은 점만 골라 흐린 빛 번짐을 얹어(네모 점 → 둥근 빛) ③고품질 보간으로 판 크기×화면 배율에 맞춰 캔버스에 그린다.
  //   표시 크기: 판(CSS px)은 원본 720px 이하(폰 390 · 컴퓨터 ≤560), 확대 상한도 원본 해상도 기준(zmaxFor) 그대로.
  //   다음 장면 그림은 앞 장면 해설 시간(정답 공개 1.6초 뒤)에 미리 그려 둔다 — 소개 중에 그리면 프레임이 끊긴다.
  const TONE = {
    '1-2b': { gamma: 0.66 },   // 어두운 탕 바닥 — 어두운 쪽만 들어 올려 구멍 윤곽이 보이게(밝은 바위는 그대로 — 1.06배 키웠더니 하얗게 날아갔다)
    '1-4b': { gamma: 0.9, gain: 1.02, bloom: 0.55, th: 0.62, blur: 2.2 }, // 반딧불 — 밝은 점에 둥근 빛 번짐
  };
  const PIC = new Map();
  function picSide(W) { return Math.min(1600, Math.ceil(Math.max(720, W * Math.min(3, devicePixelRatio || 1) * 1.15) / 128) * 128); } // 4차: 128px 단위(판 크기 예상이 몇 px 틀려도 같은 그림을 다시 쓰게)
  // 늘리기는 createImageBitmap(고품질 보간)으로 — 브라우저가 메인 스레드 밖에서 한다(캔버스 drawImage 고품질 보간은 폰 화면 전환 때 프레임을 70~80ms 끊었다 · 실측).
  //   밝기 곡선·빛 번짐은 720px 원본 크기에서 한 번만 계산한다(필요한 두 장면만 · 앞 장면 해설 시간에).
  function tonePass(im, t) {
    const n = im.naturalWidth, a = document.createElement('canvas'); a.width = a.height = n;
    const ax = a.getContext('2d', { willReadFrequently: true }); ax.drawImage(im, 0, 0);
    const d = ax.getImageData(0, 0, n, n), p = d.data, lut = new Uint8ClampedArray(256), g = t.gamma || 1, k = t.gain || 1, th = (t.th || 0.7) * 255;
    for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.min(1, Math.pow(i / 255, g) * k));
    const h = t.bloom ? new ImageData(n, n) : null, hp = h && h.data;
    for (let i = 0; i < p.length; i += 4) {
      p[i] = lut[p[i]]; p[i + 1] = lut[p[i + 1]]; p[i + 2] = lut[p[i + 2]];
      if (hp) { hp[i + 3] = 255; const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; if (L > th) { const f = Math.min(1, (L - th) / (255 - th) * 1.6); hp[i] = p[i] * f; hp[i + 1] = p[i + 1] * f; hp[i + 2] = p[i + 2] * f; } }
    }
    ax.putImageData(d, 0, 0);
    if (h) { // 빛 번짐: 밝은 점만 흐리게 키워 더한다(가운데 네모 → 둥근 빛)
      const hi = document.createElement('canvas'); hi.width = hi.height = n; hi.getContext('2d').putImageData(h, 0, 0);
      ax.globalCompositeOperation = 'lighter';
      ax.globalAlpha = t.bloom; ax.filter = `blur(${t.blur || 3}px)`; ax.drawImage(hi, 0, 0);
      ax.globalAlpha = t.bloom * 0.6; ax.filter = `blur(${((t.blur || 3) * 0.4).toFixed(2)}px)`; ax.drawImage(hi, 0, 0);
      ax.filter = 'none'; ax.globalAlpha = 1; ax.globalCompositeOperation = 'source-over';
    }
    return a;
  }
  function prepPic(key, src, W) {
    const side = picSide(W), id = key + '@' + side;
    if (PIC.has(id)) return PIC.get(id);
    const pr = (async () => {
      try {
        const im = new Image(); im.src = src; await im.decode();
        const t = TONE[key], base = t ? tonePass(im, t) : im;
        const c = document.createElement('canvas'); c.width = c.height = side; c.className = 'f-pic';
        try {
          const bmp = await createImageBitmap(base, { resizeWidth: side, resizeHeight: side, resizeQuality: 'high' });
          const br = c.getContext('bitmaprenderer'); if (!br) throw 0; br.transferFromImageBitmap(bmp);
        } catch {
          const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high'; cx.drawImage(base, 0, 0, side, side);
        }
        return c;
      } catch { return null; } // 그리기 실패 = 원본 <img> 그대로 씀
    })();
    PIC.set(id, pr); return pr;
  }
  window.FIND_PIC = (key) => [...PIC.keys()].filter(k => k.startsWith(key + '@'));

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
  const polyArea = (pts) => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const area = (q) => q.trap ? 0.25 : q.shapes.reduce((a, s) => a + (s.t === 'r' ? s.w * s.h : s.t === 'c' ? Math.PI * s.r * s.r : s.t === 'p' ? polyArea(s.pts) : Math.PI * s.rx * s.ry), 0);
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
  function pool() {
    const ok = new Set(DC.planets().filter(p => p.hasScene).map(p => p.id));
    return QS.filter(q => ok.has(q.pid) && !q.off); // 4차: off = 한 점으로 좁힐 수 없어 이번 판에서 뺀 문제
  }
  function pick(rnd) {
    const a = pool().slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const out = [], seen = new Set(); let traps = 0;
    for (const q of a) { if (q.trap && traps >= 1) continue; if (seen.has(q.pid)) continue; if (q.trap) traps++; seen.add(q.pid); out.push(q); if (out.length >= ROUND) break; }
    const real = out.filter(q => !q.trap).sort((x, y) => (x.d || 3) - (y.d || 3) || area(y) - area(x)), trap = out.find(q => q.trap);
    if (trap) real.splice(Math.min(3, Math.max(1, real.length - 1)), 0, trap); // 4차: 문제가 줄어 함정이 끝에 오지 않게(마지막은 진짜 찾기)
    return real;
  }

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
    const nScenes = pick(() => 0.5).length; // 4차: 한 점으로 좁힐 수 없는 문제를 빼서 장면 수가 5보다 적을 수 있다
    const demo = el('div', { class: 'f-demo', 'aria-hidden': 'true' },
      el('img', { src: 'img/scene/1-3a.jpg', alt: '', decoding: 'async' }), // 3차: 예전엔 2-1a(호수=눈)라 문제 하나의 답을 메뉴에서 보여 줬다 → 문제에 안 나오는 장면
      el('span', { class: 'f-demo-ring' }), el('span', { class: 'f-demo-pts' }, '+180'),
      el('span', { class: 'f-demo-dots' }, ...Array.from({ length: 8 }, (_, i) => el('i', { style: `--a:${i * 45}deg` }))),
      el('span', { class: 'f-demo-hand' }, DI.ic('tap')),
      el('span', { class: 'f-demo-cap' }, '이상한 곳? 콕'));
    app.replaceChildren(el('section', { class: 'gx-hero f-hero' },
      el('img', { class: 'gx-bg', src: 'img/scene/2-3b.jpg', alt: '', decoding: 'async' }),
      el('div', { class: 'gx-cap' },
        demo,
        el('p', { class: 'gx-eyebrow' }, el('span', {}, '04'), '1분 게임'),
        el('h1', { class: 'gx-h1' }, '빈틈 찾기'),
        el('p', { class: 'gx-sub' }, '행성 장면에서 이상한 곳을 콕 눌러. ', el('b', {}, `장면 ${nScenes}개, 갈수록 시간이 짧아져.`), ' 아무 이상 없으면 「빈틈 없음」.'),
        el('div', { class: 'gx-acts' },
          doneToday
            ? el('button', { class: 'gx-btn main', type: 'button', onclick: () => resultScreen(daily, true) }, '오늘 문제 결과', el('i'))
            : el('button', { class: 'gx-btn main', type: 'button', onclick: () => start('daily') }, '오늘 문제', el('i')),
          el('button', { class: 'gx-btn', type: 'button', onclick: () => start('free') }, '연습하기')),
        el('p', { class: 'gx-note' }, `오늘 문제는 모두 같은 장면 ${nScenes}개. 막히면 힌트(시간이 깎여). ${isTall() ? '그림을 옆으로 끌면 가려진 쪽이 보여.' : '두 손가락으로 벌리면 크게 볼 수 있어.'}`),
        el('dl', { class: 'gx-rows' },
          el('div', {}, el('dt', {}, '내 최고'), el('dd', {}, best ? `${best}점` : '아직 없음')),
          el('div', {}, el('dt', {}, '받아 본 등급 · S A B C'), el('dd', {}, `${got.length} / 4`)),
          el('div', {}, el('dt', {}, '오늘 문제'), el('dd', {}, doneToday ? `${daily.grade} · ${daily.score}점` : '아직 안 함'))),
        DC.followCta())));
    scrollTo(0, 0);
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
    const q0 = qs[0]; let went = false; const go = () => { if (went || G?.qs !== qs) return; went = true; scene(); };
    prepPic(q0.pid + q0.v, DC.scene(q0.pid, q0.v), stageW()).then(go); setTimeout(go, 450); // 늦어도 0.45초 안에는 시작(그림은 준비되는 대로 바뀜)
  }
  // 판 너비 예상(장면을 그리기 전에 그림 크기를 정할 때) — find.css .f-stage 규칙과 같은 계산
  // 4차: 그림이 화면에 그려지는 한 변(S). 폰 세로 화면은 판 높이만큼(원본 720px 이하) — 판이 아직 없으면 같은 계산으로 어림한다
  const isTall = () => innerWidth < 600 && innerHeight > innerWidth * 1.3;
  const stageW = () => G?.ui?.S || (isTall() ? Math.min(720, Math.max(innerWidth, innerHeight - 304)) : innerWidth < 600 ? innerWidth : Math.min(560, innerWidth - 40, innerHeight * 0.62));

  let timer = null;
  function stopTimer() { if (timer) { cancelAnimationFrame(timer.raf); timer = null; } }

  // 카메라(확대·이동) — .f-cam 은 원점 0,0 기준 translate+scale, .f-drift 는 장면이 천천히 다가오는 숨결
  const cam = { z: 1, tx: 0, ty: 0 };
  // 4차: 그림(.f-cam) 한 변 S는 판 너비·높이 중 큰 쪽 — 폰 세로 화면에선 판보다 넓어서 옆으로 끌어 둘러본다(확대 1배에서도)
  const zmax = () => G?.ui ? zmaxFor(G.ui.img.naturalWidth, G.ui.S || G.ui.stage.clientWidth) : 1.25;
  const camSize = () => { const st = G.ui.stage; return { W: st.clientWidth, H: st.clientHeight, S: G.ui.S || st.clientWidth }; };
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
    const { W, H, S } = camSize();
    cam.z = Math.min(zmax(), Math.max(1, cam.z));
    const cw = S * cam.z;
    cam.tx = cw >= W ? Math.min(0, Math.max(W - cw, cam.tx)) : (W - cw) / 2; cam.ty = cw >= H ? Math.min(0, Math.max(H - cw, cam.ty)) : (H - cw) / 2;
  }
  // 처음 자리 = 확대 1배 · 가운데
  function camHome() { const { W, H, S } = camSize(); cam.z = 1; cam.tx = (W - S) / 2; cam.ty = (H - S) / 2; }
  // 판 크기 맞추기(4차 · 검수 「폰에서 그림이 정사각 한 판뿐이라 아래 약 170px이 빈다」): 폰 세로 화면이면 판을 아래 단추 줄 바로 위까지 키운다.
  //   그림은 정사각형이라 판 높이에 맞춘 한 변 S가 판 너비보다 크다 → 옆은 끌어서 본다. S는 원본(720px)을 넘지 않는다.
  function fitStage() {
    const u = G?.ui; if (!u) return;
    const st = u.stage, play = st.closest('.f-play'), tall = isTall(), nat = u.img.naturalWidth || 720;
    play.classList.toggle('tall', tall);
    if (tall) {
      const btnH = u.btnH || (u.btnH = u.under.querySelector('.f-btns')?.offsetHeight || 48);
      u.under.style.height = btnH + 'px';
      const pad = parseFloat(getComputedStyle(play).paddingBottom) || 0, gap = parseFloat(getComputedStyle(u.under).marginTop) || 0;
      const h = Math.floor(innerHeight - (st.getBoundingClientRect().top + scrollY) - gap - btnH - pad);
      st.style.height = Math.max(st.clientWidth, Math.min(nat, h)) + 'px';
      // 바깥 틀(game-ui.css)의 아래 여백까지 셈 — 그래도 페이지가 화면보다 길면 그만큼 판을 줄인다(실측: 한 번에 39px 넘쳤다)
      const extra = document.documentElement.scrollHeight - innerHeight;
      if (extra > 0) st.style.height = Math.max(st.clientWidth, st.clientHeight - extra) + 'px';
    } else { st.style.height = ''; u.under.style.height = ''; }
    const W = st.clientWidth, H = st.clientHeight;
    u.S = Math.min(Math.max(W, H), Math.max(W, nat));
    u.cam.style.width = u.cam.style.height = u.S + 'px';
  }
  // 그림 비율 좌표 ↔ 화면 좌표 (확대·숨결이 다 반영된 실제 위치)
  function toPic(cx, cy) { const r = G.ui.drift.getBoundingClientRect(); return [(cx - r.left) / r.width, (cy - r.top) / r.height]; }
  window.FIND_TO_SCREEN = (fx, fy) => { const r = G.ui.drift.getBoundingClientRect(), s = G.ui.stage.getBoundingClientRect();
    return [Math.min(s.right - 4, Math.max(s.left + 4, r.left + fx * r.width)), Math.min(s.bottom - 4, Math.max(s.top + 4, r.top + fy * r.height))]; };
  window.FIND_CUR = () => G?.ui?.q || null;
  window.FIND_PLAYING = () => !!G && G.phase === 'play';
  window.FIND_PT = () => PT.length; // 시험용: 지금 화면의 입자 수

  function scene() {
    clearTimers();
    const q = G.qs[G.i], limit = LIMITS[Math.min(G.i, LIMITS.length - 1)];
    G.phase = 'intro'; G.wrong = 0; G.hinted = false; G.hintLv = 0; G.lockUntil = 0; G.limit = limit; G.left = limit; G.lastSec = 4;
    cam.z = 1; cam.tx = 0; cam.ty = 0;
    const nxt = G.qs[G.i + 1]; if (nxt) new Image().src = DC.scene(nxt.pid, nxt.v);
    const pl = DC.planet(q.pid);
    const bar = el('div', { class: 'f-bar' }, el('i', {}));
    const clock = el('b', { class: 'f-clock' }, (limit / 1000).toFixed(1));
    const hudScore = el('b', { class: 'score' }, `${G.score}`);
    const hudCombo = el('b', { class: 'f-combo' }, G.combo > 1 ? `x${G.combo}` : '–');
    const img = el('img', { src: DC.scene(q.pid, q.v), alt: '', draggable: 'false', decoding: 'async', onerror: () => stage.classList.add('err') });
    const marks = el('div', { class: 'f-marks' });
    const drift = el('div', { class: 'f-drift' }, img, marks);
    // 3차: 다시 그린 고화질 그림이 준비돼 있으면 그것을, 아니면 원본 <img>를 먼저 보이고 준비되는 대로 바꾼다
    const picKey = q.pid + q.v, sceneTok = G.tok = (G.tok || 0) + 1;
    const usePic = (c) => { if (!c || !G || G.tok !== sceneTok || c.parentNode === drift) return; c.className = 'f-pic'; drift.insertBefore(c, marks); drift.classList.add('has-pic'); };
    prepPic(picKey, DC.scene(q.pid, q.v), stageW()).then(usePic);
    drift.style.animationDuration = limit + 'ms'; // 4차: 숨결은 소개가 걷힌 뒤부터(소개 중엔 CSS가 멈춰 둠)
    const camEl = el('div', { class: 'f-cam' }, drift);
    const fx = el('canvas', { class: 'f-fx', 'aria-hidden': 'true' });
    // 「원래 크기」는 판 안에 있어 누르면 판의 누름으로도 잡혔다(2차에서 발견 — 1차 판에서 이 단추를 누르면 그 자리가 답으로 판정됐다). 누름을 판까지 올려 보내지 않는다.
    const zoomBtn = el('button', { class: 'f-zoom', type: 'button', hidden: '', onpointerdown: (e) => e.stopPropagation(), onpointerup: (e) => e.stopPropagation(), onclick: (e) => { e.stopPropagation(); camHome(); camApply(true); } }, '원래 크기');
    const grain = el('span', { class: 'f-grain', 'aria-hidden': 'true' });
    const panbar = el('span', { class: 'f-panbar', hidden: '', 'aria-hidden': 'true' }, el('i'));
    // 장면 소개 — 첫 장면은 하는 법까지 여기에 담는다(3차: 예전엔 하는 법 덮개가 시간이 도는 동안 판 아래를 가렸다)
    const first = G.i === 0 && !G.coached;
    const intro = el('div', { class: 'f-intro' + (first ? ' first' : ''), 'aria-hidden': 'true' },
      pl?.img ? el('img', { class: 'f-intro-planet', src: pl.img, alt: '', decoding: 'async' }) : null,
      el('p', {}, el('small', {}, `장면 ${G.i + 1} / ${G.qs.length}`), el('b', {}, pl ? pl.name : '행성'),
        el('span', {}, `${(limit / 1000).toFixed(limit % 1000 ? 1 : 0)}초`)),
      first ? el('div', { class: 'f-intro-how' }, el('span', { class: 'f-coach-hand' }, DI.ic('tap')), el('b', {}, '이상한 곳을 콕'), el('small', {}, isTall() ? '옆으로 끌면 더 보여 · 막히면 힌트' : '두 손가락으로 벌리면 확대 · 막히면 힌트')) : null,
      el('em', { class: 'f-intro-go' }, '아무 데나 누르면 시작'));
    const stage = el('div', { class: 'f-stage is-intro', role: 'img', 'aria-label': '행성 장면. 이상하다고 생각하는 곳을 누르기' }, camEl, grain, fx, panbar, zoomBtn, intro);
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
      el('p', { class: 'f-q' }, '이 행성, 어디가 이상해?'),
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
        const { W, H, S } = camSize(); // 4차: 그림이 판보다 크면(폰 세로 화면) 확대 1배에서도 끌어서 둘러본다
        if (S * cam.z > W + 1 || S * cam.z > H + 1) { cam.tx = gest.pan.tx + (p.x - p.x0); cam.ty = gest.pan.ty + (p.y - p.y0); camClamp(); camApply(false); }
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
      dim.style.setProperty('--hx', (cx * 100).toFixed(2) + '%'); dim.style.setProperty('--hy', (cy * 100).toFixed(2) + '%');
      dim.style.setProperty('--hr', (Math.max(R, 0.06) * 100).toFixed(2) + '%'); dim.style.setProperty('--hd', String(H.dim));
      // 4차: 그림이 판보다 넓으면(폰 세로 화면) 힌트 고리가 화면 밖일 수 있다 → 고리 쪽으로 화면을 옮긴다(확대 배율은 그대로)
      const cs = camSize();
      if (cs.S * cam.z > cs.W + 1 || cs.S * cam.z > cs.H + 1) { cam.tx = cs.W / 2 - cx * cs.S * cam.z; cam.ty = cs.H / 2 - cy * cs.S * cam.z; camClamp(); G.ui.cam.style.setProperty('--ease', '.45s'); camApply(true); }
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
    const rx = Math.max(b.rx * k, 0.06), ry = Math.max(b.ry * k, 0.06);
    n.style.left = (b.x - rx) * 100 + '%'; n.style.top = (b.y - ry) * 100 + '%'; n.style.width = rx * 200 + '%'; n.style.height = ry * 200 + '%';
  }
  function floatAt(parent, fx, fy, txt, kind, fixedTop) {
    const n = el('span', { class: 'f-float ' + kind }, txt);
    n.style.left = Math.min(txt.length > 6 ? 76 : 86, Math.max(txt.length > 6 ? 24 : 14, fx * 100)) + '%'; n.style.top = (fixedTop ? 8 : Math.max(8, fy * 100)) + '%';
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
    G.ui.hudCombo.textContent = G.combo > 1 ? `x${G.combo}` : '–';
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
          const b = bxs[k], rx = Math.max(b.rx * 1.12, 0.06) * 100, ry = Math.max(b.ry * 1.12, 0.06) * 100, d = el('span', { class: 'f-spotdim' });
          d.style.background = `radial-gradient(ellipse ${rx.toFixed(2)}% ${ry.toFixed(2)}% at ${(b.x * 100).toFixed(2)}% ${(b.y * 100).toFixed(2)}%, transparent 97%, rgba(0, 0, 0, .46) 100%)`;
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
      if (focus) { const z = Math.min(1.45, zmax(), Math.max(1.12, 0.62 / Math.max(focus.rx * 2, focus.ry * 2))); cam.z = z; cam.tx = W / 2 - focus.x * S * z; cam.ty = H * vy - focus.y * S * z; }
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
    const pl = DC.planet(q.pid);
    const head = success ? (mark === 'g' ? (G.combo >= 3 ? '정확해, 연속이야' : '찾았어!') : '찾았어, 헤맸지만') : (kind === 'timeout' ? '시간 끝!' : kind === 'none-bad' ? '빈틈이 있었어' : '놓쳤어');
    const nextB = el('button', { class: 'gx-btn main f-next', type: 'button', onclick: () => next() }, lastScene ? '결과 보기' : '다음 장면', el('i'));
    nextB.style.setProperty('--auto', AUTO_NEXT_MS + 'ms');
    G.ui.under.replaceChildren(el('div', { class: 'f-explain' + (success ? ' good' : ' bad') },
      el('h3', { class: success ? 'ok' : 'no' }, head, gain ? el('span', { class: 'f-gain' }, gain > 0 ? `+${gain}` : `${gain}`) : null),
      el('p', {}, q.ok),
      pl && pl.rule ? el('p', { class: 'rule' }, `${pl.name} 규칙 · 「${pl.rule}」`) : null,
      el('div', {}, nextB)));
    const nq = G.qs[G.i + 1]; if (nq) later(() => prepPic(nq.pid + nq.v, DC.scene(nq.pid, nq.v), stageW()), 1600);
    // 마지막 장면이면 끝 화면 카드에 들어갈 그림(낙원 쪽 a)을 미리 풀어 둔다 — 끝 화면이 열리는 순간 프레임이 덜 끊긴다
    else later(() => G?.qs.forEach(z => { const i = new Image(); i.src = DC.scene(z.pid, 'a'); i.decode?.().catch(() => {}); (G.pre = G.pre || []).push(i); }), 1200);
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
    const res = { mode: G.mode, date: todayStr(), score: G.score, grade: g.id, marks: G.marks.slice(), sec: mmss(G.used.reduce((a, b) => a + b, 0)), pids: G.qs.map(q => q.pid + q.v), maxCombo: G.maxCombo };
    const fresh = DC.endings.add('find', g.id, g.name);
    const best = DC.store.get('find_best', 0); const isBest = res.score > best;
    if (isBest) DC.store.set('find_best', res.score);
    window.DP?.event('play', { game: 'find', score: res.score }); // 레벨·코인·미션(dwk-prog.js)
    if (G.mode === 'daily') DC.store.set('find_daily', res);
    G.phase = 'done'; DC.buzz([20, 40, 20, 40, 40]);
    resultScreen(res, false, fresh, isBest, true);
  }

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
      const m = /^(\d+-\d+)([ab])$/.exec(p);
      return el('span', { class: 'c ' + (res.marks[i] || 'r'), style: `--d:${live ? 760 + i * 120 : 0}ms` },
        m ? el('img', { src: DC.scene(m[1], 'a'), alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null, el('i', {}));
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
    const thumbs = el('div', { class: 'f-thumbs', 'aria-label': '장면별 결과' }, ...res.pids.map((p, i) => {
      const m = /^(\d+-\d+)([ab])$/.exec(p);
      return el('span', { class: 'f-thumb ' + (res.marks[i] || 'r'), style: `--d:${live ? 760 + i * 120 : 0}ms` },
        m ? el('img', { src: DC.scene(m[1], m[2]), alt: '', decoding: 'async', onerror: (e) => e.target.remove() }) : null, el('i', {}));
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
            el('p', { class: 'f-endmeta' }, `${res.sec}초`, res.maxCombo > 1 ? ` · 최대 연속 x${res.maxCombo}` : '', ` · 내 최고 ${Math.max(best, res.score)}점`),
            el('div', { class: 'l-flags' },
              isBest ? el('span', { class: 'gx-flag f-newbest' }, '내 최고 기록') : null,
              fresh ? el('span', { class: 'gx-flag' }, '새 등급') : null))),
        thumbs,
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
    const imgs = withImgs ? await Promise.all(res.pids.map(p => { const m = /^(\d+-\d+)([ab])$/.exec(p); return m ? loadImg(DC.scene(m[1], 'a')) : null; })) : [];
    const xs = (W - (sz * n + gap * Math.max(0, n - 1))) / 2;
    for (let i = 0; i < n; i++) {
      const px = xs + i * (sz + gap);
      x.save(); x.beginPath(); x.roundRect ? x.roundRect(px, y0, sz, sz, 18) : x.rect(px, y0, sz, sz); x.clip();
      if (imgs[i]) x.drawImage(imgs[i], px, y0, sz, sz); else { x.fillStyle = '#1c2040'; x.fillRect(px, y0, sz, sz); }
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
