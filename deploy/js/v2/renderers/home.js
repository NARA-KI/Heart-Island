import { QUIZ_MODES } from '../quiz-modes.js';

export function renderHome(root, {
  state,
  onSelectMode,
  onStart,
  onContinue,
  onRestart,
  hasDraft,
  restoreNotice,
}) {
  const selectedMode = state.quizMode;
  const answeredCount = Object.keys(state.answersByQuestionId ?? {}).length;
  root.innerHTML = `
    <section class="v2-screen v2-home">
      <div class="v2-home__visual" aria-hidden="true">
        <img src="./assets/result/voyage.webp" alt="" />
        <span class="v2-route"></span>
      </div>
      <div class="v2-home__content">
        <p class="v2-eyebrow">恋爱关系倾向测试</p>
        <h1>心岛计划</h1>
        <p class="v2-lead">选择一段适合此刻的航程，看见你在亲密、边界、信任和投入中的关系节奏。</p>
        <p class="v2-note">结果用于自我理解和关系沟通参考，不作为专业评估或医疗建议。</p>
        ${restoreNotice ? `<p class="v2-alert">${restoreNotice}</p>` : ''}
        ${hasDraft ? draftBlock(state, answeredCount) : modeSelector(selectedMode)}
        <div class="v2-actions v2-home__actions">
          ${hasDraft
            ? '<button class="v2-primary" type="button" data-action="continue">继续作答</button><button class="v2-ghost" type="button" data-action="restart">重新开始</button>'
            : `<button class="v2-primary" type="button" data-action="start" ${selectedMode ? '' : 'disabled'}>进入${selectedMode ? QUIZ_MODES[selectedMode].title : '探索'}</button>`}
        </div>
      </div>
    </section>
  `;
  root.querySelectorAll('[data-quiz-mode]').forEach((button) => {
    button.addEventListener('click', () => onSelectMode(button.dataset.quizMode));
  });
  root.querySelector('[data-action="start"]')?.addEventListener('click', () => onStart(selectedMode));
  root.querySelector('[data-action="continue"]')?.addEventListener('click', onContinue);
  root.querySelector('[data-action="restart"]')?.addEventListener('click', onRestart);
}

function modeSelector(selectedMode) {
  return `
    <div class="v2-mode-selector" aria-label="选择探索模式">
      ${modeCard({
        mode: 'quick',
        title: '快速探索',
        count: '30题',
        tag: '推荐首次体验',
        description: '覆盖全部15个关系维度，用更短的时间形成完整关系画像。',
        selected: selectedMode === 'quick',
      })}
      ${modeCard({
        mode: 'full',
        title: '深度探索',
        count: '60题',
        description: '通过更多关系场景，获得稳定度更高、细节更丰富的个性分析。',
        selected: selectedMode === 'full',
      })}
    </div>
  `;
}

function modeCard({ mode, title, count, tag = '', description, selected }) {
  return `
    <button class="v2-mode-card${selected ? ' selected' : ''}" type="button" data-quiz-mode="${mode}" aria-pressed="${selected}">
      <span class="v2-mode-card__top">
        <strong>${title}</strong>
        <b>${count}</b>
      </span>
      ${tag ? `<small>${tag}</small>` : ''}
      <span>${description}</span>
    </button>
  `;
}

function draftBlock(state, answeredCount) {
  const mode = QUIZ_MODES[state.quizMode] ?? QUIZ_MODES.full;
  const total = state.quizPath === 'continuation' ? 60 : mode.questionCount;
  return `
    <div class="v2-draft-card">
      <p class="v2-eyebrow">发现未完成记录</p>
      <h2>${mode.title}</h2>
      <p>已保存 ${answeredCount} / ${total} 题，继续后会从上次位置开始。</p>
    </div>
  `;
}
