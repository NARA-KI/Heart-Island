# 心岛计划 v2.0 Alpha 1 阶段一产品集成报告

## 1. 阶段结论

阶段一已完成 Heart Island v2.0 Alpha 1 最小产品闭环：

首页 → 测试说明 → 60 题测试流程 → 评分计算 → 单一主人格结果 → 重新测试。

本阶段没有进入分享卡、历史记录中心、用户反馈系统、复杂动画、人格图鉴、多人格排行、云端数据或登录系统。

## 2. 分支

- 当前分支：`feature/heart-island-v2-alpha-integration`
- 基线分支：`heart-island-sync-latest`
- 基线提交：`f9614f5`

## 3. Beta 0.9.9.7 归档

归档位置：

`archive/beta-0.9.9.7-production/`

归档内容：

- `index.html`
- `app.js`
- `styles.css`
- `package.json`
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- `README.md`

归档说明记录了原始入口、核心脚本、基线提交、归档时间和原版本静态站点启动方式。

## 4. V2 数据来源

运行时只读取 `data/v2/` 冻结副本，不读取 `drafts/v2/`、`pilot-deploy/v2/` 或旧版 36 题数据。

数据入口：

- `data/v2/question-bank.v2.json`
- `data/v2/persona-target-vectors.v2.candidate-a.json`
- `data/v2/persona-target-vectors.v2.baseline.json`
- `data/v2/persona-descriptions.v2.json`
- `data/v2/manifest.json`

公开 Alpha 候选评分方案：

`V2_SCORING_PROFILE = "candidate-a"`

说明：candidate-A 仍是候选参数，不是最终正式人格参数。

## 5. 新架构

新增模块：

- `app.mjs`
- `js/v2/config.js`
- `js/v2/data-loader.js`
- `js/v2/state.js`
- `js/v2/storage.js`
- `js/v2/question-engine.js`
- `js/v2/scoring-engine.js`
- `js/v2/result-engine.js`
- `js/v2/router.js`
- `js/v2/utils.js`
- `js/v2/renderers/home.js`
- `js/v2/renderers/instructions.js`
- `js/v2/renderers/quiz.js`
- `js/v2/renderers/transition.js`
- `js/v2/renderers/result.js`

职责拆分：

- `state`：当前答题状态。
- `question-engine`：题目读取、前进、返回、答案写入。
- `scoring-engine`：V2 数据校验与评分计算。
- `result-engine`：评分结果转换为单一主人格报告。
- `storage`：浏览器本地保存与版本/hash 校验。
- `renderers`：视图渲染。

## 6. 首页流程

首页已重构为 v2 Alpha 首屏：

- 心岛计划名称。
- 一句产品说明。
- 60 题和 8-10 分钟说明。
- 非专业心理诊断提示。
- 单一主按钮“开始登岛”。
- 深海、星图、小岛和航线主视觉。

首页不展示 candidate-A、targetVector、算法说明或内部验证信息。

## 7. 测试说明页

测试说明页已包含：

- 共 60 题。
- 按第一反应作答。
- 没有标准答案。
- 结果不构成专业心理诊断。
- 可以返回上一题修改答案。
- 刷新后可恢复未完成进度。

## 8. 答题流程

已实现：

- `01 / 60` 进度。
- 当前题目与四个选项。
- 点击选项后自动进入下一题。
- 上一题可用。
- 返回后恢复当前题旧答案。
- 修改答案覆盖旧答案。
- 刷新后恢复当前进度。
- 保存按 `questionId + optionId`，不按选项位置。
- 选项顺序按题号稳定生成。

## 9. 评分链路

评分链路完全使用 V2 数据：

- 题库：`data/v2/question-bank.v2.json`
- 人格向量：`data/v2/persona-target-vectors.v2.candidate-a.json`
- 15 构念：SC / AU / TR / CL / PA / CM / SI / NV / RM / CS / EC / CR / ER / RI / MN
- 15 人格：灯塔型、守门人、筑巢型、收藏家、候鸟型、岛屿型、探险家、流浪诗人、星火型、月光型、镜像型、观星者、同行者、港湾型、摆渡人

并列处理规则：

距离升序，其次按冻结人格数组顺序排序。评分过程不使用随机数。

反向题处理：

V2 冻结题库的选项分值已经是归一化后的构念得分。评分引擎校验并记录 `reverse`，但不会二次反转分值。

## 10. 结果页

阶段一结果页只展示单一主人格。

包含：

- 人格名称。
- 人格核心命中句。
- 3-5 个关键词。
- 一段简洁总述。
- 匹配强度及口径说明。
- 你在关系中的核心模式。
- 你真正需要的关系。
- 你容易陷入的惯性。
- 你的成长方向。
- 重新测试按钮。

不展示：

- Top2 / Top3。
- baseline / candidate-A。
- targetVector。
- 距离。
- gap。
- lowConfidence。
- 多人格排行。

## 11. 未修改的核心数据

本阶段没有修改：

- V2 60 题文字。
- 选项分值。
- 反向题标记。
- 构念归属。
- candidate-A targetVector。
- baseline targetVector。
- 人格定义和展示名。

## 12. 已知限制

- 分享卡未接入。
- 历史记录未接入。
- 用户反馈未接入。
- 内部 review 没有并入普通用户入口。
- 15 人格中只有旧 12 人格具备现有人格拟人图/图标，同行者、港湾型、摆渡人暂时使用结果页 fallback。
- 视觉仍是 Alpha 级别，尚未完成完整视觉资源审计和精修。

## 13. 是否建议进入用户验收

建议进入阶段一内部产品验收。

不建议立即进入公开发布，也不建议在阶段一通过前继续开发分享、历史、反馈等外围功能。
