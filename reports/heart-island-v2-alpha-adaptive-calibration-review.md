# 心岛计划 v2.0 Alpha 1 阶段 1.7b 自适应评分与候选决策审计报告

## 1. 总结结论

本轮新增 candidate-E 自适应混合距离，并解释 candidate-D 的高波动问题。公开运行配置仍保持 candidate-A，未切换 `V2_SCORING_PROFILE`。

candidate-E 使用答案风格指标动态调整 alpha：高波动、低结构可信时提高 alpha，减少 shapeDistance；稳定且存在强同意/低同意偏置时降低 alpha，增加 shapeDistance。

## 2. candidate-D 为什么放大 volatile 偏置

candidate-D 固定 alpha=0.7，在 volatile 样本中仍给 shapeDistance 30% 权重。volatile 模型会制造相邻题强烈反向的结构形状，去均值后部分构念差异被放大，观星者更容易吸收这类形状。诊断数据见 `reports/data/v2-candidate-d-volatility-diagnosis.json`。

- volatile 中 shapeContribution 均值：26.96%
- volatile 中 absoluteContribution 均值：73.04%
- alpha sweep 已记录 0.6 / 0.7 / 0.8 / 0.9 的 highAgreement、lowAgreement、volatile 峰值。

## 3. candidate-E 自适应规则

- 最低 alpha：0.6
- 最高 alpha：0.85
- 默认 alpha：0.7
- 一致性阈值：0.45
- 波动阈值：0.45
- 同意倾向阈值：0.25

作答风格指标包括：全局同意倾向、极端程度、构念内部一致性、全局波动程度、结构可信度。这些指标只进入内部距离权重，不展示给普通用户。

## 4. 候选对照

| 候选 | 验证集最高Top1 | 验证集最低Top1 | 风格峰值 | 10题扰动 | 综合分 |
| -- | -- | -- | -- | -- | -- |
| baseline | 候鸟型 18.62% | 筑巢型 0.24% | lowAgreement:岛屿型 97.72% | 95.68% | 61.794 |
| candidate-a | 候鸟型 18.92% | 筑巢型 0.26% | lowAgreement:岛屿型 97.72% | 95.91% | 61.276 |
| candidate-b | 收藏家 13.65% | 筑巢型 0.54% | lowAgreement:岛屿型 98.62% | 96.01% | 62.208 |
| candidate-c | 候鸟型 18.91% | 筑巢型 0.26% | lowAgreement:岛屿型 97.69% | 95.95% | 61.343 |
| candidate-d | 候鸟型 18.70% | 筑巢型 0.47% | volatile:观星者 85.79% | 96.13% | 81.328 |
| candidate-e-adaptive-hybrid | 候鸟型 16.11% | 筑巢型 0.60% | volatile:观星者 80.25% | 96.89% | 91.6 |

## 5. 作答风格对照

| 模型 | candidate-A峰值 | candidate-D峰值 | candidate-E峰值 |
| -- | -- | -- | -- |
| highAgreement | 月光型 82.18% | 月光型 75.46% | 月光型 72.03% |
| lowAgreement | 岛屿型 97.72% | 岛屿型 80.47% | 岛屿型 66.81% |
| volatile | 观星者 82.22% | 观星者 85.79% | 观星者 80.25% |
| middle | 候鸟型 25.00% | 候鸟型 24.24% | 候鸟型 23.73% |
| conservative | 候鸟型 29.54% | 候鸟型 28.14% | 候鸟型 28.14% |
| constructConsistent | 收藏家 11.90% | 收藏家 11.32% | 收藏家 11.47% |

## 6. 权重敏感性分析

| 权重场景 | 第1名 | 第2名 | 第3名 |
| -- | -- | -- | -- |
| distributionFirst | candidate-e-adaptive-hybrid | candidate-d | candidate-b |
| responseStyleFirst | candidate-e-adaptive-hybrid | candidate-d | baseline |
| semanticFirst | candidate-e-adaptive-hybrid | candidate-d | baseline |
| robustnessFirst | candidate-e-adaptive-hybrid | candidate-d | candidate-b |
| lowFrequencyProtection | candidate-e-adaptive-hybrid | candidate-d | candidate-b |
| balanced | candidate-e-adaptive-hybrid | candidate-d | candidate-b |

## 7. 验收判断

- candidate-E 是否同时改善 highAgreement、lowAgreement 和 volatile：相对 candidate-D 需查看第5节。若 volatile 下降但 high/low 回升，不能视为完全通过。
- uniform 中候鸟型、筑巢型、港湾型是否改善：候鸟型 candidate-A 18.92%，candidate-D 18.70%，candidate-E 16.11%；最低人格 candidate-E 为 筑巢型 0.60%。
- 是否产生新的人格集中：以第4节风格峰值和 uniform 最高人格为准。
- 稳定性是否下降：candidate-E 10题扰动为 96.89%。
- candidate-B语义变化是否可接受：不可由脚本自动判定，需阅读 `reports/heart-island-v2-persona-semantic-review.md`。
- candidate-D是否仍值得保留：值得保留为固定混合距离对照，但不建议直接公开切换。
- candidate-E是否更适合真人试测：只有在人工接受高波动、低同意和语义评审代价后才建议。
- 是否建议切换公开profile：不建议。本轮只给候选评审。
- 是否建议进入小规模真人试测：暂不自动建议，需人工语义审查后决定。
- 是否建议进入阶段二：不建议直接进入阶段二。

## 8. 低置信和高波动处理建议

建议未来内部增加低置信标记：构念内部高度矛盾、作答波动极高、Top1/Top2极近、多个人格距离相近。该标记不阻止输出主人格，只用于结果措辞和真人试测分析。

## 9. 自动化命令结果

本报告由 `npm run v2:calibrate` 生成。其余回归命令结果见最终提交说明。
