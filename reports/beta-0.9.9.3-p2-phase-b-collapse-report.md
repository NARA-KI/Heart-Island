# Heart Island P2 Phase B — 结果页信息层级渐进式披露报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3 Stable Base + Phase A → Phase B  
> 范围：`app.js` 1 处 HTML 模板 + `styles.css` 3 处 CSS  
> 原则：最小改动、复用现有机制、0 处新增 JS

---

## 一、修改汇总

| # | 文件 | 位置 | 修改内容 | 类型 |
|---|------|------|----------|------|
| 1 | `app.js` | `renderResult()` Section 3 模板 | 替换 section divider 为 collapse toggle + 包裹 collapse-content | HTML 模板重排 |
| 2 | `styles.css` | `.inertia-toggle` (base) | 新增 section-divider 视觉风格的折叠按钮 | CSS |
| 3 | `styles.css` | `.inertia-toggle` (mobile MQ) | 移动端间距适配 | CSS |
| 4 | `styles.css` | `.inertia-toggle .toggle-arrow` | 箭头旋转动画 | CSS |

**app.js 改动量：~15 行（仅 HTML 模板，0 行 JS 逻辑）**
**styles.css 改动量：~25 行（新增）**

备份：`app.js.backup-p2-phase-b` / `styles.css.backup-p2-phase-b`

---

## 二、修改前后结构对比

### Section 3 模板（app.js `renderResult()`）

**修改前：**
```html
<div class="result-section-divider">
  <span>你在亲密关系里的惯性</span>
</div>
${echoAtTopHTML}
<div class="inertia-module">...</div>
${echoAtBottomHTML}
```

**修改后：**
```html
${echoAtTopHTML}                          ← 回声提示在折叠区外，始终可见
<button class="collapse-toggle inertia-toggle" data-collapse="inertia">
  <span>你在亲密关系里的惯性</span> <span>▾</span>
</button>
<div class="collapse-content" id="collapse-inertia">
  <div class="inertia-module">...</div>
  ${echoAtBottomHTML}                    ← 回声总结在折叠区内
</div>
```

### 关键设计决策

| 元素 | 位置 | 理由 |
|------|------|------|
| `echoAtTopHTML` | 折叠区外 | 轻量一句过渡语，不占空间，保持可见 |
| `echoAtBottomHTML` | 折叠区内 | Section 3 总结语，与惯性内容紧密关联 |
| `.inertia-toggle` 样式 | 与 section divider 视觉一致 | 不突兀，不用 dash 边框，保持产品级 |

---

## 三、CSS 新增选择器

### `.inertia-toggle`（基础）
```css
.inertia-toggle {
  display:flex; align-items:center; gap:12px;
  width:100%; margin:24px 0 14px; padding:0 4px;
  border:none; background:transparent;           /* 无边框，轻盈 */
  cursor:pointer; min-height:44px;               /* P1 触摸目标 */
}
.inertia-toggle::before, .inertia-toggle::after {
  /* 与 .result-section-divider 相同的渐变线 */
  content:''; flex:1; height:1px;
  background:linear-gradient(90deg, transparent, rgba(201,167,91,0.12), transparent);
}
.inertia-toggle .toggle-arrow {
  font-size:10px; color:var(--gold); opacity:0.5;
  transition:transform 0.3s, opacity 0.3s;
}
.inertia-toggle.expanded .toggle-arrow {
  transform:rotate(180deg); opacity:0.7;
}
```

### `.inertia-toggle`（移动端 ≤767px）
```css
.inertia-toggle { margin:18px 0 10px; padding:0 2px; }
.inertia-toggle .section-divider-label { font-size:11px; letter-spacing:3px; }
```

---

## 四、折叠机制复用

```
initCollapseToggles()
  ├── 扫描所有 .collapse-toggle          ← 新增 .inertia-toggle 自动被纳入
  ├── 读取 data-collapse="inertia"        ← 新增属性
  ├── 定位 #collapse-inertia              ← 新增 ID
  └── 切换 .expanded                     ← 复用现有 CSS 过渡

0 行新增 JS。100% 复用现有 initCollapseToggles()。
```

---

## 五、验证结果

### 桌面端 1440px

| 检查项 | 结果 |
|--------|------|
| Section 3 默认折叠 | ✅ `maxHeight:0, opacity:0` |
| 点击 toggle 展开 | ✅ `expanded:true, opacity:1` |
| 再次点击折叠 | ✅ `collapsed:true` |
| Section 2 Manual 可见 | ✅ |
| Section 4 Advice 可见 | ✅ |
| Section 5 Details 折叠 | ✅ 保持已有行为 |
| Hero 可见 + Portrait | ✅ 361×542 |
| echoBottomHTML 在折叠区内 | ✅ |
| JS 错误 | 0 |

### 移动端 390px

| 检查项 | 结果 |
|--------|------|
| Section 3 默认折叠 | ✅ |
| Hero 可见 | ✅ |
| Card 宽度 | 354px |
| 横向溢出 | 0 |
| JS 错误 | 0 |

### 评分审计

| 审计项 | 结果 |
|--------|------|
| probability: 12/12 自匹配 | ✅ |
| probability: gap≤5 = 72.9% | ✅ |
| options: 12/12 维度路径 | ✅ |
| options: 12/12 核心黄金路径 | ✅ |

---

## 六、12 人格结果页一致性

所有 12 人格共用同一 `renderResult()` 模板，Section 3 折叠机制统一适用于：
- 灯塔型 / 守门人型 / 筑巢型 / 收藏家型 / 候鸟型 / 岛屿型
- 探险家型 / 流浪诗人型 / 星火型 / 月光型 / 镜像型 / 观星者型

foldable content 字段（strengths / blindSpots / suitablePartner）12 人格全部具备。

---

## 七、结果页当前信息层级

```
打开结果页 ↓
┌─────────────────────────────────────┐
│ Section 1  HERO          [展开]      │  ← 首屏：人格揭晓
│ 拟人图 + 名称 + 匹配度 + hitline     │     始终可见
├─────────────────────────────────────┤
│ Section 2  人格说明书      [展开]     │  ← 核心身份
│ 你在关系里的样子 / 需要的爱 / 为什么  │     始终可见
├─────────────────────────────────────┤
│ Section 4  关系建议        [展开]     │  ← 行动指南
│ 靠近时 / 不安时 / 冲突时             │     始终可见
├─────────────────────────────────────┤
│ Section 3  惯性分析  ▾    [折叠]     │  ← 新增折叠
│ 关系优势 / 卡住的地方 / 关系节奏      │     按需展开
├─────────────────────────────────────┤
│ Section 5  更多细节  ▾    [折叠]     │  ← 已有折叠
│ 12维地图 / Top5 / 旅途 / 图鉴        │
├─────────────────────────────────────┤
│ Section 6  分享与反馈      [展开]     │  ← 始终可达
└─────────────────────────────────────┘
```

---

## 八、P0/P1/Phase A 回归检查

| 修复项 | 状态 |
|--------|------|
| 场景图渲染 | ✅ 634×900 |
| 结果页渲染 | ✅ |
| 拟人图 361×542 | ✅ |
| #game-screen align-items:stretch | ✅ 未受影响 |
| #ending-backdrop pointer-events:none | ✅ 未受影响 |
| 按钮 ≥44px | ✅ .inertia-toggle 含 min-height:44px |
| 移动端选项高度 | ✅ 未受影响 |
| "XX型型" | ✅ 未回归 |

---

## 九、剩余问题

| 问题 | 优先级 | 说明 |
|------|--------|------|
| Section 4 是否也折叠 | P3 | 当前保持展开，观察用户反馈 |
| 分享入口前移 | Phase C | 下一阶段 |
| 移动端 hero 703px 偏高 | Phase C | 可在分享入口前移时同步优化间距 |

---

## 十、结论

**Phase B 完成。可进入 Phase C（分享入口前移 + 移动端截图优化）。**

### 已达成
- Section 3（惯性分析）默认折叠，点击展开/收起 ✅
- 渐进式披露：Hero → Manual → Advice 三屏递进 ✅
- 0 行新增 JS，100% 复用 `initCollapseToggles()` ✅
- Section 2/4/6 保持展开 ✅
- 12 人格全覆盖，结构一致 ✅
- 0 JS 错误、0 横向溢出、Audit 无退化 ✅
