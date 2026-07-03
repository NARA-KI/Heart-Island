# Heart Island UI 体验巡检报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3  
> 检测方式：Playwright 自动化 + 可访问性结构提取  
> 检测范围：首页 / 做题页 / 结果页 × 1440px / 390px  
> 原则：只检测，不修改代码

---

## 检测环境

| 项目 | 值 |
|------|-----|
| Node.js | v24.16.0 |
| npm | 11.13.0 |
| Claude Code | v2.1.150 |
| Playwright | 1.61.0 (Chromium 149) |
| Context7 MCP | ✅ 可用 |
| Playwright MCP | ⚠️ 已安装但浏览器路径不匹配（需配置） |
| 本地服务器 | npx serve v14.2.6 :3000 |
| 截图 | 6 张全部捕获（见 reports/screenshot-*.png） |

---

## 一、严重问题（阻断体验）

### 🔴 S1 — 场景图渲染尺寸为 0×0（所有页面）

**现象**：Playwright 检测到 `.scene-stage-image` 元素的渲染尺寸为 `0×0`，`object-fit: cover` 未生效。

```
Home:    scene-stage-image → 0×0, object-fit=cover
Quiz:    assets/scenes/cl-coast.webp → 0×0, object-fit=cover
Result:  assets/scenes/ev-moon-lake.webp → 0×0, object-fit=cover
```

**可能原因**：
1. 父容器 `#scene-stage` 在桌面端 flex 布局中高度未正确传递
2. `position: absolute` 的图片父容器没有显式 `height`
3. 图片加载时序问题（但 `networkidle` 后仍为 0×0，倾向 CSS 问题）

**影响**：做题页最核心的视觉元素不可见，用户体验严重受损。

**涉及文件**：`styles.css` — `#scene-stage` / `.scene-stage-image` 相关规则

---

### 🔴 S2 — 结果页未能渲染（自动化测试卡在过渡屏）

**现象**：完成 36 题后，`#ending-skip-btn` 的 `force: true` click 未能跳转到结果页。DOM 快照显示页面停留在过渡动画状态（文本："月潮湖 · 满月之夜"），`#result-card` 虽然存在但结果内容未填充。

```
Result @ 1440px DOM:
  - 按钮: #reveal-skip-btn "直接查看结果" (134×33)
  - 按钮: #ending-skip-btn "直接查看结果 →" (101×21)
  - 文本: "月潮湖 · 满月之夜" — 这是过渡屏文字，非结果页
  - 拟人图: 0 张
  - 结果卡: 920px (空壳)
```

**可能原因**：
1. `#ending-backdrop` 遮罩层拦截了 force click 事件
2. 过渡动画时长 3.5s 内 JS 未完成 result transition
3. `showResultTransition()` 与 `renderResult()` 之间的异步链路断裂

**影响**：自动化测试无法到达结果页，用户手动操作时也可能遇到卡顿。

**涉及文件**：`app.js` — `showEndingSequence()` / `showResultTransition()` / `renderResult()`

---

## 二、中等问题（影响体验）

### 🟡 M1 — 按钮点击区域不达标（3 个按钮）

WCAG 2.1 要求触摸目标 ≥ 44×44px。以下按钮未通过：

| 按钮 | 尺寸 | 出现页面 |
|------|------|----------|
| `#intro-all-types-entry` "心岛人格图鉴" | 99×28px | 首页、做题页（两视口均不达标） |
| `#reveal-skip-btn` "直接查看结果" | 134×33px | 过渡屏 |
| `#ending-skip-btn` "直接查看结果 →" | 101×21px | 过渡屏 |

**影响**：移动端用户可能难以精确点击（特别是 "心岛人格图鉴" 高度仅 28px）。

**涉及文件**：`styles.css` — 对应按钮的 `padding` / `min-height` / `line-height`

---

### 🟡 M2 — 结果页拟人图未渲染

**现象**：结果页 DOM 快照中 `Portrait images: 0`，即 `.hero-portrait-img` 在渲染时不存在或不可见。

**可能原因**：
1. 结果页本身未完整渲染（与 S2 关联）
2. 拟人图 `src` 路径拼接错误
3. `.hero-portrait-wrap` 容器有 `display:none` 或零高度

**涉及文件**：`app.js` — `renderResult()` 中 hero 拟人图的 HTML 生成逻辑；`styles.css` — `.hero-portrait-wrap` / `.hero-portrait-img`

---

### 🟡 M3 — 部分选项按钮在移动端高度超标

**现象**：移动端 390px 下，第 4 选项出现 `360×68px`（高度比其他选项多 14px），表明选项文本换行导致高度不一致。

```
Desktop: 所有选项 570×54px ✓ 统一
Mobile:  选项1-3 360×54px, 选项4 360×68px ⚠
```

**影响**：选项卡片高度不一致，视觉不整齐。

**涉及文件**：`styles.css` — 选项按钮的 `min-height` / `line-height` / `white-space`

---

## 三、轻微问题（改进建议）

### 🟢 L1 — 字体可读性（9-10px 多处违规）

以下文本 font-size ≤ 10px，低于 WCAG 建议的 12px 最小正文：

| 文本 | 字号 | 位置 |
|------|------|------|
| "Beta 0.9.9.3" | 9px | 全局 header |
| "当前结果仅供自我探索参考…" | 10px | 全局 footer |
| "约 5 分钟完成…" 等 3 条副标题 | 9px | 首页 intro |
| "靠近海岸 · 漂流瓶里的信" | 10px | 做题页 location meta |

**建议**：将最小值设为 11px（桌面）和 12px（移动）。

---

### 🟢 L2 — 首页场景图占位

首页 (`#intro-screen`) 的 `.scene-stage-image` 元素虽然隐藏但占据 DOM。如果这是设计意图（为过渡动画预留），建议添加 `aria-hidden="true"`。

---

### 🟢 L3 — 移动端结果卡宽度

390px 视口下 `#result-card` 计算宽度为 350px（`calc(100vw - 40px)` 正确生效），但 `max-width: 920px` 永远无法触发。可考虑添加移动端专属 `padding` 微调。

---

## 四、通过项（确认正常）

| 检测项 | 1440px | 390px | 备注 |
|--------|--------|-------|------|
| 横向溢出 | ✅ 无 | ✅ 无 | 两端均无横向滚动条 |
| 主 CTA 按钮 | ✅ 440×60 | ✅ 354×58 | 均 ≥44px 触摸目标 |
| JS 控制台错误 | ✅ 0 | ✅ 0 | 无 pageerror |
| 做题选项按钮 | ✅ 570×54 | ✅ 360×54 | 桌面端统一、移动端大部分统一 |
| Result card 宽度 | ✅ 920px | ✅ 350px | `calc(100vw-40px)` 正确 |
| 字体颜色对比度 | — | — | 未检测（需手动对比度工具） |

---

## 五、优先修复顺序

```
P0 (立即)  → S1: 场景图渲染 0×0          styles.css
P0 (立即)  → S2: 结果页渲染链路断裂       app.js
P1 (本周)  → M2: 拟人图未渲染             app.js + styles.css
P1 (本周)  → M1: 按钮点击区域             styles.css
P2 (下版)  → M3: 选项高度不一致           styles.css
P3 (迭代)  → L1-L3: 字体可读性/细微调整   styles.css
```

---

## 六、是否建议自动修复

| 问题 | 可自动修复 | 理由 |
|------|-----------|------|
| S1 场景图 0×0 | ⚠️ 部分 | 可能是 CSS `height` 缺失，可自动补。但需先排查父容器布局逻辑 |
| S2 结果页断裂 | ❌ 不建议 | 涉及 JS 异步链路，需先理解 `#ending-backdrop` 遮罩 + `showResultTransition` 时序 |
| M1 按钮尺寸 | ✅ 可自动 | 加 `min-height: 44px` + `padding` |
| M3 选项高度 | ✅ 可自动 | 加 `min-height` 约束 |
| L1 字体 | ✅ 可自动 | 统一提升最小字号 |

**建议**：M1 / M3 / L1 可直接自动修。S1 / S2 / M2 需先手动排查根因。

---

## 七、涉及文件

| 文件 | 相关 issue |
|------|-----------|
| `styles.css` | S1, M1, M3, L1, L2, L3 |
| `app.js` | S2, M2 |
| `index.html` | 暂无（结构正常） |

---

## 八、MCP 状态备注

| MCP Server | 安装状态 | 可用性 | 备注 |
|------------|----------|--------|------|
| Context7 | ✅ 扩展已装 + Server 可解析 | ✅ 已验证 | 查询 MDN 文档正常返回 |
| Playwright | ✅ 扩展已装 + CLI 可用 | ⚠️ MCP Server 需配置 | `claude mcp list` 为空，但 Playwright CLI 工作正常 |
| GitHub MCP | ✅ 扩展已装 | ❌ 未连接 | 需 Token |
| Figma MCP | ✅ Helper 已装 | ❌ 未连接 | 需 Token |

---

> **报告完成**。本报告基于 Playwright 自动化检测的真实输出。  
> 原始数据：`reports/ui-inspection-raw.json`  
> 截图：`reports/screenshot-*.png`（共 6 张）  
> 检测脚本：`scripts/inspect-ui.mjs` / `scripts/inspect-ui-structure.mjs`
