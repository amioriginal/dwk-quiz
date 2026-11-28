/* 돈워너노우 행성 작업실 v0 — 서버 없음. 저장은 이 기기 브라우저(localStorage)에만. */
(() => {
  'use strict';
  const D = window.DWK;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null) n.append(c);
    return n;
  };

  // ── 저장 (실패해도 화면은 그대로 동작) ──
  const store = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); return true; } catch { return false; } },
  };
  let passport = store.get('passport', {});   // { planetId: 'YYYY-MM-DD' }

  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1800);
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('복사했어'); }
    catch { window.prompt('길게 눌러 복사해', text); }
  };
  const allPlanets = () => D.episodes.flatMap(e => e.planets.map(p => ({ ...p, ep: e })));
  const latestLink = (ep) => ep.links.instagram || ep.links.youtube || ep.links.tiktok
    || D.episodes.map(e => e.links.instagram).find(Boolean) || D.site.links.instagram;

  // ── 별 배경 ──
  // 2026-11-28 내부도 입구와 같은 SpaceX·NASA 문법 → 반짝이는 별 배경은 장식이라 뺐다(캔버스가 없으면 그리지 않음)
  (function stars() {
    const c = $('#stars'); if (!c) return; const x = c.getContext('2d');
    let pts = [];
    const fit = () => {
      c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
      pts = Array.from({ length: 140 }, () => [Math.random() * c.width, Math.random() * c.height, Math.random() * 1.4 + .3, Math.random() * 6.28]);
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (t) => {
      x.clearRect(0, 0, c.width, c.height);
      for (const [px, py, r, ph] of pts) {
        x.globalAlpha = reduce ? .7 : .35 + .35 * Math.sin(t / 900 + ph);
        x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, r * devicePixelRatio, 0, 6.28); x.fill();
      }
      if (!reduce) requestAnimationFrame(draw);
    };
    addEventListener('resize', fit); fit(); requestAnimationFrame(draw);
  })();

  // ── 화면 전환 (#pick #dex #submit #me #more) ──
  const VIEWS = ['pick', 'dex', 'submit', 'me', 'more'];
  const route = () => {
    let v = location.hash.slice(1).split('/')[0];
    const dp = v === 'pick' && findDeep();
    if (dp) { history.replaceState(null, '', '#pick'); curEp = dp.ep; renderTabs(); renderPlanets(); }
    if (!VIEWS.includes(v)) v = 'pick';
    document.querySelectorAll('[data-view]').forEach(s => s.classList.toggle('hidden', s.dataset.view !== v));
    document.querySelectorAll('[data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === v));
    if (v === 'dex') renderDex();
    scrollTo(0, 0);
    if (dp) choose(curEp.planets.find(p => p.id === dp.id));
  };
  const findDeep = () => { const id = decodeURIComponent(location.hash.slice(1).split('/')[1] || ''); return id && allPlanets().find(p => p.id === id); };
  addEventListener('hashchange', route);

  const updatePassportMini = () => {
    const n = Object.keys(passport).length, total = allPlanets().length;
    $('#passportMini').textContent = `도장 ${n}/${total}`;
  };

  // ── 1. 고르기 ──
  let curEp = D.episodes[0];
  const epName = (e) => e.label || `${e.no}편`;
  const renderTabs = () => {
    const box = $('#epTabs'); box.replaceChildren();
    for (const e of D.episodes) {
      box.append(el('button', {
        role: 'tab', 'aria-selected': String(e === curEp), type: 'button',
        onclick: () => { if (curEp === e) return; curEp = e; chosen = null; renderTabs(); renderPlanets(); $('#result').classList.add('hidden'); },
      }, epName(e)));
    }
  };
  const renderPlanets = () => {
    $('#pickEyebrow').textContent = `${epName(curEp)} · ${curEp.title}`;
    const box = $('#planets'); box.replaceChildren(); box.removeAttribute('aria-busy');
    box.className = 'planets n' + curEp.planets.length + (chosen && curEp.planets.includes(chosen) ? ' has-chosen' : '');
    curEp.planets.forEach((p, i) => {
      box.append(el('button', { class: 'planet' + (chosen === p ? ' chosen' : ''), type: 'button', 'data-id': p.id, 'aria-pressed': String(chosen === p), onclick: () => choose(p) },
        orbImg(p),
        el('span', { class: 'meta' }, el('span', { class: 'num' }, String(i + 1).padStart(2, '0')),
          passport[p.id] ? el('span', { class: 'stamp', title: '골라 본 행성' }, '도장') : null),
        el('span', { class: 'name' }, p.name)));
    });
  };
  // 행성 그림 — 불러오는 동안 어두운 원, 못 불러오면 이름 첫 글자(깨진 그림 아이콘 대신)
  const orbImg = (p, cls = 'orb') => {
    const w = el('span', { class: cls + ' loading' });
    const im = el('img', { src: p.img, alt: p.name, loading: 'lazy', decoding: 'async' });
    im.onload = () => w.classList.remove('loading');
    im.onerror = () => { w.classList.remove('loading'); w.classList.add('err'); w.dataset.ch = p.name.slice(0, 1); im.remove(); };
    w.append(im); return w;
  };

  const imgCache = {};
  const loadImg = (src) => imgCache[src] ||= new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const fontsReady = () => Promise.all([document.fonts.load('800 40px Pretendard Variable'), document.fonts.load('500 40px Pretendard Variable')]).catch(() => {});

  let chosen = null;
  async function choose(p) {
    chosen = p;
    const first = !passport[p.id];
    passport[p.id] = new Date().toISOString().slice(0, 10);
    if (!store.set('passport', passport)) toast('이 브라우저는 도장 저장이 꺼져 있어');
    updatePassportMini();
    renderPlanets();
    const btn = document.querySelector(`.planet[data-id="${p.id}"]`); btn?.classList.add('just');
    setTimeout(() => btn?.classList.remove('just'), 600);

    const idx = curEp.planets.indexOf(p) + 1;
    $('#resultEyebrow').textContent = `${epName(curEp)} · ${idx}번 · 네가 고른 행성`;
    const ri = $('#resultImg'); ri.alt = p.name; ri.classList.remove('err'); ri.onerror = () => ri.classList.add('err'); ri.src = p.img;
    $('#resultName').textContent = p.name;
    $('#resultPitch').textContent = p.pitch;
    renderCrowd(p);
    $('#resultRule').textContent = p.rule ? `생존 규칙: ${p.rule}` : '이 편 규칙은 영상에서만 공개.';
    const w = $('#watchLinks'); w.replaceChildren();
    const L = curEp.links, S = D.site.links;
    w.append(
      el('a', { class: 'btn', href: L.instagram || S.instagram, target: '_blank', rel: 'noopener' }, '이 편 영상 보기', el('i', { 'aria-hidden': 'true' })),
      el('a', { class: 'txt', href: L.youtube || S.youtube, target: '_blank', rel: 'noopener' }, '유튜브'),
      el('a', { class: 'txt', href: L.tiktok || S.tiktok, target: '_blank', rel: 'noopener' }, '틱톡'));
    $('.spoiler').open = false;
    const R = $('#result'), wasHidden = R.classList.contains('hidden');
    R.classList.remove('hidden', 'in'); void R.offsetWidth; R.classList.add('in');
    setCard('busy');
    // 누른 행성이 반응하는 걸 잠깐 보여 준 뒤 결과로 내려간다
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => R.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), wasHidden && !reduce ? 260 : 0);
    if (first) toast('행성 여권에 도장 찍었어');
    try { await drawCard(p); if (chosen === p) setCard('ok'); }
    catch (e) { console.warn('공유 카드를 못 그림', e); if (chosen === p) setCard('err'); }
  }
  const setCard = (st) => {
    $('#cardWrap').dataset.state = st;
    $('#cardState').textContent = { busy: '카드 만드는 중…', err: '카드를 못 만들었어. 새로고침해서 다시 골라 줘.', ok: '' }[st];
    $('#shareBtn').disabled = $('#saveBtn').disabled = st !== 'ok';
  };


  // ── 고른 뒤: 실제 시청자 선택 공개 (댓글에서 번호를 분명히 고른 사람 수 · data.js picks) ──
  // 근거: 우리 릴스 댓글의 37%가 고른 이유를 스스로 쓰고, 1편 반딧불 호수는 84명 중 59명이 골랐다(댓글_전수분석 11-20).
  //       「남들은 뭘 골랐나」가 댓글에서 가장 많이 이어지는 대화라, 고른 직전에만 보여 준다(고르기 전엔 숨김 = 따라 고르기 방지).
  // 받침 있으면 a, 없으면 b (예: 호수 행성이랑 / 바다랑)
  const josa = (w = '', a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
  const crowdOf = (p, ep = curEp) => {
    const ps = ep.planets, total = ps.reduce((a, q) => a + (q.picks || 0), 0);
    if (!ps.some(q => typeof q.picks === 'number')) return null;
    const mine = p.picks || 0, max = Math.max(...ps.map(q => q.picks || 0));
    const tops = ps.filter(q => (q.picks || 0) === max && max > 0);
    const kind = total === 0 || mine === 0 ? 'first' : mine === max ? (tops.length > 1 ? 'tie' : 'major') : 'minor';
    return { ps, total, mine, max, tops, kind };
  };
  function renderCrowd(p) {
    const box = $('#crowd'); if (!box) return;
    const c = crowdOf(p); box.replaceChildren();
    if (!c) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const { ps, total, mine, tops, kind } = c;
    const head = {
      first: total === 0 ? '아직 댓글로 고른 사람이 없어. 네가 첫 번째야.' : '이 행성 고른 시청자는 아직 0명. 네가 처음이야.',
      major: `댓글로 고른 ${total}명 중 ${mine}명이 너랑 같은 행성.`,
      tie: `${total}명 중 ${mine}명씩, 「${tops.filter(q => q.id !== p.id).map(q => q.name).join('」·「')}」${josa(tops.filter(q => q.id !== p.id).slice(-1)[0]?.name, '이랑', '랑')} 똑같이 갈렸어.`,
      minor: `${total}명 중 ${mine}명만 여기 골랐어. 제일 많이 간 곳은 「${tops[0].name}」(${tops[0].picks}명).`,
    }[kind];
    box.dataset.kind = kind;
    box.append(el('p', { class: 'label' }, '남들은 뭘 골랐나', el('b', { class: 'crowd-tag' }, { first: '첫 번째', major: '다수파', tie: '공동 1위', minor: '소수파' }[kind])),
      el('p', { class: 'crowd-head' }, head));
    const bars = el('div', { class: 'crowd-bars' });
    const fills = [];
    ps.forEach((q, i) => {
      const n = q.picks || 0, w = total ? Math.max(n ? 3 : 0, Math.round(n / total * 100)) : 0;
      const fill = el('span', { class: 'crowd-fill' }); fills.push([fill, w]);
      bars.append(el('div', { class: 'crowd-row' + (q.id === p.id ? ' me' : '') },
        el('span', { class: 'crowd-top' }, el('span', { class: 'crowd-name' }, el('b', {}, String(i + 1).padStart(2, '0')), ` ${q.name}`, q.id === p.id ? el('em', {}, '나') : null), el('span', { class: 'crowd-n' }, q.id === p.id && n === 0 ? '네가 1호' : `${n}명`)),
        el('span', { class: 'crowd-track' }, fill)));
    });
    box.append(bars);
    // rAF는 백그라운드 탭에서 멈춰 막대가 빈 채로 남는다 → setTimeout으로 순서대로 채움
    fills.forEach(([f, w], i) => setTimeout(() => { f.style.width = w + '%'; }, 60 + 120 * i));
    if (p.say) box.append(el('blockquote', { class: 'crowd-say' }, `「${p.say.t}」`,
      el('small', {}, `이 행성 고른 시청자 댓글${p.say.likes ? ` · 좋아요 ${p.say.likes.toLocaleString()}` : ''}`)));
    if (total < 10) box.append(el('p', { class: 'crowd-few' }, `아직 ${total}명뿐이라 네 댓글 하나로 순위가 바뀔 수 있어.`));
    const L = curEp.links.instagram;
    if (L) box.append(el('a', { class: 'btn crowd-cta', href: L, target: '_blank', rel: 'noopener' }, `댓글에 「${ps.indexOf(p) + 1}번」 남기러 가기`, el('i', { 'aria-hidden': 'true' })));
    box.append(el('p', { class: 'crowd-note' }, `릴스 댓글에서 번호를 분명히 고른 사람만 셌어 · ${D.picksAsOf || ''} 기준`));
  }

  // 공유 카드 1080×1350 — 반전(규칙)은 넣지 않는다.
  // 2026-11-28 사이트와 같은 문법으로: 검정 · 행성 장면 하나 · 글은 왼쪽 아래 · 흰 글씨(#f0f0fa)만 · 노랑·청록·빛 번짐 없음
  async function drawCard(p) {
    await fontsReady();
    const c = $('#card'), x = c.getContext('2d'), W = c.width, H = c.height, F = '"Pretendard Variable", Pretendard, sans-serif';
    const FG = '#f0f0fa', FG2 = 'rgba(240,240,250,.72)', FG3 = 'rgba(240,240,250,.5)', M = 88;
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    const im = await loadImg(p.img).catch(() => null);   // 그림이 없으면 원 없이 진행
    const R = 380, cx = W / 2, cy = 500;
    if (im) {
      x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 6.29); x.clip(); const Z = R * 1.18; x.drawImage(im, cx - Z, cy - Z - R * .06, Z * 2, Z * 2); x.restore();
    }
    // 장면 아래를 검정으로 눌러 글이 읽히게(SpaceX 장면 아래 그라데이션)
    const g = x.createLinearGradient(0, 640, 0, 960); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(0, 640, W, 320);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    // 머리글: 「돈워너노우 6편 ──」
    x.fillStyle = FG2; x.font = `600 30px ${F}`; const eb = `돈워너노우 ${epName(p.ep || curEp)}`; x.fillText(eb, M, 940);
    x.fillStyle = FG3; x.fillRect(M + x.measureText(eb).width + 22, 930, 44, 2);
    x.fillStyle = FG2; x.font = `500 42px ${F}`; x.fillText('나는 이 행성 골랐어', M, 1010);
    // 행성 이름 — 길면 줄여서 한 줄
    let fs = 96; x.font = `800 ${fs}px ${F}`; while (x.measureText(p.name).width > W - M * 2 && fs > 56) { fs -= 4; x.font = `800 ${fs}px ${F}`; }
    x.fillStyle = FG; x.fillText(p.name, M, 1112);
    x.fillStyle = FG2; x.font = `500 42px ${F}`; x.fillText('여기서 1년 버틸 수 있을까?', M, 1178);
    const cr = crowdOf(p);
    const stat = cr && cr.total ? { first: `시청자 ${cr.total}명 중 아무도 안 고른 행성`, major: `시청자 ${cr.total}명 중 ${cr.mine}명이 고른 다수파`, tie: `시청자 ${cr.total}명 중 ${cr.mine}명 · 공동 1위`, minor: `시청자 ${cr.total}명 중 ${cr.mine}명만 고른 소수파` }[cr.kind] : null;
    x.fillStyle = 'rgba(240,240,250,.18)'; x.fillRect(M, 1222, W - M * 2, 2);
    x.fillStyle = stat ? FG : FG3; x.font = `${stat ? 700 : 500} 32px ${F}`;
    x.fillText(stat || '너는 몇 번 골랐어? 결과는 영상 끝에', M, 1280);
    x.textAlign = 'right'; x.fillStyle = FG2; x.font = `600 30px ${F}`;
    if (x.measureText(`@${D.site.handle}`).width + x.measureText(stat || '').width < W - M * 2 - 60) x.fillText(`@${D.site.handle}`, W - M, 1280);
    else { x.textAlign = 'left'; x.fillText(`@${D.site.handle}`, M, 80); }
  }
  const canvasBlob = (c) => new Promise(ok => c.toBlob(ok, 'image/png'));
  const download = (blob, name) => {
    const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  $('#saveBtn').addEventListener('click', async () => { download(await canvasBlob($('#card')), `돈워너노우_${chosen?.name || '행성'}.png`); toast('카드 이미지 저장했어 · 다운로드 폴더 확인'); });
  $('#shareBtn').addEventListener('click', async () => {
    const blob = await canvasBlob($('#card'));
    const file = new File([blob], 'dontwannaknow.png', { type: 'image/png' });
    const text = `나는 ${chosen?.name} 골랐어. 여기서 1년 버틸 수 있을까? 너는? ${location.href.split('#')[0]}`;
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (navigator.share) { try { await navigator.share({ text, url: location.href.split('#')[0] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    download(blob, 'dontwannaknow.png');
    try { await navigator.clipboard.writeText(text); toast('카드는 저장, 글은 복사했어 · 스토리에 올려 줘'); } catch { toast('카드 이미지 저장했어'); }
  });

  // ── 2. 도감 ──
  function renderDex() {
    const box = $('#dex'); box.replaceChildren();
    const got = Object.keys(passport).length, total = allPlanets().length;
    $('#dexSub').textContent = got ? `${total}개 중 ${got}개에 도장을 찍었어. 다 모아 봐.` : '아직 도장이 없어. 행성 하나 고르면 여기 찍혀.';
    if (!got) box.append(el('a', { class: 'btn dex-empty', href: '#pick' }, '행성 고르러 가기', el('i', { 'aria-hidden': 'true' })));
    for (const e of D.episodes) {
      const n = e.planets.filter(p => passport[p.id]).length;
      box.append(el('section', { class: 'dex-ep' + (n === e.planets.length ? ' full' : '') },
        el('h3', {}, el('span', {}, `${epName(e)} · ${e.title}`), el('small', {}, `${n}/${e.planets.length}`)),
        el('div', { class: 'dex-row' }, e.planets.map(p => el('a', {
          class: 'dex-item' + (passport[p.id] ? ' got' : ''), href: '#pick',
          'aria-label': `${p.name}${passport[p.id] ? ' · 도장 찍음' : ''}`,
          onclick: () => { curEp = e; chosen = null; renderTabs(); renderPlanets(); $('#result').classList.add('hidden'); },
        }, orbImg(p), el('span', { class: 'nm' }, p.name), passport[p.id] ? el('span', { class: 'stamp' }, '도장') : null)))));
    }
  }

  // ── 3. 행성 신청(2026-11-28 · 대표 「그냥 행성 신청 이런거로 하던가」) ──
  // 서버 = Supabase dwk-plaza 함수 3개(backend/supabase_planet_apps.sql): apply_planet(넣고 접수 번호) · planet_apps_mine(이 기기 신청 상태) · planet_apps_board(실제 집계 + 검수 통과분)
  // 픽세에서 가져온 작동 원리: 낸 직후 「내 것」이 바로 보인다(접수 번호·검수 중) · 단계와 거르는 기준을 숨기지 않는다 · 검수 통과한 것만 공개 · 뽑히면 이름이 영상에.
  // 서버가 꺼져 있거나 응답이 없으면 예전 「댓글 문구 복사」로 물러난다(같은 내용 · #행성신청).
  // 거름 목록 = dwk-chat.js·world.js 의 BAD·CONTACT 와 같다(고치면 넷 다 — 서버 문지기 planet_apps_gate 포함)
  const PII = [/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/, /[\w.+-]+@[\w-]+\.[\w.]+/, /\d{6}[-\s]?[1-4]\d{6}/, /(초|중|고)등학교|\d학년\s*\d반/];
  const BAD = ['시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅄ', 'ㅂㅅ', '좆', '존나', '졸라', '지랄', '개새', '새끼', '미친놈', '미친년', '닥쳐', '꺼져', '느금', '니애미', 'fuck', 'shit', 'bitch', '섹스', 'sex', '야동', '자살', '죽어'];
  const CONTACT = /(\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4})|(https?:\/\/|www\.|\.com\b|\.kr\b|\.net\b|\.gg\b)|(카톡|오픈채팅|오카|kakao|텔레|telegram|디코|discord|라인\s?아이디|인스타\s?아이디|dm\s?줘|번호\s?줘)/i;
  const WHY = {
    contact: '연락처·링크·다른 메신저 얘기는 빼 줘. 안전 규칙이야.', bad: '욕설·위험한 말이 들어 있어. 빼고 다시 내 줘.',
    limit: '한 기기에서 하루 5개까지만 신청할 수 있어. 내일 또 내 줘.', dup: '같은 이름의 행성을 오늘 이미 냈어.',
    age: '만 14세 이상만 신청할 수 있어.', ig: '인스타 아이디는 영문 소문자·숫자·마침표·밑줄만 돼.', form: '빈칸이나 너무 긴 칸이 있어.',
    full: '오늘 신청이 너무 많이 몰렸어. 내일 다시 내 줘.', key: '이 브라우저는 신청 번호를 저장할 수 없어. 다른 브라우저로 열어 줘.',
  };
  const ST = { new: ['검수 중', '사람이 읽고 있어'], ok: ['대기열', '검수 통과 — 뽑히면 영상이 돼'], picked: ['영상 만드는 중', '네 행성이 뽑혔어'], made: ['영상 나옴', '크레딧에 네 아이디'], no: ['이번엔 안 올림', '규칙에 걸렸거나 이미 나온 행성이야'] };
  const SB = (D.world && D.world.backend) || {};
  const canApply = !!(D.site.apply && SB.url && SB.anonKey);
  const rpc = async (fn, body, ms = 8000) => {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(`${SB.url}/rest/v1/rpc/${fn}`, { method: 'POST', signal: ac.signal, body: JSON.stringify(body || {}),
        headers: { apikey: SB.anonKey, Authorization: `Bearer ${SB.anonKey}`, 'content-type': 'application/json' } });
      if (!r.ok) throw new Error(`${fn} ${r.status}`);
      return await r.json();
    } finally { clearTimeout(t); }
  };
  // 이 기기 열쇠 — 「내 신청」 상태를 볼 때만 쓴다(서버엔 열쇠의 해시만). 저장이 안 되면 null → 신청은 되지만 상태 조회는 못 함
  const applyKey = () => {
    let k = store.get('apply_key', null); if (typeof k === 'string' && /^[0-9a-z]{32}$/.test(k)) return k;
    const a = new Uint8Array(32); crypto.getRandomValues(a); k = Array.from(a, (b) => '0123456789abcdefghijklmnopqrstuvwxyz'[b % 36]).join('');
    return store.set('apply_key', k) ? k : null;
  };
  let mine = (store.get('apply_mine', []) || []).filter((x) => x && Number.isInteger(x.no)).slice(-20); // [{no, planet, at, ig}]
  const pad = (n) => String(n).padStart(4, '0');
  const paintMine = (states = {}) => {
    const box = $('#applyMine'); box.replaceChildren();
    if (!mine.length) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.append(el('p', { class: 'label' }, '내 신청 · 이 기기'));
    for (const m of mine.slice().reverse()) {
      const s = states[m.no] || {}; const [tag, note] = ST[s.status] || ['접수됨', '상태 확인 중'];
      box.append(el('div', { class: 'mine-row' + (s.status ? ' st-' + s.status : '') },
        el('span', { class: 'mine-no' }, pad(m.no)),
        el('span', { class: 'mine-nm' }, m.planet, el('small', {}, note)),
        s.status === 'made' && s.video ? el('a', { class: 'mine-tag', href: s.video, target: '_blank', rel: 'noopener' }, tag + ' ↗') : el('b', { class: 'mine-tag' }, tag)));
    }
  };
  const refreshMine = async () => {
    paintMine(); const k = store.get('apply_key', null);
    if (!canApply || !mine.length || !k) return;
    try { const l = await rpc('planet_apps_mine', { p_key: k, p_nos: mine.map((m) => m.no) }); const st = {}; for (const x of l || []) st[x.no] = x; paintMine(st); }
    catch (e) { console.info('내 신청 상태를 못 읽음 — 접수됨으로 표시', e.name); }
  };
  const paintBoard = async () => {
    const box = $('#applyBoard'); if (!canApply) return;
    let b; try { b = await rpc('planet_apps_board', {}, 6000); } catch (e) { console.info('신청 게시판을 못 읽음', e.name); return; }
    if (!b || typeof b.total !== 'number') return;
    box.replaceChildren();
    const list = Array.isArray(b.list) ? b.list : [];
    if (!b.total && !list.length) { box.classList.add('hidden'); return; } // 아직 0건 — 빈 판은 안 건다
    box.append(el('p', { class: 'label' }, '신청 현황 · 실제 집계'),
      el('div', { class: 'board-n' }, ...[['이번 주', b.week], ['전체', b.total], ['대기열', b.queued], ['영상', b.made]].map(([k, n]) => el('span', {}, el('b', {}, (+n || 0).toLocaleString('ko-KR')), el('small', {}, k)))));
    if (list.length) box.append(el('div', { class: 'board-list' }, list.map((x) => el('div', { class: 'board-row' },
      el('b', {}, x.planet), el('span', {}, x.good), el('small', {}, [ST[x.status]?.[0], x.by ? '@' + x.by : null].filter(Boolean).join(' · '))))));
    box.classList.remove('hidden');
  };
  const draftOf = (f) => ({ planet: f.planet || '', good: f.good || '', trap: f.trap || '', ig: f.ig || '' });
  const showErr = (msg) => { const e = $('#applyErr'); e.textContent = msg || ''; e.hidden = !msg; if (msg) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  const commentFallback = async (f, why) => {
    const lines = ['#행성신청', `행성: ${f.planet}`, `좋은 점: ${f.good}`, `숨은 함정: ${f.trap}`];
    if (f.ig) lines.push(`크레딧: @${f.ig}`);
    $('#submitText').textContent = lines.join('\n');
    $('#submitWhy').hidden = !why;
    $('#commentLink').href = latestLink(D.episodes[0]);
    const form = D.site.links.submitForm;
    $('#formLink').classList.toggle('hidden', !form); if (form) $('#formLink').href = form;
    $('#submitOut').classList.remove('hidden');
    $('#submitOut').scrollIntoView({ behavior: 'smooth' });
    // 댓글 갈 곳 = 최신 영상(유튜브 RSS 창구) — 안 되면 data.js 최신 편
    const F = D.site.feed; if (!F?.url) return;
    try { const d = await (await fetch(F.url)).json(); const v = d?.ok && d.items?.[0]; if (v?.url) $('#commentLink').href = v.url; } catch (e) { console.info('최신 영상 창구 못 읽음 — data.js 링크 유지', e.name); }
  };
  $('#submitForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); showErr('');
    const raw = Object.fromEntries(new FormData(ev.target));
    const f = { planet: (raw.planet || '').trim().replace(/\s+/g, ' '), good: (raw.good || '').trim().replace(/\s+/g, ' '), trap: (raw.trap || '').trim().replace(/\s+/g, ' '), ig: (raw.ig || '').trim().replace(/^@+/, '').toLowerCase() };
    store.set('draft', draftOf(f));
    // 방문 기록(dwk-track.js · 11-28): 시도·거절 사유·결과만 — 적은 내용은 안 보낸다
    const tk = (e, p, l) => { if (window.dwkT) window.dwkT(e, p, l); };
    const rej = (why, msg) => { tk('apply_reject', { why, side: 'site', empty: ['planet', 'good', 'trap'].filter((k) => !f[k]).join(',') || null }, why); return showErr(msg); };
    tk('apply_submit', { ig: !!f.ig }, 'try');
    if (!f.planet || !f.good || !f.trap) return rej('empty', '행성 이름·좋은 점·숨은 함정은 꼭 적어 줘.');
    if (!raw.over14) return rej('age', WHY.age);
    if (f.ig && !/^[a-z0-9._]{1,30}$/.test(f.ig)) return rej('ig', WHY.ig);
    const all = `${f.planet} ${f.good} ${f.trap}`;
    if (PII.some(r => r.test(all)) || CONTACT.test(all)) return rej('contact', WHY.contact);
    if (BAD.some(w => all.toLowerCase().includes(w))) return rej('bad', WHY.bad);
    if (!canApply) { tk('apply_result', { ok: false, why: 'off', via: 'comment' }, 'off'); return commentFallback(f, false); }
    const btn = $('#applyBtn'); btn.disabled = true; btn.firstChild.textContent = '보내는 중…';
    let r = null;
    try { r = await rpc('apply_planet', { p_planet: f.planet, p_good: f.good, p_trap: f.trap, p_ig: f.ig || null, p_over14: true, p_key: applyKey() || 'x' }); }
    catch (e) { console.warn('신청 서버 응답 없음 — 댓글 방식으로', e.name || e); }
    finally { btn.disabled = false; btn.firstChild.textContent = '신청하기'; }
    if (!r) { tk('apply_result', { ok: false, why: 'noserver', via: 'comment' }, 'noserver'); return commentFallback(f, true); }
    if (!r.ok) { tk('apply_reject', { why: String(r.why || 'unknown').slice(0, 20), side: 'server' }, String(r.why || 'unknown').slice(0, 20)); return showErr(WHY[r.why] || '접수가 안 됐어. 내용을 조금 바꿔서 다시 내 줘.'); }
    tk('apply_result', { ok: true, ig: !!f.ig, mine: mine.length + 1 }, 'ok');
    mine.push({ no: r.no, planet: f.planet, at: new Date().toISOString().slice(0, 10), ig: f.ig || null }); store.set('apply_mine', mine.slice(-20));
    store.set('draft', null); ev.target.reset();
    $('#doneNo').textContent = pad(r.no);
    $('#doneName').textContent = f.planet;
    $('#doneMsg').textContent = f.ig
      ? `검수가 끝나면 대기열에 올라가. 뽑혀서 영상이 되면 영상 끝과 이 사이트에 @${f.ig} 크레딧이 올라가. 진행 상황은 이 화면 「내 신청」에서 봐.`
      : `검수가 끝나면 대기열에 올라가. 아이디를 안 적어서, 뽑히면 크레딧은 「익명」으로 나가. 진행 상황은 이 화면 「내 신청」에서 봐.`;
    $('#submitForm').classList.add('hidden'); $('#submitOut').classList.add('hidden');
    const done = $('#applyDone'); done.classList.remove('hidden'); done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: 'smooth', block: 'start' });
    refreshMine(); paintBoard();
  });
  $('#applyAgain').addEventListener('click', () => { $('#applyDone').classList.add('hidden'); $('#submitForm').classList.remove('hidden'); $('#submitForm [name="planet"]').focus(); });
  $('#copyBtn').addEventListener('click', () => copy($('#submitText').textContent));
  (() => { const d = store.get('draft', null); if (!d) return; for (const [k, v] of Object.entries(d)) { const i = $(`#submitForm [name="${k}"]`); if (i && typeof v === 'string') i.value = v; } })();
  let applyOpened = false;
  const onApplyView = () => { if (location.hash.split('/')[0] !== '#submit' || applyOpened) return; applyOpened = true; refreshMine(); paintBoard(); };
  addEventListener('hashchange', onApplyView);

  // ── 4. 캐릭터 카드 — 2026-11-21 옛 2D 도트 캐릭터(사각형 몸)를 걷어 내고 maker.html의 3D 캐릭터(dwk-char.js)로 통일.
  //    index.html 맨 아래 모듈 스크립트가 그린다. 대표 「영상에 나올 내 캐릭터 퀄리티가 왜 이따구야」.

  // ── 5. 생존자 테스트 (5문항 → 6유형) ──
  const TYPES = {
    A: ['규칙 수호자', '규칙 한 줄을 끝까지 지키는 사람. 1년 생존 확률 제일 높음.', '생존 규칙을 먼저 찾는 쪽이라 공포 행성에서 강해.'],
    B: ['낙천 탐험가', '함정이 보여도 일단 들어가 보는 사람. 반전에 제일 먼저 당함.', '해바라기 행성 같은 낙원에서 첫날 불 켜 둘 타입.'],
    C: ['의심 많은 생존자', '"좋은 것엔 이유가 있다" — 낙원부터 의심함.', '빈틈 찾기 1등. 행성 제출함에 딱 맞는 사람.'],
    D: ['잠꾸러기 생존자', '어디서든 잘 자는 사람. 구름 행성 최적, 수영장 행성 위험.', '코 골지만 않으면 1년 껌.'],
    E: ['다정한 생존자', '행성 주민과 친구가 되는 사람. 반딧불 호수의 주인공.', '"괜찮아"를 한 번 더 물어보는 사람.'],
    F: ['혼자 버티는 생존자', '아무도 없어도 괜찮은 사람. 길은 절대 안 물어봄.', '남자만 있는 행성 탑 아래 줄에 서 있을 확률 있음.'],
  };
  const QUIZ = [
    ['처음 보는 행성에 도착했다. 제일 먼저 하는 건?', [['안내문부터 찾는다', 'A'], ['일단 걸어 본다', 'B'], ['너무 조용한데? 의심한다', 'C'], ['일단 눕는다', 'D']]],
    ['낯선 사람이 "괜찮아"라고 웃는다.', [['믿는다', 'B'], ['한 번 더 물어본다', 'E'], ['뭔가 숨긴다고 본다', 'C'], ['신경 안 쓴다', 'F']]],
    ['밤에 누가 문을 노크한다.', [['절대 안 연다', 'A'], ['택배인 줄 알고 연다', 'B'], ['구멍으로 먼저 본다', 'C'], ['자느라 못 들었다', 'D']]],
    ['길을 잃었다.', [['지도를 본다', 'A'], ['그냥 물어본다', 'E'], ['내가 안다. 계속 간다', 'F'], ['이것도 모험이지', 'B']]],
    ['1년 뒤 떠나는 날, 가져가고 싶은 건?', [['생존 규칙 메모', 'A'], ['여기서 사귄 친구', 'E'], ['아무것도 없이 가볍게', 'F'], ['베개', 'D']]],
  ];
  const quizState = [];
  const renderQuiz = () => {
    const box = $('#quiz'); box.replaceChildren();
    if (quizState.length === QUIZ.length) {
      const cnt = {}; quizState.forEach(t => cnt[t] = (cnt[t] || 0) + 1);
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
      const [name, d1, d2] = TYPES[top];
      store.set('type', top);
      box.append(el('div', { class: 'quiz-result' }, el('p', { class: 'eyebrow' }, '너는'), el('h3', {}, name), el('p', {}, d1), el('p', { class: 'hint' }, d2),
        el('div', { class: 'actions' },
          el('button', { class: 'btn primary', onclick: () => copy(`나는 「${name}」 — ${d1} 너는? ${location.href.split('#')[0]}#me`) }, '결과 복사'),
          el('button', { class: 'btn', onclick: () => { quizState.length = 0; renderQuiz(); } }, '다시 하기'))));
      return;
    }
    const [q, opts] = QUIZ[quizState.length];
    box.append(el('div', { class: 'q' }, el('p', {}, `${quizState.length + 1}/${QUIZ.length} · ${q}`),
      el('div', { class: 'opt-row' }, opts.map(([t, k]) => el('button', { onclick: () => { quizState.push(k); renderQuiz(); } }, t)))));
  };

  // ── 6. 더보기 (명예의 전당 · 링크 · 광고 자리) ──
  const renderMore = () => {
    const h = $('#hall'); h.replaceChildren();
    if (!D.hall.length) h.append(el('div', { class: 'empty' }, '아직 비어 있어. 첫 번째 이름은 너일 수도 있어. → ', el('a', { href: '#submit' }, '행성 내러 가기')));
    else D.hall.forEach(e => h.append(el('div', { class: 'entry' }, `${e.week} · ${e.planet} — 만든 사람 ${e.by}` + (e.ep ? ` (행성 #${e.ep})` : ''))));
    const L = D.site.links, box = $('#homeLinks'); box.replaceChildren();
    const row = (href, name, note) => href ? el('a', { href, target: '_blank', rel: 'noopener' }, name, el('small', {}, note)) : el('div', { class: 'soon' }, name, el('small', {}, '곧 열림'));
    box.append(row(L.instagram, '인스타그램', '@dontwannaknow.kr'), row(L.youtube, '유튜브 쇼츠', '@dontwannaknow_kr'), row(L.tiktok, '틱톡', '@dontwannaknow.kr'), row(L.facebook, '페이스북', 'dontwannaknow.kr'), row(L.kakao, '카톡 공지방', '새 편·이벤트 알림만'));
    $('#adSlot').classList.toggle('hidden', !D.site.ads);
  };

  // 시작
  // 입구(start.html)의 행성을 누르면 #pick/<행성id> 로 온다 → 그 편을 열고 바로 고른 상태로(2026-11-28 입구 「누르면 바로」)
  const deep = decodeURIComponent(location.hash.slice(1).split('/')[1] || '');
  const deepP = deep && allPlanets().find(p => p.id === deep);
  if (deepP) { curEp = deepP.ep; history.replaceState(null, '', '#pick'); }
  renderTabs(); renderPlanets(); renderQuiz(); renderMore(); updatePassportMini(); route(); onApplyView();
  if (deepP) choose(curEp.planets.find(p => p.id === deep));
})();
