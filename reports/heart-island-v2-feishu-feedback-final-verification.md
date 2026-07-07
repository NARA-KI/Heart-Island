# Heart Island V2 Feishu Feedback Final Verification

Generated at: 2026-07-07 15:55 CST

## Scope

- Branch: `release/heart-island-v2-trusted-beta-rc1.1`
- Verified baseline commit: `325fc5d`
- Public Feishu form: `https://bcn5ylnvypio.feishu.cn/share/base/form/shrcnEXYOVL3oqm1of8RhHubJAc`
- Config files checked: `feedback-config.json`, `deploy/feedback-config.json`

## Real Form Verification

- Root and deploy feedback config both point to the official Feishu public form URL.
- Allowed origin is `https://bcn5ylnvypio.feishu.cn`.
- A real deploy result page generated a feedback URL with all six context fields:
  `version`, `persona`, `promptVersion`, `anonymousResultId`, `aiSource`, `viewport`.
- The generated URL also included all corresponding Feishu-compatible parameters:
  `prefill_*` and `hide_*` for each of the six fields.
- The real Feishu public form rendered 9 visible feedback questions.
- The six technical context fields were not visible to the public form user.
- Feishu telemetry for the submitted test page reported:
  - `active_prefill_link_params_list=1,1,1,1,1,1`
  - `active_hide_link_params_list=1,1,1,1,1,1`
  - `active_link_params_num=12`
  - `hide_link_params_num=6`

## Submission Verification

- Submitted one real validation record marked `AUTO_VALIDATION_TEST_1783410369585`.
- Feishu returned submit success from `space/api/bitable/share/content` with status 200 and `code=0`.
- The submit success page displayed successfully after submission.
- Raw Feishu network capture was not committed because it included third-party anonymous telemetry identifiers.
- Test record deletion could not be completed from this environment because the Chrome extension browser connection was unavailable; the public submit flow itself was verified.

## Tests

Passed:

- `node tests/v2-feedback-config.test.mjs`
- `node tests/v2-result-core.test.mjs`
- `node tests/v2-result-core-browser.mjs`
- `node tests/v2-ai-report-service.test.mjs`
- `node tests/v2-controlled-ai-report-browser.mjs`

## Frozen Assets

No diff was detected in frozen V2 assets or core result/scoring/prompt files:

- `data/v2/question-bank.v2.json`
- `data/v2/persona-target-vectors.v2.candidate-a.json`
- `data/v2/manifest.json`
- `js/v2/scoring-engine.js`
- `server/ai-report/prompt.js`
- `js/v2/ai/ai-report-schema.js`
- `js/v2/result-report-builder.js`
- `deploy/assets/personas`
