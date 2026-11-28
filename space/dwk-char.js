/* dwk-char.js — 돈워너노우 「내 생존자」 캐릭터 부품 (만들기 maker.html · 주민 광장 plaza.html 이 함께 쓴다)
   의존: data.js(window.DWK) → dwk-core.js(window.DC) → importmap 의 three@0.180.0
   원칙: 서버 없음 · 로그인 없음 · 자유 입력 없음(이름 = 단어 두 개 고르기) · 저장은 DC.store('char')
   캐릭터 = 15바이트 → 20글자 코드. 코드만 있으면 누구나 같은 캐릭터를 다시 그린다(영상 카메오도 이 코드로 만든다).
   모델: Kenney Mini Characters (CC0, assets/kenney/chars/License.txt). 9종이 색 견본 그림(colormap.png) 하나를 같이 쓴다 →
   정점의 견본 칸 좌표(UV)를 다른 칸으로 옮기면 그 부위 색만 바뀐다. 그래서 그림 파일을 새로 만들지 않는다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const DC = window.DC, D = window.DWK;

// ───────── 목록 (★뒤에만 추가한다 — 순서를 바꾸면 이미 퍼진 코드가 다른 캐릭터가 된다) ─────────
export const BASES = ['male-b', 'female-a', 'male-a', 'female-c', 'male-d', 'female-e', 'robot', 'alien', 'zombie']; // 타운과 같은 순서
export const BASE_LABEL = ['A형', 'B형', 'C형', 'D형', 'E형', 'F형', '로봇', '외계인', '좀비'];
// 견본 칸 [열, 줄] (512px 그림 · 칸 32×128). null = 원래 색
export const SKIN = [null, [7, 2], [5, 2], [1, 2], [3, 2], [9, 2], [5, 1], [3, 1]];
export const SKIN_LABEL = ['원래대로', '밝은 피부', '살구', '복숭아', '갈색', '좀비 초록', '외계 보라', '얼음 하늘'];
export const COLORS = [null, [7, 3], [3, 2], [1, 3], [13, 2], [15, 2], [9, 1], [7, 1], [5, 1], [1, 1], [3, 1], [9, 2], [11, 2], [9, 3], [15, 3]];
export const COLOR_LABEL = ['원래대로', '검정', '갈색', '금색', '주황', '빨강', '분홍', '자홍', '보라', '파랑', '하늘', '초록', '노랑', '회색', '흰색'];
export const HATS = ['none', 'straw', 'beanie', 'party', 'sunflower', 'helmet', 'crown', 'antenna', 'halo', 'cap'];
export const POSES = [
  { id: 'idle', name: '서 있기', t: 0.3 }, { id: 'emote-yes', name: '반가워', t: 0.45 }, { id: 'jump', name: '점프', t: 0.35 },
  { id: 'sit', name: '앉기', t: 0.5 }, { id: 'crouch', name: '숨기', t: 0.5 }, { id: 'sprint', name: '달리기', t: 0.25 },
  { id: 'interact-right', name: '손 뻗기', t: 0.5 }, { id: 'die', name: '기절', t: 0.98 }, { id: 'emote-no', name: '싫어', t: 0.4 },
];
export const ADJ = ['겁 없는', '졸린', '수상한', '배고픈', '느긋한', '용감한', '수줍은', '엉뚱한', '반짝이는', '조용한', '시끄러운', '행운의', '말랑한', '꿈꾸는', '까칠한', '다정한'];
export const NOUN = ['감자', '펭귄', '고양이', '우주인', '탐험가', '요리사', '방랑자', '두더지', '토끼', '다람쥐', '곰', '반딧불', '눈사람', '해바라기', '로봇', '외계인'];
export const SKILLS = ['아무 데서나 잘 잠', '배고픔 참기', '길 잘 찾기', '눈치 백단', '수영 선수', '빨리 달리기', '요리 천재', '숨기 달인', '친구 잘 사귐', '운이 좋음', '의심이 많음', '절대 안 울어'];

// 칭호 = 게임에서 실제로 해낸 것만. (가짜 자랑이 없어야 자랑이 의미가 있다)
const st = (k, d) => DC.store.get(k, d);
const endN = (g) => DC.endings.got(g).length;
export const TITLES = [
  { name: '새내기 우주인', how: '처음부터', ok: () => true },
  { name: '1년 생존자', how: '행성 생존에서 365일 버티기', ok: () => (st('best_survive', null)?.days || 0) >= 365 },
  { name: '엔딩 수집가', how: '엔딩·업적 5개 모으기', ok: () => DC.endings.total() >= 5 },
  { name: '은하를 만든 자', how: '행성 합치기에서 새 은하 만들기', ok: () => DC.rewards.has('badge-galaxy') },
  { name: '착륙 장인', how: '행성 착륙 10연속', ok: () => DC.endings.got('land').includes('combo10') },
  { name: '빈틈 탐정', how: '빈틈 찾기 결과 3종 모으기', ok: () => endN('find') >= 3 },
  { name: '테스터', how: '테스터 코드', ok: () => DC.rewards.has('badge-tester') },
  { name: '해바라기 단골', how: '영상 속 코드 SUN7', ok: () => DC.rewards.has('hat-sunflower') },
  { name: '행성 여권 수집가', how: '행성 도장 5개', ok: () => Object.keys(st('passport', {})).length >= 5 },
  { name: '타운 주민', how: '타운에 마을 만들기', ok: () => !!st('town', null) },
];
export const HAT_DEF = {
  none: { name: '맨머리', emoji: '🙂' },
  straw: { name: '밀짚모자', emoji: '👒' },
  beanie: { name: '털모자', emoji: '🧶' },
  party: { name: '고깔모자', emoji: '🥳' },
  cap: { name: '탐험 모자', emoji: '🧢' },
  antenna: { name: '더듬이', emoji: '📡' },
  sunflower: { name: '해바라기 모자', emoji: '🌻', how: '영상 속 코드 SUN7', ok: () => DC.rewards.has('hat-sunflower') },
  helmet: { name: '우주 헬멧', emoji: '👨‍🚀', how: '행성 착륙 10번 성공', ok: () => DC.endings.got('land').includes('first10') },
  crown: { name: '은하 왕관', emoji: '👑', how: '행성 합치기에서 새 은하', ok: () => DC.rewards.has('badge-galaxy') },
  halo: { name: '생존자 고리', emoji: '😇', how: '행성 생존 엔딩 3개', ok: () => endN('survive') >= 3 },
};
export const HAT_ORDER = ['none', 'straw', 'beanie', 'party', 'cap', 'antenna', 'sunflower', 'helmet', 'crown', 'halo']; // 고르는 화면 순서
export const hatOpen = (id) => !HAT_DEF[id].ok || HAT_DEF[id].ok();
export const titleOpen = (i) => { try { return !!TITLES[i]?.ok(); } catch { return i === 0; } };

// 출신 행성: 장면 그림이 있는 출시 행성(4편은 사람 얼굴 그림이라 뺀다 — 착륙 게임과 같은 기준)
export const homePlanets = () => DC.planets().filter(p => !p.id.startsWith('4-')).sort((a, b) => a.ep - b.ep || a.id.localeCompare(b.id));

// ───────── 코드 (서버 없이 캐릭터를 주고받는 유일한 방법) ─────────
const VER = 1;
const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function b64e(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 3) { const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0); const k = Math.min(4, Math.ceil((bytes.length - i) * 4 / 3)); for (let j = 0; j < k; j++) s += AB[n >> (18 - 6 * j) & 63]; } return s; }
function b64d(s) { if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) return null; const out = []; let buf = 0, bits = 0; for (const ch of s) { buf = ((buf << 6) | AB.indexOf(ch)) & 0xfffff; bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } } return out; }
const check = (b) => { let h = 2166136261; for (const x of b) { h ^= x; h = Math.imul(h, 16777619); } h >>>= 0; return (h ^ (h >>> 8) ^ (h >>> 16) ^ (h >>> 24)) & 255; };

export function defaultChar() {
  const hp = homePlanets()[0]?.id || '1-1';
  return { b: 0, skin: 0, hair: 0, c1: 0, c2: 0, hat: 0, pose: 1, p: hp, n: [0, 0], title: 0, skill: 0 };
}
export function normalizeChar(s) {
  if (!s || typeof s !== 'object') return null; const d = defaultChar(); const n = Array.isArray(s.n) ? s.n : [];
  return {
    b: isInt(s.b, 0, BASES.length - 1) ? s.b : d.b, skin: isInt(s.skin, 0, SKIN.length - 1) ? s.skin : 0,
    hair: isInt(s.hair, 0, COLORS.length - 1) ? s.hair : 0, c1: isInt(s.c1, 0, COLORS.length - 1) ? s.c1 : 0, c2: isInt(s.c2, 0, COLORS.length - 1) ? s.c2 : 0,
    hat: isInt(s.hat, 0, HATS.length - 1) ? s.hat : 0, pose: isInt(s.pose, 0, POSES.length - 1) ? s.pose : d.pose,
    p: typeof s.p === 'string' && /^\d{1,2}-\d{1,2}$/.test(s.p) ? s.p : d.p,
    n: [isInt(n[0], 0, ADJ.length - 1) ? n[0] : 0, isInt(n[1], 0, NOUN.length - 1) ? n[1] : 0],
    title: isInt(s.title, 0, TITLES.length - 1) ? s.title : 0, skill: isInt(s.skill, 0, SKILLS.length - 1) ? s.skill : 0,
  };
}
// 바이트: [판, 몸, 피부, 머리, 옷1, 옷2, 모자, 자세, 편, 행성, 이름1, 이름2, 칭호, 특기, 검사합] → 20글자
export function encodeChar(s) {
  s = normalizeChar(s); const [ep, k] = s.p.split('-').map(Number);
  const b = [VER, s.b, s.skin, s.hair, s.c1, s.c2, s.hat, s.pose, ep, k, s.n[0], s.n[1], s.title, s.skill]; b.push(check(b));
  return b64e(b);
}
export function decodeChar(str) {
  if (typeof str !== 'string') return null; str = str.trim().replace(/^#?c=/, '').replace(/^DWK-/i, '');
  if (!str || str.length > 40) return null; const b = b64d(str); if (!b || b.length !== 15 || b[0] !== VER) return null;
  if (check(b.slice(0, -1)) !== b[14]) return null;
  return normalizeChar({ b: b[1], skin: b[2], hair: b[3], c1: b[4], c2: b[5], hat: b[6], pose: b[7], p: `${b[8]}-${b[9]}`, n: [b[10], b[11]], title: b[12], skill: b[13] });
}
export const charName = (s) => `${ADJ[s.n[0]]} ${NOUN[s.n[1]]}`;

// ───────── 견본 색 (화면 단추용 — 실제 그림에서 칸 가운데 색을 읽는다) ─────────
const ASSET = 'assets/kenney/';
let swatchCtx = null;
export async function swatchColors() {
  if (!swatchCtx) {
    const img = new Image(); img.src = `${ASSET}chars/Textures/colormap.png`; await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = 512; swatchCtx = c.getContext('2d', { willReadFrequently: true }); swatchCtx.drawImage(img, 0, 0);
  }
  const at = (cell) => { if (!cell) return null; const [r, g, b] = swatchCtx.getImageData(cell[0] * 32 + 16, cell[1] * 128 + 40, 1, 1).data; return `rgb(${r},${g},${b})`; };
  return { skin: SKIN.map(at), colors: COLORS.map(at) };
}

// ───────── 3D ─────────
const loader = new GLTFLoader(); const gltfs = {};
export const loadBase = (i) => (gltfs[i] ||= loader.loadAsync(`${ASSET}chars/character-${BASES[i]}.glb`).catch((e) => { console.warn('캐릭터 모델을 못 불러옴', BASES[i], e); return null; }));

// 부위 찾기: 견본 칸별 정점 수·평균 높이를 세어 피부·머리카락·옷1·옷2 칸을 고른다(9종 모두 같은 규칙 · 2026-11-19 실측표는 README)
const cellOf = (u, v) => `${Math.floor(u * 16)},${Math.floor(v * 4)}`;
const roleCache = {};
function roles(i, gl) {
  if (roleCache[i]) return roleCache[i];
  const stat = { head: {}, body: {} };
  gl.scene.traverse(o => {
    if (!o.isMesh) return; const part = /head/.test(o.name) ? 'head' : 'body';
    const uv = o.geometry.attributes.uv, pos = o.geometry.attributes.position;
    for (let k = 0; k < uv.count; k++) { const c = cellOf(uv.getX(k), uv.getY(k)); const s = (stat[part][c] ||= { n: 0, y: 0 }); s.n++; s.y += pos.getY(k); }
  });
  const list = (p) => Object.entries(stat[p]).map(([c, s]) => ({ c, n: s.n, y: s.y / s.n })).sort((a, b) => b.n - a.n);
  const head = list('head'), body = list('body');
  const skin = head.find(x => x.n === 220)?.c || null;          // 9종 공통: 얼굴 칸은 정점 220개
  const hair = head.find(x => x.c !== skin)?.c || null;
  const rest = body.filter(x => x.c !== skin);
  const top = rest.filter(x => x.y >= 0.2)[0] || rest[0];
  const c1 = top?.c || null;
  const c2 = rest.find(x => x.c !== c1 && x.n >= 100)?.c || null;
  return (roleCache[i] = { skin, hair, c1, c2 });
}
function recolor(obj, i, gl, s) {
  const R = roles(i, gl);
  const want = { skin: SKIN[s.skin], hair: COLORS[s.hair], c1: COLORS[s.c1], c2: COLORS[s.c2] };
  obj.traverse(o => {
    if (!o.isMesh) return; const part = /head/.test(o.name) ? 'head' : 'body';
    const moves = {};
    if (R.skin && want.skin) moves[R.skin] = want.skin;
    if (part === 'head' && R.hair && want.hair) moves[R.hair] = want.hair;
    if (part === 'body' && R.c1 && want.c1) moves[R.c1] = want.c1;
    if (part === 'body' && R.c2 && want.c2) moves[R.c2] = want.c2;
    if (!Object.keys(moves).length) return;
    const g = o.geometry.clone(); const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) {
      const u = uv.getX(k), v = uv.getY(k); const to = moves[cellOf(u, v)]; if (!to) continue;
      const [sc, sr] = cellOf(u, v).split(',').map(Number); const dc = to[0] - (to[0] % 2) + (sc % 2);   // 줄무늬(그라데이션) 칸 성질 유지
      uv.setXY(k, u + (dc - sc) / 16, v + (to[1] - sr) / 4);
    }
    uv.needsUpdate = true; o.geometry = g;
  });
}

const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
// 모자: 머리 폭(hw)을 1로 놓고 만든다(타운 모자와 같은 모양 + 새 모자 5개)
export function makeHat(id) {
  const g = new THREE.Group();
  if (id === 'straw') {
    g.add(mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 22), mat(0xe6c47a), 0, 0.02, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.78, 0.9, 0.55, 18), mat(0xe6c47a), 0, 0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.14, 18), mat(0xc7413a), 0, 0.12, 0)); g.position.y = -0.18;
  } else if (id === 'beanie') {
    const cap = mesh(new THREE.SphereGeometry(1.06, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9534f, { roughness: 1 })); cap.scale.y = 0.8; g.add(cap);
    g.add(mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.28, 18), mat(0xf0ebe0, { roughness: 1 }), 0, 0.02, 0));
    g.add(mesh(new THREE.SphereGeometry(0.3, 12, 10), mat(0xf0ebe0, { roughness: 1 }), 0, 0.92, 0)); g.position.y = -0.42;
  } else if (id === 'party') {
    g.add(mesh(new THREE.ConeGeometry(0.6, 1.4, 18), mat(0xff6fae), 0, 0.7, 0));
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.07, 6, 18).rotateX(Math.PI / 2), mat(0x7fe3ff), 0, 0.42, 0));
    g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xffd34d), 0, 1.42, 0)); g.position.y = -0.12;
  } else if (id === 'sunflower') {
    const petal = new THREE.SphereGeometry(0.42, 10, 8);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const p = mesh(petal, mat(0xf6c31b, { roughness: 0.7 }), Math.cos(a) * 0.95, 0.06, Math.sin(a) * 0.95); p.scale.set(1, 0.25, 0.55); p.rotation.y = -a; g.add(p); }
    g.add(mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.22, 18), mat(0x5a3418, { roughness: 1 }), 0, 0.1, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), mat(0x4f8a2b), 0, 0.38, 0)); g.position.y = -0.06;
  } else if (id === 'helmet') {
    const glass = mesh(new THREE.SphereGeometry(1.55, 28, 18), new THREE.MeshPhysicalMaterial({ color: 0xcfefff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, depthWrite: false })); g.add(glass);
    g.add(mesh(new THREE.TorusGeometry(1.32, 0.16, 10, 28).rotateX(Math.PI / 2), mat(0xf4f4f4, { roughness: 0.5 }), 0, -1.0, 0));
    g.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xff5a5a, { emissive: 0xff5a5a, emissiveIntensity: 1 }), 0.9, 1.05, 0)); g.position.y = -1.05;
  } else if (id === 'crown') {
    g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.42, 20, 1, true), mat(0xffcf3a, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide }), 0, 0.21, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(mesh(new THREE.ConeGeometry(0.17, 0.42, 6), mat(0xffcf3a, { metalness: 0.6, roughness: 0.3 }), Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8)); }
    g.add(mesh(new THREE.OctahedronGeometry(0.17), mat(0x7fe3ff, { emissive: 0x2a7fff, emissiveIntensity: 0.6 }), 0, 0.24, 0.86)); g.position.y = -0.28;
  } else if (id === 'antenna') {
    for (const s of [-1, 1]) {
      const st = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), mat(0x333344), s * 0.35, 0.45, 0); st.rotation.z = -s * 0.35; g.add(st);
      g.add(mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(0x9dff6a, { emissive: 0x6aff3a, emissiveIntensity: 0.9 }), s * 0.53, 0.95, 0));
    }
  } else if (id === 'halo') {
    g.add(mesh(new THREE.TorusGeometry(0.75, 0.1, 10, 32).rotateX(Math.PI / 2), mat(0xffe680, { emissive: 0xffd34d, emissiveIntensity: 1.4 }), 0, 0.55, 0));
  } else if (id === 'cap') {
    const top = mesh(new THREE.SphereGeometry(1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2f6fd8)); top.scale.y = 0.62; g.add(top);
    const brim = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.07, 18, 1, false, -Math.PI / 2, Math.PI), mat(0x2f6fd8), 0, 0.02, 0.62); brim.scale.z = 1.3; g.add(brim);
    g.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xffd34d), 0, 0.66, 0)); g.position.y = -0.3;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// 캐릭터 한 명을 만든다 → { root, mixer, pose(i, still) }
export async function makeCharacter(s) {
  s = normalizeChar(s); const gl = await loadBase(s.b); if (!gl) return null;
  const o = SkeletonUtils.clone(gl.scene); recolor(o, s.b, gl, s);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } });
  // 크기는 원본 그대로(키 ≈ 0.66). 만들기·카드·광장 카메라가 이 크기에 맞춰져 있다 — 1로 키우면 만들기 화면에서 잘린다(2026-11-19 실측). 광장(world)은 root 를 따로 키운다.
  const root = new THREE.Group(); root.add(o);
  // 모자: 머리 뼈에 붙인다
  let head = null; o.traverse(b => { if (b.isBone && b.name === 'head') head = b; });
  const hatId = HATS[s.hat];
  if (head && hatId !== 'none') {
    // 타운 headInfo 와 같은 계산: 원본(크기 조정 전) 장면에서 머리 뼈 위치와 머리 모양 상자를 잰다
    const src = gl.scene; src.updateMatrixWorld(true);
    const bone = src.getObjectByName('head'), hm = src.getObjectByName('head-mesh'); const bp = new THREE.Vector3(); bone?.getWorldPosition(bp);
    let info = { y: 0.3, z: 0, hw: 0.17 };
    if (hm?.geometry) { hm.geometry.computeBoundingBox(); const bb = hm.geometry.boundingBox; info = { y: bb.max.y - bp.y, z: (bb.min.z + bb.max.z) / 2 - bp.z, hw: (bb.max.x - bb.min.x) / 2 }; }
    const wrap = new THREE.Group(); wrap.add(makeHat(hatId)); wrap.scale.setScalar(info.hw); wrap.position.set(0, info.y, info.z); head.add(wrap);
  }
  const mixer = new THREE.AnimationMixer(o); let cur = null;
  function pose(i = s.pose, still = false) {
    const P = POSES[i] || POSES[0]; const clip = gl.animations.find(a => a.name === P.id) || gl.animations.find(a => a.name === 'idle'); if (!clip) return;
    const a = mixer.clipAction(clip); if (cur && cur !== a) cur.stop(); cur = a;
    a.reset(); a.setLoop(P.id === 'die' || P.id === 'sit' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = true; a.play();
    if (still) { a.paused = false; mixer.setTime(clip.duration * P.t); }
  }
  pose(s.pose, true);
  // 광장용: 이름으로 동작 바꾸기(걷기·서기·손 흔들기) — 부드럽게 넘어간다
  function anim(name, { once = false, fade = 0.18 } = {}) {
    const clip = gl.animations.find(a => a.name === name); if (!clip) return 0;
    const a = mixer.clipAction(clip); if (cur === a && !once) return clip.duration;
    a.reset(); a.paused = false; a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.enabled = true; a.setEffectiveWeight(1);
    if (cur && cur !== a) cur.crossFadeTo(a, fade, false); a.play(); cur = a; return clip.duration;
  }
  return { root, mixer, pose, anim, state: s, clips: gl.animations.map(a => a.name) };
}

// 무대(조명 + 바닥 그림자) — 미리보기와 카드가 같은 무대를 쓴다
export function makeStage() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.6); sun.position.set(1.2, 3, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 2, bottom: -1, near: 0.1, far: 10 }); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9fd8ff, 1.4); rim.position.set(-2, 1.5, -2); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.35 })); ground.receiveShadow = true; scene.add(ground);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20); camera.position.set(0.9, 1.0, 2.7); camera.lookAt(0, 0.5, 0);
  return { scene, camera };
}

let offRenderer = null;
function offscreen() {
  if (!offRenderer) { offRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); offRenderer.shadowMap.enabled = true; offRenderer.toneMapping = THREE.NeutralToneMapping; offRenderer.setClearColor(0x000000, 0); }
  return offRenderer;
}
// 캐릭터 그림(투명 배경) — 카드·광장 목록용
export async function portrait(s, w = 512, h = 512, { yaw = -0.35, fov = 28 } = {}) {
  const ch = await makeCharacter(s); if (!ch) return null;
  const { scene, camera } = makeStage(); ch.root.rotation.y = yaw; scene.add(ch.root); ch.mixer.update(0);
  const r = offscreen(); r.setPixelRatio(1); r.setSize(w, h, false); camera.aspect = w / h; camera.fov = fov; if (fov < 28) camera.lookAt(0, 0.45, 0); camera.updateProjectionMatrix(); r.render(scene, camera);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(r.domElement, 0, 0, w, h);
  scene.remove(ch.root); return c;
}

// ───────── 캐릭터 카드 1080×1350 ─────────
const FONT = "'Pretendard Variable', Pretendard, system-ui, -apple-system, 'Apple SD Gothic Neo', sans-serif";
function rr(x, X, y, w, h, r) { x.beginPath(); x.moveTo(X + r, y); x.arcTo(X + w, y, X + w, y + h, r); x.arcTo(X + w, y + h, X, y + h, r); x.arcTo(X, y + h, X, y, r); x.arcTo(X, y, X + w, y, r); x.closePath(); }
const loadImg = (src) => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
export async function charCard(s, { badge = '내 생존자' } = {}) {
  s = normalizeChar(s);
  try { await Promise.all([document.fonts.load(`800 80px ${FONT}`), document.fonts.load(`600 34px ${FONT}`)]); } catch { /* 시스템 글꼴 */ }
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
  x.fillStyle = '#05060d'; x.fillRect(0, 0, 1080, 1350);
  const bg = await loadImg(DC.scene(s.p, 'a'));
  // 장면 사진엔 영상 속 캐릭터가 찍혀 있다 → 흐리게 깔아 내 캐릭터와 겹쳐 보이지 않게(2026-11-19 실측: 안 흐리면 두 명처럼 보임)
  if (bg) { const sc = Math.max(1080 / bg.width, 1000 / bg.height) * 1.1; const w = bg.width * sc, h = bg.height * sc; x.filter = 'blur(14px) brightness(0.6)'; x.drawImage(bg, (1080 - w) / 2, -40, w, h); x.filter = 'none'; }
  const g1 = x.createLinearGradient(0, 600, 0, 1000); g1.addColorStop(0, 'rgba(5,6,13,0)'); g1.addColorStop(1, 'rgba(5,6,13,1)'); x.fillStyle = g1; x.fillRect(0, 600, 1080, 400); x.fillStyle = '#05060d'; x.fillRect(0, 1000, 1080, 350);
  const pic = await portrait(s, 980, 900, { fov: 21 }); if (pic) x.drawImage(pic, 50, 50, 980, 900);
  x.textBaseline = 'middle'; x.font = `800 34px ${FONT}`; const tw = x.measureText(badge).width;
  x.fillStyle = 'rgba(5,6,13,.65)'; rr(x, 40, 40, tw + 48, 64, 32); x.fill(); x.fillStyle = '#ffd34d'; x.fillText(badge, 64, 73);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = `800 40px ${FONT}`; const tt = `${TITLES[s.title].name}`; const ttw = x.measureText(tt).width;
  x.fillStyle = 'rgba(255,211,77,.16)'; rr(x, 540 - ttw / 2 - 28, 948, ttw + 56, 66, 33); x.fill(); x.fillStyle = '#ffd34d'; x.fillText(tt, 540, 995);
  x.fillStyle = '#f4f1ea'; x.font = `800 86px ${FONT}`; x.fillText(charName(s), 540, 1110);
  x.fillStyle = '#a9a7b8'; x.font = `600 36px ${FONT}`;
  x.fillText(`출신 ${DC.planet(s.p)?.name || '작은 행성'} · 특기 ${SKILLS[s.skill]}`, 540, 1172);
  x.fillStyle = 'rgba(255,255,255,.26)'; x.font = `500 19px ${FONT}`; x.fillText(`코드 ${encodeChar(s)}`, 540, 1250); // 보조 정보: 작고 흐리게(11-21 디테일 15번)
  x.fillStyle = '#ffd34d'; x.font = `800 40px ${FONT}`; x.fillText(`@${D.site.handle}`, 540, 1300);
  return c;
}

// 내 캐릭터 저장/읽기 + 타운에 몸·모자 맞추기(타운이 아는 모자 5개까지만)
export const myChar = () => normalizeChar(DC.store.get('char', null));
export function saveChar(s) {
  s = normalizeChar(s); DC.store.set('char', s);
  const t = DC.store.get('town', null);
  if (t && typeof t === 'object') { t.c = s.b; if (s.hat < 5) t.h = s.hat; DC.store.set('town', t); }
  return s;
}
export const charUrl = (s, page = 'plaza.html') => `${location.href.replace(/[^/]*([?#].*)?$/, '')}${page}#c=${encodeChar(s)}`;
