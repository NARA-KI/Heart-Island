# Heart Island Beta 0.9.9.4 RC — 发布清单

## 发布包

```
release/heart-island-beta-0.9.9.4-rc/
```

- 文件数：70
- 大小：4.5 MB
- 入口：`index.html`

## 启动

```bash
cd release/heart-island-beta-0.9.9.4-rc
npx serve . -p 3000
# → http://localhost:3000
```

## 验证清单

| 检查项 | 方法 | 结果 |
|--------|------|------|
| 首页加载 | 浏览器打开 | ✅ |
| 场景图渲染 | 634×900 / 390×236 | ✅ |
| 做题流程 36/36 | 自动答题 | ✅ |
| 结果页 Hero | 拟人图 361×542 | ✅ |
| 分享入口 | Hero 底部 "生成我的分享卡 ▸" | ✅ |
| 惯性折叠 | Section 3 默认折叠 | ✅ |
| 按钮 ≥44px | 36/36 按钮通过 | ✅ |
| JS 错误 | 控制台 | 0 |
| 横向溢出 | body scrollWidth | 0 |

## 审计

```bash
npm run audit:probability   # 12/12 自匹配
npm run audit:options       # 12/12 核心黄金路径
```

## 版本冻结

```
Heart Island Beta 0.9.9.4 RC
🔒 已冻结 — 可发布
```
