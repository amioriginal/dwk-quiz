// 돈워너노우 행성 작업실 — 데이터 (편이 나올 때마다 여기에 한 묶음 추가)
// 출처: reports/급성장카피_20261117/제작 대본(src3 timeline3.js · src6 대본_p2.md · src7 대본_p3.md · src8 대본_p4.md)
// 규칙(spoiler)은 화면에서 「스포 보기」를 눌러야만 보인다.
window.DWK = {
  site: {
    name: '돈워너노우',
    tagline: '행성 하나 골라. 여기서 1년 버텨야 해.',
    handle: 'dontwannaknow.kr',
    links: {
      instagram: 'https://www.instagram.com/dontwannaknow.kr/',
      youtube: 'https://www.youtube.com/@dontwannaknow_kr',
      tiktok: 'https://www.tiktok.com/@dontwannaknow.kr',
      facebook: 'https://www.facebook.com/dontwannaknow.kr', // 11-28 그래프 API me → 페이지 1544119852107589 · username dontwannaknow.kr
      kakao: null,        // 카톡 공지방: 대표가 개설하면 주소를 넣는다
      submitForm: null,   // v1: 구글 폼 주소(만 14세 확인 문항 포함)를 넣으면 제출함에 버튼이 생긴다
      feedbackForm: null, // 게임 테스트 제보 양식 주소. 비어 있으면 「복사하고 DM으로 보내기」
    },
    ads: false,           // 애드센스 승인 뒤 true
    // 최신 영상 창구(2026-11-28 · 대표 「업데이트 영상 올리면 바로바로 해야할거 아니니」) — 유튜브 공개 RSS 를 Cloudflare 워커(backend/feed)가 JSON으로.
    //   입구 맨 위 「새 편」 줄이 이걸 읽는다 → 영상만 올리면 data.js 를 안 고쳐도 몇 분 안에 바뀐다. match = 「새 편」으로 칠 제목(정규식 · 맞는 게 없으면 맨 최신)
    //   창구가 안 열리면 아래 episodes[0] 으로 그대로 보인다.
    feed: { url: 'https://dwk-feed.dwk-plaza.workers.dev/feed', match: '^행성 ' },
    // 행성 신청(2026-11-28 · 대표 「그냥 행성 신청 이런거로 하던가」) — 서버 = world.backend(Supabase dwk-plaza)의 apply_planet · planet_apps_board · planet_apps_mine.
    //   false 로 두면 서버에 안 보내고 예전처럼 「댓글 문구 복사」로만 받는다.
    apply: true,
  },
  // 편 목록 — 최신 편이 맨 위. ★게시된 편만 넣는다(2026-11-21 · 미게시 「남자만/여자만」 4편이 떠 있던 것 정정 · 대표 「올리지 않은 릴스가 4편이라고 보여지고」)
  // 수능편 행성 id는 9-N(타운 코드가 숫자 id만 읽어서 · 화면엔 안 보임).
  // picks = 그 편 댓글에서 「N번」을 분명히 고른 시청자 수(사람 단위 · 실측). say = 그 번호를 고른 댓글 중 좋아요가 가장 많은 것(아이디 빼고 원문).
  // 출처: ../돈워너노우_캐러셀전략_20261119/다음캐러셀_근거/댓글_전수분석.md(11-20) · 6편은 공식 API 댓글 44개를 11-21에 셈(../돈워너노우_무료게임레퍼런스_20261121/ep06_comments_20261121.json)
  picksAsOf: '11-21',
  episodes: [
    {
      no: 6, label: '6편', title: '드림코어 행성', mood: '공포+감동',
      links: { instagram: 'https://www.instagram.com/reel/Df9yVdSqsjV/' },
      planets: [
        { id: '6-1', name: '미러볼 행성', img: 'img/p06_1.jpg', pitch: '거울 조각 하나하나가 전부 문이야.\n열면 가고 싶던 곳 어디든 나와.', rule: '노크하는 문은 절대 열지 마.', picks: 1, say: { t: '1번 노크하는문에 똑같이 노크해주면 어케됌??', likes: 1 } },
        { id: '6-2', name: '브라운관 TV 행성', img: 'img/p06_2.jpg', pitch: '화면 속 오래된 거실 소파에서\n하루 종일 만화를 봐.', rule: '그 방송에선 절대 눈을 마주치지 마.', picks: 0 },
        { id: '6-3', name: '다이얼 전화기 행성', img: 'img/p06_3.jpg', pitch: '해가 지지 않는 놀이터.\n그네도 미끄럼틀도 전부 네 차지야.', rule: '전화벨이 울려도 절대 받지 마.', picks: 0 },
        { id: '6-4', name: '스노우볼 행성', img: 'img/p06_4.jpg', pitch: '무지개 아래로 눈이 천천히 내려.\n언덕 위 작은 집엔 아이가 하나 살아.', rule: '그 아이 앞에선 절대 울지 마.', picks: 8, say: { t: '이번엔 4번 이번에도 성공한거같네용', likes: 2 } },
      ],
    },
    {
      no: 5, label: '5편', title: '동물 행성', mood: '반전+감동',
      links: { instagram: 'https://www.instagram.com/reel/Df8jHbHlaqL/' },
      planets: [
        { id: '5-1', name: '카피바라 행성', img: 'img/p05_1.jpg', pitch: '카피바라 등 위 작은 나무집.\n하루 종일 유자 띄운 온천이야.', rule: '유자는 절대 다 먹지 마.', picks: 0 },
        { id: '5-2', name: '뚱냥이 행성', img: 'img/p05_2.jpg', pitch: '식빵 자세로 잠든 뚱냥이.\n털은 언제나 따뜻하고 푹신해.', rule: '고양이가 깨어 있으면 절대 움직이지 마.', picks: 2, say: { t: '뚱냥이 골랐는데…그럼 최소 8시간을 돌이 되어야한단 거잖아요…😱🙀', likes: 58 } },
        { id: '5-3', name: '푸바오 행성', img: 'img/p05_3.jpg', pitch: '대나무를 안고 잠든 푸바오.\n하루 대부분을 대나무만 먹어.', rule: null, picks: 2, say: { t: '저는 푸바오요. 너무 슬프다 바오야..', likes: 8 } },
        { id: '5-4', name: '부캉이 행성', img: 'img/p05_4.jpg', pitch: '몸을 만 거대한 상어, 부캉이.\n이빨이 무서워서 다들 안 골라.', rule: '무서워도 도망치지 마.', picks: 3, say: { t: '마지막 두 개에서 왜 감성 공격 하세요 고양이 포기하고 부캉이한테 갈게요...', likes: 411 } },
      ],
    },
    {
      no: '수능', label: '수능 특별편', title: '수능 행성', mood: '반전+위로',
      links: { instagram: 'https://www.instagram.com/reel/Df7HvZsCki5/' },
      planets: [
        { id: '9-1', name: '수능 없는 행성', img: 'img/psn_1.jpg', pitch: '학원도, 야자도, 문제집도 없어.\n너는 바닷가 앞 작은 집에 살아.', rule: '여기선 절대 아프지 마.', picks: 2, say: { t: '1번 선택했다가 후회중 ㅠㅠㅠ', likes: 102 } },
        { id: '9-2', name: '매일 수능 행성', img: 'img/psn_2.jpg', pitch: '1년 내내 매일이 수능날.\n수험표만 보여 주면 어디서든 다 공짜야.', rule: '듣기 시간엔 재채기도 참아.', picks: 1, say: { t: '2번골랐다가 차피 내년에 3번이라고 생각하니까 슬프네요 ㅠㅠ', likes: 0 } },
        { id: '9-3', name: '수능 한 번 행성', img: 'img/psn_3.jpg', pitch: '수능은 평생 딱 한 번.\n나머지는 그냥 살면 돼.', rule: null, picks: 2, say: { t: '3번 했는데 드디어 가장 안전한게 후..', likes: 13 } },
      ],
    },
    {
      no: 3, label: '3편', title: '디저트 · 물방울 · 구름 행성', mood: '힐링',
      links: { instagram: 'https://www.instagram.com/reel/Df4w8_uK-mr/' },
      planets: [
        { id: '3-1', name: '디저트 행성', img: 'img/p03_1.jpg', pitch: '이 행성은 땅이 전부\n달콤한 디저트야.', rule: '단 건 한 입도 먹지 마.', picks: 1, say: { t: '1번 진짜 살고싶음 ㅜㅜㅠ', likes: 0 } },
        { id: '3-2', name: '물방울 행성', img: 'img/p03_2.jpg', pitch: '속이 다 비치는 물방울 안,\n고래가 헤엄쳐.', rule: '보름달이 뜨면 숨을 크게 들이마셔.', picks: 13, say: { t: '2번 또 했는데 이정도면 괜찮은데 3번할껄 그랬다..', likes: 610 } },
        { id: '3-3', name: '구름 행성', img: 'img/p03_3.jpg', pitch: '털이 구름처럼 부푼\n잠든 양 위에 마을이 있어.', rule: '여기선 절대 코 골지 마.', picks: 28, say: { t: '3번 양!!', likes: 110 } },
      ],
    },
    {
      no: 2, label: '2편', title: '공포 행성 3개', mood: '공포',
      links: {
        instagram: 'https://www.instagram.com/reel/Df4BPxjqxp8/',
        tiktok: 'https://www.tiktok.com/@dontwannaknow.kr/video/7709536281277009158',
      },
      planets: [
        { id: '2-1', name: '호수 행성', img: 'img/p02_1.jpg', pitch: '끝없는 하얀 평원 한가운데\n동그랗고 파란 호수가 있어.', rule: '호수랑 눈 마주치지 마.', picks: 5, say: { t: '1번이 젤 나은 듯?', likes: 770 } },
        { id: '2-2', name: '하얀 산맥 행성', img: 'img/p02_2.jpg', pitch: '하얀 산맥 사이 골짜기는\n늘 따뜻하고 촉촉해.', rule: '땅이 숨 쉬면 산맥 밖으로 뛰어.', picks: 4, say: { t: '2번이 제일 낫네', likes: 441 } },
        { id: '2-3', name: '하얀 숲 행성', img: 'img/p02_3.jpg', pitch: '하얀 나무가 자라는 조용한 숲.\n가지는 딱 다섯 개씩.', rule: '숲이 손을 흔들면 절대 흔들어 주지 마.', picks: 5, say: { t: '나루타루 엔딩이 3번 행성임', likes: 3 } },
      ],
    },
    {
      no: 1, label: '1편', title: '해바라기 · 온천 · 쇼핑몰 · 반딧불 호수', mood: '힐링+반전',
      links: {
        instagram: 'https://www.instagram.com/reel/Df2ICK7qoBL/',
        youtube: 'https://youtube.com/shorts/OtKTe2KyvwM',
        tiktok: 'https://www.tiktok.com/@dontwannaknow.kr/video/7709154664293338388',
      },
      planets: [
        { id: '1-1', name: '해바라기 행성', img: 'img/p01_1.jpg', pitch: '끝없는 해바라기 밭.\n언제나 여름이야.', rule: '절대 불 켜 두지 마.', picks: 4, say: { t: '반딧불이가 따라오면 진짜 별로인데 차라리 1번이 좋음.', likes: 11 } },
        { id: '1-2', name: '온천 행성', img: 'img/p01_2.jpg', pitch: '온천이 가득한 눈 덮인 산.\n물은 언제나 40도.', rule: '물이 빠지면 당장 나와.', picks: 5, say: { t: '저는 2 온천..온천 그냥 안 들어가고 집 안에만 있으면 됨', likes: 86 } },
        { id: '1-3', name: '쇼핑몰 행성', img: 'img/p01_3.jpg', pitch: '끝없는 쇼핑몰.\n매일 밤 새 침대에서 자.', rule: '9시 전에 가게 안으로 들어가.', picks: 16, say: { t: '3번. 1번은 해바라기가 우리집 창문으로 보는게 무섭고 2번은 온천이 이상하고…', likes: 1380 } },
        { id: '1-4', name: '반딧불 호수 행성', img: 'img/p01_4.jpg', pitch: '소나무 숲 속 따뜻한 호수.\n밤마다 반딧불이 떠올라.', rule: '여긴 함정이 없어. 진짜로.', picks: 59, say: { t: '4번했는디 야릉', likes: 1740 } },
      ],
    },
  ],
  // 명예의 전당 — 시청자 제출이 영상화되면 추가 { week, planet, by, ep }
  hall: [],
  // 주민 광장(캐릭터 자랑 · 하트 순위) — 설계: ../../돈워너노우_게임_20261119/캐릭터자랑_순위_설계_v1.md
  plaza: {
    likeApi: null,   // 하트 집계 서버 주소. 비어 있으면 하트는 이 기기에만 남는다(가짜 숫자를 보이지 않으려고 숫자 칸을 숨김)
    round: { no: 1, status: 'ready', open: null, vote: null, result: null }, // status: ready 준비 · open 출전 받는 중 · vote 하트 투표 · result 발표
    entries: [],     // { code, by } — DM으로 받은 생존자 코드. by = 「공개해도 돼」라고 한 별명만(없으면 null)
    results: [],     // { no, counted: 'YYYY-MM-DD', ep, top: [{ code, by, likes }] } — likes 는 서버가 센 실제 숫자만
    samples: ['AQcAAAwJBwEDAgEDAASW', 'AQECBQYOAQIBAQQNAAD_', 'AQYAAAMACQYCAQIOAArK'], // 돈워너노우가 만든 견본(투표 대상 아님)
    perDay: 3,       // 한 기기 하루 하트 수
  },
  // 우주 광장(world.html) — 설계: ../../돈워너노우_게임_20261119/광장_설계_v2.md
  world: {
    // 서버: Supabase 프로젝트 dwk-plaza(서울 · 무료 · 2026-11-19). anonKey 는 브라우저에 넣도록 만든 공개용 키다. service_role·secret 키는 절대 여기 넣지 않는다.
    backend: { type: 'supabase', url: 'https://yvjhsqbymgomicjqmuok.supabase.co', anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amhzcWJ5bWdvbWljanFtdW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwNzY0MzMsImV4cCI6MjExMDY1MjQzM30.vFTsfve_lyaU2gXoKkwonTH1cqLiQOeRlNTfHf1Okss' },
    room: 'plaza',
    // 광장 실시간 서버(Cloudflare Workers · backend/realtime). 배포 뒤 wss://… 주소를 넣는다. 비어 있으면 예전처럼 Supabase 실시간을 쓴다.
    realtime: { url: 'wss://dwk-realtime.dwk-plaza.workers.dev' }, // 2026-11-22 배포 · Cloudflare 계정(대표) · 버전 cbeac160
    // 주인장 채찍질(비공개 이벤트 · world-boss.js) — 2026-11-22 대표 「채널 주인장 채찍질하기 … 현재 비공개 게임이다 댓글달면 게임할 수 있는 링크주겠다」
    //   invite: 초대 링크 world.html?boss=<초대말> 의 초대말(여러 개 가능 · 바꾸면 옛 링크는 새 기기에서 안 열린다 · 이미 들어온 기기는 유지)
    //   keyword: 인스타 댓글에 남기라고 안내할 말 · applied: 영상에 실제 반영한 피드백만 { ep:'7편', who:'@아이디', what:'반영 내용' }
    boss: { invite: ['일해'], keyword: '일해', handle: '@dontwannaknow.kr', applied: [] },
    providers: [],   // 켜 둔 소셜 로그인만: 'google' · 'kakao' (Google Cloud OAuth·Kakao Developers 등록 뒤 넣는다)
    // 명예의 전당 — 서버가 센 실제 값만 넣는다. 비어 있으면 시상대에 「견본」 주민이 서고 견본이라고 쓰여 있다.
    hall: { week: null, hearts: [], games: [] }, // hearts: [{ code, ig, likes }] · games: [{ game, code, ig, score }]
    // 주간 보상 — 대표가 금액·방식을 정하고 법 확인을 마친 뒤에만 채운다(그 전엔 「준비 중」으로만 보인다)
    prize: null,     // { text: '1위 ○○ · 2위 ○○ · 3위 ○○', rule: '…', from: 'YYYY-MM-DD' }
    // 광고판 2개 — 지금은 우리 채널 안내(자체 광고). 광고주가 생기면 sponsor: true → 「광고」 표시가 붙는다
    ads: [
      { slot: 'board-1', sponsor: false, title: '유튜브에서도 봐', sub: '@dontwannaknow_kr', color: '#ff4d4d', url: 'https://www.youtube.com/@dontwannaknow_kr' },
      { slot: 'board-2', sponsor: false, title: '틱톡에서도 봐', sub: '@dontwannaknow.kr', color: '#25f4ee', url: 'https://www.tiktok.com/@dontwannaknow.kr' },
    ],
    quick: ['안녕!', 'ㅋㅋㅋ', '같이 하자!', '어느 행성 골랐어?'],
  },
  // 우주선 탑승 대기장(world.html 북쪽 · world-lobby.js) — 2026-11-27 대표 「광장을 더 키워서 우주선 탑승 대기하는곳으로 만들면되겠다.」
  //   boarded: 지금 탑승 인원 = 인스타 팔로워 + 유튜브 구독자(편장부 H40 · 대표 11-28). sources에 두 값, asOf에 센 시각.
  //     손으로 고치지 말고 reports/돈워너노우_탑승집계_20261128/탑승집계.py 를 돌린다(공식 API로 읽어 이 줄을 다시 쓴다). 현황판·좌석 벽·우주선 창 불빛이 이 숫자를 따른다.
  //   openAt: 이 인원이 타면 우주선 광장이 열린다(대표 「1만 명에 먼저 열기」) · seats: 좌석 수 = 다 타면 출발(대표 「100,000명으로」)
  //   wall: 좌석 벽 기본값 = 1번 우리 배만. 실제 탑승객 아이디는 탑승권 화면(pass.html)에서 스스로 건 사람만 서버(ship_wall)에서 읽는다 — 동의 없이 남의 아이디를 이 파일에 넣지 않는다(11-29 · 견본 sample_ 5개 뺌).
  ship: {
    boarded: 6209, asOf: '11-29 01시', sources: { instagram: 3199, youtube: 3010 }, seats: 100000, openAt: 30000, // openAt 11-28 대표 「팔로우 3만되면 열거니까 접속 안되게」(구 10000 = 「1만 명에 먼저 열기」 대체됨)
    wall: [
      { no: 1, id: 'dontwannaknow.kr' },
    ],
  },
  // 영상·캐러셀 속 코드 → 게임·타운 해금. 다음 편부터 영상 마지막 1초·캐러셀 마지막 장에 넣는다.
  // (지금 목록은 테스트용 · 실제 게시물에 넣기 전엔 공개하지 않는다)
  codes: [
    { code: 'TEST', label: '테스터 배지', rewards: [{ id: 'badge-tester', label: '테스터 배지' }] },
    { code: 'SUN7', label: '해바라기 모자', ep: 1, rewards: [{ id: 'hat-sunflower', label: '해바라기 모자' }, { id: 'prop-sunflower', label: '해바라기 화단' }] },
    { code: 'EYE3', label: '호수의 눈', ep: 2, rewards: [{ id: 'prop-eye', label: '눈알 호수' }] },
    { code: 'HAND5', label: '숨은 행성 하얀 숲', ep: 2, rewards: [{ id: 'planet-2-3', label: '숨은 행성 하얀 숲' }] },
  ],
};
