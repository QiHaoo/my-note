---
title: 滚动更新：如何做到平滑的应用升级降级
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, rollout, update]
reviewable: true
module: kubernetes-core
---

## 核心概念

Kubernetes 的滚动更新（rolling update）会自动缩放新旧版本的 Pod 数量，在用户无感知的情况下实现服务的升级或降级。版本更新使用 `kubectl apply` 和 `kubectl rollout` 两个命令，搭配 Deployment、DaemonSet 等 YAML 文件。

StatefulSet 是 Deployment 的特例，也能用 `kubectl scale` 做应用伸缩；而应用更新、版本回退等运维操作则以 Deployment 为例，用 `kubectl rollout` 实现。

## Kubernetes 如何定义应用版本

应用的"版本更新"实际更新的是整个 Pod，而 Pod 由 Deployment 等对象里的 `template` 字段确定。所以应用的版本变化就是 `template` 里 Pod 的变化，哪怕只变动了一个字段也算新版本。

由于 `template` 内容太长，Kubernetes 用摘要算法计算 `template` 的 Hash 值作为"版本号"。Pod 名字里的那串随机数（如 6796...）就是 Pod 模板的 Hash 值。变动了 Pod YAML（如改镜像、改容器名）都会生成新的应用版本，`kubectl apply` 后会重新创建 Pod，Pod 名字里的 Hash 值随之改变。

-> 详见 应用版本的定义

## Kubernetes 如何实现应用更新

为观察更新过程，用一个输出 Nginx 版本号的 ConfigMap、镜像为 nginx:1.21-alpine、4 个实例的 Deployment（`ngx-v1.yml`），并为它创建 Service，用 `kubectl port-forward` 转发请求查看状态。

新版本 `ngx-v2.yml` 把镜像升级到 nginx:1.22-alpine，其余不变。为便于观察，加一个字段 `minReadySeconds`，让 Kubernetes 在更新过程中等待一点时间，确认 Pod 没问题才继续其余 Pod 的创建。**注意：`minReadySeconds` 不属于 Pod 模板，不会影响 Pod 版本。**

用 `kubectl apply` 更新应用（改动了镜像名，Pod 模板变了，触发"版本更新"），再用 `kubectl rollout status` 查看更新状态。Kubernetes 不是把旧 Pod 全部销毁再一次性创建新 Pod，而是逐个创建新 Pod、同时销毁旧 Pod，保证系统里始终有足够数量的 Pod 运行，不会有"空窗期"。

"滚动更新"本质是由 Deployment 控制的两个同步进行的"应用伸缩"操作：老版本缩容到 0，同时新版本扩容到指定值，是一个"此消彼长"的过程。

-> 详见 滚动更新的实现过程

## Kubernetes 如何管理应用更新

`kubectl rollout` 子命令：

| 命令 | 作用 |
|------|------|
| `kubectl rollout status` | 查看应用更新的状态 |
| `kubectl rollout pause` | 暂停更新，用于检查、修改 Pod 或测试验证 |
| `kubectl rollout resume` | 继续更新（确认没问题后） |
| `kubectl rollout history` | 查看更新历史，输出版本列表 |
| `kubectl rollout history --revision=N` | 查看指定版本的详细信息（标签、镜像名、环境变量、存储卷等） |
| `kubectl rollout undo` | 回退到上一个版本，可加 `--to-revision=N` 回退到任意历史版本 |

`pause` / `resume` 只支持 Deployment，不能用在 DaemonSet、StatefulSet 上（最新的 1.24 支持了 StatefulSet 的滚动更新）。

Kubernetes 会记录应用的更新历史（类似 Git 等版本控制软件），`kubectl rollout undo` 的操作过程和 `kubectl apply` 一样，执行的仍然是"滚动更新"，只不过使用旧版本 Pod 模板，把新版本 Pod 数量收缩到 0、把老版本 Pod 扩展到指定值。版本降级与版本升级的过程完全一样，不同的只是版本号变化方向。

-> 详见 应用更新的管理

## Kubernetes 如何添加更新描述

`kubectl rollout history` 的版本列表里 CHANGE-CAUSE 列总是显示 `<none>`。要像 Git 一样为每次更新加上说明信息，只需在 Deployment 的 `metadata` 里加上 `annotations` 字段，使用特定字段 `kubernetes.io/change-cause`。

`annotations` 与 `labels` 的区别：

| 字段 | 用途 | 比喻 |
|------|------|------|
| annotations | 给 Kubernetes 内部的各种对象使用，像"扩展属性" | 包装盒里的产品说明书 |
| labels | 主要面对 Kubernetes 外部用户，用来筛选、过滤对象 | 包装盒外的标签贴纸 |

两者形式上一样，都是 Key-Value，都给 API 对象附加额外信息。借助 annotations，Kubernetes 既不破坏对象结构，也不用新增字段，就能给 API 对象添加任意附加信息，体现面向对象设计的 OCP"开闭原则"。annotations 里的值可任意写，Kubernetes 会自动忽略不理解的 Key-Value，但要编写更新说明需用特定的 `kubernetes.io/change-cause`。

-> 详见 更新描述与 annotations

## 分笔记索引

- **应用版本的定义** — 版本即 template 变化，用 template 的 Hash 值作版本号
- **滚动更新的实现过程** — V1/V2 部署、minReadySeconds、滚动过程的数量变化
- **应用更新的管理** — pause/resume、history、undo 回退
- **更新描述与 annotations** — change-cause、annotations 与 labels 区别
