'use strict';
// 행성 풀이 화면 — pul.html?ep=1&n=3 (번호 없으면 「댓글 달면 DM으로」 안내만)
const T = window.T || { ev() {}, screen() {}, vis: () => 0, ctx: {} }; // 활동 기록(track.js). 없어도 화면은 그대로 돈다
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qs = new URLSearchParams(location.search);
const W = (qs.get('w') || '').slice(0, 60);   // DM 링크에 붙은 「그 사람 댓글 이유를 짚는 한 줄」(풀이.py · 검수 통과분만)
const EP = qs.get('ep') || '';
const D = (window.PUL_DATA || {})[qs.get('ep') || ''];

// 번호 없이 들어오면 풀이를 보여 주지 않는다 — 풀이는 번호 댓글을 단 사람에게 DM으로만 간다(대표 11-23 「댓글안달고 바로 사이트 접속해서 풀이 볼라고 할텐데」)
// 순서(대표 11-23 「여러 편에서 원하는거 고를수 있게 … 행성을 누르면 영상에 댓글달고 심리풀이 보기 클릭하면 가지게끔」):
//   편 고르기 → 그 편 행성 고르기(유형 이름만 맛보기) → 「영상에 N번 댓글 → DM의 [내 풀이 보기]」 안내 + 「N번 복사하고 영상으로」
const ALL = window.PUL_DATA || {};
// 내 행성 도감 — 이 기기에서 받아 본 풀이를 모은다(서버로 보내지 않음). 대표 11-23 「팬층도 두텁게」 · 여러 편을 모으는 재미
const DG = (() => { try { return JSON.parse(localStorage.getItem('dwk_dogam') || '{}'); } catch { return {}; } })();
const dgSave = () => { try { localStorage.setItem('dwk_dogam', JSON.stringify(DG)); } catch { /* 저장이 막혀도 화면은 그대로 */ } };
function dogam(here) {
  const got = ORDER.filter(k => DG[k]).length;
  return `<div class="card more"><h3 class="h3">내 행성 도감 ${got} / ${ORDER.length}</h3>
    <div class="dg">${ORDER.map(k => { const cv = coverOf(k); const g = DG[k]; return g
      ? `<a class="dgc on${k === here ? ' me' : ''}" href="?ep=${esc(k)}&n=${esc(g.n)}" data-t="dogam_open:${esc(k)}"><b>${esc(cv.no)}</b><span class="fit">${esc(g.n)}번 「${esc(g.t)}」</span></a>`
      : `<a class="dgc" href="?ep=${esc(k)}" data-t="dogam_empty:${esc(k)}"><b>${esc(cv.no)}</b><span>아직 비었어요!</span></a>`; }).join('')}</div>
    <p class="desc">편마다 번호 댓글을 남기면 도감이 채워져요!</p></div>`;
}
const ORDER = (window.QUIZ_DATA || []).map(q => Object.keys(ALL).find(k => ALL[k].reel === q.reel)).filter(Boolean);
Object.keys(ALL).forEach(k => { if (!ORDER.includes(k)) ORDER.push(k); });
const coverOf = k => { const q = (window.QUIZ_DATA || []).find(x => x.reel === ALL[k].reel); return q ? { img: q.cover, no: q.no, title: q.title } : { img: '', no: ALL[k].no, title: '' }; };

function pickEp() {
  $('app').innerHTML = `<div class="card hero"><h2 class="h">어느 편 행성이 궁금해?</h2>
    <p class="desc">편을 고르고 행성을 골라 봐! 고른 번호를 영상에 댓글로 남기면, 그 행성이 말하는 내 성향을 DM으로 보내드려요!</p>
    <div class="eps">${ORDER.map(k => { const cv = coverOf(k); return `<a class="epc" href="?ep=${esc(k)}" data-t="pick_ep:${esc(k)}"><img src="img/${esc(cv.img)}.jpg" alt=""><span><b>${esc(cv.no)}</b><i>${esc(cv.title)}</i></span>${DG[k] ? '<em>도감 ✓</em>' : ''}</a>`; }).join('')}</div></div>
    ${Object.keys(DG).length ? dogam('') : ''}`;
  T.screen('start', {});
}

function gate() {
  $('app').innerHTML = `<div class="card hero"><p class="ep">${esc(D.no)}</p>
    <h2 class="h">어느 행성이 궁금해?</h2>
    <p class="desc">행성을 누르면 풀이 받는 법이 나와요!</p>
    <div class="four">${Object.keys(D.p).map(k => `<button class="pl" data-k="${k}" data-t="gate_pl${k}"><img src="img/${esc(D.p[k].img)}.jpg" alt=""><span>${k}번</span><small class="fit">「${esc(D.p[k].t)}」</small></button>`).join('')}</div>
    <a class="btn g" href="pul.html" data-t="back_eps">다른 편 고르기</a></div>`;
  document.querySelectorAll('.pl').forEach(b => b.onclick = () => how(b.dataset.k));
  T.screen('gate', { ep: EP });
}

function how(n) {
  const p = D.p[n];
  $('app').innerHTML = `<div class="card hero"><p class="ep">${esc(D.no)} · ${n}번 ${esc(p.name)}</p>
    <img class="qimg" src="img/${esc(p.img)}.jpg" alt="">
    <h2 class="h">「${esc(p.t)}」 ${p.e}</h2>
    <div class="steps"><p><b>1</b> 영상에 「${n}번」 댓글 남기기</p><p><b>2</b> DM으로 온 [팔로우 확인] 누르기</p><p><b>3</b> [내 풀이 보기] 누르면 끝!</p></div>
    <button class="btn y" id="goCmt" data-t="go_comment${n}">「${n}번」 복사하고 영상으로 가기</button>
    <button class="btn g" id="backPl" data-t="back_planets">다른 행성 보기</button>
    <p class="fb" id="fb"></p></div>`;
  $('backPl').onclick = gate;
  $('goCmt').onclick = async () => {
    let copied = false;
    try { await navigator.clipboard.writeText(`${n}번`); copied = true; } catch { /* 복사 막힘 — 아래 안내에 번호를 크게 보여 준다 */ }
    if (window.openIG && window.openIG.guideOnly) { // DM에서 연 창(아이폰 인스타 앱): 앱으로 못 넘긴다 — 표지와 함께 찾는 법만
      const cv = coverOf(EP);
      $('fb').innerHTML = `<span class="guide">${copied ? `「${n}번」 복사했어요!` : `댓글에 「${n}번」이라고 남겨 주세요!`}<br>왼쪽 위 ✕로 창 닫고, 프로필 맨 위 이 영상에 붙여 넣어 주세요!${cv.img ? `<img src="img/${esc(cv.img)}.jpg" alt="">` : ''}</span>`;
      T.ev('click', { ep: EP, el: 'ig_inapp_profile' });
      return;
    }
    $('fb').textContent = copied ? '복사했어요! 댓글창에 붙여 넣어 주세요!' : `댓글창에 「${n}번」이라고 남겨 주세요!`;
    setTimeout(() => { if (!(window.openIG && window.openIG(D.reel))) location.href = D.reel; }, 700);
  };
  T.screen('quiz', { ep: EP });
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
  if (qs.get('from') === 'dm' || DG[EP]) { DG[EP] = { n: String(n), t: p.t }; dgSave(); }   // DM으로 받은 풀이만 도감에 들어간다
  $('app').innerHTML = `<div class="card res">
    <p class="ep">${esc(D.no)} · ${n}번 ${esc(p.name)}</p>
    <img class="qimg" src="img/${esc(p.img)}.jpg" alt="">
    ${W ? `<p class="mine">「${esc(W)}」</p>` : ''}
    <p class="you">이 행성을 고른 당신은</p>
    <h1 class="t">「${esc(p.t)}」 ${p.e}</h1>
    <div class="sec"><h3>이 행성을 고른 사람은</h3>${p.a.map(s => `<p>${esc(s)}</p>`).join('')}</div>
    <div class="sec"><h3>이 행성에서의 1년</h3>${p.y.map(s => `<p>${esc(s)}</p>`).join('')}</div>
    <div class="sec"><h3>궁합</h3><p>${esc(p.g)}</p><p>${esc(p.b)}</p></div>
    <div class="rk">${esc(p.r)}</div>
    <button class="btn y" id="share">친구는 몇 번일까? 보내 보기</button>
    <div class="sec"><h3>다른 번호를 고른 사람은?</h3>${Object.keys(D.p).filter(k => String(k) !== String(n)).map(k => `<p>${k}번 「${esc(D.p[k].t)}」</p>`).join('')}<p class="desc">그 번호를 고르면 풀이가 DM으로 가요!</p></div>
    <p class="fb" id="fb"></p><p class="hd">@dontwannaknow.kr</p></div>
    ${dogam(EP)}
    ${moreEps()}`;
  T.ctx = { ep: EP, qi: Number(n) };
  T.screen('result', { ep: EP }); T.ev('result', { ep: EP, num: Number(n) });
  $('share').onclick = async () => {
    const text = `나는 ${n}번 「${p.t}」래! 너는 몇 번 고를 거야? 영상 보고 골라 봐!`;
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

// 한 줄 칸(.fit): 넘치면 글자를 조금씩 줄여 한 줄에 맞춘다(최소 10px)
function fitAll() {
  document.querySelectorAll('.fit').forEach(el => {
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && fs > 10) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  });
}
new MutationObserver(() => requestAnimationFrame(fitAll)).observe(document.getElementById('app'), { childList: true, subtree: true });
addEventListener('resize', fitAll);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);

if (!D) pickEp();
else if (qs.get('n') && D.p[qs.get('n')]) show(qs.get('n'));
else gate();
