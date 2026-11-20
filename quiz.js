'use strict';
// 댓글을 달 게시물 — 새 편이 올라오면 이 주소만 바꾼다
const COMMENT_URL = 'https://www.instagram.com/reel/Df8jHbHlaqL/'; // 행성 #5
const TOTAL = 10;
// 정답 = 실제 게시 영상 자막의 생존 규칙 원문
const BANK = [
  { ep:'1편', img:'p01_1', q:'해바라기 행성에서 절대 하면 안 되는 건?', a:'불 켜 두기', w:['코 골기','단 거 먹기'] },
  { ep:'1편', img:'p01_2', q:'온천 행성. 당장 나와야 하는 순간은?', a:'물이 빠지면', w:['물이 뜨거워지면','눈이 그치면'] },
  { ep:'1편', img:'p01_3', q:'쇼핑몰 행성 생존 규칙은?', a:'9시 전에 가게 안으로 들어가', w:['밤엔 침대에서 나오지 마','계산대엔 절대 가지 마'] },
  { ep:'1편', img:'p01_4', q:'반딧불 호수 행성의 함정은?', a:'함정이 없어. 진짜로.', w:['반딧불을 세면 안 돼','밤에 물에 들어가면 안 돼'] },
  { ep:'2편', img:'p02_1', q:'호수 행성에서 절대 하면 안 되는 건?', a:'호수랑 눈 마주치기', w:['호수에서 수영하기','호수 물 마시기'] },
  { ep:'2편', img:'p02_3', q:'하얀 숲이 손을 흔들면?', a:'절대 흔들어 주지 마', w:['같이 흔들어 줘','박수 쳐 줘'] },
  { ep:'3편', img:'p03_1', q:'디저트 행성 생존 규칙은?', a:'단 건 한 입도 먹지 마', w:['해가 지면 집에 들어가','물은 마시지 마'] },
  { ep:'3편', img:'p03_2', q:'물방울 행성. 보름달이 뜨면?', a:'숨을 크게 들이마셔', w:['눈을 꼭 감아','물 밖으로 나와'] },
  { ep:'3편', img:'p03_3', q:'잠든 양 위 구름 행성에서 절대 하면 안 되는 건?', a:'코 골기', w:['큰 소리로 노래하기','뛰어다니기'] },
  { ep:'수능 특별편', img:'sn_1', q:'수능 없는 행성. 여기선 절대…', a:'아프지 마', w:['공부하지 마','바다에 들어가지 마'] },
  { ep:'수능 특별편', img:'sn_2', q:'매일 수능 행성. 듣기 시간엔?', a:'재채기도 참아', w:['귀를 막아','창문을 닫아'] },
  { ep:'수능 특별편', img:'sn_3', q:'수능 한 번 행성의 정체는?', a:'지구', w:['달','화성'] },
  { ep:'5편', img:'p05_1', q:'카피바라 행성 생존 규칙은?', a:'유자는 절대 다 먹지 마', w:['온천에 들어가지 마','다른 동물을 태우지 마'] },
  { ep:'5편', img:'p05_2', q:'뚱냥이 행성. 고양이가 깨어 있으면?', a:'절대 움직이지 마', w:['바로 엎드려','이름을 불러 줘'] },
  { ep:'5편', img:'p05_3', q:'푸바오가 대나무를 먹다가도 고개를 드는 건?', a:'자기를 불러 주던 목소리', w:['대나무 쪼개지는 소리','천둥소리'] },
  { ep:'5편', img:'p05_4', q:'부캉이는 네가 어디 있는지 어떻게 알아?', a:'심장이 뛸 때 나는 작은 전기', w:['냄새','발소리'] },
];
const RANKS = [[10,'1년 생존 확정 · 행성 마스터'],[8,'생존 고수 · 거의 다 봤네'],[5,'반쯤 살아남음'],[0,'첫날 탈락… 영상 다시 보고 와']];
const $ = s => document.querySelector(s);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let qs = [], i = 0, score = 0;

// 시작 화면 행성 10개(편마다 고르게)
['p01_1','p01_3','p02_1','p02_3','p03_2','p03_3','sn_1','sn_3','p05_1','p05_4'].forEach(k => { const im = new Image(); im.src = `img/${k}.jpg`; im.alt = ''; $('#startGrid').append(im); });
BANK.forEach(b => { const im = new Image(); im.src = `img/${b.img}.jpg`; }); // 미리 받아 두기

function setFb(ok,ans){const f=$('#fb');f.replaceChildren();const b=document.createElement('b');if(ok){b.textContent='정답!';f.append(b,' 살아남았어.');}else{b.textContent=ans;f.append('땡. 정답은 ',b);}}
function start() {
  // 편마다 최소 1문제가 들어가게 고른 뒤 나머지는 무작위
  const byEp = {}; BANK.forEach(b => (byEp[b.ep] ||= []).push(b));
  const pick = Object.values(byEp).map(list => shuffle([...list])[0]);
  const rest = shuffle(BANK.filter(b => !pick.includes(b))).slice(0, TOTAL - pick.length);
  const order = ['1편','2편','3편','수능 특별편','5편'];
  qs = [...pick, ...rest].sort((a, b) => order.indexOf(a.ep) - order.indexOf(b.ep));
  i = 0; score = 0;
  $('#start').classList.add('hide'); $('#result').classList.add('hide'); $('#quiz').classList.remove('hide');
  show();
}
function show() {
  const b = qs[i];
  $('#qno').textContent = `${i + 1}/${TOTAL}`; $('#barFill').style.width = `${i / TOTAL * 100}%`;
  $('#ep').textContent = b.ep; $('#qimg').src = `img/${b.img}.jpg`; $('#qtext').textContent = b.q;
  $('#fb').replaceChildren(); $('#next').classList.add('hide');
  const box = $('#opts'); box.replaceChildren();
  shuffle([b.a, ...b.w]).forEach(t => {
    const o = document.createElement('button'); o.className = 'opt'; o.textContent = t;
    o.onclick = () => pick(o, t === b.a); box.append(o);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function pick(el, ok) {
  const b = qs[i];
  document.querySelectorAll('.opt').forEach(o => { o.disabled = true; if (o.textContent === b.a) o.classList.add('ok'); });
  if (ok) { score++; setFb(true); if (navigator.vibrate) navigator.vibrate(18); }
  else { el.classList.add('no'); setFb(false, b.a); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
  $('#barFill').style.width = `${(i + 1) / TOTAL * 100}%`;
  $('#next').textContent = i + 1 < TOTAL ? '다음 문제' : '결과 보기';
  $('#next').classList.remove('hide');
}
function next() { i++; if (i < TOTAL) show(); else result(); }
function result() {
  $('#quiz').classList.add('hide'); $('#result').classList.remove('hide');
  { const s = $('#score'), sm = document.createElement('small'); sm.textContent = `/${TOTAL}`; s.replaceChildren(String(score), sm); }
  $('#rank').textContent = RANKS.find(([n]) => score >= n)[1];
  render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function comment() {
  const n = $('#pname').value.trim(), d = $('#pdesc').value.trim().replace(/\s+/g, ' ');
  let t = `🪐 행성 생존 퀴즈 ${score}/${TOTAL}점`;
  t += `\n내가 살고 싶은 행성: ${n || '(행성 이름)'}`;
  if (d) t += `\n${d}`;
  return t;
}
function render() { $('#c1').textContent = $('#pname').value.length; $('#c2').textContent = $('#pdesc').value.length; $('#preview').textContent = comment(); }
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2600); }
async function copy() {
  if (!$('#pname').value.trim()) { toast('행성 이름부터 써 줘'); $('#pname').focus(); return false; }
  const text = comment();
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
  return true;
}
$('#go').onclick = start; $('#next').onclick = next; $('#again').onclick = start;
$('#pname').oninput = render; $('#pdesc').oninput = render;
$('#copyOnly').onclick = async () => { if (await copy()) toast('복사했어! 인스타 댓글창에 붙여 넣어 줘'); };
$('#copyGo').onclick = async () => { if (await copy()) { toast('복사했어! 댓글창에 붙여 넣어 줘'); setTimeout(() => { location.href = COMMENT_URL; }, 900); } };
