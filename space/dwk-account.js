/* dwk-account.js v1 — 「내 기록 지키기」(2026-11-28 · 대표 「선택 연동으로 만들어 / 카카오,네이버 로그인도 연동시킬 수 있나?」)
   무엇: 로그인은 강제하지 않는다. 원하는 사람만 구글·카카오(·네이버)로 이어 두면, 이 기기의 사이트 기록(localStorage dwk_*)을
         서버 보관함(public.account_vault · 본인만 · 32KB)에 맡기고, 다른 기기에서 같은 계정으로 들어오면 그대로 이어진다.
   켜는 법: data.js world.providers 에 'google' · 'kakao' · 'custom:naver' 를 넣는다(Supabase 에 열쇠를 넣은 것만).
            비어 있으면 화면에 아무것도 안 보인다 — 열쇠 없이 버튼만 보이는 「거짓 버튼」 금지.
   붙이는 법: 링크 자리에 <a href="#" data-dwk-account hidden>내 기록 지키기</a> + 이 스크립트(data.js 다음).
   보안: PKCE 방식(돌아오는 주소에 열쇠 대신 일회용 코드) · 돌아올 주소는 Supabase 허용 목록(dontwannaknow.kr)만 ·
         익명 계정은 보관함을 못 씀(서버 정책) · 운영자 열쇠·방문 기록 번호·로그인 토큰은 보관함에 안 넣는다.
   근거·시험: reports/돈워너노우_사이트보안_20261128/REPORT.md 「8. 내 기록 지키기」 */
(function () {
  'use strict';
  const D = window.DWK || {}; const W = D.world || {}; const cfg = W.backend || {};
  const LABEL = {
    google: { name: '구글', bg: '#fff', fg: '#1f1f1f', mark: 'G', markColor: '#4285f4', iabBlocked: true },
    kakao: { name: '카카오', bg: '#fee500', fg: '#191600', mark: '●', markColor: '#191600' },
    'custom:naver': { name: '네이버', bg: '#03c75a', fg: '#fff', mark: 'N', markColor: '#fff' },
  };
  const PROV = (W.providers || []).filter((p) => LABEL[p]);
  if (!PROV.length || cfg.type !== 'supabase' || !cfg.url || !cfg.anonKey) return; // 꺼짐 — 아무것도 안 보인다
  const REF = (cfg.url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';
  const SKEY = 'sb-' + REF + '-auth-token';
  const SB_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm'; // dwk-net.js 와 같은 판(브라우저 캐시 공유)
  const SKIP = /^(dwk_t_|dwk_acct_|dwk_staff_key$|dwk_account$)/; // 방문 기록 번호·이 파일 자체 표시·운영자 열쇠·이 기기 시험 계정은 맡기지 않는다
  const MAX_BYTES = 30000;
  const IAB = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp|; wv\)/i.test(navigator.userAgent || '');
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  const track = (n, p) => { try { window.dwkT && window.dwkT(n, p); } catch (e) { /* 기록 실패는 화면과 무관 */ } };

  // ── 저장된 로그인 상태(라이브러리를 안 불러도 읽을 수 있게) ──
  function saved() {
    try { const s = JSON.parse(ls.get(SKEY) || 'null'); const u = s && (s.user || (s.currentSession && s.currentSession.user)); return u ? { anon: !!u.is_anonymous, prov: (u.app_metadata && u.app_metadata.providers) || [] } : null; } catch (e) { return null; }
  }
  const linkedProv = () => { const s = saved(); if (!s || s.anon) return null; const p = s.prov.find((x) => LABEL[x] || LABEL['custom:' + x]); return p ? (LABEL[p] || LABEL['custom:' + p]).name : '계정'; };

  // ── Supabase(필요할 때만 불러온다 — 입구를 느리게 하지 않게) ──
  let sbP = null;
  function sb() {
    sbP = sbP || import(SB_URL).then(({ createClient }) => createClient(cfg.url, cfg.anonKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }));
    return sbP;
  }

  // ── 기록 모으기·합치기 ──
  function collect() {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('dwk_') && !SKIP.test(k)) keys[k] = ls.get(k); }
    let data = { v: 1, at: Date.now(), keys }; const enc = new TextEncoder();
    while (enc.encode(JSON.stringify(data)).length > MAX_BYTES) { // 너무 크면 가장 큰 칸부터 뺀다(점수·캐릭터 같은 작은 칸이 남게)
      const big = Object.keys(data.keys).sort((a, b) => (data.keys[b] || '').length - (data.keys[a] || '').length)[0];
      if (!big) break; delete data.keys[big]; data.dropped = (data.dropped || []).concat(big);
    }
    return data;
  }
  const parse = (s) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  function mergeIn(server) {
    let n = 0;
    for (const [k, sv] of Object.entries((server && server.keys) || {})) {
      if (!k.startsWith('dwk_') || SKIP.test(k) || typeof sv !== 'string') continue;
      const lv = ls.get(k);
      if (lv == null) { ls.set(k, sv); n++; continue; }
      const a = parse(lv), b = parse(sv); let out = null;
      if (typeof a === 'number' && typeof b === 'number' && /best/i.test(k)) out = Math.max(a, b);
      else if (Array.isArray(a) && Array.isArray(b)) { const seen = new Set(a.map((x) => JSON.stringify(x))); out = a.concat(b.filter((x) => !seen.has(JSON.stringify(x)))); }
      else if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) out = Object.assign({}, b, a); // 같은 칸은 이 기기 값이 이긴다
      if (out !== null) { const s = JSON.stringify(out); if (s !== lv) { ls.set(k, s); n++; } }
    }
    return n;
  }
  async function sync(why) {
    const c = await sb(); const { data: { session } } = await c.auth.getSession();
    if (!session || session.user.is_anonymous) return { ok: false };
    const { data: row, error: e1 } = await c.from('account_vault').select('data').maybeSingle();
    if (e1) { console.info('기록 보관함 읽기 실패', e1.message); return { ok: false }; }
    const got = row ? mergeIn(row.data) : 0;
    const { error: e2 } = await c.from('account_vault').upsert({ uid: session.user.id, data: collect(), updated_at: new Date().toISOString() });
    if (e2) { console.info('기록 보관함 저장 실패', e2.message); return { ok: false }; }
    ls.set('dwk_acct_sync', String(Date.now())); track('acct_sync', { why, got });
    return { ok: true, got };
  }

  // ── 로그인·이어 붙이기 ──
  const back = (mode) => location.origin + location.pathname + '?dwk_acct=' + mode;
  async function go(p) {
    const c = await sb(); const { data: { session } } = await c.auth.getSession();
    track('acct_go', { p, has: !!session, anon: !!(session && session.user.is_anonymous) });
    // 이미 이 기기 계정(익명 · 광장 주민 등)이 있으면 그 계정에 이어 붙인다 → 캐릭터·점수가 같은 계정으로 남는다
    const r = session ? await c.auth.linkIdentity({ provider: p, options: { redirectTo: back('link') } })
      : await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: back('in') } });
    if (r.error) throw r.error;
  }
  async function switchTo(p) { const c = await sb(); await c.auth.signOut({ scope: 'local' }); const r = await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: back('in') } }); if (r.error) throw r.error; }

  // ── 화면 ──
  const css = `.dwa-back{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center}
.dwa{width:min(460px,100%);max-height:92vh;overflow:auto;background:#0b0b0d;color:#f0f0fa;border:1px solid rgba(240,240,250,.35);border-radius:4px 4px 0 0;padding:26px 22px calc(22px + env(safe-area-inset-bottom));font:15px/1.55 'Pretendard Variable',Pretendard,system-ui,sans-serif}
@media(min-width:600px){.dwa-back{align-items:center}.dwa{border-radius:4px}}
.dwa h2{margin:0 0 8px;font-size:22px;font-weight:700}.dwa p{margin:0 0 14px;color:rgba(240,240,250,.78)}.dwa small{display:block;color:rgba(240,240,250,.55);font-size:12.5px;margin-top:10px}
.dwa label{display:flex;gap:10px;align-items:flex-start;margin:4px 0 14px;cursor:pointer}.dwa input{width:20px;height:20px;margin:2px 0 0;accent-color:#f0f0fa}
.dwa .b{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;margin:0 0 10px;border:1px solid rgba(240,240,250,.35);border-radius:4px;font:700 16px/1 inherit;cursor:pointer}
.dwa .b[disabled]{opacity:.38;cursor:not-allowed}.dwa .b i{font-style:normal;font:900 18px/1 Arial,sans-serif}
.dwa .ghost{background:rgba(0,0,0,.5);color:#f0f0fa}.dwa .err{color:#ff8a80;min-height:1em;margin:4px 0 10px}.dwa .warn{border-left:2px solid #fee500;padding-left:10px}`;
  function el(t, a, ...kids) { const n = document.createElement(t); for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === 'style') n.style.cssText = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); return n; }
  function sheet(...kids) {
    close(); if (!document.getElementById('dwa-css')) document.head.append(el('style', { id: 'dwa-css' }, css));
    const box = el('div', { class: 'dwa', role: 'dialog', 'aria-modal': 'true', 'aria-label': '내 기록 지키기' }, kids);
    const bg = el('div', { class: 'dwa-back', id: 'dwa', onclick: (e) => { if (e.target === bg) close(); } }, box);
    document.body.append(bg); const f = box.querySelector('button,input'); f && f.focus();
  }
  function close() { const o = document.getElementById('dwa'); o && o.remove(); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function open(msg) {
    const err = el('p', { class: 'err', role: 'alert' }, msg || '');
    const who = linkedProv();
    if (who) {
      const last = Number(ls.get('dwk_acct_sync') || 0);
      sheet(el('h2', {}, '기록이 지켜지고 있어'),
        el('p', {}, `${who} 계정에 이어져 있어. 다른 폰·컴퓨터에서 같은 ${who} 계정으로 들어오면 캐릭터·점수·내 신청이 그대로 이어져.`),
        last ? el('small', {}, '마지막 저장 ' + new Date(last).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : null, err,
        el('button', { class: 'b ghost', type: 'button', onclick: async (e) => { e.target.disabled = true; err.textContent = '저장하는 중…'; const r = await sync('manual').catch(() => ({ ok: false })); err.textContent = r.ok ? '저장했어' : '저장을 못 했어. 잠시 뒤 다시 눌러 줘'; e.target.disabled = false; } }, '지금 저장하기'),
        el('button', { class: 'b ghost', type: 'button', onclick: async () => { const c = await sb(); await c.auth.signOut({ scope: 'local' }); ls.set('dwk_acct_sync', '0'); close(); toast('이 기기에서 로그아웃했어 · 기록은 이 기기에 그대로 있어'); refresh(); } }, '이 기기에서 로그아웃'),
        el('button', { class: 'b ghost', type: 'button', onclick: close }, '닫기'));
      return;
    }
    const age = el('input', { type: 'checkbox', id: 'dwa-age' });
    const btns = PROV.map((p) => {
      const L = LABEL[p]; const blocked = L.iabBlocked && IAB;
      return el('button', { class: 'b', type: 'button', disabled: blocked, style: `background:${L.bg};color:${L.fg}`, onclick: async (e) => {
        if (!age.checked) { err.textContent = '만 14세 이상만 이어 둘 수 있어. 아니면 이 기기에만 저장돼'; return; }
        e.target.disabled = true; err.textContent = `${L.name}로 가는 중…`;
        try { await go(p); } catch (x) { console.info('로그인 열기 실패', x && x.message); err.textContent = '지금은 연결이 안 돼. 잠시 뒤 다시 눌러 줘'; e.target.disabled = false; }
      } }, el('i', { style: `color:${L.markColor}` }, L.mark), `${L.name}로 기록 지키기`);
    });
    const anyBlocked = IAB && PROV.some((p) => LABEL[p].iabBlocked);
    sheet(el('h2', {}, '내 기록 지키기'),
      el('p', {}, '지금 캐릭터·게임 최고 기록·내 행성 신청은 이 기기에만 있어. 폰을 바꾸거나 브라우저 기록을 지우면 사라져. 계정에 이어 두면 다른 기기에서도 그대로 이어져.'),
      anyBlocked ? el('p', { class: 'warn' }, '인스타·카톡 안에서는 구글 로그인이 막혀 있어. 오른쪽 위 ⋯ → 「외부 브라우저로 열기」로 열면 돼.' + (PROV.some((p) => !LABEL[p].iabBlocked) ? ' 다른 계정은 여기서도 돼.' : '')) : null,
      el('label', {}, age, el('span', {}, el('b', {}, '만 14세 이상이야 (필수)'))),
      btns, err,
      el('button', { class: 'b ghost', type: 'button', onclick: close }, '나중에 · 이 기기에만 둘게'),
      el('small', {}, '로그인한 계정의 고유 번호로만 기록을 찾아. 이메일·이름은 화면·순위에 안 나오고, 기록은 본인만 볼 수 있어. 「이 기기에서 로그아웃」하면 이 기기 연결만 끊겨.'));
  }
  function toast(t) { const n = el('div', { role: 'status', style: 'position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9001;background:#f0f0fa;color:#000;padding:10px 16px;border-radius:4px;font:600 14px/1.3 inherit;max-width:90vw' }, t); document.body.append(n); setTimeout(() => n.remove(), 2600); }

  function refresh() {
    const who = linkedProv();
    for (const a of document.querySelectorAll('[data-dwk-account]')) {
      a.hidden = false; a.textContent = who ? `기록 지켜짐 · ${who}` : '내 기록 지키기';
      if (!a.dataset.dwaOn) { a.dataset.dwaOn = '1'; a.addEventListener('click', (e) => { e.preventDefault(); track('acct_open', { linked: !!linkedProv() }); open(); }); }
    }
  }

  // ── 돌아왔을 때(로그인 화면 → 우리 사이트) ──
  async function onReturn() {
    const q = new URLSearchParams(location.search); const mode = q.get('dwk_acct');
    const hashErr = new URLSearchParams(location.hash.slice(1));
    const ecode = q.get('error_code') || hashErr.get('error_code') || q.get('error') || hashErr.get('error');
    if (!mode && !q.has('code')) return false;
    const c = await sb(); // 만들면서 주소의 일회용 코드를 로그인으로 바꾼다(detectSessionInUrl)
    await c.auth.getSession();
    history.replaceState(null, '', location.pathname + (/error|access_token/.test(location.hash) ? '' : location.hash)); // 주소의 일회용 코드·오류 글을 지운다
    if (ecode) {
      track('acct_err', { mode, e: String(ecode).slice(0, 40) });
      if (/identity_already_exists|already linked/i.test(ecode)) {
        refresh(); const p = PROV[0];
        sheet(el('h2', {}, '이미 다른 기기 기록이 있는 계정이야'),
          el('p', {}, '그 계정으로 들어가면 거기 저장된 기록과 이 기기 기록을 합쳐 줘(같은 칸은 이 기기 값, 최고 기록은 더 높은 값).'),
          PROV.map((pp) => el('button', { class: 'b ghost', type: 'button', onclick: () => switchTo(pp).catch(() => toast('지금은 연결이 안 돼')) }, `${LABEL[pp].name} 계정으로 들어가기`)),
          el('button', { class: 'b ghost', type: 'button', onclick: close }, '그냥 둘게'));
        return true;
      }
      open('로그인을 끝내지 못했어. 다시 눌러 줘'); return true;
    }
    const r = await sync(mode || 'return').catch(() => ({ ok: false }));
    refresh(); toast(r.ok ? (r.got ? `다른 기기 기록 ${r.got}개를 이어 왔어` : '기록을 지켰어 · 이제 다른 기기에서도 이어져') : '로그인은 됐는데 저장을 못 했어. 「내 기록 지키기」에서 다시 저장해 줘');
    if (r.got) setTimeout(() => location.reload(), 900); // 이어 온 기록을 화면에 다시 그린다
    return true;
  }

  function start() {
    refresh();
    onReturn().then((handled) => {
      if (handled) return;
      const s = saved(); const last = Number(ls.get('dwk_acct_sync') || 0);
      if (s && !s.anon && Date.now() - last > 30 * 60 * 1000) sync('auto').catch(() => {}); // 이어 둔 사람은 30분에 한 번 저절로 저장
    }).catch((e) => console.info('내 기록 지키기 확인 실패', e && e.message));
  }
  window.DWKAccount = { open, sync, _t: { collect, mergeIn } }; // _t = 시험용(합치기 규칙)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
