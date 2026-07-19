---
title: 什么是有状态应用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, state]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：StatefulSet：怎么管理有状态的应用

## 持久化存储意味着"状态"

PersistentVolume 让应用可以把运行时的关键数据落盘，相当于有了"保险"。Pod 意外崩溃也只是像按下暂停键，重启后挂载 Volume、加载原数据就能满血复活，恢复之前的"状态"继续运行。

应用保存的数据，实际上就是它某个时刻的"运行状态"。所以从这个角度说，理论上任何应用都是有状态的。

## 无状态应用与有状态应用

| 类型 | 特点 | 典型例子 |
|------|------|----------|
| 无状态应用 | 状态信息不重要，即使不恢复状态也能正常运行；无论以什么状态重启都能很好地对外服务 | Nginx（只处理 HTTP 请求，本身不生产数据，日志除外） |
| 有状态应用 | 运行状态信息很重要，因重启丢失状态绝对无法接受 | Redis、MySQL（内存或磁盘上的数据是核心价值，不能及时保存恢复会是灾难性后果） |

## 为什么 Deployment 管理不了有状态应用

Deployment 加上 PersistentVolume 可以部分达到管理有状态应用的目的（Deployment 保高可用，PV 存数据）。

但 Kubernetes 认为状态不仅是数据持久化，在集群化、分布式场景里，还有多实例的依赖关系、启动顺序、网络标识等问题需要解决，而这些问题恰恰是 Deployment 力所不及的：

- 只使用 Deployment，多个实例之间是无关的，启动顺序不固定，Pod 名字、IP 地址、域名都完全随机--这正是"无状态应用"的特点
- 对于"有状态应用"，多个实例间可能存在依赖关系（如 master/slave、active/passive），需要依次启动才能保证应用正常运行
- 外界客户端可能要使用固定的网络标识来访问实例，且这些信息必须保证在 Pod 重启后不变

Kubernetes 由此在 Deployment 基础上定义了 StatefulSet，专门用来管理有状态的应用。

## 有状态应用的几大问题

有状态应用的几大问题：依赖关系、启动顺序、网络标识、多实例之间内部沟通协调。

有状态服务不好维护、不方便扩容缩容，无状态服务管理简单。StatefulSet 功能还比较弱，直接用还不是很方便，所以后来才出了 operator 等等，但 StatefulSet 无疑是基础；一般不建议把 rdbms、redis、queue 这类需维护复杂状态的服务放入 Kubernetes，Kubernetes 虽有 StatefulSet，但维护有复杂状态的应用还是有点弱。
