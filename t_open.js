'use strict';
// 앱 열기 시험 3 — 11-21에 열린 방식(스크립트로 location.href)과 같은 방식으로 후보 주소를 넘긴다
document.querySelectorAll('button[data-u]').forEach(b => { b.onclick = () => { location.href = b.dataset.u; }; });
