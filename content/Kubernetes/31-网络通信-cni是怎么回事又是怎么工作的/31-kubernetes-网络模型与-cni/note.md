---
title: Kubernetes 网络模型与 CNI
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, networking, cni]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：网络通信：CNI是怎么回事又是怎么工作的

## Docker 的 bridge 网络模式

Docker 会创建名为 `docker0` 的网桥，默认私有网段 `172.17.0.0/16`。每个容器都会创建一个虚拟网卡对（veth pair），两个虚拟网卡分别"插"在容器和网桥上，容器之间就能互联互通。

结构示意（宿主机内）：

- 宿主机上有 `docker0` 网桥（172.17.0.0/16）
- 容器1 的 `eth0` 通过 veth pair 连接到 `docker0`
- 容器2 的 `eth0` 通过 veth pair 连接到 `docker0`
- `docker0` 再连到宿主机网卡 `ens160`

Docker 的网络方案简单有效，但只局限在单机环境，跨主机通信非常困难（需做端口映射和 NAT）。

## Kubernetes 的 IP-per-pod 网络模型

针对 Docker 的网络缺陷，Kubernetes 提出自己的网络模型"IP-per-pod"，4 点基本假设：

| 假设 | 说明 |
|------|------|
| 唯一 IP | 集群里每个 Pod 都有唯一的一个 IP 地址 |
| 共享 IP | Pod 里所有容器共享这个 IP 地址 |
| 同一网段 | 集群里所有 Pod 都属于同一个网段 |
| 直连互通 | Pod 可基于 IP 地址直接访问另一个 Pod，不需要 NAT |

这是一个"平坦"的网络模型，让 Pod 摆脱主机硬限制。因为 Pod 有独立 IP（相当于一台虚拟机）且直连互通，可很容易实施域名解析、负载均衡、服务发现，以往运维经验都能直接使用，对应用的管理和迁移都非常友好。

## 什么是 CNI

Kubernetes 定义的网络模型很完美，但落地实现不容易，于是专门制定了标准：**CNI（Container Networking Interface）**。

CNI 为网络插件定义一系列通用接口，开发者只要遵循规范就能接入 Kubernetes，为 Pod 创建虚拟网卡、分配 IP、设置路由规则，最终实现"IP-per-pod"网络模型。

> 定义规范/标准（接口），把具体实现交给社区/第三方，用插件方式应用，不需要关注千变万化的底层运行环境。

## 三种 CNI 实现类型

依据实现技术不同，CNI 插件大致分 Overlay、Route、Underlay 三种：

| 类型 | 工作方式 | 对底层网络要求 | 性能 |
|------|----------|----------------|------|
| Overlay | 原意"覆盖"，构建在真实底层网络之上的"逻辑网络"，把原始 Pod 网络数据封包再经下层网络发送，到目的地再拆包 | 要求低，适应性强 | 有额外传输成本，性能较低 |
| Route | 也在底层网络之上工作，但没封包拆包，用系统内置路由功能实现 Pod 跨主机通信 | 依赖性较强，底层不支持则无法工作 | 性能高 |
| Underlay | 直接用底层网络实现 CNI，Pod 和宿主机在一个网络里且平等 | 依赖性最强，依赖底层硬件和网络 | 性能最高，但不够灵活 |

## 常见 CNI 插件

自 2015 年 CNI 发布以来，因接口定义宽松，社区涌现出很多网络插件。

| 插件 | 模式 | 特点 |
|------|------|------|
| Flannel | 最早是 Overlay 模式（UDP、VXLAN），后来用 Host-Gateway 支持 Route 模式 | 由 CoreOS 开发，简单易用，是 Kubernetes 里最流行的 CNI 插件，但性能表现不太好，一般不建议生产环境 |
| Calico | Route 模式 | 使用 BGP 协议（Border Gateway Protocol）维护路由信息，性能比 Flannel 好，支持多种网络策略（数据加密、安全隔离、流量整形） |
| Cilium | 同时支持 Overlay 和 Route 模式 | 较新的插件，深度使用 Linux eBPF 技术，在内核层次操作网络数据，性能高、可灵活实现各种功能；2021 年加入 CNCF 成为孵化项目，非常有前途 |

> 生产环境用什么不能一概而论：性能够用 Flannel 就可以，强调性能和其他网络管理需求可用 Calico。`hostNetwork` 是 Kubernetes 的一个属性定义，与 CNI 没有关系（不属于 underlay）。
