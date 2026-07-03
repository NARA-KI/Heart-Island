# Heart Island Claude Code 工作台配置报告

> 日期：2026-06-18  
> 版本：Beta 0.9.9.3  
> 目的：为心岛计划建立完整的 AI 辅助开发工作台，覆盖项目规则、Subagent 分工、Hooks 自动化、VS Code 扩展、MCP 接入。

---

## 1. 项目结构速览

```
Heart Island(VS Code))/
├── index.html              # 主页面（首页→做题→结尾→结果）
├── styles.css              # 全局样式（~1800 行）
├── app.js                  # 交互逻辑 + 渲染 + 数据 (~2500 行)
├── package.json            # npm 脚本 + 依赖
├── CLAUDE.md               # 项目规则（AI 行为约束）
├── .claude/                # Claude Code 工作台配置
│   ├── settings.json       # Hook 绑定
│   ├── hooks/
│   │   ├── pre-bash-guard.ps1    # 危险命令拦截
│   │   ├── post-format.ps1       # Prettier 自动格式化
│   │   └── post-audit.ps1        # 自动运行审计脚本
│   └── agents/
│       ├── ui-product-reviewer.md
│       ├── frontend-implementer.md
│       ├── scoring-auditor.md
│       ├── qa-release-checker.md
│       └── result-copywriter.md
├── core/
│   └── scoring.mjs         # 评分算法（禁止随意修改）
├── scripts/
│   ├── probability-audit.mjs      # 人格分布审计
│   ├── option-alignment-audit.mjs # 选项一致性审计
│   ├── consistency-test.mjs       # 一致性测试
│   └── convert-assets.mjs         # WebP 素材转换
├── assets/                 # 40 张 WebP 素材
├── deploy/                 # 部署静态文件
└── reports/                # 各版本报告存档
```

---

## 2. CLAUDE.md — 项目规则文件 ✅

**路径**: `CLAUDE.md`  
**状态**: 已存在，内容完整

### 内容覆盖

| 章节 | 内容 |
|------|------|
| 项目定位 | 恋爱人格测试 MVP，AI PM 作品集项目 |
| 当前开发重点 | 做题 UI、场景图优化、结果页拟人图、移动端适配 |
| 禁止事项 | 不删素材、不重命名 assets、不重写 app.js、不破坏 12 人格映射 |
| 修改前必须 | 阅读项目结构 → 说明计划 → 标出修改文件 → 小步修改 |
| 修改后必须 | 检查 1440px / 390px / 做题流程 / 结果页 / 运行测试 |
| 视觉风格 | 高级、治愈、海岛、轻幻想、柔和渐变、半透明卡片 |
| 输出习惯 | 产品经理 + 前端工程师视角，先讲问题再给方案再执行 |

---

## 3. Subagents — 5 个专职代理 ✅

所有代理位于 `.claude/agents/`，可通过 `/agents <name>` 调用。

| 代理名称 | 职责 | 工具权限 | 模型 |
|----------|------|----------|------|
| `ui-product-reviewer` | UI/UX 审查（只提问题不改代码） | Read, Glob, Grep, WebFetch | Sonnet |
| `frontend-implementer` | 前端执行（小步修改 HTML/CSS/JS） | Read, Write, Edit, Glob, Grep, Bash | Sonnet |
| `scoring-auditor` | 评分机制审查（先诊断再建议） | Read, Glob, Grep, Bash | Sonnet |
| `qa-release-checker` | 测试验收（做题/结果/移动端/资源/错误） | Read, Glob, Grep, Bash | Sonnet |
| `result-copywriter` | 结果页文案设计（不伪装临床诊断） | Read, Glob, Grep | Sonnet |

### 使用方式

```
/agents ui-product-reviewer   → 让 UI 审查员检查当前页面
/agents qa-release-checker    → 让测试员验收当前版本
/agents result-copywriter     → 让文案设计师审视结果页表达
/agents scoring-auditor       → 让评分审查员分析分布健康度
/agents frontend-implementer  → 让前端工程师执行 UI 修改
```

---

## 4. Hooks — 3 个自动化脚本 ✅

所有 hooks 位于 `.claude/hooks/`，由 `.claude/settings.json` 绑定。

### 4.1 Hook 总览

| Hook | 类型 | 匹配条件 | 作用 |
|------|------|----------|------|
| `pre-bash-guard.ps1` | PreToolUse | Bash 工具 | 拦截危险命令 |
| `post-format.ps1` | PostToolUse | Edit/Write | Prettier 自动格式化 |
| `post-audit.ps1` | PostToolUse | Edit/Write | 自动运行审计脚本 |

### 4.2 危险命令拦截 — 详细规则

**拦截模式**（满足任一即阻止）：
- `rm -rf` / `rm -r` / `rm --recursive --force` — Unix 递归删除
- `del /s` / `del /S` — Windows 递归删除
- `Remove-Item -Recurse -Force` — PowerShell 递归删除
- `git reset --hard` — Git 硬重置
- `git clean -f` — Git 清理未跟踪文件

**保护路径**（包含即阻止）：
- `assets/` `public/` `deploy/`
- `core/` `scripts/`

**功能测试结果**：

| 测试输入 | 结果 |
|----------|------|
| `rm -rf assets` | ✅ 拦截，exit 1 |
| `npm run test` | ✅ 放行，exit 0 |
| `git reset --hard origin/main` | ✅ 拦截，exit 1 |

### 4.3 Prettier 自动格式化 — 详细规则

- 仅对 `.html` `.css` `.js` `.mjs` 文件触发
- 先检查 `npx prettier --version` 是否可用
- 不可用时静默跳过（exit 0），不阻塞
- 格式化失败也不阻塞（exit 0）

> 📝 项目当前未安装 prettier，hook 会静默跳过。如需启用，运行 `npm install -D prettier`。

### 4.4 自动审计 — 详细规则

- **触发条件**: 修改 `app.js` / `styles.css` / `index.html` / `core/*.mjs` / `scripts/*.mjs`
- **冷却机制**: 120 秒内不重复执行
- **运行顺序**:
  1. `npm run audit:probability` → 人格分布审计
  2. `npm run audit:options` → 选项一致性审计
  3. `npm run build` → 构建（当前不存在，自动跳过）
- 脚本不存在时输出 `⏭ SKIP`，不报错

**功能测试结果**：

| 脚本 | 结果 |
|------|------|
| audit:probability | ✅ 通过 |
| audit:options | ✅ 通过 |
| build | ⏭ 跳过（不存在） |

---

## 5. VS Code 扩展推荐

### 🔴 必须安装

| 扩展 | Extension ID | 用途 |
|------|-------------|------|
| **Prettier** | `esbenp.prettier-vscode` | 代码格式化，与 Hook 配合 |
| **Live Server** | `ritwickdey.liveserver` | 本地 HTTP 服务，解决 WebP 加载 |
| **GitLens** | `eamodio.gitlens` | Git 增强（项目接入 Git 后生效） |

### 🟡 强烈推荐

| 扩展 | Extension ID | 用途 |
|------|-------------|------|
| **CSS Peek** | `pranaygp.vscode-css-peek` | Ctrl+Click 跳转到 CSS 定义 |
| **Image preview** | `kisstkondoros.vscode-gutter-preview` | 侧边栏预览图片 |
| **Todo Tree** | `gruntfuggly.todo-tree` | 高亮 TODO/FIXME 注释 |

### 🟢 可选安装

| 扩展 | Extension ID | 用途 |
|------|-------------|------|
| **Color Highlight** | `naumovs.color-highlight` | CSS 颜色值可视化 |
| **Error Lens** | `usernamehw.errorlens` | 行内实时错误显示 |
| **HTML CSS Support** | `ecmel.vscode-html-css` | HTML 中 class 自动补全 |

### 一键安装命令

```bash
# 必须
code --install-extension esbenp.prettier-vscode
code --install-extension ritwickdey.liveserver
code --install-extension eamodio.gitlens

# 强烈推荐
code --install-extension pranaygp.vscode-css-peek
code --install-extension kisstkondoros.vscode-gutter-preview
code --install-extension gruntfuggly.todo-tree

# 可选
code --install-extension naumovs.color-highlight
code --install-extension usernamehw.errorlens
code --install-extension ecmel.vscode-html-css
```

---

## 6. MCP 配置指引

### 6.1 当前状态

```
全局 ~/.claude/.mcp.json → ❌ 不存在
项目级 .mcp.json         → ❌ 不存在
Marketplace 插件          → ✅ 已预置（未激活）
```

### 6.2 安装方式

**方式 A — 命令行快速安装**（推荐）：

在 Claude Code 中依次输入：
```
/install-mcp playwright
/install-mcp context7
```

**方式 B — 手动创建配置文件**：

创建 `c:\Users\Haru\.claude\.mcp.json`：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### 6.3 四个 MCP 的定位

| MCP | 优先级 | 价值 | 前提条件 |
|-----|--------|------|----------|
| **Playwright** | 🔴 P0 | 自动截图验证 1440px/390px 布局 | 无 |
| **Context7** | 🔴 P0 | 查询最新 MDN/CSS API 文档 | 无 |
| **Figma** | 🟡 P1 | 读取设计稿尺寸/颜色/间距 | Figma 账号 + Token |
| **GitHub** | 🟡 P1 | 对话中创建 PR/管理 Issues | `git init` + GitHub Token |

### 6.4 安装后验证

```
/mcp                    # 列出所有已连接的 MCP 服务器
/mcp playwright         # 查看 Playwright MCP 状态
/mcp context7           # 查看 Context7 MCP 状态
```

---

## 7. Settings.json 汇总

### 7.1 项目级 `.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/pre-bash-guard.ps1"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/post-format.ps1"
      },
      {
        "matcher": "Edit|Write",
        "command": "powershell -ExecutionPolicy Bypass -File .claude/hooks/post-audit.ps1"
      }
    ]
  }
}
```

### 7.2 全局 `~/.claude/settings.json`（已存在）

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-pro",
    "ANTHROPIC_MODEL": "deepseek-v4-pro"
  },
  "includeCoAuthoredBy": false,
  "effortLevel": "xhigh"
}
```

---

## 8. 开发工作流

```
用户提出需求
      │
      ▼
Claude 阅读 CLAUDE.md 规则
      │
      ▼
判断改动范围：
  ├── UI 调整 → /agents ui-product-reviewer (审查) → /agents frontend-implementer (执行)
  ├── 文案优化 → /agents result-copywriter
  ├── 评分调整 → /agents scoring-auditor (先诊断) → 手动修改
  └── 发布验收 → /agents qa-release-checker
      │
      ▼
执行修改：
  ├── PreToolUse Hook → 危险命令拦截
  ├── Edit/Write → 文件写入
  └── PostToolUse Hook → Prettier 格式化 → 审计脚本自动运行
      │
      ▼
验收：
  ├── npm run test:consistency
  ├── npm run audit:probability
  ├── npm run audit:options
  └── /agents qa-release-checker
```

---

## 9. 下一步建议

| 优先级 | 行动 | 预计耗时 |
|--------|------|----------|
| 🔴 P0 | 安装 Live Server + Prettier VS Code 扩展 | 2 分钟 |
| 🔴 P0 | `/install-mcp playwright` + `/install-mcp context7` | 3 分钟 |
| 🟡 P1 | `npm install -D prettier` 启用自动格式化 | 1 分钟 |
| 🟡 P1 | `git init` + GitHub MCP | 10 分钟 |
| 🟢 P2 | 安装 Figma MCP（如果你有设计稿） | 5 分钟 |

---

## 10. 附录：工作台文件清单

```
Heart Island(VS Code))/
├── CLAUDE.md                                          ✅ 项目规则
├── .claude/
│   ├── settings.json                                  ✅ Hook 绑定
│   ├── hooks/
│   │   ├── pre-bash-guard.ps1                         ✅ 危险命令拦截
│   │   ├── post-format.ps1                            ✅ Prettier 格式化
│   │   └── post-audit.ps1                             ✅ 自动审计
│   └── agents/
│       ├── ui-product-reviewer.md                     ✅ UI 审查代理
│       ├── frontend-implementer.md                    ✅ 前端执行代理
│       ├── scoring-auditor.md                         ✅ 评分审查代理
│       ├── qa-release-checker.md                      ✅ 测试验收代理
│       └── result-copywriter.md                       ✅ 文案设计代理
├── reports/
│   └── heart-island-claude-code-workbench-report.md   📝 本报告
└── package.json                                       ✅ 3 个审计/测试脚本
```

---

> **报告完成**。如需修改任何配置或有疑问，请直接说明。
