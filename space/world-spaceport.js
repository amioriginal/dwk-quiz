/* world-spaceport.js — 우주 광장의 「우주 정거장」 + 테일즈런너식 따라가기
   대표 원문(2026-11-19~20): 「다른 사람들의 행성도 방문 할 수 있게끔 우주선 타는 곳도 만들어서 진짜 다른 행성까지 우주선 위에 올라타서 가고 도착하는것도」
                              「테일즈런너에서 따라가기 기능 있잖아. 그것도 차용하는것도 좋을듯」
   흐름: 정거장에서 행성 고르기 → 캐릭터가 우주선 꼭대기에 올라탐 → 이륙 → 워프 → town.html?o=주인&arrive=1#t=코드 (착륙은 town.js)
         돌아올 땐 town 에서 world.html?from=spaceport&land=1 → 여기서 우주선이 내려와 정거장에 착륙.
   따라가기: 로비(누가 지금 어디 있나)를 보고, 같은 광장이면 그 친구 옆으로 순간 이동, 다른 행성이면 우주선 타고 그 행성으로. */
import { makeShip, warp } from './dwk-ship.js?v=3';

export function install(EXT) {
  const { THREE, polar, mesh, mat, sign, el, ic, DC, K, player, net, Q } = EXT;
  const A = -2.38, R = 11.6; const [px, pz] = polar(R, A); const [sx, sz] = polar(9.4, A);

  // ── 정거장 모형 ──
  const pad = new THREE.Group(); pad.position.set(px, 0, pz); pad.rotation.y = Math.atan2(-px, -pz); EXT.world.add(pad);
  pad.add(mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.22, 40), mat(0x2b2f45), 0, 0.11, 0));
  pad.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.05, 40), mat(0xfff4dc), 0, 0.245, 0, false));
  pad.add(mesh(new THREE.TorusGeometry(1.15, 0.05, 8, 48).rotateX(Math.PI / 2), mat(0xffcf3a, { emissive: 0xffcf3a, emissiveIntensity: 0.6 }), 0, 0.28, 0, false));
  const lights = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const l = mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fd8ff }), Math.sin(a) * 1.68, 0.26, Math.cos(a) * 1.68, false); pad.add(l); lights.push(l); }
  const post = mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), mat(0x2b2f45), 1.9, 1.3, 0.9); pad.add(post);
  const s = sign('우주 정거장', 1.7, 0.42, '#1f1a2e', '#7fd8ff'); s.position.set(1.9, 2.45, 1.0); s.rotation.y = 0.5; pad.add(s);
  const ship = makeShip(THREE); ship.group.position.set(0, 0.25, 0); pad.add(ship.group);
  pad.traverse(m => { m.userData.fac = 'spaceport'; });
  EXT.COL.push({ x: px, z: pz, r: 0.75 });
  EXT.addFac({ id: 'spaceport', name: '우주 정거장', icon: 'arrow', act: '다른 행성 가기', at: [sx, sz], open: () => openPort(), tagAt: [px, pz], tagY: 4.4 });

  // ── 로비: 누가 지금 어디 있나(따라가기) ──
  let lobby = null, people = [];
  EXT.onSpawn(() => {
    if (EXT.GUEST || !net.lobby) return;
    lobby = net.lobby({ name: EXT.displayName(), code: K.encodeChar(EXT.me()), place: 'plaza', placeName: '우주 광장' });
    lobby.on((list) => { people = list; const b = document.getElementById('followBtn'); if (b) b.querySelector('span').textContent = list.length ? `친구 ${list.length}` : '친구'; });
    addEventListener('pagehide', () => lobby?.leave());
  });
  EXT.addButton({ id: 'followBtn', icon: 'user', label: '친구', onClick: () => openFriends() });

  const placeText = (p) => p.place === 'plaza' ? '우주 광장에 있어' : p.place === 'town' ? `${p.placeName || '어느 행성'}에 있어` : '어딘가 있어';
  function friendRows(list) {
    if (!list.length) return [el('p', { class: 'note' }, net.mode === 'local' ? '시험판이라 같은 브라우저의 다른 창만 보여.' : '지금 접속한 다른 주민이 없어. 친구에게 링크를 보내 봐!')];
    return [el('ul', { class: 'list' }, list.map(p => el('li', {},
      el('span', { class: 'n' }, el('b', {}, p.name || '주민'), el('small', {}, placeText(p))),
      el('button', { class: 'k sun', type: 'button', style: 'padding:9px 10px', onclick: () => follow(p) }, '따라가기'))))];
  }
  function openFriends() {
    EXT.sheet('친구', el('p', { class: 'lead' }, '「따라가기」를 누르면 친구 옆으로 순간이동!'), ...friendRows(people),
      el('button', { class: 'btn k', type: 'button', onclick: () => openPort() }, ic('arrow'), '우주 정거장 행성 목록'));
  }
  function follow(p) {
    EXT.closeSheet(); DC.sfx('tap');
    if (p.place === 'town' && p.town) return depart({ code: p.town, owner: p.owner, name: p.placeName || '친구의 행성' });
    const peer = EXT.peers.get(p.id);
    if (!peer) { EXT.toast('광장에 있긴 한데 아직 화면에 안 보여. 조금 뒤 다시 눌러 줘'); return; }
    // 테일즈런너처럼 친구 옆으로 순간 이동(반짝)
    const q = peer.root.position; const a = Math.random() * Math.PI * 2; poof(player.root.position);
    player.root.position.set(q.x + Math.sin(a) * 1.1, 0, q.z + Math.cos(a) * 1.1); player.target = null; EXT.stepCameraSnap(); poof(player.root.position);
    EXT.log('', `${p.name || '친구'} 옆으로 왔어`, false, true);
  }
  const poofs = [];
  function poof(at) {
    const g = new THREE.Group(); g.position.set(at.x, 0.6, at.z);
    for (let i = 0; i < 10; i++) { const m2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffcf3a : 0x7fd8ff, transparent: true })); m2.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3); g.add(m2); }
    EXT.scene.add(g); poofs.push({ g, t: 0 }); DC.sfx('unlock');
  }

  // ── 행성 목록 ──
  async function openPort() {
    const box = el('div', {}, el('p', { class: 'note' }, '행성 목록을 불러오는 중…'));
    const mine = !EXT.GUEST && el('button', { class: 'btn k sun', type: 'button', onclick: () => depart({ mine: true, name: '내 행성' }) }, ic('home'), '내 행성으로 날아가기');
    EXT.sheet('우주 정거장', el('p', { class: 'lead' }, '우주선을 타고 다른 사람 행성에 놀러 갈 수 있어.'), mine,
      el('h3', {}, '지금 접속한 친구'), ...friendRows(people), el('h3', {}, '공개된 행성'), box);
    let towns = []; try { towns = await net.towns?.list?.() || []; } catch (e) { console.warn('행성 목록 실패', e); }
    const me = net.me?.(); towns = towns.filter(t => t.owner !== me);
    if (!towns.length) { box.replaceChildren(el('p', { class: 'note' }, net.mode === 'local' ? '시험판이라 공개 행성 목록이 꺼져 있어.' : '아직 공개된 행성이 없어. 내 행성을 꾸미면 여기에 떠!')); return; }
    const planetName = (id) => DC.planet(id)?.name || '작은 행성';
    box.replaceChildren(el('ul', { class: 'list' }, towns.map(t => {
      const who = t.ig ? '@' + t.ig : K.charName(K.decodeChar(t.char_code) || K.defaultChar());
      const shielded = t.shield_until && new Date(t.shield_until) > new Date();
      return el('li', {}, el('span', { class: 'n' }, el('b', {}, t.town_name || '이름 없는 마을'), el('small', {}, `${who} · ${planetName(t.town_planet)}${shielded ? ' · 방어막 켜짐' : ''}`)),
        el('button', { class: 'k sky', type: 'button', style: 'padding:9px 10px', onclick: () => depart({ code: t.town_code, owner: t.owner, name: t.town_name || '이름 없는 마을' }) }, '출발'));
    })));
  }

  // ── 이륙 · 착륙 ──
  let flight = null; // { kind:'up'|'down', t, dur, then }
  const seatPos = new THREE.Vector3();
  function depart(dest) {
    if (flight) return; EXT.closeSheet();
    { const pp = player.root.position; if (Math.hypot(pp.x - sx, pp.z - sz) > 3 && EXT.navTo) { EXT.navTo('spaceport', { label: '우주 정거장', onArrive: () => depart(dest) }); return; } } // 멀면 정거장까지 데려다준 뒤 탑승 document.body.classList.add('w-flying');
    const p0 = player.root.position.clone(); ship.group.updateMatrixWorld(true); ship.seat.getWorldPosition(seatPos);
    const href = dest.mine ? 'town.html?arrive=1' : `town.html?o=${encodeURIComponent(dest.owner || '')}&arrive=1#t=${dest.code}`;
    lobby?.update({ place: 'flying', placeName: dest.name });
    flight = { kind: 'board', t: 0, dur: 0.7, p0, then: () => { EXT.playerAnim('idle', false); flight = { kind: 'up', t: 0, dur: 2.4, then: async () => { const w = await warp(`${dest.name}(으)로 가는 중`, 1700); location.href = href; setTimeout(() => w.remove(), 4000); } }; DC.sfx('swipe'); } };
    EXT.playerAnim('jump', true); DC.buzz([20, 40, 60]);
  }
  function landFromSpace() {
    history.replaceState(null, '', location.pathname); // 새로고침해도 다시 착륙하지 않게
    document.body.classList.add('w-flying'); ship.group.position.y = 26; ship.setThrust(0.7); EXT.playerAnim('idle', false);
    flight = { kind: 'down', t: 0, dur: 2.6, then: () => { // 내려서 정거장 옆에 선다
      const [ox, oz] = polar(R - 2.3, A); player.root.position.set(ox, 0, oz); player.root.rotation.y = Math.atan2(-ox, -oz);
      EXT.playerAnim('jump', true); ship.setThrust(0); document.body.classList.remove('w-flying'); EXT.stepCameraSnap(); flight = null;
      EXT.log('', '우주선 타고 광장으로 돌아왔어', false, true); DC.sfx('land'); DC.buzz(40);
    } };
  }
  if (Q.get('from') === 'spaceport') EXT.onSpawn(() => setTimeout(landFromSpace, 50));

  const st = document.createElement('style');
  st.textContent = 'body.world.w-flying .w-joy,body.world.w-flying .w-chat,body.world.w-flying .w-emote,body.world.w-flying .w-act,body.world.w-flying .w-side,body.world.w-flying .w-coach,body.world.w-flying .w-keys{display:none!important}';
  document.head.append(st);

  const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  EXT.onTick((dt, t) => {
    lights.forEach((l, i) => { l.material.color.setHex(((Math.floor(t * 3) + i) % 4 === 0) ? 0xffcf3a : 0x7fd8ff); });
    ship.tick(dt);
    for (let i = poofs.length - 1; i >= 0; i--) { const f = poofs[i]; f.t += dt; f.g.children.forEach(m2 => { m2.position.addScaledVector(m2.userData.v, dt); m2.userData.v.y -= 6 * dt; m2.material.opacity = 1 - f.t / 0.8; }); if (f.t > 0.8) { EXT.scene.remove(f.g); poofs.splice(i, 1); } }
    if (!flight) { ship.group.position.y += (0.25 + Math.sin(t * 1.5) * 0.04 - ship.group.position.y) * 0.1; return; }
    flight.t += dt; const k = Math.min(1, flight.t / flight.dur);
    ship.group.updateMatrixWorld(true); ship.seat.getWorldPosition(seatPos);
    if (flight.kind === 'board') { // 깡총 뛰어 꼭대기로
      const e = ease(k); player.root.position.lerpVectors(flight.p0, seatPos, e); player.root.position.y = seatPos.y * e + Math.sin(k * Math.PI) * 1.4;
    } else if (flight.kind === 'up') {
      const e = k * k; ship.setThrust(0.4 + k * 0.6); ship.group.position.y = 0.25 + e * 30; ship.group.position.x = Math.sin(t * 30) * 0.03 * (1 - k);
      player.root.position.copy(seatPos);
    } else if (flight.kind === 'down') {
      const e = 1 - Math.pow(1 - k, 3); ship.group.position.y = 26 - e * 25.75; ship.setThrust(0.9 - k * 0.6); player.root.position.copy(seatPos);
    }
    // 카메라: 정거장을 옆에서 올려다본다
    const c = EXT.camera; const sp = new THREE.Vector3(px, 0, pz); const side = new THREE.Vector3(-pz, 0, px).normalize();
    const look = new THREE.Vector3(px, player.root.position.y + 0.8, pz);
    c.position.copy(sp).addScaledVector(side, 7.5).add(new THREE.Vector3(0, Math.max(3, player.root.position.y * 0.6 + 2), 0)).addScaledVector(sp.clone().normalize(), -3);
    c.lookAt(look);
    if (k >= 1 && !flight.done) { flight.done = true; flight.then(); }
  });
  window.__spaceport = { openPort, openFriends, depart, follow, landFromSpace, get people() { return people; }, ship };
}
