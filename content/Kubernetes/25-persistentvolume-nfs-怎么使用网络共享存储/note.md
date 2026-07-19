---
title: PersistentVolume+NFS：怎么使用网络共享存储
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, persistentvolume, provisioner]
reviewable: true
module: kubernetes-core
---

## 核心概念

在 Kubernetes 集群里，网络存储系统更适合数据持久化。本讲以 NFS 为例讲解如何使用网络存储，以及静态存储卷和动态存储卷的概念，核心对象是 StorageClass 和 Provisioner。

上节课的 HostPath 存储卷只能本机使用，而 Pod 经常在集群里"漂移"，不够实用。网络存储让 Pod 无论在哪里运行，只要知道 IP 或域名就能通过网络访问存储设备。NFS 是相对简单的网络存储系统（也有 AWS、Azure、Ceph 等，Kubernetes 定义了 CSI 规范，但安装使用较复杂）。

## 安装 NFS 服务端与客户端

NFS 采用 Client/Server 架构，需选定一台主机作 Server 安装服务端，其他主机作 Client 安装客户端工具。可在集群里增添一台 Storage 服务器（逻辑概念，可复用某台主机，如复用第 17 讲的 Console）。

| 角色 | 安装命令 | 说明 |
|------|----------|------|
| Server | `sudo apt -y install nfs-kernel-server` | 安装后指定存储位置（如 `/tmp/nfs`），配置 `/etc/exports` 指定目录名、允许访问网段、权限；用 `exportfs -ra` 让配置生效，`exportfs -v` 验证；`systemctl start/enable nfs-server` 启动 |
| Client | `sudo apt -y install nfs-common` | 每个节点都要装；可用 `showmount -e <NFS服务器IP>` 检查能否挂载 |

`/etc/exports` 配置示例（目录名和 IP 改成和自己环境一致）：

```text
/tmp/nfs 192.168.10.0/24(rw,sync,no_subtree_check,no_root_squash)
```

手动挂载测试：`mkdir -p /tmp/test` 创建挂载点，`sudo mount -t nfs 192.168.10.208:/tmp/nfs /tmp/test` 挂载，在 `/tmp/test` 创建文件后回 NFS 服务器检查共享目录是否出现同名文件，验证安装成功。

-> 详见 NFS 静态存储卷

## 静态存储卷（手工定义 PV）

手工分配一个 NFS 存储卷：storageClassName 指定为 nfs，accessModes 设成 ReadWriteMany（NFS 支持多个节点同时访问一个共享目录），YAML 里添加 nfs 字段指定服务器 IP 和共享目录名。在 NFS 服务器 `/tmp/nfs` 下创建 `1g-pv` 目录表示分配 1GB 可用空间，PV 的 capacity 设成同样的 1Gi。

> 注意：spec.nfs 里的 IP 一定要正确，路径一定要存在（事先创建好），否则 Kubernetes 按 PV 描述无法挂载 NFS 共享目录，PV 会处于 pending 状态无法使用。

定义 PVC 申请存储，内容和 PV 差不多，但不涉及 NFS 存储细节，只用 `resources.request` 表示希望要多大的容量。创建 PVC 后 Kubernetes 根据 PVC 描述找到最合适的 PV 绑定。

因为 PV/PVC 指定了 storageClassName 是 nfs，节点上也安装了 NFS 客户端，Kubernetes 会自动执行 NFS 挂载，把共享目录挂载到 Pod，完全不需要手动管理。NFS 是网络服务，不受 Pod 调度位置影响，只要网络通畅 PV 一直可用，数据实现真正的持久化存储。

-> 详见 NFS 静态存储卷

## 动态存储卷与 NFS Provisioner

静态存储卷"解决了，但没有完全解决"：网络存储确实能让 Pod 任意访问、数据持久化，但 PV 仍需人工管理（系统管理员手动维护存储设备、逐个创建 PV），PV 大小也难精确控制，易空间不足或浪费。大集群里每天几百上千个应用需要 PV，人力管理会大量积压。

动态存储卷用 StorageClass 绑定一个 Provisioner 对象，Provisioner 是能自动管理存储、创建 PV 的应用，代替管理员手工劳动。有了动态存储卷，前面手工创建的 PV 就称为"静态存储卷"。

| 概念 | 说明 |
|------|------|
| 静态存储卷 | 手工创建 PV，管理员维护 |
| 动态存储卷 | StorageClass 绑定 Provisioner，由 Provisioner 自动创建 PV |
| NFS Provisioner | `nfs-subdir-external-provisioner`，以 Pod 形式运行在 Kubernetes 里，GitHub 项目的 deploy 目录有 rbac.yaml、class.yaml、deployment.yaml 三个文件 |

部署 Provisioner 需修改两个文件：
- **rbac.yaml**：把默认的 default 名字空间改成其他（如 kube-system），避免与普通应用混在一起。
- **deployment.yaml**：名字空间改成和 rbac.yaml 一致；重点修改 volumes 和 env 里的 IP 地址和共享目录名，必须和集群里的 NFS 服务器配置一样；镜像仓库用 gcr.io 拉取困难，需把镜像名改成转存到 Docker Hub 的版本。

动态存储卷用法简单很多：不再手工定义 PV，只在 PVC 里指定 StorageClass 对象，它再关联到 Provisioner，Kubernetes 自动找到 Provisioner 在 NFS 共享目录上创建合适的 PV。

-> 详见 NFS 动态存储卷与 Provisioner 部署

## 分笔记索引

- **NFS 静态存储卷** — 手工定义 NFS 类型 PV/PVC 并挂载到 Pod
- **NFS 动态存储卷与 Provisioner 部署** — 部署 NFS Provisioner、StorageClass 定义与动态 PVC 用法
- **NFS Provisioner Deployment 片段示例** — deployment.yaml 中需修改的 IP 与共享目录片段
- **NFS 静态 Pod 示例** — 挂载静态 NFS PVC 的 Pod YAML
- **NFS 动态 Pod 示例** — 挂载动态 NFS PVC 的 Pod YAML
