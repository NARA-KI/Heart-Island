# Heart Island Beta 0.9.9.3 — P2 结果页产品化方案

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3 Stable Base → 目标 Beta 0.9.9.4  
> 范围：结果页视觉层级、拟人图展示、仪式感、信息架构  
> 状态：📋 方案阶段 — 仅诊断，不修改代码

---

## 一、当前结果页结构

### 1.1 DOM 层级（7 个 Section，自上而下）

```
Section 1: #result-hero（主岛 Hero）
  ├── .hero-badge "登岛档案"
  ├── .hero-label "你的核心主岛"
  ├── .hero-island-name XX型
  ├── .hero-subtitle（可选）
  ├── .hero-match-row "73%" + "主岛契合度"
  ├── .hero-keywords（3 个标签）
  ├── .hero-hitline（核心一句话）
  └── .hero-confidence（gap 说明文）
  └── .hero-portrait-col（拟人图，flex row 右列）
       └── .hero-portrait-wrap（2:3 容器）
            └── .hero-portrait-img（cover + bottom fade mask）

Section 2: 你的恋爱人格说明书
  ├── 你在关系里的样子
  ├── 你真正需要的爱
  └── 为什么你会是XX型

Section 3: 你在亲密关系里的惯性
  ├── 关系优势
  ├── 容易卡住的地方
  └── 适合你的关系节奏

Section 4: 给你的关系建议
  ├── 靠近时 / 不安时 / 冲突时（3 条）

Section 5: 展开更多细节（collapsed by default）
  ├── 12维心岛地图
  ├── Top5 相近人格
  ├── 最终解读
  ├── 旅途回顾
  └── 图鉴入口

Section 6: 分享与反馈
  └── 生成分享卡 / 生成长图 / 复制文字 / 保存
```

### 1.2 当前视觉数据

| 指标 | Desktop 1440px | Mobile 390px |
|------|---------------|--------------|
| Card | 920×2281px | 354px wide |
| Hero | 866×520px | 328×664px |
| 拟人图 | 311×468px（cover, 50% 18%） | 238×318px（cover） |
| 拟人图占比 | Hero 宽的 36% | Hero 宽的 72% |
| 拟人图容器 | 313×470, 2:3, max 360×540 | 240×320, 3:4, max 240 |
| Info 列 | 487px 宽 | 298px, 居中 |
| Hero/card 高度比 | 23% | — |

---

## 二、Top 5 产品问题

### 🔴 Problem 1：拟人图不是视觉重点

**现状**：
- 桌面端拟人图仅占 hero 宽度的 36%（311/866），文字列占 64%
- 底部 fade mask（`linear-gradient: rgba(7,12,28,0.85) → transparent 35%`）覆盖了图片下半部分
- `object-position: 50% 18%` 使图片偏上，人物面部可能被切
- 拟人图更像是文字旁边的"小插图"，而非视觉焦点

**影响**：用户第一眼看到的是文字，而不是人格形象。失去了"这是我的岛"的代入感。

**建议方案**：
- 桌面端：提升拟人图占比至 42-48%（flex:0 0 42%），增大容器 max-width 至 400px
- 移动端：拟人图放在 hero 顶部，让用户先看到人格形象再看到文字
- 降低底部 mask 透明度：0.85→0.55，露出更多人物细节
- object-position 改为 `50% 12%`（更偏上，确保面部可见）

**涉及文件**：`styles.css`（`.hero-portrait-col`, `.hero-portrait-wrap`, `.hero-portrait-mask`）

**需改 app.js**：否

**风险**：低

---

### 🔴 Problem 2：缺乏仪式感——个人信息展示不够产品化

**现状**：
- `.hero-badge` "登岛档案" — 9px，几乎看不清
- `.hero-label` "你的核心主岛" — 9px，opacity 0.28
- `.hero-island-name` — 32px，正常但不够突出
- 匹配度"73%" 单独一行，与"主岛契合度"标签之间的视觉关联弱
- 没有"揭晓时刻"的层次递进

**影响**：结果页看起来像问卷报告而非产品体验。缺少"我获得了我的岛"的 moment。

**建议方案**：
- Badge 字号 9→11px，增加金色发光
- Label "你的核心主岛" 9→12px，opacity 0.28→0.5
- 人格名称 32→36-40px，增加文字阴影提升质感
- 匹配度数字 44→56px，% 符号放大
- Hero 顶部装饰线从 80px 加宽到 120px
- 考虑为拟人图添加微妙的金色边框光晕

**涉及文件**：`styles.css`（`.hero-badge`, `.hero-label`, `.hero-island-name`, `.hero-match-num`）

**需改 app.js**：否

**风险**：低

---

### 🟡 Problem 3：信息层级平铺——滚动过长

**现状**：
- Card 总高度 2281px（桌面端），所有 section 权重相等
- Section 2-4 全部默认展开，用户需要滚动 3-4 屏才能看到分享区
- 7 个 `.result-section-divider` 视觉区分度不足（`border-bottom` 方式）
- 缺乏"先看重点，再看详情"的渐进式披露

**影响**：用户被大量文字淹没，可能不会滚动到底部使用分享功能。

**建议方案**：
- Section 3（惯性）和 Section 4（建议）默认折叠，点击展开
- 每个 section 使用更明显的视觉分割（icon + 标题 + 渐变线）
- Section 2（说明书）精简至 2 个子模块（当前 3 个→保留 2 个核心）
- 在 hero 下方添加"跳转到分享"快捷锚点

**涉及文件**：`app.js`（折叠逻辑 + HTML 结构）、`styles.css`（section divider 样式）

**需改 app.js**：是（折叠状态初始化 + section divider HTML）

**风险**：中 — 涉及 DOM 结构变更和 JS 交互

---

### 🟡 Problem 4：分享区域位置不佳

**现状**：
- 分享区在 Section 6，位于 card 底部（2281px 深处）
- Section 5（展开更多细节）默认折叠，但其下方的分享区仍需要滚动到很下面
- 移动端分享按钮 302×44px，可点击但视觉不突出

**影响**：分享率低。用户做完了测试但不会主动滚动到底部分享。

**建议方案**：
- 在 hero 下方添加浮动分享快捷栏（sticky 或紧随 hero）
- 英雄卡片内增加"分享我的主岛"快捷入口
- 保留底部完整分享区，但添加顶部快捷入口

**涉及文件**：`app.js`（新增 HTML）、`styles.css`（sticky 快捷栏）

**需改 app.js**：是（新增 HTML 片段）

**风险**：中 — 新增 DOM 元素

---

### 🟡 Problem 5：移动端截图分享体验不足

**现状**：
- Hero 高度 664px（占 844px 屏幕的 79%），几乎撑满一屏
- 拟人图 238×318 + 文字信息 = 一屏内能同时看到拟人图和名称/匹配度
- 但 share-cover-btn 生成的是 canvas 长图，非"所见即所得"

**影响**：用户无法直接截取 hero 区域作为分享图。依赖 canvas 生成分享卡。

**建议方案**：
- 确保 hero（badge + label + 名称 + 匹配度 + 拟人图 + hitline）在移动端一屏内完整可见
- Hero 高度优化：664→~580px（减小间距、缩小 portrait 比例）
- 考虑 hero 区域自身即可作为"截图分享"模板
- 添加"截图分享引导"提示（仅在移动端显示）

**涉及文件**：`styles.css`（移动端 hero 间距优化）

**需改 app.js**：否（或仅添加移动端引导提示）

**风险**：低

---

## 三、各 Section CSS 现状速查

| 元素 | 当前字号 | 当前颜色 | 问题 |
|------|---------|---------|------|
| `.hero-badge` | 9px | gold-glow | 太小 |
| `.hero-label` | 9px | white-faint (opacity 0.28) | 几乎不可见 |
| `.hero-island-name` | 32px | white-soft | 可以更大 |
| `.hero-match-num` | 44px | gold-glow | 可以更有冲击力 |
| `.hero-hitline` | 14px | white-soft | 合适 |
| `.hero-keyword` | 11px | gold-glow on gold bg | 合适 |
| `.hero-confidence` | 11px | white-faint (opacity 0.6) | 太淡 |
| `.manual-section-title` | 12px | — | 合适 |
| `.manual-section-text` | 12px | — | 合适 |
| `.section-divider-label` | 11-13px | — | 区分度不够 |

---

## 四、12 人格结构一致性

| 检查项 | 结果 |
|--------|------|
| 所有 12 个人格都有 name | ✅ |
| 所有 12 个人格都有 subtitle | ✅ |
| 所有 12 个人格都有 hitLine | ✅ |
| 所有 12 个人格都有 keywords（3 个） | ✅ |
| 所有 12 个人格都有 coreTraits | ✅ |
| 所有 12 个人格都有 strengths | ✅ |
| 所有 12 个人格都有 blindSpots | ✅ |
| 所有 12 个人格都有 growthPlan | ✅ |
| 所有 12 个人格都有 finalReading | ✅ |
| 所有 12 个人格都有 PERSONA_IMAGE_MAP | ✅ |
| HTML 结构所有 12 人格共用同一模板 | ✅ |
| 副岛 echo hint 条件渲染 | ✅ |

**结论：12 人格结构完全一致，共用 `renderResult()` 同一模板。改模板即改所有。**

---

## 五、推荐执行顺序

```
Phase A（纯 CSS，不改 JS，低风险）：
  1. Problem 2 — 仪式感增强
     ├── badge/label/名称/匹配度字号提升
     ├── 金色光晕增强
     └── 装饰线加宽
  2. Problem 1 — 拟人图放大 + mask 减淡
     ├── 桌面端占比 36%→42%
     ├── mask opacity 0.85→0.55
     └── object-position 微调

Phase B（CSS + 少量 JS，中风险）：
  3. Problem 5 — 移动端 hero 一屏化
     └── 间距优化、尺寸微调
  4. Problem 3 — 信息层级渐进式披露
     ├── Section 3/4 默认折叠
     └── Section divider 视觉增强

Phase C（新增 DOM，中风险）：
  5. Problem 4 — 分享入口前移
     ├── Hero 下方快捷分享栏
     └── 移动端截图引导
```

---

## 六、涉及文件

| 文件 | Phase A | Phase B | Phase C | 总改动预估 |
|------|---------|---------|---------|-----------|
| `styles.css` | ~30 行 | ~20 行 | ~25 行 | **~75 行** |
| `app.js` | 0 | ~15 行 | ~20 行 | **~35 行** |
| `index.html` | 0 | 0 | 0 | **0** |

---

## 七、风险矩阵

| 修改 | 风险 | 原因 | 缓解 |
|------|------|------|------|
| Phase A CSS | 低 | 仅调整数值，不改结构 | 逐选择器验证 |
| Phase B 折叠 | 中 | 新增 JS 交互逻辑 | 保留原有 HTML，仅加 class toggle |
| Phase C 新增 DOM | 中 | 新增 HTML 元素 | 小片段插入，不改变现有结构 |
| 移动端适配 | 低 | 已有 responsive 基础 | 390px + 375px + 360px 三重验证 |

---

## 八、不改动

- 评分机制 ✅
- 题库内容 ✅
- 12 人格映射 ✅
- PERSONA_IMAGE_MAP ✅
- 素材文件 ✅
- P0/P1 已修复的 CSS 规则 ✅
- #game-screen / #ending-backdrop ✅

---

> **方案完成。等待确认后从 Phase A 开始执行。**
