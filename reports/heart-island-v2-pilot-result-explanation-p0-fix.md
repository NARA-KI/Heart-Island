# 心岛 v2.0 内测结果页人格解析 P0 修复报告

## 1. 问题现象

v2.0 独立内测页可以完成 60 题并导出匿名 JSON，但结果页只给出人格名称和排序信息，缺少足够的人格解析。测试者无法判断“结果像不像自己”，导致后续准确度反馈没有有效判断基础。

本轮只修复 v2 内测工具与部署镜像，不修改 Beta 0.9.9.7 生产入口、正式题库、评分逻辑或人格向量。

## 2. 为什么原有准确度反馈无效

旧流程让用户在缺少完整人格说明的情况下给出贴合度、偏好和准确度判断。此类数据只能证明流程可完成，不能作为人格结果准确度样本。

本轮将旧数据口径拆分为：

- `flowValidationValid: true`：可用于判断用户是否完成流程、是否能导出 JSON。
- `fitJudgmentValid: false`：旧结果没有足够人格解析，不能用于准确度统计。
- 旧样本排除原因：`legacy result did not include sufficient persona explanation`。

## 3. 修改文件

- `drafts/v2/persona-descriptions.v2.pilot.json`
- `tools/v2-pilot/result-explanation.mjs`
- `tools/v2-pilot/app.mjs`
- `tools/v2-pilot/index.html`
- `tools/v2-pilot/styles.css`
- `tools/v2-pilot/review.html`
- `tools/v2-pilot/review.mjs`
- `pilot-deploy/v2/result-explanation.mjs`
- `pilot-deploy/v2/persona-descriptions.v2.pilot.json`
- `pilot-deploy/v2/app.mjs`
- `pilot-deploy/v2/index.html`
- `pilot-deploy/v2/styles.css`
- `pilot-deploy/v2/pilot-manifest.json`
- `scripts/v2-validation/analyze-v2-pilot-results.mjs`
- `reports/heart-island-v2-pilot-result-explanation-p0-fix.md`

## 4. 未修改的生产文件

以下文件未修改：

- `app.js`
- `index.html`
- `styles.css`
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- Beta 0.9.9.7 正式题库与正式人格数据
- `deploy/`
- `release/`

## 5. 15 人格解析数据

新增 `drafts/v2/persona-descriptions.v2.pilot.json`，作为内测专用草案解析数据。

完整覆盖 15 个主性人格：

1. 灯塔型
2. 守门人
3. 筑巢型
4. 收藏家
5. 候鸟型
6. 岛屿型
7. 探险家
8. 流浪诗人
9. 星火型
10. 月光型
11. 镜像型
12. 观星者
13. 同行者
14. 港湾型
15. 摆渡人

每个人格包含：一句话概括、核心驱动力、关系模式、亲密方式、沟通方式、承诺方式、冲突方式、情绪模式、空间边界、优势、盲点、关系需要、适合环境、常见误解、相邻人格差异。

完整性检查结果：15/15，必填字段无缺失。

## 6. 结果页信息结构

结果页新增深度解析模块：

- 人格名与置信提示；
- 一句话概括；
- 完整人格解析；
- Top3 排行；
- 高分 / 低分构念动态解释；
- Top1 / Top2 对比；
- 非诊断声明。

反馈表默认隐藏。用户必须先点击“我已阅读解析，开始反馈”，系统才允许填写准确度反馈。

## 7. 构念动态解释

`result-explanation.mjs` 会基于实际 15 构念得分生成：

- 较高构念说明；
- 较低构念说明；
- 哪些构念支持 Top1；
- 哪些构念支持 Top2。

低分说明避免把健康边界、低依赖或止损倾向写成缺陷。

## 8. 低置信处理

低置信结果会明确提示 Top1 与 Top2 接近，要求用户结合两种人格一起阅读，不再把低 gap 结果伪装成高确定性结论。

导出 JSON 新增：

- `resultExplanationViewed`
- `resultExplanationSufficient`
- `fitJudgmentValid`
- `fitJudgmentInvalidReason`
- `unableToJudge`
- `resultReadDurationMs`
- `confidenceUnderstood`

## 9. Top1 / Top2 比较

结果页展示 Top1 与 Top2 的核心差异，并在导出 JSON 中记录：

- `top2FitScore`
- `top2MoreAccurate`
- `selectedBestPersona`

如果用户认为 Top2 更准确，可以直接记录，不再只收集 Top1 的贴合度。

## 10. 匿名 A/B 说明

当 baseline 与 candidate-A 结果不同，页面继续匿名展示“结果 A / 结果 B”，但每张卡都包含同等深度解析。反馈表保留匿名偏好字段，并新增“信息不足，暂时无法判断”。

开发入口 fixture 分支验证结果：两张结果卡可展示，匿名偏好字段可填写，`top2MoreAccurate: true` 可导出。

## 11. 新反馈流程

新反馈流程为：

1. 完成 60 题；
2. 查看结果页解析；
3. 点击“我已阅读解析，开始反馈”；
4. 选择解析是否足够；
5. 判断 Top1 / Top2 / 两者 / 都不像 / 信息不足；
6. 完成流程类反馈；
7. 手动导出匿名 JSON。

如果用户选择“解析不够”或“信息不足”，该样本的流程数据保留，但准确度判断不纳入统计。

## 12. 新旧数据兼容

`scripts/v2-validation/analyze-v2-pilot-results.mjs` 已更新：

- 旧样本会被识别为 `legacySamplesWithoutExplanation`；
- 旧样本可计入流程有效样本；
- 旧样本不会计入准确度、贴合度、Top1 分布等统计；
- 用户无法判断的样本进入 `unableToJudgeSamples`；
- JSON 读取兼容 UTF-8 BOM。

## 13. 真实样本回放

用户提供的真实样本路径：

`pilot-data/inbox/pilot-44370beb-2026-07-04.json`

本地检查结果：文件不存在。

因此，本轮没有完成该真实样本的回放，也没有把该样本写成已通过。需要用户把真实 JSON 放入上述路径后，再用 review 页面查看“流浪诗人 / 收藏家”解析并确认。

本轮只用临时旧格式样本验证了分析口径：该类样本会输出 `flowValidationValid: true`、`fitJudgmentValid: false`，原因是 `legacy result did not include sufficient persona explanation`。

## 14. review 页面

新增本地 review 页面：

`tools/v2-pilot/review.html`

用途：

- 读取本地匿名 JSON；
- 不上传数据；
- 不重算、不覆盖原始结果；
- 用当前 15 人格解析数据补充展示旧样本 Top1 / Top2 说明。

验收结果：可读取临时旧格式 JSON，并渲染结果解析；无 JS 错误，无失败请求。

## 15. 完整流程验收

本轮启动本地服务并访问：

`http://127.0.0.1:4174/pilot-deploy/v2/`

无 fixture 真实点击验收结果：

| 项目 | 结果 |
| --- | --- |
| 开始按钮启用 | 通过 |
| 空白自我描述开始 | 通过 |
| 进入 q01 | 通过 |
| 完成 60 题 | 通过 |
| 结果页解析展示 | 通过 |
| 阅读门槛后显示反馈表 | 通过 |
| JSON 导出 | 通过 |
| 分析脚本读取新 JSON | 通过 |
| 信息不足样本排除准确度统计 | 通过 |
| Console 红色异常 | 未发现 |
| 核心资源 404 | 未发现 |
| 外部上传请求 | 未发现 |

新有效样本分析结果：

- `flowValidSamples: 1`
- `fitValidSamples: 1`
- `fitInvalidSamples: 0`

信息不足样本分析结果：

- `flowValidSamples: 1`
- `fitValidSamples: 0`
- `fitInvalidSamples: 1`
- `unableToJudgeSamples: 1`

## 16. 移动与浏览器验收

| 环境 | 结果 |
| --- | --- |
| Chromium 375px | 通过 |
| Chromium 390px | 通过 |
| Chromium 430px | 通过 |
| Edge 390px | 通过 |
| 横向溢出 | 未发现 |
| JS 错误 | 未发现 |
| 失败资源请求 | 未发现 |

## 17. 人格文案审计

本轮人格解析文案为 pilot-only 草案，不是正式产品文案。文案来源于当前 v2 构念、候选 targetVector 与审题报告，不作为心理诊断描述。

需要用户重点人工确认：

- 流浪诗人 vs 收藏家；
- 低置信时 Top1 / Top2 的解释是否足够；
- “低分构念”是否会被用户误读为缺陷；
- Top2 更像自己时，反馈字段是否足够表达。

## 18. 是否可以开始 3～5 人烟雾测试

技术链路层面：新流程可以支持 3～5 人烟雾测试。

产品确认层面：建议先让用户用 `tools/v2-pilot/review.html` 查看真实样本的流浪诗人 / 收藏家解析，并确认文案足够判断后，再恢复真人内测。

由于真实样本文件本地缺失，本轮不建议直接把旧样本准确度结论纳入统计。

## 19. 是否修改生产代码

没有。

本轮只修改 v2 内测隔离工具、部署镜像、pilot-only 解析数据、分析脚本和报告；未修改 Beta 0.9.9.7 生产入口、正式题库、评分参数、targetVector 或生产结果算法。

