// 들어온 꼬리표(?from=yt 등)를 문 링크에 그대로 이어 붙인다(허용 목록만). CSP 때문에 인라인 스크립트 대신 파일.
(function () {
  var f = new URLSearchParams(location.search).get('from') || '';
  if (!/^(inpock|ig|igstory|igbio|yt|tt|fb|qr)$/.test(f)) return;
  var a = document.querySelectorAll('a.d');
  for (var i = 0; i < a.length; i++) a[i].href = a[i].getAttribute('href') + '?from=' + f;
})();
