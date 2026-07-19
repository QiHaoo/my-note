---
title: kubeadm 与实验环境架构
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, kubeadm, cluster]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：更真实的云原生：实际搭建多节点的Kubernetes集群

## 为什么需要 kubeadm

minikube 简单易用，但太"迷你"，隐藏了很多细节，离真正生产环境的计算集群有差距，许多需求、任务只有在多节点的大集群里才能遇到，相比之下只能算"玩具"。

多节点 Kubernetes 集群怎么从无到有创建？Kubernetes 的核心组件（apiserver、etcd、scheduler 等）本质上是可执行文件，可用 Shell 脚本或 Ansible 等工具打包发布到服务器。但这些组件的配置和相互关系太复杂，用 Shell、Ansible 部署难度很高，需要相当专业的运维知识。

为此社区出现了专门用来在集群中安装 Kubernetes 的工具 kubeadm（"Kubernetes 管理员"）。

## kubeadm 的原理与特点

- 原理与 minikube 类似，也用容器和镜像封装 Kubernetes 的各种组件
- 目标不是单机部署，而是轻松地在集群环境部署 Kubernetes，让集群接近甚至达到生产级质量
- 保持高水准的同时具备和 minikube 一样的易用性
- 只需很少几条命令（`init`、`join`、`upgrade`、`reset`）即可完成集群的管理维护工作
- 既适用于集群管理员，也适用于开发、测试人员

## 实验环境架构

3 台主机都用虚拟机软件（VirtualBox/VMware）虚拟出来，组成实验环境。多节点集群要求服务器有两台或更多，为简化取最小值，即两台主机（一台 Master、一台 Worker），掌握 kubeadm 用法后可添加更多节点。

实验环境由 3 个角色组成：

- **Console**（kubectl 控制台）：通过管理命令操作 Master
- **Master 节点**（apiserver / etcd / scheduler / controller-manager，2 核 4G）：与 Worker 之间以集群内部通信互联
- **Worker 节点**（业务应用，1 核 1G）：受 Master 管控，运行实际业务

### 节点配置

| 节点 | 角色 | 配置 | 运行组件 |
|------|------|------|----------|
| Master | 控制面，管理整个集群、运维监控应用 | 至少 2 核 CPU、4GB 内存 | apiserver、etcd、scheduler、controller-manager |
| Worker | 数据面，受 Master 管控，只运行业务应用 | 1 核 CPU、1GB 内存（低到不能再低） | kubelet、kube-proxy、container-runtime |
| Console | 控制台，所有管理命令从这里发出 | - | kubectl |

### Console 节点

基于模拟生产环境的考虑，集群之外还有一台起辅助作用的服务器 Console。要在上面安装命令行工具 kubectl，所有对 Kubernetes 集群的管理命令都从这台主机发出。这符合实际情况：出于安全原因，集群里的主机部署好后应尽量少直接登录操作。

Console 只是逻辑上的概念，不一定是独立的，实际安装时可复用之前 minikube 的虚拟机，或直接使用 Master/Worker 节点作为控制台。

### 网络要求

3 台主机共同组成实验环境，配置时必须注意网络选项，必须在同一个网段，使用同一个 "Host-Only"（VirtualBox）或"自定"（VMWare Fusion）网络。

> Console 是一个逻辑角色，可以和已有的机器重合。任何有 kubectl 的计算机都可以作为 Console，它理论上与 Kubernetes 无关，只要安装了 kubectl 和相应的 config、能和集群通信即可。
