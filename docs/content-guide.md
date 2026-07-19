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

正文……

## 二级标题

内容……
```

**注意**：`note.md` 正文里**不需要写一级标题 `# 章节标题`**，页面会自动用 `frontmatter.title` 作为标题。建议从二级标题 `##` 开始写内容。

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
