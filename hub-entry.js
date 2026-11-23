(() => {
  if (location.pathname !== '/' || location.hash) return;
  const args = new URLSearchParams(location.search);
  // 기존 퀴즈 직접 링크는 유지하고, SNS가 붙이는 유입 태그로는 허브를 연다.
  const trackingOnly = [...args.keys()].every(key => key.startsWith('utm_') || key === 'fbclid' || key === 'igsh');
  if (trackingOnly) location.replace('hub.html' + location.search);
})();
