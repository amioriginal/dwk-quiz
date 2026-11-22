'use strict';
// 행성 생존 퀴즈 — 문제·편 목록은 data.js(window.QUIZ_DATA). 이 파일은 고칠 일이 없다.
const EPS = window.QUIZ_DATA || [];
const T = window.T || { ev() {}, screen() {}, vis: () => 0, ctx: {} }; // 활동 기록(track.js). 없어도 퀴즈는 그대로 돈다
const PROFILE = 'https://www.instagram.com/dontwannaknow.kr/';
const ALL_N = 10;
const $ = s => document.querySelector(s);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const buzz = p => { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.isActive) navigator.vibrate(p); };
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

const ASK = { lead: '퀴즈 시작 전 팔로우는\n주인장에게 큰 힘이 돼!!', yes: '팔로우하고 풀기', no: '그냥 풀기ㅠㅠ', perk: '🪐 팔로워가 보낸 행성은 진짜 영상이 돼\n뽑히면 네 아이디도 나와!' };
let mode = null;   // 고른 편(EPS의 한 묶음) 또는 'all'
let qs = [], i = 0, score = 0, qT0 = 0;

// ── 편 고르기 화면 ──
EPS.forEach((ep, k) => {
  const b = el('button', 'epc'); b.type = 'button';
  const im = new Image(); im.src = `img/${ep.cover}.jpg`; im.alt = ''; im.loading = 'lazy';
  const cap = el('span'); cap.append(el('b', null, ep.no), el('i', null, ep.title));
  b.append(im, cap); b.dataset.t = 'ep:' + ep.no;
  if (k === 0) b.append(el('em', null, 'NEW'));
  b.onclick = () => window.followGate(ASK, () => start(ep), ep.no);
  $('#eps').append(b);
});

function start(m) {
  mode = m;
  if (m === 'all') {
    // 편마다 최소 1문제 + 나머지 무작위, 편 순서대로
    const pool = EPS.map(ep => shuffle(ep.qs.map((q, k) => ({ ...q, ep: ep.no, k }))));
    const pick = pool.map(list => list[0]).slice(0, ALL_N);
    const rest = shuffle(pool.flatMap(list => list.slice(1))).slice(0, Math.max(0, ALL_N - pick.length));
    const order = EPS.map(ep => ep.no).reverse();
    qs = [...pick, ...rest].sort((a, b) => order.indexOf(a.ep) - order.indexOf(b.ep));
  } else {
    qs = shuffle(m.qs.map((q, k) => ({ ...q, ep: m.no, k })));
  }
  i = 0; score = 0;
  const where = m === 'all' ? '전체' : m.no;
  T.ctx = { ep: where }; T.screen('quiz', { ep: where }); T.ev('start', { ep: where, num: qs.length });
  $('#start').classList.add('hide'); $('#result').classList.add('hide'); $('#quiz').classList.remove('hide');
  show();
}

function show() {
  const b = qs[i], n = qs.length;
  $('#qno').textContent = `${i + 1}/${n}`; $('#barFill').style.width = `${i / n * 100}%`;
  $('#ep').textContent = b.ep;
  const im = $('#qimg');
  if (b.img) { im.src = `img/${b.img}.jpg`; im.classList.remove('hide'); } else im.classList.add('hide');
  $('#qtext').textContent = b.q;
  T.ctx = { ep: b.ep, qi: i }; qT0 = T.vis(); T.ev('q_show', { ep: b.ep, qi: i, qk: `${b.ep}#${b.k}` });
  $('#fb').replaceChildren(); $('#next').classList.add('hide');
  const box = $('#opts'); box.replaceChildren();
  shuffle([b.a, ...b.w]).forEach((t, pos) => {
    const o = el('button', 'opt', t); o.type = 'button';
    o.onclick = () => pick(o, t === b.a, pos + 1); box.append(o);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setFb(ok, ans) {
  const f = $('#fb'); f.replaceChildren(); const b = el('b');
  if (ok) { b.textContent = '정답!'; f.append(b, ' 살아남았어.'); }
  else { b.textContent = ans; f.append('땡. 정답은 ', b); }
}

function pick(btn, ok, pos) {
  const b = qs[i];
  T.ev('answer', { ep: b.ep, qi: i, qk: `${b.ep}#${b.k}`, ok, num: pos, ms: T.vis() - qT0 });
  document.querySelectorAll('.opt').forEach(o => { o.disabled = true; if (o.textContent === b.a) o.classList.add('ok'); });
  if (ok) { score++; setFb(true); buzz(18); }
  else { btn.classList.add('no'); setFb(false, b.a); buzz([30, 40, 30]); }
  $('#barFill').style.width = `${(i + 1) / qs.length * 100}%`;
  $('#next').textContent = i + 1 < qs.length ? '다음 문제' : '결과 보기';
  $('#next').classList.remove('hide');
}

function next() { i++; if (i < qs.length) show(); else result(); }

function rank(r) {
  if (r === 1) return '1년 생존 확정';
  if (r >= 0.7) return '생존 고수 · 거의 다 봤네';
  if (r >= 0.4) return '반쯤 살아남음';
  return '첫날 탈락… 영상 다시 보고 와';
}

function result() {
  const n = qs.length, perfect = score === n;
  $('#quiz').classList.add('hide'); $('#result').classList.remove('hide');
  const s = $('#score'), sm = el('small', null, `/${n}`); s.replaceChildren(String(score), sm);
  $('#rank').textContent = rank(score / n);
  $('#fan').classList.toggle('hide', !perfect);
  const where = mode === 'all' ? '전체' : mode.no;
  T.ctx = { ep: where }; T.screen('result', { ep: where }); T.ev('result', { ep: where, num: score, num2: n, ok: perfect });
  if (perfect) buzz([40, 60, 40, 60, 120]);
  render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 댓글 문구: 사람마다 문장이 조금씩 달라지게(같은 글이 한꺼번에 달리지 않게) 첫 줄을 여러 개 중에서 고른다
const OPENERS = ['🪐 행성 퀴즈', '🪐 생존 퀴즈 결과', '🌏 행성 퀴즈 풀고 옴', '🪐 퀴즈 해 봤는데'];
let opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
function comment() {
  const n = $('#pname').value.trim(), d = $('#pdesc').value.trim().replace(/\s+/g, ' ');
  const where = mode === 'all' ? '전체' : mode.no;
  let t = `${opener} (${where}) ${score}/${qs.length}`;
  if (score === qs.length) t += ' 🏅 주인장 공인 광팬';
  t += `\n내가 살고 싶은 행성: ${n || '(행성 이름)'}`;
  if (d) t += `\n${d}`;
  return t;
}
function render() { $('#c1').textContent = $('#pname').value.length; $('#c2').textContent = $('#pdesc').value.length; $('#preview').textContent = comment(); }
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), Math.max(2600, m.length * 110)); }
async function copy(which) {
  if (!$('#pname').value.trim()) { T.ev('copy_fail', { el: which }); toast('행성 이름부터 써 줘'); $('#pname').focus(); return false; }
  T.ev('copy', { el: which, num: $('#pname').value.length, num2: $('#pdesc').value.length });
  const text = comment();
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch { /* 복사 실패는 아래 안내로 알린다 */ } ta.remove(); }
  return true;
}
// 댓글 갈 곳: 고른 편의 릴스. 전체 도전이면 가장 최신 편.
const target = () => (mode && mode !== 'all' && mode.reel) || (EPS[0] && EPS[0].reel) || PROFILE;

$('#all').onclick = () => window.followGate(ASK, () => start('all'), 'all');
// 프로필로 넘어갔다 같은 창으로 돌아온 경우 고른 편부터 이어서
{ const k = window.followGate.pending(); const ep = k === 'all' ? 'all' : EPS.find(e => e.no === k); if (ep) start(ep); }
$('#next').onclick = next;
$('#again').onclick = () => { opener = OPENERS[Math.floor(Math.random() * OPENERS.length)]; start(mode); };
$('#home').onclick = () => { T.ctx = {}; T.screen('start'); $('#result').classList.add('hide'); $('#quiz').classList.add('hide'); $('#start').classList.remove('hide'); window.scrollTo({ top: 0 }); };
$('#pname').oninput = render; $('#pdesc').oninput = render;
$('#copyOnly').onclick = async () => { if (await copy('copyOnly')) toast('복사했어! 인스타 댓글창에 붙여 넣어 줘'); };
$('#copyGo').onclick = async () => { if (await copy('copyGo')) {
  // DM에서 연 창(아이폰 인스타 앱)에선 앱으로 못 넘긴다(11-23 실측) — 창 닫고 붙여 넣으라고만 안내. 그 밖은 applink.js가 앱으로 시도
  if (window.openIG && window.openIG.guideOnly) { toast('복사했어! 왼쪽 위 ✕로 창 닫고 그 영상 댓글창에 붙여 넣어 줘'); return; }
  toast('복사했어! 댓글창에 붙여 넣어 줘'); setTimeout(() => { const u = target(); if (!(window.openIG && window.openIG(u))) location.href = u; }, 900); } };
