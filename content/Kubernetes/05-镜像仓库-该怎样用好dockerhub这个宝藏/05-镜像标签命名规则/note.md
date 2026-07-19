---
title: 镜像标签命名规则
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, image]
reviewable: true
module: container-basics
---

← 参见 主笔记：镜像仓库：该怎样用好DockerHub这个宝藏

镜像有许多不同版本，即"标签"（tag）。直接使用默认的 `latest` 虽简单方便，但在生产环境是一种非常不负责任的做法，会导致版本不可控。需理解 Docker Hub 上标签命名的含义，才能挑选最适合自己的镜像版本。

以官方的 Redis 镜像为例解释标签含义。

## 标签格式

通常，镜像标签的格式是**应用的版本号 + 操作系统**。

### 版本号

基本上都是主版本号 + 次版本号 + 补丁号的形式，有的还会在正式发布前出 rc 版（候选版本，release candidate）。

### 操作系统

各 Linux 发行版命名方式多样：

- Alpine、CentOS 命名简单明了，就是数字版本号，如 `alpine3.15`
- Ubuntu、Debian 采用代号形式：
  - Ubuntu 18.04 是 bionic，Ubuntu 20.04 是 focal
  - Debian 9 是 stretch，Debian 10 是 buster，Debian 11 是 bullseye

### slim 与 fat

有的标签还会加上 `slim`、`fat`，进一步表示镜像内容是经过精简的，还是包含了较多辅助工具：

- `slim` 镜像较小，运行效率高
- `fat` 镜像较大，适合用来开发调试

## 标签示例

| 标签 | 含义 |
|------|------|
| `nginx:1.21.6-alpine` | 版本号 1.21.6，基础镜像是最新的 Alpine |
| `redis:7.0-rc-bullseye` | 版本号 7.0 候选版，基础镜像是 Debian 11 |
| `node:17-buster-slim` | 版本号 17，基础镜像是精简的 Debian 10 |
