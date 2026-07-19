---
title: 初识容器：万事开头难
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, container]
reviewable: true
module: container-basics
---

## Docker 的诞生

2013 年 3 月 15 日，dotCloud / Docker 公司创始人 Solomon Hykes 在 PyCon 大会上做了 5 分钟的闪电演讲 "The future of Linux Containers"，首次向世界展示了 Docker 技术，其中已包含**容器、镜像、隔离运行进程**等概念。

这段演讲是云原生大潮的开端。Docker 随后迅速流行，成为 GitHub 明星项目，并吸引 Amazon、Google、Red Hat 等大公司关注，最终催生了 Kubernetes。

## Docker 的形态

目前使用 Docker 有两个选择：

| 特性 | Docker Desktop | Docker Engine |
|------|----------------|---------------|
| 定位 | 个人使用 | 生产环境 |
| 平台 | Mac / Windows | 仅 Linux |
| 界面 | 图形界面 + 命令行 | 仅命令行 |
| 费用 | 个人学习免费，商用受限 | 完全免费 |
| 辅助工具 | 集成周边工具 | 需自行搭建 |

<div class="callout">
  <strong>注意</strong>：本课程若无特别声明，"Docker" 一词通常指 Docker Engine。
</div>

课程推荐 Docker Engine：它是 Docker 当初的真正形态，"血脉"最纯正，也是生产环境实际使用的产品；而 Docker Desktop 是商业产品，自带非通用内容，不利于后续 Kubernetes 学习。

## Docker 的安装

在 Ubuntu 系统上使用 apt 包管理工具安装：

```bash
sudo apt install -y docker.io
```

安装后需启动服务，并把当前用户加入 docker 组（操作 Docker 需 root 权限，加入用户组是官方推荐做法）：

```bash
sudo service docker start
sudo usermod -aG docker ${USER}
```

执行 `usermod` 后需 `exit` 退出系统再重新登录才会生效。验证安装：

- `docker version` — 输出客户端和服务器各自的版本信息
- `docker info` — 显示系统信息（CPU、内存、容器数量、镜像数量、存储驱动等）

-> 详见 Docker 安装与使用命令

## Docker 的使用

Docker 操作统一格式：`docker` 开头 + 子命令，可用 `help` / `--help` 查看帮助。核心命令：

| 命令 | 作用 |
|------|------|
| `docker ps` | 列出运行中的容器 |
| `docker ps -a` | 列出所有容器（含已停止） |
| `docker pull <镜像>` | 从远端镜像仓库拉取镜像 |
| `docker images` | 列出本地存储的所有镜像 |
| `docker run <镜像> <命令>` | 从镜像启动容器并执行命令 |

-> 详见 Docker 安装与使用命令

## Docker 的架构

Docker Engine 是典型的**客户端/服务器（C/S）架构**：

- **Docker client**：命令行工具 docker，面向用户，通过 build / pull / run 等命令向 daemon 发送请求
- **Docker daemon**：后台服务，容器和镜像的"大管家"，负责拉取镜像、存储镜像、生成容器、管理容器
- **Registry**：远端镜像仓库，客户端不能直接访问

真正干活的是后台的 Docker daemon，命令行工具只是"传声筒"。`docker run hello-world` 可演示完整的 client → daemon → Registry 工作流程。

-> 详见 Docker 的 C-S 架构

## 分笔记索引

- **Docker 安装与使用命令** — 安装步骤、验证命令（version / info）、常用命令速查
- **Docker 的 C-S 架构** — 客户端/服务器架构详解、三大角色职责、C/S 解耦价值
