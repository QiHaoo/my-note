---
title: minikube 与 kubectl 工具
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, minikube, kubectl, 容器编排]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：走近云原生：如何在本机搭建小巧完备的Kubernetes环境

Kubernetes 一般运行在大规模计算集群上，管理严格，对个人学习造成障碍。Kubernetes 官网（https://kubernetes.io/zh/docs/tasks/tools/）推荐了两个本机搭建工具：kind 和 minikube。

## kind 与 minikube 的对比

| 工具 | 定位与特点 | 评价 |
|------|------------|------|
| kind | 基于 Docker，"Kubernetes in Docker"；功能少、用法简单、运行快、容易上手 | 缺少很多 Kubernetes 标准功能（如仪表盘、网络插件），很难定制化；适合有经验用户做快速开发测试，不太适合学习研究。名字与 Kubernetes YAML 字段 kind 重名，会对初学者造成误解 |
| minikube | "迷你"版 Kubernetes；2016 年发布以来持续维护，紧跟 Kubernetes 版本更新，也兼容较旧版本（最多前 6 个小版本） | "小而美"，可执行文件不到 10MB，运行镜像约 1GB，却集成 Kubernetes 绝大多数功能特性和丰富插件（Dashboard、GPU、Ingress、Istio、Kong、Registry 等）-> 课程推荐 |

## 安装 minikube

minikube 支持 Mac、Windows、Linux 三种主流平台，课程使用虚拟机里的 Linux。选定版本：minikube 1.25.2，支持的 Kubernetes 版本 1.23.3。

minikube 不在系统自带的 apt/yum 软件仓库里，需要自己下载。它用 Go 语言开发，整体是一个二进制文件，没有多余依赖，用 curl 或 wget 下载即可。

注意硬件架构：

- Intel 芯片选带 `amd64` 后缀
- Apple M1 芯片选 `arm64` 后缀
- 选错会因 CPU 指令集不同而无法运行

官网 Linux 系统安装命令（下载 + 拷贝两步）：

```bash
# Intel x86_64
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64

# Apple arm64
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-arm64

sudo install minikube /usr/local/bin/
```

验证安装：

```bash
minikube version
```

> 建议和作者保持 minikube 版本一致（1.25.2），最新版本下载不到对应 kicbase 镜像会有麻烦；学习不需要追新版本，Kubernetes 已经很稳定。指定版本下载：`curl -Lo minikube https://storage.googleapis.com/minikube/releases/v1.25.2/minikube-linux-amd64`。

## 安装 kubectl

minikube 只能搭建 Kubernetes 环境，要操作 Kubernetes 还需要专门的客户端工具 **kubectl**。

- kubectl 的作用类似学习容器技术时的 `docker`，是命令行工具，与 Kubernetes 后台服务通信，把命令转发给 Kubernetes，实现容器和集群管理
- kubectl 是与 Kubernetes、minikube 彼此独立的项目，不包含在 minikube 里
- minikube 提供了简化安装方式：

```bash
minikube kubectl
```

它会下载与当前 Kubernetes 版本匹配的 kubectl，存放在内部目录（如 `.minikube/cache/linux/arm64/v1.23.3`）。

## minikube 环境的两个客户端

在 minikube 环境里会用到两个客户端：

| 客户端 | 职责 |
|--------|------|
| minikube | 管理 Kubernetes 集群环境 |
| kubectl | 操作实际的 Kubernetes 功能 |

和 Docker 相比有点复杂。minikube 可理解成一个专门的集群节点管理工具。

### 环境示意

用户同时操作 minikube 和 kubectl 两个客户端：

- `minikube`（管理集群环境）：负责搭建 / 启停 Kubernetes 集群（即 minikube 节点）
- `kubectl`（操作 K8s 功能）：向集群发号施令

两者都作用于同一个 Kubernetes 集群（minikube 节点）。

> kubeadm 与 minikube 的区别：kubeadm 是 Kubernetes 的安装工具，minikube 是一个集成学习环境，中级篇会讲 kubeadm。minikube 用 docker 创建了一个 Kubernetes 集群，它不算后台服务，可理解成虚拟出一个计算节点，在里面运行 Kubernetes。
