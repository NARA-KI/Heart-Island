# Heart Island V2 Trusted Beta RC1.1 Release Report

1. 当前分支：`release/heart-island-v2-trusted-beta-rc1.1`
2. 当前提交：以仓库 HEAD 为准（本报告随 RC1.1 提交入库，最终 hash 不在提交内容中自引用）
3. 工作区是否干净：是（RC1.1 提交后）
4. 修改文件：`js/v2/config.js`、`js/v2/feedback-config.js`、`js/v2/app.js`、`js/v2/renderers/result.js`、`styles.css`、`feedback-config.json`、`docs/v2-beta-feedback-form-template.md`、`tests/v2-feedback-config.test.mjs`、`tests/v2-result-core.test.mjs`、`tests/v2-result-core-browser.mjs`、`package.json`、`deploy/` 静态镜像、`reports/data/` 验收结果、`reports/audit-assets/v2-trusted-beta-result-core/` 截图
5. 反馈入口是否可用：是；合法配置 URL 时按钮可见并打开表单，未配置时隐藏
6. 五项必填反馈是否覆盖：是；外部表单模板覆盖 1-5 分准确度、最像自己的部分、最不像自己的部分、是否愿意保存或分享、补充意见
7. 匿名上下文是否携带：是；携带 `version`、`persona`、`promptVersion`、`anonymousResultId`、`aiSource`、`viewport`
8. 是否泄漏原始答案：否
9. 非法 URL 是否被拦截：是；`javascript:`、非法协议、含凭据 URL、来源不匹配 URL 均拒绝
10. 三视口是否通过：是；`375x667`、`390x844`、`1440x900` 均通过
11. JS 错误数量：0
12. 横向溢出数量：0
13. broken images 数量：0
14. 题库 hash 是否变化：否；`1b101a0a9a7e9b8e1e45ce22bf96dc88f2dd0781d71b931b2062a4c3cd1400e9`
15. candidate-a hash 是否变化：否；`f656ae63cf4f8eb1f398e92005996b347ea3348cda8894baa3b145a096c5ecd3`
16. 评分是否变化：否；`js/v2/scoring-engine.js` hash 为 `8ff69b1249c8164c2a74f84f41e7c4b18add17780f62d8ea0767388cdfe82166`
17. 人格命中是否变化：否；`tests/v2-result-core.test.mjs` 11 个 baseline 全部通过
18. Prompt 版本是否变化：否；仍为 `v2-controlled-ai-report-prompt-2`
19. deploy 是否重新生成：是；本地 deploy 静态服务结果页可进入反馈表单
20. API Key 泄漏数量：0
21. P0 数量：0
22. P1 数量：0
23. 是否建议进入 10—30 人封闭内测：是
24. 是否建议公开测试：否
25. 是否已推送远端：否
