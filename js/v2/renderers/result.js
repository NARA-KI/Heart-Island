import { escapeHtml } from '../utils.js';

const personaImageMap = {
  lighthouse: './assets/personas/lighthouse.webp',
  gatekeeper: './assets/personas/gatekeeper.webp',
  'nest-builder': './assets/personas/nest-builder.webp',
  collector: './assets/personas/collector.webp',
  'migratory-bird': './assets/personas/migratory-bird.webp',
  islander: './assets/personas/islander.webp',
  explorer: './assets/personas/explorer.webp',
  'wandering-poet': './assets/personas/wandering-poet.webp',
  spark: './assets/personas/spark.webp',
  moonlight: './assets/personas/moonlight.webp',
  mirror: './assets/personas/mirror.webp',
  stargazer: './assets/personas/stargazer.webp',
};

export function renderResult(root, { result, onRestart }) {
  const description = result.description;
  const persona = result.persona;
  const image = personaImageMap[persona.id];
  root.innerHTML = `
    <section class="v2-screen v2-result">
      <article class="v2-result-hero">
        <div class="v2-result-portrait ${image ? '' : 'fallback'}">
          ${image ? `<img src="${image}" alt="${escapeHtml(persona.displayName)}" />` : `<span>${escapeHtml(persona.displayName.slice(0, 1))}</span>`}
        </div>
        <div>
          <p class="v2-eyebrow">你的心岛人格</p>
          <h1>${escapeHtml(persona.displayName)}</h1>
          <p class="v2-hitline">${escapeHtml(result.sections.summary)}</p>
          <div class="v2-keywords">
            ${result.sections.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}
          </div>
          <p class="v2-strength">匹配强度 ${escapeHtml(result.matchStrength)} / 100</p>
          <p class="v2-note">${escapeHtml(result.matchStrengthNote)}</p>
        </div>
      </article>

      <section class="v2-result-section">
        <h2>你在关系中的核心模式</h2>
        <p>${escapeHtml(result.sections.corePattern)}</p>
      </section>

      <section class="v2-result-section">
        <h2>你真正需要的关系</h2>
        ${paragraphs(result.sections.neededRelationship)}
      </section>

      <section class="v2-result-section">
        <h2>你容易陷入的惯性</h2>
        ${list(result.sections.inertia)}
      </section>

      <section class="v2-result-section">
        <h2>你的成长方向</h2>
        ${list(result.sections.growth)}
      </section>

      <details class="v2-result-section v2-details">
        <summary>为什么会得到这个结果</summary>
        <p>以下只用自然语言说明你的关系倾向，不展示内部计算细节。</p>
        <h3>较突出的倾向</h3>
        ${constructList(result.highConstructs)}
        <h3>相对没那么依赖的倾向</h3>
        ${constructList(result.lowConstructs)}
      </details>

      <div class="v2-actions">
        <button class="v2-primary" type="button" data-action="restart">重新测试</button>
      </div>
    </section>
  `;
  root.querySelector('[data-action="restart"]')?.addEventListener('click', onRestart);
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n+/)
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join('');
}

function list(items) {
  if (!items?.length) return '<p>暂无更多说明。</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function constructList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item.label)}</li>`).join('')}</ul>`;
}
