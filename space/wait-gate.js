/* wait-gate.js — 광장(world·town·maker)은 탑승자가 ship.openAt(3만 명)에 닿을 때까지 닫혀 있다.
   11-28 대표 「탑승 대기실로 만들고 팔로우 3만되면 열거니까 접속 안되게 하고, 클릭하면 팔로우 탑승자 3만명시 열린다는 식으로 막아놔」.
   data.js 다음, 다른 스크립트보다 먼저 부른다 → 닫혀 있으면 입구 대기실(start.html#wait)로 바로 돌려보낸다.
   운영 시험용 예외: 주소에 ?dev=1 (광장을 고치는 작업자만 쓴다 · 화면 어디에도 이 길을 걸지 않는다). */
(function () {
  var D = window.DWK || {}, s = D.ship || {};
  var open = (+s.boarded || 0) >= (+s.openAt || 30000);
  if (open || /[?&]dev=1(&|$)/.test(location.search)) return;
  location.replace('start.html#wait');
})();
