// start.js — 돈워너노우 첫 화면: 「우주선에서 광장으로 떨어지는 장면」 영상 한 번 → 착지 순간 글·버튼
// 2026-11-20 대표 「사이트 첫 화면 후킹이 너무 약함」 → 「떨어지는 장면으로 낚는데 글을 담백하고 짧은데 후킹되는 포인트를 짚었으면」.
// 영상 = 광장 입장 연출(world.js shipDrop)을 world.html?guest=1&film=1 에서 찍은 것(media/drop.mp4·webm, 4.5초).
//   0.0~0.6 우주선 · 0.6 문 열림 · 0.6~2.4 낙하 · 2.4 착지(광장 시점) · ~4.5 광장에서 멈춤
// 이전 판(three.js 행성계 탄생 연출)은 reports/돈워너노우_게임_20261119/world_검수/start_이전판_20261120/ 에 그대로 있다.
(function () {
  'use strict';
  const LAND_SEC = 2.4;   // 영상 안 착지 순간 — 글·버튼이 여기서 뜬다
  const READY_MS = 2500;  // 영상이 늦어도 버튼은 이 안에(기존 기준: 첫 3초 안에 버튼)
  const STALL_MS = 1800;  // 이만큼 지나도 영상이 한 칸도 안 움직이면 착지 그림으로 바꾼다

  const D = window.DWK || { site: {} };
  const site = D.site || {};
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const video = $('drop');
  const still = $('dropStill');
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } },
  };
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ── 글자·버튼 채우기(영상과 무관) ──
  const insta = $('insta');
  if (site.links && site.links.instagram) { insta.href = site.links.instagram; insta.textContent = '@' + (site.handle || 'instagram'); }
  else insta.remove();
  if (ls.get('dwk_char')) { $('ctaReturn').hidden = false; $('ctaGuest').hidden = true; }
  const ad = document.querySelector('.ad-slot[data-slot="start-bottom"]');
  if (ad) ad.hidden = !site.ads;

  let ready = false;
  function showReady() {
    if (ready) return;
    ready = true;
    clearTimeout(window.__dwkSafety);
    body.classList.add('ready');
    ls.set('dwk_intro_seen', '1');
  }

  // 영상 없이 착지 장면 그림으로(자동재생 막힘 · 저전력 모드 · 불러오기 실패 · 동작 줄이기)
  let stilled = false;
  function useStill(reason) {
    if (stilled) return;
    stilled = true;
    if (reason) console.info('첫 화면: 영상 대신 그림 —', reason);
    if (still && !still.src) still.src = still.dataset.src;
    body.classList.add('still');
    try { video.pause(); } catch (e) { /* 이미 멈춤 */ }
    showReady();
  }

  setTimeout(showReady, READY_MS);
  if (ls.get('dwk_intro_seen')) showReady(); // 두 번째부터는 글·버튼이 바로(영상은 뒤에서 그대로 돈다)

  if (reduceMotion || !video || typeof video.play !== 'function') { useStill(reduceMotion ? '동작 줄이기 설정' : '영상 미지원'); return; }

  // 착지 순간 맞추기: 프레임마다 재생 위치 확인(requestVideoFrameCallback 있으면 그것, 없으면 rAF)
  const rvfc = typeof video.requestVideoFrameCallback === 'function';
  function watch() {
    if (ready) return;
    if (video.currentTime >= LAND_SEC) { showReady(); return; }
    if (rvfc) video.requestVideoFrameCallback(watch); else requestAnimationFrame(watch);
  }

  let moved = false;
  video.addEventListener('playing', () => { moved = true; body.classList.add('playing'); watch(); });
  video.addEventListener('ended', () => { showReady(); body.classList.add('ended'); }); // 마지막 장면(착지한 광장)에서 멈춘다 — loop 없음
  // 소스 두 개가 다 실패하면 마지막 <source> 에 error 가 난다
  // 마지막 <source> 의 onerror(start.html 안에 직접 걸어 둠 — defer 스크립트보다 먼저 실패해도 놓치지 않게)
  window.__dropOnFail = () => useStill('영상 파일 불러오기 실패');
  if (window.__dropFail || video.error) { useStill('영상 파일 없음'); return; }
  video.addEventListener('error', () => useStill('영상 재생 오류'));
  setTimeout(() => { if (!moved && !stilled) useStill('영상이 시작되지 않음'); }, STALL_MS + READY_MS);

  // 화면을 누르면 바로 착지 장면으로(기다리기 싫은 사람)
  video.addEventListener('pointerdown', () => {
    if (ready) return;
    try { if (isFinite(video.duration)) video.currentTime = Math.max(LAND_SEC, video.duration - 0.05); } catch (e) { /* 위치 이동 실패해도 글은 뜬다 */ }
    showReady();
  });

  const p = video.play();
  if (p && typeof p.catch === 'function') p.catch((e) => useStill('자동재생 막힘 · ' + (e && e.name)));
})();
