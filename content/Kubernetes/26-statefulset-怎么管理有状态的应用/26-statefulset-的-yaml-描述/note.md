---
title: StatefulSet 的 YAML 描述
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：StatefulSet：怎么管理有状态的应用

`kubectl api-resources` 可查到 StatefulSet 简称是 `sts`。StatefulSet 不能直接用 `kubectl create` 生成样板文件（和 DaemonSet 类似），但对象描述和 Deployment 差不多，可以把 Deployment 适当修改得到。

YAML 文件头信息：

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xxx-sts
```

## 与 Deployment 的关键区别

以一个使用 Redis 的 StatefulSet 为例，与 Deployment 的差异只有两点：`kind` 必须是 StatefulSet，`spec` 里多出一个 `serviceName` 字段，其余部分（replicas、selector、template 等）一模一样。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sts

spec:
  serviceName: redis-svc
  replicas: 2
  selector:
    matchLabels:
      app: redis-sts

  template:
    metadata:
      labels:
        app: redis-sts
    spec:
      containers:
        - image: redis:5-alpine
          name: redis
          ports:
            - containerPort: 6379
```

这两个不同之处（`kind` 与 `serviceName`）就是 StatefulSet 与 Deployment 的关键区别。
