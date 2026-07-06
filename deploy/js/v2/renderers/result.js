import { escapeHtml } from '../utils.js';
import { CONSTRUCT_LAYER_ORDER } from '../config.js';

const layerOrder = CONSTRUCT_LAYER_ORDER;

export function renderResult(root, { result, state, onRestart, onSaveResultImage, onShareResult, onFeedbackChange }) {
  const { facts, report } = result;
  const shareStatus = state.shareStatus ?? {};
  const aiStatus = result.aiReportStatus ?? {};
  root.innerHTML = `
    <section class="v2-screen v2-result">
      <article class="v2-result-hero v2-result-hero--trusted">
        <div class="v2-result-portrait ${facts.persona.image ? '' : 'fallback'}">
          ${facts.persona.image
            ? `<img src="${facts.persona.image}" alt="${escapeHtml(facts.persona.displayName)}" />`
            : `<span>${escapeHtml(facts.persona.displayName.slice(0, 1))}</span>`}
        </div>
        <div class="v2-result-hero__content">
          <p class="v2-eyebrow">你的心岛人格</p>
          <h1>${escapeHtml(facts.persona.displayName)}</h1>
          <p class="v2-hitline">${escapeHtml(report.oneLine)}</p>
          <div class="v2-key-traits">
            ${report.keyTraits.map((trait) => `<span>${escapeHtml(trait)}</span>`).join('')}
          </div>
          <p class="v2-note">${escapeHtml(facts.confidence.isCloseMatch ? facts.confidence.userMessage : '这不是准确率，而是你这次答案呈现出的主要关系倾向。')}</p>
          ${qualityNotice(facts)}
          ${aiReportStatus(aiStatus)}
          <div class="v2-actions v2-actions--hero">
            <button class="v2-primary" type="button" data-action="save-result" ${shareStatus.loading ? 'disabled' : ''}>${shareStatus.loading === 'save' ? '正在生成...' : '保存结果图'}</button>
            <button class="v2-ghost" type="button" data-action="share-result" ${shareStatus.loading ? 'disabled' : ''}>${shareStatus.loading === 'share' ? '正在准备...' : '分享我的心岛'}</button>
          </div>
          ${shareStatus.message ? `<p class="v2-status-message">${escapeHtml(shareStatus.message)}</p>` : ''}
        </div>
      </article>

      ${section('你真正寻找的关系', report.neededRelationship)}
      ${section('你的关系内在张力', report.innerConflict)}
      ${section('别人容易误解你的地方', report.misunderstoodByOthers)}

      <section class="v2-result-section">
        <h2>你带给关系的东西</h2>
        ${cardList(report.strengths)}
      </section>

      <section class="v2-result-section">
        <h2>容易重复的关系模式</h2>
        ${cardList(report.repeatPatterns)}
      </section>

      <section class="v2-result-section">
        <h2>给你的三条建议</h2>
        <div class="v2-advice-list">
          ${report.advice.map((item) => `
            <article>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="v2-result-section v2-map-section">
        <h2>你的 15 维关系地图</h2>
        <p class="v2-section-intro">雷达图显示整体轮廓，下方分组显示每个构念的具体位置。高低分不代表好坏，只表示这次答案里的驱动力强弱。</p>
        ${radarChart(facts.constructRanking)}
        ${constructBars(facts.constructRanking)}
      </section>

      <details class="v2-result-section v2-details">
        <summary>为什么得到这个结果</summary>
        <div class="v2-evidence-grid">
          <div>
            <h3>较突出的倾向</h3>
            ${constructList(facts.topConstructs)}
          </div>
          <div>
            <h3>相对没那么依赖的倾向</h3>
            ${constructList(facts.bottomConstructs)}
          </div>
        </div>
        <p>${escapeHtml(facts.confidence.userMessage)}</p>
        ${facts.conflicts.length
          ? `<h3>主要张力</h3>${cardList(facts.conflicts.slice(0, 3).map((item) => `${item.title}：${item.detail}`))}`
          : '<p>这次答案里没有命中明显的高低维度张力，整体模式相对一致。</p>'}
        ${facts.responseQuality.level !== 'normal' ? `<p>${escapeHtml(facts.responseQuality.userMessage)}</p>` : ''}
        <p>${escapeHtml(report.safetyDisclaimer)}</p>
      </details>

      <section class="v2-result-section v2-bottom-actions">
        <h2>保存与反馈</h2>
        <div class="v2-actions">
          <button class="v2-primary" type="button" data-action="save-result" ${shareStatus.loading ? 'disabled' : ''}>保存结果图</button>
          <button class="v2-ghost" type="button" data-action="share-result" ${shareStatus.loading ? 'disabled' : ''}>分享我的心岛</button>
          <button class="v2-ghost" type="button" data-action="restart">重新测试</button>
        </div>
        <details class="v2-feedback-lite">
          <summary>留下结果反馈</summary>
          <label class="v2-feedback-field">
            <span>这份结果哪里像你，哪里不像你？</span>
            <textarea data-feedback-field="resultFeedback">${escapeHtml(state.feedback?.resultFeedback ?? '')}</textarea>
          </label>
          <p class="v2-note">反馈只保存在当前浏览器，用于你自己记录测试感受。</p>
        </details>
        <p class="v2-note">${escapeHtml(report.safetyDisclaimer)}</p>
        <p class="v2-ai-disclaimer">个性化文字由AI辅助生成，评分、维度和人格结果由固定规则计算。</p>
      </section>
    </section>
  `;

  root.querySelectorAll('[data-action="save-result"]').forEach((button) => button.addEventListener('click', onSaveResultImage));
  root.querySelectorAll('[data-action="share-result"]').forEach((button) => button.addEventListener('click', onShareResult));
  root.querySelector('[data-action="restart"]')?.addEventListener('click', onRestart);
  root.querySelectorAll('[data-feedback-field]').forEach((field) => {
    field.addEventListener('input', () => onFeedbackChange?.(field.dataset.feedbackField, field.value));
  });
}

function section(title, text) {
  return `
    <section class="v2-result-section">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(text)}</p>
    </section>
  `;
}

function qualityNotice(facts) {
  if (facts.responseQuality.level === 'normal') return '';
  return `<p class="v2-quality-notice">${escapeHtml(facts.responseQuality.userMessage)}</p>`;
}

function aiReportStatus(status) {
  if (!status?.state || status.state === 'idle') return '';
  const label = status.message || (status.state === 'success'
    ? '个性化解读已生成'
    : '当前使用稳定版关系解读，结果内容不受影响。');
  return `<p class="v2-ai-status" data-ai-state="${escapeHtml(status.state)}">${escapeHtml(label)}</p>`;
}

function cardList(items) {
  return `<div class="v2-card-list">${items.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</div>`;
}

function constructList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item.label)} <span>${escapeHtml(item.levelText)}</span></li>`).join('')}</ul>`;
}

function radarChart(constructs) {
  const sorted = [...constructs].sort((a, b) => layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer) || a.code.localeCompare(b.code));
  const center = 120;
  const maxRadius = 92;
  const points = sorted.map((item, index) => {
    const angle = (-90 + (360 / sorted.length) * index) * (Math.PI / 180);
    const radius = (item.score / 100) * maxRadius;
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      lx: center + Math.cos(angle) * (maxRadius + 16),
      ly: center + Math.sin(angle) * (maxRadius + 16),
    };
  });
  const rings = [25, 50, 75, 100].map((value) => `<circle cx="${center}" cy="${center}" r="${(value / 100) * maxRadius}" />`).join('');
  const axes = points.map((point) => `<line x1="${center}" y1="${center}" x2="${point.lx}" y2="${point.ly}" />`).join('');
  const polygon = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const labels = points.map((point) => `<text x="${point.lx.toFixed(2)}" y="${point.ly.toFixed(2)}">${escapeHtml(point.code)}</text>`).join('');
  return `
    <div class="v2-radar-wrap" role="img" aria-label="15 维关系地图雷达图">
      <svg class="v2-radar" viewBox="0 0 240 240" aria-hidden="true">
        <g class="v2-radar__grid">${rings}${axes}</g>
        <polygon class="v2-radar__shape" points="${polygon}" />
        <g class="v2-radar__points">${points.map((point) => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3" />`).join('')}</g>
        <g class="v2-radar__labels">${labels}</g>
      </svg>
    </div>
  `;
}

function constructBars(constructs) {
  const groups = layerOrder.map((layer) => ({
    layer,
    items: constructs.filter((item) => item.layer === layer).sort((a, b) => b.score - a.score),
  }));
  return `
    <div class="v2-construct-groups">
      ${groups.map((group) => `
        <section>
          <h3>${escapeHtml(group.layer)}</h3>
          ${group.items.map((item) => `
            <div class="v2-construct-row">
              <div>
                <span>${escapeHtml(item.label)}</span>
                <small>${escapeHtml(item.explanation)}</small>
              </div>
              <div class="v2-score-bar" aria-label="${escapeHtml(item.label)} ${item.score}">
                <span style="width:${item.score}%"></span>
              </div>
              <strong>${Math.round(item.score)}</strong>
            </div>
          `).join('')}
        </section>
      `).join('')}
    </div>
  `;
}
