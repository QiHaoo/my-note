---
title: NFS 静态存储卷
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, persistentvolume]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume+NFS：怎么使用网络共享存储

为 Kubernetes 配置好 NFS 存储系统后，就可以用它创建新的 PV 存储对象。手工分配一个存储卷：storageClassName 是 nfs，accessModes 设成 ReadWriteMany（NFS 支持多个节点同时访问一个共享目录），YAML 里添加 nfs 字段指定服务器 IP 和共享目录名。

在 NFS 服务器的 `/tmp/nfs` 目录里创建新目录 `1g-pv`，表示分配 1GB 可用存储空间，相应 PV 的 capacity 也要设成同样的 1Gi。

## 静态 PV

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-1g-pv

spec:
  storageClassName: nfs
  accessModes:
  - ReadWriteMany
  capacity:
    storage: 1Gi
  nfs:
    path: /tmp/nfs/1g-pv
    server: 192.168.10.208
```

```bash
kubectl apply -f nfs-static-pv.yml
kubectl get pv
```

> 注意：spec.nfs 里的 IP 一定要正确，路径一定要存在（事先创建好），否则 Kubernetes 按 PV 描述无法挂载 NFS 共享目录，PV 会处于 pending 状态无法使用。

## 静态 PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-static-pvc

spec:
  storageClassName: nfs
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
```

创建 PVC 后，Kubernetes 根据 PVC 描述找到最合适的 PV，把它们"绑定"在一起，存储分配成功。

## 挂载 PVC 的 Pod

-> 详见 NFS 静态 Pod 示例

因为 PV/PVC 指定了 storageClassName 是 nfs，节点上也安装了 NFS 客户端，Kubernetes 会自动执行 NFS 挂载，把 NFS 共享目录 `/tmp/nfs/1g-pv` 挂载到 Pod 里的 `/tmp`，完全不需要手动管理。

测试：`kubectl apply` 创建 Pod 后，用 `kubectl exec` 进入 Pod 操作 NFS 共享目录，创建的文件会写入共享目录。NFS 是网络服务，不受 Pod 调度位置影响，只要网络通畅 PV 一直可用，数据实现真正的持久化存储。

## 常见问题

- **NFS 路径必须提前创建**：spec.nfs 路径不存在时，PV 不会处于 pending 状态，但创建 Pod 时会起不来，报错 `reason given by server: No such file or directory`，还是提前创建目录保险（与 HostPath 不同，NFS 必须手工创建）。
- **/tmp 目录会被清空**：Linux 中 /tmp 目录下内容每次开机都会被清空，课程用 tmp 目录是为了方便，长期使用 NFS 存储可换成其他目录。
- **挂载目录不能与共享目录根目录相同**：有同学挂载成功但创建文件没同步到服务端，原因是客户端目录和服务端共享目录一样导致。修改挂载目录路径即可。
- **Kubernetes 不能自行挂载 NFS**：Kubernetes 运行在 Linux 之上，自身没有能力挂载 NFS，且 NFS 盘应分目录存放数据，直接用容易冲突导致数据损坏。
- **静态 PV 不需要 StorageClass 对象**：静态存储和使用时，只需在 PV 和 PVC 中加上相同的 storageClassName 名字属性即可关联，不需要 StorageClass 对象；StorageClass 存在的意义主要在于动态 PV。
