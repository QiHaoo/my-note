# 个人学习知识库网站设计方案

## 1. 项目概述

### 1.1 目标

构建一个静态文档网站，用于托管个人学习笔记和交互式思维导图。网站部署在 GitHub Pages，页面精美，支持深色/暖色主题切换和响应式布局。后续大部分内容由大模型生成，用户尽量不需要维护网站代码。

### 1.2 核心使用场景

- 按主题系统学习开发知识（Redis、Spring 等）
- 每学完一章，生成浓缩笔记和思维导图
- 复习时先看思维导图，必要时跳转回笔记详情
- 完全掌握后，将多章内容整合成综合思维导图
- 未来可能扩展间隔重复复习功能

### 1.3 目标用户

主要给自己使用，个人知识库/数字花园性质。

## 2. 设计约束与假设

- 用户不想维护网站前端代码
- 内容由大模型生成，需要明确的约定和格式
- 内容源来自 Obsidian Markdown
- 部署目标为 GitHub Pages
- 手动触发内容转换（未来可自动化）
- 需要支持桌面端和移动端

## 3. 信息架构

采用 **嵌套式架构**：

```text
首页
└── 主题页（Redis / Spring / ...）
    └── 章节页（数据结构 / 持久化 / ...）
        ├── 笔记视图
        └── 思维导图视图
    └── 综合整合页（主题级别的综合思维导图）
```

### 3.1 首页

- 左侧/顶部导航：主题列表
- 主区域：当前选中主题的章节卡片网格
- 每个主题卡片显示：标题、章节数量、导图数量、最近更新时间

### 3.2 主题页

- 展示该主题下的所有章节
- 每个章节显示：标题、笔记链接、思维导图链接、学习状态
- 主题末尾放置综合整合思维导图入口

### 3.3 章节页

- 页面顶部：章节标题、标签、学习状态、创建/更新时间
- 中部 Tab 切换：【笔记】/【思维导图】
- 思维导图页面内右上角：交互式导图 / SVG 静态图 切换
- 思维导图节点可点击跳转笔记对应段落

## 4. 目录与文件约定

所有内容放在 `content/` 目录下，目录结构决定 URL 和导航顺序。

```text
content/
├── redis/
│   ├── meta.json
│   ├── 01-data-structures/
│   │   ├── note.md
│   │   └── mindmap.json
│   ├── 02-persistence/
│   │   ├── note.md
│   │   └── mindmap.json
│   └── 99-redis-overview/
│       └── mindmap.json
├── spring/
│   ├── meta.json
│   ├── 01-ioc/
│   │   ├── note.md
│   │   └── mindmap.json
│   └── ...
└── site.json
```

### 4.1 目录命名规则

- 主题目录名使用小写英文，如 `redis`、`spring`
- 章节目录使用数字前缀控制排序，如 `01-data-structures`
- 数字前缀在生成 URL 和导航时去掉，仅用于排序
- 综合整合章节建议用 `99-overview` 之类的大数字前缀放在最后

### 4.2 主题元数据：`meta.json`

```json
{
  "title": "Redis",
  "description": "Redis 高性能键值数据库学习笔记",
  "order": 1,
  "icon": "🚀",
  "tags": ["database", "cache"]
}
```

### 4.3 站点配置：`site.json`

```json
{
  "title": "My Knowledge Base",
  "description": "个人学习笔记与思维导图",
  "author": "Your Name",
  "defaultTheme": "dark",
  "themes": ["dark", "garden"]
}
```

## 5. 内容格式

### 5.1 笔记：`note.md`

标准 Markdown，顶部包含 YAML frontmatter：

```yaml
---
title: Redis 数据结构
created: 2026-07-15
updated: 2026-07-15
status: learning
tags: [redis, cache, data-structure]
reviewable: true
---

# Redis 数据结构

String 是 Redis 最基础的数据类型……
```

**字段说明**：

- `title`：章节标题
- `created`：创建日期
- `updated`：更新日期
- `status`：学习状态，可选 `learning` / `reviewing` / `mastered`
- `tags`：标签数组
- `reviewable`：是否可加入未来的复习计划（预留字段）

### 5.2 思维导图：`mindmap.json`

大模型根据笔记内容理解后生成，不是机械地复制 Markdown 大纲。

```json
{
  "title": "Redis 数据结构",
  "subtitle": "String / Hash / List / Set / Sorted Set",
  "root": {
    "id": "root",
    "label": "Redis 数据结构",
    "noteRef": "/redis/01-data-structures/note",
    "collapsed": false,
    "children": [
      {
        "id": "string",
        "label": "String",
        "noteRef": "/redis/01-data-structures/note#string",
        "collapsed": false,
        "children": [
          { "id": "sds", "label": "SDS 简单动态字符串" },
          { "id": "use-case", "label": "使用场景：缓存、计数器" }
        ]
      },
      {
        "id": "hash",
        "label": "Hash",
        "noteRef": "/redis/01-data-structures/note#hash",
        "children": [
          { "id": "zipmap", "label": "ziplist / hashtable 编码" },
          { "id": "hash-use", "label": "适合存储对象" }
        ]
      }
    ]
  },
  "layout": "right",
  "theme": "tech",
  "nodeStyle": {
    "root": { "fill": "#58a6ff", "stroke": "#1f6feb" },
    "level1": { "fill": "#238636", "stroke": "#196c2e" },
    "level2": { "fill": "#8957e5", "stroke": "#6e40c9" }
  }
}
```

**字段说明**：

- `title` / `subtitle`：导图标题和副标题
- `root`：导图根节点
  - `id`：节点唯一标识
  - `label`：节点显示文本
  - `noteRef`：点击节点跳转的笔记链接或锚点
  - `collapsed`：默认是否折叠
  - `children`：子节点数组，可嵌套
- `layout`：布局方向，`right` / `left` / `radial`
- `theme`：导图主题，与网站主题系统关联
- `nodeStyle`：可选的节点颜色配置

## 6. 视觉设计

### 6.1 主题方案

支持两套主题，通过全局开关切换：

1. **深色科技风（dark）**：深色背景、代码高亮、霓虹蓝绿点缀
2. **温暖数字花园风（garden）**：暖米色背景、柔和圆角、自然绿色点缀

### 6.2 响应式布局

- **桌面端**：左侧固定主题导航栏，右侧主内容区
- **平板端**：可折叠的侧边导航
- **移动端**：底部或顶部的汉堡菜单，单列内容

### 6.3 全局 UI 元素

- 顶部导航栏：Logo、站点标题、主题切换按钮
- 左侧边栏：主题列表、章节列表（可选展开）
- 内容区：标题、元信息、Tab 切换、主体内容
- 思维导图页面右上角：交互式 / SVG 切换按钮

## 7. 技术栈

| 层级 | 技术 | 说明 |
|---|---|---|
| 静态站生成 | Astro | 内容驱动、Markdown 原生支持、性能优秀 |
| 样式 | Tailwind CSS | 主题切换、响应式布局 |
| 字体 | Inter / system-ui + JetBrains Mono | 正文用系统字体，代码用等宽字体 |
| 思维导图渲染 | D3.js | 读取 mindmap.json 渲染交互式导图 |
| SVG 导出 | D3.js + XMLSerializer | 同一数据源生成静态 SVG |
| Markdown 处理 | Astro 内置 + remark/rehype | 支持 frontmatter、代码高亮、锚点 |
| 部署 | GitHub Pages | 免费静态托管 |
| CI/CD | GitHub Actions | push 后自动构建和部署 |

## 8. 内容生成工作流

### 8.1 新增一章内容的流程

1. 在 Obsidian 中完成学习并整理笔记
2. 将笔记复制到 `content/<主题>/<章节>/note.md`
3. 让大模型根据 `note.md` 生成 `content/<主题>/<章节>/mindmap.json`
4. 调整 frontmatter 和导图数据
5. `git add`、`git commit`、`git push`
6. GitHub Actions 自动构建并发布

### 8.2 大模型生成内容的约定

大模型需要学会：

- 目录结构和命名规则
- `note.md` 的 frontmatter 字段
- `mindmap.json` 的字段和结构
- 不直接生成 HTML/CSS/JS，只生成内容数据

## 9. 部署方案

### 9.1 GitHub Pages 配置

1. 在 GitHub 创建仓库
2. 开启 GitHub Pages，选择 GitHub Actions 作为部署源
3. 添加仓库 Secrets（如需自定义域名）

### 9.2 GitHub Actions Workflow

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

### 9.3 本地预览

```bash
npm install
npm run dev
```

## 10. 未来扩展：间隔重复复习功能

当前不实现，但设计已预留扩展路径。

### 10.1 预留点

- `note.md` frontmatter 中已包含 `reviewable` 字段
- 首页/主题页可预留"今日复习"入口位置
- `mindmap.json` 可扩展 `reviewPoints` 字段标记需要复习的节点

### 10.2 推荐实现路径

**第一阶段：本地存储方案**

- 复习记录存在浏览器 `localStorage`
- 网站启动时计算今日复习任务
- 用户点击"完成复习"后更新 localStorage
- 无需后端，适合个人单机使用

**第二阶段：仓库同步方案**

- 增加 `data/reviews.json` 文件
- 记录每篇笔记的复习历史、下次复习日期、复习级别
- 静态构建时读取该文件生成"今日复习"页面
- 复习完成后通过脚本或手动更新并提交

**第三阶段：后端方案（如需网页一键完成）**

- 引入 Cloudflare Workers + KV
- 或 GitHub Issues / Gist API
- 或 Firebase / Supabase

## 11. 项目结构（最终实现）

```text
my-note/
├── content/                  # 用户生成的内容
│   ├── redis/
│   ├── spring/
│   └── site.json
├── src/
│   ├── components/           # Astro 组件
│   │   ├── ThemeToggle.astro
│   │   ├── MindmapViewer.tsx
│   │   ├── MindmapSVG.astro
│   │   ├── Sidebar.astro
│   │   └── ChapterCard.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── TopicLayout.astro
│   │   └── ChapterLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── [topic].astro
│   │   └── [topic]/[chapter].astro
│   ├── styles/
│   │   ├── global.css
│   │   ├── theme-dark.css
│   │   └── theme-garden.css
│   └── lib/
│       ├── content.ts        # 读取 content/ 目录
│       ├── mindmap.ts        # 导图数据解析与渲染
│       └── review.ts         # 复习算法（预留）
├── public/
│   └── fonts/
├── docs/superpowers/specs/   # 设计文档
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── .github/workflows/deploy.yml
```

## 12. 待决策事项

- 是否需要搜索功能？（建议第二阶段加入，可用 Fuse.js 客户端搜索）
- 是否需要标签页/标签云？（可在首页或主题页增加）
- 是否需要评论/批注？（给自己看，第一阶段不需要）
- 思维导图是否支持导出为图片/PDF？（SVG 已支持，可后续扩展）

## 13. 成功标准

- 用户只需在 `content/` 目录下添加 Markdown 和 JSON 文件
- push 后 1-2 分钟内网站自动更新
- 页面在桌面端和移动端都有良好体验
- 主题切换流畅，无闪烁
- 思维导图可交互、可切换 SVG、节点可跳转笔记
- 大模型能理解约定并稳定生成符合格式的内容

---

*设计确认日期：2026-07-17*
