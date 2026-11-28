/* dwk-core.js — 돈워너노우 게임 공통 부품 (소유: 본 세션 · 게임 파일은 읽기만)
   의존: data.js (window.DWK) 를 먼저 불러야 한다.
   제공: window.DC = { store, toast, sfx, buzz, shake, planets, planet, scene, rewards, redeem, endings,
                        shareCanvas, followCta, stars, fonts, el, seed, rng }
   원칙: 서버 없음 · 개인정보 없음 · 저장은 이 기기 localStorage(dwk_ 접두) · 실패해도 화면은 동작 */
(() => {
  'use strict';
  const D = window.DWK;
  if (!D) { console.error('dwk-core: data.js 를 먼저 불러야 합니다'); return; }

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
    return n;
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); return true; } catch { return false; } },
  };

  // ── 알림 ──
  function toast(msg) {
    let t = document.getElementById('dc-toast');
    if (!t) { t = el('div', { id: 'dc-toast', class: 'dc-toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1900);
  }

  // ── 효과음 (WebAudio 합성 · 파일 없음 · 소리 끄기 저장) ──
  let actx = null; let muted = store.get('muted', false);
  const tone = (f, t0, dur, type = 'sine', vol = 0.12, slide = 0) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const SFX = {
    tap: (t) => tone(660, t, 0.06, 'triangle', 0.08),
    swipe: (t) => tone(420, t, 0.12, 'sine', 0.07, 260),
    good: (t) => { tone(523, t, 0.1, 'triangle'); tone(784, t + 0.08, 0.14, 'triangle'); },
    bad: (t) => tone(220, t, 0.22, 'sawtooth', 0.06, -90),
    die: (t) => { tone(196, t, 0.35, 'sawtooth', 0.08, -120); tone(98, t + 0.2, 0.5, 'square', 0.05, -40); },
    win: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.18, 'triangle', 0.1)),
    unlock: (t) => [784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.07, 0.16, 'sine', 0.1)),
    tick: (t) => tone(1200, t, 0.03, 'square', 0.03),
    land: (t) => { tone(140, t, 0.15, 'sine', 0.15, -60); tone(880, t + 0.05, 0.08, 'triangle', 0.05); },
  };
  function sfx(name) {
    if (muted) return;
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); (SFX[name] || SFX.tap)(actx.currentTime); } catch { /* 소리 없이 진행 */ }
  }
  sfx.toggle = () => { muted = !muted; store.set('muted', muted); return !muted; };
  sfx.on = () => !muted;

  const buzz = (ms = 20) => { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate?.(ms); } catch { /* 진동 미지원 */ } };
  function shake(node, power = 1) {
    if (!node || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    node.animate([
      { transform: 'translate(0,0)' }, { transform: `translate(${-6 * power}px,${2 * power}px)` },
      { transform: `translate(${5 * power}px,${-3 * power}px)` }, { transform: `translate(${-3 * power}px,${2 * power}px)` },
      { transform: 'translate(0,0)' }], { duration: 260, easing: 'ease-out' });
  }

  // ── 행성: 출시된 편의 행성만 (새 영상 = data.js 한 줄 추가 = 모든 게임에 자동으로 열림) ──
  const SCENES = new Set(['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3']); // img/scene/<id>a|b.jpg 가 있는 행성
  function planets() {
    return D.episodes.flatMap(e => e.planets.map(p => ({ ...p, ep: e.no, epTitle: e.title, mood: e.mood, links: e.links, hasScene: SCENES.has(p.id) })));
  }
  const planet = (id) => planets().find(p => p.id === id) || null;
  const scene = (id, which = 'a') => SCENES.has(id) ? `img/scene/${id}${which}.jpg` : (planet(id)?.img || '');

  // ── 해금: 코드·엔딩으로 얻는 보상 ──
  const rewards = {
    list() { return store.get('rewards', []); },
    has(id) { return rewards.list().some(r => r.id === id); },
    add(id, label, from = '') {
      if (rewards.has(id)) return false;
      const l = rewards.list(); l.push({ id, label, from, at: new Date().toISOString().slice(0, 10) }); store.set('rewards', l);
      sfx('unlock'); buzz([20, 40, 20]); toast(`${label} 열렸어!`); return true;
    },
  };
  // 영상·캐러셀 속 코드. 대소문자·공백 무시. (코드 목록은 data.js 의 codes)
  function redeem(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
    if (!code) return { ok: false, msg: '코드를 입력해 줘' };
    const used = store.get('codes', []);
    const hit = (D.codes || []).find(c => c.code.toUpperCase() === code);
    if (!hit) { sfx('bad'); return { ok: false, msg: '그런 코드는 없어. 영상 끝을 다시 봐 봐' }; }
    if (used.includes(code)) return { ok: false, msg: '이미 쓴 코드야' };
    used.push(code); store.set('codes', used);
    (hit.rewards || []).forEach(r => rewards.add(r.id, r.label, `코드 ${code}`));
    return { ok: true, msg: `${hit.label} 열림`, hit };
  }

  // ── 엔딩·기록 ──
  const endings = {
    all() { return store.get('endings', {}); },                         // { game: { endingId: {name, at, best} } }
    got(game) { return Object.keys(endings.all()[game] || {}); },
    add(game, id, name) {
      const a = endings.all(); a[game] = a[game] || {};
      const fresh = !a[game][id]; a[game][id] = { name, at: new Date().toISOString().slice(0, 10) };
      store.set('endings', a); return fresh;
    },
    total() { return Object.values(endings.all()).reduce((n, g) => n + Object.keys(g).length, 0); },
  };

  // ── 결과 카드 공유 (Web Share API → 실패 시 저장) ──
  async function shareCanvas(canvas, filename, text) {
    const blob = await new Promise(ok => canvas.toBlob(ok, 'image/png'));
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    const a = el('a', { href: URL.createObjectURL(blob), download: filename }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
    toast('이미지를 저장했어'); return 'saved';
  }

  // ── 팔로우 안내 (강요 문구 없음 · 프로필로 가는 버튼만) ──
  function followCta() {
    return el('div', { class: 'dc-follow' },
      el('p', {}, '새 행성은 ', el('b', {}, '새 영상이 올라올 때'), ' 열려.'),
      el('a', { class: 'btn', href: D.site.links.instagram, target: '_blank', rel: 'noopener' }, `@${D.site.handle} 보러 가기 ↗`));
  }

  // ── 별 배경 ──
  function stars(canvas, n = 140) {
    if (!canvas) return; const x = canvas.getContext('2d');
    const fit = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; x.fillStyle = '#fff';
      for (let i = 0; i < n; i++) { x.globalAlpha = Math.random() * .6 + .1; x.beginPath(); x.arc(Math.random() * canvas.width, Math.random() * canvas.height, (Math.random() * 1.4 + .3) * devicePixelRatio, 0, 6.28); x.fill(); } };
    addEventListener('resize', fit); fit();
  }
  const fonts = () => Promise.all([document.fonts.load('800 40px Pretendard Variable'), document.fonts.load('500 40px Pretendard Variable')]).catch(() => {});

  // ── 날짜 시드 (오늘의 행성 · 모두 같은 문제) ──
  const seed = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (s) => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // 공통 스타일(토스트·팔로우 안내) — 게임마다 style.css 를 쓰고 이것만 덧붙인다
  const css = `.dc-toast{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translate(-50%,16px);background:#fff;color:#111;padding:10px 16px;border-radius:99px;font-size:14px;opacity:0;transition:.25s;pointer-events:none;z-index:50;white-space:nowrap}
.dc-toast.on{opacity:1;transform:translate(-50%,0)}
.dc-follow{margin:14px 0;padding:12px 14px;border:1px dashed rgba(255,255,255,.18);border-radius:12px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.dc-follow p{margin:0;color:#a9a7b8;font-size:14px}.dc-follow b{color:#f4f1ea}.dc-follow .btn{flex:0 0 auto;padding:8px 12px;font-size:13px}`;
  document.head.append(el('style', {}, css));

  window.DC = { el, store, toast, sfx, buzz, shake, planets, planet, scene, rewards, redeem, endings, shareCanvas, followCta, stars, fonts, seed, rng, today };
})();
