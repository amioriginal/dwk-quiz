/* icons.js — 게임·아케이드·자랑 게시판·행성 고르기 화면용 선 아이콘 한 벌 (2026-11-20)
   광장(world.js ICON)·타운(town.js ICON)과 같은 굵기(24칸 · 선 2.4)로 직접 그렸다. 이모지 대신 쓴다.
   쓰는 법: HTML에 data-ic="이름" 을 달면 페이지가 열릴 때 그 안 맨 앞에 아이콘이 붙는다.
            JS에서는 DI.ic('이름') → <span class="ic"> 요소, DI.sound(버튼) → 소리 켜고 끄기 버튼. */
(() => {
  'use strict';
  const SV = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    back: SV('<path d="M15 5l-7 7 7 7"/>'),
    x: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
    sound: SV('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.4 8.6a5 5 0 010 6.8M19 6a8.6 8.6 0 010 12"/>'),
    mute: SV('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.6 9.4l5 5.2M21.6 9.4l-5 5.2"/>'),
    tap: SV('<path d="M9 11V4.5a1.5 1.5 0 013 0V10m0-.5V8a1.5 1.5 0 013 0v2m0 0a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-1a6 6 0 01-4.8-2.4L4 15a1.5 1.5 0 012.3-1.9L9 15"/>'),
    swipe: SV('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'),
    planet: SV('<circle cx="12" cy="12" r="5.6"/><path d="M5.2 14.6c-2.8 2.4-2.4 4.2 1.4 3.6 3-.5 6.8-2.2 9.8-4.4 3.4-2.5 5-5 3.4-6-.8-.5-2-.4-3.6.1"/>'),
    merge: SV('<circle cx="7" cy="9" r="3.4"/><circle cx="17" cy="9" r="3.4"/><path d="M7 13.5L12 18l5-4.5"/><circle cx="12" cy="19" r="1" fill="currentColor"/>'),
    alert: SV('<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5M12 17.4v.01"/>'),
    line: SV('<path d="M3 8h18" stroke-dasharray="3 3"/><rect x="6" y="11" width="12" height="9" rx="4.5"/>'),
    book: SV('<path d="M4 5.5A2 2 0 016 4h13v15H6a2 2 0 00-2 1.5z"/><path d="M4 5.5V20M8 8h7"/>'),
    ticket: SV('<path d="M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z"/><path d="M14 7v10" stroke-dasharray="2 2.4"/>'),
    heart: SV('<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>'),
    heartFill: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/></svg>',
    food: SV('<path d="M4 11a7.5 4 0 0116 0z"/><path d="M3 11h18M5 11l1.4 8h11.2L19 11"/>'),
    mind: SV('<path d="M12 5.2A3.2 3.2 0 006.6 6.4 3.2 3.2 0 004.4 11.8 3.2 3.2 0 007 17.4a3.2 3.2 0 005 1.6z"/><path d="M12 5.2a3.2 3.2 0 015.4 1.2 3.2 3.2 0 012.2 5.4 3.2 3.2 0 01-2.6 5.6 3.2 3.2 0 01-5 1.6"/><path d="M12 5.2V19"/>'),
    timer: SV('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M9.5 2.8h5M18.4 6.4l1.4-1.4"/>'),
    ban: SV('<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>'),
    trophy: SV('<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8M9 17h6"/>'),
    medal: SV('<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 9.8L6 3h4l2 5 2-5h4l-2.5 6.8"/><path d="M12 12.4v4.2"/>'),
    share: SV('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M5 12v7.5h14V12"/>'),
    retry: SV('<path d="M20 12a8 8 0 11-2.4-5.7"/><path d="M20 4v5h-5"/>'),
    home: SV('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
    stamp: SV('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="11" r="3.6"/><path d="M8 17.5h8"/>'),
    pen: SV('<path d="M4 20l4.2-1 11-11-3.2-3.2-11 11z"/>'),
    user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
    star: SV('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'),
    film: SV('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l4 2-4 2z" fill="currentColor"/><path d="M8 21h8"/>'),
    cards: SV('<rect x="7" y="3.5" width="12" height="16" rx="2" transform="rotate(8 13 11.5)"/><rect x="4" y="4.5" width="12" height="16" rx="2"/>'),
    search: SV('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>'),
    rocket: SV('<path d="M12 2.8c3 2.4 4.6 6 4.6 10.2l-2 3h-5.2l-2-3c0-4.2 1.6-7.8 4.6-10.2z"/><circle cx="12" cy="9.6" r="1.7"/><path d="M7.4 12.6L5 15.8V19l3-1.4M16.6 12.6l2.4 3.2V19l-3-1.4M10.4 19.2L12 21.6l1.6-2.4"/>'),
    lock: SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    check: SV('<path d="M5 12.5l4.5 4.5L19 7"/>'),
    mail: SV('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6.5L20.5 7"/>'),
    palette: SV('<path d="M12 3.5a8.5 8.5 0 100 17c1.4 0 1.8-1 1.2-2-.7-1.2 0-2.5 1.4-2.5H17a3.5 3.5 0 003.5-3.5c0-5-3.8-9-8.5-9z"/><circle cx="7.6" cy="11" r="1" fill="currentColor"/><circle cx="10.4" cy="7.4" r="1" fill="currentColor"/><circle cx="15" cy="7.6" r="1" fill="currentColor"/>'),
    hourglass: SV('<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 9 5 9 9s-9 4-9 9M16.5 3c0 5-9 5-9 9s9 4 9 9"/>'),
    down: SV('<path d="M12 4v15M6 13l6 6 6-6"/>'),
    copy: SV('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
    save: SV('<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>'),
    play: SV('<path d="M7 4l13 8-13 8z"/>'),
    arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    eye: SV('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    gift: SV('<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9c-1.5-4-6-4-6-1.5S12 9 12 9zm0 0c1.5-4 6-4 6-1.5S12 9 12 9z"/>'),
  };
  const ic = (n) => { const s = document.createElement('span'); s.className = 'ic'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICON[n] || ''; return s; };
  // 결과 줄(초록·노랑·빨강 칸) — 이모지 네모 대신 그린 칸
  const sq = (kind) => { const s = document.createElement('i'); s.className = 'sq ' + ({ g: 'g', y: 'y', r: 'r', '🟩': 'g', '🟨': 'y', '🟥': 'r' }[kind] || 'g'); s.setAttribute('aria-hidden', 'true'); return s; };
  // 소리 버튼: 아이콘 + 「소리」/「꺼짐」 글자. DC.sfx 가 있어야 동작
  function sound(btn) {
    const sync = () => { const on = window.DC?.sfx?.on?.() ?? true; btn.replaceChildren(ic(on ? 'sound' : 'mute')); btn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기'); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); };
    btn.onclick = () => { window.DC?.sfx?.toggle?.(); sync(); window.DC?.sfx?.('tap'); };
    sync(); return btn;
  }
  // 저장해 둔 이름(옛 기록)에 붙어 있던 이모지를 화면에서만 뗀다
  const strip = (s) => String(s ?? '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const mount = (root = document) => { for (const b of root.querySelectorAll('[data-ic]:not([data-ic-done])')) { b.prepend(ic(b.dataset.ic)); b.setAttribute('data-ic-done', ''); } };
  window.DI = { ICON, ic, sq, sound, strip, mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount()); else mount();
})();
