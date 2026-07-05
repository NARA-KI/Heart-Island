# 心岛 v2.0 Alpha 1 阶段 1.8 人工语义复核与小样本盲测准备报告

## 1. candidate-E最终门槛摘要

- candidate-E 已冻结，本阶段未继续调参，未创建 candidate-F/G。
- candidate-E targetVector SHA-256：`64ed6fb93959dddb34de43bdbec3fbec0ed489507507f80998131fed684a4f33`
- candidate-E profile SHA-256：`9f93317f978f5322266d5485187bdc59db3cfb8c5c653674c128fec13bafbf13`
- uniform最高人格：候鸟型
- uniform最低人格：筑巢型
- Top1/Top2近并列率：90.47%
- 低置信结果比例：90.47%
- candidate-E与candidate-A结果分歧比例：28.20%

## 2. highAgreement、lowAgreement、volatile最终数据

- highAgreement峰值：月光型 72.03%
- lowAgreement峰值：岛屿型 66.81%
- volatile峰值：观星者 80.25%
- middle峰值：候鸟型 23.73%
- conservative峰值：候鸟型 28.14%
- constructConsistent最高：收藏家 11.47%
- constructConsistent最低：筑巢型 2.37%
- volatile风险判断：candidate-E未高于candidate-A。

## 3. candidate-E完整15人格分布

| 人格 | Top1次数 | 占比 |
| --- | ---: | ---: |
| 灯塔型 | 3975 | 3.98% |
| 守门人 | 12038 | 12.04% |
| 筑巢型 | 630 | 0.63% |
| 收藏家 | 11924 | 11.92% |
| 候鸟型 | 15619 | 15.62% |
| 岛屿型 | 6965 | 6.97% |
| 探险家 | 5364 | 5.36% |
| 流浪诗人 | 5613 | 5.61% |
| 星火型 | 6772 | 6.77% |
| 月光型 | 5074 | 5.07% |
| 镜像型 | 11415 | 11.42% |
| 观星者 | 4947 | 4.95% |
| 同行者 | 2203 | 2.20% |
| 港湾型 | 1230 | 1.23% |
| 摆渡人 | 6231 | 6.23% |

港湾型uniform占比：1.23%

## 4. candidate-E与A结果分歧比例

- 分歧样本数：28197 / 100000
- 分歧比例：28.20%

## 5. 人工语义复核完成状态

已整理 `reports/heart-island-v2-persona-semantic-review.md` 为可填写人工评审表。当前状态：未完成。人工评审未完成前不得切换公开profile。

## 6. pilot入口

内部盲测入口：`/?pilot=1`。普通首页不展示该入口。

## 7. 反馈字段

收集：总体符合度、核心描述符合度、关系需求符合度、惯性与风险符合度、成长建议帮助度、X/Y符合度、哪个更像、哪个更有帮助、明显不符合内容、最不符合的一句话、难选题、是否过长、是否愿意分享。

## 8. 数据导出方式

- 单次 JSON 导出；
- 多份 JSON 本地导入汇总；
- 汇总 CSV 导出；
- 可复制简短试测结果码。

## 9. 隐私字段检查

导出字段不包含姓名、手机号、微信号、身份证、精确地址或与试测无关的个人信息。

## 10. 自动化测试结果

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| npm run v2:calibrate | 通过 | 冻结candidate-E门槛摘要与SHA复核，不重新搜索参数 |
| npm run v2:audit:calibration | 通过 | 公开profile仍为candidate-a，candidate-E可加载 |
| npm run v2:validate | 通过 | 375/390/430与Edge 390流程验收通过 |
| npm run check | 通过 | Beta 0.9.9.7既有检查通过 |
| npm test | 通过 | 当前等同于npm run check |
| npm run v2:audit:archive | 通过 | 32项缺失资源均为missing-before-v2 |
| npm run v2:validate:pilot | 通过 | 内部pilot真实点击验收通过 |
| pilot:public-entry-hides-pilot | 通过 |  |
| pilot:pilot-agreement-flow | 通过 |  |
| pilot:pilot-blind-xy-flow | 通过 |  |

## 11. 是否建议开始5-10人调试轮

建议在人工语义复核至少完成首轮后，开始5-10人调试轮。调试轮只用于发现流程、文案和导出问题，不用于判断人格分布。

## 12. 是否切换公开profile

不切换。公开 `V2_SCORING_PROFILE` 仍为 `candidate-a`。

## 13. 是否进入阶段二

不进入。完成5-10人调试轮和至少30个有效小样本前，不建议进入阶段二。
