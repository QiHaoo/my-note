---
title: CRI 与 containerd
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - CRI
  - containerd
  - dockershim
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：Kubernetes 弃用 Docker 是怎么回事

CRI 和 containerd 是理解“弃用 Docker”的两个关键项目。

## 历史背景

- 2014 年 Docker 如日中天，Kubernetes 刚诞生，选择在 Docker 上运行
- 2016 年 CNCF 已成立一年，Kubernetes 发布 1.0 可用于生产，宣布加入 CNCF 成为第一个 CNCF 托管项目，想联合其他厂商“扳倒”Docker
- 2016 年底 Kubernetes 1.5 引入 CRI

## CRI（Container Runtime Interface）

CRI 采用 Protobuf 和 gRPC，规定 kubelet 该如何调用容器运行时去管理容器和镜像。

- 这是一套全新接口，和之前的 Docker 调用完全不兼容
- 意图：不再绑定 Docker，允许底层接入其他容器技术（如 rkt、kata 等），随时可以把 Docker“踢开”

### dockershim 折中方案

由于当时 Docker 已非常成熟、市场惯性强大，各大云厂商不可能一下子全部替换 Docker。Kubernetes 提供折中方案：在 kubelet 和 Docker 之间加一个“适配器”，把 Docker 接口转换成符合 CRI 标准的接口。

因为这个适配器夹在 kubelet 和 Docker 之间，被形象地称为“shim”（垫片）。有了 CRI 和 shim，Kubernetes 虽仍用 Docker 作底层运行时，但具备了和 Docker 解耦的条件。

## containerd

面对 Kubernetes 的架势，Docker 采取“断臂求生”策略：

- 推动自身重构，把原本单体架构的 Docker Engine 拆分成多个模块
- 其中 Docker daemon 部分捐献给 CNCF，形成 containerd
- containerd 作为 CNCF 托管项目，符合 CRI 标准
- 但 Docker 出于诸多原因考虑，只在 Docker Engine 里调用了 containerd，外部接口仍保持不变，即还不与 CRI 兼容

### 两种调用链

由于 Docker 的“固执己见”，Kubernetes 里出现两种调用链（两种方式最终都用 containerd 管理容器，效果完全一样）：

- 方式一：kubelet（CRI 接口）→ dockershim → Docker Engine → containerd → 容器
- 方式二：kubelet（CRI 接口）→ containerd → 容器

第二种省去了 dockershim 和 Docker Engine 两个环节，更简洁、损耗更少、性能更好。

### 性能数据

2018 年 Kubernetes 1.10 发布时，containerd 更新到 1.1 版正式与 Kubernetes 集成。博客展示了 containerd 1.1 相比 Docker 18.03 的测试数据：

| 指标 | 改善幅度 |
|------|----------|
| Pod 启动延迟 | 降低约 20% |
| CPU 使用率 | 降低 68% |
| 内存使用率 | 降低 12% |

这对云厂商非常有诱惑力。

## containerd 与 runc 的关系

- containerd 向上对接 Docker、Kubernetes
- runc 在下面，对接操作系统（runc 是 OCI 规范中的容器底层部分，即原来 Docker 的 libcontainer，调用 namespace、cgroup 等系统接口创建容器）
