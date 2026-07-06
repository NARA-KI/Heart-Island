import { V2_DATA_PATHS } from './config.js';
import { assertV2Data } from './scoring-engine.js';

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`加载失败：${path} (${response.status})`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`解析失败：${path} (${error.message})`);
  }
}

export async function loadV2RuntimeData(paths = V2_DATA_PATHS, options = {}) {
  const includePilot = options.includePilot === true;
  const [manifest, questionBank, candidateA, baseline, descriptions] = await Promise.all([
    loadJson(paths.manifest),
    loadJson(paths.questionBank),
    loadJson(paths.candidateA),
    loadJson(paths.baseline),
    loadJson(paths.descriptions),
  ]);

  const validation = assertV2Data({
    questionBank,
    personaData: candidateA,
    descriptions,
  });

  const runtime = {
    manifest,
    questionBank,
    candidateA,
    baseline,
    descriptions,
    validation,
  };

  if (includePilot) {
    const [candidateE, candidateEScoringProfile] = await Promise.all([
      loadJson(paths.candidateE),
      loadJson(paths.candidateEScoringProfile),
    ]);
    assertV2Data({
      questionBank,
      personaData: candidateE,
      descriptions,
    });
    runtime.candidateE = candidateE;
    runtime.candidateEScoringProfile = candidateEScoringProfile;
  }

  return runtime;
}
