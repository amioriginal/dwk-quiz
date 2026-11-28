/* start-doors.js v2 — 입구 세 갈래 채우기(2026-11-28)
   - 01(v3 · 11-28 「행성 신청」): 신청 → 검수 → 영상 → 크레딧 네 단계 + 서버가 센 실제 숫자 + 검수 통과한 행성(Supabase planet_apps_board)
     (옛 「영상 속 행성 고르기」 행성 4개는 뺐다 — 고르기 화면은 index.html#pick 에 그대로 있고 입구 아래 줄에서 간다)
   - 맨 위 한 줄(NASA의 LIVE 줄): 최신 영상 = 유튜브 RSS 창구(data.js site.feed · backend/feed 워커) → 영상만 올리면 저절로 바뀐다.
     지난번 이후 새 영상이면 다시 온 사람에게도 「새 편」, 아니면 「다시 왔네」. 창구가 안 되면 data.js 최신 편
   - 03: 이 기기에 남은 내 최고 기록만(서버 순위가 없어 남의 1등은 안 건다 — 가짜 숫자 금지 IMM-1)
   저장 열쇠는 dwk-core.js DC.store 와 같다(dwk_ 접두 · JSON). */
(function () {
  'use strict';
  const D = window.DWK || {};
  const $ = (id) => document.getElementById(id);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } },
  };
  const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; e.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };

  // 캐릭터 이름 = dwk-char.js ADJ·NOUN 과 같은 순서(dwk-chat.js 에도 같은 표 — 고치면 셋 다)
  const ADJ = ['겁 없는', '졸린', '수상한', '배고픈', '느긋한', '용감한', '수줍은', '엉뚱한', '반짝이는', '조용한', '시끄러운', '행운의', '말랑한', '꿈꾸는', '까칠한', '다정한'];
  const NOUN = ['감자', '펭귄', '고양이', '우주인', '탐험가', '요리사', '방랑자', '두더지', '토끼', '다람쥐', '곰', '반딧불', '눈사람', '해바라기', '로봇', '외계인'];
  const char = ls.get('char', null);
  const myName = char && Array.isArray(char.n) ? `${ADJ[char.n[0]] || '이름 없는'} ${NOUN[char.n[1]] || '주민'}` : null;
  const seatN = Math.floor(+ls.get('seat', 0)); const seat = seatN >= 1 && seatN <= 100000 ? 'No.' + String(seatN).padStart(6, '0') : null;

  // 시간 제한 있는 읽기 — 못 받으면 null(화면은 data.js 값으로 그대로)
  const getJSON = async (url, opt = {}, ms = 4000) => {
    const ac = 'AbortController' in window ? new AbortController() : null; const t = setTimeout(() => ac && ac.abort(), ms);
    try { const r = await fetch(url, { ...opt, signal: ac && ac.signal }); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
    catch (e) { console.info('못 읽음(기본값으로 보임):', url.split('?')[0], e && e.name); return null; } // 오류 아님 — 기본값으로 물러난다
    finally { clearTimeout(t); }
  };
  const S0 = D.site || {};

  // ── 01 행성 신청 — 실제 집계(planet_apps_board)가 오면 단계 옆에 숫자 · 검수 통과한 행성 3개 ──
  const B = (D.world && D.world.backend) || {};
  if (S0.apply && B.url && B.anonKey) {
    getJSON(`${B.url}/rest/v1/rpc/planet_apps_board`, { method: 'POST', headers: { apikey: B.anonKey, Authorization: `Bearer ${B.anonKey}`, 'content-type': 'application/json' }, body: '{}' }).then((b) => {
      if (!b || typeof b.total !== 'number') return;
      const nf0 = (x) => Math.round(+x || 0).toLocaleString('ko-KR');
      if (b.total > 0) { // 아직 0건이면 숫자를 안 건다(0 자체는 사실이지만 칸만 비어 보임 · 단계 설명만)
        for (const li of document.querySelectorAll('#flow li')) { const n = b[li.dataset.k]; if (typeof n === 'number' && n > 0) li.querySelector('em').textContent = `${nf0(n)}건`; }
        $('flow').classList.add('has-n');
      }
      if (b.week > 0) $('applySub').textContent = `이번 주 ${nf0(b.week)}건 들어왔어. 뽑히면 진짜 영상이 되고, 영상에 네 아이디가 올라가.`;
      const ST = { ok: '대기열', picked: '영상 만드는 중', made: '영상 나옴' };
      const list = (Array.isArray(b.list) ? b.list : []).slice(0, 3);
      if (list.length) {
        $('applyQueue').replaceChildren(...list.map((x) => h('li', {},
          x.status === 'made' && x.video ? h('a', { href: x.video, target: '_blank', rel: 'noopener' }, String(x.planet || '')) : h('b', {}, String(x.planet || '')),
          h('span', {}, [ST[x.status] || '', x.by ? '@' + x.by : ''].filter(Boolean).join(' · ')))));
        $('applyQueue').hidden = false;
      }
    });
  }

  // ── 맨 위 한 줄(NASA 「지금 일」) — 최신 영상은 유튜브 RSS 창구에서 자동으로. 창구가 안 되면 data.js 최신 편 ──
  const ep = (D.episodes || [])[0];
  const label = ep ? (ep.label || `${ep.no}편`) : '';
  const live = $('live');
  const showLive = (tag, text, href, ext) => {
    live.replaceChildren(h('b', {}, tag), h('span', {}, text));
    live.href = href; if (ext) { live.target = '_blank'; live.rel = 'noopener'; } else { live.removeAttribute('target'); live.removeAttribute('rel'); }
    live.hidden = false;
  };
  const showBack = () => showLive('다시 왔네', `${myName}${seat ? ' · ' + seat : ''} — 탑승 대기 중`, '#wait'); // 광장은 잠겨 있으니(11-28) 대기실 자리로만
  const fallback = () => { if (myName) showBack(); else if (ep) showLive('새 편', `${label} · ${ep.title} 공개 — 넌 어디서 1년 버틸래?`, 'index.html#pick'); };
  const F = S0.feed || {};
  if (F.url) {
    getJSON(F.url, {}, 3500).then((d) => {
      const items = d && d.ok && Array.isArray(d.items) ? d.items : [];
      let re = null; try { re = F.match ? new RegExp(F.match) : null; } catch (e) { re = null; }
      const v = (re && items.find((x) => re.test(x.title || ''))) || items[0];
      if (!v || !v.id) { fallback(); return; }
      const seen = ls.get('gate_seen_vid', null);
      const fresh = seen !== v.id; // 처음 온 사람이거나, 지난번 이후 새 영상이 올라옴
      if (myName && !fresh) showBack(); // 다시 온 사람은 새 영상이 없을 때만 「다시 왔네」
      else showLive('새 편', `${String(v.title || '').slice(0, 80)} — 지금 보러 가기`, v.url, true);
      ls.set('gate_seen_vid', v.id);
    });
  } else fallback();

  // ── 03 내 기록(이 기기) ──
  const bm = +ls.get('best_merge', 0); if (bm > 0) $('bestMerge').textContent = `내 최고 ${bm.toLocaleString('ko-KR')}점`;
  const bs = ls.get('best_survive', null); if (bs && bs.days) $('bestSurvive').textContent = `내 최고 ${bs.days}일`;

  // ── 02 탑승: 대기장 이륙 영상(11-28 대표 「우주선 이륙하는 영상으로 좀 간지나게」) — 칸이 보이면 재생, 반복 ──
  const vid = $('plazaVid');
  if (vid) {
    const panel = vid.closest('.panel');
    const kind = () => (vid.clientWidth > vid.clientHeight * 1.1 ? 'l' : 'p'); // 영상 상자 모양으로 고른다: 넓은 상자(폰) = 가로판 · 키 큰 상자(컴퓨터 세로 칸) = 세로판
    const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    let cur = '';
    const pick = () => { const k = kind(); if (k === cur) return; cur = k; vid.poster = `media/launch_${k}_poster.jpg`; if (!reduce) { vid.src = `media/launch_${k}.mp4?v=2`; vid.loop = true; vid.load(); } };
    const fallback = () => { const img = h('img', { class: 'bg', src: `media/launch_${cur || 'p'}_poster.jpg`, alt: '', decoding: 'async' }); vid.replaceWith(img); };
    vid.addEventListener('error', fallback);
    const play = () => { if (reduce) return; try { vid.currentTime = 0; } catch (e) { /* 처음부터 못 돌려도 이어서 재생 */ } const p = vid.play(); if (p && p.catch) p.catch(() => { vid.poster = `media/launch_${cur}_poster.jpg`; }); };
    pick();
    let played = false;
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && !played) { played = true; play(); } }, { threshold: 0.45 }).observe(panel);
    else play();
    panel.addEventListener('mouseenter', () => { if (played && vid.ended) play(); });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const was = cur; pick(); if (cur !== was && played) play(); }, 200); });
  }

  // ── 02 탑승 대기실 — 3만 명 전엔 문이 안 열린다(11-28 대표 「팔로우 3만되면 열거니까 접속 안되게」) ──
  const S = D.site || {}; const L = S.links || {};
  const ship = Object.assign({ boarded: 0, openAt: 30000, asOf: '' }, D.ship || {});
  const nf = (x) => Math.round(+x || 0).toLocaleString('ko-KR');
  const goal = +ship.openAt || 30000, got = Math.max(0, +ship.boarded || 0), isOpen = got >= goal;
  const man = goal % 10000 === 0 ? `${goal / 10000}만` : nf(goal);
  $('waitSub').textContent = `팔로우가 곧 탑승권이야. 탑승자 ${man} 명이 모이면 문이 열려.`;
  if (got > 0) { // 실제 집계가 있을 때만 숫자를 건다(가짜 숫자 금지 IMM-1)
    $('boardN').textContent = `${nf(got)}명 탑승`;
    $('boardGoal').textContent = `${nf(goal)}명이면 열림`;
    $('boardBar').style.width = Math.min(100, got / goal * 100).toFixed(1) + '%';
    const src = ship.sources || {};
    $('boardSrc').textContent = [ship.asOf && `${ship.asOf} 기준`, (src.instagram || src.youtube) && '인스타 팔로워 + 유튜브 구독자'].filter(Boolean).join(' · ');
    $('board').hidden = false;
  }
  const follow = $('goFollow');
  if (L.instagram) follow.href = L.instagram; else follow.remove();
  const note = $('waitNote'); let noteT = 0;
  const say = () => {
    note.textContent = `아직 잠겨 있어. 탑승자 ${man} 명이 모이면 문이 열려 — 지금 ${nf(got)}명, ${nf(Math.max(0, goal - got))}명 남았어.`;
    note.hidden = false; note.classList.remove('pop'); void note.offsetWidth; note.classList.add('pop');
    clearTimeout(noteT); noteT = setTimeout(() => { note.hidden = true; }, 6000);
  };
  if (isOpen) { // 3만 명이 차면 이 줄만 바뀐다(광장 화면 쪽 잠금도 함께 풀어야 한다 — wait-gate.js)
    const go = $('goWait'); go.replaceWith(h('a', { class: 'btn', href: 'maker.html?flow=join' }, '탑승하기', h('i', { 'aria-hidden': 'true' })));
    document.querySelector('.p-plaza').classList.remove('is-locked');
  } else {
    $('goWait').addEventListener('click', say);
    if (location.hash === '#wait') { requestAnimationFrame(() => { document.getElementById('wait').scrollIntoView({ block: 'center' }); say(); }); }
  }

  // ── 채널 바로가기(머리 줄 오른쪽 · 작게) — 11-28 대표 「유튜브,틱톡,페이스북 바로 연결되도록 버튼 만들어놔 조그만하게」 ──
  const SVG = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/>',
    youtube: '<path fill="currentColor" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>',
    tiktok: '<path fill="currentColor" d="M16.6 3h-3.2v12.2a2.7 2.7 0 1 1-2.7-2.7c.3 0 .5 0 .8.1V9.3a6 6 0 1 0 5.1 5.9V9a7.6 7.6 0 0 0 4.4 1.4V7.2A4.4 4.4 0 0 1 16.6 3z"/>',
    facebook: '<path fill="currentColor" d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/>',
  };
  const NAME = { instagram: '인스타그램', youtube: '유튜브', tiktok: '틱톡', facebook: '페이스북' };
  $('sns').replaceChildren(...['instagram', 'youtube', 'tiktok', 'facebook'].filter((k) => L[k]).map((k) => {
    const a = h('a', { href: L[k], target: '_blank', rel: 'noopener', 'aria-label': `돈워너노우 ${NAME[k]}`, title: NAME[k] });
    a.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${SVG[k]}</svg>`; return a;
  }));
})();
