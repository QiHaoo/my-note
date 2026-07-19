---
title: Service 的域名与对外暴露
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, service, loadbalancing, dns]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Service：微服务架构的应对之道

## 名字空间（namespace）

Service 的 IP 静态稳定，但数字 IP 不便使用。Kubernetes 的 DNS 插件可为 Service 创建易写易记的域名。使用 DNS 域名前需先了解"名字空间"（namespace）。

> 注意：Kubernetes 的 namespace 与第 2 讲用于资源隔离的 Linux namespace 技术完全不同，Kubernetes 只是借用术语，目标是类似的——在集群里实现对 API 对象的隔离和分组。

namespace 简写 `ns`：

```bash
kubectl get ns
```

Kubernetes 有默认名字空间 `default`，不显式指定的 API 对象都在其中。其他名字空间各有用途，如 `kube-system` 包含 apiserver、etcd 等核心组件的 Pod。

DNS 是层次结构，为避免太多域名冲突，Kubernetes 把名字空间作为域名的一部分，减少重名可能。

## Service 的域名

Service 域名完全形式是 `对象.名字空间.svc.cluster.local`，很多时候可省略后缀，直接写 `对象.名字空间` 甚至 `对象名` 就足够（默认用对象所在名字空间，如 `default`）。

`kubectl exec` 进入 Pod 后，用 curl 访问 `ngx-svc`、`ngx-svc.default` 等域名即可，不再关心 Service 的 IP 地址，只需知道名字。

Kubernetes 也为每个 Pod 分配域名：形式是 `IP地址.名字空间.pod.cluster.local`，需把 IP 地址里的 `.` 改成 `-`。如 `10.10.1.87` 对应 `10-10-1-87.default.pod`。

## Service 的 type 类型

Service 的 `type` 字段表示负载均衡类型：

| 类型 | 说明 |
|------|------|
| `ClusterIP`（默认） | 静态 IP 只能在集群内访问 |
| `ExternalName` | 一般由云服务商提供 |
| `LoadBalancer` | 一般由云服务商提供，生产环境常用 |
| `NodePort` | 在集群每个节点上开一个随机端口对外提供服务 |

`ExternalName`、`LoadBalancer` 一般由云服务商提供，实验环境用不到，重点是 `NodePort`。

## NodePort 类型

使用 `kubectl expose` 时加 `--type=NodePort`，或在 YAML 添加 `type: NodePort`：

```yaml
apiVersion: v1
...
spec:
  ...
  type: NodePort
```

Service 除了对后端 Pod 做负载均衡，还会在集群每个节点上创建一个独立端口对外提供服务，这正是"NodePort"名字的由来。

```bash
kubectl get svc
```

`TYPE` 变成 `NodePort`，`PORT` 列除集群内部 `80` 端口外，还多出一个映射端口（如 `30651`）。端口号属于节点，外部能直接访问，无需登录集群节点或进入 Pod 内部，直接用任意节点 IP 即可访问 Service 和它代理的后端服务。

外部流量经 NodePort 进入后的转发路径：

- 集群外客户端 → 节点 IP : NodePort
- 任意节点（由 kube-proxy 路由）→ Service 静态虚拟 IP : 80
- Service → 后端 Pod 1 / Pod 2

NodePort 的缺点：

| 缺点 | 说明 |
|------|------|
| 端口数量有限 | 默认 `30000~32767`，约 2 万多个，且非标准端口，大量业务不够用 |
| 每个节点都开端口 | 用 kube-proxy 路由到真正后端 Service，大集群带来网络通信成本 |
| 暴露节点 IP | 多数场景不可行，为安全需在集群外再搭反向代理，增加复杂度 |

虽然有缺点，NodePort 仍是 Kubernetes 对外提供服务的简单易行方式。
