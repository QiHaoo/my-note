---
title: 应用更新的管理
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, rollout]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：滚动更新：如何做到平滑的应用升级降级

滚动更新不需要任何人工干预就能简单地把应用升级到新版本，也不会中断服务。但如果更新过程中发生错误，或更新后发现有 Bug 该怎么办？要解决这两个问题，仍要用 `kubectl rollout` 命令。

## 暂停与继续更新

在应用更新过程中，可以随时使用 `kubectl rollout pause` 来暂停更新，检查、修改 Pod，或测试验证；确认没问题，再用 `kubectl rollout resume` 来继续更新。

要注意它们只支持 Deployment，不能用在 DaemonSet、StatefulSet 上（最新的 1.24 支持了 StatefulSet 的滚动更新）。

## 更新历史

对于更新后出现的问题，Kubernetes 提供了"后悔药"，即更新历史，可以查看之前的每次更新记录，并回退到任何位置，和 Git 等版本控制软件非常类似。

查看更新历史使用 `kubectl rollout history`：

```bash
kubectl rollout history deploy ngx-dep
```

它会输出一个版本列表。创建 Nginx Deployment 是一个版本，更新又是一个版本，所以会有两条历史记录。

`kubectl rollout history` 的列表输出的有用信息太少，可在命令后加参数 `--revision` 查看每个版本的详细信息，包括标签、镜像名、环境变量、存储卷等，从而大致了解每次变动了哪些关键字段：

```bash
kubectl rollout history deploy --revision=2
```

## 版本回退 undo

假设认为刚更新的 nginx:1.22-alpine 不好，想回退到上一个版本，可使用 `kubectl rollout undo`，也可加参数 `--to-revision` 回退到任意一个历史版本：

```bash
kubectl rollout undo deploy ngx-dep
```

`kubectl rollout undo` 的操作过程其实和 `kubectl apply` 一样，执行的仍然是"滚动更新"，只不过使用的是旧版本 Pod 模板，把新版本 Pod 数量收缩到 0，同时把老版本 Pod 扩展到指定值。

这个 V2 到 V1 的"版本降级"过程与从 V1 到 V2 的"版本升级"过程完全一样，不同的只是版本号的变化方向。

## 常见问题

- Deployment 并不直接控制 Pod，Pod 的归属对象是 ReplicaSet，Deployment 控制的是 ReplicaSet（版本概念可等同为 ReplicaSet），ReplicaSet 再控制 Pod 数量，可用 `kubectl get rs` 查看。版本回退类似代码库打的 tag，是快照，能最大限度保证正确性；而直接部署旧 YAML 不一定能保证文件没被改过，增加部署风险。
- 滚动更新时新旧版本共存的一小段时间会共同对外提供服务（线上会存在不同版本），好处是可以不间断对外提供服务；若需避免，属于业务层面问题，可用流量管理/路由策略，Kubernetes 把原来运维的滚动更新流程极大地简化了，但不可能做到完全无感知。
- 滚动更新 vs 灰度发布：滚动更新是能力，灰度发布是功能；灰度发布（金丝雀发布）新旧版本按一定比例共存，可用于 A/B 测试。
- 长连接应用在强制中断时可能造成有损，属应用层次问题；业务可实现优雅终止，如设置容器停止前的等待超时时间，业务代码监听 SIGTERM 信号不再接收新请求。
- 若 Pod 中有多个镜像、只更新部分镜像版本，应是原地升级，只更新部分容器，而不是整个 Pod 销毁重建。
