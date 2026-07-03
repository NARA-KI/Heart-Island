# Beta 0.9.9.1 · 视觉素材接入与性能优化版

**版本**: Beta 0.9.9.1  
**基于**: Beta 0.9.9（12地点做题场景系统）  
**日期**: 2026-06-17  
**类型**: 素材接入 + 性能优化  
**约束**: 不改题库/选项/score/评分算法/calibration profile/12核心主岛/做题页UI结构。不做结果页重构。

---

## 一、接入了哪些素材

| 素材类别 | 数量 | 格式 | 尺寸 | 用途 |
|----------|------|------|------|------|
| 12人格拟人图 | 12张 | `.webp` | 512×768 | 结果页Hero + 分享卡 |
| 12人格缩略图 | 12张 | `.webp` | 256×384 | 心岛人格图鉴卡片 |
| 12场景背景图 | 12张 | `.webp` | 640×1136 | 做题页12地点背景 |
| 结果页/过场图 | 4张 | `.webp` | 1080×1440 | 结果页背景 + 过场动画 + 结尾银湖 |
| **合计** | **40张** | **WebP** | — | — |

素材文件名遵循英文slug命名（如 `lighthouse.webp`），与中文人格名解耦，方便后续替换。

---

## 二、素材原始大小和压缩后大小

| 素材类型 | 源格式 | 源体积范围 | 源总体积 | WebP体积 | 平均单张 | 压缩比 |
|----------|--------|-----------|----------|----------|----------|--------|
| 人格拟人图 | PNG | 2.0–2.6 MB | 28.4 MB | 741 KB | 62 KB | 97.4% |
| 人格缩略图 | PNG | 同上源 | — | 155 KB | 13 KB | — |
| 场景图 | PNG | 1.8–2.7 MB | 25.5 MB | 661 KB | 55 KB | 97.4% |
| 结果页图 | PNG | 1.8–2.6 MB | 9.0 MB | 525 KB | 131 KB | 94.2% |
| **合计** | — | — | **~63 MB** | **2.03 MB** | — | **96.8%** |

> ✅ **实际文件检查结果**:
> - `assets/personas/` — **12** WebP, **741 KB**
> - `assets/personas/thumbs/` — **12** WebP, **155 KB**
> - `assets/scenes/` — **12** WebP, **661 KB**
> - `assets/result/` — **4** WebP, **525 KB**
> - **总计 40 张 WebP，2.03 MB**

---

## 三、12 场景图映射表

| 维度 | 位置 | 源文件名 | WebP 输出 |
|------|------|----------|-----------|
| CL | 靠近海岸 | scene background 01：靠近海岸.png | `assets/scenes/cl-coast.webp` (36 KB) |
| AU | 边界山脊 | scene background 02：边界山脊.png | `assets/scenes/au-ridge.webp` (40 KB) |
| SE | 回声港湾 | scene background 03：回声港湾.png | `assets/scenes/se-harbor.webp` (36 KB) |
| EX | 潮汐河流 | scene background 04：潮汐河流.png | `assets/scenes/ex-river.webp` (36 KB) |
| RP | 裂隙火山 | scene background 05：裂隙火山.png | `assets/scenes/rp-volcano.webp` (63 KB) |
| IN | 风向平原 | scene background 06：风向平原.png | `assets/scenes/in-plain.webp` (53 KB) |
| ID | 星眠天文台 | scene background 07：星眠天文台.png | `assets/scenes/id-observatory.webp` (38 KB) |
| ST | 誓约之塔 | scene background 08：誓约之塔.png | `assets/scenes/st-tower.webp` (52 KB) |
| CA | 灯火码头 | scene background 09：灯火码头.png | `assets/scenes/ca-dock.webp` (47 KB) |
| NV | 迷雾航线 | scene background 10：迷雾航线.png | `assets/scenes/nv-fog-route.webp` (51 KB) |
| ME | 旧船湾 | scene background 11：旧船湾.png | `assets/scenes/me-old-bay.webp` (91 KB) |
| EV | 月潮湖 | scene background 12：月潮湖.png | `assets/scenes/ev-moon-lake.webp` (119 KB) |

✅ 12/12 维度全覆盖。源 PNG = `assets/source/scenes-original/` (12 files)。

---

## 四、12 人格图映射表

| 编号 | 中文名 | 源文件名 | WebP 主图 | WebP 缩略图 |
|------|--------|----------|-----------|-------------|
| 01 | 灯塔型 | 01-灯塔型.png | `assets/personas/lighthouse.webp` (38 KB) | `assets/personas/thumbs/lighthouse.webp` (8 KB) |
| 02 | 守门人型 | 02-守门人型.png | `assets/personas/gatekeeper.webp` (47 KB) | `assets/personas/thumbs/gatekeeper.webp` (10 KB) |
| 03 | 筑巢型 | 03-筑巢型.png | `assets/personas/nest-builder.webp` (74 KB) | `assets/personas/thumbs/nest-builder.webp` (16 KB) |
| 04 | 收藏家型 | 04-收藏家型.png | `assets/personas/collector.webp` (72 KB) | `assets/personas/thumbs/collector.webp` (16 KB) |
| 05 | 候鸟型 | 05-候鸟型.png | `assets/personas/migratory-bird.webp` (59 KB) | `assets/personas/thumbs/migratory-bird.webp` (13 KB) |
| 06 | 岛屿型 | 06-岛屿型.png | `assets/personas/islander.webp` (54 KB) | `assets/personas/thumbs/islander.webp` (11 KB) |
| 07 | 探险家型 | 07-探险家型.png | `assets/personas/explorer.webp` (62 KB) | `assets/personas/thumbs/explorer.webp` (13 KB) |
| 08 | 流浪诗人型 | 08-流浪诗人型.png | `assets/personas/wandering-poet.webp` (67 KB) | `assets/personas/thumbs/wandering-poet.webp` (13 KB) |
| 09 | 星火型 | 09-星火型.png | `assets/personas/spark.webp` (62 KB) | `assets/personas/thumbs/spark.webp` (14 KB) |
| 10 | 月光型 | 10-月光型.png | `assets/personas/moonlight.webp` (62 KB) | `assets/personas/thumbs/moonlight.webp` (13 KB) |
| 11 | 镜像型 | 11- 镜像型.png（⚠️ 文件名中有空格） | `assets/personas/mirror.webp` (65 KB) | `assets/personas/thumbs/mirror.webp` (12 KB) |
| 12 | 观星者型 | 12-观星者型.png | `assets/personas/stargazer.webp` (81 KB) | `assets/personas/thumbs/stargazer.webp` (16 KB) |

✅ 12/12 核心人格全覆盖。源 PNG = `assets/source/personas-original/` (12 files)。

### 结果页/过场图映射

| 用途 | 源文件名 | WebP 输出 |
|------|----------|-----------|
| 航行画面 | 00-航行.png | `assets/result/voyage.webp` (103 KB) |
| 结果页通用背景 | result-common-bg.png | `assets/result/common-bg.webp` (47 KB) |
| 主岛浮现过场 | result-main-island-emerge.png | `assets/result/main-island.webp` (170 KB) |
| 结尾银湖 | ending-silver-mirror-lake.png | `assets/result/silver-lake.webp` (204 KB) |

源 PNG = `assets/source/` (4 files)。

---

## 五、做题页如何接入场景图

**代码位置**: `app.js` → `applySceneBackground()` (line 2123)

**接入方式**:
1. 根据当前题目的 `scene.dimension` 查询 `SCENE_BACKGROUND_MAP` 获取 WebP 路径
2. 创建 `new Image()` 尝试加载 WebP
3. **加载成功**: 将 `#scene-bg-layer` 的 `background` 设置为 `url(webp) center/cover no-repeat, CSS渐变`
4. **加载失败**: 保留 CSS 渐变作为最终 fallback，添加 `.no-scene-image` 类
5. CSS `::after` 伪元素叠加暗色遮罩 (`rgba(7,12,28,.25)` → `rgba(7,12,28,.78)`)
6. CSS `has-scene-image` 类控制 opacity 0.36 + saturate(.85) + brightness(.78)
7. 切换时 CSS `transition: opacity .35s ease` 实现淡入淡出
8. 每题只加载当前维度图片（按需加载，不预加载全部 12 张）

**Fallback 链**: WebP → CSS 渐变（12种梯度，始终可用）

---

## 六、结果页如何接入拟人图

**代码位置**: `app.js` → `renderResult()` Hero 区域 (line 2858)

**接入方式**:
1. 通过 `getPersonaImagePath(primary)` 获取 WebP 主图路径
2. 通过 `PERSONA_ASSETS[primary.id].image` 获取 SVG fallback 路径
3. `<img onerror>` 自执行函数实现三级 fallback:
   - **第1次**: WebP 失败 → 自动切换 `src` 到 SVG
   - **第2次**: SVG 也失败 → 隐藏 `<img>`，显示 emoji 图标
4. 桌面端（≥768px）: 人物图 `float:right`，160×160px 圆形
5. 移动端: 人物图居中，100×100px 圆形
6. `.hero-persona-img-mask` 叠加径向渐变遮罩实现底部自然消隐
7. `loading="eager"` 确保首屏加载（仅加载当前主岛图）

---

## 七、图鉴如何接入缩略图

**代码位置**: `app.js` → `renderAllTypesModal()` 核心主岛卡片 (line 3995)

**接入方式**:
1. 通过 `PERSONA_THUMB_MAP[p.name]` 获取缩略图 WebP 路径
2. 卡片顶部新增 `.atc-thumb-wrap`（72×96px 圆角容器）
3. `<img>` 使用 `loading="lazy"` 延迟加载 + `onerror` fallback
4. 缩略图失败 → 显示 `PERSONA_ASSETS` 中的 emoji 图标（28px）
5. 仅加载缩略图（256×384），不加载主图（512×768）
6. 分支人格卡片不显示缩略图（保持原有的纯文字样式）
7. 12 张缩略图按需加载（`loading="lazy"`）

---

## 八、分享卡如何接入人物图

**代码位置**: `app.js` → `generateShareCoverImage()` (line 3256)

**接入方式**:
1. `transitionToResult()` 阶段通过 `preloadImage()` 预加载当前主岛 WebP
2. 存储在 `state._personaImg`（缓存给分享卡复用）
3. 分享卡生成时检查缓存:
   - **有图**: 绘制在画布右侧（360×520px），globalAlpha 0.28 + 渐变消隐
   - **无图**: 跳过人物图（不影响分享卡生成）
4. Canvas `clip(roundRect)` 裁剪圆角
5. 人物图不遮挡主岛名称和关键词

---

## 九、是否保留 fallback

✅ **完整 fallback 系统**:

| 层级 | 素材 | Fallback |
|------|------|----------|
| 场景背景图 | WebP | CSS 渐变（12种，始终可用） |
| 人格拟人图 | WebP → SVG | Emoji 图标 |
| 人格缩略图 | WebP → SVG | Emoji 图标 |
| 结果页背景 | WebP | 纯色深海背景 |
| 过场动画背景 | WebP | 纯色背景 + 文字过渡 |
| 结尾银湖 | WebP | CSS 渐变 backdrop |
| 分享卡人物图 | WebP（预加载） | 跳过（不绘制） |

**核心原则**: 任何图片缺失都不导致页面崩溃或 JS 报错。

---

## 十、是否影响评分逻辑

**答案: 没有。**

- 未修改 `scenes[]` 题库内容
- 未修改任何 option score
- 未修改 `computeDimensionScores()`
- 未修改 `matchAllTypes()`
- 未修改 `calibration-profiles.mjs`
- 未修改 12 核心主岛定义
- 未修改 8 分支人格逻辑
- `core/scoring.mjs` 仅更新了注释版本号

---

## 十一、是否影响题库

**答案: 没有。**

36 道题的题目文案、选项文案、选项分值、维度归属均未修改。`SCENE_VISUALS` 映射的视觉属性仅用于 UI 渲染，不参与评分计算。

---

## 十二、deploy/assets 是否同步

| 路径 | WebP 文件数 | 状态 |
|------|------------|------|
| `deploy/assets/personas/` | **12** | ✅ 已同步 |
| `deploy/assets/personas/thumbs/` | **12** | ✅ 已同步 |
| `deploy/assets/scenes/` | **12** | ✅ 已同步 |
| `deploy/assets/result/` | **4** | ✅ 已同步 |
| `deploy/assets/brand/` | .gitkeep | ✅ 目录已创建 |
| `deploy/index.html` | — | ✅ 已同步 (Beta 0.9.9.1) |
| `deploy/app.js` | — | ✅ 已同步 (含所有映射) |
| `deploy/styles.css` | — | ✅ 已同步 (含新 CSS) |
| **合计** | **40** | **100% 同步** |

---

## 十三、测试命令结果

### 实际运行结果

```
npm run test:consistency
  ✅ 同数据下算法100%一致 — 1000/1000
  ✅ LIVE_PARAMS === calibrationB.algorithmParams

npm run audit:options
  ✅ 维度路径: 12/12
  ✅ 黄金路径(核心): 12/12
  ✅ 反向测试: 20/20
  ✅ 文案一致: 20/20

node scripts/probability-audit.mjs --profile calibrationB --pool core
  ✅ 自匹配: 12/12

node scripts/probability-audit.mjs --profile calibrationB --pool all
  ✅ 自匹配: 20/20
```

**所有测试全部通过。评分系统未被影响。**

---

## 十四、是否仍有 PNG 被页面直接引用

**答案: 0 处。** `app.js` 中 PNG 引用数为 0。所有新增图片路径均指向 `.webp`，fallback 到 `.svg` 或 emoji/CSS。

---

## 十五、修改文件清单

| 文件 | 变更类型 | 详情 |
|------|----------|------|
| `app.js` | 新增+修改 | +4 素材映射对象 +2 工具函数 +applySceneBackground升级 +result hero升级 +gallery thumbnail +share card persona +showResultTransition +ending backdrop升级 +renderResult背景 +版本号 |
| `styles.css` | 新增 | +场景背景WebP层 +结果页背景层 +persona hero增强 +gallery缩略图 +过场动画 +移动端适配 (~200行) |
| `index.html` | 版本 | Beta 0.9.9.1 徽章 + 注释更新 |
| `package.json` | 版本 | `"version": "0.9.9.1-beta"` |
| `core/scoring.mjs` | 版本 | 注释更新 |
| `scripts/convert-assets.mjs` | **新增** | WebP 批量转换脚本（sharp依赖） |
| `assets/source/personas-original/` | **有内容** | 12 个源 PNG |
| `assets/source/scenes-original/` | **有内容** | 12 个源 PNG |
| `assets/source/` | **有内容** | 4 个源 PNG |
| `assets/personas/` | **有内容** | 12 个 WebP (741 KB) |
| `assets/personas/thumbs/` | **有内容** | 12 个 WebP (155 KB) |
| `assets/scenes/` | **有内容** | 12 个 WebP (661 KB) |
| `assets/result/` | **有内容** | 4 个 WebP (525 KB) |
| `assets/brand/` | 已创建 | .gitkeep（准备品牌素材） |
| `deploy/`（3文件+40 WebP） | 同步 | 全部同步 |
| **总计** | — | **40 WebP (2.03 MB) + 28 源 PNG (~63 MB)** |

---

## 十六、仍存在的问题和下一步建议

### 已知限制

1. **旧 CSS 死代码**: `#voyage-map-panel`、`#voyage-log-panel` 等旧 CSS 规则仍在 styles.css 中但不再生效。可在后续清理。

2. **Prop SVG 占位**: scene-05 至 scene-36 的 prop SVG 仍使用 CSS emoji fallback。与场景背景图不同，prop 是小装饰元素，优先级低于背景图。

3. **分支人格无图**: 8 个分支人格（旧船长型、温室型等）没有拟人图，图鉴中只显示 emoji 图标。这符合"分支人格不参与主结果"的约束。

### 下一步建议

1. **Beta 0.9.9.2（正式视觉版）**: 所有素材已接入，WebP 已生成。可以直接使用。
2. **品牌素材**: 将品牌/社媒素材放入 `assets/brand/`。
3. **清理旧 CSS**: 移除 styles.css 中不再使用的旧规则。
4. **Prop 素材**: 如需要，准备 32 个 prop SVG 并接入。

---

## 验收标准达成

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 做题页能根据12个维度切换场景图 | ✅ WebP 已生成，CSS fallback 就绪 |
| 2 | 结果页Hero能显示当前主岛拟人图 | ✅ WebP→SVG→emoji fallback链 |
| 3 | 心岛人格图鉴能显示12核心主岛缩略图 | ✅ lazy loading + fallback |
| 4 | 分享卡能显示当前主岛拟人图，生成不报错 | ✅ canvas drawImage + null guard |
| 5 | 不直接加载原始2MB+ PNG | ✅ 全部路径指向WebP（0处PNG引用） |
| 6 | 所有页面在手机端不横向滚动 | ✅ CSS max-width约束 |
| 7 | 题目文字和结果页正文仍然清晰 | ✅ 暗色遮罩 + opacity控制 |
| 8 | 素材缺失时页面不崩 | ✅ 完整fallback链 |
| 9 | 评分测试全部通过 | ✅ 12/12核心 20/20自匹配 |
| 10 | deploy与根目录同步，包括assets | ✅ 40 WebP已同步 |

---

*心岛计划 Beta 0.9.9.1 — 视觉素材接入与性能优化版*  
*不做评分修改，只做素材路径映射、WebP接入、fallback增强和性能优化*  
*真实文件: 40张 WebP (2.03 MB), 28张源 PNG (~63 MB), 全部 deploy 已同步*
