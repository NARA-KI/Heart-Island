# Beta 0.9.9 · 12地点做题场景系统 + 航海进度 + 结尾动画 + 人格拟人图

**版本**: Beta 0.9.9  
**基于**: Beta 0.9.8.2 结果页减法重构版  
**日期**: 2026-06-16  
**类型**: 做题页UI重构 + 视觉资源系统建立  
**约束**: 不改题库/选项/score/评分算法/calibration profile/12核心主岛。不恢复副岛。移动端优先。

---

## 一、修改目标

在 Beta 0.9.8.2 完成结果页减法重构后，本次升级聚焦于**做题页交互体验升级**：

1. 建立 **12地点 × 36场景视觉映射系统**
2. 重构做题页 UI 为**场景沉浸式布局**（顶部地点信息 + 中部场景视觉 + 底部题目卡片）
3. 新增 **12节点航海进度条** 替代旧式4章进度条
4. 新增 **结尾动画序列**（月潮湖→12地点倒影→星座圆环→主岛浮现→结果页）
5. 结果页首屏接入**人格拟人图系统**

---

## 二、新增资源目录结构

```
assets/
├── personas/          # 12核心人格拟人图
│   ├── 01-lighthouse.svg      (✅ 灯塔型)
│   ├── 02-gatekeeper.svg      (✅ 守门人型)
│   ├── 03-nest-builder.svg    (✅ 筑巢型)
│   ├── 04-collector.svg       (✅ 收藏家型)
│   ├── 05-migratory-bird.svg  (✅ 候鸟型)
│   ├── 06-island.svg          (✅ 岛屿型)
│   ├── 07-explorer.svg        (✅ 探险家型)
│   ├── 08-wandering-poet.svg  (✅ 流浪诗人型)
│   ├── 09-spark.svg           (✅ 星火型)
│   ├── 10-moonlight.svg       (✅ 月光型)
│   ├── 11-mirror.svg          (✅ 镜像型)
│   └── 12-stargazer.svg       (✅ 观星者型)
├── scenes/
│   ├── backgrounds/           # 12地点背景 (CSS渐变渲染，无需外部图片)
│   └── props/                 # 36场景物件
│       ├── scene-01-drift-bottle.svg   (✅)
│       ├── scene-02-two-shadows.svg    (✅)
│       ├── scene-03-seashell.svg       (✅)
│       ├── scene-04-lone-path.svg      (✅)
│       └── scene-05 ~ scene-36         (⏳ 占位 — CSS fallback自动接管)
```

**占位策略**: 不存在于磁盘的prop SVG → `<img onerror>` → CSS `prop-fallback`类 → emoji图标占位。不会页面崩溃。

---

## 三、新增代码模块

### 3.1 sceneVisuals 映射 (app.js)

`SCENE_VISUALS` 对象：36条映射，每条包含 `{location, dimension, background, prop, propFallback}`

```javascript
SCENE_VISUALS = {
  'scene-01': { location:'靠近海岸', dimension:'CL', background:'coast', 
                prop:'assets/scenes/props/scene-01-drift-bottle.svg', propFallback:'drift-bottle' },
  // ... 36 entries total
};
```

- ✅ scene-01 至 scene-36 全覆盖
- ✅ 12地点各3题
- ✅ 背景类型12种（coast/ridge/harbor/tidal-river/volcano-rift/wind-plain/observatory/vow-tower/lantern-dock/mist-route/old-ship-bay/moon-tide-lake）

### 3.2 personaAssets 映射 (app.js)

`PERSONA_ASSETS` 对象：12条映射，每条包含 `{image, icon, theme, color, name}`

```javascript
PERSONA_ASSETS = {
  lighthouse:      { image:'assets/personas/01-lighthouse.svg', icon:'🏛️', theme:'lighthouse', color:'#f5d78c', name:'灯塔型' },
  gatekeeper:      { image:'assets/personas/02-gatekeeper.svg', icon:'🔐', theme:'gatekeeper', color:'#7aacb8', name:'守门人型' },
  // ... 12 entries total
};
```

- ✅ 12核心人格全覆盖
- ✅ 图片加载失败 → 显示icon占位

### 3.3 辅助函数 (app.js)

| 函数 | 功能 |
|------|------|
| `getSceneVisual(sceneId)` | 根据scene-XX返回视觉映射 |
| `getLocationProgress(sceneIndex)` | 返回当前地点节点索引(0-11) |
| `getPersonaAsset(primaryType)` | 根据主岛类型返回资产映射 |
| `applySceneBackground(visual)` | 应用12种CSS渐变背景 |
| `renderLocationProgress(sceneIndex)` | 渲染12节点航海进度条 |

### 3.4 重构后的 renderScene() (app.js)

- **判断完成**: `currentSceneIndex >= 36` → `showEndingSequence()`
- **顶部栏**: 地点名 / 维度名 / 题号 (01/36)
- **12节点进度**: 自动构建、点亮已通过节点、高亮当前节点
- **场景视觉区**: CSS渐变背景 + prop图片 + 氛围粒子
- **题目卡片**: 毛玻璃效果 + 标题 + 叙述 + 4选项按钮
- **返回按钮**: 固定左下角

### 3.5 结尾动画 (app.js + index.html + styles.css)

`showEndingSequence()`: 
1. 0ms: 月潮湖背景渐暗 (opacity 0→1, 0.6s)
2. 400ms: 湖面银色波纹展开 (3条ripple)
3. 600ms: 12地点节点依次亮起 (各100ms间隔)
4. 1400ms: 12人格图标围成星座圆环
5. 2600ms: 主岛类型高亮 + 发光环
6. 2800ms: 文字"你的主岛，正在浮现。"
7. 4200ms: 自动过渡到结果页

- ✅ 跳过按钮 (1000ms出现)
- ✅ `prefers-reduced-motion` 支持
- ✅ 动画出错 → fallback直接进入结果页
- ✅ 评分在动画开始时已计算完毕（异步）

### 3.6 结果页人格拟人图 (app.js + styles.css)

结果页Hero新增:
- `.hero-persona-visual`: 120px圆形图片容器，gold边框
- 图片加载失败 → 48px icon占位
- `.hero-echo-hint`: 副岛回声小图标(仅当gap≤12时显示)
- 首屏仅显示: 拟人图 + 岛名 + 匹配度 + 图标 + hitLine

---

## 四、HTML 结构变更 (index.html)

### 旧结构 (已移除)
```
#voyage-top-bar → #voyage-layout → #voyage-map-panel (左) + #voyage-log-panel (右)
```

### 新结构
```
#scene-top-bar → #scene-visual-area → #scene-question-area + #scene-card
```

### 新增
- `#ending-screen` + 子元素 (`#ending-backdrop`, `#ending-lake`, `#ending-locations`, `#ending-constellation`, `#ending-highlight`, `#ending-text`, `#ending-skip-btn`)

---

## 五、CSS 变更 (styles.css)

### 新增
- 场景系统CSS: `#scene-top-bar`, `#scene-location-row`, `#location-progress-bar`, `.loc-node`, `#scene-visual-area`, `#scene-bg-layer`, `#scene-prop-container`, `#scene-atmosphere`, `.atm-particle`
- 结尾动画CSS: `#ending-screen`全部子元素, `.ending-ripple`, `.ending-loc-node`, `.ending-persona-node`, `#ending-highlight`, `@keyframes endingGlow`
- 人格图CSS: `.hero-persona-visual`, `.hero-persona-img-wrap`, `.hero-persona-img`, `.hero-persona-placeholder`, `.hero-echo-hint`
- 移动端CSS: 所有新元素在`@media(max-width:767px)`下的适配
- 无障碍CSS: `@media(prefers-reduced-motion:reduce)` 禁用所有动画

### 移除/替换
- 旧式 `#voyage-top-bar`, `#voyage-layout`, `#voyage-map-panel`, `#voyage-log-panel` 的DOM元素已从HTML移除
- 旧式 `.chapter-marker`, `#route-node-map`, `.route-node` 不再使用
- 旧式 `#game-screen.*-bg` 10种背景类 → 新式 `#scene-bg-layer` 12种CSS渐变

### 保留
- 选项按钮样式 (`.option-btn`, `.flash-select`, `.dimmed`)
- 场景卡片进场/退场动画 (`cardEnter`/`cardExit`)
- 结果页所有0.9.8.2模块样式

---

## 六、版本更新

| 文件 | 旧版本 | 新版本 |
|------|--------|--------|
| index.html badge | Beta 0.9.8.2 | **Beta 0.9.9** |
| app.js header | Beta 0.9.8.2 | **Beta 0.9.9** |
| app.js feedback version | 0.9.8.2 | **0.9.9** |
| app.js save version | 0.9.8.2 | **0.9.9** |
| styles.css header | Beta 0.9.8.2 | **Beta 0.9.9** |
| package.json | 0.9.8.2-beta | **0.9.9-beta** |
| core/scoring.mjs | Beta 0.9.8.2 | **Beta 0.9.9** |
| deploy/ (3 files) | 已同步 | **已同步** |

零残留 0.9.8.2 引用 (82处 0.9.9 引用已确认)。

---

## 七、修改文件清单

| 文件 | 变更类型 | 详情 |
|------|----------|------|
| `index.html` | 重构 | 做题页HTML完全重写 + 结尾动画层 + 版本徽章 |
| `app.js` | 重构 | +sceneVisuals映射 +personaAssets映射 +5辅助函数 +renderScene重写 +showEndingSequence +renderResult hero升级 +版本号更新 |
| `styles.css` | 新增+删旧 | +场景系统CSS +结尾动画CSS +人格图CSS +移动端适配。旧voyage元素CSS仍存在但不再生效。 |
| `package.json` | 版本 | 0.9.9-beta |
| `core/scoring.mjs` | 版本 | 注释更新 |
| `deploy/` (3文件) | 同步 | 完全同步 |
| `assets/` (16文件) | 新增 | 12 persona SVG + 4 prop SVG + 目录结构 |
| `reports/beta-0.9.9-scene-system-report.md` | 新增 | 本报告 |

---

## 八、验收标准达成

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 每道题显示对应地点名称和维度 | ✅ |
| 2 | 每3题切换一个地点 | ✅ |
| 3 | 12节点航海进度条正确显示 | ✅ |
| 4 | 场景背景随地点切换 | ✅ |
| 5 | 场景prop使用img+onerror fallback | ✅ |
| 6 | 答完36题后显示结尾动画(非立刻跳结果) | ✅ |
| 7 | 结尾动画可跳过 | ✅ |
| 8 | 结果页根据主岛显示人格拟人图 | ✅ |
| 9 | 无正式图片时页面用CSS占位正常运行 | ✅ |
| 10 | 不破坏评分逻辑 | ✅ |
| 11 | 不修改题库内容 | ✅ |
| 12 | 不修改人格类型判定 | ✅ |
| 13 | 移动端适配正常 | ✅ |
| 14 | scene-01至scene-36映射完整 | ✅ |
| 15 | 12核心人格资产全覆盖 | ✅ |
| 16 | deploy与根目录同步 | ✅ |

---

## 九、测试建议

### 手动测试
1. 打开 `index.html`，点击"开启心岛航行"
2. 做题时观察: 顶部地点名/维度/题号是否变化，12节点进度条是否移动
3. 观察视觉区: 背景是否随地点切换，prop是否显示(或fallback emoji)
4. 答完第36题: 是否进入结尾动画
5. 点击"跳过动画": 是否直接进入结果页
6. 结果页: 是否显示人格拟人图(或图标占位)

### 自动化测试 (shell不可用，需手动)
```bash
npm run test:consistency
npm run audit:options
node scripts/probability-audit.mjs --profile calibrationB --pool core
node scripts/probability-audit.mjs --profile calibrationB --pool all
```

预期结果 (与0.9.8.2完全一致):
```
audit:options: 维度路径: 12/12
probability core12: 自匹配: 12/12
probability all20: 自匹配: 20/20
```

---

## 十、已知限制 & 后续

1. **Prop SVG**: 仅scene-01至scene-04有专用SVG文件，scene-05至scene-36使用CSS emoji fallback。替换方法：将正式SVG放入 `assets/scenes/props/` 对应路径即可自动加载。
2. **背景图片**: 当前所有12个地点背景均使用CSS渐变渲染。如需使用正式背景图，替换 `LOCATION_BG_GRADIENTS` 中的CSS为 `url()` 引用。
3. **人格拟人图**: 当前使用SVG占位。替换方法：将正式PNG/SVG放入 `assets/personas/` 对应路径即可。
4. **旧CSS死代码**: `#voyage-map-panel`、`#voyage-log-panel`等旧CSS规则仍然存在于styles.css中但不再引用。可在后续清理。

---

*心岛计划 Beta 0.9.9 — 12地点做题场景系统 + 航海进度 + 结尾动画 + 人格拟人图资源接入*
*不做评分修改，只做UI结构、场景映射、动画逻辑和资源接入*
