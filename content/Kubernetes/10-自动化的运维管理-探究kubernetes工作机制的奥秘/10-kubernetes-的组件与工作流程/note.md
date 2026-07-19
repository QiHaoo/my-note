---
title: Kubernetes 的组件与工作流程
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, apiserver, etcd, scheduler, kubelet]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：自动化的运维管理：探究Kubernetes工作机制的奥秘

Kubernetes 的节点内部由很多模块构成，这些模块又可分成组件（Component）和插件（Addon）两类。组件实现了 Kubernetes 的核心功能特性，没有这些组件 Kubernetes 就无法启动；插件则是附加功能，属于"锦上添花"，不安装也不影响 Kubernetes 正常运行。

## Master 里的组件（4 个）

| 组件 | 职责 | 比喻 |
|------|------|------|
| apiserver | Master 节点、同时也是整个 Kubernetes 系统的唯一入口；对外公开一系列 RESTful API，加上验证、授权等功能；所有其他组件都只能和它直接通信 | 联络员 |
| etcd | 高可用的分布式 Key-Value 数据库，持久化存储系统里的各种资源对象和状态；只与 apiserver 有直接联系，任何其他组件读写 etcd 数据都必须经过 apiserver | 配置管理员 |
| scheduler | 负责容器的编排工作，检查节点资源状态，把 Pod 调度到最适合的节点上运行；节点状态和 Pod 信息都存储在 etcd 里，必须通过 apiserver 才能获得 | 部署人员 |
| controller-manager | 负责维护容器和节点等资源的状态，实现故障检测、服务迁移、应用伸缩等功能；也必须通过 apiserver 获得存储在 etcd 里的信息，才能实现对资源的各种操作 | 监控运维人员 |

### 组件被容器化

这 4 个组件都被容器化了，运行在集群的 Pod 里，可以用 kubectl 查看状态：

```bash
kubectl get pod -n kube-system
```

`-n kube-system` 参数表示检查 kube-system 名字空间里的 Pod。

## Node 里的组件（3 个）

Master 里的 apiserver、scheduler 等组件需要获取节点的各种信息才能作出管理决策，这些信息来自 Node 里的 3 个组件：kubelet、kube-proxy、container-runtime。

| 组件 | 职责 | 比喻 |
|------|------|------|
| kubelet | Node 的代理，负责管理 Node 相关的绝大部分操作；Node 上只有它能够与 apiserver 通信，实现状态报告、命令下发、启停容器等功能 | "小管家" |
| kube-proxy | Node 的网络代理，只负责管理容器的网络通信，为 Pod 转发 TCP/UDP 数据包 | 专职的"小邮差" |
| container-runtime | 容器和镜像的实际使用者，在 kubelet 的指挥下创建容器，管理 Pod 的生命周期 | 真正干活的"苦力" |

### container-runtime 不限 Docker

因为 Kubernetes 的定位是容器编排平台，所以它没有限定 container-runtime 必须是 Docker，完全可以替换成任何符合标准的其他容器运行时，例如 containerd、CRI-O 等等，课程中使用的是 Docker。

### 容器化情况

3 个组件中只有 kube-proxy 被容器化了。kubelet 因为必须要管理整个节点，容器化会限制它的能力，所以它必须在 container-runtime 之外运行。

使用 `minikube ssh` 登录到节点后，可以用 `docker ps` 看到 kube-proxy：

```bash
minikube ssh
docker ps | grep kube-proxy
```

而 kubelet 用 `docker ps` 是找不到的，需要用操作系统的 ps 命令：

```bash
ps -ef|grep kubelet
```

## 工作流程

把 Node 里的组件和 Master 里的组件放在一起看，就能明白 Kubernetes 的大致工作流程：

1. 每个 Node 上的 kubelet 会定期向 apiserver 上报节点状态，apiserver 再存到 etcd 里
2. 每个 Node 上的 kube-proxy 实现了 TCP/UDP 反向代理，让容器对外提供稳定的服务
3. scheduler 通过 apiserver 得到当前的节点状态，调度 Pod，然后 apiserver 下发命令给某个 Node 的 kubelet，kubelet 调用 container-runtime 启动容器
4. controller-manager 也通过 apiserver 得到实时的节点状态，监控可能的异常情况，再使用相应的手段去调节恢复

### 流程示意

- Node 1 / Node 2 的 kubelet 向 **apiserver** 上报节点状态
- apiserver 与 **etcd** 互相存取状态（etcd 是唯一的状态数据库）
- **scheduler** 从 apiserver 获取状态并调度 Pod，apiserver 再下发命令给 Node 的 kubelet
- kubelet 调用 **container-runtime** 启动容器
- **controller-manager** 从 apiserver 获取状态、监控异常，并下发调节恢复指令
- 各 Node 的 **kube-proxy** 通过 TCP/UDP 反向代理，让容器对外提供稳定服务

这和 Kubernetes 出现之前的操作流程差不了多少，但 Kubernetes 的高明之处在于把这些都抽象化规范化了。这些组件就像无数个不知疲倦的运维工程师，把原先繁琐低效的人力工作搬进了高效的计算机里，随时发现集群里的变化和异常，互相协作维护集群的健康状态。

> 各组件之间的通信使用的是 RESTful API。生产环境会有多个 master 节点，etcd 会部署成高可用。kube-proxy 是给 Service 对象用的，是四层的负载均衡，只支持 IP 加端口的形式访问，不支持 7 层解析。更换 containerd 后，以往常用的 docker 命令不再使用，取而代之的是 crictl 和 ctr 两个命令客户端。
