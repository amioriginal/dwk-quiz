'use strict';
// 인포크 「인스타그램」 카드가 가리키는 바로가기 페이지 — 들어오자마자 인스타 앱을 연다.
// 앱 열기가 막히는 기기(사파리 등 자동 열기가 안 되는 곳)는 큰 버튼을 한 번 누르면 된다.
(() => {
  const PROFILE = 'https://www.instagram.com/dontwannaknow.kr/';
  const env = (window.openIG && window.openIG.env) || {};
  if (!env.ios && !env.android) { location.replace(PROFILE); return; } // 컴퓨터는 웹 프로필로
  if (window.openIG) window.openIG(PROFILE); // 안드로이드·아이폰 앱 안 브라우저: 바로 시도(안 되면 아래 버튼·띠)
})();
