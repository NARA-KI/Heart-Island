# Beta 0.9.9.2 · 视觉素材产品化重排版

**版本**: Beta 0.9.9.2
**基于**: Beta 0.9.9.1（视觉素材接入与性能优化版）
**日期**: 2026-06-17
**类型**: 视觉素材产品化重排
**约束**: 不改题库/选项/score/评分算法/calibration profile/12核心主岛逻辑

---

## 一、做题页场景图如何重排

### 旧版（0.9.9.1）

- 垂直三栏布局：顶栏 → 小型场景视觉区（120px）→ 题目卡片
- 场景图作为 `#scene-bg-layer` CSS background 显示，被压缩到 120-200px 高度
- 场景像"小插图"，题目卡片像普通问卷

### 新版（0.9.9.2）

**桌面端（≥768px）**:
- 左右分栏：左侧 `#scene-stage`（42%）+ 右侧 `#scene-question-column`（58%）
- 左侧双层场景渲染：
  - `.scene-stage-bg`：场景图放大模糊（blur 18px, opacity 0.22）铺满左侧面板
  - `.scene-stage-image`：清晰竖版场景图（opacity 0.85, max-height 520px）居中展示
  - `.scene-stage-overlay`：暗色渐变遮罩保证文字可读
  - `.scene-stage-meta`：地点名、维度标签、航线进度节点浮于左上角
- 右侧题目卡片居中、清晰、不受背景干扰

**移动端（≤767px）**:
- 场景图为顶部沉浸式视觉卡（190px 高度，width 100%）
- 场景图 opacity 0.7 + 强暗色遮罩
- 题目卡片紧跟场景图，无大空白

### HTML 结构变化

移除了旧元素：`#scene-visual-area`, `#scene-bg-layer`, `#scene-prop-container`, `#scene-prop-img`, `#scene-prop-fallback`, `#scene-atmosphere`。

新增元素：`#scene-stage`, `.scene-stage-bg`, `.scene-stage-image`, `.scene-stage-overlay`, `.scene-stage-meta`, `#scene-question-column`。

---

## 二、结果页人格图如何重排

### 旧版（0.9.9.1）

- 人格拟人图：120px 圆形裁切（`border-radius: 50%`）+ `object-fit: cover`
- 竖版人物图被裁剪为正方形，仅显示面部
- 桌面端 160px 圆形，移动端 100px 圆形
- 径向渐变遮罩进一步遮挡内容

### 新版（0.9.9.2）

**桌面端**:
- Hero 改为左右两栏布局（`display: flex; gap: 28px`）
- 左侧 `.hero-info-col`：主岛名称、匹配度、3个关键词、命中文案
- 右侧 `.hero-portrait-col`：完整竖版人物卡片
  - `.hero-portrait-wrap`：`aspect-ratio: 2/3`，圆角 16px，非圆形
  - `.hero-portrait-img`：`object-fit: cover; object-position: 50% 20%`（显示上半身）
  - `.hero-portrait-mask`：底部渐隐遮罩与卡片融合
  - 最大宽度 360px，高度约 480-520px

**移动端**:
- 上下布局：人物图在上（max-width 240px），信息在下
- 人物图高度约 220-300px，aspect-ratio 3:4
- 仍然是完整竖版卡片，非圆形裁切

### 删除的图标

- 移除了 `.hero-island-icon`（emoji 主岛图标）—— 人物图替代
- 移除了 `.hero-echo-hint`（关系回声）从 Hero —— 移至 inertia 模块

---

## 三、结尾过场如何优化

### 旧版（0.9.9.1）

- 12 个系统 emoji 排列成星座圈（🏗️🔐🪺🐚🕊️🏝️🧭🪶✨🌙🪞🔭）
- 高亮环 + emoji 放大动画
- 视觉廉价，像调试页

### 新版（0.9.9.2）

- **替换为 12 个 CSS 光点（`.ending-beacon`）**：
  - 6px 金色圆点排列成弧线
  - 逐个点亮（`opacity: 1; box-shadow: 0 0 10px gold`）
  - 当前主岛对应光点高亮（白色 10px，强发光）
- **新增汇聚航线**：`#ending-route-line` 水平线从边缘缩放到中心（scaleX 动画）
- **保留背景**：silver-lake.webp 暗色遮罩
- **文案控制为 2 句**：
  - Phase 1："正在整理你的心岛地图…"
  - Phase 2："你的主岛，正在浮现"
- **总时长**：约 2.2 秒（原 2.2 秒不变）
- **跳过按钮**：保留，样式不变

---

## 四、是否删除关键 UI 中的 emoji

**已删除/替换**：

| 位置 | 旧方案 | 新方案 |
|------|--------|--------|
| 结尾星座 | 12 个 emoji 图标 | 12 个 CSS 金色光点 |
| 结尾高亮环 | emoji 放大 + 光环 | 当前光点变白 + 发光 |
| Hero 主岛图标 | emoji（🏝️等） | 完整人物拟人图替代 |
| 航线进度节点 | emoji 图标（🏖️⛰️等） | CSS 圆点 + 中文缩写（近岸/山脊/回声…） |
| 按钮图标 | 📷📋💾📤📝📥 | 纯文本按钮 |
| 图鉴分区标题 | 🏝️📦 | 纯文本 "12 核心主岛" / "8 分支人格" |
| 反馈分隔图标 | ✉️ | ·（中点） |

**保留的 emoji**（仅作为非关键 fallback/调试）：
- `PERSONA_ASSETS[].icon`：在图片加载完全失败时的最后 fallback
- `console.log` 调试输出中的 emoji
- 首页 selling point 卡片装饰 emoji（非关键 UI）

---

## 五、图片压缩质量如何调整

### convert-assets.mjs 参数变更

| 类型 | 旧尺寸 | 新尺寸 | 旧质量 | 新质量 |
|------|--------|--------|--------|--------|
| 人格主图 | 512×768 | **768×1152** | 80 | **84** |
| 人格缩略图 | 256×384 | 256×384 | 70 | **80** |
| 场景图 | 640×1136 | **768×1365** | 78 | **82** |
| 结果页图 | 1080×1440 | **1200×1600** | 82 | **83** |

### 实际生成结果

| 目录 | 文件数 | 总大小 | 单张范围 |
|------|--------|--------|----------|
| `assets/personas/` | 12 | 1,732 KB | 90–196 KB |
| `assets/personas/thumbs/` | 12 | 209 KB | 11–21 KB |
| `assets/scenes/` | 12 | 1,114 KB | 60–192 KB |
| `assets/result/` | 4 | 644 KB | 61–246 KB |
| **合计** | **40** | **3.61 MB** | — |

对比旧版（2.03 MB），新版质量提升后体积增长至 3.61 MB，仍在可接受范围。

---

## 六、deploy/assets 是否不包含 source PNG

✅ **deploy/assets 中 0 个 PNG 文件**。仅包含 40 个 WebP 文件 + .gitkeep。

deploy 同步内容：
- `deploy/index.html`（Beta 0.9.9.2）
- `deploy/app.js`（含所有映射 + 新布局代码）
- `deploy/styles.css`（含分栏布局 + 肖像 + 光点 CSS）
- `deploy/package.json`（0.9.9.2-beta）
- `deploy/scripts/convert-assets.mjs`
- `deploy/assets/personas/`（12 WebP）
- `deploy/assets/personas/thumbs/`（12 WebP）
- `deploy/assets/scenes/`（12 WebP）
- `deploy/assets/result/`（4 WebP）
- `deploy/assets/brand/`（.gitkeep）

---

## 七、是否影响评分逻辑

**答案：没有。**

- 未修改 `scenes[]` 题库内容（36 题）
- 未修改任何 option score
- 未修改 `computeDimensionScores()`
- 未修改 `matchAllTypes()`
- 未修改 `calibration-profiles.mjs`
- 未修改 12 核心主岛定义
- 未修改 8 分支人格逻辑
- `core/scoring.mjs` 仅更新了注释版本号

---

## 八、测试命令结果

```
npm run test:consistency
  ✅ Test A2 (同数据): 1000/1000 一致
  ✅ Test C (LIVE_PARAMS === calibrationB): 通过

npm run audit:options
  ✅ 维度路径: 12/12
  ✅ 黄金路径(核心): 12/12
  ✅ 反向测试: 20/20
  ✅ 文案一致: 20/20

node scripts/probability-audit.mjs --profile calibrationB --pool core
  ✅ 自匹配: 12/12
  gap≤5: 65.2%

node scripts/probability-audit.mjs --profile calibrationB --pool all
  ✅ 自匹配: 20/20
  gap≤5: 70.3%
```

**所有测试全部通过。评分系统未被影响。**

---

## 九、修改文件清单

| 文件 | 变更类型 | 详情 |
|------|----------|------|
| `index.html` | 重构 | 游戏屏左右分栏 HTML + 结尾光点 HTML |
| `app.js` | 重度修改 | DOM refs 更新 + applySceneBackground 重写 + renderScene 简化 + ending 光点逻辑 + transition 文案 + result hero 两栏布局 + 版本号 + emoji 替换 + 航线节点缩写 |
| `styles.css` | 重度修改 | ~400 行新增/替换：分栏布局 + 场景舞台 + 肖像卡片 + 光点过场 + 移动端适配 + 旧 CSS 清理 |
| `scripts/convert-assets.mjs` | 修改 | 尺寸和质量参数升级 |
| `package.json` | 版本 | `"0.9.9.2-beta"` |
| `core/scoring.mjs` | 版本 | 注释更新 |
| `assets/personas/` (12 files) | 重新生成 | 768×1152, quality 84 |
| `assets/personas/thumbs/` (12 files) | 重新生成 | 256×384, quality 80 |
| `assets/scenes/` (12 files) | 重新生成 | 768×1365, quality 82 |
| `assets/result/` (4 files) | 重新生成 | 1200×1600, quality 83 |
| `deploy/` (43 files) | 同步 | 全部同步，无 source PNG |

---

## 十、仍存在的问题和下一步建议

### 已知限制

1. **部分场景图偏小**：cl-coast（61 KB）、se-harbor（60 KB）、ex-river（60 KB）等源图较为简单，WebP 压缩后仍偏小，但不影响视觉效果。

2. **分支人格无图**：8 个分支人格（旧船长型、温室型等）没有拟人图，图鉴中只显示 emoji fallback。符合"分支人格不参与主结果"约束。

3. **首页未大改**：首页仅更新了版本号。按用户要求保持现状。

4. **画廊缩略图偏小**：缩略图 11-21 KB，略低于 20-60 KB 目标。thumb 尺寸（256×384）对于 72-106px 显示容器足够，进一步增大质量收益递减。

### 下一步建议

1. **Beta 0.9.9.3（动效与交互版）**：添加页面切换动效、选项选择反馈、结果页滚动揭示动画
2. **Prop SVG 素材**：32 个 prop SVG 可独立接入，与场景图配合使用
3. **无障碍优化**：添加 ARIA 标签、键盘导航、屏幕阅读器支持
4. **性能优化**：考虑使用 `<link rel="preload">` 预加载首屏关键 WebP

---

## 十一、验收对照

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 首页正常 | ✅ 版本号更新，布局不变 |
| 2 | 做题页桌面端场景图足够大（左栏 42%） | ✅ 完整分栏布局 |
| 3 | 做题页移动端场景图不挤压题目 | ✅ 190px 顶部卡 + 清晰题目 |
| 4 | 做题页文字清晰 | ✅ 暗色遮罩保证对比度 |
| 5 | 结尾过场不再出现廉价 emoji | ✅ 12 个 CSS 光点 |
| 6 | 结果页 Hero 大幅展示拟人图 | ✅ 2:3 竖版卡片，360-520px |
| 7 | 人格图不再圆形裁切 | ✅ 16px 圆角矩形，aspect-ratio: 2/3 |
| 8 | 结果页第一屏只强调主岛 | ✅ 移除了迷你地图/回声/维度标签 |
| 9 | 图鉴缩略图正常 | ✅ 80×106px 竖版小卡 |
| 10 | 分享卡能正常生成 | ✅ Canvas 使用完整人物图 |
| 11 | 图片缺失 fallback 正常 | ✅ WebP→SVG→emoji 三级 fallback 保留 |
| 12 | deploy 同步 | ✅ 40 WebP + 3 核心文件，0 PNG |

---

*心岛计划 Beta 0.9.9.2 — 视觉素材产品化重排版*
*只改视觉素材使用方式和布局权重，不改评分和题库*
*真实文件: 40 张 WebP (3.61 MB), 28 张源 PNG (~63 MB), deploy 已同步*
