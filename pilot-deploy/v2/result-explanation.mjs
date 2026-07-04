export const RESULT_EXPLANATION_VERSION = 'v2-result-explanation-2';
export const PUBLIC_RESULT_VERSION = 'v2-public-single-persona-1';
export const FEEDBACK_SCHEMA_VERSION = 'v2-pilot-feedback-3';

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
  RI: '关系投入',
  MN: '回忆牵引',
};

const constructMeanings = {
  SC: { high: '你会因为关系状态被看见、被确认而更安心。', low: '你不一定需要频繁确认关系状态，更常通过相处本身判断关系。', blend: '你在关系里需要一些明确回应，才能更安心地继续投入。' },
  AU: { high: '你很重视自己的节奏和边界，亲密不能取消个人空间。', low: '你更容易把共同感放在前面，也需要偶尔提醒自己保留边界。', blend: '你会在亲密里保留自己的呼吸感，不希望关系变成互相吞没。' },
  TR: { high: '你倾向先把关系放在信任里，而不是立刻用怀疑保护自己。', low: '当信息不完整时，你可能会先保留判断，这不等于不信任，只是需要更多稳定回应。', blend: '你需要关系里有足够稳定的信任，才会让自己真正放松。' },
  CL: { high: '你需要情感连接、分享和被靠近的感觉。', low: '这不代表你没有感情，只是你不一定依赖高频分享或黏合感维持关系。', blend: '你在靠近时需要真实连接，但不一定用外放的方式表现。' },
  PA: { high: '你容易被吸引、热情和关系里的火花推动。', low: '你不太依赖激情启动关系，更看重其他长期因素。', blend: '你会被关系里的新鲜火花点亮，但也不想只停留在热度里。' },
  CM: { high: '你愿意把关系放进日常经营和长期维护里。', low: '这不代表你不认真，可能只是抗拒过早把关系变成任务。', blend: '你在意关系能不能被持续维护，而不是只靠一时感觉。' },
  SI: { high: '你在意精神共鸣、价值感和关系背后的意义。', low: '你更可能从现实互动或稳定回应判断关系，而不是先寻找理想感。', blend: '你会把关系放进更大的意义里，希望爱不只是陪伴，也有精神方向。' },
  NV: { high: '你需要变化、新可能和探索感。', low: '你更偏向稳定熟悉，不太需要持续新鲜刺激。', blend: '你需要关系里保留一点未知和远方感。' },
  RM: { high: '你会认真看现实条件、节奏和生活可行性。', low: '你可能先被感受或意义推动，现实落地需要之后再整理。', blend: '你会在感受之外，也留意关系能不能进入现实生活。' },
  CS: { high: '你倾向通过照顾、支持和实际帮助表达在乎。', low: '这不代表冷漠，可能只是更尊重各自处理问题的空间。', blend: '你会用实际支持表达在乎，但也需要避免把所有责任都接过来。' },
  EC: { high: '你更愿意把感受、误解和需要说出来。', low: '你的表达可能更慢或更含蓄，不一定代表没有想法。', blend: '你需要把关键感受说清楚，关系才不容易停在误解里。' },
  CR: { high: '你愿意把冲突带回沟通和修复。', low: '你可能更倾向暂时避开冲突，或先观察关系是否值得修复。', blend: '你不希望冲突只是冷掉，而是希望它最终能回到理解。' },
  ER: { high: '你能较好整理关系里的情绪波动。', low: '情绪更容易被关系牵动时，你需要更多时间恢复稳定。', blend: '你会被关系中的情绪牵动，也会试着把它整理成可理解的东西。' },
  RI: { high: '你有较强留下和持续投入倾向。', low: '这不等于不爱，可能是你需要确认关系值得留下。', blend: '你会认真评估关系是否值得继续，也不轻易把投入当成消耗品。' },
  MN: { high: '你容易被共同记忆、细节和关系叙事牵引。', low: '你更倾向看当下和未来，不太让过去定义关系。', blend: '你不仅重视精神意义，也会把关系中的细节和记忆保存得很深。' },
};

const personaImageMap = {
  lighthouse: '../../assets/personas/lighthouse.webp',
  gatekeeper: '../../assets/personas/gatekeeper.webp',
  'nest-builder': '../../assets/personas/nest-builder.webp',
  collector: '../../assets/personas/collector.webp',
  'migratory-bird': '../../assets/personas/migratory-bird.webp',
  islander: '../../assets/personas/islander.webp',
  explorer: '../../assets/personas/explorer.webp',
  'wandering-poet': '../../assets/personas/wandering-poet.webp',
  spark: '../../assets/personas/spark.webp',
  moonlight: '../../assets/personas/moonlight.webp',
  mirror: '../../assets/personas/mirror.webp',
  stargazer: '../../assets/personas/stargazer.webp',
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

export function publicResultWordingMode(result) {
  return result.lowConfidence ? 'tendency' : 'definitive';
}

export function selectPublicResult(comparison) {
  return comparison.candidateA ?? comparison.baseline;
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
  return `<ul>${items.map((item) => `<li><b>${escapeHtml(item.label)}</b>：${escapeHtml(item.meaning)}</li>`).join('')}</ul>`;
}

function keywordList(description, highs) {
  const fromConstructs = highs.slice(0, 5).map((item) => item.label);
  const fromPersona = [
    ...(description?.primaryConstructs ?? []),
    ...(description?.secondaryConstructs ?? []),
  ].map((code) => constructLabels[code]).filter(Boolean);
  return [...new Set([...fromPersona, ...fromConstructs])].slice(0, 5);
}

function behaviorGrid(description) {
  return [
    ['如何靠近', description?.intimacyStyle],
    ['如何表达', description?.communicationStyle],
    ['如何投入', description?.relationshipPattern],
    ['如何面对承诺', description?.commitmentStyle],
    ['如何处理冲突', description?.conflictStyle],
    ['如何看待空间', description?.spaceAndBoundary],
  ];
}

function adviceItems(description, highs, lows) {
  const items = [];
  const highCodes = highs.map((item) => item.code);
  const lowCodes = lows.map((item) => item.code);
  if (highCodes.includes('MN')) items.push('当你被某个细节反复牵动时，先写下它真正代表的需要，而不是只反复回到那一幕。');
  if (highCodes.includes('SI')) items.push('当你期待精神共鸣时，可以把“我在意的意义”说具体，让对方知道怎样回应你。');
  if (lowCodes.includes('CL')) items.push('如果你不习惯高频表达亲密，可以提前告诉对方：安静并不等于疏远。');
  if (highCodes.includes('AU')) items.push('当你需要空间时，给出一个可被理解的边界和回来的时间，会比突然后退更稳定。');
  if (highCodes.includes('EC') || highCodes.includes('CR')) items.push('冲突里先说最关键的一句话，不急着解释全部，能让关系更快回到同一张地图上。');
  if (items.length < 2) items.push('选一个你最常出现的自动反应，下一次先停三秒，再决定是靠近、解释还是暂时保留空间。');
  if (items.length < 3) items.push('把“我希望对方懂我”的部分翻译成一个具体请求，关系会更容易接住你。');
  return items.slice(0, 3);
}

function buildBlendedPersonalization(result, constructScores, descriptions) {
  const top1 = result.top5[0];
  const top1Desc = getPersonaDescription(descriptions, top1.displayName);
  const highs = topConstructs(constructScores, 5);
  const highCodes = new Set(highs.map((item) => item.code));
  const top1Codes = new Set([...(top1Desc?.primaryConstructs ?? []), ...(top1Desc?.secondaryConstructs ?? [])]);
  const adjacentCodes = new Set();

  for (const item of result.top5.slice(1, 3)) {
    const desc = getPersonaDescription(descriptions, item.displayName);
    for (const code of [...(desc?.primaryConstructs ?? []), ...(desc?.secondaryConstructs ?? [])]) {
      if (highCodes.has(code)) adjacentCodes.add(code);
    }
  }

  const blendedConstructs = [...adjacentCodes].filter((code) => highCodes.has(code));
  const extraConstructs = blendedConstructs.filter((code) => !top1Codes.has(code));
  const selected = extraConstructs.length ? extraConstructs : blendedConstructs.slice(0, 2);
  const text = selected.map((code) => constructMeanings[code]?.blend).filter(Boolean).slice(0, 2);

  return {
    used: text.length > 0,
    constructs: selected,
    text,
  };
}

export function publicResultMetadata({ comparison, descriptions }) {
  const result = selectPublicResult(comparison);
  const top1 = result.top5[0];
  const blend = buildBlendedPersonalization(result, result.constructScores, descriptions);
  return {
    publicDisplayedPersona: top1.displayName,
    publicResultWordingMode: publicResultWordingMode(result),
    blendedPersonalizationUsed: blend.used,
    blendedConstructs: blend.constructs,
    publicResultVersion: PUBLIC_RESULT_VERSION,
  };
}

export function renderPublicResult({ container, comparison, descriptions }) {
  const result = selectPublicResult(comparison);
  const top1 = result.top5[0];
  const desc = getPersonaDescription(descriptions, top1.displayName);
  const highs = topConstructs(result.constructScores, 5);
  const lows = lowConstructs(result.constructScores, 4);
  const keywords = keywordList(desc, highs);
  const blend = buildBlendedPersonalization(result, result.constructScores, descriptions);
  const mode = publicResultWordingMode(result);
  const titleLine = mode === 'tendency'
    ? `你的核心关系倾向更接近${top1.displayName}`
    : `你的心岛人格是${top1.displayName}`;
  const imagePath = personaImageMap[desc?.id];
  const advice = adviceItems(desc, highs, lows);

  container.innerHTML = `
    <article class="public-result-profile" data-persona="${escapeHtml(top1.displayName)}" data-blended-personalization="${blend.used ? 'true' : 'false'}">
      <section class="public-result-hero">
        ${imagePath ? `<div class="public-portrait-wrap"><img class="public-portrait-img" src="${escapeHtml(imagePath)}" alt="${escapeHtml(top1.displayName)}拟人图" onerror="this.closest('.public-portrait-wrap').classList.add('image-missing')" /></div>` : ''}
        <p class="eyebrow">登岛结果</p>
        <h3>${escapeHtml(titleLine)}</h3>
        <p class="public-hitline">${escapeHtml(desc?.oneLineSummary)}</p>
        <div class="public-keywords">${keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}</div>
      </section>

      <section class="explanation-section">
        <h4>你的关系底色</h4>
        <p>${escapeHtml(desc?.coreDrive)}</p>
        ${blend.used ? `<p class="blended-note">${blend.text.map(escapeHtml).join('')}</p>` : ''}
      </section>

      <section class="explanation-section">
        <h4>你是怎样爱人的</h4>
        <div class="detail-grid public-behavior-grid">
          ${behaviorGrid(desc).map(([label, text]) => `<section><h5>${escapeHtml(label)}</h5><p>${escapeHtml(text)}</p></section>`).join('')}
        </div>
      </section>

      <section class="explanation-section">
        <h4>你的天赋</h4>
        ${list(desc?.strengths ?? [])}
      </section>

      <section class="explanation-section">
        <h4>你的关系惯性</h4>
        ${list(desc?.blindSpots ?? [])}
      </section>

      <section class="explanation-section">
        <h4>为什么你会得到这个结果</h4>
        <p>这份结果来自你在关系中的几组稳定倾向。高分不代表更好，低分也不是缺点，它们只是说明你更自然使用哪一种靠近方式。</p>
        <h5>比较突出的倾向</h5>
        ${constructList(highs)}
        <h5>相对没那么依赖的倾向</h5>
        ${constructList(lows)}
        <p>这些倾向共同指向：${escapeHtml(desc?.relationshipPattern)}</p>
      </section>

      <section class="explanation-section">
        <h4>你真正需要的关系</h4>
        <p>${escapeHtml(desc?.relationshipNeeds)}</p>
        <p>${escapeHtml(desc?.suitableRelationshipEnvironment)}</p>
        <p class="diagnostic-note">${escapeHtml(desc?.commonMisunderstandings)}</p>
      </section>

      <section class="explanation-section">
        <h4>给你的关系提醒</h4>
        ${list(advice)}
      </section>

      <p class="diagnostic-note">本结果不属于专业心理诊断，只用于心岛 v2.0 产品体验研究。</p>
    </article>
  `;
}

function confidenceLabel(result) {
  if (result.lowConfidence) return '低置信：结果差距较小';
  if (result.top1Top2Gap >= 8) return '较明确：Top1 与 Top2 差距较大';
  return '中等置信：结果有主倾向，也需要结合 Top2 阅读';
}

function differenceText(description, nearbyName) {
  return description?.differencesFromNearbyPersonas?.[nearbyName] ?? '两者相邻，但当前 pilot 文案还需要继续补充更细的差异说明。';
}

export function renderResultExplanation({
  container,
  title = '内部结果',
  result,
  constructScores,
  descriptions,
  anonymousLabel = null,
}) {
  const top1 = result.top5[0];
  const top2 = result.top5[1];
  const desc1 = getPersonaDescription(descriptions, top1.displayName);
  const desc2 = getPersonaDescription(descriptions, top2.displayName);
  const highs = topConstructs(constructScores, 5);
  const lows = lowConstructs(constructScores, 4);
  const distinction = differenceText(desc1, top2.displayName);

  container.innerHTML = `
    <article class="result-profile research-result-profile" data-persona="${escapeHtml(top1.displayName)}">
      <p class="eyebrow">${escapeHtml(anonymousLabel ?? title)}</p>
      <h3>${escapeHtml(top1.displayName)}</h3>
      <p class="confidence-line">${escapeHtml(confidenceLabel(result))} · Top1-Top2 gap：${escapeHtml(result.top1Top2Gap)}</p>
      ${result.lowConfidence ? `<div class="low-confidence-note">低置信结果：${escapeHtml(top1.displayName)} 与 ${escapeHtml(top2.displayName)} 接近。此信息仅供内部研究使用。</div>` : ''}

      <section class="explanation-section">
        <h4>Top5 内部排行</h4>
        <ol class="top-list">
          ${result.top5.slice(0, 5).map((item) => `<li>${escapeHtml(item.displayName)} · similarity ${escapeHtml(item.similarity)} · distance ${escapeHtml(item.distance)}</li>`).join('')}
        </ol>
      </section>

      <section class="explanation-section">
        <h4>Top1 解析</h4>
        <p>${escapeHtml(desc1?.oneLineSummary)}</p>
        <p>${escapeHtml(desc1?.coreDrive)}</p>
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
      </section>

      <section class="explanation-section">
        <h4>构念得分解释</h4>
        <h5>较高构念</h5>
        ${constructList(highs)}
        <h5>较低构念</h5>
        ${constructList(lows)}
      </section>
    </article>
  `;
}

export function renderAnonymousResults({ container, comparison, descriptions }) {
  renderPublicResult({ container, comparison, descriptions });
}
