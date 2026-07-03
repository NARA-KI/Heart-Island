# 心岛计划全项目盘点报告

## 1. 总结结论

当前项目主线更接近 **Beta 0.9.9.4 RC**，不是 Beta 0.9.9.5 或 0.9.9.6。核心流程已经具备继续打磨基础：36 题题库完整、12 核心人格主结果可用、场景背景和人格拟人图已接入、结果页 Hero 已能承载传播。

但当前还不是干净的 1.0 RC 状态。主要问题集中在三类：版本号与历史标识混杂；代码内仍保留 20 类型体系和多套审计/评分数据口径；移动端首页首屏无法看到开始按钮，公开测试转化风险高。

本轮只做检查与报告。除新增本报告外，没有修改代码、样式、文案、图片或配置。

## 2. 当前版本判断

| 检查项 | 当前状态 |
| --- | --- |
| 页面显示版本 | `index.html` 的 `#intro-beta-badge` 为 `Beta 0.9.9.4 RC` |
| `package.json` | `0.9.9.4-beta` |
| `app.js` | 文件头为 `Beta 0.9.9.4 RC`，反馈导出文本为 `Beta 0.9.9.4 RC`；但保存数据仍有 `version: '0.9.9.3'` |
| `styles.css` | 文件头为 `Beta 0.9.9.4 RC`，内部保留大量历史注释 `0.9.4` 到 `0.9.9.3` |
| `index.html` | DOM 中显示 `Beta 0.9.9.4 RC`，注释仍有 `Beta 0.9.9.1 / 0.9.9.2 / 0.9.9.3 / 0.9.4` |
| 最近报告 | `reports/beta-0.9.9.4-version-label-hotfix.md`，最近主报告为 `beta-0.9.9.4-final-freeze.md` / `beta-0.9.9.4-release-candidate-report.md` |

结论：当前可识别版本是 **Beta 0.9.9.4 RC / package 0.9.9.4-beta**。存在版本号不一致，尤其是 `app.js` 本地保存数据仍写 `0.9.9.3`，`deploy/styles.css` 头部仍显示 `Beta 0.9.9.3`。项目状态不应被标记为 0.9.9.5 或 0.9.9.6。

## 3. 文件结构盘点

| 路径 | 用途 | 备注 |
| --- | --- | --- |
| `index.html` | H5 主入口，包含首页、做题页、结尾页、结果页容器 | 直接引用 `styles.css` 和 `app.js` |
| `app.js` | 当前产品主逻辑：题库、人格配置、评分、渲染、分享图、本地保存 | 单文件体量约 295KB，包含 20 类型数据和 12 核心筛选 |
| `styles.css` | 当前主样式 | 单文件体量约 119KB，历史版本注释较多 |
| `style.css` | 不存在 | 无重复主样式文件 |
| `assets` | 视觉资源 | 人格、场景、结果页、源图都在此 |
| `public` | 不存在 | 当前非 Vite/Next 类结构 |
| `core` | 可复用评分数据和校准配置 | `scoring.mjs`、`calibration-profiles.mjs` |
| `scripts` | 审计、截图、资源转换脚本 | 有 Playwright UI 脚本，但未挂到 npm script |
| `tests` | 不存在 | 无独立测试目录 |
| `reports` | 历史报告、截图、审计输出 | 已累积多版本报告 |
| `deploy` | 部署副本 | 与根目录存在版本差异风险 |
| `release` | 0.9.9.4 RC 归档 | 可视为发布快照 |
| `package.json` | npm 元信息和脚本 | 只暴露 3 个脚本 |

明显旧文件或归档：`app.js.backup-*`、`styles.css.backup-*`、`archive-heart-island-old.html`、`heart-island-beta-0.9.1.zip`、`heart-island-beta-0.9.2-deploy.tar.gz`、`release/heart-island-beta-0.9.9.4-rc`、`deploy`。这些不一定要立刻删除，但会增加版本判断和部署同步风险。

## 4. 题库完整性检查

| 项目 | 结果 |
| --- | --- |
| 题目总数 | 36 |
| scene 编号 | `scene-01` 到 `scene-36` 连续 |
| 缺题 / 重复题 | 未发现 |
| 每题选项数量 | 36 题均为 4 个选项 |
| 选项 ID | 均为 `A/B/C/D` |
| 维度分布 | 12 个维度，每个维度 3 题 |
| 叙事结构 | 12 地点 × 每地点 3 题，章节为启航 / 深入 / 高处 / 归航 |

异常清单：未发现结构性异常。`scene-27` 的选项分数不是 A=100、B=67、C=33、D=0，而是 A=33、B=67、C=100、D=0；从语义上看是为了表达“承担程度”，不是编号错误。

初步产品判断：题库已经具备继续打磨基础。下一阶段应重点看题目疲劳、选项语义区分度和 36 题完成率，而不是先重写题库。

## 5. 人格类型体系检查

当前代码真实状态是 **12 核心人格作为前台主结果 + 8 分支人格保留在配置/归档/审计里**，不是纯 12 类型项目。

### 当前代码中的真实类型清单

核心 12 类型：

| id | 名称 | 官方名单匹配 | 图标/SVG | 拟人图 WebP | 缩略图 | 结果文案 |
| --- | --- | --- | --- | --- | --- | --- |
| `lighthouse` | 灯塔型 | 是 | 有 | 有 | 有 | 有 |
| `gatekeeper` | 守门人型 | 是 | 有 | 有 | 有 | 有 |
| `nest_builder` | 筑巢型 | 是 | 有 | 有 | 有 | 有 |
| `collector` | 收藏家型 | 是 | 有 | 有 | 有 | 有 |
| `migratory_bird` | 候鸟型 | 是 | 有 | 有 | 有 | 有 |
| `island` | 岛屿型 | 是 | 有 | 有，文件名为 `islander.webp` | 有 | 有 |
| `explorer` | 探险家型 | 是 | 有 | 有 | 有 | 有 |
| `wandering_poet` | 流浪诗人型 | 是 | 有 | 有 | 有 | 有 |
| `spark` | 星火型 | 是 | 有 | 有 | 有 | 有 |
| `moonlight` | 月光型 | 是 | 有 | 有 | 有 | 有 |
| `mirror` | 镜像型 | 是 | 有 | 有 | 有 | 有 |
| `stargazer` | 观星者型 | 是 | 有 | 有 | 有 | 有 |

分支 8 类型残留：`old_captain` 旧船长型、`script_writer` 剧本型、`resonance` 共振型、`tide` 潮汐型、`greenhouse` 温室型、`deep_sea` 深海型、`aurora` 极光型、`black_forest` 黑森林型。

旧类型残留位置：

- `app.js`：`personalities` 仍是 20 类型；`BRANCH_TYPE_IDS`、`BRANCH_PARENT_MAP`、`debugAllTypeMatches`、人格图鉴分支归档仍存在。
- `core/scoring.mjs`：导出 20 类型，支持 `poolFilter='all'/'branch'`。
- `styles.css`：仍有 `ALL 20 TYPES MODAL` 注释和相关样式。
- `scripts/option-alignment-audit.mjs`：仍按 20 类型做黄金路径，分支 5/8 通过。
- `reports`：大量 20 类型历史报告。

未发现前台主结果仍输出旧 20 类型的证据；主结果通过 `matchAllTypes(..., 'core')` 限制在 12 核心。未发现当前 `app.js` 中 “型型” 文案命中。

类型体系风险等级：**中**。原因是用户前台主结果可控，但代码和审计仍是混合体系，下一阶段如果继续加功能，很容易误用 20 类型池或旧分支文案。

## 6. 评分逻辑检查

评分入口：

- `app.js:1366`：生产页面 `matchAllTypes(avgDimensionScores, poolFilter)`。
- `core/scoring.mjs:586`：审计/脚本共享评分函数。
- `scripts/probability-audit.mjs`：有自定义 profile-aware 匹配函数。
- `scripts/option-alignment-audit.mjs`：内嵌数据和逻辑，不完全依赖 `core/scoring.mjs`。

关键参数：

| 参数 | 当前生产含义 |
| --- | ---: |
| `coreWeight` | 2.20 |
| `metBonus` | +2.0 |
| `failPenalty` | -6.0 |
| `LIVE_SCORING_PROFILE` | `calibrationB` |

当前评分逻辑说明：先按 12 维平均分计算用户画像，再与人格 `targetVector` 做加权差异匹配。核心阈值维度权重更高；命中阈值加分，未命中扣分；`_MAX` 表示该维度必须低于阈值。生产主结果使用 12 核心池，debug 和部分脚本仍能跑全 20 类型。

一致性结论：

- `npm run test:consistency` 通过，确认算法参数与 `calibrationB` 一致。
- 同人格数据下 `core/scoring.mjs` 与 `app.js` 算法 Top5 一致率 1000/1000。
- 不同人格数据下 Top5 一致率仅 362/1000，脚本说明原因是 `scoring.mjs` 使用 baseline 人格数据，`app.js` 使用 calibrationB 人格数据。
- `npm run audit:probability` 默认跑的是 `baseline`，不是 `calibrationB`；必须显式加 `-- --profile calibrationB` 才贴近当前生产口径。

可运行评分审计命令：

```bash
npm run test:consistency
npm run audit:probability
npm run audit:probability -- --profile calibrationB
npm run audit:options
```

本轮临时副本运行结果：

- `test:consistency`：通过；算法参数统一为 B+。
- `audit:probability` 默认 baseline：最高频守门人型 16.0%，最低频筑巢型 5.0%，gap≤5 为 73.0%，自匹配 12/12。
- `audit:probability -- --profile calibrationB`：最高频镜像型 14.4%，最低频筑巢型 5.8%，gap≤5 为 64.9%，自匹配 12/12。
- `audit:options`：维度路径 12/12；核心黄金路径 12/12；全 20 黄金路径 17/20，失败分支为旧船长型、温室型、黑森林型。

风险判断：**中**。核心 12 可用，但脚本默认 profile、core 数据、app 数据之间存在口径差异，容易让后续审计报告误判。

## 7. 首页体验检查

首页主要 DOM：

- `#intro-screen`
- 背景层：`#bg-gradient-layer`、`#chart-texture-layer`、`#starfield`、`#mist-layer`、`#island-silhouette`、`#ocean-layer`、`#particle-layer`
- 标题区：`#intro-title`、`#intro-subtitle`
- 说明区：`#intro-tagline`、`#intro-concrete-subtitle`
- 版本和免责声明：`#intro-beta-badge`、`#intro-disclaimer`
- 三张卖点卡：`#intro-selling-points`
- 入口：`#intro-start-btn`
- 图鉴入口：`#intro-all-types-entry`

移动端截图 `reports/screenshot-home-390px.png` 显示：标题和副标题首屏可见，但核心说明、卖点和开始按钮不在首屏。按钮样式本身尺寸足够，但首屏不可见会直接影响开始率。

首屏体验问题：

- 标题可见，氛围安静，有深海/航行感。
- 核心说明不够靠前，用户首屏只知道“心岛计划 / 探索你的恋爱人格”。
- “开启心岛航行”按钮不在 390px 首屏内。
- 背景不喧宾夺主，但首页大面积空白导致首屏行动不足。

移动端风险：**高**。建议作为 1.0 前重点修复，优先级 P0/P1 之间，更偏 P0，因为它影响公开测试入口转化。

## 8. 做题页体验检查

做题页结构：

- `#game-screen`
- 左/上方视觉区：`#scene-stage`、`.scene-stage-bg`、`.scene-stage-image`、`.scene-stage-overlay`、`.scene-stage-meta`
- 题目区：`#scene-question-column`、`#scene-top-bar`、`#scene-question-counter`、`#location-progress-bar`
- 题卡：`#scene-card`、`#scene-mood`、`#scene-title`、`#scene-narrative`、`#options-container`
- 返回：`#prev-btn`

场景图接入状态：

- 12 张地点场景 WebP 全部存在并由 `SCENE_BACKGROUND_MAP` 引用。
- `reports/screenshot-quiz-390px.png` 显示移动端场景图已显示，尺寸约占上半屏。
- 36 个 prop SVG 仅 4 个存在，scene-05 到 scene-36 的 prop 引用缺失，会走 fallback。

主要视觉问题：

- 场景图可见且氛围较强，但在移动端占据较大首屏高度。
- 题卡半透明，背景可见，整体风格统一。
- 题目区域信息偏密，36 题长期作答有疲劳风险。

主要交互问题：

- 选项按钮 `min-height:54px`，移动端点击面积基本合格。
- 有 `01 / 36` 和地点进度节点。
- 有章节/地点提示，但“航行感”的章节反馈主要依赖过场/地点，不是每题都强提示。
- 支持上一题，第 1 题隐藏上一题合理。
- 未从截图发现明显横向溢出；仍需真实设备验证长文案滚动。

移动端风险等级：**中**。不阻断主流程，但 36 题疲劳和场景图占屏比例需要 1.0 前继续压测。

## 9. 结果页体验检查

当前结果页模块顺序：

1. Hero：主人格、匹配度、关键词、命中句、置信说明、分享入口、拟人图。
2. 恋爱人格说明书。
3. 关系惯性折叠区。
4. 关系建议。
5. 展开更多细节：12 维地图、Top5、适配关系、最终解读、旅途回顾、人格图鉴。
6. 分享与反馈：分享卡/长图、本地保存、反馈表。

Hero 区判断：基本合格。`reports/screenshot-result-390px.png` 显示主人格“收藏家型”、匹配度、关键词、命中句、分享入口和拟人图均在首屏出现。

拟人图展示状态：已重点展示，且视觉吸引力强。移动端首屏中拟人图在 Hero 下半部完整露出，适合截图，但会把部分后续解释推到屏外。

分享入口位置：Hero 中有“生成我的分享卡”轻量入口，后面还有正式分享区。位置足够靠前，但按钮视觉权重偏轻，容易被忽略。

文字信息密度问题：

- Hero 同时展示标题、匹配度、关键词、命中句、置信说明、分享入口和大图，信息量偏高。
- 折叠区已经减少了详情压力，这是正确方向。
- 未发现当前前台 “型型” 重复问题。

结果页优先级问题清单：

- P1：提高分享入口可见性和行动感。
- P1：确认分享卡生成后预览、保存、原生分享在移动端浏览器的稳定性。
- P2：进一步降低 Hero 文案密度，强化“可截图”的首屏构图。

## 10. 视觉资产接入检查

| 资源类型 | 应有数量 | 实际数量 | 已接入数量 | 问题 |
| ---- | ---: | ---: | ----: | -- |
| 12 人格拟人图 WebP | 12 | 12 | 12 | 已通过 `PERSONA_IMAGE_MAP` 接入；`island` 对应文件名为 `islander.webp`，可读但命名不统一 |
| 12 人格图标/SVG | 12 | 12 | 12 | 已通过 `PERSONA_ASSETS` 接入 |
| 12 人格缩略图 | 12 | 12 | 12 | 已通过 `PERSONA_THUMB_MAP` 接入 |
| 12 地点场景图 WebP | 12 | 12 | 12 | 已通过 `SCENE_BACKGROUND_MAP` 接入 |
| 36 题 prop SVG | 36 | 4 | 36 个路径被引用，实际 4 个存在 | scene-05 到 scene-36 缺失 32 个 prop 文件，会 fallback |
| 结尾背景图 | 1 | 1 | 1 | `silver-lake.webp` 存在并接入 |
| 首页背景图 | 1 | 0 个专用 WebP | 0 | 首页主要靠 CSS 背景层和剪影，不是独立首页图 |
| 分享卡背景图 | 1 | 1 | 1 | Canvas 内绘制渐变/装饰，并使用人格图；无独立分享卡背景图文件 |
| 结果页背景图 | 2 | 2 | 2 | `common-bg.webp`、`main-island.webp` 已接入 |
| 源图 | 不计入运行资源 | 28 | 0 | `assets/source` 为原始素材，运行中不直接引用 |

代码引用资产总数 88 个，实际存在 56 个，缺失 32 个，缺失项全部集中在 scene prop SVG。主背景图和人格图没有发现缺失。

未使用或需整理资源：`assets/source` 原始图、`assets/scenes/backgrounds/.gitkeep` 空目录、历史 `deploy/release` 资源副本。命名混乱点：`island` / `islander.webp`，`source/personas-original/11- 镜像型.png` 文件名含多余空格。

## 11. 分享图生成检查

功能状态：

- 有 Hero 入口：`#hero-share-trigger`。
- 有正式分享区：`#share-cover-btn`、`#share-full-btn`、`#share-save-btn`、`#share-native-btn`、`#share-copy-text-btn`。
- 生成逻辑在 `app.js`：
  - `initShareImageSection`：约第 3101 行。
  - `generateShareCoverImage`：约第 3223 行。
  - `generateFullReportImage`：约第 3394 行。
  - `dataURLToBlob` / `wrapText`：约第 3530 行之后。

技术实现：使用 Canvas 和 `canvas.toDataURL('image/png')`。可绘制人格名、匹配度、关键词、命中句、人格拟人图、品牌文字“心岛计划 Beta”。未发现二维码接入；水印/产品名有，但偏轻。

已知风险：

- 如果人格图未预加载，Canvas 中人物可能缺失或降级。
- 当前图片都是本地同源路径，跨域污染风险低；未来如改 CDN，必须加 CORS。
- 分享图视觉质量未在本轮重新生成验证，只从代码和结果页截图判断。
- 移动端保存依赖下载链接和 Web Share API，iOS/微信内置浏览器可能有兼容性风险。
- Hero 分享入口视觉权重偏低，传播入口可能被忽略。

是否适合作为传播核心：**可以继续作为传播核心，但 1.0 RC 前应做移动端真机保存/分享验证和分享卡视觉验收**。

## 12. 自动化测试脚本检查

`package.json` 可用脚本：

| 命令 | 是否存在 | 本轮结果 |
| --- | --- | --- |
| `npm test` | 不存在 | Missing script: `test` |
| `npm run check` | 不存在 | Missing script: `check` |
| `npm run audit` | 不存在 | Missing script: `audit` |
| `npm run audit:probability` | 存在 | 临时副本运行成功；默认 baseline，不是 calibrationB |
| `npm run audit:probability -- --profile calibrationB` | 存在 | 临时副本运行成功；12/12 自匹配，通过 |
| `npm run audit:options` | 存在 | 临时副本运行成功；核心 12/12，分支 5/8 |
| `npm run e2e` | 不存在 | Missing script: `e2e` |
| `npm run ui:v099-check` | 不存在 | Missing script: `ui:v099-check` |
| `npm run test:consistency` | 存在 | 项目目录运行成功；不写报告 |

脚本目录实际存在：

- `scripts/probability-audit.mjs`：会写 `reports/probability-audit*.md/json`。
- `scripts/option-alignment-audit.mjs`：会写 `reports/option-result-alignment-audit.json`。
- `scripts/inspect-ui.mjs`：Playwright 截图脚本，会写 6 张截图。
- `scripts/inspect-ui-structure.mjs`：Playwright 结构检查，会写 `reports/ui-inspection-raw.json`。
- `scripts/consistency-test.mjs`：只输出控制台，不写文件。
- `scripts/convert-assets.mjs`：资源转换脚本，不应作为测试运行。

测试覆盖风险：**中**。评分审计有基础，但 npm 缺少统一 `test/check/e2e` 入口；UI 检查脚本存在但未挂 npm；移动端截图依赖手动运行脚本，不能形成稳定回归门槛。

## 13. 高风险问题清单

| 风险 | 影响 | 优先级 |
| --- | --- | --- |
| 移动端首页首屏看不到开始按钮 | 直接影响公开测试开始率，用户可能误以为页面只是封面 | P0 |
| 版本状态混杂，`deploy` 与根目录存在版本差异 | 发布时可能误部署旧文件或错误版本 | P0 |
| 评分/审计口径混合：生产 app 使用 calibrationB 数据，core/scoring 暴露 baseline 数据，audit 默认 baseline | 后续校准和报告可能误判真实线上结果 | P1 |

## 14. 中风险问题清单

| 风险 | 影响 | 优先级 |
| --- | --- | --- |
| 20 类型数据仍大量残留 | 后续功能可能误用分支类型作为主结果 | P1 |
| 36 个 prop SVG 仅 4 个实际存在 | 做题页小装饰资产不完整，依赖 fallback | P2 |
| 结果页分享入口视觉权重偏低 | 传播转化可能低于预期 | P1 |
| 36 题移动端作答疲劳 | 完成率可能受影响 | P2 |
| 缺少标准 `npm test` / `npm run check` / `npm run e2e` | 回归验证成本高 | P1 |
| 首页无专用视觉主图，主要靠 CSS 氛围 | 品牌第一眼记忆点偏弱 | P2 |

## 15. 低风险问题清单

| 风险 | 影响 | 优先级 |
| --- | --- | --- |
| 历史备份文件、zip/tar、旧归档较多 | 结构噪音，影响新人理解 | P3 |
| `styles.css` 历史版本注释密集 | 阅读成本高 | P3 |
| `assets/source/personas-original/11- 镜像型.png` 文件名含空格 | 命名不整齐，但不影响运行 | P3 |
| `app.js` 仍有 legacy 分享文本函数和 reveal fallback | 不阻断，但增加维护成本 | P3 |
| `reports/ui-inspection-raw.json` 文本因控制台显示编码导致可读性差 | 报告阅读体验差，不影响浏览器实际显示 | P3 |

## 16. 建议下一阶段优先级

P0：

- 修首页移动端首屏，把核心说明和“开启心岛航行”放入首屏可见区域。
- 确认发布入口只使用根目录或 release 中的一个权威版本，解决 `deploy` 版本落后问题。

P1：

- 统一评分审计口径：明确 `app.js`、`core/scoring.mjs`、`calibration-profiles.mjs`、`probability-audit` 默认 profile 的关系。
- 建立标准命令：至少补齐 `npm test` 或 `npm run check` 聚合现有评分审计。
- 结果页分享入口强化，并做移动端保存/分享真机验证。
- 给 12 核心人格体系设置防误用边界，避免新功能读取全 20 类型池。

P2：

- 补齐 scene-05 到 scene-36 的 prop SVG，或移除未落盘引用并明确 fallback 策略。
- 降低做题页疲劳：检查 36 题完成率、长题滚动和选项辨识度。
- 分享卡视觉验收：检查文字溢出、拟人图裁切、朋友圈/小红书截图观感。

P3：

- 清理或归档备份文件、旧 zip、旧报告索引。
- 整理历史注释和资源命名。
- 将 Playwright UI 截图脚本挂入 npm，但不作为当前阻塞项。

## 17. 不建议现在做的事项

- 不建议现在重写题库。题库结构完整，当前更需要验证完成率和体验。
- 不建议现在大规模重构 `app.js`。单文件虽大，但当前优先级是版本、首屏、评分口径和传播链路。
- 不建议现在删除全部旧 20 类型数据。应先定义兼容和归档策略，再逐步收口。
- 不建议现在更换整套视觉风格。现有深海、心岛、航行氛围已经成立，问题在接入完整度和首屏行动。
- 不建议现在引入新依赖。现有项目可以靠当前脚本和 Playwright 继续验证。
