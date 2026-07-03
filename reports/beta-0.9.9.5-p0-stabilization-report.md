# 心岛计划 Beta 0.9.9.5 P0 工程稳定报告

## 1. 总结结论

本轮已完成 Beta 0.9.9.5 公开测试前 P0/P1 工程稳定处理：

- 移动端首页首屏 CTA 已通过 375px / 390px / 430px 验证，首屏可见标题、核心说明、补充信息和「开启心岛航行」按钮。
- 当前开发与测试权威源明确为项目根目录；`deploy` 已同步为 Beta 0.9.9.5 部署镜像；`release` 保持历史快照。
- `package.json` 版本已统一为 `0.9.9.5-beta`，页面展示和当前运行入口版本统一为 `Beta 0.9.9.5`。
- 评分 / 审计生产口径明确为 `calibrationB`，新增 `audit:probability:live`，`check` 与 `test` 默认走生产口径。
- 前台主结果边界继续收敛为 12 核心人格；全 20 类型仅保留为历史兼容、debug / audit 数据池。
- 本轮没有修改 36 题题库、人格文案、评分参数、人格 targetVector。

## 2. 本轮修改文件清单

| 文件/目录 | 修改内容 |
| --- | --- |
| `index.html` | 首页版本展示改为 `Beta 0.9.9.5`；首页补充信息改为 `36 道题 · 约 5 分钟 · 生成你的心岛人格卡`。 |
| `app.js` | 文件头、反馈导出标题、本地保存 version、测试套件显示版本统一为 Beta 0.9.9.5；前台匹配默认收敛到 core；debug 全量池命名边界更清楚。 |
| `styles.css` | 文件头版本统一；增加移动端首页首屏 CTA 的轻量布局压缩规则。 |
| `package.json` | version 改为 `0.9.9.5-beta`；新增 / 调整 `check`、`test`、`audit:probability:live`。 |
| `package-lock.json` | 根包版本同步为 `0.9.9.5-beta`。 |
| `scripts/inspect-ui.mjs` | 调整为 Beta 0.9.9.5 移动端截图与 CTA 验证脚本。 |
| `deploy/index.html` | 同步根目录当前入口。 |
| `deploy/app.js` | 同步根目录当前入口。 |
| `deploy/styles.css` | 同步根目录当前样式。 |
| `deploy/package.json` | 同步当前 package version 与 scripts。 |
| `reports/probability-audit-calibrationB.md` | 由生产口径审计命令重新生成。 |
| `reports/probability-audit-calibrationB.json` | 由生产口径审计命令重新生成。 |
| `reports/option-result-alignment-audit.json` | 由选项审计命令重新生成。 |
| `reports/screenshot-home-375px-beta-0.9.9.5.png` | 新增首页 375px 截图。 |
| `reports/screenshot-home-390px-beta-0.9.9.5.png` | 新增首页 390px 截图。 |
| `reports/screenshot-home-430px-beta-0.9.9.5.png` | 新增首页 430px 截图。 |
| `reports/screenshot-quiz-390px-beta-0.9.9.5.png` | 新增做题页 390px 截图。 |
| `reports/screenshot-result-390px-beta-0.9.9.5.png` | 新增结果页 390px 截图。 |
| `reports/beta-0.9.9.5-p0-stabilization-report.md` | 新增本轮 P0 工程稳定报告。 |

## 3. 首页首屏 CTA 修复说明

本轮采用轻量 CSS 调整，没有重写首页 DOM：

- 压缩移动端 `#intro-screen` 顶部留白和标题区间距。
- 将核心补充信息提前到 CTA 上方。
- 将主按钮固定在移动端首屏关键区域，按钮 `min-height` 为 54px，满足不小于 44px 的点击目标。
- 将卖点卡、免责声明、次级入口排序下移，避免挤占首屏 CTA。
- 保留现有深海、星图、心岛、航行氛围，没有替换素材或重做视觉体系。

验证结果：

| 宽度 | 标题 | 核心说明 | 补充信息 | 主按钮首屏可见 | CTA 高度 | 横向溢出 |
| ---: | --- | --- | --- | --- | ---: | --- |
| 375px | 通过 | 通过 | 通过 | 通过 | 54px | 无 |
| 390px | 通过 | 通过 | 通过 | 通过 | 54px | 无 |
| 430px | 通过 | 通过 | 通过 | 通过 | 54px | 无 |

## 4. 版本统一说明

本轮统一当前运行入口版本为：

- 页面展示版本：`Beta 0.9.9.5`
- package version：`0.9.9.5-beta`
- `app.js` 文件头版本：`Beta 0.9.9.5`
- `app.js` 反馈导出标题：`心岛计划 Beta 0.9.9.5 — 反馈数据`
- `app.js` 本地保存数据 version：`0.9.9.5`
- `styles.css` 文件头版本：`Beta 0.9.9.5`

说明：历史报告、历史 release 快照、部分脚本内部历史标题没有批量改写，避免制造历史记录噪音。

## 5. 发布权威源说明

| 文件/目录 | 修改前状态 | 修改后状态 | 是否当前权威入口 | 备注 |
| ----- | ----- | ----- | -------- | -- |
| 根目录 `index.html` / `app.js` / `styles.css` | 盘点报告记录为 Beta 0.9.9.4 RC 主线 | 已统一为 Beta 0.9.9.5 | 是 | 当前开发、测试、验收的权威源。 |
| 根目录 `package.json` | version 与脚本口径不够统一 | version 为 `0.9.9.5-beta`，`check` / `test` 默认走生产口径 | 是 | 当前 npm 命令权威源。 |
| `deploy/` | 报告记录存在旧版本入口风险 | 已同步当前根目录主入口与 package 信息 | 部署镜像 | 如需发布静态文件，可使用该目录；源头仍以根目录为准。 |
| `release/` | 历史发布快照 | 未修改 | 否 | 仅作为历史归档，不作为当前测试入口。 |
| `reports/` | 历史审计和发布记录 | 新增本轮报告和截图；不批量改旧报告 | 否 | 只保存记录，不作为运行入口。 |

## 6. 评分 / 审计口径统一说明

当前生产评分口径明确为：

- Profile：`calibrationB`
- 生产检查命令：`npm run audit:probability:live`
- 一键检查命令：`npm run check`
- 默认测试命令：`npm test`

本轮没有修改评分算法、评分参数、人格 targetVector。调整重点是降低误用风险：

- `audit:probability:live` 显式执行 `node scripts/probability-audit.mjs --profile calibrationB`。
- `check` 串联 `test:consistency`、`audit:probability:live`、`audit:options`。
- `test` 指向 `check`，避免 `npm test` 与生产审计口径脱节。
- `app.js` 中前台主结果匹配默认走 12 核心人格池；全 20 匹配保留在 debug 路径。

## 7. 12 核心人格防误用说明

官方 12 核心人格仍为：

1. 灯塔型
2. 守门人型
3. 筑巢型
4. 收藏家型
5. 候鸟型
6. 岛屿型
7. 探险家型
8. 流浪诗人型
9. 星火型
10. 月光型
11. 镜像型
12. 观星者型

本轮边界处理：

- 前台主结果、结果页 Hero、分享卡、可见 Top5 继续以 12 核心人格为主。
- `matchAllTypes` 在 `app.js` 中默认参数收敛为 `core`。
- `debugAllTypeMatches` 明确为全 20 历史 / debug 数据池，不作为前台主结果来源。
- 旧 8 分支人格未删除，继续作为历史兼容、debug / audit 或归档数据存在。
- 全 20 类型审计能力没有移除，但生产检查脚本默认不把它作为前台主结果池。

## 8. 新增或调整的 npm scripts

当前关键 scripts：

```json
{
  "check": "npm run test:consistency && npm run audit:probability:live && npm run audit:options",
  "test": "npm run check",
  "audit:probability": "node scripts/probability-audit.mjs",
  "audit:probability:live": "node scripts/probability-audit.mjs --profile calibrationB",
  "audit:options": "node scripts/option-alignment-audit.mjs",
  "test:consistency": "node scripts/consistency-test.mjs",
  "ui:inspect": "node scripts/inspect-ui.mjs"
}
```

## 9. 实际运行命令和结果

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `npm run test:consistency` | 通过 | 确认 LIVE_PROFILE 为 `calibrationB`，LIVE_PARAMS 与 `calibrationB` 一致。 |
| `npm run audit:probability -- --profile calibrationB` | 通过 | 12 核心主岛自匹配 12/12；未出现人格 0。 |
| `npm run audit:options` | 通过 | 12 核心维度路径 12/12；黄金路径全 20 为 17/20，旧分支仍有历史风险。 |
| `npm run check` | 通过 | 串联 consistency、production probability audit、options audit。 |
| `npm test` | 通过 | 当前指向 `npm run check`。 |
| `npm run ui:inspect` | 通过 | 生成首页、做题页、结果页移动端截图；首页 CTA 验证通过。 |

## 10. 移动端截图验证结果

截图输出：

- `reports/screenshot-home-375px-beta-0.9.9.5.png`
- `reports/screenshot-home-390px-beta-0.9.9.5.png`
- `reports/screenshot-home-430px-beta-0.9.9.5.png`
- `reports/screenshot-quiz-390px-beta-0.9.9.5.png`
- `reports/screenshot-result-390px-beta-0.9.9.5.png`

首页自动检查结果：

- 375px：CTA 通过，按钮底部位于首屏内，CTA 高度 54px，无横向溢出。
- 390px：CTA 通过，按钮底部位于首屏内，CTA 高度 54px，无横向溢出。
- 430px：CTA 通过，按钮底部位于首屏内，CTA 高度 54px，无横向溢出。

## 11. 是否改动题库 / 文案 / 评分参数

| 项目 | 本轮是否改动 | 说明 |
| --- | --- | --- |
| 36 题题库 | 否 | 未修改题目内容、题序、选项结构。 |
| 人格名称 | 否 | 未新增、删除或重命名人格。 |
| 人格结果文案 | 否 | 未重写结果页人格文案。 |
| 评分算法 | 否 | 未修改计算公式。 |
| 评分参数 | 否 | 未修改 `coreWeight`、`metBonus`、`failPenalty` 等参数。 |
| 人格 targetVector | 否 | 未修改任何人格向量。 |
| 视觉资产 | 否 | 未替换图片或新增素材。 |

## 12. 遗留问题

- `core/scoring.mjs` 仍保留可审计全 20 类型的能力；这是历史兼容需要，但后续新增功能时必须避免直接拿全 20 池做前台主结果。
- `reports/probability-audit-calibrationB.md` 的标题仍沿用历史审计标题格式，不代表当前页面版本；本轮没有批量重写历史审计模板。
- `audit:options` 显示全 20 黄金路径为 17/20，主要问题集中在旧分支人格；12 核心维度路径为 12/12。
- 本轮只验证首页 CTA、做题页和结果页截图，不等同于完整 e2e 公开发布回归。

## 13. 下一步建议

- P0：公开测试前继续保持根目录为唯一开发测试权威源，发布时只从根目录同步到 `deploy`。
- P1：在 1.0 RC 前整理 `core/scoring.mjs` 与审计脚本命名，进一步降低 baseline / calibrationB / all20 的理解成本。
- P1：补一条专门检查“前台可见结果只来自 12 核心人格”的自动化断言。
- P2：基于本轮截图，继续做结果页分享卡传播质量检查，但不要在 P0 稳定分支里展开大 UI 改版。
