# Heart Island / 心岛计划 Beta 0.9.9.4 RC

恋爱人格 / 依恋风格测试 H5 MVP。  
高级、治愈、海岛、轻幻想视觉风格。

---

## 快速启动

```bash
# 安装依赖（仅首次）
npm install

# 启动本地服务器
npx serve . -p 3000

# 浏览器打开
open http://localhost:3000
```

或使用任意静态文件服务器：

```bash
python3 -m http.server 3000
# 或
npx http-server -p 3000
```

---

## 项目结构

```
heart-island-beta-0.9.9.4-rc/
├── index.html          # 入口页面
├── app.js              # 核心应用逻辑
├── styles.css          # 全部样式
├── package.json        # 依赖与脚本
├── core/
│   ├── scoring.mjs     # 评分引擎
│   └── calibration-profiles.mjs
├── assets/
│   ├── personas/       # 12 人格拟人图 (WebP + SVG fallback)
│   │   └── thumbs/     # 缩略图
│   ├── scenes/         # 12 地点场景图 (WebP)
│   │   └── props/      # 场景道具 (SVG)
│   ├── result/         # 结果页背景图 (WebP)
│   └── brand/          # 品牌素材
└── scripts/
    ├── probability-audit.mjs     # 概率分布审计
    ├── option-alignment-audit.mjs # 选项一致性审计
    ├── consistency-test.mjs      # 一致性测试
    ├── inspect-ui.mjs            # UI 截图巡检
    └── inspect-ui-structure.mjs  # DOM 指标巡检
```

---

## 验证脚本

```bash
# 评分分布审计 (100,000 次模拟)
npm run audit:probability

# 选项一致性审计
npm run audit:options
```

---

## 版本历史

| 版本 | 阶段 | 关键变更 |
|------|------|----------|
| 0.9.9.3 | 初始 | 基础 MVP |
| 0.9.9.3 P0 | 修复 | 场景图 0×0、结果页链路、skip 拦截、CSS 语法错误 |
| 0.9.9.3 P1 | 修复 | 按钮触摸目标 ≥44px、XX型型文本、移动端选项高度 |
| 0.9.9.3 P2A | 增强 | 结果页 Hero 视觉层级（拟人图 36%→42%） |
| 0.9.9.3 P2B | 增强 | 惯性分析折叠（渐进式披露） |
| 0.9.9.3 P2C | 增强 | 分享入口前移（Hero 底部轻量入口） |
| **0.9.9.4** | **RC** | **发布候选** |

---

## 质量指标

| 指标 | 值 |
|------|-----|
| JS 错误 | 0 |
| 横向溢出 | 0 |
| 按钮触摸目标 < 44px | 0 |
| 12 人格映射 | 完整 |
| 12 场景映射 | 完整 |
| probability audit | 通过 |
| options audit | 通过 |

---

## 技术栈

- 纯 HTML / CSS / JavaScript (ES Module)
- Canvas 分享图生成
- Playwright 自动化测试
- npx serve 本地开发

---

## 许可

本作品仅作为 AI 产品经理 / AI 应用开发作品集展示项目。  
人格测试结果仅供自我探索参考，不代表专业心理诊断。
