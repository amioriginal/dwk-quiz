'use strict';
// 활동 기록 — 화면에 아무것도 띄우지 않고, 누가 했는지 모르게 「무슨 일이 있었는지」만 남긴다.
// 남기지 않는 것: 이름·인스타 아이디·쓴 글 내용·IP·쿠키·기기 고유값·정확한 유입 주소.
// 한 방문을 잇는 번호(sid)는 그 탭이 열려 있는 동안만 쓰고(sessionStorage) 버린다.
// 「다시 온 사람」은 고정 번호 없이, 이 기기에 둔 첫 방문 날짜·방문 횟수만 숫자로 보낸다.
// 보낼 곳·공개 키는 HTML <meta name="dwk-ingest">·<meta name="dwk-key">에서 읽는다(CSP connect-src와 같은 주소여야 한다).
(() => {
  const V = 't1';
  const meta = n => { const m = document.querySelector(`meta[name="${n}"]`); return m ? m.content : ''; };
  const URL_ = meta('dwk-ingest'), KEY = meta('dwk-key'), PAGE = meta('dwk-page');
  const noop = () => {};
  const T = { ev: noop, screen: noop, flush: noop, vis: () => 0, ctx: {} };
  window.T = T;
  // 주소·키가 비었거나 배포 전 자리표시(__…__)면 아무것도 보내지 않는다
  const okUrl = /^https:\/\/[a-z]{20}\.supabase\.co\/rest\/v1\/site_events$/.test(URL_) ||
    (location.hostname === '127.0.0.1' && /^http:\/\/127\.0\.0\.1:\d+\/rest\/v1\/site_events$/.test(URL_)); // 로컬 시험은 로컬 화면에서만
  if (!okUrl || !KEY || KEY.startsWith('__') || !/^(quiz|story|go|pul)$/.test(PAGE)) return;

  const ss = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* 저장이 막혀도 기록만 조금 덜 정확해진다 */ } };
  const ls = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 위와 같다 */ } };
  const rand = () => { const a = new Uint8Array(8); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };

  const qs = new URLSearchParams(location.search);
  // 기록 거부: 주소에 ?notrack=1 을 붙여 한 번 열면 이 기기에서는 더 이상 보내지 않는다(안내 페이지에 적힌 방법)
  if (qs.get('notrack') === '1') lsSet('dwk_nt', '1');
  if (ls('dwk_nt') === '1') return;
  // 시험 표시: 주소에 ?t=test 가 붙었거나 자동 브라우저면 test=true 로 남겨 대시보드에서 뺀다
  if (qs.get('t') === 'test') ssSet('dwk_test', '1');
  const TEST = ss('dwk_test') === '1' || navigator.webdriver === true;

  let sid = ss('dwk_sid'); if (!sid || !/^[0-9a-f]{16}$/.test(sid)) { sid = rand(); ssSet('dwk_sid', sid); }
  let seq = Number(ss('dwk_seq_' + PAGE) || 0);

  // 보이는 시간만 센다(탭을 내려 둔 시간은 뺀다)
  let visMs = 0, visFrom = document.visibilityState === 'visible' ? performance.now() : null, hiddenAt = null;
  const vis = () => Math.round(visMs + (visFrom != null ? performance.now() - visFrom : 0));

  // 화면(시작·문제·결과·사연·팔로우 창)별 머문 시간과 스크롤 깊이
  let scr = PAGE === 'story' ? 'story' : 'start', scrFrom = 0, scrollMax = 0;
  const scrollPct = () => { const h = document.documentElement.scrollHeight - innerHeight; return h <= 0 ? 100 : Math.min(100, Math.round(scrollY / h * 100)); };
  addEventListener('scroll', () => { const p = scrollPct(); if (p > scrollMax) scrollMax = p; }, { passive: true });

  const q = []; let sent = 0, timer = null;
  const CAP = 300; // 한 방문에 보낼 사건 상한(폭주 막기)
  const clip = (s, n) => (s == null ? null : String(s).slice(0, n));
  // 글자 수는 정확한 값 대신 구간만(0 · 1~10 · 11~30 · 31+) — 댓글·DM 글자 수와 맞춰 보는 식의 재식별을 막는다
  const bk = n => (!Number.isFinite(n) ? null : n <= 0 ? 0 : n <= 10 ? 1 : n <= 30 ? 2 : 3);
  const int = (x, lo, hi) => (Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : null);

  function ev(name, p = {}) {
    if (sent + q.length >= CAP || !/^[a-z_]{2,20}$/.test(name)) return;
    if (name === 'input' || name === 'copy') p = { ...p, num: bk(p.num), num2: bk(p.num2), ms: bk(p.ms) };
    q.push({
      sid, seq: seq++, page: PAGE, ev: name, t_ms: int(vis(), 0, 86400000), screen: p.screen || scr,
      ep: clip(p.ep !== undefined ? p.ep : T.ctx.ep, 20), qi: int(p.qi !== undefined ? p.qi : T.ctx.qi, 0, 50), qk: clip(p.qk, 24), ok: typeof p.ok === 'boolean' ? p.ok : null,
      num: int(p.num, -1, 86400000), num2: int(p.num2, -1, 86400000), ms: int(p.ms, 0, 86400000),
      el: clip(p.el, 40), scroll: int(p.scroll, 0, 100),
      ref: p.ref || null, app: p.app || null, os: p.os || null, dev: p.dev || null, src: p.src || null,
      vw: int(p.vw, 0, 10000), lang: clip(p.lang, 12),
      visit_n: int(p.visit_n, 0, 100000), days_first: int(p.days_first, 0, 100000),
      test: TEST, v: V,
    });
    ssSet('dwk_seq_' + PAGE, String(Math.min(seq, 99999)));
    if (q.length >= 10) flush(); else if (!timer) timer = setTimeout(flush, 5000);
  }

  function flush(leaving) {
    clearTimeout(timer); timer = null;
    if (!q.length) return;
    const batch = q.splice(0, q.length); sent += batch.length;
    try {
      fetch(URL_, {
        method: 'POST', keepalive: !!leaving, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY, Prefer: 'return=minimal' },
        body: JSON.stringify(batch),
      }).catch(noop); // 기록 실패는 화면에 아무 영향을 주지 않는다(퀴즈가 먼저다)
    } catch { /* keepalive 크기 초과 등 — 위와 같다 */ }
  }

  function screen(next, extra = {}) {
    if (next === scr) return;
    const now = vis();
    ev('screen', { screen: next, el: scr, ms: now - scrFrom, scroll: scrollMax, ...extra });
    scr = next; scrFrom = now; scrollMax = 0;
    flush();
  }

  // ── 들어온 경로·기기 (알아볼 수 없는 굵은 분류만) ──
  const ua = navigator.userAgent;
  const app = /Instagram/i.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'facebook' : /KAKAOTALK/i.test(ua) ? 'kakao'
    : /NAVER\(inapp|NAVER/i.test(ua) ? 'naver' : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? 'tiktok' : /Line\//i.test(ua) ? 'line' : 'browser';
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : /Mac OS X/i.test(ua) ? 'mac' : /Windows/i.test(ua) ? 'windows' : 'other';
  const dev = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  let ref = 'none';
  try {
    const h = document.referrer ? new URL(document.referrer).hostname : '';
    ref = !h ? 'none' : /inpock/.test(h) ? 'inpock' : /instagram\.com$/.test(h) ? 'instagram' : /facebook\.com$/.test(h) ? 'facebook'
      : /youtube\.com$|youtu\.be$/.test(h) ? 'youtube' : /tiktok\.com$/.test(h) ? 'tiktok' : h === location.hostname ? 'self' : /google\./.test(h) ? 'google'
      : /naver\.com$/.test(h) ? 'naver' : 'other';
  } catch { ref = 'other'; }
  const SRC_OK = /^(inpock|ig|igstory|igbio|yt|tt|fb|blog\d{0,2}|cm\d{0,2}|qr|test)$/; // 링크 꼬리표 ?from= 은 허용 목록만
  const src = SRC_OK.test(qs.get('from') || '') ? qs.get('from') : null;
  // 다시 온 사람: 첫 방문 날짜·방문 횟수만 이 기기에 둔다(번호 없음)
  const today = new Date().toISOString().slice(0, 10);
  let first = ls('dwk_first'); if (!/^\d{4}-\d{2}-\d{2}$/.test(first || '')) { first = today; lsSet('dwk_first', today); }
  let visitN = Number(ls('dwk_visits') || 0);
  if (!ss('dwk_counted')) { visitN += 1; lsSet('dwk_visits', String(visitN)); ssSet('dwk_counted', '1'); }
  const daysFirst = Math.round((Date.parse(today) - Date.parse(first)) / 86400000);

  // 화면 폭은 50px 단위로 뭉갠다(정확한 값·높이는 안 보낸다). 첫 방문 뒤 지난 날도 구간만(0 · 1~6 · 7~29 · 30+)
  const dfB = daysFirst <= 0 ? 0 : daysFirst < 7 ? 1 : daysFirst < 30 ? 2 : 3;
  ev('view', { ref, app, os, dev, src, vw: Math.round(innerWidth / 50) * 50, lang: (navigator.language || '').slice(0, 12), visit_n: Math.min(visitN, 50), days_first: dfB });

  // ── 누른 것 전부: 버튼·링크마다 data-t 이름(없으면 id) ──
  document.addEventListener('click', e => {
    const b = e.target.closest('button,a'); if (!b || b.classList.contains('opt')) return; // 보기 선택은 answer 사건으로 따로 남긴다
    let el = b.dataset.t || b.id || '';
    if (!el && b.tagName === 'A') { try { const h = new URL(b.href).hostname; el = 'link:' + (h === location.hostname ? 'self' : /instagram|ig\.me/.test(h) ? 'instagram' : /inpock/.test(h) ? 'inpock' : 'other'); } catch { el = 'link:other'; } }
    ev('click', { el: el || 'button' });
  }, true);

  // ── 입력 칸: 썼는지와 글자 수만(내용은 보내지 않는다) ──
  document.addEventListener('change', e => { const f = e.target; if (f.matches && f.matches('input,textarea')) ev('input', { el: f.id || f.name || 'field', num: f.value.length }); }, true);

  // ── 나감·돌아옴 ──
  let left = false; // 한 번 나갈 때 hide는 한 줄만(pagehide와 visibilitychange가 둘 다 와도)
  const leave = () => {
    if (left) return; left = true;
    if (visFrom != null) { visMs += performance.now() - visFrom; visFrom = null; }
    hiddenAt = performance.now();
    ev('hide', { ms: vis(), scroll: scrollMax, num: vis() - scrFrom });
    flush(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') leave();
    else { left = false; visFrom = performance.now(); ev('back', { num2: hiddenAt ? Math.round((performance.now() - hiddenAt) / 1000) : null }); hiddenAt = null; }
  });
  addEventListener('pagehide', leave);

  // 우리 코드의 오류 개수(내용 없이 종류만)
  addEventListener('error', e => ev('jserr', { el: clip(((e.filename || '').split('/').pop() || 'x') + ':' + (e.lineno || 0), 40) }));

  T.ev = ev; T.screen = screen; T.flush = flush; T.vis = vis;
})();
