---
title: Ingress Controller Deployment 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, ingress, deployment, wordpress]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（2）

Ingress Controller 对象从 Nginx 项目的示例 YAML 修改而来，要改动名字、标签，还有参数里的 IngressClass。按基本架构所述，这个 Ingress Controller 不使用 Service，而是给它的 Pod 加一个特殊字段 hostNetwork，让 Pod 能够使用宿主机的网络，相当于另一种形式的 NodePort：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wp-kic-dep
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: wp-kic-dep

  template:
    metadata:
      labels:
        app: wp-kic-dep
    spec:
      serviceAccountName: nginx-ingress

      # use host network
      hostNetwork: true

      containers:
        ...
```
