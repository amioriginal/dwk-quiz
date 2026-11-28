/* 행성 생존 v2 — 카드를 좌우로 넘겨 1년(12달) 버티기 · Reigns식
   게이지 3개(♥체력 🍞식량 🧠정신, 0~10) 중 하나라도 0이면 끝 · 행성의 숨은 규칙을 어기면 즉시 끝
   엔딩 도감(행성마다 5개) · 오늘의 행성(날짜 시드 = 모두 같은 문제) · 결과 카드(반전 가림)
   의존: data.js → dwk-core.js(window.DC) */
(() => {
  'use strict';
  const DC = window.DC, D = window.DWK;
  const { el } = DC;
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const seat = (params.get('seat') || '').replace(/\D/g, '').slice(0, 3);

  // 선택지: [버튼 글, 결과 글, 효과{hp,food,mind,trap}]  ·  카드: [질문, 왼쪽 선택, 오른쪽 선택, 그림 a|b]
  const P = {
    '1-1': { name: '해바라기', icon: '🌻',
      intro: '끝없는 해바라기 밭. 언제나 여름이고, 너는 그네 달린 하얀 농가에 살아.',
      clue: '아침마다 해바라기가 전부 네 창문 쪽을 보고 있어. 어제보다 한 뼘 더 가까이.',
      rule: '해바라기의 아침', ruleText: '밤새 켜 둔 불빛을 향해 해바라기가 자랐어. 아침, 창문은 노란 꽃잎으로 가득했어.',
      win: '1년 뒤, 해바라기들이 처음으로 너 말고 해를 봤어.',
      cards: [
        ['밤에 책을 조금만 더 읽고 싶어.', ['스탠드 켜 둔 채 잠든다', '', { trap: 1 }], ['불 끄고 내일 읽는다', '창밖에서 사각사각 소리가 나다 멈췄어.', { mind: -1, hp: 1 }], 'b'],
        ['정전이 됐어. 손전등이 하나 있어.', ['손전등 켜고 밭을 산책', '', { trap: 1 }], ['그냥 일찍 잔다', '깜깜한 밤. 해바라기들이 고개를 숙이고 있어.', { hp: 1 }], 'a'],
        ['이웃이 전구를 잔뜩 단 밤 파티에 초대했어.', ['잠깐 들렀다 온다', '꽃들이 너를 따라 고개를 돌렸어. 오싹해.', { mind: -2, food: 1 }], ['정중히 거절한다', '다음 날, 그 집 마당은 해바라기로 덮여 있었어.', { mind: -1 }], 'a'],
        ['벌들이 꿀을 잔뜩 만들어 놨어.', ['꿀을 모아 둔다', '꿀 단지가 가득 찼어.', { food: 3, hp: -1 }], ['벌집은 그냥 둔다', '조용한 하루.', { mind: 1 }], 'a'],
      ] },
    '1-2': { name: '온천', icon: '♨️',
      intro: '온천이 가득한 눈 덮인 산. 물은 언제나 40도, 노천탕은 문 바로 앞이야.',
      clue: '바닥 돌이 평소보다 뜨겁고, 김이 한 번에 확 올라왔다 사라져.',
      rule: '끓어오른 탕', ruleText: '물이 소리 없이 빠져나갔다가, 펄펄 끓어서 다시 올라왔어.',
      win: '1년 뒤, 너는 물이 빠지는 소리를 누구보다 먼저 듣게 됐어.',
      cards: [
        ['노천탕 물이 소리 없이 빠지고 있어.', ['조금만 더 있는다', '', { trap: 1 }], ['당장 나온다', '몇 분 뒤, 탕에서 끓는 물기둥이 솟았어.', { mind: -1, hp: 1 }], 'b'],
        ['눈보라가 쳐. 산장보다 물속이 더 따뜻해.', ['물속에서 밤을 보낸다', '', { trap: 1 }], ['벽난로 앞에서 잔다', '바닥이 뜨끈해. 푹 잤어.', { hp: 1, food: -1 }], 'a'],
        ['온천 달걀을 삶고 싶어.', ['김 나는 구멍에 직접', '손을 데었어.', { hp: -2, food: 2 }], ['냄비에 물을 떠서', '반숙 달걀 여섯 개.', { food: 2 }], 'a'],
        ['장작이 다 떨어져 가.', ['숲에서 해 온다', '팔이 뻐근하지만 버틸 만해.', { hp: -1, food: 1 }], ['온천 열로 버틴다', '바닥이 따뜻해서 괜찮았어.', { mind: 1 }], 'a'],
      ] },
    '1-3': { name: '쇼핑몰', icon: '🛍️',
      intro: '끝없는 쇼핑몰. 분수는 늘 돌아가고, 너는 침대 매장에 살아. 매일 밤 새 침대에서 자.',
      clue: '아침에 쇼윈도 마네킹이 하나 늘었어. 어제 복도에서 본 사람 옷이야.',
      rule: '쇼윈도의 새 마네킹', ruleText: '셔터가 내려왔어. 아침, 쇼윈도에 너를 닮은 마네킹이 하나 서 있었어.',
      win: '1년 뒤, 너는 9시 종소리가 들리기 전에 눈을 감는 사람이 됐어.',
      cards: [
        ['8시 58분. 푸드코트 줄이 아직 길어.', ['끝까지 줄을 선다', '', { trap: 1 }], ['가까운 가게로 들어간다', '9시, 철컥. 셔터가 바닥에 닿았어.', { food: -1, mind: 1 }], 'b'],
        ['밤에 복도에서 누가 네 이름을 불러.', ['셔터를 열고 나가 본다', '', { trap: 1 }], ['대답하지 않는다', '소리는 아침이 되자 멈췄어.', { mind: -2 }], 'b'],
        ['불이 한 가게씩 꺼지기 시작했어. 침대 매장은 멀어.', ['가까운 옷 가게로', '옷 더미 위에서 잤어.', { hp: -1 }], ['침대까지 전력 질주', '간신히 들어왔어.', { hp: -2, mind: 1 }], 'a'],
        ['문 닫은 마트에 통조림이 잔뜩 있어.', ['낮에 넉넉히 챙긴다', '한 달은 끄떡없어.', { food: 3, hp: -1 }], ['필요한 만큼만', '가방이 가벼워.', { food: 1, mind: 1 }], 'a'],
      ] },
    '1-4': { name: '반딧불 호수', icon: '✨', noTrap: true,
      intro: '소나무 숲에 둘러싸인 따뜻한 호수. 너는 물 위 오두막에 살아. 카누와 낚싯대도 있어.',
      clue: '밤마다 반딧불이 수십억 마리 떠올라. 책을 읽을 만큼 밝고, 절대 물지 않아.',
      rule: '', ruleText: '',
      win: '마지막 날 밤, 반딧불이 호수 위에 작별 인사를 써 줬어.',
      cards: [
        ['반딧불이 오두막 안까지 따라왔어.', ['문 닫고 쫓아낸다', '깜깜한 방에서 넘어졌어.', { hp: -2, mind: -1 }], ['같이 잔다', '방 안이 별빛처럼 반짝였어.', { mind: 2 }], 'b'],
        ['카누를 타고 호수 한가운데로 나왔어.', ['낚시를 한다', '송어 세 마리!', { food: 3 }], ['누워서 하늘을 본다', '마음이 편해졌어.', { mind: 2 }], 'a'],
        ['이렇게 좋은 곳에 함정이 없을 리 없어.', ['밤새 보초를 선다', '아무 일도 없었어. 잠만 못 잤어.', { hp: -2, mind: -2 }], ['믿고 잔다', '아무 일도 없었어. 정말로.', { hp: 1, mind: 1 }], 'a'],
        ['반딧불이 숲 쪽으로 길을 비춰.', ['따라간다', '숲속에 블루베리 덤불이 있었어.', { food: 2 }], ['오두막에 남는다', '조용한 밤.', { mind: 1 }], 'b'],
      ] },
    '2-1': { name: '호수', icon: '👁️',
      intro: '끝없는 하얀 평원 한가운데 동그랗고 파란 호수. 너는 호숫가 하얀 오두막에 살아.',
      clue: '하루에 한 번, 하늘이 위아래로 닫혔다가 열려. 밤이면 호수 가운데가 까맣게 커져.',
      rule: '눈이 마주친 날', ruleText: '물에 비친 건 네 얼굴이 아니었어. 호수가 너를 똑바로 보고 있었어.',
      win: '1년 동안 한 번도 물을 들여다보지 않았어. 떠나는 날, 호수가 천천히 눈을 감았어.',
      cards: [
        ['호수가 너무 맑아. 얼굴을 비춰 보고 싶어.', ['물을 들여다본다', '', { trap: 1 }], ['등 돌리고 물만 뜬다', '등 뒤에서 뭔가 오래 보는 느낌.', { food: 1, mind: -2 }], 'a'],
        ['밤에 호수 가운데가 까맣게 커졌어.', ['랜턴 들고 가까이', '', { trap: 1 }], ['커튼을 치고 잔다', '커튼 너머로 파란 빛이 두리번거렸어.', { mind: -2 }], 'b'],
        ['아침에 보니 호수가 오두막 쪽으로 옮겨 왔어.', ['반대편으로 이사', '하루 종일 걸었어.', { hp: -2, food: -1 }], ['그대로 산다', '눈을 내리깔고 지냈어.', { mind: -3 }], 'b'],
        ['평원에 붉은 실 같은 줄이 솟았어.', ['따라가 본다', '줄은 전부 호수로 이어져 있었어.', { mind: -2, food: 1 }], ['밟지 않게 피한다', '무사히 하루를 넘겼어.', { hp: 1 }], 'a'],
      ] },
    '2-2': { name: '하얀 산맥', icon: '🦷',
      intro: '하얀 산맥이 끝없이 이어진 행성. 골짜기는 늘 따뜻하고 촉촉해. 땅이 말랑해서 넘어져도 안 아파.',
      clue: '골짜기 마을 하나가 하룻밤 새 없어졌어. 산맥 사이가 어제보다 좁아.',
      rule: '맞물린 산맥', ruleText: '땅이 크게 숨을 쉬었어. 하얀 산맥이 천천히, 딱 맞물렸어.',
      win: '1년 뒤, 너는 땅이 숨 쉬기 직전의 바람을 알아채는 사람이 됐어.',
      cards: [
        ['땅이 크게 숨을 쉬었어. 바람이 골짜기로 빨려 들어가.', ['골짜기에 숨는다', '', { trap: 1 }], ['산맥 밖으로 뛴다', '뒤에서 「딱」 소리. 돌아보지 않았어.', { hp: -2, mind: -1 }], 'b'],
        ['골짜기에서 축제가 열린대. 먹을 게 잔뜩이래.', ['가서 실컷 먹는다', '땅이 자꾸 꿈틀거렸어.', { food: 3, mind: -2 }], ['바깥 언덕에 남는다', '멀리서 불빛만 봤어.', { mind: 1, food: -1 }], 'a'],
        ['말랑한 분홍 언덕, 낮잠 자기 딱 좋아.', ['한숨 잔다', '포근했어.', { hp: 2 }], ['식량을 찾으러', '하얀 돌 사이에서 열매를 찾았어.', { food: 2 }], 'a'],
        ['산맥 꼭대기에 오르면 행성 전체가 보인대.', ['올라간다', '미끄럽고 축축했어.', { hp: -2, mind: 1 }], ['안 올라간다', '평범한 하루.', {}], 'a'],
      ] },
    '2-3': { name: '하얀 숲', icon: '🖐️', locked: 'planet-2-3',
      intro: '하얀 나무가 자라는 조용한 숲. 나무마다 가지가 딱 다섯 개씩 있어. 너는 숲 한가운데 오두막에 살아.',
      clue: '바람이 없는 날에도 가지가 움직여. 오늘 아침, 창문에 하얀 손자국이 가득했어.',
      rule: '맞잡은 손', ruleText: '너도 손을 흔들어 줬어. 숲이 기뻐하며 다가왔어. 아주 가까이.',
      win: '1년 뒤 떠나는 날, 숲은 처음으로 손을 내렸어.',
      cards: [
        ['숲 전체가 너에게 손을 흔들고 있어.', ['반갑게 흔들어 준다', '', { trap: 1 }], ['못 본 척 고개를 숙인다', '가지들이 천천히 내려갔어.', { mind: -2 }], 'a'],
        ['나무 한 그루가 밤새 오두막 쪽으로 늘어났어.', ['가지를 잘라 낸다', '잘린 가지가 손가락처럼 꿈틀거렸어.', { hp: -1, mind: -2, food: 1 }], ['건드리지 않는다', '가지 끝이 창틀을 톡톡 두드렸어.', { mind: -1 }], 'b'],
        ['숲속에 하얀 열매가 주렁주렁.', ['딴다', '나무가 손을 오므렸어. 얼른 도망쳤어.', { food: 3, hp: -2 }], ['그냥 둔다', '배가 고파.', { food: -1 }], 'a'],
        ['누가 문을 다섯 번 두드려.', ['문을 연다', '아무도 없었어. 문고리에 하얀 자국만.', { mind: -3 }], ['열지 않는다', '두드림은 새벽에 멈췄어.', { mind: -1, hp: 1 }], 'b'],
      ] },
    // ── 미니게임 「행성 섞기」 입주 행성(2026-11-28) — 규칙은 data.js rule(영상 반전) 그대로 ──
    '5-1': { name: '카피바라', icon: '🍊',
      intro: '거대한 카피바라 등 위 작은 나무집. 문 앞이 바로 유자 띄운 온천이야.',
      clue: '온천에 뜬 유자가 하루에 하나씩 줄어. 카피바라가 자꾸 유자 쪽을 쳐다봐.',
      rule: '마지막 유자', ruleText: '마지막 유자를 먹은 순간, 카피바라가 처음으로 눈을 떴어. 그리고 온천 속으로 천천히 가라앉았어.',
      win: '1년 뒤, 카피바라 등 위엔 유자 하나가 여전히 떠 있었어.',
      cards: [
        ['배가 고파. 온천에 유자가 딱 하나 남았어.', ['먹는다', '', { trap: 1 }], ['그냥 둔다', '카피바라가 만족스럽게 콧김을 뿜었어.', { food: -1, mind: 1 }], 'a'],
        ['유자 향이 너무 좋아. 차를 끓이고 싶어.', ['하나만 딴다', '유자가 몇 개 남아 있어. 괜찮겠지.', { food: 1, mind: -1 }], ['참는다', '온천 물이 조금 더 따뜻해졌어.', { hp: 1 }], 'b'],
        ['온천에 너무 오래 있었어. 손가락이 쭈글쭈글해.', ['계속 있는다', '머리가 핑 돌아.', { hp: -2, mind: 1 }], ['나와서 쉰다', '개운해.', { hp: 1, food: -1 }], 'a'],
        ['다른 카피바라가 다가와 온천을 기웃거려.', ['쫓아낸다', '카피바라끼리 머리를 박았어. 집이 흔들렸어.', { hp: -1, mind: -1 }], ['같이 멍하니 있는다', '셋이 나란히 졸았어.', { mind: 2, food: -1 }], 'b'],
      ] },
    '5-2': { name: '뚱냥이', icon: '🐈',
      intro: '식빵 자세로 잠든 거대한 뚱냥이 위 마을. 털은 언제나 따뜻하고 푹신해.',
      clue: '오늘 아침, 고양이 수염이 한 번 움찔했어. 귀도 네 쪽으로 돌아가 있어.',
      rule: '깨어난 눈', ruleText: '노란 눈이 번쩍 떠졌어. 네가 한 발짝 움직인 순간, 앞발이 내려왔어.',
      win: '1년 뒤, 너는 고양이가 깨어 있을 땐 돌이 되는 법을 완벽히 익혔어.',
      cards: [
        ['고양이 눈이 반쯤 떠졌어. 화장실이 너무 급해.', ['살금살금 간다', '', { trap: 1 }], ['꼼짝 않고 참는다', '8시간 뒤, 고양이가 다시 잠들었어.', { hp: -2, mind: -1 }], 'a'],
        ['고양이가 하품을 크게 했어. 입 냄새가 마을을 덮었어.', ['코를 막고 버틴다', '정신이 아득해.', { mind: -2 }], ['털 속으로 파고든다', '따뜻해서 그대로 잠들었어.', { hp: 1, food: -1 }], 'b'],
        ['털 사이에서 사료 알갱이를 발견했어.', ['모아 둔다', '바삭바삭. 먹을 만해.', { food: 3, mind: -1 }], ['그냥 둔다', '배에서 꼬르륵.', { food: -1 }], 'a'],
        ['고양이가 그르릉거려. 땅 전체가 진동해.', ['진동에 맞춰 잔다', '최고의 잠이었어.', { hp: 2 }], ['불안해서 깬다', '밤새 뒤척였어.', { mind: -2 }], 'b'],
      ] },
    '3-3': { name: '구름', icon: '🐑',
      intro: '털이 구름처럼 부푼 잠든 양 위의 마을. 발밑이 솜처럼 폭신해.',
      clue: '옆집 아저씨가 어젯밤 코를 골았대. 오늘 그 집 자리는 털로 덮여 있어.',
      rule: '양이 깬 밤', ruleText: '드르렁. 네 코 고는 소리에 양이 몸을 털었어. 마을이 통째로 하늘로 흩어졌어.',
      win: '1년 뒤, 양은 한 번도 깨지 않고 계속 꿈을 꿨어.',
      cards: [
        ['너무 피곤한 날이야. 코가 꽉 막혔어.', ['그냥 바로 잔다', '', { trap: 1 }], ['코에 따뜻한 수건을 얹고 잔다', '숨이 편해졌어.', { hp: 1, food: -1 }], 'a'],
        ['이웃이 한잔하자고 해.', ['마신다', '머리가 띵해. 다행히 조용히 잤어.', { mind: 1, hp: -2 }], ['물만 마신다', '밤이 조용했어.', { mind: -1, hp: 1 }], 'b'],
        ['양털을 조금 깎아서 이불을 만들고 싶어.', ['조금만 깎는다', '양이 잠결에 뒤척였어. 심장이 철렁.', { hp: 1, mind: -2 }], ['참는다', '추운 밤이었어.', { hp: -1 }], 'a'],
        ['양이 잠꼬대로 「음메」 했어.', ['따라서 「음메」', '양이 편안해졌어.', { mind: 2 }], ['숨죽인다', '한참 뒤 조용해졌어.', { mind: -1 }], 'b'],
      ] },
    '5-4': { name: '부캉이', icon: '🦈',
      intro: '몸을 둥글게 만 거대한 상어, 부캉이. 이빨이 무서워서 다들 이 행성은 안 골라.',
      clue: '부캉이가 하루에 한 번 입을 크게 벌려. 그때 도망친 사람은 아무도 못 봤대.',
      rule: '등 돌린 순간', ruleText: '무서워서 등을 돌리고 뛰었어. 부캉이는 도망치는 걸 사냥감으로 알아.',
      win: '1년 뒤, 부캉이는 네 손바닥에 코를 비볐어.',
      cards: [
        ['부캉이가 입을 쩍 벌리고 너를 봐.', ['뛰어서 도망친다', '', { trap: 1 }], ['눈을 마주치고 버틴다', '이빨 사이에 낀 해초를 빼 달라는 거였어.', { mind: -2, food: 1 }], 'a'],
        ['부캉이가 물고기를 잔뜩 물고 왔어.', ['받는다', '회 한 접시. 최고야.', { food: 3, mind: -1 }], ['사양한다', '부캉이가 시무룩해졌어.', { mind: -1 }], 'b'],
        ['폭풍이 와. 부캉이 입속이 제일 안전해 보여.', ['입속으로 피한다', '축축하지만 살았어.', { hp: 1, mind: -2 }], ['바위 뒤에 숨는다', '온몸이 젖었어.', { hp: -2 }], 'a'],
        ['부캉이 지느러미에 상처가 났어.', ['약을 발라 준다', '부캉이가 처음으로 꼬리를 흔들었어.', { mind: 2, hp: -1 }], ['멀찍이 본다', '상처가 덧났어. 부캉이가 예민해.', { mind: -2 }], 'b'],
      ] },
  };
  const COMMON = [
    ['지구에서 보급 상자가 떨어졌어. 하나만 열 수 있어.', ['식량 상자', '통조림이 한가득.', { food: 3 }], ['약 상자', '상처가 아물었어.', { hp: 2 }]],
    ['감기에 걸렸어.', ['하루 푹 쉰다', '나았어.', { food: -1, hp: 1 }], ['참고 일한다', '몸이 무거워.', { hp: -2, food: 1 }]],
    ['별똥별이 쏟아지는 밤이야.', ['소원을 빈다', '마음이 가벼워졌어.', { mind: 2 }], ['별 조각을 줍는다', '반짝이는 돌. 먹을 수는 없어.', { mind: 1 }]],
    ['비가 와. 빗물을 모을까?', ['그릇을 전부 내놓는다', '물이 넉넉해.', { food: 1 }], ['안에서 쉰다', '빗소리를 들으며 잤어.', { hp: 1 }]],
    ['다른 생존자를 만났어. 배가 고파 보여.', ['식량을 나눠 준다', '그 사람이 지름길을 알려 줬어.', { food: -2, mind: 2 }], ['모른 척한다', '마음이 좀 무거워.', { mind: -1 }]],
    ['고장 난 라디오에서 지구 노래가 나와.', ['끝까지 듣는다', '눈물이 났지만 힘이 났어.', { mind: 2 }], ['고쳐서 신호를 보낸다', '응답은 없었어.', { mind: -1, food: -1 }]],
    ['텃밭에 싹이 났어.', ['물을 준다', '작은 수확!', { food: 2 }], ['그냥 둔다', '싹이 말라 버렸어.', { mind: -1 }]],
    ['밤새 이상한 꿈을 꿨어.', ['일기에 적는다', '조금 덜 무서워졌어.', { mind: 1 }], ['잊으려고 일만 한다', '하루가 금방 갔어.', { food: 1, mind: -1 }]],
  ];
  const GAUGES = [['hp', 'heart', '체력'], ['food', 'food', '식량'], ['mind', 'mind', '정신']]; // 2번째 칸 = icons.js 아이콘 이름
  // 4차: Reigns처럼 게이지는 양쪽 끝이 모두 죽음 — 바닥(0) 엔딩 3개 + 넘침(10) 엔딩 3개(hpX·foodX·mindX)
  const END = (id) => {
    const p = P[id];
    return {
      rule: [p.rule, '숨은 규칙을 어겼다'],
      hp: ['쓰러진 생존자', '체력이 바닥났다'],
      hpX: ['지도 밖으로', '체력이 넘쳤다'],
      food: ['텅 빈 식량 창고', '먹을 게 떨어졌다'],
      foodX: ['넘친 창고', '식량이 넘쳤다'],
      mind: [id.startsWith('2') ? '공포에 삼켜짐' : '무너진 정신', '정신이 무너졌다'],
      mindX: ['돌아가지 않는 사람', '마음이 너무 편해졌다'],
      win: ['1년 생존', '끝까지 버텼다'],
    };
  };
  const STORY = {
    hp: '몸이 더는 움직이지 않았어.', hpX: '힘이 남아돌아 지도 밖까지 걸어갔어. 돌아오는 길은 없었어.',
    food: '마지막 통조림을 비웠어.', foodX: '쌓아 둔 식량 냄새가 행성 끝까지 퍼졌어. 밤에, 무언가 냄새를 따라왔어.',
    mindX: '이 행성이 너무 좋아져 버렸어. 구조선이 왔을 때, 너는 문을 잠갔어.',
  };
  const endingKeys = (id) => (P[id].noTrap ? [] : ['rule']).concat(['hp', 'hpX', 'food', 'foodX', 'mind', 'mindX', 'win']);
  const playable = () => DC.planets().filter(p => P[p.id]);
  const unlocked = (id) => !P[id].locked || DC.rewards.has(P[id].locked);

  // ── 상태 ──
  let S = null; let rand = Math.random;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ── 화면: 시작 ──
  function home() {
    rand = Math.random;
    const box = $('#stage'); box.replaceChildren(); box.classList.add('gx-wide');
    const daily = dailyPlanet();
    const done = DC.store.get('daily_' + DC.today(), null);
    const got = playable().reduce((n, p) => n + DC.endings.got('survive').filter(k => k.startsWith(p.id + ':')).length, 0);
    const all = playable().reduce((n, p) => n + endingKeys(p.id).length, 0);
    const best = DC.store.get('best_survive', null);
    box.append(el('section', { class: 'gx-hero' },
      el('img', { class: 'gx-bg', src: DC.scene(daily.id, 'a'), alt: '', decoding: 'async' }),
      el('div', { class: 'gx-cap' },
        seat ? el('p', { class: 'ticket' }, DI.ic('ticket'), `비공개 테스트 · 좌석 ${seat}번`) : '', // null 을 넣으면 「null」 글자가 찍힌다(UX 점검 F1)
        el('p', { class: 'gx-eyebrow' }, el('span', {}, '02'), '1분 게임'),
        el('h1', { class: 'gx-h1' }, '행성 생존'),
        el('p', { class: 'gx-sub' }, '카드를 좌우로 넘겨 12달을 버텨. ', el('b', {}, '체력·식량·정신이 바닥나도, 꽉 차도 끝. 숨은 규칙을 어겨도 끝.')),
        el('div', { class: 'gx-acts' },
          el('button', { class: 'gx-btn main', type: 'button', onclick: () => start(daily.id, true) }, `오늘의 행성 · ${daily.name.replace(/ 행성$/, '')}`, el('i')),
          el('a', { class: 'gx-txt', href: '#pick' }, '다른 행성 고르기')),
        el('p', { class: 'gx-note' }, done ? `오늘 기록 ${done.days}일 · 다시 하면 카드 순서가 섞여(기록은 첫 판만)` :'오늘의 행성은 모두 같은 문제를 풀어.'),
        el('dl', { class: 'gx-rows' },
          el('div', {}, el('dt', {}, '내 최장 생존'), el('dd', {}, best ? `${best.days}일 · ${best.name}` : '아직 없음')),
          el('div', {}, el('dt', {}, '모은 엔딩'), el('dd', {}, `${got} / ${all}`))))));
    const rest = el('div', { class: 'gx-endwrap' },
      el('div', { class: 's-head', id: 'pick' }, el('h2', {}, '행성 고르기'), el('button', { class: 'gx-txt', type: 'button', onclick: dex }, `엔딩 도감 ${got}/${all}`)));
    box.append(rest);
    const grid = el('div', { class: 'planets' });
    for (const p of playable()) {
      const open = unlocked(p.id);
      const n = DC.endings.got('survive').filter(k => k.startsWith(p.id + ':')).length;
      grid.append(el('button', { class: 'planet' + (open ? '' : ' locked'), disabled: open ? null : 'disabled', onclick: () => start(p.id, false) },
        el('span', { class: 'num' }, `${p.ep}편`), el('span', { class: 'stamp' }, `엔딩 ${n}/${endingKeys(p.id).length}`),
        el('div', { class: 'orb', style: `background-image:url(${p.img})`, role: 'img', 'aria-label': p.name }),
        el('div', { class: 'name' }, open ? p.name : [DI.ic('lock'), '숨은 행성']),
        open ? null : el('small', { class: 'lock-hint' }, '결과 카드를 공유하거나 영상 속 코드로 열려')));
    }
    rest.append(grid, codeBox(), DC.followCta());
    if (location.hash !== '#pick') scrollTo(0, 0);
  }
  function codeBox() {
    const inp = el('input', { placeholder: '영상 속 코드', maxlength: 12, autocomplete: 'off', 'aria-label': '코드 입력' });
    return el('div', { class: 'codebox' }, inp, el('button', { class: 'gx-btn', type: 'button', onclick: () => { const r = DC.redeem(inp.value); DC.toast(r.msg); if (r.ok) home(); } }, '코드 열기'));
  }
  function dailyPlanet() {
    const pool = playable().filter(p => !P[p.id].locked);
    const r = DC.rng(DC.seed('survive' + DC.today()));
    return pool[Math.floor(r() * pool.length)];
  }

  // ── 진행 ── (2026-11-28 게임판 품질: 카드판은 한 번만 그리고 카드·게이지만 바꾼다 — 그래야 움직임이 이어진다)
  // 4차: 겨울은 8월부터, 겨울에만 매달 식량 −1(그 전엔 없음 — 대신 식량이 10까지 차면 넘침 엔딩이라 「겨울 대비로 쌓되 넘치지 않게」가 앞 절반의 긴장).
  //  호수·하얀 산맥·하얀 숲(2-x)의 「석 달마다 정신 −1」은 뺐다 — 카드 자체가 정신을 깎아 알고 하는 사람도 5~16%만 살았다(모의 실험)
  const WINTER = 8;
  const TH = 84;             // 이만큼 밀면 넘어간다(넘김 직전에 선택지가 흰 바탕으로 뒤집히며 「딱」 소리)
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // 같은 장면 그림도 달마다 다른 구도로 자른다: [확대, 가로 %, 세로 %, 흐르는 방향 %]
  // 확대는 1.25배까지 — 장면 그림이 720px라 그 이상 키우면 흐려진다(1.6배 컷 흐림 실측)
  const HINT0 = '게이지는 바닥나도, 꽉 차도 끝 · 좌우로 밀어 골라', HINT1 = '흰 점 = 바뀔 게이지 · 오를지 내릴지는 몰라'; // 3차: 점 옆에 「조금·바뀜·크게」 글이 붙어 크기 설명은 거기서 한다
  const PIPW = ['', '조금 바뀜', '바뀜', '크게 바뀜'];
  // 엔딩 그림: 기존 3D 렌더(img/scene)에서 엔딩 성격에 맞는 장면을 골라 잘라 쓴다 — 새 그림 생성·다운로드 없음(2차 검수 「엔딩마다 그림이 없다」)
  // [장면 a|b, 확대(≤1.3 — 720px 그림이라 그 이상은 흐림), 초점 가로 %, 초점 세로 %, (선택) 'lift' = 원래 어두운 렌더를 밝힘] · 색 보정은 엔딩 종류별(GRADE)
  // 온천 규칙 = 물 빠진 탕(1-2b) — 전에는 이 그림이 짙은 그늘 밑 배경이라 검은 덩어리로 보였다. 액자 안에 밝게 두면 「빠진 탕」으로 읽힌다
  // 규칙 = 함정 그 장면 · 체력 = 주인공이 쓰러진 자리 · 식량 = 텅 빈 살림 · 정신 = 이상해진 풍경 · 생존 = 집 전경
  const GRADE = { rule: 'doom', hp: 'ash', hpX: 'ash', food: 'dry', foodX: 'dry', mind: 'odd', mindX: 'odd', win: 'gold' };
  const ART = {
    '1-1': { rule: ['b', 1.15, 60, 35], hp: ['a', 1.3, 72, 78], food: ['a', 1.3, 22, 80], mind: ['b', 1.3, 80, 30], win: ['a', 1.05, 50, 42], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
    '1-2': { rule: ['b', 1, 50, 55, 'lift'], hp: ['a', 1.3, 12, 72], food: ['a', 1.25, 50, 32], mind: ['a', 1.3, 86, 45], win: ['a', 1, 50, 50], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
    '1-3': { rule: ['b', 1.1, 50, 45], hp: ['a', 1.3, 42, 72], food: ['a', 1, 50, 50], mind: ['b', 1.3, 80, 45], win: ['a', 1.1, 50, 38], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
    '1-4': { hp: ['a', 1.3, 74, 70], food: ['a', 1, 50, 50], mind: ['b', 1.3, 50, 28], win: ['b', 1, 50, 55], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
    '2-1': { rule: ['b', 1.15, 50, 48], hp: ['a', 1.3, 22, 75], food: ['a', 1, 50, 50], mind: ['b', 1.3, 50, 50], win: ['a', 1.1, 50, 35], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
    '2-2': { rule: ['a', 1.3, 50, 22], hp: ['b', 1.3, 45, 65], food: ['b', 1, 50, 50], mind: ['a', 1.3, 30, 70], win: ['a', 1, 50, 50], hpX: ['a', 1.2, 25, 60], foodX: ['a', 1.2, 72, 72], mindX: ['b', 1.2, 50, 28] },
    '2-3': { rule: ['b', 1.1, 55, 45], hp: ['a', 1.3, 50, 75], food: ['a', 1, 50, 50], mind: ['b', 1.3, 40, 35], win: ['a', 1, 50, 40], hpX: ['b', 1.2, 25, 60], foodX: ['b', 1.2, 72, 72], mindX: ['a', 1.2, 50, 28] },
  };
  // 장면 렌더가 없는 행성(카피바라·뚱냥이·구름·부캉이)은 행성 3D 렌더를 액자처럼 놓고 색만 바꾼다(420px라 확대하지 않는다)
  // 3차: 크게 보이는 그림(o.px = 화면 css px)은 원본보다 키우지 않는다 — 장면 720px · 행성 그림 420px. o.full = 자르지 않고 장면 전체
  //  (3차 검수: 실패 끝 화면 그림이 1.3배로 확대돼 뭉개지고, 붉은 덮개와 섞여 안개처럼 번졌다)
  const SRC_SCENE = 720, SRC_PLANET = 420;
  const artEl = (id, kind, cls = '', o = {}) => {
    const a = ART[id]?.[kind], src = a ? DC.scene(id, a[0]) : DC.planet(id)?.img || '', real = !!a && src.includes('/scene/');
    let [z, x, y] = real ? a.slice(1) : [1, 50, 50];
    const dpr = devicePixelRatio || 1;
    if (o.full) { z = 1; x = 50; y = 50; } else if (o.px) z = Math.max(1, Math.min(z, SRC_SCENE / (o.px * dpr)));
    const pw = !real && o.px ? `;--pw:${Math.round(Math.min(o.px * 0.78, SRC_PLANET / dpr))}px` : '';
    return el('div', { class: `s-art g-${GRADE[kind] || 'ash'}${real ? '' : ' s-pl'}${real && a[4] ? ' ' + a[4] : ''} ${cls}`, 'aria-hidden': 'true' }, el('i', { style: `background-image:url(${src});--z:${+z.toFixed(3)};--x:${x}%;--y:${y}%${pw}` }));
  };
  const CROPS = [[1, 50, 50, 1.5],[1.2, 28, 62, -1.5], [1.25, 72, 40, 1.2], [1.12, 50, 75, -1], [1.22, 40, 30, 1.4], [1.15, 66, 58, -1.4], [1.25, 22, 45, 1], [1.1, 80, 66, -1.2]];

  // 소리: 게임판 전용 합성음(Web Audio · 파일 없음 · 외부 음원 0). 끄기는 DC.sfx 설정을 따른다
  let ax = null, noiseBuf = null;
  const AX = () => { if (!(DC.sfx.on?.() ?? true)) return null; try { ax = ax || new (window.AudioContext || window.webkitAudioContext)(); if (ax.state === 'suspended') ax.resume(); return ax; } catch { return null; /* 소리 미지원 기기 — 소리 없이 진행 */ } };
  const envl = (g, t, vol, atk, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const osc = (f, t, dur, type = 'sine', vol = 0.1, slide = 0) => { const o = ax.createOscillator(), g = ax.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur); envl(g, t, vol, 0.008, dur); o.connect(g).connect(ax.destination); o.start(t); o.stop(t + dur + 0.03); };
  const hiss = (t, dur, f0, f1, vol = 0.1, q = 1, type = 'bandpass') => {
    if (!noiseBuf) { noiseBuf = ax.createBuffer(1, ax.sampleRate * 0.8, ax.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ax.createBufferSource(), fl = ax.createBiquadFilter(), g = ax.createGain(); s.buffer = noiseBuf; fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur); envl(g, t, vol, 0.012, dur); s.connect(fl).connect(g).connect(ax.destination); s.start(t); s.stop(t + dur + 0.03);
  };
  const SND = {
    grab: (t) => { hiss(t, 0.05, 3200, 2200, 0.05, 0.8, 'highpass'); osc(190, t, 0.07, 'sine', 0.08, -50); },
    arm: (t) => osc(980, t, 0.045, 'triangle', 0.05),
    whoosh: (t) => hiss(t, 0.28, 500, 2800, 0.18, 0.9),
    flip: (t) => { hiss(t, 0.03, 4200, 3000, 0.07, 1, 'highpass'); hiss(t + 0.08, 0.035, 3600, 2400, 0.05, 1, 'highpass'); },
    up: (t) => { osc(660, t, 0.13, 'triangle', 0.07, 240); osc(990, t + 0.07, 0.16, 'triangle', 0.05, 220); },
    down: (t) => { osc(150, t, 0.24, 'sine', 0.18, -80); hiss(t, 0.14, 900, 250, 0.07, 0.7, 'lowpass'); },
    eat: (t) => osc(330, t, 0.08, 'square', 0.03, -80),
    beat: (t) => { osc(64, t, 0.13, 'sine', 0.26, -14); osc(58, t + 0.2, 0.15, 'sine', 0.18, -12); },
    winter: (t) => { [196, 233, 294].forEach((f, i) => osc(f, t + i * 0.04, 1.6, 'sine', 0.035, -6)); hiss(t, 1.5, 2000, 500, 0.05, 0.5); },
    doom: (t) => { osc(82, t, 1.3, 'sawtooth', 0.06, -46); hiss(t, 1.1, 1400, 120, 0.12, 0.6, 'lowpass'); },
    sparkle: (t) => [1319, 1568, 1976, 2637, 3136].forEach((f, i) => osc(f, t + i * 0.07, 0.24, 'sine', 0.045)),
  };
  const snd = (n, delay = 0) => { if (!AX()) return; try { SND[n](ax.currentTime + delay); } catch { /* 소리 합성 실패 — 게임은 계속 */ } };

  // 입자: 화면 위 투명 캔버스 하나. 입자가 있을 때만 돈다
  const FX = (() => {
    let cv = null, cx = null, parts = [], raf = 0, last = 0, dpr = 1;
    const size = () => { dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    let sized = false;
    const ensure = () => { if (cv && cv.isConnected) return; cv = el('canvas', { class: 's-fx', 'aria-hidden': 'true' }); document.body.append(cv); cx = cv.getContext('2d'); size(); if (!sized) { sized = true; addEventListener('resize', () => cv && size()); } };
    const loop = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(p => (p.life -= dt) > 0);
      for (const p of parts) {
        p.vy += p.g * dt; p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.spin * dt;
        const a = Math.min(1, p.life / p.fade); cx.globalAlpha = a; cx.fillStyle = p.c;
        if (p.kind === 'rect') { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9); cx.restore(); }
        else { cx.beginPath(); cx.arc(p.x, p.y, p.s * (0.4 + 0.6 * a), 0, 6.283); cx.fill(); }
      }
      cx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    return {
      warm() { if (!reduce) ensure(); },
      // 3차 검수: 성공 끝 화면에서 색종이(화면 맨 위 캔버스)가 글자를 덮었다 → 끝 화면 안으로 옮겨 그림 위·글자 뒤에서 떨어지게
      under(host) { if (!cv || !host) return; cv.classList.add('in-end'); host.prepend(cv); }, // 첫 넘김 때 전체 화면 캔버스를 처음 만들며 한 프레임 끊기던 것(실측 133ms) — 판을 그릴 때 미리 만든다
      burst(x, y, n, colors, o = {}) {
        if (reduce) return; ensure();
        for (let i = 0; i < n; i++) {
          const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 1.6), v = (o.speed ?? 220) * (0.4 + Math.random() * 0.8);
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 520, drag: o.drag ?? 1.6, s: (o.size ?? 3) * (0.6 + Math.random() * 0.8), c: colors[i % colors.length],
            life: (o.life ?? 0.8) * (0.7 + Math.random() * 0.6), fade: 0.35, kind: o.kind || 'dot', r: Math.random() * 6, spin: (Math.random() - 0.5) * 14 });
        }
        kick();
      },
      confetti() {
        if (reduce) return; ensure();
        const C = ['#ffd66b', '#fff1c4', '#ff8fa3', '#8fd8ff', '#9df0b5', '#f0f0fa'];
        for (let i = 0; i < 120; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160, g: 120, drag: 0.4,
          s: 4 + Math.random() * 4, c: C[i % C.length], life: 2.6 + Math.random() * 1.6, fade: 0.6, kind: 'rect', r: Math.random() * 6, spin: (Math.random() - 0.5) * 10 });
        kick();
      },
    };
  })();
  const layer = (cls) => { let v = document.querySelector('.s-vig'); if (!v) { v = el('div', { class: 's-vig', 'aria-hidden': 'true' }); document.body.append(v); } v.className = 's-vig'; void v.offsetWidth; if (cls) v.classList.add(cls); return v; };

  // ── 규칙(4차 · 화면 없는 계산) — 판(apply)과 모의 실험(?sim=1 의 window.SURVIVE_SIM)이 같은 함수를 쓴다 ──
  // 4차 검수: 왼쪽만 눌러도 1년 생존, 무작위로 넘겨도 클리어 → Reigns처럼 게이지 양쪽 끝(0·10)이 모두 죽음, 시작은 가운데(5)
  const GMAX = 10, GSTART = 5, KEYS = ['hp', 'food', 'mind'];
  const upkeepOf = (m) => (m >= WINTER ? { food: -1 } : {});
  // 선택 하나 + 그 달 살림. g는 안 바꾸고 { after: 선택 직후, fin: 살림까지, up: 살림 몫, dead: 끝난 엔딩 키 } 를 돌려준다
  function stepRules(g, fx, m) {
    const after = { ...g }, fin = { ...g }, up = {};
    if (fx.trap) return { after, fin, up, dead: 'rule' };
    for (const k of KEYS) after[k] = fin[k] = g[k] + (fx[k] || 0);
    for (const k of KEYS) { if (after[k] <= 0) return { after, fin, up, dead: k }; if (after[k] >= GMAX) return { after, fin, up, dead: k + 'X' }; }
    for (const [k, d] of Object.entries(upkeepOf(m))) { up[k] = d; fin[k] = after[k] + d; if (fin[k] <= 0) return { after, fin, up, dead: k }; }
    return { after, fin, up, dead: '' };
  }
  // 한쪽(L|R)만 계속 고르면 1년 안에 게이지가 끝(0 또는 10)에 닿는가 — 함정 선택지는 빼고 게이지만 본다
  const oneSideDies = (deck, side) => { let g = { hp: GSTART, food: GSTART, mind: GSTART }; for (let m = 1; m <= 12; m++) { const fx = { ...deck[m - 1][side][2] }; delete fx.trap; const r = stepRules(g, fx, m); if (r.dead) return true; g = r.fin; } return false; };
  function makeDeck(id, rule) {
    const p = P[id], scenes = DC.scene(id, 'a').includes('/scene/');
    let deck = [];
    for (let t = 0; t < 40; t++) {
      const own = shuffle(p.cards), com = shuffle(COMMON);
      // 「이 행성」 카드 4장이 나오는 달도 판마다 바꾼다(전에는 늘 3·5·8·11월)
      const ownM = [[3, 4], [5, 7], [8, 10], [11, 12]].map(([a, b]) => a + Math.floor(rand() * (b - a + 1)));
      deck = [];
      for (let m = 1; m <= 12; m++) {
        // 단서는 2월 — 첫 함정(3월~) 전에 본다. 「수첩에 적어 둔다」를 고르면 숨은 규칙이 수첩에 적히고, 「이 행성」 카드마다 그 줄이 뜬다
        if (ownM.includes(m)) deck.push({ q: own[0][0], L: own[0][1], R: own[0][2], img: own.shift()[3], own: true, fix: true });
        else if (m === 2) deck.push({ q: p.clue, L: ['수첩에 적어 둔다', `수첩에 적었어 — 「${rule}」`, { mind: 1, memo: 1 }], R: ['신경 끈다', '대신 식량을 모았어. 단서는 잊어버렸어.', { food: 1, mind: -1 }], img: 'b', clue: true, fix: true });
        else { const c = com.pop(); deck.push({ q: c[0], L: c[1], R: c[2], img: 'a' }); }
      }
      // 4차: 같은 그림이 연달아 나오지 않게 — 그림이 정해진 카드(이 행성 a|b · 단서 b)끼리 붙어 같은 그림이면 달 배치를 다시 뽑는다
      if (!scenes || deck.every((c, i) => !i || !c.fix || !deck[i - 1].fix || c.img !== deck[i - 1].img)) break;
    }
    // 생존 카드 그림은 앞·뒤 카드와 다르게 고른다: a(집 장면) · p(행성 전경 — 같은 행성 3D 렌더, 새 그림 아님) · b는 둘 다 막힐 때만
    if (scenes) {
      const free = deck.map((c, i) => (c.fix ? -1 : i)).filter(i => i >= 0);
      let best = null, bestCost = 1e9;
      const walk = (j, cost) => {
        if (cost >= bestCost) return;
        if (j === free.length) { bestCost = cost; best = free.map(i => deck[i].img); return; }
        const i = free[j];
        for (const [x, c] of [['a', 0], ['p', 0.1], ['b', 5]]) {
          if (deck[i - 1]?.img === x || (deck[i + 1]?.fix && deck[i + 1].img === x)) continue;
          const keep = deck[i].img; deck[i].img = x; walk(j + 1, cost + c); deck[i].img = keep;
        }
      };
      walk(0, 0);
      if (best) free.forEach((i, j) => { deck[i].img = best[j]; });
    }
    // 좌우 배치: 무작위로 섞되, 왼쪽만·오른쪽만 계속 고르면 반드시 게이지 끝에 닿는 배치만 쓴다(4차 검수 「왼쪽만 눌러도 1년 생존」)
    for (let t = 0; t < 60; t++) { deck.forEach(c => { if (rand() < 0.5) [c.L, c.R] = [c.R, c.L]; }); if (oneSideDies(deck, 'L') && oneSideDies(deck, 'R')) break; }
    return deck;
  }

  function start(id, daily) {
    // 오늘의 행성: 그날 첫 판만 날짜 시드(모두 같은 문제). 다시 하면 순서를 섞는다 — 같은 순서면 두 번째 판부터 외워졌다(2차 검수)
    const practice = !!(daily && DC.store.get('daily_' + DC.today(), null));
    rand = daily && !practice ? DC.rng(DC.seed('survive-run' + DC.today())) : Math.random;
    const p = P[id], meta = DC.planet(id), rule = meta.rule || p.rule;
    const deck = makeDeck(id, rule);
    S = { id, p, meta, rule, daily, practice, deck, m: 1, g: { hp: GSTART, food: GSTART, mind: GSTART }, trail: [], note: p.intro, memo: '' };
    busy = false;
    buildPlay();
    deal(true);
  }

  // 카드 한 장: 앞면(그림·선택지 이름표·질문) + 뒷면(행성 3D 렌더 그림). 밑에 깔린 카드는 뒷면이 보이고, 위로 올라오며 뒤집힌다
  function cardEl(c, m, under) {
    // 4차: 'p' = 행성 전경(같은 행성 3D 렌더 420px를 원본 크기 이하로 가운데에 — 키우면 흐려진다)
    const pl = c.img === 'p', scn = pl ? S.meta.img : DC.scene(S.id, c.img), real = !pl && scn.includes('/scene/');
    const cr = CROPS[(m * 3 + (c.img === 'b' ? 1 : 0)) % CROPS.length];
    const z = pl ? 1 : real ? cr[0] : Math.min(1.12, cr[0]);
    const kind = c.clue ? ['clue', '단서'] : c.own ? ['own', '이 행성'] : ['', '생존'];
    return el('div', { class: 'card' + (under ? ' under' : ''), tabindex: under ? -1 : 0, 'aria-hidden': under ? 'true' : null, 'aria-label': under ? null : `${m}월 카드. ${c.q} 왼쪽: ${c.L[0]}. 오른쪽: ${c.R[0]}.` },
      el('div', { class: 'face' },
        el('div', { class: 'art' + (c.img === 'b' && c.fix ? ' dark' : '') + (c.clue ? ' clue' : '') + (pl ? ' pl' : '') },
          el('div', { class: 'img', style: `background-image:url(${scn});--z:${z};--x:${real ? cr[1] : 50}%;--y:${real ? cr[2] : 50}%;--dx:${cr[3]}%${pl ? `;--pw:${Math.round(SRC_PLANET / (devicePixelRatio || 1) / 1.18)}px` : ''}` }),
          el('span', { class: 'tag' })),
        el('div', { class: 'body' }, el('p', { class: 'meta month' }, el('span', {}, `${m}월`), el('span', { class: 'kind ' + kind[0] }, kind[1])), el('p', { class: 'q' }, c.q),
          c.clue ? el('p', { class: 'clue-note' }, el('b', {}, '숨은 규칙의 단서야.'), ' 적어 두면 「이 행성」 카드가 나올 때마다 수첩이 떠.') : null)),
      el('div', { class: 'back' }, el('img', { src: S.meta.img, alt: '', decoding: 'async' }), el('span', {}, `${m}월`)));
  }

  let R = null; // 카드판 요소들
  function buildPlay() {
    const main = $('#stage'); main.replaceChildren(); main.classList.remove('gx-wide');
    const g = {}, gauges = el('div', { class: 'gauges' }, GAUGES.map(([k, ic, nm]) => (g[k] = el('div', { class: 'gauge', 'data-k': k, title: nm },
      el('span', { class: 'gi' }, DI.ic(ic), el('small', {}, nm)), el('b', { class: 'gv' }, S.g[k]),
      el('span', { class: 'bar' }, el('b', { style: `width:${S.g[k] * 10}%` }), el('i', { style: `width:${S.g[k] * 10}%` })),
      el('span', { class: 'hint-pip', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('em'))))));
    const months = el('div', { class: 'months', 'aria-hidden': 'true' }); for (let i = 1; i <= 12; i++) months.append(el('span', { class: i >= WINTER ? 'w' : '' }));
    const sub = el('small'), day = el('b', {}, '0일'), mon = el('small');
    const hud = el('div', { class: 'hud' },
      el('div', { class: 'hud-top' }, el('div', { class: 'mini-orb', style: `background-image:url(${S.meta.img})` }), el('div', {}, el('strong', {}, S.meta.name), sub), el('div', { class: 'hud-day' }, mon, day)),
      gauges, months);
    const note = el('p', { class: 'note first' }, S.note || '');
    const deck = el('div', { class: 'deck' });
    const bl = el('button', { class: 'btn', type: 'button', onclick: () => commit(-1) }), br = el('button', { class: 'btn', type: 'button', onclick: () => commit(1) });
    // 단추에 마우스를 올리거나 초점이 가도 예고가 뜬다(끌지 않는 사람도 크기를 본다)
    for (const [b, d] of [[bl, -1], [br, 1]]) {
      const on = () => { if (!busy && S && !S.over) hint(d, S.deck[S.m - 1]); }, off = () => { if (S && !S.over) hint(0, S.deck[S.m - 1]); };
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); }); b.addEventListener('pointerleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
    }
    const hintLine = el('p', { class: 'hint' }, HINT0);
    const box = el('div', { class: 's-play' }, hud, note, deck, el('div', { class: 'pick' }, bl, br), hintLine);
    main.append(box);
    R = { box, hud, g, months, sub, day, mon, note, deck, bl, br, hintLine, dayN: 0 };
    FX.warm(); layer('');
    // 엔딩 그림을 판 시작 때 미리 받아 풀어 둔다 — 끝 순간 처음 그리며 한 프레임 끊기던 것(2차 실측 50~567ms)
    const want = new Set(endingKeys(S.id).map(k => { const a = ART[S.id]?.[k]; return a ? DC.scene(S.id, a[0]) : S.meta.img; }));
    for (const u of want) { const im = new Image(); im.src = u; im.decode?.().catch(() => { /* 받기 실패 — 끝 화면에서 다시 받는다 */ }); (R.pre = R.pre || []).push(im); }
    updMonth();
    scrollTo(0, 0);
  }
  function updMonth() {
    R.sub.textContent = `${S.daily ? (S.practice ? '오늘의 행성 다시(순서 섞음) · ' : '오늘의 행성 · ') : ''}남은 달 ${12 - S.m + 1} · ${S.m >= WINTER ? '겨울 · 매달 식량 −1' : `${WINTER}월부터 겨울`}`;
    R.sub.classList.toggle('winter', S.m >= WINTER);
    R.mon.textContent = `${S.m}월`;
    [...R.months.children].forEach((s, i) => { s.classList.toggle('done', i + 1 < S.m); s.classList.toggle('now', i + 1 === S.m); });
    setDay((S.m - 1) * 30);
  }
  // 4차: 버틴 날은 카드 한 장 = 한 달 = 30일로 한 번에 바꾼다(0 · 30 · 60 … 330, 1년 버티면 365).
  //  전에는 0.52초 동안 숫자를 세며 올라가 넘긴 직후 화면에 0일 → 3일 → 44일처럼 들쭉날쭉한 중간값이 찍혔다(4차 검수)
  function setDay(n) {
    if (R.dayN === n && R.day.textContent) return;
    R.dayN = n; R.day.textContent = `${n}일`;
    if (!reduce && n) R.day.animate([{ transform: 'scale(1.3)', color: '#fff' }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  }
  // 밑에 깔린 카드를 위로 올려 뒤집고, 그 밑에 다음 달 카드를 깐다
  function deal(first) {
    const c = S.deck[S.m - 1];
    let top = R.deck.querySelector('.card.under');
    if (!top) { top = cardEl(c, S.m, true); R.deck.append(top); void top.offsetWidth; }
    top.classList.remove('under'); top.tabIndex = 0; top.removeAttribute('aria-hidden'); top.setAttribute('aria-label', `${S.m}월 카드. ${c.q} 왼쪽: ${c.L[0]}. 오른쪽: ${c.R[0]}.`);
    // 수첩: 단서를 적어 둔 판이면 「이 행성」 카드 그림 위에 규칙 한 줄(밑 카드는 단서보다 먼저 만들어지므로 올릴 때 붙인다)
    if (c.own && S.memo && !top.querySelector('.s-memo')) top.querySelector('.art').append(el('p', { class: 's-memo' }, el('b', {}, '수첩'), S.memo));
    snd('flip', first ? 0 : 0.05);
    if (S.m < 12) R.deck.prepend(cardEl(S.deck[S.m], S.m + 1, true));
    R.bl.replaceChildren(DI.ic('back'), c.L[0]); R.br.replaceChildren(c.R[0], DI.ic('arrow'));
    drag(top, c);
    if (first && !DC.store.get('seen_swipe', false)) teach(top, c);
  }

  // 처음 몇 초: 카드가 한 번만, 살짝(±8px·0.8도) 왼쪽·오른쪽으로 기울며 선택지와 예고 점을 보여 준 뒤 멈춘다.
  // 2차 검수: 전에는 ±52px로 4.2초마다 계속 흔들어 글을 못 읽고, 왼쪽으로 기울 때 카드 글자가 화면 밖으로 잘렸다
  let teachOn = false, teachT = 0;
  function teach(card, c) {
    const chip = el('p', { class: 's-teach' }, '← 카드를 밀어서 골라 →'); card.querySelector('.art').append(chip);
    if (reduce) return;
    teachOn = true;
    const seq = async () => { for (const d of [-1, 1, 0]) { if (!teachOn) return; card.style.transition = 'transform .45s cubic-bezier(.3,1.25,.5,1)'; card.style.transform = d ? `translateX(${d * 3}px) rotate(${d * 0.8}deg) scale(.965)` : ''; /* 3차: ±8px만 밀어도 아래 축 기울기와 합쳐 왼쪽 끝이 3px까지 나갔다 → 0.965배로 줄여 여백(20px) 안 */ showTag(card, c, d, d ? 1 : 0); hint(d, c); await wait(d ? 1100 : 300); } };
    teachT = setTimeout(seq, 900);
  }
  function stopTeach() {
    if (!teachOn && !document.querySelector('.s-teach')) return;
    teachOn = false; clearTimeout(teachT); document.querySelector('.s-teach')?.remove(); DC.store.set('seen_swipe', true);
  }

  const setT = (card, dx, dy, s = 1) => { card.style.transform = `translate(${dx}px, ${dy * 0.22 + Math.abs(dx) * 0.05}px) rotate(${dx * 0.055}deg) scale(${s})`; };
  // 넘기는 쪽 선택지 이름표: 따라오는 쪽 모서리에 붙여 화면 밖으로 안 나가게
  function showTag(card, c, side, op, armed = false) {
    const tag = card.querySelector('.tag'); if (!tag) return;
    if (side) { tag.textContent = side < 0 ? `← ${c.L[0]}` : `${c.R[0]} →`; tag.className = 'tag ' + (side > 0 ? 'left' : 'right') + (armed ? ' armed' : ''); }
    tag.style.opacity = side ? op : 0; card.style.setProperty('--dim', side ? (op * 0.4).toFixed(2) : 0);
  }
  // 바뀔 게이지 예고: 바뀌는 양만큼 점 1~3개 + 그 게이지 테두리. 오를지 내릴지는 숨긴다(Reigns 방식).
  // 2차 검수: 전에는 10px 점 하나(크기 2단계)라 얼마나 바뀌는지, 무슨 뜻인지 첫 판에 몰랐다 → 아래 안내 줄이 예고 중에 뜻을 말해 준다
  function hint(dir, c) {
    const fx = (dir < 0 ? c?.L[2] : dir > 0 ? c?.R[2] : null) || {};
    for (const [k] of GAUGES) { const v = Math.min(3, Math.abs(fx[k] || 0)), on = !!(dir && v), pip = R.g[k].querySelector('.hint-pip'); pip.className = 'hint-pip' + (on ? ' n' + v : ''); pip.lastChild.textContent = on ? PIPW[v] : ''; R.g[k].classList.toggle('pv', on); }
    if (R.hintLine) { R.hintLine.textContent = dir ? HINT1 : HINT0; R.hintLine.classList.toggle('on', !!dir); }
  }

  function drag(card, c) {
    let x0 = null, y0 = 0, dx = 0, dy = 0, armed = 0, hist = [], raf = 0;
    const apply = () => {
      raf = 0; setT(card, dx, dy, 1.03);
      const side = Math.abs(dx) > 12 ? Math.sign(dx) : 0, a = Math.abs(dx) > TH ? Math.sign(dx) : 0;
      showTag(card, c, side, Math.min(1, (Math.abs(dx) - 12) / 50), !!a); hint(Math.abs(dx) > 22 ? side : 0, c);
      if (a !== armed) { armed = a; if (a) { snd('arm'); DC.buzz(6); } }
    };
    card.addEventListener('pointerdown', (e) => {
      if (busy || !S || S.over || card.classList.contains('gone')) return;
      stopTeach(); x0 = e.clientX; y0 = e.clientY; dx = dy = 0; armed = 0; hist = [[performance.now(), e.clientX]];
      try { card.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 등 캡처 불가 — 끌기는 그대로 동작 */ }
      card.classList.add('held'); card.style.transition = 'transform .08s ease-out'; setT(card, 0, 0, 1.03); showTag(card, c, 0, 0); hint(0, c); snd('grab');
    });
    card.addEventListener('pointermove', (e) => {
      if (x0 === null) return; dx = e.clientX - x0; dy = e.clientY - y0;
      const t = performance.now(); hist.push([t, e.clientX]); while (hist.length > 2 && t - hist[0][0] > 90) hist.shift();
      card.style.transition = 'none'; if (!raf) raf = requestAnimationFrame(apply);
    });
    const end = () => {
      if (x0 === null) return; x0 = null; card.classList.remove('held');
      const [t1, x1] = hist[0], [t2, x2] = hist[hist.length - 1], v = t2 > t1 ? (x2 - x1) / (t2 - t1) : 0; // 놓기 직전 속도(px/ms)
      if (Math.abs(dx) > TH || (Math.abs(v) > 0.55 && Math.abs(dx) > 28 && Math.sign(v) === Math.sign(dx))) return commit(Math.sign(dx), card, v);
      card.style.transition = 'transform .55s cubic-bezier(.3,1.7,.45,1)'; card.style.transform = ''; showTag(card, c, 0, 0); hint(0, c); armed = 0;
    };
    card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end);
  }

  let busy = false;
  function commit(dir, card = R?.deck.querySelector('.card:not(.under):not(.gone)'), v = 0) {
    if (busy || !S || S.over || !card) return; busy = true; // S.over: 끝 연출 중 또 누르면 점수가 두 번 들어가던 것(2026-11-20)
    stopTeach();
    const c = S.deck[S.m - 1], [, result, fx] = dir < 0 ? c.L : c.R;
    showTag(card, c, dir, 1, true); hint(0, c);
    // 4차: 12월 카드를 넘겨 1년을 버티는 순간 — 카드가 금빛으로 물들며 넘어간다(그 뒤 「365일」이 튄다)
    const gold = S.m === 12 && !stepRules(S.g, fx, S.m).dead;
    if (gold) { card.classList.add('golden'); snd('up'); }
    snd('whoosh'); DC.buzz(12);
    const from = getComputedStyle(card).transform, out = gold ? `translate(${dir * (innerWidth * 0.9 + 180)}px, -60px) rotate(${dir * 22}deg) scale(1.06)` : `translate(${dir * (innerWidth * 0.9 + 180)}px, 70px) rotate(${dir * 30}deg)`;
    card.classList.add('gone'); card.style.transition = 'none';
    const kf = from === 'none' ? [{ transform: 'none' }, { transform: `translate(${dir * 34}px, 2px) rotate(${dir * 3}deg) scale(1.03)`, offset: 0.3 }, { transform: out }] : [{ transform: from }, { transform: out }];
    const dur = gold ? 560 : from === 'none' ? 380 : Math.max(200, 320 - Math.min(2, Math.abs(v)) * 60);
    card.animate(kf, { duration: dur, easing: 'cubic-bezier(.45,0,.85,.5)', fill: 'forwards' }).finished.then(() => card.remove(), () => card.remove());
    setTimeout(() => apply(fx, result, card), from === 'none' ? 200 : 110);
  }

  function apply(fx, result) {
    const res = stepRules(S.g, fx, S.m); // 4차: 규칙 계산은 모의 실험과 같은 함수
    if (res.dead === 'rule') { busy = false; return finish('rule'); }
    if (fx.memo) S.memo = S.rule;
    const clamp = (o) => { const r = {}; for (const k of KEYS) r[k] = Math.max(0, Math.min(GMAX, o[k])); return r; };
    const prev = { ...S.g }, afterChoice = clamp(res.after), upkeep = res.up;
    const hurt = KEYS.some(k => (fx[k] || 0) < 0);
    S.g = clamp(res.fin);
    S.trail.push(hurt ? '🟨' : '🟩');
    // 결과 한 줄
    R.note.textContent = result || ''; R.note.classList.remove('in', 'first'); void R.note.offsetWidth; R.note.classList.add('in');
    // 게이지: 선택 결과 먼저, 달마다 먹는 몫은 조금 뒤에 따로(무엇 때문에 줄었는지 보이게)
    setGauges(prev, afterChoice, fx);
    let ups = 0, downs = 0; for (const [k] of GAUGES) { const d = afterChoice[k] - prev[k]; if (d > 0) ups++; if (d < 0) downs++; }
    if (downs || /X$/.test(res.dead)) { snd('down'); DC.shake(R.hud, 0.7); layer('hit'); DC.buzz(30); } else if (ups) { snd('up'); layer('heal'); }
    const lastWin = S.m === 12 && !res.dead; // 1년을 버틴 순간엔 「−1 먹음」 숫자가 「365일」 장면 위로 튀지 않게(값은 그대로 반영)
    if (Object.keys(upkeep).length && !lastWin) setTimeout(() => { setGauges(afterChoice, { ...S.g }, upkeep, '먹음'); snd('eat'); }, 420);
    if (res.dead) return setTimeout(() => { busy = false; finish(res.dead); }, 760);
    const near = (g) => KEYS.some(k => g[k] <= 2 || g[k] >= GMAX - 2);
    if (near(S.g) && !near(prev)) snd('beat', 0.5);
    S.m += 1; S.note = result;
    if (S.m > 12) { busy = false; setDay(365); R.day.classList.add('gold'); return finish('win'); } // 3차: 전에는 0.52초 더 기다려 카드 없는 빈 판이 0.55초 + 엔딩 판이 뜨기까지 입력 무반응 — 카드가 날아가는 동안 바로 성공 장면
    updMonth(); deal(false);
    if (S.m === WINTER) winter();
    setTimeout(() => { busy = false; }, 260);
  }
  // 게이지를 움직여서 바꾼다: 막대가 차오르거나 깎이고(깎인 몫은 흰 잔상이 늦게 따라옴) · 숫자가 튀고 · 입자가 터진다
  function setGauges(from, to, fx, label) {
    for (const [k] of GAUGES) {
      const g = R.g[k], d = to[k] - from[k];
      g.querySelector('.bar i').style.width = `${to[k] * 10}%`;
      const ghost = g.querySelector('.bar b');
      if (d < 0) { ghost.style.transition = 'none'; ghost.style.width = `${from[k] * 10}%`; void ghost.offsetWidth; ghost.style.transition = ''; ghost.style.width = `${to[k] * 10}%`; } else ghost.style.width = `${to[k] * 10}%`;
      g.classList.toggle('danger', to[k] <= 2 || to[k] >= GMAX - 2); // 4차: 꽉 차도 끝이라 8 이상도 위험
      g.classList.toggle('hi', to[k] >= GMAX - 2);
      if (!d) continue;
      const gv = g.querySelector('.gv'); gv.textContent = to[k];
      g.classList.remove('up', 'down', 'flash'); void g.offsetWidth; g.classList.add(d > 0 ? 'up' : 'down', 'flash'); clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove('up', 'down', 'flash'), 700);
      gv.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2,1.4,.4,1)' });
      const r = g.querySelector('.bar').getBoundingClientRect(), x = r.left + r.width * (to[k] / 10), y = r.top + r.height / 2;
      const p = el('span', { class: 's-pop ' + (d > 0 ? 'up' : 'down'), style: `left:${r.left + r.width / 2}px;top:${r.top - 14}px` }, (d > 0 ? '+' : '−') + Math.abs(d), label ? el('small', {}, label) : null);
      document.body.append(p); setTimeout(() => p.remove(), 1150);
      const col = getComputedStyle(g).getPropertyValue('--c').trim() || '#fff';
      FX.burst(x, y, d > 0 ? 10 + d * 4 : 8 + Math.abs(d) * 5, d > 0 ? [col, '#ffffff'] : [col, '#ff5a6e', '#2a0a10'], d > 0 ? { speed: 170, g: -60, life: 0.7, size: 2.6 } : { speed: 240, g: 700, life: 0.8, size: 3, angle: Math.PI / 2, spread: Math.PI * 1.4 });
    }
  }
  function winter() {
    snd('winter');
    const b = el('div', { class: 's-banner', role: 'status' }, el('b', {}, `${WINTER}월 · 겨울이 왔어`), el('small', {}, '이제 매달 식량 −1'));
    R.deck.append(b); setTimeout(() => b.remove(), 2300);
    if (!reduce) FX.burst(innerWidth / 2, R.deck.getBoundingClientRect().top + 40, 40, ['#ffffff', '#cfe6ff'], { speed: 120, g: 60, drag: 0.6, life: 2.2, size: 2.2, angle: Math.PI / 2, spread: Math.PI * 2 });
  }
  // 끝나는 순간 한 장면: 판이 잿빛으로 식고 · 붉은 빛이 조여 오고 · 엔딩 이름이 내려꽂힌다(1.8초, 누르면 바로 넘어감)
  function deathScene(kind, title, sub, then, fresh = false) {
    let done = false; const go = () => { if (done) return; done = true; ov.remove(); layer(''); then(); };
    const win = kind === 'win';
    if (win) { layer('gold'); }
    else {
      layer('doom'); snd('doom'); R?.box.classList.add('dying');
      const hi = /X$/.test(kind), g = R?.g[kind.replace(/X$/, '')]; // 넘침 엔딩은 막대 오른쪽 끝에서 터진다
      if (g) { const r = g.querySelector('.bar').getBoundingClientRect(); FX.burst(hi ? r.right - 6 : r.left + 6, r.top, 46, ['#ff5a6e', '#ffffff', '#5a0010'], { speed: 320, g: 420, life: 1.1, size: 3.4, spread: Math.PI * 2 }); }
    }
    // 엔딩 카드: 그 엔딩의 그림 + 이름 + 한 줄. 뒤 판을 어둡게 덮어 밑 카드(행성 그림)가 글자와 겹치지 않게 하고,
    // 「누르면 결과로」는 화면 맨 아래에 따로 둔다(2차 검수: 전에는 밑 카드 행성 그림 위에 겹쳐 찍혔다)
    const got = new Set(DC.endings.got('survive')), keys = endingKeys(S.id), n = keys.filter(k => got.has(`${S.id}:${k}`)).length;
    // 4차 검수 「성공 순간 연출이 거의 없이 끝 화면」 → 성공은 그림 카드 대신 「365일」 숫자 한 방: 330일에서 세어 올라가 365에서 내려꽂히며 금빛 입자·색종이
    const big = win ? el('b', { class: 's-365' }, reduce ? '365' : '330', el('small', {}, '일')) : null;
    const ov = el('div', { class: 's-over' + (win ? ' win' : ''), role: 'alert', onclick: () => go() },
      el('div', {}, el('small', {}, `${win ? '12달 생존' : fresh ? '새 엔딩' : '엔딩'} · 모은 엔딩 ${n} / ${keys.length}`), win ? big : artEl(S.id, kind, 'big', { px: Math.min(innerWidth * 0.74, 300) }), el('h3', {}, title), el('p', {}, sub)),
      el('em', {}, '누르면 결과로'));
    document.body.append(ov);
    if (win && !reduce) {
      const num = big.firstChild, t0 = performance.now() + 330;
      const tick = (t) => { if (done) return; const k = Math.max(0, Math.min(1, (t - t0) / 380)); num.textContent = String(Math.round(330 + 35 * (1 - (1 - k) ** 2)));
        if (k < 1) return requestAnimationFrame(tick);
        big.classList.add('hit'); snd('sparkle'); DC.buzz([20, 40, 60]);
        const r = big.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 70, ['#ffd66b', '#fff1c4', '#ffffff'], { speed: 420, g: 260, life: 1.2, size: 3.2, spread: Math.PI * 2 }); FX.confetti(); };
      requestAnimationFrame(tick);
    } else if (win) FX.confetti();
    setTimeout(go, reduce ? 900 : win ? 2300 : 3000); // 3차: 성공은 2.8 → 2.3초(누르거나 키를 누르면 바로)
  }

  // ── 끝 ──
  function finish(kind) {
    if (S.over) return; S.over = true;
    // 4차: 버틴 날도 달 단위와 맞춘다 — n월 카드에서 끝나면 그 달 중간((n−1)×30+15일). 전에는 그 달 안에서 5~29일을 무작위로 더했다
    const days = kind === 'win' ? 365 : (S.m - 1) * 30 + 15;
    const [title, sub] = END(S.id)[kind];
    const fresh = DC.endings.add('survive', `${S.id}:${kind}`, title);
    if (kind !== 'win') S.trail.push('🟥');
    const best = DC.store.get('best_survive', null);
    if (!best || days > best.days) DC.store.set('best_survive', { name: S.meta.name, days });
    window.DP?.event('play', { game: 'survive', score: days }); // 레벨·코인·미션(dwk-prog.js)
    if (S.daily && !S.practice) DC.store.set('daily_' + DC.today(), { days, kind }); // 오늘의 기록은 그날 첫 판(모두 같은 문제)만
    const story = kind === 'rule' ? S.p.ruleText : kind === 'win' ? S.p.win
      : STORY[kind] || (S.id.startsWith('2') ? '이 행성의 소리가 머릿속에서 멈추지 않았어.' : '혼잣말이 늘었어. 어느 날부터 대답하는 목소리가 들렸어.');
    const box = $('#stage');
    const prevBest = best ? best.days : 0, isBest = days > prevBest;
    let drawn = null; const ensureCard = () => drawn || (drawn = drawCard(days, kind, title));
    const go = () => {
      box.replaceChildren(); box.classList.add('gx-wide');
      // 3차: 위쪽 그림 칸의 상한 = 원본(720px)을 넘지 않는 크기(장치 배율 2 → 360px, 최소 300px). 폭·화면 회전은 survive.css가 이 상한 안에서 맞춘다
      const ahmax = Math.round(Math.max(300, SRC_SCENE / (devicePixelRatio || 1)));
      // 3차: 「다시」「결과 공유」를 끝 화면 글 바로 아래로(전에는 엔딩 줄·기록 줄 밑이라 폰 첫 화면 아래 844~902px로 잘렸다)
      const acts = el('div', { class: 'gx-acts s-endacts' },
        el('button', { class: 'gx-btn main', type: 'button', onclick: () => start(S.id, S.daily) }, '다시', el('i')),
        el('button', { class: 'gx-btn', type: 'button', onclick: async () => { await ensureCard(); share(days, kind, title); } }, '결과 공유'),
        S.daily && !S.practice ? el('button', { class: 'gx-txt', type: 'button', onclick: () => copyDaily(days) }, '결과 줄 복사') : null);
      const sec = el('section', { class: 'end ' + (kind === 'win' ? 'win' : 'lose'), style: `--ahmax:${ahmax}px` },
          artEl(S.id, kind, 's-endart', { full: true, px: ahmax }),
          el('p', { class: 'gx-eyebrow' }, el('span', {}, '끝'), `${S.meta.name}${S.daily ? (S.practice ? ' · 오늘의 행성 다시' : ' · 오늘의 행성') : ''}`),
          el('h2', {}, kind === 'win' ? '1년 생존' : `${days}일째, 끝`),
          el('p', { class: 'ending' + (fresh ? ' new' : '') }, fresh ? '새 엔딩 · ' : '엔딩 · ', title),
          el('p', { class: 'story' }, story),
          kind === 'rule' ? el('p', { class: 'rule' }, `생존 규칙: ${S.rule || '영상에서 확인'}`) : null,
          acts,
          kind === 'rule' ? el('p', { class: 's-memo-note' }, S.memo ? '수첩에 적어 둔 규칙이었어.' : '2월 단서 카드에서 「수첩에 적어 둔다」를 고르면, 「이 행성」 카드마다 이 규칙이 수첩으로 떠.') : null,
          collection(kind, fresh),
          el('p', { class: 'trail', 'aria-label': '달마다 결과' }, S.trail.map(DI.sq)));
      box.append(
        sec,
        el('div', { class: 'gx-endwrap' }, el('div', { class: 's-endgrid' },
          el('div', { class: 'gx-end' },
            el('dl', { class: 'gx-rows' },
              el('div', {}, el('dt', {}, '이번 생존'), el('dd', {}, `${days}일`)),
              el('div', {}, el('dt', {}, '내 최장 생존'), el('dd', {}, isBest ? `${days}일 · 새 기록` : `${prevBest}일`))),
            DC.rewards.has('planet-2-3') ? null : el('p', { class: 'gx-note' }, '결과 카드를 공유하거나 저장하면 숨은 행성이 열려.'),
            el('ul', { class: 'gx-rows', 'aria-label': '다른 곳으로' },
              el('li', {}, el('button', { type: 'button', onclick: home }, '다른 행성 고르기')),
              el('li', {}, el('button', { type: 'button', onclick: dex }, '엔딩 도감')),
              el('li', {}, el('a', { href: 'land.html' }, '다음 게임 · 행성 착륙', el('small', {}, '탭 한 번 원버튼'))),
              el('li', {}, el('a', { href: 'arcade.html' }, '게임 전부 보기')),
              el('li', {}, el('a', { href: 'start.html' }, '입구로'))),
            DC.followCta(),
            el('p', { class: 'gx-note' }, '제일 오래 버틴 사람은 「명예 생존자」로 다음 영상에 별명이 나와 — 결과 화면을 캡처해 DM으로 보내 줘.')),
          el('canvas', { id: 'card', width: 1080, height: 1350, class: 'gx-preview', 'aria-label': '공유할 결과 카드' }))));
      FX.under(sec); // 남은 색종이는 끝 화면 그림 위·글자 뒤에서 마저 떨어진다
      // 공유 카드(1080×1350 캔버스)는 화면 가까이 왔을 때·한가할 때·「결과 공유」를 누를 때 중 먼저 오는 때 한 번 그린다
      //  4차 실측: 끝 화면 0.45초 뒤에 그리면 색종이가 떨어지는 중에 50~100ms 한 프레임이 끊겼다(3차판도 같음)
      const cv = $('#card');
      if (cv && 'IntersectionObserver' in window) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); ensureCard(); } }, { rootMargin: '240px' }).observe(cv);
      setTimeout(() => (window.requestIdleCallback || ((f) => f()))(() => ensureCard(), { timeout: 1500 }), 2600); // 색종이가 다 떨어진 뒤
      scrollTo(0, 0);
    };
    if (kind === 'win') { DC.sfx('win'); DC.buzz([30, 60, 30]); }
    else { DC.sfx('die'); DC.buzz(120); DC.shake(box, 1.6); }
    deathScene(kind, title, kind === 'win' ? '12달을 끝까지 버텼어.' : story, go, !!fresh);
  }

  // 엔딩 카드 줄(Reigns식 수집): 모은 엔딩은 그림 카드 + 이름, 못 모은 것은 가려진 ? 카드, 방금 얻은 것은 흰 테두리로 튄다
  const endCards = (id, got, kind, fresh) => {
    const E = END(id), keys = endingKeys(id);
    return el('div', { class: 's-col', style: `--n:${Math.min(4, keys.length)}` }, keys.map(k => got.has(`${id}:${k}`)
      ? el('div', { class: 's-cc got' + (k === kind ? ' now' : '') + (k === kind && fresh ? ' new' : ''), title: E[k][0] }, artEl(id, k), el('span', {}, E[k][0]))
      : el('div', { class: 's-cc', title: '아직 못 본 엔딩' }, el('div', { class: 's-art lock' }, el('b', {}, '?')), el('span', {}, '???'))));
  };
  function collection(kind, fresh) {
    const got = new Set(DC.endings.got('survive')), keys = endingKeys(S.id), n = keys.filter(k => got.has(`${S.id}:${k}`)).length;
    return el('div', {}, el('p', { class: 's-colh' }, `이 행성 엔딩 ${n} / ${keys.length}`), endCards(S.id, got, kind, fresh));
  }

  async function drawCard(days, kind, title) {
    await DC.fonts();
    const c = $('#card'); if (!c) return; const x = c.getContext('2d'), W = 1080, H = 1350;
    const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = DC.scene(S.id, 'a'); });
    x.fillStyle = '#05060d'; x.fillRect(0, 0, W, H);
    if (img) { x.drawImage(img, 0, 0, W, W); const g = x.createLinearGradient(0, W * 0.45, 0, W); g.addColorStop(0, 'rgba(5,6,13,0)'); g.addColorStop(1, 'rgba(5,6,13,1)'); x.fillStyle = g; x.fillRect(0, 0, W, W); }
    x.textAlign = 'center';
    x.fillStyle = 'rgba(240,240,250,.72)'; x.font = '500 34px \"Pretendard Variable\", sans-serif'; x.fillText(S.daily ? `오늘의 행성 · ${DC.today()}` : '행성에서 1년 버티기', W / 2, 90);
    x.fillStyle = '#f4f1ea'; x.font = '800 64px \"Pretendard Variable\", sans-serif'; x.fillText(`${S.p.icon} ${S.meta.name}`, W / 2, 900);
    x.fillStyle = '#f0f0fa'; x.font = '800 130px \"Pretendard Variable\", sans-serif'; x.fillText(kind === 'win' ? '365일 생존' : `${days}일 생존`, W / 2, 1050);
    x.fillStyle = '#a9a7b8'; x.font = '500 40px Pretendard Variable'; x.fillText(kind === 'win' ? '1년을 버텼다' : '사인: ??? (영상에서 확인)', W / 2, 1125);
    x.font = '46px sans-serif'; x.fillText(S.trail.join(''), W / 2, 1200);
    x.fillStyle = '#f4f1ea'; x.font = '800 40px Pretendard Variable'; x.fillText(`@${D.site.handle}${seat ? ` · 좌석 ${seat}` : ''}`, W / 2, 1290);
  }
  async function share(days, kind) {
    const r = await DC.shareCanvas($('#card'), `돈워너노우_${S.meta.name}_${days}일.png`, `나는 ${S.meta.name} 행성에서 ${days}일 버텼어. 너는? @${D.site.handle}`);
    if (r === 'shared' || r === 'saved') DC.rewards.add('planet-2-3', '숨은 행성 하얀 숲', '결과 카드');
  }
  async function copyDaily(days) {
    const t = `돈워너노우 오늘의 행성 ${DC.today()}\n${S.p.icon} ${S.meta.name} ${days}일\n${S.trail.join('')}`;
    try { await navigator.clipboard.writeText(t); DC.toast('복사했어'); } catch { window.prompt('길게 눌러 복사해', t); }
  }

  // ── 엔딩 도감 ──
  function dex() {
    const main = $('#stage'); main.replaceChildren(); main.classList.remove('gx-wide');
    const box = el('div', { class: 'gx-end' }); main.append(box);
    const got = new Set(DC.endings.got('survive'));
    box.append(el('p', { class: 'gx-eyebrow' }, el('span', {}, '도감'), '행성 생존'), el('h1', { class: 'gx-h1' }, '모든 끝을 모아 봐'),
      el('p', { class: 'gx-sub' }, '행성마다 끝나는 방법이 여러 개야. 숨은 규칙 엔딩은 영상에 힌트가 있어.'));
    for (const p of playable()) {
      const n = endingKeys(p.id).filter(k => got.has(`${p.id}:${k}`)).length;
      box.append(el('div', { class: 'dex-ep' }, el('h3', {}, el('span', { class: 'mini-orb', style: `background-image:url(${p.img})` }), p.name, el('small', { class: 's-dexn' }, `${n} / ${endingKeys(p.id).length}`)),
        endCards(p.id, got)));
    }
    box.append(el('div', { class: 'gx-acts' }, el('button', { class: 'gx-btn', type: 'button', onclick: home }, '돌아가기')));
    scrollTo(0, 0);
  }

  // 4차 모의 실험: ?sim=1 일 때만 판과 같은 규칙 함수(makeDeck·stepRules)로 판을 돌려 본다(화면·저장 없음)
  if (params.get('sim') === '1') window.SURVIVE_SIM = {
    ids: Object.keys(P),
    run(id, strat, seed) {
      rand = DC.rng(seed); const deck = makeDeck(id, P[id].rule); let g = { hp: GSTART, food: GSTART, mind: GSTART }; const imgs = deck.map(c => c.img).join('');
      const margin = (x) => Math.min(...KEYS.map(k => Math.min(x[k], GMAX - x[k])));
      for (let m = 1; m <= 12; m++) {
        const c = deck[m - 1]; let pick;
        if (strat === 'L') pick = c.L; else if (strat === 'R') pick = c.R;
        else if (strat === 'rand') pick = rand() < 0.5 ? c.L : c.R;
        else if (strat === 'randsafe') { pick = rand() < 0.5 ? c.L : c.R; if (pick[2].trap) pick = pick === c.L ? c.R : c.L; }
        else { let bs = -1e9; for (const o of [c.L, c.R]) { if (o[2].trap) continue; const r = stepRules(g, o[2], m), sc = r.dead ? -50 : margin(r.fin) + rand() * 0.01; if (sc > bs) { bs = sc; pick = o; } } }
        const r = stepRules(g, pick[2], m); if (r.dead) return { end: r.dead, m, imgs }; g = r.fin;
      }
      return { end: 'win', m: 12, imgs };
    },
    // 화면 판에서 지금 카드의 고를 쪽(0 = 왼쪽 단추, 1 = 오른쪽): 'smart' = 함정 피하고 끝에서 가장 먼 쪽 · 'max:식량키' = 그 게이지를 더 올리는 쪽
    choose(how) {
      const c = S?.deck[S.m - 1]; if (!c) return -1; const o = [c.L, c.R];
      if (how.startsWith('max:')) { const k = how.slice(4); return (o[1][2][k] || 0) > (o[0][2][k] || 0) ? 1 : 0; }
      const sc = o.map(x => { if (x[2].trap) return -1e9; const r = stepRules(S.g, x[2], S.m); return r.dead ? -50 : Math.min(...KEYS.map(k => Math.min(r.fin[k], GMAX - r.fin[k]))); });
      return sc[1] > sc[0] ? 1 : 0;
    },
    imgs: () => S?.deck.map(c => c.img).join(''),
  };
  addEventListener('keydown', (e) => { const ov = document.querySelector('.s-over'); if (ov && /^(Enter| |Escape|ArrowLeft|ArrowRight)$/.test(e.key)) { e.preventDefault(); ov.click(); return; } });
  addEventListener('keydown', (e) => { if (!S || S.over || !document.querySelector('.s-play')) return; if (e.key === 'ArrowLeft') { e.preventDefault(); commit(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); commit(1); } });
  DI.sound(document.getElementById('snd'));
  // 「내 땅」(settle.html)에서 오면 그 행성으로 바로 시작(2026-11-28 미니게임 「행성 섞기」) — 카드 묶음이 있는 행성만
  const want = (params.get('planet') || '').replace(/[^0-9a-z-]/g, '');
  if (want && P[want] && unlocked(want) && DC.planet(want)) start(want, false);
  else if (params.get('daily') === '1') { const d = dailyPlanet(); if (d) start(d.id, true); else home(); } // 게임 목록의 「오늘의 행성」 줄에서 바로
  else home();
})();
