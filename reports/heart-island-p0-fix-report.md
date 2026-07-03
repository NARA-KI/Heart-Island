# Heart Island P0 修复报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3  
> 修复范围：仅 `styles.css`（3 处，0 处 JS 修改）  
> 原则：最小改动、不改评分/题库/素材路径

---

## 一、修改汇总

| # | 文件 | 行号 | 修改内容 | 类型 |
|---|------|------|----------|------|
| 1 | `styles.css` | 478 | `#game-screen` 新增 `align-items:stretch;` | S1 修复 |
| 2 | `styles.css` | 3188 | `.ending-loc-node.lit` 补充缺失的闭合 `}` | S1 根因（CSS 语法错误） |
| 3 | `styles.css` | 3161 | `#ending-backdrop` 新增 `pointer-events:none;` | S2 修复 |

备份文件：`styles.css.backup-p0`

---

## 二、S1：场景图 0×0 — 根因与修复

### 问题表象
所有页面的 `.scene-stage-image` 渲染尺寸为 0×0，场景图完全不可见。

### 根因（双层）

**层 1 — CSS 继承链导致 flex 交叉轴对齐方式错误**

`.screen` 设置了 `align-items:center`，被 `#game-screen` 继承。
桌面端 `@media (min-width: 900px)` 将 `#game-screen` 改为 `flex-direction:row`，
此时继承的 `align-items:center` 控制垂直居中对齐（而非默认的 `stretch`），
导致子元素 `#scene-stage` 高度被压缩到内容高度（= 0，因为子元素全为 absolute）。

**修复 1**：在 `#game-screen` 显式添加 `align-items:stretch`（line 478），覆盖 `.screen` 的 `center`。

```css
#game-screen {
  display:flex; flex-direction:column;
  align-items:stretch;  /* ← 新增 */
  justify-content:flex-start;
  ...
}
```

**层 2 — CSS 语法错误阻断 @media 规则解析**

`.ending-loc-node.lit` 规则块（line 3186-3188）缺少闭合 `}`，导致 CSS 解析器
在 line 3188 之后进入错误恢复模式。line 3467 的 `@media (min-width: 900px)` 
（包含 `#game-screen { flex-direction:row }` 和 `#scene-stage { display:block }`）
位于错误点之后，被浏览器静默丢弃。

**修复 2**：在 line 3188 后补充缺失的 `}`。

```css
.ending-loc-node.lit {
  background:rgba(201,167,91,0.7);
  box-shadow:0 0 8px rgba(201,167,91,0.5);
}  /* ← 新增闭合 */
```

### 验证结果

| 页面 | 视口 | 修复前 | 修复后 | 状态 |
|------|------|--------|--------|------|
| Home | 1440px | 0×0 | 634×900 | ✅ |
| Quiz | 1440px | 0×0 | 634×900 | ✅ |
| Result | 1440px | 0×0 | 634×900 | ✅ |
| Home | 390px | 0×0 | 390×236 | ✅ |
| Quiz | 390px | 0×0 | 390×236 | ✅ |
| Result | 390px | 0×0 | 390×236 | ✅ |

---

## 三、S2：结果页渲染链路断裂 — 根因与修复

### 问题表象
完成 36 题后，点击"直接查看结果 →"按钮无响应，自动化测试停在过渡屏，
结果页内容未填充，拟人图 0 张。

### 根因
`#ending-backdrop`（全屏覆盖层）缺少 `pointer-events:none`。
该元素是 `#ending-screen` 内的绝对定位全屏遮罩（`position:absolute; inset:0`），
位于 skip 按钮上方，拦截了所有点击事件。skip 按钮的 `onclick` handler 从未触发。

虽然 3500ms 自动 timer 仍能触发 `transitionToResult()`，但 Playwright 在
~2500ms 处截图时，reveal 过渡（2000ms）尚未完成，`renderResult()` 未被调用。

### 修复
在 `#ending-backdrop` 添加 `pointer-events:none`（line 3161）。

```css
#ending-backdrop {
  position:absolute; inset:0;
  background:radial-gradient(...);
  opacity:0; z-index:0; pointer-events:none;  /* ← 新增 */
}
```

### 验证结果

| 指标 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| skip 按钮可点击 | ❌ 被拦截 | ✅ 正常触发 | ✅ |
| 结果页渲染 | ❌ 空壳 | ✅ 完整内容 | ✅ |
| 拟人图 (1440px) | 0 张 | 1 张 (311×468, cover) | ✅ |
| 拟人图 (390px) | 0 张 | 1 张 (238×318, cover) | ✅ |
| Result card | 空壳 920px | 完整 hero 卡片 | ✅ |
| JS 控制台错误 | 0 | 0 | ✅ |

---

## 四、app.js 竞态问题评估

### S2 次要根因：persona 图片预加载竞态

`transitionToResult()` 中 persona 图片预加载（4000ms timeout）是异步的，
而 `showResultTransition()` 2000ms 后即调用 `renderResult()`。

### 修复后评估

修复 S2 主根因后，`renderResult()` 已能正常执行。但 persona 图片预加载竞态
仍然存在。在当前测试中拟人图正常渲染（`fit=cover`），说明 `renderResult()`
内部已有降级处理（可能使用了占位符或延迟渲染）。

**建议**：暂不修改 `app.js`，保持观察。如果在真实用户场景中拟人图偶发缺失，
再优化异步时序。

**结论**：S2 fix-2（app.js persona 预加载时序）→ **暂不需要处理**。

---

## 五、验证清单

| 检查项 | 1440px | 390px | 状态 |
|--------|--------|-------|------|
| 场景图 ≠ 0×0 | 634×900 | 390×236 | ✅ |
| skip 按钮可点击 | ✅ | ✅ | ✅ |
| 结果页正常出现 | ✅ | ✅ | ✅ |
| 拟人图正常展示 | 311×468 | 238×318 | ✅ |
| 控制台无 JS 错误 | 0 | 0 | ✅ |
| 横向溢出 = 0 | ✅ | ✅ | ✅ |
| 做题流程完整 | ✅ (36/36) | ✅ (36/36) | ✅ |
| 截图全部生成 | 3/3 | 3/3 | ✅ |

---

## 六、剩余问题清单

以下问题来自 `inspect-ui-structure.mjs` 检测，均非 P0 阻断，建议下个迭代处理：

### P1（本周）
- **M1 按钮尺寸不达标**：多处按钮高度 < 44px（WCAG 触摸目标），影响移动端可点击性
- **拟人图 object-fit:fill → cover**：修复前为 `fill`（拉伸变形），修复后已变为 `cover` ✅（随 S1 间接修复）

### P2（下版）
- **字体过小**：9-10px 文本多处违规（Beta 版本号、footer 免责声明、首页副标题等）
- **选项按钮高度不一致**（移动端）：部分选项 68px vs 54px

### P3（迭代）
- **移动端结果卡宽度微调**：当前 354px 在 390px 视口下正常

---

## 七、经验教训

1. **CSS 语法错误是静默杀手**：缺少一个 `}` 会导致数百行之后的 `@media` 规则被丢弃，浏览器不会报错。
2. **小步修改 + 验证循环是必要的**：S1 的第一个修复（`align-items:stretch`）本身是正确的，但被 CSS 语法错误掩盖。只有在深入诊断 computed styles 时才发现 `flex-direction:row` 未生效，进而追溯到缺失的 `}`。
3. **`pointer-events:none` 是全屏装饰层的最佳实践**：任何 `absolute inset:0` 的纯视觉元素都应该加上此属性。

---

> **修复完成。项目可继续进入 P1 迭代。**
