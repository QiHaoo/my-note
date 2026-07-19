---
title: Deployment 的关键字段
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, selector, label]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Deployment：让应用永不宕机

## replicas 字段

`replicas` 的含义是"副本数量"，指定要在 Kubernetes 集群里运行多少个 Pod 实例。

有了这个字段，就相当于为 Kubernetes 明确了应用部署的"期望状态"，Deployment 对象就可以扮演运维监控人员的角色，自动地在集群里调整 Pod 的数量：

- Deployment 刚创建时 Pod 数量是 0，会根据 YAML 里的 Pod 模板逐个创建出要求数量的 Pod
- Kubernetes 持续监控 Pod 运行状态，万一有 Pod 意外消失、数量不满足"期望状态"，会通过 apiserver、scheduler 等核心组件选择新节点创建新 Pod，直至数量与"期望状态"一致

工作流程很复杂，但对外部用户来说设置非常简单，只需一个 `replicas` 字段就搞定，不需要再用人工监控管理，整个过程完全自动化。

## selector 字段

`selector` 的作用是"筛选"出要被 Deployment 管理的 Pod 对象。下属字段 `matchLabels` 定义了 Pod 对象应该携带的 label，它必须和 `template` 里 Pod 定义的 `labels` 完全相同，否则 Deployment 会找不到要控制的 Pod 对象，apiserver 也会报 YAML 格式校验错误无法创建。

为保证 Deployment 成功创建，必须在 YAML 里把 label 重复写两次：一次在 `selector.matchLabels`，另一次在 `template.metadata`。比如在这两个地方连续写 `app: ngx-dep`：

```yaml
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ngx-dep

  template:
    metadata:
      labels:
        app: ngx-dep
```

### 为什么不能像 Job 那样直接用 template 里的 Pod

在线业务和离线业务的应用场景差异很大：

- 离线业务中的 Pod 基本是一次性的，只与这个业务有关，紧紧绑定在 Job 对象里，一般不会被其他对象使用
- 在线业务的 Pod 永远在线，除在 Deployment 里部署运行，还可能被其他 API 对象引用来管理（如负责负载均衡的 Service 对象）

所以 Deployment 和 Pod 实际上是一种松散的组合关系，Deployment 实际上并不"持有" Pod 对象，只帮助 Pod 对象有足够副本数量运行。如果像 Job 那样把 Pod 在模板里"写死"，其他对象再想管理这些 Pod 就无能为力了。

### 贴标签与弱引用

Kubernetes 采用"贴标签"方式：在 API 对象的 `metadata` 元信息里加各种标签（labels），可用类似关系数据库查询语句的方式，筛选出具有特定标识的对象。通过标签这种设计，Kubernetes 解除了 Deployment 和模板里 Pod 的强绑定，把组合关系变成了"弱引用"。

> `selector.matchLabels` 与 `template.metadata.labels` 的关系：实践表明 `selector.matchLabels` 是 `template.metadata.labels` 的子集（`selector` 内容不可修改，`template.metadata.labels` 可增加 selector 中没有的其他标签）。原文称"完全相同"是作者记错，试验一下就能得到正确答案。
