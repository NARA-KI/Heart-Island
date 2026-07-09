# 心岛 V2 AI Report 部署说明

## 当前结构

当前仓库已有 `deploy/` 静态产物，可用于前端静态托管。AI 报告接口位于 `server/ai-report/handler.js`，必须运行在服务端 Node runtime、云函数或等价 API route 中。

当前实际部署模式：纯静态托管。  
可信 Beta 需要的最小拆分：

```text
前端静态站点
+
服务端 /api/v2/ai-report Node API
```

不得把 `AI_REPORT_API_KEY` 放到前端，也不得为了维持纯静态部署而在浏览器中直连 DeepSeek-compatible API。

## 环境变量

服务端必需：

```text
AI_REPORT_PROVIDER=deepseek
AI_REPORT_ENABLED=true
AI_REPORT_API_KEY=<secret>
AI_REPORT_BASE_URL=<provider base url>
AI_REPORT_MODEL=<available model>
AI_REPORT_TEMPERATURE=0.3
AI_REPORT_TIMEOUT_MS=12000
AI_REPORT_MAX_TOKENS=<set after real smoke statistics>
AI_REPORT_THINKING_TYPE=disabled
AI_REPORT_BODY_LIMIT_BYTES=64000
AI_REPORT_SESSION_LIMIT=6
AI_REPORT_CACHE_TTL_MS=600000
ALLOWED_ORIGINS=<comma-separated exact origins>
```

可选：

```text
AI_REPORT_API_PATH=/api/v2/ai-report
AI_REPORT_PUBLIC_BASE_URL=
AI_REPORT_MOCK_MODE=
```

秘密变量：`AI_REPORT_API_KEY`。  
非秘密但仍只应服务端注入：`AI_REPORT_BASE_URL`、`AI_REPORT_MODEL`、限流、超时、CORS 配置。

## 本地启动

Mock 验证：

```bash
npm run v2:test:controlled-ai
npm run v2:test:controlled-ai:browser
```

真实 Provider smoke：

```bash
npm run v2:test:provider-smoke
```

真实 smoke 会读取 `.env.local` 或 `.env`。这些文件已被 `.gitignore` 排除。没有真实配置时脚本输出 `BLOCKED`，不会调用 provider，也不会伪造通过。

## Provider 请求约束

DeepSeek-compatible 请求必须包含：

```js
{
  stream: false,
  response_format: { type: "json_object" },
  thinking: { type: "disabled" }
}
```

只接受 `choices[0].finish_reason === "stop"`。`length`、`content_filter`、`insufficient_system_resource`、`tool_calls`、缺失或未知值都视为 provider 失败，前端继续展示 deterministic 报告。

## 路由挂载

部署平台需要将：

```text
POST /api/v2/ai-report
OPTIONS /api/v2/ai-report
```

挂到服务端 handler。静态资源仍由前端托管处理，不应被 API route 拦截。

同源部署时，前端可继续使用相对路径 `/api/v2/ai-report`。跨域部署时，应明确配置前端 API base URL，不能硬编码本地地址。

## CORS

`ALLOWED_ORIGINS` 使用逗号分隔的明确 Origin 白名单。旧的单值
`ALLOWED_ORIGIN` 仍兼容，但新部署应优先使用复数变量。

```text
ALLOWED_ORIGINS=https://example.com,http://127.0.0.1:4173,http://localhost:4173
```

匹配使用标准化后的完整 Origin，不使用 `contains`、后缀或通配符匹配。配置值可以带末尾 `/`，运行时会规范化为不带路径的 Origin。没有配置白名单时，跨域请求默认拒绝。

非法 Origin 应返回 403。合法 OPTIONS 预检应返回 204，并带上请求 Origin 对应的 `Access-Control-Allow-Origin`、`POST, OPTIONS`、`Content-Type` 和 `Vary: Origin`。

## 超时

`AI_REPORT_TIMEOUT_MS` 默认 12000。部署平台的函数或请求超时必须大于 provider 超时，建议至少留出 3 到 5 秒缓冲。

## 回滚与关闭

关闭 AI 增强：

```text
AI_REPORT_ENABLED=false
```

只保留 deterministic 结果：

```text
AI_REPORT_PROVIDER=mock
AI_REPORT_ENABLED=false
```

也可以在部署平台撤下 `/api/v2/ai-report` 路由；前端失败时仍会展示 deterministic 报告。

## 常见错误

- 503：未开启 AI 或服务端缺少真实 provider 配置。
- 502：provider 失败、非法 JSON、非 `stop` finish_reason、schema 不合法。
- 504：provider 超时。
- 403：Origin 不在 `ALLOWED_ORIGINS`，或旧版 `ALLOWED_ORIGIN` 白名单中。
- 422：请求 facts、resultHash 或 schema 不合法。

排查时不得打印完整 API Key、完整 facts 或完整 AI 报告。只记录样本 ID、personaId、HTTP 状态、finish_reason、脱敏错误类型、延迟和 token usage。
