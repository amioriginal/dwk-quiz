/* dwk-chat.js — 모든 화면 오른쪽 아래에 떠 있는 「다 같이 수다」(2026-11-28)
   대표 원문(11-28): 「픽세처럼 채팅방도 만드는게 좋을듯한데」 · 「픽세 광장 채팅방 말고 사이트 초입에 채팅방 들어가는거 있을거야 아마」
   본보기: 픽세 [수다 NEW!] → 「다 같이 수다」 전체 채팅(../../돈워너노우_픽세분석_20261123/REPORT.md:62 · 원자료/site/index.html chat-fab·chat-sheet)
   쓰는 법: 화면 HTML 끝에 <script type="module" src="dwk-chat.js?v=4"></script> 한 줄. 스타일(dwk-chat.css)은 이 파일이 붙인다.

   서버: 새 서버 없음. 광장과 같은 Cloudflare 방 서버(dwk-net.js wsRoom · data.js world.realtime)의 방 「lounge」를 쓴다.
     - 서버는 글을 저장하지 않는다(메모리만) → 지난 글은 「이 기기에서 본 최근 24시간」만 보여 준다. 숫자는 「지금 접속」 실제 수만(가짜 숫자 금지 IMM-1).
     - 서버는 chat 에 {text, name} 만 넘겨준다 → 좌석 번호는 이름 끝에 「#1225」로 붙여 보내고 받는 쪽이 떼어 낸다(서버 수정 없음).
     - 채팅 기록은 dwk-net.js 가 하던 대로 Supabase chat_log 에도 남는다(로그인 주민만 · 신고 대응용).
   시험 모드: 내 컴퓨터(localhost·127.0.0.1)에서 열면 기본이 「이 기기」 모드 = 같은 브라우저의 다른 탭끼리만(BroadcastChannel).
     실서버에 시험 글이 올라가지 않게 하려는 기본값이다. 내 컴퓨터에서 실서버로 붙으려면 ?chat=live, 공개 주소에서 시험하려면 ?chat=local.
   쓸 수 있는 사람: 광장(world.js canTalk)과 같다 — 캐릭터가 있고 · 만 14세 이상 · 채팅 규칙 동의(profile.over14 · profile.agree.chat). 아니면 읽기만.
   안전: 욕설은 ♡로 가림 · 연락처·링크·다른 메신저 막음(world.js BAD·CONTACT 와 같은 목록) · 도배(1.2초 간격 · 같은 말 반복 · 30초 6번) 막음 ·
     남이 보낸 글도 같은 거름을 한 번 더 거친다 · 운영자 사칭 이름은 「주민」으로 · 가리기(이 기기에서만 그 사람 글 숨김).
   운영자 답(2026-11-28 대표 「운영자 답 기능도 서버에 넣어줘」): 서버가 운영자 열쇠(Cloudflare 비밀값 STAFF_KEY)를 확인한 연결의 글에만
     staff 표시를 붙인다 → 이 화면은 그 표시만 믿고 노란 「운영자」 글로 그린다(이름이 「운영자」인 것만으론 안 믿는다).
     운영자는 입력칸에 「/운영자 열쇠」를 치면 이 기기가 운영자 모드가 된다(열쇠는 이 기기 저장소에만 · 「/운영자 끄기」로 지움).
     운영자 모드에선 남의 글마다 [답] 단추가 생기고, 답은 「↳ 누구: 무슨 글」을 달고 간다. 서버가 최근 운영자 글 10개를 기억해 늦게 온 사람에게도 준다.
     운영자 열쇠·답 표시는 Cloudflare 방 서버에서만 된다(시험 모드·Supabase 방은 안 됨). */

const D = window.DWK || {};
const Q = new URLSearchParams(location.search);
const LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const TEST = Q.get('chat') === 'local' || (LOCALHOST && Q.get('chat') !== 'live');
const ROOM = 'lounge';
const DAY = 24 * 3600 * 1000, KEEP = 80, MAX_LEN = 60;

// 저장: dwk-core.js DC.store 와 같은 열쇠(dwk_ 접두) — start.html 처럼 dwk-core 를 안 부르는 화면에서도 같은 값을 읽는다
const ls = {
  get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); } catch (e) { console.warn('수다: 이 기기에 저장 못 함', e); } },
};

// 캐릭터 이름 = 단어 두 개(dwk-char.js ADJ·NOUN 과 같은 순서 — 캐릭터 코드 15바이트가 이 순서에 묶여 있어 바뀌지 않는다)
const ADJ = ['겁 없는', '졸린', '수상한', '배고픈', '느긋한', '용감한', '수줍은', '엉뚱한', '반짝이는', '조용한', '시끄러운', '행운의', '말랑한', '꿈꾸는', '까칠한', '다정한'];
const NOUN = ['감자', '펭귄', '고양이', '우주인', '탐험가', '요리사', '방랑자', '두더지', '토끼', '다람쥐', '곰', '반딧불', '눈사람', '해바라기', '로봇', '외계인'];
const myName = () => { const c = ls.get('char', null); const n = c && Array.isArray(c.n) ? c.n : null; return n ? `${ADJ[n[0]] || '이름 없는'} ${NOUN[n[1]] || '주민'}` : null; };

// 거름(world.js:534~537 과 같은 목록 · 고치면 둘 다 고친다)
const BAD = ['시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅄ', 'ㅂㅅ', '좆', '존나', '졸라', '지랄', '개새', '새끼', '미친놈', '미친년', '닥쳐', '꺼져', '느금', '니애미', 'fuck', 'shit', 'bitch', '섹스', 'sex', '야동', '자살', '죽어'];
const CONTACT = /(\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4})|(https?:\/\/|www\.|\.com\b|\.kr\b|\.net\b|\.gg\b)|(카톡|오픈채팅|오카|kakao|텔레|telegram|디코|discord|라인\s?아이디|인스타\s?아이디|dm\s?줘|번호\s?줘)/i;
function clean(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN); if (!t) return { ok: false };
  if (CONTACT.test(t)) return { ok: false, msg: '연락처·링크·다른 메신저 얘기는 못 보내. 안전 규칙이야' };
  let out = t; for (const w of BAD) out = out.split(w).join('♡'.repeat(Math.min(3, w.length))); return { ok: true, text: out };
}
const STAFF = /운영자|관리자|돈워너노우|dontwannaknow|공지|staff|admin/i;

// 좌석 번호(1~100,000) — 릴스 댓글에 적은 자리 번호를 스스로 적는다. 좌석 배정(제작/tools/좌석_배정.py)이 사이트에 이어지면 그 값으로 바꾼다
const seatOk = (v) => { v = Math.floor(+v); return v >= 1 && v <= 100000 ? v : null; };
const seatTxt = (v) => 'No.' + String(v).padStart(6, '0');
const wire = (name, seat) => seat ? `${name}#${seat}` : name;               // 서버 이름 칸 최대 24자 — 이름(최대 약 11자) + #6자리 안에 든다
const unwire = (s) => { const m = String(s || '').match(/^(.*?)#(\d{1,6})$/); const seat = m ? seatOk(m[2]) : null; return { name: (m ? m[1] : String(s || '')).slice(0, 16) || '주민', seat }; };

// 운영자 공지(맨 위 고정) — data.js DWK.chat.notice 가 있으면 그걸 쓴다. 실시간 운영자 답은 아래 「운영자」(서버가 확인한 연결만)
const NOTICE = (D.chat && Array.isArray(D.chat.notice) && D.chat.notice.length) ? D.chat.notice : [
  '돈워너노우호 탑승객 라운지야. 이름 옆 번호는 각자 적은 좌석 번호야.',
  '욕설·연락처·링크·광고는 못 보내. 어기면 채팅이 막혀.',
];

// ───────── 화면 ─────────
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };
const ICON = '<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><path fill="currentColor" d="M2 1h8v1h1v6h-1v1H6v1H5v1H4V9H2V8H1V2h1zM2 2v6h3v1h1V8h4V2z"/><path fill="currentColor" d="M3 4h1v1H3zM5 4h1v1H5zM7 4h1v1H7z"/></svg>';

const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('dwk-chat.css?v=6', import.meta.url).href; document.head.append(css);

// 11-28 대표 「수다도 클릭하면 준비중으로 뜨게 만들고. 그리고 수다라고 적지말고 좀 세련된 단어로 바꿔」 → 이름 「라운지」(서버 방 이름도 lounge) · 지금은 준비 중 안내만.
//   실제 대화방은 그대로 두고 ?lounge=1 일 때만 연다(작업자 시험용 · 화면 어디에도 이 길을 걸지 않는다).
const SOON = Q.get('lounge') !== '1';
const fab = h('button', { class: 'dch-fab', id: 'dchFab', type: 'button', 'aria-label': SOON ? '라운지 — 준비 중' : '라운지 열기', 'aria-controls': 'dchSheet', 'aria-expanded': 'false' });
fab.innerHTML = ICON + '<span class="dch-fab-t">라운지</span>'; const newTag = h('span', { class: 'dch-new', 'aria-hidden': 'true' }, '새로'); fab.append(newTag);
newTag.hidden = SOON || !!ls.get('chat_opened', false);
const soonTip = h('p', { class: 'dch-soon', role: 'status', 'aria-live': 'polite', hidden: true }, h('b', {}, '라운지'), h('span', {}, '준비 중이야. 곧 열게.'));

const live = h('span', { class: 'dch-live', id: 'dchLive' }, '연결 전');
const xBtn = h('button', { class: 'dch-x', type: 'button', 'aria-label': '라운지 닫기' }, '✕');
const msgs = h('ol', { class: 'dch-msgs', id: 'dchMsgs', 'aria-live': 'polite', 'aria-label': '라운지 글' });
const pins = h('ul', { class: 'dch-pins', 'aria-label': '운영자 공지' }, NOTICE.map(t => h('li', {}, h('b', {}, '운영자 공지'), h('span', {}, t))));
const seatBtn = h('button', { class: 'dch-seat', type: 'button', 'aria-label': '내 좌석 번호 적기' });
const input = h('input', { class: 'dch-input', id: 'dchInput', maxlength: String(MAX_LEN), autocomplete: 'off', enterkeyhint: 'send', placeholder: '라운지에 한마디…', 'aria-label': '라운지 입력' });
const sendBtn = h('button', { class: 'dch-send', type: 'submit', 'aria-label': '보내기' }, '보내기');
const form = h('form', { class: 'dch-in', autocomplete: 'off' }, seatBtn, input, sendBtn);
const lock = h('div', { class: 'dch-lock', hidden: true });
const err = h('p', { class: 'dch-err', role: 'status', hidden: true });
const seatForm = h('form', { class: 'dch-seatf', hidden: true },
  h('label', { for: 'dchSeatIn' }, '댓글에 적은 좌석 번호', h('small', {}, '1~100,000')),
  h('div', { class: 'dch-row' }, h('input', { id: 'dchSeatIn', inputmode: 'numeric', maxlength: '6', autocomplete: 'off', placeholder: '예: 1225' }), h('button', { class: 'dch-send', type: 'submit' }, '저장'), h('button', { class: 'dch-ghost', type: 'button', onclick: () => { seatForm.hidden = true; } }, '취소')));
const note = h('p', { class: 'dch-note' }, TEST ? '시험 모드 · 같은 브라우저의 다른 탭끼리만 보여' : '지난 글은 이 기기에서 본 최근 24시간만 보여');
const staffPins = h('ul', { class: 'dch-pins dch-spins', hidden: true, 'aria-label': '최근 운영자 답' });
const replyTxt = h('span', {}); const replyBar = h('div', { class: 'dch-reply', hidden: true }, replyTxt, h('button', { class: 'dch-ghost', type: 'button', 'aria-label': '답 취소', onclick: () => setReply(null) }, '✕'));
const sheet = h('section', { class: 'dch-sheet', id: 'dchSheet', hidden: true, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'dchT' },
  h('div', { class: 'dch-top' }, h('b', { id: 'dchT' }, '라운지'), live, xBtn),
  pins, staffPins, msgs, note, err, lock, seatForm, replyBar, form);
document.body.append(fab, sheet, soonTip);
document.body.classList.add('has-dch');

// ───────── 상태 ─────────
let hist = (ls.get('chat_hist', []) || []).filter(m => m && Date.now() - m.at < DAY).slice(-KEEP);
let hidden = new Set(ls.get('chat_hide', []) || []);
let room = null, joinedName = '', connecting = null, leaveT = 0, canTalk = false, profile = null, isOpen = false, unread = 0;
let isStaff = false, replyTo = null; // 운영자 모드(서버가 열쇠를 확인한 뒤에만 true) · 답할 글 {name, text}
const sent = []; let lastSay = 0, coolUntil = 0; const per = new Map(); // 도배: 내가 보낸 시각·글 / 남의 글 수(보낸 사람별 30초)

const fmt = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
function paintSeat() { const s = seatOk(ls.get('seat', null)); seatBtn.textContent = s ? seatTxt(s) : '좌석 ?'; seatBtn.classList.toggle('none', !s); }
const reQ = (re) => re ? h('q', { class: 'dch-re' }, `↳ ${re.name || '주민'}: ${re.text}`) : null;
function row(m) {
  const who = m.name + (m.seat ? '#' + m.seat : '');
  const li = h('li', { class: 'dch-m' + (m.mine ? ' mine' : '') + (m.sys ? ' sys' : '') + (m.staff ? ' staff' : '') });
  if (m.sys) { li.append(h('span', {}, m.text)); return li; }
  const tag = m.staff ? h('span', { class: 'dch-no dch-staff' }, '운영자') : h('span', { class: 'dch-no' + (m.seat ? '' : ' none') }, m.seat ? seatTxt(m.seat) : '좌석 ?');
  const nm = m.mine ? h('b', {}, m.name, h('small', {}, ' (나)')) : m.staff ? h('b', {}, '운영자') : h('button', { class: 'dch-name', type: 'button', title: '이 주민 글 가리기', onclick: () => hide(who, m.name) }, m.name);
  const ans = isStaff && !m.mine && !m.staff ? h('button', { class: 'dch-ans', type: 'button', 'aria-label': `${who}에게 답하기`, onclick: () => setReply({ name: who, text: m.text }) }, '답') : null;
  li.append(...[h('div', { class: 'dch-who' }, tag, nm, h('time', {}, fmt(m.at)), ans), reQ(m.re), h('p', {}, m.text)].filter(Boolean)); // 답 인용이 없으면 빼고 붙인다
  return li;
}
function setReply(r) { replyTo = r; replyBar.hidden = !r; replyTxt.textContent = r ? `↳ ${r.name}에게 답: ${r.text.slice(0, 30)}` : ''; if (r) input.focus(); }
function paintStaffLog(log) { // 서버가 기억하는 최근 운영자 글 — 맨 위 공지 아래 최근 3개
  const seen = new Set(); const l = (Array.isArray(log) ? log : []).filter(x => x && typeof x.text === 'string').reverse().filter(x => { const k = x.text + '|' + (x.re ? x.re.name + x.re.text : ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3); // 같은 답이 두 번 저장돼 있으면 한 번만
  staffPins.hidden = !l.length; staffPins.replaceChildren(...l.map(x => h('li', {}, h('b', {}, '운영자 답'), h('span', {}, reQ(x.re), String(x.text).slice(0, 120)))));
}
function paint() {
  msgs.replaceChildren(...(hist.filter(m => !hidden.has(m.name + (m.seat ? '#' + m.seat : ''))).map(row)));
  if (!hist.length) msgs.append(h('li', { class: 'dch-m sys' }, h('span', {}, '아직 조용해. 먼저 인사해 봐!')));
  msgs.scrollTop = msgs.scrollHeight;
}
function push(m) {
  hist.push(m); if (hist.length > KEEP) hist = hist.slice(-KEEP); ls.set('chat_hist', hist.filter(x => !x.sys));
  if (hidden.has(m.name + (m.seat ? '#' + m.seat : ''))) return;
  const stick = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 60;
  msgs.querySelector('.dch-m.sys:only-child')?.remove(); msgs.append(row(m)); if (stick || m.mine) msgs.scrollTop = msgs.scrollHeight;
  if (!isOpen && !m.mine) { unread++; newTag.hidden = false; newTag.textContent = unread > 9 ? '9+' : String(unread); }
}
function hide(key, name) { if (!confirm(`「${name}」 글을 이 기기에서 가릴까?`)) return; hidden.add(key); ls.set('chat_hide', [...hidden].slice(-200)); paint(); }
function showErr(t) { err.textContent = t; err.hidden = !t; if (t) setTimeout(() => { if (err.textContent === t) err.hidden = true; }, 3500); }
function paintLive() { if (!room) return; const n = Math.max(1, room.count?.() || 1); live.textContent = (TEST ? '이 기기 시험 · ' : '') + (isStaff ? '운영자 모드 · ' : '') + (n > 1 ? `지금 ${n}명` : '지금 나 혼자'); live.classList.toggle('off', room.live === false); }
function paintLock() {
  const hasChar = !!ls.get('char', null); const ok = canTalk || isStaff;
  // 주소 끝 #staff = 캐릭터 없는 운영자 기기에서도 「/운영자 열쇠」를 칠 칸을 연다(글은 열쇠 확인 뒤에만 나감)
  form.hidden = !ok && !(location.hash === '#staff' && !TEST); lock.hidden = ok; lock.replaceChildren(); seatBtn.hidden = isStaff; input.maxLength = isStaff ? 120 : MAX_LEN;
  if (ok) return;
  if (!hasChar) lock.append(h('p', {}, '캐릭터를 만들고 주민 등록을 하면 같이 이야기할 수 있어. 지금은 읽기만 돼.'), h('a', { class: 'dch-go', href: 'maker.html?flow=join' }, '내 캐릭터 만들기'));
  else lock.append(h('p', {}, '라운지는 주민 등록(만 14세 이상 · 채팅 규칙 동의) 뒤에 열려. 지금은 읽기만 돼.'), h('a', { class: 'dch-go', href: 'world.html?join=1' }, '주민 등록하기'));
}

// ───────── 연결 ─────────
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); }); }
async function getNet() {
  if (!window.__dwkNetP && (document.body.classList.contains('world') || document.body.classList.contains('town'))) for (let i = 0; i < 25 && !window.__dwkNetP; i++) await new Promise(r => setTimeout(r, 200)); // 광장·타운은 화면이 만든 연결을 같이 쓴다(연결 두 개 금지)
  if (window.__dwkNetP) return window.__dwkNetP;
  if (!window.DC) await loadScript(new URL('dwk-core.js?v=5', import.meta.url).href); // start.html 은 dwk-core 를 안 부른다
  const m = await import('./dwk-net.js?v=8'); const p = m.createNet(); window.__dwkNetP = p; return p;
}
function localRoom() { // 시험 모드: 같은 브라우저 탭끼리만(dwk-net.js localNet room 과 같은 약속)
  const ch = 'BroadcastChannel' in window ? new BroadcastChannel('dwk-chat-' + ROOM) : null; const tab = Math.random().toString(36).slice(2, 10);
  const peers = new Map(); const cbs = { peer: [], leave: [], chat: [], msg: [] }; let me = null;
  const emit = (e, d) => cbs[e].forEach(f => { try { f(d); } catch (x) { console.error(x); } });
  const send = (o) => { try { ch?.postMessage({ ...o, from: tab }); } catch (x) { console.warn('수다 시험 신호를 못 보냄', x); } };
  if (ch) ch.onmessage = ({ data: m }) => { if (!m || m.from === tab) return; if (m.t === 'hi') { peers.set(m.from, Date.now()); emit('peer', { id: m.from, name: m.name }); if (m.ask) send({ t: 'hi', name: me?.name }); } else if (m.t === 'bye') { peers.delete(m.from); emit('leave', { id: m.from }); } else if (m.t === 'chat') { peers.set(m.from, Date.now()); emit('chat', { id: m.from, text: m.text, name: m.name }); } };
  const beat = setInterval(() => { const now = Date.now(); for (const [id, t] of peers) if (now - t > 7000) { peers.delete(id); emit('leave', { id }); } if (me) send({ t: 'hi', name: me.name }); }, 2500);
  addEventListener('pagehide', () => send({ t: 'bye' }));
  return { join(m) { me = m; send({ t: 'hi', name: m.name, ask: true }); }, update(m) { me = { ...me, ...m }; }, say(text) { send({ t: 'chat', text, name: me?.name }); }, leave() { send({ t: 'bye' }); clearInterval(beat); ch?.close(); }, on(e, f) { cbs[e]?.push(f); }, count: () => peers.size + 1, live: !!ch };
}
// 실서버 수다방: Cloudflare 방 서버에 직접 붙는다. dwk-net.js wsRoom 은 광장용이라 staff·re·staffLog 를 버리므로 수다방만 이 작은 연결을 쓴다
// (약속은 같다: hi·chat·up·bye + staff). 끊기면 3번까지만 다시 붙는다(1·2·3초 뒤 · 무한 재시도 금지). 정원이 차면 lounge-2 … 로.
function wsLounge(base, logChat) {
  const cbs = { peer: [], leave: [], chat: [], msg: [], staff: [], log: [] };
  const emit = (e, d) => cbs[e].forEach(f => { try { f(d); } catch (x) { console.error(x); } });
  const id = 'c' + Math.random().toString(36).slice(2, 12);
  let ws = null, me = null, key = null, count = 1, closed = false, tries = 0, sub = 0, alive = true;
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function open() {
    ws = new WebSocket(`${base.replace(/\/$/, '')}/room/${sub ? `${ROOM}-${sub + 1}` : ROOM}?id=${id}`);
    ws.onopen = () => { tries = 0; alive = true; if (key) send({ t: 'staff', key }); if (me) send({ t: 'hi', me }); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.t === 'welcome') { count = m.n || 1; emit('log', m.staffLog); emit('peer', {}); }
      else if (m.t === 'peer') { if (m.n) count = m.n; emit('peer', m); }
      else if (m.t === 'leave') { if (m.n != null) count = Math.max(1, m.n); emit('leave', m); }
      else if (m.t === 'chat') emit('chat', m);
      else if (m.t === 'staff') { if (!m.ok) key = null; emit('staff', !!m.ok); }
      else if (m.t === 'full') sub++;
    };
    ws.onclose = (e) => {
      count = 1; emit('leave', {}); if (closed) return;
      if (e.code === 4001 && sub < 5) { open(); return; }
      if (e.code === 4003) { emit('staff', false); } // 열쇠 3번 틀림 → 서버가 끊음. 열쇠 없이 다시 붙는다
      if (tries < 3) { tries++; setTimeout(() => { if (!closed) open(); }, 1000 * tries); return; }
      alive = false; emit('leave', {}); showErr('라운지 연결이 끊겼어. 닫았다 다시 열면 붙어');
    };
    ws.onerror = () => { /* onclose 가 이어서 처리한다 */ };
  }
  return {
    join(m) { me = { code: m.code, name: m.name, st: m.st }; if (!ws) open(); else send({ t: 'hi', me }); },
    update(m) { me = { ...me, ...m }; send({ t: 'up', me: { code: me.code, name: me.name } }); },
    say(text, re) { send({ t: 'chat', text, name: me?.name, re: re || undefined }); logChat?.(text); },
    staff(k) { key = k; if (ws && ws.readyState === 1) send({ t: 'staff', key: k }); else if (!ws) open(); },
    leave() { closed = true; send({ t: 'bye' }); try { ws?.close(1000, 'bye'); } catch (x) { /* 이미 닫힘 */ } },
    on(e, f) { cbs[e]?.push(f); },
    count: () => count,
    get live() { return alive; },
    canStaff: true,
  };
}
async function connect() {
  if (room) return room; if (connecting) return connecting;
  connecting = (async () => {
    live.textContent = '연결 중…';
    let net = null;
    if (TEST) profile = ls.get('profile', null);
    else { try { net = await getNet(); profile = await net.profile.get(); } catch (e) { console.error('수다: 서버 연결 실패', e); showErr('서버에 못 붙었어. 잠시 뒤 다시 열어 줘'); live.textContent = '연결 안 됨'; connecting = null; return null; } }
    canTalk = !!ls.get('char', null) && !!profile?.over14 && !!profile?.agree?.chat; paintLock();
    const r = TEST ? localRoom() : net.rt ? wsLounge(net.rt, (text) => net.logChat?.(ROOM, text)) : net.room(ROOM);
    r.on('chat', onChat); r.on('peer', paintLive); r.on('leave', paintLive); r.on('log', paintStaffLog);
    r.on('staff', (ok) => { const was = isStaff; isStaff = ok; if (!ok) { if (ls.get('staff_key', null)) { ls.set('staff_key', null); showErr('운영자 열쇠가 맞지 않아. 이 기기에서 지웠어'); } } else if (!was) showErr('운영자 모드야. 주민 글의 [답]으로 답할 수 있어'); paintLock(); paintLive(); paint(); });
    const k = ls.get('staff_key', null); if (k && r.canStaff) r.staff(k);
    const nm = canTalk ? (myName() || '주민') : '구경꾼';
    joinedName = wire(nm, canTalk ? seatOk(ls.get('seat', null)) : null);
    r.join({ code: '', name: joinedName, st: { x: 0, z: 0, r: 0 } });
    room = r; connecting = null; paintLive(); setTimeout(paintLive, 1500); return r;
  })();
  return connecting;
}
function onChat(m) {
  const now = Date.now(); const k = String(m.id || '');
  if (m.staff) { const text = String(m.text || '').trim().slice(0, 120); if (!text) return; const re = m.re && typeof m.re.text === 'string' ? { name: String(m.re.name || '').slice(0, 24), text: m.re.text.slice(0, 60) } : null; push({ id: k, name: '운영자', staff: true, re, text, at: now }); return; } // 서버가 확인한 운영자 글만 staff 가 붙는다
  const c = clean(m.text); if (!c.ok) return;
  const a = (per.get(k) || []).filter(t => now - t < 30000); a.push(now); per.set(k, a); if (a.length > 6) return; // 남의 도배는 이 화면에서 버린다
  let { name, seat } = unwire(m.name); if (STAFF.test(name)) name = '주민';
  push({ id: k, name, seat, text: c.text, at: now }); paintLive();
}
function staffCmd(text) { // 「/운영자 열쇠」 · 「/운영자 끄기」 — 글로 보내지 않는다
  const m = String(text).trim().match(/^\/운영자(?:\s+(.+))?$/); if (!m) return false;
  const arg = (m[1] || '').trim();
  if (!arg || arg === '끄기') { ls.set('staff_key', null); if (isStaff && room) { room.leave(); room = null; isStaff = false; setReply(null); paintLock(); paint(); connect(); } showErr(arg ? '운영자 모드를 껐어' : '「/운영자 열쇠」로 켜'); return true; }
  if (TEST || !room?.canStaff) { showErr('운영자 모드는 실서버 라운지에서만 돼'); return true; }
  ls.set('staff_key', arg); room.staff(arg); return true;
}
function say(text) {
  if (staffCmd(text)) return true;
  if (isStaff) return staffSay(text);
  if (!canTalk) { paintLock(); return false; }
  if (!room) { showErr('아직 연결 중이야. 잠깐만!'); return false; }
  const now = Date.now();
  if (now < coolUntil) { showErr(`너무 빨라! ${Math.ceil((coolUntil - now) / 1000)}초 뒤에 다시 보내 줘`); return false; }
  if (now - lastSay < 1200) { showErr('조금만 천천히!'); return false; }
  const c = clean(text); if (!c.ok) { if (c.msg) showErr(c.msg); return false; }
  const recent = sent.filter(s => now - s.at < 30000);
  if (recent.filter(s => s.text === c.text).length >= 2) { showErr('같은 말을 계속 보내면 도배야. 다른 말로 해 줘'); return false; }
  if (recent.length >= 6) { coolUntil = now + 20000; showErr('30초에 6번까지야. 20초 쉬었다 보내 줘'); return false; }
  sent.push({ at: now, text: c.text }); while (sent.length > 20) sent.shift(); lastSay = now; showErr('');
  const w = wire(myName() || '주민', seatOk(ls.get('seat', null))); if (w !== joinedName) { room.update?.({ name: w }); joinedName = w; } // 다른 탭에서 좌석 번호를 바꿨어도 보낼 때의 값으로
  room.say(c.text); window.DP?.event?.('chat');
  push({ id: 'me', name: myName() || '주민', seat: seatOk(ls.get('seat', null)), text: c.text, at: now, mine: true }); return true;
}
function staffSay(text) { // 운영자: 링크(공식 주소 안내 등)는 막지 않는다 · 글자 수 120 · 간격 1.2초만
  if (!room) { showErr('아직 연결 중이야. 잠깐만!'); return false; }
  const now = Date.now(); if (now - lastSay < 1200) { showErr('조금만 천천히!'); return false; }
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return false;
  lastSay = now; showErr(''); const re = replyTo;
  room.say(t, re); push({ id: 'me', name: '운영자', staff: true, mine: true, re, text: t, at: now }); setReply(null); return true;
}

// ───────── 열기·닫기 ─────────
function open() {
  clearTimeout(leaveT); isOpen = true; unread = 0; sheet.hidden = false; fab.setAttribute('aria-expanded', 'true'); document.body.classList.add('dch-open');
  ls.set('chat_opened', true); newTag.hidden = true; newTag.textContent = '새로'; paint(); paintSeat();
  connect().then(() => { if (canTalk && matchMedia('(hover: hover) and (pointer: fine)').matches) input.focus(); });
}
function close() {
  isOpen = false; sheet.hidden = true; fab.setAttribute('aria-expanded', 'false'); document.body.classList.remove('dch-open'); input.blur();
  clearTimeout(leaveT); leaveT = setTimeout(() => { if (!isOpen && room) { room.leave(); room = null; live.textContent = '연결 전'; } }, 120000); // 닫고 2분 지나면 방에서 나간다(서버 부담)
  fab.focus();
}
let soonT = 0;
function soon() { soonTip.hidden = false; soonTip.classList.remove('pop'); void soonTip.offsetWidth; soonTip.classList.add('pop'); clearTimeout(soonT); soonT = setTimeout(() => { soonTip.hidden = true; }, 2600); }
fab.addEventListener('click', () => (SOON ? soon() : open())); xBtn.addEventListener('click', close);
sheet.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); }); // 광장 W·A·S·D·Enter 가 캐릭터로 새지 않게
form.addEventListener('submit', (e) => { e.preventDefault(); if (say(input.value)) input.value = ''; });
seatBtn.addEventListener('click', () => { seatForm.hidden = !seatForm.hidden; if (!seatForm.hidden) { const i = seatForm.querySelector('input'); i.value = seatOk(ls.get('seat', null)) || ''; i.focus(); } });
seatForm.addEventListener('submit', (e) => {
  e.preventDefault(); const i = seatForm.querySelector('input'); const v = seatOk(i.value.replace(/\D/g, ''));
  if (!v) { showErr('좌석 번호는 1부터 100,000까지야'); return; }
  ls.set('seat', v); seatForm.hidden = true; paintSeat();
  if (room && canTalk) { joinedName = wire(myName() || '주민', v); room.update?.({ name: joinedName }); } // 방 약속의 update = 이름 바꾸기(wsRoom 은 서버에 up 신호 · say 는 바뀐 이름으로 보냄)
});
addEventListener('storage', (e) => { if (e.key === 'dwk_seat') paintSeat(); }); // 다른 탭에서 좌석 번호를 바꾸면 이 탭 단추도
paintSeat();
if (!SOON && Q.get('chat') === 'open') open(); // 바로 열린 채로(공유 링크·화면 확인용)
window.__dwkChat = { open, close, get room() { return room; }, get canTalk() { return canTalk; }, test: TEST };
