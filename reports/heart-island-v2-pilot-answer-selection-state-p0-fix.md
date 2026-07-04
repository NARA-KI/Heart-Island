# 心岛 v2.0 内测答题选中状态 P0 修复报告

## 1. 问题现象

内测答题页在用户选择某题选项后切换到下一题，存在“上一题选中状态看起来残留到下一题”的 P0 风险。该问题会直接影响测试者对当前题答案状态的判断，进而污染 60 题内测数据可信度。

本轮复现地址：

`http://127.0.0.1:4174/pilot-deploy/v2/`

复现方式：

- 不带 fixture 参数。
- 不调用内部函数跳过首页。
- 真实点击“开始内测”。
- 真实点击选项、下一题、上一题。

## 2. 根本原因

本地真实复现没有发现答案数据被写入错误题号：`state.answers` 已按 `questionId -> optionId` 保存，q02 初次进入时没有自动写入 q02 答案。

但旧实现存在三个稳定性缺口：

1. 选项 DOM 没有显式 `data-question-id` / `data-option-id`，验收时无法直接确认当前按钮属于哪一道题。
2. 选项没有显式 `aria-pressed=true/false`，视觉选中和可访问状态之间没有统一边界。
3. 切题后焦点可能停留在上一轮交互路径上，焦点样式容易被误认为选中残留。

因此本轮按 P0 加固处理：每次渲染只从当前题 `question.id` 对应的 `savedAnswer` 派生选中状态，并在切题后把焦点移动到题目标题。

## 3. 是视觉残留还是数据污染

结论：本地复现未发现真实答案污染，主要是视觉 / 焦点状态风险与 DOM 状态不够显式。

证据：

- q01 选择后，进入 q02 初始状态：`.option-button.selected` 数量为 0。
- q02 初始状态：`aria-pressed=true` 数量为 0。
- q02 初始本地草稿只包含 `v2-q01`，不包含 `v2-q02`。
- 完整 60 题导出：`answerSequence.length = 60`，唯一题号数量为 60。

## 4. 原错误状态模型

旧渲染逻辑依赖：

- `state.answers[question.id] === option.id` 决定 `.selected`。

该数据方向本身是正确的，但缺少：

- DOM 层 `questionId / optionId` 明示。
- `aria-pressed` 同步。
- 切题后的焦点重置。
- 内部事件记录，难以判断问题发生在“真实数据写错”还是“焦点/视觉残留”。

## 5. 新状态模型

新模型明确为：

- `state.answers[questionId] = optionId`
- 渲染当前题时读取：`savedAnswer = state.answers[currentQuestion.id] ?? null`
- 每个按钮带：
  - `data-question-id`
  - `data-option-id`
  - `aria-pressed`
  - `.selected`
- 新题没有 `savedAnswer` 时，所有选项默认未选中。
- 返回已答题时，只恢复该题 `questionId` 下保存的 `optionId`。
- 修改答案时，覆盖同一个 `questionId` 下旧 `optionId`。
- 切题后焦点移到 `#questionTitle`，避免焦点样式被误判为选中。

新增内部调试事件：

- `questionRendered`
- `answerSelected`
- `questionChanged`
- `answerRestored`

这些事件只存在于 `window.__heartIslandPilotDebugEvents`，不显示给普通测试者。

## 6. 修改文件

- `tools/v2-pilot/app.mjs`
- `tools/v2-pilot/styles.css`
- `pilot-deploy/v2/app.mjs`
- `pilot-deploy/v2/styles.css`

## 7. 未修改的生产文件

以下文件未修改：

- `app.js`
- `index.html`
- `styles.css`
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- Beta 0.9.9.7 正式题库
- v2 题库文字
- v2 选项分值
- baseline / candidate-A
- 人格解析内容
- `deploy/`
- `release/`

## 8. 新题无选中验收

验收结果：通过。

| 场景 | 结果 |
| --- | --- |
| q01 初始进入 | 无选中 |
| q01 选择后进入 q02 | q02 无选中 |
| q02 选择后进入 q03 | q03 无选中 |
| q02 初始草稿 | 只包含 q01，不包含 q02 |
| q03 初始草稿 | 只包含 q01 / q02，不包含 q03 |

## 9. 返回题目恢复验收

验收结果：通过。

- q01 选择一个选项后进入 q02。
- q02 选择一个选项后进入 q03。
- 点击上一题回到 q02：只恢复 q02 的选项。
- 再点击上一题回到 q01：只恢复 q01 的选项。

恢复依据为 `questionId + optionId`，不是选项下标。

## 10. 修改答案验收

验收结果：通过。

- q01 初次选择 optionId `D`。
- 返回 q01 后改选 optionId `B`。
- 草稿最终为 `v2-q01: B`。
- 旧答案被覆盖，没有保留多个选中状态。

## 11. 随机选项顺序验收

验收结果：通过。

选项顺序仍由 `shuffledOptions(question.options, heart-island-v2-pilot:${question.id})` 决定。选中恢复不依赖显示下标，而是依赖 `option.id`。

完整流程中，每次点击记录的 `questionId / optionId` 均能在导出 `answerSequence` 中找到对应项。

## 12. JSON 数据完整性

使用 `chromium-390` 导出的匿名 JSON 运行：

`node scripts/v2-validation/analyze-v2-pilot-results.mjs temp\v2-answer-selection-state-p0\chromium-390-pilot-82bd5cdf-2026-07-04.json`

结果：

- `totalParsedRecords`: 1
- `validSamples`: 1
- `invalidSamples`: 0
- `flowValidSamples`: 1
- `fitValidSamples`: 1
- `answerSequence.length`: 60
- 唯一题号数量：60
- `baselineTop5` / `candidateATop5` 保留
- `publicDisplayedPersona` 保留
- `publicResultWordingMode` 保留
- `blendedPersonalizationUsed` 保留

## 13. 60 题完整流程

验收结果：通过。

| 浏览器 / 宽度 | 60 题完成 | 导出 JSON | 选中泄漏 | 题号唯一 | 点击与导出一致 |
| --- | --- | --- | ---: | ---: | --- |
| Chromium 375 | 通过 | 通过 | 0 | 60 | 通过 |
| Chromium 390 | 通过 | 通过 | 0 | 60 | 通过 |
| Chromium 430 | 通过 | 通过 | 0 | 60 | 通过 |
| Edge 390 | 通过 | 通过 | 0 | 60 | 通过 |

## 14. 移动端与浏览器验收

| 项目 | 结果 |
| --- | --- |
| 375 px | 通过 |
| 390 px | 通过 |
| 430 px | 通过 |
| Chromium | 通过 |
| Edge | 通过 |
| Console 红色异常 | 未发现 |
| 核心资源 404 | 未发现 |
| 外部上传请求 | 未发现 |
| 横向溢出 | 未发现 |
| fixture 参数 | 未使用 |

## 15. 结果页回归

验收结果：通过。

普通结果页仍只展示单一主人格，不显示：

- Top1 / Top2 / Top3
- gap
- lowConfidence
- baseline
- candidate-A
- 距离
- 相似度

导出 JSON 仍保留内部字段，前台隐藏不影响后台 review 和分析。

## 16. 是否可以恢复真人测试

建议：可以恢复 3-5 人烟雾测试，但在重新发给真人前，建议用户先手动完成一次 5 题以内的确认：

1. q01 选择后进入 q02。
2. q02 初始无选中。
3. 返回 q01 后能恢复 q01。
4. 修改 q01 后再进入 q02，q02 仍保持自己的状态。
5. 页面没有明显视觉残留。

该手动确认通过后，可以继续 3-5 人烟雾测试。

## 17. 是否修改生产代码

没有。

本轮只修改 v2 独立内测工具与部署镜像，没有修改 Beta 0.9.9.7 生产入口、正式评分代码、正式题库、题目文字、选项分值或人格算法。
