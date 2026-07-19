# AGENTS.md

本文件为 AI 代理（以及协作者）提供在 `my-note` 仓库中工作的统一约定。请先通读本文件再动手。

## 1. 项目概述

`my-note` 是一个**个人学习知识库 / 数字花园**静态站点，用于托管学习笔记（Markdown）和交互式思维导图（D3.js）。部署在 GitHub Pages。

- 站点地址：https://qihahoo.github.io/my-note
- 核心场景：按主题系统学习 → 每章生成浓缩笔记 + 思维导图 → 复习时先看导图再跳转笔记
- **设计原则**：用户尽量不维护前端代码，绝大部分日常工作是「新增内容」，而非改网站代码

## 2. 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 静态站生成 | Astro 5 | 内容驱动，Markdown 原生支持 |
| 样式 | Tailwind CSS 6 | 主题切换 + 响应式，`darkMode: 'class'` |
| 思维导图渲染 | D3.js（d3-hierarchy） | 读取 `mindmap.json` 渲染交互式导图 |
| Markdown 渲染 | unified + remark/rehype + shiki | GFM 表格、代码高亮、标题锚点、HTML 透传、callout |
| Markdown 处理 | gray-matter + remark | 解析 frontmatter 与标题提取 |
| 排版样式 | @tailwindcss/typography | prose 基底 + 主题感知覆盖（dark/garden） |
| 类型检查 | TypeScript（astro/strict） | `tsconfig.json` 继承 `astro/tsconfigs/strict` |
| 视觉回归 | Playwright | `scripts/visual-regression.ts` |
| 部署 | GitHub Pages + GitHub Actions | push 到 `master` 自动构建发布 |

## 3. 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 本地开发，http://127.0.0.1:4321/my-note
npm run build        # 构建到 dist/
npm run preview      # 预览构建产物
npm run test:visual  # 视觉回归测试（需本地 Chrome，会自启 dev server）
```

> 注意：本地地址带 base 前缀 `/my-note`，不要写成根路径。

## 4. 目录结构

```text
my-note/
├── content/                 # ★ 内容目录（日常工作的主战场）
│   ├── site.json            # 站点配置
│   ├── <topic>/             # 主题，如 redis、Kubernetes
│   │   ├── meta.json        # 主题元数据 + 可选 modules
│   │   └── <NN-slug>/       # 章节，数字前缀控制排序
│   │       ├── note.md      # 笔记（frontmatter + Markdown）
│   │       └── mindmap.json # 思维导图（可选）
│   └── ...
├── src/
│   ├── components/          # Astro 组件（Sidebar / MindmapViewer / ThemeToggle 等）
│   ├── layouts/BaseLayout.astro
│   ├── pages/               # 路由：index / [topic] / [topic]/[chapter] / [topic]/[chapter]/[sub]
│   ├── lib/                 # 核心逻辑
│   │   ├── content.ts       # 读取 content/ 目录（★ 内容加载入口）
│   │   ├── markdown.ts      # unified 渲染管线（表格/代码高亮/锚点/callout）
│   │   ├── mindmap.ts       # 导图数据解析与 d3 布局
│   │   ├── types.ts         # 全部类型定义
│   │   └── utils.ts         # 目录名解析（slug / order）
│   └── styles/              # global.css + theme-dark.css + theme-garden.css
├── scripts/visual-regression.ts
├── docs/                    # 设计文档与内容指南
│   ├── content-guide.md     # ★ 内容生成指南
│   └── superpowers/         # specs / plans
├── astro.config.mjs         # base: '/my-note'，shiki 主题 github-dark
├── tailwind.config.mjs      # dark/garden 两套配色 token
└── .github/workflows/deploy.yml
```

## 5. 内容约定（最重要）

**90% 的日常任务是新增 / 修改 `content/` 下的内容，而非改代码。** 严格遵循以下规则，详细格式见 `docs/content-guide.md`。

### 5.1 目录命名

- 主题目录：小写英文，如 `redis`、`spring`（现有 `Kubernetes` 为历史例外，保持不变）
- 章节目录：`<数字前缀>-<slug>`，如 `01-data-structures`
  - 数字前缀**仅用于排序**，生成 URL 和导航时会被 `slugFromDirname()` 去掉
  - 综合导图章节建议用 `99-overview` 这类大数字放最后
  - slug 用英文 / 拼音 / 中英文混合均可，但**不要包含空格、冒号、全角符号**

> ⚠️ 历史遗留：`content/Kubernetes/` 下存在两套并行目录——中文命名目录（如 `01 初识容器：万事开头难`，Obsidian 源笔记）和 slug 命名目录（如 `01-初识容器-万事开头难`，含 `note.md`）。**网站只读取 slug 命名目录里的 `note.md`**，中文目录是原始素材，不要删除也不要直接引用。

### 5.2 `note.md` 格式

```markdown
---
title: 章节标题
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [标签1, 标签2]
reviewable: true
module: container-basics
---

## 二级标题

正文……
```

**关键规则：**

- `status` 可选值：`learning` / `reviewing` / `mastered` / `not-started`
- **正文不要写一级标题 `# 章节标题`**，页面会自动用 `frontmatter.title` 作为标题，从 `##` 开始写
- `module` 是可选字段，对应主题 `meta.json` 里声明的 module id；不填则该章节直接挂在主题下
- 日期格式 `YYYY-MM-DD`

### 5.3 `mindmap.json` 格式

```json
{
  "title": "导图标题",
  "subtitle": "副标题（可选）",
  "root": {
    "id": "root",
    "label": "中心主题",
    "noteRef": "/my-note/<topic>/<chapter-slug>/",
    "collapsed": false,
    "children": [
      {
        "id": "node-1",
        "label": "节点1",
        "noteRef": "/my-note/<topic>/<chapter-slug>/#锚点",
        "collapsed": false,
        "children": []
      }
    ]
  },
  "layout": "right",
  "theme": "tech",
  "module": "basics"
}
```

**关键规则：**

- **根据笔记内容理解后生成，不要机械复制 Markdown 大纲**——提炼知识结构而非照搬标题
- `noteRef` 必须是相对站点根的绝对路径，**必须包含 base 前缀 `/my-note/`**
- 锚点 `#xxx` 对应 `note.md` 中标题生成的 slug（见 `extractHeadings()`，中文标题会保留）
- 节点 `id` 在整棵树内必须唯一
- `collapsed` 控制默认折叠状态
- `layout`：`right` / `left` / `radial`
- `theme`：`tech`（深色）或 `garden`（暖色），影响节点配色

### 5.4 主题元数据 `meta.json`

```json
{
  "title": "Redis",
  "description": "Redis 高性能键值数据库学习笔记",
  "order": 1,
  "icon": "🚀",
  "tags": ["database", "cache"],
  "modules": [
    { "id": "basics", "title": "基础篇", "order": 1 },
    { "id": "advanced", "title": "进阶篇", "order": 2 }
  ]
}
```

- `order` 决定主题在首页的排序
- `modules` 是**可选**的二级分类；声明后，章节可通过 frontmatter 的 `module` 字段归入对应分类

### 5.5 新增一章的标准流程

1. 在 `content/<topic>/` 下创建 `<NN-slug>/` 目录
2. 写 `note.md`（带 frontmatter，正文从 `##` 开始）
3. 根据 note 内容生成 `mindmap.json`（理解后提炼，`noteRef` 带 `/my-note/` 前缀）
4. `npm run dev` 本地预览确认无误
5. `git add` → `git commit` → `git push` 到 `master`，GitHub Actions 自动部署

### 5.6 内容生成的铁律

- **只生成内容数据（`.md` / `.json`），不要生成 HTML / CSS / JS**（callout 等约定 class 的 HTML 片段除外）
- 不要修改 `src/` 下的代码来适配单个章节的内容
- `noteRef` 永远带 `/my-note/` 前缀
- 复制现有主题目录结构来新建主题，改 `meta.json` 即可

### 5.7 分笔记与排版增强

**分笔记**（章节内容多时可拆分）：
- 物理结构：`<NN-slug>/<NN-sub-slug>/note.md`
- 主笔记页底部自动生成分笔记索引卡片；分笔记不进左侧导航
- 分笔记 URL：`/my-note/<topic>/<chapter-slug>/<sub-slug>/`，页面有面包屑 + 返回主笔记
- 分笔记 `note.md` 格式与主笔记一致，`module` 字段通常不需要

**排版增强**（`src/lib/markdown.ts` 渲染管线自动处理，无需配置）：
- GFM 表格 → 圆角卡片（表头背景、斑马纹、hover、移动端横向滚动）
- 代码块 → shiki 语法高亮（github-dark 主题）
- 标题 → 自动加 `id` + hover 锚点链接（slug 与 GitHub 一致，思维导图 `#锚点` 可跳转）
- `-> ` 开头段落 → 参见样式（左细线 + 斜体）
- `<div class="callout callout-info">…</div>` → 提示框（可选 info/warning/danger/success）

## 6. 代码约定（改 `src/` 时才适用）

### 6.1 内容加载机制

`src/lib/content.ts` 是内容加载的唯一入口，关键行为：

- `CONTENT_DIR = content/`（基于 `process.cwd()`）
- 读取主题 → `getTopics()`：扫描 `content/` 下的目录，必须有 `meta.json` 才算合法主题，按 `meta.order` 排序
- 读取章节 → `getChapters()`：扫描主题目录下的子目录，**必须含 `note.md` 或 `mindmap.json` 至少其一**才会出现；按目录名数字前缀排序（无前缀默认 999）
- 子章节 → `getSubChapters(chapterPath, ...)`：读取章节目录下嵌套子目录，必须含 `note.md`（注意：用原始目录路径拼路径，不是 slug）
- 标题提取 → `extractHeadings()`：用 remark 解析 + github-slugger 生成 slug（与渲染管线 rehype-slug 一致，思维导图锚点可对上）
- Markdown 渲染 → `src/lib/markdown.ts` 的 `renderMarkdown()`：unified 管线（remark-gfm + rehype-raw/slug/autolink-headings/pretty-code + 表格包裹），章节页和分笔记页共用

### 6.2 路由

- `src/pages/index.astro` → 首页
- `src/pages/[topic].astro` → 主题页 `/my-note/<topic>/`
- `src/pages/[topic]/[chapter].astro` → 章节页 `/my-note/<topic>/<chapter-slug>/`
  - URL 中的 chapter slug 是**去掉数字前缀**的目录名
  - 支持 `?view=mindmap` query 切换到导图视图
  - 底部自动生成分笔记索引（若有子目录）
- `src/pages/[topic]/[chapter]/[sub].astro` → 分笔记页 `/my-note/<topic>/<chapter-slug>/<sub-slug>/`
  - 面包屑 + 返回主笔记，不进左侧导航

### 6.3 样式与主题

- 两套主题通过 `<html>` 的 class 切换（`dark` / `garden`），CSS 变量定义在 `src/styles/theme-*.css`
- 组件中用 `var(--text)`、`var(--surface)`、`var(--border)`、`var(--accent)`、`var(--heading)` 等 token，**不要硬编码颜色**
- 深色配色 token 也定义在 `tailwind.config.mjs` 的 `theme.extend.colors` 里（`dark-bg` / `garden-bg` 等）
- 代码高亮用 shiki `github-dark` 主题（通过 `rehype-pretty-code` 在 `src/lib/markdown.ts` 渲染时处理）
- 排版基底用 `@tailwindcss/typography`（`prose` 类），主题感知覆盖在 `src/styles/global.css`

### 6.4 TypeScript

- 严格模式，所有类型集中在 `src/lib/types.ts`
- 改动数据结构时同步更新 `types.ts`，不要用 `any` 绕过

### 6.5 思维导图渲染

- `src/lib/mindmap.ts` 用 `d3-hierarchy` 的 `tree()` 布局，`nodeSize([40, 180])`
- 交互式导图（`MindmapViewer.astro`）和静态 SVG（`MindmapSVG.astro`）共用同一数据源
- 节点配色按深度循环取色，`getDefaultColors(depth, theme)`

## 7. 部署

- 触发条件：push 到 **`master`** 分支（注意是 `master` 不是 `main`）或手动 `workflow_dispatch`
- 流程：`npm ci` → `npm run build` → 上传 `dist/` → 部署到 GitHub Pages
- `astro.config.mjs` 中 `site: 'https://qihahoo.github.io'`，`base: '/my-note'`，所有内部链接都要考虑 base 前缀

## 8. 视觉回归测试

`npm run test:visual` 会：

1. 自启 dev server（`127.0.0.1:4321`）
2. 用本地 Chrome（路径写死在脚本里 `C:/Program Files/Google/Chrome/Application/chrome.exe`）headless 截图
3. 覆盖桌面 / 移动、dark / garden、笔记 / 导图等多种场景
4. 断言关键元素存在，失败的用例不会截图

> 改动 UI 或导图渲染后建议跑一遍。脚本里的 Chrome 路径是 Windows 硬编码，跨平台运行需调整。

## 9. 常见陷阱

| 陷阱 | 说明 |
|---|---|
| `noteRef` 漏掉 `/my-note/` 前缀 | 导图节点点击后会 404 |
| `note.md` 正文写了 `# 标题` | 页面会出现重复标题 |
| 章节目录用中文 / 空格 / 全角符号 | slug 解析异常，URL 不可读 |
| 直接改 `src/` 代码适配单章内容 | 违背「内容与代码分离」原则，应通过内容数据解决 |
| 主题目录缺 `meta.json` | 该主题不会被 `getTopics()` 识别，整个主题消失 |
| 章节目录既无 `note.md` 又无 `mindmap.json` | 该章节被跳过不显示 |
| push 到 `main` 而非 `master` | 不会触发部署 |

## 10. 参考文档

- `docs/content-guide.md` — 内容生成指南（最常查阅）
- `docs/superpowers/specs/2026-07-17-personal-knowledge-site-design.md` — 完整设计方案
- `docs/superpowers/plans/2026-07-17-personal-knowledge-site-plan.md` — 实施计划

## 11. 工作优先级

1. **能通过加内容解决的，不要改代码**——这是内容驱动站点
2. 必须改代码时，先确认 `content.ts` / `types.ts` 是否已支持该数据结构
3. 改动后跑 `npm run build` 确认无报错，必要时跑 `npm run test:visual`
4. 提交信息用中文或英文均可，但请描述清楚改了哪个主题 / 章节
