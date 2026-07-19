---
title: 走近云原生：如何在本机搭建小巧完备的Kubernetes环境
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, minikube, 容器编排, 云原生]
reviewable: true
module: kubernetes-core
---

## 核心概念

容器技术只解决了应用的打包分发，面对大规模集群中复杂的生产环境需求（服务发现、负载均衡、健康检查、扩容缩容等）就力不从心了，解决之道是"容器编排"。Kubernetes 源自 Google 内部的 Borg 系统，是当前容器编排领域的事实标准。本讲通过 minikube + kubectl 在本机搭建一个完整但小巧的 Kubernetes 环境，迈出云原生的第一步。

## 什么是容器编排

容器技术的核心要素是容器、镜像、仓库，能完成应用的打包分发，实现"一次开发，到处运行"。但生产环境除安装外还有服务发现、负载均衡、状态监控、健康检查、扩容缩容、应用迁移、高可用等需求，规模上到几百台服务器、成千上万容器时，必须依靠计算机来调度管理。

- 容器之上的管理、调度工作即"容器编排"（Container Orchestration）
- 入门篇中手工给 Nginx、WordPress、MariaDB 三个容器理清次序、配好 IP 去运行，就是最初级的"容器编排"，纯手工、较粗糙
- Kubernetes 是目前计算机用来调度管理容器的事实上的标准

-> 详见 容器编排与 Kubernetes

## 什么是 Kubernetes

Kubernetes 源自 Google 内部的集群应用管理系统 Borg（底层支持整个公司运转，cgroup 也是 Google 开发再提交给 Linux 内核的）。

| 时间 | 事件 |
|------|------|
| 2014 年 | Google 内部系统从 Borg 切换到 Omega，借 Docker 的"东风"，把 C++ 开发的 Borg 系统用 Go 语言重写并开源，Kubernetes 诞生 |
| 2015 年 | Google 联合 Linux 基金会成立 CNCF（Cloud Native Computing Foundation，云原生基金会），把 Kubernetes 捐献出来作为种子项目 |
| 之后两年 | 打败竞争对手 Apache Mesos 和 Docker Swarm，成为容器编排领域唯一霸主 |

Kubernetes 背后有 Borg 十多年生产环境经验，技术底蕴深厚。它是一个生产级别的容器编排平台和集群管理系统，不仅能创建、调度容器，还能监控、管理服务器，让中小型公司也具备运维海量计算节点（即"云计算"）的能力。

-> 详见 容器编排与 Kubernetes

## 什么是 minikube

Kubernetes 一般运行在大规模集群上，对个人学习造成障碍。官网推荐两个本机搭建工具：kind 和 minikube。

| 工具 | 特点 | 评价 |
|------|------|------|
| kind | 基于 Docker，"Kubernetes in Docker"；功能少、用法简单、运行快、容易上手 | 缺少很多 Kubernetes 标准功能（仪表盘、网络插件），难定制化；适合有经验用户做快速开发测试，不适合学习研究。且名字与 YAML 字段 kind 重名，会误导初学者 |
| minikube | "迷你"版 Kubernetes；2016 年发布以来持续维护，紧跟版本更新也兼容旧版本（最多前 6 个小版本） | "小而美"，可执行文件不到 10MB，运行镜像约 1GB，却集成绝大多数功能特性和丰富插件（Dashboard、GPU、Ingress、Istio、Kong、Registry 等）-> 课程推荐 |

-> 详见 minikube 与 kubectl 工具

## 如何搭建 minikube 环境

minikube 支持 Mac、Windows、Linux，课程使用虚拟机里的 Linux。选定版本：minikube 1.25.2，Kubernetes 1.23.3。

- minikube 用 Go 语言开发，整体是一个二进制文件，没有多余依赖，用 curl/wget 下载即可
- 安装时注意硬件架构：Intel 芯片选 `amd64` 后缀，Apple M1 芯片选 `arm64` 后缀，选错会因 CPU 指令集不同无法运行

关键命令：

| 命令 | 作用 |
|------|------|
| `sudo install minikube /usr/local/bin/` | 安装 minikube |
| `minikube version` | 查看版本号，验证安装 |
| `minikube kubectl` | 下载与当前 Kubernetes 版本匹配的 kubectl，存放在内部目录（如 `.minikube/cache/linux/arm64/v1.23.3`） |

在 minikube 环境里会用两个客户端：minikube 管理 Kubernetes 集群环境，kubectl 操作实际的 Kubernetes 功能，比 Docker 复杂一些。

-> 详见 minikube 与 kubectl 工具

## 实际验证 minikube 环境

启动集群并验证环境：

| 命令 | 作用 |
|------|------|
| `minikube start --kubernetes-version=v1.23.3` | 从 Docker Hub 拉取镜像，以指定 Kubernetes 版本启动集群 |
| `minikube status` | 查看集群状态 |
| `minikube node list` | 查看节点列表 |
| `minikube ssh` | 登录到 minikube 节点 |
| `minikube kubectl -- version` | 使用 minikube 自带 kubectl 查看版本 |

集群只有一个节点，名字叫"minikube"，类型是 Control Plane，里面有 host、kubelet、apiserver 三个服务，IP 地址 192.168.49.2。

使用 minikube 自带的 kubectl 需加前缀和 `--`（如 `minikube kubectl -- version`），建议用 alias 简化：

```bash
alias kubectl="minikube kubectl --"
source <(kubectl completion bash)   # 命令自动补全
```

运行 Nginx 应用并查看 Pod：

```bash
kubectl run ngx --image=nginx:alpine
kubectl get pod
```

Pod 可暂时理解成"穿了马甲"的容器，`kubectl get pod` 效果类似 `docker ps`。

-> 详见 minikube 环境验证命令

## 云原生的理解

CNCF 对"云原生"有明确定义，作者给出通俗理解：

- "云"现在就指 Kubernetes
- "云原生"即应用的开发、部署、运维等一系列工作都要向 Kubernetes 看齐，使用容器、微服务、声明式 API 等技术，保证应用整个生命周期都能在 Kubernetes 环境里顺利实施，不需附加额外条件
- 换句话说，"云原生"是 Kubernetes 里的"原住民"，而不是从其他环境迁过来的"移民"

## 分笔记索引

- **容器编排与 Kubernetes** — 容器技术局限、容器编排概念、Kubernetes 由来与行业地位
- **minikube 与 kubectl 工具** — kind/minikube 对比、安装步骤、环境里的两个客户端
- **minikube 环境验证命令** — 启动集群、查看状态、运行 Nginx、常见问题排查
