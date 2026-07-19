---
title: Deployment 对象定义 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Deployment：让应用永不宕机

-> 详见 Deployment 的 YAML 描述与样板

用 `kubectl create deploy ngx-dep --image=nginx:alpine --dry-run=client -o yaml` 生成的 Deployment 样板。`spec` 部分比 Job/CronJob 多了 `replicas`、`selector` 两个关键字段。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: ngx-dep
  name: ngx-dep

spec:
  replicas: 2
  selector:
    matchLabels:
      app: ngx-dep

  template:
    metadata:
      labels:
        app: ngx-dep
    spec:
      containers:
      - image: nginx:alpine
        name: nginx
```

注意 `selector.matchLabels` 里的 `app: ngx-dep` 与 `template.metadata.labels` 里的 `app: ngx-dep` 必须一致，Deployment 才能找到并管理由模板创建出的 Pod。
