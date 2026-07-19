---
title: Ingress：集群进出流量的总管
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, ingress, ingress-controller, loadbalancing]
reviewable: true
module: kubernetes-core
---

## 核心概念

Ingress、Ingress Controller、Ingress Class 三个对象联合起来管理集群进出流量，是 Kubernetes 里七层的反向代理和负载均衡对象，是集群入口的总管。

## 为什么要有 Ingress

Service 本质是由 kube-proxy 控制的四层负载均衡，在 TCP/IP 协议栈上转发流量。但四层负载均衡功能有限，只能依据 IP 地址和端口号判断，而多数应用跑在七层 HTTP/HTTPS 上，有主机名、URI、请求头、证书等高级路由条件，这些在 TCP/IP 网络栈里看不见。

Service 另一缺点：较适合代理集群内部服务，暴露到集群外部只能用 NodePort 或 LoadBalancer，都缺乏灵活性。

Kubernetes 引入 Ingress，在七层做负载均衡，并作为流量总入口统管集群进出口数据（"扇入""扇出"，即"南北向"）。Ingress 意为集群内外边界上的入口。

| 对比 | Service | Ingress |
|------|------|------|
| 负载层级 | 四层 | 七层 |
| 路由依据 | IP / 端口 | HTTP/HTTPS 的主机名、URI、请求头、证书等 |
| 对外暴露 | NodePort / LoadBalancer，灵活性不足 | 作为流量总入口管理进出 |

-> 详见 Ingress 三对象与 YAML 描述

## 为什么要有 Ingress Controller

Ingress 是七层上另一种形式的 Service，同样代理后端 Pod、有路由规则（用 HTTP/HTTPS 协议）。但 Ingress 只是 HTTP 路由规则的集合，相当于静态描述文件，自身不具备流量管理能力。

| 对象 | 类比 |
|------|------|
| Service | 规则由 kube-proxy 配置应用；Service 自身无服务能力，没有 kube-proxy 就没用 |
| Ingress | 规则由 Ingress Controller 应用处理；Ingress 自身只是规则集合，没有 Controller 就没用 |

Kubernetes 把 Ingress Controller 的实现交给社区（与上层业务联系太密切），任何遵守 Ingress 规则的人都能开发，造成"百花齐放"。最著名的是老牌反向代理 / 负载均衡软件 Nginx（稳定性最好、性能最高），有多种变种：

| 实现 | 来源 |
|------|------|
| Kubernetes Ingress Controller | 社区 |
| Nginx Ingress Controller | Nginx 公司（下载量最多，本讲示例） |
| Kong Ingress Controller | 基于 OpenResty |

-> 详见 Ingress 三对象与 YAML 描述

## 为什么要有 Ingress Class

最初一个集群一个 Ingress Controller 配多个 Ingress 规则即可，但实践中暴露问题：需引入不同 Ingress Controller 但 Kubernetes 不允许；规则太多让一个 Controller 不堪重负；多个 Ingress 对象无逻辑分组方式；不同租户需求冲突无法部署在同一 Controller。

Ingress Class 插在 Ingress 和 Ingress Controller 中间，作为流量规则和控制器的协调人，解除两者的强绑定关系。用户用 Ingress Class 定义不同业务逻辑分组（如 Class A 处理博客、Class B 处理短视频、Class C 处理购物），彼此独立不冲突。

-> 详见 Ingress 三对象与 YAML 描述

## 如何使用 YAML 描述 Ingress / IngressClass

Ingress 和 Ingress Class 的 `apiVersion` 都是 `networking.k8s.io/v1`，Ingress 简写 `ing`。Ingress Controller 是实际干活的应用程序，由 Deployment / DaemonSet 管理，不单独描述。

Ingress 用 `kubectl create ing` 创建样板，需两个附加参数：`--class`（指定从属的 Ingress Class）、`--rule`（路由规则，形式 `URI=Service`）。

Ingress 的关键字段：

| 字段 | 作用 |
|------|------|
| `ingressClassName` | 指定从属的 Ingress Class |
| `rules` | 路由规则，嵌套层次深：`host` + `http.paths`，path 指定匹配方式（`Exact` 精确 / `Prefix` 前缀），`backend` 指定转发目标 Service |

Ingress Class 的 `spec` 只有一个必需字段 `controller`，表示使用哪个 Ingress Controller（如 `nginx.org/ingress-controller`）。

-> 详见 Ingress 三对象与 YAML 描述

## 使用 Ingress / IngressClass / Ingress Controller

Ingress Class 很小，可与 Ingress 合成一个 YAML 文件（对象间用 `---` 分隔）。`kubectl apply` 创建后用 `kubectl get ingressclass` / `kubectl get ing` 查看，`kubectl describe ing` 看详细路由信息。

部署 Ingress Controller（以 Nginx Ingress Controller 为例，以 Pod 形式运行，支持 Deployment / DaemonSet）需先执行多个安装 YAML（名字空间、RBAC、ConfigMap、Secret），再用 Deployment YAML 并做几处改动：

| 改动项 | 说明 |
|------|------|
| `metadata.name` | 改成自己的名字，如 `ngx-kic-dep` |
| `spec.selector` / `template.metadata.labels` | 改成自己的名字 |
| `containers.image` | 可改用 alpine 版本加快下载，如 `nginx/nginx-ingress:2.2-alpine` |
| `args` | 加上 `-ingress-class=ngx-ink`（前面创建的 Ingress Class 名），这是让 Controller 管理 Ingress 的关键 |

Ingress Controller 位于独立名字空间 `nginx-ingress`，查看状态需用 `-n` 显式指定。

Ingress Controller 本身也是 Pod，向外提供服务还需依赖 Service（NodePort 或 LoadBalancer）。测试时可用 `kubectl port-forward` 把本地端口映射到 Controller Pod。

Ingress 路由规则是 HTTP 协议，不能用 IP 地址访问，必须用域名 / URI。可用 `--resolve` 参数指定域名解析（如把 `ngx.test` 强制解析到 `127.0.0.1`）。

-> 详见 Ingress 的使用与 Controller 部署

## 分笔记索引

- **Ingress 三对象与 YAML 描述** — 三对象由来、api-resources、Ingress 与 IngressClass 的 YAML 样板
- **Ingress 的使用与 Controller 部署** — 创建 Ingress/IngressClass、部署 Controller、暴露与测试访问