# 心岛 v2.0 真实用户小样本内测准备报告

## 1. 本轮目标

本轮目标是建立一个与 Beta 0.9.9.7 完全隔离的 v2 内测工具，让真实用户完成 60 题，并用同一份回答同时计算 baseline 与 candidate-A 结果，收集用户对结果贴合度、题目理解度和人格边界的反馈。

本轮没有接入正式产品，没有修改生产代码，没有把 candidate-A 写成正式 targetVector。

## 2. 新增文件

| 文件 | 用途 |
| --- | --- |
| `tools/v2-pilot/index.html` | v2 内测入口页面 |
| `tools/v2-pilot/app.mjs` | 60 题流程、匿名结果对照、反馈收集、JSON 导出 |
| `tools/v2-pilot/scoring.mjs` | 与隔离验证一致的 v2 草案评分逻辑 |
| `tools/v2-pilot/styles.css` | 移动端优先内测样式 |
| `tools/v2-pilot/README.md` | 内测工具运行和隐私说明 |
| `scripts/v2-validation/analyze-v2-pilot-results.mjs` | 匿名导出 JSON 批量分析脚本 |
| `reports/heart-island-v2-real-user-pilot-prep.md` | 本报告 |
| `.gitignore` | 新增 `pilot-data/`、`tools/v2-pilot/exports/`，避免误提交用户数据 |

## 3. 未修改的生产文件

未修改：`app.js`、`index.html`、`styles.css`、`core/scoring.mjs`、`core/calibration-profiles.mjs`、Beta 0.9.9.7 正式题库、生产人格数据、`deploy/`、`release/`。

## 4. 内测工具运行方式

在项目根目录运行：

```bash
python -m http.server 4174 --bind 127.0.0.1
```

访问：

```text
http://127.0.0.1:4174/tools/v2-pilot/
```

不要直接用 `file://` 打开页面，因为浏览器会阻止读取 `drafts/v2` 下的 JSON。

## 5. baseline 与 candidate-A 计算一致性

页面读取：

- `drafts/v2/question-bank.v2.draft.json`
- `drafts/v2/persona-target-vectors.v2.baseline.json`
- `drafts/v2/persona-target-vectors.v2.candidate-a.json`

计算规则：

- 15 构念平均分；
- 15 维均方根欧氏距离；
- 输出 Top5；
- 输出 Top1；
- 输出 Top1-Top2 gap；
- 低置信规则：`gap < 2.5`、或 Top3 spread `< 5`、或 15 构念全部接近中间。

该规则与隔离验证脚本保持一致，不依赖生产 `app.js` 或 `core/scoring.mjs`。

## 6. 匿名结果对照方式

如果 baseline 与 candidate-A 的 Top1 相同：

- 只展示一个结果；
- 用户评价该结果贴合度。

如果 Top1 不同：

- 展示“结果 A / 结果 B”两张匿名卡；
- 页面不标注哪张来自 baseline 或 candidate-A；
- 卡片顺序按匿名 pilotId 随机；
- 用户先选择 A 更像、B 更像、都像、都不像；
- 导出 JSON 中记录匿名卡片对应来源，便于后续分析。

## 7. 反馈字段

已收集：

- 整体测试贴合度：1-5；
- Top1 人格贴合度：1-5；
- Top3 中是否至少有一个明显符合；
- 结果最符合自己的部分；
- 结果最不符合自己的部分；
- 难选择题号；
- 看不懂题号；
- 两个选项都像题号；
- 四个选项都不像题号；
- 正确答案感；
- 正确答案感题号；
- 分享意愿；
- 可选自我描述，最多 100 字；
- 可选自认为更接近的人格。

当 baseline 与 candidate-A 不一致时，额外收集结果 A / 结果 B 的贴合度，便于映射回两个方案。

## 8. 数据隐私处理

内测工具默认只保存在浏览器本地，不自动上传服务器。

不得采集：

- 姓名；
- 手机号；
- 身份证；
- 详细住址；
- 精确定位；
- 聊天记录；
- 伴侣个人信息。

导出的 JSON 使用随机 `pilotId`，仅用于产品体验研究。

## 9. JSON 导出结构

导出 JSON 包含：

- `pilotId`
- `timestamp`
- `questionnaireVersion`
- `answerSequence`
- `constructScores`
- `baselineTop5`
- `candidateATop5`
- `baselineGap`
- `candidateAGap`
- `baselineLowConfidence`
- `candidateALowConfidence`
- `resultAgreement`
- `anonymousCardOrder`
- `userPreferredResult`
- `overallFitScore`
- `top1FitScore`
- `cardFitScores`
- `top3ContainsFit`
- `difficultQuestionIds`
- `unclearQuestionIds`
- `bothFitQuestionIds`
- `noneFitQuestionIds`
- `correctAnswerFeeling`
- `correctAnswerFeelingQuestionIds`
- `shareIntent`
- `optionalSelfDescription`
- `optionalSelfPersonaGuess`

## 10. 批量分析方式

命令：

```bash
node scripts/v2-validation/analyze-v2-pilot-results.mjs <file-or-directory> [...]
```

支持输入：

- 单个匿名导出 JSON；
- 多个 JSON 文件；
- 包含 JSON 文件的目录；
- 一个合并后的 JSON 数组。

输出包括有效样本数、Top1 一致率、不一致时用户偏好、平均贴合度、Top3 覆盖率、低置信率、人格 Top1 分布、题目反馈高频项、candidate-A 改善和退步案例。

## 11. 三组 fixture 走通结果

本地服务：`http://127.0.0.1:4174/tools/v2-pilot/`

验收命令：

```bash
node temp/v2-pilot-validation/validate-v2-pilot.cjs
node scripts/v2-validation/analyze-v2-pilot-results.mjs temp/v2-pilot-validation/combined.json
```

| fixture | 60 题完成 | 上一题 | 双方案计算 | 结果 | JSON 导出 | JS 错误 |
| --- | --- | --- | --- | --- | --- | --- |
| `ideal-lighthouse-01` | 通过 | 通过 | 通过 | baseline/candidate-A 均为灯塔型 | 通过 | 无 |
| `ideal-harbor-01` | 通过 | 通过 | 通过 | baseline/candidate-A 均为港湾型 | 通过 | 无 |
| `confusable-nest-companion-harbor-harbor-soften-01` | 通过 | 通过 | 通过 | baseline/candidate-A 均为港湾型 | 通过 | 无 |

额外匿名 A/B 对照验收：

| fixture | baseline Top1 | candidate-A Top1 | 匿名卡片 | 偏好字段 | JS 错误 |
| --- | --- | --- | --- | --- | --- |
| `risk-v2-q28-lighthouse-single-flip` | 灯塔型 | 月光型 | 2 张 | 可见 | 无 |

## 12. 移动端验收

Playwright headless 验收：

| 宽度 | 标题可见 | 开始按钮可见 | 横向溢出 | JS 错误 |
| ---: | --- | --- | --- | --- |
| 375 | 通过 | 通过 | 无 | 无 |
| 390 | 通过 | 通过 | 无 | 无 |
| 430 | 通过 | 通过 | 无 | 无 |

## 13. 当前限制

- 当前工具是内测工具，不是正式产品页面。
- 当前只用于真实用户小样本产品研究，不具备心理学统计效度声明。
- candidate-A 仍是候选向量，不是正式 targetVector。
- 当前不会自动上传数据，样本收集需要用户手动导出 JSON。
- 20-30 人样本只能发现明显错配、理解问题和边界反馈，不能用于宣称准确率。

## 14. 建议招募人数

第一阶段建议 20-30 名真实用户。

建议尽量覆盖：

- 不同恋爱状态；
- 不同表达习惯；
- 慢热 / 高表达 / 高边界 / 高投入等不同关系风格。

不要求 15 种人格平均分布。

## 15. 是否建议开始 20～30 人内测

建议：可以开始第一阶段 20-30 人内测。

前提：

- 只使用 `tools/v2-pilot/` 独立页面；
- 明确告知用户这是内部验证，不是专业心理诊断；
- 所有数据由用户手动导出；
- 不收集个人身份信息；
- 不把结果用于公开准确率宣传。

## 16. 是否建议修改生产代码

不建议。

当前仍处于 v2 内测准备阶段，不应修改 `app.js`，不应接入正式产品，不应冻结 candidate-A。

## 最终结论

| 问题 | 结论 |
| --- | --- |
| 本轮是否修改生产代码 | 没有 |
| 内测页面路径 | `tools/v2-pilot/index.html` |
| 启动命令 | `python -m http.server 4174 --bind 127.0.0.1` |
| 是否完成双方案计算 | 是 |
| 是否完成匿名结果对照 | 是 |
| 是否完成反馈收集 | 是 |
| 是否完成 JSON 导出 | 是 |
| 是否完成批量分析脚本 | 是 |
| 3 组 fixture 是否通过 | 是 |
| 移动端是否通过 | 375 / 390 / 430 均通过 |
| 是否建议开始 20～30 人内测 | 建议 |
| 是否建议冻结题库文字 | 可以继续暂时冻结，但需根据真实反馈复核 |
| 是否建议冻结 targetVector | 不建议 |
| 是否建议进入生产接入准备 | 不建议 |
| 是否建议修改 app.js | 不建议 |
