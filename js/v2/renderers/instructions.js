import { QUIZ_MODES } from '../quiz-modes.js';

export function renderInstructions(root, { state, onBegin, onBack }) {
  const mode = QUIZ_MODES[state.quizMode] ?? QUIZ_MODES.full;
  root.innerHTML = `
    <section class="v2-screen v2-panel v2-instructions">
      <p class="v2-eyebrow">登岛前</p>
      <h1>用第一反应，完成一次关系夜航</h1>
      <div class="v2-info-list">
        <p><b>${mode.questionCount} 题 · ${mode.title}</b><span>${mode.durationLabel}</span></p>
        <p><b>没有标准答案</b><span>选择最接近当下直觉的一项</span></p>
        <p><b>进度自动保存</b><span>刷新后可继续，也可以返回上一题</span></p>
      </div>
      <div class="v2-actions">
        <button class="v2-primary" type="button" data-action="begin">开始测试</button>
        <button class="v2-ghost" type="button" data-action="back">返回首页</button>
      </div>
      <p class="v2-note">结果用于自我理解和关系沟通参考，不作为专业评估或医疗建议。</p>
    </section>
  `;
  root.querySelector('[data-action="begin"]')?.addEventListener('click', onBegin);
  root.querySelector('[data-action="back"]')?.addEventListener('click', onBack);
}
