---
title: Deployment：让应用永不宕机
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, pod, replicaset]
reviewable: true
module: kubernetes-core
---

## 核心概念

Deployment 是专门用来部署应用程序的 API 对象，表示"在线业务"，和 Job/CronJob 结构类似，也包装了 Pod，通过添加额外控制功能实现应用永不宕机，多用于发布无状态应用，是 Kubernetes 里最常用也最有用的对象。

## 为什么要有 Deployment

Pod 的 `restartPolicy`（默认 `Always`）只能保证容器正常工作，但管不了容器之外的 Pod 出错（如 `kubectl delete` 误删 Pod、节点断电故障导致 Pod 彻底消失）。在线业务还有多实例、高可用、版本更新等复杂需求，只用 Pod 会走回手工管理的老路。

解决思路是 Kubernetes 一贯的"单一职责"和"对象组合"：再创建一个新对象管理 Pod，采用和 Job/CronJob 一样的"对象套对象"形式。这个管理 Pod、实现在线业务应用的新对象就是 Deployment。

-> 详见 为什么要有 Deployment

## 如何用 YAML 描述 Deployment

用 `kubectl api-resources` 查看 Deployment 基本信息：简称 `deploy`，apiVersion `apps/v1`，kind `Deployment`。

可用 `kubectl create deploy <名字> --image=<镜像> --dry-run=client -o yaml` 生成 YAML 样板，免去手工输入。与 Job/CronJob 相似之处是都有 `spec`、`template`（里面是一个 Pod）；不同之处是 `spec` 多了 `replicas`、`selector` 两个新字段，正是 Deployment 特殊能力的根本。

-> 详见 Deployment 的 YAML 描述与样板

-> 详见 Deployment 对象定义 示例

## Deployment 的关键字段

| 字段 | 含义 |
|------|------|
| `replicas` | 副本数量，指定集群里运行多少个 Pod 实例，明确应用部署的"期望状态" |
| `selector` | 筛选出要被 Deployment 管理的 Pod，下属 `matchLabels` 定义 Pod 应携带的 label |
| `template` | 和 Job 一样，定义要运行的 Pod 模板 |

`replicas` 让 Deployment 扮演运维监控人员角色，自动调整 Pod 数量：刚创建时按模板逐个创建 Pod，持续监控运行状态，Pod 意外消失则通过 apiserver、scheduler 等核心组件选择新节点创建新 Pod，直至数量与"期望状态"一致。

`selector.matchLabels` 必须和 `template` 里 Pod 定义的 `labels` 完全相同，否则 Deployment 找不到要控制的 Pod，apiserver 也会报 YAML 格式校验错误。

-> 详见 Deployment 的关键字段

## Deployment 与 Pod 的松散组合关系

Deployment 不能像 Job 那样把 Pod 在模板里"写死"，因为在线业务的 Pod 永远在线，除在 Deployment 里部署运行，还可能被其他 API 对象引用管理（如负责负载均衡的 Service）。Deployment 实际上并不"持有" Pod，只帮助 Pod 有足够副本数量运行。

Kubernetes 采用"贴标签"方式：在对象 `metadata` 里加 labels，用类似关系数据库查询语句的方式筛选具有特定标识的对象。通过标签设计，解除了 Deployment 和模板里 Pod 的强绑定，把组合关系变成"弱引用"。

-> 详见 Deployment 的关键字段

## 如何用 kubectl 操作 Deployment

| 命令 | 作用 |
|------|------|
| `kubectl apply -f deploy.yml` | 创建 Deployment 对象 |
| `kubectl get deploy` | 查看 Deployment 状态 |
| `kubectl get pod` | 查看 Pod 状态（被管理的 Pod 名字是 Deployment 名 + 两串随机数即模板 Hash 值） |
| `kubectl delete pod <名字>` | 删除一个 Pod 模拟故障，Deployment 会很快创建新 Pod 保证数量 |
| `kubectl scale --replicas=N deploy <名字>` | 应用伸缩（扩容/缩容） |
| `kubectl get pod -l <表达式>` | 用标签筛选对象，支持 `==`、`!=`、`in`、`notin` |

`kubectl get deploy` 显示的关键信息：

| 列 | 含义 |
|----|------|
| READY | 运行的 Pod 数量，前面是当前数量，后面是期望数量（如 `2/2`） |
| UP-TO-DATE | 当前已更新到最新状态的 Pod 数量 |
| AVAILABLE | 不仅要求已运行，还必须是健康状态能正常对外提供服务，最关心的指标 |
| AGE | 从创建到现在经过的运行时间 |

`kubectl scale` 是命令式操作，扩容缩容只是临时措施；需长时间保持确定 Pod 数量时，最好编辑 Deployment 的 YAML 改动 `replicas`，再以声明式 `kubectl apply` 修改对象状态。

-> 详见 kubectl 操作 Deployment

## 不应再使用"裸 Pod"

学了 Deployment 后就不应再使用"裸 Pod"。即使只运行一个 Pod，也要以 Deployment 方式创建（`replicas` 为 1），Deployment 会保证应用永远在线。Deployment 还支持滚动更新、版本回退、自动伸缩等高级功能，留到"高级篇"学习。

## 分笔记索引

- **为什么要有 Deployment** — Pod 的局限与在线业务复杂需求，对象套对象的解决思路
- **Deployment 的 YAML 描述与样板** — apiVersion/kind 头字段、用 kubectl 生成 YAML 样板
- **Deployment 的关键字段** — replicas / selector / template 含义与松散组合、标签弱引用
- **Deployment 对象定义 示例** — 生成的 Deployment 完整 YAML 样板
- **kubectl 操作 Deployment** — 创建查看、验证自愈、伸缩、标签筛选
