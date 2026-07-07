# Heart Island V2 Trusted Beta RC1.2 Pre-Beta Hardening Report

Generated at: 2026-07-07 17:15 CST

1. Current branch: `release/heart-island-v2-trusted-beta-rc1.2`
2. Current commit at report generation: `5282b47` before this report commit
3. Worktree clean: no, this report and RC1.2 hardening changes are pending commit
4. Production site URL: not confirmed in repo or local Tencent Cloud config; inferred GitHub Pages URL `https://nara-ki.github.io/Heart-Island/` returned 404
5. Production AI API URL: frontend requests relative `POST /api/v2/ai-report`; full production URL cannot be confirmed without the official site origin
6. Root cause of previous `aiSource=deterministic`: current deploy is a static mirror and no confirmed production server route/cloud function is mounted for `/api/v2/ai-report`; `.env.local` allows only `http://127.0.0.1:4324`
7. Server deployment method: no Tencent Cloud target was safely identifiable from this machine; existing reusable server artifact remains `server/ai-report/handler.js`
8. Production Provider truly succeeded: no, only local real DeepSeek Provider smoke succeeded
9. Production result is `aiSource=ai`: no formal production smoke could be completed without a confirmed production site URL and deployed API route
10. Production AI first latency: N/A; local real Provider average first latency was 8470 ms, p95 9314 ms
11. Fallback still available: yes; timeout and invalid-schema browser flows fall back to deterministic
12. API Key leak count: 0 in deploy scan and browser metrics
13. Save result image still jumps to bare PNG page: no
14. Changed to in-page share-card preview: yes
15. Web Share support: supported when `navigator.share` and `navigator.canShare({ files })` are available; automated browser mock confirmed one file share call
16. Production technical copy hidden: yes; AI status, fallback technical text, anonymous result id, feedback clicked state, provider/schema/cache/prompt diagnostics are hidden unless `debug=1`
17. Anonymous id still passed to Feishu: yes, via `anonymousResultId` and `prefill_anonymousResultId`
18. `aiSource` still passed to Feishu: yes, via `aiSource` and `prefill_aiSource`
19. Adjacent-persona fuzzy copy handled: yes; display layer replaces vague adjacent-type copy without changing scoring or result facts
20. Three viewports passed: yes, 375x667, 390x844, 1440x900
21. JS error count: 0 in browser test reports
22. Broken images count: 0 in browser test reports
23. Horizontal overflow count: 0 in browser test reports
24. Question bank hash changed: no
25. Candidate-a hash changed: no
26. Scoring changed: no
27. Persona hit changed: no
28. Prompt version changed: no
29. Deploy regenerated: yes; `deploy/` includes updated share preview and production copy hiding, excludes `.env*`, `server/`, `reports/private/`, API keys, and `assets/source/`
30. P0 count: 0
31. P1 count: 1
32. Recommend entering 10-15 person closed beta: no, formal production AI smoke did not pass
33. Recommend public test: no
34. Pushed to remote: no

## Validation Commands

- `node tests/v2-feedback-config.test.mjs`: pass
- `node tests/v2-result-core.test.mjs`: pass
- `node tests/v2-result-core-browser.mjs`: pass
- `node tests/v2-ai-report-service.test.mjs`: pass
- `node tests/v2-controlled-ai-report-browser.mjs`: pass
- `npm run v2:test:provider-smoke`: pass locally with real Provider, 5/5 success, Schema pass rate 100%, cache verified
- Local `deploy/` static smoke at 390x844: pass, `aiSource=ai` with local mock API, in-page share preview, JS errors 0, broken images 0, horizontal overflow 0

## Required Tencent Cloud Actions

To complete formal production AI verification, configure a server-side route or cloud function for the official site:

- Mount `POST /api/v2/ai-report` and `OPTIONS /api/v2/ai-report` to the existing `server/ai-report/handler.js` logic.
- Set server-only environment variables: `AI_REPORT_ENABLED`, `AI_REPORT_PROVIDER`, `AI_REPORT_API_KEY`, `AI_REPORT_BASE_URL`, `AI_REPORT_MODEL`, `AI_REPORT_PROMPT_VERSION`, `AI_REPORT_TEMPERATURE`, `AI_REPORT_TIMEOUT_MS`, `AI_REPORT_MAX_TOKENS`, `AI_REPORT_THINKING_TYPE`, `AI_REPORT_BODY_LIMIT_BYTES`, `AI_REPORT_SESSION_LIMIT`, `AI_REPORT_CACHE_TTL_MS`, `AI_REPORT_API_PATH`, `ALLOWED_ORIGIN`.
- Set `ALLOWED_ORIGIN` to the real official site origin, not the local origin currently present in `.env.local`.
- Ensure the platform timeout is at least 3 seconds greater than `AI_REPORT_TIMEOUT_MS`.
- Re-run a real production-site smoke and confirm the visible result page actually uses `aiSource=ai`.
