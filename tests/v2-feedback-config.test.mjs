import assert from 'node:assert/strict';
import {
  buildFeedbackUrl,
  normalizeFeedbackConfig,
  sanitizeFeedbackBaseUrl,
} from '../js/v2/feedback-config.js';
import {
  normalizeAiReportConfig,
  sanitizeAiReportEndpoint,
} from '../js/v2/ai/ai-report-config.js';

const currentLocation = 'http://127.0.0.1:4323/';
const allowedOrigins = ['https://forms.example.com'];
const feishuUrl = 'https://bcn5ylnvypio.feishu.cn/share/base/form/shrcnEXYOVL3oqm1of8RhHubJAc';
const feishuOrigin = 'https://bcn5ylnvypio.feishu.cn';
const cloudbaseAiEndpoint = 'https://xindao-mvp06-d9gf6ion1b76a1327-1442533234.ap-shanghai.app.tcloudbase.com/api/v2/ai-report';

assert.equal(normalizeFeedbackConfig({}, currentLocation).enabled, false, 'blank feedback config should be disabled');
assert.equal(sanitizeFeedbackBaseUrl('javascript:alert(1)', { currentLocation }), null, 'javascript: URL should be rejected');
assert.equal(sanitizeFeedbackBaseUrl('http://forms.example.com/form', { currentLocation }), null, 'http: URL should be rejected');
assert.equal(sanitizeFeedbackBaseUrl('http://127.0.0.1:4323/form', { currentLocation }), null, 'localhost http: URL should be rejected');
assert.equal(sanitizeFeedbackBaseUrl('data:text/html,hello', { currentLocation }), null, 'data: URL should be rejected');
assert.equal(sanitizeFeedbackBaseUrl('ftp://forms.example.com/form', { currentLocation }), null, 'ftp: URL should be rejected');
assert.equal(sanitizeFeedbackBaseUrl('https://user:pass@forms.example.com/form', { currentLocation }), null, 'credentialed URL should be rejected');
assert.equal(
  sanitizeFeedbackBaseUrl('https://evil.example.com/form', { allowedOrigins, currentLocation }),
  null,
  'disallowed origin should be rejected',
);

const config = normalizeFeedbackConfig({
  feedbackFormUrl: 'https://forms.example.com/form?existing=1',
  allowedOrigins,
}, currentLocation);
assert.equal(config.enabled, true, 'allowed https feedback URL should be enabled');

assert.equal(
  normalizeAiReportConfig({ endpoint: cloudbaseAiEndpoint }, currentLocation).endpoint,
  cloudbaseAiEndpoint,
  'production AI config should use the full CloudBase endpoint',
);
assert.equal(
  normalizeAiReportConfig({ endpoint: '/api/v2/ai-report' }, currentLocation).endpoint,
  '/api/v2/ai-report',
  'local AI config should support the relative endpoint',
);
assert.equal(sanitizeAiReportEndpoint('javascript:alert(1)', { currentLocation }), null, 'javascript: AI endpoint should be rejected');
assert.equal(sanitizeAiReportEndpoint('data:text/html,hello', { currentLocation }), null, 'data: AI endpoint should be rejected');
assert.equal(sanitizeAiReportEndpoint('http://evil.example.com/api/v2/ai-report', { currentLocation }), null, 'absolute http AI endpoint should be rejected');
assert.equal(sanitizeAiReportEndpoint('https://user:pass@example.com/api/v2/ai-report', { currentLocation }), null, 'credentialed AI endpoint should be rejected');
const productionConfigText = JSON.stringify({ endpoint: cloudbaseAiEndpoint });
for (const secretTerm of ['AI_REPORT_API_KEY', 'apiKey', 'sk-', '.env', 'Authorization', 'Bearer']) {
  assert.equal(productionConfigText.includes(secretTerm), false, `AI config should not contain secret marker ${secretTerm}`);
}

const feishuConfig = normalizeFeedbackConfig({
  feedbackFormUrl: feishuUrl,
  allowedOrigins: [feishuOrigin],
}, currentLocation);
assert.equal(feishuConfig.enabled, true, 'official Feishu feedback URL should be enabled');
assert.equal(new URL(feishuConfig.url).origin, feishuOrigin, 'Feishu origin should match allowed origin');

const facts = {
  resultId: 'v2-anon-001',
  versions: { productVersion: 'Heart Island v2.0 Alpha 1' },
  persona: { id: 'mirror & lake' },
  userName: 'Do not leak identity',
};
const report = {
  source: 'ai',
  oneLine: 'Do not leak this full AI report body',
};
const url = buildFeedbackUrl(config.url, { facts, report, viewport: '390x844' });
const parsed = new URL(url);
assert.equal(parsed.origin, 'https://forms.example.com');
assert.equal(parsed.searchParams.get('existing'), '1');
assert.equal(parsed.searchParams.get('version'), 'Heart Island v2.0 Alpha 1');
assert.equal(parsed.searchParams.get('persona'), 'mirror & lake');
assert.equal(parsed.searchParams.get('promptVersion'), 'v2-dual-quiz-ai-report-prompt-3');
assert.equal(parsed.searchParams.get('anonymousResultId'), 'v2-anon-001');
assert.equal(parsed.searchParams.get('aiSource'), 'ai');
assert.equal(parsed.searchParams.get('viewport'), '390x844');
for (const key of ['version', 'persona', 'promptVersion', 'anonymousResultId', 'aiSource', 'viewport']) {
  assert.equal(parsed.searchParams.get(`prefill_${key}`), parsed.searchParams.get(key), `${key} prefill should match canonical context`);
  assert.equal(parsed.searchParams.get(`hide_${key}`), '1', `${key} hide flag should be present`);
}
assert(!url.includes('answers'), 'feedback URL must not include raw answers');
assert(!url.includes('AI_REPORT_API_KEY'), 'feedback URL must not include API key names');
assert(!url.includes('Do not leak'), 'feedback URL must not include full AI report text');
assert(!url.includes('userName'), 'feedback URL must not include identity fields');
assert(!url.includes('email'), 'feedback URL must not include email fields');
assert(!url.includes('phone'), 'feedback URL must not include phone fields');

const feishuFeedbackUrl = buildFeedbackUrl(feishuConfig.url, { facts, report, viewport: '1440x900' });
const feishuParsed = new URL(feishuFeedbackUrl);
assert.equal(feishuParsed.origin, feishuOrigin);
assert.equal(feishuParsed.pathname, '/share/base/form/shrcnEXYOVL3oqm1of8RhHubJAc');
assert.equal(feishuParsed.searchParams.get('prefill_version'), 'Heart Island v2.0 Alpha 1');
assert.equal(feishuParsed.searchParams.get('prefill_persona'), 'mirror & lake');
assert.equal(feishuParsed.searchParams.get('prefill_promptVersion'), 'v2-dual-quiz-ai-report-prompt-3');
assert.equal(feishuParsed.searchParams.get('prefill_anonymousResultId'), 'v2-anon-001');
assert.equal(feishuParsed.searchParams.get('prefill_aiSource'), 'ai');
assert.equal(feishuParsed.searchParams.get('prefill_viewport'), '1440x900');
for (const key of ['version', 'persona', 'promptVersion', 'anonymousResultId', 'aiSource', 'viewport']) {
  assert.equal(feishuParsed.searchParams.get(`hide_${key}`), '1', `${key} Feishu hide flag should be present`);
}
assert(!feishuFeedbackUrl.includes('answers'), 'Feishu URL must not include raw answers');
assert(!feishuFeedbackUrl.includes('responses'), 'Feishu URL must not include responses');
assert(!feishuFeedbackUrl.includes('rawAnswers'), 'Feishu URL must not include raw answers aliases');
assert(!feishuFeedbackUrl.includes('AI_REPORT_API_KEY'), 'Feishu URL must not include API key names');
assert(!feishuFeedbackUrl.includes('apiKey'), 'Feishu URL must not include API key aliases');
assert(!feishuFeedbackUrl.includes('Do not leak'), 'Feishu URL must not include full AI report text');
assert(!feishuFeedbackUrl.includes('reportText'), 'Feishu URL must not include report text aliases');
assert(!feishuFeedbackUrl.includes('userName'), 'Feishu URL must not include identity fields');

console.log(JSON.stringify({ pass: true }, null, 2));
