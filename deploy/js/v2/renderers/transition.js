export function renderTransition(root, { onShowResult }) {
  root.innerHTML = `
    <section class="v2-screen v2-panel v2-transition">
      <p class="v2-eyebrow">航行完成</p>
      <h1>你已经抵达心岛深处</h1>
      <p class="v2-lead">接下来，我们会把你在亲密、边界、信任与关系选择中的倾向，整理成一张属于你的心岛地图。</p>
      <p class="v2-note">这份结果适合用来理解自己的关系节奏，也可以作为和重要的人沟通的起点。</p>
      <button class="v2-primary" type="button" data-action="result">查看我的结果</button>
    </section>
  `;
  root.querySelector('[data-action="result"]')?.addEventListener('click', onShowResult);
}
