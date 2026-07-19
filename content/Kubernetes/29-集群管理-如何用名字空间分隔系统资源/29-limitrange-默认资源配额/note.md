---
title: LimitRange 默认资源配额
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, namespace, limitrange]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：集群管理：如何用名字空间分隔系统资源

在名字空间加上资源配额后，会有一个合理但"烦人"的约束：要求所有在其中运行的 Pod 都必须用 `resources` 字段声明资源需求，否则无法创建。

例如用 `kubectl run` 创建 Pod：

```bash
kubectl run ngx --image=nginx:alpine -n dev-ns
```

会给出 "Forbidden" 错误，说不满足配额要求。原因是 Pod 里没有 `resources` 字段时，就可无限制使用 CPU 和内存，与名字空间资源配额冲突。为保证名字空间资源总量可控，Kubernetes 只能拒绝创建。

这个约束对集群管理是好事，但对普通用户带来麻烦：YAML 已够复杂，还要反复估算资源配额。若有大量小应用、临时 Pod 要运行，人力成本较高。

## LimitRange 对象

此时用辅助对象 **LimitRange**（简称 `limits`），为 API 对象添加默认的资源配额限制。可用 `kubectl explain limits` 查看 YAML 字段详细说明。

关键字段：

| 字段 | 说明 |
|------|------|
| `spec.limits` | 核心属性，描述默认的资源限制 |
| `type` | 限制的对象类型，可是 Container、Pod、PersistentVolumeClaim |
| `default` | 默认的资源上限，对应容器里的 `resources.limits`，只适用 Container |
| `defaultRequest` | 默认申请的资源，对应容器里的 `resources.requests`，只适用 Container |
| `max`、`min` | 对象能使用的资源最大最小值 |

LimitRange 对象示例：

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-ns
spec:
  limits:
  - type: Container
    defaultRequest:
      cpu: 200m
      memory: 50Mi
    default:
      cpu: 500m
      memory: 100Mi
  - type: Pod
    max:
      cpu: 800m
      memory: 200Mi
```

它设置了每个容器默认申请 0.2 CPU 和 50MB 内存，容器资源上限 0.5 CPU 和 100MB 内存，每个 Pod 最大使用量 0.8 CPU 和 200MB 内存。

## 使用与查看

```bash
kubectl apply -f dev-limits.yml
kubectl describe limitranges -n dev-ns
```

创建 LimitRange 后，就可以不写 `resources` 字段直接创建 Pod，再运行之前的 `kubectl run` 命令：

```bash
kubectl run ngx --image=nginx:alpine -n dev-ns
```

有了默认资源配额作为"保底"，这次没有报错，Pod 顺利创建。用 `kubectl describe` 查看 Pod 状态，也能看到 LimitRange 为它自动加上的资源配额。

<div class="callout">
  <strong>补充</strong>：<code>default</code> 与 <code>defaultRequest</code> 是默认资源限制，并非"达到 defaultRequest 后自动扩容到 default"——request.cpu 是基本运行所需，limits.cpu 是应对突发的最大上限，用处不同（类似 JVM 初始堆内存与最大堆内存）。LimitRange 对 Container 的限制是容器级别，不是 Pod 级别；单个容器调大资源，用上层 <code>resources</code> 字段调整即可。
</div>
