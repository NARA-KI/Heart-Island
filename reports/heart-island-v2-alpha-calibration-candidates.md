# 心岛计划 v2.0 Alpha 1 阶段 1.7 评分参数校准与候选方案对照报告

## 1. 总结结论

本轮建立了独立校准集与验证集，并生成 baseline、candidate-A、candidate-B、candidate-C、candidate-D 的可复现对照。公开运行配置仍保持 candidate-A，未切换 `V2_SCORING_PROFILE`。

综合结果推荐候选：`candidate-d`。该推荐只用于人工评审，不自动替换 candidate-A。candidate-A 综合分为 60.184，推荐候选综合分为 80.42。

## 2. 本轮是否修改冻结数据

没有。60题题干、选项文字、选项得分、reverse、构念绑定、baseline、candidate-A、15人格名称和结果文案均未修改。

## 3. 候选方案说明

- candidate-B：仅调整 targetVector。通过固定语义 delta 和强度网格搜索，尝试缩小候鸟型区域，并扩大筑巢型、港湾型的合理区域。
- candidate-C：不改向量，使用校准集 uniform 计算构念均值和标准差，对用户分数和 targetVector 使用同一 z-score 变换后计算距离。
- candidate-D：不改向量，使用标准化后的绝对距离与去均值结构形状距离混合，alpha 网格为 0.6 / 0.7 / 0.8 / 0.9，选中 alpha=0.7。

## 4. 校准集与验证集

- 校准集 seed：`heart-island-v2-alpha-calibration-training-a`
- 验证集 seed：`heart-island-v2-alpha-calibration-validation-b`
- 每套 uniform：100,000 组
- 每套 8 类作答模型：每类 20,000 组
- 每个人格扰动：1 / 3 / 5 / 10 / 15 题，每层 1,000 组

参数搜索只读取校准集；验证集仅用于最终对照。

## 5. 候选综合对照

| 候选 | 方法 | 验证集最高Top1 | 验证集最低Top1 | 风格峰值 | 10题扰动保持 | 语义失败 | 综合分 |
| -- | -- | -- | -- | -- | -- | -- | -- |
| baseline | raw | 候鸟型 18.91% | 筑巢型 0.20% | lowAgreement:岛屿型 97.78% | 94.14% | 0 | 60.77 |
| candidate-a | raw | 候鸟型 19.20% | 筑巢型 0.22% | lowAgreement:岛屿型 97.78% | 94.46% | 0 | 60.184 |
| candidate-b | raw | 收藏家 13.90% | 筑巢型 0.47% | lowAgreement:岛屿型 98.76% | 95.07% | 0 | 61.906 |
| candidate-c | standardized-distance | 候鸟型 19.18% | 筑巢型 0.22% | lowAgreement:岛屿型 97.76% | 94.43% | 0 | 60.26 |
| candidate-d | standardized-shape-hybrid | 候鸟型 19.00% | 筑巢型 0.40% | volatile:观星者 85.70% | 94.78% | 0 | 80.42 |

## 6. 作答风格鲁棒性

| 模型 | candidate-A峰值 | candidate-d峰值 |
| -- | -- | -- |
| highAgreement | 月光型 81.81% | 月光型 75.10% |
| lowAgreement | 岛屿型 97.78% | 岛屿型 80.60% |
| volatile | 观星者 82.07% | 观星者 85.70% |
| middle | 候鸟型 25.02% | 候鸟型 24.05% |
| conservative | 候鸟型 29.04% | 候鸟型 27.48% |
| constructConsistent | 收藏家 11.98% | 收藏家 11.37% |

## 7. 路径稳健性

| 候选 | 1题 | 3题 | 5题 | 10题 | 15题 |
| -- | -- | -- | -- | -- | -- |
| baseline | 100.00% | 99.95% | 99.53% | 94.14% | 82.06% |
| candidate-a | 100.00% | 99.93% | 99.57% | 94.46% | 82.62% |
| candidate-b | 100.00% | 99.95% | 99.57% | 95.07% | 82.99% |
| candidate-c | 100.00% | 99.93% | 99.62% | 94.43% | 82.01% |
| candidate-d | 100.00% | 99.95% | 99.57% | 94.78% | 82.95% |

## 8. 人格语义漂移

语义漂移已输出到 `reports/data/v2-calibration-semantic-drift.json`。自动规则只用于筛查，不代表最终语义通过；所有候选仍需人工复核人格构念变化。

## 9. 必须回答的问题

1. candidate-B/C/D分别修改了什么：见第3节。
2. 主要改善候鸟型的方法：以验证集 uniform 和 middle/conservative 峰值为准，推荐候选为 `candidate-d`。
3. 主要改善筑巢型和港湾型的方法：见 `v2-calibration-candidate-comparison.json` 中各候选最低频人格和频率。
4. 最能减少高同意/低同意/高波动偏置的方法：以第6节验证集风格峰值为准。
5. 是否出现新的高频或低频人格：见第5节和机器数据；如候选仍有低于0.5%或高于18%的筛查项，应进入人工权衡。
6. 校准集改善是否在验证集复现：报告同时列出两套数据，推荐只基于验证集未明显回退的候选。
7. 语义漂移最小：通常是 candidate-C/D，因为不改 targetVector；candidate-B 需重点人工复核。
8. 区分度最好：参考验证集 gap 和近并列率，详见训练/验证 summary JSON。
9. 路径稳定性最好：见第7节。
10. 综合表现最好：`candidate-d`。
11. 是否建议替换candidate-A：建议进入人工评审后考虑替换为 candidate-d。
12. 推荐候选的已知代价：需要修改运行时评分代码以支持新距离规则。
13. 是否需要人工审查人格构念变化：需要。
14. 是否建议进入小规模真人试测：仅在人工确认推荐候选后建议。
15. 是否建议进入阶段二：不建议直接进入阶段二；应先人工选择候选，并决定是否进行小规模真人试测。

## 10. 测试与运行要求

本报告由 `npm run v2:calibrate` 生成。基础回归命令结果需在最终提交说明中记录。

## 11. 关键量化结论

- 候鸟型：candidate-A 验证集 uniform Top1 为 19.20%，candidate-D 为 19.00%，candidate-B 为 8.03%。candidate-B 对候鸟型区域收缩最明显，但它会让 lowAgreement 的岛屿型峰值升至 98.76%，不适合作为综合推荐。
- 筑巢型：candidate-A 验证集 uniform Top1 为 0.22%，candidate-B 为 0.47%，candidate-D 为 0.40%。candidate-B 更接近 0.5%筛查线，candidate-D 改善较温和。
- 港湾型：本轮没有把港湾型提升到稳定理想区间，仍需人工查看 `v2-calibration-candidate-comparison.json` 与后续真人样本。
- 高同意：candidate-A 峰值为月光型 81.81%，candidate-D 降至月光型 75.10%，接近但仍略高于 75%筛查线。
- 低同意：candidate-A 峰值为岛屿型 97.78%，candidate-D 降至岛屿型 80.60%，明显改善但仍未完全达标。
- 高波动：candidate-A 峰值为观星者 82.07%，candidate-D 为观星者 85.70%，该项没有改善，是 candidate-D 的主要已知代价。
- 路径稳定性：candidate-A 10题扰动平均 Top1 保持率 94.46%，candidate-D 为 94.78%，没有明显下降。
- 近并列：candidate-D 使用标准化混合距离，gap量纲不同；验证集近并列率需结合 `nearTieGap=0.18` 解读，不能和 raw 距离直接按数值大小比较。

## 12. 自动化命令结果

| 命令 | 结果 | 说明 |
| -- | -- | -- |
| `npm run v2:calibrate` | 通过 | 生成 candidate-B/C/D、训练/验证数据、语义漂移、鲁棒性和阶段报告。 |
| `npm run v2:audit:calibration` | 通过 | 13 个候选产物检查通过；baseline / candidate-A 哈希未变化；公开 profile 仍为 candidate-A。 |
| `npm run v2:validate` | 通过 | 60题、15构念、15人格、移动端 375/390/430 和 Edge 390 流程通过。 |
| `npm run check` | 通过 | Beta 旧版 consistency / probability / option audit 通过。 |
| `npm test` | 通过 | 当前指向 `npm run check`，通过。 |
| `npm run v2:audit:archive` | 通过 | 32 个 Beta 缺失资源仍为 `missing-before-v2`，没有新增必须恢复项。 |

## 13. 本阶段停止结论

本轮不切换公开评分 profile。即使综合分推荐 candidate-D，也只能进入人工评审；不能直接把 `V2_SCORING_PROFILE` 从 candidate-A 改为 candidate-D。

不建议直接进入阶段二。推荐下一步是人工审查 candidate-D 的运行时代价和高波动模型代价，同时对 candidate-B 的 targetVector 位移做语义复核。如果人工接受 candidate-D 的代价，可进入小规模真人试测；否则应继续做更窄范围的 1.7b 校准。
