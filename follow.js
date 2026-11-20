'use strict';
// 팔로우 부탁 창 — 퀴즈 시작·사연 쓰기 전에 한 번 묻는다.
// ※팔로우했는지 확인하지는 못한다(인스타가 웹페이지에 알려 주지 않음). 고르게만 한다.
//   「팔로우하고」를 고르면 새 창으로 프로필을 열고, 이 페이지는 바로 이어서 진행한다.
//   인스타 앱 안 브라우저가 같은 창에서 프로필로 넘어가 버려도, 돌아오면 고른 편부터 이어서 시작한다(pending).
(() => {
  const PROFILE = 'https://www.instagram.com/dontwannaknow.kr/';
  const store = s => { try { return window[s]; } catch { return null; } };
  const get = (s, k) => { try { return store(s) && store(s).getItem(k); } catch { return null; } };
  const put = (s, k, v) => { try { store(s) && store(s).setItem(k, v); } catch { /* 저장이 막혀도 창만 다시 뜰 뿐이다 */ } };
  const del = (s, k) => { try { store(s) && store(s).removeItem(k); } catch { /* 위와 같다 */ } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // 새 창으로 열린 경우: 이 페이지로 다시 돌아오면 pending은 필요 없으니 지운다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') del('sessionStorage', 'dwk_pending'); });

  // txt: { lead, yes, no } · go: 고른 뒤 할 일 · key: 같은 창에서 넘어갔다 돌아왔을 때 이어 갈 표시
  window.followGate = (txt, go, key) => {
    // 팔로우하러 간 적 있으면 이 기기에선 다시 안 묻는다. 「그냥」을 고르면 이번 방문 동안은 안 묻는다.
    if (get('localStorage', 'dwk_follow') === 'went' || get('sessionStorage', 'dwk_follow_skip')) { go(); return; }
    const wrap = el('div', 'fg'); wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    const card = el('div', 'card');
    const yes = el('a', 'btn y', txt.yes); yes.href = PROFILE; yes.target = '_blank'; yes.rel = 'noopener noreferrer';
    const no = el('button', 'btn g', txt.no); no.type = 'button';
    card.append(el('p', 'hi', '아!'), el('h3', null, txt.lead), el('p', 'sub', '@dontwannaknow.kr'), yes, no,
      el('small', null, '팔로우하고 이 화면으로 돌아오면 바로 이어서 할 수 있어'));
    wrap.append(card); document.body.append(wrap);
    const close = () => wrap.remove();
    yes.onclick = () => { put('localStorage', 'dwk_follow', 'went'); if (key) put('sessionStorage', 'dwk_pending', key); close(); go(); };
    no.onclick = () => { put('sessionStorage', 'dwk_follow_skip', '1'); close(); go(); };
    yes.focus();
  };
  // 같은 창에서 프로필로 넘어갔다 돌아온 경우, 이어 갈 표시를 한 번만 꺼내 준다
  window.followGate.pending = () => { const k = get('sessionStorage', 'dwk_pending'); del('sessionStorage', 'dwk_pending'); return k; };
})();
