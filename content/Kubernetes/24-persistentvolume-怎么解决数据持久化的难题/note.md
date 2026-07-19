---
title: PersistentVolume：怎么解决数据持久化的难题
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, persistentvolume, pvc]
reviewable: true
module: kubernetes-core
---

## 核心概念

Kubernetes 应对持久化存储的解决方案是三个 API 对象：PersistentVolume、PersistentVolumeClaim、StorageClass，管理集群里的存储资源（磁盘）。Pod 必须通过它们才能实现数据持久化。

## 为什么需要 PersistentVolume

中级篇实战搭建的 WordPress 网站存在严重问题：Pod 没有持久化功能，MariaDB 无法"永久"存储数据。Pod 里的容器由镜像产生，镜像是只读的，进程读写磁盘只能用临时存储空间，Pod 销毁后临时存储立即回收，数据丢失。

Kubernetes 的 Volume 对数据存储给出了抽象（定义了"存储卷"，类型/容量/存储方式可自由发挥，Pod 只需设置 volumeMounts 加载使用），顺着 Volume 概念延伸出 PersistentVolume（简称 PV），专门表示持久存储设备，隐藏存储底层实现。

PV 属于集群的系统资源，和 Node 平级，Pod 对它没有管理权，只有使用权。PV 实际是一些存储设备/文件系统（Ceph、GlusterFS、NFS、本地磁盘等），管理它们超出 Kubernetes 能力范围，一般由系统管理员单独维护，再在 Kubernetes 里创建对应 PV。

## PV、PVC、StorageClass 三个对象

| 对象 | 简称 | 作用 |
|------|------|------|
| PersistentVolume | PV | 对存储设备的抽象，由系统管理员维护，描述类型、访问模式、容量等信息 |
| PersistentVolumeClaim | PVC | 给 Pod 使用的对象，相当于 Pod 的代理，向系统申请存储资源；申请成功后 Kubernetes 把 PV 和 PVC"绑定"（bind） |
| StorageClass | - | 抽象特定类型的存储系统（如 Ceph、NFS），在 PVC 和 PV 间充当"协调人"，帮助 PVC 找到合适的 PV，简化挂载过程 |

用"中间层"思想把存储卷的分配管理过程再次细化：因为不同存储设备差异大（速度、读写共享、容量），只用一个 PV 管理太勉强，不符合"单一职责"，让 Pod 直接选 PV 也不灵活，于是增加 PVC 和 StorageClass。

> 生活类比：在公司要 10 张纸打印资料，给前台打电话讲清需求（相当于 PVC 申请资源）；前台里各种牌子/规格的办公用纸（相当于 StorageClass）；前台根据需要挑品牌、从库存拿出一包 A4 纸，在登记表添记录（PVC 到 PV 的绑定）；最后到手里的 A4 纸包就是 PV 存储对象。

-> 详见 PV 与 PVC 的 YAML 与使用

## 如何在 Pod 里挂载 PV

PV 和 PVC 绑定好后，用法和第 14 讲差不多：先在 `spec.volumes` 定义存储卷，再在 `containers.volumeMounts` 挂载进容器。因为用的是 PVC，要在 volumes 里用字段 `persistentVolumeClaim` 指定 PVC 的名字。

HostPath 类型的 PV 数据存储在节点本地，速度快但不能跟随 Pod 迁移：Pod 重建时若被调度到其他节点，即使加载本地目录也不是之前的存储位置，持久化失效。所以 HostPath 一般做测试，或用于 DaemonSet 这样与节点关系密切的应用。下节课讲实现真正的任意数据持久化。

-> 详见 PV 与 PVC 的 YAML 与使用

## 分笔记索引

- **PV 与 PVC 的 YAML 与使用** — HostPath 类型 PV/PVC 的字段说明、访问模式、绑定过程
- **挂载 PVC 的 Pod 示例** — 在 Pod 里用 persistentVolumeClaim 挂载 PVC 的 YAML
