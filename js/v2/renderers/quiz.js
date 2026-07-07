import { orderedOptions } from '../question-engine.js';
import { escapeHtml } from '../utils.js';

const OPTION_FEEDBACK_MS = 180;

export function renderQuiz(root, { questionBank, state, onAnswer, onPrevious }) {
  const question = questionBank.questions[state.currentQuestionIndex];
  const total = questionBank.questions.length;
  const selectedOptionId = state.answers[question.id] ?? null;
  const progress = state.currentQuestionIndex + 1;
  const percent = (progress / total) * 100;
  const stage = Math.min(5, Math.ceil(progress / Math.ceil(total / 5)));

  root.innerHTML = `
    <section class="v2-screen v2-quiz">
      <header class="v2-quiz__header">
        <div class="v2-quiz__stage">
          <p class="v2-eyebrow">航程 ${stage} / 5</p>
          <p>${String(progress).padStart(2, '0')} / ${total}</p>
        </div>
        <div class="v2-progress" aria-hidden="true"><span style="width:${percent}%"></span></div>
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
        <p>选择后会自动进入下一题。</p>
      </footer>
    </section>
  `;

  root.querySelectorAll('.v2-option').forEach((button) => {
    button.addEventListener('click', () => {
      if (root.dataset.answering === 'true') return;
      root.dataset.answering = 'true';
      root.querySelectorAll('.v2-option').forEach((item) => {
        item.classList.toggle('selected', item === button);
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      window.setTimeout(() => {
        delete root.dataset.answering;
        onAnswer(button.dataset.questionId, button.dataset.optionId);
      }, OPTION_FEEDBACK_MS);
    });
  });
  root.querySelector('[data-action="previous"]')?.addEventListener('click', onPrevious);
  requestAnimationFrame(() => root.querySelector('#v2QuestionTitle')?.focus({ preventScroll: true }));
}
