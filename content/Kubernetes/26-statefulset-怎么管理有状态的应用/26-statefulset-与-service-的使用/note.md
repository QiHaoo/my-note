---
title: StatefulSet 与 Service 的使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, service, dns]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：StatefulSet：怎么管理有状态的应用

用 `kubectl apply` 创建 StatefulSet，`kubectl get sts` / `kubectl get pod` 查看它：

```bash
kubectl apply -f redis-sts.yml
kubectl get sts
kubectl get pod
```

StatefulSet 管理的 Pod 不再是随机名字，而是有了顺序编号，从 0 开始命名为 redis-sts-0、redis-sts-1，Kubernetes 也会按这个顺序依次创建（0 号比 1 号的 AGE 要长一点）。

## 解决启动顺序与依赖关系

启动有了先后顺序后，应用怎么知道自己的身份、确定互相之间的依赖关系？Kubernetes 给的方法是使用 hostname（每个 Pod 里的主机名）。

用 `kubectl exec` 登录 Pod 内部查看：

```bash
kubectl exec -it redis-sts-0 -- sh
```

在 Pod 里查看环境变量 `$HOSTNAME` 或执行命令 `hostname`，都可以得到这个 Pod 的名字 redis-sts-0。有了这个唯一的名字，应用就可以自行决定依赖关系，比如让先启动的 0 号 Pod 是主实例，后启动的 1 号 Pod 是从实例。

## 解决网络标识：Service 域名

第三个问题是网络标识，需要用到 Service 对象。不能用 `kubectl expose` 直接为 StatefulSet 生成 Service，只能手写 YAML。`metadata.name` 必须和 StatefulSet 里的 `serviceName` 相同，`selector` 里的标签也必须和 StatefulSet 里一致：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-svc

spec:
  selector:
    app: redis-sts
  ports:
    - port: 6379
      protocol: TCP
      targetPort: 6379
```

这个 Service 本身没有特殊之处，也是用标签选择器找到 StatefulSet 管理的两个 Pod，再找它们的 IP 地址。但 StatefulSet 的奥秘在它的域名上。

回顾第 20 讲：Service 自己会有一个域名，格式是"对象名.名字空间"；每个 Pod 也会有一个域名，形式是"IP 地址.名字空间"。但因为 IP 地址不稳定，Pod 域名不实用，一般用稳定的 Service 域名。

当 Service 对象应用于 StatefulSet 时，Service 发现这些 Pod 是有状态应用、需要稳定的网络标识，就会为每个 Pod 再多创建出一个新的域名：

| 格式 | 说明 |
|------|------|
| `Pod名.服务名.名字空间.svc.cluster.local` | 完整域名 |
| `Pod名.服务名` | 简写形式 |

用 `kubectl exec` 进入 Pod 内部用 ping 验证：

```bash
kubectl exec -it redis-sts-0 -- sh
```

两个 Pod 都有了各自的域名（稳定的网络标识）。外部客户端只要知道 StatefulSet 对象，就可以用固定的编号去访问某个具体实例。虽然 Pod 的 IP 地址可能会变，但有编号的域名由 Service 对象维护，稳定不变。

至此，通过 StatefulSet 和 Service 的联合使用，Kubernetes 解决了有状态应用的依赖关系、启动顺序和网络标识这三个问题，剩下的多实例之间内部沟通协调等事情需要应用自己去处理。

## Headless Service：clusterIP: None

Service 原本的目的是负载均衡，由它在 Pod 前面转发流量。但对 StatefulSet 来说这项功能反而没必要，因为 Pod 已有稳定域名，外界访问服务不应再通过 Service 这一层。

从安全和节约系统资源角度，可以在 Service 里加一个字段 `clusterIP: None`，告诉 Kubernetes 不必再为这个对象分配 IP 地址（即 Headless Service）。

### StatefulSet 与 Service 的关系

StatefulSet 与 Service 对象的字段互相引用关系如下：

- StatefulSet 通过 `serviceName: redis-svc` 引用 Service（其 `metadata.name` 为 redis-svc）
- Service 通过 `selector: app=redis-sts` 选择两个 Pod：
  - Pod `redis-sts-0`，域名 `redis-sts-0.redis-svc`
  - Pod `redis-sts-1`，域名 `redis-sts-1.redis-svc`

## 常见问题

- 域名必须通过 Service 对象才能实现，没有 Service 对象域名解析不到（service 的 name 必须和 sts 的 serviceName 一致，否则域名解析不到）。
- Kubernetes 只是提供了域名解析，如何利用每个 Pod 的域名是业务层面的事，需要自己根据业务考虑。
- 将普通 Service 改为 Headless Service 时，加 `clusterIP: None` 后直接 `kubectl apply` 更新会报 `spec.clusterIPs[0]: Invalid value`，需要先删除 Service 再重新 apply。
- coredns 提供的是域名解析服务，不是负载均衡；流量的管理还是用 kube-proxy。若 ping `redis-sts-1.redis-svc` 失败，可能是 coredns 有错误，可删除 coredns 的 Pod 等待重建，或用 `rollout restart`。
