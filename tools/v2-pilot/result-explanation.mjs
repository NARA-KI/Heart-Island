export const RESULT_EXPLANATION_VERSION = 'v2-result-explanation-1';
export const FEEDBACK_SCHEMA_VERSION = 'v2-pilot-feedback-2';

export const constructLabels = {
  SC: '安全确认',
  AU: '自主边界',
  TR: '关系信任',
  CL: '亲密连接',
  PA: '激情启动',
  CM: '承诺经营',
  SI: '灵魂理想',
  NV: '新鲜探索',
  RM: '现实匹配',
  CS: '照顾支持',
  EC: '表达沟通',
  CR: '冲突修复',
  ER: '情绪调节',
  RI: '关系投入 / 留下倾向',
  MN: '回忆牵引 / 关系叙事',
};

const constructMeanings = {
  SC: { high: '更需要关系状态被确认，信息越清楚越安心。', low: '不一定需要频繁确认关系状态，可能更看行动或自然相处。' },
  AU: { high: '很重视自我节奏和边界，亲密不能取消个人空间。', low: '更容易把关系共同体放在前面，也可能需要提醒自己保留边界。' },
  TR: { high: '更容易把关系建立在信任和稳定回应上。', low: '信息不完整时更容易保留、防御或暂缓判断，不等于一定多疑。' },
  CL: { high: '需要情感连接、共享和被靠近的感觉。', low: '不代表没有感情，可能不依赖高频分享或黏合感维持关系。' },
  PA: { high: '容易被吸引、热情和关系里的火花推动。', low: '不太依赖激情启动关系，更看重其他长期因素。' },
  CM: { high: '愿意把关系放进日常经营和长期维护里。', low: '不代表不认真，可能只是抗拒过早把关系变成任务。' },
  SI: { high: '很在意精神共鸣、价值感和关系背后的意义。', low: '更可能从现实互动或稳定回应判断关系，而不是理想感。' },
  NV: { high: '需要变化、新可能和探索感。', low: '更偏向稳定熟悉，不太需要持续新鲜刺激。' },
  RM: { high: '会认真看现实条件、节奏和生活可行性。', low: '可能先被感受或意义推动，现实落地需要之后再整理。' },
  CS: { high: '倾向通过照顾、支持和实际帮助表达在乎。', low: '不代表冷漠，可能更尊重各自处理问题的空间。' },
  EC: { high: '更愿意把感受、误解和需求说出来。', low: '表达可能更慢或更含蓄，不一定代表没有想法。' },
  CR: { high: '愿意把冲突带回沟通和修复。', low: '可能更倾向暂时避开冲突，或先观察关系是否值得修复。' },
  ER: { high: '能较好整理关系里的情绪波动。', low: '情绪更容易被关系牵动，需要更多时间恢复稳定。' },
  RI: { high: '有较强留下和持续投入倾向。', low: '不等于不爱，可能更需要确认关系值得留下。' },
  MN: { high: '容易被共同记忆、细节和关系叙事牵引。', low: '更倾向看当下和未来，不太让过去定义关系。' },
};

export async function loadPersonaDescriptions(path = './persona-descriptions.v2.pilot.json') {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`加载失败：${path}（HTTP ${response.status}）`);
  return response.json();
}

export function getPersonaDescription(descriptionData, name) {
  return descriptionData.personas.find((persona) => persona.displayName === name);
}

export function topConstructs(constructScores, count = 5) {
  return Object.entries(constructScores)
    .sort((a, b) => b[1] - a[1] || constructLabels[a[0]].localeCompare(constructLabels[b[0]], 'zh-Hans-CN'))
    .slice(0, count)
    .map(([code, score]) => ({ code, label: constructLabels[code], score, meaning: constructMeanings[code].high }));
}

export function lowConstructs(constructScores, count = 4) {
  return Object.entries(constructScores)
    .sort((a, b) => a[1] - b[1] || constructLabels[a[0]].localeCompare(constructLabels[b[0]], 'zh-Hans-CN'))
    .slice(0, count)
    .map(([code, score]) => ({ code, label: constructLabels[code], score, meaning: constructMeanings[code].low }));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function constructList(items) {
  return `<ul>${items.map((item) => `<li><b>${escapeHtml(item.label)}</b>：${item.score}。${escapeHtml(item.meaning)}</li>`).join('')}</ul>`;
}

function differenceText(description, nearbyName) {
  return description?.differencesFromNearbyPersonas?.[nearbyName] ?? '两者相邻，但当前 pilot 文案还需要继续补充更细的差异说明。';
}

function confidenceLabel(result) {
  if (result.lowConfidence) return '低置信：结果差距较小';
  if (result.top1Top2Gap >= 8) return '较明确：Top1 与 Top2 差距较大';
  return '中等置信：结果有主倾向，也需要结合 Top2 阅读';
}

export function renderResultExplanation({
  container,
  title = '结果',
  result,
  constructScores,
  descriptions,
  anonymousLabel = null,
}) {
  const top1 = result.top5[0];
  const top2 = result.top5[1];
  const top3 = result.top5[2];
  const desc1 = getPersonaDescription(descriptions, top1.displayName);
  const desc2 = getPersonaDescription(descriptions, top2.displayName);
  const highs = topConstructs(constructScores, 5);
  const lows = lowConstructs(constructScores, 4);
  const primarySupport = highs.filter((item) => desc1?.primaryConstructs?.includes(item.code) || desc1?.secondaryConstructs?.includes(item.code));
  const top2Support = highs.filter((item) => desc2?.primaryConstructs?.includes(item.code) || desc2?.secondaryConstructs?.includes(item.code));
  const distinction = differenceText(desc1, top2.displayName);

  container.innerHTML = `
    <article class="result-profile" data-persona="${escapeHtml(top1.displayName)}">
      <p class="eyebrow">${escapeHtml(anonymousLabel ?? title)}</p>
      <h3>${escapeHtml(result.lowConfidence ? `你的主要倾向是 ${top1.displayName}` : top1.displayName)}</h3>
      <p class="confidence-line">${escapeHtml(confidenceLabel(result))} · Top1-Top2 gap：${result.top1Top2Gap}</p>
      ${result.lowConfidence ? `<div class="low-confidence-note">你的主要倾向是 <b>${escapeHtml(top1.displayName)}</b>，同时非常接近 <b>${escapeHtml(top2.displayName)}</b>。当前结果差距较小，请结合两种人格的详细解析判断哪一侧更符合你。</div>` : ''}

      <section class="explanation-section">
        <h4>一句话概括</h4>
        <p>${escapeHtml(desc1?.oneLineSummary)}</p>
      </section>

      <details open class="explanation-details">
        <summary>完整人格解析</summary>
        <div class="detail-grid">
          <section><h4>核心关系驱动力</h4><p>${escapeHtml(desc1?.coreDrive)}</p></section>
          <section><h4>在关系中如何靠近别人</h4><p>${escapeHtml(desc1?.relationshipPattern)}</p></section>
          <section><h4>亲密方式</h4><p>${escapeHtml(desc1?.intimacyStyle)}</p></section>
          <section><h4>如何表达感受和需求</h4><p>${escapeHtml(desc1?.communicationStyle)}</p></section>
          <section><h4>如何面对承诺和长期经营</h4><p>${escapeHtml(desc1?.commitmentStyle)}</p></section>
          <section><h4>如何处理冲突和情绪</h4><p>${escapeHtml(desc1?.conflictStyle)} ${escapeHtml(desc1?.emotionalPattern)}</p></section>
          <section><h4>空间和边界需求</h4><p>${escapeHtml(desc1?.spaceAndBoundary)}</p></section>
          <section><h4>主要优势</h4>${list(desc1?.strengths ?? [])}</section>
          <section><h4>可能盲点</h4>${list(desc1?.blindSpots ?? [])}</section>
          <section><h4>在关系中真正需要什么</h4><p>${escapeHtml(desc1?.relationshipNeeds)}</p></section>
          <section><h4>适合的关系环境</h4><p>${escapeHtml(desc1?.suitableRelationshipEnvironment)}</p></section>
          <section><h4>常见误解</h4><p>${escapeHtml(desc1?.commonMisunderstandings)}</p></section>
        </div>
      </details>

      <section class="explanation-section">
        <h4>Top3 人格排行</h4>
        <ol class="top-list">
          ${result.top5.slice(0, 3).map((item) => `<li>${escapeHtml(item.displayName)} · 相似度 ${item.similarity} · 距离 ${item.distance}</li>`).join('')}
        </ol>
      </section>

      <section class="explanation-section">
        <h4>为什么得到这个结果</h4>
        <p>这次结果主要由你的高分构念和低分构念共同形成。高分不代表“更好”，低分也不代表“缺陷”，它们只是说明你在亲密关系中更自然使用哪些路径。</p>
        <h5>较高构念</h5>
        ${constructList(highs)}
        <h5>较低构念</h5>
        ${constructList(lows)}
        <p>${primarySupport.length ? `其中 ${primarySupport.map((item) => item.label).join('、')} 更支持 ${top1.displayName} 的判断。` : `${top1.displayName} 的判断来自整体构念组合，而非单一高分。`}</p>
        <p>${top2Support.length ? `${top2.displayName} 也被 ${top2Support.map((item) => item.label).join('、')} 支持，所以它会靠近你的 Top1。` : `${top2.displayName} 与你接近，更多来自整体距离而非单个构念。`}</p>
      </section>

      <section class="explanation-section comparison-section" data-comparison-viewed="true">
        <h4>Top1 / Top2 对比：${escapeHtml(top1.displayName)} vs ${escapeHtml(top2.displayName)}</h4>
        <div class="comparison-grid">
          <div>
            <h5>${escapeHtml(top1.displayName)}</h5>
            <p>${escapeHtml(desc1?.oneLineSummary)}</p>
            <p><b>关键构念：</b>${(desc1?.primaryConstructs ?? []).map((code) => constructLabels[code]).join('、')}</p>
          </div>
          <div>
            <h5>${escapeHtml(top2.displayName)}</h5>
            <p>${escapeHtml(desc2?.oneLineSummary)}</p>
            <p><b>关键构念：</b>${(desc2?.primaryConstructs ?? []).map((code) => constructLabels[code]).join('、')}</p>
          </div>
        </div>
        <p><b>核心差异：</b>${escapeHtml(distinction)}</p>
        <p>${result.lowConfidence ? `因为 gap 只有 ${result.top1Top2Gap}，差距不足以形成高置信结论。你也可能处在 ${top1.displayName} 与 ${top2.displayName} 两种倾向之间。` : `当前 gap 为 ${result.top1Top2Gap}，主倾向比 Top2 更明确，但仍建议阅读相邻人格差异。`}</p>
      </section>

      <p class="diagnostic-note">本结果不属于专业心理诊断，只用于心岛 v2.0 产品体验研究。</p>
    </article>
  `;
}

export function renderAnonymousResults({ container, comparison, descriptions, cardOrder }) {
  container.innerHTML = '';
  const cards = comparison.resultAgreement
    ? [{ label: '结果', result: comparison.baseline }]
    : cardOrder.map((item) => ({ label: `结果 ${item.label}`, result: item.source === 'baseline' ? comparison.baseline : comparison.candidateA }));
  for (const card of cards) {
    const wrapper = document.createElement('div');
    wrapper.className = 'result-card explanation-card';
    renderResultExplanation({
      container: wrapper,
      title: card.label,
      anonymousLabel: card.label,
      result: card.result,
      constructScores: comparison.baseline.constructScores,
      descriptions,
    });
    container.append(wrapper);
  }
}
