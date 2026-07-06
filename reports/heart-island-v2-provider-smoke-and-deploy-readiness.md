# 心岛 V2 可信 Beta — Provider Smoke 与部署演练 Readiness

生成时间：2026-07-06  
分支：`feature/heart-island-v2-provider-smoke-and-deploy`  
起点提交：`e851bd3`

## 1. 分支和提交

- 起点：`e851bd3 test(v2): validate controlled ai report pipeline`
- 本轮未推送远端。
- 本报告随本轮提交保存。

## 2. Provider 请求参数

DeepSeek-compatible 请求体已明确包含：

- `stream: false`
- `response_format: { type: "json_object" }`
- `thinking: { type: "disabled" }`
- `temperature` 默认 `0.3`
- `max_tokens` 默认仍为 `1200`，真实上限待真实 smoke usage 统计后再决定。

## 3. Thinking 与 JSON Output

- DeepSeek thinking：默认关闭，配置项为 `AI_REPORT_THINKING_TYPE=disabled`。
- JSON output：启用，使用 `response_format.type=json_object`。
- Prompt 仍要求只输出合法紧凑 JSON，不依赖模型自行判断格式。

## 4. finish_reason 处理

只接受 `choices[0].finish_reason === "stop"`。以下情况全部视为 provider 失败：

- `length`
- `content_filter`
- `insufficient_system_resource`
- `tool_calls`
- 缺失或未知值

失败输出不会进入 schema 校验、不会缓存、不会拼接局部内容。测试已覆盖上述 finish reason。

## 5. 真实环境变量状态

当前本机没有 `.env.local` 或 `.env`，未配置真实 DeepSeek Provider。  
`npm run v2:test:provider-smoke` 已按规则输出 `BLOCKED`，未调用外部 provider。

## 6. 真实测试样本

Smoke 脚本已准备 5 个首轮样本：

- `real-collector`
- `same-persona-migratory-a`
- `same-persona-migratory-b`
- `conflict-au-cl-ri-high-sc-low`
- `focused-sc-high`

真实 Provider 未配置，因此真实样本调用数为 0。重复缓存验证样本已预设为 `real-collector` 和 `same-persona-migratory-a`，待配置真实环境后执行。

## 7. 成功率、Schema、延迟和 Token

当前为 blocked，不得声称真实 Provider 通过。

- 成功率：N/A
- Schema 通过率：N/A
- 平均延迟：N/A
- P95 延迟：N/A
- 平均 prompt tokens：N/A
- 平均 completion tokens：N/A
- 平均 total tokens：N/A
- 成本：N/A，仅在真实 provider 返回 usage 后记录平均 token 消耗。

Mock controlled AI 浏览器验收通过，截图与脱敏 JSON 已更新；该结果只证明本地 handler 与前端降级链路，不代表真实 provider 通过。

## 8. 缓存验证

服务端缓存键已显式包含 `AI_REPORT_PROMPT_VERSION` 和 `resultHash`。`AI_REPORT_CACHE_TTL_MS=0` 时禁用缓存写入，避免测试污染。真实缓存验证因缺少 provider 配置未执行。

## 9. 质量评估

真实 AI 输出未产生，因此以下人工质量项均未验收：

- 收藏家质量评分：N/A
- 候鸟 08a/08b 差异：N/A
- 守门人高亲密表达：N/A
- Close Match 表达：N/A

当前不能建议公开测试。小范围内测也需要先完成真实 provider 5 样本 smoke 和人工评分。

## 10. Prompt 版本

- 当前 Prompt：`v2-controlled-ai-report-prompt-1`
- 本轮未调整 Prompt。
- 若真实输出出现模板化、过长、建议空泛、忽略 conflict、结构不稳定或绝对化措辞，再升级到 `v2-controlled-ai-report-prompt-2`。

## 11. 当前部署模式

仓库当前实际部署模式：纯静态托管。  
证据：存在 `deploy/` 静态产物；未发现 Dockerfile、serverless 配置、CloudBase 配置文件、云函数入口或独立 Node 生产服务入口。

## 12. 部署适配方案

最小拆分：

```text
前端静态站点
+
服务端 /api/v2/ai-report Node API 或云函数
```

API Key 必须只存在服务端。`/api/v2/ai-report` 需要支持 POST 和 OPTIONS。静态资源路径不得被 API route 影响。

## 13. 本地生产演练与 CORS

本地真实生产演练未完成，原因是缺少真实 provider 环境变量。  
Smoke 脚本已包含 CORS 预检：

- 合法 Origin：期望 204。
- 非法 Origin：期望 403。

真实验证待配置 `ALLOWED_ORIGIN` 后执行。

## 14. API Key 泄漏检查

- `.env` 和 `.env.*` 已被 `.gitignore` 排除。
- 当前报告、文档和脚本不保存真实 Key。
- 边界 key 模式扫描结果：0。
- 浏览器验收指标：`apiKeyLeaks=0`。

扫描命令使用带边界的疑似真实 key 模式，避免把普通 `risk-...` 文本误判为 `sk-...`。

## 15. P0/P1/P2

- P0：0
- P1：2
  - 真实 DeepSeek Provider 未配置，无法完成 5 样本真实 smoke。
  - 三张人格图仍缺失：`companion`、`harbor`、`ferryman`。
- P2：2
  - `AI_REPORT_MAX_TOKENS` 仍需真实 usage 统计后确认。
  - 当前限流和缓存为内存实现，只适合小范围内测。

## 16. 三张人格图缺口

本轮未生成以下人格图：

- `companion`
- `harbor`
- `ferryman`

AI 报告不依赖这三张图。正式公开测试前，素材 P1 需要清零。

## 17. 是否建议进入测试

- 小范围内测：暂不建议。必须先配置真实 provider，并完成 5 个真实样本、2 个重复缓存样本、人工质量评分。
- 公开测试：不建议。

## 18. 回滚方式

- 设置 `AI_REPORT_ENABLED=false`。
- 或撤下 `/api/v2/ai-report` 服务端路由。
- 前端会继续展示 deterministic 报告。

## 19. Git 提交记录

本轮计划提交并保留：

- `fix(v2): harden deepseek structured report handling`
- `test(v2): validate real ai report provider`
- `docs(v2): add ai report deployment guide`
- `test(v2): rehearse trusted beta production flow`

## 20. 验证命令

已运行：

- `npm run v2:test:result-core`：通过，样本 11，候鸟 08a/08b 差异计数 6。
- `npm run v2:test:result-core:browser`：通过，JS 错误 0，横向溢出 0。
- `npm run v2:test:controlled-ai`：通过，finish_reason 非 stop 全部降级。
- `npm run v2:test:controlled-ai:browser`：通过，AI 成功/超时/非法 schema 降级路径通过。
- `npm run v2:test:provider-smoke`：blocked，缺少真实 DeepSeek Provider env。

## 21. 产物路径

- Smoke 脱敏摘要：`reports/audit-assets/v2-provider-smoke-and-deploy/provider-smoke-summary.json`
- 部署文档：`docs/v2-ai-report-deployment.md`
- 本报告：`reports/heart-island-v2-provider-smoke-and-deploy-readiness.md`
