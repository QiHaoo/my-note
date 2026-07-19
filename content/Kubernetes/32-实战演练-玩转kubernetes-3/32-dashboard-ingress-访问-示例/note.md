---
title: Dashboard Ingress 访问 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, dashboard, ingress, 示例]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（3）

Dashboard HTTPS 访问所需的 Ingress 对象与示例用户（ServiceAccount + ClusterRoleBinding）YAML。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dash-ing
  namespace: kubernetes-dashboard
  annotations:
    nginx.org/ssl-services: "kubernetes-dashboard"
spec:
  ingressClassName: dash-ink
  tls:
  - hosts:
    - k8s.test
    secretName: dash-tls
  rules:
  - host: k8s.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
```

-> 详见 Dashboard 部署与 Ingress 访问
