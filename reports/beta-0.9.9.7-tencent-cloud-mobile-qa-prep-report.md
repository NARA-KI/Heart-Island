# 心岛计划 Beta 0.9.9.7 腾讯云移动端 QA 准备报告

## 1. 总结结论

当前 Beta 0.9.9.7 可以进入腾讯云真实手机测试准备阶段。

- 当前开发与测试权威源为项目根目录。
- `deploy/` 是已同步的部署镜像，建议作为腾讯云上传目录。
- `release/` 仅作为历史快照，不建议用于本次上传。
- `deploy/` 包含当前运行必需入口文件和 `assets/` 目录。
- 使用 `deploy/` 启动本地静态服务后，`npm run ui:inspect` 通过。
- 网络/控制台检查未发现 JS 报错、资源 404、请求失败。
- 分享卡生成通过。
- 过渡页验证只使用 `silver-lake.webp`，未出现 reveal 二次切图。
- 结果页拟人图仍为放大后的主视觉，390px 下检测宽度为 258px。

本轮未修改运行代码，只新增部署检查清单、真机验收模板和本报告。

## 2. 当前版本确认

当前版本：

- 页面展示：`Beta 0.9.9.7`
- package version：`0.9.9.7-beta`
- 根目录 `index.html` / `app.js` / `styles.css` / `package.json` 已是 0.9.9.7。
- `deploy/index.html` / `deploy/app.js` / `deploy/styles.css` / `deploy/package.json` 已同步 0.9.9.7。

## 3. 部署源确认

| 路径 | 定位 | 本轮结论 |
| --- | --- | --- |
| 项目根目录 | 开发与测试权威源 | 保持为当前源头 |
| `deploy/` | 腾讯云上传部署镜像 | 建议上传整个 `deploy/` |
| `release/` | 历史快照 | 不用于本次上传 |
| `reports/` | 项目记录 | 不作为运行必需文件上传 |

本次腾讯云上传建议：

`deploy/`

不要手动只挑 `index.html`、`app.js`、`styles.css`，否则容易漏掉 `assets/`。

## 4. deploy 文件完整性检查

`deploy/` 当前包含：

| 文件 / 目录 | 是否存在 | 说明 |
| --- | --- | --- |
| `deploy/index.html` | 是 | 页面入口 |
| `deploy/app.js` | 是 | 主逻辑 |
| `deploy/styles.css` | 是 | 样式 |
| `deploy/package.json` | 是 | 版本记录 |
| `deploy/assets/` | 是 | 运行资源目录 |
| `deploy/assets/personas/` | 是 | 人格 SVG / WebP |
| `deploy/assets/personas/thumbs/` | 是 | 人格缩略图 |
| `deploy/assets/scenes/` | 是 | 场景图 |
| `deploy/assets/result/` | 是 | 结果背景、过渡图 |

资产检查补充：

- 根目录 `assets/` 文件数：90。
- `deploy/assets/` 文件数：63。
- 差异主要来自 `assets/source/` 原始源图和部分未使用 prop SVG。
- 当前页面实际加载的人格图、场景图、结果过渡图、分享卡用图在 `deploy` 静态服务中验证通过。
- 网络检查未发现 404 或请求失败。

## 5. 本地命令运行结果

| 命令 | 结果 | 记录 |
| --- | --- | --- |
| `npm run check` | 通过 | consistency、production probability audit、options audit 均通过。 |
| `npm test` | 通过 | 当前等同于 `npm run check`。 |
| `npm run ui:inspect` | 通过 | 使用 `deploy/` 启动本地静态服务后运行通过。 |
| `npm run test:consistency` | 通过 | 同人格数据下算法 Top5 一致 1000/1000；LIVE_PROFILE 为 `calibrationB`。 |
| `npm run audit:probability:live` | 通过 | 12 核心主岛，自匹配 12/12，从未出现 0。 |
| `npm run audit:options` | 通过 | 维度路径 12/12；黄金路径 17/20，其中核心 12/12、旧分支 5/8。 |

额外本地验证：

- JS 报错：未发现。
- pageerror：未发现。
- failed request：未发现。
- 4xx / 5xx 资源响应：未发现。
- 横向溢出：未发现。
- 分享卡生成：通过。
- 过渡页：只使用 `silver-lake.webp`。
- 结果页拟人图：390px 下宽度 258px，仍为放大后的主视觉。

## 6. 腾讯云上传清单

上传清单已生成：

`reports/beta-0.9.9.7-tencent-cloud-upload-checklist.md`

核心结论：

- 应上传整个 `deploy/`。
- 必须包含 `deploy/assets/`。
- 不建议上传 `release/`、`reports/`、`node_modules/`、历史 backup 文件和历史 zip 包。
- 上传后入口为腾讯云静态站点根路径或 `/index.html`。

## 7. 真实手机验收清单

上线腾讯云后，真实手机验收至少覆盖：

### 首页

- 首屏是否能看到 `开启心岛航行`。
- 标题、说明、补充信息是否清楚。
- 页面是否有横向滚动。
- 加载是否有白屏或闪烁。

### 做题页

- 点击开始是否进入第 1 题。
- 题目和 4 个选项是否清楚。
- 选项是否好点。
- 上一题是否可用。
- 36 题是否能完整做完。
- 滑动是否顺畅。
- 是否有遮挡、错位、卡顿。

### 结尾过渡

- 最后一题后是否只出现一个过渡图。
- 过渡图是否为 `silver-lake.webp`。
- 是否没有 `voyage.webp -> main-island.webp` 连续跳图。
- 是否有“直接查看结果 / 跳过”能力。
- 进入结果页是否不生硬。

### 结果页

- 人格名是否清楚。
- 拟人图是否足够大。
- 关键词是否清楚。
- 命中句是否有阅读位置。
- 分享入口是否能看到。
- 下滑查看详细报告是否顺畅。

### 分享卡

- 点击 `生成分享卡` 是否有效。
- 分享卡是否能生成。
- 预览图是否清楚。
- 拟人图是否缺失。
- 文字是否溢出。
- iPhone Safari 是否能保存。
- 安卓 Chrome 是否能保存。
- 微信内置浏览器是否能保存或长按。
- 如果保存不行，是否需要提示“请用系统浏览器打开”。

## 8. 移动端验收记录模板路径

已生成：

`reports/beta-0.9.9.7-mobile-real-device-qa-template.md`

模板预设设备：

- iPhone Safari；
- iPhone 微信内置浏览器；
- 安卓 Chrome；
- 安卓微信内置浏览器；
- 桌面 Chrome 作为对照。

## 9. 是否发现阻断问题

未发现阻断级问题。

需要注意但不阻断腾讯云测试：

- `deploy/assets` 没有包含根目录 `assets/source/` 原始源图，这是正常的，源图不是运行必需资源。
- 代码中仍保留旧 reveal fallback 函数和旧资源映射，但当前主流程不再调用 reveal 二次切图。
- `audit:options` 中旧分支人格仍有 3 个黄金路径失败，这是历史兼容数据问题；核心 12/12 正常。

## 10. 是否改动代码

本轮没有改动运行代码。

本轮只新增：

- `reports/beta-0.9.9.7-tencent-cloud-upload-checklist.md`
- `reports/beta-0.9.9.7-mobile-real-device-qa-template.md`
- `reports/beta-0.9.9.7-tencent-cloud-mobile-qa-prep-report.md`

并因运行审计命令更新了既有审计输出文件。

## 11. 下一步建议

1. 将整个 `deploy/` 上传腾讯云静态站点。
2. 上传后优先用手机访问腾讯云正式 URL，而不是本地局域网地址。
3. 按 `reports/beta-0.9.9.7-mobile-real-device-qa-template.md` 逐台设备记录。
4. 第一轮重点看保存分享卡、微信内置浏览器限制、弱网图片加载。
5. 如果真实手机发现阻断问题，再单独开修复轮，不在上传前继续扩大 UI 改动。
