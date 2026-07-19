---
title: Docker 的 C-S 架构
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, container]
reviewable: true
module: container-basics
---

← 参见 主笔记：初识容器：万事开头难

Docker Engine 是典型的客户端/服务器（C/S）架构。下面描述其内部角色和工作流程。

## 三大角色

| 角色 | 说明 |
|------|------|
| Docker client | 命令行工具 docker，直接面对用户，通过 build、pull、run 等命令向 daemon 发送请求 |
| Docker daemon | 后台服务，容器和镜像的"大管家"，负责从远端拉取镜像、本地存储镜像、从镜像生成容器、管理容器等所有功能 |
| Registry | 远端镜像仓库，镜像存储于此，client 不能直接访问 |

真正干活的是默默运行在后台的 Docker daemon，命令行工具 docker 只是"传声筒"。

数据流向可概括为：

- **Docker client** 通过 `build` / `pull` / `run` 命令 → **Docker daemon**
- **Docker daemon** 负责：存储本地镜像、生成并管理容器
- **Docker daemon** ⇄ **Registry**：本地没有镜像时从远端仓库拉取

## 工作流程

`docker run hello-world` 展示了 client → daemon → Registry 的完整流程：

1. client 向 daemon 发送 run 请求
2. daemon 先检查本地镜像
3. 本地没有则从远程仓库（Registry）拉取
4. 拉取后运行容器
5. 输出运行信息

## 为什么采用 C/S 架构

C/S 架构的核心价值是**解耦**（高内聚低耦合）：

- 功能模块分离，client 只负责通信，daemon 只负责数据处理，彼此独立、各自发展
- 利于分布式应用：可运行一个 docker daemon，多个客户端远程连接（类似 `redis-cli -h`）
- 旧模型中所有容器运行时逻辑都在 daemon 中实现，启动 / 停止 daemon 会导致宿主机上所有运行中的容器被杀掉；解耦后此问题迎刃而解，升级、维护更稳定

## Docker 与 containerd 的关系

- docker 是一整套产品，containerd 只是一个容器运行时
- Kubernetes 1.24 移除了 docker shim，不再使用 docker 作为容器运行时，大厂商逐渐切换到 containerd
- 但 docker 创建的镜像已是 OCI 标准，仍然可以在 Kubernetes 中运行；docker 仍是 Kubernetes 的基石之一
- runtime 可理解为下层的依赖库、运行时需要的基础设施，docker 的 runtime 一般是 runc
