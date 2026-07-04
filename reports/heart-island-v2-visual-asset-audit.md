# 心岛计划 v2.0 视觉资源阶段一审计

## 1. 审计结论

阶段一仅做资源可用性初审，不生成新图片，不替换整套视觉资产。

当前 v2 Alpha 最小闭环可运行，但 15 人格视觉资源并不完整：旧版已有 12 个核心人格图标和拟人图，新增的同行者、港湾型、摆渡人暂缺专属图标和拟人图。

## 2. 首页背景

| 资源 | 路径 | 当前用途 | 结论 |
| --- | --- | --- | --- |
| 结果通用背景 | `assets/result/common-bg.webp` | v2 首页主视觉背景 | 保留 |
| 原始航行图 | `assets/source/00-航行.png` | 当前未直接接入 | 后续可评估 |

阶段一首页用 CSS 深海背景 + `common-bg.webp` + 抽象小岛/航线，不引入新素材。

## 3. 场景图

当前存在 12 张压缩场景图：

- `assets/scenes/cl-coast.webp`
- `assets/scenes/au-ridge.webp`
- `assets/scenes/se-harbor.webp`
- `assets/scenes/ex-river.webp`
- `assets/scenes/rp-volcano.webp`
- `assets/scenes/in-plain.webp`
- `assets/scenes/id-observatory.webp`
- `assets/scenes/st-tower.webp`
- `assets/scenes/ca-dock.webp`
- `assets/scenes/nv-fog-route.webp`
- `assets/scenes/me-old-bay.webp`
- `assets/scenes/ev-moon-lake.webp`

阶段一未把 60 题强行映射到旧 12 场景，避免制造与题库结构不一致的章节叙事。后续阶段可按构念或流程段落重新设计轻量背景策略。

## 4. 15 人格图标

| 人格 | 现有图标状态 | 备注 |
| --- | --- | --- |
| 灯塔型 | 已有 | `assets/personas/01-lighthouse.svg` |
| 守门人 | 已有但旧名含“型” | `assets/personas/02-gatekeeper.svg` |
| 筑巢型 | 已有 | `assets/personas/03-nest-builder.svg` |
| 收藏家 | 已有但旧名含“型” | `assets/personas/04-collector.svg` |
| 候鸟型 | 已有 | `assets/personas/05-migratory-bird.svg` |
| 岛屿型 | 已有 | `assets/personas/06-island.svg` |
| 探险家 | 已有但旧名含“型” | `assets/personas/07-explorer.svg` |
| 流浪诗人 | 已有但旧名含“型” | `assets/personas/08-wandering-poet.svg` |
| 星火型 | 已有 | `assets/personas/09-spark.svg` |
| 月光型 | 已有 | `assets/personas/10-moonlight.svg` |
| 镜像型 | 已有 | `assets/personas/11-mirror.svg` |
| 观星者 | 已有但旧名含“型” | `assets/personas/12-stargazer.svg` |
| 同行者 | 缺失 | 后续需补 |
| 港湾型 | 缺失 | 后续需补 |
| 摆渡人 | 缺失 | 后续需补 |

结论：15 人格图标完整度为 12/15。

## 5. 15 人格拟人图

| 人格 | 拟人图状态 | 备注 |
| --- | --- | --- |
| 灯塔型 | 已有 | `assets/personas/lighthouse.webp` |
| 守门人 | 已有 | `assets/personas/gatekeeper.webp` |
| 筑巢型 | 已有 | `assets/personas/nest-builder.webp` |
| 收藏家 | 已有 | `assets/personas/collector.webp` |
| 候鸟型 | 已有 | `assets/personas/migratory-bird.webp` |
| 岛屿型 | 已有 | `assets/personas/islander.webp` |
| 探险家 | 已有 | `assets/personas/explorer.webp` |
| 流浪诗人 | 已有 | `assets/personas/wandering-poet.webp` |
| 星火型 | 已有 | `assets/personas/spark.webp` |
| 月光型 | 已有 | `assets/personas/moonlight.webp` |
| 镜像型 | 已有 | `assets/personas/mirror.webp` |
| 观星者 | 已有 | `assets/personas/stargazer.webp` |
| 同行者 | 缺失 | 当前结果页使用文字 fallback |
| 港湾型 | 缺失 | 当前结果页使用文字 fallback |
| 摆渡人 | 缺失 | 当前结果页使用文字 fallback |

结论：15 人格拟人图完整度为 12/15。

## 6. 结果页背景

| 资源 | 路径 | 当前用途 | 结论 |
| --- | --- | --- | --- |
| 通用背景 | `assets/result/common-bg.webp` | 首页视觉 | 保留 |
| 银色镜湖 | `assets/result/silver-lake.webp` | 当前阶段未接入 | 后续可用于完成过渡 |
| 主岛浮现 | `assets/result/main-island.webp` | 当前阶段未接入 | 后续可用于结果页氛围 |
| 航行图 | `assets/result/voyage.webp` | 当前阶段未接入 | 后续评估 |

## 7. 分享卡资源

阶段一没有实现分享卡。分享卡资源审计和模板适配延后到阶段二。

## 8. Logo 与 UI 装饰

阶段一没有新增 logo，也没有生成新装饰图。UI 使用统一 CSS 变量：

- `--bg-deep`
- `--bg-card`
- `--surface-glass`
- `--text-primary`
- `--text-secondary`
- `--border-soft`
- `--accent-light`
- `--accent-deep`
- `--radius-card`
- `--shadow-soft`

## 9. 后续素材规格建议

优先补齐：

1. 同行者图标 + 拟人图。
2. 港湾型图标 + 拟人图。
3. 摆渡人图标 + 拟人图。

建议规格：

- 图标：SVG，透明背景，适配 48px-160px。
- 拟人图：WebP，建议 1024px 长边，移动端可裁切，背景不应压过结果页文字。

## 10. 阶段一处理结论

阶段一保留现有高质量资源，不因 3 个新增人格缺图阻塞最小闭环。缺图人格使用文字 fallback，避免使用低质量临时素材。
