---
title: 自动化的运维管理：探究Kubernetes工作机制的奥秘
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, architecture, control-plane, apiserver]
reviewable: true
module: kubernetes-core
---

## 核心概念

Kubernetes 采用"控制面/数据面"（Control Plane / Data Plane）架构，可以看作一个集群级别的操作系统，功能非常完善，全自动实现了大部分常见的运维管理工作。它的节点由核心组件（Component）和选配插件（Addon）构成，Master 负责管理控制，Worker 负责运行业务，组件间通过 apiserver 互相协作，维护集群的健康状态。

## 云计算时代的操作系统

Kubernetes 既能管理软件（应用、进程），也能管理硬件（CPU、内存、硬盘、网卡），从某种角度看可以说是一个集群级别的操作系统，主要功能是资源管理和作业调度。但与 Linux 不同，它运行在多台服务器上，管理几百几千台计算资源及上百万进程，规模大得多。

| 维度 | Linux | Kubernetes |
|------|-------|------------|
| 管理范围 | 单机计算资源和进程 | 多台服务器的几百几千台计算资源及上百万进程 |
| 用户角色 | Dev 和 Ops 两类人 | 只有 DevOps 一类人 |

云原生兴起后，开发和运维的界限变得不再清晰：开发人员从一开始就要考虑后续的部署运维，运维人员也需要在早期介入开发。

## Kubernetes 的基本架构

Kubernetes 采用"控制面/数据面"（Control Plane / Data Plane）架构。集群里的计算机被称为"节点"（Node），可以是实机也可以是虚机。

| 角色 | 简称 | 职责 | 比喻 |
|------|------|------|------|
| Master Node | Master | 控制面节点，执行集群的管理维护工作 | Kubernetes 的大脑和心脏 |
| Worker Node | Worker / Node | 数据面节点，跑业务应用 | Kubernetes 的手和脚 |

Node 数量很多，构成一个资源池，Kubernetes 在池里分配资源、调度应用，资源被"池化"后管理变得简单，可任意添加或删除节点。kubectl 是 Kubernetes 的客户端工具，位于集群之外，理论上不属于集群。

- `kubectl get node` 查看节点状态
- Master 和 Node 的划分不是绝对的：集群规模小、工作负载少时，Master 也可承担 Node 工作（如 minikube 只有一个节点，既是 Master 又是 Node）

-> 详见 Kubernetes 的基本架构

## 节点内部的结构

Kubernetes 节点内部由很多模块构成，分为两类：

| 类别 | 说明 |
|------|------|
| 组件（Component） | 实现 Kubernetes 核心功能特性，没有这些组件 Kubernetes 无法启动 |
| 插件（Addon） | Kubernetes 的附加功能，"锦上添花"，不安装也不影响 Kubernetes 正常运行 |

### Master 里的组件（4 个）

| 组件 | 职责 | 比喻 |
|------|------|------|
| apiserver | Master 节点及整个 Kubernetes 系统的唯一入口，对外公开 RESTful API，带验证、授权功能，所有其他组件都只能和它直接通信 | 联络员 |
| etcd | 高可用的分布式 Key-Value 数据库，持久化存储系统里的各种资源对象和状态；只与 apiserver 有直接联系，任何组件读写 etcd 都必须经过 apiserver | 配置管理员 |
| scheduler | 检查节点资源状态，把 Pod 调度到最适合的节点上运行；节点状态和 Pod 信息存在 etcd 里，必须通过 apiserver 获得 | 部署人员 |
| controller-manager | 维护容器和节点等资源的状态，实现故障检测、服务迁移、应用伸缩等功能；也必须通过 apiserver 获得 etcd 里的信息 | 监控运维人员 |

这 4 个组件都被容器化，运行在集群的 Pod 里，用 `kubectl get pod -n kube-system` 查看（`-n kube-system` 表示检查 kube-system 名字空间里的 Pod）。

### Node 里的组件（3 个）

| 组件 | 职责 | 比喻 |
|------|------|------|
| kubelet | Node 的代理，管理 Node 相关的大部分操作，Node 上只有它能够与 apiserver 通信，实现状态报告、命令下发、启停容器等功能 | "小管家" |
| kube-proxy | Node 的网络代理，只负责管理容器的网络通信，为 Pod 转发 TCP/UDP 数据包 | "小邮差" |
| container-runtime | 容器和镜像的实际使用者，在 kubelet 指挥下创建容器，管理 Pod 生命周期 | "苦力" |

- Kubernetes 是容器编排平台，没有限定 container-runtime 必须是 Docker，可替换成任何符合标准的其他容器运行时（containerd、CRI-O 等）
- 3 个组件中只有 kube-proxy 被容器化；kubelet 必须管理整个节点，容器化会限制其能力，所以必须在 container-runtime 之外运行

-> 详见 Kubernetes 的组件与工作流程

## Kubernetes 的工作流程

把 Master 和 Node 的组件放在一起，可以看出 Kubernetes 的大致工作流程：

1. 每个 Node 上的 kubelet 定期向 apiserver 上报节点状态，apiserver 再存到 etcd 里
2. 每个 Node 上的 kube-proxy 实现 TCP/UDP 反向代理，让容器对外提供稳定的服务
3. scheduler 通过 apiserver 得到当前节点状态，调度 Pod；apiserver 下发命令给某个 Node 的 kubelet，kubelet 调用 container-runtime 启动容器
4. controller-manager 也通过 apiserver 得到实时节点状态，监控异常情况，再使用相应手段调节恢复

这些组件就像无数个不知疲倦的运维工程师，随时发现集群里的变化和异常，互相协作维护集群健康状态。

## 插件（Addon）

只要节点上运行了 apiserver、scheduler、kubelet、kube-proxy、container-runtime 等组件，就是一个功能齐全的 Kubernetes 集群。但想达到"好用"程度还要安装附加功能，即插件。

- `minikube addons list` 查看插件列表
- 比较重要的两个插件：

| 插件 | 作用 |
|------|------|
| DNS | 在集群里实现域名解析服务，以域名而非 IP 互相通信，是服务发现和负载均衡的基础；对微服务、服务网格等架构至关重要，基本是必备插件 |
| Dashboard | 仪表盘，为 Kubernetes 提供图形化操作界面，直观友好，支持中文 |

执行 `minikube dashboard` 可自动用浏览器打开 Dashboard 页面。

-> 详见 Kubernetes 插件与 Dashboard

## 分笔记索引

- **Kubernetes 的基本架构** — 控制面/数据面架构、节点角色、查看节点状态的命令
- **Kubernetes 的组件与工作流程** — Master/Node 组件职责、容器化情况、完整工作流程
- **Kubernetes 插件与 Dashboard** — 插件列表、DNS/Dashboard 两个重要插件、远程访问 Dashboard
