---
title: StatefulSet：怎么管理有状态的应用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, service, storage]
reviewable: true
module: kubernetes-core
---

## 核心概念

StatefulSet 是 Deployment 的一个特例，专门用来管理"有状态应用"。它管理的 Pod 拥有固定的名字、启动顺序和网络标识，再加上数据持久化，就能解决有状态应用在集群化、分布式场景下的依赖关系、启动顺序、网络标识、多实例内部沟通协调等问题。

## 什么是有状态的应用

持久化存储让应用可以把运行时的关键数据落盘，相当于有了"保险"--Pod 崩溃重启后挂载 Volume、加载原数据即可恢复"状态"。所以应用保存的数据，实际上就是它某个时刻的"运行状态"，理论上任何应用都是有状态的。

| 类型 | 特点 | 典型例子 |
|------|------|----------|
| 无状态应用 | 状态信息不重要，不恢复状态也能正常运行，无论以什么状态重启都能对外服务 | Nginx（只处理 HTTP 请求，本身不生产数据） |
| 有状态应用 | 运行状态信息很重要，重启丢失状态无法接受 | Redis、MySQL（内存/磁盘上的数据是核心价值） |

Deployment 加 PersistentVolume 可以部分达到管理有状态应用的目的（Deployment 保高可用，PV 存数据），但 Kubernetes 认为"状态"不仅是数据持久化，在集群化、分布式场景里还有多实例的依赖关系、启动顺序、网络标识等问题需要解决，而这些恰恰是 Deployment 力所不及的。Deployment 管理的多个实例之间无关，启动顺序不固定，Pod 名字、IP、域名完全随机，这正是无状态应用的特点。

有状态应用多个实例间可能存在依赖关系（如 master/slave、active/passive），需依次启动；外界客户端可能要用固定的网络标识访问实例，且这些信息在 Pod 重启后不能变。Kubernetes 由此在 Deployment 基础上定义了 StatefulSet。

-> 详见 什么是有状态应用

## 如何使用 YAML 描述 StatefulSet

`kubectl api-resources` 可查到 StatefulSet 简称是 `sts`。StatefulSet 不能直接用 `kubectl create` 生成样板文件（和 DaemonSet 类似），但对象描述和 Deployment 差不多，可以把 Deployment 适当修改得到。

与 Deployment 的关键区别只有两点：

| 不同之处 | 说明 |
|----------|------|
| `kind` 必须为 `StatefulSet` | -- |
| `spec` 多出 `serviceName` 字段 | 其余部分（replicas、selector、template 等）与 Deployment 一致 |

-> 详见 StatefulSet 的 YAML 描述

## 如何在 Kubernetes 里使用 StatefulSet

StatefulSet 通过 Pod 的顺序编号、hostname、Service 域名，解决了有状态应用的三个问题：

| 问题 | 解决方式 |
|------|----------|
| 启动顺序 | Pod 不再随机命名，而是从 0 开始顺序编号（如 redis-sts-0、redis-sts-1），Kubernetes 按顺序依次创建 |
| 依赖关系 | 每个 Pod 的 hostname 就是它的名字，应用可据此决定自身身份（如 0 号为主、1 号为从） |
| 网络标识 | Service 为 StatefulSet 的每个 Pod 再创建一个域名，格式为"Pod名.服务名.名字空间.svc.cluster.local"（可简写为"Pod名.服务名"），由 Service 维护、稳定不变 |

为 StatefulSet 写 Service 时，`metadata.name` 必须与 StatefulSet 的 `serviceName` 相同，`selector` 标签也必须一致。注意不能用 `kubectl expose` 直接为 StatefulSet 生成 Service，只能手写 YAML。

Service 原本的负载均衡功能对 StatefulSet 是不必要的（Pod 已有稳定域名，外界不应再通过 Service 这一层）。从安全和节约资源角度，可在 Service 里加 `clusterIP: None`，告诉 Kubernetes 不必再为该对象分配 IP 地址（这种 Service 即 Headless Service）。

-> 详见 StatefulSet 与 Service 的使用

## 如何实现 StatefulSet 的数据持久化

有了固定名字、启动顺序和网络标识，再加上数据持久化，就能完整管理有状态应用。可用上节课的 PersistentVolume、NFS 知识：定义 StorageClass，编写 PVC，给 Pod 挂载 Volume。

为强调持久化存储与 StatefulSet 的一对一绑定关系，Kubernetes 专门定义了 `volumeClaimTemplates` 字段，把 PVC 定义直接嵌入 StatefulSet 的 YAML。这样创建 StatefulSet 的同时会为每个 Pod 自动创建 PVC，可用性更高。该字段可类比 Pod 的 `template`、Job 的 `jobTemplate`，是一种"套娃"的对象组合结构，里面就是应用了 StorageClass 的普通 PVC。

-> 详见 带持久化的 StatefulSet 示例

-> 详见 StatefulSet 的数据持久化

## 分笔记索引

- **什么是有状态应用** — 状态的概念、无状态/有状态区别、Deployment 的不足
- **StatefulSet 的 YAML 描述** — 与 Deployment 的关键差异（kind、serviceName）
- **StatefulSet 与 Service 的使用** — 顺序编号、hostname、稳定域名、Headless Service
- **StatefulSet 的数据持久化** — volumeClaimTemplates、PVC 命名规律、数据恢复验证
- **带持久化的 StatefulSet 示例** — 内嵌 PVC 模板的 Redis StatefulSet YAML
