---
title: kubectl 操作 Deployment
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, kubectl]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Deployment：让应用永不宕机

## 创建与查看

把 Deployment 的 YAML 写好后，用 `kubectl apply` 创建对象：

```bash
kubectl apply -f deploy.yml
```

查看 Deployment 状态用 `kubectl get`：

```bash
kubectl get deploy
```

显示的信息都很重要：

| 列 | 含义 |
|----|------|
| READY | 运行的 Pod 数量，前面是当前数量，后面是期望数量，`2/2` 即要求两个 Pod 运行、现已启动两个 |
| UP-TO-DATE | 当前已更新到最新状态的 Pod 数量（Pod 数量多或启动慢时 Deployment 完全生效需要过程，表示有多少 Pod 已完成部署达成"期望状态"） |
| AVAILABLE | 比 READY、UP-TO-DATE 更进一步，不仅要求已运行，还必须是健康状态能正常对外提供服务，最关心的 Deployment 指标 |
| AGE | Deployment 从创建到现在经过的运行时间 |

因为 Deployment 管理的是 Pod，最终用的也是 Pod，还需用 `kubectl get pod` 查看 Pod 状态。被 Deployment 管理的 Pod 自动带上名字，命名规则是 Deployment 名字加上两串随机数（其实是 Pod 模板的 Hash 值）。

## 验证"永不宕机"

对象创建成功、状态正常后，检验 Deployment 部署效果。用 `kubectl delete` 删除一个 Pod，模拟 Pod 发生故障：

```bash
kubectl delete pod ngx-dep-6796688696-jm6tt
kubectl get pod
```

被删除的 Pod 确实消失了，但 Kubernetes 在 Deployment 的管理下很快又创建出一个新 Pod，保证应用实例数量始终是 YAML 里定义的数量。这证明 Deployment 确实能让应用"永远在线""永不宕机"。

## 应用伸缩

Deployment 部署成功后，可随时调整 Pod 数量实现"应用伸缩"（Kubernetes 出现前对运维是件困难的事，现在变得轻而易举）。

`kubectl scale` 是专门用于"扩容"和"缩容"的命令，用参数 `--replicas` 指定需要的副本数量，Kubernetes 会自动增加或删除 Pod，让最终 Pod 数量达到"期望状态"。下面命令把 Nginx 应用扩容到 5 个：

```bash
kubectl scale --replicas=5 deploy ngx-dep
```

> `kubectl scale` 是命令式操作，扩容缩容只是临时措施。它会改变 Deployment 的状态，使其与 YAML 不一致。需长时间保持确定 Pod 数量时，最好编辑 Deployment 的 YAML 文件改动 `replicas`，再以声明式 `kubectl apply` 修改对象状态，避免运维混淆。

## 用 labels 筛选对象

Deployment 使用了 `selector` 字段，顺便提一下 Kubernetes 里 `labels` 字段的使用方法。通过 labels 为对象"贴"各种"标签"，在使用 `kubectl get` 命令时加上参数 `-l`，使用 `==`、`!=`、`in`、`notin` 的表达式，就能用"标签"筛选、过滤出要查找的对象（类似社交媒体的 #tag 功能），效果和 Deployment 里的 `selector` 字段一样。

第一条命令找出 `app` 标签是 nginx 的所有 Pod，第二条命令找出 `app` 标签是 ngx、nginx、ngx-dep 的所有 Pod：

```bash
kubectl get pod -l app=nginx
kubectl get pod -l 'app in (ngx, nginx, ngx-dep)'
```

> `kubectl get` 通过 `-l` 查找的是 pod 的 labels，不是 name；可用 `kubectl get pod --show-labels` 查看 pod 的所有标签。
