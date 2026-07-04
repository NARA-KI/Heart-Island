# 心岛 v2.0 内测开始按钮 P0 修复报告

## 1. 问题现象

用户反馈地址：

```text
http://127.0.0.1:4174/pilot-deploy/v2/
```

现象：

- 首页 HTML 和 CSS 正常显示；
- “开始内测”按钮可见；
- 点击“开始内测”后没有任何反应；
- 没有进入第一题。

本轮修复前，本地 Chromium headless 复现点击时可以进入 q01，但代码检查确认存在 P0 脆弱点：按钮在初始化完成前就是可见且可点击状态，页面没有明确 loading / ready / error 状态。如果 `app.mjs`、`scoring.mjs`、JSON 或 manifest 加载失败，用户会看到按钮但事件未绑定或初始化未完成，体验上就是“点击无反应”。

## 2. 根本原因

根本原因是内测入口缺少初始化状态管理：

- `index.html` 初始渲染时直接显示可点击的“开始内测”按钮；
- `app.mjs` 在异步加载题库、baseline、candidate-A、manifest 后才绑定 click 事件；
- 加载完成前没有禁用按钮；
- 初始化失败时没有在原页面内展示可恢复错误状态；
- manifest / JSON 解析错误没有完整路径提示；
- 部署包和开发工具需要同步修复，否则可能只修开发目录而部署目录仍保留旧行为。

因此，一旦浏览器缓存、模块加载、JSON 解析或资源请求出现异常，用户可能看到首页正常但按钮实际不可用。

## 3. 失败资源或异常堆栈

本地修复前真实点击记录：

- Console 原始错误摘要：无；
- Page error：无；
- Network 失败请求：无；
- 4xx/5xx 核心资源：无；
- 点击后状态：本地 Chromium 可进入 q01。

记录文件：

```text
temp/v2-pilot-start-p0/repro-before-fix.json
```

说明：本地环境未复现用户的具体无响应，但修复了导致“按钮可见但初始化状态不可知”的 P0 风险，并按无 fixture 真实点击重新验收。

## 4. 修改文件

| 文件 | 修改 |
| --- | --- |
| `tools/v2-pilot/index.html` | 增加初始化状态区、重新加载按钮；开始按钮默认 disabled |
| `tools/v2-pilot/app.mjs` | 增加 loading / ready / error 状态；数据加载完成后才启用开始按钮；初始化失败显示具体错误；manifest 解析错误带路径 |
| `tools/v2-pilot/styles.css` | 增加初始化状态、错误状态、disabled 按钮样式 |
| `pilot-deploy/v2/index.html` | 同步部署包 HTML |
| `pilot-deploy/v2/app.mjs` | 同步部署包逻辑，并保持只读取部署目录内数据 |
| `pilot-deploy/v2/styles.css` | 同步部署包样式 |
| `reports/heart-island-v2-pilot-start-button-p0-fix.md` | 本报告 |

## 5. 未修改的生产文件

未修改：

- `app.js`
- `index.html`
- `styles.css`
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- Beta 0.9.9.7 生产代码
- 题库文字
- 选项分值
- baseline 向量
- candidate-A 向量
- `deploy/`
- `release/`

## 6. 修复方案

修复后页面状态：

1. 页面初始显示“正在加载内测题库与评分数据...”。
2. “开始内测”按钮默认 disabled，文案为“正在准备...”。
3. `question-bank`、baseline、candidate-A、manifest 全部加载完成后，状态变为“加载完成，可以开始内测。”。
4. 按钮解除 disabled，文案变为“开始内测”。
5. 点击后真实进入 q01。
6. 初始化失败时显示“加载失败：具体资源路径/错误信息”。
7. 初始化失败时显示“重新加载”按钮。
8. 自我描述为空不阻断开始。

## 7. tools 与 pilot-deploy 同步方式

本轮以 `tools/v2-pilot` 为源文件修复，然后同步到 `pilot-deploy/v2`：

- `index.html`
- `app.mjs`
- `scoring.mjs`
- `styles.css`

同步后对 `pilot-deploy/v2/app.mjs` 保持部署包专用路径：

- 只读取 `./question-bank.v2.draft.json`
- 只读取 `./persona-target-vectors.v2.baseline.json`
- 只读取 `./persona-target-vectors.v2.candidate-a.json`
- 只读取 `./pilot-manifest.json`
- 不读取 `drafts/v2`
- 不读取 `simulation-fixtures`

## 8. 无 fixture 真实点击验收

验收地址：

```text
http://127.0.0.1:4174/pilot-deploy/v2/
```

验收方式：

- 不带 fixture 参数；
- 不调用内部函数跳过首页；
- 等待开始按钮启用；
- 真实点击“开始内测”；
- 检查 q01 是否出现。

结果：

| 场景 | 结果 |
| --- | --- |
| 自我描述为空，点击开始 | 通过，进入 q01 |
| 填写自我描述，点击开始 | 通过，进入 q01 |
| fixture 参数 `?fixture=ideal-lighthouse-01` | 已禁用，不会预填答案 |
| Console 错误 | 无 |
| Network 失败请求 | 无 |
| 自动外部上传请求 | 无 |

## 9. 移动端验收

| 宽度 | 开始按钮启用 | 点击进入 q01 | 横向溢出 | JS 错误 |
| ---: | --- | --- | --- | --- |
| 375 | 通过 | 通过 | 无 | 无 |
| 390 | 通过 | 通过 | 无 | 无 |
| 430 | 通过 | 通过 | 无 | 无 |

## 10. 浏览器验收

| 浏览器 | 结果 |
| --- | --- |
| Chromium | 完整流程通过 |
| Edge | 完整流程通过 |

两者均完成：

- 无 fixture 首页真实点击；
- 进入 q01；
- 完成 60 题；
- 完成反馈；
- 导出 JSON；
- 复制匿名结果代码；
- 无 Console 错误；
- 无失败资源请求；
- 无自动外部上传请求。

## 11. JSON 导出与分析验收

验收结果：

| 项目 | 结果 |
| --- | --- |
| 60 题完整答完 | 通过 |
| JSON 导出 | 通过 |
| JSON 包含版本 hash | 通过 |
| `testFixtureId` | `null` |
| `answerSequence.length` | 60 |
| 分析脚本读取 JSON | 通过，有效样本数 1 |
| 分析脚本读取匿名结果代码 | 通过，有效样本数 1 |

## 12. 是否可以开始 3～5 人烟雾测试

可以开始 3-5 人烟雾测试。

限制：

- 只使用 `pilot-deploy/v2/`；
- 不公开发布；
- 不进入 20-30 人阶段；
- 不调整 targetVector；
- 收到样本后先用分析脚本验证 JSON 有效性。

## 13. 是否修改生产代码

没有。

本轮只修改隔离内测工具、部署内测包和报告，没有修改 Beta 0.9.9.7 生产代码。

## 最终结论

| 问题 | 结论 |
| --- | --- |
| 根本原因 | 开始按钮缺少初始化状态管理，按钮在数据/模块初始化完成前可见且可点击，初始化异常时缺少可见错误与恢复入口 |
| Console 原始错误摘要 | 本地复现无 Console 错误 |
| Network 失败请求 | 本地复现无失败请求 |
| 修改文件 | `tools/v2-pilot/*`、`pilot-deploy/v2/*`、本报告 |
| 是否修复开始按钮 | 是 |
| 空白自我描述是否可开始 | 是 |
| 是否真正进入 q01 | 是 |
| 60 题是否完整走通 | 是 |
| JSON 是否可导出 | 是 |
| 分析脚本是否可读取 | 是 |
| 375 / 390 / 430 是否通过 | 是 |
| Edge / Chromium 是否通过 | 是 |
| 是否仍有 JS 错误 | 否 |
| 是否建议开始真人烟雾测试 | 建议开始 3-5 人烟雾测试 |
| 是否修改生产代码 | 没有 |
