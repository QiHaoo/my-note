---
title: Kubernetes 的基本架构
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, architecture, control-plane, node]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：自动化的运维管理：探究Kubernetes工作机制的奥秘

操作系统的核心功能之一是抽象，从繁琐的底层事务中抽象出简洁的概念，再基于这些概念管理系统资源。Kubernetes 也是这样：管理目标是大规模集群和应用，必须把系统抽象到足够高的层次，分解出松耦合的对象，才能简化系统模型，减轻用户心智负担。

Kubernetes 扮演的角色如同一个"大师级别"的系统管理员，有丰富集群运维经验，独创一套工作方式，不需要太多外部干预就能自主实现许多复杂的管理工作。

## 控制面/数据面架构

Kubernetes 采用了"控制面/数据面"（Control Plane / Data Plane）架构。集群里的计算机被称为"节点"（Node），可以是实机也可以是虚机。

- 少量节点用作控制面，执行集群的管理维护工作
- 其他大部分节点划归数据面，用来跑业务应用

| 角色 | 简称 | 职责 | 比喻 |
|------|------|------|------|
| Master Node | Master | 控制面节点，集群里最重要的部分，执行管理维护工作 | Kubernetes 的大脑和心脏 |
| Worker Node | Worker / Node | 数据面节点，在 Master 指挥下干活 | Kubernetes 的手和脚 |

Node 数量非常多，构成了一个资源池，Kubernetes 在这个池里分配资源、调度应用。因为资源被"池化"了，管理变得比较简单，可以在集群中任意添加或删除节点。

kubectl 是 Kubernetes 的客户端工具，用来操作 Kubernetes，位于集群之外，理论上不属于集群。

### 架构示意

- `kubectl`（集群外的客户端）操作**控制面 Master**，Master 内含 apiserver、etcd、scheduler、controller-manager 四个核心组件
- Master 通过"指挥调度"管理多个**数据面 Worker Node**，每个 Node 内含 kubelet、kube-proxy、container-runtime 三个组件（如 Worker Node 1、Worker Node 2 … Worker Node N）

## 查看节点状态

```bash
kubectl get node
```

当前的 minikube 集群里只有一个 Master，Node 看不到。这是因为 Master 和 Node 的划分不是绝对的：当集群规模较小、工作负载较少时，Master 也可以承担 Node 的工作。minikube 环境就只有一个节点，这个节点既是 Master 又是 Node。

> v1.24.1 之后节点角色显示为 `control-plane`，不再叫 master。多个 master 节点可构成 master 集群，这些组件都是独立的服务、用 api 接口通信，不必限制在同一台主机上；etcd 是分布式数据库，一致性由它保证。
