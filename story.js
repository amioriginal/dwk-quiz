'use strict';
// 사연 신청 — 글은 저장하지 않는다. 복사해서 사용자가 직접 댓글/DM으로 보낸다.
const EPS = window.QUIZ_DATA || [];
const T = window.T || { ev() {}, screen() {} }; // 활동 기록(track.js). 글 내용은 보내지 않는다
const PROFILE = 'https://www.instagram.com/dontwannaknow.kr/';
const DM_URL = 'https://ig.me/m/dontwannaknow.kr'; // 인스타 공식 DM 바로가기 주소
const $ = s => document.querySelector(s);
const OPENERS = ['🪐 행성 제안', '🪐 내가 만든 행성', '🌏 이런 행성 어때', '🪐 행성 하나 만들어 봤어'];
const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];

function text() {
  const n = $('#pname').value.trim(), d = $('#pdesc').value.trim().replace(/\s+/g, ' '), r = $('#prule').value.trim().replace(/\s+/g, ' ');
  let t = `${opener}: ${n || '(행성 이름)'}`;
  if (d) t += `\n${d}`;
  if (r) t += `\n절대 하면 안 되는 것: ${r}`;
  return t;
}
function render() {
  $('#c1').textContent = $('#pname').value.length; $('#c2').textContent = $('#pdesc').value.length; $('#c3').textContent = $('#prule').value.length;
  $('#preview').textContent = text();
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
async function copy(which) {
  if (!$('#pname').value.trim()) { T.ev('copy_fail', { el: which, num: 1 }); toast('행성 이름부터 써 줘'); $('#pname').focus(); return false; }
  if (!$('#pdesc').value.trim()) { T.ev('copy_fail', { el: which, num: 2 }); toast('어떤 행성인지 한 줄만 써 줘'); $('#pdesc').focus(); return false; }
  T.ev('copy', { el: which, num: $('#pname').value.length, num2: $('#pdesc').value.length, ms: $('#prule').value.length });
  const t = text();
  try { await navigator.clipboard.writeText(t); }
  catch { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch { /* 실패해도 아래 안내 문구로 직접 복사하게 한다 */ } ta.remove(); }
  return true;
}
const go = url => setTimeout(() => { if (!(window.openIG && window.openIG(url))) location.href = url; }, 900); // 인스타 앱으로 바로(applink.js)
['#pname', '#pdesc', '#prule'].forEach(s => { $(s).oninput = render; });
$('#toComment').onclick = async () => { if (await copy('toComment')) { toast('복사했어! 최신 영상 댓글창에 붙여 넣어 줘'); go((EPS[0] && EPS[0].reel) || PROFILE); } };
$('#toDm').onclick = async () => { if (await copy('toDm')) { toast('복사했어! DM창에 붙여 넣어 줘'); go(DM_URL); } };
render();
// 쓰기 전에 팔로우 부탁 한 번(확인은 못 하고 고르게만 한다)
window.followGate({ lead: '사연 쓰기 전 팔로우는\n주인장에게 큰 힘이 돼!!', yes: '팔로우하고 쓰기', no: '그냥 쓰기ㅠㅠ' }, () => T.screen('story'), null);
