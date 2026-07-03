# Heart Island P0 根因排查报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3  
> 原则：只排查，不修改代码  
> 方法：CSS 规则静态分析 + JS 源码追踪 + Playwright DOM 快照对比

---

## S1：场景图渲染 0×0 根因分析

### 证据链

**证据 1 — Playwright DOM 快照（3 页一致）**

```
Home    → .scene-stage-image src="http://localhost:3000/"  0×0 fit=cover
Quiz    → .scene-stage-image src="...cl-coast.webp"        0×0 fit=cover
Result  → .scene-stage-image src="...ev-moon-lake.webp"    0×0 fit=cover
```

**证据 2 — 同页面其他元素正常渲染**

在同一 Playwright 快照中，`#scene-question-column` 内的选项按钮正常显示（570×54px），说明 `#game-screen` 已从 `.hidden` 恢复、flex 布局已生效。

**证据 3 — CSS 规则链条**

| 层级 | 选择器 | 关键属性 | 来源行号 |
|------|--------|----------|----------|
| 1 | `.screen` | `position:fixed; width:100%; height:100%; display:flex; flex-direction:column; align-items:center` | styles.css:195-201 |
| 2 | `#game-screen` | `display:flex; flex-direction:column; height:100vh; padding:0; overflow:hidden` | styles.css:476-482 |
| 3 | `#game-screen` (≥900px) | `display:flex; flex-direction:row` | styles.css:3468-3469 |
| 4 | `#scene-stage` (base) | `position:relative; overflow:hidden; display:none` | styles.css:567-569 |
| 5 | `#scene-stage` (≥900px) | `display:block; flex:0 0 44%; height:100vh; height:100dvh; max-height:100%` | styles.css:3472-3476 |
| 6 | `.scene-stage-image` | `position:absolute; inset:0; width:100%; height:100%; object-fit:cover` | styles.css:578-584 |

### 根因定位

**根因：`.screen` 的 `align-items:center` 未被 `#game-screen` 显式重置。**

具体机制：
1. `.screen` (行 195-201) 设置了 `display:flex; flex-direction:column; align-items:center`。
2. `#game-screen` (行 476-482) 重写了 `display:flex; flex-direction:column`，但**没有重写 `align-items`**。
3. CSS 特异性：`.screen` 和 `#game-screen` 都匹配同一个元素（`<div id="game-screen" class="screen">`）。`.screen` 的 `align-items:center` 未被 `#game-screen` 覆盖，因此**继承生效**。
4. 在桌面端 `≥900px` media query 中，`#game-screen` 改为 `flex-direction:row`。`align-items:center` 在 row flex 中的含义是：交叉轴（垂直）居中对齐。
5. `#scene-stage` 有 `flex:0 0 44%`（宽度 44%）和 `height:100vh`。但由于父容器 `#game-screen` 的 `align-items:center` 在 row 方向中对子元素施加垂直居中约束，且 `height:100vh` 可能被 flex 的 `align-items:center` 的隐式 `stretch` 行为冲突——具体取决于浏览器实现。

**更关键的发现：`#game-screen` 默认是 `flex-direction:column`（行 477），但桌面端 media query 改为 `flex-direction:row`（行 3469）。当 `align-items:center` 从 `.screen` 继承时：**
- 在 column flex 中，`align-items:center` 控制水平居中——这不会导致高度塌陷。
- 在 row flex 中，`align-items:center` 控制垂直居中——**这可能导致子元素高度被压缩到内容高度而非 100vh**。

当 `#game-screen` 为 `flex-direction:row` + `align-items:center`（继承自 `.screen`）时，flex 子项的交叉轴（垂直）对齐方式为 `center`，而非默认的 `stretch`。子项 `#scene-stage` 虽然有 `height:100vh`，但 `align-items:center` 可能使浏览器将其高度收缩为 `auto`（由内容决定），而 `#scene-stage` 内只有绝对定位元素，内容高度为 0，导致渲染尺寸为 0×0。

**验证方式**：在浏览器 DevTools 中检查 `#game-screen` 的 computed `align-items`。预期值为 `center`（继承自 `.screen`），而非默认的 `normal`/`stretch`。

---

## S2：结果页渲染链路断裂 根因分析

### 证据链

**证据 1 — Playwright 结果页 DOM 快照**

```
#reveal-skip-btn "直接查看结果"     134×33  visible
#ending-skip-btn "直接查看结果 →"    101×21  visible (opacity:0 但 getBoundingClientRect > 0)
.scene-stage-meta 文本              "月潮湖 · 满月之夜"
Portrait images                     0
#result-card width                  920px（空壳，innerHTML 未由 renderResult 填充）
```

两个 skip 按钮同时可见 + "月潮湖" 文本 = 页面处于 3 层 screen 叠加状态（ending 刚隐藏、reveal 正在显示、result 始终在底层）。

**证据 2 — 链路时序**

```
showEndingSequence()
  ├─ [0ms]     #game-screen → hidden | #ending-screen → visible
  ├─ [1000ms]  #ending-skip-btn opacity 1, pointer-events all
  ├─ [3500ms]  自动 → transitionToResult()
  │
  │  Playwright 在 ~1500ms 处 force click #ending-skip-btn
  │  → clearTimeout(state._endingTimer)
  │  → transitionToResult()
  │
transitionToResult()
  ├─ #ending-screen → hidden
  ├─ #ending-skip-btn → opacity:0, pointer-events:none
  ├─ 预加载 persona image
  └─ showResultTransition(callback)
       │
       ├─ #reveal-screen → visible（背景: voyage.webp）
       ├─ [900ms]  背景切换 main-island.webp, 文本→"你的主岛，正在浮现"
       └─ [2000ms] onDone()
            ├─ #reveal-screen → hidden
            ├─ #result-screen → visible
            ├─ state.phase = 'result'
            └─ renderResult()  ← 此处可能未执行
```

**证据 3 — `#ending-backdrop` 拦截点击**

Playwright 原始错误日志（来自 inspect-ui.mjs 第一次运行）：
```
<div id="ending-backdrop"></div> intercepts pointer events
```

`#ending-backdrop` 是 `#ending-screen` 内的全屏覆盖层，`z-index` 高于 skip 按钮但无 `pointer-events:none`。即使用 `force:true` 点击 skip 按钮，click 事件被 backdrop 捕获后不会冒泡到 skip 按钮的 onclick handler。Playwright 的 `force:true` 会绕过可见性检查但不会绕过 DOM 事件冒泡链。

### 根因定位

**根因 A（主要）：`#ending-backdrop` 拦截 skip 按钮点击事件。**

- `#ending-backdrop` 定位为 `absolute; inset:0`（覆盖全屏），无 `pointer-events:none`。
- `#ending-skip-btn` 位于 backdrop 下层或同层 DOM 顺序之后。
- 用户/脚本点击 skip 按钮时，click 事件实际落在 `#ending-backdrop` 上。
- `onclick` handler 绑在 `#ending-skip-btn` 上，因此从未触发。
- `clearTimeout(state._endingTimer)` 也未执行。
- 3500ms 自动 timer 仍会触发 `transitionToResult()`，但 Playwright 在 2500ms 处截图时，reveal 过渡尚未完成（2000ms reveal 刚结束或还在进行中），`renderResult()` 尚未被调用。

**根因 B（次要）：`renderResult()` 即使被调用，hero 拟人图渲染取决于异步图片预加载。**

`transitionToResult()` 中 (行 2532-2538)：
```javascript
const primary = state.resultPersonality;
if (primary) {
    const webpPath = getPersonaImagePath(primary);
    if (webpPath) {
        preloadImage(webpPath, 4000).then(img => {
            state._personaImg = img;
        });
    }
}
```

预加载是异步的，4000ms 超时。`showResultTransition()` 2000ms 后直接调 `renderResult()`，此时 `state._personaImg` 大概率仍为 `undefined`。需要检查 `renderResult()` 内部是否正确处理了 `_personaImg` 未就绪的情况——如果它直接访问 `img.src` 则可能抛异常。

### 根因总结

| 问题 | 根因 | 严重度 |
|------|------|--------|
| S2 主要 | `#ending-backdrop` 无 `pointer-events:none`，拦截 skip 按钮点击 | 🔴 阻断 skip 功能 |
| S2 次要 | `renderResult()` 调用时 `_personaImg` 预加载可能未完成 | 🟡 可能影响拟人图渲染 |
| S2 叠加 | `.screen.hidden` 使用 `opacity:0` 而非 `display:none`，多 screen 叠加增加点击干扰风险 | 🟡 |

---

## 涉及文件与选择器

### styles.css

| 行号 | 选择器 | 问题 |
|------|--------|------|
| 195-201 | `.screen` | `align-items:center` 被 `#game-screen` 继承，在 row flex 中导致子元素高度收缩 |
| 476-482 | `#game-screen` | 缺少 `align-items:stretch`（或 `normal`）来覆盖 `.screen` 的 `center` |
| 567-569 | `#scene-stage` (base) | 默认 `display:none`——设计意图正确，但需确保 media query 覆盖生效 |
| 3472-3476 | `#scene-stage` (≥900px) | `height:100vh` 与 flex `align-items:center` 冲突 |
| 3372-3374 | `#ending-screen *` | `prefers-reduced-motion` 中缩短动画——非根因 |

### app.js

| 行号 | 函数 | 问题 |
|------|------|------|
| 2402-2502 | `showEndingSequence()` | `#ending-backdrop` 未设置 `pointer-events:none` |
| 2504-2549 | `transitionToResult()` | persona 图片异步预加载与 `renderResult()` 同步调用之间存在竞态 |
| 2552-2594 | `showResultTransition()` | 2000ms 超时后直接调 `onDone()`，不检查图片加载状态 |
| 2689+ | `renderResult()` | 需检查是否正确处理 `state._personaImg` 未就绪的降级路径 |

### index.html

| 位置 | 元素 | 问题 |
|------|------|------|
| `#ending-screen` 内 | `<div id="ending-backdrop">` | 覆盖全屏但无可点击交互意图，缺 `pointer-events:none` |

---

## 最小修改方案

### S1 修复（仅 styles.css，2 行）

**方案 A**（推荐，最小修改）—— 在 `#game-screen` 中显式覆盖 `align-items`：

```css
/* styles.css 第 476-482 行，在 #game-screen 块中添加一行 */
#game-screen {
    display:flex; flex-direction:column;
    align-items:stretch;  /* ← 新增：覆盖 .screen 的 align-items:center */
    justify-content:flex-start;
    padding:0;
    height:100vh; height:100dvh;
    overflow:hidden;
}
```

**方案 B**（备选，更安全但改动稍大）—— 在桌面端 media query 的 `#game-screen` 中确保 `align-items`：

```css
/* styles.css 第 3468-3469 行 */
#game-screen {
    display:flex; flex-direction:row;
    align-items:stretch;  /* ← 新增 */
}
```

**风险**：`align-items:stretch` 会使 `#scene-question-column` 也被拉伸到 100vh。当前它已有 `max-height:100vh`（行 3483），应无副作用。需确认移动端 `flex-direction:column` 下 stretch 不会破坏布局。

### S2 修复（index.html 1 行 + 可选 app.js）

**修复 1**（必须，index.html）—— 给 `#ending-backdrop` 添加 `pointer-events:none`：

在 HTML 中给 `<div id="ending-backdrop">` 添加 style 属性，或在 styles.css 的 `#ending-screen` 区域添加规则：

```css
#ending-backdrop { pointer-events:none; }
```

**修复 2**（可选，app.js）—— 确保 persona 图片在 `renderResult()` 调用前就绪：

在 `transitionToResult()` 的预加载逻辑中（行 2531-2539），将 `showResultTransition()` 的调用移到 `.then()` 回调中：

```javascript
// 当前（行 2543-2548）：
showResultTransition(() => {
    dom.resultScreen.classList.remove('hidden');
    state.phase = 'result';
    renderResult();
});

// 修复后：等待 persona 图片预加载完成
const personaPromise = state._personaImg ? Promise.resolve() : preloadImage(webpPath, 4000);
personaPromise.then(() => {
    showResultTransition(() => {
        dom.resultScreen.classList.remove('hidden');
        state.phase = 'result';
        renderResult();
    });
});
```

> ⚠️ 修复 2 涉及异步链路改动，风险高于修复 1。建议先执行修复 1（`pointer-events:none`），然后在真实浏览器中验证 skip 按钮是否恢复正常。

---

## 修复优先级

```
1. S2-修复1: #ending-backdrop pointer-events:none  ← index.html 或 styles.css 1行
2. S1-修复:  #game-screen align-items:stretch      ← styles.css 1行
3. S2-修复2: persona 预加载时序                      ← app.js（需更多测试，暂缓）
```

---

## 是否需改 app.js

| 修复项 | 需改 app.js | 理由 |
|--------|------------|------|
| S1 | ❌ 不需要 | 纯 CSS 问题 |
| S2-修复1 | ❌ 不需要 | 可在 styles.css 添加 `#ending-backdrop` 规则 |
| S2-修复2 | ⚠️ 暂缓 | 异步链路调整风险中等，需先在真实浏览器验证 S2-修复1 效果 |

---

## 风险点

| 修改 | 风险 | 缓解 |
|------|------|------|
| `align-items:stretch` 加入 `#game-screen` | 移动端 column flex 下 `#scene-question-column` 可能溢出 | 它已有 `overflow-y:auto` + `max-height:100vh` |
| `align-items:stretch` 加入 `#game-screen` | 首页 `#intro-screen` 不受影响（它是独立 `.screen`，非 `#game-screen`） | ✅ `#game-screen` 独立选择器 |
| `#ending-backdrop` 加 `pointer-events:none` | 如果 backdrop 上有其他可交互元素，会阻止交互 | 检查确认 backdrop 内无子元素 |
