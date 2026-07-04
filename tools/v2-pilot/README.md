# 心岛 v2.0 内部验证工具

这是与 Beta 0.9.9.7 正式产品隔离的 v2 真实用户小样本内测工具。

## 运行方式

在项目根目录启动静态服务器：

```bash
python -m http.server 4174 --bind 127.0.0.1
```

然后访问：

```text
http://127.0.0.1:4174/tools/v2-pilot/
```

不要直接用 `file://` 打开页面，因为浏览器会阻止读取 `drafts/v2` 下的 JSON 文件。

## 数据来源

页面只读取以下隔离草案数据：

- `drafts/v2/question-bank.v2.draft.json`
- `drafts/v2/persona-target-vectors.v2.baseline.json`
- `drafts/v2/persona-target-vectors.v2.candidate-a.json`

页面不会读取或修改正式 `app.js`、正式题库、生产评分逻辑、`deploy/` 或 `release/`。

## 内测流程

1. 用户阅读内部验证说明。
2. 用户完成 60 道题，每次只显示 1 题。
3. 页面用同一份回答同时计算 baseline 与 candidate-A。
4. 如果两套 Top1 相同，展示同一个结果并收集贴合度。
5. 如果两套 Top1 不同，展示匿名“结果 A / 结果 B”，不告诉用户哪个来自 baseline 或 candidate-A。
6. 用户完成反馈后，手动导出匿名 JSON。

## 隐私边界

本工具默认只保存在浏览器本地，不自动上传任何数据。

不得采集：

- 姓名
- 手机号
- 身份证
- 精确位置
- 详细住址
- 聊天记录
- 伴侣个人信息

导出的 JSON 中只包含匿名 `pilotId`、答题序列、评分结果和用户体验反馈。

## 测试 fixture

开发验收可使用 `fixture` query 参数预填已有模拟路径：

```text
http://127.0.0.1:4174/tools/v2-pilot/?fixture=ideal-lighthouse-01
```

该入口只用于本地验收，不建议发给真实内测用户。
