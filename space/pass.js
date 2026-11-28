/* pass.js — 「내 탑승권」(2026-11-29). 서버 함수만 쓴다(Supabase · anon 키 = 공개용):
   ship_pass(아이디)  = 그 한 사람 줄(좌석·등급·탑승일·짐·벽 여부 + 명단 날짜)
   ship_wall()        = 스스로 벽에 건 사람만
   ship_wall_join(아이디) = 명단에 자리가 있는 아이디만 벽에 건다
   ship_stats(id=1)   = 지금 탑승 인원(탑승집계.py --push 가 30분마다 공식 API 값으로 씀)
   서버가 안 되면 숫자·좌석을 지어내지 않고 「못 불러왔어」라고 쓴다(IMM-1). */
(function () {
  'use strict';
  const D = window.DWK || {};
  const B = (D.world && D.world.backend) || {};
  const $ = (id) => document.getElementById(id);
  const nf = (x) => Math.round(+x || 0).toLocaleString('ko-KR');
  const seatNo = (n) => 'No.' + String(n).padStart(6, '0');
  const md = (s) => (typeof s === 'string' && s.length >= 10 ? s.slice(5, 10) : '');
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } },
  };
  const H = { apikey: B.anonKey, Authorization: `Bearer ${B.anonKey}`, 'content-type': 'application/json' };
  const call = async (path, opt = {}, ms = 6000) => {
    const ac = 'AbortController' in window ? new AbortController() : null; const t = setTimeout(() => ac && ac.abort(), ms);
    try { const r = await fetch(`${B.url}${path}`, { ...opt, headers: H, cache: 'no-store', signal: ac && ac.signal }); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
    finally { clearTimeout(t); }
  };
  const rpc = (fn, body) => call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(body || {}) });
  const ID_RE = /^[a-z0-9._]{1,30}$/;
  const clean = (v) => {
    let s = String(v || '').trim().toLowerCase();
    const m = s.match(/instagram\.com\/([a-z0-9._]{1,30})/); if (m) s = m[1]; // 프로필 주소를 붙여 넣어도
    return s.replace(/^@+/, '').replace(/\s+/g, '');
  };

  const err = $('err');
  const showErr = (msg) => { err.textContent = msg; err.hidden = !msg; };
  if (!B.url || !B.anonKey) { showErr('지금은 명단을 불러올 수 없어.'); $('go').disabled = true; return; }

  // ── 탑승권 ──
  const ticket = $('ticket'), tSeat = $('tSeat'), tClass = $('tClass'), tBag = $('tBag'), tNote = $('tNote'), tActs = $('tActs'), wallBtn = $('wallJoin');
  let cur = null;
  const setWall = (on) => {
    wallBtn.classList.toggle('done', !!on); wallBtn.disabled = !!on;
    wallBtn.firstChild.textContent = on ? '좌석 벽에 걸려 있어' : '좌석 벽에 내 아이디 걸기';
  };
  const render = (r, id) => {
    ticket.hidden = false; showErr('');
    const list = md(r.list_as_of);
    tSeat.classList.remove('word'); tBag.hidden = true; tActs.hidden = true;
    if (r.bag) { tBag.textContent = `챙긴 짐 · ${r.bag}`; tBag.hidden = false; }
    if (!r.found) {
      $('tLabel').textContent = `@${id}`;
      tSeat.textContent = '아직 명단에 없어'; tSeat.classList.add('word'); tClass.textContent = '';
      tNote.textContent = `${list ? list + ' ' : ''}탑승 명단에는 이 아이디가 없어. 그 뒤에 탔다면 다음 명단을 받을 때 팔로우한 순서대로 좌석 번호가 새겨져. 아이디 철자도 한 번 봐 줘.`;
    } else if (r.seat) {
      $('tLabel').textContent = `@${r.id} · 좌석 번호`;
      tSeat.textContent = seatNo(r.seat);
      tClass.textContent = [r.seat === 1 ? '우리 배' : (r.first ? '퍼스트클래스' : '일반석'), r.followed_on && `${md(r.followed_on)} 탑승`].filter(Boolean).join(' · ');
      tNote.textContent = `${list ? list + ' ' : ''}탑승 명단 기준이야.`;
      if (r.seat > 1) { setWall(r.on_wall); tActs.hidden = false; }
    } else {
      $('tLabel').textContent = `@${r.id}`;
      tSeat.textContent = '짐은 실렸어'; tSeat.classList.add('word'); tClass.textContent = '';
      tNote.textContent = `좌석 번호는 아직이야. ${list ? list + ' ' : ''}명단 다음에 탔다면 다음 명단을 받을 때 팔로우한 순서대로 새겨져.`;
    }
  };
  const find = async (raw) => {
    const id = clean(raw);
    if (!ID_RE.test(id)) { ticket.hidden = true; showErr('인스타 아이디는 영문 소문자·숫자·마침표·밑줄만 써.'); return; }
    $('idIn').value = id; $('go').disabled = true;
    try {
      const r = await rpc('ship_pass', { p_id: id });
      if (!r || !r.ok) throw new Error('bad');
      cur = r.found ? r.id : null; ls.set('pass_id', id); render(r, id);
    } catch (e) { ticket.hidden = true; showErr('지금 명단을 못 불러왔어. 잠시 뒤에 다시 찾아 줘.'); }
    finally { $('go').disabled = false; }
  };
  $('find').addEventListener('submit', (e) => { e.preventDefault(); find($('idIn').value); });
  wallBtn.addEventListener('click', async () => {
    if (!cur) return; wallBtn.disabled = true;
    try {
      const r = await rpc('ship_wall_join', { p_id: cur });
      if (!r || !r.ok) throw new Error(r && r.why);
      setWall(true); loadWall();
    } catch (e) { wallBtn.disabled = false; showErr('벽에 못 걸었어. 잠시 뒤에 다시 눌러 줘.'); }
  });

  // ── 지금 탑승 인원(라이브) ──
  const fmtAt = (iso) => { const d = new Date(iso); if (isNaN(d)) return ''; const k = new Date(d.getTime() + 9 * 3600e3); return `${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')} ${String(k.getUTCHours()).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')}`; };
  call('/rest/v1/ship_stats?id=eq.1&select=boarded,as_of').then(([row]) => {
    if (!row || !(row.boarded > 0)) return;
    const goal = +(D.ship && D.ship.openAt) || 30000, live = $('live');
    const b = document.createElement('b'); b.textContent = `${nf(row.boarded)}명 탑승`;
    live.replaceChildren(b, ` · ${nf(goal)}명이면 문이 열려${row.as_of ? ` · ${fmtAt(row.as_of)} 기준` : ''}`);
    live.hidden = false;
  }).catch(() => { /* 숫자를 못 받으면 줄을 안 보인다 */ });

  // ── 좌석 벽 ──
  const plates = $('plates');
  const li = (no, id, empty) => { const e = document.createElement('li'); if (empty) e.className = 'empty'; const b = document.createElement('b'); b.textContent = no; const s = document.createElement('span'); s.textContent = id; e.append(b, s); return e; };
  function loadWall() {
    rpc('ship_wall').then((w) => {
      const rows = (w && Array.isArray(w.list) ? w.list : []).filter((x) => x && x.no && x.id).sort((a, b) => a.no - b.no);
      const kids = rows.map((x) => li(seatNo(x.no), '@' + x.id));
      if (rows.length <= 1) kids.push(li('', '아직 스스로 건 탑승객이 없어.', true));
      plates.replaceChildren(...kids);
    }).catch(() => plates.replaceChildren(li('', '벽을 못 불러왔어.', true)));
  }
  loadWall();

  const saved = ls.get('pass_id', '');
  if (saved && ID_RE.test(saved)) find(saved);
})();
