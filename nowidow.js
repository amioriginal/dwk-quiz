'use strict';
// 줄 끝 외톨이 막기 — 휴대폰 폭에서 마지막 낱말 하나만 다음 줄로 떨어지지 않게, 글자 칸마다 마지막 띄어쓰기를 붙는 띄어쓰기(U+00A0)로 바꾼다.
// 대표 11-23 「조용히 오래 빛나는 / 사람 … 이런 디테일 … 앞으로 이런일 없도록해줘」. 점검 = 기록장치/줄바꿈_점검.mjs
(() => {
  const NB = ' ';
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE)$/;
  const fix = root => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => SKIP.test(n.parentNode && n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) {
      const s = n.nodeValue; const t = s.replace(/\s+$/, '');
      const i = t.lastIndexOf(' ');
      if (i > 0 && t.length - i <= 12) n.nodeValue = s.slice(0, i) + NB + s.slice(i + 1); // 마지막 낱말이 12자 이하일 때만(긴 주소 등은 그대로)
    }
  };
  const run = () => fix(document.body);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  let q = false;
  new MutationObserver(ms => { if (q) return; q = true; requestAnimationFrame(() => { q = false; ms.forEach(m => m.addedNodes.forEach(a => a.nodeType === 1 ? fix(a) : a.nodeType === 3 && a.parentNode && fix(a.parentNode))); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();
