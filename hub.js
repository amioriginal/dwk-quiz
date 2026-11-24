'use strict';
// 돈워너노우 우주 허브 — 사이트 첫 화면 한 장에 다 보이게(픽세 분석 2026-11-23: 문 세 겹·숨은 설명·떠 있는 버튼이 가리는 문제를 피한다)
// 읽기만 하는 것: data.js(편 목록) · pul_data.js(풀이·행성) · hub_data.js(팬 후보) · localStorage dwk_dogam(풀이 화면이 채움)
// 서버에 보내는 것: 후보 하트(이 기기 임의 번호 + 후보 id)만. 이름·아이디·글은 보내지 않는다.
const EPS = window.QUIZ_DATA || [];
const PUL = window.PUL_DATA || {};
const CANDS = window.HUB_CANDS || [];
const T = window.T || { ev() {}, screen() {} };
const PROFILE = 'https://www.instagram.com/dontwannaknow.kr/';
const $ = id => document.getElementById(id);
const dot = s => String(s).replace(/ · /g, '\u00a0· '); // 「·」가 줄 맨 앞에 오지 않게
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const meta = n => (document.querySelector(`meta[name="${n}"]`) || {}).content || '';
const KEY = meta('dwk-key');
const API = 'https://yvjhsqbymgomicjqmuok.supabase.co/rest/v1/rpc/';
const TEST = new URLSearchParams(location.search).get('t') === 'test';
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장이 막혀도 화면은 그대로 */ } },
};
const DG = ls.get('dwk_dogam', {});
const SID = (() => { let s = ls.get('dwk_hub_sid', ''); if (!/^[0-9a-f]{16}$/.test(s)) { s = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''); ls.set('dwk_hub_sid', s); } return s; })();
const VOTED = new Set(ls.get('dwk_hub_voted', []));

// 편 목록(data.js)과 풀이 묶음(pul_data.js)을 릴스 주소로 잇는다
const pulKeyOf = reel => Object.keys(PUL).find(k => PUL[k].reel === reel) || null;
const EPLIST = EPS.map(e => ({ ...e, pk: pulKeyOf(e.reel) }));

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
function openReel(url) { if (!(window.openIG && window.openIG(url))) location.href = url; }
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-ig]');
  if (!a) return;
  e.preventDefault(); openReel(a.getAttribute('href'));
});

// ① 이번 행성 — 가장 최근 편
function renderNow() {
  const e = EPLIST[0]; if (!e) return;
  $('now').innerHTML = `<a class="nowc" href="${esc(e.reel)}" data-ig data-t="now_reel:${esc(e.pk || e.no)}"><img src="img/${esc(e.cover)}.jpg" alt=""><span><b>${esc(e.no)}</b><i>${esc(dot(e.title))}</i></span></a>
    <div class="steps"><p><b>1</b>영상에서 마음이 가는 행성 고르기</p><p><b>2</b>댓글에서 다른 사람은 왜 골랐는지 보기</p><p><b>3</b>위에서 내 선택을 일상의 질문으로 돌아보기</p></div>
    <a class="btn y" href="${esc(e.reel)}" data-ig data-t="now_go">영상 보러 가기</a>`;
}

// ② 행성 도감 — 편마다 내가 받은 풀이 행성 하나
function renderDex() {
  const eps = EPLIST.filter(e => e.pk);
  const got = eps.filter(e => DG[e.pk]).length;
  $('dexN').textContent = `${got} / ${eps.length}`;
  $('dexBar').style.width = (eps.length ? Math.round(got / eps.length * 100) : 0) + '%';
  $('dex').innerHTML = eps.map(e => {
    const d = DG[e.pk], p = d && PUL[e.pk].p[d.n];
    if (p) return `<a class="dx on" href="pul.html?ep=${esc(e.pk)}&n=${esc(d.n)}" data-t="dex_open:${esc(e.pk)}"><img src="img/${esc(p.img)}.jpg" alt=""><b>${esc(p.name.replace(/ 행성$/, ''))}</b><i>${esc(e.no)}</i></a>`;
    return `<a class="dx" href="${esc(e.reel)}" data-ig data-t="dex_lock:${esc(e.pk)}"><span>?</span><b>잠김</b><i>${esc(e.no)}</i></a>`;
  }).join('');
  $('dexHint').textContent = got === eps.length && eps.length ? '도감을 다 채웠어! 다음 행성이 열리면 또 모아 봐!' : '? 칸을 누르면 그 편 영상으로 가!';
}

// ③ 다음 행성 후보 — 하트(사이트) + 댓글 좋아요
let COUNTS = {};
async function rpc(fn, body) {
  const r = await fetch(API + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if (!r.ok) { const e = new Error('rpc ' + fn + ' ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
async function loadCounts() {
  // 2026-11-25: 실제 방문 2건에서 첫 시도가 바로 실패(통신 끊김·서버 지연 추정) → 1.2초 뒤 한 번만 다시 묻는다. 그래도 실패면 안내 문구 + 실패 이유 기록
  let rows = null, why = 0;
  for (let i = 0; i < 2 && !rows; i++) {
    if (i) await new Promise(r => setTimeout(r, 1200));
    try { rows = await rpc('hub_counts'); } catch (err) { why = err.status || -1; }
  }
  if (rows) COUNTS = Object.fromEntries(rows.map(r => [r.cand, Number(r.n) || 0]));
  else { T.ev('jserr', { el: 'hub_counts', num: why }); $('candNote').textContent = '지금은 실시간 하트 수를 불러올 수 없습니다.'; }
  renderCands();
}
const score = c => (COUNTS[c.id] || 0) + (c.likes || 0) + (VOTED.has(c.id) && !COUNTS[c.id] ? 1 : 0);
let CAND_OPEN = false;
const FROM = { ig: '인스타', yt: '유튜브', tt: '틱톡' };
function renderCands() {
  const list = CANDS.filter(c => !c.made).slice().sort((a, b) => score(b) - score(a));
  const shown = CAND_OPEN ? list : list.slice(0, 3);
  $('candMore').hidden = list.length <= 3;
  $('candMore').textContent = CAND_OPEN ? '접기' : `후보 ${list.length - 3}개 더 보기`;
  $('cands').innerHTML = shown.map((c, i) => `<div class="cd">
      <span class="rk">${i + 1}</span>
      <div class="cm"><b>${esc(c.e)} ${esc(c.name)}</b><p>${esc(c.line)}</p><i>${esc(FROM[c.from] || '')} ${esc(c.by)}*** 님 제안</i></div>
      <button class="ht${VOTED.has(c.id) ? ' on' : ''}" type="button" data-c="${esc(c.id)}" data-t="vote:${esc(c.id)}" aria-label="${esc(c.name)} 응원하기"><span>${VOTED.has(c.id) ? '♥' : '♡'}</span>${score(c)}</button>
    </div>`).join('');
  const made = CANDS.filter(c => c.made);
  $('madeBox').hidden = !made.length;
  $('made').innerHTML = made.map(c => `<p>${esc(c.e)} ${esc(c.name)} → ${esc(c.made)} <i>${esc(c.by)}*** 님 제안</i></p>`).join('');
}
$('candMore').onclick = () => { CAND_OPEN = !CAND_OPEN; renderCands(); };
$('cands').addEventListener('click', async e => {
  const b = e.target.closest('button[data-c]'); if (!b) return;
  const id = b.dataset.c;
  if (VOTED.has(id)) { toast('이미 응원했어! 다른 행성도 골라 줘!'); return; }
  VOTED.add(id); ls.set('dwk_hub_voted', [...VOTED]); renderCands();
  try { const ok = await rpc('hub_vote', { p_cand: id, p_sid: SID, p_test: TEST }); toast(ok ? '응원했어! 많이 받은 행성부터 영상 후보로 올려!' : '오늘은 하트가 꽉 찼어! 내일 다시 눌러 줘!'); if (ok && !TEST) COUNTS[id] = (COUNTS[id] || 0) + 1; }
  catch { toast('하트가 안 들어갔어! 잠시 뒤 다시 눌러 줘!'); VOTED.delete(id); ls.set('dwk_hub_voted', [...VOTED]); }
  renderCands();
});

// ④ 모든 편
function renderEps() {
  $('eps').innerHTML = EPLIST.map(e => `<a class="epc" href="${esc(e.reel)}" data-ig data-t="ep_reel:${esc(e.pk || e.no)}"><img src="img/${esc(e.cover)}.jpg" alt=""><span><b>${esc(e.no)}</b><i>${esc(dot(e.title))}</i></span><em>보기 ›</em></a>`).join('');
}

// 공유 — 친구에게 이 허브를
$('share').onclick = async () => {
  const url = location.origin + location.pathname;
  const text = '어떤 행성을 골랐나요? 영상 속 선택을 일상의 질문으로 돌아보세요.';
  try {
    if (navigator.share) { await navigator.share({ text, url }); T.ev('click', { el: 'share_native' }); return; }
    await navigator.clipboard.writeText(`${text}\n${url}`); toast('주소를 복사했어! 친구한테 붙여 넣어 줘!');
  } catch { /* 공유창을 닫은 경우 — 할 일 없음 */ }
};
document.querySelectorAll('a.follow').forEach(a => { a.href = PROFILE; a.addEventListener('click', ev => { ev.preventDefault(); try { localStorage.setItem('dwk_follow', 'went'); } catch { /* 무시해도 된다 */ } openReel(PROFILE); }); });

renderNow(); renderDex(); renderCands(); renderEps(); loadCounts();
T.screen('start');
