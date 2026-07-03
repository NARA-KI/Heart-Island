# 心岛计划 Beta 0.9.9.7 腾讯云上传清单

## 1. 应上传的目录

建议上传整个目录：

`deploy/`

原因：

- `deploy` 是当前已同步的部署镜像；
- 包含当前 Beta 0.9.9.7 的入口文件；
- 包含运行必需的 `assets/` 资源目录；
- 比从根目录手动挑文件更不容易漏资源。

## 2. 应上传的核心文件

`deploy/` 中至少应包含：

| 文件 | 是否存在 | 说明 |
| --- | --- | --- |
| `deploy/index.html` | 是 | 页面入口 |
| `deploy/app.js` | 是 | 题库、状态、评分入口、结果页和分享卡逻辑 |
| `deploy/styles.css` | 是 | 页面样式 |
| `deploy/package.json` | 是 | 版本记录：`0.9.9.7-beta` |
| `deploy/assets/` | 是 | 图片、人格图、场景图、结果图等运行资源 |

## 3. 应上传的 assets 目录

必须随 `deploy` 一起上传：

| 目录 | 用途 |
| --- | --- |
| `deploy/assets/personas/` | 12 核心人格 SVG / WebP 拟人图 |
| `deploy/assets/personas/thumbs/` | 人格图鉴缩略图 |
| `deploy/assets/scenes/` | 做题页 12 地点场景图 |
| `deploy/assets/result/` | 结果页背景、银色镜湖过渡图、主岛图等 |
| `deploy/assets/brand/` | 品牌占位资源 |

注意：

- 不要只上传 `index.html`、`app.js`、`styles.css`。
- 漏掉 `assets/` 会导致人格图、场景图、过渡图、分享卡图像缺失。
- 当前 `deploy/assets` 不包含根目录 `assets/source/` 原始源图目录，这是正常的；源图不是运行必需资源。

## 4. 不建议上传的历史文件

腾讯云静态站点不建议上传：

| 路径 / 文件 | 原因 |
| --- | --- |
| `release/` | 历史快照，可能包含旧版本入口 |
| `reports/` | 项目记录，不是运行必需文件 |
| `node_modules/` | 静态 H5 运行不需要 |
| `app.js.backup-*` | 历史备份，容易误传 |
| `styles.css.backup-*` | 历史备份，容易误传 |
| `heart-island-beta-*.zip` | 历史包，不作为当前入口 |
| `assets/source/` | 原始源图，不是运行必需资源 |

## 5. 上传后访问入口

上传后入口应为腾讯云静态站点根路径：

`https://你的域名或临时域名/index.html`

如果腾讯云默认读取根目录 `index.html`，访问域名根路径即可：

`https://你的域名或临时域名/`

## 6. 上传后第一轮手机验收步骤

1. 用手机浏览器打开腾讯云访问入口。
2. 首页确认首屏能看到 `开启心岛航行`。
3. 点击开始，确认进入第 1 题。
4. 连续作答几题，确认选项点击区域正常、页面无横向滚动。
5. 使用上一题，确认可返回。
6. 完成 36 题，确认最后只出现一张银色镜湖过渡图。
7. 确认没有 `voyage.webp -> main-island.webp` 连续跳图。
8. 进入结果页，确认人格名、拟人图、关键词、命中句可见。
9. 点击 `生成分享卡`，确认能生成预览。
10. 分别在 iPhone Safari、iPhone 微信内置浏览器、安卓 Chrome、安卓微信内置浏览器中记录保存图片表现。

## 7. 当前检查结论

- 建议上传目录：`deploy/`
- `deploy` 包含运行必需入口文件和 assets。
- 本地用 `deploy` 目录启动静态服务后，`npm run ui:inspect` 通过。
- 本地网络检查未发现 JS 报错、资源 404 或请求失败。
- 可进入腾讯云真实手机测试阶段。
