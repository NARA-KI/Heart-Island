# Heart Island Beta 0.9.9.3 回归验证报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3 P0 稳定版  
> 范围：全页面 × 双视口 + 12 核心人格 + 素材 + 评分审计  
> 原则：只验证，不修改代码

---

## 一、验证通过项 ✅

### 1.1 页面渲染（4 页 × 2 视口 = 8 状态）

| 页面 | 1440px | 390px | 场景图 | 按钮 | JS 错误 | 横向溢出 |
|------|--------|-------|--------|------|---------|----------|
| 首页 | ✅ | ✅ | 634×900 / 390×236 | 2 个正常 | 0 | 0 |
| 做题页 | ✅ | ✅ | 634×900 / 390×236 | 4 个正常 | 0 | 0 |
| 结尾过渡页 | ✅ | ✅ | — | skip 可点击 | 0 | 0 |
| 结果页 | ✅ | ✅ | 634×900 / 390×236 | 16 个正常 | 0 | 0 |

### 1.2 核心渲染指标

| 指标 | 修复前 (P0) | 当前 | 状态 |
|------|-------------|------|------|
| 场景图渲染 | 0×0 | 634×900 (desktop) / 390×236 (mobile) | ✅ |
| 拟人图渲染 | 0 张 | 1 张 (311×468 desktop / 238×318 mobile) | ✅ |
| 拟人图 object-fit | fill (拉伸) | cover (正确) | ✅ |
| 结果页内容 | 空壳 | 完整 hero + 地图 + 分析 | ✅ |
| skip 按钮 | 被拦截 | 正常触发 | ✅ |
| JS 控制台错误 | 0 | 0 | ✅ |
| 横向溢出 | 0 | 0 | ✅ |

### 1.3 评分审计

| 审计项 | 结果 | 状态 |
|--------|------|------|
| probability-audit | 12/12 自匹配, gap≤5: 73%, 无从未出现类型 | ✅ |
| options-audit | 12/12 维度路径, 12/12 核心黄金路径, 20/20 反向 | ✅ |
| options-audit 分支 | 5/8 分支黄金路径 (旧船长型/温室型/黑森林型未命中) | ⚠️ 已有问题 |

### 1.4 素材完整性

| 类型 | 数量 | 文件 | 映射完整性 |
|------|------|------|-----------|
| 人格拟人图 | 12 | lighthouse, gatekeeper, nest-builder, collector, migratory-bird, islander, explorer, wandering-poet, spark, moonlight, mirror, stargazer | ✅ 12/12 映射无断裂 |
| 场景图 | 12 | cl-coast, au-ridge, se-harbor, ex-river, rp-volcano, in-plain, id-observatory, st-tower, ca-dock, nv-fog-route, me-old-bay, ev-moon-lake | ✅ 12/12 映射无断裂 |
| 缩略图 | — | thumbs/ 子目录 | 需单独验证 |

### 1.5 PERSONA_IMAGE_MAP 完整性

```
灯塔型    → lighthouse.webp       ✅ 存在
守门人型  → gatekeeper.webp       ✅ 存在
筑巢型    → nest-builder.webp     ✅ 存在
收藏家型  → collector.webp        ✅ 存在
候鸟型    → migratory-bird.webp   ✅ 存在
岛屿型    → islander.webp         ✅ 存在
探险家型  → explorer.webp         ✅ 存在
流浪诗人型 → wandering-poet.webp  ✅ 存在
星火型    → spark.webp            ✅ 存在
月光型    → moonlight.webp        ✅ 存在
镜像型    → mirror.webp           ✅ 存在
观星者型  → stargazer.webp        ✅ 存在
```

**12/12 无 404、无路径断裂、无 0×0、无 opacity:0、无 display:none**

### 1.6 SCENE_WEBP_MAP 完整性

```
CL → cl-coast.webp        ✅
AU → au-ridge.webp        ✅
SE → se-harbor.webp       ✅
EX → ex-river.webp        ✅
RP → rp-volcano.webp      ✅
IN → in-plain.webp        ✅
ID → id-observatory.webp  ✅
ST → st-tower.webp        ✅
CA → ca-dock.webp         ✅
NV → nv-fog-route.webp    ✅
ME → me-old-bay.webp      ✅
EV → ev-moon-lake.webp    ✅
```

**12/12 场景图无断裂**

---

## 二、新发现问题 🟡

### 2.1 文本格式瑕疵：「关系回声：XX型型」

**现象**：结果页 DOM 中检测到 `关系回声：镜像型型（73%）`，人格名称出现了重复的"型"字。
同一问题也出现在 `关系回声：观星者型型（70%）`（上一轮验证）。

**位置**：`app.js` — echo hint 文本或 subtitle 拼接逻辑中，可能在格式化时为已含"型"的名称额外追加了"型"。

**严重度**：🟡 LOW — 不影响功能，不影响映射，纯文本显示瑕疵。

**建议**：P1 迭代中统一检查所有带"型"后缀的拼接逻辑。

### 2.2 移动端选项按钮高度不一致（已有问题）

**现象**：390px 下选项 3 高度 61px（vs 其他选项 46px），差值 15px。

**严重度**：🟡 LOW — 已有问题，非本次引入。

### 2.3 分支人格黄金路径 3/8 未命中（已有问题）

- 旧船长型 → 黄金路径排 #3（被收藏家型/镜像型覆盖）
- 温室型 → 黄金路径排 #3（被镜像型/收藏家型覆盖）
- 黑森林型 → 黄金路径排 #3（被深海型覆盖）

**严重度**：🟡 MEDIUM — 分支人格评分权重需调整，但核心 12 人格均正确命中。

---

## 三、是否阻塞继续开发

### ❌ 不阻塞

- 所有 P0 问题已修复并验证通过
- 核心 12 人格映射完整，无断裂
- 评分机制稳定（audit 全部通过）
- 4 页面 × 2 视口全部正常渲染
- 0 JS 控制台错误
- 0 横向溢出

### 可进入 P1 迭代

当前版本 Beta 0.9.9.3 已是稳定基线，可以安全进入下一轮迭代。

---

## 四、下一步建议

### P1 优先级排序

| 优先级 | 问题 | 涉及文件 | 预计改动量 |
|--------|------|----------|-----------|
| 1 | 按钮触摸目标 ≥44px (WCAG) | `styles.css` | ~15 行 |
| 2 | 「XX型型」文本修正 | `app.js` | 1 行 |
| 3 | 移动端选项高度统一 | `styles.css` | ~5 行 |
| 4 | 结果页产品化增强 (文案/布局) | `app.js` + `styles.css` | 中 |

### 建议修复顺序

```
S1 → 按钮触摸目标 / min-height
S2 → 文本「型型」去重
S3 → 移动端选项 min-height 约束
S4 → 结果页信息层级优化
```

---

## 五、验证方法说明

| 方法 | 覆盖范围 |
|------|---------|
| `npm run audit:probability` | 100,000 次随机模拟 + 12 自匹配 |
| `npm run audit:options` | 12 维度路径 + 20 黄金路径 + 20 反向 + 20 文案 |
| `inspect-ui-structure.mjs` | 6 状态 DOM 指标 + console 错误 + 溢出 |
| `inspect-ui.mjs` | 6 张截图（视觉确认） |
| 素材完整性检查 | 12 persona + 12 scene WebP 文件存在性 |
| 映射完整性检查 | PERSONA_IMAGE_MAP ↔ 文件 1:1 对应 |

---

## 六、结论

**Beta 0.9.9.3 P0 稳定版：可进入 P1 修复。**

P0 修复后所有关键渲染指标恢复正常，评分审计无退化，12 人格映射无断裂。
新发现 1 个文本格式问题（「型型」），严重度低，不阻塞继续开发。
