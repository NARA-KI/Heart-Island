import { orderedOptions } from '../question-engine.js';
import { escapeHtml } from '../utils.js';

export function renderQuiz(root, { questionBank, state, onAnswer, onPrevious }) {
  const question = questionBank.questions[state.currentQuestionIndex];
  const total = questionBank.questions.length;
  const selectedOptionId = state.answers[question.id] ?? null;
  const progress = state.currentQuestionIndex + 1;
  const percent = (progress / total) * 100;

  root.innerHTML = `
    <section class="v2-screen v2-quiz">
      <header class="v2-quiz__header">
        <p class="v2-eyebrow">第 ${String(progress).padStart(2, '0')} 题</p>
        <div class="v2-progress" aria-hidden="true"><span style="width:${percent}%"></span></div>
        <p class="v2-progress-text">${progress} / ${total}</p>
      </header>
      <article class="v2-question-card">
        <h1 id="v2QuestionTitle" tabindex="-1">${escapeHtml(question.question)}</h1>
        <div class="v2-options" role="list">
          ${orderedOptions(question, state).map((option) => {
            const selected = selectedOptionId === option.id;
            return `
              <button
                class="v2-option${selected ? ' selected' : ''}"
                type="button"
                data-question-id="${escapeHtml(question.id)}"
                data-option-id="${escapeHtml(option.id)}"
                aria-pressed="${selected ? 'true' : 'false'}"
              >${escapeHtml(option.text)}</button>
            `;
          }).join('')}
        </div>
      </article>
      <footer class="v2-quiz__footer">
        <button class="v2-ghost" type="button" data-action="previous" ${state.currentQuestionIndex === 0 ? 'disabled' : ''}>上一题</button>
        <p>选择一个最接近的答案后，将自动进入下一题。</p>
      </footer>
    </section>
  `;

  root.querySelectorAll('.v2-option').forEach((button) => {
    button.addEventListener('click', () => {
      onAnswer(button.dataset.questionId, button.dataset.optionId);
    });
  });
  root.querySelector('[data-action="previous"]')?.addEventListener('click', onPrevious);
  requestAnimationFrame(() => root.querySelector('#v2QuestionTitle')?.focus({ preventScroll: true }));
}
