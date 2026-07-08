import { escapeHtml } from '../utils.js';
import { CONSTRUCT_LAYER_ORDER } from '../config.js';

const layerOrder = CONSTRUCT_LAYER_ORDER;

export function renderResult(root, {
  result,
  state,
  feedbackEntry,
  debugMode = false,
  onRestart,
  onSaveResultImage,
  onShareResult,
  onNativeShareResult,
  onDownloadShareCard,
  onCloseSharePreview,
  onExternalFeedback,
  onRetryAiReport,
  onFeedbackChange,
}) {
  const { facts } = result;
  const report = result.deterministicReport ?? result.report;
  const aiReport = result.aiReport ?? (result.report?.source === 'ai' ? result.report : null);
  const shareStatus = state.shareStatus ?? {};
  const aiStatus = result.aiReportStatus ?? {};
  const tags = resultTags(facts, report);

  root.innerHTML = `
    <section class="v2-screen v2-result">
      <article class="v2-result-hero v2-result-hero--trusted">
        <div class="v2-result-portrait-shell">
          <div class="v2-result-portrait ${facts.persona.image ? '' : 'fallback'}">
            ${facts.persona.image
              ? `<img src="${facts.persona.image}" alt="${escapeHtml(facts.persona.displayName)}" />`
              : `<span>${escapeHtml(facts.persona.displayName.slice(0, 1))}</span>`}
          </div>
        </div>
        <div class="v2-result-hero__content">
          <p class="v2-eyebrow">你的心岛人格</p>
          <h1>${escapeHtml(facts.persona.displayName)}</h1>
          <div class="v2-key-traits" aria-label="人格关键词">
            ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
          </div>
          <p class="v2-hitline">${escapeHtml(userFacingText(report.oneLine))}</p>
          <div class="v2-why-persona">
            <span>为什么是这个人格</span>
            <p>${escapeHtml(whyPersona(facts))}</p>
          </div>
          ${qualityNotice(facts)}
        </div>
      </article>

      ${aiReportPanel(aiStatus, aiReport, state.restoreNotice)}

      <section class="v2-result-section v2-insight-strip">
        <div>
          <p class="v2-eyebrow">关系核心</p>
          <h2>你真正寻找的回应</h2>
          <p>${escapeHtml(userFacingText(report.neededRelationship))}</p>
        </div>
        <div>
          <p class="v2-eyebrow">容易拉扯</p>
          <h2>${escapeHtml(facts.conflicts[0]?.title ?? '关系节奏相对一致')}</h2>
          <p>${escapeHtml(userFacingText(report.innerConflict))}</p>
        </div>
      </section>

      <section class="v2-result-section v2-construct-summary">
        <div class="v2-section-heading">
          <p class="v2-eyebrow">关系维度</p>
          <h2>这次最突出的 3 个信号</h2>
          <p>先看最能解释本次结果的维度，完整 15 维关系地图放在下方展开。</p>
        </div>
        <div class="v2-focus-constructs">
          ${facts.topConstructs.slice(0, 3).map((item, index) => constructHighlight(item, index + 1)).join('')}
        </div>
        ${watchConstructs(facts)}
      </section>

      <section class="v2-result-section v2-advice-section">
        <div class="v2-section-heading">
          <p class="v2-eyebrow">可以尝试的一件事</p>
          <h2>把结果落到关系里</h2>
        </div>
        <div class="v2-advice-list">
          ${report.advice.slice(0, 2).map((item) => `
            <article>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <details class="v2-result-section v2-map-section">
        <summary>
          <span>查看完整关系地图</span>
          <small>15 维雷达图与分层数据</small>
        </summary>
        <div class="v2-map-section__body">
          <p class="v2-section-intro">雷达图保留整体轮廓；下方列表使用中文维度名和解释，分数只代表本次答案里的驱动力强弱。</p>
          ${radarChart(facts.constructRanking)}
          ${constructBars(facts.constructRanking)}
        </div>
      </details>

      <details class="v2-result-section v2-details">
        <summary>
          <span>更多判读依据</span>
          <small>高低维度、相邻结果与免责声明</small>
        </summary>
        <div class="v2-evidence-grid">
          <div>
            <h3>较突出的倾向</h3>
            ${constructList(facts.topConstructs.slice(0, 5))}
          </div>
          <div>
            <h3>相对没那么依赖的倾向</h3>
            ${constructList(facts.bottomConstructs.slice(0, 4))}
          </div>
        </div>
        <p>${escapeHtml(userFacingText(facts.confidence.userMessage))}</p>
        <p>${escapeHtml(userFacingText(report.misunderstoodByOthers))}</p>
        <p class="v2-note">${escapeHtml(report.safetyDisclaimer)}</p>
      </details>

      <section class="v2-result-section v2-bottom-actions">
        <div class="v2-section-heading">
          <p class="v2-eyebrow">保存与分享</p>
          <h2>读完之后，再把这座心岛带走</h2>
        </div>
        <div class="v2-actions">
          <button class="v2-primary" type="button" data-action="save-result" ${shareStatus.loading ? 'disabled' : ''}>${shareStatus.loading === 'save' ? '正在生成...' : '生成分享卡'}</button>
          <button class="v2-ghost" type="button" data-action="share-result" ${shareStatus.loading ? 'disabled' : ''}>${shareStatus.loading === 'share' ? '正在生成...' : '分享我的心岛'}</button>
          <button class="v2-ghost" type="button" data-action="restart">重新测试</button>
        </div>
        ${shareStatus.message ? `<p class="v2-status-message">${escapeHtml(shareStatus.message)}</p>` : ''}
        ${sharePreview(shareStatus)}
        ${externalFeedbackBlock(feedbackEntry, debugMode)}
        <details class="v2-feedback-lite">
          <summary>留下结果反馈</summary>
          <label class="v2-feedback-field">
            <span>这份结果哪里像你，哪里不像你？</span>
            <textarea data-feedback-field="resultFeedback">${escapeHtml(state.feedback?.resultFeedback ?? '')}</textarea>
          </label>
          <p class="v2-note">反馈只保存在当前浏览器，用于你自己记录测试感受。</p>
        </details>
        <p class="v2-ai-disclaimer">个性化文字由 AI 辅助生成；评分、维度和人格结果由固定规则计算。</p>
        <p class="v2-note">${escapeHtml(report.safetyDisclaimer)}</p>
      </section>
    </section>
  `;

  root.querySelectorAll('[data-action="save-result"]').forEach((button) => button.addEventListener('click', onSaveResultImage));
  root.querySelectorAll('[data-action="share-result"]').forEach((button) => button.addEventListener('click', onShareResult));
  root.querySelector('[data-action="share-native"]')?.addEventListener('click', onNativeShareResult);
  root.querySelector('[data-action="download-share-card"]')?.addEventListener('click', onDownloadShareCard);
  root.querySelector('[data-action="close-share-preview"]')?.addEventListener('click', onCloseSharePreview);
  root.querySelector('[data-action="external-feedback"]')?.addEventListener('click', onExternalFeedback);
  root.querySelector('[data-action="retry-ai-report"]')?.addEventListener('click', onRetryAiReport);
  root.querySelector('[data-action="restart-from-restore"]')?.addEventListener('click', onRestart);
  root.querySelectorAll('[data-action="restart"]').forEach((button) => button.addEventListener('click', onRestart));
  root.querySelectorAll('[data-feedback-field]').forEach((field) => {
    field.addEventListener('input', () => onFeedbackChange?.(field.dataset.feedbackField, field.value));
  });
}

function externalFeedbackBlock(feedbackEntry, debugMode) {
  if (!feedbackEntry?.url) return '';
  return `
    <div class="v2-structured-feedback" data-feedback-entry>
      <p class="v2-structured-feedback__title">测试结果准不准？用 1 分钟告诉我们</p>
      <a class="v2-primary v2-feedback-link" href="${escapeHtml(feedbackEntry.url)}" target="_blank" rel="noopener noreferrer" data-action="external-feedback">提交测试反馈</a>
      ${debugMode ? `<p class="v2-note">匿名测试编号：<code>${escapeHtml(feedbackEntry.resultId)}</code>${feedbackEntry.clicked ? ' · 已打开过反馈入口' : ''}</p>` : ''}
    </div>
  `;
}

function sharePreview(shareStatus) {
  if (!shareStatus?.previewUrl) return '';
  const hint = shareStatus.isMobile
    ? '长按图片保存，或使用系统分享'
    : '点击下载图片';
  return `
    <div class="v2-share-preview" data-share-preview>
      <div class="v2-share-preview__head">
        <strong>分享卡预览</strong>
        <button class="v2-ghost v2-share-preview__close" type="button" data-action="close-share-preview" aria-label="关闭分享卡预览">关闭</button>
      </div>
      <img src="${escapeHtml(shareStatus.previewUrl)}" alt="心岛结果分享卡预览" />
      <p class="v2-note">${hint}</p>
      <div class="v2-actions v2-share-preview__actions">
        ${shareStatus.canNativeShare ? '<button class="v2-primary" type="button" data-action="share-native">分享</button>' : ''}
        <button class="v2-ghost" type="button" data-action="download-share-card">下载图片</button>
      </div>
    </div>
  `;
}

function aiReportPanel(status = {}, report, restoreNotice = '') {
  const state = status.state ?? 'idle';
  if (state === 'idle' && !report) return '';
  const retryButton = (state === 'error' || state === 'timeout') && !status.retryUsed
    ? '<button class="v2-ghost" type="button" data-action="retry-ai-report">重新生成一次</button>'
    : '';
  const stateText = status.message || fallbackAiStatusMessage(state);
  return `
    <section class="v2-result-section v2-ai-report-panel" data-ai-report-panel data-ai-state="${escapeHtml(state)}">
      ${restoreNotice ? `
        <div class="v2-restore-notice">
          <p>${escapeHtml(restoreNotice)}</p>
          <div class="v2-actions">
            <a class="v2-ghost" href="#app">继续查看</a>
            <button class="v2-ghost" type="button" data-action="restart-from-restore">重新测试</button>
          </div>
        </div>
      ` : ''}
      <div class="v2-ai-report-panel__head">
        <div>
          <p class="v2-eyebrow">心岛为你写下</p>
          <h2>你的个性化关系解读</h2>
        </div>
        ${state === 'success' ? '<span>已生成</span>' : ''}
      </div>
      ${state === 'loading' ? `
        <div class="v2-ai-status" data-ai-state="loading">
          <span class="v2-sea-line" aria-hidden="true"></span>
          <h3>正在整理你的个性化关系解读</h3>
          <p>${escapeHtml(stateText)} 你可以先继续查看下方确定性结果，通常约 10 秒后完成。</p>
        </div>
      ` : ''}
      ${(state === 'error' || state === 'timeout') ? `
        <div class="v2-ai-status" data-ai-state="${escapeHtml(state)}">
          <h3>${state === 'timeout' ? '个性化解读生成时间较长' : '个性化解读暂时没有生成'}</h3>
          <p>${escapeHtml(stateText)}</p>
          ${retryButton}
        </div>
      ` : ''}
      ${state === 'success' && report ? aiReportContent(report) : ''}
    </section>
  `;
}

function aiReportContent(report) {
  const traits = [...(report.keyTraits ?? []), ...(report.strengths ?? [])].slice(0, 3);
  const repeatPatterns = (report.repeatPatterns ?? []).slice(0, 2);
  const advice = (report.advice ?? []).slice(0, 1);
  const relationshipNeeds = [report.neededRelationship, report.misunderstoodByOthers].filter(Boolean);
  const conflictPatterns = [report.innerConflict, ...repeatPatterns].filter(Boolean);
  return `
    <div class="v2-ai-report-content">
      <blockquote>${escapeHtml(userFacingText(report.oneLine))}</blockquote>
      <section>
        <h3>你在关系里的样子</h3>
        <p>${escapeHtml(joinAiText(traits))}</p>
      </section>
      <section>
        <h3>你真正需要的回应</h3>
        <p>${escapeHtml(joinAiText(relationshipNeeds))}</p>
      </section>
      <section>
        <h3>你容易陷入的拉扯</h3>
        <p>${escapeHtml(joinAiText(conflictPatterns))}</p>
      </section>
      ${advice.length ? `
        <section>
          <h3>你可以尝试的一件事</h3>
          <ul class="v2-ai-action-list">
            ${advice.map((item) => `
              <li>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.text)}</span>
              </li>
            `).join('')}
          </ul>
        </section>
      ` : ''}
    </div>
    <p class="v2-ai-disclaimer">${escapeHtml(report.safetyDisclaimer)}</p>
  `;
}

function fallbackAiStatusMessage(state) {
  if (state === 'loading') return '正在结合你的本次作答，整理一份更贴近你的关系侧写...';
  if (state === 'timeout') return '个性化解读生成时间较长，当前结果仍可正常查看。';
  if (state === 'error') return '个性化解读暂时没有生成，当前结果仍可正常查看。';
  return '';
}

function resultTags(facts, report) {
  return unique([
    ...(facts.persona.keywords ?? []),
    ...(report.keyTraits ?? []).map((item) => String(item).split(/[，。；、]/)[0]),
    ...facts.topConstructs.map((item) => item.label),
  ]).slice(0, 3);
}

function whyPersona(facts) {
  const constructs = facts.topConstructs.slice(0, 3).map((item) => item.label).join('、');
  const confidence = facts.confidence.isCloseMatch
    ? '同时接近相邻类型，所以更适合作为主要关系倾向参考。'
    : '主导倾向相对清晰。';
  return `本次答案里，${constructs}最能解释你的关系节奏；${confidence}`;
}

function constructHighlight(item, index) {
  return `
    <article class="v2-construct-highlight">
      <span>${String(index).padStart(2, '0')}</span>
      <h3>${escapeHtml(item.label)}</h3>
      <p>${escapeHtml(item.explanation)}</p>
      <div class="v2-score-bar" aria-label="${escapeHtml(item.label)} ${item.score}">
        <i style="width:${item.score}%"></i>
      </div>
    </article>
  `;
}

function watchConstructs(facts) {
  const items = facts.conflicts.length
    ? facts.conflicts.slice(0, 2).map((item) => ({
      title: item.title,
      text: item.detail || item.summary,
    }))
    : facts.bottomConstructs.slice(0, 1).map((item) => ({
      title: `${item.label}相对较低`,
      text: item.explanation,
    }));
  return `
    <div class="v2-watch-constructs">
      <h3>需要留意的关系拉扯</h3>
      ${items.map((item) => `
        <p><strong>${escapeHtml(item.title)}</strong>${escapeHtml(userFacingText(item.text))}</p>
      `).join('')}
    </div>
  `;
}

function qualityNotice(facts) {
  if (facts.responseQuality.level === 'normal') return '';
  return `<p class="v2-quality-notice">${escapeHtml(facts.responseQuality.userMessage)}</p>`;
}

function joinAiText(items) {
  return (items ?? [])
    .filter(Boolean)
    .map((item) => userFacingText(item))
    .join(' ');
}

function constructList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item.label)} <span>${escapeHtml(item.levelText)}</span></li>`).join('')}</ul>`;
}

function radarChart(constructs) {
  const sorted = [...constructs].sort((a, b) => layerOrder.indexOf(a.layer) - layerOrder.indexOf(b.layer) || a.code.localeCompare(b.code));
  const center = 120;
  const maxRadius = 90;
  const points = sorted.map((item, index) => {
    const angle = (-90 + (360 / sorted.length) * index) * (Math.PI / 180);
    const radius = (item.score / 100) * maxRadius;
    return {
      ...item,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      lx: center + Math.cos(angle) * (maxRadius + 18),
      ly: center + Math.sin(angle) * (maxRadius + 18),
    };
  });
  const rings = [25, 50, 75, 100].map((value) => `<circle cx="${center}" cy="${center}" r="${(value / 100) * maxRadius}" />`).join('');
  const axes = points.map((point) => `<line x1="${center}" y1="${center}" x2="${point.lx}" y2="${point.ly}" />`).join('');
  const polygon = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const labels = points.map((point) => `<text x="${point.lx.toFixed(2)}" y="${point.ly.toFixed(2)}">${escapeHtml(point.label)}</text>`).join('');
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
    items: constructs.filter((item) => item.layer === layer),
  }));
  return `
    <div class="v2-construct-groups v2-construct-groups--layered">
      ${groups.map((group, index) => `
        <section class="v2-construct-layer">
          <div class="v2-construct-layer__header">
            <span>${String(index + 1).padStart(2, '0')}</span>
            <h3>${escapeHtml(group.layer)}</h3>
          </div>
          <div class="v2-construct-layer__items">
          ${group.items.map((item) => `
            <div class="v2-construct-row v2-construct-row--compact">
              <div>
                <span>${escapeHtml(item.label)}</span>
                <small>${escapeHtml(item.explanation)}</small>
              </div>
              <div class="v2-score-bar" aria-label="${escapeHtml(item.label)} ${item.score}">
                <i style="width:${item.score}%"></i>
              </div>
              <strong>${Math.round(item.score)}</strong>
            </div>
          `).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

function unique(items) {
  const seen = new Set();
  return items
    .map((item) => String(item ?? '').trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function userFacingText(value) {
  return String(value ?? '')
    .replace('结果接近相邻类型，说明你的关系节奏可能会随情境切换。', '这次结果更适合作为主要关系倾向参考。')
    .replace('你的结果同时靠近另一种关系倾向，这意味着你在不同情境下可能会呈现出两种相邻模式。', '这次结果更适合作为主要关系倾向参考。');
}
