---
title: 带持久化的 StatefulSet 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, storage, persistentvolume]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：StatefulSet：怎么管理有状态的应用

在 Redis StatefulSet 基础上改造，加上持久化存储功能：`volumeClaimTemplates` 里定义了一个 PVC（名字 redis-100m-pvc，申请 100Mi 的 NFS 存储），Pod 模板里用 `volumeMounts` 引用这个 PVC，把网盘挂载到 `/data` 目录（Redis 的数据目录）。原文称申请"10MB"的 NFS 存储，YAML 字段实际为 `storage: 100Mi`。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-pv-sts

spec:
  serviceName: redis-pv-svc

  volumeClaimTemplates:
    - metadata:
        name: redis-100m-pvc
      spec:
        storageClassName: nfs-client
        accessModes:
          - ReadWriteMany
        resources:
          requests:
            storage: 100Mi

  replicas: 2
  selector:
    matchLabels:
      app: redis-pv-sts

  template:
    metadata:
      labels:
        app: redis-pv-sts
    spec:
      containers:
        - image: redis:5-alpine
          name: redis
          ports:
            - containerPort: 6379
          volumeMounts:
          - name: redis-100m-pvc
            mountPath: /data
```
