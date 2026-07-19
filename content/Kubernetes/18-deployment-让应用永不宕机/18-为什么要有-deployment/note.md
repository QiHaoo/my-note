---
title: 为什么要有 Deployment
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, pod]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Deployment：让应用永不宕机

## Pod 的局限

第 13 讲学习的 Job/CronJob 代表离线业务，通过对 Pod 的包装、向 Pod 添加控制字段，实现了基于 Pod 运行临时任务和定时任务。除"离线业务"外，另一大类业务"在线业务"在 Kubernetes 里该如何处理？

先看用 Pod 是否足够。Pod 在 YAML 里用 `containers` 可任意编排容器，还有 `restartPolicy` 字段（默认值 `Always`），可监控 Pod 里容器的状态，一旦发生异常就自动重启容器。

但 `restartPolicy` 只能保证容器正常工作。如果容器之外的 Pod 出错了怎么办？比如有人不小心用 `kubectl delete` 误删了 Pod，或 Pod 运行的节点发生断电故障，Pod 就会在集群里彻底消失，对容器的控制也就无从谈起。

## 在线业务的复杂需求

在线业务远不是单纯启动一个 Pod 这么简单，还有多实例、高可用、版本更新等许多复杂操作。比如最简单的多实例需求：为提高系统的服务能力、应对突发流量和压力，需创建多个应用副本，还要即时监控它们的状态。如果还只使用 Pod，就会又走回手工管理的老路，没利用好 Kubernetes 自动化运维的优势。

## 解决思路：对象套对象

解决办法很简单，Kubernetes 已提供了处理这种问题的思路：**"单一职责"和"对象组合"**。既然 Pod 管理不了自身，就再创建一个新对象，由它来管理 Pod，采用和 Job/CronJob 一样的形式"对象套对象"。

这个用来管理 Pod、实现在线业务应用的新 API 对象，就是 Deployment。

> Deployment 由 Kubernetes（控制面的 controller）来管理；一层一层嵌套：Deployment 管理 Pod，Pod 管理 containers。
