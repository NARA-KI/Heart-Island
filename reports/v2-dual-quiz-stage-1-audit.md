# 心岛双题量模式阶段一实现审计

## 1. 基线

- 仓库：`E:/心岛/Heart Island(VS Code)`
- 分支：`feature/v2-dual-quiz-ai-report`
- 基线提交：`8e1f1a224bf80c1ca3020e6692f935ac5937adc5`
- 审计开始时工作区：干净
- package 版本：`0.9.9.7-beta`
- 产品版本：`Heart Island v2.0 Alpha 1`

## 2. 当前题库与评分

- 正式题库：`data/v2/question-bank.v2.json`
- 题库清单与版本：`data/v2/manifest.json`
- 题型定义来源：`reports/heart-island-v2-question-bank-and-scoring-draft.md`
- 构念标签与层级：`js/v2/config.js`
- 构念解释、矛盾规则：`js/v2/result-rules.js`
- 评分实现：`js/v2/scoring-engine.js`
- 人格向量：`data/v2/persona-target-vectors.v2.candidate-a.json`

正式题库为 60 题、15 个构念、每构念 4 题。每题 JSON 包含：

- `id`
- `construct`
- `reverse`
- `question`
- 4 个带最终 `score` 的选项

`reverse` 只用于审计，不在运行时二次倒扣；选项中的 `score` 已是最终构念分。当前构念分为同构念题目分值的平均值，再与冻结的 15 人格向量计算 RMS 距离。

当前实现把“60题”和“每构念4题”写死在数据校验与样本聚合中。双模式只需要把允许的题数与每构念样本数参数化；平均分公式、选项分值、人格向量和距离算法保持不变。

## 3. 当前状态与恢复流

状态入口为 `js/v2/state.js`，持久化入口为 `js/v2/storage.js`。

当前状态包含：

- `view`
- `currentQuestionIndex`
- `answers`（已按 questionId 存储）
- `optionOrder`
- `startedAt`
- `completedAt`
- 单一 `result`

当前本地存储键为 `heart-island-v2-alpha-1-state`。恢复时会校验产品版本、题库版本、题库 hash、评分配置与人格向量 hash；任一不一致就把记录判为 stale 并清除。这会在小版本升级时造成不必要的答案丢失，必须改成显式 schema 迁移，并以题目 ID、选项 ID 和评分兼容性为准。

当前没有有效作答时长累计；只有开始和完成时间戳。页面隐藏时间会被包含在墙钟时间中，因此不能直接用两者相减实现本轮计时要求。

## 4. 当前页面与结果数据流

当前流程：

`home -> instructions -> quiz -> transition -> result`

`js/v2/app.js` 负责状态变更、保存和路由。`question-engine.js` 直接按完整题库数组下标前后移动。完成后，`result-engine.js` 调用同一评分管线生成确定性 facts/report，`renderers/result.js` 渲染结果页。

结果页已有：

- 主人格与核心描述
- 高分维度与相对低分维度
- 15 维关系地图
- 关系需要与矛盾
- 建议
- AI 个性化解读区
- 确定性结果降级

双模式应复用这一个结果 renderer，只增加模式标签、数据充分度说明和快速转深度入口。

## 5. 当前 AI Report 数据流

- 前端入口：`js/v2/ai/ai-report-client.js`
- 前端 schema/hash：`js/v2/ai/ai-report-schema.js`
- 前端缓存：`js/v2/ai/ai-report-cache.js`
- 配置：`ai-report-config.json`
- 当前端点：`https://xindao-mvp06-d9gf6ion1b76a1327-1442533234.ap-shanghai.app.tcloudbase.com/api/v2/ai-report`
- 服务端校验：`server/ai-report/validation.js`
- 提示词：`server/ai-report/prompt.js`
- provider：`server/ai-report/provider.js`
- CloudBase 适配：`server/cloudbase-ai-report/index.js`

当前请求结构：

```json
{
  "requestId": "uuid",
  "resultHash": "air-...",
  "facts": {}
}
```

当前返回结构：

```json
{
  "resultHash": "air-...",
  "report": {},
  "provider": "ai",
  "promptVersion": "v2-controlled-ai-report-prompt-2",
  "generatedAt": "ISO timestamp"
}
```

前端已有超时、错误、一次重试、严格 schema 校验、确定性报告降级和 localStorage 缓存。当前 facts 尚未明确携带 quizMode、作答题数、作答题目 ID 和用时；result hash 也没有模式字段，必须补齐以隔离 quick/full 缓存。

## 6. 拟采用的数据结构

单一状态，不建立 QuickQuiz/FullQuiz 两套实现：

```js
{
  schemaVersion: 2,
  view: "home",
  quizMode: null | "quick" | "full",
  quizPath: null | "direct" | "continuation",
  currentQuestionIndex: 0,
  orderedQuestionIds: [],
  answersByQuestionId: {},
  answeredCount: 0,
  elapsedMs: 0,
  quickElapsedMs: null,
  startTimestamp: null,
  completionStatus: "idle" | "in-progress" | "quick-complete" | "full-complete",
  quickCompleted: false,
  fullCompleted: false,
  quickReport: null,
  fullReport: null,
  reportGenerationStatus: {
    quick: { state: "idle" },
    full: { state: "idle" }
  }
}
```

为兼容现有 pilot 和历史代码，迁移期间可保留 `answers` 作为 `answersByQuestionId` 的运行时别名，但持久化以 `answersByQuestionId` 为准。

## 7. 快速版选择与兼容性验证

快速版采用固定的“非反向核心/真实/压力题 + 反向边界题”组合，每个构念正好 2 题。选择详情见 `reports/v2-dual-quiz-question-selection-report.md`。

静态验证结果：

- 完整题库：60
- 快速题库：30
- 补集：30
- 快速题 ID 去重：通过
- 快速题全部存在于完整题库：通过
- 15 构念覆盖：通过
- 每构念快速题：2
- 每构念完整题：4
- 快速集与补集交集：0
- 快速集与补集并集：60
- 快速题反向/非反向：15/15

不落盘兼容性模拟：

- 15 个人格理想作答路径，快速版与完整版 Top1 一致：15/15
- 5,000 组随机噪声答案，快速版与完整版 Top1 一致：37.0%

随机噪声一致率只用于风险观察，不是产品准确率。它说明 30 题对单题波动更敏感，符合“数据充分度和分析稳定度较低”的产品定位；不能用来贬低快速报告，也不能在 UI 中展示为准确率。

## 8. 拟修改文件

核心新增：

- `js/v2/quiz-modes.js`
- `js/v2/quiz-timer.js`
- `tests/v2-dual-quiz-core.test.mjs`
- `tests/v2-dual-quiz-browser.mjs`

核心修改：

- `js/v2/config.js`
- `js/v2/state.js`
- `js/v2/storage.js`
- `js/v2/question-engine.js`
- `js/v2/scoring-engine.js`
- `js/v2/result-facts.js`
- `js/v2/result-engine.js`
- `js/v2/app.js`
- `js/v2/renderers/home.js`
- `js/v2/renderers/instructions.js`
- `js/v2/renderers/quiz.js`
- `js/v2/renderers/transition.js`
- `js/v2/renderers/result.js`
- `js/v2/ai/ai-report-schema.js`
- `js/v2/ai/ai-report-client.js`
- `server/ai-report/validation.js`
- `server/ai-report/prompt.js`
- RC2 样式文件
- `package.json`
- `data/v2/manifest.json`
- `data/v2/question-bank.v2.json`（仅阶段五确认需要的低叙事题）

部署镜像目录只在源文件验证完成后机械同步，不提前双写。

## 9. 风险与控制

1. **30题稳定度**：每构念只有2个样本，结果对单题更敏感。通过固定题集、正反平衡、完整15维覆盖和模式说明控制，不伪造准确率。
2. **评分写死题数**：只参数化样本数量校验，不改评分公式和人格映射，并用60题基线测试锁定旧结果。
3. **旧存储丢失**：保留旧 key，先迁移再保存；产品版本变化不再直接清空答案；无效题目/选项逐项过滤。
4. **quick/full 报告覆盖**：结果对象和生成状态按模式分别保存；hash 纳入模式、题数和题目 ID。
5. **计时失真**：仅累计页面可见且处于答题页的活动时间，visibilitychange 时结算并暂停。
6. **题目文案漂移**：阶段五只改叙事等级1/2和少量必要的3级题，锁定 construct、reverse、选项 ID 和 score。
7. **真实接口**：代码侧验证与真实 CloudBase 请求分开记录；不把 mock 成功当作线上成功，不修改生产云配置。

## 10. 阶段一结论

现有元数据足以可靠选出固定30题；补集和评分结构可以通过小范围参数化兼容，不需要修改核心算法或人格映射。阶段一无阻塞，可以进入双模式与状态系统实现。
