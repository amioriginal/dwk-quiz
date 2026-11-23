"use strict";

// The predictions correspond, in order, to the two hypotheses.
const puzzle = {
  clues: [
    ["초록", "한 사람", "열림"],
    ["주황", "비어 있음", "닫힘"],
    ["초록", "두 사람", "열림"],
  ],
  hypotheses: [
    "초록불이면 열리고 주황불이면 닫힌다.",
    "발판을 밟으면 열리고 비워 두면 닫힌다.",
  ],
  tests: [
    { label: "초록불일 때 발판 위에 선다", predictions: [true, true], opens: true },
    { label: "초록불일 때 발판 옆에 선다", predictions: [true, false], opens: false },
    { label: "주황불일 때 발판 옆에 선다", predictions: [false, false], opens: false },
  ],
  explanations: {
    supported: "발판이 비면 문이 닫힌다는 당신의 예상과 맞았습니다. 초록불만 보고는 이 결과를 설명할 수 없어요.",
    contradicted: "초록불인데도 문이 열리지 않았습니다. 불빛이 문을 연다는 첫 짐작을 바꿀 단서를 찾았어요.",
    unresolved: "두 가설 모두 이 결과를 예상했습니다. 지금 본 장면은 어느 쪽이 맞는지 가려주지 않아요.",
    diagnostic: "실험 전에 두 설명이 서로 다른 결과를 예측했어요. 그래서 문이 열리든 닫히든 둘 중 한 설명을 버릴 수 있습니다.",
    ambiguous: "다른 조건도 눌러 보세요. 불빛과 발판이 서로 다른 답을 내는 순간이 있습니다.",
  },
  everyday: "팀 회의가 짧았던 날은 늘 오전이었고, 안건도 미리 공유했어요. 다음 회의에서는 오후 시간을 유지하고 안건만 미리 보내 보세요. 두 조건을 한꺼번에 바꿀 때보다 무엇이 시간을 줄였는지 가늠하기 쉬워집니다.",
};

const get = (id) => document.getElementById(id);
let hunch;
function addButton(parent, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", onClick);
  parent.append(button);
}
function markChoice(container, index) {
  Array.from(container.children).forEach((button, position) => {
    button.setAttribute("aria-pressed", String(position === index));
  });
}
function revealResult(index) {
  const test = puzzle.tests[index];
  const distinguishes = test.predictions[0] !== test.predictions[1];
  markChoice(get("tests"), index);
  get("resultTitle").textContent = test.opens ? "문이 열렸다." : "문은 닫힌 채였다.";
  let explanation = puzzle.explanations.unresolved;
  if (distinguishes) {
    explanation = test.predictions[hunch] === test.opens
      ? puzzle.explanations.supported
      : puzzle.explanations.contradicted;
  }
  get("resultText").textContent = explanation;
  get("reason").textContent = distinguishes
    ? puzzle.explanations.diagnostic
    : puzzle.explanations.ambiguous;
  get("outcome").hidden = false;
  get("learning").hidden = !distinguishes;
  get("finish").hidden = false;
  get("resultTitle").focus();
}
function chooseHunch(index) {
  hunch = index;
  markChoice(get("hunches"), index);
  markChoice(get("tests"), -1);
  get("testSection").hidden = false;
  get("outcome").hidden = true;
  get("learning").hidden = true;
  get("finish").hidden = true;
  get("testTitle").focus();
}

for (const clue of puzzle.clues) {
  const row = document.createElement("tr");
  for (const value of clue) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  get("clues").append(row);
}
puzzle.hypotheses.forEach((label, index) =>
  addButton(get("hunches"), label, () => chooseHunch(index)));
puzzle.tests.forEach((test, index) =>
  addButton(get("tests"), test.label, () => revealResult(index)));
get("daily").textContent = puzzle.everyday;
get("retry").addEventListener("click", () => {
  hunch = undefined;
  markChoice(get("hunches"), -1);
  markChoice(get("tests"), -1);
  for (const id of ["testSection", "outcome", "learning", "finish"]) {
    get(id).hidden = true;
  }
  get("learning").querySelector("details").open = false;
  get("hunches").firstElementChild.focus();
});
