---
title: DaemonSet：忠实可靠的看门狗
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, daemonset, pod, scheduling]
reviewable: true
module: kubernetes-core
---

## 核心概念

DaemonSet 的目标是在集群的每个节点上运行且仅运行一个 Pod，相当于为每个节点配一只"看门狗"。它是 Deployment 的一个特例，仅 Pod 的调度策略不同。配套引出"污点 / 容忍度"调度机制与"静态 Pod"部署手段。

## 为什么要有 DaemonSet

Deployment 管理固定数量的 Pod，不关心 Pod 在哪个节点运行，Pod 可能"漂移"。但有些业务必须与节点绑定，每个节点都运行一个 Pod：

| 业务类型 | 示例 | 说明 |
|------|------|------|
| 网络应用 | kube-proxy | 每个节点都运行，否则节点无法加入 Kubernetes 网络 |
| 监控应用 | Prometheus | 每个节点一个 Pod 上报节点状态 |
| 日志应用 | Fluentd | 每个节点运行 Pod 搜集容器日志 |
| 安全应用 | 安全审计 / 入侵检查 / 漏洞扫描 | 每个节点一个 Pod 执行安全工作 |

DaemonSet 管理调度策略不同：Pod 数量与节点数量保持同步，每个节点上仅运行一个 Pod 实例。

-> 详见 DaemonSet 的 YAML 描述与使用

## 如何使用 YAML 描述 DaemonSet

DaemonSet 与 Deployment 同属 `apps` 组，简称 `ds`，`apiVersion: apps/v1`，`kind: DaemonSet`。

与 Deployment 的关键区别：

| 对比项 | Deployment | DaemonSet |
|------|------|------|
| spec.selector / template | 有 | 有，几乎一样 |
| spec.replicas | 有 | **无**（每个节点一个，不创建多副本） |
| 调度策略 | 管固定数量 Pod，可漂移 | 每个节点运行且仅运行一个 Pod |

`kubectl` 不提供 `kubectl create` 直接创建 DaemonSet 样板的功能。变通办法：先用 `kubectl create deploy` 生成 Deployment 样板，再把 `kind` 改成 `DaemonSet`、删除 `spec.replicas`。

-> 详见 DaemonSet 的 YAML 描述与使用

## 污点（taint）与容忍度（toleration）

DaemonSet 默认被 Master 节点排除在外，因为 Master 默认带污点。Kubernetes 用污点 / 容忍度解决 Pod 在某些节点的"调度"和"驱逐"问题。

| 概念 | 从属于 | 作用 |
|------|------|------|
| 污点（taint） | Node | 给节点"贴标签"（区别于 labels），控制 Pod 调度 |
| 容忍度（toleration） | Pod | Pod 能否"容忍"污点，决定能否调度到带污点的节点 |

Master 默认有污点 `node-role.kubernetes.io/master:NoSchedule`（效果 `NoSchedule` 拒绝 Pod 调度），Worker 无污点。

让 DaemonSet 在 Master 运行的两种方法：

| 方法 | 操作 | 影响 |
|------|------|------|
| 方法一：去掉污点 | `kubectl taint node master <污点名>:NoSchedule-`（末尾 `-` 表示删除） | 修改 Node 状态，影响面大，可能导致很多 Pod 跑到该节点 |
| 方法二：加容忍度 | Pod 的 `tolerations` 数组列出被容忍的污点（key / effect / `operator: Exists`） | 精细化调度，只让某些 Pod 运行在个别节点 |

容忍度从属于 Pod 而非 DaemonSet 独有，可在 Job / CronJob / Deployment 中同样使用。

-> 详见 DaemonSet 的 YAML 描述与使用

## 静态 Pod

DaemonSet 是运行节点专属 Pod 最常用的方式，但不是唯一方式。Kubernetes 还支持"静态 Pod"。

| 特性 | 说明 |
|------|------|
| 管控 | 不受 Kubernetes 系统管控，不与 apiserver、scheduler 发生关系 |
| 管理 | 唯一能管理它的是节点上的 kubelet |
| YAML 存放 | 节点的 `/etc/kubernetes/manifests` 目录（Kubernetes 专用目录） |
| 工作机制 | kubelet 定期检查目录，发现变化就调用容器运行时创建 / 删除静态 Pod |

Kubernetes 4 个核心组件（apiserver、etcd、scheduler、controller-manager）都以静态 Pod 形式存在，因此能先于集群启动。DaemonSet 无法满足的特殊需求可考虑静态 Pod，但必须在节点上纯手动部署，应当慎用。

-> 详见 DaemonSet 的 YAML 描述与使用

## 分笔记索引

- **DaemonSet 的 YAML 描述与使用** — YAML 样板、污点/容忍度两种调度方法、静态 Pod 机制
