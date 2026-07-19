---
title: MariaDB Deployment 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, mariadb, wordpress]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（2）

MariaDB 由 Pod 改成 Deployment 的方式，replicas 设置成 1，template 里的 Pod 部分没有任何变化，仍用 envFrom 把配置信息以环境变量形式注入 Pod，相当于给 Pod 套了一个 Deployment 的"外壳"：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: maria-dep
  name: maria-dep

spec:
  replicas: 1
  selector:
    matchLabels:
      app: maria-dep

  template:
    metadata:
      labels:
        app: maria-dep
    spec:
      containers:
      - image: mariadb:10
        name: mariadb
        ports:
        - containerPort: 3306
        envFrom:
        - prefix: 'MARIADB_'
          configMapRef:
            name: maria-cm
```
