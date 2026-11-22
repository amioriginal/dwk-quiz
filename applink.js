'use strict';
// 인스타 링크를 웹(로그인 화면)이 아니라 인스타 앱으로 바로 연다 — 2026-11-21 대표 「바로 인스타 앱으로 연결되게 할 수 없나?」
// 원리(조사 2026-11-21): 인스타·카톡 같은 앱 안 브라우저에서는 https 인스타 주소가 앱으로 안 넘어가고 웹으로 열린다(Branch·Apple 포럼).
//   그래서 · 안드로이드 = intent:// 주소(앱이 없으면 browser_fallback_url로 웹)  · 아이폰 앱 안 브라우저 = instagram:// 주소
//          · 아이폰 사파리·컴퓨터 = 건드리지 않는다(사파리는 https 링크가 앱으로 열리는 유니버설 링크라 지금이 맞다)
//   형식 출처: short.io 문서 「How to create Instagram deep link」(발행일 미상 · 조회 2026-11-21)
//   앱이 1.6초 안에 안 열리면 화면 아래 「웹으로 열기」 띠만 띄운다(멋대로 다른 화면으로 넘기지 않는다).
(() => {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|KAKAOTALK|NAVER\(|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|DaumApps|everytimeApp/i.test(ua);
  const T = () => window.T || { ev() {} };
  const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const mediaId = code => { // 릴스 주소의 짧은 코드 → 앱이 쓰는 숫자 번호(64진수 풀기)
    if (typeof BigInt !== 'function' || code.length > 12) return null;
    let n = BigInt(0);
    for (const ch of code) { const i = AB.indexOf(ch); if (i < 0) return null; n = n * BigInt(64) + BigInt(i); }
    return n.toString();
  };
  const intent = (hostPath, web) => `intent://${hostPath}#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${encodeURIComponent(web)};end`;

  // 웹 주소 → 그 기기에서 앱을 여는 주소(모르는 주소면 null)
  const appUrl = web => {
    let u; try { u = new URL(web); } catch { return null; }
    const host = u.hostname.replace(/^www\./, ''), path = u.pathname;
    let m;
    if (host === 'instagram.com' && (m = path.match(/^\/(reel|reels|p)\/([A-Za-z0-9_-]+)\/?$/))) {
      if (android) return intent(`www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/`, web);
      const id = mediaId(m[2]); return id ? `instagram://media?id=${id}` : null;
    }
    if (host === 'instagram.com' && (m = path.match(/^\/([A-Za-z0-9._]{1,30})\/?$/))) {
      return android ? intent(`www.instagram.com/${m[1]}/`, web) : `instagram://user?username=${m[1]}`;
    }
    if (host === 'ig.me' && (m = path.match(/^\/m\/([A-Za-z0-9._]{1,30})\/?$/))) {
      // DM: 안드로이드는 앱의 DM 주소로. 아이폰 앱은 DM으로 바로 가는 공개 주소가 없어 프로필을 연다(거기서 「메시지」 한 번)
      return android ? intent(`ig.me/m/${m[1]}`, web) : `instagram://user?username=${m[1]}`;
    }
    return null;
  };
  // 이 기기에서 앱 주소로 바꿔 열어야 하나
  // 인스타 앱 자기 브라우저 안에서는 instagram://·intent:// 가 안 먹는다(11-23 대표 폰 실측: 아이폰 인스타 앱 안에서 누를 때마다 「앱이 안 열렸어?」 띠).
  // 거기선 바꾸지 않고 instagram.com 주소로 그냥 이동한다 — 인스타 앱이 자기 주소를 앱 화면으로 연다.
  const igApp = /Instagram/i.test(ua);
  // 아이폰 인스타 앱 안: instagram:// 도 instagram.com 도 안 됨(11-23 대표 폰 실측 — 앞은 무반응, 뒤는 웹을 거쳐 앱스토어). 넘기지 않고 안내만 한다.
  const iosIgApp = ios && igApp;
  // ※아이폰 인스타 앱 안: 스크립트로 instagram://user 로 넘기면 프로필이 앱으로 열림(11-21 대표 「열린다」 · ig.html).
  //   손가락으로 누르는 <a href="instagram://…"> 는 무반응(11-23 시험 화면) · instagram.com/reel/… 은 웹 → 앱스토어(11-23).
  //   11-23 시험 3판(DM 링크로 연 화면): 스크립트 instagram://media·user 전부 무반응 · instagram.com/p/… 는 웹으로만 열림.
  //   그런데 11-22 사연 「뽐내고 싶다」(인포크 = 프로필 링크로 연 화면)는 같은 스크립트 instagram://media 로 앱이 열렸다(대표 11-23 「누르면 바로 프로필로 연결되잖았어?」).
  //   ⇒ [추론] 갈림길은 「어디서 연 창이냐」. DM에서 연 창(?from=dm, 같은 창 안 이동 포함) = 안내만 · 그 밖 = 스크립트로 앱 시도, 안 열리면 안내.
  let fromDm = /[?&]from=dm(&|$)/.test(location.search);
  try { if (fromDm) sessionStorage.setItem('dwk_from_dm', '1'); else fromDm = sessionStorage.getItem('dwk_from_dm') === '1'; } catch { /* 저장 막힘 — 이 화면 주소로만 판단 */ }
  const guideOnly = iosIgApp && fromDm;
  const shouldTry = () => !guideOnly && (android || (ios && inApp));

  let bar = null;
  const fallback = web => {
    if (bar) bar.remove();
    bar = document.createElement('div'); bar.className = 'applink-bar'; bar.setAttribute('role', 'status');
    const p = document.createElement('span'); p.textContent = '인스타 앱이 안 열렸어?';
    const a = document.createElement('a'); a.href = web; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '웹으로 열기'; a.dataset.t = 'app_fb_web';
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '닫기'; x.dataset.t = 'app_fb_close'; x.onclick = () => { bar.remove(); bar = null; };
    a.addEventListener('click', () => setTimeout(() => { if (bar) { bar.remove(); bar = null; } }, 300));
    bar.append(p, a, x);
    Object.assign(bar.style, { position: 'fixed', left: '12px', right: '12px', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', zIndex: '9999',
      display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '14px',
      background: 'rgba(16,16,32,.96)', color: '#fff', font: '15px/1.3 -apple-system,"Apple SD Gothic Neo",sans-serif', boxShadow: '0 6px 24px rgba(0,0,0,.35)' });
    Object.assign(a.style, { color: '#111', background: '#FFD447', padding: '8px 12px', borderRadius: '10px', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' });
    Object.assign(x.style, { background: 'none', border: '0', color: 'rgba(255,255,255,.7)', font: 'inherit', padding: '4px' });
    document.body.append(bar);
    T().ev('click', { el: 'app_fb_show' });
  };

  // 아이폰 인스타 앱 안: 넘기지 않고 「창 닫고 찾기」 안내 띠(웹으로 넘기면 앱스토어로 샌다 · 11-23 실측)
  const guide = what => {
    if (bar) bar.remove();
    bar = document.createElement('div'); bar.className = 'applink-bar'; bar.setAttribute('role', 'status');
    const p = document.createElement('span');
    p.textContent = what === '영상' ? '인스타 앱 안에선 바로 못 넘어가요! 왼쪽 위 ✕로 창 닫고 프로필 맨 위 영상을 눌러 주세요!'
      : what === 'DM' ? '왼쪽 위 ✕로 창 닫고 돈워너노우 프로필의 「메시지」를 눌러 주세요!' : '왼쪽 위 ✕로 창 닫으면 돈워너노우 프로필이에요!';
    const x = document.createElement('button'); x.type = 'button'; x.textContent = '닫기'; x.dataset.t = 'ig_guide_close'; x.onclick = () => { bar.remove(); bar = null; };
    bar.append(p, x);
    Object.assign(bar.style, { position: 'fixed', left: '12px', right: '12px', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', zIndex: '9999',
      display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '14px',
      background: 'rgba(16,16,32,.97)', color: '#fff', font: '15px/1.45 -apple-system,"Apple SD Gothic Neo",sans-serif', boxShadow: '0 6px 24px rgba(0,0,0,.35)', wordBreak: 'keep-all' });
    Object.assign(x.style, { background: 'none', border: '0', color: 'rgba(255,255,255,.7)', font: 'inherit', padding: '4px', flex: 'none' });
    document.body.append(bar);
    T().ev('click', { el: 'ig_guide_' + what });
  };

  // 인스타 웹 주소를 앱으로 연다. 바꿀 필요가 없는 기기면 false를 돌려준다(그땐 원래 링크대로 둔다).
  window.openIG = (web, opts = {}) => {
    const what = /instagram\.com\/(reel|reels|p)\//.test(web) ? '영상' : /ig\.me\//.test(web) ? 'DM' : '프로필';
    if (guideOnly) { guide(what); return true; } // DM에서 연 창: 넘기지 않고 안내만
    const app = shouldTry() ? appUrl(web) : null;
    if (!app) {
      if (opts.navigate) { if (opts.newTab) window.open(web, '_blank', 'noopener'); else location.href = web; }
      return false;
    }
    let gone = false; const mark = () => { gone = true; };
    document.addEventListener('visibilitychange', mark, { once: true }); window.addEventListener('pagehide', mark, { once: true });
    location.href = app;
    setTimeout(() => { if (!gone && document.visibilityState === 'visible') { if (iosIgApp) guide(what); else fallback(web); } }, 1600); // 아이폰 인스타 앱 안은 웹으로 보내면 앱스토어로 샌다 → 안내
    return true;
  };
  // 누른 그 순간에 바로 복사(기다리지 않음) — 기다렸다 넘기면 인스타 앱 안 브라우저가 앱 열기를 막는다(웹 조사 11-23: WarpLink·Airbridge 「사용자가 누른 순간의 이동만 앱을 연다」)
  window.openIG.copyNow = t => {
    let ok = false;
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta);
    ta.select(); ta.setSelectionRange(0, t.length);
    try { ok = document.execCommand('copy'); } catch { ok = false; } // 실패하면 안내 문구로 직접 쓰게 한다
    ta.remove();
    try { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {}); } catch { /* 위 복사로 충분 */ }
    return ok;
  };
  window.openIG.iosIgApp = iosIgApp;
  window.openIG.guideOnly = guideOnly;
  window.openIG.appUrl = appUrl; // 시험용
  window.openIG.env = { ios, android, inApp };

  // 페이지의 인스타 링크(<a>) 누름도 같은 방식으로(바꿀 필요 없는 기기면 링크 그대로)
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.dataset.noapp != null || a.classList.contains('applink-skip')) return;
    if (!/^https:\/\/(www\.)?(instagram\.com|ig\.me)\//.test(a.href)) return;
    if (bar && bar.contains(a)) return;
    if (guideOnly) { e.preventDefault(); window.openIG(a.href); return; } // DM에서 연 창: 안내만
    if (window.openIG(a.href)) e.preventDefault();
  });
})();
