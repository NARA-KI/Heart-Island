# 心岛 v2 双模式阶段实现与 CloudBase 验证报告

日期：2026-07-09
分支：`feature/v2-dual-quiz-ai-report`
基线：`8e1f1a224bf80c1ca3020e6692f935ac5937adc5`

## 当前结论

- 30 题快速探索、60 题深度探索、刷新恢复、30→60 补集续答、计时、双完成页、双报告 payload 与缓存隔离已完成本地验证。
- 题库仍为原 60 题；快速集合是显式固定的 30 个 ID，每个构念正好 2 题。题目文案、`score`、`reverse`、人格目标向量均未修改。
- AI Mock 仅在测试显式指定 `AI_REPORT_PROVIDER=mock` 时启用。`.env.example` 默认 `AI_REPORT_ENABLED=false`、`AI_REPORT_PROVIDER=deepseek`、`AI_REPORT_MOCK_MODE=`。
- 代码侧 CORS hardening 通过。真实 CloudBase AI 仍为 `BLOCKED — CloudBase CORS / deployment pending`，不能视为生产接入完成。

## 状态与续答

持久化 schema 为 2，以 `answersByQuestionId` 保存答案，并保留 `answers` 兼容别名。状态包含模式、稳定题目序列、当前位置、用时、完成状态、`quickReport`、`fullReport` 和各自生成状态。

旧 schema 可安全迁移为 full 模式。无法解析或元数据不兼容的旧记录不会在页面隐藏/刷新时被空状态覆盖；只有用户明确开始新测试或重新开始时才清理。快速转深度时使用完整题库减去快速集合的稳定补集，不重复已答题。

`resultHash` 输入包含 `quizMode`、`answeredCount`、排序后的 `answeredQuestionIds` 与原有结果事实。quick/full 结果对象和缓存键相互独立。

## AI 请求摘要

两种模式使用同一 Schema。以下是浏览器 Mock 验收请求的字段节选；省略号仅表示未在文档重复展开的字段。实际 payload 还包括 15 维原始/归一化结果、主人格、次级倾向、高低维度、矛盾组合、用时及版本信息。

### quick

```json
{
  "resultHash": "air-6ed4d673",
  "facts": {
    "assessment": {
      "quizMode": "quick",
      "answeredCount": 30,
      "totalQuestionCount": 30,
      "answeredQuestionIds": ["v2-q01", "v2-q02", "..."]
    },
    "constructScores": {
      "SC": 66.5,
      "AU": 33.5,
      "...": "共 15 维"
    }
  }
}
```

### full

```json
{
  "resultHash": "air-880a735b",
  "facts": {
    "assessment": {
      "quizMode": "full",
      "answeredCount": 60,
      "totalQuestionCount": 60,
      "answeredQuestionIds": ["v2-q01", "v2-q02", "...", "v2-q60"]
    },
    "constructScores": {
      "SC": 58.25,
      "AU": 41.75,
      "...": "共 15 维"
    }
  }
}
```

浏览器 Mock 流程捕获到 quick/full 两次独立请求，hash 分别为 `air-6ed4d673`、`air-880a735b`。

## CORS hardening

`ALLOWED_ORIGINS` 非空时独占生效；仅其为空白时回退 `ALLOWED_ORIGIN`。配置项使用 URL 解析，只接受 `http`/`https` 的完整 origin。根路径末尾斜杠会规范化；非根路径、query、hash、凭据、通配符、`null` 和其他协议会被拒绝。

响应只回显精确匹配的请求 Origin，并返回：

```text
Access-Control-Allow-Origin: <exact-origin>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Vary: Origin
```

测试覆盖复数变量、多 Origin、旧变量回退、复数优先、空格、末尾斜杠、恶意后缀、`Origin:null`、无配置、OPTIONS、成功响应、422/429/502/503/504 错误响应和 Vary 去重。真实 Provider 开启但配置不完整时返回 503，不会自动降级为 Mock。

## 真实 CloudBase 现状

接口：

```text
https://xindao-mvp06-d9gf6ion1b76a1327-1442533234.ap-shanghai.app.tcloudbase.com/api/v2/ai-report
```

使用 `Origin: http://127.0.0.1:4173` 的实测结果：

- OPTIONS：403，响应体 `{"error":"Origin not allowed"}`。
- quick POST：403，同一错误。
- full POST：403，同一错误。
- 响应头包含 `server: tcbgw`、`x-cloudbase-upstream-type: Tencent-SCF_HTTP`、`x-cloudbase-upstream-status-code: 403`、`x-heart-island-adapter-version: backend-cors-v2`。
- 已记录 requestId：`520a29a2-0f55-4fd7-aa35-40b353f5d7ac`（OPTIONS）、`032b562b-7d2f-49d6-bbb9-1d227a0fe094`（POST）。

这些头表明请求已通过 CloudBase 网关并到达当前 adapter/handler；403 来源判定为 `server/ai-report/handler.js` 的 Origin 白名单层，而不是浏览器本地逻辑。当前会话无 CloudBase 日志与部署权限，未部署新 handler。

## 云端部署清单

部署前核对并同步：

- `server/ai-report/handler.js`
- `server/ai-report/validation.js`
- `server/ai-report/prompt.js`
- `server/ai-report/provider.js`
- `server/cloudbase-ai-report/index.js`
- `server/cloudbase-ai-report/package.json`
- `server/cloudbase-ai-report/scf_bootstrap`
- 对应 CloudBase HTTP access / 网关路由

环境变量格式：

```dotenv
AI_REPORT_ENABLED=true
AI_REPORT_PROVIDER=deepseek
AI_REPORT_API_KEY=<secret>
AI_REPORT_BASE_URL=<provider-base-url>
AI_REPORT_MODEL=<model-name>
AI_REPORT_TIMEOUT_MS=12000
ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173,<正式站点精确Origin>,<CloudBase WebApps精确Origin>
```

不要同时依赖旧变量；只有迁移期且 `ALLOWED_ORIGINS` 为空时才设置：

```dotenv
ALLOWED_ORIGIN=<single-exact-origin>
```

## 部署后验证

```powershell
$endpoint = 'https://xindao-mvp06-d9gf6ion1b76a1327-1442533234.ap-shanghai.app.tcloudbase.com/api/v2/ai-report'
curl.exe -i -X OPTIONS $endpoint -H 'Origin: http://127.0.0.1:4173' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: Content-Type'
curl.exe -i -X OPTIONS $endpoint -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST'
curl.exe -i -X POST $endpoint -H 'Origin: http://127.0.0.1:4173' -H 'Content-Type: application/json' --data-binary '@quick-payload.json'
curl.exe -i -X POST $endpoint -H 'Origin: http://127.0.0.1:4173' -H 'Content-Type: application/json' --data-binary '@full-payload.json'
```

验收必须确认 OPTIONS 为 200/204，quick/full POST 均为 200、通过前端 Schema、provider/source 为真实 AI、未使用 Mock，且 full hash 与 quick hash 不同。正式站点 Origin 需重复同样验证；错误 Origin 必须拒绝且不得返回受信任 Origin 的 CORS 头。

## 本地验证

- `npm run v2:test:dual-quiz`：通过。
- `npm run v2:test:quick-stability`：通过。轻度扰动 Top1 一致率 99.04%，中度扰动 85.17%；不作为 UI 准确率宣传。
- `npm run v2:test:dual-quiz:browser`：通过；320/375/390/430 无横向溢出，quick 30 + complement 30，保留 60 个答案。
- `npm run v2:test:ai-report`、`npm run v2:test:ai-report:browser`：通过；含 Mock quick/full、错误、超时、Schema 异常与重试。
- `node tests/v2-cloudbase-cors-headers.test.mjs`：通过。
- `npm run v2:test:result-core`、`npm run v2:test:result-core:browser`、`npm run v2:test:option-readability`、`npm run v2:test:rc2-visual`、`npm run v2:validate`、`npm test`：通过。
- `node scripts/v2-product-validation/audit-v2-scoring-reliability.mjs`：迁移、反向题、15 人格可达性通过；整体仍因历史归档缺失 32 个非必需素材返回失败。
- `npm run v2:audit:scoring` / `npm run v2:audit:all`：历史校准门槛仍返回 1（`requiresCalibration: true`）；未修改评分算法处理该问题。
- lint/typecheck/build：项目无对应 npm script；30 个变更 JS/MJS 文件均通过 `node --check`。项目为静态 ESM，无独立构建步骤。

## 截图

- 双模式和 30→60 主流程：`output/playwright/dual-quiz-local/`
- AI 错误：`reports/audit-assets/v2-controlled-ai-report/390x844-500-fallback.png`
- AI 重试成功：`reports/audit-assets/v2-controlled-ai-report/390x844-retry-success.png`

## 未完成与冻结项

- 未执行题目叙事性改写，符合当前冻结范围。
- 未部署 CloudBase，未完成真实 OPTIONS、quick POST、full POST 验收。
- 在上述真实接口条件满足前，不继续阶段五，不给出生产发布结论。
