---
title: Service：微服务架构的应对之道
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, service, loadbalancing, dns]
reviewable: true
module: kubernetes-core
---

## 核心概念

Service 是 Kubernetes 集群内部的负载均衡机制，解决"服务发现"关键问题。它用静态（且虚拟）IP 地址代理动态变化的 Pod 集合，屏蔽后端变化，是微服务 / 服务网格等架构的基础设施。

## 为什么要有 Service

Pod 生命周期短暂，Deployment / DaemonSet 维持 Pod 总体数量稳定，但运行中 Pod 会销毁重建，IP 地址动态变化。微服务架构下后端 Pod IP 老是变化，客户端无法访问。

业内对"不稳定"后端的解决方案是"负载均衡"（LVS、Nginx 等），在前端与后端之间加中间层。Kubernetes 按此思路定义 Service：分配静态 IP，自动管理维护动态 Pod 集合，按策略把流量转发给某个 Pod。

| 实现技术 | 特点 |
|------|------|
| iptables | Service 默认使用，kube-proxy 自动维护 iptables 规则 |
| userspace | 性能更差 |
| ipvs | 性能更好 |

都属于底层细节，不需要刻意关注。

-> 详见 Service 的 YAML 描述与使用

## 如何使用 YAML 描述 Service

Service 简称 `svc`，`apiVersion: v1`（与 Pod 一样属于核心对象，不关联业务应用，与 Job、Deployment 不同）。

`kubectl create` 不能创建 Service 样板，要用 `kubectl expose`（表达"暴露"服务地址）。`kubectl expose` 支持从 Pod、Deployment、DaemonSet 创建，需用 `--port` 和 `--target-port` 分别指定映射端口和容器端口。

Service 的 `spec` 只有两个关键字段：

| 字段 | 作用 |
|------|------|
| `selector` | 与 Deployment / DaemonSet 一样，过滤要代理的 Pod（基于标签机制关联） |
| `ports` | 三个字段：外部端口 `port`、内部端口 `targetPort`、协议 `protocol` |

Service 选择的是 Pod（只有 Pod 才有 IP），不是 Deployment，尽管 Deployment 的 label 也匹配。

-> 详见 Service 的 YAML 描述与使用

## 在 Kubernetes 里使用 Service

创建 Service 后，Kubernetes 自动分配一个独立于 Pod 地址段的 IP 地址（如 `10.96.240.15`）。这个 IP 是"虚地址"，不存在实体，只用来转发流量，ping 不通。

验证与测试：

| 操作 | 命令 / 说明 |
|------|------|
| 查看 Service 状态 | `kubectl get svc` |
| 查看代理的后端 Pod | `kubectl describe svc ngx-svc`（显示 endpoint 列表） |
| 对比 Pod 实际地址 | `kubectl get pod -o wide` |
| 测试负载均衡 | `kubectl exec` 进入 Pod，用 curl 访问 Service IP |
| 验证服务发现 | 删除一个 Pod，Service 通过 controller-manager 实时监控更新代理的 IP |

-> 详见 Service 的 YAML 描述与使用

## 以域名的方式使用 Service

Service IP 静态稳定，但数字 IP 不便使用。Kubernetes DNS 插件可为 Service 创建易写易记的域名。

名字空间（namespace，简称 `ns`）是 Kubernetes 用来隔离、分组 API 对象的方式，**与 Linux namespace 完全不同**。用 `kubectl get ns` 查看。不显式指定的 API 对象都在 `default` 名字空间。

| 域名形式 | 示例 |
|------|------|
| 完全形式 | `对象.名字空间.svc.cluster.local` |
| 省略形式 | `对象.名字空间` 或直接 `对象名`（默认用对象所在名字空间） |

Kubernetes 也为每个 Pod 分配域名：`IP地址.名字空间.pod.cluster.local`，需把 IP 里的 `.` 改成 `-`（如 `10.10.1.87` -> `10-10-1-87.default.pod`）。

-> 详见 Service 的域名与对外暴露

## 让 Service 对外暴露服务

Service 的 `type` 字段决定负载均衡类型：

| 类型 | 说明 |
|------|------|
| `ClusterIP`（默认） | 静态 IP 只能在集群内访问 |
| `ExternalName` | 一般由云服务商提供 |
| `LoadBalancer` | 一般由云服务商提供，生产环境常用 |
| `NodePort` | 在集群每个节点上开一个随机端口对外提供服务 |

`NodePort` 用 `--type=NodePort` 参数或 YAML `type: NodePort`。默认端口范围 `30000~32767`（约 2 万多个，非标准端口号），外部可用任意节点 IP 访问。

NodePort 的缺点：

| 缺点 | 说明 |
|------|------|
| 端口数量有限 | 默认 30000~32767，非标准端口，大量业务不够用 |
| 每个节点都开端口 | 用 kube-proxy 路由到后端 Service，大集群带来网络通信成本 |
| 暴露节点 IP | 多数场景不可行，为安全需在集群外再搭反向代理，增加复杂度 |

-> 详见 Service 的域名与对外暴露

## 分笔记索引

- **Service 的 YAML 描述与使用** — kubectl expose 生成样板、spec 字段、创建验证与负载均衡测试
- **Service 的域名与对外暴露** — 名字空间、Service/Pod 域名、四种 type、NodePort 机制与缺点
- **Nginx 配置与 Deployment 示例** — 用 ConfigMap + 存储卷定制 Nginx，演示 Service 负载均衡
