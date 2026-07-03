# Heart Island P2 Phase B — 结果页信息层级渐进式披露方案

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3 Stable Base + Phase A  
> 范围：方案设计 — 不修改代码  
> 原则：最小改动、复用现有机制、不破坏 12 人格一致性

---

## 一、当前结果页 Section 全景

```
#result-card (920×2281 desktop / 354 wide mobile)
│
├── Section 1: #result-hero                             [展开]  Hero
│   ├── .hero-badge, .hero-label, .hero-island-name
│   ├── .hero-match-num (匹配度)
│   ├── .hero-keywords, .hero-hitline, .hero-confidence
│   └── .hero-portrait-col (拟人图)
│
├── Section 2: .result-section-divider + .persona-manual  [展开]  你的恋爱人格说明书
│   ├── 你在关系里的样子
│   ├── 你真正需要的爱
│   └── 为什么你会是XX型
│
├── Section 3: .result-section-divider + echo hints + .inertia-module  [展开]  你在亲密关系里的惯性
│   ├── echoAtTopHTML (当 gap≤5 时可见，在 inertia 上方)
│   ├── .inertia-sub: 关系优势
│   ├── .inertia-sub.inertia-caution: 容易卡住的地方
│   ├── .inertia-sub: 适合你的关系节奏
│   └── echoAtBottomHTML (当 gap≤12 时可见，在 inertia 下方)
│
├── Section 4: .result-section-divider + .advice-compact  [展开]  给你的关系建议
│   ├── 靠近时
│   ├── 不安时
│   └── 冲突时
│
├── Section 5: .collapse-toggle#toggle-expand-all + #collapse-expand-all  [折叠]  展开更多细节
│   ├── 12维心岛地图
│   ├── Top5 相近人格
│   ├── 最终解读
│   ├── 旅途回顾
│   └── 图鉴入口
│
└── Section 6: .result-section-divider + .share-idcard-section  [展开]  分享与反馈
```

**当前状态：Section 1-4 + 6 全部展开，仅 Section 5 折叠。**

---

## 二、现有折叠机制分析（可直接复用）

### CSS（styles.css line 1429-1442）

```css
.collapse-content {
  max-height:0; overflow:hidden;
  transition:max-height 0.4s, opacity 0.3s, margin 0.3s;
  opacity:0; margin-top:0;
}
.collapse-content.expanded {
  max-height:20000px; opacity:1; margin-top:14px;
}
.collapse-toggle.expanded .toggle-arrow { transform:rotate(180deg); }
```

**默认行为：`.collapse-content` 初始折叠（`max-height:0`），加 `.expanded` 后展开。**

### JS（app.js line 3784-3807）

```javascript
function initCollapseToggles() {
  document.querySelectorAll('.collapse-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.collapse;        // 例: "inertia"
      const content = document.getElementById('collapse-' + targetId); // → #collapse-inertia
      if (!content) return;
      content.classList.toggle('expanded');
      btn.classList.toggle('expanded');
      // arrow ▾ ↔ ▴
    });
  });
}
```

**关键特性：**
- **完全通用**：任何 `.collapse-toggle[data-collapse="X"]` 自动绑定 `#collapse-X` 的开关
- **在 `renderResult()` 之后调用**（line 3066）：新按钮自动被扫描
- **无需修改 JS**：只需在 HTML 模板中添加对应元素

---

## 三、建议的信息层级

### 默认展开（Always Visible）

| Section | 理由 |
|---------|------|
| **Section 1: Hero** | 核心人格结果，必须首屏可见 |
| **Section 2: Persona Manual** | 人格说明书——用户最想看的"我是什么样的人" |
| **Section 4: Advice** | 关系建议——可行动的高价值内容，不放太深 |
| **Section 6: Share** | 分享入口——虽在底部但始终可达 |

### 默认折叠（Progressive Disclosure）

| Section | 理由 |
|---------|------|
| **Section 3: Inertia** | 惯性分析——偏分析型内容，适合感兴趣的用户展开细读 |
| **Section 5: Details** | 已是折叠状态 ✅（地图/Top5/旅途/图鉴） |

### 副岛回声（Echo Hints）特殊处理

```
echoAtTopHTML    → 在 inertia 上方，保持可见（仅一行）
echoAtBottomHTML → 在 inertia 下方，保持可见（仅一行）
```

echo hints 是轻量的一句话提示，放在 `.collapse-content` **外部**，始终可见。

---

## 四、移动端 390px 首屏规划

```
┌─────────────────────────┐
│  HERO (703px)           │  ← 第 1 屏：人格揭晓
│  badge / label / 名称    │     拟人图 258×345
│  匹配度 52px gold        │     名称 / hitline
│  拟人图                  │
├─────────────────────────┤
│  你的恋爱人格说明书       │  ← 第 2 屏：了解自己
│  你在关系里的样子         │     (展开)
│  你真正需要的爱           │
├─────────────────────────┤
│  给你的关系建议           │  ← 第 3 屏：行动指南
│  靠近时 / 不安时 / 冲突时  │     (展开)
├─────────────────────────┤
│  ▸ 你在亲密关系里的惯性   │  ← 可折叠：分析深度
│    (折叠，点击展开)       │
├─────────────────────────┤
│  ▸ 展开更多细节           │  ← 已折叠
│    地图 / Top5 / 旅途     │
├─────────────────────────┤
│  分享与反馈               │  ← 始终可达
└─────────────────────────┘
```

**首屏 703px hero 占 83%** → 用户首先看到人格形象 + 匹配度 + 核心一句话。向下滚动进入说明书和建议，这些都是高价值内容。惯性分析作为可选深入阅读。

---

## 五、桌面端 1440px 方案

桌面端 card 宽 920px，一屏可见更多内容。但同样适用渐进式披露：

- Hero (594px) → 占 viewport 的 66%
- Section 2 + 4 一屏内可见
- Section 3 (惯性) 折叠 → 减少滚动距离，按需展开

**桌面端不全部展开的理由**：当前 card 高度 2281px（含展开的 Section 2-4），如果折叠 Section 3，card 可减少约 200-300px 高度，用户更快到达分享区。

---

## 六、最小实现方案

### 只改 app.js — `renderResult()` 函数中 Section 3 的 HTML 模板

**当前（line 2921-2947）：**
```javascript
<!-- ═══════════ SECTION 3: 你在亲密关系里的惯性 ═══════════ -->
<div class="result-section-divider">
  <span class="section-divider-label">你在亲密关系里的惯性</span>
</div>

${echoAtTopHTML}

<div class="inertia-module">
  <div class="inertia-sub">...</div>
  <div class="inertia-sub inertia-caution">...</div>
  ...
</div>

${echoAtBottomHTML}
```

**修改后：**
```javascript
<!-- ═══════════ SECTION 3: 你在亲密关系里的惯性 ═══════════ -->
${echoAtTopHTML}  <!-- 回声提示保持在折叠区外，始终可见 -->

<button class="collapse-toggle inertia-toggle" data-collapse="inertia">
  <span class="section-divider-label">你在亲密关系里的惯性</span>
  <span class="toggle-arrow">▾</span>
</button>
<div class="collapse-content" id="collapse-inertia">
  <div class="inertia-module">
    <div class="inertia-sub">...</div>
    <div class="inertia-sub inertia-caution">...</div>
    ...
  </div>
  ${echoAtBottomHTML}
</div>
```

### 改动量

| 文件 | 改动 | 行数 |
|------|------|------|
| `app.js` | `renderResult()` Section 3 模板重排 | ~15 行 |
| `styles.css` | _可选_ 为 `.inertia-toggle` 添加微调样式 | 0-5 行 |
| **合计** | | **~15-20 行** |

### 为什么不需要改 JS

`initCollapseToggles()` 已通用化：
- 自动扫描所有 `.collapse-toggle`
- 读取 `data-collapse` 属性 → 定位 `#collapse-{id}`
- 无需为新的 collapse 添加任何 JS 代码

---

## 七、涉及的选择器 / 函数

### app.js

| 位置 | 函数 | 改动 |
|------|------|------|
| ~line 2921 | `renderResult()` 内 Section 3 模板 | 重排 HTML 结构 |

### styles.css（可选）

| 选择器 | 改动 | 理由 |
|--------|------|------|
| `.inertia-toggle` | 可选微调 | 确保按钮与 section divider 视觉一致 |

### 不涉及

- `initCollapseToggles()` — 无需改动
- `initShareImageSection()` — 无需改动
- `renderResult()` 其他 section — 无需改动
- 评分逻辑 / 题库 / 人格映射 — 无需改动

---

## 八、12 人格一致性

**所有 12 个人格共用同一个 `renderResult()` 模板。**

Section 3（惯性）的内容字段（strengths / blindSpots / suitablePartner）在所有 12 个人格中均存在。折叠机制对所有 12 个结果页完全一致。

| 检查项 | 结论 |
|--------|------|
| 所有 12 人格有 strengths | ✅ |
| 所有 12 人格有 blindSpots | ✅ |
| 所有 12 人格有 suitablePartner | ✅ (部分为空，条件渲染) |
| HTML 结构一致 | ✅ |
| 折叠逻辑一致 | ✅ |

---

## 九、风险矩阵

| 风险 | 等级 | 说明 | 缓解 |
|------|------|------|------|
| collapse-content id 冲突 | 极低 | `#collapse-inertia` 为新增 ID，不与现有冲突 | 命名唯一性检查 |
| echo hints 被误折叠 | 低 | 将 echoAtTopHTML 放在 collapse-content 外部 | 代码审查 |
| 移动端折叠按钮过小 | 低 | 复用 `.collapse-toggle` 样式（含 P1 min-height:44px） | 视觉验证 |
| `initCollapseToggles()` 重复绑定 | 极低 | 只在 `renderResult()` 后调用一次 | 现有逻辑已验证 |
| Section 3 折叠后 card 高度塌陷 | 极低 | `.collapse-content` 已有 `max-height:0` + `overflow:hidden` | CSS 已验证 |
| 用户找不到惯性分析 | 低 | 折叠按钮文案与原有 section divider 一致 | 用户一眼可识别 |

---

## 十、是否需要执行

### ✅ 建议执行

- 改动量极小（~15 行）
- 复用 100% 现有折叠机制
- 不改 JS 逻辑
- 不改 CSS（或仅微调）
- 不改评分 / 题库 / 映射
- 12 人格全覆盖

---

## 十一、执行前需确认的问题

1. **Section 3 折叠后的 toggle 按钮样式**：使用现有的 `.collapse-toggle` 样式（`border:1px dashed`, `border-radius:12px`），还是新增 `.inertia-toggle` 保持与 section divider 视觉一致？建议：使用与 section divider 相似的扁平样式，而非现有 collapse-toggle 的 dash 边框。

2. **echoAtBottomHTML 放在折叠区内还是区外**：echoAtBottomHTML 是 "关系回声：XX型（XX%）" 一行文字。放在折叠区内（需要展开才能看到）vs 放在折叠区外（始终可见）？建议：放在折叠区内，因为它是 Section 3 的总结语，与 inertia 内容关联紧密。echoAtTopHTML 放在区外（它在 inertia 上方，是独立的过渡句）。

3. **桌面端是否也折叠 Section 3**：1440px 下 card 更宽，折叠是否有必要？建议：桌面端同样折叠，保持两端体验一致，且减少 card 总高度。

4. **Section 4（建议）是否也折叠**：当前方案建议 Section 4 保持展开。如果可以接受更激进的折叠，Section 4 也可以折叠。建议：Section 4 先保持展开，Phase B 只折叠 Section 3，观察效果后再决定。

---

> **方案完成。等待确认后执行。**
