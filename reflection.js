'use strict';

(() => {
  const episode = document.getElementById('reflection-episode');
  const choice = document.getElementById('reflection-choice');
  const planets = document.getElementById('reflection-planets');
  const reel = document.getElementById('reflection-reel');
  const reason = document.getElementById('reflection-reason');
  const reasonLabel = document.getElementById('reflection-name');
  const why = document.getElementById('reflection-why');
  const answer = document.getElementById('reflection-answer');
  const resultTitle = document.getElementById('reflection-heading');
  const resultQuestion = document.getElementById('reflection-question');
  const resultAction = document.getElementById('reflection-action');

  if (!episode || !Array.isArray(window.QUIZ_DATA) || !window.PUL_DATA) { // 2026-11-25: data.js·pul_data.js가 못 오면 18줄에서 멈추던 문제
    const box = document.getElementById('reflection'); if (box) box.hidden = true;
    if (window.T) window.T.ev('jserr', { el: 'reflection_nodata' });
    return;
  }
  const byReel = new Map(Object.entries(window.PUL_DATA).map(([key, result]) => [result.reel, key]));
  const episodes = new Map();
  for (const video of window.QUIZ_DATA) {
    const key = byReel.get(video.reel);
    if (!key || !Object.keys(window.PUL_DATA[key].p).length) continue;
    episodes.set(key, window.PUL_DATA[key]);
    episode.add(new Option(video.no + ' · ' + video.title, key));
  }

  const reflections = {
    comfort: {
      title: '내가 회복할 여유가 있는지 봤어요',
      question: '편안해 보였던 지점은 무엇이었나요? 그 이유를 알면 실제 선택에서도 쉬는 시간, 혼자일 수 있는 공간, 사람 사이의 거리처럼 중요한 조건을 말로 옮길 수 있어요.',
      action: '예를 들어 이직을 고민한다면, 막연히 ‘덜 힘든 곳’ 대신 ‘퇴근 뒤 연락이 얼마나 오는지’를 한 가지 확인해 보세요.',
    },
    risk: {
      title: '감당할 수 있는 위험인지 봤어요',
      question: '위험이 작아 보였나요, 아니면 위험이 생겨도 대처 방법이 보였나요? 비슷해 보여도 실제로 확인할 정보는 달라요.',
      action: '결정을 미루고 있다면 가장 걱정되는 상황 하나를 쓰고, 실제로 생겼을 때 되돌릴 수 있는지 확인해 보세요.',
    },
    curiosity: {
      title: '새로 경험할 것이 있는지 봤어요',
      question: '새로워서 끌렸나요, 그 경험을 하고 나서 좋아질 일이 떠올랐나요? 두 이유를 구분하면 어떤 선택을 먼저 작게 해볼지 정하기 쉬워요.',
      action: '새 취미나 이직이 끌린다면 큰 결정을 내리기 전에 하루 체험이나 짧은 면담으로 한 번 시험해 보세요.',
    },
    other: {
      title: '내가 먼저 본 단서를 찾아봐요',
      question: '처음으로 눈에 들어온 장면 하나를 떠올려 보세요. 같은 선택을 한 사람도 다른 이유로 골랐을 수 있어요.',
      action: '다른 사람이 고른 이유를 하나 읽고, 그 사람이 중요하게 본 조건이 내 결정에도 필요한지 생각해 보세요.',
    },
  };

  function selectPlanet(button, name) {
    for (const other of planets.children) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    reasonLabel.textContent = name + '을 고를 때 가장 크게 본 건 뭐였나요?';
    reason.hidden = false;
    why.value = '';
    answer.hidden = true;
  }

  function showPlanets() {
    const data = episodes.get(episode.value);
    planets.replaceChildren();
    reason.hidden = true;
    answer.hidden = true;
    choice.hidden = !data;
    if (!data) return;

    reel.href = data.reel;
    for (const [number, planet] of Object.entries(data.p)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reflection-planet';
      button.setAttribute('aria-pressed', 'false');
      const image = document.createElement('img');
      image.src = 'img/' + planet.img + '.jpg';
      image.alt = '';
      const label = document.createElement('span');
      label.textContent = number + ' · ' + planet.name;
      button.append(image, label);
      button.addEventListener('click', () => selectPlanet(button, planet.name));
      planets.append(button);
    }
  }

  episode.addEventListener('change', showPlanets);
  why.addEventListener('change', () => {
    const reflection = reflections[why.value];
    answer.hidden = !reflection;
    if (!reflection) return;
    resultTitle.textContent = reflection.title;
    resultQuestion.textContent = reflection.question;
    resultAction.textContent = reflection.action;
  });

  const requestedEpisode = new URLSearchParams(location.search).get('ep');
  if (episodes.has(requestedEpisode)) {
    episode.value = requestedEpisode;
    showPlanets();
  }
})();
