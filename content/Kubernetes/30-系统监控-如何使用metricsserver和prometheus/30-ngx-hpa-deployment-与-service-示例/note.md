---
title: ngx-hpa Deployment 与 Service 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, monitoring, hpa, 示例]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：系统监控：如何使用MetricsServer和Prometheus

定义 Deployment 和 Service，创建 Nginx 应用，作为 HorizontalPodAutoscaler 自动伸缩的目标对象。注意 Deployment 的 `spec` 里一定要用 `resources` 字段写清资源配额，否则 HPA 无法获取 Pod 指标。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-hpa-dep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ngx-hpa-dep
  template:
    metadata:
      labels:
        app: ngx-hpa-dep
    spec:
      containers:
      - image: nginx:alpine
        name: nginx
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 50m
            memory: 10Mi
          limits:
            cpu: 100m
            memory: 20Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ngx-hpa-svc
spec:
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: ngx-hpa-dep
```

这里只部署了一个 Nginx 实例，名字是 `ngx-hpa-dep`。

-> 详见 HorizontalPodAutoscaler
