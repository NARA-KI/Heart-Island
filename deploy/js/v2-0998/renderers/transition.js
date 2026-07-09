import { formatElapsedTime } from '../quiz-timer.js';

export function renderTransition(root, { state, onShowResult }) {
  const quick = state.quizMode === 'quick';
  const count = quick ? 30 : 60;
  root.innerHTML = `
    <section class="v2-screen v2-panel v2-transition v2-transition--${quick ? 'quick' : 'full'}">
      <div class="v2-transition__glow" aria-hidden="true"><span></span><span></span><span></span></div>
      <p class="v2-eyebrow">${quick ? '快速探索完成' : '深度探索完成'}</p>
      <h1>${quick ? '你的关系画像已经形成' : '你已经抵达属于自己的心岛'}</h1>
      <p class="v2-lead">${quick
        ? '30次选择已经覆盖全部15个关系维度，正在整理成一份属于你的个性报告。'
        : '60次选择已经汇聚成一份更完整、更细致的关系画像。'}</p>
      <p class="v2-transition__meta">已完成${count}题 · 用时 ${formatElapsedTime(state.elapsedMs)}</p>
      <button class="v2-primary" type="button" data-action="result">查看我的结果</button>
    </section>
  `;
  root.querySelector('[data-action="result"]')?.addEventListener('click', onShowResult);
}
