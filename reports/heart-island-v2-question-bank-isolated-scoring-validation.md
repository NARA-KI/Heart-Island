# 心岛 v2.0 隔离评分验证报告

## 1. 本轮真实执行摘要

这是**真实脚本执行**，不是人工推演。

本轮执行命令：

```bash
node scripts/v2-validation/run-v2-simulation.mjs
```

验证脚本只读取 `drafts/v2` 下的数据文件，不 import `app.js`，不 import `core/scoring.mjs`，不连接生产题库或 Beta 0.9.9.7 正式人格数据。

| 指标 | 结果 |
| --- | --- |
| fixture 总数 | 110 |
| 15 主性人格理想路径命中数 | 15/15 (100.0%) |
| 扰动路径命中率 | 45/45 (100.0%) |
| 易混人格命中率 | 36/36 (100.0%) |
| 风险题单题扰动 Top1 改变次数 | 0/14 |
| 非相邻人格误判数 | 0 |
| 风险题压力是否通过 | 通过 |

## 2. 本轮修改文件

| 文件 | 用途 |
| --- | --- |
| drafts/v2/question-bank.v2.draft.json | 完整 60 题 v2 候选题库隔离草案。 |
| drafts/v2/persona-target-vectors.v2.draft.json | 15 主性人格候选 targetVector 隔离草案。 |
| drafts/v2/simulation-fixtures.v2.draft.json | 完整 60 题 A/B/C/D 模拟 fixture。 |
| drafts/v2/validation-results.v2.draft.json | 脚本真实运行后的结构化结果。 |
| scripts/v2-validation/generate-v2-drafts.mjs | 从 reports 生成隔离草案数据。 |
| scripts/v2-validation/run-v2-simulation.mjs | 隔离评分验证脚本。 |
| reports/heart-island-v2-question-bank-isolated-scoring-validation.md | 本验证报告。 |

## 3. 本轮未修改的生产文件

未修改：

- `app.js`
- `index.html`
- `styles.css`
- 当前正式题库
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- Beta 0.9.9.7 正式人格数据
- `deploy/`
- `release/`

## 4. 数据来源与临时假设

| 数据 | 来源 | 说明 |
| --- | --- | --- |
| 60 题候选题库 | reports/heart-island-v2-question-bank-and-scoring-draft.md + pass-2/user final | 已合并 q06/q11/q15/q21/q28/q32/q36/q41/q47/q50/q57/q58 等最终/小修版本。 |
| 15 主性人格 | reports/heart-island-v2-personality-questionnaire-scoring-architecture.md | 使用报告中的候选 targetVector 初稿。 |
| 模拟 fixture | drafts/v2/simulation-fixtures.v2.draft.json | 包含理想路径、扰动路径、易混对照、风险题单题扰动。 |
| 评分算法 | 本隔离脚本内透明实现 | 每构念 4 题取平均；与候选 targetVector 做 15 维欧氏距离；距离越小越匹配。 |

## 5. 题库草案完整性检查

| 检查项 | 结果 |
| --- | --- |
| 题目数量 | 60 |
| 构念数量 | 15 |
| 每题选项数 | 4 |
| 完整字段 | id / construct / reverse / question / options / score / sourceVersion / reviewStatus 均存在 |
| 是否只保存风险题 | 否，保存完整 60 题 |

## 6. targetVector 临时映射规则

本轮没有编造 targetVector。实际使用 `reports/heart-island-v2-personality-questionnaire-scoring-architecture.md` 中“候选人格 targetVector 初稿”的 15 维数值。

这些数值仅为**验证用候选 targetVector**，不得视为正式人格参数。

评分规则：

1. 读取每个 fixture 的完整 60 题答案。
2. 每题按选项分值得到单题构念分。
3. 每个构念 4 题取平均，得到 15 构念实际得分。
4. 对每个人格计算 15 维欧氏距离。
5. 距离越小排名越高，输出 Top5。
6. Top1-Top2 gap = Top2 distance - Top1 distance。

## 7. 模拟 fixture 规模

| 模拟类型 | 组数 | 命中数 | 命中率 | 相邻误判 | 非相邻误判 |
| --- | --- | --- | --- | --- | --- |
| ideal-primary-persona | 15 | 15 | 100.0% | 0 | 0 |
| minor-perturbation | 45 | 45 | 100.0% | 0 | 0 |
| confusable-contrast | 36 | 36 | 100.0% | 0 | 0 |
| risk-question-single-perturbation | 14 | 14 | 100.0% | 0 | 0 |

## 8. 15 主性人格真实命中结果

| Fixture | 预期人格 | Top1 | Top2 | Gap | 结果 |
| --- | --- | --- | --- | --- | --- |
| ideal-lighthouse-01 | 灯塔型 | 灯塔型 | 月光型 | 3.2229 | 命中 |
| ideal-gatekeeper-01 | 守门人 | 守门人 | 观星者 | 5.9518 | 命中 |
| ideal-nest-builder-01 | 筑巢型 | 筑巢型 | 月光型 | 4.3372 | 命中 |
| ideal-collector-01 | 收藏家 | 收藏家 | 守门人 | 13.287 | 命中 |
| ideal-migratory-bird-01 | 候鸟型 | 候鸟型 | 流浪诗人 | 6.1906 | 命中 |
| ideal-islander-01 | 岛屿型 | 岛屿型 | 守门人 | 11.427 | 命中 |
| ideal-explorer-01 | 探险家 | 探险家 | 候鸟型 | 4.5587 | 命中 |
| ideal-wandering-poet-01 | 流浪诗人 | 流浪诗人 | 候鸟型 | 5.3088 | 命中 |
| ideal-spark-01 | 星火型 | 星火型 | 探险家 | 11.8137 | 命中 |
| ideal-moonlight-01 | 月光型 | 月光型 | 灯塔型 | 5.1077 | 命中 |
| ideal-mirror-01 | 镜像型 | 镜像型 | 摆渡人 | 2.0236 | 命中 |
| ideal-stargazer-01 | 观星者 | 观星者 | 守门人 | 8.5185 | 命中 |
| ideal-companion-01 | 同行者 | 同行者 | 港湾型 | 6.8174 | 命中 |
| ideal-harbor-01 | 港湾型 | 港湾型 | 月光型 | 2.501 | 命中 |
| ideal-ferryman-01 | 摆渡人 | 摆渡人 | 镜像型 | 3.6697 | 命中 |

## 9. 扰动路径稳定性

| 指标 | 结果 |
| --- | --- |
| 扰动路径总数 | 45 |
| 扰动路径命中数 | 45 |
| 扰动路径命中率 | 100.0% |
| 扰动路径相邻误判数 | 0 |
| 扰动路径非相邻误判数 | 0 |

## 10. 6 组易混人格真实结果

| 指标 | 结果 |
| --- | --- |
| 易混 fixture 总数 | 36 |
| 命中数 | 36 |
| 命中率 | 100.0% |
| 相邻误判数 | 0 |
| 非相邻误判数 | 0 |

## 11. 风险题敏感度

| 题号 | 扰动组数 | Top1 改变次数 | 改变率 | 改变后 Top1 |
| --- | --- | --- | --- | --- |
| v2-q06 | 1 | 0 | 0.0% | 无 |
| v2-q11 | 1 | 0 | 0.0% | 无 |
| v2-q15 | 1 | 0 | 0.0% | 无 |
| v2-q21 | 1 | 0 | 0.0% | 无 |
| v2-q28 | 1 | 0 | 0.0% | 无 |
| v2-q32 | 1 | 0 | 0.0% | 无 |
| v2-q36 | 1 | 0 | 0.0% | 无 |
| v2-q38 | 1 | 0 | 0.0% | 无 |
| v2-q41 | 1 | 0 | 0.0% | 无 |
| v2-q47 | 1 | 0 | 0.0% | 无 |
| v2-q50 | 1 | 0 | 0.0% | 无 |
| v2-q57 | 1 | 0 | 0.0% | 无 |
| v2-q58 | 1 | 0 | 0.0% | 无 |
| v2-q60 | 1 | 0 | 0.0% | 无 |

## 12. 人格 Top1 分布

| 人格 | Top1 次数 | 在其他人格路径中被误判为 Top1 次数 |
| --- | --- | --- |
| 摆渡人 | 11 | 0 |
| 港湾型 | 9 | 0 |
| 灯塔型 | 8 | 0 |
| 候鸟型 | 8 | 0 |
| 同行者 | 8 | 0 |
| 岛屿型 | 7 | 0 |
| 流浪诗人 | 7 | 0 |
| 收藏家 | 7 | 0 |
| 守门人 | 7 | 0 |
| 探险家 | 7 | 0 |
| 月光型 | 7 | 0 |
| 观星者 | 6 | 0 |
| 镜像型 | 6 | 0 |
| 星火型 | 6 | 0 |
| 筑巢型 | 6 | 0 |

## 13. 最容易被误判的人格

本轮没有误判。

## 14. 最容易过度高频的人格

本轮没有出现其他路径误判吸走人格。

## 15. 是否需要回到题目修改

暂不需要因本轮隔离跑分回到题目修改。

## 16. 是否需要调整 targetVector

暂不需要。当前隔离 fixture 未暴露 targetVector 明显失衡。

## 17. 是否建议进入正式结构化题库

可以进入结构化题库草案，但仍不能接入生产代码。

## 18. 是否建议接入生产代码

不建议。

原因：

1. 当前仍是隔离 drafts/reports 阶段。
2. 尚未接入正式结构化数据。
3. 尚未用生产评分脚本验证。
4. 当前 targetVector 仍是候选草案，不是正式人格参数。
5. 本轮即使局部通过，也不得自动接入 `app.js`。

最终结论：

| 问题 | 结论 |
| --- | --- |
| 这是人工推演还是真实脚本执行 | 真实脚本执行 |
| fixture 总数 | 110 |
| 15 主性人格理想路径命中数 | 15/15 |
| 扰动路径命中率 | 100.0% |
| 易混人格命中率 | 100.0% |
| 风险题压力是否通过 | 通过 |
| 哪些题仍有问题 | 暂无 |
| 哪些人格仍有问题 | 暂无 |
| 是否建议冻结题库文字 | 可考虑冻结风险题文字，但仍需人工确认体验语感 |
| 是否建议冻结 targetVector | 可考虑暂冻候选 targetVector |
| 是否建议接入生产代码 | 不建议 |
