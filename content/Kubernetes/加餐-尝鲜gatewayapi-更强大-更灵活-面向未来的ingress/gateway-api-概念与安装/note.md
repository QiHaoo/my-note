---
title: Gateway API 概念与安装
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Gateway API
  - Ingress
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：尝鲜 Gateway API：更强大、更灵活、面向未来的 Ingress

## Ingress 的问题

Ingress 管理集群进出流量，提供完善的负载均衡和反向代理功能，是部署 Kubernetes 应用必不可缺的组件。但它的缺点也很明显：

- 自身能力较弱，只能编写有限的路由规则，不能完全满足各种实际需求
- Ingress Controller 的实现者（NGINX Ingress Controller、Kong Ingress Controller 等）不得不使用大量的 annotation 和 CRD 来定制、扩展功能

这种实现混乱的局面被戏称为“annotations wild west”，对 Kubernetes 用户非常不友好：同一功能在不同 Ingress Controller 之间用法差异极大，迁移成本非常高，没有统一的标准导致 Ingress 使用起来相当麻烦。

## Gateway API 的发起

Kubernetes 社区打算参考 Ingress，重新设计一组对象来解决这些问题。2019 年末圣地亚哥的 KubeCon 上，许多不同背景的人们发起了 Gateway API 项目，目标是全面替代和超越 Ingress，更好地管理 Kubernetes 里各方向的流量。

因为有 Ingress 的“前车之鉴”，Gateway API 一开始就具备了良好的架构，避免了 Ingress 所踩过的“坑”，进展比较顺利。

## 三个核心对象

2023 年 1 月发布的 1.0 版本包括 3 个已经成熟稳定的对象：GatewayClass、Gateway 和 HTTPRoute。

由于 Gateway API 是 Ingress 的后继者，可对比 Ingress 来理解它们的概念和作用：

| Gateway API 对象 | 类比 Ingress 体系 | 管理者 |
|------|------|------|
| GatewayClass（最上层） | IngressClass | 由各个云厂商提供 |
| Gateway（中间） | Ingress Controller | 由集群管理员管理 |
| HTTPRoute（下面） | Ingress | 由开发人员管理，定义路由规则，规定流量将如何被 Gateway 分发到集群里的 Service 和 Pod |

Gateway API 的结构非常清晰明了，很容易理解。

### Gateway 与 Kong Ingress Controller 的关系

现在的 Gateway API 一般都是在 Ingress Controller 里实现的。HTTPRoute 通过 `parentRefs.0.name` 指向 Gateway 对象（而非像 Ingress 那样用 `spec.ingressClassName` 指向 IngressClass），Gateway 再关联到 Kong Ingress Controller 这样的实现。

## 安装 Gateway API

Gateway API 只支持较新的 Kubernetes，不能运行在 Kubernetes 1.23 上，最好使用最新版本的 Kubernetes。本文选用 minikube 1.32.0，Kubernetes 1.28.3：

```bash
# Intel x86_64 / Apple arm64
curl -Lo minikube https://storage.googleapis.com/minikube/releases/...
sudo install minikube /usr/local/bin/
minikube start --kubernetes-version=v1.28.3
kubectl version
```

Gateway API 比较特殊，并不是集成在 Kubernetes 内部，而是在外部以相对独立的方式开发实现，所以需要用 YAML 文件的形式部署进 Kubernetes。在 Gateway API 项目网站可找到安装命令：

```bash
wget https://github.com/kubernetes-sigs/gateway-api/releases/download/.../standard-install.yaml
kubectl apply -f standard-install.yaml
```

### 验证安装

```bash
kubectl api-resources | grep gateway
```

证明 Gateway API 已成功安装到当前 Kubernetes 集群。注意 GatewayClass 的缩写是 `gc`，Gateway 的缩写是 `gtw`。

## 创建 GatewayClass 和 Gateway

目前 GatewayClass 和 Gateway 还不能使用 `kubectl create` 生成样板，只能手动编写。定义一个叫 `kong-gc` 的 GatewayClass 对象（指定使用的 Controller 是 `konghq.com/kic-gateway-controller`），再定义 Gateway 对象 `kong-gtw`，关联 `kong-gc`，在 80 端口上处理 HTTP 协议。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: kong-gc
  annotations:
    konghq.com/gatewayclass-unmanaged: 'true'
spec:
  controllerName: konghq.com/kic-gateway-controller
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: kong-gtw
spec:
  gatewayClassName: kong-gc
  listeners:
  - name: proxy
    port: 80
    protocol: HTTP
```

`kubectl apply` 后用 `kubectl get` 命令，会看到它们已经创建成功。
