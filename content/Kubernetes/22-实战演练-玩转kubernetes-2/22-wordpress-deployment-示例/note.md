---
title: WordPress Deployment 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, wordpress]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（2）

WordPress 的 Deployment 写法和 MariaDB 一样，给 Pod 套一个 Deployment 的"外壳"，replicas 设置成 2，用字段 envFrom 配置环境变量：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: wp-dep
  name: wp-dep

spec:
  replicas: 2
  selector:
    matchLabels:
      app: wp-dep

  template:
    metadata:
      labels:
        app: wp-dep
    spec:
      containers:
      - image: wordpress:5
        name: wordpress
        ports:
        - containerPort: 80
        envFrom:
        - prefix: 'WORDPRESS_DB_'
          configMapRef:
            name: wp-cm
```
