export function renderHome(root, { onStart, onContinue, hasDraft, restoreNotice }) {
  root.innerHTML = `
    <section class="v2-screen v2-home">
      <div class="v2-home__visual" aria-hidden="true">
        <img src="./assets/result/voyage.webp" alt="" />
        <span class="v2-route"></span>
      </div>
      <div class="v2-home__content">
        <p class="v2-eyebrow">恋爱关系倾向测试</p>
        <h1>心岛计划</h1>
        <p class="v2-lead">通过 60 道关系情境题，看见你在亲密、边界、信任和投入中的关系节奏。</p>
        <p class="v2-meta">约 8-10 分钟 · 获得你的心岛人格与 15 维关系地图</p>
        <p class="v2-note">结果用于自我理解和关系沟通参考，不作为专业评估或医疗建议。</p>
        ${restoreNotice ? `<p class="v2-alert">${restoreNotice}</p>` : ''}
        <div class="v2-actions">
          <button class="v2-primary" type="button" data-action="start">${hasDraft ? '继续登岛' : '开始登岛'}</button>
          ${hasDraft ? '<button class="v2-ghost" type="button" data-action="restart">重新开始</button>' : ''}
        </div>
      </div>
    </section>
  `;
  root.querySelector('[data-action="start"]')?.addEventListener('click', hasDraft ? onContinue : onStart);
  root.querySelector('[data-action="restart"]')?.addEventListener('click', onStart);
}
