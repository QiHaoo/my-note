---
title: Kubernetes 弃用 Docker 是怎么回事
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Docker
  - CRI
  - containerd
  - Kubernetes
reviewable: true
module: extras
---

## 核心概念

Kubernetes“弃用 Docker”并非弃用 Docker 软件本身，而是在 1.24 版本移除了 kubelet 里的 dockershim 组件。背后的关键演变是 CRI 接口标准的引入和 containerd 的诞生，最终让 Kubernetes 绕过 Docker 直接调用 containerd 来管理容器。

## 什么是 CRI

2016 年底 Kubernetes 1.5 引入 CRI（Container Runtime Interface），采用 Protobuf 和 gRPC，规定 kubelet 如何调用容器运行时去管理容器和镜像，与之前的 Docker 调用完全不兼容。意图是不再绑定 Docker，允许底层接入 rkt、kata 等其他容器技术。

由于市场惯性，Kubernetes 同时提供折中方案：在 kubelet 和 Docker 之间加一个“适配器”（shim，垫片），把 Docker 接口转换成 CRI 标准接口。从此 Kubernetes 虽仍用 Docker 作底层运行时，但已具备解耦条件。

-> 详见 CRI 与 containerd

## 什么是 containerd

Docker 采取“断臂求生”策略，重构自身，把单体架构的 Docker Engine 拆分成多个模块，其中 Docker daemon 部分捐献给 CNCF，形成 containerd。

containerd 符合 CRI 标准，但 Docker 仍只在 Docker Engine 里调用 containerd、外部接口不变，不与 CRI 兼容。由此 Kubernetes 出现两种调用链，第二种省去 dockershim 和 Docker Engine，更简洁、性能更好。2018 年 Kubernetes 1.10 时 containerd 1.1 正式集成，相比 Docker 18.03，Pod 启动延迟降低约 20%、CPU 使用率降低 68%、内存使用率降低 12%。

-> 详见 CRI 与 containerd

## 正式“弃用 Docker”

2020 年 Kubernetes 1.20 正式宣布 kubelet 将弃用 Docker 支持。声明在传播中被简化为“Kubernetes 将弃用 Docker”，引发恐慌。

实际上它只是弃用了 dockershim 这个小组件，把它移出 kubelet，并非弃用 Docker 软件产品。Docker 镜像和容器仍会正常运行，唯一变化是 Kubernetes 绕过 Docker 直接调用内部的 containerd。

影响：Kubernetes 直接使用 containerd 后，与 Docker 是独立工作环境，彼此不能访问对方管理的容器和镜像（如 `docker ps` 看不到 Kubernetes 里的容器），需改用 `crictl`（子命令仍为 ps、images 等）。一直用 kubectl 管理则无影响。1.23 未能移除 dockershim，推迟半年后 1.24 才删掉代码。

-> 详见 弃用 Docker 的真相

## Docker 的未来

Docker 仍有立足之地：

- 容器镜像格式已被标准化（OCI 规范），Docker 镜像仍可在 Kubernetes 正常使用，开发测试、CI/CD 流程无需改动
- Docker 是完整的软件产品线，不止 containerd，还包括镜像构建、分发、测试等服务，Docker Desktop 里还内置了 Kubernetes
- Docker 公司接管 dockershim 代码，另建 cri-dockerd 项目，把 Docker Engine 适配成 CRI 接口，kubelet 仍可通过它操作 Docker

对初学者，Docker 方便易用、工具链完善，是入门学习容器技术和云原生的“不二之选”。

-> 详见 弃用 Docker 的真相
