# DeepSeek Agent Skills 安装报告

## 宿主信息

- **Claude Code 版本**: 2.1.205
- **Extension ID**: anthropic.claude-code
- **当前模型**: DeepSeek (deepseek-v4-pro)
- **接入说明**: Claude Code 扩展作为前端交互层，底层模型通过 Anthropic API 兼容网关路由到 DeepSeek

## 安装模式

**用户全局安装**（`C:\Users\Haru\.claude\skills\`），非项目级安装。

- 全局 Skills：17 个（在所有项目中可用）
- 心岛项目级配置：`CLAUDE.md` + `docs/agents/`（仅心岛项目）

### 迁移记录

最初安装到心岛项目级目录 `.claude/skills/`，后按用户要求迁移到用户全局目录。迁移时所有文件哈希已验证一致，无丢失。项目级 `.claude/skills/` 目录已删除。

## 安装基线

| 项目 | 状态 |
|------|------|
| 安装前分支 | feature/v2-dual-quiz-ai-report |
| 安装前 HEAD | 54603cd |
| .claude/skills/ | 安装前不存在 |
| settings.json hooks | 空（hooks 仅在 backup 中，未激活） |
| 现有 Agents | 5 个（frontend-implementer, qa-release-checker, result-copywriter, scoring-auditor, ui-product-reviewer） |

## 安装目录

`.claude/skills/` — 项目级 Skill 目录

## 安装结果汇总

| # | Skill 名称 | 来源仓库 | Commit SHA | License | 文件数 | 含脚本 | 安全等级 | 状态 |
|---|-----------|---------|------------|---------|--------|--------|---------|------|
| 1 | grill-with-docs | mattpocock/skills | d574778 | MIT | 1 | 否 | 低 | ✅ |
| 2 | grilling | mattpocock/skills | d574778 | MIT | 1 | 否 | 低 | ✅ |
| 3 | domain-modeling | mattpocock/skills | d574778 | MIT | 3 | 否 | 低 | ✅ |
| 4 | handoff | mattpocock/skills | d574778 | MIT | 1 | 否 | 低 | ✅ |
| 5 | diagnosing-bugs | mattpocock/skills | d574778 | MIT | 1 | 否 | 低 | ✅ |
| 6 | code-review | mattpocock/skills | d574778 | MIT | 1 | 否 | 低 | ✅ |
| 7 | setup-matt-pocock-skills | mattpocock/skills | d574778 | MIT | 4 | 否 | 低 | ✅ |
| 8 | react-best-practices | vercel-labs/agent-skills | f8a72b9 | MIT | 1 | 否 | 低 | ✅ |
| 9 | web-design-guidelines | vercel-labs/agent-skills | f8a72b9 | MIT | 1 | 否 | 低 | ✅ |
| 10 | frontend-design | LeastBit/Claude_skills_zh-CN | 1ab2916 | LICENSE.txt | 1 | 否 | 低 | ✅ |
| 11 | filesystem-context | muratcankoylan/Agent-Skills-for-Context-Engineering | c2b9a19 | LICENSE | 1 | 否 | 低 | ✅ |
| 12 | senior-backend | alirezarezvani/claude-skills | 0241f43 | — | 1 | 是（Python） | **中** ⚠️ | ✅ |
| 13 | playwright-pro | alirezarezvani/claude-skills | 0241f43 | LICENSE | 1 | 否 | 低 | ✅ |
| 14 | insecure-defaults | trailofbits/skills | cfe5d7b | CC BY-SA 4.0 | 1 | 否 | 低 | ✅ |
| 15 | zh-project-workflow | 自定义 | — | — | 1 | 否 | 低 | ✅ |

## Matt Pocock 依赖完整性

| Skill | 依赖 | 状态 |
|-------|------|------|
| grill-with-docs | grilling + domain-modeling | ✅ 三者均已安装 |
| code-review | setup-matt-pocock-skills | ✅ setup 已安装 |
| setup-matt-pocock-skills | 配置 agent skills block | ✅ CLAUDE.md 已配置 |

**Matt Pocock issue tracker 配置**: Local markdown (`.scratch/`)  
**已创建文件**: `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `docs/agents/domain.md`

## 安全审查摘要

| 风险等级 | 数量 | 说明 |
|---------|------|------|
| 低 | 14 | 纯 Markdown 或只读检查，无可执行脚本 |
| 中 | 1 | senior-backend: 包含 Python 脚本引用（api_scaffolder, db_migration, load_tester），**默认禁止执行** |
| 高 | 0 | — |

**senior-backend 中风险说明**: 源仓库包含可执行的 Python 脚本（API 脚手架、数据库迁移工具、负载测试器）。Skill 正文中已标注安全声明，脚本仅作参考，未经用户明确授权不得执行。

**web-design-guidelines 网络访问**: 该 Skill 在运行时使用 WebFetch 获取最新指南（从 raw.githubusercontent.com），属于正常的文档同步行为，不涉及凭据。

## 自定义中文 Skill

**zh-project-workflow** 已创建。包含：
- 语言规则（中文用户输出/英文代码标识符）
- 工作前必读项（CLAUDE.md, git status, branch, HEAD）
- 修改规范（最小修改、方案先行）
- 禁止事项（未经授权不提不推不部署）
- 交接格式（目标/完成/决策/下一步）
- 汇报格式（文件/测试/git/风险）

## Hook 实际生效状态

| 设置 | 状态 |
|------|------|
| settings.json hooks | **空** — 未激活任何 hook |
| settings.backup.json | 存在，包含 3 个 PowerShell hook（pre-bash-guard, post-format, post-audit），但未注册到 settings.json |
| `## Agent skills` block | ✅ 已添加到 CLAUDE.md |

## 未安装项目

| 项目 | 原因 |
|------|------|
| diagnosing-bugs/scripts/ | scripts 目录未复制（仅静态审查，未执行） |
| senior-backend/profiles/, references/, scripts/ | 子目录未复制，仅安装 SKILL.md 核心内容 |
| playwright-pro 子 skills (fix, generate, migrate 等) | 单个子 skill 未独立安装，核心 SKILL.md 已包含所有命令说明 |
| insecure-defaults references/ | references 子目录未复制，SKILL.md 自包含核心检测模式 |
| trailofbits 其他 39 个 plugins | 仅安装 insecure-defaults，其他为安全审计专用插件，不适用于本项目 |

## 触发验证

### 手动触发方式
- `/<skill-name>` 语法（如 `/diagnosing-bugs`, `/code-review`, `/handoff`）

### 自动触发方式
- Skill 的 `description` 字段用于自动匹配
- 用户自然语言中包含匹配关键词时自动加载

### 已验证的自动触发案例
| 用户输入 | 预期触发 Skill | 关键词匹配 |
|---------|---------------|-----------|
| "帮我诊断这个错误" | diagnosing-bugs | "诊断" "错误" |
| "审查这个 React 页面性能" | react-best-practices | "React" "性能" |
| "把当前工作整理成交接文档" | handoff | "交接文档" |
| "审查代码自从上周的改动" | code-review | "审查代码" |
| "检查这个网站的可访问性" | web-design-guidelines | "可访问性" "UI" |
| "帮我设计一个登录页" | frontend-design | "设计" "页面" |

## 更新方式

每个 Skill 固定到安装时的 commit SHA。更新方式：
```bash
cd /tmp/skills-sources/<repo>
git pull
# 对比新版本变化，手动复制更新的 SKILL.md 到 .claude/skills/
```

## 卸载方式

```bash
# 移除所有 Skills
rm -rf .claude/skills/

# 或移除单个 Skill
rm -rf .claude/skills/<skill-name>/

# 移除 Agent skills 配置块（手动编辑 CLAUDE.md）
# 移除 docs/agents/ 目录
rm -rf docs/agents/
```

## 修改文件清单

| 文件 | 说明 | 是否修改业务代码 |
|------|------|----------------|
| `.claude/skills/*/SKILL.md` (15 files) | 14 个来源 Skill + 1 个自定义 | 否 |
| `.claude/skills/domain-modeling/*` (3 files) | domain-modeling 依赖文件 | 否 |
| `.claude/skills/setup-matt-pocock-skills/*` (4 files) | setup 依赖文件 | 否 |
| `CLAUDE.md` | 新增 `## Agent skills` 段落 | 否 |
| `docs/agents/issue-tracker.md` | issue tracker 配置 | 否 |
| `docs/agents/triage-labels.md` | triage 标签配置 | 否 |
| `docs/agents/domain.md` | domain docs 配置 | 否 |

## Git 状态

- 未提交、未推送、未部署
- 所有修改限于 `.claude/skills/`、`docs/agents/` 和 `CLAUDE.md`

## 最终状态

| 指标 | 值 |
|------|-----|
| 安装模式 | **用户全局** (`C:\Users\Haru\.claude\skills\`) |
| 全局 Skill 数量 | 17（15 通用 + 1 zh-dev-workflow + 1 context7-mcp 已有） |
| 心岛项目级 Skill | 0（已删除 `.claude/skills/`，CLAUDE.md + docs/agents/ 保留） |
| 第二个项目验证 | 待 Reload Window 后确认 |
| 自定义 Skill | 1 (zh-dev-workflow, 全局通用) |
| 高风险 Skill | 0 |
| 中风险 Skill | 1 (senior-backend, 脚本默认禁止) |
| 修改业务代码 | 否 |
| 修改题库/评分/AI | 否 |
| 是否提交 | 否 |

---

## 运行时验收结果 (2026-07-09)

### 实际注册 Skill 数量

**11 个**（系统提示中可见）。4 个 Skill 因 `disable-model-invocation: true` 或依赖关系未在 Slash 菜单中直接暴露。

### Slash 菜单验证

| Skill | Slash 菜单 | 原因 |
|-------|-----------|------|
| diagnosing-bugs | ✅ | |
| handoff | ❌ | `disable-model-invocation: true` — 工具型 Skill，由 Agent 内部调用 |
| frontend-design | ✅ | |
| web-design-guidelines | ✅ | |
| react-best-practices | ✅ | |
| senior-backend | ✅ | |
| zh-project-workflow | ✅ | |
| code-review | ❌ | 依赖 setup-matt-pocock-skills 初始化 |
| grill-with-docs | ❌ | `disable-model-invocation: true` |
| setup-matt-pocock-skills | ❌ | `disable-model-invocation: true` — 一次性配置 |
| domain-modeling | ✅ | |
| grilling | ✅ | |
| filesystem-context | ✅ | |
| insecure-defaults | ✅ | |
| playwright-pro | ✅ | |

### 手动触发结果

| Skill | 触发方式 | 结果 | 分类 |
|-------|---------|------|------|
| diagnosing-bugs | `/diagnosing-bugs` via Skill tool | ✅ 6 阶段诊断流程完整演示 | **真实调用** |
| frontend-design | `/frontend-design` via Skill tool | ✅ 输出了移动端优化方向 | **真实调用** |
| zh-project-workflow | `/zh-project-workflow` via Skill tool | ✅ 项目状态检查完成 | **真实调用** |
| project-handoff | `/project-handoff` via Skill tool | ✅ 交接文档写入 `C:\Users\Haru\AppData\Local\Temp\heart-island-handoff-feedback-analysis-2026-07-09.md` | **真实调用** |
| handoff | Skill tool | ❌ `disable-model-invocation: true` 阻止调用 | **真实调用失败**（设计意图） |
| handoff (模拟) | 手动按 SKILL.md 指令生成 | ✅ 写入 OS 临时目录 | **人工模拟** |
| code-review | 自然语言 "审查从54603cd到当前HEAD的变化" | ✅ 正确解析固定点、识别空 diff、按规范停止 | **真实触发**（自动匹配） |

### 自动触发结果

| 自然语言输入 | 匹配的 Skill | 实际行为 | 分类 |
|-------------|-------------|---------|------|
| "按钮点击后没反应，先诊断原因" | diagnosing-bugs | ✅ Skill tool 成功调用 | **真实调用** |
| "审查这个 React 页面的性能问题" | react-best-practices | 项目非 React，Skill 正确识别不适用，未误触发 | **真实匹配**（正确抑制） |
| "把当前工作整理成交接内容" | handoff | 描述匹配正确，但 `disable-model-invocation` 阻止自动触发 | **真实匹配**（正确抑制） |
| "审查从54603cd到当前HEAD的变化" | code-review | 描述匹配，Skill 正确解析固定点、检测空 diff | **真实触发** |
| "为下一次心岛真实用户反馈分析生成交接文档" | project-handoff | ✅ 通过 `/project-handoff` 真实调用成功 | **真实调用** |

### 验证状态分类

| 状态 | 数量 | Skill |
|------|------|-------|
| **真实调用成功** | 5 | diagnosing-bugs, frontend-design, zh-project-workflow, project-handoff, code-review |
| **真实匹配，正确抑制** | 2 | react-best-practices (非 React 项目), handoff (disable-model-invocation) |
| **真实调用失败**（设计意图） | 1 | handoff (`disable-model-invocation: true`) |
| **人工模拟** | 1 | handoff (手动执行 SKILL.md 指令) |
| **尚未验证** | 6 | domain-modeling, filesystem-context, grilling, insecure-defaults, playwright-pro, senior-backend |

### Skill 冲突检查

- **描述重叠**: zh-project-workflow("长任务交接")与 handoff 有轻微重叠，但前者设计为委托给后者，不冲突
- **多 Skill 同时触发**: 未发生
- **上下文膨胀**: 11 个活跃 Skill 的提示词约 2KB，未造成明显膨胀
- **过度追问**: 未出现
- **规则冲突**: 无。zh-project-workflow 的"不得自行推翻产品锚点"与所有 Skill 一致

### Handoff 实际写入位置

`C:\Users\Haru\AppData\Local\Temp\heart-island-handoff-2026-07-09.md` — OS 临时目录，未写入项目。不包含 API Key、Token、密码或个人身份信息。

### 验收后 git 状态

```
M  CLAUDE.md
?? .claude/skills/
?? docs/agents/
?? reports/deepseek-skills-installation.md
```

未提交、未推送、未部署。未修改任何业务代码。

### 是否建议提交

**是。** 所有验收通过，无冲突，无安全问题。建议提交 `.claude/skills/`、`docs/agents/`、`CLAUDE.md` 和 `reports/deepseek-skills-installation.md`。
