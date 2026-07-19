---
title: 实战演练：玩转Kubernetes（2）
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, service, ingress, wordpress]
reviewable: true
module: kubernetes-core
---

## 核心概念

作为"中级篇"收尾，本讲回顾 Deployment、DaemonSet、Service、Ingress 等 API 对象，并用它们在 Kubernetes 集群里重新搭建 WordPress 网站，舍弃 Docker 和裸 Pod，为网站增加横向扩容、服务发现和七层负载均衡三项功能。

## Kubernetes 技术要点回顾

| 对象 | 讲次 | 作用 | 关键字段/概念 |
|------|------|------|---------------|
| Deployment | 18 | 管理在线业务，部署多个应用实例，可增减实例数量应对流量 | replicas（实例数量）、selector（用标签筛选被管理的 Pod，松耦合） |
| DaemonSet | 19 | 类似 Deployment，但在每个节点上运行一个 Pod 实例，适合日志、监控 | 污点（taint）、容忍度（toleration）调整部署策略 |
| Service | 20 | 对 Pod IP 的抽象，固定 IP，用 iptables 负载均衡到后端 Pod | kube-proxy 实时维护健康 Pod；基于 DNS 插件支持域名 |
| Ingress | 21 | 七层负载均衡，定义 HTTP 路由规则 | 需 Ingress Controller 和 IngressClass 配合 |

Ingress Controller 是真正的集群入口，应用 Ingress 规则调度、分发流量，还能扮演反向代理，提供安全防护、TLS 卸载等功能。IngressClass 用来管理 Ingress 和 Ingress Controller，方便分组路由规则。

Ingress Controller 本身也是一个 Pod，把服务暴露到集群外部仍要依靠 Service（NodePort 端口范围有限，LoadBalancer 依赖云厂商）。折中办法是用少量 NodePort 暴露 Ingress Controller，用 Ingress 路由到内部服务，外部再用反向代理或 LoadBalancer 把流量引进来。

## WordPress 网站基本架构

相比之前用 Docker / minikube 搭建，本次完全舍弃 Docker，所有应用都放在 Kubernetes 集群里运行，部署方式从裸 Pod 改为 Deployment，稳定性大幅提升。

| 变化点 | 说明 |
|------|------|
| Nginx | 原作反向代理，升级为具有相同功能的 Ingress Controller |
| WordPress | 原一个实例，现两个实例（可任意横向扩容），可用性提高 |
| MariaDB | 为保证数据一致性，暂时还是一个实例 |
| 服务发现 | 不再手动查 Pod IP，为它们定义 Service 对象，用域名访问 MariaDB、WordPress |

对外提供服务两种方式：
- 让 WordPress 的 Service 以 NodePort 直接对外暴露端口 30088，方便测试
- 给 Nginx Ingress Controller 添加 `hostNetwork` 属性，直接使用节点端口，类似 Docker 的 host 网络模式，避开 NodePort 端口范围限制

> 小技巧：实际操作时善用 `kubectl create`、`kubectl expose` 创建样板文件，节约时间也避免低级格式错误。

-> 详见 WordPress 网站部署步骤

## 分笔记索引

- **WordPress 网站部署步骤** — 三步在 K8s 搭建 WordPress（MariaDB / WordPress / Ingress Controller）
- **MariaDB Deployment 示例** — MariaDB 的 Deployment YAML（replicas=1，envFrom 注入配置）
- **WordPress Deployment 示例** — WordPress 的 Deployment YAML（replicas=2，envFrom 注入配置）
- **Ingress Controller Deployment 示例** — Ingress Controller 的 Deployment YAML（hostNetwork 模式）
