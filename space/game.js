/* 돈워너노우 「행성에서 1년 버티기」 테스트 v0
   - 12달 동안 매달 두 갈래 중 하나를 고른다. 체력(♥)과 식량(🍞)을 관리한다.
   - 행성마다 숨은 「생존 규칙」이 있다(영상의 빈틈). 규칙을 어기면 그 자리에서 끝난다.
   - 점수 = 버틴 날수(최대 365). 같은 날수면 남은 체력이 많은 쪽이 위.
   - 서버 없음 · 개인정보 없음 · 기록은 이 기기 브라우저에만. 점수에 돈을 걸지 않는다(명예 생존자). */
(() => {
  'use strict';
  const D = window.DWK;
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c);
    return n;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1800); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ── 효과 표기: hp·food 변화, trap(규칙 위반 → 즉시 끝), win(그 선택이 행성의 선물) ──
  // 각 선택: [버튼 글, 결과 글, {hp, food, trap, gift}]
  const PLANETS = {
    '1-1': { // 해바라기 — 규칙: 불 켜 두지 마(해바라기는 빛을 향해, 아주 빨리 자란다)
      intro: '끝없는 해바라기 밭. 언제나 여름이고, 너는 그네 달린 하얀 농가에 살아.',
      clue: '아침마다 해바라기가 전부 네 창문 쪽을 보고 있어. 어제보다 한 뼘 더 가까이.',
      death: '밤새 켜 둔 불빛을 향해 해바라기가 자랐어. 아침, 창문은 노란 꽃잎으로 가득했어.',
      events: [
        ['밤에 책을 조금만 더 읽고 싶어.', [['스탠드 켜 둔 채 잠든다', '', { trap: true }], ['불 끄고 내일 읽는다', '창밖에서 사각사각 소리가 나다 멈췄어.', { hp: 1 }]]],
        ['정전이 됐어. 손전등이 하나 있어.', [['손전등 켜고 밭을 산책한다', '', { trap: true }], ['그냥 일찍 잔다', '깜깜한 밤. 해바라기들이 고개를 숙이고 있어.', { food: 0 }]]],
        ['이웃이 밤 파티에 초대했어. 마당 가득 전구를 달았대.', [['정중히 거절한다', '다음 날 아침, 그 집 마당이 해바라기로 덮여 있었어.', { hp: 1 }], ['잠깐만 들렀다 온다', '돌아오는 길, 꽃들이 너를 따라 고개를 돌렸어. 오싹해.', { hp: -1 }]]],
        ['벌들이 꿀을 잔뜩 만들어 놨어.', [['꿀을 모아 둔다', '꿀 단지가 가득 찼어.', { food: 2 }], ['벌집은 건드리지 않는다', '조용한 하루.', { hp: 1 }]]],
      ],
    },
    '1-2': { // 온천 — 규칙: 물이 빠지면 당장 나와(간헐천)
      intro: '온천이 가득한 눈 덮인 산. 물은 언제나 40도, 노천탕은 문 바로 앞이야.',
      clue: '바닥 돌이 평소보다 뜨겁고, 김이 한 번에 확 올라왔다 사라져.',
      death: '물이 소리 없이 빠져나갔다가, 펄펄 끓어서 다시 올라왔어.',
      events: [
        ['노천탕 물이 소리 없이 빠지고 있어.', [['조금만 더 있는다', '', { trap: true }], ['당장 나온다', '몇 분 뒤, 탕에서 끓는 물기둥이 솟았어.', { hp: 1 }]]],
        ['눈보라가 쳐. 산장보다 물속이 더 따뜻해.', [['물속에서 밤을 보낸다', '', { trap: true }], ['산장 벽난로 앞에서 잔다', '바닥이 뜨끈해. 푹 잤어.', { hp: 1 }]]],
        ['온천 달걀을 삶고 싶어.', [['김 나는 구멍에 직접 넣는다', '손을 데었어.', { hp: -1, food: 1 }], ['냄비에 물을 떠서 삶는다', '반숙 달걀 여섯 개.', { food: 2 }]]],
        ['산장에 장작이 다 떨어져 가.', [['숲에서 장작을 해 온다', '팔이 뻐근하지만 겨울은 버틸 만해.', { hp: -1, food: 1 }], ['온천 열로 버틴다', '바닥이 따뜻해서 괜찮았어.', { food: 0 }]]],
      ],
    },
    '1-3': { // 쇼핑몰 — 규칙: 9시 전에 가게 안으로(복도에 남으면 마네킹)
      intro: '끝없는 쇼핑몰. 분수는 늘 돌아가고, 너는 침대 매장에 살아. 매일 밤 새 침대에서 자.',
      clue: '아침에 쇼윈도 마네킹이 하나 늘었어. 어제 복도에서 본 사람 옷이야.',
      death: '셔터가 내려왔어. 아침, 쇼윈도에 너를 닮은 마네킹이 하나 서 있었어.',
      events: [
        ['8시 58분. 푸드코트 줄이 아직 길어.', [['끝까지 줄을 선다', '', { trap: true }], ['가까운 가게로 들어간다', '9시, 철컥. 셔터가 바닥에 닿았어.', { hp: 1, food: -1 }]]],
        ['밤에 복도에서 누가 네 이름을 불러.', [['셔터를 열고 나가 본다', '', { trap: true }], ['대답하지 않는다', '소리는 아침이 되자 멈췄어.', { hp: 0 }]]],
        ['불이 한 가게씩 꺼지기 시작했어. 침대 매장은 멀어.', [['가까운 옷 가게로 들어간다', '옷 더미 위에서 잤어. 나쁘지 않아.', { hp: 0 }], ['침대까지 전력으로 뛴다', '간신히 들어왔어. 숨이 턱까지 찼어.', { hp: -1 }]]],
        ['문 닫은 마트에 통조림이 잔뜩 있어.', [['낮에 넉넉히 챙긴다', '한 달은 끄떡없어.', { food: 3 }], ['필요한 만큼만 챙긴다', '가방이 가벼워.', { food: 1, hp: 1 }]]],
      ],
    },
    '1-4': { // 반딧불 호수 — 함정 없음. 의심하면 손해, 믿으면 선물
      intro: '소나무 숲에 둘러싸인 따뜻한 호수. 너는 물 위 오두막에 살아. 카누와 낚싯대도 있어.',
      clue: '밤마다 반딧불이 수십억 마리 떠올라. 책을 읽을 만큼 밝고, 절대 물지 않아.',
      death: '',
      events: [
        ['반딧불이 오두막 안까지 따라왔어.', [['문을 닫고 쫓아낸다', '깜깜한 방에서 넘어졌어.', { hp: -1 }], ['같이 잔다', '방 안이 별빛처럼 반짝였어.', { hp: 1 }]]],
        ['카누를 타고 호수 한가운데로 나왔어.', [['낚시를 한다', '송어 세 마리!', { food: 2 }], ['그냥 누워 하늘을 본다', '마음이 편해졌어.', { hp: 1 }]]],
        ['이렇게 좋은 곳에 함정이 없을 리 없어.', [['밤새 보초를 선다', '아무 일도 없었어. 잠만 못 잤어.', { hp: -1 }], ['믿고 잔다', '아무 일도 없었어. 정말로.', { hp: 1 }]]],
        ['반딧불이 길을 비춰 주며 숲 쪽으로 가.', [['따라간다', '숲속에 블루베리 덤불이 있었어.', { food: 2 }], ['오두막에 남는다', '조용한 밤.', { food: 0 }]]],
      ],
      ending: '마지막 날 밤, 반딧불이 호수 위에 작별 인사를 써 줬어.',
    },
    '2-1': { // 호수(눈알) — 규칙: 호수랑 눈 마주치지 마
      intro: '끝없는 하얀 평원 한가운데 동그랗고 파란 호수. 너는 호숫가 하얀 오두막에 살아.',
      clue: '하루에 한 번, 하늘이 위아래로 닫혔다가 열려. 밤이면 호수 가운데가 까맣게 커져.',
      death: '물에 비친 건 네 얼굴이 아니었어. 호수가 너를 똑바로 보고 있었어.',
      events: [
        ['호수가 너무 맑아. 얼굴을 비춰 보고 싶어.', [['물을 들여다본다', '', { trap: true }], ['등을 돌리고 물만 뜬다', '등 뒤에서 뭔가 너를 오래 보고 있는 느낌.', { food: 1 }]]],
        ['밤에 호수 가운데가 까맣게 커졌어.', [['랜턴 들고 가까이 가 본다', '', { trap: true }], ['커튼을 치고 잔다', '커튼 너머로 파란 빛이 두리번거렸어.', { hp: 0 }]]],
        ['아침에 보니 호수가 오두막 쪽으로 옮겨 왔어.', [['짐을 싸서 반대편으로 옮긴다', '하루 종일 걸었어.', { hp: -1, food: -1 }], ['그대로 산다', '창문 바로 밖이 파란 물이야. 눈을 내리깔고 지냈어.', { hp: -1 }]]],
        ['평원에 붉은 실 같은 줄이 땅 위로 솟았어.', [['따라가 본다', '줄은 전부 호수로 이어져 있었어. 돌아왔어.', { hp: -1 }], ['밟지 않게 피해 다닌다', '무사히 하루를 넘겼어.', { hp: 1 }]]],
      ],
    },
    '2-2': { // 하얀 산맥(입) — 규칙: 땅이 숨 쉬면 산맥 밖으로 뛰어
      intro: '하얀 산맥이 끝없이 이어진 행성. 골짜기는 늘 따뜻하고 촉촉해. 땅이 말랑해서 넘어져도 안 아파.',
      clue: '골짜기 마을 하나가 하룻밤 새 없어졌어. 산맥 사이가 어제보다 좁아.',
      death: '땅이 크게 숨을 쉬었어. 하얀 산맥이 천천히, 딱 맞물렸어.',
      events: [
        ['땅이 크게 숨을 쉬었어. 바람이 골짜기로 빨려 들어가.', [['골짜기에 숨어서 기다린다', '', { trap: true }], ['산맥 밖으로 뛴다', '뒤에서 「딱」 소리가 났어. 돌아보지 않았어.', { hp: -1 }]]],
        ['골짜기에서 축제가 열린대. 먹을 게 잔뜩이래.', [['가서 실컷 먹는다', '맛있었지만 땅이 자꾸 꿈틀거렸어.', { food: 2, hp: -1 }], ['산맥 바깥 언덕에 남는다', '멀리서 축제 불빛만 봤어.', { hp: 1 }]]],
        ['말랑한 분홍 언덕에서 낮잠 자기 딱 좋아.', [['한숨 잔다', '포근했어.', { hp: 1 }], ['식량을 찾으러 다닌다', '하얀 돌 사이에서 열매를 찾았어.', { food: 2 }]]],
        ['산맥 꼭대기에 올라가면 행성 전체가 보인대.', [['올라간다', '꼭대기는 미끄럽고 축축했어. 겨우 내려왔어.', { hp: -1, food: 1 }], ['안 올라간다', '평범한 하루.', { food: 0 }]]],
      ],
    },
    '2-3': { // 하얀 숲(손) — 규칙: 숲이 손을 흔들면 절대 흔들어 주지 마
      intro: '하얀 나무가 자라는 조용한 숲. 나무마다 가지가 딱 다섯 개씩 있어. 너는 숲 한가운데 오두막에 살아.',
      clue: '바람이 없는 날에도 가지가 움직여. 오늘 아침, 창문에 하얀 손자국이 가득했어.',
      death: '너도 손을 흔들어 줬어. 숲이 기뻐하며 다가왔어. 아주 가까이.',
      events: [
        ['숲 전체가 너에게 손을 흔들고 있어.', [['반갑게 손을 흔들어 준다', '', { trap: true }], ['못 본 척 고개를 숙인다', '가지들이 천천히 내려갔어.', { hp: 0 }]]],
        ['나무 한 그루가 밤새 오두막 쪽으로 늘어났어.', [['가지를 잘라 낸다', '잘린 가지가 손가락처럼 꿈틀거렸어.', { hp: -1, food: 1 }], ['건드리지 않는다', '가지 끝이 창틀을 톡톡 두드리다 멈췄어.', { hp: 0 }]]],
        ['숲속에 하얀 열매가 주렁주렁 열렸어.', [['딴다', '열매를 따자 나무가 손을 오므렸어. 얼른 도망쳤어.', { food: 2, hp: -1 }], ['그냥 둔다', '배가 고프지만 무사해.', { food: -1 }]]],
        ['누가 문을 다섯 번 두드려.', [['문을 연다', '아무도 없었어. 문고리에 하얀 자국만.', { hp: -1 }], ['열지 않는다', '두드림은 새벽에 멈췄어.', { hp: 1 }]]],
      ],
    },
  };
  // 어느 행성에나 나오는 사건
  const COMMON = [
    ['지구에서 보급 상자가 떨어졌어. 하나만 열 수 있어.', [['식량 상자', '통조림이 한가득.', { food: 3 }], ['약 상자', '상처가 아물었어.', { hp: 1 }]]],
    ['감기에 걸렸어.', [['하루 푹 쉰다', '식량을 조금 더 먹었지만 나았어.', { food: -1, hp: 1 }], ['참고 일한다', '몸이 무거워.', { hp: -1, food: 1 }]]],
    ['별똥별이 쏟아지는 밤이야.', [['소원을 빈다', '마음이 가벼워졌어.', { hp: 1 }], ['떨어진 별 조각을 줍는다', '반짝이는 돌. 먹을 수는 없어.', { food: 0 }]]],
    ['비가 와. 빗물을 모을까?', [['그릇을 전부 내놓는다', '물이 넉넉해졌어.', { food: 1 }], ['안에서 쉰다', '빗소리를 들으며 잤어.', { hp: 1 }]]],
    ['다른 생존자를 만났어. 배가 고파 보여.', [['식량을 나눠 준다', '그 사람이 길을 하나 알려 줬어.', { food: -1, hp: 1 }], ['모른 척한다', '마음이 좀 무거워.', { food: 0 }]]],
    ['고장 난 라디오에서 지구 노래가 나와.', [['끝까지 듣는다', '눈물이 났지만 힘이 났어.', { hp: 1 }], ['고쳐서 신호를 보낸다', '응답은 없었어. 부품만 날렸어.', { food: -1 }]]],
    ['텃밭에 싹이 났어.', [['물을 준다', '작은 수확!', { food: 2 }], ['그냥 둔다', '싹이 말라 버렸어.', { food: 0 }]]],
  ];
  const BONUS_ID = '2-3';        // 결과 카드를 공유하면 열리는 숨은 행성
  const PLAYABLE = ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3'];
  const planetMeta = (id) => {
    for (const e of D.episodes) for (const p of e.planets) if (p.id === id) return { ...p, ep: e.no };
    return null;
  };

  // ── 상태 ──
  const params = new URLSearchParams(location.search);
  const seat = (params.get('seat') || '').replace(/\D/g, '').slice(0, 3);
  let S = null;
  let unlocked = store.get('bonus', false);

  // ── 화면 1: 티켓 + 행성 고르기 ──
  function renderStart() {
    const box = $('#stage'); box.replaceChildren();
    const best = store.get('best', null);
    box.append(...[
      el('div', { class: 'ticket' },
        el('span', {}, '🎫 테스트 티켓'),
        el('strong', {}, seat ? `좌석 ${seat}번` : '테스터'),
        el('small', {}, '2주 비공개 테스트')),
      el('h1', { class: 'title' }, '행성 하나 골라.', el('br'), '여기서 ', el('em', {}, '1년'), ' 버텨.'),
      el('p', { class: 'sub' }, '매달 하나씩 골라. 행성마다 숨은 생존 규칙이 있어. 영상을 본 사람이 유리해.'),
      best ? el('p', { class: 'hint' }, `내 최고 기록: ${best.name} ${best.days}일`) : null,
    ].filter(Boolean));
    const grid = el('div', { class: 'planets' });
    PLAYABLE.forEach((id) => {
      const m = planetMeta(id); if (!m) return;
      const locked = id === BONUS_ID && !unlocked;
      grid.append(el('button', {
        class: 'planet' + (locked ? ' locked' : ''), disabled: locked ? 'disabled' : null,
        onclick: () => start(id),
      }, el('span', { class: 'num' }, `#${m.ep}`),
        el('div', { class: 'orb', style: `background-image:url(${m.img})`, role: 'img', 'aria-label': m.name }),
        el('div', { class: 'name' }, locked ? '🔒 숨은 행성' : m.name),
        locked ? el('small', { class: 'lock-hint' }, '결과 카드를 공유하면 열려') : null));
    });
    box.append(grid);
    scrollTo(0, 0);
  }

  // ── 진행 ──
  function start(id) {
    const P = PLANETS[id], m = planetMeta(id);
    // 12달: 1월 소개, 그 뒤 행성 사건 4개를 3·5·8·11월에, 나머지는 공통 사건
    const commons = shuffle(COMMON);
    const planned = [];
    const planetEvents = shuffle(P.events);
    for (let month = 1; month <= 12; month++) {
      if ([3, 5, 8, 11].includes(month)) planned.push({ kind: 'planet', ev: planetEvents.shift() });
      else if (month === 7) planned.push({ kind: 'clue' });
      else planned.push({ kind: 'common', ev: commons.pop() || pick(COMMON) });
    }
    S = { id, P, m, month: 1, hp: 3, food: 3, plan: planned, log: [] };
    renderMonth(P.intro);
  }

  const daysAt = (month) => (month - 1) * 30 + Math.min(29, 5 + Math.floor(Math.random() * 25));

  function renderMonth(note) {
    const box = $('#stage'); box.replaceChildren();
    const slot = S.plan[S.month - 1];
    box.append(hud());
    if (note) box.append(el('p', { class: 'note' }, note));
    const card = el('div', { class: 'event' });
    if (slot.kind === 'clue') {
      card.append(el('p', { class: 'month' }, `${S.month}월`), el('p', { class: 'q' }, S.P.clue),
        el('div', { class: 'choices' },
          el('button', { class: 'btn primary', onclick: () => apply({ food: 0 }, '조심해야겠어.') }, '기억해 둔다'),
          el('button', { class: 'btn', onclick: () => apply({ food: 1 }, '신경 끄고 식량을 모았어.') }, '신경 쓰지 않는다')));
    } else {
      const [q, opts] = slot.ev;
      card.append(el('p', { class: 'month' }, `${S.month}월`), el('p', { class: 'q' }, q),
        el('div', { class: 'choices' }, shuffle(opts).map(([label, result, fx]) =>
          el('button', { class: 'btn', onclick: () => fx.trap ? die('rule') : apply(fx, result) }, label))));
    }
    box.append(card);
    scrollTo(0, 0);
  }

  function hud() {
    const dots = el('div', { class: 'months' });
    for (let i = 1; i <= 12; i++) dots.append(el('span', { class: i < S.month ? 'done' : i === S.month ? 'now' : '' }));
    return el('div', { class: 'hud' },
      el('div', { class: 'hud-top' },
        el('div', { class: 'mini-orb', style: `background-image:url(${S.m.img})` }),
        el('div', {}, el('strong', {}, S.m.name), el('small', {}, `${(S.month - 1) * 30}일째`)),
        el('div', { class: 'stats' }, el('span', { title: '체력' }, '♥'.repeat(Math.max(0, S.hp)) || '·'), el('span', { title: '식량' }, `🍞${S.food}`))),
      dots);
  }

  function apply(fx, result) {
    S.hp = Math.min(5, S.hp + (fx.hp || 0));
    S.food = S.food + (fx.food || 0);
    // 한 달이 지나면 식량 1 소비, 없으면 체력이 깎인다
    S.food -= 1;
    let extra = '';
    if (S.food < 0) { S.food = 0; S.hp -= 1; extra = ' 먹을 게 떨어져 몸이 약해졌어.'; }
    if (S.hp <= 0) return die('hp');
    S.month += 1;
    if (S.month > 12) return finish();
    renderMonth(result + extra);
  }

  function die(cause) {
    const days = daysAt(S.month);
    endGame({ days, cause, survived: false });
  }
  function finish() { endGame({ days: 365, cause: 'none', survived: true }); }

  function endGame(r) {
    const name = S.m.name;
    const best = store.get('best', null);
    const isBest = !best || r.days > best.days || (r.days === best.days && S.hp > (best.hp || 0));
    if (isBest) store.set('best', { name, days: r.days, hp: S.hp, id: S.id });
    const runs = store.get('runs', 0) + 1; store.set('runs', runs);
    const box = $('#stage'); box.replaceChildren();
    const head = r.survived ? '1년 생존 성공' : `${r.days}일째, 끝`;
    const story = r.survived
      ? (S.P.ending || '1년이 지났어. 돌아가는 우주선이 도착했어.')
      : r.cause === 'rule' ? S.P.death : '체력이 바닥났어. 이 행성은 너무 길었어.';
    box.append(
      el('div', { class: 'end ' + (r.survived ? 'win' : 'lose') },
        el('p', { class: 'eyebrow' }, name),
        el('h2', {}, head),
        el('p', { class: 'story' }, story),
        r.cause === 'rule' && S.P.events ? el('p', { class: 'rule' }, `생존 규칙: ${D.episodes.flatMap(e => e.planets).find(p => p.id === S.id)?.rule || '영상에서 확인'}`) : null,
        isBest ? el('p', { class: 'hint' }, '🏅 내 최고 기록!') : null),
      el('canvas', { id: 'card', width: 1080, height: 1350, class: 'card-preview' }),
      el('div', { class: 'actions' },
        el('button', { class: 'btn primary', onclick: () => share(r) }, '📤 결과 공유'),
        el('button', { class: 'btn', onclick: () => save(r) }, '💾 저장')),
      el('p', { class: 'hint' }, unlocked ? '숨은 행성이 열려 있어.' : '결과 카드를 공유하거나 저장하면 🔒 숨은 행성이 열려.'),
      el('div', { class: 'actions' },
        el('button', { class: 'btn', onclick: renderStart }, '🔁 다른 행성'),
        el('a', { class: 'btn', href: '#feedback', onclick: (e) => { e.preventDefault(); renderFeedback(r); } }, '🐞 버그·아이디어 제보')),
      el('p', { class: 'hint small' }, '제일 오래 버틴 사람은 「명예 생존자」로 다음 영상에 별명이 나와. 결과 화면을 캡처해서 DM으로 보내 줘.'),
    );
    drawCard(r);
    scrollTo(0, 0);
  }

  // 결과 카드 — 규칙(반전)은 넣지 않는다
  async function drawCard(r) {
    try { await Promise.all([document.fonts.load('800 40px Pretendard Variable'), document.fonts.load('500 40px Pretendard Variable')]); } catch { /* 글꼴 없이 진행 */ }
    const c = $('#card'), x = c.getContext('2d'), W = 1080, H = 1350;
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, r.survived ? '#14204a' : '#2a0b12'); g.addColorStop(1, '#05060d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = '#fff'; for (let i = 0; i < 110; i++) { x.globalAlpha = Math.random() * .6 + .1; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    x.globalAlpha = 1; x.textAlign = 'center';
    x.fillStyle = '#7fe3ff'; x.font = '500 34px \"Pretendard Variable\", sans-serif'; x.fillText('행성에서 1년 버티기 · 테스트', W / 2, 110);
    try {
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = S.m.img; });
      const R = 260, cx = W / 2, cy = 470, Z = R * 1.18;
      x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 6.29); x.clip(); x.drawImage(im, cx - Z, cy - Z - R * .06, Z * 2, Z * 2); x.restore();
    } catch { /* 그림 없이 */ }
    x.fillStyle = '#f4f1ea'; x.font = '800 60px \"Pretendard Variable\", sans-serif'; x.fillText(S.m.name, W / 2, 830);
    x.fillStyle = r.survived ? '#ffd34d' : '#ff6b6b'; x.font = '800 120px \"Pretendard Variable\", sans-serif';
    x.fillText(r.survived ? '365일 생존' : `${r.days}일 생존`, W / 2, 980);
    x.fillStyle = '#a9a7b8'; x.font = '500 40px Pretendard Variable';
    x.fillText(r.survived ? '1년을 버텼다' : '사인: ??? (영상에서 확인)', W / 2, 1060);
    x.fillStyle = '#f4f1ea'; x.font = '500 38px \"Pretendard Variable\", sans-serif'; x.fillText('너는 며칠 버틸 수 있어?', W / 2, 1150);
    x.font = '800 40px Pretendard Variable'; x.fillText(`@${D.site.handle}${seat ? ` · 좌석 ${seat}` : ''}`, W / 2, 1260);
  }
  const blob = () => new Promise((ok) => $('#card').toBlob(ok, 'image/png'));
  const unlock = () => { if (!unlocked) { unlocked = true; store.set('bonus', true); toast('🔓 숨은 행성이 열렸어!'); } };
  async function save(r) {
    const b = await blob(); const a = el('a', { href: URL.createObjectURL(b), download: `돈워너노우_${S.m.name}_${r.days}일.png` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    unlock();
  }
  async function share(r) {
    const b = await blob(); const file = new File([b], 'dontwannaknow.png', { type: 'image/png' });
    const text = `나는 ${S.m.name}에서 ${r.days}일 버텼어. 너는? @${D.site.handle}`;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); unlock(); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    save(r);
  }

  // ── 제보 (개인정보 없이 · 폼이 설정되면 폼으로) ──
  function renderFeedback(r) {
    const box = $('#stage'); box.replaceChildren();
    const form = D.site.links.feedbackForm;
    box.append(
      el('p', { class: 'eyebrow' }, '버그·아이디어 제보'),
      el('h2', { class: 'title small' }, '이상한 점, 더 넣고 싶은 행성'),
      el('p', { class: 'sub' }, '제일 좋은 제보를 한 사람은 따로 연락할게. 실명·학교·전화번호는 쓰지 마.'),
      el('textarea', { id: 'fb', rows: 5, maxlength: 400, placeholder: '예) 쇼핑몰 행성 8월에 버튼이 안 눌렸어 / 「거울 행성」도 만들어 줘' }),
      el('div', { class: 'actions' },
        form ? el('a', { class: 'btn primary', href: form, target: '_blank', rel: 'noopener' }, '제보 양식 열기 ↗')
          : el('button', { class: 'btn primary', onclick: async () => {
            const t = `[테스트 제보${seat ? ` · 좌석 ${seat}` : ''} · ${S ? S.m.name : ''} ${r ? r.days + '일' : ''}]\n` + $('#fb').value.trim();
            try { await navigator.clipboard.writeText(t); toast('복사했어. DM에 붙여 넣어 줘'); } catch { window.prompt('길게 눌러 복사해', t); }
            window.open(`https://ig.me/m/${D.site.handle}`, '_blank', 'noopener');
          } }, '복사하고 DM으로 보내기'),
        el('button', { class: 'btn', onclick: renderStart }, '돌아가기')),
    );
    scrollTo(0, 0);
  }

  renderStart();
})();
