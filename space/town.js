/* town.js — 돈워너노우 타운 (3D 작은 행성 마을 · 소유: 타운 하위 작업)
   의존: data.js(window.DWK) → dwk-core.js(window.DC) → 이 파일(type=module, importmap 의 three@0.180.0)
   원칙: 서버 없음 · 로그인 없음 · 자유 입력 없음(마을 이름 = 단어 두 개 고르기) · 저장은 DC.store('town')
   친구 마을 구경 = 마을 상태를 짧은 문자열로 압축해 주소 해시(#t=…)에 넣는다. 해시는 서버로 가지 않는다.
   모델: Kenney CC0 (assets/kenney 폴더마다 License.txt) */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeShip, warp } from './dwk-ship.js';
import { makeLander, deckTexture } from './dwk-doom.js?v=1';
const DOOM_ON = !/[?&]skin=cute\b/.test(location.search);   // 11-28 편장부 H33: 릴스와 같은 세계 옷(town-doom.js) · ?skin=cute = 옛 옷

// 서버 연결(광장과 같은 dwk-net). 화면은 먼저 그리고, 연결은 뒤에서 붙는다(느려도 마을은 바로 보인다).
const netP = import('./dwk-net.js?v=8').then(m => m.createNet()).catch((e) => { console.warn('타운: 서버 연결 실패 — 이 기기 모드', e); return null; });
window.__dwkNetP = netP; // dwk-prog.js 가 같은 연결을 쓴다(연결 두 개 금지)

window.__townBoot = true; // town.html 의 감시 타이머가 이 값으로 「부품을 못 불러옴」을 가린다

// <codec> — 이 구간은 three·DOM 없이 돈다(node 왕복 시험이 이 구간만 잘라 실행한다)
const TownCodec = (() => {
  'use strict';
  // ★목록은 뒤에만 추가한다. 순서를 바꾸거나 지우면 이미 퍼진 구경 링크가 다른 마을로 보인다.
  const CHARS = ['male-b', 'female-a', 'male-a', 'female-c', 'male-d', 'female-e', 'robot', 'alien', 'zombie'];
  const HATS = ['none', 'straw', 'beanie', 'party', 'sunflower'];
  const PROPS = ['house', 'cabin', 'tree', 'pine', 'snowtree', 'lantern', 'flowerbed', 'rock', 'mushroom', 'tent', 'campfire',
    'bench', 'sign', 'snowman', 'present', 'fence', 'bush', 'logs', 'palm', 'sunflowerbed', 'eyelake', 'testerflag']; // 최대 64종(6비트)
  const ADJ = ['졸린', '수상한', '반짝이는', '조용한', '배고픈', '느긋한', '용감한', '비밀의', '따뜻한', '엉뚱한', '말랑한', '겁 없는', '꿈꾸는', '시끄러운', '행운의', '수줍은'];
  const NOUN = ['해바라기 마을', '온천 마을', '반딧불 마을', '별똥별 마을', '구름 마을', '눈사람 마을', '버섯 마을', '등불 마을',
    '작은 별', '오두막 마을', '호숫가 마을', '생존자 캠프', '모닥불 마을', '디저트 마을', '고양이 마을', '우주 정거장'];
  const VER = 1, MAX = 40, LAT_N = 128, LON_N = 256, ROT_N = 8, MAX_HASH = 400;
  const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const PID = /^(\d{1,2})-(\d{1,2})$/;
  const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

  function b64e(bytes) {
    let s = '', i = 0;
    for (; i + 2 < bytes.length; i += 3) { const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2]; s += AB[n >> 18 & 63] + AB[n >> 12 & 63] + AB[n >> 6 & 63] + AB[n & 63]; }
    const r = bytes.length - i;
    if (r === 1) { const n = bytes[i] << 16; s += AB[n >> 18 & 63] + AB[n >> 12 & 63]; }
    else if (r === 2) { const n = bytes[i] << 16 | bytes[i + 1] << 8; s += AB[n >> 18 & 63] + AB[n >> 12 & 63] + AB[n >> 6 & 63]; }
    return s;
  }
  function b64d(s) {
    if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
    const out = []; let buf = 0, bits = 0;
    for (const ch of s) { buf = ((buf << 6) | AB.indexOf(ch)) & 0xfffff; bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } }
    return out;
  }
  const check = (bytes) => { let h = 2166136261; for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619); } h >>>= 0; return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255; };
  const pickPlanet = (ids) => (!ids ? '1-1' : ids.includes('1-1') ? '1-1' : (ids[ids.length - 1] || '1-1'));

  // 기본 마을(처음 온 사람 · 깨진 링크): 집 1 · 나무 2 · 등불 · 화단 · 벤치
  function defaultState(ids) {
    return { v: VER, p: pickPlanet(ids), c: 0, h: 0, n: [0, 0],
      items: [[0, 88, 128, 4], [2, 89, 116, 0], [2, 87, 141, 3], [5, 82, 121, 0], [6, 81, 135, 0], [11, 78, 115, 6]] };
  }
  // 값 검사·정리. ids(출시된 행성 id 목록)가 있으면 그 안의 행성만, 없으면 형식만 본다.
  function normalize(s, ids) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    const pOk = typeof s.p === 'string' && PID.test(s.p) && (!ids || ids.includes(s.p));
    const n = Array.isArray(s.n) ? s.n : [];
    const out = { v: VER, p: pOk ? s.p : pickPlanet(ids),
      c: isInt(s.c, 0, CHARS.length - 1) ? s.c : 0,
      h: isInt(s.h, 0, HATS.length - 1) ? s.h : 0,
      n: [isInt(n[0], 0, ADJ.length - 1) ? n[0] : 0, isInt(n[1], 0, NOUN.length - 1) ? n[1] : 0],
      items: [] };
    if (Array.isArray(s.items)) for (const it of s.items) {
      if (out.items.length >= MAX) break;
      if (Array.isArray(it) && isInt(it[0], 0, PROPS.length - 1) && isInt(it[1], 0, LAT_N - 1) && isInt(it[2], 0, LON_N - 1) && isInt(it[3], 0, ROT_N - 1)) out.items.push([it[0], it[1], it[2], it[3]]);
    }
    return out;
  }
  // 바이트: [판, 편, 행성번호, 캐릭터, 모자, 단어1, 단어2, 소품수, (소품 3바이트 = 종류6·위도7·경도8·방향3)…, 검사합]
  function encode(state) {
    const s = normalize(state, null); if (!s) return '';
    const m = PID.exec(s.p); const ep = Math.min(+m[1], 255), k = Math.min(+m[2], 255);
    const bytes = [VER, ep, k, s.c, s.h, s.n[0], s.n[1], s.items.length];
    for (const [t, la, lo, r] of s.items) { const v = (t << 18) | (la << 11) | (lo << 3) | r; bytes.push(v >> 16 & 255, v >> 8 & 255, v & 255); }
    bytes.push(check(bytes));
    return b64e(bytes);
  }
  // 깨진 값이면 null (부르는 쪽이 기본 마을로 바꾼다)
  function decode(str, ids) {
    if (typeof str !== 'string') return null;
    str = str.trim().replace(/^#/, '').replace(/^t=/, '');
    if (!str || str.length > MAX_HASH) return null;
    const b = b64d(str); if (!b || b.length < 9) return null;
    if (b[0] !== VER) return null;
    const cnt = b[7]; if (cnt > MAX || b.length !== 8 + cnt * 3 + 1) return null;
    if (check(b.slice(0, -1)) !== b[b.length - 1]) return null;
    const items = [];
    for (let i = 0; i < cnt; i++) { const o = 8 + i * 3; const v = (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]; items.push([v >> 18 & 63, v >> 11 & 127, v >> 3 & 255, v & 7]); }
    return normalize({ p: `${b[1]}-${b[2]}`, c: b[3], h: b[4], n: [b[5], b[6]], items }, ids);
  }
  const name = (s) => `${ADJ[s.n[0]]} ${NOUN[s.n[1]]}`;
  // 구 표면 위치 ↔ 격자 칸(위도 128 · 경도 256). 놓는 순간 칸에 맞추므로 「보이는 것 = 링크에 든 것」.
  function toIdx(x, y, z) {
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    const lat = Math.asin(Math.max(-1, Math.min(1, y))), lon = Math.atan2(z, x);
    const la = Math.max(0, Math.min(LAT_N - 1, Math.floor((lat + Math.PI / 2) / Math.PI * LAT_N)));
    const lo = ((Math.floor((lon + Math.PI) / (2 * Math.PI) * LON_N) % LON_N) + LON_N) % LON_N;
    return [la, lo];
  }
  function fromIdx(la, lo) {
    const lat = -Math.PI / 2 + (la + 0.5) / LAT_N * Math.PI, lon = -Math.PI + (lo + 0.5) / LON_N * 2 * Math.PI;
    return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  }
  return { CHARS, HATS, PROPS, ADJ, NOUN, VER, MAX, LAT_N, LON_N, ROT_N, defaultState, normalize, encode, decode, name, toIdx, fromIdx, b64e, b64d };
})();
// </codec>

const DC = window.DC, D = window.DWK;
const C = TownCodec;
const $ = (s) => document.querySelector(s);
const el = (...a) => DC.el(...a);
const V3 = THREE.Vector3;
const R = 8;                 // 행성 반지름(캐릭터 키 ≈ 1.15)
const SPEED = 2.4;           // 걷는 속도(단위/초)
const ASSET = 'assets/kenney/';
const FONT = "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif";
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ───────── 정의 ─────────
const CHAR_LABEL = { 'male-b': '주민 A', 'female-a': '주민 B', 'male-a': '주민 C', 'female-c': '주민 D', 'male-d': '주민 E', 'female-e': '주민 F', robot: '로봇', alien: '외계인', zombie: '좀비' };
const HAT_DEF = {
  none: { name: '맨머리', emoji: '🙂' },
  straw: { name: '밀짚모자', emoji: '👒' },
  beanie: { name: '털모자', emoji: '🧶' },
  party: { name: '고깔모자', emoji: '🥳' },
  sunflower: { name: '해바라기 모자', emoji: '🌻', reward: 'hat-sunflower' },
};
// r = 부딪힘 반지름 · ph = 탭 판정 높이 · h/w = 목표 키/폭 · reward = 이 해금 id 가 있어야 놓을 수 있음
const PROP_DEF = {
  house: { name: '집', emoji: '🏠', make: 'house', r: 1.05, ph: 2.2 },
  cabin: { name: '통나무집', emoji: '🛖', make: 'cabin', r: 1.15, ph: 2 },
  tree: { name: '나무', emoji: '🌳', model: 'nature/tree_oak', h: 2.3, r: 0.45, ph: 2.3 },
  pine: { name: '소나무', emoji: '🌲', model: 'nature/tree_pineDefaultA', h: 2.6, r: 0.4, ph: 2.6 },
  snowtree: { name: '눈 나무', emoji: '🎄', model: 'holiday/tree-snow-a', h: 2.3, r: 0.55, ph: 2.3 },
  lantern: { name: '등불', emoji: '🏮', model: 'holiday/lantern', h: 1.5, r: 0.25, ph: 1.5, glow: [0.8, 'rgba(255,196,110,.95)', 1.5] },
  flowerbed: { name: '화단', emoji: '🌷', make: 'flowerbed', r: 0.55, ph: 0.6 },
  rock: { name: '바위', emoji: '🪨', model: 'nature/rock_largeA', w: 1.2, r: 0.55, ph: 0.6 },
  mushroom: { name: '버섯', emoji: '🍄', model: 'nature/mushroom_redGroup', h: 0.75, r: 0.35, ph: 0.8 },
  tent: { name: '텐트', emoji: '⛺', model: 'nature/tent_detailedOpen', w: 1.8, r: 0.85, ph: 1.2 },
  campfire: { name: '모닥불', emoji: '🔥', make: 'campfire', r: 0.45, ph: 0.8 },
  bench: { name: '벤치', emoji: '🪑', model: 'holiday/bench', w: 1.3, r: 0.5, ph: 0.9 },
  sign: { name: '표지판', emoji: '🪧', model: 'nature/sign', h: 1.1, r: 0.25, ph: 1.1 },
  snowman: { name: '눈사람', emoji: '⛄', model: 'holiday/snowman', h: 1.3, r: 0.45, ph: 1.3 },
  present: { name: '선물상자', emoji: '🎁', model: 'holiday/present-a-round', h: 0.55, r: 0.4, ph: 0.6 },
  fence: { name: '울타리', emoji: '🚧', model: 'nature/fence_simple', w: 1.6, r: 0.3, ph: 0.6 },
  bush: { name: '덤불', emoji: '🌿', model: 'nature/plant_bushLarge', h: 0.85, r: 0.45, ph: 0.9 },
  logs: { name: '장작', emoji: '🪵', model: 'nature/log_stack', h: 0.75, r: 0.45, ph: 0.8 },
  palm: { name: '야자수', emoji: '🌴', model: 'nature/tree_palmShort', h: 2.2, r: 0.4, ph: 2.2 },
  sunflowerbed: { name: '해바라기 화단', emoji: '🌻', make: 'sunflowers', r: 0.6, ph: 1.2, reward: 'prop-sunflower' },
  eyelake: { name: '눈알 호수', emoji: '👁️', make: 'eyelake', r: 1.0, ph: 0.6, reward: 'prop-eye' },
  testerflag: { name: '테스터 깃발', emoji: '🎫', make: 'flag', r: 0.25, ph: 1.7, reward: 'badge-tester' },
};
// 숨은 행성: 이 해금 id(또는 생존 게임 test.html 의 보너스)가 있어야 고를 수 있다
const HIDDEN_PLANETS = { '2-3': 'planet-2-3' };

// 행성 분위기(행성 id 별). 새 행성이 data.js 에 생기면 FALLBACK 이 분위기(mood)로 고른다.
const THEMES = {
  '1-1': { ground: [0x86b44a, 0x74a23f, 0x95c257], space: 0x1d1733, hemi: [0xfff1d0, 0x56682e, 1.15], sun: [0xfff0c8, 2.6], atm: 'rgba(255,214,120,.55)',
    decor: [{ m: 'nature/grass_large', n: 110, h: [0.3, 0.55] }, { m: 'nature/flower_yellowA', n: 50, h: [0.3, 0.45] }], sunflowers: 360 },
  '1-2': { ground: [0xf3f6f9, 0xe4ebf2, 0xd9e3ed], space: 0x101a2c, hemi: [0xe8f2ff, 0x8aa0b8, 1.15], sun: [0xffffff, 2.3], atm: 'rgba(200,225,255,.5)',
    decor: [{ m: 'holiday/tree-snow-a', n: 24, h: [1.8, 2.9], far: true }, { m: 'holiday/tree-snow-b', n: 20, h: [1.8, 2.9], far: true }, { m: 'nature/rock_largeA', n: 12, w: [0.5, 1], tint: 0xdfe6ee }],
    lakes: 6, lakeColor: 0x6fd0de, lakeR: [0.8, 1.3], particles: [['steam', 70], ['snow', 260]] },
  '1-3': { ground: [0xc3c8d0, 0xb3b9c4, 0xd0d4da], space: 0x141a2a, hemi: [0xf4f6ff, 0x6c7280, 1.1], sun: [0xfff6e8, 2.4], atm: 'rgba(170,200,255,.45)',
    buildings: 80, decor: [{ m: 'nature/plant_bushLarge', n: 36, h: [0.4, 0.7] }], glows: [40, 'rgba(255,214,150,.9)', 0.9] },
  '1-4': { ground: [0x2e5a3c, 0x27503a, 0x366646], space: 0x050914, hemi: [0x7489c8, 0x1a2a20, 0.75], sun: [0xa9c0ff, 1.25], atm: 'rgba(120,200,255,.4)', night: true,
    decor: [{ m: 'nature/tree_pineDefaultA', n: 44, h: [2.2, 3.4], far: true }, { m: 'nature/rock_largeA', n: 12, w: [0.5, 1] }, { m: 'nature/grass_large', n: 60, h: [0.3, 0.5] }],
    lakes: 5, lakeColor: 0x1d4f73, lakeR: [1, 1.7], particles: [['fireflies', 160]] },
  '2-1': { ground: [0xeceef2, 0xe1e4ea, 0xf4f5f8], space: 0x0b0d14, hemi: [0xdfe6f0, 0x9aa3b0, 1.0], sun: [0xe8eeff, 1.8], atm: 'rgba(200,210,230,.35)',
    decor: [{ m: 'nature/rock_largeA', n: 16, w: [0.5, 1.2], tint: 0xe4e7ec }], bigLake: { lat: 0.42, lon: 0.5, r: 2.6, color: 0x2c6fb8 } },
  '2-2': { ground: [0xf3e8de, 0xeadbcd, 0xf7efe7], space: 0x140f12, hemi: [0xfff0e6, 0xb89c8c, 1.1], sun: [0xfff2e0, 2.2], atm: 'rgba(255,220,200,.4)',
    decor: [{ m: 'nature/rock_tallA', n: 30, h: [2.4, 4.6], far: true, tint: 0xf6eee6 }], particles: [['steam', 60]] },
  '2-3': { ground: [0xeef0ea, 0xe2e5dc, 0xf5f6f2], space: 0x0c0e12, hemi: [0xf0f2ee, 0x9ea394, 1.0], sun: [0xf4f6ff, 1.9], atm: 'rgba(230,235,225,.4)',
    decor: [{ m: 'nature/tree_thin', n: 80, h: [2.2, 3.6], far: true, tint: 0xf7f7f3 }] },
  '3-1': { ground: [0xf7c6d4, 0xf3b5c7, 0xfbd7e1], space: 0x2a1630, hemi: [0xffe8f0, 0xb0708a, 1.15], sun: [0xfff3e0, 2.4], atm: 'rgba(255,190,215,.5)',
    decor: [{ m: 'holiday/candy-cane-red', n: 30, h: [0.8, 1.4] }, { m: 'holiday/candy-cane-green', n: 22, h: [0.8, 1.4] }, { m: 'holiday/present-a-round', n: 14, h: [0.4, 0.7] }],
    puffs: [50, [0xfff6ea, 0xfdd9a8, 0xa86b45]] },
  '3-2': { ground: [0x8fd6ea, 0x7ccbe2, 0xa6e2f2], space: 0x07203a, hemi: [0xd8f6ff, 0x2c6a8a, 1.1], sun: [0xe8fbff, 2.2], atm: 'rgba(140,220,255,.6)',
    decor: [{ m: 'nature/lily_large', n: 46, w: [0.5, 0.9] }, { m: 'nature/grass_large', n: 40, h: [0.3, 0.5], tint: 0x5fb3a8 }], dome: 0x9fe8ff, particles: [['bubbles', 120]] },
  '3-3': { ground: [0xffffff, 0xf1f4fa, 0xe8eef8], space: 0x2a3a66, hemi: [0xffffff, 0xc9d4f0, 1.2], sun: [0xfff6ea, 2.2], atm: 'rgba(255,255,255,.5)',
    puffs: [100, [0xffffff, 0xf3f5fb]] },
  '4-1': { ground: [0x8c7a55, 0x7c6b49, 0x9a8862], space: 0x1a0f12, hemi: [0xffc9a0, 0x3b2a20, 0.9], sun: [0xffa868, 2.0], atm: 'rgba(255,170,110,.45)',
    decor: [{ m: 'nature/tent_detailedOpen', n: 7, w: [1.6, 2], far: true }, { m: 'nature/campfire_stones', n: 6, w: [0.8, 1], glow: ['rgba(255,140,50,.95)', 0.4, 1.8] },
      { m: 'nature/log_stack', n: 10, h: [0.6, 0.8] }, { m: 'nature/tree_default', n: 18, h: [2, 3], far: true }], particles: [['embers', 90]] },
  '4-2': { ground: [0xd4dbe8, 0xc8d0e0, 0xe2e7f0], metal: 0.65, rough: 0.18, space: 0x120f24, hemi: [0xf3eaff, 0x8d84a8, 1.1], sun: [0xffffff, 2.4], atm: 'rgba(220,200,255,.5)',
    decor: [{ m: 'nature/flower_purpleA', n: 60, h: [0.3, 0.5] }, { m: 'nature/flower_redA', n: 40, h: [0.3, 0.5] }] },
};
const FALLBACK = {
  '공포': { ground: [0xe9eaee, 0xdfe1e7, 0xf2f3f6], space: 0x0b0d14, hemi: [0xdfe6f0, 0x9aa3b0, 1], sun: [0xe8eeff, 1.9], atm: 'rgba(210,215,230,.35)', decor: [{ m: 'nature/rock_largeA', n: 14, w: [0.5, 1.1], tint: 0xe4e7ec }] },
  default: { ground: [0x7fb04c, 0x6e9f41, 0x8dbd58], space: 0x161a30, hemi: [0xf4f0e0, 0x4f6a34, 1.1], sun: [0xfff2d6, 2.4], atm: 'rgba(170,220,255,.45)', decor: [{ m: 'nature/grass_large', n: 90, h: [0.3, 0.5] }, { m: 'nature/tree_default', n: 18, h: [2, 3], far: true }] },
};
const themeOf = (p) => THEMES[p.id] || (String(p.mood).includes('공포') ? FALLBACK['공포'] : FALLBACK.default);

// ───────── 상태 ─────────
const PLANETS = DC.planets();
const PIDS = PLANETS.map(p => p.id);
const planetLocked = (id) => !!HIDDEN_PLANETS[id] && !(DC.rewards.has(HIDDEN_PLANETS[id]) || DC.store.get('bonus', false));
const propOpen = (id) => !PROP_DEF[id].reward || DC.rewards.has(PROP_DEF[id].reward);
const hatOpen = (id) => !HAT_DEF[id].reward || DC.rewards.has(HAT_DEF[id].reward);
const codeRewardIds = new Set((D.codes || []).flatMap(c => (c.rewards || []).map(r => r.id)));

let VISIT = false, BROKEN = false;
let S; // { v, p, c, h, n:[a,b], items:[[t,la,lo,r]] }
{
  const m = /(?:^|[#&])t=([A-Za-z0-9_-]*)/.exec(location.hash);
  if (m) {
    VISIT = true; S = C.decode(m[1], PIDS);
    if (!S) { BROKEN = true; S = C.defaultState(PIDS); }
  } else {
    S = C.normalize(DC.store.get('town', null), PIDS) || C.defaultState(PIDS);
    // 내 마을: 해금 안 된 것은 걸러 낸다(저장소 일부가 지워졌을 때 대비)
    if (planetLocked(S.p)) S.p = C.defaultState(PIDS).p;
    if (!hatOpen(C.HATS[S.h])) S.h = 0;
    S.items = S.items.filter(it => propOpen(C.PROPS[it[0]]));
  }
}
const townName = () => C.name(S);
let saveT = 0;
function save() {
  if (VISIT) return;
  S.items = items.map(it => [it.t, it.la, it.lo, it.r]);
  clearTimeout(saveT); saveT = setTimeout(() => { DC.store.set('town', S); onSaved(); }, 250);
}
let onSaved = () => {}; // 서버 공개·로비 갱신(아래 「행성 사이」 구간이 채운다)

// ───────── 렌더러 ─────────
const canvas = $('#scene');
function fail(title, msg) {
  $('#loading')?.classList.add('hidden');
  const f = $('#fail'); if (!f) return; f.classList.remove('hidden');
  f.querySelector('h2').textContent = title; $('#failText').textContent = msg;
}
function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl'); } catch { return false; }
}
let renderer;
if (!webglOK()) { fail('3D가 안 열려', '이 브라우저에서는 3D 그림(WebGL)을 쓸 수 없어. 크롬·사파리 최신판으로 다시 열어 줘.'); throw new Error('WebGL 없음'); }
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) { fail('3D가 안 열려', '그래픽 기능을 켜지 못했어. 다른 앱을 닫거나 브라우저를 바꿔 다시 열어 줘.'); throw e; }
const TOUCH = matchMedia('(pointer: coarse)').matches; // 휴대폰: 해상도 1.5배까지·부드러운 그림자 대신 기본 그림자(2026-11-20 광장 끊김 실측과 같은 처방)
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, TOUCH ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = TOUCH ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('3D가 멈췄어', '그래픽 메모리가 모자랐나 봐. 새로고침하면 다시 열려.'); });

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 400);
{
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
  scene.environmentIntensity = 0.35;
}
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 60 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(hemi, sun, sun.target);

// 별 (점 하나 = 그리기 1회)
{
  const rnd = DC.rng(DC.seed('stars')); const n = 700, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.set([s * Math.cos(a) * 180, u * 180, s * Math.sin(a) * 180], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false })));
}

// 빛 번짐 텍스처(등불·반딧불·대기)
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const rgba = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); const [r, g, b, a = 1] = m[1].split(',').map(Number); return { color: new THREE.Color(r / 255, g / 255, b / 255), a }; };
function glowSprite(css, scale, additive = true) {
  const { color, a } = rgba(css);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, opacity: a, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  s.scale.set(scale, scale, 1); return s;
}

// ───────── 구 위 좌표계 ─────────
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new V3(), _w = new V3();
const dirOf = (la, lo) => new V3(...C.fromIdx(la, lo));
function northAt(up, out = new V3()) {
  out.set(0, 1, 0).addScaledVector(up, -up.y);
  if (out.lengthSq() < 1e-6) out.set(0, 0, 1).addScaledVector(up, -up.z);
  return out.normalize();
}
// 위 = dir · 앞(+Z) = 북쪽 방향인 회전
function frameQuat(up, q = new THREE.Quaternion()) {
  const z = northAt(up, new V3()); const x = new V3().crossVectors(up, z);
  _m.makeBasis(x, up, z); return q.setFromRotationMatrix(_m);
}
function faceQuat(up, fwd, q = new THREE.Quaternion()) {
  const z = fwd.clone().addScaledVector(up, -fwd.dot(up)); if (z.lengthSq() < 1e-8) northAt(up, z); z.normalize();
  const x = new V3().crossVectors(up, z); _m.makeBasis(x, up, z); return q.setFromRotationMatrix(_m);
}
// 접평면에서 평평한 원판을 구 표면에 맞게 살짝 굽힌다
function bendToSphere(geo, lift = 0.02) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + lift - (x * x + z * z) / (2 * R)); }
  geo.computeVertexNormals(); return geo;
}
const flatDisc = (r, seg = 28) => bendToSphere(new THREE.CircleGeometry(r, seg).rotateX(-Math.PI / 2));

// ───────── 모델 읽기(진행 표시) ─────────
const manager = new THREE.LoadingManager();
const loader = new GLTFLoader(manager);
const gltfs = {}; const missing = new Set();
manager.onProgress = (_u, done, total) => {
  const bar = $('#loadBar'); if (bar) bar.style.width = `${Math.round(done / Math.max(total, 1) * 100)}%`;
  const t = $('#loadText'); if (t) t.textContent = `행성 짓는 중… ${done}/${total}`;
};
function load(name) {
  if (!gltfs[name]) gltfs[name] = loader.loadAsync(`${ASSET}${name}.glb`).catch((e) => { console.warn('타운: 모델을 못 불러옴', name, e); missing.add(name); return null; });
  return gltfs[name];
}
const charModel = (key) => `chars/character-${key}`;

// ───────── 재료·템플릿 ─────────
const matCache = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
  return matCache.get(k);
}
const emissive = (c, e = 1.2) => mat(c, { emissive: c, emissiveIntensity: e, roughness: 0.5 });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

// 같은 재료끼리 합쳐서 그리기 횟수를 줄인다(소품 하나 = 재료 수만큼)
function bake(group) {
  group.updateMatrixWorld(true); const by = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.morphAttributes = {}; g.applyMatrix4(o.matrixWorld);
    if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [m, geos] of by) { const mm = new THREE.Mesh(mergeGeometries(geos), m); mm.castShadow = mm.receiveShadow = true; out.add(mm); }
  return out;
}
// GLB 를 바닥 가운데에 세우고 목표 키(h) 또는 폭(w)에 맞춘다
function fitModel(name, { h, w }) {
  const g = gltfs.__done[name]; if (!g) return null;
  const s0 = g.scene.clone(true); const box = new THREE.Box3().setFromObject(s0); const size = box.getSize(new V3());
  const s = h ? h / size.y : w / Math.max(size.x, size.z);
  s0.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const wrap = new THREE.Group(); wrap.add(s0); wrap.scale.setScalar(s);
  wrap.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return wrap;
}

const MAKERS = {
  house() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(1.5, 1.05, 1.3), mat(0xf3e9d8), 0, 0.525, 0));
    const roof = mesh(new THREE.ConeGeometry(1.32, 0.85, 4), mat(0xc4553f), 0, 1.47, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
    g.add(mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), mat(0x8a5a44), 0.42, 1.55, -0.28));
    g.add(mesh(new THREE.BoxGeometry(0.36, 0.6, 0.06), mat(0x6b4428), 0, 0.3, 0.66));
    for (const x of [-0.48, 0.48]) g.add(mesh(new THREE.BoxGeometry(0.3, 0.28, 0.05), emissive(0xffc56b, 0.9), x, 0.62, 0.66));
    g.add(mesh(new THREE.BoxGeometry(0.6, 0.06, 0.3), mat(0x9a948a), 0, 0.03, 0.82));
    return { stat: g };
  },
  cabin() {
    const g = new THREE.Group(); const W = 1.8, Dd = 1.4, logR = 0.085;
    const logM = [mat(0x7a5338), mat(0x6a4630)]; const cyl = new THREE.CylinderGeometry(logR, logR, 1, 7).rotateZ(Math.PI / 2);
    const log = (len, x, y, z, ry, m) => { const o = mesh(cyl, m, x, y, z); o.scale.x = len; o.rotation.y = ry; g.add(o); };
    for (let i = 0; i < 6; i++) { const y = logR + i * logR * 1.8, m = logM[i % 2];
      log(W + 0.2, 0, y, Dd / 2, 0, m); log(W + 0.2, 0, y, -Dd / 2, 0, m); log(Dd + 0.2, W / 2, y, 0, Math.PI / 2, m); log(Dd + 0.2, -W / 2, y, 0, Math.PI / 2, m); }
    const top = logR + 6 * logR * 1.8, rise = 0.55, slope = Math.atan2(rise, Dd / 2), len = Math.hypot(rise, Dd / 2) + 0.22;
    const gable = new THREE.Shape([new THREE.Vector2(-Dd / 2, 0), new THREE.Vector2(Dd / 2, 0), new THREE.Vector2(0, rise)]);
    for (const sx of [-1, 1]) { const tri = mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.08, bevelEnabled: false }), logM[0], sx * W / 2 - 0.04, top - 0.05, 0); tri.rotation.y = Math.PI / 2; g.add(tri); }
    for (const sz of [-1, 1]) {
      const r = mesh(new THREE.BoxGeometry(W + 0.35, 0.08, len), mat(0x3b2a20), 0, top + rise / 2, sz * Dd / 4); r.rotation.x = sz * slope; g.add(r);
      const sn = mesh(new THREE.BoxGeometry(W + 0.4, 0.07, len + 0.02), mat(0xf4f7fb, { roughness: 0.95 }), 0, top + rise / 2 + 0.07, sz * Dd / 4); sn.rotation.x = sz * slope; g.add(sn);
    }
    g.add(mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), mat(0x6d6a66, { roughness: 1 }), W / 2 - 0.45, top + 0.35, -0.2));
    g.add(mesh(new THREE.BoxGeometry(0.34, 0.62, 0.05), mat(0x4a2e1e), 0, 0.31, Dd / 2 + 0.09));
    for (const x of [-0.55, 0.55]) g.add(mesh(new THREE.BoxGeometry(0.32, 0.28, 0.05), emissive(0xffa040, 1.4), x, 0.6, Dd / 2 + 0.09));
    return { stat: g };
  },
  flowerbed() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 14), mat(0x6b4a2f, { roughness: 1 }), 0, 0.06, 0));
    const kinds = ['nature/flower_redA', 'nature/flower_purpleA', 'nature/flower_yellowA'];
    for (let i = 0; i < 8; i++) { const f = fitModel(kinds[i % 3], { h: 0.38 + (i % 2) * 0.08 }); if (!f) continue; const a = i / 8 * Math.PI * 2, r = i === 7 ? 0 : 0.33;
      f.position.set(Math.cos(a) * r, 0.1, Math.sin(a) * r); f.rotation.y = a * 2; g.add(f); }
    return { stat: g };
  },
  sunflowers() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.12, 14), mat(0x5a3d26, { roughness: 1 }), 0, 0.06, 0));
    const stem = new THREE.CylinderGeometry(0.03, 0.04, 1, 6), head = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), eye = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), leaf = new THREE.BoxGeometry(0.22, 0.02, 0.1);
    const spots = [[0, 0, 1.15], [0.34, 0.1, 0.95], [-0.32, 0.14, 1.0], [0.1, -0.33, 0.85], [-0.12, 0.36, 0.9]];
    spots.forEach(([x, z, hgt], i) => {
      const s = mesh(stem, mat(0x4f8a2b), x, 0.1 + hgt / 2, z); s.scale.y = hgt; g.add(s);
      const hd = new THREE.Group(); hd.position.set(x, 0.1 + hgt, z); hd.rotation.set(1.15, i * 0.9, 0);
      hd.add(mesh(head, mat(0xf2c21a, { roughness: 0.7 }))); hd.add(mesh(eye, mat(0x4a2a12), 0, 0.02, 0)); g.add(hd);
      const l = mesh(leaf, mat(0x5d9a31), x + 0.1, 0.1 + hgt * 0.45, z); l.rotation.y = i; g.add(l);
    });
    return { stat: g };
  },
  campfire() {
    const g = new THREE.Group(); const base = fitModel('nature/campfire_stones', { w: 0.9 }); if (base) g.add(base);
    const flame = new THREE.Group(); flame.position.y = 0.08;
    flame.add(mesh(new THREE.ConeGeometry(0.17, 0.5, 7), emissive(0xff7a1a, 2.2), 0, 0.25, 0));
    flame.add(mesh(new THREE.ConeGeometry(0.09, 0.32, 7), emissive(0xffd54a, 2.6), 0, 0.2, 0));
    const gl = glowSprite('rgba(255,140,50,.9)', 1.8); gl.position.y = 0.45;
    flame.userData.anim = 'flame';
    return { stat: g, extra: [flame, gl] };
  },
  eyelake() {
    const g = new THREE.Group();
    g.add(mesh(flatDisc(1.25, 32), mat(0xd9cfb4, { roughness: 1 })));
    const water = mesh(flatDisc(1.02, 32), mat(0x2d6fa8, { roughness: 0.08, metalness: 0.1 })); water.position.y = 0.012; g.add(water);
    const eye = new THREE.Group(); eye.position.y = 0.22;
    const ball = mesh(new THREE.SphereGeometry(0.42, 20, 14), mat(0xf7f4ee, { roughness: 0.35 })); ball.castShadow = true; eye.add(ball);
    const iris = mesh(new THREE.SphereGeometry(0.2, 16, 10), mat(0x3a7bd5, { roughness: 0.3 }), 0, 0, 0.33); iris.scale.z = 0.35; eye.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0x0b0b10, { roughness: 0.2 }), 0, 0, 0.395); pupil.scale.z = 0.35; eye.add(pupil);
    const shine = mesh(new THREE.SphereGeometry(0.035, 8, 6), emissive(0xffffff, 1.5), 0.05, 0.06, 0.42); eye.add(shine);
    eye.userData.anim = 'eye';
    return { stat: g, extra: [eye] };
  },
  flag() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.12, 10), mat(0x8d8a84, { roughness: 1 }), 0, 0.06, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), mat(0xd7d4cc, { metalness: 0.4, roughness: 0.4 }), 0, 0.85, 0));
    g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xffd34d, { metalness: 0.5, roughness: 0.3 }), 0, 1.72, 0));
    const fl = new THREE.Group(); fl.position.set(0.03, 1.48, 0);
    fl.add(mesh(new THREE.BoxGeometry(0.62, 0.38, 0.025), mat(0xffd34d), 0.31, 0, 0));
    fl.add(mesh(new THREE.BoxGeometry(0.62, 0.07, 0.03), mat(0x241f2e), 0.31, -0.06, 0));
    fl.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 0.032), mat(0x7fe3ff), 0.42, 0.08, 0));
    fl.userData.anim = 'flag';
    return { stat: g, extra: [fl] };
  },
};
const templates = {};
function propTemplate(id) {
  if (templates[id] !== undefined) return templates[id];
  const def = PROP_DEF[id]; let t = null;
  if (def.make) {
    const { stat, extra = [] } = MAKERS[def.make](); const out = bake(stat); for (const e of extra) out.add(e); t = out;
  } else if (def.model) {
    t = fitModel(def.model, def);
    if (t && def.glow) { const [y, css, s] = def.glow; const gl = glowSprite(css, s); gl.position.y = def.h * y; gl.userData.anim = 'glow'; t.add(gl); }
  }
  templates[id] = t; return t;
}

// ───────── 모자 ─────────
function makeHat(id) {
  const g = new THREE.Group();
  if (id === 'straw') {
    g.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 22), mat(0xe6c47a), 0, 0.02, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.55, 18), mat(0xe6c47a), 0, 0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 18), mat(0xc7413a), 0, 0.12, 0));
    g.position.y = -0.18;
  } else if (id === 'beanie') {
    const cap = mesh(new THREE.SphereGeometry(1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9534f, { roughness: 1 })); cap.scale.y = 0.8; g.add(cap);
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.28, 18), mat(0xf0ebe0, { roughness: 1 }), 0, 0.02, 0));
    g.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), mat(0xf0ebe0, { roughness: 1 }), 0, 0.92, 0));
    g.position.y = -0.42;
  } else if (id === 'party') {
    g.add(mesh(new THREE.ConeGeometry(0.6, 1.4, 18), mat(0xff6fae), 0, 0.7, 0));
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 18).rotateX(Math.PI / 2), mat(0x7fe3ff), 0, 0.42, 0));
    g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xffd34d), 0, 1.42, 0));
    g.position.y = -0.12;
  } else if (id === 'sunflower') {
    const petal = new THREE.SphereGeometry(0.42, 10, 8);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const p = mesh(petal, mat(0xf6c31b, { roughness: 0.7 }), Math.cos(a) * 0.95, 0.06, Math.sin(a) * 0.95); p.scale.set(1, 0.25, 0.55); p.rotation.y = -a; g.add(p); }
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.22, 18), mat(0x5a3418, { roughness: 1 }), 0, 0.1, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat(0x4f8a2b), 0, 0.38, 0));
    g.position.y = -0.06;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ───────── 장면 객체 ─────────
let planetGroup = null, planetMesh = null, atmo = null, particles = [], theme = null, curPlanet = null;
const itemsGroup = new THREE.Group(); scene.add(itemsGroup);
const fx = new THREE.Group(); scene.add(fx);
const items = []; const anims = [];
const proxyMat = new THREE.MeshBasicMaterial({ visible: false });

function scatterDirs(n, rnd, avoid = []) {
  const out = []; let guard = n * 20;
  while (out.length < n && guard-- > 0) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); const d = new V3(s * Math.cos(a), u, s * Math.sin(a));
    if (avoid.some(([c, ang]) => d.angleTo(c) < ang)) continue; out.push(d);
  }
  return out;
}
// 장식(편집 불가)은 인스턴싱: 모델 하나를 n번 그려도 재료 수만큼만 그린다
function instanced(name, dirs, rnd, { h, w, tint }) {
  const g = gltfs.__done[name]; if (!g) return null;
  const src = g.scene; src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src); const size = box.getSize(new V3());
  const N = new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  const per = dirs.map(d => {
    const k = h ? (h[0] + rnd() * (h[1] - h[0])) / size.y : (w[0] + rnd() * (w[1] - w[0])) / Math.max(size.x, size.z);
    const q = frameQuat(d).multiply(_q.setFromAxisAngle(new V3(0, 1, 0), rnd() * Math.PI * 2));
    return new THREE.Matrix4().compose(d.clone().multiplyScalar(R - 0.02), q, new V3(k, k, k)).multiply(N);
  });
  const grp = new THREE.Group(); const tall = (h ? h[1] : 0) > 1.2;
  src.traverse(o => {
    if (!o.isMesh) return;
    let m = o.material; if (tint != null) { m = m.clone(); m.color = new THREE.Color(tint); m.map = null; }
    const im = new THREE.InstancedMesh(o.geometry, m, per.length);
    per.forEach((M, i) => im.setMatrixAt(i, _m.multiplyMatrices(M, o.matrixWorld)));
    im.castShadow = tall; im.receiveShadow = true; im.computeBoundingSphere(); grp.add(im);
  });
  grp.userData.mats = per; return grp;
}

function makeParticles(kind, n, rnd) {
  const pos = new Float32Array(n * 3); const seeds = [];
  const cfg = {
    fireflies: { color: 0xffe27a, size: 0.32, add: true, op: 0.95 }, snow: { color: 0xffffff, size: 0.16, add: false, op: 0.9 },
    bubbles: { color: 0xd9fbff, size: 0.28, add: true, op: 0.55 }, steam: { color: 0xf4f6f8, size: 1.1, add: false, op: 0.22 },
    embers: { color: 0xffa040, size: 0.14, add: true, op: 0.9 },
  }[kind];
  const lakes = particles.lakes || [];
  for (let i = 0; i < n; i++) {
    let d; if ((kind === 'steam') && lakes.length) { const L = lakes[i % lakes.length]; d = L.d.clone().add(new V3((rnd() - .5) * .15, (rnd() - .5) * .15, (rnd() - .5) * .15)).normalize(); }
    else { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); d = new V3(s * Math.cos(a), u, s * Math.sin(a)); }
    seeds.push({ d, h: rnd() * 3, ph: rnd() * 6.28, v: 0.4 + rnd() * 0.8 });
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: cfg.color, size: cfg.size, transparent: true, opacity: cfg.op, depthWrite: false, blending: cfg.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  pts.frustumCulled = false;
  const step = (dt, t) => {
    for (let i = 0; i < n; i++) {
      const s = seeds[i]; let r;
      if (kind === 'fireflies') r = R + 0.4 + 1.2 * (0.5 + 0.5 * Math.sin(t * 0.7 * s.v + s.ph)) + s.h * 0.3;
      else if (kind === 'snow') { s.h = (s.h - dt * s.v * 0.9 + 6) % 6; r = R + s.h; }
      else if (kind === 'bubbles' || kind === 'embers') { s.h = (s.h + dt * s.v * (kind === 'embers' ? 0.9 : 0.5)) % 4; r = R + 0.1 + s.h; }
      else { s.h = (s.h + dt * s.v * 0.35) % 2.2; r = R + 0.1 + s.h; }
      const wob = kind === 'fireflies' || kind === 'bubbles' ? 0.04 : 0.015;
      pos[i * 3] = s.d.x * r + Math.sin(t * s.v + s.ph) * wob * r; pos[i * 3 + 1] = s.d.y * r + Math.cos(t * s.v * 0.8 + s.ph) * wob * r; pos[i * 3 + 2] = s.d.z * r;
    }
    geo.attributes.position.needsUpdate = true;
  };
  step(0, 0); return { obj: pts, step };
}

const SPAWN = new V3(Math.cos(0.3), Math.sin(0.3), 0).normalize();
const HOME = dirOf(86, 128);

function buildPlanet(p) {
  if (planetGroup) { scene.remove(planetGroup); planetGroup.traverse(o => { if (o.geometry && !o.isSprite) o.geometry.dispose(); }); }
  for (const pt of particles) scene.remove(pt.obj); particles = []; particles.lakes = [];
  curPlanet = p; theme = themeOf(p);
  const rnd = DC.rng(DC.seed('town-' + p.id));
  planetGroup = new THREE.Group(); scene.add(planetGroup);
  scene.background = new THREE.Color(theme.space);
  hemi.color.setHex(theme.hemi[0]); hemi.groundColor.setHex(theme.hemi[1]); hemi.intensity = theme.hemi[2];
  sun.color.setHex(theme.sun[0]); sun.intensity = theme.sun[1];

  // 땅: 낮은 다각형 + 면마다 색 섞기
  const geo = new THREE.IcosahedronGeometry(R, 14); const pa = geo.attributes.position; const cols = new Float32Array(pa.count * 3);
  const noise = (x, y, z) => Math.sin(x * 0.9 + 1.3) * Math.sin(y * 1.1 + 0.4) * Math.sin(z * 0.8 + 2.1) + 0.5 * Math.sin(x * 2.3 + y * 1.7) * Math.sin(z * 2.1 - y);
  for (let i = 0; i < pa.count; i++) { _v.fromBufferAttribute(pa, i); const k = 1 + 0.006 * noise(_v.x * 1.7, _v.y * 1.7, _v.z * 1.7); pa.setXYZ(i, _v.x * k, _v.y * k, _v.z * k); }
  const gc = theme.ground.map(c => new THREE.Color(c));
  for (let f = 0; f < pa.count; f += 3) {
    _v.fromBufferAttribute(pa, f).add(_w.fromBufferAttribute(pa, f + 1)).add(_w.fromBufferAttribute(pa, f + 2)).multiplyScalar(1 / 3);
    const nz = noise(_v.x, _v.y, _v.z); const c = nz > 0.35 ? gc[2] : nz < -0.3 ? gc[1] : gc[0];
    for (let j = 0; j < 3; j++) cols.set([c.r, c.g, c.b], (f + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  planetMesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: theme.rough ?? 0.95, metalness: theme.metal ?? 0 }));
  planetMesh.receiveShadow = true; planetGroup.add(planetMesh);

  atmo = glowSprite(theme.atm, R * 3.3, true); atmo.material.depthTest = true; planetGroup.add(atmo);
  if (theme.dome) { const dm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.85, 40, 24), new THREE.MeshStandardMaterial({ color: theme.dome, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false })); planetGroup.add(dm); }

  const avoidHome = [[HOME, 0.42]];
  // 호수(구 위의 둥근 판)
  const lakeAt = (d, r, color) => {
    const L = new THREE.Group(); L.position.copy(d).multiplyScalar(R); L.quaternion.copy(frameQuat(d));
    L.add(mesh(flatDisc(r + 0.18), mat(0xe6dcc2, { roughness: 1 })));
    const wat = mesh(flatDisc(r), mat(color, { roughness: 0.06, metalness: 0.15 })); wat.position.y = 0.012; wat.receiveShadow = true; L.add(wat);
    planetGroup.add(L); particles.lakes.push({ d, r });
  };
  if (theme.lakes) scatterDirs(theme.lakes, rnd, avoidHome).forEach(d => lakeAt(d, theme.lakeR[0] + rnd() * (theme.lakeR[1] - theme.lakeR[0]), theme.lakeColor));
  if (theme.bigLake) { const b = theme.bigLake; lakeAt(new V3(Math.cos(b.lat) * Math.cos(b.lon), Math.sin(b.lat), Math.cos(b.lat) * Math.sin(b.lon)).normalize(), b.r, b.color); }
  const avoid = [...avoidHome, ...particles.lakes.map(L => [L.d, (L.r + 0.3) / R])];

  for (const dc of theme.decor || []) {
    const dirs = scatterDirs(dc.n, rnd, dc.far ? [[HOME, 0.75], [SPAWN, 0.5], ...avoid.slice(1)] : avoid);
    const grp = instanced(dc.m, dirs, rnd, dc); if (!grp) continue; planetGroup.add(grp);
    if (dc.glow) dirs.forEach(d => { const [css, y, s] = dc.glow; const gl = glowSprite(css, s); gl.position.copy(d).multiplyScalar(R + y); gl.userData.flicker = rnd() * 6; planetGroup.add(gl); });
  }
  if (theme.sunflowers) {
    const n = theme.sunflowers, dirs = scatterDirs(n, rnd, [[HOME, 0.62], [SPAWN, 0.3]]);
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 1, 5).translate(0, 0.5, 0), mat(0x4f8a2b), n);
    const head = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), mat(0xf2c21a, { roughness: 0.7 }), n);
    const eye = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), mat(0x4a2a12), n);
    const M = new THREE.Matrix4(), tilt = new THREE.Matrix4().makeRotationX(1.1);
    dirs.forEach((d, i) => {
      const q = frameQuat(d).multiply(_q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28)); const hgt = 0.7 + rnd() * 0.5;
      M.compose(d.clone().multiplyScalar(R), q, new V3(1, hgt, 1)); stem.setMatrixAt(i, M);
      M.compose(d.clone().multiplyScalar(R), q, new V3(1, 1, 1)).multiply(_m.makeTranslation(0, hgt, 0)).multiply(tilt); head.setMatrixAt(i, M);
      eye.setMatrixAt(i, M.clone().multiply(_m.makeTranslation(0, 0.02, 0)));
    });
    for (const im of [stem, head, eye]) { im.receiveShadow = true; im.computeBoundingSphere(); planetGroup.add(im); } head.castShadow = true;
  }
  if (theme.buildings) {
    const n = theme.buildings, dirs = scatterDirs(n, rnd, [[HOME, 0.75], [SPAWN, 0.5]]);
    const box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat(0xffffff, { roughness: 0.6 }), n);
    const win = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 0.12, 1.02), emissive(0xffd9a0, 0.9), n);
    const pal = [0xb7c0cc, 0x9aa6b6, 0xd2c6b4, 0xc9a98a, 0xe6e0d4].map(c => new THREE.Color(c));
    dirs.forEach((d, i) => {
      const w = 0.8 + rnd() * 1.1, h = 0.8 + rnd() * 2.6; const q = frameQuat(d).multiply(_q.setFromAxisAngle(new V3(0, 1, 0), rnd() * 6.28));
      const M = new THREE.Matrix4().compose(d.clone().multiplyScalar(R - 0.05), q, new V3(w, h, w * (0.7 + rnd() * 0.6))); box.setMatrixAt(i, M); box.setColorAt(i, pal[i % pal.length]);
      win.setMatrixAt(i, M.clone().multiply(_m.makeTranslation(0, 0.72, 0)));
    });
    box.castShadow = box.receiveShadow = true; for (const im of [box, win]) { im.computeBoundingSphere(); planetGroup.add(im); }
  }
  if (theme.puffs) {
    const [n, colors] = theme.puffs; const dirs = scatterDirs(n, rnd, avoid);
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat(0xffffff, { roughness: 0.9, flatShading: true }), n);
    dirs.forEach((d, i) => { const k = 0.35 + rnd() * 0.9; im.setMatrixAt(i, new THREE.Matrix4().compose(d.clone().multiplyScalar(R - k * 0.35), frameQuat(d), new V3(k, k * 0.75, k))); im.setColorAt(i, new THREE.Color(colors[i % colors.length])); });
    im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); planetGroup.add(im);
  }
  if (theme.glows) { const [n, css, s] = theme.glows; scatterDirs(n, rnd, [[HOME, 0.4]]).forEach(d => { const gl = glowSprite(css, s); gl.position.copy(d).multiplyScalar(R + 0.6); planetGroup.add(gl); }); }
  for (const [kind, n] of theme.particles || []) { const pt = makeParticles(kind, n, rnd); particles.push(pt); scene.add(pt.obj); }
  // 밤 행성이면 등불이 더 밝게
  for (const it of items) setGlowStrength(it);
}

// ───────── 소품 ─────────
function setGlowStrength(it) {
  it.holder.traverse(o => { if (o.isSprite && o.userData.anim === 'glow') o.material.opacity = theme?.night ? 1 : 0.75; });
}
function spawnItem(t, la, lo, r, pop = false) {
  const id = C.PROPS[t]; const def = PROP_DEF[id]; if (!def) return null;
  const tpl = propTemplate(id); if (!tpl) return null;
  const dir = dirOf(la, lo);
  const holder = new THREE.Group(); holder.position.copy(dir).multiplyScalar(R); holder.quaternion.copy(frameQuat(dir));
  const inner = new THREE.Group(); inner.rotation.y = r * Math.PI / 4; holder.add(inner);
  const body = tpl.clone(true); inner.add(body);
  body.traverse(o => { if (o.isSprite) o.material = o.material.clone(); }); // 등불 켜고 끄기가 서로 안 섞이게
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(def.r + 0.1, def.r + 0.1, def.ph, 10).translate(0, def.ph / 2, 0), proxyMat); holder.add(proxy);
  const it = { t, la, lo, r, id, def, dir, holder, inner, proxy, phase: Math.random() * 6, lit: true };
  proxy.userData.item = it; itemsGroup.add(holder); items.push(it); setGlowStrength(it);
  if (pop) bounce(it.inner, 0); else inner.scale.setScalar(1);
  return it;
}
function removeItem(it) {
  const i = items.indexOf(it); if (i < 0) return; items.splice(i, 1);
  const t0 = performance.now();
  anims.push((now) => { const k = Math.min(1, (now - t0) / 220); it.inner.scale.setScalar(Math.max(0.001, 1 - k * k)); if (k >= 1) { itemsGroup.remove(it.holder); it.proxy.geometry.dispose(); return true; } });
}
// 통통 튀기(스프링): 0 → 넘침 → 1, 세로로 늘었다 줄었다
function bounce(obj, from = 0.55) {
  if (reduced) { obj.scale.setScalar(1); return; }
  let x = from, v = from === 0 ? 0 : 3; const id = Symbol();
  obj.userData.bounceId = id;
  anims.push((_now, dt) => {
    if (obj.userData.bounceId !== id) return true;
    const a = -260 * (x - 1) - 13 * v; v += a * dt; x += v * dt;
    const sy = x, sxz = x < 1 ? x : 1 + (1 - x) * 0.6; obj.scale.set(sxz, sy, sxz);
    if (Math.abs(x - 1) < 0.002 && Math.abs(v) < 0.02) { obj.scale.setScalar(1); return true; }
  });
}
function puff(dir) {
  const g = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
  g.position.copy(dir).multiplyScalar(R + 0.05); g.quaternion.copy(frameQuat(dir)); fx.add(g); const t0 = performance.now();
  anims.push((now) => { const k = (now - t0) / 450; g.scale.setScalar(1 + k * 3); g.material.opacity = 0.8 * (1 - k); if (k >= 1) { fx.remove(g); g.geometry.dispose(); g.material.dispose(); return true; } });
}

// ───────── 캐릭터 ─────────
const CH_S = 1.7; // 원본 0.67 → 키 약 1.14
const player = { dir: SPAWN.clone(), face: northAt(SPAWN).clone(), target: null, obj: null, mixer: null, acts: {}, cur: null, hat: null, head: null, hatInfo: null, hop: 0, stuck: 0, lastAng: 9, key: null };
const charProxy = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 10).translate(0, 0.65, 0), proxyMat);
const charRoot = new THREE.Group(); charRoot.add(charProxy); scene.add(charRoot);
const hatInfoCache = {};
function headInfo(key, gl) {
  if (hatInfoCache[key]) return hatInfoCache[key];
  const sc = gl.scene; sc.updateMatrixWorld(true);
  const bone = sc.getObjectByName('head'); const hm = sc.getObjectByName('head-mesh');
  const bp = new V3(); bone?.getWorldPosition(bp);
  let info = { y: 0.3, z: 0, hw: 0.17 };
  if (hm?.geometry) { hm.geometry.computeBoundingBox(); const b = hm.geometry.boundingBox; info = { y: b.max.y - bp.y, z: (b.min.z + b.max.z) / 2 - bp.z, hw: (b.max.x - b.min.x) / 2 }; }
  return (hatInfoCache[key] = info);
}
async function setCharacter(idx, hat = S.h) {
  const key = C.CHARS[idx]; const gl = await load(charModel(key)); gltfs.__done[charModel(key)] = gl;
  if (!gl) { DC.toast('캐릭터를 못 불러왔어'); return false; }
  if (player.obj) { charRoot.remove(player.obj); player.mixer?.stopAllAction(); }
  const o = SkeletonUtils.clone(gl.scene); o.scale.setScalar(CH_S);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
  charRoot.add(o); player.obj = o; player.key = key;
  player.mixer = new THREE.AnimationMixer(o); player.acts = {};
  for (const clip of gl.animations) player.acts[clip.name] = player.mixer.clipAction(clip);
  player.cur = null; playAnim('idle');
  let head = null; o.traverse(b => { if (b.isBone && b.name === 'head') head = b; }); player.head = head; player.hatInfo = headInfo(key, gl);
  setHat(hat); return true;
}
function setHat(h) {
  if (player.hat) { player.hat.parent?.remove(player.hat); player.hat = null; }
  const id = C.HATS[h]; if (!player.head || id === 'none') return;
  const hat = makeHat(id); const hi = player.hatInfo;
  const wrap = new THREE.Group(); wrap.add(hat); wrap.scale.setScalar(hi.hw); wrap.position.set(0, hi.y, hi.z);
  player.head.add(wrap); player.hat = wrap;
}
function playAnim(name, once = false) {
  const a = player.acts[name]; if (!a) return;
  if (player.cur === a && !once) return;
  const prev = player.cur; a.reset(); a.enabled = true;
  if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; } else a.setLoop(THREE.LoopRepeat, Infinity);
  a.fadeIn(0.18).play(); if (prev && prev !== a) prev.fadeOut(0.18);
  player.cur = a; player.onceUntil = once ? performance.now() + a.getClip().duration * 1000 - 150 : 0;
}
function walkTo(dir, quiet = false) {
  player.target = dir.clone().normalize(); player.stuck = 0; player.lastAng = 9;
  if (!quiet) showMarker(player.target);
}
let marker = null;
function showMarker(d) {
  if (!marker) { marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, depthWrite: false })); fx.add(marker); }
  marker.position.copy(d).multiplyScalar(R + 0.04); marker.quaternion.copy(frameQuat(d)); marker.userData.t0 = performance.now(); marker.visible = true;
}
function emote() {
  DC.sfx('tap'); DC.buzz(12); player.hop = 0.001;
  playAnim(player.acts['emote-yes'] ? 'emote-yes' : 'jump', true);
}

// ───────── 카메라 ─────────
const cam = { dir: SPAWN.clone(), fwd: northAt(SPAWN).clone(), dist: 11, distT: 11, elev: 0.92, lift: 0, liftT: 0, shake: 0 };
function fitFov() { const a = innerWidth / innerHeight; camera.fov = Math.min(68, Math.max(50, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(22)) / a) * 180 / Math.PI)); camera.aspect = a; camera.updateProjectionMatrix(); }
fitFov();
const camTarget = new V3();
function updateCamera(dt) {
  const k = 1 - Math.exp(-5 * dt);
  cam.dir.lerp(player.dir, k).normalize();
  const n = cam.dir; cam.fwd.addScaledVector(n, -cam.fwd.dot(n)); if (cam.fwd.lengthSq() < 1e-6) northAt(n, cam.fwd); cam.fwd.normalize();
  cam.dist += (cam.distT - cam.dist) * (1 - Math.exp(-8 * dt));
  cam.lift += (cam.liftT - cam.lift) * (1 - Math.exp(-6 * dt)); // 우주선 탈 때 카메라가 따라 올라간다
  camTarget.copy(n).multiplyScalar(R + 0.7 + cam.lift).addScaledVector(cam.fwd, Math.min(1.4, cam.dist * 0.08));
  camera.position.copy(camTarget).addScaledVector(n, cam.dist * Math.sin(cam.elev)).addScaledVector(cam.fwd, -cam.dist * Math.cos(cam.elev));
  if (cam.shake > 0.001 && !reduced) { camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; camera.position.z += (Math.random() - 0.5) * cam.shake; }
  cam.shake *= Math.exp(-5 * dt);
  camera.up.copy(n); camera.lookAt(camTarget);
  // 해: 늘 카메라 뒤 왼쪽 위에서 비춘다(어디를 걸어도 낮)
  const right = _w.crossVectors(cam.fwd, n).normalize();
  const sd = _v.copy(n).multiplyScalar(1.1).addScaledVector(right, -0.55).addScaledVector(cam.fwd, -0.45).normalize();
  sun.target.position.copy(n).multiplyScalar(R); sun.position.copy(sun.target.position).addScaledVector(sd, 25);
  hemi.position.copy(n);
}

// ───────── 매 프레임 ─────────
const clock = new THREE.Clock();
let tAll = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05); tAll += dt; const now = performance.now();
  // 걷기
  const d = player.dir;
  if (player.target) {
    const ang = d.angleTo(player.target);
    if (ang < 0.012 || player.stuck > 18) player.target = null;
    else {
      let axis = _w.crossVectors(d, player.target); if (axis.lengthSq() < 1e-10) axis = northAt(d, _w).cross(d);
      axis.normalize(); d.applyAxisAngle(axis, Math.min(ang, SPEED / R * dt)).normalize();
      const f = player.target.clone().addScaledVector(d, -d.dot(player.target)); if (f.lengthSq() > 1e-8) player.face.lerp(f.normalize(), 1 - Math.exp(-14 * dt));
      for (const it of items) { const minA = (it.def.r + 0.28) / R, a = d.angleTo(it.dir); if (a < minA && a > 1e-5) { const ax = _v.crossVectors(it.dir, d).normalize(); d.copy(it.dir).applyAxisAngle(ax, minA); } }
      const na = d.angleTo(player.target); player.stuck = na > player.lastAng - 1e-4 ? player.stuck + 1 : 0; player.lastAng = na;
    }
  }
  player.face.addScaledVector(d, -player.face.dot(d)); if (player.face.lengthSq() < 1e-8) northAt(d, player.face); player.face.normalize();
  if (!(player.onceUntil > now)) playAnim(player.target ? 'walk' : 'idle');
  if (player.hop) { player.hop += dt; if (player.hop > 0.45) player.hop = 0; }
  const hopY = player.hop ? Math.sin(player.hop / 0.45 * Math.PI) * 0.45 : 0;
  if (player.ride) player.ride(dt, now); // 우주선 위에 올라탄 동안은 우주선이 캐릭터 자리를 정한다
  else { charRoot.position.copy(d).multiplyScalar(R + hopY); charRoot.quaternion.copy(faceQuat(d, player.face)); }
  player.mixer?.update(dt);
  // 방문 모드: 가만히 있으면 주인 캐릭터가 마을을 산책
  if (VISIT && !ARRIVE && !player.ride && !player.target && items.length && now - lastInput > 5000 && now - (player.lastWander || 0) > 3500) {
    const it = items[Math.floor(Math.random() * items.length)]; player.lastWander = now;
    walkTo(it.dir.clone().applyAxisAngle(northAt(it.dir, new V3()).cross(it.dir).normalize(), (it.def.r + 0.6) / R), true);
  }
  updateCamera(dt);
  // 소품 움직임
  for (const it of items) {
    it.holder.traverse(o => {
      const a = o.userData.anim; if (!a) return;
      if (a === 'flame') { const s = 1 + Math.sin(tAll * 17 + it.phase) * 0.08 + Math.sin(tAll * 9.3) * 0.06; o.scale.set(1, s, 1); }
      else if (a === 'flag') o.rotation.y = Math.sin(tAll * 2.6 + it.phase) * 0.35;
      else if (a === 'eye') {
        o.lookAt(charRoot.position.x, charRoot.position.y + 0.8 * 1, charRoot.position.z);
        const bl = (tAll + it.phase) % 4.2; o.scale.y = bl < 0.12 ? 0.15 : 1;
      }
    });
  }
  for (let i = anims.length - 1; i >= 0; i--) if (anims[i](now, dt)) anims.splice(i, 1);
  if (selRing?.visible && selected) { const s = 1 + Math.sin(tAll * 6) * 0.06; selRing.scale.setScalar(s); }
  if (marker?.visible) { const k = (now - marker.userData.t0) / 700; marker.material.opacity = Math.max(0, 1 - k); marker.scale.setScalar(1 + k * 0.6); if (k > 1 || !player.target) marker.visible = k <= 1 && !!player.target; }
  for (const pt of particles) pt.step(dt, tAll);
  tickSocial(dt, now);
  planetGroup?.children.forEach(o => { if (o.isSprite && o.userData.flicker != null) o.material.opacity = 0.75 + Math.sin(tAll * 11 + o.userData.flicker) * 0.2; });
  renderer.render(scene, camera);
}

// ───────── 입력(탭·끌기·꼬집기) ─────────
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
const ptrs = new Map(); let drag = null, lastInput = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); lastInput = performance.now();
  if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, pinch: false };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = { ...(drag || {}), moved: true, pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: cam.distT }; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p || !drag) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; lastInput = performance.now();
  if (ptrs.size >= 2 && drag.pinch) { const [a, b] = [...ptrs.values()]; const dd = Math.hypot(a.x - b.x, a.y - b.y); cam.distT = THREE.MathUtils.clamp(drag.dist0 * drag.d0 / Math.max(dd, 1), 4.5, 30); return; }
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 9) drag.moved = true;
  if (drag.moved && !drag.pinch) { cam.fwd.applyAxisAngle(cam.dir, -dx * 0.007); cam.elev = THREE.MathUtils.clamp(cam.elev + dy * 0.005, 0.22, 1.35); }
});
const endPtr = (e) => {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (drag && ptrs.size === 0) { if (!drag.moved && performance.now() - drag.t < 550) onTap(e.clientX, e.clientY); drag = null; }
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) drag = null; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.distT = THREE.MathUtils.clamp(cam.distT * (1 + e.deltaY * 0.0012), 4.5, 30); }, { passive: false });

let mode = 'walk', tool = null, selected = null, selRing = null;
function onTap(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  if (busy) return; // 우주선 타는 중·내리는 중엔 조작을 잠근다
  const hit = ray.intersectObjects([charProxy, ...items.map(i => i.proxy), ...socialProxies(), planetMesh], false)[0]; if (!hit) return;
  if (hit.object === charProxy) { emote(); return; }
  if (hit.object.userData.ship) { showAct('우주선', '광장으로 출발', depart); return; }
  if (hit.object.userData.mark) { tapMark(hit.object.userData.mark); return; }
  const it = hit.object.userData.item;
  if (it && tapItemSocial(it)) return;
  if (it) {
    if (mode === 'build' && !VISIT) { select(it); return; }
    poke(it); return;
  }
  const dir = hit.point.clone().normalize();
  if (mode === 'build' && tool && !VISIT) { place(tool, dir); return; }
  if (prankTool && prankTool !== 'smash') { doPrank(prankTool, dir); return; }
  if (selected) select(null);
  walkTo(dir);
}
function poke(it) {
  DC.sfx('tap'); DC.buzz(8); bounce(it.inner, 0.75);
  if (it.id === 'lantern') { it.lit = !it.lit; it.holder.traverse(o => { if (o.isSprite) o.visible = it.lit; }); }
  const toward = player.dir.clone(); const ax = _v.crossVectors(it.dir, toward); if (ax.lengthSq() < 1e-10) return;
  walkTo(it.dir.clone().applyAxisAngle(ax.normalize(), (it.def.r + 0.45) / R), true);
}

// ───────── 꾸미기 ─────────
function place(id, dir) {
  if (items.length >= C.MAX) { DC.sfx('bad'); DC.toast(`소품은 ${C.MAX}개까지야. 하나 치우고 놓아 줘`); return; }
  if (!propOpen(id)) { openSheet('code', { lockedLabel: PROP_DEF[id].name }); return; }
  const [la, lo] = C.toIdx(dir.x, dir.y, dir.z); const d = dirOf(la, lo);
  // 앞면이 카메라를 보게 8방향 중 가장 가까운 것
  const toCam = camera.position.clone().sub(d.clone().multiplyScalar(R)); toCam.addScaledVector(d, -toCam.dot(d)).normalize();
  const nz = northAt(d, new V3()), nx = new V3().crossVectors(d, nz); const ang = Math.atan2(toCam.dot(nx), toCam.dot(nz));
  const r = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
  const it = spawnItem(C.PROPS.indexOf(id), la, lo, r, true); if (!it) { DC.toast('이 소품은 지금 못 불러왔어'); return; }
  puff(d); DC.sfx('good'); DC.buzz(15); save(); updateCount();
}
function select(it) {
  selected = it;
  if (!selRing) { selRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, depthWrite: false })); fx.add(selRing); }
  $('#selBar').classList.toggle('hidden', !it);
  if (!it) { selRing.visible = false; return; }
  DC.sfx('tap'); DC.buzz(8); bounce(it.inner, 0.8);
  const k = it.def.r + 0.25; selRing.geometry.dispose(); selRing.geometry = new THREE.RingGeometry(k - 0.08, k, 32).rotateX(-Math.PI / 2);
  selRing.position.copy(it.dir).multiplyScalar(R + 0.06); selRing.quaternion.copy(frameQuat(it.dir)); selRing.visible = true;
  $('#selName').textContent = it.def.name;
}
$('#selBar').addEventListener('click', (e) => {
  const act = e.target.closest('button')?.dataset.act; if (!act) return;
  if (act === 'close' || !selected) { select(null); return; }
  if (act === 'rot') { selected.r = (selected.r + 1) % 8; selected.inner.rotation.y = selected.r * Math.PI / 4; bounce(selected.inner, 0.8); DC.sfx('tap'); DC.buzz(8); save(); }
  if (act === 'del') { removeItem(selected); DC.sfx('swipe'); DC.buzz(10); select(null); save(); updateCount(); }
});
function updateCount() { const c = $('#itemCount'); if (c) c.textContent = `${items.length}/${C.MAX}`; }

// ───────── 사진 카드 ─────────
function renderOffscreen(sc, cm, w, h) {
  const pr = renderer.getPixelRatio(), size = renderer.getSize(new THREE.Vector2()), asp = cm.aspect;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); cm.aspect = w / h; cm.updateProjectionMatrix();
  renderer.render(sc, cm);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
  renderer.setPixelRatio(pr); renderer.setSize(size.x, size.y, false); cm.aspect = asp; cm.updateProjectionMatrix();
  return c;
}
function roundRect(x, X, y, w, h, r) { x.beginPath(); x.moveTo(X + r, y); x.arcTo(X + w, y, X + w, y + h, r); x.arcTo(X + w, y + h, X, y + h, r); x.arcTo(X, y + h, X, y, r); x.arcTo(X, y, X + w, y, r); x.closePath(); }
async function photoCard() {
  try { await Promise.all([document.fonts.load(`800 70px ${FONT}`), document.fonts.load(`600 34px ${FONT}`)]); } catch { /* 글꼴 없으면 시스템 글꼴 */ }
  const hide = [marker, selRing].filter(Boolean); const vis = hide.map(o => o.visible); hide.forEach(o => (o.visible = false));
  updateCamera(0); const shot = renderOffscreen(scene, camera, 1080, 1080);
  hide.forEach((o, i) => (o.visible = vis[i]));
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  x.fillStyle = '#05060d'; x.fillRect(0, 0, 1080, 1350); x.drawImage(shot, 0, 0);
  const gr = x.createLinearGradient(0, 860, 0, 1090); gr.addColorStop(0, 'rgba(5,6,13,0)'); gr.addColorStop(1, 'rgba(5,6,13,1)'); x.fillStyle = gr; x.fillRect(0, 860, 1080, 230);
  x.font = `800 34px ${FONT}`; const tag = '돈워너노우 타운'; const tw = x.measureText(tag).width;
  x.fillStyle = 'rgba(5,6,13,.62)'; roundRect(x, 40, 40, tw + 48, 64, 32); x.fill(); x.fillStyle = '#ffd34d'; x.textBaseline = 'middle'; x.fillText(tag, 64, 73);
  x.textBaseline = 'alphabetic'; x.fillStyle = '#f4f1ea'; x.textAlign = 'center'; x.font = `800 72px ${FONT}`; x.fillText(townName(), 540, 1160);
  x.fillStyle = '#a9a7b8'; x.font = `600 34px ${FONT}`;
  const pn = PLANETS.find(p => p.id === S.p)?.name || '작은 행성';
  x.fillText(`${pn}에 지은 마을 · 소품 ${items.length}개`, 540, 1222);
  x.fillStyle = '#ffd34d'; x.font = `800 40px ${FONT}`; x.fillText(`@${D.site.handle}`, 540, 1296); x.textAlign = 'left';
  return c;
}

// ───────── 구경 링크 ─────────
function visitUrl() { save(); const code = C.encode({ ...S, items: items.map(it => [it.t, it.la, it.lo, it.r]) }); return `${location.href.split('#')[0]}#t=${code}`; }
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = el('textarea', { readonly: '' }); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); return ok;
  }
}

// ───────── 화면(시트) ─────────
const sheet = $('#sheet'), sheetBody = $('#sheetBody');
function setMode(m) {
  mode = m; tool = m === 'build' ? tool : null; if (m !== 'build') select(null);
  document.body.classList.toggle('building', m === 'build');
}
function closeSheet() { sheet.classList.add('hidden'); document.body.classList.remove('sheet-open', 'sheet-tall'); setMode('walk'); hint(''); document.querySelectorAll('#bar button').forEach(b => b.removeAttribute('aria-pressed')); }
$('#sheetClose').addEventListener('click', closeSheet);
function hint(t) { const h = $('#hint'); h.textContent = t; h.classList.toggle('hidden', !t); }
const SHEETS = {};
function openSheet(name, opt = {}) {
  if (!SHEETS[name]) return;
  document.querySelectorAll('#bar button').forEach(b => b.toggleAttribute('aria-pressed', b.dataset.sheet === name));
  sheet.classList.remove('hidden'); document.body.classList.add('sheet-open');
  sheetBody.replaceChildren(); sheet.dataset.name = name;
  const tall = SHEETS[name](opt) !== 'short'; document.body.classList.toggle('sheet-tall', tall);
  setMode(name === 'build' ? 'build' : 'walk');
}
$('#bar').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return; DC.sfx('tap');
  if (b.dataset.go === 'home') { location.href = 'town.html'; return; }
  if (!sheet.classList.contains('hidden') && sheet.dataset.name === b.dataset.sheet) { closeSheet(); return; }
  openSheet(b.dataset.sheet);
});
const title = (t) => { $('#sheetTitle').textContent = t; };

SHEETS.build = () => {
  title('꾸미기'); hint(tool ? `${PROP_DEF[tool].name} 놓을 곳을 탭` : '소품 고르고 → 땅을 탭');
  const tray = el('div', { class: 't-tray', role: 'listbox', 'aria-label': '소품' });
  const ids = C.PROPS.filter(id => PROP_DEF[id] && (!PROP_DEF[id].reward || propOpen(id) || codeRewardIds.has(PROP_DEF[id].reward)));
  ids.sort((a, b) => (propOpen(b) - propOpen(a)));
  for (const id of ids) {
    const def = PROP_DEF[id], open = propOpen(id);
    tray.append(el('button', { class: `t-item${open ? '' : ' locked'}${tool === id ? ' on' : ''}${def.reward && open ? ' special' : ''}`, type: 'button', 'aria-selected': tool === id ? 'true' : 'false',
      onclick: () => {
        if (!open) { DC.sfx('bad'); openSheet('code', { lockedLabel: def.name }); return; }
        tool = tool === id ? null : id; DC.sfx('tap'); DC.buzz(6); openSheet('build');
      } }, el('i', {}, ic(open ? (PROP_IC[id] || 'build') : 'lock')), el('span', {}, def.name)));
  }
  sheetBody.append(tray,
    el('div', { class: 't-row' }, el('span', { class: 't-muted' }, '소품 ', el('b', { id: 'itemCount' }, `${items.length}/${C.MAX}`)),
      el('button', { class: 'btn small ghost', type: 'button', onclick: (e) => {
        const b = e.currentTarget; if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 다 치워'; setTimeout(() => { b.dataset.sure = ''; b.textContent = '다 치우기'; }, 2500); return; }
        [...items].forEach(removeItem); DC.sfx('swipe'); save(); updateCount(); b.dataset.sure = ''; b.textContent = '다 치우기';
      } }, '다 치우기')));
  return 'short';
};

let thumbs = {};
async function charThumb(key) {
  if (thumbs[key]) return thumbs[key];
  const gl = await load(charModel(key)); if (!gl) return '';
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x1b1d33);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x445066, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 2); dl.position.set(1, 2, 2); sc.add(dl);
  const o = SkeletonUtils.clone(gl.scene); sc.add(o);
  const mx = new THREE.AnimationMixer(o); const clip = gl.animations.find(a => a.name === 'idle'); if (clip) { mx.clipAction(clip).play(); mx.update(0.1); }
  const cm = new THREE.PerspectiveCamera(30, 1, 0.01, 10); cm.position.set(0.55, 0.62, 1.55); cm.lookAt(0, 0.36, 0);
  thumbs[key] = renderOffscreen(sc, cm, 160, 160).toDataURL('image/png'); return thumbs[key];
}
SHEETS.char = () => {
  title('캐릭터');
  const grid = el('div', { class: 't-grid' });
  C.CHARS.forEach((key, i) => {
    const img = el('img', { alt: '', width: 80, height: 80 });
    const b = el('button', { class: `t-card${S.c === i ? ' on' : ''}`, type: 'button', onclick: async () => {
      if (S.c === i) return; DC.sfx('tap'); grid.querySelectorAll('.t-card').forEach(x => x.classList.remove('on')); b.classList.add('on');
      if (await setCharacter(i)) { S.c = i; save(); DC.sfx('good'); DC.buzz(12); player.hop = 0.001; }
    } }, img, el('span', {}, CHAR_LABEL[key]));
    grid.append(b); charThumb(key).then(u => { if (u) img.src = u; });
  });
  const hats = el('div', { class: 't-tray' });
  C.HATS.forEach((id, i) => {
    const def = HAT_DEF[id]; const open = hatOpen(id);
    if (def.reward && !open && !codeRewardIds.has(def.reward)) return;
    hats.append(el('button', { class: `t-item${open ? '' : ' locked'}${S.h === i ? ' on' : ''}`, type: 'button', onclick: () => {
      if (!open) { DC.sfx('bad'); openSheet('code', { lockedLabel: def.name }); return; }
      S.h = i; setHat(i); save(); DC.sfx('good'); DC.buzz(10); player.hop = 0.001; openSheet('char');
    } }, el('i', {}, ic(open ? (id === 'none' ? 'user' : 'hat') : 'lock')), el('span', {}, def.name)));
  });
  sheetBody.append(grid, el('h3', { class: 't-h3' }, '모자'), hats);
};
SHEETS.planet = () => {
  title('행성 고르기');
  const list = el('div', { class: 't-planets' });
  for (const p of PLANETS) {
    const locked = planetLocked(p.id);
    list.append(el('button', { class: `t-planet${S.p === p.id ? ' on' : ''}${locked ? ' locked' : ''}`, type: 'button', onclick: () => {
      if (locked) { DC.sfx('bad'); openSheet('code', { lockedLabel: '숨은 행성' }); return; }
      if (S.p === p.id) return; S.p = p.id; save(); DC.sfx('good'); DC.buzz(15);
      changePlanet(p).then(() => openSheet('planet'));
    } }, el('i', { class: 't-orb', style: locked ? '' : `background-image:url('${p.img}')` }, locked ? ic('lock') : ''),
    el('span', {}, el('b', {}, locked ? '숨은 행성' : p.name), el('small', {}, locked ? '영상 속 코드로 열려' : `${p.ep}편 · ${p.mood}`))));
  }
  sheetBody.append(el('p', { class: 't-muted' }, '행성을 바꿔도 소품 자리는 그대로야.'), list);
};
SHEETS.name = () => {
  title('내 행성 이름');
  const prev = el('p', { class: 't-name-preview' }, townName());
  const row = (words, idx) => el('div', { class: 't-chips' }, words.map((w, i) => el('button', { class: `t-chip${S.n[idx] === i ? ' on' : ''}`, type: 'button', onclick: (e) => {
    S.n[idx] = i; save(); DC.sfx('tap'); DC.buzz(6); prev.textContent = townName(); $('#nameText').textContent = townName();
    e.currentTarget.parentNode.querySelectorAll('.t-chip').forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on');
  } }, w)));
  sheetBody.append(prev, el('p', { class: 't-muted' }, '단어 두 개를 골라'), el('h3', { class: 't-h3' }, '앞말'), row(C.ADJ, 0), el('h3', { class: 't-h3' }, '뒷말'), row(C.NOUN, 1));
};
SHEETS.photo = (opt) => {
  title('사진 찍기');
  const img = el('img', { class: 't-photo', alt: '마을 사진 카드' });
  let card = null;
  const snap = async (far) => {
    const keep = [cam.distT, cam.dist, cam.elev];
    if (far) { cam.dist = cam.distT = 22; cam.elev = 0.55; }
    card = await photoCard(); img.src = card.toDataURL('image/png');
    if (far) { [cam.distT, cam.dist, cam.elev] = keep; }
    DC.sfx('tap');
  };
  sheetBody.append(img,
    el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', onclick: async () => { if (!card) return; const r = await DC.shareCanvas(card, 'dwk-town.png', `${townName()} — 돈워너노우 타운 @${D.site.handle}`); if (r !== 'cancel') { DC.sfx('good'); DC.buzz(15); } } }, '저장·공유'),
      el('button', { class: 'btn', type: 'button', onclick: () => snap(false) }, '지금 화면'),
      el('button', { class: 'btn', type: 'button', onclick: () => snap(true) }, '행성 전체')),
    el('p', { class: 't-muted' }, '화면을 끌어 각도를 바꿔 다시 찍어'), DC.followCta());
  snap(!!opt.far);
};
SHEETS.share = () => {
  title('구경 링크');
  const url = visitUrl();
  const box = el('input', { class: 't-link', readonly: '', value: url, 'aria-label': '구경 링크', onfocus: (e) => e.target.select() });
  sheetBody.append(
    el('p', { class: 't-name-preview' }, townName()), el('p', { class: 't-muted' }, '받은 친구는 구경만 할 수 있어 · 개인정보 없음'),
    box,
    el('div', { class: 'actions' },
      el('button', { class: 'btn primary', type: 'button', onclick: async () => {
        if (navigator.share) { try { await navigator.share({ title: '돈워너노우 타운', text: `${townName()} 구경 와`, url }); DC.sfx('good'); return; } catch (e) { if (e.name === 'AbortError') return; } }
        DC.toast((await copyText(url)) ? '링크를 복사했어' : '복사가 안 돼. 위 칸을 길게 눌러 복사해 줘');
      } }, navigator.share ? '공유하기' : '링크 복사'),
      navigator.share ? el('button', { class: 'btn', type: 'button', onclick: async () => DC.toast((await copyText(url)) ? '링크를 복사했어' : '복사가 안 돼. 위 칸을 길게 눌러 복사해 줘') }, '복사') : null),
    DC.followCta());
};
SHEETS.code = (opt) => {
  title('영상 속 코드');
  const out = el('p', { class: 't-muted', role: 'status' }, opt.lockedLabel ? `${opt.lockedLabel} — 영상 마지막 장면의 코드로 열려` : '영상 마지막 장면에 코드가 있어');
  const inp = el('input', { class: 't-code', maxlength: '10', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: '코드 입력', 'aria-label': '코드' });
  const got = el('div', { class: 't-got' });
  const renderGot = () => {
    const mine = DC.rewards.list().filter(r => Object.values(PROP_DEF).some(d => d.reward === r.id) || Object.values(HAT_DEF).some(d => d.reward === r.id) || Object.values(HIDDEN_PLANETS).includes(r.id));
    got.replaceChildren(el('h3', { class: 't-h3' }, '내 행성에서 쓸 수 있는 해금'), mine.length ? el('ul', {}, mine.map(r => el('li', {}, r.label))) : el('p', { class: 't-muted' }, '아직 없어.'));
  };
  renderGot();
  const form = el('form', { class: 't-codeform', onsubmit: (e) => {
    e.preventDefault(); const r = DC.redeem(inp.value); out.textContent = r.msg;
    if (r.ok) {
      inp.value = ''; renderGot();
      const pr = (r.hit.rewards || []).map(x => Object.keys(PROP_DEF).find(k => PROP_DEF[k].reward === x.id)).find(Boolean);
      if (pr && !VISIT) { tool = pr; out.append(' — ', el('button', { class: 'btn small primary', type: 'button', onclick: () => openSheet('build') }, `${PROP_DEF[pr].name} 놓으러 가기`)); }
      if ((r.hit.rewards || []).some(x => x.id === 'hat-sunflower') && !VISIT) { S.h = C.HATS.indexOf('sunflower'); setHat(S.h); save(); player.hop = 0.001; }
    } else { DC.shake(inp); DC.buzz(30); }
  } }, inp, el('button', { class: 'btn primary', type: 'submit' }, '열기'));
  sheetBody.append(out, form, got, DC.followCta());
  setTimeout(() => inp.focus({ preventScroll: true }), 50);
};

// 방문 모드에서 「이 마을엔 있는데 나는 아직 없는」 특별 소품 안내
function visitSpecials() {
  const ids = [...new Set(items.map(i => i.id))].filter(id => PROP_DEF[id].reward && !DC.rewards.has(PROP_DEF[id].reward));
  const hat = C.HATS[S.h]; if (HAT_DEF[hat].reward && !DC.rewards.has(HAT_DEF[hat].reward)) ids.push('hat:' + hat);
  return ids.map(id => id.startsWith('hat:') ? HAT_DEF[id.slice(4)] : PROP_DEF[id]);
}

// ───────── 행성 사이(우주선 · 장난 · 방어막 · 공격권 · 따라가기) ─────────
// 대표(2026-11-19~20): 「우주선 위에 올라타서 가고 도착」 · 「다른 행성 망쳐놓을 수 있게 + 퀴즈로 방어권」 · 「테일즈런너 따라가기」 · 「공격권 … 부실 수 있도록」
// 선: 장난은 되돌릴 수 있는 흔적만. 주인 소품은 지우거나 옮기지 않는다 — 부수기도 「잔해 모습」으로만 바꾸고, 주인이 고치거나 24시간 뒤 원래대로.
//     하루 횟수·최대 개수·방어막·공격권 수는 서버 함수(do_prank·clean_prank·add_shield·earn_attack)가 강제한다. 화면은 서버 답을 그대로 보여 줄 뿐.
const QS = new URLSearchParams(location.search);
const ARRIVE = QS.has('arrive');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER_Q = UUID.test(QS.get('o') || '') ? QS.get('o').toLowerCase() : null;
let net = null, ME = null, OWNER = null, myName = '이름 없는 여행자', myCharCode = null, registered = false, lobby = null;
let busy = false, prankTool = null, shieldUntil = 0, attackN = 0, pranks = [], prankLeft = null, pending = false;
const live = () => net?.mode === 'supabase';
const isOwnerView = () => !VISIT && !!ME && OWNER === ME;
const wait = (ms) => new Promise(r => setTimeout(r, ms / (window.__townTimeScale || 1)));
const until = (f, ms) => new Promise(r => { const t0 = performance.now(); const h = setInterval(() => { if (f() || performance.now() - t0 > ms) { clearInterval(h); r(); } }, 50); });
// 프레임마다 k(0→1)를 넘겨 주는 짧은 연출. 움직임 줄이기 설정이면 짧게.
function tween(ms, fn) {
  if (reduced) ms = Math.min(ms, 300);
  // window.__townTimeScale: 시험용 느린 재생(스크린샷이 연출 중간을 잡도록) — 평소엔 1
  return new Promise(done => { let el2 = 0, last = performance.now(); anims.push((now) => { el2 += (now - last) * (window.__townTimeScale || 1); last = now; const k = Math.min(1, el2 / ms); fn(k); if (k >= 1) { done(); return true; } }); });
}
const ease = (k) => 1 - Math.pow(1 - k, 3);

// ── 선 아이콘 한 벌(이모지 대신 · world.js 와 같은 굵기) ──
const SVG = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  back: SVG('<path d="M15 5l-7 7 7 7"/>'), x: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  ship: SVG('<path d="M12 2.8c3 2.4 4.6 6 4.6 10.2l-2 3h-5.2l-2-3c0-4.2 1.6-7.8 4.6-10.2z"/><circle cx="12" cy="9.6" r="1.7"/><path d="M7.4 12.6L5 15.8V19l3-1.4M16.6 12.6l2.4 3.2V19l-3-1.4M10.4 19.2L12 21.6l1.6-2.4"/>'),
  shield: SVG('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.6 12l2.4 2.4 4.4-4.8"/>'),
  log: SVG('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  wand: SVG('<path d="M4 20L14.5 9.5"/><path d="M16 3v3.4M16 11.6V15M10.4 8.6H13.8M18.2 8.6h3.4M19.6 5l-1.6 1.6M19.6 12.2L18 10.6"/>'),
  weed: SVG('<path d="M12 21v-9M12 14.5c-3 0-5.2-2.2-6-5.5 3.1.2 5.2 1.8 6 4.6M12 12.6c2.6-.2 4.8-2.2 5.4-5.4-2.8.2-4.8 1.8-5.4 4.6M8 21h8"/>'),
  mushroom: SVG('<path d="M3.6 12.4a8.4 7.4 0 0116.8 0z"/><path d="M9.6 12.4v6a2.4 2.4 0 004.8 0v-6"/><circle cx="8.8" cy="8.6" r="1"/><circle cx="14.6" cy="7.6" r="1"/>'),
  meteor: SVG('<circle cx="15" cy="15" r="5"/><path d="M3 3l7.2 7.2M7.6 3l4.8 4.8M3 7.6l4.8 4.8"/>'),
  flag: SVG('<path d="M6 21V3.6M6 4h11.4l-2.6 4 2.6 4H6"/>'),
  cheer: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 16.6s-4-2.4-4-5.2a2.2 2.2 0 014-1.3 2.2 2.2 0 014 1.3c0 2.8-4 5.2-4 5.2z"/>'),
  smash: SVG('<path d="M13.6 3.6l6.8 6.8-3 3-6.8-6.8z"/><path d="M11.4 9.6L3.6 17.4l3 3 7.8-7.8"/>'),
  broom: SVG('<path d="M20 3.6l-8.4 8.4"/><path d="M11.6 12c-3.2-.2-6.2 1.8-7.4 6l3.2 1.2 1.2 3c4.2-1.2 6.2-4.2 6-7.4z"/>'),
  build: SVG('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'), user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  planet: SVG('<circle cx="12" cy="12" r="5.6"/><path d="M5.2 14.6c-2.8 2.4-2.4 4.2 1.4 3.6 3-.5 6.8-2.2 9.8-4.4 3.4-2.5 5-5 3.4-6-.8-.5-2-.4-3.6.1"/>'),
  photo: SVG('<path d="M4 8h3.2l2-3h5.6l2 3H20v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>'),
  share: SVG('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
  gift: SVG('<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9c-1.5-4-6-4-6-1.5S12 9 12 9zm0 0c1.5-4 6-4 6-1.5S12 9 12 9z"/>'),
  home: SVG('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'), pencil: SVG('<path d="M4 20l4.2-1 11-11-3.2-3.2-11 11z"/>'),
  sound: SVG('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.4 8.6a5 5 0 010 6.8M19 6a8.6 8.6 0 010 12"/>'),
  mute: SVG('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.6 9.4l5 5.2M21.6 9.4l-5 5.2"/>'),
  quiz: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 014.6 1.3c0 1.7-2.1 2-2.1 3.5M12 17.5v.01"/>'),
  lock: SVG('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  tap: SVG('<path d="M9 11V4.5a1.5 1.5 0 013 0V10m0-.5V8a1.5 1.5 0 013 0v2m0 0a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-1a6 6 0 01-4.8-2.4L4 15a1.5 1.5 0 012.3-1.9L9 15"/>'),
  pinch: SVG('<path d="M4 20l6-6M20 4l-6 6M4 20v-5M4 20h5M20 4v5M20 4h-5"/>'),
  rotate: SVG('<path d="M20 12a8 8 0 11-2.4-5.7"/><path d="M20 4v5h-5"/>'),
  trash: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
};
// 소품·모자 줄 아이콘(2026-11-20 이모지 대신)
Object.assign(ICON, {
  tree: SVG('<path d="M12 3l6 8h-3l4 6H5l4-6H6z"/><path d="M12 17v4"/>'),
  lamp: SVG('<path d="M9 4h6M8.5 7h7l-1 9h-5z"/><path d="M12 16v5M9 21h6"/>'),
  fire: SVG('<path d="M12 3c3 4 6 6.5 6 10.5a6 6 0 01-12 0C6 10 8 8.6 9 6c1.4 2 2.4 2.6 3 3.4.6-2.2.2-4.4 0-6.4z"/><path d="M5 21h14"/>'),
  rock: SVG('<path d="M3.5 19l3-8 5-4 5 2 4 10z"/><path d="M11.5 7l1 5-6 1"/>'),
  bench: SVG('<path d="M4 10h16M4 14h16M6 14v6M18 14v6M6 10V6M18 10V6"/>'),
  snowman: SVG('<circle cx="12" cy="7" r="3.4"/><circle cx="12" cy="15.6" r="5.2"/>'),
  fence: SVG('<path d="M5 20V7l2-3 2 3v13M15 20V7l2-3 2 3v13M3 10h18M3 16h18"/>'),
  logs: SVG('<circle cx="7.5" cy="15.5" r="3.5"/><circle cx="16.5" cy="15.5" r="3.5"/><circle cx="12" cy="8.5" r="3.5"/>'),
  eye: SVG('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  hat: SVG('<path d="M3 17h18"/><path d="M7 17V9.5a5 5 0 0110 0V17"/><path d="M7 13.5h10"/>'),
});
const PROP_IC = { house: 'build', cabin: 'build', tent: 'build', tree: 'tree', pine: 'tree', snowtree: 'tree', palm: 'tree', bush: 'weed', flowerbed: 'weed', sunflowerbed: 'weed',
  lantern: 'lamp', campfire: 'fire', rock: 'rock', mushroom: 'mushroom', bench: 'bench', sign: 'flag', testerflag: 'flag', snowman: 'snowman', present: 'gift', fence: 'fence', logs: 'logs', eyelake: 'eye' };
const ic = (n) => { const s = el('span', { class: 'ic', 'aria-hidden': 'true' }); s.innerHTML = ICON[n] || ''; return s; };
for (const b of document.querySelectorAll('[data-ic]')) b.prepend(ic(b.dataset.ic));

// ── 짧은 효과음(망치) — 소리 끔이면 조용히 ──
let actx2 = null;
function hammerSfx() {
  if (!DC.sfx.on()) return;
  try {
    actx2 ||= new (window.AudioContext || window.webkitAudioContext)(); if (actx2.state === 'suspended') actx2.resume();
    [0, 0.16, 0.32].forEach((d, i) => { const t = actx2.currentTime + d; const o = actx2.createOscillator(), g = actx2.createGain(); o.type = 'square'; o.frequency.setValueAtTime(i === 2 ? 1180 : 920, t); o.frequency.exponentialRampToValueAtTime(240, t + 0.07);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g).connect(actx2.destination); o.start(t); o.stop(t + 0.1); });
  } catch { /* 소리 없이 진행 */ }
}

// ── 글씨 그림(깃발·스티커) — 도트 글꼴이 늦게 와도 다시 그린다 ──
function paperTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const paint = () => { x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; };
  paint(); document.fonts?.load("700 40px 'Galmuri11'").then(paint).catch(() => {}); return t;
}
const PIX = "'Galmuri11', 'Pretendard Variable', sans-serif";

// ── 우주선 정거장(행성 위에 세워 둔 우주선 = 다시 타는 곳) ──
const ship = DOOM_ON ? makeLander(THREE) : makeShip(THREE); ship.group.scale.setScalar(0.85);   // 새 옷: 은색 착륙선(dwk-doom.js)
const shipHolder = new THREE.Group(); shipHolder.add(ship.group); scene.add(shipHolder);
const shipProxy = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 3, 10).translate(0, 1.5, 0), proxyMat); shipProxy.userData.ship = true; ship.group.add(shipProxy);
let PAD = SPAWN.clone();
{
  const padTex = paperTex(256, 256, (x) => {
    x.fillStyle = '#fff4dc'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    x.lineWidth = 12; x.strokeStyle = '#1f1a2e'; x.beginPath(); x.arc(128, 128, 116, 0, 7); x.stroke();
    x.setLineDash([18, 14]); x.lineWidth = 8; x.strokeStyle = '#ffcf3a'; x.beginPath(); x.arc(128, 128, 88, 0, 7); x.stroke(); x.setLineDash([]);
    x.lineWidth = 14; x.strokeStyle = '#1f1a2e'; x.beginPath(); x.moveTo(92, 82); x.lineTo(92, 174); x.moveTo(164, 82); x.lineTo(164, 174); x.moveTo(92, 128); x.lineTo(164, 128); x.stroke();
  });
  const pad = mesh(flatDisc(1.15, 32), new THREE.MeshStandardMaterial({ map: DOOM_ON ? deckTexture(THREE, [0.45, 0.45]) : padTex, roughness: 0.9, metalness: DOOM_ON ? 0.3 : 0 })); pad.receiveShadow = true; shipHolder.add(pad);
}
ship.group.traverse(o => { if (o.isMesh && o !== shipProxy) o.receiveShadow = false; });
// 소품·호수와 겹치지 않는 자리 — 첫 위치 둘레를 돌며 찾는다
function choosePad(near) {
  const nz = northAt(near, new V3()), nx = new V3().crossVectors(near, nz);
  for (const dist of [2.8, 3.6, 4.6, 6]) for (let i = 0; i < 12; i++) {
    const a = Math.PI * 0.5 + i * Math.PI / 6; const t = nz.clone().multiplyScalar(Math.cos(a)).addScaledVector(nx, Math.sin(a));
    const d = near.clone().applyAxisAngle(new V3().crossVectors(near, t).normalize(), dist / R).normalize();
    const free = items.every(it => d.angleTo(it.dir) > (it.def.r + 1.5) / R) && (particles.lakes || []).every(L => d.angleTo(L.d) > (L.r + 1.4) / R);
    if (free) return d;
  }
  return near.clone();
}
function placeShip(d) { PAD = d.clone().normalize(); shipHolder.position.copy(PAD).multiplyScalar(R); shipHolder.quaternion.copy(frameQuat(PAD)); ship.group.position.set(0, 0, 0); ship.group.rotation.set(0, 0, 0); }
// 우주선 옆 내리는 자리(카메라 쪽)
function besideShip() {
  const t = northAt(PAD, new V3()).negate(); return PAD.clone().applyAxisAngle(new V3().crossVectors(PAD, t).normalize(), 2.2 / R).normalize();
}
const _sq = new THREE.Quaternion(), _turn = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), Math.PI);
function rideOn() {
  player.target = null; playAnim('idle');
  player.ride = () => { ship.seat.getWorldPosition(charRoot.position); ship.seat.getWorldQuaternion(_sq); charRoot.quaternion.copy(_sq).multiply(_turn); };
}
// 땅 ↔ 꼭대기 사이를 깡총 뛰는 포물선
async function hopBetween(from, to, ms, hgt = 1.1) {
  playAnim('jump', true); DC.sfx('tap');
  const a = from.clone(), b = to.clone(), up = PAD.clone();
  player.ride = () => {}; // 아래 tween 이 위치를 정한다
  await tween(ms, (k) => { charRoot.position.lerpVectors(a, b, k).addScaledVector(up, Math.sin(k * Math.PI) * hgt); charRoot.quaternion.copy(faceQuat(up, player.face)); });
}

async function arrive() {
  busy = true; document.body.classList.add('riding');
  placeShip(PAD); player.dir.copy(PAD); cam.dir.copy(PAD); cam.fwd.copy(northAt(PAD)); player.face.copy(cam.fwd).negate();
  const H = 24; cam.dist = cam.distT = 13 + H * 0.5; cam.elev = 0.42; // 하늘의 우주선과 마을이 한 화면에 같이 보이게
  rideOn(); ship.group.position.y = H; ship.setThrust(0.9); cam.lift = cam.liftT = H * 0.55 + 1;
  await tween(2600, (k) => {
    const y = H * (1 - ease(k)); ship.group.position.y = y; ship.setThrust(0.35 + 0.6 * (1 - k));
    cam.liftT = y * 0.55 + 1; cam.distT = 13 + y * 0.5; ship.group.rotation.z = Math.sin(k * 11) * 0.06 * (1 - k);
  });
  ship.group.position.y = 0; ship.group.rotation.z = 0; ship.setThrust(0);
  cam.shake = 0.5; DC.sfx('land'); DC.buzz(30); dust(PAD, 18, 1.4); puff(PAD);
  await wait(420);
  const from = new V3(); ship.seat.getWorldPosition(from); const land = besideShip(); const to = land.clone().multiplyScalar(R);
  player.face.copy(northAt(land)).negate();
  await hopBetween(from, to, 560, 0.9);
  player.dir.copy(land); player.ride = null; cam.liftT = 0; dust(land, 6, 0.6);
  tween(900, (k) => { cam.distT = 13 - 2 * k; cam.elev = 0.42 + 0.5 * k; });
  busy = false; document.body.classList.remove('riding');
  DC.toast(VISIT ? `${townName()} 도착` : '내 행성 도착');
}
async function depart({ go = true } = {}) {
  if (busy) return; hideAct(); closeSheet(); setPrankTool(null); busy = true; document.body.classList.add('riding');
  const side = besideShip(); walkTo(side, true); await until(() => !player.target, 5000);
  player.face.copy(PAD).sub(player.dir).addScaledVector(player.dir, -PAD.clone().sub(player.dir).dot(player.dir)).normalize();
  const seat = new V3(); ship.seat.getWorldPosition(seat);
  await hopBetween(player.dir.clone().multiplyScalar(R), seat, 520, 1.1);
  rideOn(); lobby?.update({ place: 'ship', placeName: '우주선' });
  ship.setThrust(0.3); DC.sfx('swipe'); DC.buzz(20);
  tween(700, (k) => { cam.distT = 11 + 5 * k; cam.elev = 0.92 - 0.3 * k; });
  await tween(650, (k) => { ship.setThrust(0.3 + 0.6 * k); cam.shake = 0.14; ship.group.position.y = Math.sin(k * 40) * 0.03; });
  dust(PAD, 14, 1.2); DC.sfx('land');
  let w = null;
  await tween(1700, (k) => {
    const y = 34 * k * k; ship.group.position.y = y; cam.liftT = y * 0.8 + 1.2; cam.distT = 16 + y * 0.3; ship.setThrust(1); ship.group.rotation.z = Math.sin(k * 30) * 0.02;
    if (k > 0.55 && !w) w = warp('우주 광장으로', 1800);
  });
  await w;
  if (!go) { busy = false; return; }
  try { lobby?.leave(); } catch { /* 이미 닫힘 */ }
  location.href = 'world.html?from=spaceport&land=1';
}

// ── 효과: 먼지 · 반짝 · 운석 ──
const dustGeo = new THREE.IcosahedronGeometry(0.13, 0), dustMat = new THREE.MeshStandardMaterial({ color: 0xf2e1bb, roughness: 1, flatShading: true, transparent: true });
function dust(dir, n = 12, power = 1) {
  const up = dir.clone().normalize(), nz = northAt(up, new V3()), nx = new V3().crossVectors(up, nz);
  const base = up.clone().multiplyScalar(R + 0.1); const ps = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + Math.random() * 0.4; const m = new THREE.Mesh(dustGeo, dustMat.clone()); m.position.copy(base); fx.add(m);
    ps.push({ m, v: nz.clone().multiplyScalar(Math.cos(a)).addScaledVector(nx, Math.sin(a)).multiplyScalar((1.6 + Math.random() * 1.6) * power).addScaledVector(up, (0.6 + Math.random()) * power), s: 0.7 + Math.random() * 0.9 });
  }
  const t0 = performance.now();
  anims.push((now, dt) => {
    const k = (now - t0) / 900;
    for (const p of ps) { p.m.position.addScaledVector(p.v, dt); p.v.multiplyScalar(Math.exp(-3.5 * dt)); p.m.scale.setScalar(p.s * (1 + k * 1.8)); p.m.material.opacity = Math.max(0, 1 - k); }
    if (k >= 1) { ps.forEach(p => { fx.remove(p.m); p.m.material.dispose(); }); return true; }
  });
}
function sparkle(dir, n = 14) {
  const up = dir.clone().normalize(); const ps = [];
  for (let i = 0; i < n; i++) { const s = glowSprite(i % 3 ? 'rgba(255,207,58,1)' : 'rgba(255,255,255,1)', 0.5); s.position.copy(up).multiplyScalar(R + 0.3).add(new V3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.6).addScaledVector(up, 0)); fx.add(s); ps.push({ s, v: 0.8 + Math.random() * 1.6, d: Math.random() * 0.3 }); }
  const t0 = performance.now();
  anims.push((now, dt) => { const k = (now - t0) / 1100; for (const p of ps) { const kk = Math.max(0, k - p.d); p.s.position.addScaledVector(up, p.v * dt); p.s.material.opacity = kk < 0.2 ? kk * 5 : Math.max(0, 1 - (kk - 0.2) / 0.8); p.s.scale.setScalar(0.25 + Math.sin(kk * 9) * 0.12 + 0.2); }
    if (k >= 1.3) { ps.forEach(p => fx.remove(p.s)); return true; } });
}
const rockGeo = new THREE.DodecahedronGeometry(0.42, 0);
function meteorFall(dir) {
  return new Promise(done => {
    const up = dir.clone().normalize(), side = northAt(up, new V3()).multiplyScalar(0.55);
    const rock = new THREE.Group(); rock.add(new THREE.Mesh(rockGeo, mat(0x5b4a3e, { flatShading: true })));
    const ink = new THREE.Mesh(rockGeo, new THREE.MeshBasicMaterial({ color: 0x1f1a2e, side: THREE.BackSide })); ink.scale.setScalar(1.12); rock.add(ink);
    const glow = glowSprite('rgba(255,140,50,.95)', 2.2); rock.add(glow); fx.add(rock);
    const trail = []; for (let i = 0; i < 6; i++) { const s = glowSprite('rgba(255,207,58,.8)', 1.2 - i * 0.15); fx.add(s); trail.push(s); }
    const a = up.clone().multiplyScalar(R + 12).addScaledVector(side, 4.5), b = up.clone().multiplyScalar(R + 0.15); const hist = []; // 화면 위쪽에서 비스듬히 떨어지게
    DC.sfx('swipe');
    tween(620, (k) => {
      rock.position.lerpVectors(a, b, k * k); rock.rotation.x += 0.3; rock.rotation.z += 0.2; hist.unshift(rock.position.clone()); hist.length = 12;
      trail.forEach((s, i) => { const p = hist[Math.min(hist.length - 1, i * 2 + 1)]; if (p) s.position.copy(p); s.material.opacity = 0.8 - i * 0.12; });
    }).then(() => {
      [rock, ...trail].forEach(o => fx.remove(o)); cam.shake = 0.65; DC.sfx('land'); DC.sfx('bad'); DC.buzz([30, 30, 60]); dust(up, 20, 1.5); puff(up); done();
    });
  });
}

// ── 흔적(장난) 모양 ──
const KIND = {
  weed: { name: '잡초', did: '잡초를 심고 감', hint: '잡초 심을 곳을 탭' },
  mushroom: { name: '수상한 버섯', did: '수상한 버섯을 심고 감', hint: '버섯 심을 곳을 탭' },
  meteor: { name: '운석 구덩이', did: '운석을 떨어뜨리고 감', hint: '운석 떨어뜨릴 곳을 탭' },
  flag: { name: '다녀감 깃발', did: '「다녀감」 깃발을 꽂고 감', hint: '깃발 꽂을 곳을 탭' },
  cheer: { name: '응원 스티커', did: '응원 스티커를 붙이고 감', hint: '응원 스티커 붙일 곳을 탭' },
  smash: { name: '부수기', did: '부수고 감', hint: '부술 소품을 탭' },
};
function markModel(rec) {
  const g = new THREE.Group(); const k = rec.kind; const rnd = DC.rng(DC.seed('mk' + rec.id));
  if (k === 'weed') {
    const ms = [mat(0x4f7d2a, { flatShading: true }), mat(0x77a83a, { flatShading: true }), mat(0x3d6421, { flatShading: true })];
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + rnd(), r = 0.06 + rnd() * 0.28, h = 0.45 + rnd() * 0.5; const c = mesh(new THREE.ConeGeometry(0.06 + rnd() * 0.04, h, 4), ms[i % 3], Math.cos(a) * r, h / 2, Math.sin(a) * r); c.rotation.set(Math.sin(a) * 0.45, rnd() * 3, Math.cos(a) * 0.45); c.castShadow = true; g.add(c); }
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.05, 10), mat(0x5a3d26, { roughness: 1 }), 0, 0.02, 0));
  } else if (k === 'mushroom') {
    const cap = mat(0x8e55d6, { flatShading: true }), stem = mat(0xf3e6c8), dot = mat(0xfff4dc);
    [[0, 0, 0.62], [0.32, 0.12, 0.42], [-0.26, 0.2, 0.34]].forEach(([x, z, h]) => {
      g.add(mesh(new THREE.CylinderGeometry(h * 0.18, h * 0.24, h, 8), stem, x, h / 2, z));
      const c = mesh(new THREE.SphereGeometry(h * 0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap, x, h * 0.92, z); c.castShadow = true; g.add(c);
      for (let i = 0; i < 4; i++) { const a = i * 1.7, s = mesh(new THREE.SphereGeometry(h * 0.08, 6, 4), dot, x + Math.cos(a) * h * 0.32, h * 0.92 + h * 0.36, z + Math.sin(a) * h * 0.32); g.add(s); }
    });
  } else if (k === 'meteor') {
    g.add(mesh(flatDisc(1.0, 24), mat(0x6b5845, { roughness: 1 })));
    const rim = mesh(new THREE.TorusGeometry(0.95, 0.16, 6, 18).rotateX(Math.PI / 2), mat(0x8a7357, { flatShading: true }), 0, 0.03, 0); rim.scale.y = 0.6; g.add(rim);
    const hole = mesh(flatDisc(0.7, 20), mat(0x2e2620, { roughness: 1 })); hole.position.y = 0.02; g.add(hole);
    const r = mesh(rockGeo, mat(0x5b4a3e, { flatShading: true }), 0.1, 0.12, -0.05); r.scale.setScalar(0.7); r.castShadow = true; g.add(r);
    const ember = glowSprite('rgba(255,140,50,.55)', 1.1); ember.position.y = 0.25; ember.userData.anim = 'ember'; g.add(ember);
  } else if (k === 'flag') {
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 6), mat(0x1f1a2e), 0, 0.8, 0));
    const name = rec.by_name || '누군가';
    const tex = paperTex(512, 224, (x, w, h) => {
      x.fillStyle = '#fff4dc'; x.fillRect(0, 0, w, h); x.lineWidth = 16; x.strokeStyle = '#1f1a2e'; x.strokeRect(8, 8, w - 16, h - 16);
      x.fillStyle = '#1f1a2e'; x.textAlign = 'center'; x.textBaseline = 'middle';
      let fs = 58; x.font = `700 ${fs}px ${PIX}`; while (x.measureText(name).width > w - 60 && fs > 26) { fs -= 4; x.font = `700 ${fs}px ${PIX}`; }
      x.fillText(name, w / 2, 82); x.font = `700 46px ${PIX}`; x.fillStyle = '#d6284f'; x.fillText('다녀감!', w / 2, 158);
    });
    const fl = new THREE.Group(); fl.position.set(0.03, 1.3, 0);
    const cloth = mesh(new THREE.PlaneGeometry(1.1, 0.48, 6, 1), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }), 0.55, 0, 0); cloth.castShadow = true; fl.add(cloth);
    fl.userData.anim = 'cloth'; g.add(fl);
  } else if (k === 'cheer') {
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), mat(0x1f1a2e), 0, 0.37, 0));
    const tex = paperTex(256, 256, (x) => {
      x.fillStyle = '#1f1a2e'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = '#fff4dc'; x.beginPath(); x.arc(128, 128, 110, 0, 7); x.fill();
      x.fillStyle = '#ff6f91'; x.strokeStyle = '#1f1a2e'; x.lineWidth = 9; x.beginPath(); x.moveTo(128, 150); x.bezierCurveTo(70, 112, 78, 62, 128, 84); x.bezierCurveTo(178, 62, 186, 112, 128, 150); x.fill(); x.stroke();
      x.fillStyle = '#1f1a2e'; x.font = `700 34px ${PIX}`; x.textAlign = 'center'; x.fillText('응원해', 128, 198);
    });
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); disc.scale.set(0.9, 0.9, 1); disc.position.y = 1.05; disc.userData.anim = 'bob'; g.add(disc);
  }
  return g;
}
const marks = new Map(); // 흔적 id → { rec, holder, inner, proxy }
const markProxyList = [];
const aliveRec = (r) => !r.cleaned_at && Date.now() - Date.parse(r.created_at) < 864e5;
function addMark(rec, pop) {
  const dir = dirOf(rec.la, rec.lo); const holder = new THREE.Group(); holder.position.copy(dir).multiplyScalar(R); holder.quaternion.copy(frameQuat(dir));
  const inner = new THREE.Group(); inner.rotation.y = (rec.id % 8) * Math.PI / 4; inner.add(markModel(rec)); holder.add(inner);
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.4, 8).translate(0, 0.7, 0), proxyMat); holder.add(proxy);
  const m = { rec, dir, holder, inner, proxy }; proxy.userData.mark = m; fx.add(holder); marks.set(rec.id, m); markProxyList.push(proxy);
  if (pop) { bounce(inner, 0); puff(dir); }
  return m;
}
function removeMark(m, withDust) {
  marks.delete(m.rec.id); const i = markProxyList.indexOf(m.proxy); if (i >= 0) markProxyList.splice(i, 1);
  if (withDust) dust(m.dir, 14, 1);
  const t0 = performance.now(); anims.push((now) => { const k = Math.min(1, (now - t0) / 260); m.inner.scale.setScalar(Math.max(0.001, 1 - k)); if (k >= 1) { fx.remove(m.holder); return true; } });
}
const socialProxies = () => [shipProxy, ...markProxyList];

// ── 부서진 소품(잔해 모습) — 소품은 그대로 두고 겉모습만 바꾼다 ──
const wreckMat = new THREE.MeshStandardMaterial({ color: 0x8d8794, roughness: 1, flatShading: true });
const crackMat = new THREE.MeshBasicMaterial({ color: 0x1f1a2e });
const itemCodeIdx = (it) => (VISIT ? it.ci : items.indexOf(it)); // 서버 기록의 item = 마을 코드 속 순서
function setWreck(it, rec, anim = false) {
  if (rec && it.wreck) { it.wreck.rec = rec; return; }
  if (!rec && !it.wreck) return;
  if (rec) {
    const swaps = []; it.inner.traverse(o => { if (o.isMesh) { swaps.push([o, o.material]); o.material = wreckMat; } else if (o.isSprite) { swaps.push([o, null, o.visible]); o.visible = false; } });
    const extra = new THREE.Group(); const rnd = DC.rng(DC.seed('wr' + rec.id)); const rr = it.def.r;
    for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, d = rr * (0.5 + rnd() * 0.6), s = 0.12 + rnd() * 0.16; const st = mesh(new THREE.DodecahedronGeometry(s, 0), i % 2 ? wreckMat : mat(0x6f6676, { flatShading: true }), Math.cos(a) * d, s * 0.6, Math.sin(a) * d); st.rotation.set(rnd() * 3, rnd() * 3, 0); st.castShadow = true; extra.add(st); }
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + rnd() * 0.6; const cr = new THREE.Group(); cr.rotation.y = a; let x = rr * 0.4; for (let j = 0; j < 3; j++) { const len = 0.25 + rnd() * 0.2; const seg = mesh(new THREE.BoxGeometry(len, 0.015, 0.045), crackMat, x + len / 2, 0.03, 0); seg.rotation.y = (rnd() - 0.5) * 0.9; cr.add(seg); x += len * 0.9; } extra.add(cr); }
    const smoke = glowSprite('rgba(120,112,128,.45)', 1.6, false); smoke.position.y = 0.9; smoke.userData.anim = 'smoke'; extra.add(smoke);
    it.holder.add(extra);
    it.wreck = { rec, swaps, extra };
    it.inner.rotation.x = 0.16; it.inner.rotation.z = 0.34; it.inner.scale.set(1, 0.78, 1); it.inner.position.y = -0.05;
    if (anim) bounce(extra, 0);
  } else {
    for (const [o, m, vis] of it.wreck.swaps) { if (m) o.material = m; else o.visible = vis; }
    it.holder.remove(it.wreck.extra); it.wreck = null;
    it.inner.rotation.x = 0; it.inner.rotation.z = 0; it.inner.position.y = 0; it.inner.scale.setScalar(1);
    if (anim) { bounce(it.inner, 0.6); sparkle(it.dir, 18); }
  }
}

// ── 서버 기록 → 화면 ──
function renderPranks(pop = false) {
  const keep = new Set(); const wrecked = new Map();
  for (const r of pranks) {
    if (!aliveRec(r)) continue;
    if (r.kind === 'smash') { if (r.item != null) wrecked.set(r.item, r); continue; }
    keep.add(r.id); if (!marks.has(r.id)) addMark(r, pop);
  }
  for (const m of [...marks.values()]) if (!keep.has(m.rec.id)) removeMark(m, false);
  for (const it of items) setWreck(it, wrecked.get(itemCodeIdx(it)) || null, pop);
}
async function refreshPranks(pop = false) {
  if (!live() || !OWNER) return;
  const [list, sh] = await Promise.all([net.pranks.list(OWNER), net.shield.of(OWNER)]);
  pranks = Array.isArray(list) ? list : []; setShield(sh); renderPranks(pop); updateLogDot();
}

// ── 방어막 돔(반투명 종이빛 + 가장자리 잉크선) ──
const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.42, 48, 32), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 }, uA: { value: 0 } },
  vertexShader: 'varying vec3 vN; varying vec3 vW; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vP = normalize(position); gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `uniform float uT; uniform float uA; varying vec3 vN; varying vec3 vW; varying vec3 vP;
    void main(){
      vec3 V = normalize(cameraPosition - vW); float f = 1.0 - abs(dot(normalize(vN), V));
      float rim = smoothstep(0.86, 0.9, f);
      float band = step(0.9, fract(vP.y * 7.0 + uT * 0.25)) * (1.0 - rim);
      vec3 paper = vec3(1.0, 0.957, 0.863), ink = vec3(0.122, 0.102, 0.18);
      vec3 col = mix(paper, ink, max(rim, band * 0.0));
      float a = 0.07 + pow(f, 3.0) * 0.4 + band * 0.07;
      a = mix(a, 0.95, rim);
      gl_FragColor = vec4(col, a * uA);
    }`,
}));
dome.visible = false; dome.renderOrder = 5; scene.add(dome);
function setShield(v) {
  const t = v ? Date.parse(v) : 0; const was = shieldUntil > Date.now(); shieldUntil = Number.isFinite(t) ? t : 0;
  const on = shieldUntil > Date.now();
  if (on && !was) { dome.visible = true; tween(900, (k) => { dome.material.uniforms.uA.value = ease(k); dome.scale.setScalar(0.85 + 0.15 * ease(k)); }); }
  if (!on) { dome.visible = false; dome.material.uniforms.uA.value = 0; }
  updateShieldPill();
}
const left = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60); return h ? (m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`) : `${Math.max(1, m)}분`; };
// 받침에 맞춘 조사(집을 · 나무를 · 우주인이 · 감자가)
const josa = (w, a, b) => { w = String(w || ''); const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0 ? a : b); };
function updateShieldPill() {
  const p = $('#shieldPill'); if (!p) return; const on = shieldUntil > Date.now();
  p.classList.toggle('hidden', !on); if (on) { p.replaceChildren(ic('shield'), el('span', {}, `방어막 ${left(shieldUntil - Date.now())} 남음`)); }
  document.body.classList.toggle('shielded', on);
  if (VISIT && live() && OWNER) $('#visitNote').textContent = on ? '방어막이 켜져 있어 — 응원 스티커만 남길 수 있어' : '흔적을 남기고 가도 돼 · 주인이 치울 수 있어';
}

// ── 아래 떠 있는 실행 막대(치우기·고치기·출발) ──
let actFn = null;
function showAct(name, label, fn) {
  actFn = fn; $('#actName').textContent = name; $('#actGo').replaceChildren(el('span', {}, label)); $('#actBar').classList.remove('hidden'); DC.sfx('tap'); DC.buzz(8);
}
function hideAct() { actFn = null; $('#actBar')?.classList.add('hidden'); }
$('#actGo')?.addEventListener('click', () => { const f = actFn; hideAct(); f?.(); });
$('#actX')?.addEventListener('click', hideAct);
// 장난 도구를 든 상태(위에 떠 있는 표시 + 그만두기)
function setPrankTool(kind) {
  prankTool = kind; const chip = $('#toolChip'); if (!chip) return;
  chip.classList.toggle('hidden', !kind); document.body.classList.toggle('tooling', !!kind);
  if (kind) { $('#toolIc').replaceChildren(ic(kind)); $('#toolText').textContent = KIND[kind].hint + (kind === 'smash' ? ` · 공격권 ${attackN}개` : ''); }
}
$('#toolX')?.addEventListener('click', () => { setPrankTool(null); DC.sfx('tap'); });

function tapMark(m) {
  bounce(m.inner, 0.7); const r = m.rec; const ago = agoText(r.created_at);
  if (isOwnerView()) showAct(`${r.by_name || '누군가'}의 ${KIND[r.kind]?.name || '흔적'}`, '치우기', () => cleanMark(m));
  else { DC.sfx('tap'); DC.toast(`${r.by_name || '누군가'} · ${KIND[r.kind]?.did || '다녀감'} · ${ago}`); }
}
function tapItemSocial(it) {
  if (VISIT && prankTool === 'smash') { doSmash(it); return true; }
  if (it.wreck && isOwnerView()) { bounce(it.inner, 0.85); showAct(`${josa(it.wreck.rec.by_name || '누군가', '이', '가')} 부순 ${it.def.name}`, '고치기', () => fixItem(it)); return true; }
  if (it.wreck) { bounce(it.inner, 0.85); DC.sfx('tap'); DC.toast(`${josa(it.wreck.rec.by_name || '누군가', '이', '가')} 부숨 · ${agoText(it.wreck.rec.created_at)}`); return true; }
  return false;
}
function agoText(t) { const s = Math.max(0, (Date.now() - Date.parse(t)) / 1000); if (s < 60) return '방금'; if (s < 3600) return `${Math.floor(s / 60)}분 전`; if (s < 86400) return `${Math.floor(s / 3600)}시간 전`; return `${Math.floor(s / 86400)}일 전`; }
const coin = (n) => { try { window.DP?.give(n); } catch (e) { console.warn('코인 기록 실패', e); } const now = window.DP?.s?.coins; DC.toast(`+${n} 코인${now != null ? ` · 지금 ${now}` : ''}`); };

async function cleanMark(m) {
  if (pending) return; pending = true;
  try {
    const r = await net.pranks.clean(m.rec.id);
    if (!r?.ok) { DC.sfx('bad'); DC.toast('못 치웠어. 이미 치웠거나 연결이 끊겼어'); await refreshPranks(); return; }
    m.rec.cleaned_at = new Date().toISOString(); removeMark(m, true); DC.sfx('swipe'); DC.buzz(15); coin(3); updateLogDot();
  } finally { pending = false; }
}
async function fixItem(it) {
  if (pending || !it.wreck) return; pending = true;
  try {
    const rec = it.wreck.rec; const r = await net.pranks.clean(rec.id);
    if (!r?.ok) { DC.sfx('bad'); DC.toast('못 고쳤어. 다시 해 봐'); await refreshPranks(); return; }
    rec.cleaned_at = new Date().toISOString(); hammerSfx(); DC.buzz([15, 60, 15, 60, 25]);
    await wait(380); setWreck(it, null, true); DC.sfx('good'); coin(5); updateLogDot();
  } finally { pending = false; }
}
async function doPrank(kind, dir) {
  if (!live() || !OWNER || pending) return;
  if (!ME) { DC.sfx('bad'); DC.toast('광장에서 주민 등록하면 장난칠 수 있어'); return; }
  const [la, lo] = C.toIdx(dir.x, dir.y, dir.z); pending = true;
  try {
    const r = await net.pranks.add(OWNER, kind, la, lo, myName, null);
    if (!r?.ok) { DC.sfx('bad'); DC.buzz(30); DC.toast(r?.msg || '못 했어'); if (r?.shield) { setShield(r.until); setPrankTool('cheer'); } return; }
    if (typeof r.left === 'number') prankLeft = r.left;
    if (kind === 'meteor') await meteorFall(dirOf(la, lo)); else { DC.sfx('good'); DC.buzz(12); }
    await refreshPranks(true);
    DC.toast(prankLeft == null ? `${KIND[kind].name} 남김` : prankLeft > 0 ? `${KIND[kind].name} 남김 · 오늘 이 행성에 ${prankLeft}번 더` : `${KIND[kind].name} 남김 · 오늘 이 행성 장난은 다 썼어`);
  } finally { pending = false; }
}
async function doSmash(it) {
  if (!live() || !OWNER || pending) return;
  if (!ME) { DC.sfx('bad'); DC.toast('광장에서 주민 등록하면 부술 수 있어'); return; }
  if (it.wreck) { DC.sfx('bad'); DC.toast('이미 부서져 있어'); return; }
  pending = true;
  try {
    const r = await net.pranks.add(OWNER, 'smash', it.la, it.lo, myName, itemCodeIdx(it));
    if (!r?.ok) { DC.sfx('bad'); DC.buzz(30); DC.toast(r?.msg || '못 부쉈어'); if (r?.shield) setShield(r.until); if (r?.need_token) { setPrankTool(null); openSheet('quiz', { tab: 'attack' }); } return; }
    attackN = Math.max(0, attackN - 1); setPrankTool(null);
    await meteorFall(it.dir); setWreck(it, { id: -1, by: ME, by_name: myName, kind: 'smash', item: itemCodeIdx(it), created_at: new Date().toISOString() }, true);
    await refreshPranks(); net.attack.count().then(n => { attackN = n; });
    DC.toast(`${josa(it.def.name, '을', '를')} 부쉈어! · 공격권 ${attackN}개 남음`);
  } finally { pending = false; }
}

// ── 퀴즈(방어막·공격권) — 행성 이름·소개(pitch) + 우리 사이트 상식. 반전 규칙(rule)은 쓰지 않는다(스포 방지) ──
const QPL = (D.episodes || []).flatMap(e => e.planets.map(p => ({ id: p.id, name: p.name, pitch: (p.pitch || '').replace(/\n/g, ' '), ep: e.no })));
const SITE_Q = [
  { q: '돈워너노우에서 행성 하나 고르면, 거기서 얼마나 버텨야 해?', a: '1년', w: ['100일', '10년'] },
  { q: '행성에 남긴 장난 흔적은 얼마 뒤 저절로 사라져?', a: '24시간', w: ['1시간', '7일'] },
  { q: '내 행성엔 소품을 몇 개까지 놓을 수 있어?', a: `${C.MAX}개`, w: ['10개', '100개'] },
  { q: '방어막 퀴즈를 다 맞히면 방어막이 몇 시간 늘어나?', a: '6시간', w: ['1시간', '24시간'] },
  { q: '부서진 소품은 주인이 안 고쳐도 얼마 뒤 원래대로 돌아와?', a: '24시간', w: ['1시간', '영영 안 돌아와'] },
];
function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function makeQuiz() {
  const out = []; const pool = shuffle([...QPL]);
  const others = (p, f) => shuffle(QPL.filter(x => x.id !== p.id && f(x) !== f(p)).map(f)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
  const types = shuffle(['pitch', 'ep', 'name']).slice(0, 2);
  types.forEach((t, i) => {
    const p = pool[i];
    if (t === 'pitch') out.push({ q: `「${p.pitch}」\n어느 행성 소개야?`, a: p.name, w: others(p, x => x.name) });
    else if (t === 'ep') out.push({ q: `「${p.name}」은 몇 번째 영상에 나왔어?`, a: `${p.ep}편`, w: shuffle([...new Set(QPL.map(x => x.ep))].filter(n => n !== p.ep)).slice(0, 2).map(n => `${n}편`) });
    else out.push({ q: `「${p.name}」 소개로 맞는 건?`, a: p.pitch, w: others(p, x => x.pitch) });
  });
  const s = SITE_Q[Math.floor(Math.random() * SITE_Q.length)]; out.splice(Math.floor(Math.random() * 3), 0, { ...s });
  return out.map(x => ({ q: x.q, a: x.a, choices: shuffle([x.a, ...x.w]) }));
}
let lastQuiz = null; // 시험 손잡이(정답 확인용)
function runQuiz(box, onPass) {
  const qs = makeQuiz(); lastQuiz = qs; let i = 0;
  const step = () => {
    const q = qs[i];
    box.replaceChildren(
      el('div', { class: 't-qdots' }, qs.map((_, j) => el('i', { class: j < i ? 'on' : j === i ? 'now' : '' }))),
      el('p', { class: 't-q' }, q.q),
      el('div', { class: 't-choices' }, q.choices.map(c => el('button', { class: 'k', type: 'button', onclick: (e) => {
        if (c === q.a) { DC.sfx('good'); DC.buzz(10); e.currentTarget.classList.add('ok'); i++; setTimeout(() => (i >= qs.length ? onPass() : step()), 280); }
        else {
          DC.sfx('bad'); DC.buzz(40); e.currentTarget.classList.add('no');
          box.querySelectorAll('.t-choices button').forEach(b => { b.disabled = true; if (b.textContent === q.a) b.classList.add('ok'); });
          box.append(el('p', { class: 't-qmiss' }, '땡! 3문제를 다 맞혀야 해'), el('button', { class: 'k sun t-wide', type: 'button', onclick: () => runQuiz(box, onPass) }, '새 문제로 다시'));
        }
      } }, c))),
    );
  };
  step();
}
SHEETS.quiz = (opt = {}) => {
  const tab = VISIT ? 'attack' : (opt.tab || 'shield');
  title(tab === 'shield' ? '행성 방어막' : '공격권 얻기');
  const body = el('div', { class: 't-paper' });
  if (!VISIT) body.append(el('div', { class: 't-tabs' },
    ['shield', 'attack'].map(t => el('button', { type: 'button', 'aria-selected': t === tab ? 'true' : 'false', onclick: () => openSheet('quiz', { tab: t }) }, ic(t === 'shield' ? 'shield' : 'smash'), t === 'shield' ? '방어막' : '공격권'))));
  if (!live()) { body.append(el('p', { class: 't-muted' }, '서버 연결 후 열려.')); sheetBody.append(body); return; }
  if (!ME) { body.append(el('p', { class: 't-muted' }, '광장에서 등록하면 열려.'), el('a', { class: 'k sun t-wide', href: 'world.html?from=town' }, '광장에서 등록하기')); sheetBody.append(body); return; }
  const status = el('p', { class: 't-status' }); const box = el('div', { class: 't-quiz' });
  const paint = () => {
    if (tab === 'shield') status.replaceChildren(ic('shield'), el('b', {}, shieldUntil > Date.now() && OWNER === ME ? `켜짐 · ${left(shieldUntil - Date.now())} 남음` : '꺼져 있어'));
    else status.replaceChildren(ic('smash'), el('b', {}, `내 공격권 ${attackN}개`));
  };
  paint(); net.attack.count().then(n => { attackN = n; paint(); });
  body.append(status,
    el('p', { class: 't-muted' }, tab === 'shield' ? '3문제 다 맞히면 방어막 6시간 · 최대 24시간 · 하루 3번. 켜져 있으면 응원 스티커만 남길 수 있어.' : '3문제 다 맞히면 공격권 1개 · 하루 2개까지 · 최대 5개. 다른 행성 소품 하나를 부술 수 있어(주인이 고치거나 24시간 뒤 원래대로).'),
    box);
  box.append(el('button', { class: 'k sun t-wide', type: 'button', onclick: () => runQuiz(box, async () => {
    box.replaceChildren(el('p', { class: 't-muted' }, '서버에 기록 중…'));
    const r = tab === 'shield' ? await net.shield.add() : await net.attack.earn();
    if (!r?.ok) { DC.sfx('bad'); box.replaceChildren(el('p', { class: 't-qmiss' }, r?.msg || '못 받았어. 다시 해 봐')); return; }
    DC.sfx('win'); DC.buzz([20, 40, 20]);
    if (tab === 'shield') { setShield(r.until); sparkle(player.dir, 20); box.replaceChildren(el('p', { class: 't-big-ok' }, '방어막 켜짐!'), el('p', { class: 't-muted' }, `${left(shieldUntil - Date.now())} 동안 지켜져 · 오늘 ${r.left ?? 0}번 더 충전할 수 있어`)); }
    else { attackN = r.tokens ?? attackN + 1; box.replaceChildren(el('p', { class: 't-big-ok' }, `공격권 +1 · 지금 ${attackN}개`), el('p', { class: 't-muted' }, `오늘 ${r.left ?? 0}개 더 얻을 수 있어`)); }
    paint();
  }) }, ic('quiz'), '퀴즈 3문제 풀기'));
  sheetBody.append(body);
};
SHEETS.prank = () => {
  title('장난치기');
  const body = el('div', { class: 't-paper' });
  if (!live() || !OWNER) { body.append(el('p', { class: 't-muted' }, '서버 연결 후 열려.')); sheetBody.append(body); return 'short'; }
  if (!ME) { body.append(el('p', { class: 't-muted' }, '광장에서 등록하면 장난칠 수 있어.'), el('a', { class: 'k sun t-wide', href: 'world.html?from=town' }, '광장에서 등록하기')); sheetBody.append(body); return 'short'; }
  const on = shieldUntil > Date.now();
  if (on) body.append(el('p', { class: 't-status' }, ic('shield'), el('b', {}, `방어막 ${left(shieldUntil - Date.now())} 남음 · 응원 스티커만 돼`)));
  const grid = el('div', { class: 't-tools' });
  for (const k of ['weed', 'mushroom', 'meteor', 'flag', 'cheer', 'smash']) {
    const blocked = on && k !== 'cheer';
    const b = el('button', { class: `k${k === 'smash' ? ' rose' : ''}${prankTool === k ? ' on' : ''}`, type: 'button', disabled: blocked ? '' : null, onclick: () => {
      if (k === 'smash' && attackN < 1) { DC.sfx('bad'); openSheet('quiz', { tab: 'attack' }); return; }
      DC.sfx('tap'); DC.buzz(8); closeSheet(); setPrankTool(k);
    } }, ic(blocked ? 'lock' : k), el('span', {}, KIND[k].name), k === 'smash' ? el('small', { id: 'atkN' }, `공격권 ${attackN}`) : null);
    grid.append(b);
  }
  net.attack.count().then(n => { attackN = n; const s = document.getElementById('atkN'); if (s) s.textContent = `공격권 ${n}`; });
  body.append(grid,
    el('p', { class: 't-muted' }, prankLeft != null ? `오늘 이 행성에 ${prankLeft}번 더 · 흔적은 24시간 뒤 사라지고 주인이 치울 수 있어` : '한 행성에 하루 3번 · 흔적은 24시간 뒤 사라지고 주인이 치울 수 있어'),
    el('button', { class: 'k t-wide', type: 'button', onclick: () => openSheet('quiz', { tab: 'attack' }) }, ic('quiz'), '퀴즈 풀고 공격권 얻기'));
  sheetBody.append(body);
};
SHEETS.log = () => {
  title('누가 다녀갔나');
  const body = el('div', { class: 't-paper' });
  if (!live()) { body.append(el('p', { class: 't-muted' }, '서버 연결 후 열려.')); sheetBody.append(body); return; }
  if (!ME) { body.append(el('p', { class: 't-muted' }, '광장에서 등록하면 누가 다녀갔는지 보여.'), el('a', { class: 'k sun t-wide', href: 'world.html?from=town' }, '광장에서 등록하기')); sheetBody.append(body); return; }
  const live24 = pranks.filter(aliveRec);
  if (live24.length) body.append(el('p', { class: 't-muted' }, `남아 있는 흔적 ${live24.length}개 · 탭해서 치우면 코인 3 · 부서진 건 고치면 코인 5`));
  const list = el('ul', { class: 't-log' });
  for (const r of pranks) {
    const it = r.kind === 'smash' && r.item != null ? items.find(x => itemCodeIdx(x) === r.item) : null;
    const what = r.kind === 'smash' ? `${josa(it ? it.def.name : '소품', '을', '를')} 부수고 감` : (KIND[r.kind]?.did || '다녀감');
    const st = r.cleaned_at ? (r.kind === 'smash' ? '고침' : '치움') : !aliveRec(r) ? '사라짐' : null;
    list.append(el('li', {}, el('span', { class: `t-lic${r.kind === 'smash' ? ' rose' : ''}` }, ic(r.kind)),
      el('span', { class: 'n' }, el('b', {}, r.by_name || '누군가'), el('small', {}, `${what} · ${agoText(r.created_at)}`)),
      st ? el('span', { class: 'pill' }, st) : el('button', { class: 'k small', type: 'button', onclick: () => {
        closeSheet(); const d = r.kind === 'smash' && it ? it.dir : dirOf(r.la, r.lo);
        walkTo(d.clone().applyAxisAngle(northAt(d, new V3()).cross(d).normalize(), 1.2 / R), true);
        if (r.kind === 'smash' && it) showAct(`${josa(r.by_name || '누군가', '이', '가')} 부순 ${it.def.name}`, '고치기', () => fixItem(it));
        else { const m = marks.get(r.id); if (m) showAct(`${r.by_name || '누군가'}의 ${KIND[r.kind]?.name}`, '치우기', () => cleanMark(m)); }
      } }, '보러 가기')));
  }
  body.append(pranks.length ? list : el('p', { class: 't-muted' }, '아직 아무도 안 왔어. 「자랑」 링크를 보내거나 광장 정거장에서 행성을 구경 오게 해 봐.'));
  sheetBody.append(body);
  DC.store.set('town_seen_' + ME, Date.now()); updateLogDot();
};
function updateLogDot() {
  const b = $('#logBtn'); if (!b || !ME) return; const seen = DC.store.get('town_seen_' + ME, 0);
  b.classList.toggle('dot', pranks.some(r => Date.parse(r.created_at) > seen && aliveRec(r)));
}
$('#side')?.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || busy) return; DC.sfx('tap');
  if (b.id === 'shipBtn') { depart(); return; }
  const name = { logBtn: 'log', shieldBtn: 'quiz', prankBtn: 'prank' }[b.id];
  if (!sheet.classList.contains('hidden') && sheet.dataset.name === name) { closeSheet(); return; }
  if (name) openSheet(name);
});

// ── 서버 붙이기 · 공개 · 따라가기(로비) ──
const currentCode = () => C.encode({ ...S, items: items.map(it => [it.t, it.la, it.lo, it.r]) });
let pubT = 0;
function schedulePublish() {
  if (VISIT || !live() || !ME || !registered) return;
  clearTimeout(pubT); pubT = setTimeout(async () => { const r = await net.towns.publish(currentCode(), townName(), S.p); if (!r?.ok) console.warn('타운: 행성 공개 실패'); }, 2500);
}
onSaved = () => { schedulePublish(); lobby?.update({ placeName: townName(), town: currentCode() }); if (live() && OWNER) renderPranks(); };
async function initSocial() {
  net = await netP;
  document.body.classList.toggle('has-net', live());
  if (!net) return;
  ME = net.me?.() || null; OWNER = VISIT ? OWNER_Q : ME;
  let prof = null; try { prof = await net.profile.get(); } catch { prof = null; }
  registered = !!prof;
  try {
    const K = await import('./dwk-char.js?v=6'); const c = DC.store.get('char', null);
    if (c) { const n = K.normalizeChar(c); myCharCode = K.encodeChar(n); myName = K.charName(n); }
  } catch (e) { console.warn('타운: 캐릭터 이름을 못 읽음', e); }
  if (prof?.ig && prof.agree?.podium) myName = '@' + prof.ig; // 공개 동의한 사람만 인스타 아이디로 보인다
  // 따라가기(테일즈런너식): 나는 지금 「○○의 행성」에 있다고 로비에 알린다
  try {
    lobby = net.lobby({ name: myName, code: myCharCode, place: 'town', placeName: townName(), town: VISIT ? (location.hash.match(/t=([A-Za-z0-9_-]*)/)?.[1] || currentCode()) : currentCode(), owner: OWNER });
    addEventListener('pagehide', () => { try { lobby?.leave(); } catch { /* 닫힘 */ } });
  } catch (e) { console.warn('타운: 로비 연결 실패', e); }
  const canSocial = live() && !!OWNER;
  document.body.classList.toggle('can-social', canSocial);
  if (VISIT) $('#visitNote').textContent = live() ? (OWNER ? '흔적을 남기고 가도 돼 · 주인이 치울 수 있어' : '이 링크엔 주인 정보가 없어서 구경만 돼') : '장난·방어막은 서버 연결 후 열려';
  if (!canSocial) return;
  await refreshPranks(false);
  if (VISIT && ME) net.attack.count().then(n => { attackN = n; }); // 로그인 안 한 구경꾼은 공격권 조회를 안 한다(서버가 401)
  if (isOwnerView()) {
    schedulePublish();
    const seen = DC.store.get('town_seen_' + ME, 0); const fresh = pranks.filter(r => Date.parse(r.created_at) > seen);
    if (fresh.length) setTimeout(() => DC.toast(`누가 다녀갔어 · 새 기록 ${fresh.length}개`), ARRIVE ? 4200 : 600);
  }
}
let pollT = 0, pillT = 0; const _cl = new V3();
function tickSocial(dt, now) {
  ship.tick(dt);
  if (dome.visible) { dome.material.uniforms.uT.value = tAll; if (shieldUntil <= Date.now()) setShield(null); }
  for (const m of marks.values()) m.inner.traverse(o => {
    const a = o.userData.anim; if (!a) return;
    if (a === 'cloth') { m.holder.worldToLocal(_cl.copy(camera.position)); o.rotation.y = Math.atan2(_cl.x, _cl.z) - m.inner.rotation.y + Math.sin(tAll * 2.4 + m.rec.id) * 0.18; } // 깃발 글씨가 늘 보는 사람 쪽을 향하게
    else if (a === 'bob') o.position.y = 1.05 + Math.sin(tAll * 2 + m.rec.id) * 0.06;
    else if (a === 'ember') o.material.opacity = 0.35 + Math.sin(tAll * 7 + m.rec.id) * 0.2;
  });
  for (const it of items) if (it.wreck) it.wreck.extra.traverse(o => { if (o.userData.anim === 'smoke') { o.position.y = 0.9 + Math.sin(tAll * 0.8) * 0.15; o.material.opacity = 0.32 + Math.sin(tAll * 1.3) * 0.1; } });
  if (now - pillT > 1000) { pillT = now; if (shieldUntil) updateShieldPill(); }
  if (now - pollT > 45000) { pollT = now; if (live() && OWNER && !pending && !document.hidden) refreshPranks(true).catch(e => console.warn('타운: 흔적 새로고침 실패', e)); }
}
// 방문자가 탄 우주선의 캐릭터 = 내 캐릭터(광장에서 만든 생존자 · 없으면 내 마을 캐릭터)
function travelerChar() {
  const c = DC.store.get('char', null); const t = DC.store.get('town', null);
  const idx = Number.isInteger(c?.b) && c.b >= 0 && c.b < C.CHARS.length ? c.b : Number.isInteger(t?.c) && t.c >= 0 && t.c < C.CHARS.length ? t.c : 0;
  const h = Number.isInteger(t?.h) && t.h >= 0 && t.h < C.HATS.length && hatOpen(C.HATS[t.h]) ? t.h : 0;
  return [idx, h];
}

// ───────── 행성 바꾸기 · 시작 ─────────
gltfs.__done = {};
async function ensureModels(names) {
  const list = [...new Set(names)];
  const res = await Promise.all(list.map(load)); list.forEach((n, i) => { gltfs.__done[n] = res[i]; });
}
const themeModels = (th) => [...(th.decor || []).map(d => d.m)];
async function changePlanet(p) {
  const th = themeOf(p); const need = themeModels(th).filter(n => !gltfs.__done[n]);
  if (need.length) { DC.toast('행성 짓는 중…'); await ensureModels(need); }
  buildPlanet(p); DC.toast(`${p.name}에 도착`);
}

async function start() {
  const p = PLANETS.find(x => x.id === S.p) || PLANETS[PLANETS.length - 1];
  const propModels = Object.values(PROP_DEF).filter(d => d.model).map(d => d.model);
  await ensureModels([...propModels, 'nature/flower_redA', 'nature/flower_purpleA', 'nature/flower_yellowA', 'nature/campfire_stones', ...themeModels(themeOf(p)), charModel(C.CHARS[S.c])]);
  buildPlanet(p);
  S.items.forEach(([t, la, lo, r], i) => { const it = spawnItem(t, la, lo, r, false); if (it) it.ci = i; }); // ci = 마을 코드 속 순서(부수기 기록과 맞춘다)
  const [ci, hi] = VISIT && ARRIVE ? travelerChar() : [S.c, S.h]; // 우주선 타고 온 방문자는 내 캐릭터로 내린다
  await setCharacter(ci, hi);
  // 첫 위치: 집이 있으면 집 앞, 없으면 기본 자리
  const house = items.find(i => i.id === 'house' || i.id === 'cabin');
  if (house) { const ax = northAt(house.dir, new V3()).cross(house.dir).normalize(); player.dir.copy(house.dir).applyAxisAngle(ax, (house.def.r + 1.2) / R).normalize(); }
  else if (VISIT && items.length) player.dir.copy(items[0].dir).applyAxisAngle(northAt(items[0].dir, new V3()).cross(items[0].dir).normalize(), -1.4 / R).normalize();
  cam.dir.copy(player.dir); cam.fwd.copy(northAt(player.dir)); player.face.copy(cam.fwd);
  placeShip(choosePad(player.dir)); // 우주선은 늘 마을 옆에 세워 둔다(다시 타는 곳)
  $('#nameText').textContent = townName();
  document.title = `${VISIT ? '친구 행성' : '내 행성'} · ${townName()} · 돈워너노우`;
  if (VISIT) {
    document.body.classList.add('visit');
    $('#nameKind').textContent = '친구 행성';
    $('#visitName').textContent = BROKEN ? '링크가 깨졌어 — 기본 행성' : townName();
    const sp = visitSpecials();
    if (sp.length) $('#visitNote').textContent = `${sp.map(d => d.name).join(' · ')}: 영상 속 코드로 열려`;
    if (BROKEN) DC.toast('링크가 깨져서 기본 마을을 보여줄게');
  } else DC.store.set('town', { ...S, items: items.map(it => [it.t, it.la, it.lo, it.r]) });
  if (missing.size) DC.toast('일부 모델을 못 불러왔어. 새로고침해 봐');
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitFov(); });
  renderer.setAnimationLoop(tick);
  $('#loading').classList.add('hidden');
  document.body.classList.add('t-ready'); // D7: 다 뜨면 위 「‹」를 감추고 나가는 길은 「광장으로」(우주선) 하나만 남긴다
  window.__townReady = true;
  const social = initSocial().catch((e) => { console.error('타운: 서버 기능 시작 실패', e); });
  if (DOOM_ON) { // 세계 옷 + 하나의 큰 행성 연출(town-doom.js) — 실패해도 원래 화면은 그대로 쓴다
    window.__townGL = { THREE, scene, camera, renderer, R, QS, cam, player, charRoot, C, CH_S, SkeletonUtils, load, charModel, propTemplate, frameQuat, northAt, dirOf, PAD: () => PAD, hideSmallShip: () => { shipHolder.visible = false; shipHolder.traverse(o => o.layers.disableAll()); }, items, removeItem };
    try { const m = await import('./town-doom.js?v=1'); await m.install(window.__townGL); } catch (e) { console.warn('타운: 세계 옷 건너뜀', e); }
  }
  if (ARRIVE) await arrive(); // 우주선 꼭대기에 탄 채 하늘에서 내려와 착륙
  await social;
  // 첫 진입: 손가락 그림으로 조작 안내(탭하면 사라짐 · 한 번만)
  const coach = $('#coach');
  if (coach && !DC.store.get('town_coach', false) && !busy) {
    coach.classList.remove('hidden');
    const done = () => { coach.classList.add('hidden'); DC.store.set('town_coach', true); DC.sfx('tap'); };
    coach.addEventListener('click', done, { once: true });
  }
  // 시험용 손잡이(콘솔에서 확인용 · 화면 동작엔 영향 없음)
  window.__town = { S, items, codec: C, encode: () => C.encode({ ...S, items: items.map(it => [it.t, it.la, it.lo, it.r]) }), place: (id, la, lo) => place(id, dirOf(la, lo)), openSheet, pdir: () => player.dir.toArray().map(v => +v.toFixed(3)),
    // 행성 사이 기능 손잡이
    net: () => net, me: () => ME, owner: () => OWNER, pranks: () => pranks, marks: () => [...marks.values()].map(m => ({ id: m.rec.id, kind: m.rec.kind })),
    wrecks: () => items.filter(i => i.wreck).map(i => ({ idx: itemCodeIdx(i), id: i.id })), shield: () => shieldUntil, attack: () => attackN,
    arrive, depart, refresh: refreshPranks, setTool: setPrankTool, prank: (kind, la, lo) => doPrank(kind, dirOf(la, lo)),
    smash: (idx) => { const it = items.find(i => itemCodeIdx(i) === idx); return it ? doSmash(it) : null; },
    clean: (id) => { const m = marks.get(id); return m ? cleanMark(m) : null; }, fix: (idx) => { const it = items.find(i => itemCodeIdx(i) === idx); return it ? fixItem(it) : null; },
    quiz: () => lastQuiz, busy: () => busy, meteorFx: () => meteorFall(player.dir.clone().applyAxisAngle(northAt(player.dir, new V3()).cross(player.dir).normalize(), 2 / R)), ship: () => ({ pad: PAD.toArray().map(v => +v.toFixed(3)), y: +ship.group.position.y.toFixed(2) }), myName: () => myName };
}

$('#nameBtn').addEventListener('click', () => { if (VISIT) return; DC.sfx('tap'); openSheet('name'); });
const sndBtn = $('#snd'); const sndLabel = () => { sndBtn.replaceChildren(ic(DC.sfx.on() ? 'sound' : 'mute')); sndBtn.setAttribute('aria-label', DC.sfx.on() ? '소리 끄기' : '소리 켜기'); };
sndBtn.addEventListener('click', () => { DC.sfx.toggle(); sndLabel(); DC.sfx('tap'); }); sndLabel();
addEventListener('hashchange', () => location.reload());

start().catch((e) => { console.error('타운 시작 실패', e); fail('마을을 못 지었어', '불러오다가 문제가 생겼어. 새로고침해 줘. 계속 안 되면 다른 브라우저로 열어 줘.'); });
