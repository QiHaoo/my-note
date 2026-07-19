---
title: NFS 动态 Pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, persistentvolume]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume+NFS：怎么使用网络共享存储

在 Pod 里用 volumes 和 volumeMounts 挂载动态 PVC，Kubernetes 会自动找到 NFS Provisioner，在 NFS 的共享目录上创建出合适的 PV 对象：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-dyn-pod

spec:
  volumes:
  - name: nfs-dyn-10m-vol
    persistentVolumeClaim:
      claimName: nfs-dyn-10m-pvc

  containers:
  - name: nfs-dyn-test
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: nfs-dyn-10m-vol
      mountPath: /tmp
```
