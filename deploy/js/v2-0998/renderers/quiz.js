import { currentQuestion, orderedOptions } from '../question-engine.js';
import { QUIZ_MODES } from '../quiz-modes.js';
import { currentElapsedMs, formatElapsedTime } from '../quiz-timer.js';
import { escapeHtml } from '../utils.js';

const OPTION_FEEDBACK_MS = 180;

export function renderQuiz(root, { questionBank, state, onAnswer, onPrevious }) {
  const question = currentQuestion(questionBank, state);
  const mode = QUIZ_MODES[state.quizMode] ?? QUIZ_MODES.full;
  const total = mode.questionCount;
  const selectedOptionId = state.answersByQuestionId[question.id] ?? null;
  const progress = state.quizPath === 'continuation'
    ? 30 + state.currentQuestionIndex + 1
    : state.currentQuestionIndex + 1;
  const percent = (progress / total) * 100;

  root.innerHTML = `
    <section class="v2-screen v2-quiz">
      <header class="v2-quiz__header">
        <div class="v2-quiz__stage">
          <p class="v2-eyebrow">${mode.title}</p>
          <div class="v2-quiz__meta">
            <span>${progress} / ${total}</span>
            <span class="v2-quiz-timer" data-quiz-timer aria-label="本次作答用时">◷ ${formatElapsedTime(currentElapsedMs(state))}</span>
          </div>
        </div>
        <div class="v2-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${progress}"><span style="width:${percent}%"></span></div>
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
              ><span class="v2-option__letter">${escapeHtml(option.id)}</span><span>${escapeHtml(option.text)}</span></button>
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
    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') button.dataset.pointerInput = 'true';
    });
    button.addEventListener('click', () => {
      if (root.dataset.answering === 'true') return;
      root.dataset.answering = 'true';
      root.querySelectorAll('.v2-option').forEach((item) => {
        item.classList.toggle('selected', item === button);
        item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
      });
      if (button.dataset.pointerInput === 'true') {
        document.activeElement?.blur?.();
        button.blur();
        delete button.dataset.pointerInput;
      }
      window.setTimeout(() => {
        delete root.dataset.answering;
        onAnswer(button.dataset.questionId, button.dataset.optionId);
      }, OPTION_FEEDBACK_MS);
    });
  });
  root.querySelector('[data-action="previous"]')?.addEventListener('click', onPrevious);
  requestAnimationFrame(() => root.querySelector('#v2QuestionTitle')?.focus({ preventScroll: true }));
}
