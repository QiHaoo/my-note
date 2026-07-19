---
title: Ingress 的使用与 Controller 部署
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, ingress, ingress-controller, deployment]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Ingress：集群进出流量的总管

## 创建 Ingress 与 Ingress Class

Ingress Class 很小，可与 Ingress 合成一个 YAML 文件（对象间用 `---` 分隔）：

```bash
kubectl apply -f ingress.yml
```

```bash
kubectl get ingressclass
kubectl get ing
```

```bash
kubectl describe ing ngx-ing
```

Ingress 对象的路由规则 Host/Path 就是 YAML 里设置的域名 `ngx.test/`，已关联第 20 讲创建的 Service 对象，以及 Service 后面的两个 Pod。不要对 Ingress 里 "Default backend" 的错误提示感到惊讶，它用于找不到路由时提供默认后端服务，不设置也没问题，多数时候忽略。

## 部署 Ingress Controller

Nginx Ingress Controller 以 Pod 形式运行在 Kubernetes 里，支持 Deployment 和 DaemonSet 两种部署方式（本讲选 Deployment）。安装略微麻烦，多个 YAML 需执行，简单试验只需 4 个：

```bash
kubectl apply -f common/ns-and-sa.yaml
kubectl apply -f rbac/rbac.yaml
kubectl apply -f common/nginx-config.yaml
kubectl apply -f common/default-server-secret.yaml
```

前两条为 Ingress Controller 创建独立名字空间 `nginx-ingress`，还有相应账号和权限（访问 apiserver 获取 Service、Endpoint 信息用）；后两条创建 ConfigMap 和 Secret，配置 HTTP/HTTPS 服务。

### 修改 Deployment YAML

Nginx 已提供示例 YAML，创建前需做几处改动以适配自己的应用：

| 改动项 | 说明 |
|------|------|
| `metadata.name` | 改成自己的名字，如 `ngx-kic-dep` |
| `spec.selector` / `template.metadata.labels` | 改成自己的名字，如 `ngx-kic-dep` |
| `containers.image` | 可改用 alpine 版本加快下载，如 `nginx/nginx-ingress:2.2-alpine` |
| `args` | 加上 `-ingress-class=ngx-ink`（前面创建的 Ingress Class 名），这是让 Ingress Controller 管理 Ingress 的关键 |

修改后的 Ingress Controller YAML 大致如下：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-kic-dep
  namespace: nginx-ingress

spec:
  replicas: 1
  selector:
    matchLabels:
      app: ngx-kic-dep
  template:
    metadata:
      labels:
        app: ngx-kic-dep
    ...
    spec:
      containers:
      - image: nginx/nginx-ingress:2.2-alpine
        ...
        args:
        - -ingress-class=ngx-ink
```

### 创建并查看

```bash
kubectl apply -f kic.yml
```

Ingress Controller 位于名字空间 `nginx-ingress`，查看状态需用 `-n` 显式指定，否则只看到 `default` 名字空间的 Pod：

```bash
kubectl get deploy -n nginx-ingress
kubectl get pod -n nginx-ingress
```

## 对外暴露 Ingress Controller

Ingress Controller 本身也是 Pod，向外提供服务还需依赖 Service（NodePort 或 LoadBalancer）暴露端口，才能真正打通集群内外流量。

测试时可用 `kubectl port-forward`（第 15 讲提到）直接把本地端口映射到集群某个 Pod。下面把本地 8080 映射到 Ingress Controller Pod 的 80：

```bash
kubectl port-forward -n nginx-ingress ngx-kic-dep-8859b7b86-cplgp 8080:80
```

## 测试访问

Ingress 路由规则是 HTTP 协议，不能用 IP 地址访问，必须用域名、URI。可修改 `/etc/hosts` 手工添加域名解析，或用 `--resolve` 参数指定域名解析规则。把 `ngx.test` 强制解析到 `127.0.0.1`（被 kubectl port-forward 转发的本地地址）：

```bash
curl --resolve ngx.test:8080:127.0.0.1 http://ngx.test:8080
```

最终效果与上一讲 Service 一样，都把请求转发到集群内部 Pod，但 Ingress 的路由规则不再是 IP 地址，而是 HTTP 协议里的域名、URI 等要素。

## Ingress Controller 的更多能力

目前的 Kubernetes 流量管理功能主要集中在 Ingress Controller 上，已远不止管理"入口流量"，还能管理"出口流量"（egress），甚至集群内部服务之间的"东西向流量"。

Ingress Controller 通常还有很多其他功能：TLS 终止、网络应用防火墙、限流限速、流量拆分、身份认证、访问控制等，可认为是一个全功能的反向代理或网关。