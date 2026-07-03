# 心岛计划 Beta 0.9.9.7 结果认领感与过渡收敛报告

## 1. 总结结论

本轮完成 Beta 0.9.9.7 的结果页认领感与结尾过渡收敛，改动集中在结果页 Hero、答题结束过渡、版本标识、验证脚本和报告。

- 结果页移动端拟人图从 Beta 0.9.9.6 的约 176px 宽提升到 258px 宽，成为 Hero 主视觉之一。
- 移动端结果页顺序调整为：人格名优先，其后是拟人图，再看匹配度、关键词、命中句和分享入口。
- 答题完成到结果页之间只保留一个核心过渡视觉：`assets/result/silver-lake.webp`。
- 当前主流程不再调用 reveal 阶段的 `voyage.webp -> main-island.webp` 二次切图。
- 首页和做题页保持 Beta 0.9.9.6 的简化成果，本轮没有继续大改。
- 分享卡模板未重做，只验证 Hero 分享入口可点击、分享卡可生成。
- 本轮没有修改 36 题题库、人格文案、关键词、命中句、评分算法、评分参数或 targetVector。

## 2. 本轮修改文件清单

| 文件 | 修改内容 |
| --- | --- |
| `index.html` | 页面展示版本改为 `Beta 0.9.9.7`。 |
| `app.js` | 版本标识统一到 0.9.9.7；结尾过渡从 ending + reveal 二段式收敛为 ending 单图后直接进入结果页。 |
| `styles.css` | 结果页拟人图放大；移动端 Hero 顺序调整；隐藏 ending 里的多节点/星标路线元素；版本注释更新。 |
| `package.json` | version 改为 `0.9.9.7-beta`。 |
| `package-lock.json` | 根包 version 同步为 `0.9.9.7-beta`。 |
| `scripts/inspect-ui.mjs` | 截图版本改为 0.9.9.7；新增过渡页截图、单图过渡断言、拟人图宽度断言。 |
| `deploy/index.html` | 同步当前根目录入口。 |
| `deploy/app.js` | 同步当前根目录入口。 |
| `deploy/styles.css` | 同步当前根目录样式。 |
| `deploy/package.json` | 同步当前 package 信息。 |
| `reports/screenshot-home-375px-beta-0.9.9.7.png` | 新增 / 更新首页 375px 截图。 |
| `reports/screenshot-home-390px-beta-0.9.9.7.png` | 新增 / 更新首页 390px 截图。 |
| `reports/screenshot-home-430px-beta-0.9.9.7.png` | 新增 / 更新首页 430px 截图。 |
| `reports/screenshot-quiz-390px-beta-0.9.9.7.png` | 新增 / 更新做题页 390px 截图。 |
| `reports/screenshot-transition-390px-beta-0.9.9.7.png` | 新增结尾过渡页 390px 截图。 |
| `reports/screenshot-result-390px-beta-0.9.9.7.png` | 新增 / 更新结果页 390px 截图。 |
| `reports/probability-audit-calibrationB.md` / `.json` | 审计命令运行后更新。 |
| `reports/option-result-alignment-audit.json` | 审计命令运行后更新。 |
| `reports/beta-0.9.9.7-result-identity-transition-polish-report.md` | 新增本报告。 |

## 3. 版本统一说明

当前运行入口已统一为：

- 页面显示：`Beta 0.9.9.7`
- `package.json`：`0.9.9.7-beta`
- `package-lock.json`：`0.9.9.7-beta`
- `app.js` 文件头：`Beta 0.9.9.7`
- `app.js` 本地保存数据：`version: '0.9.9.7'`
- `app.js` 反馈导出：`心岛计划 Beta 0.9.9.7 — 反馈数据`
- `styles.css` 文件头：`Beta 0.9.9.7`
- `deploy` 四个入口文件已同步 0.9.9.7

历史 reports 和 release 快照未批量修改。

## 4. 结果页拟人图视觉权重调整说明

Beta 0.9.9.6 结果页拟人图在移动端约 176px 宽，用户反馈仍像“报告配图”。本轮将移动端拟人图提升为身份卡核心视觉：

- 移动端 `.hero-portrait-wrap` 最大宽度提升到 `min(74vw, 258px)`。
- 自动验收结果：390px 视口下拟人图宽度为 258px。
- Hero 排序调整为：档案标识、核心主岛、人格式标题、副标题、拟人图、匹配度、关键词、命中句、分享入口。
- 分享入口保留但弱化为次级行动，不再压过拟人图。
- 桌面端拟人图最大宽度从 380px 提升到 460px，结果页也有更强人物存在感。
- 使用 `object-fit: cover` 和既有 `object-position: 50% 10%`，未拉伸图片，未替换资产。

## 5. 结尾过渡单图收敛说明

Beta 0.9.9.6 主流程中，最后一题后会经历：

1. ending screen：`silver-lake.webp`
2. reveal screen：`voyage.webp`
3. reveal screen 二次切换：`main-island.webp`
4. 结果页背景：`common-bg.webp`

这会造成多图连续跳转。本轮收敛为：

1. 最后一题完成；
2. 显示单一 ending screen；
3. 使用一张 `silver-lake.webp`；
4. 显示一句短文案；
5. 可点击“直接查看结果”；
6. 直接进入结果页。

当前主流程不再调用 `showResultTransition()`，因此不会再触发 `voyage.webp -> main-island.webp` 的 reveal 二次切图。

## 6. 最终保留的过渡图片及原因

最终保留：

`assets/result/silver-lake.webp`

原因：

- 它已经是当前 ending screen 的主背景，不需要新增资源。
- 视觉上更安静、神秘，符合“银色镜湖 / 心岛浮现”的过渡语义。
- 画面本身足够完整，不需要再叠加多张图解释流程。
- 相比 `voyage.webp` 和 `main-island.webp`，它更适合承接“答完题后的停顿”，不会像 PPT 切图。
- 结果页仍可继续使用自己的背景图，但不参与“最后一题到结果页出现”的连续过渡。

## 7. 首页与做题页保持说明

本轮没有继续大改首页和做题页：

- 首页保持 Beta 0.9.9.6 的简化结构，只更新版本号。
- 首页 CTA 仍通过 375px / 390px / 430px 首屏检查。
- 做题页保持左/上方场景氛围和题目选项为主的结构。
- 未修改题目内容、题目顺序、选项内容或评分绑定。
- 390px 做题页仍可见 4 个选项，选项最小高度 54px，无横向溢出。

## 8. 分享卡链路检查

本轮没有重做分享卡模板，只检查链路：

- 结果页 Hero 分享入口可点击；
- 点击后能生成分享卡；
- 分享预览图使用 `data:image/` 正常生成；
- 拟人图放大没有导致分享卡生成断链；
- 脚本未发现分享预览报错。

## 9. 12 核心人格边界确认

本轮没有修改人格池或评分逻辑：

- 前台主结果仍只来自 12 核心人格；
- 结果页 Hero 使用当前核心主结果人格；
- 分享卡使用当前主结果人格；
- 旧 8 分支人格没有进入前台主结果；
- 未修改人格名称、人格文案、关键词、命中句、targetVector。

## 10. 腾讯云部署前移动端真实验收清单

上线腾讯云并用真实手机访问前，建议逐项验收：

1. 首页首屏是否能看到 `开启心岛航行` CTA。
2. 做题页滑动是否顺畅，是否有卡顿、误触或选项遮挡。
3. 36 题是否能完整做完，中途返回上一题是否正常。
4. 最后一题到结果页是否只出现一个过渡画面。
5. 过渡画面是否为银色镜湖，是否没有多图连续跳转。
6. 结果页拟人图是否足够大，是否像人格身份卡主视觉。
7. 分享卡按钮是否能点击。
8. 分享卡是否能生成并显示预览。
9. iPhone Safari / 安卓 Chrome 是否能保存图片。
10. 微信内置浏览器是否有保存限制，是否需要引导用户长按或用系统浏览器打开。
11. 是否存在图片加载慢、白屏、闪烁、首屏空白。
12. 横竖屏切换后是否出现布局错位。
13. 弱网下结果页拟人图加载失败时，占位是否还能接受。
14. 微信 / QQ / 小红书内打开时，canvas 生成是否报错。
15. 页面是否仍无横向滚动。

## 11. 实际运行命令和结果

| 命令 | 结果 | 关键记录 |
| --- | --- | --- |
| `npm run check` | 通过 | 串联 consistency、production probability audit、options audit。 |
| `npm test` | 通过 | 当前等同于 `npm run check`。 |
| `npm run ui:inspect` | 通过 | 首页、做题页、过渡页、结果页、分享卡生成均通过。 |
| `npm run test:consistency` | 通过 | 同人格数据下算法 Top5 一致 1000/1000；`LIVE_SCORING_PROFILE = calibrationB`。 |
| `npm run audit:probability:live` | 通过 | 12 核心主岛，自匹配 12/12，从未出现 0。 |
| `npm run audit:options` | 通过 | 维度路径 12/12；黄金路径 17/20，其中核心 12/12、旧分支 5/8。 |

## 12. 移动端截图 / 流程验证结果

截图文件：

- `reports/screenshot-home-375px-beta-0.9.9.7.png`
- `reports/screenshot-home-390px-beta-0.9.9.7.png`
- `reports/screenshot-home-430px-beta-0.9.9.7.png`
- `reports/screenshot-quiz-390px-beta-0.9.9.7.png`
- `reports/screenshot-transition-390px-beta-0.9.9.7.png`
- `reports/screenshot-result-390px-beta-0.9.9.7.png`

自动验证摘要：

- 首页 390px：CTA 可见，高度 54px，无横向溢出。
- 做题页 390px：首屏可见 4 个选项，选项最小高度 54px，无横向溢出。
- 过渡页 390px：ending screen 可见，使用 `silver-lake.webp`，reveal screen 隐藏，额外地点节点 / 星标 / 路线未亮起。
- 结果页 390px：人格名、3 个关键词、命中句、拟人图、分享入口均通过；拟人图宽度 258px。
- 分享卡生成：通过。

## 13. 是否改动题库 / 人格文案 / 评分参数

| 项目 | 是否改动 | 说明 |
| --- | --- | --- |
| 36 题题库 | 否 | 未修改题目、题序、选项内容。 |
| 人格名称 | 否 | 未新增、删除或重命名人格。 |
| 人格文案 | 否 | 未改写人格说明。 |
| 关键词 | 否 | 未修改关键词。 |
| 命中句 | 否 | 未修改命中句。 |
| 评分算法 | 否 | 未修改匹配算法。 |
| 评分参数 | 否 | 未修改 `coreWeight`、`metBonus`、`failPenalty` 等参数。 |
| targetVector | 否 | 未修改任何人格向量。 |
| 分享卡模板 | 否 | 未重做模板，只验证链路。 |

## 14. 遗留问题

- `showResultTransition()` 函数仍保留在代码中作为旧 fallback，但当前主流程不再调用；后续可在清理阶段统一整理。
- `scripts/consistency-test.mjs` 和 `scripts/probability-audit.mjs` 的控制台标题仍带历史 Beta 号；运行口径不受影响。
- `audit:options` 仍显示旧分支人格中 3 个黄金路径失败，这是旧 20 类型兼容数据的既有问题；核心 12/12 正常。
- 真实手机保存图片能力仍需腾讯云部署后在 iPhone / 安卓 / 微信内置浏览器中验证。

## 15. 下一步建议

- P1：部署腾讯云后按本报告第 10 节清单做真实手机验收。
- P1：确认微信内置浏览器下分享卡保存体验，必要时只补保存提示，不重做模板。
- P2：后续清理未调用的 reveal 过渡函数和历史脚本标题，降低维护噪音。
- P2：继续观察用户对结果准确性和人格认领感的反馈，再决定是否调整结果页详细报告层级。
