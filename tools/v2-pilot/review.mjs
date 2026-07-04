import { loadPersonaDescriptions, renderResultExplanation } from './result-explanation.mjs';

const DESCRIPTION_PATH = '../../drafts/v2/persona-descriptions.v2.pilot.json';
const state = {
  descriptions: null,
};

const fileInput = document.querySelector('#fileInput');
const reviewStatus = document.querySelector('#reviewStatus');
const reviewResult = document.querySelector('#reviewResult');
const reviewCards = document.querySelector('#reviewCards');
const sampleMeta = document.querySelector('#sampleMeta');

async function init() {
  state.descriptions = await loadPersonaDescriptions(DESCRIPTION_PATH);
  reviewStatus.textContent = '解析数据已加载。请选择匿名 JSON。';
  fileInput.addEventListener('change', handleFile);
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const record = JSON.parse(await file.text());
    renderReview(record);
  } catch (error) {
    reviewStatus.textContent = `导入失败：${error.message}`;
  }
}

function resultFromRecord(record, source) {
  const top5 = source === 'baseline' ? record.baselineTop5 : record.candidateATop5;
  const gap = source === 'baseline' ? record.baselineGap : record.candidateAGap;
  const low = source === 'baseline' ? record.baselineLowConfidence : record.candidateALowConfidence;
  if (!Array.isArray(top5) || top5.length < 3) throw new Error(`缺少 ${source} Top5`);
  return {
    top5,
    top1: top5[0].displayName,
    top1Top2Gap: gap,
    top3Spread: Number((top5[2].distance - top5[0].distance).toFixed(4)),
    lowConfidence: Boolean(low),
  };
}

function renderReview(record) {
  if (!record.constructScores) throw new Error('缺少 constructScores，无法渲染构念依据');
  const baselineResult = resultFromRecord(record, 'baseline');
  const candidateResult = resultFromRecord(record, 'candidate-A');
  reviewCards.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'result-card explanation-card';
  renderResultExplanation({
    container: wrapper,
    title: 'Baseline 内部结果',
    result: baselineResult,
    constructScores: record.constructScores,
    descriptions: state.descriptions,
  });
  reviewCards.append(wrapper);
  const second = document.createElement('div');
  second.className = 'result-card explanation-card';
  renderResultExplanation({
    container: second,
    title: 'Candidate-A 内部结果',
    result: candidateResult,
    constructScores: record.constructScores,
    descriptions: state.descriptions,
  });
  reviewCards.append(second);
  sampleMeta.textContent = `pilotId：${record.pilotId ?? '未知'}；baseline Top1：${baselineResult.top1}；baseline Top2：${baselineResult.top5[1].displayName}；baseline Top3：${baselineResult.top5[2].displayName}；baseline gap：${baselineResult.top1Top2Gap}；${baselineResult.lowConfidence ? '低置信' : '非低置信'}；candidate-A Top1：${candidateResult.top1}；candidate-A gap：${candidateResult.top1Top2Gap}`;
  reviewResult.classList.remove('hidden');
  reviewResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  reviewStatus.textContent = '导入成功。页面没有上传或修改该文件。';
}

init().catch((error) => {
  reviewStatus.textContent = `加载失败：${error.message}`;
});
