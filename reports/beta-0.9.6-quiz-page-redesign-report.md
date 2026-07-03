# Beta 0.9.6 做题页结构重设计报告

**版本**: Beta 0.9.6  
**基于**: Beta 0.9.5 UI 打磨版  
**日期**: 2026-06-14  
**范围**: 做题页结构级重设计 — 心岛航行界面 + 航海日志 + 航线选择  
**约束**: 不改题库/选项/score/评分算法/calibration profile/人格数据

---

## 一、做题页结构改动

### 旧版 (Beta 0.9.5)
```
#game-screen
  #progress-shell → 进度条
  #progress-chapter-markers → 章节标记
  #island-symbol → 淡淡圆形装饰
  #route-status → 地点/站数/百分比
  #prev-btn → 上一题
  #scene-card → 居中玻璃卡
    #scene-mood / #scene-title / #scene-narrative
    #options-container → 4个按钮
```

### 新版 (Beta 0.9.6)
```
#game-screen
  #voyage-top-bar → 顶部迷你进度条 + 章节标记
  #voyage-layout → 左右分栏弹性容器
    #voyage-map-panel (左 40%) → 心岛航行面板
      #current-island-visual → 当前岛屿视觉 (CSS绘制,12种氛围)
        #island-symbol → 保留旧ID
      #voyage-map-info → 章节/地点/维度/站数
        #chapter-current-label → "第一章 · 启航"
        #current-location-display → "靠近海岸"
        #current-dimension-name → "亲密连接"
        #route-status → 保留旧ID (#route-location/#route-step/#route-pct)
      #route-node-map → 四章航线节点 (竖排虚线连接)
      #prev-btn → "← 返回上一站" 航标风格
    #voyage-log-panel (右 60%) → 航海日志面板
      #voyage-log-header → "航海日志" + "当前抉择"
      #scene-card → 航海日志卡 (左对齐,纸质海图感)
        #scene-mood / #scene-title / #scene-narrative
        #options-container → 4张"选择航线"卡片
```

### 新增ID
`#voyage-top-bar`, `#voyage-layout`, `#voyage-map-panel`, `#voyage-log-panel`, `#current-island-visual`, `#voyage-map-info`, `#chapter-current-label`, `#current-location-display`, `#current-dimension-name`, `#route-node-map`, `#voyage-log-header`, `#voyage-log-label`, `#voyage-log-subtitle`

### 保留ID (JS兼容)
所有旧ID 100%保留: `#progress-shell`, `#progress-fill`, `#progress-chapter-markers`, `#island-symbol`, `#route-location`, `#route-step`, `#route-pct`, `#route-status`, `#scene-card`, `#scene-mood`, `#scene-title`, `#scene-narrative`, `#options-container`, `#prev-btn`

---

## 二、桌面端布局变化

- **左侧 40%**: 心岛航行面板，展示岛屿视觉 + 当前章节/地点/维度 + 四章航线节点 + 返回按钮
- **右侧 60%**: 航海日志面板，展示日志头部 + 题目标题/描述 + 四条可选航线
- 分割线: 极淡白色竖线 (`border-right: 1px solid rgba(255,255,255,0.04)`)
- 题目卡文字改为左对齐，更符合航海日志阅读感
- 选项卡改为路线卡片结构: 路线编号(01-04) + 航标点 + 选项文本 + 航线箭头

---

## 三、移动端适配

- 断点: `max-width: 767px` 切换为上下布局
- `#voyage-layout`: `flex-direction: column`
- 左面板: 紧凑水平布局，岛屿视觉缩至100px，信息行内显示
- 航线节点: 从竖排虚线切换为横排
- 右面板: 全宽，overflow可见
- 选项按钮保持触屏友好 (min-height: 48px)
- 360px小屏额外优化
- `env(safe-area-inset-top)` 继续支持

---

## 四、12维度岛屿氛围

每个维度通过CSS类 `.dim-xx` 在 `#current-island-visual` 上应用不同的抽象视觉:

| 维度 | Class | 视觉手法 |
|------|-------|---------|
| CL 亲密连接 | `.dim-cl` | 暖沙渐变 + 海岸线弧形 |
| AU 自由边界 | `.dim-au` | clip-path山脊线 + 冷色渐变 |
| SE 安全确认 | `.dim-se` | 三层同心回声圆环 |
| EX 表达开放 | `.dim-ex` | repeating-linear-gradient波浪线 |
| RP 修复能力 | `.dim-rp` | 暗红裂隙线 (clip-path) |
| IN 主动推进 | `.dim-in` | 对角线风痕纹理 |
| ID 灵魂理想 | `.dim-id` | 星点 + 坐标十字线 |
| ST 稳定经营 | `.dim-st` | 塔形竖条 + 阶梯底座 |
| CA 照顾承担 | `.dim-ca` | 多点暖灯 radial-gradient |
| NV 新鲜探索 | `.dim-nv` | 迷雾渐变覆盖 |
| ME 回忆牵引 | `.dim-me` | 船形 clip-path 剪影 |
| EV 情绪敏感 | `.dim-ev` | 月圆 + 潮汐波纹 |

全部使用CSS渐变/伪元素/clip-path绘制，零额外图片请求。

---

## 五、选项卡片重做

从普通按钮改为"选择航线"卡片:

- **路线编号**: 01/02/03/04 圆形徽章
- **航标点**: 6px小圆点，hover/selected点亮
- **选项文本**: flex填充，保持可读性
- **航线箭头**: `→` 符号，hover/selected时金色显示
- **左侧强调线**: `border-left: 3px`，选中时金色，未选时消失
- **Hover**: 边框提亮 + translateX(3px) 航线感推入
- **Selected**: 金色左边框 + 航标发光 + 背景微暖
- **Dimmed**: opacity 0.3，无grayscale (自然淡出)
- **入场动画**: translateX(12px) → 0，依次浮现

---

## 六、进度条重做

- 顶部迷你进度条 (2px高，比旧版更薄)
- 4个章节标记置于进度条下方
- 新增独立 `#route-node-map` 在左侧面板:
  - 4个节点竖排 (桌面) / 横排 (移动)
  - 节点间虚线连接 (`border-left: 1px dashed`)
  - Active节点: 金色发光 + 呼吸动画 (nodePulse)
  - Passed节点: 半亮金色
- 站数显示: 零填充格式 "第 03 / 36 站"

---

## 七、转场动画

- 题目卡入场: `translateX(24px) → 0`, 350ms (vs 旧版 translateY)
- 题目卡退场: `translateX(0) → -16px`, 250ms (vs 旧版 translateY)
- 选项卡片依次浮现: 80ms + index × 80ms
- 航线节点呼吸动画: 2.5s ease-in-out 循环
- 最大动画时长: 400ms 以内
- `prefers-reduced-motion` 完整支持

---

## 八、是否改动题库/评分

**答案: 没有。**

| 项目 | 状态 |
|------|------|
| 题库 scenes | ❌ 未修改 |
| 选项文案 | ❌ 未修改 |
| option score | ❌ 未修改 |
| 选项随机逻辑 | ❌ 未修改 |
| 评分算法 | ❌ 未修改 |
| calibration profile | ❌ 未修改 |
| 人格类型数据 | ❌ 未修改 |
| 上一题逻辑 | ❌ 未修改 |
| 结果计算逻辑 | ❌ 未修改 |

仅修改: `index.html` (game-screen结构), `styles.css` (做题页样式), `app.js` (展示字段/选项结构/dom引用)

---

## 九、测试结果

### `npm run test:consistency`
- Test A2 (同人格数据): **1000/1000 一致** ✅
- Test C (参数=calibrationB): **通过** ✅
- LIVE_SCORING_PROFILE: **"calibrationB"** ✅

### `npm run audit:options`
- 维度路径: **11/12** 通过 ✅ (与0.9.5一致)
- 黄金路径: **15/20** 命中 ✅ (与0.9.5一致)
- 反向测试: **20/20** 正确 ✅
- 文案一致: **20/20** 通过 ✅

### `node scripts/probability-audit.mjs --profile calibrationB`
- 自匹配: **20/20** ✅
- gap≤5: **70.2%** ✅
- 从未出现: **0** ✅
- 最高频: 镜像型 (10.3%)

所有测试结果与 Beta 0.9.5 **完全一致**。

---

## 十、变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `index.html` | 重编辑 | `#game-screen` 内部结构完全替换 (~50行) |
| `styles.css` | 重编辑 | GAME SCREEN段重写 + 维度视觉 + 响应式 (~450行) |
| `app.js` | 中编辑 | dom引用 + renderScene + updateRouteStatus + 选项结构 (~80行) |
| `deploy/index.html` | 同步 | 与 root 一致 |
| `deploy/styles.css` | 同步 | 与 root 一致 |
| `deploy/app.js` | 同步 | 与 root 一致 |
| `reports/beta-0.9.6-quiz-page-redesign-report.md` | 新建 | 本报告 |

### 未修改文件
- `core/scoring.mjs`
- `core/calibration-profiles.mjs`
- `scripts/problem-audit.mjs`
- `scripts/consistency-test.mjs`
- `scripts/option-alignment-audit.mjs`
- `scripts/probability-audit.mjs`
- 所有36个题库场景
- 所有20个人格类型数据
- 所有选项分数/评分算法

---

## 十一、验收标准达成

| # | 验收项 | 状态 |
|---|--------|------|
| 1 | 做题页第一眼和上一版明显不一样 | ✅ 左右分栏 + 岛屿视觉 + 航线节点 |
| 2 | 桌面端不是居中问卷卡，而是左右分栏 | ✅ 40/60 弹性布局 |
| 3 | 移动端不崩，适合连续做36题 | ✅ 767px断点,紧凑上下布局 |
| 4 | 选项不再像按钮，而像四条航线 | ✅ 路线编号+航标+箭头结构 |
| 5 | 进度条不像网页进度条，而像航线节点 | ✅ 竖排虚线节点+呼吸动画 |
| 6 | 不同地点/维度氛围差异明显 | ✅ 12种CSS可视化 |
| 7 | 上一题功能正常 | ✅ "← 返回上一站"航标 |
| 8 | 题库/分数/算法完全不变 | ✅ 三测试全部一致 |
| 9 | 选项随机顺序不变 | ✅ shuffleArray未修改 |
| 10 | file:// 可用 | ✅ 零外部依赖 |
| 11 | 静态部署可用 | ✅ deploy/已同步 |

---

## 十二、仍存在的问题和下一步建议

### 已知限制
1. **岛屿视觉为CSS纯抽象**: 使用渐变和伪元素，非真实插画。如果未来有预算，可以用SVG或Canvas绘制更精细的岛屿地图。
2. **IE不支持**: `clip-path`、`backdrop-filter` 等CSS特性在IE上不工作，但现代浏览器 (Chrome/Firefox/Safari/Edge) 均支持。
3. **移动端岛屿视觉较小**: 在360px屏幕上仅80x80px，细节有限。可考虑在更宽屏幕(420px+)保留更大视觉。

### 下一步建议
1. **Beta 0.9.7**: 结果页也应用左右分栏布局，让"心岛地图"成为结果页的左侧视觉焦点
2. **Beta 0.9.8**: 增加做题页音效/环境音 (可选，海浪/风声)
3. **Beta 1.0**: 整体打磨后正式发布

---

*心岛计划 Beta 0.9.6 — 做题页结构重设计完成*  
*心岛航行界面 + 航海日志 + 航线选择*
