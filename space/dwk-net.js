/* dwk-net.js — 돈워너노우 우주 광장의 「서버 연결」 한 곳 (로그인 · 내 정보 · 광장 실시간 · 하트 · 점수)
   화면(world.js)은 이 파일의 약속만 쓴다. 서버를 바꿔도 화면은 그대로다.
   - local    : 서버 없음. 내 정보는 이 기기에만, 광장은 같은 브라우저의 다른 탭끼리만 보인다(BroadcastChannel).
   - supabase : data.js world.backend = { type:'supabase', url, anonKey } 를 채우면 켜진다.
                anonKey 는 공개용 키(브라우저에 들어가도 되는 키)다. 비밀 키(service_role)는 절대 여기 넣지 않는다.
                표·규칙은 backend/supabase_schema.sql. 2026-11-19 프로젝트 dwk-plaza(서울)에 설치·연결.
   약속(둘 다 같다):
     net.mode · net.user() · net.signIn(provider) · net.signOut()
     net.profile.get() · net.profile.save(p)
     net.room(name) → { join(me), move(st), say(text), leave(), on(evt, cb), count() }   evt: peer · leave · chat
     net.hearts.give(code) → { ok, left, msg } · net.hearts.counts() → { 코드: 수 } | null(셀 수 없음)
     net.scores.submit(game, score) · net.scores.top(game, n) → [{ code, ig, score }] | null */

const DC = window.DC;
const rid = () => Math.random().toString(36).slice(2, 10);
const today = () => DC.today();

// ───────── 서버 없음(이 기기) ─────────
function localNet() {
  const tabId = rid();
  let user = DC.store.get('account', null); // { id, provider:'device' }
  const net = {
    mode: 'local',
    user: () => user,
    async signIn(provider) {
      if (provider !== 'device') return { ok: false, msg: '구글·카카오 로그인은 서버를 연결한 뒤에 켜져. 지금은 이 기기에 저장돼.' };
      user = user || { id: 'dev-' + rid(), provider: 'device', at: Date.now() }; DC.store.set('account', user); return { ok: true, user };
    },
    async signOut() { user = null; DC.store.set('account', null); },
    profile: {
      async get() { return DC.store.get('profile', null); },
      async save(p) { DC.store.set('profile', { ...p, updated: Date.now() }); return { ok: true }; },
    },
    room(name) {
      const ch = 'BroadcastChannel' in window ? new BroadcastChannel('dwk-world-' + name) : null;
      const peers = new Map(); const cbs = { peer: [], leave: [], chat: [], msg: [] }; let me = null, beat = 0;
      const emit = (e, d) => cbs[e].forEach(f => { try { f(d); } catch (err) { console.error(err); } });
      const send = (m) => { try { ch?.postMessage({ ...m, from: tabId }); } catch (e) { console.warn('광장 신호를 못 보냄', e); } };
      if (ch) ch.onmessage = ({ data: m }) => {
        if (!m || m.from === tabId) return;
        if (m.t === 'hi' || m.t === 'mv') { const p = { id: m.from, ...(peers.get(m.from) || {}), ...m.me, ...(m.st ? { st: m.st } : {}), seen: Date.now() }; peers.set(m.from, p); emit('peer', p); if (m.t === 'hi' && m.ask) send({ t: 'hi', me }); }
        else if (m.t === 'bye') { peers.delete(m.from); emit('leave', { id: m.from }); }
        else if (m.t === 'chat') emit('chat', { id: m.from, text: m.text, name: m.name, at: Date.now() });
        else if (m.t === 'x') emit('msg', { id: m.from, type: m.type, data: m.data });
      };
      const sweep = setInterval(() => { const now = Date.now(); for (const [id, p] of peers) if (now - p.seen > 6000) { peers.delete(id); emit('leave', { id }); } if (me && now - beat > 2000) { beat = now; send({ t: 'mv', me, st: me.st }); } }, 1000);
      addEventListener('pagehide', () => send({ t: 'bye' }));
      return {
        join(m) { me = m; send({ t: 'hi', me, ask: true }); },
        move(st) { if (!me) return; me.st = st; beat = Date.now(); send({ t: 'mv', me: { code: me.code, name: me.name }, st }); },
        update(m) { me = { ...me, ...m }; send({ t: 'hi', me }); },
        say(text) { send({ t: 'chat', text, name: me?.name }); },
        emit(type, data) { send({ t: 'x', type, data }); },
        leave() { send({ t: 'bye' }); clearInterval(sweep); ch?.close(); },
        on(e, f) { cbs[e]?.push(f); },
        count: () => peers.size + 1,
        live: !!ch,
      };
    },
    hearts: {
      give(code) {
        const per = window.DWK.plaza?.perDay || 3; const k = 'hearts_' + today(); const used = DC.store.get(k, []);
        if (used.includes(code)) return { ok: false, left: per - used.length, msg: '오늘 이 주민한테는 이미 줬어' };
        if (used.length >= per) return { ok: false, left: 0, msg: '오늘 하트를 다 썼어. 내일 또 와!' };
        used.push(code); DC.store.set(k, used); return { ok: true, left: per - used.length, msg: '❤️ 하트를 줬어' };
      },
      counts: async () => null, // 서버가 없으면 다른 사람 하트를 셀 수 없다 → 숫자를 보이지 않는다(가짜 숫자 금지)
    },
    prog: { save: async () => ({ ok: false }), load: async () => null },
    towns: { publish: async () => ({ ok: false }), list: async () => [] }, // 서버 없으면 다른 사람 행성 목록이 없다
    pranks: { list: async () => [], add: async () => ({ ok: false, msg: '서버가 꺼져 있어' }), clean: async () => ({ ok: false }) },
    shield: { of: async () => null, add: async () => ({ ok: false, msg: '서버가 꺼져 있어' }) },
    attack: { earn: async () => ({ ok: false, msg: '서버가 꺼져 있어' }), count: async () => 0 },
    lobby(me) { // 같은 브라우저의 다른 창끼리만(시험판)
      const ch = 'BroadcastChannel' in window ? new BroadcastChannel('dwk-lobby') : null; const list = new Map(); const cbs = []; let mine = me;
      const fire = () => cbs.forEach(f => f([...list.values()]));
      if (ch) ch.onmessage = ({ data: m }) => { if (!m || m.from === tabId) return; if (m.t === 'bye') list.delete(m.from); else { list.set(m.from, { id: m.from, ...m.me, seen: Date.now() }); if (m.ask) ch.postMessage({ t: 'hi', from: tabId, me: mine }); } fire(); };
      const beat = setInterval(() => { ch?.postMessage({ t: 'hi', from: tabId, me: mine }); const now = Date.now(); for (const [k, v] of list) if (now - v.seen > 8000) list.delete(k); fire(); }, 3000);
      ch?.postMessage({ t: 'hi', from: tabId, me: mine, ask: true }); addEventListener('pagehide', () => ch?.postMessage({ t: 'bye', from: tabId }));
      return { update(m) { mine = { ...mine, ...m }; ch?.postMessage({ t: 'hi', from: tabId, me: mine }); }, on(f) { cbs.push(f); }, list: () => [...list.values()], leave() { clearInterval(beat); ch?.postMessage({ t: 'bye', from: tabId }); ch?.close(); } };
    },
    names: async () => ({}),
    scores: {
      async submit(game, score) { const k = 'scores'; const s = DC.store.get(k, {}); if (!(s[game] >= score)) { s[game] = score; DC.store.set(k, s); } return { ok: true, local: true }; },
      top: async () => null,
    },
  };
  return net;
}

// ───────── Supabase(무료 한도 안) ─────────
// 2026-11-19 연결. 「이 기기」 = 익명 로그인(signInAnonymously). 구글·카카오는 data.js world.providers 에 넣은 것만 켠다.
async function supabaseNet(cfg) {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  const sb = createClient(cfg.url, cfg.anonKey, { auth: { flowType: 'pkce' }, realtime: { params: { eventsPerSecond: 8 } } }); // PKCE(11-28 보안): 돌아오는 주소에 열쇠 대신 일회용 코드 — dwk-account.js 와 같은 방식
  let session = (await sb.auth.getSession()).data.session;
  sb.auth.onAuthStateChange((_e, s) => { session = s; });
  const uid = () => session?.user?.id || null;
  return {
    mode: 'supabase',
    user: () => session ? { id: session.user.id, provider: session.user.app_metadata?.provider || 'oauth' } : null,
    async signIn(provider) {
      if (provider === 'device') { // 회원가입 없이 이 기기 전용 계정(익명 로그인) — 나중에 구글·카카오로 이어 붙일 수 있다
        if (session) return { ok: true, user: { id: session.user.id } };
        const { data, error } = await sb.auth.signInAnonymously(); if (error) return { ok: false, msg: '로그인을 못 했어: ' + error.message };
        session = data.session; return { ok: true, user: { id: data.user.id } };
      }
      if (!(window.DWK.world?.providers || []).includes(provider)) return { ok: false, msg: '이 로그인은 아직 준비 중이야. 「이 기기에서 바로 시작」으로 들어와 줘' };
      const opts = { provider, options: { redirectTo: location.href.split('#')[0] } };
      // 이 기기 계정(익명)이 이미 있으면 새 계정을 만들지 않고 이어 붙인다 → 캐릭터·점수·내 행성이 그대로(11-28 「선택 연동으로 만들어」)
      const { error } = session?.user?.is_anonymous ? await sb.auth.linkIdentity(opts) : await sb.auth.signInWithOAuth(opts);
      return error ? { ok: false, msg: '로그인을 못 열었어: ' + error.message } : { ok: true, redirect: true };
    },
    async signOut() { await sb.auth.signOut(); },
    profile: {
      async get() { if (!uid()) return null; const { data, error } = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle(); if (error) { console.error(error); return null; } return data && { ig: data.ig, gender: data.gender, age: data.age_band, over14: data.over14, agree: data.agree || {}, followCode: data.follow_code, follow: data.follow_status, charCode: data.char_code }; },
      async save(p) {
        if (!uid()) return { ok: false, msg: '로그인이 풀렸어. 다시 들어와 줘' };
        const row = { id: uid(), ig: p.ig || null, gender: p.gender || null, age_band: p.age || null, over14: !!p.over14, agree: p.agree || {}, follow_code: p.followCode, char_code: p.charCode, updated_at: new Date().toISOString() };
        const { error } = await sb.from('profiles').upsert(row); return error ? { ok: false, msg: error.message } : { ok: true };
      },
    },
    room(name) {
      const myKey = uid() || 'guest-' + rid(); // 구경꾼도 겹치지 않는 열쇠
      const ch = sb.channel('world:' + name, { config: { presence: { key: myKey }, broadcast: { self: false } } });
      const cbs = { peer: [], leave: [], chat: [], msg: [] }; const emit = (e, d) => cbs[e].forEach(f => f(d)); let me = null; let count = 1;
      const known = new Set(); // 이미 본 주민은 presence 의 옛 위치(st)를 다시 쓰지 않는다 — 누가 드나들 때마다 처음 자리로 튀던 문제
      ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(); count = Object.keys(st).length; for (const [id, arr] of Object.entries(st)) if (id !== myKey) { const p = { id, ...arr[0] }; if (known.has(id)) delete p.st; else known.add(id); emit('peer', p); } for (const id of known) if (!st[id]) known.delete(id); });
      ch.on('presence', { event: 'leave' }, ({ key }) => emit('leave', { id: key }));
      ch.on('broadcast', { event: 'mv' }, ({ payload }) => { if (payload.id !== myKey) { known.add(payload.id); emit('peer', { id: payload.id, st: payload.st }); } });
      ch.on('broadcast', { event: 'chat' }, ({ payload }) => emit('chat', { ...payload, at: Date.now() }));
      ch.on('broadcast', { event: 'x' }, ({ payload }) => { if (payload.id !== myKey) emit('msg', payload); });
      return {
        join(m) { me = m; ch.subscribe((s) => { if (s === 'SUBSCRIBED') ch.track({ code: m.code, name: m.name, st: m.st }); }); },
        move(st) { if (me) me.st = st; ch.send({ type: 'broadcast', event: 'mv', payload: { id: myKey, st } }); },
        update(m) { me = { ...me, ...m }; ch.track({ code: me.code, name: me.name, st: me.st }); },
        say(text) { ch.send({ type: 'broadcast', event: 'chat', payload: { id: myKey, text, name: me?.name } }); if (uid()) sb.from('chat_log').insert({ room: name, text }).then(({ error }) => { if (error) console.warn('채팅 기록 실패', error.message); }); },
        emit(type, data) { ch.send({ type: 'broadcast', event: 'x', payload: { id: myKey, type, data } }); },
        leave() { sb.removeChannel(ch); },
        on(e, f) { cbs[e]?.push(f); },
        count: () => count, live: true,
      };
    },
    logChat(room, text) { if (uid()) sb.from('chat_log').insert({ room, text }).then(({ error }) => { if (error) console.warn('채팅 기록 실패', error.message); }); }, // Cloudflare 방을 쓸 때도 채팅 기록은 여기(Supabase)에 남긴다
    hearts: {
      async give(code) { const { data, error } = await sb.rpc('give_heart', { p_code: code }); return error ? { ok: false, msg: error.message } : data; },
      async counts() { const { data, error } = await sb.from('heart_counts_week').select('code,hearts'); if (error) return null; return Object.fromEntries(data.map(r => [r.code, r.hearts])); },
    },
    // 레벨·코인·도감 백업(꾸미기 값 — 순위·보상엔 안 씀). 주민 등록한 사람만 줄이 있다
    prog: {
      async save(obj) { if (!uid()) return { ok: false }; const { error } = await sb.from('profiles').update({ prog: obj }).eq('id', uid()); return { ok: !error }; },
      async load() { if (!uid()) return null; const { data } = await sb.from('profiles').select('prog').eq('id', uid()).maybeSingle(); return data?.prog || null; },
    },
    // 우주 정거장: 내 행성(타운) 공개 · 다른 주민 행성 목록
    towns: {
      async publish(code, name, planet) { if (!uid()) return { ok: false }; const { error } = await sb.from('profiles').update({ town_code: code, town_name: name, town_planet: planet, town_at: new Date().toISOString() }).eq('id', uid()); return { ok: !error }; },
      async list() { const { data, error } = await sb.from('public_towns').select('owner,char_code,town_code,town_name,town_planet,ig,shield_until'); return error ? [] : data; },
    },
    // 행성 장난(흔적만 · 24시간) · 방어막 — 규칙은 서버 함수(do_prank·clean_prank·add_shield)가 정한다
    pranks: {
      async list(owner) { const { data, error } = await sb.from('pranks').select('id,by,by_name,kind,la,lo,item,created_at,cleaned_at').eq('owner', owner).order('created_at', { ascending: false }).limit(60); return error ? [] : data; },
      async add(owner, kind, la, lo, name, item = null) { const { data, error } = await sb.rpc('do_prank', { p_owner: owner, p_kind: kind, p_la: la, p_lo: lo, p_name: name, p_item: item }); return error ? { ok: false, msg: error.message } : data; }, // kind 'smash' = 공격권 1개로 소품 item(마을 코드 속 순서) 부수기
      async clean(id) { const { data, error } = await sb.rpc('clean_prank', { p_id: id }); return error ? { ok: false } : data; },
    },
    attack: { // 공격권: 하루 2개까지 얻기(퀴즈·게임 보상), 최대 5개
      async earn() { const { data, error } = await sb.rpc('earn_attack'); return error ? { ok: false, msg: error.message } : data; },
      async count() { const { data, error } = await sb.rpc('my_attack'); return error ? 0 : data; },
    },
    shield: {
      async of(owner) { const { data, error } = await sb.rpc('shield_of', { p_owner: owner }); return error ? null : data; },
      async add() { const { data, error } = await sb.rpc('add_shield'); return error ? { ok: false, msg: error.message } : data; },
    },
    me: () => uid(),
    // 로비: 누가 지금 어디(광장·누구의 행성)에 있는지 — 테일즈런너식 따라가기용. me = { name, code, place, placeName, town, owner }
    lobby(me) {
      const key = uid() || 'guest-' + rid(); const ch = sb.channel('lobby', { config: { presence: { key } } }); const cbs = []; let mine = me;
      const list = () => Object.entries(ch.presenceState()).filter(([k]) => k !== key).map(([k, arr]) => ({ id: k, ...arr[0] }));
      ch.on('presence', { event: 'sync' }, () => cbs.forEach(f => f(list())));
      ch.subscribe((st) => { if (st === 'SUBSCRIBED') ch.track(mine); });
      return { update(m) { mine = { ...mine, ...m }; ch.track(mine); }, on(f) { cbs.push(f); }, list, leave() { sb.removeChannel(ch); } };
    },
    // 생존자 코드 → 공개 동의한 인스타 아이디
    async names(codes) { if (!codes.length) return {}; const { data, error } = await sb.from('public_names').select('char_code,ig').in('char_code', codes); if (error) return {}; return Object.fromEntries(data.filter(r => r.ig).map(r => [r.char_code, r.ig])); },
    scores: {
      async submit(game, score) { if (!uid()) return { ok: false }; const { error } = await sb.rpc('submit_score', { p_game: game, p_score: Math.round(score) }); if (error) console.warn('점수 올리기 실패', error.message); return { ok: !error }; },
      async top(game, n = 10) { const { data, error } = await sb.from('score_top_week').select('code,ig,score').eq('game', game).limit(n); return error ? null : data; },
    },
  };
}

export async function createNet() {
  const cfg = window.DWK.world?.backend;
  let net = null;
  if (cfg?.type === 'supabase' && cfg.url && cfg.anonKey) {
    try { net = await supabaseNet(cfg); } catch (e) { console.error('서버 연결 실패 → 이 기기 모드', e); DC.toast('서버에 못 붙었어. 이 기기 모드로 열게'); }
  }
  net = net || localNet();
  // 광장 실시간 = Cloudflare 방 서버(2026-11-22 대표 「가 Cloudflare 이전」). 로그인·저장은 위 net 그대로.
  const rt = realtimeUrl();
  if (rt && 'WebSocket' in window) {
    const keyOf = () => (net.user?.()?.id ? String(net.user().id).slice(0, 12) : 'g') + '-' + rid(); // 창마다 새 번호 — 같은 사람이 탭 2개를 열어도 서로를 「나」로 착각하지 않게(11-22 시험에서 발견)
    net.room = (name) => wsRoom(rt, name, keyOf(), (text) => net.logChat?.(name, text));
    net.rt = rt;
  }
  return net;
}

// 실시간 서버 주소: data.js world.realtime.url. 시험용으로 ?rt=ws://127.0.0.1:8787 처럼 내 컴퓨터 주소만 덮어쓸 수 있다.
function realtimeUrl() {
  const q = new URLSearchParams(location.search).get('rt');
  if (q && /^ws:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(q)) return q;
  const u = window.DWK.world?.realtime?.url || '';
  return /^wss:\/\//.test(u) ? u : '';
}

// ───────── Cloudflare 방 서버(WebSocket) — 약속은 위 room 과 같다 ─────────
// 위치는 서버가 0.2초마다 한 묶음(mvs)으로 준다. 정원이 차면(full) 다음 방(plaza-2 …)으로 간다 — 주인장은 시각으로 계산하니 어느 방이든 같다.
// 끊기면 3번까지만 다시 붙는다(1·2·3초 뒤). 그래도 안 되면 「연결이 끊겼어」 안내 후 멈춘다(무한 재시도 금지).
function wsRoom(base, name, myKey, logChat) {
  const cbs = { peer: [], leave: [], chat: [], msg: [] };
  const emit = (e, d) => cbs[e].forEach(f => { try { f(d); } catch (err) { console.error(err); } });
  let ws = null, me = null, count = 1, closed = false, tries = 0, sub = 0, live = true; const known = new Set();
  const send = (o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
  function open() {
    const room = sub ? `${name}-${sub + 1}` : name;
    ws = new WebSocket(`${base.replace(/\/$/, '')}/room/${encodeURIComponent(room)}?id=${encodeURIComponent(myKey)}`);
    ws.onopen = () => { tries = 0; live = true; if (me) send({ t: 'hi', me }); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'welcome') { count = m.n || 1; for (const p of m.peers || []) { known.add(p.id); emit('peer', p); } }
      else if (m.t === 'peer') { if (m.n) count = m.n; known.add(m.id); emit('peer', { id: m.id, code: m.code, name: m.name, st: m.st }); }
      else if (m.t === 'mvs') { for (const [id, x, z, r] of m.l || []) if (id !== myKey) { known.add(id); emit('peer', { id, st: { x, z, r } }); } }
      else if (m.t === 'leave') { if (m.n != null) count = Math.max(1, m.n); known.delete(m.id); emit('leave', { id: m.id }); }
      else if (m.t === 'chat') emit('chat', { id: m.id, text: m.text, name: m.name, at: Date.now() });
      else if (m.t === 'x') emit('msg', { id: m.id, type: m.type, data: m.data });
      else if (m.t === 'full') sub++;
    };
    ws.onclose = (e) => {
      for (const id of known) emit('leave', { id }); known.clear(); count = 1; // 다시 붙으면 welcome 이 지금 있는 사람을 다시 알려 준다
      if (closed) return;
      if (e.code === 4001 && sub < 5) { open(); return; } // 정원 참 → 다음 방
      if (tries < 3) { tries++; setTimeout(() => { if (!closed) open(); }, 1000 * tries); return; }
      live = false; DC.toast('광장 연결이 끊겼어. 새로고침하면 다시 붙어');
    };
    ws.onerror = () => { /* onclose 가 이어서 처리한다 */ };
  }
  return {
    join(m) { me = { code: m.code, name: m.name, st: m.st }; if (!ws) open(); else send({ t: 'hi', me }); },
    move(st) { if (me) me.st = st; send({ t: 'mv', st }); },
    update(m) { me = { ...me, ...m }; send({ t: 'up', me: { code: me.code, name: me.name } }); },
    say(text) { send({ t: 'chat', text, name: me?.name }); logChat?.(text); },
    emit(type, data) { send({ t: 'x', type, data }); },
    leave() { closed = true; send({ t: 'bye' }); try { ws?.close(1000, 'bye'); } catch (e) { /* 이미 닫힘 */ } },
    on(e, f) { cbs[e]?.push(f); },
    count: () => count,
    get live() { return live; },
  };
}
