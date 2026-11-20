'use strict';
// 사연 신청 — 글은 저장하지 않는다. 복사해서 사용자가 직접 댓글/DM으로 보낸다.
const EPS = window.QUIZ_DATA || [];
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
async function copy() {
  if (!$('#pname').value.trim()) { toast('행성 이름부터 써 줘'); $('#pname').focus(); return false; }
  if (!$('#pdesc').value.trim()) { toast('어떤 행성인지 한 줄만 써 줘'); $('#pdesc').focus(); return false; }
  const t = text();
  try { await navigator.clipboard.writeText(t); }
  catch { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch { /* 실패해도 아래 안내 문구로 직접 복사하게 한다 */ } ta.remove(); }
  return true;
}
const go = url => setTimeout(() => { location.href = url; }, 900);
['#pname', '#pdesc', '#prule'].forEach(s => { $(s).oninput = render; });
$('#toComment').onclick = async () => { if (await copy()) { toast('복사했어! 최신 영상 댓글창에 붙여 넣어 줘'); go((EPS[0] && EPS[0].reel) || PROFILE); } };
$('#toDm').onclick = async () => { if (await copy()) { toast('복사했어! DM창에 붙여 넣어 줘'); go(DM_URL); } };
render();
