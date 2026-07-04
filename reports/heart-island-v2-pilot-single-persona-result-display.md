# 心岛 v2.0 内测单人格结果页展示报告

## 1. 总结结论

本轮已将 v2 内测普通测试者结果页调整为“前台单人格，后台多人格”：

- 普通测试者只看到一个最终主人格。
- 不显示 Top2 / Top3 人格名、Top5、相似度、距离、gap、lowConfidence、baseline / candidate-A。
- 内部 JSON 继续保留 Top5、gap、lowConfidence、baseline / candidate-A。
- `tools/v2-pilot/review.html` 继续作为内部研究视图显示完整数据。

本轮未修改题库、分值、baseline、candidate-A、距离算法、低置信规则或生产代码。

## 2. 为什么普通用户只展示一个人格

普通用户打开结果页时，首先需要完成身份认领，而不是理解算法边界。Top2、Top3、gap 和低置信信息会把用户注意力从“我是谁”转向“算法是否确定”，削弱结果页的情绪命中和反馈有效性。

因此普通页只展示一个主人格，并用关系行为、优势、盲点和构念解释帮助用户判断贴合度。

## 3. 为什么后台仍保留 Top2 / Top3

Top2 / Top3、Top5、gap、distance、similarity 和 lowConfidence 仍然对研究有效：

- 用于判断人格边界是否稳定；
- 用于分析候选 targetVector 是否需要校准；
- 用于 review 真实样本；
- 用于后续内部统计和回放。

隐藏前台信息不等于丢失后台数据。

## 4. 低置信结果如何调整措辞

内部仍使用原有 lowConfidence 规则，不修改算法。

普通页措辞调整为：

- 非低置信：`你的心岛人格是 X`
- 低置信：`你的核心关系倾向更接近 X`

普通页不显示：

- 低置信
- gap
- 差距较小
- 与某人格接近
- 结果不确定

## 5. 相邻人格特征如何融合

普通页不会展示 Top2 / Top3 名称。代码通过 `blendedPersonalization` 标记，只在满足以下条件时吸收相邻特征：

1. 主人格仍以 Top1 为中心；
2. 只吸收用户实际高分构念支持的相邻特征；
3. 不拼接完整 Top2 人格；
4. 不产生互相矛盾的描述；
5. 导出 JSON 记录 `blendedPersonalizationUsed` 和 `blendedConstructs`。

真实样本中导出结果为：

- `publicDisplayedPersona: 流浪诗人`
- `publicResultWordingMode: tendency`
- `blendedPersonalizationUsed: true`
- `blendedConstructs: ["AU"]`

页面正文也保留了回忆、细节、记忆等高构念解释。

## 6. 普通结果页与 review 页的区别

| 页面 | 面向对象 | 展示内容 |
| --- | --- | --- |
| 普通结果页 | 真实测试者 | 单一主人格、命中句、关键词、关系解析、优势、盲点、关系需要、构念解释、反馈 |
| review 页 | 内部研究者 | baseline / candidate-A、Top5、Top1/Top2、similarity、distance、gap、lowConfidence、相邻人格对比 |

`review.html` 没有同步到 `pilot-deploy/v2/`。

## 7. 修改文件

- `reports/heart-island-v2-result-page-structure-audit.md`
- `reports/heart-island-v2-pilot-single-persona-result-display.md`
- `tools/v2-pilot/result-explanation.mjs`
- `tools/v2-pilot/app.mjs`
- `tools/v2-pilot/index.html`
- `tools/v2-pilot/styles.css`
- `tools/v2-pilot/review.html`
- `tools/v2-pilot/review.mjs`
- `pilot-deploy/v2/result-explanation.mjs`
- `pilot-deploy/v2/app.mjs`
- `pilot-deploy/v2/index.html`
- `pilot-deploy/v2/styles.css`
- `pilot-deploy/v2/pilot-manifest.json`
- `scripts/v2-validation/analyze-v2-pilot-results.mjs`

## 8. 未修改内容

- 未修改生产 `app.js`
- 未修改生产 `index.html`
- 未修改生产 `styles.css`
- 未修改 `core/scoring.mjs`
- 未修改 `core/calibration-profiles.mjs`
- 未修改 60 题题库文字
- 未修改选项分值
- 未修改 baseline
- 未修改 candidate-A
- 未修改距离算法
- 未修改低置信规则
- 未推送 main/master

## 9. 真实样本普通页回放结果

样本：

`pilot-data/inbox/pilot-44370beb-2026-07-04.json`

样本内部结果：

- Top1：流浪诗人
- Top2：收藏家
- Top3：候鸟型
- gap：0.8298
- lowConfidence：true

普通页验收：

| 检查项 | 结果 |
| --- | --- |
| 只显示流浪诗人 | 通过 |
| 不显示收藏家 | 通过 |
| 不显示候鸟型 | 通过 |
| 不显示 Top3 / 排行 | 通过 |
| 不显示 gap 0.8298 | 通过 |
| 不显示低置信 | 通过 |
| 不显示 similarity / distance | 通过 |
| 使用“你的核心关系倾向更接近流浪诗人” | 通过 |
| 正文融合回忆 / 细节 / 记忆解释 | 通过 |
| 解释低 CL 不等于没有感情 | 通过 |
| 375 / 390 / 430 无横向溢出 | 通过 |
| Console JS 错误 | 未发现 |
| 核心资源失败请求 | 未发现 |

## 10. 真实样本 review 页回放结果

`tools/v2-pilot/review.html` 回放结果：

| 检查项 | 结果 |
| --- | --- |
| 显示内部研究视图标识 | 通过 |
| 显示流浪诗人 | 通过 |
| 显示收藏家 | 通过 |
| 显示候鸟型 | 通过 |
| 显示 gap 0.8298 | 通过 |
| 显示低置信 | 通过 |
| 显示 baseline | 通过 |
| 显示 candidate-A | 通过 |
| baseline / candidate-A 两张内部卡 | 通过 |
| Console JS 错误 | 未发现 |

## 11. 导出数据

新导出 JSON 新增：

- `publicDisplayedPersona`
- `publicResultWordingMode`
- `blendedPersonalizationUsed`
- `blendedConstructs`
- `publicResultVersion`

继续保留：

- `baselineTop5`
- `candidateATop5`
- `baselineGap`
- `candidateAGap`
- `baselineLowConfidence`
- `candidateALowConfidence`
- `resultAgreement`

## 12. 分析脚本兼容

`scripts/v2-validation/analyze-v2-pilot-results.mjs` 已兼容新 schema：

- 新单人格样本可以进入有效准确度统计；
- 旧样本仍被识别为 `legacy result did not include sufficient persona explanation`；
- 新样本不再因为缺少 `top3ContainsFit` 而被判无效。

验收：

- 新导出样本：`flowValidSamples: 1`，`fitValidSamples: 1`
- 旧真实样本：`flowValidSamples: 1`，`fitJudgmentValid: false`

## 13. 是否修改评分逻辑

没有。

## 14. 是否修改生产代码

没有。

## 15. 是否可以恢复 3～5 人测试

可以恢复 3～5 人烟雾测试，但建议使用新的 `pilot-deploy/v2` 包，并明确不要再用旧结果页收集准确度判断。旧样本可用于流程和 review 回放，不可纳入准确度统计。

