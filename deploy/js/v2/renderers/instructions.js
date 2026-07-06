export function renderInstructions(root, { onBegin, onBack }) {
  root.innerHTML = `
    <section class="v2-screen v2-panel">
      <p class="v2-eyebrow">测试须知</p>
      <h1>开始前，请先确认这几件事</h1>
      <div class="v2-info-list">
        <p><b>60 题</b>，预计 8-10 分钟完成。</p>
        <p>请按第一反应作答，没有标准答案，也没有更成熟或更正确的选项。</p>
        <p>你可以返回上一题修改答案，系统会按题目 ID 保存选择。</p>
        <p>刷新页面后会恢复未完成进度；如果版本或题库更新，会提示重新开始。</p>
        <p>结果只用于自我理解和关系沟通参考，不作为专业评估或医疗建议。</p>
      </div>
      <div class="v2-actions">
        <button class="v2-primary" type="button" data-action="begin">开始测试</button>
        <button class="v2-ghost" type="button" data-action="back">返回首页</button>
      </div>
    </section>
  `;
  root.querySelector('[data-action="begin"]')?.addEventListener('click', onBegin);
  root.querySelector('[data-action="back"]')?.addEventListener('click', onBack);
}
