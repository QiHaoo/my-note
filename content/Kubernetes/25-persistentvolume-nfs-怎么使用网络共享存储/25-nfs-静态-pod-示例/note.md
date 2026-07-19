---
title: NFS 静态 Pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, persistentvolume]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume+NFS：怎么使用网络共享存储

创建一个 Pod，把 PVC 挂载成它的一个 volume，用 persistentVolumeClaim 指定 PVC 的名字：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nfs-static-pod

spec:
  volumes:
  - name: nfs-pvc-vol
    persistentVolumeClaim:
      claimName: nfs-static-pvc

  containers:
  - name: nfs-pvc-test
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: nfs-pvc-vol
      mountPath: /tmp
```
