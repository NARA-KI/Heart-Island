export function renderTransition(root, { onShowResult }) {
  root.innerHTML = `
    <section class="v2-screen v2-panel v2-transition">
      <p class="v2-eyebrow">航行完成</p>
      <h1>你已经抵达心岛深处</h1>
      <p class="v2-lead">系统会根据 60 道题的关系构念得分，计算最接近的一种主人格。</p>
      <p class="v2-note">结果页只展示一个最终主人格；内部评分细节不会展示给普通用户。</p>
      <button class="v2-primary" type="button" data-action="result">查看结果</button>
    </section>
  `;
  root.querySelector('[data-action="result"]')?.addEventListener('click', onShowResult);
}
