/* world-pets.js — 우주 광장 「펫 · 행성 상점 · 꾸미기 수집」 (2026-11-19 · 대표 「꾸미기·수집 깊이」 「광장이 비어 보임」)
   world.js 끝의 확장 연결부(EXT)로만 꽂는다. world.js·world.css 는 고치지 않는다.
   - 펫: three 기본 도형 + 툰 셰이딩 + 뒤집힌 셸 외곽선(잉크색). 내 캐릭터를 스프링처럼 따라다니고, 멈추면 주위를 돌고, 인사·점프에 반응.
   - 다른 주민의 펫·이름표 색·말풍선 색·발자국도 보인다(EXT.send('pet') — 장착할 때 · 10초마다 · 새 주민이 보이면 바로).
   - 행성 상점(3D 노점 + 외계인 상인) · 오늘의 진열(날짜 시드 → 모두 같은 품목, 매일 진짜로 바뀜) · 내 수집 화면.
   선: 코인(게임에서 번 것)만 · 현금 결제 없음 · 가짜 마감·가짜 숫자 없음.
   저장: localStorage dwk_pets = { owned:[], pet, tag, trail, bubble, titles:[] }
   가격·효과는 바로 아래 SHOP 표 한 곳에서 고친다. */
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ───────── 가격·효과 표(SHOP) — 여기만 고치면 상점·수집 화면·다른 주민 화면이 같이 바뀐다 ─────────
// price 0 = 처음부터 가진 기본값(수집 개수에 안 센다)
export const SHOP = {
  pet: [
    { id: 'seed', name: '해바라기 씨앗', price: 150, desc: '2편 해바라기 행성에서 굴러온 씨앗. 머리에 새싹이 났어.' },
    { id: 'ring', name: '고리 행성', price: 200, desc: '고리를 훌라후프처럼 돌리는 작은 행성.' },
    { id: 'bunny', name: '달토끼', price: 300, desc: '초승달을 꼭 쥐고 다니는 토끼. 귀가 자꾸 움직여.' },
    { id: 'ufo', name: '꼬마 UFO', price: 350, desc: '불빛이 빙글빙글 도는 손바닥만 한 비행접시.' },
    { id: 'drone', name: '위성 드론', price: 400, desc: '태양 날개로 날아다니는 관측 위성. 화면에 눈이 떠.' },
    { id: 'jelly', name: '별 해파리', price: 500, desc: '우주를 헤엄치는 해파리. 머리에 별이 붙어 있어.' },
    { id: 'lamp', name: '반딧불 등불', price: 550, desc: '반딧불 한 마리가 사는 등불. 밤에 더 예뻐.' },
    { id: 'eye', name: '눈알 행성', price: 650, desc: '2편 호수의 그 눈. 여기선 졸린 눈으로 깜빡깜빡.' },
    { id: 'comet', name: '꼬마 혜성', price: 800, desc: '세 가지 색 꼬리를 흔드는 혜성. 달리면 꼬리가 날려.' },
  ],
  tag: [ // 내 머리 위 이름표: 배경 · 글자 · 테두리
    { id: 'sun', name: '기본 노랑', price: 0, bg: '#ffcf3a', fg: '#1f1a2e', line: '#1f1a2e' },
    { id: 'sky', name: '하늘', price: 120, bg: '#7fd8ff', fg: '#1f1a2e', line: '#1f1a2e' },
    { id: 'rose', name: '장미', price: 120, bg: '#ff6f91', fg: '#1f1a2e', line: '#1f1a2e' },
    { id: 'leaf', name: '새싹', price: 120, bg: '#8be07a', fg: '#1f1a2e', line: '#1f1a2e' },
    { id: 'night', name: '밤하늘', price: 200, bg: '#1f1a2e', fg: '#ffcf3a', line: '#ffcf3a' },
    { id: 'violet', name: '은하 보라', price: 200, bg: '#b59cff', fg: '#1f1a2e', line: '#1f1a2e' },
    { id: 'gold', name: '황금 테', price: 300, bg: 'linear-gradient(135deg,#ffe58a,#ffcf3a 45%,#fff2b8 55%,#ffcf3a)', fg: '#1f1a2e', line: '#b07a00' },
  ],
  trail: [ // 걸을 때 바닥에 남는 자국
    { id: 'none', name: '없음', price: 0 },
    { id: 'star', name: '별 자국', price: 180 },
    { id: 'flower', name: '꽃 자국', price: 180 },
    { id: 'ring', name: '행성 자국', price: 250 },
  ],
  bubble: [ // 내 말풍선: 배경 · 글자
    { id: 'white', name: '기본 흰색', price: 0, bg: '#ffffff', fg: '#1f1a2e' },
    { id: 'cream', name: '크림', price: 100, bg: '#fff4dc', fg: '#1f1a2e' },
    { id: 'sky', name: '하늘', price: 100, bg: '#d6f2ff', fg: '#1f1a2e' },
    { id: 'pink', name: '분홍', price: 100, bg: '#ffe0ea', fg: '#1f1a2e' },
    { id: 'mint', name: '민트', price: 100, bg: '#dcf7d4', fg: '#1f1a2e' },
    { id: 'night', name: '밤', price: 180, bg: '#1f1a2e', fg: '#fff4dc' },
  ],
};
const CAT_NAME = { pet: '펫', tag: '이름표', trail: '발자국', bubble: '말풍선' };
const DEFAULTS = { pet: null, tag: 'sun', trail: 'none', bubble: 'white' };
const DEAL_OFF = 0.3; // 오늘의 진열 할인율(매일 한 품목)
const SHOP_AT = { a: -1.45, r: 11.9 }; // 노점 자리: 극장(-1.92)과 타운(-0.72) 사이 바깥쪽. 우주 정거장(-2.1~-2.65)·가로등(-1.18/-1.96)·나무 피함
// 수집 칭호(실제 가진 개수로만 판정)
const GOALS = [
  { id: 'pet3', name: '펫 친구', how: '펫 3마리 모으기', ok: (c) => c.pet >= 3 },
  { id: 'petAll', name: '펫 박사', how: `펫 ${SHOP.pet.length}마리 전부 모으기`, ok: (c) => c.pet >= SHOP.pet.length },
  { id: 'all', name: '행성 상점 단골', how: '상점 물건 전부 모으기', ok: (c) => c.all >= c.total },
];

export async function install(EXT) {
  const T = EXT.THREE, DC = EXT.DC, DP = EXT.DP, el = EXT.el, V3 = T.Vector3;
  const ITEMS = Object.entries(SHOP).flatMap(([cat, list]) => list.map(it => ({ ...it, cat, key: `${cat}:${it.id}` })));
  const PAID = ITEMS.filter(i => i.price > 0);
  const find = (cat, id) => SHOP[cat].find(x => x.id === id);

  // ───────── 저장 ─────────
  const load = () => { const s = DC.store.get('pets', {}) || {}; return { owned: Array.isArray(s.owned) ? s.owned.filter(k => PAID.some(i => i.key === k)) : [], pet: s.pet ?? null, tag: s.tag || 'sun', trail: s.trail || 'none', bubble: s.bubble || 'white', titles: Array.isArray(s.titles) ? s.titles : [], seenDeal: s.seenDeal || null }; };
  const S = load();
  const has = (it) => it.price === 0 || S.owned.includes(it.key);
  for (const cat of ['tag', 'trail', 'bubble']) { const it = find(cat, S[cat]); if (!it || !has({ ...it, key: `${cat}:${it.id}` })) S[cat] = DEFAULTS[cat]; }
  if (S.pet && !S.owned.includes('pet:' + S.pet)) S.pet = null;
  const save = () => DC.store.set('pets', S);

  // ───────── 오늘의 진열(날짜 시드 → 모든 주민이 같은 품목) ─────────
  function todayDeal() { const r = DC.rng(DC.seed('dwk-shop-' + DC.today())); const it = PAID[Math.floor(r() * PAID.length)]; return { ...it, deal: Math.max(10, Math.round(it.price * (1 - DEAL_OFF) / 10) * 10) }; }
  let deal = todayDeal();
  const priceOf = (it) => { if (deal.key === it.key) return deal.deal; return it.price; };

  // ───────── 옷(CSS) — 크림 종이 + 잉크 테두리 + 도트 글꼴 ─────────
  const st = document.createElement('style');
  st.textContent = `
body.world .tag.pt .nm{background:var(--pt-bg,var(--sun));color:var(--pt-fg,var(--ink));outline:2px solid var(--pt-line,var(--ink))}
body.world .tag.pt .bub{background:var(--pt-bb,#fff);color:var(--pt-bf,var(--ink))}body.world .tag.pt .bub::after{background:var(--pt-bb,#fff)}
.ps-top{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}
.ps-coins{display:inline-flex;align-items:center;gap:6px;font:700 14px/1 var(--pix);background:#fff;border:2.5px solid var(--ink);border-radius:10px;padding:7px 10px 6px;box-shadow:0 3px 0 var(--ink)}
.ps-deal{display:grid;grid-template-columns:86px 1fr;gap:12px;align-items:center;text-align:left;background:#fff;border:2.5px dashed var(--ink);border-radius:14px;padding:10px;margin:4px 0 12px;cursor:pointer}
.ps-deal .lbl{display:inline-block;font:700 11px/1 var(--pix);background:var(--ink);color:var(--sun);padding:4px 6px 3px;border-radius:5px;margin-bottom:6px}
.ps-deal b{display:block;font:700 15px/1.25 var(--pix)}.ps-deal small{display:block;font-size:12px;color:var(--mute);line-height:1.45;margin-top:4px}
.ps-pv{display:grid;place-items:center;aspect-ratio:1;width:100%;border-radius:10px;background:var(--paper);border:2px solid var(--ink);overflow:hidden}
.ps-pv img{width:100%;height:100%;object-fit:contain;image-rendering:auto}
.ps-old{text-decoration:line-through;color:var(--mute);font:400 12px/1 'Galmuri14',var(--pix);margin-right:5px}
.ps-pr{display:inline-flex;align-items:center;gap:4px;font:700 13px/1 var(--pix)}.ps-pr .cn{width:12px;height:12px}
.ps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:10px 0}
.ps-item{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px 5px 8px;background:#fff;border:2.5px solid var(--ink);border-radius:12px;box-shadow:0 3px 0 var(--ink);cursor:pointer;font:inherit;color:var(--ink)}
.ps-item[aria-pressed="true"]{background:var(--sun);transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
.ps-item b{font:700 11px/1.25 var(--pix);word-break:keep-all;min-height:2.5em;display:grid;place-items:center}
.ps-item .ps-pr{font-size:11px}
.ps-item .st{position:absolute;right:-6px;top:-8px;z-index:1;font:700 9px/1 var(--pix);background:var(--leaf);border:2px solid var(--ink);border-radius:5px;padding:3px 4px 2px}
.ps-item .st.on{background:var(--ink);color:var(--sun)}.ps-item .st.deal{background:var(--rose)}
.ps-item.lock .ps-pv img{filter:brightness(0) opacity(.22)}.ps-item.lock .ps-pv>span{opacity:.25}
.ps-pick{display:grid;grid-template-columns:110px 1fr;gap:12px;align-items:center;text-align:left;background:var(--paper2);border:2.5px solid var(--ink);border-radius:14px;padding:10px;margin:8px 0}
.ps-pick b{display:block;font:700 15px/1.25 var(--pix)}.ps-pick p{margin:5px 0 0;font-size:13px;line-height:1.45}
.ps-pick .btn{min-height:46px!important;margin-top:8px!important}
.ps-nm{display:inline-block;font:700 12px/1 var(--pix);padding:5px 8px 4px;border-radius:3px;box-shadow:0 2px 0 rgba(0,0,0,.35)}
.ps-bub{display:inline-block;font-size:13px;font-weight:700;padding:6px 10px;border-radius:10px;border:2px solid var(--ink);box-shadow:0 3px 0 var(--ink)}
.ps-goals{list-style:none;margin:10px 0;padding:0;text-align:left;border:2.5px solid var(--ink);border-radius:12px;background:#fff;overflow:hidden}
.ps-goals li{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:2px solid var(--paper2);font-size:13px}.ps-goals li:last-child{border-bottom:0}
.ps-goals li i{width:22px;height:22px;flex:0 0 auto;border:2.5px solid var(--ink);border-radius:6px;background:#fff}.ps-goals li.on i{background:var(--sun)}
.ps-goals li b{font:700 13px/1.2 var(--pix);display:block}.ps-goals li small{color:var(--mute);font-size:12px}
.ps-title{display:inline-block;font:700 13px/1 var(--pix);background:var(--ink);color:var(--sun);padding:6px 9px 5px;border-radius:6px;margin-bottom:8px}
.w-box h3.ps-h{display:flex;justify-content:space-between;align-items:center;text-align:left}
`;
  document.head.append(st);

  // ───────── 펫 재료: 툰 셰이딩 + 뒤집힌 셸 외곽선 ─────────
  const grad = new T.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, T.RedFormat); grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
  const tcache = new Map();
  const toon = (c, em = 0, ei = 0, extra) => { if (extra) return new T.MeshToonMaterial({ color: c, gradientMap: grad, emissive: em, emissiveIntensity: ei, ...extra }); const k = `${c}|${em}|${ei}`; let m = tcache.get(k); if (!m) { m = new T.MeshToonMaterial({ color: c, gradientMap: grad, emissive: em, emissiveIntensity: ei }); tcache.set(k, m); } return m; };
  const olMat = (th, key) => { const m = new T.MeshBasicMaterial({ color: 0x1f1a2e, side: T.BackSide }); m.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n\ttransformed += normal * ${th.toFixed(3)};`); }; m.customProgramCacheKey = () => key; return m; };
  const OL = olMat(0.05, 'dwk-pet-ol'), OLS = olMat(0.022, 'dwk-pet-ols');
  const olCache = new WeakMap();
  // 외곽선용 도형: 모서리에서 셸이 갈라지지 않게 같은 자리 꼭짓점을 합쳐 매끈한 법선을 다시 낸다
  function olGeo(geo) { let g = olCache.get(geo); if (g) return g; g = geo.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); g = mergeVertices(g, 1e-3); g.computeVertexNormals(); olCache.set(geo, g); return g; }
  const G = { // 도형은 한 번만 만들어 모든 펫이 같이 쓴다
    sph: new T.SphereGeometry(1, 20, 14), hemi: new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bell: new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    box: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(1, 1, 1, 14), hex: new T.CylinderGeometry(1, 1, 1, 6), cone: new T.ConeGeometry(1, 1, 14), hexCone: new T.ConeGeometry(1, 1, 6),
    caps: new T.CapsuleGeometry(1, 3, 4, 10), ring: new T.TorusGeometry(0.72, 0.07, 10, 44), band: new T.TorusGeometry(1, 0.1, 8, 32), moon: new T.TorusGeometry(1, 0.32, 8, 20, Math.PI * 1.25),
    handle: new T.TorusGeometry(1, 0.22, 6, 16, Math.PI),
    star: (() => { const s = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.45 : 1; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); const g = new T.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: false }); g.center(); return g; })(),
  };
  const INK = 0x1f1a2e;
  function part(g, geo, color, pos = [0, 0, 0], o = {}) {
    const m = new T.Mesh(geo, o.mat || toon(color, o.em || 0, o.ei || 0)); m.position.set(...pos);
    if (o.s != null) Array.isArray(o.s) ? m.scale.set(...o.s) : m.scale.setScalar(o.s); if (o.r) m.rotation.set(...o.r);
    if (o.ol !== false) { const l = new T.Mesh(olGeo(geo), o.ol === 's' ? OLS : OL); l.raycast = () => {}; m.add(l); }
    m.castShadow = o.shadow !== false; m.raycast = () => {}; g.add(m); return m;
  }
  // 얼굴: 눈 두 개(반짝이 점) + 볼터치. R = 몸 반지름(구), sp = 눈 간격
  function face(g, { R = 0.5, y = 0.04, sp = 0.15, r = 0.065, cz = 0, blush = true, sy = 1, sz = 1 } = {}) {
    for (const s of [-1, 1]) {
      const zz = cz + Math.sqrt(Math.max(0.01, R * R - sp * sp - (y / sy) ** 2)) * sz - r * 0.25;
      part(g, G.sph, INK, [s * sp, y, zz], { s: r, ol: false, shadow: false });
      part(g, G.sph, 0xffffff, [s * sp + r * 0.35, y + r * 0.4, zz + r * 0.78], { s: r * 0.34, ol: false, shadow: false });
      if (blush) part(g, G.sph, 0xff8fae, [s * (sp + 0.1), y - 0.085, zz - 0.05], { s: [0.065, 0.035, 0.02], ol: false, shadow: false });
    }
  }
  const tex = (w, h, draw) => EXT.canvasTex(w, h, draw);
  const stripeTex = (a, b, n, vertical) => tex(128, 64, (c, w, h) => { c.fillStyle = a; c.fillRect(0, 0, w, h); c.fillStyle = b; for (let i = 0; i < n; i++) vertical ? c.fillRect((i + 0.25) * w / n, 0, w / n * 0.32, h) : c.fillRect(0, (i + 0.3) * h / n, w, h / n * 0.34); });
  const glowTex = (col) => tex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
  const TX = { seed: stripeTex('#5b3a26', '#f3e3c3', 7, true), planet: stripeTex('#ffa94d', '#ffd08a', 3, false), glow: glowTex('rgba(255,214,90,.9)'), fly: glowTex('rgba(210,255,120,.95)') };

  // ───────── 펫 9종(몸 반지름 ≈ 0.5 기준으로 만들고 바깥에서 줄인다) — 앞 = +z ─────────
  const PETS = {
    seed(g, u) {
      const body = part(g, G.sph, 0xffffff, [0, 0, 0], { s: [0.42, 0.58, 0.34], mat: toon(0xffffff, 0, 0, { map: TX.seed }) }); u.push(body.material);
      face(g, { R: 0.34, y: 0.02, sp: 0.12, r: 0.058, sz: 1 });
      part(g, G.cyl, 0x4f8a2b, [0, 0.66, 0], { s: [0.03, 0.18, 0.03], ol: 's' });
      const lv = [-1, 1].map(s => part(g, G.sph, 0x8be07a, [s * 0.11, 0.76, 0], { s: [0.13, 0.035, 0.065], r: [0, 0, s * 0.45], ol: 's' }));
      return (t) => { lv.forEach((l, i) => { l.rotation.z = (i ? 1 : -1) * (0.45 + Math.sin(t * 3 + i) * 0.18); }); };
    },
    ring(g, u) {
      const pl = part(g, G.sph, 0xffffff, [0, 0, 0], { s: 0.44, mat: toon(0xffffff, 0, 0, { map: TX.planet }) }); u.push(pl.material);
      face(g, { R: 0.44, y: 0.0, sp: 0.14 });
      const hold = new T.Group(); hold.rotation.x = Math.PI / 2 - 0.38; g.add(hold); const ring = part(hold, G.ring, 0x7fd8ff, [0, 0, 0], { ol: 's' });
      return (t) => { ring.rotation.z = t * 1.6; hold.rotation.y = Math.sin(t * 1.3) * 0.18; };
    },
    bunny(g) {
      part(g, G.sph, 0xf7f2e8, [0, 0, 0], { s: [0.45, 0.41, 0.42] });
      face(g, { R: 0.42, y: 0.02, sp: 0.14 });
      part(g, G.sph, 0xff8fae, [0, -0.06, 0.41], { s: [0.035, 0.025, 0.02], ol: false });
      const ears = [-1, 1].map(s => { const e = new T.Group(); e.position.set(s * 0.15, 0.32, -0.02); g.add(e); part(e, G.caps, 0xf7f2e8, [0, 0.24, 0], { s: [0.085, 0.085, 0.085] }); part(e, G.caps, 0xffb6c8, [0, 0.24, 0.055], { s: [0.045, 0.06, 0.04], ol: false }); return e; });
      part(g, G.sph, 0xffffff, [0, -0.12, -0.42], { s: 0.11, ol: 's' });
      part(g, G.moon, 0xffcf3a, [0.46, -0.08, 0.16], { s: 0.16, r: [0, -0.4, 2.2], ol: 's' });
      return (t) => { ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.16 + Math.max(0, Math.sin(t * 2.2 + i * 0.6)) * 0.28); e.rotation.x = -0.1 + Math.sin(t * 1.7) * 0.06; }); };
    },
    ufo(g, u) {
      part(g, G.sph, 0xb9b4e0, [0, 0, 0], { s: [0.62, 0.19, 0.62] });
      part(g, G.band, 0x6d64b0, [0, -0.01, 0], { s: [0.6, 0.6, 0.6], r: [Math.PI / 2, 0, 0], ol: 's' });
      part(g, G.hemi, 0x9fe8ff, [0, 0.1, 0], { s: 0.32 });
      face(g, { R: 0.32, y: 0.12, cz: 0, sp: 0.1, r: 0.05, blush: false });
      const ring = new T.Group(); g.add(ring); const lights = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const m = toon(i % 2 ? 0xff6f91 : 0xffcf3a, i % 2 ? 0xff6f91 : 0xffcf3a, 0.2, {}); u.push(m); lights.push(m); part(ring, G.sph, 0, [Math.sin(a) * 0.5, -0.05, Math.cos(a) * 0.5], { s: 0.055, mat: m, ol: false }); }
      return (t) => { ring.rotation.y = t * 1.8; lights.forEach((m, i) => { m.emissiveIntensity = (Math.floor(t * 4) + i) % 3 === 0 ? 1.4 : 0.15; }); };
    },
    drone(g, u) {
      part(g, G.box, 0xfff4dc, [0, 0, 0], { s: [0.5, 0.42, 0.42] });
      const scr = toon(0x7fd8ff, 0x3fa8d8, 0.35, {}); u.push(scr); part(g, G.box, 0, [0, 0.01, 0.211], { s: [0.36, 0.25, 0.012], mat: scr, ol: false });
      const eyes = [-1, 1].map(s => part(g, G.box, INK, [s * 0.075, 0.02, 0.222], { s: [0.05, 0.085, 0.01], ol: false, shadow: false }));
      const wings = [-1, 1].map(s => { part(g, G.cyl, 0x6d6680, [s * 0.32, 0, 0], { s: [0.025, 0.16, 0.025], r: [0, 0, Math.PI / 2], ol: 's' }); const w = new T.Group(); w.position.set(s * 0.6, 0, 0); g.add(w); part(w, G.box, 0x3f6fd8, [0, 0, 0], { s: [0.4, 0.025, 0.26], ol: 's' }); for (const k of [-1, 1]) part(w, G.box, 0xbcd4ff, [k * 0.1, 0.014, 0], { s: [0.012, 0.004, 0.24], ol: false, shadow: false }); return w; });
      part(g, G.cyl, 0x6d6680, [0.1, 0.32, 0], { s: [0.018, 0.22, 0.018], ol: 's' }); const tipM = toon(0xff5a5a, 0xff5a5a, 0.5, {}); u.push(tipM); part(g, G.sph, 0, [0.1, 0.45, 0], { s: 0.05, mat: tipM, ol: 's' });
      return (t) => { wings.forEach(w => { w.rotation.x = Math.sin(t * 0.8) * 0.5; }); tipM.emissiveIntensity = Math.sin(t * 5) > 0.6 ? 1.6 : 0.2; const bl = (t % 3.4) < 0.12; eyes.forEach(e => { e.scale.y = bl ? 0.012 : 0.085; }); };
    },
    jelly(g, u) {
      const bm = toon(0xffa3d9, 0, 0, { side: T.DoubleSide }); u.push(bm); const bell = part(g, G.bell, 0, [0, -0.02, 0], { s: [0.48, 0.42, 0.48], mat: bm });
      part(g, G.band, 0xffd0ec, [0, -0.08, 0], { s: [0.44, 0.44, 0.44], r: [Math.PI / 2, 0, 0], ol: 's' });
      face(g, { R: 0.48, y: 0.12, sp: 0.15, sy: 0.875 });
      part(g, G.star, 0xffcf3a, [0, 0.43, 0], { s: 0.13, ol: 's' });
      const tent = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; const h = new T.Group(); h.position.set(Math.sin(a) * 0.24, -0.1, Math.cos(a) * 0.24); g.add(h); part(h, G.caps, 0xff8fc8, [0, -0.2, 0], { s: [0.035, 0.07, 0.035], ol: 's' }); tent.push(h); }
      return (t) => { const p = Math.sin(t * 3); bell.scale.set(0.48 - p * 0.03, 0.42 + p * 0.04, 0.48 - p * 0.03); tent.forEach((h, i) => { h.rotation.x = Math.sin(t * 3 - i) * 0.35; h.rotation.z = Math.cos(t * 2.4 + i) * 0.25; }); };
    },
    lamp(g, u) {
      part(g, G.hexCone, 0x3a2a6e, [0, 0.38, 0], { s: [0.32, 0.2, 0.32], r: [0, Math.PI / 6, 0] });
      part(g, G.handle, 0x3a2a6e, [0, 0.5, 0], { s: 0.12, ol: 's' });
      const gm = toon(0xffd34d, 0xffb02e, 0.9, {}); u.push(gm); part(g, G.hex, 0, [0, 0.05, 0], { s: [0.27, 0.5, 0.27], r: [0, Math.PI / 6, 0], mat: gm });
      face(g, { R: 0.24, y: 0.06, sp: 0.085, r: 0.045, cz: -0.0 });
      part(g, G.hex, 0x3a2a6e, [0, -0.25, 0], { s: [0.3, 0.1, 0.3], r: [0, Math.PI / 6, 0] });
      const gs = new T.SpriteMaterial({ map: TX.glow, blending: T.AdditiveBlending, depthWrite: false, transparent: true }); u.push(gs); const glow = new T.Sprite(gs); glow.scale.setScalar(1.6); g.add(glow);
      const fly = new T.Group(); g.add(fly); part(fly, G.sph, 0xd4ff6a, [0.55, 0.1, 0], { s: 0.06, mat: toon(0xd4ff6a, 0xb6ff3a, 1.2), ol: false });
      const fs = new T.SpriteMaterial({ map: TX.fly, blending: T.AdditiveBlending, depthWrite: false, transparent: true }); u.push(fs); const fg = new T.Sprite(fs); fg.position.set(0.55, 0.1, 0); fg.scale.setScalar(0.42); fly.add(fg);
      return (t) => { const k = 0.75 + Math.sin(t * 2.3) * 0.25; gm.emissiveIntensity = 0.6 + k * 0.5; gs.opacity = 0.35 + k * 0.35; fly.rotation.y = t * 2.1; fly.position.y = Math.sin(t * 3.1) * 0.12; };
    },
    eye(g) {
      part(g, G.sph, 0xfdf8ee, [0, 0, 0], { s: 0.48 });
      part(g, G.sph, 0x3fb6c9, [0, -0.02, 0.41], { s: [0.22, 0.22, 0.09], ol: false });
      part(g, G.sph, 0x7fe0e8, [0, -0.02, 0.43], { s: [0.15, 0.15, 0.08], ol: false, shadow: false });
      part(g, G.sph, INK, [0, -0.02, 0.47], { s: [0.1, 0.1, 0.05], ol: false, shadow: false });
      part(g, G.sph, 0xffffff, [0.06, 0.05, 0.505], { s: 0.04, ol: false, shadow: false }); part(g, G.sph, 0xffffff, [-0.04, -0.07, 0.5], { s: 0.018, ol: false, shadow: false });
      for (const s of [-1, 1]) part(g, G.sph, 0xff8fae, [s * 0.3, -0.2, 0.3], { s: [0.07, 0.035, 0.02], ol: false, shadow: false });
      const lid = new T.Group(); g.add(lid); part(lid, G.hemi, 0x8be07a, [0, 0, 0], { s: 0.495 }); // 위쪽은 풀밭 행성 껍질 = 눈꺼풀
      for (const s of [-1, 0, 1]) part(lid, G.cone, 0x5fbf4a, [s * 0.08, 0.55, -0.02], { s: [0.05, 0.16, 0.05], r: [0, 0, -s * 0.4], ol: 's' });
      return (t) => { const ph = t % 3.6; const close = ph < 0.18 ? Math.sin(ph / 0.18 * Math.PI) : 0; lid.rotation.x = -0.62 + close * 1.95 + Math.sin(t * 0.9) * 0.05; };
    },
    comet(g) {
      part(g, G.sph, 0xffcf3a, [0, 0, 0], { s: 0.42, em: 0xffa000, ei: 0.22 });
      face(g, { R: 0.42, y: 0.02, sp: 0.13 });
      const tail = new T.Group(); tail.position.z = -0.25; g.add(tail);
      [[0xff6f91, -0.13, 0.1, 0.22], [0x7fd8ff, 0.13, 0.08, 0.2], [0xfff4dc, 0, -0.04, 0.28]].forEach(([c, x, y, r]) => part(tail, G.cone, c, [x, y, -0.45], { s: [r, 0.95, r], r: [-Math.PI / 2, 0, 0] }));
      return (t, sp) => { tail.rotation.y = Math.sin(t * 2.6) * 0.22; tail.scale.z = 1 + Math.min(0.6, (sp || 0) * 0.18); };
    },
  };
  function makePet(id, scale = 0.42) {
    const root = new T.Group(), body = new T.Group(); root.add(body); const uniq = [];
    const anim = (PETS[id] || PETS.seed)(body, uniq) || (() => {}); root.scale.setScalar(scale);
    return { id, root, body, anim, uniq, pos: new V3(), vel: new V3(), yaw: 0, hop: 0, idle: 0, orb: Math.random() * 6.28, ph: Math.random() * 6.28, placed: false, hearts: 0 };
  }
  function dropPet(p) { if (!p) return; p.root.parent?.remove(p.root); p.uniq.forEach(m => m.dispose?.()); }

  // ───────── 따라다니기: 스프링 + 둥실 + 멈추면 공전 + 인사·점프에 폴짝 ─────────
  const heartTex = tex(64, 64, (c) => { c.translate(32, 34); c.beginPath(); c.moveTo(0, 18); c.bezierCurveTo(-30, -2, -18, -26, 0, -10); c.bezierCurveTo(18, -26, 30, -2, 0, 18); c.closePath(); c.fillStyle = '#ff6f91'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#1f1a2e'; c.stroke(); });
  const hearts = [];
  function popHeart(pos) { let h = hearts.find(x => x.life <= 0); if (!h) { if (hearts.length > 5) return; h = { sp: new T.Sprite(new T.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false })), life: 0 }; EXT.scene.add(h.sp); hearts.push(h); } h.life = 1; h.sp.position.copy(pos); h.sp.position.y += 0.35; h.sp.visible = true; }
  const tq = new V3();
  function follow(p, root, moving, dt, t, react, cam, ownerSpeed) {
    const o = root.position, ry = root.rotation.y;
    if (moving) { p.idle = 0; const ox = 0.68, oz = -0.4; tq.set(o.x + Math.cos(ry) * ox + Math.sin(ry) * oz, 0, o.z - Math.sin(ry) * ox + Math.cos(ry) * oz); p.tx = tq.x; p.tz = tq.z; }
    else { p.idle += dt; if (p.idle > 1.1) { p.orb += dt * 0.95; p.tx = o.x + Math.sin(p.orb) * 0.95; p.tz = o.z + Math.cos(p.orb) * 0.95; } else if (p.tx == null) { p.tx = o.x + 0.6; p.tz = o.z; } }
    const ty = o.y + 0.98 + Math.sin(t * 2.6 + p.ph) * 0.09;
    if (!p.placed || Math.hypot(p.pos.x - p.tx, p.pos.z - p.tz) > 9) { p.pos.set(p.tx, ty, p.tz); p.vel.set(0, 0, 0); p.placed = true; if (!p.root.parent) EXT.scene.add(p.root); }
    const k = 26, dmp = 7.4; // 살짝 통통 튀는 스프링(감쇠비 ≈ 0.73)
    p.vel.x += ((p.tx - p.pos.x) * k - p.vel.x * dmp) * dt; p.vel.y += ((ty - p.pos.y) * k - p.vel.y * dmp) * dt; p.vel.z += ((p.tz - p.pos.z) * k - p.vel.z * dmp) * dt;
    p.pos.addScaledVector(p.vel, dt);
    if (react && p.hop <= 0) { p.hop = 1; popHeart(p.pos); }
    let hy = 0, spin = 0, sq = 0;
    if (p.hop > 0) { const u = 1 - p.hop; hy = Math.sin(u * Math.PI) * 0.55; spin = u * Math.PI * 2; sq = Math.sin(u * Math.PI * 2) * 0.18; p.hop -= dt * 1.5; }
    p.root.position.set(p.pos.x, p.pos.y + hy, p.pos.z);
    const sp = Math.hypot(p.vel.x, p.vel.z);
    const want = sp > 0.45 ? Math.atan2(p.vel.x, p.vel.z) : Math.atan2(cam.x - p.pos.x, cam.z - p.pos.z);
    let d = want - p.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); p.yaw += d * Math.min(1, dt * 6);
    p.root.rotation.y = p.yaw + spin;
    p.body.rotation.x = Math.min(0.35, sp * 0.07); // 날아갈 땐 앞으로 살짝 기운다
    const st2 = 1 + sq + Math.min(0.08, Math.abs(p.vel.y) * 0.03); p.body.scale.set(1 / Math.sqrt(st2), st2, 1 / Math.sqrt(st2));
    p.anim(t, sp + (ownerSpeed || 0));
  }

  // ───────── 발자국(별·꽃·행성) — 바닥 판 48장을 돌려 쓴다 ─────────
  const TRAIL_DRAW = {
    star: (c) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 22 : 50; c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } c.closePath(); c.fillStyle = '#ffcf3a'; c.fill(); c.lineWidth = 9; c.lineJoin = 'round'; c.strokeStyle = '#1f1a2e'; c.stroke(); },
    flower: (c) => { c.lineWidth = 8; c.strokeStyle = '#1f1a2e'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; c.beginPath(); c.arc(64 + Math.cos(a) * 28, 64 + Math.sin(a) * 28, 20, 0, 6.283); c.fillStyle = '#ff8fb5'; c.fill(); c.stroke(); } c.beginPath(); c.arc(64, 64, 17, 0, 6.283); c.fillStyle = '#ffcf3a'; c.fill(); c.stroke(); },
    ring: (c) => { c.lineWidth = 8; c.strokeStyle = '#1f1a2e'; c.beginPath(); c.ellipse(64, 64, 56, 18, -0.35, Math.PI, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(64, 64, 30, 0, 6.283); c.fillStyle = '#7fd8ff'; c.fill(); c.stroke(); c.beginPath(); c.ellipse(64, 64, 56, 18, -0.35, 0, Math.PI); c.strokeStyle = '#fff4dc'; c.lineWidth = 14; c.stroke(); c.strokeStyle = '#1f1a2e'; c.lineWidth = 6; c.stroke(); },
  };
  const trailCanvas = {}; const TRAIL_TEX = {};
  for (const [k, f] of Object.entries(TRAIL_DRAW)) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; f(cv.getContext('2d')); trailCanvas[k] = cv; const t2 = new T.CanvasTexture(cv); t2.colorSpace = T.SRGBColorSpace; TRAIL_TEX[k] = t2; }
  const decals = []; let di = 0; const decalGeo = new T.PlaneGeometry(0.36, 0.36).rotateX(-Math.PI / 2);
  for (let i = 0; i < 48; i++) { const m = new T.Mesh(decalGeo, new T.MeshBasicMaterial({ map: TRAIL_TEX.star, transparent: true, depthWrite: false, opacity: 0 })); m.visible = false; m.renderOrder = 1; m.userData.life = 0; m.raycast = () => {}; EXT.scene.add(m); decals.push(m); }
  function stamp(type, x, z, ry, side) {
    const m = decals[di++ % decals.length]; m.material.map = TRAIL_TEX[type];
    m.position.set(x + Math.cos(ry) * side * 0.13, 0.03 + (di % 7) * 0.0006, z - Math.sin(ry) * side * 0.13); m.rotation.y = ry + (Math.random() - 0.5) * 0.8;
    m.userData.life = 1; m.visible = true; m.scale.setScalar(0.4);
  }
  function trailStep(tr, root, type) {
    if (!type || type === 'none' || !TRAIL_TEX[type]) return; const p = root.position;
    if (!tr.last) { tr.last = p.clone(); tr.side = 1; return; }
    if (Math.hypot(p.x - tr.last.x, p.z - tr.last.z) > 0.42) { tr.side = -tr.side; stamp(type, p.x, p.z, root.rotation.y, tr.side); tr.last.copy(p); }
  }

  // ───────── 이름표·말풍선 색 ─────────
  function styleTag(tagEl, cfg) {
    if (!tagEl) return; const tg = find('tag', cfg.tag) || SHOP.tag[0], bb = find('bubble', cfg.bubble) || SHOP.bubble[0];
    tagEl.classList.add('pt'); const s = tagEl.style;
    s.setProperty('--pt-bg', tg.bg); s.setProperty('--pt-fg', tg.fg); s.setProperty('--pt-line', tg.line); s.setProperty('--pt-bb', bb.bg); s.setProperty('--pt-bf', bb.fg);
  }
  const myCfg = () => ({ id: S.pet || null, tag: S.tag, trail: S.trail, bubble: S.bubble });
  const applyMine = () => styleTag(EXT.player.tag?.el, myCfg());

  // ───────── 내 펫 ─────────
  let myPet = null, myBusy = false; const myTrail = {};
  function setMyPet() { if (myPet?.id === S.pet) return; dropPet(myPet); myPet = S.pet ? makePet(S.pet) : null; }
  setMyPet();

  // ───────── 다른 주민(EXT.send / onMsg) ─────────
  const PET_IDS = new Set(SHOP.pet.map(x => x.id));
  const clean = (d) => ({ id: PET_IDS.has(d?.id) ? d.id : null, tag: find('tag', d?.tag) ? d.tag : 'sun', trail: find('trail', d?.trail) ? d.trail : 'none', bubble: find('bubble', d?.bubble) ? d.bubble : 'white' }); // 남이 보낸 값은 표에 있는 것만 쓴다
  const others = new Map(); let lastAnn = 0, annSoon = 0;
  function announce() { if (!EXT.room()) return; lastAnn = performance.now(); EXT.send('pet', myCfg()); }
  EXT.onMsg('pet', (data, fromId) => {
    if (typeof fromId !== 'string' && typeof fromId !== 'number') return; const cfg = clean(data);
    let e = others.get(fromId); if (!e) { e = { cfg, at: performance.now(), o: null, pet: null, tr: {}, busy: false, prev: null }; others.set(fromId, e); annSoon = performance.now() + 600; } // 처음 본 주민 → 내 것도 곧 알려 준다
    else { e.cfg = cfg; e.at = performance.now(); }
    if (e.o) styleTag(e.o.tag?.el, cfg);
  });
  function stepOthers(dt, t, now, cam) {
    for (const [id, e] of others) {
      const o = EXT.peers.get(id);
      if (!o) { if (e.pet) { dropPet(e.pet); e.pet = null; } if (e.o || now - e.at > 30000) others.delete(id); continue; } // 주민이 떠났다 → 정리
      if (e.o !== o) { e.o = o; styleTag(o.tag?.el, e.cfg); }
      if ((e.pet?.id || null) !== e.cfg.id) { dropPet(e.pet); e.pet = e.cfg.id ? makePet(e.cfg.id) : null; }
      const p = o.root.position; const mv = e.prev ? Math.hypot(p.x - e.prev.x, p.z - e.prev.z) / Math.max(dt, 1e-3) : 0; (e.prev ||= new V3()).copy(p);
      const busy = o.onceUntil > now;
      if (e.pet) follow(e.pet, o.root, mv > 0.3, dt, t, busy && !e.busy, cam, mv);
      e.busy = busy; if (mv > 0.3) trailStep(e.tr, o.root, e.cfg.trail);
    }
  }

  // ───────── 행성 상점(3D 노점 + 상인) ─────────
  const shopFac = await buildStall();
  async function buildStall() {
    const [sx, sz] = EXT.polar(SHOP_AT.r, SHOP_AT.a); const g = new T.Group(); g.position.set(sx, 0, sz); g.rotation.y = Math.atan2(-sx, -sz); EXT.world.add(g); EXT.COL.push({ x: sx, z: sz, r: 1.4 });
    const M = EXT.mat, mesh = EXT.mesh; const wood = M(0xc98b52), dark = M(0x8a5a3c), ink = M(INK);
    try { await document.fonts.load("700 64px 'Galmuri11'"); } catch { /* 시스템 글꼴로 그린다 */ }
    // 카운터(앞판 줄무늬)
    const front = tex(512, 180, (c, w, h) => { c.fillStyle = '#fff4dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff6f91'; for (let i = 0; i < 8; i++) c.fillRect(i * 64 + 16, 0, 30, h); c.strokeStyle = '#1f1a2e'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12); });
    const cm = M(0xffffff, { map: front }); g.add(mesh(new T.BoxGeometry(2.7, 0.95, 0.8), [wood, wood, wood, wood, cm, wood], 0, 0.475, 0.35));
    g.add(mesh(new T.BoxGeometry(2.92, 0.1, 0.98), wood, 0, 1.0, 0.35));
    for (const x of [-1.38, 1.38]) for (const z of [0.78, -0.95]) g.add(mesh(new T.CylinderGeometry(0.06, 0.07, 2.55, 10), dark, x, 1.27, z));
    // 차양(줄무늬) + 앞 물결 천
    const aw = tex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#fff4dc' : '#ff6f91'; c.fillRect(i * 32, 0, 32, h); } });
    const awn = mesh(new T.BoxGeometry(3.15, 0.07, 1.95), M(0xffffff, { map: aw }), 0, 2.56, -0.08); awn.rotation.x = 0.22; g.add(awn);
    const val = tex(512, 64, (c, w, h) => { const n = 10, r = w / n / 2; for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(i * 2 * r, 0); c.lineTo(i * 2 * r, h * 0.35); c.arc(i * 2 * r + r, h * 0.35, r, Math.PI, 0, true); c.lineTo((i + 1) * 2 * r, 0); c.closePath(); c.fillStyle = i % 2 ? '#fff4dc' : '#ff6f91'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#1f1a2e'; c.stroke(); } });
    const vm = new T.Mesh(new T.PlaneGeometry(3.15, 0.4), M(0xffffff, { map: val, transparent: true, alphaTest: 0.5, side: T.DoubleSide })); vm.position.set(0, 2.15, 0.88); g.add(vm);
    // 전구 줄
    const bulbCol = [0xffcf3a, 0x7fd8ff, 0xff6f91]; for (let i = 0; i < 11; i++) { const x = -1.45 + i * 0.29; const b = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), new T.MeshBasicMaterial({ color: bulbCol[i % 3] })); b.position.set(x, 1.98 - Math.sin(i / 10 * Math.PI) * 0.1, 0.92); g.add(b); }
    // 간판 「행성 상점」
    const sg = tex(512, 160, (c, w, h) => {
      c.fillStyle = '#fff4dc'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffcf3a'; c.fillRect(0, h - 26, w, 26); c.strokeStyle = '#1f1a2e'; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = '#1f1a2e'; c.font = "700 70px 'Galmuri11', sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('행성 상점', w / 2 + 14, h / 2 - 8);
      c.lineWidth = 6; c.beginPath(); c.arc(62, h / 2 - 8, 22, 0, 6.283); c.fillStyle = '#7fd8ff'; c.fill(); c.stroke(); c.beginPath(); c.ellipse(62, h / 2 - 8, 40, 11, -0.3, 0, 6.283); c.stroke();
    });
    const board = mesh(new T.BoxGeometry(2.25, 0.66, 0.08), ink, 0, 3.05, 0.25); g.add(board);
    const face2 = new T.Mesh(new T.PlaneGeometry(2.2, 0.62), new T.MeshStandardMaterial({ map: sg, emissive: 0xffffff, emissiveMap: sg, emissiveIntensity: 0.35, roughness: 0.7 })); face2.position.set(0, 3.05, 0.295); g.add(face2);
    for (const x of [-0.8, 0.8]) g.add(mesh(new T.CylinderGeometry(0.035, 0.035, 0.4, 8), dark, x, 2.6, 0.25));
    // 뒤 선반 + 진열 상자 + 작은 행성들
    g.add(mesh(new T.BoxGeometry(2.45, 1.7, 0.36), dark, 0, 0.85, -0.92));
    for (const y of [0.62, 1.18]) g.add(mesh(new T.BoxGeometry(2.4, 0.06, 0.5), wood, 0, y, -0.7));
    const pc = [0xffcf3a, 0x7fd8ff, 0xff6f91, 0x8be07a, 0xb59cff, 0xffa94d];
    for (let i = 0; i < 6; i++) { const y = i < 3 ? 0.78 : 1.34, x = -0.8 + (i % 3) * 0.8; const s = mesh(new T.SphereGeometry(0.14, 16, 12), M(pc[i], { roughness: 0.5 }), x + (i > 2 ? 0.2 : 0), y, -0.66); g.add(s); }
    for (const x of [-0.95, 0.95]) g.add(mesh(new T.BoxGeometry(0.42, 0.32, 0.4), M(0xe0b072), x, 0.16, 1.05)); // 앞 나무 상자
    g.traverse(m => { m.userData.fac = 'shop'; });
    // 카운터 위 진열(그날 3마리, 날짜 시드)
    const r = DC.rng(DC.seed('dwk-shop-shelf-' + DC.today())); const ids = SHOP.pet.map(p => p.id); const pick = [];
    if (deal.cat === 'pet') pick.push(deal.id); while (pick.length < 3) { const id = ids[Math.floor(r() * ids.length)]; if (!pick.includes(id)) pick.push(id); }
    const shelf = pick.map((id, i) => { const x = (i - 1) * 0.85; g.add(mesh(new T.CylinderGeometry(0.17, 0.2, 0.1, 18), M(0xfff4dc), x, 1.1, 0.42)); const p = makePet(id, 0.3); p.root.position.set(x, 1.36, 0.42); g.add(p.root); return p; });
    // 상인(꼬마 외계인) — 실패하면 노점만 둔다
    let keeper = null;
    try {
      const ch = await EXT.K.makeCharacter(EXT.K.normalizeChar({ b: 7, skin: 0, hair: 0, c1: 10, c2: 12, hat: 1, pose: 0, p: '1-1', n: [12, 15], title: 0, skill: 0 }));
      if (ch) { ch.root.scale.setScalar(EXT.CH_S); ch.root.position.set(0, 0, -0.28); g.add(ch.root); ch.anim('idle'); const tg = EXT.makeTag('sample', '가게지기 모모 · NPC'); tg.obj = ch.root; tg.h = 1.45; keeper = { ch, tag: tg, until: 0 }; }
    } catch (e) { console.warn('상인을 못 불러옴', e); }
    const [fx, fz] = EXT.polar(SHOP_AT.r - 2.0, SHOP_AT.a);
    const f = EXT.addFac({ id: 'shop', name: '행성 상점', icon: 'gift', act: '행성 상점 둘러보기', at: [fx, fz], open: () => openShop(), tagAt: [sx, sz], tagY: 3.75 });
    f.shelf = shelf; f.keeper = keeper; return f;
  }

  // ───────── 펫 그림(상점·수집 화면용) — 광장 렌더러 하나로 그린다(휴대폰에 그래픽 화면을 더 열지 않는다) ─────────
  let thumbs = null;
  function petThumbs() {
    if (thumbs) return thumbs; thumbs = {};
    const R = EXT.renderer, S2 = 192; let rt = null;
    try {
      const sc = new T.Scene(); sc.background = new T.Color(0xfff4dc);
      sc.add(new T.HemisphereLight(0xffffff, 0x9a8fb0, 2.3)); const d = new T.DirectionalLight(0xffffff, 2.4); d.position.set(1.6, 2.6, 3); sc.add(d);
      const cam = new T.PerspectiveCamera(30, 1, 0.1, 30); cam.position.set(1.15, 0.55, 3.0); cam.lookAt(0, 0.08, 0);
      rt = new T.WebGLRenderTarget(S2, S2); const buf = new Uint8Array(S2 * S2 * 4);
      const cv = document.createElement('canvas'); cv.width = cv.height = S2; const cx = cv.getContext('2d'); const img = cx.createImageData(S2, S2);
      const prev = R.getRenderTarget(); let gamma = null;
      for (const it of SHOP.pet) {
        const p = makePet(it.id, 1); p.root.rotation.y = 0.55; p.anim(0.9, 0); sc.add(p.root); R.setRenderTarget(rt); R.render(sc, cam); R.readRenderTargetPixels(rt, 0, 0, S2, S2, buf); sc.remove(p.root); dropPet(p);
        if (gamma === null) gamma = buf[1] < 238; // 배경 크림(244)이 더 어둡게 읽히면 선형 색 → sRGB로 바꿔 준다
        const b0 = buf[0], b1 = buf[1], b2 = buf[2]; // 배경색 = 투명으로(못 가진 펫은 CSS로 그림자 실루엣)
        for (let y = 0; y < S2; y++) for (let x = 0; x < S2; x++) { const si = ((S2 - 1 - y) * S2 + x) * 4, dj = (y * S2 + x) * 4; for (let k = 0; k < 3; k++) img.data[dj + k] = gamma ? Math.round(255 * Math.pow(buf[si + k] / 255, 1 / 2.2)) : buf[si + k]; img.data[dj + 3] = Math.abs(buf[si] - b0) + Math.abs(buf[si + 1] - b1) + Math.abs(buf[si + 2] - b2) < 4 ? 0 : 255; }
        cx.putImageData(img, 0, 0); thumbs[it.id] = cv.toDataURL('image/png');
      }
      R.setRenderTarget(prev);
    } catch (e) { console.warn('펫 그림을 못 그림 — 글자로 대신 보여 줌', e); EXT.renderer.setRenderTarget(null); }
    rt?.dispose(); return thumbs;
  }
  function preview(it) {
    if (it.cat === 'pet') { const src = petThumbs()[it.id]; return el('div', { class: 'ps-pv' }, src ? el('img', { src, alt: '' }) : el('span', {}, it.name)); }
    if (it.cat === 'tag') return el('div', { class: 'ps-pv' }, el('span', { class: 'ps-nm', style: `background:${it.bg};color:${it.fg};outline:2px solid ${it.line}` }, '내 이름'));
    if (it.cat === 'bubble') return el('div', { class: 'ps-pv' }, el('span', { class: 'ps-bub', style: `background:${it.bg};color:${it.fg}` }, '안녕!'));
    if (it.id === 'none') return el('div', { class: 'ps-pv' }, el('span', { class: 'ps-nm', style: 'background:#fff;color:#7a6f86;outline:2px dashed #7a6f86' }, '없음'));
    const cv = document.createElement('canvas'); cv.width = 192; cv.height = 192; const c = cv.getContext('2d'); [[40, 130, -0.3], [96, 86, 0.25], [150, 44, -0.1]].forEach(([x, y, r]) => { c.save(); c.translate(x, y); c.rotate(r); c.drawImage(trailCanvas[it.id], -30, -30, 60, 60); c.restore(); });
    return el('div', { class: 'ps-pv' }, el('img', { src: cv.toDataURL(), alt: '' }));
  }
  const coinTag = (n, old) => el('span', { class: 'ps-pr' }, old ? el('span', { class: 'ps-old' }, String(old)) : null, el('i', { class: 'cn', 'aria-hidden': 'true' }), String(n));
  const equipped = (it) => it.cat === 'pet' ? S.pet === it.id : S[it.cat] === it.id;

  // ───────── 사기 · 장착 ─────────
  function counts() { const c = { pet: 0, tag: 0, trail: 0, bubble: 0, all: 0, total: PAID.length }; for (const it of PAID) if (S.owned.includes(it.key)) { c[it.cat]++; c.all++; } return c; }
  function checkGoals() { const c = counts(); for (const g of GOALS) if (g.ok(c) && !S.titles.includes(g.id)) { S.titles.push(g.id); save(); DP?.flash?.(['칭호를 얻었어!', `「${g.name}」`]); DC.sfx('win'); } }
  function equip(it, on = true) {
    if (!has(it)) return false;
    if (it.cat === 'pet') { S.pet = on ? it.id : null; setMyPet(); } else S[it.cat] = on ? it.id : DEFAULTS[it.cat];
    save(); applyMine(); announce(); DC.sfx('good'); return true;
  }
  function buy(it) {
    if (has(it)) return equip(it);
    if (!DP) { EXT.toast('지금은 상점을 열 수 없어'); return false; }
    const price = priceOf(it); if (DP.s.coins < price) { EXT.toast(`코인이 ${price - DP.s.coins}개 모자라. 게임 한 판 하고 와!`); DC.sfx('bad'); return false; }
    if (!DP.spend(price, 'shop:' + it.key)) { EXT.toast('코인이 모자라'); DC.sfx('bad'); return false; }
    S.owned.push(it.key); save(); DC.sfx('unlock'); DC.buzz([20, 40, 20]); DP.flash?.(['새로 샀어!', it.name]); equip(it); checkGoals(); return true;
  }

  // ───────── 상점 시트 ─────────
  let tab = 'pet', pickKey = null;
  function openShop(nextTab = tab, nextPick = pickKey) {
    tab = nextTab; pickKey = nextPick; if (DC.today() !== deal.day) { deal = { ...todayDeal(), day: DC.today() }; }
    if (S.seenDeal !== DC.today()) { S.seenDeal = DC.today(); save(); petBtn?.classList.remove('dot'); }
    const coins = DP ? DP.s.coins : 0;
    const dealIt = ITEMS.find(i => i.key === deal.key);
    const dealBox = el('div', { class: 'ps-deal', role: 'button', tabindex: '0', onclick: () => openShop(dealIt.cat, dealIt.key) }, preview(dealIt),
      el('div', {}, el('span', { class: 'lbl' }, '오늘의 진열'), el('b', {}, `${CAT_NAME[dealIt.cat]} · ${dealIt.name}`), has(dealIt) ? el('small', {}, '이미 가지고 있어') : coinTag(deal.deal, deal.price),
        el('small', {}, `매일 하나씩 ${Math.round(DEAL_OFF * 100)}% 할인 · 모두에게 같은 물건`)));
    const tabs = el('div', { class: 'tabs2', role: 'tablist' }, Object.entries(CAT_NAME).map(([k, n]) => el('button', { type: 'button', role: 'tab', 'aria-selected': String(k === tab), onclick: () => openShop(k, null) }, n)));
    const list = ITEMS.filter(i => i.cat === tab);
    const pick = list.find(i => i.key === pickKey);
    const grid = el('div', { class: 'ps-grid' }, list.map(it => {
      const own = has(it), on = equipped(it), dl = deal.key === it.key && !own;
      return el('button', { class: 'ps-item', type: 'button', 'aria-pressed': String(it.key === pickKey), onclick: () => openShop(tab, it.key) },
        on ? el('span', { class: 'st on' }, '장착 중') : own && it.price ? el('span', { class: 'st' }, '가짐') : dl ? el('span', { class: 'st deal' }, '오늘의 진열') : null,
        preview(it), el('b', {}, it.name), own ? el('span', { class: 'ps-pr' }, it.price ? '가짐' : '기본') : coinTag(priceOf(it), dl ? it.price : 0));
    }));
    let detail = null;
    if (pick) {
      const own = has(pick), on = equipped(pick), price = priceOf(pick), short = !own && coins < price;
      const btn = own ? (on && (pick.cat === 'pet' || pick.price) ? el('button', { class: 'btn k', type: 'button', onclick: () => { equip(pick, false); openShop(); } }, '해제하기') : on ? el('button', { class: 'btn k', type: 'button', disabled: '' }, '장착 중') : el('button', { class: 'btn k sun', type: 'button', onclick: () => { equip(pick); openShop(); } }, EXT.ic('check'), '장착하기'))
        : el('button', { class: 'btn k sun', type: 'button', disabled: short ? '' : null, onclick: () => { if (buy(pick)) openShop(); } }, el('i', { class: 'cn', 'aria-hidden': 'true' }), `${price}코인에 사기`);
      detail = el('div', { class: 'ps-pick' }, preview(pick), el('div', {}, el('b', {}, pick.name), el('p', {}, pick.desc || (pick.cat === 'tag' ? '내 머리 위 이름표 색이 바뀌어. 다른 주민에게도 보여.' : pick.cat === 'bubble' ? '내가 말할 때 뜨는 말풍선 색이야. 다른 주민에게도 보여.' : pick.id === 'none' ? '자국을 남기지 않아.' : '걸을 때 바닥에 자국이 남아. 다른 주민에게도 보여.')),
        short ? el('p', { class: 'note', style: 'margin:4px 0 0' }, `${price - coins}코인 모자라 · 게임 한 판이면 모일 수도 있어`) : null, btn));
    }
    EXT.sheet('행성 상점', el('div', { class: 'ps-top' }, el('span', { class: 'ps-coins' }, el('i', { class: 'cn', 'aria-hidden': 'true' }), `가진 코인 ${coins.toLocaleString()}`), el('span', { class: 'ps-coins' }, `모은 물건 ${counts().all}/${PAID.length}`)),
      dealBox, tabs, detail, grid,
      el('p', { class: 'note' }, '코인은 게임·미션·출석으로만 모여. 현금 결제는 없어. 산 물건은 「펫」 버튼에서 언제든 바꿔 낄 수 있어.'),
      el('button', { class: 'btn k', type: 'button', onclick: () => openBag() }, EXT.ic('star'), '내 수집 보기'));
  }

  // ───────── 내 수집 화면 ─────────
  function openBag() {
    const c = counts(), pct = Math.round(c.all / c.total * 100);
    const got = GOALS.filter(g => S.titles.includes(g.id)); const best = got[got.length - 1];
    const sec = (cat) => {
      const list = ITEMS.filter(i => i.cat === cat), n = list.filter(i => i.price && has(i)).length, tot = list.filter(i => i.price).length;
      return [el('h3', { class: 'ps-h' }, el('span', {}, CAT_NAME[cat]), el('span', {}, `${n}/${tot}`)), el('div', { class: 'ps-grid' }, list.map(it => {
        const own = has(it), on = equipped(it);
        return el('button', { class: 'ps-item' + (own ? '' : ' lock'), type: 'button', 'aria-pressed': String(on), onclick: () => { if (!own) { openShop(cat, it.key); return; } equip(it, !(on && (cat === 'pet' || it.price))); openBag(); } },
          on ? el('span', { class: 'st on' }, '장착 중') : null, preview(it), el('b', {}, own ? it.name : '???'), el('span', { class: 'ps-pr' }, own ? (on ? (cat === 'pet' || it.price ? '눌러서 해제' : '기본') : '눌러서 장착') : '상점에서 팔아'));
      }))];
    };
    EXT.sheet('내 펫', best ? el('span', { class: 'ps-title' }, `칭호 · ${best.name}`) : null,
      el('p', { class: 'lead' }, `모은 개수 ${c.all} / ${c.total} · ${pct}%`), el('div', { class: 'meter' }, el('i', { style: `width:${pct}%` })),
      el('ul', { class: 'ps-goals' }, GOALS.map(g => el('li', { class: S.titles.includes(g.id) ? 'on' : '' }, el('i'), el('span', {}, el('b', {}, `칭호 「${g.name}」`), el('small', {}, S.titles.includes(g.id) ? '받았어' : g.how))))),
      ...['pet', 'tag', 'trail', 'bubble'].map(sec),
      el('button', { class: 'btn k sun', type: 'button', onclick: () => { EXT.closeSheet(); if (EXT.navTo) EXT.navTo('shop'); else EXT.walkTo(shopFac.at); } }, EXT.ic('arrow'), '행성 상점으로 가기(길 안내)'));
  }
  const petBtn = EXT.addButton({ id: 'petBtn', icon: 'star', label: '펫', onClick: () => openBag(), dot: S.seenDeal !== DC.today() });

  // ───────── 매 프레임 ─────────
  let wasNear = false;
  EXT.onTick((dt, t, now) => {
    const cam = EXT.camera.position, pl = EXT.player;
    if (myPet && pl.ch && EXT.spawned()) { const busy = pl.onceUntil > now; follow(myPet, pl.root, pl.moving, dt, t, busy && !myBusy, cam, pl.moving ? 3.4 : 0); myBusy = busy; }
    if (pl.moving && EXT.spawned()) trailStep(myTrail, pl.root, S.trail);
    stepOthers(dt, t, now, cam);
    for (const m of decals) if (m.userData.life > 0) { const u = m.userData; u.life -= dt / 2.8; m.material.opacity = Math.min(1, u.life * 2.2); m.scale.setScalar(Math.min(1, m.scale.x + dt * 6)); if (u.life <= 0) m.visible = false; }
    for (const h of hearts) if (h.life > 0) { h.life -= dt * 0.9; h.sp.position.y += dt * 0.7; h.sp.material.opacity = Math.min(1, h.life * 2); h.sp.scale.setScalar(0.32 + (1 - h.life) * 0.12); if (h.life <= 0) h.sp.visible = false; }
    shopFac.shelf?.forEach((p, i) => { p.root.rotation.y = t * 0.7 + i * 2; p.root.position.y = 1.36 + Math.sin(t * 2 + i) * 0.04; p.anim(t, 0); });
    const k = shopFac.keeper; if (k) { k.ch.mixer.update(dt); const near = EXT.nearFac()?.id === 'shop'; if (near && !wasNear && now > k.until) { const d = k.ch.anim('emote-yes', { once: true }); k.until = now + 8000; setTimeout(() => k.ch.anim('idle'), d * 1000); EXT.bubble(k.tag, deal.cat === 'pet' && !S.owned.includes(deal.key) ? `어서 와! 오늘은 ${deal.name} 진열했어` : '어서 와! 오늘의 진열 보고 가'); } wasNear = near; }
    if (EXT.spawned() && (now - lastAnn > 10000 || (annSoon && now > annSoon))) { annSoon = 0; announce(); }
  });
  EXT.onSpawn(() => { applyMine(); announce(); });

  window.__pets = { SHOP, state: S, openShop, openBag, buy: (key) => buy(ITEMS.find(i => i.key === key)), equip: (key, on) => equip(ITEMS.find(i => i.key === key), on), deal: () => deal, others, get myPet() { return myPet; }, shopFac, petThumbs, counts };
}
