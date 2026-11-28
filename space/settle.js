/* settle.js — 「내 땅」: 고른 행성에 입주하고 좌석 번호를 받는다(2026-11-28)
   주소: settle.html?p=<행성id>  (인포크 DM 버튼에 번호별로 박는다 — 1번 댓글 → p=첫 행성 id …)
   서버: Supabase RPC settle(p_planet, p_device) → { ok, seat, total } · 같은 기기 = 같은 좌석(다시 와도 바뀌지 않음)
   숫자는 서버가 준 것만 보인다(IMM-1). 서버가 안 되면 「못 받았어」 — 좌석을 지어내지 않는다. */
(function () {
  'use strict';
  const D = window.DWK || {};
  const $ = (id) => document.getElementById(id);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem('dwk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dwk_' + k, JSON.stringify(v)); } catch (e) { /* 저장 못 해도 서버 좌석은 그대로 */ } },
  };
  const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };

  const all = (D.episodes || []).flatMap(ep => ep.planets.map(p => ({ ...p, ep })));
  const q = new URLSearchParams(location.search);
  const pid = (q.get('p') || '').toLowerCase().replace(/[^0-9a-z-]/g, '').slice(0, 16);
  const planet = all.find(p => p.id === pid);

  // 행성이 없으면 고르기(최신 편 4개)
  if (!planet) {
    $('hero').hidden = true; $('pick').hidden = false;
    const ep = (D.episodes || [])[0];
    if (ep) {
      $('pickEp').textContent = `${ep.label || ep.no + '편'} · ${ep.title}`;
      $('orbs').replaceChildren(...ep.planets.map((p, i) => h('li', {}, h('a', { href: `settle.html?p=${encodeURIComponent(p.id)}` }, h('img', { src: p.img, alt: '', decoding: 'async' }), h('span', {}, h('small', {}, String(i + 1).padStart(2, '0')), p.name)))));
    }
    return;
  }

  const epLabel = planet.ep.label || `${planet.ep.no}편`;
  document.title = `${planet.name} · 내 땅 · 돈워너노우`;
  const orb = $('orb'); orb.onload = () => orb.classList.add('on'); orb.src = planet.img;
  $('eyebrow').textContent = `${epLabel} · ${planet.ep.title}`;
  $('play').href = `survive.html?planet=${encodeURIComponent(planet.id)}&from=settle`;

  // 기기 번호(이 기기 하나 = 땅 하나) — 서버가 같은 좌석을 돌려주는 열쇠
  let dev = ls.get('dev', null);
  if (!dev || !/^[0-9a-z]{12,40}$/.test(dev)) {
    const a = new Uint8Array(12); (crypto || window.msCrypto).getRandomValues(a);
    dev = Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); ls.set('dev', dev);
  }

  const be = (D.world && D.world.backend) || null;
  const seatTxt = (n) => 'No.' + String(n).padStart(6, '0');
  const show = (seat, total) => {
    $('title').textContent = `${planet.name}에 네 땅이 생겼어`;
    $('eyebrow').textContent = `입주 완료 · ${epLabel} · ${planet.ep.title}`;
    $('seatNo').textContent = seatTxt(seat);
    $('pop').textContent = total > 1 ? `이 행성 입주민 ${total.toLocaleString('ko-KR')}명 · 너는 ${seat.toLocaleString('ko-KR')}번째` : '이 행성 첫 입주민이야';
    $('seatBox').hidden = false;
    $('sub').textContent = '이 행성엔 절대 하면 안 되는 게 하나 있어. 1년 동안 그것만 피하면 돼.';
    $('acts').hidden = false; $('more').hidden = false;
    const mine = ls.get('settle', {}) || {}; mine[planet.id] = seat; ls.set('settle', mine);
  };
  // 서버가 안 되면 「신청은 들어갔어」라고 하지 않는다(실제로 저장된 게 없다) — 못 받았다고 쓰고 다시 받기 단추를 준다
  const fail = () => {
    $('title').textContent = `${planet.name} 땅 번호를 아직 못 받았어`;
    $('eyebrow').textContent = `${epLabel} · ${planet.ep.title}`;
    $('err').textContent = '입주 서버가 답을 안 해. 잠깐 뒤에 다시 받아 줘. 게임은 지금 바로 할 수 있어.'; $('err').hidden = false;
    $('retry').hidden = !(be && be.url); $('retry').disabled = false;
    $('acts').hidden = false; $('more').hidden = false; // 게임은 서버 없이도 된다
  };
  const settle = () => {
    if (!be || be.type !== 'supabase' || !be.url || !be.anonKey) { fail(); return; }
    fetch(be.url.replace(/\/$/, '') + '/rest/v1/rpc/settle', {
      method: 'POST',
      headers: { apikey: be.anonKey, Authorization: 'Bearer ' + be.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_planet: planet.id, p_device: dev }),
    }).then(r => r.ok ? r.json() : Promise.reject(new Error('응답 ' + r.status)))
      .then(j => { if (j && j.ok && j.seat) { $('err').hidden = true; $('retry').hidden = true; show(j.seat, j.total || 1); } else fail(); })
      .catch(e => { console.warn('입주 서버', e); fail(); });
  };
  $('retry').addEventListener('click', () => { $('retry').disabled = true; $('err').textContent = '다시 받는 중…'; settle(); });
  settle();

  // 친구 불러서 이웃 만들기 — 같은 행성 주소를 보낸다(친구도 같은 행성에 입주)
  $('share').addEventListener('click', async () => {
    const url = new URL(`settle.html?p=${encodeURIComponent(planet.id)}`, location.href).href;
    const text = `나 ${planet.name}에 입주했어. 옆 땅 비어 있어`;
    try { if (navigator.share) { await navigator.share({ title: '돈워너노우', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); $('share').textContent = '주소 복사했어'; } catch (e) { $('share').textContent = url; }
  });
})();
