# 心岛计划 v2.0 Alpha 1 阶段 1.6 评分分布诊断与 Beta 缺失资源溯源报告

## 1. 总结结论

本轮是真实脚本诊断，不是人工推演。已使用同一批 100,000 组固定种子答案，对 candidate-A 与 baseline 执行对照模拟，并新增 15 人格定向路径扰动、8 类合成作答模型、可达构念空间近似、候鸟型 / 筑巢型敏感性分析，以及 Beta 快照 32 个缺失资源溯源。

结论：candidate-A 没有把候鸟型高频和筑巢型低频显著放大成全新问题；同样趋势在 baseline 已存在。candidate-A 相比 baseline 的主要变化是候鸟型 +0.32pp、筑巢型 +0.03pp、镜像型 +0.69pp、摆渡人 -1.66pp。候鸟型高频主要来自目标向量位于随机可达空间更高密度区域，筑巢型低频主要来自判定区域窄且靠近可达空间边缘。当前应进入“阶段 1.7：评分参数校准”，不建议进入分享、历史、反馈或视觉精修。

Beta 快照 32 个缺失资源全部分类为 `missing-before-v2`：它们在基线提交 `f9614f5` 不存在，Git 历史没有可恢复提交，当前不应创建占位文件或用近似文件冒充恢复。它们仍可能影响旧版动态 prop 视觉，因此 Beta 回滚能力属于“主入口可追溯，但 prop 级视觉资源不完整”。

## 2. 本轮修改文件

- `js/v2/result-engine.js`：普通结果页新增非概率式匹配倾向分级。
- `js/v2/renderers/result.js`：普通结果页不再展示数值式 `matchStrength / 100`。
- `package.json`：拆分 `v2:audit:scoring`、`v2:audit:archive`、`v2:audit:all`。
- `scripts/v2-product-validation/diagnose-v2-calibration.mjs`：新增阶段 1.6 评分分布诊断脚本。
- `scripts/v2-product-validation/audit-beta-archive-assets.mjs`：新增 Beta 缺失资源溯源脚本。
- `scripts/v2-product-validation/run-v2-audit-all.mjs`：新增顺序执行 scoring/archive 的聚合脚本。
- `reports/data/v2-candidate-baseline-comparison.json`
- `reports/data/v2-persona-robustness.json`
- `reports/data/v2-response-model-distribution.json`
- `reports/data/v2-persona-region-analysis.json`
- `reports/data/v2-construct-sensitivity.json`
- `reports/data/beta-missing-asset-provenance.json`
- `reports/heart-island-v2-alpha-calibration-diagnosis.md`

## 3. 本轮未修改内容

未修改 60 题题干、选项文字、选项分值、reverse 标记、构念绑定、baseline 向量、candidate-A 向量、15 人格名称和定义、Beta 0.9.9.7 生产入口、deploy、release、main/master。

## 4. candidate-A 与 baseline 对照模拟

- 样本数：100,000
- 固定 seed：`heart-island-v2-alpha-candidate-baseline-compare-v1`
- candidate-A Top1 最大：候鸟型 19.23%
- candidate-A Top1 最小：筑巢型 0.24%
- baseline Top1 最大：候鸟型 18.91%
- baseline Top1 最小：筑巢型 0.21%

| 人格 | candidate-A Top1 | baseline Top1 | 变化 | candidate 平均排名 | baseline 平均排名 |
| -- | --: | --: | --: | --: | --: |
| 灯塔型 | 2.84% | 3.13% | -0.29pp | 9.9447 | 9.5916 |
| 守门人 | 14.59% | 14.33% | +0.26pp | 5.6379 | 5.7702 |
| 筑巢型 | 0.24% | 0.21% | +0.03pp | 12.5794 | 12.5039 |
| 收藏家 | 13.89% | 13.64% | +0.25pp | 5.9735 | 6.1173 |
| 候鸟型 | 19.23% | 18.91% | +0.32pp | 4.9596 | 5.0851 |
| 岛屿型 | 6.13% | 6.12% | +0.01pp | 9.0699 | 9.199 |
| 探险家 | 4.91% | 4.87% | +0.04pp | 8.0972 | 8.2299 |
| 流浪诗人 | 5.34% | 5.18% | +0.16pp | 6.8654 | 7.0163 |
| 星火型 | 6.65% | 6.42% | +0.23pp | 8.2651 | 8.4261 |
| 月光型 | 3.85% | 4.19% | -0.34pp | 6.8239 | 6.6098 |
| 镜像型 | 11.37% | 10.68% | +0.69pp | 6.097 | 6.2953 |
| 观星者 | 4.00% | 3.92% | +0.08pp | 8.0085 | 8.1857 |
| 同行者 | 1.83% | 1.69% | +0.14pp | 9.2959 | 9.5212 |
| 港湾型 | 0.59% | 0.50% | +0.09pp | 10.7803 | 10.612 |
| 摆渡人 | 4.55% | 6.21% | -1.66pp | 7.6019 | 6.8365 |

判断：候鸟型高频不是 candidate-A 新增问题，baseline 已为 18.91%，candidate-A 为 19.23%。筑巢型低频也不是 candidate-A 新增问题，baseline 为 0.21%，candidate-A 为 0.24%。candidate-A 对整体偏置没有根治，轻微改善筑巢型和部分中低频人格，但同时降低了摆渡人占比。

## 5. 人格路径稳健性测试

每个人格使用上一阶段找到的成功 Top1 答案集，按固定 seed 对真实 60 题答案进行 1 / 3 / 5 / 10 / 15 题扰动，每层每人格 1,000 组。

| 扰动题数 | 平均 Top1 保持率 | 最低保持人格 | 最常替代人格 | 跌出 Top3 比例 |
| --: | --: | -- | -- | --: |
| 1 | 100.00% | 灯塔型 100.0% | - | 0 |
| 3 | 99.94% | 港湾型 99.7% | 月光型 | 0 |
| 5 | 99.53% | 观星者 98.0% | 守门人 | 0 |
| 10 | 94.85% | 筑巢型 87.8% | 月光型 | 0.003 |
| 15 | 82.67% | 筑巢型 63.5% | 月光型 | 0.097 |

判断：1、3、5 题扰动非常稳定；10 题扰动平均保持率 94.85%，筑巢型最低 87.8%；15 题扰动平均 82.67%，筑巢型最低 63.5%，主要流向月光型。筑巢型不是“只能极端答案命中”，但判定区域明显更窄，进入 1.7 时应重点校准。候鸟型在定向路径扰动中不是最脆弱或最垄断的人格，它的问题更像区域位置偏中心，而不是定向路径不稳定。

## 6. 不同作答倾向模拟

每个作答模型 20,000 组，固定 seed。它们不代表真实用户，只用于结构诊断。

| 模型 | Top1 最高 | Top1 最低 | 未出现人格 | 低频人格 | 过高人格 |
| -- | -- | -- | -- | -- | -- |
| middle | 候鸟型 24.87% | 筑巢型 0.03% | - | 筑巢型、港湾型 | 候鸟型 |
| extreme | 候鸟型 15.55% | 筑巢型 0.43% | - | 筑巢型 | - |
| highAgreement | 月光型 81.93% | 探险家 0.00% | 岛屿型、探险家 | 守门人、收藏家、流浪诗人、星火型、镜像型、同行者 | 月光型 |
| lowAgreement | 岛屿型 97.65% | 摆渡人 0.00% | 灯塔型、守门人、筑巢型、月光型、观星者、同行者、港湾型、摆渡人 | 候鸟型、流浪诗人、星火型、镜像型 | 岛屿型 |
| conservative | 候鸟型 27.42% | 筑巢型 0.03% | - | 筑巢型、港湾型 | 候鸟型 |
| volatile | 观星者 81.87% | 港湾型 0.01% | - | 灯塔型、筑巢型、候鸟型、探险家、流浪诗人、月光型、港湾型、摆渡人 | 观星者 |
| constructConsistent | 收藏家 12.01% | 筑巢型 1.86% | - | - | - |
| constructConflict | 收藏家 18.47% | 摆渡人 0.00% | 筑巢型、港湾型、摆渡人 | - | - |

判断：候鸟型在中间倾向、保守型、均匀随机中持续偏高，说明它更容易吸收中间和非极端回答。筑巢型在均匀随机、中间倾向、保守型、极端倾向中持续低频，但在构念一致型中可达 1.86%，说明它不是不可命中，而是需要更一致的构念组合。高同意 / 低同意 / 高波动模型出现月光型、岛屿型、观星者的极端集中，提示结果对作答风格有结构性敏感。

## 7. 可达构念空间诊断

| 人格 | 距模拟中心距离 | 15 半径密度 | 20 半径密度 | 最近邻 | 最近邻距离 | 近似区域体积 | 相对 baseline 体积变化 |
| -- | --: | --: | --: | -- | --: | --: | --: |
| 筑巢型 | 25.8264 | 0 | 0.004 | 港湾型 | 11.8519 | 0.0025 | 0.0001 |
| 候鸟型 | 17.5983 | 0.004 | 0.0931 | 流浪诗人 | 10.9301 | 0.1928 | 0.0038 |

判断：候鸟型距样本中心 17.5983，20 半径密度 0.0931，近似区域体积 0.1928，说明它位于较高密度可达区域；筑巢型距样本中心 25.8264，15 半径密度 0，20 半径密度 0.004，近似区域体积 0.0025，说明它位于可达空间边缘且判定区域窄。candidate-A 对二者区域体积变化很小，问题更接近目标向量几何和可达空间分布共同造成，而不是 candidate-A 单独引入。

## 8. 构念贡献分析

候鸟型 / 筑巢型全样本 Top1 基线：候鸟型 0.1906，筑巢型 0.003。

高影响单题删除敏感性：

| 题号 | 构念 | 删除后候鸟型变化 | 删除后筑巢型变化 |
| -- | -- | --: | --: |
| v2-q54 | MN | -0.0138 | -0.0003 |
| v2-q37 | SI | -0.013 | 0 |
| v2-q58 | MN | -0.013 | 0 |
| v2-q60 | MN | -0.0118 | 0.0003 |
| v2-q56 | MN | -0.0107 | 0 |
| v2-q25 | SI | -0.0098 | 0.0003 |
| v2-q30 | NV | 0.0091 | 0.0003 |
| v2-q01 | SC | -0.0086 | 0.0002 |
| v2-q29 | SI | -0.0086 | 0 |
| v2-q17 | PA | -0.0083 | 0.0003 |

构念删除敏感性：

| 构念 | 删除后候鸟型变化 | 删除后筑巢型变化 |
| -- | --: | --: |
| SC | 0.0118 | -0.0003 |
| AU | -0.0019 | -0.0008 |
| TR | 0.0022 | 0.0004 |
| CL | 0.0059 | -0.0013 |
| PA | 0.0245 | 0.0002 |
| CM | -0.0003 | -0.0026 |
| SI | 0.0229 | 0.0003 |
| NV | -0.0196 | -0.0007 |
| RM | 0.0048 | -0.0014 |
| CS | 0.0022 | 0.0005 |
| EC | 0.0141 | -0.0001 |
| CR | 0.0045 | 0.0003 |
| ER | 0.0043 | -0.0003 |
| RI | -0.0012 | -0.0014 |
| MN | 0.0393 | 0.0003 |

判断：候鸟型受 MN、SI、NV、PA 等构念影响更明显，删除 MN 后候鸟型 Top1 比例上升 3.93pp，说明 MN 对候鸟型有明显区分和抑制作用；删除 NV 后候鸟型下降 1.96pp，说明 NV 是候鸟型重要抬升构念。筑巢型在单题和单构念删除中变化都很小，这不是“某一道题支配结果”，更像整体向量区域太窄或与高密度答案空间距离较远。

构念方差最低的前 8 项：CS 343.8917、EC 344.3291、MN 345.928、RM 346.1088、ER 347.1138、RI 348.2711、SI 348.435、AU 348.5012。各构念方差没有出现单个构念极端塌缩，但有效区分仍受目标向量几何影响。

## 9. 匹配强度展示修正

当前匹配强度不是概率，也不是经过真实样本校准的准确率。本轮已把普通结果页从数值式 `匹配强度 / 100` 改为分级表达：

- 匹配倾向有一定参考价值
- 匹配倾向较明显
- 匹配倾向明显
- 匹配倾向非常明显

结果页口径说明已改为：这是答案与候选人格画像的贴合倾向分级，不是统计概率，也不是心理测量准确率。内部调试数据仍保留原始距离、gap 和 matchScore。

## 10. Beta 32 个缺失资源溯源

溯源规则：检查基线提交 `f9614f5` Git 树、完整 Git 历史、本地历史归档 / 压缩包、引用位置、是否处于可执行路径，以及缺失影响。结论：32 个资源全部为 `missing-before-v2`，没有 `present-at-baseline`、`recoverable-from-history` 或 `required-and-unrecoverable`。

| # | 资源 | 分类 | 基线存在 | 历史提交数 | 引用数 | 建议 |
| --: | -- | -- | -- | --: | --: | -- |
| 1 | `assets/scenes/props/scene-05-eagle.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 2 | `assets/scenes/props/scene-06-fork-road.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 3 | `assets/scenes/props/scene-07-echo-wave.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 4 | `assets/scenes/props/scene-08-lighthouse-signal.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 5 | `assets/scenes/props/scene-09-sand-vow.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 6 | `assets/scenes/props/scene-10-water-reflection.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 7 | `assets/scenes/props/scene-11-floating-words.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 8 | `assets/scenes/props/scene-12-river-stones.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 9 | `assets/scenes/props/scene-13-earth-crack.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 10 | `assets/scenes/props/scene-14-embers.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 11 | `assets/scenes/props/scene-15-new-flower.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 12 | `assets/scenes/props/scene-16-wind-direction.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 13 | `assets/scenes/props/scene-17-distant-campfire.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 14 | `assets/scenes/props/scene-18-crossroad.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 15 | `assets/scenes/props/scene-19-telescope-star.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 16 | `assets/scenes/props/scene-20-shooting-star.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 17 | `assets/scenes/props/scene-21-constellation-map.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 18 | `assets/scenes/props/scene-22-ancient-clock.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 19 | `assets/scenes/props/scene-23-stone-wall-names.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 20 | `assets/scenes/props/scene-24-foundation-stone.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 21 | `assets/scenes/props/scene-25-waiting-person.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 22 | `assets/scenes/props/scene-26-dim-lamp.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 23 | `assets/scenes/props/scene-27-heavy-bag.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 24 | `assets/scenes/props/scene-28-unknown-map.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 25 | `assets/scenes/props/scene-29-mirage-island.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 26 | `assets/scenes/props/scene-30-new-route.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 27 | `assets/scenes/props/scene-31-stranded-ship.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 28 | `assets/scenes/props/scene-32-captain-log.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 29 | `assets/scenes/props/scene-33-old-photo.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 30 | `assets/scenes/props/scene-34-moonlit-water.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 31 | `assets/scenes/props/scene-35-lake-reflection.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |
| 32 | `assets/scenes/props/scene-36-full-moon-lake.svg` | missing-before-v2 | 否 | 0 | 2 | do-not-restore-for-v2; confirm legacy need separately |

判断：这些资源不是 v2 集成导致的新回归，不应创建空白 SVG 或复制近似文件欺骗审计。由于它们仍在旧版 app.js 动态 prop 配置中被引用，旧版特定流程可能产生 prop 级 404 或视觉缺失；若要把 Beta 回滚能力提升到视觉完全恢复，需要下一轮单独确认原始资源包或设计源文件。

## 11. 审计命令退出规则

本轮已拆分：

- `npm run v2:audit:scoring`：只检查 v2 评分分布、稳健性、结构偏置。触发校准条件时退出 1。
- `npm run v2:audit:archive`：只检查 Beta 归档资源。只有基线存在但当前缺失、可恢复关键资源未恢复、或回滚真实流程会损坏时退出 1。
- `npm run v2:audit:all`：顺序执行 scoring 与 archive，即使 scoring 失败也继续执行 archive，最后汇总退出状态。

## 12. 必须回答的问题

1. 19.18% 与 0.22% 的主要原因：候鸟型位于随机可达空间更高密度区域，筑巢型位于可达空间边缘且判定区域窄；candidate-A 不是唯一原因。
2. candidate-A 是否比 baseline 更合理：没有显著放大候鸟 / 筑巢问题，但也没有解决；它对镜像型略有抬升，对摆渡人明显压低，需要进入校准。
3. 筑巢型是否只是理论可达：不是。15 人格可达和扰动测试证明它可达，但随机和中间风格下判定区域很窄。
4. 候鸟型是否占据过大判定区域：是。近似区域体积 0.1928，且中间 / 保守回答中持续偏高。
5. 其他类似问题：港湾型在随机和中间 / 保守模型中也偏低；月光型、岛屿型、观星者在特定作答风格下会极端集中。
6. 最大偏置来源：目标向量几何、可达空间密度、作答风格；不是单题支配。
7. 是否需要进入评分参数校准：需要，建议下一阶段为阶段 1.7。
8. 32 个缺失资源分类：全部 `missing-before-v2`。
9. 必须恢复资源：本轮没有确认必须恢复的资源。
10. 历史死引用：没有直接归为 `dead-reference`；这些是 v2 前已缺失的动态 prop 引用，是否恢复取决于是否要求旧版视觉完全回滚。
11. 是否真正具备 Beta 回滚能力：具备主入口与核心文件追溯能力，但不具备 prop 级视觉完整回滚能力。
12. 是否建议进入阶段二：不建议。应先做阶段 1.7 评分参数校准。

## 13. 风险分级

高风险：candidate-A 仍存在候鸟型区域偏大、筑巢型区域偏窄的问题，不能只凭 15/15 可达进入产品精修。

中风险：匹配强度若继续用精确数字会被误读为准确率；本轮已改为分级表达，但需要回归确认页面展示。

低风险：Beta 32 个缺失 prop 资源不是 v2 回归，但旧版视觉完整回滚仍需原始资源溯源。

## 14. 下一步建议

下一阶段建议进入 `Heart Island v2.0 Alpha 1 — 阶段 1.7：评分参数校准`，范围限定为候选 targetVector / 距离规则 / 低置信规则校准验证。不要进入分享卡、历史、反馈、人格补图或视觉精修。

## 15. 自动化命令结果

| 命令 | 结果 | 说明 |
| -- | -- | -- |
| `npm run v2:audit:scoring` | 未通过，退出码 1 | 脚本真实执行完成；因 candidate-A 仍触发“需要校准”条件而返回 1。 |
| `npm run v2:audit:archive` | 通过 | 32 个缺失资源全部分类为 `missing-before-v2`，没有必须恢复的关键资源。 |
| `npm run v2:audit:all` | 未通过，退出码 1 | 聚合命令先执行 scoring、再执行 archive；scoring 失败、archive 通过，符合拆分后的退出规则。 |
| `npm run v2:validate` | 通过 | 60 题、15 构念、15 人格数据校验通过；375 / 390 / 430 / Edge 390 浏览器流程通过。 |
| `npm run check` | 通过 | Beta 旧版一致性、calibrationB 概率审计和选项审计通过。 |
| `npm test` | 通过 | 当前指向 `npm run check`，通过。 |

`v2:audit:scoring` 和 `v2:audit:all` 的失败不是脚本崩溃，而是阶段 1.6 诊断结论：candidate-A 需要进入下一阶段校准。
