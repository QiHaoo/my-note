---
title: 谈谈 Kong Ingress Controller
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Ingress
  - Kong
  - OpenResty
  - Kubernetes
reviewable: true
module: extras
---

## 核心概念

Kong Ingress Controller 站在 Nginx 这个巨人的肩膀之上，基于 OpenResty 和内嵌的 LuaJIT 环境，实现了完全动态的路由变更，消除了 Nginx Ingress Controller 因改静态配置文件需 reload 的成本。它支持标准 Ingress 资源，并通过 annotations 和 CRD（尤其插件机制）提供丰富的扩展增强功能。

## 认识 Kong Ingress Controller

Ingress 类似 Service，基于 HTTP/HTTPS 协议，是七层负载均衡规则的集合，但自身没有管理能力，必须借助 Ingress Controller 才能控制集群进出流量。

| Ingress Controller | 内核/实现 | 配置变更方式 | 架构特点 |
|------|------|------|------|
| Nginx Ingress Controller | 局限于 Nginx 自身能力 | Ingress、Service 等对象更新时需修改静态配置文件再重启进程（reload），变动频繁的微服务里会引发问题 | 管理进程与代理进程在同一容器 |
| Kong Ingress Controller | 基于 Nginx + OpenResty + LuaJIT | 完全动态路由变更，消除 reload 成本，运行更平稳，有额外增强功能 | Pod 内两个容器：Controller（管理）与 Proxy（代理），用 Loopback 通信，可各自升级维护 |

Kong Ingress Controller 适合对集群流量有更高、更细致管理需求的用户。它是 CNCF 云原生项目，且已开始支持新的 Gateway API。

-> 详见 Kong Ingress Controller 的认识与安装

## 安装 Kong Ingress Controller

Kong Ingress Controller（2.7.0）的安装 YAML 存放在解压后的 `deploy` 目录，提供“有数据库”和“无数据库”两种部署方式。选最简单的“无数据库”方式，只需一个 `all-in-one-dbless.yaml`：

`kubectl apply -f all-in-one-dbless.yaml`

与 Nginx Ingress Controller（多个分散 YAML，需顺序多次 apply）相比，Kong 把 Namespace、RBAC、Secret、CRD 等合并到一个文件，安装方便，也不易遗漏资源。

安装后创建名字空间 `kong`，内有默认 Ingress Controller 和对应 Service。Pod 的 READY 列显示 `2/2`（两个容器：Controller 与 Proxy）。Controller 容器不含 Shell 无法进入，`kubectl exec` 会自动进入默认的 Proxy 容器（Pod 里定义的第一个容器）。

kong-proxy Service 被定义成 LoadBalancer 类型（为生产对外暴露），实验环境（minikube/kubeadm）只能用 NodePort，80 端口映射到节点 32201。未配置任何 Ingress 资源时访问返回 404，响应显示内部 Kong 版本（2.7 内部用 Kong 3.0.1）。

-> 详见 Kong Ingress Controller 的认识与安装

## 使用 Kong Ingress Controller

不使用默认 Ingress Controller，利用 Ingress Class 自己创建一个新实例。步骤：

1. 部署后端应用（Nginx 模拟，ConfigMap 定义配置 + Deployment + Service，Service 名 `ngx-svc`）
2. 定义 IngressClass `kong-ink`，`spec.controller` 值为 `ingress-controllers.konghq.com/kong`
3. 用 `kubectl create ing kong-ing --rule="kong.test/=ngx-svc:80" --class=kong-ink` 生成 Ingress 样板
4. 从 `all-in-one-dbless.yaml` 中分离出 Ingress Controller 的 Deployment 定义，另存 `kic.yml` 并修改

修改 kic.yml 的要点：Deployment/Service 的 metadata.name 重命名（如 ingress-kong-dep、ingress-kong-svc）；selector 和 labels 同步改名；第一个容器（Proxy）可改镜像版本（Kong:2.7/2.8/3.1）；第二个容器（Controller）用环境变量 `CONTROLLER_INGRESS_CLASS` 指定新 Ingress Class 名 `kong-ink`，用 `CONTROLLER_PUBLISH_SERVICE` 指定 Service 名 `kong/ingress-kong-svc`；Service 类型改 NodePort。

测试时需用 `-resolve` 或 `-H` 指定 Ingress 里定义的域名 `kong.test`，否则 Kong Ingress Controller 找不到路由。响应头 `Via` 可见所用 Kong 版本（如 Kong 3.1）。

-> 详见 Kong Ingress Controller 的使用

## 扩展 Kong Ingress Controller

只用标准 Ingress 资源无法发挥 Kong Ingress Controller 真正实力，它还有实用的增强功能，通过 annotations（在第 27 讲介绍过，是资源对象扩展功能的手段）实现。目前支持在 Ingress 和 Service 这两个对象上添加 annotation。

| annotation | 作用 |
|------|------|
| `konghq.com/host-aliases` | 为 Ingress 规则添加额外域名。Ingress 通配符 `*` 只能是前缀不能是后缀（无法写 `abc.*`），用它可“绕过”限制，匹配不同后缀域名 |
| `konghq.com/plugins` | 启用 Kong Ingress Controller 内置的各种插件（Plugins） |

插件是 Kong Ingress Controller 的特色功能，可理解为“预制构件”，附加在流量转发过程中实现数据处理。机制开放：可用官方插件、第三方插件，或用 Lua、Go 编写自定义插件。Kong 维护了认证、安全、流控、分析、日志等约 10 多个认证插件。

定义插件用 CRD 资源 `KongPlugin`（不使用 `spec` 字段，用 `plugin` 指定插件名、`config` 指定配置参数）：

- Response Transformer：修改响应数据，添加/替换/删除响应头或响应体
- Rate Limiting：限速，以时分秒等单位任意限制客户端访问次数

-> 详见 Kong Ingress Controller 的扩展
