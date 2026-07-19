---
title: 网络通信：CNI是怎么回事又是怎么工作的
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, networking, cni, flannel, calico]
reviewable: true
module: kubernetes-core
---

## 核心概念

针对 Docker 跨主机通信的网络缺陷，Kubernetes 提出自己的网络模型 IP-per-pod，让 Pod 摆脱主机硬限制。CNI（Container Networking Interface）是 Kubernetes 定义的网络插件接口标准，把网络实现交给插件解决；常见插件有 Flannel、Calico、Cilium，按实现方式分为 Overlay、Route、Underlay 三种。

## Kubernetes 的网络模型

Docker 的 bridge 方案简单有效（创建 `docker0` 网桥，默认私有网段 `172.17.0.0/16`，每个容器创建虚拟网卡对 veth pair 分别"插"在容器和网桥上互联互通），但只局限单机，跨主机通信困难（需端口映射和 NAT）。

针对此缺陷，Kubernetes 提出"IP-per-pod"网络模型，4 点基本假设：

| 假设 | 说明 |
|------|------|
| 唯一 IP | 集群里每个 Pod 都有唯一的一个 IP 地址 |
| 共享 IP | Pod 里所有容器共享这个 IP 地址 |
| 同一网段 | 集群里所有 Pod 都属于同一个网段 |
| 直连互通 | Pod 可基于 IP 直接访问另一个 Pod，不需要 NAT |

这个网络让 Pod 摆脱主机硬限制，是一个"平坦"的网络模型。因为 Pod 有独立 IP（相当于一台虚拟机）且直连互通，可很容易实施域名解析、负载均衡、服务发现，以往运维经验都能直接使用。

-> 详见 Kubernetes 网络模型与 CNI

## 什么是 CNI

Kubernetes 把网络模型落地实现不容易，于是制定了标准 **CNI（Container Networking Interface）**。CNI 为网络插件定义一系列通用接口，开发者遵循规范即可接入 Kubernetes，为 Pod 创建虚拟网卡、分配 IP、设置路由规则，实现 IP-per-pod 网络模型。

按实现技术不同，CNI 插件大致分 Overlay、Route、Underlay 三种：

| 类型 | 工作方式 | 对底层网络要求 | 性能 |
|------|----------|----------------|------|
| Overlay | 在真实底层网络之上构建"逻辑网络"，原始 Pod 网络数据封包，到目的地再拆包 | 低，适应性强 | 有额外传输成本，较低 |
| Route | 在底层网络之上工作，不封包拆包，用系统内置路由功能实现跨主机通信 | 依赖性强，底层不支持则无法工作 | 高 |
| Underlay | 直接用底层网络实现，Pod 和宿主机在一个网络里且平等 | 最强，依赖底层硬件和网络 | 最高，但不灵活 |

常见 CNI 插件：

| 插件 | 模式 | 特点 |
|------|------|------|
| Flannel | Overlay（VXLAN）/ Route（Host-Gateway） | 最流行，简单易用，但性能不太好，不建议生产环境 |
| Calico | Route | 用 BGP 协议维护路由信息，性能比 Flannel 好，支持多种网络策略 |
| Cilium | Overlay + Route | 深度使用 Linux eBPF，在内核层次操作网络数据，性能高，2021 年加入 CNCF 孵化 |

-> 详见 Kubernetes 网络模型与 CNI

## CNI 插件是怎么工作的

以 Flannel 为例（默认基于 VXLAN 的 Overlay 模式）。从单机看，Flannel 网络结构和 Docker 几乎一样，只是网桥换成 `cni0` 而非 `docker0`。

- **本机通信**：Pod 的虚拟网卡 `eth0` 通过 veth pair 连接宿主机虚拟网卡（如 `veth41586979@if3`），再"插"在 `cni0` 网桥上，借助网桥本机 Pod 可直接通信。
- **跨主机通信**：关键是节点的路由表。如 master 节点访问 `10.10.1.0/24` 网段要让 `flannel.1` 设备处理，进入 Flannel 流程；Flannel 查询各种表（`ip neighbor`、`bridge fdb` 等）决定把数据发到目标节点，在原始网络包前加额外信息封装成 VXLAN 报文，用宿主机网卡（如 `ens160`）发出去，目标节点收到后拆包做反向处理交给目标 Pod。

-> 详见 Flannel 与 Calico 的工作方式

## 使用 Calico 网络插件

Calico 是 Route 模式，安装简单，用 `kubectl apply` 即可（安装前最好把 Flannel 删除）：

```bash
wget https://projectcalico.docs.tigera.io/manifests/calico.yaml
docker pull calico/cni:v3.23.1
docker pull calico/node:v3.23.1
docker pull calico/kube-controllers:v3.23.1
kubectl apply -f calico.yaml
```

Calico 的 IP 地址分配策略和 Flannel 不同（如 `10.10.219.*`、`10.10.171.*`）。Pod 里仍有虚拟网卡，但宿主机上网卡名变成 `caliXXX@if4`，且并未连接到 `cni0` 网桥。

因为 Calico 是 Route 模式，不用 Flannel 那一套，而是在宿主机上创建路由规则，让数据包不经过网桥直接"跳"到目标网卡。查路由表可知目标 Pod 走哪个设备，数据直接进目标 Pod 网卡，省去网桥中间步骤，所以性能高。

-> 详见 Flannel 与 Calico 的工作方式

## 分笔记索引

- **Kubernetes 网络模型与 CNI** — Docker bridge 与 IP-per-pod 对比、CNI 标准、三种实现类型与常见插件
- **Flannel 与 Calico 的工作方式** — Flannel Overlay 本机/跨主机、Calico Route 路由机制
