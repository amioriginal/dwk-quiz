'use strict';
// 팔로우 부탁 창 — 2026-11-26 껐다.
// 인스타 「메시지 보내기 제한(사기 가능성)」 대응: Meta 스팸 정책은 팔로우 같은 참여를 콘텐츠 이용의 조건처럼 요구하는 것을 금지한다.
// 그래서 퀴즈·사연 전에 묻던 창을 없애고, 부르는 쪽(quiz.js·story.js)은 바로 이어서 진행한다. 옛 코드는 git 기록에 있다.
(() => {
  window.followGate = (txt, go) => { go(); };
  window.followGate.pending = () => null;
})();
