# 心岛 V2 可信 Beta 版现状审计

审计时间：2026-07-06  
审计范围：当前 V2 Alpha 运行版本，只读审计。  
产物边界：仅新增本报告与 `reports/audit-assets/v2-trusted-beta/` 截图。

## 1. 执行摘要

当前版本已经完成 V2 最小闭环：入口加载 V2 60 题题库，完成 60 题后进入过渡页，再生成单一主人格结果页。代码层确认实际为 60 题、15 构念、15 人格，评分结果对同一答案可复现，公开模式 `pilot.enabled=false` 不会阻断结果生成。

但它仍不是“可信 Beta 版”。主要差距不在流程是否能跑通，而在结果页表达、分享保存、AI 接入前的数据结构和产品信任感：结果页仍是 Alpha 最小报告，同人格不同答案得到几乎完全相同的主体文案；15 维差异只进入折叠区列表，没有进入核心解释；没有分享/保存入口；刷新结果页后恢复到“航行完成”过渡页而不是结果页；仍有旧版大体量代码和分享逻辑留在根目录 `app.js`，虽然不在当前入口链路。

结论：建议进入下一轮统一改造，但不建议直接对外称为可信 Beta。下一轮应优先重构结果页信息架构和数据事实层，再接入受控 AI 表达层。

## 2. 分支、提交和工作区状态

按要求核对：

```text
pwd: E:\心岛\Heart Island(VS Code))
branch: feature/heart-island-v2-alpha-integration
commit: af3bc59
git log -5:
af3bc59 docs: add v2 15d profile preview
6a7e010 feat: prepare v2 pilot blind review
33250d1 test: add v2 adaptive calibration review
18f586a test: add v2 calibration candidate comparison
47ba8f7 test: diagnose v2 alpha calibration distribution
```

开始审计时工作区干净。审计后新增：

- `reports/heart-island-v2-trusted-beta-current-state-audit.md`
- `reports/audit-assets/v2-trusted-beta/*.png`

## 3. 当前架构地图

| 路径 | 职责 | 审计判断 |
| --- | --- | --- |
| `index.html` | 页面入口，加载 `styles.css` 与 `app.mjs` | 当前 V2 正式入口 |
| `app.mjs` | 仅导入 `./js/v2/app.js` | V2 bootstrap |
| `js/v2/app.js` | 启动、路由动作、pilot 模式、结果生成、debug 暴露 | 当前运行主控 |
| `js/v2/config.js` | 产品版本、数据路径、15 构念标签、15 人格名 | V2 配置中心 |
| `js/v2/data-loader.js` | `fetch` 加载 `data/v2` 运行数据并校验 | 需要 HTTP server，不能直接 file open |
| `data/v2/question-bank.v2.json` | 60 题题库 | 当前真相来源 |
| `data/v2/manifest.json` | 题库/hash/版本/结果页版本 | 运行时兼容校验依据 |
| `js/v2/scoring-engine.js` | 数据校验、构念均值、人格距离匹配、adaptive 评分函数 | 正式公开只用 candidate-a |
| `data/v2/persona-target-vectors.v2.candidate-a.json` | 当前公开 15 人格 targetVector | 当前人格映射来源 |
| `data/v2/persona-descriptions.v2.json` | 15 人格固定描述文案 | 结果页主文案来源 |
| `js/v2/result-engine.js` | 将评分结果转为结果页结构 | 高低构念、固定 sections |
| `js/v2/renderers/result.js` | 普通结果页渲染 | 无分享/保存；单人格 |
| `js/v2/renderers/pilot-result.js` | pilot 盲测结果与反馈 | 非公开模式 |
| `js/v2/storage.js` | localStorage 保存、恢复、版本/hash 校验 | 可恢复未完成进度 |
| `js/v2/question-engine.js` | 答案写入、上一题、下一题、稳定选项顺序 | 按 questionId 保存 |
| `reports/pilot-input/heart-island-current-test-1783239916728.json` | 已知真实样本 localStorage 导出 | 本轮复现主样本 |
| `scripts/v2-product-validation/*` | V2 既有校验、诊断、pilot 验证 | 部分脚本会写 reports/data 或 archive，不在本轮直接执行 |
| `app.js` | 旧版大体量 H5 与旧分享/保存/结果逻辑 | 当前入口不加载，但保留为旧版残留 |

未发现后端、API 代理或环境变量基础；`js/v2` 仅通过 `fetch` 读取静态 JSON。

## 4. 实际启动与测试方式

当前项目没有 `start` 脚本。因 `data-loader.js` 使用 `fetch('./data/v2/...')`，必须通过本地 HTTP server 运行。本轮使用内联 Node 静态服务器启动 `http://127.0.0.1:4317/`，并使用 Playwright Chromium 完成真实点击流程。

既有脚本已阅读：

- `scripts/v2-product-validation/validate-v2-alpha.mjs`：会启动静态服务、跑 60 题浏览器验收，并写 `reports/data/heart-island-v2-alpha-acceptance-results.json`。
- `scripts/v2-product-validation/validate-v2-pilot-readiness.mjs`：验证公开入口隐藏 pilot、pilot X/Y 导出和反馈。
- `scripts/v2-product-validation/audit-v2-scoring-reliability.mjs`：会写 `reports/data/*`，且会更新 `archive/beta-0.9.9.7-production/asset-manifest.json`。

为遵守本轮“除审计报告和截图外不改项目文件”，未直接运行这些会改写既有产物的脚本；改用只读内联脚本复核同类结论。

## 5. V2 核心资产集成状态

确认：

- 实际运行加载 `data/v2/question-bank.v2.json`，共 60 题。
- 15 个构念，每个构念 4 题。
- 每个构念 3 道正向、1 道 reverse 标记题。
- 每题 4 个选项，分值来自 `0 / 33 / 67 / 100`。
- 公开模式使用 `candidate-a`，不是 baseline，也不是 candidate-e。
- `pilot.enabled=false` 时调用 `buildResult(...)`，不会阻断普通结果。
- 运行入口未读取 `drafts/v2`、`pilot-deploy/v2`、旧 36 题或旧 12 人格数据。

问题：

- 题库题目没有显式 `type` 字段；当前只有构念、reverse、选项分值。若未来要做 AI 解释或题型分层，需要补一层稳定元数据。
- 数据存在多份历史副本：`drafts/v2`、`pilot-deploy/v2`、`data/v2`、旧根目录 `app.js` 内置旧数据。当前运行真相来源是 `data/v2`，但维护风险仍在。

## 6. 评分与人格一致性检查

当前评分流程：

1. 每题直接读取 option.score。
2. `reverse` 只作为审计元数据，不二次反转。
3. 每个构念取 4 题均值。
4. 计算用户 15 维向量与 15 个人格 targetVector 的均方根距离。
5. 距离最小者为主人格；并列时按冻结人格数组顺序。

确认：

- 同一答案集重复评分结果一致。
- 15 维均以构念均值归一，不存在题量放大。
- 当前实际是 15 人格公开结果，不是 12 人格或混合输出。
- 页面展示使用 `state.result`，普通结果页只展示单一人格，不显示副人格/辅助人格。

风险：

- 近分处理只用冻结顺序，不向用户展示置信度或领先差。旧审计报告显示大量随机样本 top1/top2 gap 很小，这对“可信解释”是 P1 风险。
- 异常输入没有质量标记。全选 A 仍正常输出“月光型”，没有提示作答风格可能影响参考性。
- `matchStrength` 容易被误解为准确率，虽然页面已有“不是统计概率/心理测量准确率”的说明。

## 7. 首页审计

优点：

- 5 秒内能知道是“心岛计划”，是关于亲密、距离和关系惯性的测试。
- 明确说明 60 题、8-10 分钟、生成心岛人格。
- 有非诊断声明。
- 主按钮清晰。

不足：

- “恋爱关系倾向”没有直接写出，仍偏文学化。
- 首屏仍有 `v2.0 Alpha 1` 状态，陌生用户会感到内部测试味。
- 世界观视觉存在，但产品价值解释偏短。
- 首页像可用 Alpha，不像正式可信 Beta。

结论：局部重构，重点改首屏价值表达和版本/内部状态露出。

## 8. 做题流程审计

Playwright 在 390×844、375×667、1440×900 完成 60 题流程，无控制台错误、无网络 4xx/5xx、无横向溢出。

优点：

- 进度 `1 / 60` 明确。
- 点击选项后自动进入下一题。
- 上一题能恢复已选答案。
- 刷新未完成测试后能恢复当前题。
- 按 questionId + optionId 保存，不依赖显示位置。

不足：

- 当前答题页主要是大题卡 + 四个选项，场景图和章节感没有进入答题页，沉浸感不足。
- 选项文字在小屏可读，但连续 60 题容易疲劳。
- 页面仍有较强问卷感，不像“场景航行”。
- 没有中途退出确认或明确的保存状态提示，只能通过刷新恢复间接验证。

## 9. 结尾过渡审计

最后一题后进入 `航行完成 / 你已经抵达心岛深处 / 查看结果`，不是突然跳结果页，这是可保留的最小过渡。

不足：

- 过渡页直接解释“60 道题的关系构念得分，计算最接近的一种主人格”，偏内部算法说明。
- 没有真实加载等待，也没有 AI 未接入/失败状态。
- 刷新结果页后会恢复到该过渡页，而不是结果页；用户需要再次点“查看结果”。

## 10. 结果页完整审计

当前信息顺序：

1. 顶部状态栏：Heart Island / Alpha 已就绪。
2. 人格图。
3. “你的心岛人格”。
4. 主人格名称。
5. 一句话 hitline。
6. 5 个关键词。
7. 匹配倾向等级。
8. 匹配口径说明。
9. 你在关系中的核心模式。
10. 你真正需要的关系。
11. 你容易陷入的惯性。
12. 你的成长方向。
13. 折叠区：为什么会得到这个结果。
14. 重新测试。

判断：

- 第一屏焦点是人格图 + 人格名，但桌面人格图偏小；移动端人格名突出。
- 主人格足够突出，但核心结论仍偏人格词典。
- 用户能第一眼知道“我是收藏家”，但不容易知道“为什么我是这个结果”。
- 15 维没有平铺，认知负担低；但也导致解释不足。
- 没有旧版主型/副型/分支型混乱。
- 文案重复度高：同人格不同答案主体文案完全固定。
- 关键内部冲突没有进入结果正文，只能从折叠区构念列表间接推断。
- 没有“别人容易误解你的地方”的独立模块。
- 建议偏泛化，可执行性不足。
- 页面长度可控。
- 没有分享/保存入口，无法形成传播卡片。
- 分享图生成逻辑只存在旧 `app.js`，V2 当前未接入。
- 结果页不足以支撑未来付费报告，需要大幅重构。

## 11. 10 组样本对比

| 样本 | 主人格 | Top 5 构念 | Bottom 3 构念 | 关键冲突 | 当前展示 | 审计判断 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 维度集中 SC 高 | 候鸟型 | SC 100, CM 67, AU/TR/CL 58.5 | RI 33, SI/RM 41.5 | 无 | 候鸟型固定文案 | SC 极高没有进入核心解释 |
| 02 均衡中位 | 候鸟型 | CM 67, AU/TR/CL/PA 58.5 | RI 33, SI/RM 41.5 | 无 | 候鸟型固定文案 | 与 01 主体文案相同 |
| 03 高 AU 低 SC | 候鸟型 | AU 100, CM 67, CL/PA/NV 58.5 | SC 0, TR/RI 33 | 高自主边界 + 低安全确认 | 候鸟型固定文案 | 冲突未显式解释 |
| 04 高 CL 高 RI | 月光型 | CL 100, RI 100, CM/EC 67 | SI/RM/CR 41.5 | 无 | 月光型固定文案 | 关系投入高未成为核心叙述 |
| 05 高 SI 高 MN | 流浪诗人 | SI 100, MN 100, CM 67 | RM/ER/RI 33 | 高灵魂理想 + 低现实匹配；高回忆 + 低情绪调节 | 流浪诗人固定文案 | 有部分命中，但冲突不够具体 |
| 06 AU/CL/RI 高且 SC 低 | 守门人 | AU/CL/RI 100, CM 67 | SC 0, CR/ER 33 | 高自主边界 + 低安全确认；高亲密 + 高自主 | 守门人固定文案 | 结果与“高亲密”张力没有说透 |
| 07 真实测试样本 | 收藏家 | SI/MN 83.5, CL 66.75, RM 58.5, RI 58.25 | EC 24.75, ER 25, PA 33 | 高回忆 + 低情绪调节 | 收藏家固定文案 | 有被理解感雏形，但低表达/低调节没有展开 |
| 08a 同人格不同答案 A | 候鸟型 | CL/EC 75, ER/RI/CR 66+ | SI 8.25, CS 16.75, SC 25 | 无 | 候鸟型固定文案 | 与 08b 完全同模板 |
| 08b 同人格不同答案 B | 候鸟型 | AU/PA/EC/ER 75+ | CS 24.75, CM/CR 25 | 高表达 + 低修复 | 候鸟型固定文案 | 分数差异没有进入表达 |
| 09a 接近分不同人格 A | 观星者 | SI 83.5, EC/RI 66.75 | SC 16.5, AU/NV 33.25 | 无 | 观星者固定文案 | 近分/低安全未解释 |
| 09b 接近分不同人格 B | 守门人 | CM/NV/RI 75, AU 66.75 | CL 16.5, TR/MN 25 | 高投入 + 低亲密 | 守门人固定文案 | 人格切换明显，但近分原因不可见 |
| 10 全选 A 异常样本 | 月光型 | TR 100, EC/RI 75, CS 66.75 | CR 8.25, ER 16.75, AU 33.25 | 高表达 + 低修复 | 月光型固定文案 | 无异常输入提示 |

总体判断：当前结果差异主要由人格名和固定人格描述决定；15 维差异没有充分进入结果页表达。

## 12. 移动端与桌面截图索引

截图目录：`reports/audit-assets/v2-trusted-beta/`

| 视口 | 首页 | 须知 | 做题 | 过渡 | 结果收起 | 结果展开 |
| --- | --- | --- | --- | --- | --- | --- |
| 390×844 | `390x844-01-home.png` | `390x844-02-instructions.png` | `390x844-03-quiz-q01.png` | `390x844-04-transition.png` | `390x844-05-result-collapsed.png` | `390x844-06-result-expanded.png` |
| 375×667 | `375x667-01-home.png` | `375x667-02-instructions.png` | `375x667-03-quiz-q01.png` | `375x667-04-transition.png` | `375x667-05-result-collapsed.png` | `375x667-06-result-expanded.png` |
| 1440×900 | `1440x900-01-home.png` | `1440x900-02-instructions.png` | `1440x900-03-quiz-q01.png` | `1440x900-04-transition.png` | `1440x900-05-result-collapsed.png` | `1440x900-06-result-expanded.png` |

## 13. 保留清单

| 内容 | 文件 | 保留原因 | 是否需适配 |
| --- | --- | --- | --- |
| V2 静态入口链路 | `index.html`, `app.mjs`, `js/v2/app.js` | 结构清晰、可跑通 | 需移除 Alpha 露出 |
| 60 题题库加载 | `data/v2/question-bank.v2.json`, `js/v2/data-loader.js` | 已冻结且实际运行 | 需补 type 元数据 |
| 15 构念标签 | `js/v2/config.js` | 命名完整 | 可保留 |
| 构念均值评分 | `js/v2/scoring-engine.js` | 简洁、可复现 | 需补置信度输出 |
| localStorage 兼容校验 | `js/v2/storage.js` | hash/profile 保护合理 | 需优化结果页刷新恢复 |
| 最小过渡页 | `js/v2/renderers/transition.js` | 避免突然跳页 | 文案需产品化 |
| 人格图素材 | `assets/personas/*.webp` | 对旧 12 人格可用 | 新 3 人格需补图 |

## 14. 删除或隐藏清单

| 内容 | 位置 | 原因 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| Alpha 版本露出 | `index.html`, `js/v2/config.js`, 顶部状态栏 | 陌生用户会感到内部测试 | 内部追踪不便 | 前台隐藏，manifest 保留 |
| 过渡页内部算法文案 | `js/v2/renderers/transition.js` | 打断情绪收束 | 用户不理解结果来源 | 改成航行收束 + 等待反馈 |
| 旧版分享/保存入口代码 | 根目录 `app.js` | 当前入口不加载，容易误导维护 | 删除风险高 | 暂不删除，归档或标记 legacy |
| pilot 内部盲测入口 | `?pilot=1` | 不应暴露给公开用户 | 内测仍需要 | 保留但入口隐藏 |

## 15. 重构清单

| 优先级 | 模块 | 当前问题 | 重构目标 | 推荐结构 | 涉及文件 | 风险 |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | 结果页信息架构 | 固定人格词典感强 | 从“人格名”转为“个人报告” | Hero + 核心判断 + 关系特征 + 内部矛盾 + 建议 | `result-engine.js`, `renderers/result.js` | 文案与数据映射需校验 |
| P1 | 结果事实层 | top/bottom 构念未组合解释 | 输出 AI/模板可用事实 | confidence、top/bottom、冲突、建议标签 | `result-engine.js`, `scoring-engine.js` | 不能改变评分 |
| P1 | 分享/保存 | V2 无入口 | 可生成 V2 一致传播卡 | share card 只含人格、核心判断、3 特征 | 新 renderer 或工具模块 | 旧 `app.js` 逻辑不能直接搬 |
| P1 | 异常输入提示 | 全选 A 正常出结果 | 标记低质量作答 | responseQuality flags | `scoring-engine.js` 或 `result-engine.js` | 避免羞辱用户 |
| P1 | 首页价值表达 | 恋爱关系倾向不够直说 | 陌生用户 5 秒理解 | 标题/副标题/题量/结果价值 | `home.js` | 文学感下降需平衡 |
| P2 | 做题页沉浸感 | 场景图弱，问卷感强 | 维持可读同时增强航行感 | 场景标题/轻量背景/进度章节 | `quiz.js`, `styles.css` | 小屏空间紧张 |
| P2 | 刷新结果页 | 完成后刷新回到过渡页 | 结果可恢复 | 保存 result 或可自动重算 | `state.js`, `storage.js`, `app.js` | 注意题库版本失效 |

## 16. AI 接入清单

适合 AI 处理：

- 把结构化事实转成自然语言报告。
- 根据 top/bottom 构念组合解释内部矛盾。
- 生成“别人容易误解你的地方”。
- 在规则边界内生成 3 条具体建议。
- 降低同人格模板重复感。

不适合 AI 处理：

- 决定主人格。
- 修改 15 维分数。
- 修改 targetVector。
- 诊断依恋障碍、人格障碍或精神疾病。
- 自由解读 60 道原始答案。

## 17. 受控 AI 输入输出草案

AI 输入 JSON 草案：

```json
{
  "resultId": "local-result-uuid",
  "scoringVersion": "candidate-a",
  "questionBankVersion": "v2.0-60-question-alpha-1",
  "persona": { "id": "collector", "displayName": "收藏家" },
  "confidence": { "top1Top2Gap": 6.3141, "level": "clear" },
  "constructScores": { "SC": 50, "AU": 41.75, "TR": 58.25 },
  "topConstructs": [
    { "code": "SI", "label": "灵魂理想", "score": 83.5 },
    { "code": "MN", "label": "回忆牵引", "score": 83.5 }
  ],
  "bottomConstructs": [
    { "code": "EC", "label": "表达沟通", "score": 24.75 },
    { "code": "ER", "label": "情绪调节", "score": 25 }
  ],
  "conflicts": [
    { "id": "MN_HIGH_ER_LOW", "evidence": ["MN", "ER"] }
  ],
  "needs": ["被尊重的记忆", "关系意义被承认"],
  "riskPatterns": ["过度依赖过去判断现在", "表达偏慢"],
  "adviceTags": ["把感受转为请求", "区分当下与旧记忆"],
  "responseQuality": { "flag": "normal", "notes": [] }
}
```

AI 输出 JSON 草案：

```json
{
  "oneLine": "你会把关系里的记忆保存得很深，但也需要学习把当下和过去分开。",
  "keyTraits": ["重视关系意义", "容易被细节牵动", "表达启动较慢"],
  "neededRelationship": "你需要对方尊重你对共同经历的重视，也愿意和你一起把感受说清楚。",
  "innerConflict": "你很在意关系留下的痕迹，但低表达和低情绪调节可能让你把很多重量独自放大。",
  "misunderstoodByOthers": "别人可能以为你只是念旧，其实你是在确认这段关系是否真的被珍惜。",
  "strengths": ["记得重要细节", "愿意承认关系意义"],
  "repeatPatterns": ["用过去经验预判当下", "等对方自行理解"],
  "advice": ["先说一个具体请求", "把旧记忆和当前事件分开记录", "在关系中约定复盘方式"],
  "safetyDisclaimer": "以上用于自我理解，不构成心理诊断。"
}
```

校验方式：

- 使用 JSON schema 校验必填字段、字符串长度、枚举值。
- 输出不得包含诊断类词汇黑名单。
- 输出必须引用输入中的 persona 和 construct facts，不得生成新分数。
- 前端只接受结构化 JSON，不直接渲染自由文本外壳。

Prompt 边界：

- 明确“不得改人格、不得改分数、不得诊断、不得推测创伤”。
- 要求所有判断必须能从输入事实映射。
- 要求建议具体、非命令式、非绝对化。

工程方案：

- 前端不暴露 API Key；通过后端 serverless/API proxy 调用。
- 超时 8-12 秒；最多重试 1 次。
- 失败时降级到固定模板。
- 缓存 key：`questionBankVersion + scoringVersion + personaId + constructScores hash`。
- 不上传姓名、手机号、微信、精确地址；默认不上传 60 道原始答案，只上传聚合事实。
- 单次报告控制在 900-1400 中文字；先用短报告模型，避免长上下文成本。

## 18. 新版结果页信息架构

| 模块 | 用户问题 | 数据来源 | 生成方式 | 默认 | 分享图 | 首屏 | 字数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 主人格 Hero | 我是谁 | persona + portrait | 固定 | 展开 | 是 | 是 | 20-40 |
| 一句话核心判断 | 这个结果说什么 | persona + top constructs | AI/规则 | 展开 | 是 | 是 | 30-50 |
| 三个关键关系特征 | 我最明显的关系特点 | top constructs + persona tags | AI/规则 | 展开 | 是 | 是 | 每条 12-20 |
| 真正寻找的关系 | 我需要什么关系 | persona needs + top/bottom | AI | 展开 | 可选 | 否 | 80-120 |
| 内部矛盾 | 我卡在哪里 | conflict rules | AI | 展开 | 否 | 否 | 100-160 |
| 容易被误解 | 别人为什么不懂我 | conflict + low constructs | AI | 展开 | 否 | 否 | 80-120 |
| 关系优势 | 我能带来什么 | strengths | AI/规则 | 展开 | 可选 | 否 | 60-100 |
| 重复模式 | 我容易重复什么 | riskPatterns | AI | 展开 | 否 | 否 | 80-140 |
| 三条建议 | 我能做什么 | adviceTags | AI/规则 | 展开 | 否 | 否 | 每条 30-50 |
| 15 维概览 | 分数依据是什么 | constructScores | 固定图表 | 展开 | 否 | 否 | 短标签 |
| 完整维度详情 | 需要更多解释 | constructScores | 固定/AI 混合 | 折叠 | 否 | 否 | 每维 30-60 |
| 非诊断声明 | 结果边界 | 固定 | 固定 | 展开 | 否 | 否 | 30-60 |
| 保存/截图/分享 | 如何带走结果 | 当前 DOM/result | 固定 | 展开 | 是 | 首屏后 | 按钮 |
| 反馈入口 | 结果准不准 | 用户输入 | 固定 | 折叠 | 否 | 否 | 简短 |

## 19. P0/P1/P2 问题表

| 优先级 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| P1 | 同人格不同答案主体文案完全固定 | 08a/08b 都是候鸟型但 top/bottom 差异巨大 | 建结果事实层和个性化表达层 |
| P1 | 结果页缺少内部冲突解释 | 高 AU 低 SC、高 MN 低 ER 未进入正文 | 增加 conflict rules |
| P1 | 近分/低置信不展示 | 近分不同人格只输出确定人格 | 输出 confidence/leading gap |
| P1 | 异常输入无质量标记 | 全选 A 正常输出月光型 | 增加 responseQuality |
| P1 | 无 V2 分享/保存入口 | 结果页按钮只有“重新测试” | 重建 V2 分享卡 |
| P1 | 题库缺少显式 type 元数据 | 60 题均无 type 字段 | 补元数据，不改分值 |
| P1 | 首页仍有 Alpha 内部感 | 顶部/首屏暴露 Alpha 1 | 前台隐藏内部版本 |
| P2 | 做题页问卷感强 | 小屏截图显示场景弱 | 增加轻量场景/章节表达 |
| P2 | 过渡页文案偏算法说明 | “构念得分/主人格”直出 | 改成用户语言 |
| P2 | 结果页刷新回到过渡页 | Playwright afterReloadView=transition | 可自动重算恢复结果 |
| P2 | 桌面人格图偏小 | 1440 截图中图像不是视觉中心 | 调整 Hero 布局 |

P0：未发现。

## 20. 推荐开发顺序

1. 固化结果事实层：resultId、版本、15 维、top/bottom、gap、conflicts、quality flags。
2. 重构结果页信息架构，不接 AI 也先用规则模板跑通。
3. 加入异常输入和低置信提示。
4. 重建 V2 分享卡与保存入口。
5. 首页和过渡页去 Alpha 化、产品化。
6. 做题页视觉和节奏精修。
7. 接入受控 AI，只负责表达，不负责评分。

## 21. 预计涉及的文件

- `js/v2/result-engine.js`
- `js/v2/scoring-engine.js`
- `js/v2/renderers/result.js`
- `js/v2/renderers/home.js`
- `js/v2/renderers/quiz.js`
- `js/v2/renderers/transition.js`
- `js/v2/storage.js`
- `js/v2/config.js`
- `data/v2/question-bank.v2.json`（仅补元数据时涉及）
- `assets/personas/*`
- `styles.css`

## 22. 风险和回滚建议

风险：

- 结果页重构容易无意改变评分含义。
- AI 接入容易越界成心理诊断或重判人格。
- 旧 `app.js` 分享逻辑直接迁移会引入旧 20 人格/旧结果结构。
- 补题库 metadata 时容易误动题干、选项和分值。

回滚建议：

- 评分层改动必须与 UI 改动分开提交。
- 题库 metadata 单独提交，并用 hash/校验脚本确认题干、选项、score 未变化。
- AI 层必须有固定模板降级，且可开关关闭。
- 分享卡从 V2 result facts 生成，不依赖旧 `app.js`。

## 23. 是否具备进入正式改造的条件

具备进入下一轮统一改造的条件，但不具备直接公开可信 Beta 的条件。

当前可保留的基础是：60 题流程、15 构念、15 人格、可复现评分、本地进度恢复和单人格最小结果页。下一轮应以“结果页大幅重构 + 数据事实层整理 + 受控 AI 方案落地前置”为主，不应先接 API 或继续堆功能。
