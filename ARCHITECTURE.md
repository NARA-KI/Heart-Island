# 心岛计划 — 技术架构文档

> 当前版本：**Beta 0.9** | 纯前端 H5 | 无后端 | 36题 × 12维 × 20人格

---

## 1. 目录结构

```
Desktop/1/
├── index.html                     # 入口页面
├── styles.css                     # 全局样式 (~1500行)
├── app.js                         # 核心逻辑 + 数据 (~2400行)
├── PROJECT_MEMORY.md              # 项目记忆（产品+数据）
├── ARCHITECTURE.md                # 本文件（技术架构）
└── archive-heart-island-old.html  # 旧版本归档
```

## 2. 组件结构

```
index.html (入口)
├── #starfield              ← 星空背景
├── #ocean-layer            ← 海浪层
├── #particle-layer         ← 粒子层
│
├── #intro-screen           ← 序章
│   ├── #intro-beta-badge   ← Beta测试版标识 (新增)
│   ├── #intro-disclaimer   ← 免责声明 (新增)
│   └── ...
│
├── #game-screen            ← 游戏主屏幕
│   ├── #progress-shell     ← 渐变色进度条 (Beta 0.9)
│   ├── #island-symbol      ← 岛屿符号装饰 (Beta 0.9)
│   ├── #route-status       ← 位置/步数/百分比 (Beta 0.9)
│   ├── #scene-card         ← 毛玻璃场景卡 (Beta 0.9)
│   │   ├── #scene-mood     ← 阶段+地点标签
│   │   ├── #scene-title
│   │   ├── #scene-narrative
│   │   └── #options-container
│
├── #final-screen           ← 最终场景（古树+果实）
├── #result-screen          ← 结果页
│   └── #result-card
│       ├── #share-card-block   ← 分享卡片 V2
│       ├── #summary-card       ← 3秒摘要卡片 (Beta 0.9)
│       ├── .feedback-section   ← 反馈表单 + 复制数据按钮 (Beta 0.9)
│       └── ... (17个分析模块)
│
└── #debug-panel            ← Debug面板 (新增，默认隐藏)
    ├── #debug-panel-header
    └── #debug-content
```

## 3. 状态管理

```javascript
const state = {
  phase: 'intro'|'exploring'|'final'|'result',
  currentSceneIndex: 0,
  isTransitioning: false,     // Beta 0.9: 防止快速连点跳题
  dimensionScores: {},
  avgDimensionScores: {},
  choiceHistory: [],
  resultPersonality: null,
  secondaryPersonality: null,
  matchResults: [],
  confidenceGap: 0
};
```

## 4. 核心函数

| 函数 | 职责 |
|------|------|
| `getScore(obj, key, fallback)` | 安全取值，防0被吞 |
| `computeDimensionScores(history)` | 36题→12维平均分 |
| `matchAllTypes(avgScores)` | 加权匹配(1.80权重)+奖惩 |
| `generateShareCardHTML(...)` | 分享卡片V2 HTML (含keywords) |
| `generateScoreReason(...)` | 命中原因+排除分析 |
| `generateSubIslandInsight(...)` | 副岛回声+互补冲突 |
| `renderResult(...)` | 渲染完整结果页 |
| `renderFeedbackForm()` | 渲染反馈表单 |
| `initFeedbackForm()` | 初始化反馈交互 |
| `saveFeedback(data)` | 保存反馈至localStorage |
| `getFeedbacks()` | 读取反馈列表 |
| `initDebugPanel()` | 5x标题点击打开Debug |
| `updateDebugContent()` | 刷新Debug面板数据 |
| `runTests(N)` | 测试套件（使用 displayScenes） |
| `updateRouteStatus(scene)` | 更新进度条+路由状态+章节背景 |
| `DIM_BACKDROP` | 12维→10种CSS背景映射 |

## 5. 匹配算法

```
加权平均绝对差值(核心维权重1.80) + 核心阈值奖惩(满足+1.5/失败-4.5) → clamp 0-99
```

## 6. Beta 0.9 变更

### 题目展示顺序
- `DISPLAY_ORDER` 数组控制36题展示顺序
- `displayScenes` = DISPLAY_ORDER.map(id → scenes.find)
- 原始 `scenes` 数组保留不动（方便维护题库）
- renderScene / runTests 均使用 displayScenes
- 验收：同一维度/同一地点不连续出现，36题全部出现

### 点击锁
- `state.isTransitioning` 防止快速连点跳题
- selectOption 开头检查、开头设置
- renderScene 结尾恢复 isTransitioning = false

### 选中反馈
- 点击选项后当前按钮添加 `flash-select` class
- 所有按钮 disabled 380ms

### UI 融合（来自 new LARGCS）
- 进度条：渐变色（cyan→gold→rose），百分比显示
- 路由状态卡片：位置 + 第X/36站 + 百分比
- 10种章节背景（DIM_BACKDROP 映射）
- 选项按钮动效：hover上浮、active按压、flash-select光晕
- 首页按钮金粉渐变 + 光晕动画

### 反馈复制按钮
- 结果页反馈表单下方"复制反馈数据"按钮
- 复制内容：主岛、副岛、分差、12维分数、Top5、用户反馈
- 复制后提示"已复制，请发给测试发起人"

### 3秒摘要卡片
- 结果页顶部 summary-card
- 主岛/副岛名称 + 匹配度 + 关键词 + 金句 + 置信度
- 不删减原有详细报告

### Beta 0.8 保留功能
- 反馈系统（localStorage + console.table）
- Debug面板（5x标题点击）
- 分享卡片V2
- 12维地图卡片网格
- 17个结果页分析模块
