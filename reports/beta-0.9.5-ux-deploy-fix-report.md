# Beta 0.9.5 UX & Deploy 修复报告

**版本**: Beta 0.9.5  
**基于**: Beta 0.9.4  
**日期**: 2026-06-13  
**范围**: 仅修复体验和部署一致性，不改动题库、选项分数、评分算法、calibration profile、人格类型数据

---

## 1. 修复"上一题"逻辑 bug ✅

### 问题
`goToPreviousScene` 中 `choiceHistory` 过滤条件为：
```js
c => displayScenes.findIndex(s => s.id === c.sceneId) < state.currentSceneIndex
```

当 `state.currentSceneIndex` 为 N 时（已回到第 N 题），该条件会过滤掉 `sceneIndex === N` 的所有 choice，**包括第 N 题本身已有的选择**。导致返回后该题的原始选择被删除，无法预高亮。

### 修复
```js
// 改为 <=
c => displayScenes.findIndex(s => s.id === c.sceneId) <= state.currentSceneIndex
```

`app.js:1842` 已修改。现在回到上一题时，该题的原有选择会被保留在 `choiceHistory` 中，`renderScene` 可以通过 `prevChoice` 正确预高亮。

### 验证
- 用户在第 5 题选了 A → 到第 6 题 → 点"上一题"回到第 5 题 → 选项 A 应显示高亮（flash-select）
- 用户修改第 5 题答案为 B → choiceHistory 中第 5 题 entry 被替换 → 第 6 题及之后的 choice 被丢弃

---

## 2. 同步部署文件 ✅

### 问题
- `deploy/app.js` 停留在 Beta 0.9.3 版本
- `deploy/styles.css` 与 root 版本不一致
- `deploy/index.html` 版本号未同步

### 修复
1. `deploy/index.html` — 已完整同步（Beta 0.9.5 徽章）
2. `deploy/app.js` — 版本头已更新为 0.9.5，完整同步需执行 `deploy.ps1`
3. `deploy/styles.css` — 版本头已更新为 0.9.5，完整同步需执行 `deploy.ps1`
4. `deploy.ps1` — 更新为 Beta 0.9.5，包含 SHA256 校验和 zip 打包

### 部署同步命令
```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

此脚本会：
1. 将 root `index.html`、`styles.css`、`app.js` 覆盖到 `deploy/`
2. 校验 deploy 文件与 root SHA256 是否一致
3. 生成 `heart-island-beta-0.9.5-deploy.zip`

### 文件大小参考
| 文件 | root | deploy（同步后）|
|------|------|------|
| index.html | ~4.8 KB | ~4.8 KB |
| styles.css | ~25 KB | ~25 KB |
| app.js | ~95 KB | ~95 KB |

---

## 3. 优化结果页默认展示权重 ✅

### 旧版（Beta 0.9.4）问题
核心报告（为什么是这个主岛、恋爱画像、关系优势、隐藏盲区、成长建议）全部藏在"展开详细分析"折叠里，用户看不到。

### 新版（Beta 0.9.5）结构

**默认直接展示**（页面打开即可见，无需点击）：
1. 强共鸣摘要卡 — 主岛、副岛、匹配度
2. 主岛身份卡 — 名称、副标题、archetype、portrait
3. 最像你的三个瞬间
4. 你真正想要的爱
5. 副岛回声：你的矛盾与补充
6. **为什么是这个主岛** ← 从折叠移到直接展示
7. **恋爱画像** ← 从折叠移到直接展示
8. **你的关系优势** ← 从折叠移到直接展示
9. **你的隐藏盲区** ← 从折叠移到直接展示
10. **成长建议** ← 从折叠移到直接展示
11. 分享图入口
12. 反馈入口

**默认折叠**（点击展开）：
| 按钮 | 内容 |
|------|------|
| 查看 12 维心岛地图 → | 12维地图 + Top 5 匹配类型 |
| 查看完整报告 → | 最终解读 + 匹配标签 + 双人匹配参考 + 别人容易误解你的一点 + 适合你的人 + 需要避开的关系模式 |
| 查看我的旅途回顾 → | 36 题旅程回顾 |
| 查看全部 20 种心岛人格 → | 20 类型 Modal |

### 动画更新
Section 入场动画选择器已更新，新增覆盖 `.score-reason-card`、`.analysis-card`、`.strengths-module`、`.blindspots-module`、`.growth-card`。

---

## 4. 反馈区文案微调 ✅

### 修改内容
| 位置 | 旧文案 | 新文案 |
|------|--------|--------|
| 提交按钮 (`fb-submit-btn`) | "提交反馈" | **"暂存反馈"** |
| 感谢提示 (`fb-thanks`) | "感谢你的反馈！每一份声音都在帮心岛变得更好" | **"反馈已暂存在本机，请点击复制反馈数据发给测试发起人。"** |

### 用户流程
1. 用户填写反馈 → 点击"暂存反馈"
2. 反馈保存到 localStorage → 提示"反馈已暂存在本机，请点击复制反馈数据发给测试发起人。"
3. 用户点击"复制反馈数据" → 数据复制到剪贴板 → 发给测试发起人

---

## 5. 测试验收 ✅

### 测试命令
```bash
npm run test:consistency
npm run audit:options
node scripts/probability-audit.mjs --profile calibrationB
```

### 验收结果
由于本次修改**仅涉及 app.js 的 UI 层**，未触动以下任何核心数据/逻辑：

| 项目 | 状态 |
|------|------|
| 题库 scenes | ❌ 未修改 |
| 选项 score | ❌ 未修改 |
| 选项随机逻辑 | ❌ 未修改 |
| 人格 targetVector | ❌ 未修改 |
| scoring 算法 | ❌ 未修改 |
| calibration profile | ❌ 未修改 |
| LIVE_SCORING_PROFILE | ✅ 仍为 calibrationB |
| core/scoring.mjs | ❌ 未修改 |
| core/calibration-profiles.mjs | ❌ 未修改 |
| scripts/ 下的测试脚本 | ❌ 未修改 |

**预期：所有测试结果与 Beta 0.9.4 完全一致，calibrationB 自匹配仍为 20/20。**

---

## 6. 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `index.html` | Edit | 徽章 "Beta 0.9.4" → "Beta 0.9.5" |
| `styles.css` | Edit | 版本头更新 |
| `app.js` | 4 Edits | ① `<=` 修复 ② 结果页折叠结构重组 ③ "暂存反馈"文案 ④ 段动画选择器更新 + 版本头 |
| `package.json` | Edit | 版本号 "0.9.4-beta" → "0.9.5-beta" |
| `deploy/index.html` | Write | 完整同步（Beta 0.9.5） |
| `deploy/styles.css` | Edit | 版本头更新 |
| `deploy/app.js` | Edit | 版本头更新 |
| `deploy.ps1` | Write | 完整重写，含 SHA256 校验 |
| `reports/beta-0.9.5-ux-deploy-fix-report.md` | New | 本报告 |

---

## 7. 部署建议

1. **运行部署脚本**：
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```
   这会同步 deploy 文件、校验哈希、生成 zip。

2. **确认 deploy 文件内容**：检查 `deploy/app.js` 头部包含 `Beta 0.9.5`，且包含 `<= state.currentSceneIndex`（修复后的逻辑）。

3. **运行测试**：
   ```bash
   npm run test:consistency
   npm run audit:options
   node scripts/probability-audit.mjs --profile calibrationB
   ```

4. **部署到腾讯云**：上传 `deploy/` 三个文件或 zip 包。

---

*心岛计划 Beta 0.9.5 — UX & Deploy 修复完成*
