---
title: 应用版本的定义
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, rollout]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：滚动更新：如何做到平滑的应用升级降级

应用的版本更新，实际做起来相当棘手：系统已上线运行，必须保证不间断对外提供服务，通俗地说就是"给空中的飞机换引擎"。

在 Kubernetes 里，版本更新使用的不是 API 对象，而是两个命令：`kubectl apply` 和 `kubectl rollout`，搭配 Deployment、DaemonSet 等 YAML 文件。

## "版本"到底是什么

常常会简单地认为"版本"就是应用程序的版本号，或者是容器镜像的标签。但不要忘了，在 Kubernetes 里应用都是以 Pod 的形式运行的，而 Pod 通常又会被 Deployment 等对象管理，所以应用的"版本更新"实际上更新的是整个 Pod。

Pod 由 YAML 描述文件确定，更准确地说是 Deployment 等对象里的字段 `template`。所以应用的版本变化就是 `template` 里 Pod 的变化，哪怕 `template` 里只变动了一个字段，也会形成一个新的版本，也算版本变化。

## 用 template 的 Hash 值作为版本号

`template` 里内容太多，拿这么长的字符串当"版本号"不太现实，所以 Kubernetes 使用了"摘要"功能，用摘要算法计算 `template` 的 Hash 值作为"版本号"，虽然不方便识别，但很实用。

以第 18 讲的 Nginx Deployment 为例，创建对象后用 `kubectl get` 查看 Pod 状态，Pod 名字里的那串随机数（如 6796...）就是 Pod 模板的 Hash 值，也就是 Pod 的"版本号"。

如果变动了 Pod YAML 描述（如把镜像改成 nginx:stable-alpine，或把容器名改成 nginx-test），都会生成一个新的应用版本，`kubectl apply` 后就会重新创建 Pod，Pod 名字里的 Hash 值随之改变（如变成 7c6c...），表示 Pod 版本更新了。
