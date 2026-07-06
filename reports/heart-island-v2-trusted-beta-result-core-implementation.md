# 心岛 V2 可信 Beta — 结果核心重构实施报告

生成时间：2026-07-06  
当前分支：`feature/heart-island-v2-trusted-beta-result-core`  
基线提交：`af3bc59 docs: add v2 15d profile preview`

## 1. Git 与提交记录

本轮先提交了上一轮可信 Beta 现状审计资产，再从审计后的状态创建结果核心重构分支。

- `cb89c36 docs: add v2 trusted beta current state audit`
- `f21342b feat(v2): add deterministic result facts and rules`
- `8c84262 feat(v2): rebuild trusted beta result experience`
- `249c169 feat(v2): polish result share card output`
- 本报告、浏览器验证脚本、截图与验证数据将在最终验证提交中纳入。

未推送远端。

## 2. 本轮目标

本轮目标是把 V2 从“能完成测试并显示 Alpha 结果”推进到“可信 Beta 结果核心”：

- 建立确定性的 Result Facts 数据层。
- 建立确定性的 Result Report 解释层。
- 重建结果页，使结果不再只依赖 15 人格命中。
- 增加 15 维关系地图、结果可信度、作答质量、冲突解释、保存图与刷新恢复。
- 不接入 AI API，不引入后端，不修改题库、选项、计分、反向题、15 维定义和 candidate-a 人格向量。

## 3. 冻结范围核对

以下文件未作为本轮算法调整对象，未改题文、选项、题目分数、反向题、15 维定义或 candidate-a targetVector：

- `data/v2/question-bank.v2.json`
- `data/v2/persona-target-vectors.v2.candidate-a.json`
- `data/v2/manifest.json`

结果评分仍基于原 candidate-a 和现有 `scoreAnswers` 流程。

## 4. 涉及文件

主要实现文件：

- `index.html`
- `styles.css`
- `js/v2/app.js`
- `js/v2/config.js`
- `js/v2/pilot-engine.js`
- `js/v2/result-engine.js`
- `js/v2/result-facts.js`
- `js/v2/result-rules.js`
- `js/v2/result-report-builder.js`
- `js/v2/share-card.js`
- `js/v2/state.js`
- `js/v2/storage.js`
- `js/v2/renderers/home.js`
- `js/v2/renderers/instructions.js`
- `js/v2/renderers/result.js`
- `js/v2/renderers/transition.js`

验证与资产文件：

- `tests/v2-result-core.test.mjs`
- `tests/v2-result-core-browser.mjs`
- `tests/fixtures/v2-result-baselines.json`
- `reports/data/v2-trusted-beta-result-core-browser.json`
- `reports/audit-assets/v2-trusted-beta-result-core/`
- `reports/heart-island-v2-trusted-beta-result-core-implementation.md`

## 5. Result Facts Schema

新增 `v2-trusted-beta-result-facts-1`，由 `buildResultFacts` / `buildResultFactsFromScoring` 生成并验证。Facts 包含：

- `resultId`
- `generatedAt`
- `versions`
- `persona`
- `personaRanking`
- `confidence`
- `constructScores`
- `constructRanking`
- `topConstructs`
- `bottomConstructs`
- `conflicts`
- `needs`
- `strengths`
- `riskPatterns`
- `adviceTags`
- `responseQuality`

Facts 是后续 AI 接入的稳定输入层，但本轮没有调用 AI。

## 6. Result Report Schema

新增 `v2-trusted-beta-result-report-1`，由 `buildDeterministicReport` 生成并验证。Report 包含：

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
- `source: deterministic`

Report 校验会阻止 HTML、`undefined`、`NaN` 和诊断化用语进入结果文案。

## 7. 可信度阈值

`top1Top2Gap <= 2.5` 被标记为 close match。该阈值来自上一轮分布审计中的 near-tie 标准，只影响结果可信提示，不改变最终人格命中。

## 8. Conflict Rules

本轮实现 8 条冲突/张力规则：

- `MN_HIGH_ER_LOW`
- `SI_HIGH_RM_LOW`
- `CL_HIGH_AU_HIGH`
- `RI_HIGH_CL_LOW`
- `EC_HIGH_CR_LOW`
- `SC_HIGH_EC_LOW`
- `RI_HIGH_AU_LOW`
- `NV_HIGH_CM_LOW`

规则基于 15 维分数，使用高分 `>= 70`、低分 `<= 35` 判定。

## 9. Response Quality

本轮实现作答质量检测：

- `LOW_VARIANCE`
- `HIGH_UNIFORMITY`
- `HIGHLY_REPETITIVE`
- `HIGH_OPTION_UNIFORMITY`
- `INCOMPLETE`
- `INVALID_OPTION`
- `NORMAL`

阈值：

- 分数标准差 `<= 12`
- 同分占比 `>= 0.72`
- 连续同分 `>= 12`
- 同选项占比 `>= 0.9`
- 连续同选项 `>= 20`

异常作答会在结果页显示“参考性”提示，不阻断结果生成。

## 10. 基线样本

`npm run v2:test:result-core` 已通过。基线共 11 个样本：

- 真实收藏家样本。
- 高安全确认样本。
- 中位平衡样本。
- 高自主低安全样本。
- 高亲密高投入样本。
- 高灵魂理想高记忆牵引样本。
- 高记忆牵引低情绪回收样本。
- 高自主/亲密/投入且低安全冲突样本。
- 候鸟型同人格差异样本 A。
- 候鸟型同人格差异样本 B。
- 全 A 异常作答样本。

真实收藏家样本核心输出：

- 人格：`collector` / 收藏家
- top constructs：`SI`, `MN`, `CL`, `RM`, `RI`
- bottom constructs：`EC`, `ER`, `PA`, `CS`
- top1/top2 gap：`6.3141`

## 11. 同人格差异样本

两个样本均命中 `migratory-bird`，但 15 维核心结构明显不同：

- A top：`CL`, `EC`, `ER`, `RI`, `CR`
- A bottom：`SI`, `CS`, `SC`, `CM`
- B top：`AU`, `PA`, `EC`, `ER`, `SI`
- B bottom：`CS`, `CM`, `CR`, `RM`

自动测试确认 core diff count 为 6，说明结果页不再只表达“同一个人格标签”。

## 12. 新结果页结构

新版结果页包含：

- 人格主视觉和 fallback。
- 一句话结果。
- 三个关键关系特征。
- 可信度提示。
- 作答质量提示。
- 关系中真正需要什么。
- 内在张力。
- 可能被误解的地方。
- 稳定优势。
- 反复模式。
- 三条建议。
- 15 维关系地图。
- 可展开证据区。
- 保存图片、分享、重测和本地反馈。

## 13. 15 维关系地图

结果页实现了 SVG 雷达图和分组条形图。分组来自既有 15 维结构：

- 安全与边界
- 亲密与表达
- 理想与现实
- 修复与调节

该地图用于展示 15 维结构，而不是替代人格命中。

## 14. 保存图与分享

新增 `js/v2/share-card.js`：

- 输出 1080x1440 PNG。
- 使用 Result Facts、Result Report 和人格图生成。
- 支持 Web Share API 文件分享。
- 不支持 Web Share 时下载 PNG。
- 不把 canvas/base64 存入 localStorage。

分享卡片已经在 375x667、390x844、1440x900 下完成下载验证。

## 15. 刷新恢复

`storage.js` 保存 compact result：

- `facts`
- `report`

刷新后若 compact result 合法，直接恢复结果页。若答案完整但没有 compact result，则重新计算事实和报告。重新开始测试会清空结果。

## 16. 首页与过渡页去 Alpha 化

首页和过渡页公开文案已经改为可信 Beta 风格：

- 首页主标题改为“恋爱关系倾向测试”。
- 删除面向用户的 Alpha 暗示。
- 过渡页使用产品化生成结果文案。

内部 storage key 和 product version 字段保持兼容，没有做迁移性重命名。

## 17. 15 人格图片完整性

不完整。当前 15 人格中 12 个有正式 webp 图：

- `lighthouse`
- `gatekeeper`
- `nest-builder`
- `collector`
- `migratory-bird`
- `islander`
- `explorer`
- `wandering-poet`
- `spark`
- `moonlight`
- `mirror`
- `stargazer`

以下 3 个仍使用 fallback：

- `companion`
- `harbor`
- `ferryman`

浏览器验证中 broken images 为 0，因为缺图人格走 fallback。

## 18. 浏览器验证

浏览器验证脚本：`npm run v2:test:result-core:browser`

结果文件：`reports/data/v2-trusted-beta-result-core-browser.json`

通过视口：

- 375x667
- 390x844
- 1440x900

每个视口覆盖：

- 首页
- 答题页
- 结果首屏
- 结果长页
- 关系地图
- 展开证据
- 保存结果图
- 分享 fallback
- 刷新恢复

验证结论：

- JS console errors：0
- request failures：0
- bad responses：0
- horizontal overflow：0
- broken images：0
- undefined/NaN/internal text：0

## 19. 截图资产

截图目录：

`reports/audit-assets/v2-trusted-beta-result-core/`

关键截图包括：

- `375x667-01-home.png` 到 `375x667-09-refresh-restored.png`
- `390x844-01-home.png` 到 `390x844-10-quality-notice.png`
- `1440x900-01-home.png` 到 `1440x900-09-refresh-restored.png`

## 20. 剩余风险与进入 AI 接入建议

P0：0。

P1：1。15 人格图片仍缺 3 张正式图，当前 fallback 不影响功能，但会影响完整视觉一致性。

P2：2。

- Web Share 在不支持文件分享的浏览器中只能 fallback 下载。
- 本地反馈仍是前端状态记录，不包含后端收集链路。

建议进入受控 AI 接入：可以。当前 Result Facts / Result Report 已提供稳定输入输出结构，适合在下一轮把 AI 作为可控解释层接入；但建议同时补齐 3 张正式人格图，并保持 deterministic report 作为 AI 失败时的 fallback。

回滚方式：

- 回滚本分支的结果核心提交即可。
- 题库与 candidate-a 未被修改，无需数据迁移。
- compact result 有 schema 校验，旧状态异常时可重新答题或重新计算。
