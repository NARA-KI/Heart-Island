# Heart Island P2 Phase C — 分享入口前移 + 移动端截图优化 方案

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3 Stable Base + Phase A + Phase B  
> 范围：方案设计 — 不修改代码  
> 原则：最小改动、复用现有逻辑、不破坏现有功能

---

## 一、当前分享链路

### 1.1 按钮位置

```
#result-card 底部（Section 6）
│
├── #share-cover-btn    "生成分享卡"     → generateShareCoverImage()
├── #share-full-btn     "生成长图"       → generateFullReportImage()
├── #share-save-btn     "保存图片" .hidden → download PNG
├── #share-native-btn   "分享图片" .hidden → navigator.share()
└── #share-copy-text-btn "复制分享文字"   → clipboard text
```

当前用户必须滚动到 card 底部（2281px 深处）才能看到分享按钮。

### 1.2 函数调用链

```
initShareImageSection()                           ← 在 renderResult 后调用
  ├── #share-cover-btn click
  │     └── generateShareCoverImage()
  │           └── canvas 1080×1440 → toDataURL → shareImageDataURL
  │                 └── showPreview() → 显示预览 + 显示 save/native 按钮
  ├── #share-full-btn click
  │     └── generateFullReportImage()
  ├── #share-save-btn click
  │     └── download PNG (shareImageDataURL)
  └── #share-native-btn click
        └── navigator.share(file)
```

### 1.3 关键全局变量

```javascript
let shareImageDataURL = null;   // 当前生成的分享图 data URL
```

### 1.4 分享卡内容（Share Cover Canvas）

```
1080×1440px canvas
├── 背景渐变 + 网格 + 岛屿剪影
├── 拟人图（右侧 faded）
├── "心岛计划 Beta" badge
├── 人格名称 (60px bold)
├── subtitle / 匹配度
├── Share quote (italic)
├── Keywords (3 个标签)
├── 关系回声 (optional)
├── "一段关于你如何靠近…" tagline
└── Footer "#心岛计划 #恋爱人格测试"
```

---

## 二、移动端截图现状

### 当前 Hero（390px）

```
Hero: 328×703 (占 844px 屏幕 83%)
├── Badge "登岛档案"
├── Label "你的核心主岛"
├── 人格名称 (28px)
├── 匹配度 (42px gold)
├── Keywords (3 个)
├── Hitline
├── Confidence text
└── 拟人图 (258×345)
```

**首屏已包含完整人格信息**，但 703px 偏高（几乎没有留白）。
Phase A 提升了仪式感，Phase C 可以微调间距让 hero 更紧凑，
同时添加分享入口。

---

## 三、方案一：Hero 底部轻量分享链接（推荐）

### 设计

在 hero 底部（`.hero-portrait-mask` 下方、hero 闭合前）添加一行轻量提示：

```html
<div class="hero-share-hint">
  <span>分享你的主岛</span>
  <button class="hero-share-trigger" id="hero-share-trigger">生成分享卡 ▸</button>
</div>
```

点击触发 `generateShareCoverImage()`，然后：
- 桌面端：滚动到 Section 6 预览区
- 移动端：直接在 canvas 生成后弹出预览/保存

### 优点
- 分享入口在首屏可见（hero 底部）
- 不抢 hero 仪式感（在 hero 内部底部，轻量级）
- 复用 100% 现有 `generateShareCoverImage()` 逻辑
- 按钮样式与现有 `.share-cover-btn` 一致

### 缺点
- hero 高度会增加 ~50px
- 需新增 DOM 元素（1 行 HTML + 1 个 button）
- 需新增 1 个事件绑定

### 改动量

| 文件 | 改动 | 行数 |
|------|------|------|
| `app.js` `renderResult()` | hero 底部新增 share trigger HTML | ~5 行 |
| `app.js` `initShareImageSection()` | 新增 `#hero-share-trigger` 事件绑定 | ~8 行 |
| `styles.css` | `.hero-share-hint` + `.hero-share-trigger` | ~15 行 |

---

## 四、方案二：Hero 与 Section 2 之间的分享行

### 设计

在 hero 闭合后、Section 2 divider 之前插入一行独立的分享入口：

```html
<div class="quick-share-row">
  <span class="quick-share-label">分享你的心岛身份</span>
  <button class="share-cover-btn quick-share-btn" id="quick-share-btn">生成分享卡</button>
</div>
```

### 优点
- 不增加 hero 高度
- 视觉上独立于 hero，不干扰仪式感
- 用户滚动到 Section 2 时自然看到
- 复用 `.share-cover-btn` 样式

### 缺点
- 在 mobile 上仍需要滚动一点才能看到（hero 703px 之后）
- 与 Section 2 divider 相邻，可能视觉拥挤

### 改动量

| 文件 | 改动 | 行数 |
|------|------|------|
| `app.js` `renderResult()` | hero 后新增 quick-share-row | ~5 行 |
| `app.js` `initShareImageSection()` | 新增 `#quick-share-btn` 绑定 | ~8 行 |
| `styles.css` | `.quick-share-row` | ~12 行 |

---

## 五、方案三：仅优化现有分享区可见性（最保守）

### 设计

不改 DOM，只在 CSS 层面：
- 缩小 Section 2/3/4 的间距，让用户更快到达 Section 6
- 在分享区添加 sticky 或更醒目的视觉标记
- 移动端在 share section divider 上添加引导箭头

### 优点
- 0 行 app.js 改动
- 风险最低

### 缺点
- 不解决根本问题——分享区仍在底部
- 缩小间距可能影响可读性
- 效果有限

---

## 六、方案对比

| 维度 | 方案一 Hero 底部 | 方案二 Hero 后行 | 方案三 CSS 优化 |
|------|-----------------|------------------|----------------|
| 首屏可见 | ✅ 移动端首屏 | ⚠️ 需滚动 | ❌ |
| 不干扰 hero 仪式感 | ⚠️ 在 hero 内部 | ✅ hero 外部 | ✅ |
| 复用现有逻辑 | ✅ 100% | ✅ 100% | ✅ 不变 |
| app.js 改动 | ~13 行 | ~13 行 | 0 行 |
| 新增 DOM | 1 行 + 1 btn | 1 行 + 1 btn | 0 |
| 移动端截图友好 | ✅ | ✅ | ❌ |
| 风险 | 低 | 低 | 极低 |

---

## 七、推荐方案：方案一（Hero 底部轻量分享链接）

### 理由

1. **首屏可见**：移动端 hero 703px，底部 ~50px 的 share hint 正好在"刚好可见"位置
2. **不抢焦点**：放在 hero 底部、portrait mask 下方、confidence text 旁边，视觉权重低
3. **复用逻辑**：点击 → `generateShareCoverImage()` → 与现有 `#share-cover-btn` 完全相同的逻辑
4. **产品级**：像正式心理测评产品的"分享我的结果"入口

### 具体实现

**app.js `renderResult()`，在 `.hero-confidence` 之后、hero 闭合之前：**
```javascript
<div class="hero-share-hint">
  <button class="hero-share-trigger" id="hero-share-trigger">
    生成我的分享卡 <span class="hst-arrow">▸</span>
  </button>
</div>
```

**app.js `initShareImageSection()`，在现有 coverBtn 绑定之后：**
```javascript
const heroTrigger = $('#hero-share-trigger');
if (heroTrigger) {
  heroTrigger.addEventListener('click', () => {
    try {
      shareImageDataURL = generateShareCoverImage();
      showPreview(shareImageDataURL);
      if (shareImageDataURL) {
        showCopyToast('分享卡已生成，可保存或分享');
        // 滚动到预览区
        const preview = $('#share-preview-area');
        if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      showPreview(null);
    }
  });
}
```

**styles.css 新增：**
```css
.hero-share-hint {
  margin-top:14px; padding-top:12px;
  border-top:1px solid rgba(255,255,255,0.04);
  text-align:center;
}
.hero-share-trigger {
  font-family:var(--font-title); font-size:12px;
  color:var(--gold); letter-spacing:2px;
  background:transparent; border:none;
  cursor:pointer; opacity:0.55; min-height:44px;
  transition:opacity 0.3s;
}
.hero-share-trigger:hover { opacity:0.85; }
.hst-arrow { font-size:10px; margin-left:4px; opacity:0.5; }
```

---

## 八、移动端截图优化

### 8.1 当前问题

- hero 703px（83%）偏高，几乎没有底部留白
- 截图时 hero 中的 confidence text 偏长，可能被截断

### 8.2 优化建议

| 优化项 | 方法 | 预期效果 |
|--------|------|----------|
| Hero 间距微调 | 减少 `.hero-info-col` 子元素 margin-bottom | hero 高度 ~703→~650px |
| 分享卡 canvas 已是 1080×1440 | 无需改动 | 高质量截图已存在 |
| Confidence text 精简 | 不加 ellipsis，保留现有 | 文字可读即可 |

### 8.3 截图场景说明

用户有两种截图方式：
1. **直接截图 hero**：390px 屏幕截图 → 包含 badge + 名称 + 匹配度 + 拟人图 + hitline + share hint
2. **生成分享卡**：1080×1440 canvas → 高质量设计卡片

两种方式互补。直接截图更快，分享卡更正式。

---

## 九、涉及文件

| 文件 | 方案一 | 方案二 | 方案三 |
|------|--------|--------|--------|
| `app.js` `renderResult()` | 5 行新增 | 5 行新增 | 0 |
| `app.js` `initShareImageSection()` | 12 行新增 | 12 行新增 | 0 |
| `styles.css` | 20 行新增 | 15 行新增 | 10 行调整 |

---

## 十、风险矩阵

| 风险 | 等级 | 说明 | 缓解 |
|------|------|------|------|
| hero 高度增加 | 低 | +~50px → 753px (89%) | Phase C 同步微调 hero 间距补偿 |
| 新增按钮与现有 share 按钮重复 | 低 | 两个入口调用同一函数 | 明确视觉差异（hero 轻量 vs bottom 完整） |
| `generateShareCoverImage()` 性能 | 极低 | Canvas 1080×1440 生成 ~100ms | 已稳定运行 |
| 滚动行为冲突 | 极低 | smooth scroll 到预览区 | 仅在桌面端滚动 |
| 移动端 share hint 被 hero 裁切 | 低 | hero 703px + hint ~50px = 753px | 844px screen - 753px = 91px 剩余 |
| 破坏 P0/P1/P2A/P2B | 极低 | 仅新增，不改现有 | 独立选择器 |

---

## 十一、不改动清单

- 现有 `#share-cover-btn` / `#share-full-btn` 逻辑 ✅
- `generateShareCoverImage()` / `generateFullReportImage()` 函数 ✅
- Section 6 分享区 DOM ✅
- 评分机制 / 题库 / 人格映射 / 素材 ✅
- P0/P1/P2A/P2B 所有已修复项 ✅

---

## 十二、执行前需确认的问题

1. **分享入口文案**：使用"生成我的分享卡"还是更简洁的"分享主岛 ▸"？建议：前者更清晰。

2. **hero 高度补偿**：当前 703px，添加 share hint 后约 753px。是否需要微调 hero 间距（减少 margin-bottom 等）来保持 ~700px？建议：微调 hero-info-col 子元素的 margin-bottom 补偿 20-30px。

3. **桌面端行为**：桌面端 share hint 点击后，是生成卡片并原地展示 toast，还是滚动到 Section 6 预览区？建议：滚动到预览区（桌面端空间大，预览体验好）。

4. **是否需要同时添加"复制分享文字"入口**：可以只放"生成分享卡"，文字复制保留在 Section 6。建议：hero 底部只放一个入口，保持简洁。

---

> **方案完成。等待确认后执行推荐方案一。**
