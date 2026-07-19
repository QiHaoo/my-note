---
title: Dashboard 图形管理界面
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, wordpress, dashboard]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（1）

Kubernetes 的图形管理界面 Dashboard，不用命令行也能管理 Kubernetes。

## 启动 Dashboard

启动命令：

```bash
minikube dashboard
```

它会自动打开浏览器界面，显示当前 Kubernetes 集群里的工作负载。

> 若通过 SSH 登录虚拟机，自动启动浏览器会失败（`no DISPLAY environment variable specified`）；需在虚拟机图形界面中运行，或复制 URL 到浏览器。可能还需调整 docker.sock 文件权限。

## Pod 管理界面

点击任意一个 Pod 的名字进入管理界面，可看到 Pod 的详细信息。右上角有 4 个重要功能：

| 功能 | 等价命令 |
|------|----------|
| 查看日志 | `kubectl logs` |
| 进入 Pod 内部 | `kubectl exec` |
| 编辑 Pod | `kubectl edit` |
| 删除 Pod | `kubectl delete` |

比命令行直观友好得多。例如点击第二个按钮，会在浏览器里开启一个 Shell 窗口，直接进入 Pod 内部的 Linux 环境，可输入任意命令查看状态或调试。

ConfigMap/Secret 等对象也可在 Dashboard 里任意查看或编辑。
