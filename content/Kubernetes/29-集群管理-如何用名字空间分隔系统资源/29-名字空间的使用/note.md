---
title: 名字空间的使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, namespace]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：集群管理：如何用名字空间分隔系统资源

## 创建与查看

名字空间是一种 API 对象，简称 `ns`（可用 `kubectl api-resources` 查看）。用 `kubectl create` 无需额外参数即可创建：

```bash
kubectl create ns test-ns
kubectl get ns
```

Kubernetes 初始化集群时预设 4 个名字空间：`default`（用户对象默认）、`kube-system`（系统组件所在）、`kube-public`、`kube-node-lease`。常用的是前两个。

## 把对象放入名字空间

要在特定名字空间创建对象，需在它的 `metadata` 加 `namespace` 字段。例如在 `test-ns` 里创建 Nginx Pod：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx
  namespace: test-ns
spec:
  containers:
  - image: nginx:alpine
    name: ngx
```

用 `kubectl apply` 创建后，直接 `kubectl get` 看不到它，因为默认查看 `default` 名字空间，操作其他名字空间的对象必须用 `-n` 参数明确指定：

```bash
kubectl get pod -n test-ns
```

## 删除名字空间的级联效应

名字空间里的对象都从属于名字空间，删除名字空间时一定要小心：一旦删除，里面的所有对象都会消失。

```bash
kubectl delete ns test-ns
```

执行后会发现 Pod 也无影无踪了。

<div class="callout">
  <strong>补充</strong>：Kubernetes 的 namespace 是逻辑管理概念，而容器的 namespace 是实打实的 Linux 隔离技术，二者不同。不同 namespace 的 service、pod 可以通信（如 apiserver 就在 kube-system）。必须先创建 namespace，否则在 YAML 里指定会找不到；k8s 对节点上 pod 调度数上限与 namespace 无关，node 也不归 namespace 管理，不同 namespace 的对象可能运行在同一 Node 上。
</div>
