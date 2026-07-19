---
title: StatefulSet 的数据持久化
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, storage, persistentvolume]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：StatefulSet：怎么管理有状态的应用

有了固定的名字、启动顺序和网络标识，再加上数据持久化功能，就可以实现对有状态应用的管理了。

这里能用到上一节课的 PersistentVolume 和 NFS 知识：定义 StorageClass，编写 PVC，再给 Pod 挂载 Volume。

## volumeClaimTemplates

为了强调持久化存储与 StatefulSet 的一对一绑定关系，Kubernetes 为 StatefulSet 专门定义了一个字段 `volumeClaimTemplates`，直接把 PVC 定义嵌入 StatefulSet 的 YAML 文件。这样能保证创建 StatefulSet 的同时，就会为每个 Pod 自动创建 PVC，让 StatefulSet 的可用性更高。

`volumeClaimTemplates` 可以和 Pod 的 `template`、Job 的 `jobTemplate` 对比起来学习，它其实也是一个"套娃"的对象组合结构，里面就是应用了 StorageClass 的普通 PVC。

-> 详见 带持久化的 StatefulSet 示例

## PVC 的命名规律

`kubectl apply` 创建对象后，用 `kubectl get pvc` 查看 StatefulSet 关联的存储卷状态。这两个 PVC 的命名不是随机的，是有规律的，用的是 PVC 名字加上 StatefulSet 的名字组合而成。所以即使 Pod 被销毁，因为它的名字不变，还能够找到这个 PVC，再次绑定使用之前存储的数据。

`volumeClaimTemplates` 配置的 PVC 用于多个 Pod 时，容器中挂载的 NFS 文件系统是分别两个不同的 PVC，两个 Redis 中的数据是分别隔离的，这是正常的（模板会创建各自独立的 PV，因为存储是和 Pod 绑定的）。

## 数据恢复验证

实地验证持久化恢复：

1. 用 `kubectl exec` 运行 Redis 客户端，添加 KV 数据（如 a=111、b=222）：

   ```bash
   kubectl exec -it redis-pv-sts-0 -- redis-cli
   ```

2. 模拟意外事故，删除这个 Pod：

   ```bash
   kubectl delete pod redis-pv-sts-0
   ```

3. StatefulSet 和 Deployment 一样会监控 Pod 实例，发现 Pod 数量少了就会很快创建出新的 Pod，并且名字、网络标识都和之前的 Pod 一模一样。

4. 再用 Redis 客户端登录检查：因为把 NFS 网络存储挂载到了 Pod 的 `/data` 目录，Redis 会定期把数据落盘保存，新创建的 Pod 再次挂载目录时会从备份文件里恢复数据，内存里的数据就恢复原状了。

## 常见问题

- Kubernetes 里存储和应用是分离的，Deployment 和 StatefulSet 在使用 PVC 持久化数据时没有必然的关系区别，只是 StatefulSet 在创建 PVC 时有特别的规则。
- 若不使用 `volumeClaimTemplates` 内嵌定义 PVC，改用独立定义的 PVC，生成的 PVC 名称就不是固定的，Pod 重建后使用的 PVC 可能不是之前的，会出现状态不一致；多个副本可能挂载同一个网络存储设备，可能导致数据丢失。
