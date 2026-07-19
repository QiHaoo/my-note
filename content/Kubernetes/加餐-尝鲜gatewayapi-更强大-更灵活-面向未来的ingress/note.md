---
title: 尝鲜 Gateway API：更强大、更灵活、面向未来的 Ingress
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Ingress
  - Gateway API
  - Kong
  - Kubernetes
reviewable: true
module: extras
---

## 核心概念

Gateway API 是 Ingress 的继任者，2019 年末发起，经过近 4 年讨论、测试和验证，于 2023 年 1 月正式发布 1.0（GA，generally available）。它参考 Ingress 重新设计一组对象，全面替代和超越 Ingress，更好地管理 Kubernetes 里各方向的流量，结构清晰、功能更强大、用法更灵活，是 Kubernetes 社区今后的重点发展方向。

## 什么是 Gateway API

Ingress 管理集群进出流量、提供负载均衡和反向代理，但自身能力较弱，只能编写有限的路由规则，所以 Ingress Controller 实现者（NGINX IC、Kong IC 等）不得不使用大量 annotation 和 CRD 来定制扩展功能。这种实现混乱的局面被戏称为“annotations wild west”，同一功能在不同 Ingress Controller 间用法差异极大、迁移成本高。

Gateway API 在 2019 年末圣地亚哥 KubeCon 上发起，目标全面替代和超越 Ingress。2023 年 1 月发布的 1.0 版本包括 3 个成熟稳定的对象，可与 Ingress 类比理解：

| Gateway API 对象 | 类比 Ingress 体系 | 管理者 |
|------|------|------|
| GatewayClass | IngressClass | 各云厂商提供 |
| Gateway | Ingress Controller | 集群管理员管理 |
| HTTPRoute | Ingress | 开发人员管理，定义路由规则，规定流量如何被 Gateway 分发到 Service 和 Pod |

Gateway API 正式发布时大部分厂商还是预览/测试版，只有 GKE 和 Kong 几乎同步实现 GA，本文以 Kong 为例介绍。

-> 详见 Gateway API 概念与安装

## 安装 Gateway API

Gateway API 只支持较新版本的 Kubernetes（不能运行在 1.23 上），建议用最新版。本文用 minikube 1.32.0、Kubernetes 1.28.3。

Gateway API 比较特殊，不集成在 Kubernetes 内部，而是以相对独立的方式在外部开发实现，需用 YAML 文件部署进 Kubernetes：

```bash
wget https://github.com/kubernetes-sigs/gateway-api/releases/download/.../standard-install.yaml
kubectl apply -f standard-install.yaml
```

用 `kubectl api-resources | grep gateway` 查看新对象，GatewayClass 缩写是 `gc`，Gateway 缩写是 `gtw`。GatewayClass 和 Gateway 目前不能用 `kubectl create` 生成样板，只能手动编写。

-> 详见 Gateway API 概念与安装

## 安装 Kong Ingress Controller（Helm）

Kong Gateway 的实现仍以 Ingress Controller 形式（Kong Ingress Controller）。本次用 3.0.0，相比之前加餐的 2.7.0 里里外外都发生很多变化。2.x 可用 YAML 直接安装，3.0.0 废弃了这种方式，只能用 Helm 或 Operator 安装，本文用 Helm。

Helm 类似 Linux 的 yum、apt，可把众多 YAML 组合成安装包再轻松部署进 Kubernetes。安装步骤：

- 执行官方脚本安装 Helm
- `helm repo add kong https://charts.konghq.com` + `helm repo update` 添加远端仓库
- `helm repo list` / `helm search repo kong` 查看可用安装包（`kong/ingress` 即 Kong IC）
- `helm install` 指定名字和安装包，加 `--set gateway.env.router_flavor=expressions` 启用表达式路由，更好支持 Gateway API

Kong IC 默认装在 kong 名字空间。`kong-gateway-proxy` Service 类型是 LoadBalancer，实验环境端口是 31198。未配置 HTTPRoute 时 curl 访问返回 404。此时检查 GatewayClass 和 Gateway，ACCEPTED 和 PROGRAMMED 字段都变成 True，表示 Gateway 已正确关联 Kong IC。

-> 详见 安装 Kong Ingress Controller 与后端服务

## 使用 Gateway API 路由

Gateway API 支持任意配置各种路由规则，功能丰富：

| 路由能力 | 说明 |
|------|------|
| 域名匹配 | 用 `hostnames` 指定一个或多个域名 |
| 路径匹配 | `matches` 里用 `path`，支持精确、前缀、正则匹配 |
| 头字段匹配 | `matches` 里用 `headers`，可组合各种匹配条件 |
| 流量拆分 | 调整 `backendRefs` 实现金丝雀部署、蓝绿部署，用 `weight` 指定权重调节流量比例 |
| filter | 对流量做附加处理（速率限制、改写数据、身份验证等），目前标准 filter 不多，有时仍依赖 CRD 定义 Plugin |

HTTPRoute 对象和 Ingress 很相似但要简洁些：用 `parentRefs` 指定路由使用的 Gateway 对象，用 `hostnames` 指定域名，用 `backendRefs` 指定后端 Service。filter 中的 `ResponseHeaderModifier` 可添加响应头（如 `A-New-Header: k8s-gtw-api`），与 Kong IC 加餐里的 KongPlugin 限速插件对比可见两者区别。

-> 详见 使用 Gateway API 路由
