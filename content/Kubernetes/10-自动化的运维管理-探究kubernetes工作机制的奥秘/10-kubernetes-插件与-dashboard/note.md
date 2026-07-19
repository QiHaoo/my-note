---
title: Kubernetes 插件与 Dashboard
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, addon, dashboard, dns]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：自动化的运维管理：探究Kubernetes工作机制的奥秘

只要服务器节点上运行了 apiserver、scheduler、kubelet、kube-proxy、container-runtime 等组件，就可以说是功能齐全的 Kubernetes 集群了。

但就像 Linux 一样，操作系统提供的基础功能虽然"可用"，想达到"好用"程度还是要再安装一些附加功能，这在 Kubernetes 里就是插件（Addon）。由于 Kubernetes 本身设计非常灵活，所以有大量插件用来扩展、增强它对应用和集群的管理能力。

## 查看插件列表

minikube 支持很多插件，使用命令查看插件列表：

```bash
minikube addons list
```

## 两个重要插件

| 插件 | 作用 |
|------|------|
| DNS | 在 Kubernetes 集群里实现域名解析服务，能够以域名而不是 IP 地址的方式互相通信，是服务发现和负载均衡的基础；对微服务、服务网格等架构至关重要，基本上是 Kubernetes 的必备插件 |
| Dashboard | 仪表盘，为 Kubernetes 提供一个图形化的操作界面，非常直观友好，支持中文；大多数 Kubernetes 工作使用命令行 kubectl，但有时在 Dashboard 上查看信息也挺方便 |

## 启动 Dashboard

在 minikube 环境里执行一条简单的命令，就可以自动用浏览器打开 Dashboard 页面：

```bash
minikube dashboard
```

## 远程/无桌面环境访问 Dashboard

虚拟机远程登录或无桌面环境时，`minikube dashboard` 无法在本机自动用浏览器打开页面，常用解决办法：

```bash
# 开启 proxy 并在后台运行
kubectl proxy --port=801 --address='0.0.0.0' --disable-filter=true --accept-hosts='^*$' &

# 访问地址
http://<服务器IP地址>:801/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/
```

或使用 SSH 端口转发：

```bash
ssh -L 801:127.0.0.1:<dashboard_port> user@虚拟机IP -N
```

然后在本机访问 `http://127.0.0.1:801/api/v1/namespaces/kubernetes-dashboard/services/http:kubernetes-dashboard:/proxy/`。

> DNS 已经是必备插件，不用单独安装（在 `minikube addons list` 输出的列表中可能看不到，已集成到 k8s 中）。生产环境机器都是基于命令行的，后面会讲到如何自己安装 dashboard，但生产环境不能随便安装，用好命令行是基本功。
