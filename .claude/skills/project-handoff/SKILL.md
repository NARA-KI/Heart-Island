---
name: project-handoff
description: 仅在用户明确提出交接、上下文压缩或下一会话继续工作时使用。生成当前会话的交接文档，保存到Windows系统临时目录，包含目标、完成事项、决策、分支、HEAD、风险、下一步和建议Skills。
---

# Project Handoff

本 Skill 用于生成项目交接文档，仅在用户明确提出"交接"、"handoff"、"下一会话继续"、"上下文压缩"等需求时触发。

## 安全约束

1. 保存到 Windows 系统临时目录（`C:\Users\<user>\AppData\Local\Temp\`）。
2. **绝不**写入项目目录。
3. **绝不**复制已有报告正文——只引用文件路径和 commit SHA。
4. API Key、Token、Cookie、环境变量和个人信息**必须脱敏**或省略。
5. 不修改业务代码、不 commit、不 push、不 deploy。

## 文档格式

```markdown
# <项目名称> 交接文档

生成时间、下一会话目标

## 当前分支与 commit
## 当前目标
## 已完成事项
## 已确认决策
## 剩余风险
## 下一步最小动作
## 建议加载的 Skills
## 关键参考文件
```

每一项引用已有文件时，只用路径（如 `reports/v2-real-user-test-plan.md`），不复制正文。

## 清理

生成完毕后，确认文件确实在系统临时目录中，不在项目根目录或任何子目录中。
