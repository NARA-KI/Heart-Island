# Heart Island V2 Trusted Beta RC1 Release Report

生成时间：2026-07-07  
RC 分支：`release/heart-island-v2-trusted-beta-rc1`  
RC 提交：见当前 `HEAD`  
RC 基线提交：`6edd885`  

## 1. 当前分支与提交

- 当前分支：`release/heart-island-v2-trusted-beta-rc1`
- 基线提交：`6edd885 test(v2): validate complete persona art assets`
- RC 报告提交：见当前 `HEAD`
- 未推送远端。

## 2. 完整提交链

使用 `git merge-base --is-ancestor` 和 `git branch --contains` 核对，以下阶段提交均为当前 HEAD 祖先：

| 阶段 | 对应提交 | 状态 |
| --- | --- | --- |
| V2 60题与15构念集成 | `e821932` | 已包含 |
| 可信 Beta 现状审计 | `cb89c36` | 已包含 |
| Result Facts | `f21342b` | 已包含 |
| deterministic Result Report | `f21342b` | 已包含 |
| 结果页重构 | `8c84262` | 已包含 |
| 15维关系地图 | `8c84262` | 已包含 |
| 分享与保存 | `249c169` | 已包含 |
| 结果恢复 | `51b0e80` | 已包含 |
| 五层十五构念统一 | `f15acac` | 已包含 |
| 受控 AI Report API | `7d09c2d` | 已包含 |
| DeepSeek Provider | `026b71d` | 已包含 |
| finish_reason、安全与降级 | `026b71d` | 已包含 |
| 真实 Provider smoke | `577fbac` | 已包含 |
| 缓存与限流顺序修复 | `236cb85` | 已包含 |
| Prompt-2 | `3ae7f70` | 已包含 |
| 15/15人格正式图片 | `01b9800` | 已包含 |

## 3. 冻结资产 Hash

| 项目 | SHA256 |
| --- | --- |
| `data/v2/question-bank.v2.json` | `1b101a0a9a7e9b8e1e45ce22bf96dc88f2dd0781d71b931b2062a4c3cd1400e9` |
| `data/v2/persona-target-vectors.v2.candidate-a.json` | `f656ae63cf4f8eb1f398e92005996b347ea3348cda8894baa3b145a096c5ecd3` |
| `data/v2/manifest.json` | `bcf9cec0a84a204b6dbfe6bf1be46483531ee1b2d087fc12ac49cf7170f5279a` |

Manifest 校验：

- `questionBankHash` 与题库当前 hash 一致。
- `targetVectorHash` 与 candidate-a 当前 hash 一致。
- 题库：60 题、15 构念、每题 4 选项、60 个 reverse 标记。
- candidate-a：15 人格、每个人格 15 维 targetVector。

## 4. 修改文件概览

本轮 RC 提交只包含发布验收产物和 deploy 静态镜像更新：

- `deploy/`：重新生成 V2 静态部署镜像，包含 `index.html`、`app.mjs`、`styles.css`、`package.json`、`js/`、`data/`、运行时 `assets/`。
- `deploy/app.js`：删除旧 0.9.x 单文件入口，当前 V2 入口为 `app.mjs`。
- `reports/data/*browser.json`、`reports/audit-assets/*`：更新本轮测试和截图结果。
- `reports/heart-island-v2-trusted-beta-rc1-release-report.md`：本报告。

未修改：

- `data/v2/question-bank.v2.json`
- `data/v2/persona-target-vectors.v2.candidate-a.json`
- `js/v2/scoring-engine.js`
- `server/ai-report/prompt.js`
- `js/v2/ai/ai-report-schema.js`
- `js/v2/result-report-builder.js`

## 5. 全部测试结果

| 命令 | 结果 | 关键结论 |
| --- | --- | --- |
| `npm run v2:test:result-core` | 通过 | 11 个基线样本通过；评分和人格命中未变化。 |
| `npm run v2:test:result-core:browser` | 通过 | 375x667、390x844、1440x900 均通过；broken images 0、横向溢出 0。 |
| `npm run v2:test:controlled-ai` | 通过 | Provider success/invalid-json/invalid-schema/429/500/timeout 覆盖；非 stop finish_reason 全部拒绝；cacheBeforeQuota=true。 |
| `npm run v2:test:controlled-ai:browser` | 通过 | AI 生成中、AI 成功、超时降级、schema 降级、刷新恢复通过；API Key 泄漏 0。 |
| `npm run v2:test:provider-smoke` | 通过 | 真实 Provider 5/5 成功，cacheVerified=true。 |

## 6. 真实 Provider 结果

- 状态：`COMPLETED`
- 首次真实样本成功数：5/5
- Schema 通过率：100%
- evidence 通过率：100%
- Provider 错误率：0
- 平均首次延迟：8692ms
- `cacheVerified`：true
- 真实 Provider 调用次数：5
- 重复样本：2/2 命中缓存
- 重复缓存延迟：2ms、1ms
- 私密完整报告仅写入忽略目录：`reports/private/`

## 7. Prompt 版本

- `V2_AI_REPORT_PROMPT_VERSION`：`v2-controlled-ai-report-prompt-2`
- Result Facts Schema：`v2-trusted-beta-result-facts-1`
- Result Report Schema：`v2-trusted-beta-result-report-1`

## 8. 15 人格图片完整性

- 根目录正式人格图：15/15
- 根目录缩略图：15/15
- deploy 正式人格图：15/15
- deploy 缩略图：15/15
- fallback 人格数量：0
- 新增人格：`companion`、`harbor`、`ferryman`

## 9. 三视口结果

RC1 browser summary：`reports/data/v2-trusted-beta-rc1-browser.json`

- 375x667：通过
- 390x844：通过
- 1440x900：通过
- JS 错误：0
- broken images：0
- 横向溢出：0
- fallback portraits：0

## 10. 分享卡结果

- 375x667 分享卡：通过
- 390x844 分享卡：通过
- `companion` 分享卡：通过
- `harbor` 分享卡：通过
- `ferryman` 分享卡：通过

截图目录：`reports/audit-assets/v2-trusted-beta-rc1/`

## 11. 缓存与降级

- 服务端测试确认 `cacheBeforeQuota=true`。
- 真实 smoke 确认两个重复样本均 `cacheHit=true`。
- 真实 Provider 调用次数保持 5，不因重复缓存请求增加到 7。
- `finish_reason` 非 `stop` 的值均在受控测试中降级。
- Provider timeout、invalid schema、invalid JSON、429、500 均有受控覆盖。

## 12. 隐私和 Key 扫描

- tracked `.env` / `.env.local` 数量：0
- tracked `reports/private/` 数量：0
- 独立真实 API Key 形态泄漏数量：0
- `.env.local`：被 `.gitignore` 忽略
- `reports/private/`：被 `.gitignore` 忽略
- deploy 中 `.env` / `.env.local`：不存在
- deploy 中 `server/`：不存在
- deploy 中 `assets/source/`：不存在

说明：旧 draft fixture 中存在 `risk-sk...` 这类测试 id 子串，二次扫描按独立 token 边界排除，未计为真实 Key。

## 13. deploy 产物检查

deploy 重新生成结果：

- `deploy/index.html`：V2 当前入口
- `deploy/app.mjs`：V2 模块入口
- `deploy/js/v2/`：已同步
- `deploy/data/v2/`：已同步
- `deploy/assets/personas/`：15 张正式 WebP
- `deploy/assets/personas/thumbs/`：15 张缩略图
- `deploy/server/`：不存在
- `deploy/.env*`：不存在
- `deploy/assets/source/`：不存在

静态服务验证：

- 使用 `deploy/` 启动本地静态服务。
- 390x844 从首页到结果页完整通过。
- 结果页 persona：`collector`
- AI source：`ai`
- broken images：0
- 横向溢出：0
- fallback portraits：0

## 14. 服务端部署变量清单

不填写真实值：

```text
AI_REPORT_ENABLED=<true|false>
AI_REPORT_PROVIDER=<deepseek|mock>
AI_REPORT_API_KEY=<secret>
AI_REPORT_BASE_URL=<provider base url>
AI_REPORT_MODEL=<provider model>
AI_REPORT_PROMPT_VERSION=v2-controlled-ai-report-prompt-2
AI_REPORT_TEMPERATURE=<number>
AI_REPORT_TIMEOUT_MS=<provider timeout, e.g. 12000>
AI_REPORT_MAX_TOKENS=<number>
AI_REPORT_THINKING_TYPE=disabled
AI_REPORT_BODY_LIMIT_BYTES=<bytes>
AI_REPORT_SESSION_LIMIT=<number>
AI_REPORT_CACHE_TTL_MS=<milliseconds>
AI_REPORT_API_PATH=/api/v2/ai-report
ALLOWED_ORIGIN=<official origin>
```

必须挂载：

```text
POST /api/v2/ai-report
OPTIONS /api/v2/ai-report
```

平台总 timeout 必须大于 `AI_REPORT_TIMEOUT_MS`，建议至少多 3 到 5 秒缓冲。

## 15. 剩余 P0/P1/P2

| 等级 | 数量 | 内容 |
| --- | ---: | --- |
| P0 | 0 | 未发现阻断核心结果、AI 降级、安全或 deploy 启动的问题。 |
| P1 | 1 | 默认结果页反馈链路只保存本地自由文本，不满足整体准确度 1-5、最像、最不像、是否愿意保存/分享、补充意见的完整可收集闭环。 |
| P2 | 1 | 根目录 `deploy.ps1` 仍是旧 0.9.5 硬编码脚本；本轮未改脚本，使用可重复目录同步流程生成 RC deploy。 |

## 16. 是否适合封闭内测

不建议立即进入 10-30 人封闭内测。技术链路已通过，但反馈收集链路不满足本轮要求；需要先提供可实际收集的五项反馈入口，至少可使用外部表单并在内测说明中强制绑定。

## 17. 是否适合公开测试

不建议公开测试。公开前至少需要解决 P1 反馈闭环，并将服务端变量在正式平台完成一次不含真实 Key 输出的部署演练。

## 18. 回滚方式

- 前端静态回滚：回退到 `6edd885` 或前一个已确认 deploy 镜像。
- RC 提交回滚：`git revert <RC提交>`
- AI 增强关闭：`AI_REPORT_ENABLED=false`
- Provider 降级：撤下 `/api/v2/ai-report` 或使用 deterministic fallback，前端仍显示稳定版结果。

## 19. Git 提交记录

```text
6edd885 test(v2): validate complete persona art assets
01b9800 feat(v2): add companion harbor and ferryman persona art
3ae7f70 test(v2): validate ai report prompt 2 quality
2e69a27 feat(v2): improve ai report personalization prompt
236cb85 fix(v2): check ai report cache before quota
e61d297 test(v2): rehearse trusted beta production flow
df84045 docs(v2): add ai report deployment guide
577fbac test(v2): validate real ai report provider
026b71d fix(v2): harden deepseek structured report handling
e851bd3 test(v2): validate controlled ai report pipeline
6a4f4d5 feat(v2): integrate ai report with deterministic fallback
7d09c2d feat(v2): add controlled ai report service
f15acac fix(v2): align result map with five-layer construct model
51b0e80 test(v2): validate trusted beta result core
249c169 feat(v2): polish result share card output
8c84262 feat(v2): rebuild trusted beta result experience
f21342b feat(v2): add deterministic result facts and rules
cb89c36 docs: add v2 trusted beta current state audit
af3bc59 docs: add v2 15d profile preview
6a7e010 feat: prepare v2 pilot blind review
e821932 feat: integrate v2 alpha minimal product loop
```
