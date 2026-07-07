import assert from 'node:assert/strict';
import {
  buildFeedbackUrl,
  normalizeFeedbackConfig,
  sanitizeFeedbackBaseUrl,
} from '../js/v2/feedback-config.js';

const currentLocation = 'http://127.0.0.1:4323/';
const allowedOrigins = ['https://forms.example.com'];
const feishuUrl = 'https://bcn5ylnvypio.feishu.cn/wiki/OKzkwuv8LiTeWJk2geqcQ4IRnae?table=tbldqgaEMMZ6VCMV&view=vewCPDfb1E';
const feishuOrigin = 'https://bcn5ylnvypio.feishu.cn';

assert.equal(normalizeFeedbackConfig({}, currentLocation).enabled, false, 'blank feedback config should be disabled');
assert.equal(sanitizeFeedbackBaseUrl('javascript:alert(1)', { currentLocation }), null, 'javascript: URL should be rejected');
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
assert.equal(parsed.searchParams.get('promptVersion'), 'v2-controlled-ai-report-prompt-2');
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
assert.equal(feishuParsed.searchParams.get('table'), 'tbldqgaEMMZ6VCMV');
assert.equal(feishuParsed.searchParams.get('view'), 'vewCPDfb1E');
assert.equal(feishuParsed.searchParams.get('prefill_version'), 'Heart Island v2.0 Alpha 1');
assert.equal(feishuParsed.searchParams.get('prefill_persona'), 'mirror & lake');
assert.equal(feishuParsed.searchParams.get('prefill_promptVersion'), 'v2-controlled-ai-report-prompt-2');
assert.equal(feishuParsed.searchParams.get('prefill_anonymousResultId'), 'v2-anon-001');
assert.equal(feishuParsed.searchParams.get('prefill_aiSource'), 'ai');
assert.equal(feishuParsed.searchParams.get('prefill_viewport'), '1440x900');
for (const key of ['version', 'persona', 'promptVersion', 'anonymousResultId', 'aiSource', 'viewport']) {
  assert.equal(feishuParsed.searchParams.get(`hide_${key}`), '1', `${key} Feishu hide flag should be present`);
}
assert(!feishuFeedbackUrl.includes('answers'), 'Feishu URL must not include raw answers');
assert(!feishuFeedbackUrl.includes('AI_REPORT_API_KEY'), 'Feishu URL must not include API key names');
assert(!feishuFeedbackUrl.includes('Do not leak'), 'Feishu URL must not include full AI report text');
assert(!feishuFeedbackUrl.includes('userName'), 'Feishu URL must not include identity fields');

console.log(JSON.stringify({ pass: true }, null, 2));
