---
title: 容器技术要点回顾
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, container, image]
reviewable: true
module: container-basics
---

← 参见 主笔记：实战演练：玩转Docker

容器技术是后端应用领域的重大创新，它彻底变革了应用的开发、交付与部署方式，是"云原生"的根本。

## 发展脉络

- 容器基于 Linux 底层的 namespace、cgroup、chroot 等功能，虽然它们很早就出现了，但直到 Docker"横空出世"把它们整合在一起，容器才真正走近大众视野，逐渐为广大开发者所熟知
- 容器技术有很多具体实现，Docker 是最初也是最流行的容器技术，主要形态是运行在 Linux 上的 Docker Engine

## 三大核心概念

容器技术中有三个核心概念：容器（Container）、镜像（Image）、镜像仓库（Registry）。

### 容器

从本质上来说，容器属于虚拟化技术的一种，和虚拟机（Virtual Machine）很类似，都能够分拆系统资源、隔离应用进程，但容器更加轻量级，运行效率更高，比虚拟机更适合云计算的需求。

### 镜像

镜像是容器的静态形式，它把应用程序连同依赖的操作系统、配置文件、环境变量等等都打包到了一起，因而能够在任何系统上运行，免除了很多部署运维和平台迁移的麻烦。

镜像内部由多个层（Layer）组成，每一层都是一组文件，多个层会使用 Union FS 技术合并成一个文件系统供容器使用。这种细粒度结构的好处是相同的层可以共享、复用，节约磁盘存储和网络传输的成本，也让构建镜像的工作变得更加容易。

> 相同的层在 docker 里只会保存一份，多个镜像会共享复用，不会有多份；一个镜像可以启动多个容器，每个容器都会看到相同的层；删除镜像时如果层被其他镜像引用就不会删除。

### 镜像仓库

为了方便管理镜像，就出现了镜像仓库，它集中存放各种容器化的应用，用户可以任意上传下载，是分发镜像的最佳方式。目前最知名的公开镜像仓库是 Docker Hub，其他还有 quay.io、gcr.io。

## Docker 的形态与命令

Docker 的主要形态是运行在 Linux 上的 Docker Engine。我们日常使用的 `docker` 命令其实只是一个前端工具，它必须与后台服务 Docker daemon 通信才能实现各种功能。

| 类别 | 常用命令 |
|------|----------|
| 操作容器 | `docker ps`、`docker run`、`docker exec`、`docker stop` |
| 操作镜像 | `docker images`、`docker rmi`、`docker build`、`docker tag` |
| 操作镜像仓库 | `docker pull`、`docker push` |

> 容器运行时（Container Runtime）是一个计算机里比较通用的概念，比如 Java 运行时，可以理解成是一个底层支持库。
