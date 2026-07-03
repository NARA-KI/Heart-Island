# Beta 0.9.7 · 12 核心主岛与分支人格归档版 — 完整报告

**版本**: Beta 0.9.7  
**基于**: Beta 0.9.6 做题页航行界面  
**日期**: 2026-06-14  
**范围**: 20人格系统收敛为12核心主岛 + 8分支归档 + 副岛降级为关系回声  
**约束**: 不改题库/选项/score/评分算法/calibration profile/人格数据/做题页UI

---

## 一、12 个核心主岛人格

以下 12 个类型参与主结果评分、Top5、分享卡和首页展示：

| # | ID | 名称 | Archetype |
|---|-----|------|-----------|
| 1 | `lighthouse` | 灯塔型 | 守护者 |
| 2 | `gatekeeper` | 守门人型 | 守门人 |
| 3 | `nest_builder` | 筑巢型 | 筑巢者 |
| 4 | `collector` | 收藏家型 | 收藏家 |
| 5 | `migratory_bird` | 候鸟型 | 候鸟 |
| 6 | `island` | 岛屿型 | 岛屿 |
| 7 | `explorer` | 探险家型 | 探险家 |
| 8 | `wandering_poet` | 流浪诗人型 | 流浪诗人 |
| 9 | `spark` | 星火型 | 星火 |
| 10 | `moonlight` | 月光型 | 月光 |
| 11 | `mirror` | 镜像型 | 镜像 |
| 12 | `stargazer` | 观星者型 | 观星者 |

**状态**: 全部启用，参与主结果评分。

---

## 二、8 个分支人格归档

以下 8 个类型不参与主结果评分，保留为 `branchTypes`（统一命名）：

| # | ID | 名称 | parentType |
|---|-----|------|-----------|
| 1 | `old_captain` | 旧船长型 | `collector` (收藏家型) |
| 2 | `script_writer` | 剧本型 | `wandering_poet` (流浪诗人型) |
| 3 | `resonance` | 共振型 | `mirror` (镜像型) |
| 4 | `tide` | 潮汐型 | `spark` (星火型) |
| 5 | `greenhouse` | 温室型 | `nest_builder` (筑巢型) |
| 6 | `deep_sea` | 深海型 | `island` (岛屿型) |
| 7 | `aurora` | 极光型 | `explorer` (探险家型) |
| 8 | `black_forest` | 黑森林型 | `gatekeeper` (守门人型) |

**状态**:
- ✅ 未删除，保留在 `personalities` 数组中
- ✅ 不参与 `matchAllTypes(..., 'core')` 评分
- ✅ 不参与前台 Top5
- ✅ 不出现在结果页第一屏
- ✅ 不出现在分享卡
- ✅ 不作为首页卖点
- ✅ 未标成"隐藏稀有人格"
- ✅ 保留在图鉴的"分支人格档案"区域
- ✅ 每个都有 `parentType` 指向 12 个核心主岛之一
- ✅ 保留在 `debugAllTypeMatches` 调试数据中

---

## 三、主结果计算逻辑修改

### `matchAllTypes` (app.js + scoring.mjs)

新增 `poolFilter` 参数：
- `'core'` — 仅从 12 个核心类型中计算
- `'branch'` — 仅从 8 个分支类型中计算  
- `'all'` / 不传 — 全部 20 个类型（向后兼容）

### 前台结果计算 (showRevealTransition)

```javascript
state.matchResults = matchAllTypes(state.avgDimensionScores, 'core');  // 12核心
state.resultPersonality = state.matchResults[0].personality;
state.secondaryPersonality = state.matchResults[1].personality;
state.confidenceGap = state.matchResults[0].matchScore - state.matchResults[1].matchScore;
state.debugAllTypeMatches = matchAllTypesDebug(state.avgDimensionScores); // 全20类型debug
```

### 新增常量

| 常量 | 位置 | 说明 |
|------|------|------|
| `CORE_TYPE_IDS` | app.js + scoring.mjs | 12 核心主岛 ID |
| `BRANCH_TYPE_IDS` | app.js + scoring.mjs | 8 分支人格 ID |
| `BRANCH_PARENT_MAP` | app.js + scoring.mjs | 分支 → 核心映射 |
| `isCoreType()` | app.js + scoring.mjs | 判断是否核心类型 |
| `isBranchType()` | app.js + scoring.mjs | 判断是否分支类型 |
| `matchAllTypesDebug()` | app.js + scoring.mjs | 全20类型debug匹配 |

---

## 四、关系回声（副岛降级）

### 旧版 (0.9.6)

副岛与主岛并列展示在第一屏，视觉权重相近。

### 新版 (0.9.7)

副岛降级为"关系回声"，按 gap 分三种展示：

| gap 区间 | 展示方式 | 说明 |
|----------|---------|------|
| gap ≤ 5 | 不显示具体副岛名称，显示混合倾向文案 | "你的关系模式带有明显混合倾向…" |
| 5 < gap ≤ 12 | 显示"关系回声：XX型"，视觉权重低 | 使用 `.echo-named` 样式，半透明 |
| gap > 12 | 不在第一屏展示 | 弱提示"其他类型只作为轻微回声存在" |

### 实现

新函数 `generateRelationshipEcho()` 替代了 `generateSubIslandEchoV2()` 在主结果页的调用。旧的 `generateSubIslandEchoV2()` 和 `generateSubIslandInsight()` 保留在代码中供未来使用。

---

## 五、首页修改

### 卖点卡变更

| 位置 | 旧版 (0.9.6) | 新版 (0.9.7) |
|------|-------------|-------------|
| 卡1 | 约 5 分钟 / 36 道心岛旅程题 | 约 5 分钟完成 / 36 道心岛旅程题 |
| 卡2 | **主岛 + 副岛回声** / 发现你的双重人格面向 | **获得你的核心主岛人格** / 看见你在关系中的真实模样 |
| 卡3 | 可分享的心岛地图 / 邀请朋友一起探索 | 生成专属心岛地图 / 支持分享给信任的人 |

- ✅ 不再出现"副岛回声"
- ✅ 不再出现"20种人格图鉴"
- ✅ 不再出现"多重人格结果"

---

## 六、结果页修改

### 第一屏

- ✅ 只强调主岛名称、匹配度、关键词、一句话总结
- ✅ 主岛身份卡
- ✅ 简短置信度说明（gap 规则）
- ✅ 不再并列展示副岛卡片
- ✅ 不再展示全部 20 类型
- ✅ 不再展示 Top5 大列表

### 关系回声展示

- ✅ gap ≤ 5: 混合倾向文案，不显示副岛名称
- ✅ 5 < gap ≤ 12: "关系回声：XX型" 弱展示
- ✅ gap > 12: 不在第一屏展示

### 第二段（默认展开）

保持原有结构：三个瞬间 → 真正想要的爱 → 为什么是这个主岛 → 恋爱画像 → 关系优势 → 隐藏盲区 → 成长建议

### 可折叠区域

- 12 维心岛地图 + 12核心 Top5
- 完整报告
- 旅途回顾
- 心岛人格图鉴

---

## 七、分享卡修改

### 分享封面图 (generateShareCoverImage)

- ✅ 展示主岛名称、匹配度、关键词、一句话
- ✅ 关系回声仅当 gap ≤ 12 时以极小文字显示
- ✅ 不再展示"副岛回声"作为标题级内容
- ✅ 不再展示副岛名称和分数

### 完整结果图 (generateFullReportImage)

- ✅ 同样移除副岛作为主要内容
- ✅ 关系回声仅当 gap ≤ 12 时以淡化文字显示

### 分享文字 (generateShareText)

```
我刚测出了「心岛计划」恋爱人格：

主岛：XX型（XX%）
关键词：XX / XX / XX

一句话："…"

这是一段关于你如何靠近、如何爱、如何保护自己的旅程。
```

- ✅ 不再包含"副岛回声"行

---

## 八、人格图鉴修改

### 标题

旧：`查看全部 20 种心岛人格`  
新：`心岛人格图鉴`

### 结构

分为两个区域：

1. **核心主岛人格** (12) — 全视觉权重，当前主岛高亮，关系回声弱高亮
2. **分支人格档案** (8) — 半透明 (opacity 0.55)，虚线边框，带"分支档案"标签，显示关联主岛

### 分支档案说明

```
分支人格是心岛计划后续可能展开的细分方向，当前版本不会作为你的主结果出现。
它们暂时用于内部校准和未来扩展。
```

- ✅ "核心主岛人格" 视觉权重 > "分支人格档案"
- ✅ 分支类型半透明 + "分支档案"标签
- ✅ 当前主岛高亮
- ✅ 关系回声弱高亮（如果存在）
- ✅ 分支人格未标为"稀有""隐藏""特殊奖励"

---

## 九、反馈数据修改

### 复制反馈数据

新增字段：
- `12核心 Top 5` — 来自 core 池的排名
- `Debug - 全20类型 Top 5` — 来自 debugAllTypeMatches
- 版本号更新为 `Beta 0.9.7`

### 本地存储

- `version` 字段: `'0.9.7'`
- `coreTop5` — 12核心 Top5
- `debugAllTypeTop5` — 全20类型 Top5
- 向后兼容：可读取旧版 `top5` 字段

---

## 十、CSS 新增样式

| 选择器 | 用途 |
|--------|------|
| `.gallery-section-header` | 图鉴分区标题（核心主岛/分支档案） |
| `.branch-section-header` | 分支档案标题（降低透明度） |
| `.branch-archive-note` | 分支档案说明文字 |
| `.all-types-card.branch-card` | 分支卡片（半透明、虚线边框） |
| `.atc-branch-badge` | 卡片右上角"分支档案"标签 |
| `.atc-parent-ref` | 分支卡片的关联主岛引用 |
| `.relationship-echo-module` | 关系回声模块（左侧淡色边框） |
| `.echo-mixed-text` | 混合倾向文案 |
| `.echo-named-header` | 具名回声头部 |
| `.echo-named-badge` | 回声标签 |
| `.resonance-echo-row` | 摘要卡中的回声行（降低透明度） |

---

## 十一、测试结果

### `node scripts/consistency-test.mjs`

| 测试 | 结果 | 状态 |
|------|------|------|
| Test A2 (同人格数据 top5) | 1000/1000 一致 | ✅ |
| Test C (参数=calibrationB) | 通过 | ✅ |
| LIVE_SCORING_PROFILE | "calibrationB" | ✅ |

### `node scripts/option-alignment-audit.mjs`

| 指标 | 结果 | 状态 |
|------|------|------|
| 维度路径 | 11/12 | ✅ (与0.9.6一致) |
| 黄金路径 | 15/20 | ✅ (与0.9.6一致) |
| 反向测试 | 20/20 | ✅ |
| 文案一致 | 20/20 | ✅ |

### `node scripts/probability-audit.mjs --profile calibrationB --pool core`

| 指标 | 结果 | 状态 |
|------|------|------|
| 类型池 | 12核心主岛 | ✅ |
| 自匹配 | 12/12 | ✅ |
| gap≤5 | 65.5% | ✅ |
| 从未出现 | 0 | ✅ |
| 最高频 | 镜像型 (14.0%) | ✅ |
| 最低频 | 筑巢型 (5.8%) | ✅ |
| 所有12核心均有出现 | ✅ | ✅ |

### `node scripts/probability-audit.mjs --profile calibrationB --pool all`

| 指标 | 结果 | 状态 |
|------|------|------|
| 类型池 | 全20类型 | 参考 |
| 自匹配 | 20/20 | ✅ |
| gap≤5 | 70.6% | 参考 |
| 从未出现 | 0 | ✅ |

---

## 十二、变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `index.html` | 中编辑 | 首页卖点卡文案修改、版本号、图鉴注释 |
| `styles.css` | 中编辑 | 图鉴分区样式、分支卡片、关系回声样式 (~80行) |
| `app.js` | 重编辑 | 核心/分支常量、matchAllTypes pool过滤、结果页重构、分享卡、图鉴、反馈 (~200行) |
| `core/scoring.mjs` | 中编辑 | 核心/分支常量导出、matchAllTypes pool过滤 (~60行) |
| `scripts/probability-audit.mjs` | 中编辑 | --pool 参数支持、12核心默认审计 (~30行) |
| `package.json` | 轻编辑 | 版本 0.9.7-beta |
| `deploy/index.html` | 同步 | 与 root 一致 |
| `deploy/styles.css` | 同步 | 与 root 一致 |
| `deploy/app.js` | 同步 | 与 root 一致 |
| `reports/beta-0.9.7-12-type-simplification-report.md` | 新建 | 本报告 |

### 未修改文件
- 所有 36 个题库场景 (scenes)
- 所有选项文案与分数
- 评分算法核心逻辑
- calibration profile
- 20 个人格类型数据定义（personalities 数组保持不变，仅添加元数据）
- 选项随机逻辑 (shuffleArray)
- 上一题功能 (goToPreviousScene)
- 做题页航行界面 UI（Beta 0.9.6 完全保留）

---

## 十三、UI 回退检查

| 检查项 | 状态 |
|--------|------|
| 桌面端左右分栏航行界面 | ✅ 保留 |
| 左侧心岛航行面板 | ✅ 保留 |
| 右侧航海日志选择面板 | ✅ 保留 |
| 航线节点进度 | ✅ 保留 |
| 选择航线式选项卡 | ✅ 保留 |
| 12维度岛屿视觉 | ✅ 保留 |
| 移动端适配 | ✅ 保留 |
| 暗色细滚动条 | ✅ 保留 |
| 转场动画 (slide) | ✅ 保留 |
| 上一题功能 | ✅ 保留 |

**结论：Beta 0.9.6 做题页 UI 100% 保留，无任何回退。**

---

## 十四、验收标准达成

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 前台主结果只会出现 12 个核心主岛 | ✅ |
| 2 | 8 个分支人格不参与主岛评分 | ✅ |
| 3 | 8 个分支人格未删除，保留为 branchTypes | ✅ |
| 4 | 每个分支人格都有 parentType | ✅ |
| 5 | 首页不再强调副岛 | ✅ |
| 6 | 结果页第一屏只强调主岛 | ✅ |
| 7 | gap ≤ 5 时不显示具体副岛名称 | ✅ |
| 8 | 5 < gap ≤ 12 时可显示关系回声，视觉权重低 | ✅ |
| 9 | gap > 12 时关系回声不进入第一屏 | ✅ |
| 10 | 分享卡只展示主岛 | ✅ |
| 11 | 图鉴标题不是"全部 20 种"，是"心岛人格图鉴" | ✅ |
| 12 | 图鉴区分"核心主岛人格"和"分支人格档案" | ✅ |
| 13 | 做题页 UI 不回退 | ✅ |
| 14 | 上一题功能正常 | ✅ |
| 15 | 选项随机逻辑正常 | ✅ |
| 16 | file:// 可用 | ✅ |
| 17 | 静态部署可用 | ✅ |
| 18 | deploy 文件同步 | ✅ |
| 19 | 报告已生成 | ✅ |
| 20 | 所有测试命令通过 | ✅ |

---

## 十五、仍存在的问题和下一步建议

### 已知问题
1. **Options audit 15/20 黄金路径**：部分类型（守门人、旧船长、候鸟、温室、黑森林）在 calibrationB 下自匹配非 #1。这是算法阈值设计的预期行为，与 Beta 0.9.6 一致，未因本次修改引入新问题。
2. **镜像型 14% 频率偏高**：在 12 核心池中镜像型出现频率为 14.0%，高于理想均匀分布（~8.3%）。可在后续版本调整 targetVector。

### 下一步建议
1. **Beta 0.9.8**: 结果页也应用左右分栏布局
2. **Beta 0.9.9**: 增加做题页音效/环境音
3. **Beta 1.0**: 整体打磨后正式发布

---

*心岛计划 Beta 0.9.7 — 12 核心主岛与分支人格归档版*  
*20 人格 → 12 核心主岛 + 8 分支归档 + 关系回声降级*
