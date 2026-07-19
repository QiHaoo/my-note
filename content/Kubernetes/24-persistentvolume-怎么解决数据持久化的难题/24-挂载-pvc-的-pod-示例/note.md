---
title: 挂载 PVC 的 Pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, persistentvolume, pvc]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume：怎么解决数据持久化的难题

把存储卷挂载到 Nginx 容器的 /tmp 目录。因为用的是 PVC，要在 volumes 里用字段 persistentVolumeClaim 指定 PVC 的名字：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-pvc-pod

spec:
  volumes:
  - name: host-pvc-vol
    persistentVolumeClaim:
      claimName: host-5m-pvc

  containers:
  - name: ngx-pvc-pod
    image: nginx:alpine
    ports:
    - containerPort: 80
    volumeMounts:
    - name: host-pvc-vol
      mountPath: /tmp
```
