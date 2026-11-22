'use strict';
// 행성 풀이 화면 — pul.html?ep=1&n=3 (번호 없으면 「댓글 달면 DM으로」 안내만)
const T = window.T || { ev() {}, screen() {}, vis: () => 0, ctx: {} }; // 활동 기록(track.js). 없어도 화면은 그대로 돈다
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qs = new URLSearchParams(location.search);
const EP = qs.get('ep') || '1';
const D = (window.PUL_DATA || {})[EP];

// 번호 없이 들어오면 풀이를 보여 주지 않는다 — 풀이는 번호 댓글을 단 사람에게 DM으로만 간다(대표 11-23 「댓글안달고 바로 사이트 접속해서 풀이 볼라고 할텐데」)
function gate() {
  $('app').innerHTML = `<div class="card hero"><p class="ep">${esc(D.no)}</p>
    <h2 class="h">어느 행성이 궁금해?</h2>
    <p class="desc">행성을 누르면 그 영상으로 가요! 고른 번호 하나만 댓글에 남기면, 그 번호의 풀이를 DM으로 보내드려요!</p>
    <div class="four">${[1, 2, 3, 4].map(k => `<a class="pl" href="${esc(D.reel)}" rel="noopener" data-t="gate_pl${k}"><img src="img/${esc(D.p[k].img)}.jpg" alt=""><span>${k}번</span><small>「${esc(D.p[k].t)}」</small></a>`).join('')}</div></div>
    ${moreEps()}`;
  T.screen('gate', { ep: EP });
}

// 누른 것 기록은 track.js가 data-t·id 이름으로 알아서 남긴다(여기서 또 남기면 두 줄이 된다)
// 다른 편 — 게시된 편(퀴즈 data.js)마다 표지를 누르면 그 릴스로. 풀이가 준비된 편엔 「DM 풀이」 표시
function moreEps() {
  const eps = (window.QUIZ_DATA || []).filter(e => e.reel && e.reel !== D.reel);
  if (!eps.length) return '';
  const has = new Set(Object.values(window.PUL_DATA || {}).map(x => x.reel));
  return `<div class="card more"><h3 class="h3">다른 편 행성도 골라 봐!</h3>
    <div class="eps">${eps.map(e => `<a class="epc" href="${esc(e.reel)}" rel="noopener" data-t="ep:${esc(e.no)}"><img src="img/${esc(e.cover)}.jpg" alt=""><span><b>${esc(e.no)}</b><i>${esc(e.title)}</i></span>${has.has(e.reel) ? '<em>DM 풀이</em>' : ''}</a>`).join('')}</div></div>`;
}

function show(n) {
  const p = D.p[n];
  if (!p) return gate();
  $('app').innerHTML = `<div class="card res">
    <p class="ep">${esc(D.no)} · ${n}번 ${esc(p.name)}</p>
    <img class="qimg" src="img/${esc(p.img)}.jpg" alt="">
    <p class="you">이 행성을 고른 당신은</p>
    <h1 class="t">「${esc(p.t)}」 ${p.e}</h1>
    <div class="sec"><h3>이 행성을 고른 사람은</h3>${p.a.map(s => `<p>${esc(s)}</p>`).join('')}</div>
    <div class="sec"><h3>이 행성에서의 1년</h3>${p.y.map(s => `<p>${esc(s)}</p>`).join('')}</div>
    <div class="sec"><h3>궁합</h3><p>${esc(p.g)}</p><p>${esc(p.b)}</p></div>
    <div class="rk">${esc(p.r)}</div>
    <button class="btn y" id="share">친구는 몇 번일까? 보내 보기</button>
    <div class="sec"><h3>다른 번호를 고른 사람은?</h3>${[1, 2, 3, 4].filter(k => String(k) !== String(n)).map(k => `<p>${k}번 「${esc(D.p[k].t)}」</p>`).join('')}<p class="desc">그 번호를 고르면 풀이가 DM으로 가요!</p></div>
    <p class="fb" id="fb"></p></div>
    ${moreEps()}`;
  T.ctx = { ep: EP, qi: Number(n) };
  T.screen('result', { ep: EP }); T.ev('result', { ep: EP, num: Number(n) });
  $('share').onclick = async () => {
    const text = `나는 ${n}번 「${p.t}」 나왔어! 너는 몇 번 고를래?`;
    try {
      if (navigator.share) { await navigator.share({ text, url: D.reel }); return; }
      await navigator.clipboard.writeText(`${text}\n${D.reel}`);
      $('fb').textContent = '복사했어요! 친구한테 붙여 넣어 주세요!';
    } catch (e) {
      if (e && e.name === 'AbortError') return; // 공유 창을 그냥 닫은 경우
      $('fb').textContent = '복사가 막혔어요! 영상 주소를 길게 눌러 보내 주세요!';
    }
  };
}

if (!D) { $('app').innerHTML = '<div class="card hero"><h2 class="h">아직 풀이가 없는 편이에요!</h2></div>'; }
else if (qs.get('n')) show(qs.get('n'));
else gate();
