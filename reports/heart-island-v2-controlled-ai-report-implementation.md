# 心岛 V2 可信 Beta — 受控 AI 个性化报告接入实施报告

生成时间：2026-07-06  
当前分支：`feature/heart-island-v2-controlled-ai-report`  
起点提交：`51b0e80 test(v2): validate trusted beta result core`

## 1. 分支和提交

已完成提交：

- `f15acac fix(v2): align result map with five-layer construct model`
- `7d09c2d feat(v2): add controlled ai report service`
- `6a4f4d5 feat(v2): integrate ai report with deterministic fallback`
- 最终验证、截图和本报告将随 `test(v2): validate controlled ai report pipeline` 提交。

未推送远端。

## 2. 五层十五构念核对结果

结论：配置层本身已经是五层十五构念；上一轮实施报告把结果地图误写为四组。前端结果页原先有一份重复的 layer 顺序常量，本轮改为读取 `CONSTRUCT_LAYER_ORDER`，避免 UI 与 config 漂移。

自动测试已覆盖：

- layer count = 5
- construct count = 15
- each construct belongs to exactly one layer
- UI layer order follows config

## 3. 五层及 15 构念完整映射

- 安全与信任：`SC`, `AU`, `TR`
- 亲密与投入：`CL`, `PA`, `CM`
- 理想与现实：`SI`, `NV`, `RM`
- 支持与沟通：`CS`, `EC`, `CR`
- 情绪与记忆：`ER`, `RI`, `MN`

题库、分数、反向题和 candidate-a targetVector 未修改。

## 4. AI 调用架构

调用链：

`Result Facts -> /api/v2/ai-report -> Provider Adapter -> Result Report Schema -> server validation -> frontend validation -> replace report text`

AI 只作为报告表达层，不参与评分、人格命中、构念计算或关系事实判断。

## 5. Provider Adapter

新增服务端 provider：

- `server/ai-report/provider.js`
- `server/ai-report/handler.js`
- `server/ai-report/prompt.js`
- `server/ai-report/validation.js`

首个真实 provider 为 DeepSeek-compatible Chat Completions adapter；测试 provider 为 `mock`。

## 6. 服务端环境变量

模板文件：`.env.example`

- `AI_REPORT_PROVIDER`
- `AI_REPORT_ENABLED`
- `AI_REPORT_API_KEY`
- `AI_REPORT_BASE_URL`
- `AI_REPORT_MODEL`
- `AI_REPORT_TEMPERATURE`
- `AI_REPORT_TIMEOUT_MS`
- `AI_REPORT_MAX_TOKENS`
- `AI_REPORT_BODY_LIMIT_BYTES`
- `AI_REPORT_SESSION_LIMIT`
- `AI_REPORT_CACHE_TTL_MS`
- `AI_REPORT_MOCK_MODE`
- `ALLOWED_ORIGIN`

真实 API Key 未写入前端、报告、日志或 Git。

## 7. 请求 Schema

`POST /api/v2/ai-report` 只接受：

```json
{
  "requestId": "string",
  "resultHash": "string",
  "facts": {}
}
```

拒绝原始 60 题答案、localStorage 完整内容、用户反馈、姓名、电话、微信、地址等字段。

## 8. 响应 Schema

AI 输出复用 Result Report：

- `schemaVersion`
- `oneLine`
- `keyTraits`
- `neededRelationship`
- `innerConflict`
- `misunderstoodByOthers`
- `strengths`
- `repeatPatterns`
- `advice`
- `evidence`
- `safetyDisclaimer`
- `source: "ai"`

服务端和前端都会调用 schema 校验；校验失败不会混入局部 AI 文案。

## 9. Prompt 版本

Prompt version：`v2-controlled-ai-report-prompt-1`

System prompt 限制：

- 不重新决定人格。
- 不修改分数。
- 不创造新构念。
- 不推测童年、创伤或家庭经历。
- 不诊断依恋障碍、人格障碍或精神疾病。
- 不输出 Markdown、HTML、解释过程或 schema 外字段。

## 10. 安全边界

已实现：

- Content-Type 校验。
- 请求体大小限制。
- CORS origin 限制。
- Facts schema 校验。
- 15 构念完整性和 0-100 分数范围校验。
- personaId 白名单校验。
- conflictId 和 evidence code 校验。
- resultHash 校验。
- resultHash 短期缓存。
- 重复请求锁。
- session 内调用次数限制。
- 错误信息脱敏。

未引入登录系统或数据库。

## 11. 超时和重试

Provider 调用支持：

- `AI_REPORT_TIMEOUT_MS`
- 网络错误、429、5xx 最多重试 1 次。
- schema 错误不重试。
- 前端请求默认 12 秒超时并可被页面状态取消。

所有异常最终回到 deterministic report。

## 12. 缓存策略

`resultHash` 由稳定字段生成：

- questionBankVersion
- scoringProfile
- personaId
- 15 维分数
- conflictIds
- resultReportSchemaVersion
- promptVersion

不包含：

- generatedAt
- 随机 resultId
- 页面状态
- 人格图片路径
- 原始答案

前端 localStorage AI cache 只保存：

- `resultHash`
- `report`
- `provider: "ai"`
- `promptVersion`
- `generatedAt`

重测会清理 AI cache。

## 13. deterministic 降级

结果页打开不等待 AI：

1. 立即计算 Result Facts。
2. 立即显示 deterministic report。
3. 后台请求 AI report。
4. 成功后替换报告文字模块。
5. 失败、超时、4xx/5xx、非法 JSON、非法 schema 均保持 deterministic report。

页面不会白屏、锁页或要求用户重新答题。

## 14. 收藏家真实样本结果

真实收藏家样本仍为：

- persona：`collector`
- top constructs：`SI`, `MN`, `CL`, `RM`, `RI`
- bottom constructs：`EC`, `ER`, `PA`, `CS`

AI mock 成功后 `source` 从 `deterministic` 替换为 `ai`；评分与人格事实不变。

## 15. 候鸟 08a/08b 差异

核心测试保持：

- 两者均命中 `migratory-bird`
- samePersonaDiffCount = 6

AI 输入包含 top/bottom constructs、conflicts、needs、riskPatterns 和 deterministic report，因此同人格不同向量不会只复述同一人格固定文案。

## 16. Mock 失败用例

`AI_REPORT_PROVIDER=mock` 支持并已测试：

- `success`
- `timeout`
- `invalid-json`
- `invalid-schema`
- `429`
- `500`

失败路径均保留 deterministic report。

## 17. 三视口结果

Playwright 验证：

- 375x667：通过
- 390x844：通过
- 1440x900：通过

覆盖：

- deterministic 初始结果
- AI 生成中
- AI 成功结果
- AI 成功分享图
- 刷新恢复 AI report
- timeout 降级
- invalid schema 降级
- 重测清理 AI cache

## 18. API Key 泄漏检查

前端检查范围：

- `js`
- `index.html`
- `styles.css`

匹配 `AI_REPORT_API_KEY` / `sk-*`：0。

## 19. 调用成本控制

已加入：

- resultHash 缓存，避免同结果短时间重复生成。
- 前端 session 调用次数限制。
- 服务端 session 调用次数限制。
- 重复请求锁。
- `AI_REPORT_MAX_TOKENS`。
- schema 错误不重试。

## 20. 剩余 P0/P1/P2

P0：0。

P1：1。三张正式人格图仍缺失。

P2：2。

- 真实 provider smoke 未执行，因为本地未配置真实 provider 环境变量。
- 当前服务端限流是内存实现，适合内测，不适合作为长期公开流量防护。

## 21. 三张人格图缺口

本轮未生成正式人格图，继续使用 fallback：

- `companion`
- `harbor`
- `ferryman`

AI report 不依赖正式图片；页面和分享卡 fallback 正常。

## 22. 是否具备部署内测条件

具备受控内测条件，但部署前必须：

- 在服务端配置真实环境变量。
- 挂载 `/api/v2/ai-report` 到服务端 runtime。
- 设置 `ALLOWED_ORIGIN`。
- 执行一次不记录完整输出的真实 provider smoke test。
- 监控 4xx/5xx 和 schema 失败率。

## 23. 部署所需操作

- 配置 DeepSeek-compatible endpoint 环境变量。
- 确认部署平台支持 Node server handler 或等价 API route。
- 保持 API Key 仅在服务端。
- 使用 mock 通过后再开启 `AI_REPORT_ENABLED=true`。
- 真实 smoke test 不打印 Key、不写完整 AI report 到公开报告。

## 24. Git 提交记录

本轮提交：

- `f15acac fix(v2): align result map with five-layer construct model`
- `7d09c2d feat(v2): add controlled ai report service`
- `6a4f4d5 feat(v2): integrate ai report with deterministic fallback`
- 最终验证提交包含本报告、浏览器验收脚本、截图和 JSON 结果。

截图目录：

`reports/audit-assets/v2-controlled-ai-report/`

验证数据：

`reports/data/v2-controlled-ai-report-browser.json`
