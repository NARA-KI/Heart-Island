import assert from 'node:assert/strict';
import {
  buildFeedbackUrl,
  normalizeFeedbackConfig,
  sanitizeFeedbackBaseUrl,
} from '../js/v2/feedback-config.js';

const currentLocation = 'http://127.0.0.1:4323/';
const allowedOrigins = ['https://forms.example.com'];

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

const facts = {
  resultId: 'v2-anon-001',
  versions: { productVersion: 'Heart Island v2.0 Alpha 1' },
  persona: { id: 'mirror & lake' },
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
assert(!url.includes('answers'), 'feedback URL must not include raw answers');
assert(!url.includes('AI_REPORT_API_KEY'), 'feedback URL must not include API key names');
assert(!url.includes('Do not leak'), 'feedback URL must not include full AI report text');

console.log(JSON.stringify({ pass: true }, null, 2));
