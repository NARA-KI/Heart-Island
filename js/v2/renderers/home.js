export function renderHome(root, { onStart, onContinue, hasDraft, restoreNotice }) {
  root.innerHTML = `
    <section class="v2-screen v2-home">
      <div class="v2-home__visual" aria-hidden="true">
        <div class="v2-island"></div>
        <div class="v2-route"></div>
      </div>
      <div class="v2-home__content">
        <p class="v2-eyebrow">Heart Island v2.0 Alpha 1</p>
        <h1>心岛计划</h1>
        <p class="v2-lead">一场关于亲密、距离与关系惯性的内心航行。</p>
        <p class="v2-meta">60 道关系情境题 · 约 8-10 分钟 · 生成你的心岛人格</p>
        <p class="v2-note">本测试用于自我理解与产品体验，不构成专业心理诊断。</p>
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
