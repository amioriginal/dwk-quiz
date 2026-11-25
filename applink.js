'use strict';
// 인스타 링크 처리 — 2026-11-26 앱 주소 전환(intent:// · instagram://)을 없앴다.
// 인스타 「메시지 보내기 제한(사기 가능성)」 대응: 인앱 브라우저에서 다른 주소 체계로 자동 전환하는 코드는
// Meta 스팸 정책(사용자 조작 없는 자동 이동·클로킹)에 걸릴 수 있어, 모든 링크를 평범한 https 링크로 둔다. 옛 코드는 git 기록에 있다.
// window.openIG는 다른 스크립트(hub.js·pul.js·quiz.js·story.js·ig.js)가 부르므로 이름만 남긴다 — 항상 false(= 원래 https 링크대로)를 돌려준다.
(() => {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  window.openIG = (web, opts = {}) => {
    if (opts.navigate) { if (opts.newTab) window.open(web, '_blank', 'noopener'); else location.href = web; }
    return false;
  };
  // 누른 순간 복사(댓글에 붙여 넣기용) — 주소 전환과 무관해 남긴다
  window.openIG.copyNow = t => {
    let ok = false;
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    try { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {}); } catch { /* 위 복사로 충분 */ }
    return ok;
  };
  window.openIG.iosIgApp = false;
  window.openIG.guideOnly = false;
  window.openIG.env = { ios, android, inApp: false };
})();
