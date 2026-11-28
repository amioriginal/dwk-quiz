/* dwk-track.js v2 — 돈워너노우 사이트 방문 기록(2026-11-28 · 대표 「데이터 대시보드도 나만 볼 수 있게 최대한 촘촘하게 … 그 데이터 가지고 디벨롭해야하니까」)
   무엇을: 어디서 왔나(utm·앱 안 브라우저·이전 사이트) · 어느 화면·칸을 봤나 · 무엇을 눌렀나 · 얼마나 머물렀나·내렸나 · 느린 로딩·오류.
   어디로: Supabase dwk-plaza 의 public.dwk_track(text) 하나(넣기만 · 표는 공개 API 밖 stats 스키마). 설계·사전: reports/돈워너노우_사이트데이터_20261128/REPORT.md
   개인정보: 쿠키 없음 · 이름·연락처·입력한 글 없음(칸은 「채웠나·글자 수 구간」만) · IP 저장 안 함 · 기기 id = 이 브라우저가 만든 무작위 글자.
             끄기: 개인정보 안내의 「이 기기 기록 끄기」 또는 주소 뒤 ?dwk_off=1 (localStorage dwk_t_off).
   빼는 기록: 내 컴퓨터(localhost)·?dwk_test=1 = test · 대표 기기(?dwk_me=1 로 한 번 표시) = me · 자동 브라우저 = bot → 집계에서 빠진다.
   게임·화면 코드가 직접 부르는 길: window.dwkT(이름, 속성, 대표값) · dwkT.gameStart(게임) · dwkT.gameEnd(게임, {score, why, at}) · dwkT.flush()
   실패해도 화면은 그대로 — 보내기 실패는 콘솔 info 한 줄(조용한 실패 금지 IMM-8 · 재시도 안 함). */
(function () {
  'use strict';
  if (window.dwkT) return; // 두 번 불려도 한 번만(dwk-core.js 가 없는 화면에만 붙인다)
  const W = window, L = location, N = navigator, now = () => Date.now();
  const ls = {
    get(k) { try { return localStorage.getItem('dwk_t_' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('dwk_t_' + k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('dwk_t_' + k); } catch (e) { /* 저장이 막힌 브라우저 */ } },
  };
  const rnd = (n) => { const a = new Uint8Array(n); (W.crypto || W.msCrypto).getRandomValues(a); return Array.from(a, (b) => '0123456789abcdefghijklmnopqrstuvwxyz'[b % 36]).join(''); };
  const Q = new URLSearchParams(L.search);

  // ── 끄기·대표 기기 표시(주소로 한 번) ──
  if (Q.get('dwk_off') === '1') ls.set('off', '1'); else if (Q.get('dwk_off') === '0') ls.del('off');
  if (Q.get('dwk_me') === '1') ls.set('me', '1'); else if (Q.get('dwk_me') === '0') ls.del('me');
  const noop = function () {}; noop.gameStart = noop.gameEnd = noop.flush = noop;
  if (ls.get('off') === '1') { W.dwkT = noop; return; }

  const UA = N.userAgent || '';
  const host = L.hostname;
  const excl = (host === 'localhost' || host === '127.0.0.1' || host === '' || L.protocol === 'file:' || Q.get('dwk_test') === '1') ? 'test'
    : ls.get('me') === '1' ? 'me'
      : (N.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(UA)) ? 'bot' : null;

  // ── 기기 ──
  let stored = true;
  let did = ls.get('id');
  if (!did || !/^[0-9a-z]{16}$/.test(did)) { did = rnd(16); stored = ls.set('id', did); }
  const firstAt = +ls.get('first') || (ls.set('first', String(now())), now());
  const isNewDev = now() - firstAt < 1500;
  const coarse = !!(W.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sMin = Math.min(screen.width || 0, screen.height || 0);
  const dev = coarse ? (sMin >= 600 ? 'tablet' : 'phone') : 'desktop';
  const os = /iPhone|iPod/.test(UA) ? 'ios' : /iPad/.test(UA) || (/Macintosh/.test(UA) && N.maxTouchPoints > 1) ? 'ipados' : /Android/.test(UA) ? 'android' : /Mac OS X/.test(UA) ? 'mac' : /Windows/.test(UA) ? 'windows' : /CrOS/.test(UA) ? 'chromeos' : /Linux/.test(UA) ? 'linux' : 'other';
  // 앱 안 브라우저(인스타·틱톡 등은 이전 사이트 주소를 안 넘기는 일이 많아 이게 출처의 가장 큰 단서다)
  const app = /Instagram/i.test(UA) ? 'instagram' : /Barcelona/.test(UA) ? 'threads' : /FBAN|FBAV|FB_IAB/.test(UA) ? 'facebook'
    : /musical_ly|BytedanceWebview|TikTok|trill_/i.test(UA) ? 'tiktok' : /KAKAOTALK/i.test(UA) ? 'kakao' : /NAVER\(inapp|NAVER/.test(UA) ? 'naver'
      : /\bLine\//.test(UA) ? 'line' : /YouTube|com\.google\.ios\.youtube/i.test(UA) ? 'youtube' : /DaumApps/.test(UA) ? 'daum' : null;
  const br = app ? 'inapp' : /SamsungBrowser/.test(UA) ? 'samsung' : /Whale/.test(UA) ? 'whale' : /Edg\//.test(UA) ? 'edge' : /Firefox|FxiOS/.test(UA) ? 'firefox'
    : /CriOS|Chrome\//.test(UA) ? 'chrome' : /Safari\//.test(UA) ? 'safari' : 'other';

  // ── 출처(첫 방문·이번 방문) ──
  const NET = [[/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)threads\.(net|com)$/, 'threads'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)(facebook\.com|fb\.me|fb\.com)$/, 'facebook'], [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'x'], [/(^|\.)(kakao\.com|kakaocdn\.net)$/, 'kakao'],
    [/(^|\.)naver\.(com|me)$/, 'naver'], [/(^|\.)google\./, 'google'], [/(^|\.)daum\.net$/, 'daum'], [/(^|\.)bing\.com$/, 'bing'], [/(^|\.)inpock\.co\.kr$/, 'inpock'], [/(^|\.)linktr\.ee$/, 'linktree']];
  const netOf = (h) => { for (const [re, n] of NET) if (re.test(h)) return n; return null; };
  let refHost = ''; try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) { refHost = ''; }
  const internalRef = refHost && refHost === host;
  const clean = (v, n = 40) => (v == null ? null : String(v).toLowerCase().replace(/[^a-z0-9_.\-가-힣]/g, '_').slice(0, n) || null);
  const utm = { src: clean(Q.get('utm_source')), med: clean(Q.get('utm_medium')), camp: clean(Q.get('utm_campaign')), cont: clean(Q.get('utm_content')) };
  if (!utm.src && Q.get('fbclid')) utm.src = app === 'instagram' ? 'instagram' : 'facebook';
  if (!utm.src && Q.get('ttclid')) utm.src = 'tiktok';
  const touch = () => {
    const src = utm.src || (refHost && !internalRef && netOf(refHost)) || app || (refHost && !internalRef ? clean(refHost, 40) : null) || 'direct';
    const med = utm.med || (utm.src ? 'tagged' : app ? 'inapp' : refHost && !internalRef ? 'referral' : 'none');
    return { src, med, camp: utm.camp, cont: utm.cont, ref: internalRef ? null : clean(refHost, 60) };
  };
  // 공유 주소에 utm 이 따라가지 않게 지운다(남이 공유한 링크로 온 사람이 「인스타 프로필」에서 온 걸로 잡히는 오염 방지)
  try {
    let dirty = false; for (const k of [...Q.keys()]) if (/^(utm_|fbclid$|ttclid$|igshid$|dwk_me$|dwk_off$)/.test(k)) { Q.delete(k); dirty = true; }
    if (dirty && history.replaceState) history.replaceState(history.state, '', L.pathname + (Q.toString() ? '?' + Q : '') + L.hash);
  } catch (e) { /* 주소를 못 고쳐도 기록은 된다 */ }

  // ── 방문(세션): 30분 쉬면 새 방문 · utm 이 붙어 오면 새 방문 ──
  let ses = null; try { ses = JSON.parse(ls.get('ses') || 'null'); } catch (e) { ses = null; }
  const tagged = !!utm.src;
  let newSes = !ses || !ses.id || now() - (+ses.last || 0) > 30 * 60 * 1000 || (tagged && (ses.src !== utm.src || ses.camp !== utm.camp));
  const vn = (+ls.get('vn') || 0) + (newSes ? 1 : 0);
  if (newSes) { const t = touch(); ses = { id: rnd(12), last: now(), at: now(), n: 0, ...t }; ls.set('vn', String(vn)); if (!ls.get('ft')) ls.set('ft', JSON.stringify(t)); }
  ses.n = (+ses.n || 0) + 1; ses.last = now();
  const saveSes = () => { ses.last = now(); ls.set('ses', JSON.stringify(ses)); };
  saveSes();
  let first = null; try { first = JSON.parse(ls.get('ft') || 'null'); } catch (e) { first = null; }

  // ── 화면 이름 ──
  // 화면 이름: <meta name="dwk-page"> 가 있으면 그 값(배포 구조 11-28 — 루트 / 는 start.html 사본이라 meta 로 'start'),
  // 없으면 주소 끝 이름. 루트 '/' 는 입구(start) 사본이고, '/space/' 처럼 /로 끝나는 폴더 주소는 그 폴더의 index.
  const pageOf = (path) => (path === '/' ? 'start' : (path.split('/').pop().replace(/\.html?$/, '') || 'index')).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'index';
  const metaPage = (() => { const m = document.querySelector('meta[name="dwk-page"]'); const v = m && (m.content || '').toLowerCase(); return v && /^[a-z0-9_-]{1,24}$/.test(v) ? v : null; })();
  const page = metaPage || pageOf(L.pathname);
  const pv = rnd(10);
  const t0 = (W.performance && performance.timeOrigin) ? performance.timeOrigin : now();

  // ── 보내기: 모아서 한 번에(최대 40개) · 숨겨질 때는 sendBeacon(미리 묻기 없는 text/plain) ──
  const q = []; let timer = 0; let sentN = 0; const CAP = 400; // 한 화면에서 400개 넘게는 안 보낸다(고장 난 반복문이 서버를 두드리지 않게)
  const endpoint = () => { const B = (W.DWK && W.DWK.world && W.DWK.world.backend) || {}; return B.url && B.anonKey ? `${B.url}/rest/v1/rpc/dwk_track?apikey=${encodeURIComponent(B.anonKey)}` : null; };
  const flush = (beacon) => {
    clearTimeout(timer); timer = 0;
    const url = endpoint(); if (!url || !q.length) return;
    while (q.length) {
      const part = q.splice(0, 40); const tn = now();
      const body = JSON.stringify({ d: did, s: ses.id, pg: page, x: excl || undefined, e: part.map((e) => ({ n: e.n, l: e.l, v: pv, a: Math.max(0, tn - e.t), p: e.p })) });
      let ok = false;
      if (beacon && N.sendBeacon) { try { ok = N.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' })); } catch (e) { ok = false; } }
      if (!ok) {
        try { fetch(url, { method: 'POST', body, keepalive: body.length < 60000, headers: { 'content-type': 'text/plain;charset=UTF-8' } }).then((r) => r.ok ? r.json() : { ok: false, why: r.status }).then((r) => { if (!r || !r.ok) console.info('방문 기록 안 들어감:', r && r.why); }, (e) => console.info('방문 기록 못 보냄:', e && e.name)); }
        catch (e) { console.info('방문 기록 못 보냄:', e && e.name); }
      }
    }
  };
  const T = (n, p, l) => {
    if (sentN >= CAP || typeof n !== 'string') return;
    sentN++;
    const o = {}; if (p && typeof p === 'object') for (const [k, v] of Object.entries(p)) { if (v == null) continue; o[k] = typeof v === 'number' ? (isFinite(v) ? Math.round(v * 100) / 100 : null) : typeof v === 'boolean' ? (v ? 1 : 0) : String(v).slice(0, 120); }
    q.push({ n, l: l == null ? undefined : String(l).slice(0, 80), p: o, t: now() });
    saveSes();
    if (q.length >= 15) flush(false); else if (!timer) timer = setTimeout(() => flush(false), 4000);
  };
  W.dwkT = T; T.flush = () => flush(true);

  // ── 1) 화면 열림 ──
  const navType = (() => { try { return performance.getEntriesByType('navigation')[0].type; } catch (e) { return null; } })();
  const hashName = () => (L.hash.slice(1).split(/[/?&]/)[0] || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || null;
  const conn = N.connection || {};
  T('page_view', {
    ...ses.src ? { src: ses.src, med: ses.med, camp: ses.camp, cont: ses.cont, ref: ses.ref } : {},
    f_src: first && first.src, f_med: first && first.med, // 첫 방문 출처(그 기기가 처음 어디서 왔나)
    app, br, dev, os, vw: innerWidth, vh: innerHeight, sw: screen.width, sh: screen.height, dpr: W.devicePixelRatio,
    lang: (N.language || '').slice(0, 8), vn, sn: ses.n, age_d: Math.floor((now() - firstAt) / 864e5), new: isNewDev, nostore: !stored,
    sesnew: newSes, from: internalRef ? (() => { try { return pageOf(new URL(document.referrer).pathname); } catch (e) { return null; } })() : null,
    h: hashName(), nav: navType, net: conn.effectiveType, save: conn.saveData, pwa: !!(W.matchMedia && matchMedia('(display-mode: standalone)').matches),
  }, ses.src);
  addEventListener('hashchange', () => T('screen', { h: hashName() }, hashName() || 'top'));

  // ── 2) 머문 시간·내린 깊이·처음 누른 시각(빨리 나간 사람 = 처음 누르기 전에 나감) ──
  let vis = 0, visAt = document.visibilityState === 'visible' ? now() : 0, maxSc = 0, acts = 0, clicks = 0, firstAct = null;
  const scDepth = () => { const de = document.documentElement; const h = Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0); return h <= innerHeight + 4 ? 100 : Math.min(100, Math.round((scrollY + innerHeight) / h * 100)); };
  let scT = 0; addEventListener('scroll', () => { if (scT) return; scT = setTimeout(() => { scT = 0; maxSc = Math.max(maxSc, scDepth()); }, 250); }, { passive: true });
  const act = () => { acts++; if (firstAct == null) firstAct = Math.round(now() - t0); };
  addEventListener('pointerdown', act, { passive: true, capture: true }); addEventListener('keydown', act, { passive: true, capture: true });

  // ── 3) 칸이 화면에 보였나(첫 화면 세 갈래 중 어디까지 봤나) ──
  const zoneOf = (el) => {
    const z = el && el.closest && el.closest('[data-tz],section[id],section[class*="p-"],nav[id],ul[id],ol[id],header,footer,dialog,form[id],aside[id]');
    if (!z) return 'body';
    return (z.dataset.tz || z.id || ([...z.classList].find((c) => /^p-/.test(c))) || z.tagName.toLowerCase()).slice(0, 24);
  };
  const seen = new Set();
  const watch = () => {
    if (!('IntersectionObserver' in W)) return;
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { const z = zoneOf(e.target); if (!seen.has(z)) { seen.add(z); T('see', { z, ms: Math.round(now() - t0) }, z); } io.unobserve(e.target); } }, { threshold: 0.5 });
    document.querySelectorAll('[data-tz],section[id],section[class*="p-"]').forEach((el) => io.observe(el));
  };

  // ── 4) 누른 것 — 링크·버튼 전부(밖으로 나가는 링크는 out) · 같은 곳 연타 = rage(막혔거나 헷갈림) ──
  // 남이 쓴 글(라운지 이름·신청한 행성 이름·게시판)이 누른 것 이름으로 새지 않게: 그런 칸 안에서는 글자 대신 class 이름만
  const UGC = '[data-ugc],.dch-sheet,.dch-list,#applyQueue,#applyBoard,#applyMine,.board-list,.queue';
  const label = (el) => {
    const fixed = el.getAttribute('data-t') || el.id || null;
    if (fixed) return fixed.slice(0, 40);
    if (el.closest(UGC)) return ((el.classList && el.classList[0]) || el.tagName.toLowerCase()).slice(0, 40);
    // 카드처럼 안에 글이 여러 줄인 링크는 통째로 붙지 않게: 자기 글자 → 없으면 숫자 아닌 첫 자식 글자(제목)
    const tidy = (t) => (t || '').replace(/\s+/g, ' ').replace(/\d{3,}/g, '#').trim();
    let txt = tidy([...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' '));
    if (!txt) for (const c of el.querySelectorAll('*')) { if (c.children.length) continue; const t = tidy(c.textContent); if (t && !/^[\d#.\s]+$/.test(t)) { txt = t; break; } } // 글자만 든 가장 안쪽 칸 중 첫 번째(카드 제목)
    return (el.getAttribute('aria-label') || txt.slice(0, 30) || tidy(el.textContent).slice(0, 30) || el.tagName.toLowerCase()).slice(0, 40);
  };
  let last = { x: 0, y: 0, t: 0, n: 0 };
  document.addEventListener('click', (ev) => {
    clicks++;
    const d = ev.timeStamp - last.t, near = Math.abs(ev.clientX - last.x) < 30 && Math.abs(ev.clientY - last.y) < 30;
    last = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp, n: d < 700 && near ? last.n + 1 : 1 };
    const el = ev.target && ev.target.closest && ev.target.closest('a[href],button,[role="button"],summary,input[type="submit"],input[type="checkbox"],input[type="radio"],select,[data-t]');
    if (last.n === 3) T('rage', { z: zoneOf(ev.target), name: el ? label(el) : (ev.target.tagName || '').toLowerCase() }, zoneOf(ev.target));
    if (!el) return;
    const z = zoneOf(el), name = label(el);
    if (el.tagName === 'A') {
      let u = null; try { u = new URL(el.href); } catch (e) { u = null; } // el.href = <base href> 까지 반영해 브라우저가 푼 주소(루트 사본은 base=/space/)
      if (u && /^https?:$/.test(u.protocol) && u.hostname !== host) { const net = netOf(u.hostname) || clean(u.hostname, 40); T('out', { z, name, net, to: u.hostname.slice(0, 60) }, net); flush(true); return; }
      const to = u ? (pageOf(u.pathname) + (u.hash ? u.hash.split(/[/?&]/)[0] : '')).slice(0, 40) : null;
      T('click', { z, name, to }, `${z}|${name}`);
      if (u && u.pathname !== L.pathname) flush(true); // 다른 화면으로 넘어가기 전에 보낸다
      return;
    }
    T('click', { z, name }, `${z}|${name}`);
  }, true);

  // ── 5) 행성 신청 칸(입력 내용은 안 보낸다 — 칸 이름·채웠나·글자 수 구간만) ──
  const form = () => document.getElementById('submitForm');
  const touched = new Set();
  document.addEventListener('focusin', (ev) => { const f = form(); const i = ev.target; if (!f || !f.contains(i) || !i.name || touched.has(i.name)) return; touched.add(i.name); T('apply_field', { f: i.name, a: 'focus' }, `${i.name}|focus`); }, true);
  document.addEventListener('focusout', (ev) => {
    const f = form(); const i = ev.target; if (!f || !f.contains(i) || !i.name || i.type === 'checkbox') return;
    const n = (i.value || '').trim().length; if (!n) return;
    const key = i.name + '|fill'; if (touched.has(key)) return; touched.add(key);
    T('apply_field', { f: i.name, a: 'fill', len: n <= 5 ? '1-5' : n <= 15 ? '6-15' : n <= 40 ? '16-40' : '41+' }, key);
  }, true);
  document.addEventListener('change', (ev) => { const f = form(); const i = ev.target; if (f && f.contains(i) && i.type === 'checkbox') T('apply_field', { f: i.name, a: i.checked ? 'check' : 'uncheck' }, `${i.name}|${i.checked ? 'check' : 'uncheck'}`); }, true);

  // ── 6) 고장 감지: JS 오류 · 그림·스크립트 못 불러옴(화면 하나에 8개까지) ──
  let errN = 0; const errSeen = new Set();
  const fileOf = (u) => { try { const x = new URL(u, L.href); return x.hostname === host ? x.pathname.split('/').pop().slice(0, 60) : x.hostname.slice(0, 60); } catch (e) { return null; } };
  const scrub = (s) => String(s || '').replace(/https?:\/\/[^\s)]+/g, (m) => fileOf(m) || 'url').replace(/\d{4,}/g, '#').replace(/\s+/g, ' ').slice(0, 160);
  addEventListener('error', (ev) => {
    if (errN >= 8) return;
    const tg = ev.target;
    if (tg && tg !== W && tg.tagName) { const src = fileOf(tg.currentSrc || tg.src || tg.href || ''); const k = 'r' + src; if (errSeen.has(k)) return; errSeen.add(k); errN++; T('res_err', { tag: tg.tagName.toLowerCase(), src }, tg.tagName.toLowerCase()); return; }
    const msg = scrub(ev.message); const k = 'j' + msg; if (errSeen.has(k)) return; errSeen.add(k); errN++;
    T('js_err', { msg, file: fileOf(ev.filename || ''), line: ev.lineno, col: ev.colno, stack: scrub(ev.error && ev.error.stack ? String(ev.error.stack).split('\n').slice(0, 3).join(' | ') : '') }, msg.slice(0, 80));
  }, true);
  addEventListener('unhandledrejection', (ev) => {
    if (errN >= 8) return; const r = ev.reason; const msg = scrub(r && (r.message || r.name) ? `${r.name || 'Error'}: ${r.message || ''}` : String(r));
    const k = 'p' + msg; if (errSeen.has(k)) return; errSeen.add(k); errN++;
    T('js_err', { msg, kind: 'promise', stack: scrub(r && r.stack ? String(r.stack).split('\n').slice(0, 3).join(' | ') : '') }, msg.slice(0, 80));
  });

  // ── 7) 속도(처음 숨겨질 때 한 번): 서버 응답·첫 글자·가장 큰 그림·다 뜬 시각·화면 밀림·가장 느린 반응 ──
  const perf = { lcp: 0, cls: 0, inp: 0, fcp: 0 };
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) perf.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') perf.fcp = Math.round(e.startTime); }).observe({ type: 'paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) perf.inp = Math.max(perf.inp, Math.round(e.duration)); }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (e) { /* 이 브라우저는 측정 일부를 못 한다 — 있는 값만 보낸다 */ }
  let perfSent = false;
  const sendPerf = () => {
    if (perfSent) return; perfSent = true;
    let nv = null; try { nv = performance.getEntriesByType('navigation')[0]; } catch (e) { nv = null; }
    let bytes = 0, resN = 0; try { for (const r of performance.getEntriesByType('resource')) { resN++; bytes += r.transferSize || 0; } } catch (e) { /* 없음 */ }
    const p = { ttfb: nv ? Math.round(nv.responseStart) : null, fcp: perf.fcp || null, lcp: perf.lcp || null, dcl: nv ? Math.round(nv.domContentLoadedEventEnd) : null, load: nv && nv.loadEventEnd ? Math.round(nv.loadEventEnd) : null,
      cls: Math.round(perf.cls * 1000) / 1000, inp: perf.inp || null, kb: Math.round(((nv && nv.transferSize) || 0) / 1024 + bytes / 1024), res: resN, dev, net: conn.effectiveType };
    T('perf', p, (p.lcp && p.lcp > 4000) || (p.load && p.load > 8000) ? 'slow' : 'ok');
  };

  // ── 8) 화면을 떠날 때(숨겨질 때마다 · 누적값이라 집계는 화면 열림 id별 최댓값) ──
  const leave = () => {
    if (visAt) { vis += now() - visAt; visAt = 0; }
    maxSc = Math.max(maxSc, scDepth());
    sendPerf();
    T('page_leave', { vis: Math.round(vis), sc: maxSc, acts, clicks, fi: firstAct, see: seen.size, h: hashName() }, page);
    flush(true);
  };
  // 화면을 넘길 때 크롬은 pagehide → visibilitychange(hidden) 순으로 둘 다 부른다 — 보이던 시간이 있을 때만 보내 한 번만 나가게(11-28 시험에서 2번 나감)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { if (visAt) leave(); } else visAt = now(); });
  addEventListener('pagehide', () => { if (visAt || !perfSent) leave(); });

  // ── 9) 게임이 직접 부르는 길(총괄이 게임 작업 뒤 넣는다 — 자리 목록: REPORT.md 「게임 안 이벤트 넣을 자리」) ──
  const runs = {};
  T.gameStart = (g, p = {}) => { const r = runs[g] = { n: ((runs[g] && runs[g].n) || 0) + 1, t: now() }; T('game_start', { g, round: r.n, ...p }, g); };
  T.gameEnd = (g, p = {}) => { const r = runs[g] || { n: 0, t: now() }; T('game_end', { g, round: r.n, dur: now() - r.t, ...p }, g); flush(false); };

  // ── 10) 「이 기기 기록 끄기」 단추([data-dwk-off]) — 누른 뒤로는 아무것도 안 보낸다 ──
  document.addEventListener('click', (ev) => {
    const b = ev.target && ev.target.closest && ev.target.closest('[data-dwk-off]'); if (!b) return;
    T('track_off', {}, page); flush(true); ls.set('off', '1'); sentN = CAP; b.textContent = '이 기기 기록을 껐어'; b.disabled = true;
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();
