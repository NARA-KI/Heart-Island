import { PILOT_FEEDBACK_FIELDS, PILOT_TEXT_FIELDS } from '../pilot-engine.js';
import { escapeHtml } from '../utils.js';

export function renderPilotResult(root, {
  result,
  state,
  onRestart,
  onFeedbackChange,
  onExportJson,
  onCopyCode,
  onImportJson,
  onExportCsv,
}) {
  root.innerHTML = `
    <section class="v2-screen v2-result v2-pilot-result" data-pilot="1" data-profile-agreement="${result.profileAgreement ? 'true' : 'false'}">
      <section class="v2-result-section">
        <p class="v2-eyebrow">内部盲测模式</p>
        <h1>结果反馈</h1>
        <p class="v2-note">本页面用于小样本内部试测。你不会看到 candidate 名称；系统只记录哪一份结果更贴近你。</p>
      </section>

      ${result.profileAgreement ? renderSingleResult(result.publicCards[0]) : renderBlindCards(result.publicCards)}

      <section class="v2-result-section v2-pilot-feedback">
        <h2>结果符合程度</h2>
        ${result.profileAgreement ? '' : renderBlindRatingFields(state)}
        ${renderRatingFields(state)}
        ${renderChoiceFields(state)}
        ${renderTextFields(state)}
      </section>

      <section class="v2-result-section v2-pilot-tools">
        <h2>内部数据导出</h2>
        <p class="v2-note">导出文件不包含姓名、手机号、微信号、身份证或精确地址。</p>
        <div class="v2-actions">
          <button class="v2-primary" type="button" data-action="pilot-export-json">导出本次 JSON</button>
          <button class="v2-ghost" type="button" data-action="pilot-copy-code">复制简短结果码</button>
          <button class="v2-ghost" type="button" data-action="pilot-export-csv">导出汇总 CSV</button>
        </div>
        <label class="v2-import">
          <span>导入多份 JSON 生成汇总</span>
          <input type="file" accept="application/json,.json" multiple data-action="pilot-import-json" />
        </label>
        ${state.pilot.importedSummary ? renderImportSummary(state.pilot.importedSummary) : ''}
      </section>

      <div class="v2-actions">
        <button class="v2-ghost" type="button" data-action="restart">重新测试</button>
      </div>
    </section>
  `;

  root.querySelectorAll('[data-feedback-field]').forEach((field) => {
    field.addEventListener('change', () => onFeedbackChange(field.dataset.feedbackField, field.value));
    field.addEventListener('input', () => onFeedbackChange(field.dataset.feedbackField, field.value));
  });
  root.querySelector('[data-action="pilot-export-json"]')?.addEventListener('click', onExportJson);
  root.querySelector('[data-action="pilot-copy-code"]')?.addEventListener('click', onCopyCode);
  root.querySelector('[data-action="pilot-export-csv"]')?.addEventListener('click', onExportCsv);
  root.querySelector('[data-action="pilot-import-json"]')?.addEventListener('change', (event) => onImportJson(event.target.files));
  root.querySelector('[data-action="restart"]')?.addEventListener('click', onRestart);
}

function renderSingleResult(card) {
  return `
    <article class="v2-result-hero v2-pilot-card" data-card-label="result">
      <div>
        <p class="v2-eyebrow">你的心岛人格</p>
        <h1>${escapeHtml(card.result.persona.displayName)}</h1>
        <p class="v2-hitline">${escapeHtml(card.result.sections.summary)}</p>
        <div class="v2-keywords">${card.result.sections.keywords.slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}</div>
      </div>
    </article>
    ${renderCompactSections(card.result)}
  `;
}

function renderBlindCards(cards) {
  return cards.map((card) => `
    <article class="v2-result-section v2-pilot-card" data-card-label="${card.label}">
      <p class="v2-eyebrow">结果 ${card.label}</p>
      <h2>${escapeHtml(card.result.persona.displayName)}</h2>
      <p class="v2-hitline">${escapeHtml(card.result.sections.summary)}</p>
      <div class="v2-keywords">${card.result.sections.keywords.slice(0, 5).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}</div>
      ${renderCompactSections(card.result)}
    </article>
  `).join('');
}

function renderCompactSections(result) {
  return `
    <section class="v2-pilot-compact">
      <h3>核心模式</h3>
      <p>${escapeHtml(result.sections.corePattern)}</p>
      <h3>真正需要的关系</h3>
      <p>${escapeHtml(result.sections.neededRelationship)}</p>
      <h3>关系惯性</h3>
      <ul>${result.sections.inertia.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <h3>成长方向</h3>
      <ul>${result.sections.growth.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>
  `;
}

function renderBlindRatingFields(state) {
  return `
    <div class="v2-feedback-grid">
      ${selectField('xFit', 'X 符合程度', state.pilot.feedback.xFit)}
      ${selectField('yFit', 'Y 符合程度', state.pilot.feedback.yFit)}
      ${choiceField('preferredResult', '哪个更像自己', ['X', 'Y', '都像', '都不像'], state.pilot.feedback.preferredResult)}
      ${choiceField('moreHelpfulResult', '哪个更有帮助', ['X', 'Y', '都有', '都没有'], state.pilot.feedback.moreHelpfulResult)}
    </div>
  `;
}

function renderRatingFields(state) {
  return `
    <div class="v2-feedback-grid">
      ${PILOT_FEEDBACK_FIELDS.map((field) => selectField(field.name, field.label, state.pilot.feedback[field.name])).join('')}
    </div>
  `;
}

function renderChoiceFields(state) {
  return `
    <div class="v2-feedback-grid">
      ${choiceField('fitLabel', '整体感受', ['很符合', '比较符合', '一般', '不太符合', '完全不符合'], state.pilot.feedback.fitLabel)}
    </div>
  `;
}

function renderTextFields(state) {
  return PILOT_TEXT_FIELDS.map((field) => `
    <label class="v2-feedback-field">
      <span>${escapeHtml(field.label)}</span>
      <textarea data-feedback-field="${escapeHtml(field.name)}">${escapeHtml(state.pilot.feedback[field.name] ?? '')}</textarea>
    </label>
  `).join('');
}

function selectField(name, label, value) {
  return `
    <label class="v2-feedback-field">
      <span>${escapeHtml(label)}</span>
      <select data-feedback-field="${escapeHtml(name)}">
        <option value="">请选择</option>
        ${[1, 2, 3, 4, 5].map((score) => `<option value="${score}" ${String(value) === String(score) ? 'selected' : ''}>${score}</option>`).join('')}
      </select>
    </label>
  `;
}

function choiceField(name, label, choices, value) {
  return `
    <label class="v2-feedback-field">
      <span>${escapeHtml(label)}</span>
      <select data-feedback-field="${escapeHtml(name)}">
        <option value="">请选择</option>
        ${choices.map((choice) => `<option value="${escapeHtml(choice)}" ${value === choice ? 'selected' : ''}>${escapeHtml(choice)}</option>`).join('')}
      </select>
    </label>
  `;
}

function renderImportSummary(summary) {
  return `
    <div class="v2-import-summary" data-import-summary="1">
      <p>已导入 ${summary.importedCount} 份，去重后 ${summary.uniqueCount} 份。</p>
      <p>A/E一致：${summary.agreementCount}；A/E不同：${summary.disagreementCount}；E被偏好：${summary.candidateEPreferredCount}；A被偏好：${summary.candidateAPreferredCount}。</p>
    </div>
  `;
}
