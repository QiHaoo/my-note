# 个人学习知识库网站实现计划

> **For agentic workers:** REQUIRED SUB-TECH: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Astro + D3.js 构建一个静态学习笔记网站，支持 Markdown 笔记渲染、交互式思维导图、SVG 导图切换、深浅主题切换、响应式布局，并自动部署到 GitHub Pages。

**Architecture:** 使用 Astro 作为静态站生成器，内容全部放在 `content/` 目录下（Markdown + JSON）；构建时通过 `src/lib/content.ts` 扫描并解析内容；页面使用 Astro 动态路由生成；思维导图用 D3.js 客户端渲染，同一数据源生成 SVG 静态图；主题通过 Tailwind CSS 的 `dark` class 和自定义 `garden` class 切换。

**Tech Stack:** Astro 5, Tailwind CSS 4, D3.js 7, TypeScript, GitHub Pages, GitHub Actions

---

## 0. 项目结构与文件职责

```text
my-note/
├── content/                      # 用户生成的内容
│   ├── redis/
│   │   ├── meta.json
│   │   ├── 01-data-structures/
│   │   │   ├── note.md
│   │   │   └── mindmap.json
│   │   └── 99-redis-overview/
│   │       └── mindmap.json
│   ├── spring/
│   │   └── ...
│   └── site.json
├── src/
│   ├── components/
│   │   ├── ThemeToggle.astro     # 全局主题切换按钮
│   │   ├── Sidebar.astro         # 左侧主题/章节导航
│   │   ├── ChapterCard.astro     # 章节卡片
│   │   ├── MindmapViewer.astro   # 交互式 D3 思维导图（客户端脚本）
│   │   ├── MindmapSVG.astro      # 静态 SVG 思维导图
│   │   └── ViewToggle.astro      # 笔记/导图 Tab 切换
│   ├── layouts/
│   │   └── BaseLayout.astro      # 全局布局（导航、主题、侧边栏）
│   ├── pages/
│   │   ├── index.astro           # 首页：默认展示第一个主题
│   │   ├── [topic].astro         # 主题页：章节卡片网格
│   │   └── [topic]/[chapter].astro   # 章节页：笔记/导图
│   ├── lib/
│   │   ├── content.ts            # 读取 content/ 目录的函数
│   │   ├── types.ts              # 类型定义
│   │   └── mindmap.ts            # 导图数据转换与 D3 布局辅助
│   └── styles/
│       ├── global.css            # 全局样式 + 主题变量
│       ├── theme-dark.css        # 深色科技风变量
│       └── theme-garden.css      # 温暖数字花园风变量
├── .github/workflows/deploy.yml  # GitHub Actions 部署
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── .gitignore
```

**各文件职责：**

- `src/lib/content.ts`：唯一读取 `content/` 的入口，输出标准化的 Topic/Chapter 数组
- `src/lib/types.ts`：定义 `SiteConfig`、`TopicMeta`、`Chapter`、`MindmapData` 等类型
- `src/lib/mindmap.ts`：把 `mindmap.json` 的嵌套节点展平为 D3 层次结构，计算节点坐标
- `src/components/MindmapViewer.astro`：客户端 islands 组件，用 D3 画可交互树图
- `src/components/MindmapSVG.astro`：纯 Astro 服务端渲染，输出 SVG 字符串
- `src/components/Sidebar.astro`：响应式侧边栏，桌面固定、移动折叠
- `src/layouts/BaseLayout.astro`：所有页面共用，注入主题脚本和全局样式

---

## Phase 1: 初始化 Astro 项目并安装依赖

### Task 1: 使用 Astro CLI 创建项目

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`
- Modify: `.gitignore`

- [ ] **Step 1: 运行 Astro 创建命令**

Run:
```bash
npx create-astro@latest . --template minimal --install --git false --skip-houston
```

Expected: 项目根目录出现 `src/pages/index.astro`、`astro.config.mjs`、`package.json` 等文件。

- [ ] **Step 2: 验证 package.json**

`package.json` 应包含：
```json
{
  "name": "my-note",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0"
  }
}
```

- [ ] **Step 3: 更新 .gitignore**

```text
node_modules/
dist/
.astro/
.env
.DS_Store
*.log
.claude/
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: initialize Astro project"
```

---

### Task 2: 安装 Tailwind CSS、D3 和类型定义

**Files:**
- Modify: `package.json`
- Create: `tailwind.config.mjs`, `src/styles/global.css`

- [ ] **Step 1: 安装依赖**

Run:
```bash
npm install @astrojs/tailwind d3
npm install -D @types/d3
```

Expected: `package.json` 中出现 `@astrojs/tailwind`、`d3` 和 `@types/d3`。

- [ ] **Step 2: 配置 Astro 使用 Tailwind**

`astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://qihahoo.github.io',
  base: '/my-note',
});
```

- [ ] **Step 3: 创建 tailwind.config.mjs**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0d1117',
        'dark-surface': '#161b22',
        'dark-border': '#30363d',
        'dark-text': '#c9d1d9',
        'dark-heading': '#f0f6fc',
        'dark-accent': '#58a6ff',
        'garden-bg': '#f7f3e9',
        'garden-surface': '#fffdf7',
        'garden-border': '#e8e4d9',
        'garden-text': '#3d3d3d',
        'garden-heading': '#2f3e2f',
        'garden-accent': '#5c7c55',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: 创建 src/styles/global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #c9d1d9;
  --heading: #f0f6fc;
  --accent: #58a6ff;
}

html.garden {
  --bg: #f7f3e9;
  --surface: #fffdf7;
  --border: #e8e4d9;
  --text: #3d3d3d;
  --heading: #2f3e2f;
  --accent: #5c7c55;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
}

a {
  color: var(--accent);
}

h1, h2, h3, h4 {
  color: var(--heading);
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tailwind.config.mjs src/styles/global.css .gitignore
git commit -m "chore: add Tailwind CSS and D3 dependencies"
```

---

## Phase 2: 内容读取与类型定义

### Task 3: 定义 TypeScript 类型

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: 编写类型定义**

```typescript
export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  defaultTheme: 'dark' | 'garden';
  themes: Array<'dark' | 'garden'>;
}

export interface TopicMeta {
  title: string;
  description: string;
  order: number;
  icon?: string;
  tags?: string[];
}

export type LearningStatus = 'learning' | 'reviewing' | 'mastered' | 'not-started';

export interface NoteFrontmatter {
  title: string;
  created: string;
  updated?: string;
  status: LearningStatus;
  tags?: string[];
  reviewable?: boolean;
}

export interface MindmapNode {
  id: string;
  label: string;
  noteRef?: string;
  collapsed?: boolean;
  children?: MindmapNode[];
}

export interface MindmapData {
  title: string;
  subtitle?: string;
  root: MindmapNode;
  layout?: 'right' | 'left' | 'radial';
  theme?: string;
  nodeStyle?: Record<string, { fill?: string; stroke?: string }>;
}

export interface Chapter {
  id: string;
  slug: string;
  title: string;
  order: number;
  topicSlug: string;
  note?: {
    rawContent: string;
    frontmatter: NoteFrontmatter;
    headings: Array<{ text: string; slug: string; depth: number }>;
  };
  mindmap?: MindmapData;
  hasNote: boolean;
  hasMindmap: boolean;
}

export interface Topic {
  slug: string;
  meta: TopicMeta;
  chapters: Chapter[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript types for content and mindmap"
```

---

### Task 4: 创建示例内容

**Files:**
- Create: `content/site.json`
- Create: `content/redis/meta.json`
- Create: `content/redis/01-data-structures/note.md`
- Create: `content/redis/01-data-structures/mindmap.json`
- Create: `content/redis/99-redis-overview/mindmap.json`

- [ ] **Step 1: 创建站点配置**

`content/site.json`:
```json
{
  "title": "My Knowledge Base",
  "description": "个人学习笔记与思维导图",
  "author": "QiHao",
  "defaultTheme": "dark",
  "themes": ["dark", "garden"]
}
```

- [ ] **Step 2: 创建 Redis 主题元数据**

`content/redis/meta.json`:
```json
{
  "title": "Redis",
  "description": "Redis 高性能键值数据库学习笔记",
  "order": 1,
  "icon": "🚀",
  "tags": ["database", "cache"]
}
```

- [ ] **Step 3: 创建示例笔记**

`content/redis/01-data-structures/note.md`:
```markdown
---
title: Redis 数据结构
created: 2026-07-15
updated: 2026-07-15
status: learning
tags: [redis, cache, data-structure]
reviewable: true
---

# Redis 数据结构

Redis 支持多种数据结构，每种结构都有其特定的使用场景。

## String

String 是 Redis 最基础的数据类型，底层使用 SDS（简单动态字符串）实现。

- 二进制安全
- O(1) 获取长度
- 避免缓冲区溢出

## Hash

Hash 适合存储对象，例如用户信息。

## List

List 是双向链表，适合实现队列和栈。
```

- [ ] **Step 4: 创建示例思维导图**

`content/redis/01-data-structures/mindmap.json`:
```json
{
  "title": "Redis 数据结构",
  "subtitle": "String / Hash / List / Set / Sorted Set",
  "root": {
    "id": "root",
    "label": "Redis 数据结构",
    "noteRef": "/my-note/redis/01-data-structures/",
    "collapsed": false,
    "children": [
      {
        "id": "string",
        "label": "String",
        "noteRef": "/my-note/redis/01-data-structures/#string",
        "collapsed": false,
        "children": [
          { "id": "sds", "label": "SDS 简单动态字符串" },
          { "id": "use-case", "label": "使用场景：缓存、计数器" }
        ]
      },
      {
        "id": "hash",
        "label": "Hash",
        "noteRef": "/my-note/redis/01-data-structures/#hash",
        "children": [
          { "id": "hash-use", "label": "适合存储对象" }
        ]
      },
      {
        "id": "list",
        "label": "List",
        "children": [
          { "id": "list-use", "label": "队列 / 栈" }
        ]
      }
    ]
  },
  "layout": "right",
  "theme": "tech"
}
```

- [ ] **Step 5: 创建综合导图**

`content/redis/99-redis-overview/mindmap.json`:
```json
{
  "title": "Redis 知识地图",
  "subtitle": "数据结构 · 持久化 · 主从复制 · 集群",
  "root": {
    "id": "root",
    "label": "Redis",
    "collapsed": false,
    "children": [
      { "id": "data-structures", "label": "数据结构" },
      { "id": "persistence", "label": "持久化" },
      { "id": "replication", "label": "主从复制" }
    ]
  },
  "layout": "right",
  "theme": "tech"
}
```

- [ ] **Step 6: Commit**

```bash
git add content/
git commit -m "feat: add sample Redis content"
```

---

### Task 5: 实现内容读取函数

**Files:**
- Create: `src/lib/content.ts`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: 创建工具函数**

`src/lib/utils.ts`:
```typescript
export function slugFromDirname(dirname: string): string {
  return dirname.replace(/^\d+-/, '');
}

export function orderFromDirname(dirname: string): number {
  const match = dirname.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : 999;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

- [ ] **Step 2: 实现 content.ts**

```typescript
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import type {
  SiteConfig,
  TopicMeta,
  Chapter,
  Topic,
  NoteFrontmatter,
  MindmapData,
} from './types';
import { orderFromDirname, slugFromDirname } from './utils';

const CONTENT_DIR = path.resolve(process.cwd(), 'content');

export function getSiteConfig(): SiteConfig {
  const configPath = path.join(CONTENT_DIR, 'site.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as SiteConfig;
}

export function getTopics(): Topic[] {
  const entries = fs.readdirSync(CONTENT_DIR, { withFileTypes: true });
  const topics: Topic[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const topicSlug = entry.name;
    const topicPath = path.join(CONTENT_DIR, topicSlug);
    const metaPath = path.join(topicPath, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as TopicMeta;
    const chapters = getChapters(topicSlug);

    topics.push({ slug: topicSlug, meta, chapters });
  }

  return topics.sort((a, b) => a.meta.order - b.meta.order);
}

export function getChapters(topicSlug: string): Chapter[] {
  const topicPath = path.join(CONTENT_DIR, topicSlug);
  const entries = fs.readdirSync(topicPath, { withFileTypes: true });
  const chapters: Chapter[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dirname = entry.name;
    const slug = slugFromDirname(dirname);
    const order = orderFromDirname(dirname);
    const chapterPath = path.join(topicPath, dirname);

    const notePath = path.join(chapterPath, 'note.md');
    const mindmapPath = path.join(chapterPath, 'mindmap.json');

    const hasNote = fs.existsSync(notePath);
    const hasMindmap = fs.existsSync(mindmapPath);

    if (!hasNote && !hasMindmap) continue;

    let note: Chapter['note'] | undefined;
    if (hasNote) {
      const raw = fs.readFileSync(notePath, 'utf-8');
      const parsed = matter(raw);
      const frontmatter = parsed.data as NoteFrontmatter;
      const headings = extractHeadings(parsed.content);

      note = {
        rawContent: parsed.content,
        frontmatter,
        headings,
      };
    }

    let mindmap: MindmapData | undefined;
    if (hasMindmap) {
      const raw = fs.readFileSync(mindmapPath, 'utf-8');
      mindmap = JSON.parse(raw) as MindmapData;
    }

    const title = note?.frontmatter.title ?? mindmap?.title ?? slug;

    chapters.push({
      id: `${topicSlug}/${slug}`,
      slug,
      title,
      order,
      topicSlug,
      note,
      mindmap,
      hasNote,
      hasMindmap,
    });
  }

  return chapters.sort((a, b) => a.order - b.order);
}

function extractHeadings(content: string): Array<{ text: string; slug: string; depth: number }> {
  const tree = remark().use(remarkParse).parse(content);
  const headings: Array<{ text: string; slug: string; depth: number }> = [];

  visit(tree, 'heading', (node: any) => {
    const text = node.children
      .filter((child: any) => child.type === 'text')
      .map((child: any) => child.value)
      .join('');
    const slug = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9一-龥-]/g, '');
    headings.push({ text, slug, depth: node.depth });
  });

  return headings;
}

export function getTopicBySlug(slug: string): Topic | undefined {
  return getTopics().find((t) => t.slug === slug);
}

export function getChapterBySlug(topicSlug: string, chapterSlug: string): Chapter | undefined {
  const topic = getTopicBySlug(topicSlug);
  if (!topic) return undefined;
  return topic.chapters.find((c) => c.slug === chapterSlug);
}
```

- [ ] **Step 3: 安装 gray-matter 和 remark 依赖**

Run:
```bash
npm install gray-matter remark remark-parse unist-util-visit
npm install -D @types/unist
```

- [ ] **Step 4: 验证内容读取**

创建一个临时测试脚本 `scripts/test-content.ts`:
```typescript
import { getTopics, getSiteConfig } from '../src/lib/content';

console.log('Site config:', getSiteConfig());
console.log('Topics:', JSON.stringify(getTopics(), null, 2));
```

Run:
```bash
npx tsx scripts/test-content.ts
```

Expected: 输出站点配置和 Redis 主题及其章节信息。

- [ ] **Step 5: Commit**

```bash
rm scripts/test-content.ts
git add src/lib/content.ts src/lib/utils.ts package.json package-lock.json
git commit -m "feat: implement content reader with topic and chapter parsing"
```

---

## Phase 3: 布局与页面

### Task 6: 创建基础布局

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/ThemeToggle.astro`
- Create: `src/components/Sidebar.astro`

- [ ] **Step 1: 创建 ThemeToggle.astro**

```astro
---
const { defaultTheme } = Astro.props;
---

<button
  id="theme-toggle"
  class="rounded-lg p-2 text-sm font-medium transition-colors hover:bg-[var(--surface)]"
  aria-label="切换主题"
  data-default={defaultTheme}
>
  <span class="dark-only">🌙</span>
  <span class="garden-only">🌿</span>
</button>

<script>
  (function () {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const defaultTheme = toggle.dataset.default || 'dark';
    const stored = localStorage.getItem('theme');
    const theme = stored || defaultTheme;
    document.documentElement.classList.add(theme);

    toggle.addEventListener('click', () => {
      const isGarden = document.documentElement.classList.contains('garden');
      const next = isGarden ? 'dark' : 'garden';
      document.documentElement.classList.remove('dark', 'garden');
      document.documentElement.classList.add(next);
      localStorage.setItem('theme', next);
    });
  })();
</script>

<style>
  html.dark .garden-only,
  html.garden .dark-only {
    display: none;
  }
</style>
```

- [ ] **Step 2: 创建 Sidebar.astro**

```astro
---
import { getTopics, getSiteConfig } from '../lib/content';

const topics = getTopics();
const currentTopic = Astro.params.topic as string | undefined;
const currentChapter = Astro.params.chapter as string | undefined;
const config = getSiteConfig();
---

<aside
  id="sidebar"
  class="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transform border-r border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 md:static md:translate-x-0"
>
  <div class="flex h-full flex-col p-4">
    <a href={import.meta.env.BASE_URL || '/'} class="mb-6 text-lg font-semibold text-[var(--heading)]">
      {config.title}
    </a>

    <nav class="flex-1 space-y-6 overflow-y-auto">
      {topics.map((topic) => (
        <div>
          <a
            href={`${import.meta.env.BASE_URL || ''}/${topic.slug}/`}
            class={`block text-sm font-medium ${currentTopic === topic.slug ? 'text-[var(--accent)]' : 'text-[var(--heading)]'}`}
          >
            {topic.meta.icon && <span class="mr-2">{topic.meta.icon}</span>}
            {topic.meta.title}
          </a>

          {currentTopic === topic.slug && (
            <ul class="mt-2 space-y-1 border-l border-[var(--border)] pl-3">
              {topic.chapters.map((chapter) => (
                <li>
                  <a
                    href={`${import.meta.env.BASE_URL || ''}/${topic.slug}/${chapter.slug}/`}
                    class={`block text-xs ${currentChapter === chapter.slug ? 'text-[var(--accent)]' : 'text-[var(--text)] hover:text-[var(--heading)]'}`}
                  >
                    {chapter.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  </div>
</aside>

<button
  id="sidebar-toggle"
  class="fixed left-4 top-4 z-50 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2 text-[var(--text)] md:hidden"
  aria-label="打开导航"
>
  ☰
</button>

<script>
  (function () {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
    });

    sidebar.addEventListener('click', (e) => {
      if (e.target instanceof HTMLAnchorElement) {
        sidebar.classList.add('-translate-x-full');
      }
    });
  })();
</script>
```

- [ ] **Step 3: 创建 BaseLayout.astro**

```astro
---
import '../styles/global.css';
import { getSiteConfig } from '../lib/content';
import Sidebar from '../components/Sidebar.astro';
import ThemeToggle from '../components/ThemeToggle.astro';

const config = getSiteConfig();
const { title, description } = Astro.props;
const pageTitle = title ? `${title} · ${config.title}` : config.title;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description || config.description} />
    <title>{pageTitle}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <script is:inline>
      (function () {
        const theme = localStorage.getItem('theme');
        const defaultTheme = 'dark';
        document.documentElement.classList.add(theme || defaultTheme);
      })();
    </script>
  </head>
  <body class="min-h-screen">
    <div class="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <div class="flex flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3 md:px-8">
          <span class="text-sm text-[var(--text)] md:hidden">{config.title}</span>
          <div class="flex-1"></div>
          <ThemeToggle defaultTheme={config.defaultTheme} />
        </header>
        <main class="flex-1 p-6 md:p-10">
          <slot />
        </main>
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/ThemeToggle.astro src/components/Sidebar.astro
git commit -m "feat: add base layout, sidebar and theme toggle"
```

---

### Task 7: 实现首页和主题页

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/[topic].astro`
- Create: `src/components/ChapterCard.astro`

- [ ] **Step 1: 更新首页 index.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getTopics } from '../lib/content';

const topics = getTopics();
---

<BaseLayout title="首页">
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-4 text-3xl font-bold text-[var(--heading)]">学习主题</h1>
    <p class="mb-8 text-[var(--text)]">选择一个主题开始复习。</p>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <a
          href={`${import.meta.env.BASE_URL || ''}/${topic.slug}/`}
          class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-transform hover:-translate-y-0.5 hover:border-[var(--accent)]"
        >
          <div class="mb-2 text-2xl">{topic.meta.icon || '📚'}</div>
          <h2 class="text-lg font-semibold text-[var(--heading)]">{topic.meta.title}</h2>
          <p class="mt-1 text-sm text-[var(--text)]">{topic.meta.description}</p>
          <div class="mt-3 text-xs text-[var(--text)]">
            {topic.chapters.length} 个章节 · {topic.chapters.filter((c) => c.hasMindmap).length} 张导图
          </div>
        </a>
      ))}
    </div>
  </div>
</BaseLayout>
```

- [ ] **Step 2: 创建 ChapterCard.astro**

```astro
---
import type { Chapter } from '../lib/types';

interface Props {
  chapter: Chapter;
  topicSlug: string;
}

const { chapter, topicSlug } = Astro.props;
const base = import.meta.env.BASE_URL || '';
---

<div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]">
  <h3 class="text-base font-semibold text-[var(--heading)]">{chapter.title}</h3>
  <div class="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text)]">
    {chapter.hasNote && <span>📝 笔记</span>}
    {chapter.hasMindmap && <span>🧠 导图</span>}
    {chapter.note?.frontmatter.status && (
      <span class={`rounded px-1.5 py-0.5 ${chapter.note.frontmatter.status === 'mastered' ? 'bg-green-900 text-green-100' : chapter.note.frontmatter.status === 'learning' ? 'bg-blue-900 text-blue-100' : 'bg-gray-700 text-gray-100'}`}>
        {chapter.note.frontmatter.status === 'learning' ? '学习中' : chapter.note.frontmatter.status === 'mastered' ? '已掌握' : chapter.note.frontmatter.status === 'reviewing' ? '复习中' : '未开始'}
      </span>
    )}
  </div>
  <div class="mt-4 flex gap-3">
    {chapter.hasNote && (
      <a href={`${base}/${topicSlug}/${chapter.slug}/`} class="text-sm font-medium hover:underline">
        阅读笔记 →
      </a>
    )}
    {chapter.hasMindmap && (
      <a href={`${base}/${topicSlug}/${chapter.slug}/?view=mindmap`} class="text-sm font-medium hover:underline">
        查看导图 →
      </a>
    )}
  </div>
</div>
```

- [ ] **Step 3: 创建主题页 [topic].astro**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ChapterCard from '../../components/ChapterCard.astro';
import { getTopics } from '../../lib/content';

export function getStaticPaths() {
  const topics = getTopics();
  return topics.map((topic) => ({ params: { topic: topic.slug }, props: { topic } }));
}

const { topic } = Astro.props;
---

<BaseLayout title={topic.meta.title} description={topic.meta.description}>
  <div class="mx-auto max-w-4xl">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--heading)]">
        {topic.meta.icon && <span class="mr-2">{topic.meta.icon}</span>}
        {topic.meta.title}
      </h1>
      <p class="mt-2 text-[var(--text)]">{topic.meta.description}</p>
    </div>

    <h2 class="mb-4 text-xl font-semibold text-[var(--heading)]">章节</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      {topic.chapters.map((chapter) => (
        <ChapterCard chapter={chapter} topicSlug={topic.slug} />
      ))}
    </div>
  </div>
</BaseLayout>
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/pages/[topic].astro src/components/ChapterCard.astro
git commit -m "feat: add homepage and topic page"
```

---

### Task 8: 实现章节页

**Files:**
- Create: `src/pages/[topic]/[chapter].astro`
- Create: `src/components/ViewToggle.astro`
- Modify: `astro.config.mjs`（启用 shiki 代码高亮）

- [ ] **Step 1: 创建 ViewToggle.astro**

```astro
---
interface Props {
  activeView: 'note' | 'mindmap';
  noteHref: string;
  mindmapHref: string;
}

const { activeView, noteHref, mindmapHref } = Astro.props;
const base = import.meta.env.BASE_URL || '';
---

<div class="mb-6 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
  <a
    href={`${base}${noteHref}`}
    class={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeView === 'note' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)] hover:text-[var(--heading)]'}`}
  >
    笔记
  </a>
  <a
    href={`${base}${mindmapHref}`}
    class={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeView === 'mindmap' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text)] hover:text-[var(--heading)]'}`}
  >
    思维导图
  </a>
</div>
```

- [ ] **Step 2: 创建章节页 [chapter].astro**

```astro
---
import { Markdown } from 'astro/components';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ViewToggle from '../../components/ViewToggle.astro';
import MindmapViewer from '../../components/MindmapViewer.astro';
import MindmapSVG from '../../components/MindmapSVG.astro';
import { getTopics } from '../../lib/content';

export function getStaticPaths() {
  const topics = getTopics();
  const paths: any[] = [];
  for (const topic of topics) {
    for (const chapter of topic.chapters) {
      paths.push({
        params: { topic: topic.slug, chapter: chapter.slug },
        props: { topic, chapter },
      });
    }
  }
  return paths;
}

const { topic, chapter } = Astro.props;
const searchParams = new URL(Astro.request.url).searchParams;
const view = searchParams.get('view') === 'mindmap' ? 'mindmap' : 'note';
const base = import.meta.env.BASE_URL || '';

const noteHref = `/${topic.slug}/${chapter.slug}/`;
const mindmapHref = `/${topic.slug}/${chapter.slug}/?view=mindmap`;
---

<BaseLayout title={chapter.title}>
  <div class="mx-auto max-w-5xl">
    <div class="mb-6">
      <div class="text-sm text-[var(--text)]">
        {topic.meta.title} / {chapter.title}
      </div>
      <h1 class="mt-2 text-3xl font-bold text-[var(--heading)]">{chapter.title}</h1>
      {chapter.note?.frontmatter.tags && (
        <div class="mt-3 flex flex-wrap gap-2">
          {chapter.note.frontmatter.tags.map((tag) => (
            <span class="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text)]">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>

    {chapter.hasNote && chapter.hasMindmap && (
      <ViewToggle activeView={view} noteHref={noteHref} mindmapHref={mindmapHref} />
    )}

    {view === 'note' && chapter.note && (
      <article class="prose prose-invert max-w-none prose-headings:text-[var(--heading)] prose-p:text-[var(--text)] prose-a:text-[var(--accent)] prose-code:text-[var(--accent)]">
        <Markdown content={chapter.note.rawContent} />
      </article>
    )}

    {view === 'mindmap' && chapter.mindmap && (
      <div>
        <MindmapViewer data={chapter.mindmap} />
        <MindmapSVG data={chapter.mindmap} />
      </div>
    )}
  </div>
</BaseLayout>
```

- [ ] **Step 3: 更新 astro.config.mjs 启用 Markdown 代码高亮**

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://qihahoo.github.io',
  base: '/my-note',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/[topic]/[chapter].astro src/components/ViewToggle.astro astro.config.mjs
git commit -m "feat: add chapter page with note and mindmap tabs"
```

---

## Phase 4: 思维导图组件

### Task 9: 实现交互式 D3 思维导图

**Files:**
- Create: `src/components/MindmapViewer.astro`
- Create: `src/lib/mindmap.ts`

- [ ] **Step 1: 实现 D3 布局辅助函数**

`src/lib/mindmap.ts`:
```typescript
import type { MindmapData, MindmapNode } from './types';
import { hierarchy, tree } from 'd3-hierarchy';

export interface RenderedNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  noteRef?: string;
  collapsed: boolean;
  children?: RenderedNode[];
}

export function buildHierarchy(data: MindmapData) {
  const root = hierarchy<MindmapNode>(data.root, (d) => d.children);
  const layout = tree<MindmapNode>().nodeSize([40, 180]);
  layout(root);
  return root;
}

export function flattenNodes(root: any): RenderedNode[] {
  const nodes: RenderedNode[] = [];
  root.each((node: any) => {
    nodes.push({
      id: node.data.id,
      label: node.data.label,
      x: node.x,
      y: node.y,
      depth: node.depth,
      noteRef: node.data.noteRef,
      collapsed: node.data.collapsed ?? false,
    });
  });
  return nodes;
}

export function getLinks(root: any): Array<{ source: any; target: any }> {
  return root.links().map((link: any) => ({
    source: { x: link.source.x, y: link.source.y },
    target: { x: link.target.x, y: link.target.y },
  }));
}

export function getDefaultColors(depth: number, theme: string = 'tech') {
  if (theme === 'garden') {
    const colors = ['#5c7c55', '#7d9b76', '#a3b899'];
    return colors[depth % colors.length];
  }
  const colors = ['#58a6ff', '#238636', '#8957e5', '#d29922'];
  return colors[depth % colors.length];
}
```

- [ ] **Step 2: 创建 MindmapViewer.astro**

```astro
---
import type { MindmapData } from '../lib/types';

interface Props {
  data: MindmapData;
}

const { data } = Astro.props;
const dataJson = JSON.stringify(data);
---

<div class="relative mb-4">
  <div class="absolute right-0 top-0 z-10 flex gap-2">
    <button id="mm-reset" class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text)]">重置视图</button>
    <button id="mm-toggle-mode" class="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--text)]">切换到 SVG</button>
  </div>
  <div id="mindmap-canvas" class="h-[500px] w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]" data-mindmap={dataJson}></div>
</div>

<script>
  import * as d3 from 'd3';
  import { hierarchy, tree, zoom, select, linkHorizontal } from 'd3';

  (function () {
    const container = document.getElementById('mindmap-canvas');
    if (!container) return;

    const data = JSON.parse(container.dataset.mindmap || '{}');
    if (!data.root) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    const g = svg.append('g').attr('transform', `translate(${width * 0.15},${height * 0.5})`);

    const zoomBehavior = zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    svg.call(zoomBehavior as any);

    const root = hierarchy(data.root, (d) => d.children);
    const treeLayout = tree().size([height * 0.8, width * 0.65]);
    treeLayout(root);

    const linkGen = linkHorizontal()
      .x((d: any) => d.y)
      .y((d: any) => d.x);

    g.selectAll('path.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', 'var(--text)')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1.5)
      .attr('d', (d: any) => linkGen(d as any));

    const nodes = g
      .selectAll('g.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: any) => {
        if (d.data.noteRef) {
          window.location.href = d.data.noteRef;
        }
      });

    nodes
      .append('rect')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('x', -8)
      .attr('y', (d: any) => -12 - d.depth * 2)
      .attr('height', 24)
      .attr('width', (d: any) => d.data.label.length * 14 + 20)
      .attr('fill', (d: any) => {
        const colors = ['#58a6ff', '#238636', '#8957e5', '#d29922'];
        const isGarden = document.documentElement.classList.contains('garden');
        const gardenColors = ['#5c7c55', '#7d9b76', '#a3b899', '#c4d4b8'];
        return isGarden ? gardenColors[d.depth % gardenColors.length] : colors[d.depth % colors.length];
      })
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 1);

    nodes
      .append('text')
      .attr('dy', 4)
      .attr('x', 6)
      .attr('fill', '#fff')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text((d: any) => d.data.label);

    document.getElementById('mm-reset')?.addEventListener('click', () => {
      svg.transition().duration(300).call(zoomBehavior.transform as any, d3.zoomIdentity.translate(width * 0.15, height * 0.5).scale(1));
    });
  })();
</script>
```

- [ ] **Step 3: 安装 d3-hierarchy 依赖**

`d3` 已经安装，但代码里用到了 `d3-hierarchy`、`d3-zoom` 等子包。完整 `d3` 包已包含所有子包，所以不需要额外安装。

- [ ] **Step 4: Commit**

```bash
git add src/components/MindmapViewer.astro src/lib/mindmap.ts
git commit -m "feat: add interactive D3 mindmap viewer"
```

---

### Task 10: 实现 SVG 静态思维导图

**Files:**
- Create: `src/components/MindmapSVG.astro`

- [ ] **Step 1: 服务端渲染 SVG**

```astro
---
import { buildHierarchy, flattenNodes, getLinks, getDefaultColors } from '../lib/mindmap';
import type { MindmapData } from '../lib/types';

interface Props {
  data: MindmapData;
}

const { data } = Astro.props;
const root = buildHierarchy(data);
const nodes = flattenNodes(root);
const links = getLinks(root);

const width = 800;
const height = 500;
const offsetX = 120;
const offsetY = height / 2;
---

<div id="mindmap-svg-wrapper" class="hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
  <svg viewBox={`0 0 ${width} ${height}`} class="h-auto w-full">
    <g transform={`translate(${offsetX}, ${offsetY})`}>
      {links.map((link) => (
        <path
          d={`M ${link.source.y} ${link.source.x} C ${(link.source.y + link.target.y) / 2} ${link.source.x}, ${(link.source.y + link.target.y) / 2} ${link.target.x}, ${link.target.y} ${link.target.x}`}
          fill="none"
          stroke="var(--text)"
          stroke-opacity="0.3"
          stroke-width="1.5"
        />
      ))}
      {nodes.map((node) => (
        <g transform={`translate(${node.y}, ${node.x})`}>
          <rect
            x="-8"
            y="-12"
            rx="6"
            ry="6"
            width={node.label.length * 14 + 20}
            height="24"
            fill={getDefaultColors(node.depth, data.theme)}
            stroke="var(--border)"
          />
          <text x="6" y="4" fill="#fff" font-size="12" font-weight="500">
            {node.label}
          </text>
        </g>
      ))}
    </g>
  </svg>
</div>

<script>
  (function () {
    const toggle = document.getElementById('mm-toggle-mode');
    const canvas = document.getElementById('mindmap-canvas');
    const svgWrapper = document.getElementById('mindmap-svg-wrapper');
    if (!toggle || !canvas || !svgWrapper) return;

    let isSvg = false;
    toggle.addEventListener('click', () => {
      isSvg = !isSvg;
      canvas.style.display = isSvg ? 'none' : 'block';
      svgWrapper.classList.toggle('hidden', !isSvg);
      toggle.textContent = isSvg ? '切换到交互式' : '切换到 SVG';
    });
  })();
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MindmapSVG.astro
git commit -m "feat: add SVG mindmap and viewer toggle"
```

---

## Phase 5: 样式细化与响应式

### Task 11: 完善主题 CSS 和 Markdown 样式

**Files:**
- Modify: `src/styles/global.css`
- Create: `src/styles/theme-dark.css`
- Create: `src/styles/theme-garden.css`

- [ ] **Step 1: 拆分主题变量文件**

`src/styles/theme-dark.css`:
```css
html.dark {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #c9d1d9;
  --heading: #f0f6fc;
  --accent: #58a6ff;
  --code-bg: #161b22;
}
```

`src/styles/theme-garden.css`:
```css
html.garden {
  --bg: #f7f3e9;
  --surface: #fffdf7;
  --border: #e8e4d9;
  --text: #3d3d3d;
  --heading: #2f3e2f;
  --accent: #5c7c55;
  --code-bg: #f0ece1;
}
```

- [ ] **Step 2: 更新 global.css**

```css
@import './theme-dark.css';
@import './theme-garden.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #c9d1d9;
  --heading: #f0f6fc;
  --accent: #58a6ff;
  --code-bg: #161b22;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;
}

a {
  color: var(--accent);
}

h1, h2, h3, h4 {
  color: var(--heading);
}

.prose pre {
  background-color: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
}

.prose code {
  color: var(--accent);
  background-color: var(--code-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}

@media (max-width: 768px) {
  main {
    padding-top: 4rem;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/
git commit -m "style: refine dark and garden themes and markdown styles"
```

---

## Phase 6: 本地验证

### Task 12: 本地构建与预览

**Files:**
- 无新增文件

- [ ] **Step 1: 运行开发服务器**

Run:
```bash
npm run dev
```

Expected: 终端显示 `Local: http://localhost:4321/my-note/`

- [ ] **Step 2: 访问首页验证**

在浏览器打开 `http://localhost:4321/my-note/`

Expected:
- 看到 "My Knowledge Base" 标题
- 看到 Redis 主题卡片
- 点击卡片进入主题页
- 点击章节进入笔记/导图页

- [ ] **Step 3: 测试主题切换**

点击右上角主题按钮。

Expected:
- 页面在深色和暖色之间切换
- 切换后刷新页面仍保持选择

- [ ] **Step 4: 测试思维导图切换**

进入 Redis 数据结构章节，点击"思维导图" tab，再点击"切换到 SVG"。

Expected:
- 交互式导图显示节点和连线
- 可缩放、可点击节点跳转
- SVG 版本清晰展示静态导图

- [ ] **Step 5: 运行生产构建**

Run:
```bash
npm run build
```

Expected: `dist/` 目录生成，无报错。

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore: verify local dev and build"
```

---

## Phase 7: GitHub Actions 部署

### Task 13: 配置自动部署

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 创建工作流文件**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 在 GitHub 仓库开启 Pages**

手动操作：
1. 打开 `https://github.com/QiHaoo/my-note/settings/pages`
2. Source 选择 "GitHub Actions"
3. 保存

- [ ] **Step 3: Commit 并触发部署**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deployment workflow"
git push origin master
```

- [ ] **Step 4: 验证部署**

等待 Actions 运行完成，访问 `https://qihahoo.github.io/my-note/`。

Expected:
- 网站正常显示
- 主题切换、导图、SVG 切换均工作

---

## Phase 8: 大模型内容生成约定文档

### Task 14: 编写内容生成指南

**Files:**
- Create: `docs/content-guide.md`

- [ ] **Step 1: 创建指南**

```markdown
# 内容生成指南

## 新增一章内容的流程

1. 在 Obsidian 中整理学习笔记
2. 复制到 `content/<主题>/<章节>/note.md`
3. 让大模型根据笔记生成 `mindmap.json`
4. `git add`、`git commit`、`git push`

## 目录命名规则

- 主题目录：`redis`、`spring` 等，小写英文
- 章节目录：`01-data-structures`（数字前缀 + 英文 slug）
- 数字前缀决定排序
- 综合导图章节建议用 `99-overview`

## note.md 格式

```yaml
---
title: 章节标题
created: 2026-07-15
updated: 2026-07-15
status: learning
tags: [标签1, 标签2]
reviewable: true
---

# 章节标题

正文……
```

## mindmap.json 格式

大模型应根据笔记内容理解后生成，不要机械复制大纲。

```json
{
  "title": "导图标题",
  "subtitle": "副标题",
  "root": {
    "id": "root",
    "label": "中心主题",
    "noteRef": "/my-note/<主题>/<章节>/",
    "collapsed": false,
    "children": [
      {
        "id": "node-1",
        "label": "节点1",
        "noteRef": "/my-note/<主题>/<章节>/#对应锚点",
        "collapsed": false,
        "children": []
      }
    ]
  },
  "layout": "right",
  "theme": "tech"
}
```

## 注意事项

- `noteRef` 使用相对网站根路径的绝对路径，必须包含 `base` 前缀（如 `/my-note/redis/01-data-structures/`）
- 节点 `id` 必须唯一
- `collapsed` 控制默认折叠状态
- 不要直接生成 HTML/CSS/JS
```

- [ ] **Step 2: Commit**

```bash
git add docs/content-guide.md
git commit -m "docs: add content generation guide for LLM"
```

---

## 9. 自我审查

### 9.1 设计文档覆盖检查

| 设计文档章节 | 对应任务 |
|---|---|
| 嵌套式信息架构 | Task 6-8 |
| 目录与文件约定 | Task 4, 14 |
| note.md frontmatter | Task 3, 4 |
| mindmap.json 格式 | Task 3, 9, 10, 14 |
| 深色/暖色主题切换 | Task 2, 6, 11 |
| 响应式布局 | Task 6, 11 |
| GitHub Pages 部署 | Task 13 |
| 未来复习功能扩展 | Task 3（reviewable 字段预留） |

### 9.2 Placeholder 扫描

- 无 TBD/TODO
- 所有代码步骤包含完整代码
- 所有命令包含预期输出

### 9.3 类型一致性检查

- `MindmapData`、`MindmapNode` 在 `types.ts`、`mindmap.ts`、`MindmapViewer.astro`、`MindmapSVG.astro` 中一致
- `Chapter` 的 `note` 和 `mindmap` 字段在 `content.ts` 和页面组件中一致
- `base` 路径处理使用 `import.meta.env.BASE_URL` 统一

---

## 10. 执行交接

**Plan complete and saved to `docs/superpowers/plans/2026-07-17-personal-knowledge-site-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
