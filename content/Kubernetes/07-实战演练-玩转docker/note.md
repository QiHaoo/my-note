---
title: 实战演练：玩转Docker
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, wordpress]
reviewable: true
module: container-basics
---

## 容器技术要点回顾

容器技术是后端应用领域的重大创新，彻底变革了应用的开发、交付与部署方式，是"云原生"的根本。

| 要点 | 说明 |
|------|------|
| 底层机制 | 基于 Linux 的 namespace、cgroup、chroot 等功能；Docker 把它们整合在一起，容器才走近大众视野 |
| 三大核心概念 | 容器（Container）、镜像（Image）、镜像仓库（Registry） |
| 容器 vs 虚拟机 | 容器属于虚拟化技术的一种，和虚拟机类似都能分拆系统资源、隔离进程，但更轻量、运行效率更高，更适合云计算 |
| 镜像 | 容器的静态形式，把应用连同依赖的 OS、配置文件、环境变量等打包到一起，能在任何系统上运行；内部由多个层（Layer）组成，用 Union FS 合并成一个文件系统，相同层可共享复用 |
| 镜像仓库 | 集中存放容器化应用，可任意上传下载，是分发镜像的最佳方式；最知名的是 Docker Hub，还有 quay.io、gcr.io |
| Docker 形态 | 最初也最流行的容器技术，主要形态是 Linux 上的 Docker Engine；`docker` 命令只是前端工具，须与后台 Docker daemon 通信 |

常用命令：操作容器有 `docker ps`、`docker run`、`docker exec`、`docker stop`；操作镜像有 `docker images`、`docker rmi`、`docker build`、`docker tag`；操作镜像仓库有 `docker pull`、`docker push`。

> 课程目标是 Kubernetes，Docker 只是众多容器运行时（Container Runtime）中最出名的一款，会用够用即可，不必深究内部架构细节和命令行参数。

-> 详见 容器技术要点回顾

## 搭建私有镜像仓库

第 5 讲曾提过离线环境可自建私有仓库，但当时还没学容器网络知识。现在具备完整的 Docker 知识体系，才能搭建私有仓库。本讲选最简单的 Docker Registry，功能更完善的 CNCF Harbor 留到后续学习 Kubernetes 时介绍。

搭建步骤：

1. `docker pull registry` 拉取镜像
2. `docker run -d -p 5000:5000 registry` 做端口映射对外暴露（容器内端口 5000，外面也用 5000）
3. `docker tag nginx:alpine 127.0.0.1:5000/nginx:alpine` 打标签——因上传目标不是默认 Docker Hub 而是本地私有仓库，镜像名前必须加仓库地址（域名或 IP），形式像 HTTP 的 URL
4. `docker push 127.0.0.1:5000/nginx:alpine` 推送
5. 验证：`docker rmi` 删掉打标签的镜像再 `docker pull` 重新下载

Docker Registry 虽无图形界面，但提供 RESTful API，可发 HTTP 请求查看仓库里的镜像：

```bash
curl 127.1:5000/v2/_catalog
curl 127.1:5000/v2/nginx/tags/list
```

-> 详见 搭建私有镜像仓库

## 搭建 WordPress 网站

WordPress 比较复杂，需要三个容器：WordPress、MariaDB、Nginx，都是流行开源项目，Docker Hub 上有官方镜像。

| 容器 | 角色 | 端口 |
|------|------|------|
| MariaDB | 后端关系型数据库 | 3306 |
| WordPress | 中间应用服务器，用 MariaDB 存数据 | 80 |
| Nginx | 前面反向代理，对外暴露 80，转发请求给 WordPress | 80（对外映射） |

部署要点：

- MariaDB 用 `--env` 配置 `MARIADB_DATABASE` 等环境变量（数据库、用户名、密码、root 密码）
- WordPress 用 `--env` 配置 `WORDPRESS_DB_HOST` 等连接 MariaDB，**`WORDPRESS_DB_HOST` 必须是 MariaDB 的 IP 地址**，否则无法连库
- Nginx 做反向代理前需用 `docker inspect` 查到 WordPress 的 IP，编写反向代理配置文件
- Nginx 容器用 `-p 80:80` 映射端口，用 `-v` 挂载配置文件到 `conf.d` 目录

由于 bridge 默认网段 172.17.0.0/16、宿主机固定 172.17.0.1、IP 顺序分配，若无其他容器，MariaDB 一般是 172.17.0.2、WordPress 是 172.17.0.3。

WordPress 和 MariaDB 虽用 80 和 3306 端口，但被容器隔离外界不可见，只有 Nginx 有端口映射能从外界 80 端口收发数据。打开浏览器输入本机 127.0.0.1 或虚拟机 IP 即可看到 WordPress 界面。

-> 详见 搭建 WordPress 网站

## 容器编排的引出

在感受容器便利的同时，它仍存在一些遗憾：

- 仍要手动运行命令启动应用，再人工确认运行状态
- 运行多个容器组成的应用比较麻烦，需要人工干预（如检查 IP 地址）才能维护网络通信
- 现有网络模式功能只适合单机，多台服务器上运行应用、负载均衡该怎么做
- 要增加应用数量该怎么办，这时容器技术完全帮不上忙

如果仔细整理这些 `docker run` 命令写成脚本，再加一些 Shell、Python 编程实现自动化，也许能得到一个勉强可用的方案。这个方案已超越容器技术本身，是在更高层次上规划容器的运行次序、网络连接、数据持久化等应用要素，即"容器编排"（Container Orchestration）的雏形，也是后续 Kubernetes 的主要出发点。

## 分笔记索引

- **容器技术要点回顾** — 发展脉络、三大核心概念、Docker 形态与常用命令
- **搭建私有镜像仓库** — 5 步搭建 Docker Registry、RESTful API 查看镜像
- **搭建 WordPress 网站** — 三容器网络架构、MariaDB/WordPress/Nginx 部署、用容器名替代 IP
