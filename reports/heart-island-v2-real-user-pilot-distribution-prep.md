# 心岛 v2.0 外部内测分发准备报告

## 1. 本轮目标

本轮目标是把已完成的隔离内测工具整理成可供外部真实用户访问、完成、导出并提交匿名测试数据的静态内测包。

本轮没有发布远程网址，没有修改生产代码，没有接入正式产品，也没有把 candidate-A 写成正式参数。

## 2. 新增与修改文件

| 文件/目录 | 说明 |
| --- | --- |
| `pilot-deploy/v2/` | 独立可部署静态内测包 |
| `pilot-deploy/v2/TESTER-GUIDE.md` | 测试者说明 |
| `pilot-deploy/v2/pilot-manifest.json` | 工具版本、评分规则版本和数据 hash |
| `tools/v2-pilot/app.mjs` | 增加版本标识、稳定 pilotId、复制结果代码、未导出提示、部署模式 |
| `tools/v2-pilot/scoring.mjs` | 增加匿名结果代码编码/解码 |
| `tools/v2-pilot/index.html` | 增加测试者说明、完成三步和导出提示 |
| `tools/v2-pilot/styles.css` | 增加说明区、完成步骤、复制代码样式 |
| `scripts/v2-validation/analyze-v2-pilot-results.mjs` | 增强 schema、版本、hash、题号、重复样本和 fixture 校验 |
| `reports/heart-island-v2-pilot-recruitment-and-collection-guide.md` | 组织者招募与数据收集说明 |
| `reports/heart-island-v2-real-user-pilot-distribution-prep.md` | 本报告 |

## 3. 未修改的生产文件

未修改：`app.js`、`index.html`、`styles.css`、`core/scoring.mjs`、`core/calibration-profiles.mjs`、`deploy/`、`release/`、Beta 0.9.9.7 正式题库、生产人格数据。

## 4. 独立部署包结构

`pilot-deploy/v2/` 当前包含：

| 文件 | 用途 |
| --- | --- |
| `index.html` | 内测入口 |
| `app.mjs` | 独立页面逻辑，只读取本目录数据 |
| `scoring.mjs` | v2 草案评分逻辑 |
| `styles.css` | 页面样式 |
| `question-bank.v2.draft.json` | 60 题候选题库 |
| `persona-target-vectors.v2.baseline.json` | baseline 向量 |
| `persona-target-vectors.v2.candidate-a.json` | candidate-A 向量 |
| `pilot-manifest.json` | 版本与 hash manifest |
| `TESTER-GUIDE.md` | 测试者说明 |

该目录不包含 `node_modules`、`reports`、`release`、正式 `deploy` 镜像或正式产品代码。

## 5. 版本与 hash 标识

页面和导出 JSON 包含：

| 字段 | 当前值 |
| --- | --- |
| `pilotToolVersion` | `v2.0-real-user-pilot-distribution-prep` |
| `scoringRuleVersion` | `v2-draft-rms-distance-low-confidence-v1` |
| `questionBankHash` | `1b101a0a9a7e9b8e1e45ce22bf96dc88f2dd0781d71b931b2062a4c3cd1400e9` |
| `baselineVectorHash` | `ecd622dfb5f58d42ecad6161d8b71f0c2de505c9eac2e865ec038f92ce9248e3` |
| `candidateAVectorHash` | `f656ae63cf4f8eb1f398e92005996b347ea3348cda8894baa3b145a096c5ecd3` |
| `exportedAt` | 导出时生成 |

## 6. 测试完成和导出流程

结果页明确分成三步：

1. 查看匿名结果。
2. 完成反馈。
3. 下载匿名测试文件。

下载按钮文案为“下载匿名内测结果”。下载后页面显示提示：

“请将刚刚下载的 JSON 文件发送给测试组织者。文件不包含姓名、手机号或聊天记录。”

页面同时提供“复制匿名结果代码”作为备用方式。该代码以 `HI2PILOT:` 开头，可被分析脚本还原。

## 7. 数据校验

分析脚本已增强：

- JSON / 结果代码解析；
- 必填字段校验；
- 版本和 hash 校验；
- `answerSequence` 长度检查；
- 60 题完整性检查；
- 重复 `pilotId` 检查；
- fixture / 开发验收数据识别；
- 无效样本单独列表；
- 有效样本和无效样本分开统计；
- 不静默跳过错误数据。

已验证旧开发导出会被识别为无效样本并以退出码 `2` 返回，不参与统计。

## 8. fixture 入口隔离

部署包 `pilot-deploy/v2/app.mjs` 固定为部署模式：

- 不读取 `drafts/v2`；
- 不读取 `simulation-fixtures`；
- `?fixture=...` 不会预填答案；
- 验收结果：`testFixtureId = null`，`answerCount = 0`。

## 9. 局域网测试方式

可在项目根目录启动：

```bash
python -m http.server 4174 --bind 0.0.0.0
```

然后组织者提供本机局域网 IP，例如：

```text
http://局域网IP:4174/pilot-deploy/v2/
```

说明：

- 只适合同一 Wi-Fi。
- Windows 防火墙可能需要允许 Python 访问专用网络。
- 不适合远程测试者。
- 不会自动上传测试 JSON。

## 10. 远程静态部署准备

可以将 `pilot-deploy/v2/` 单独部署到用户明确指定的静态托管平台。

要求：

- 不自动上传测试 JSON；
- 不使用正式产品域名；
- 页面明确标注内部验证；
- 用户未明确指定托管平台前，不执行部署。

本轮没有发布任何远程网址。

## 11. 移动端与浏览器验收

本地服务：

```text
http://127.0.0.1:4174/pilot-deploy/v2/
```

移动端宽度：

| 宽度 | 开始按钮可见 | 横向溢出 | JS 错误 |
| ---: | --- | --- | --- |
| 375 | 通过 | 无 | 无 |
| 390 | 通过 | 无 | 无 |
| 430 | 通过 | 无 | 无 |

浏览器流程：

| 浏览器 | 结果 |
| --- | --- |
| Edge | 完整 60 题、反馈、下载 JSON、复制代码、分析脚本读取均通过 |
| Chrome | 本机未安装 Playwright Chrome channel，无法直接验收 |
| Chromium fallback | 完整 60 题、导出、分析脚本读取通过，用作 Chrome 内核兼容补充 |

其他验收：

| 项目 | 结果 |
| --- | --- |
| 独立部署包运行 | 通过 |
| 不依赖 `drafts/v2` 外部路径 | 通过 |
| fixture 参数禁用 | 通过 |
| baseline / candidate-A 双方案计算 | 通过 |
| JSON 包含版本 hash | 通过 |
| 导出 JSON 被分析脚本读取 | 通过 |
| 复制结果代码被分析脚本还原 | 通过 |
| 刷新前未导出提示 | 通过 |
| 自动外部网络上传请求 | 未发现 |

## 12. 数据隐私

页面默认只保存在当前浏览器本地，不自动上传服务器。

不得采集：

- 姓名；
- 手机号；
- 身份证；
- 精确位置；
- 详细住址；
- 聊天记录；
- 伴侣个人信息。

建议收集目录：

```text
pilot-data/inbox/
```

`pilot-data/` 已在 `.gitignore` 中忽略，不得提交真实用户 JSON。

## 13. 3～5 人烟雾测试方案

先招募 3-5 人，只观察流程问题：

- 是否能打开页面；
- 是否理解开始说明；
- 是否能坚持完成 60 题；
- 实际完成时间；
- 是否知道如何返回上一题；
- 是否理解匿名 A/B 结果；
- 是否顺利完成反馈；
- 是否成功下载 JSON；
- 是否知道如何把文件发给组织者；
- 是否出现手机浏览器兼容问题。

如果 3-5 人中出现 2 人以上无法完成测试、2 人以上无法导出数据、多人反馈题目明显看不懂、JSON 无法分析、匿名映射错误或手机端阻断问题，应暂停招募。

## 14. 20～30 人正式小样本方案

20-30 人阶段用于第一次比较 baseline 与 candidate-A。

建议覆盖单身、恋爱中、有较长关系经历、慢热、高表达、高边界、高投入、偏现实规划、偏理想与情绪感受的人群。

不要刻意凑齐 15 种人格。不得用 20-30 人样本宣称心理学统计效度。

## 15. 当前风险

- Chrome channel 未在本机安装，本轮只能用 Edge 和 Chromium fallback 完整验收。
- 局域网 HTTP 在不同手机浏览器上的下载体验仍需要 3-5 人烟雾测试确认。
- 结果代码可能较长，JSON 下载仍应作为主要提交方式。
- 当前仍是内测工具，不应被误当作公开正式产品。

## 16. 是否建议立即公开发布

不建议。

当前只适合受控小范围内测，不适合公开发布或对外宣传。

## 17. 是否建议开始 3～5 人烟雾测试

建议开始。

目标是验证外部用户真实流程，不调整 targetVector，不做统计结论。

## 18. 是否建议开始 20～30 人测试

不建议立即开始。

应先完成 3-5 人烟雾测试，确认打开、完成、导出、提交、分析全链路稳定后，再扩大到 20-30 人。

## 19. 是否建议修改生产代码

不建议。

本轮仍是 v2 内测分发准备，不应修改 `app.js`，不应进入生产接入准备。

## 最终结论

| 问题 | 结论 |
| --- | --- |
| 独立部署包路径 | `pilot-deploy/v2/` |
| 是否可以独立运行 | 是 |
| fixture 参数是否禁用 | 是 |
| JSON 是否包含版本 hash | 是 |
| 分析脚本是否完成数据校验 | 是 |
| 局域网测试是否可用 | 是，使用 `python -m http.server 4174 --bind 0.0.0.0` |
| 是否已经发布远程网址 | 没有 |
| 3～5 人烟雾测试是否可以开始 | 可以 |
| 20～30 人测试是否可以立即开始 | 不建议 |
| 是否修改生产代码 | 没有 |
| 是否建议进入生产接入准备 | 不建议 |
