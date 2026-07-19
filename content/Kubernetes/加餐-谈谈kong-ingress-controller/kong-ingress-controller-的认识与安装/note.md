---
title: Kong Ingress Controller 的认识与安装
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Kong
  - Ingress
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：谈谈 Kong Ingress Controller

## 认识 Kong Ingress Controller

快速回顾 Ingress（第 21 讲）：Ingress 类似 Service，基于 HTTP/HTTPS 协议，是七层负载均衡规则的集合，但自身没有管理能力，必须借助 Ingress Controller 才能控制 Kubernetes 集群进出的流量。

基于 Ingress 的定义，就出现了各式各样的 Ingress Controller 实现：

- Nginx Ingress Controller（Nginx 官方开发）：局限于 Nginx 自身能力，Ingress、Service 等对象更新时必须修改静态配置文件，再重启进程（reload），在变动频繁的微服务系统里会引发一些问题
- Kong Ingress Controller：站在 Nginx 巨人肩膀之上，基于 OpenResty 和内嵌的 LuaJIT 环境，实现完全动态的路由变更，消除了 reload 的成本，运行更平稳，还有很多额外增强功能

> reload 是 Ingress Controller 内部自动做的，Kubernetes 用户在外面看不到这个行为。

适合对 Kubernetes 集群流量有更高、更细致管理需求的用户。

## 安装方式

环境：minikube 1.25.2，Kubernetes 1.23.3。Kong Ingress Controller 最新版本 2.7.0，源码包从 GitHub 获取：

```bash
wget https://github.com/Kong/kubernetes-ingress-controller/archive/...
```

安装所需 YAML 都在解压后的 `deploy` 目录，提供“有数据库”和“无数据库”两种部署方式。选最简单的“无数据库”方式，只需一个 `all-in-one-dbless.yaml`：

```bash
kubectl apply -f all-in-one-dbless.yaml
```

两种 Ingress Controller 安装方式对比：

| | Nginx Ingress Controller | Kong Ingress Controller |
|------|------|------|
| 文件组织 | 多个分散的 YAML 文件 | Namespace、RBAC、Secret、CRD 等合并在一个文件 |
| 安装操作 | 需顺序执行多次 `kubectl apply` | 一次 `kubectl apply` |
| 优点 | - | 安装方便，不会遗忘创建资源 |

## 安装结果

安装后 Kong Ingress Controller 创建新的名字空间 `kong`，里面有默认的 Ingress Controller 和对应 Service，用 `kubectl get` 查看。

### 两个容器的 Pod

`kubectl get pod` 输出的 READY 列显示 `2/2`，意思是这个 Pod 里有两个容器，这是 Kong IC 与 Nginx IC 在实现架构上的明显不同：

| | Kong Ingress Controller | Nginx Ingress Controller |
|------|------|------|
| 容器划分 | Pod 里两个容器：Controller（管理进程）与 Proxy（代理进程） | 管理进程和代理进程在同一容器 |
| 通信 | 两个容器间用环回地址（Loopback）通信 | - |
| 原因 | - | 要修改静态 Nginx 配置文件，所以两进程必须在同一容器 |
| 好处 | 两容器彼此独立，可各自升级维护，对运维更友好 | - |

两种方式并没有优劣之分。

### Service

Kong IC 创建两个 Service 对象，其中 `kong-proxy` 是转发流量的服务，被定义成 LoadBalancer 类型（为生产环境对外暴露服务）。实验环境（minikube 或 kubeadm）只能用 NodePort 形式，80 端口映射到节点 32201。

### 验证访问

用 worker 节点地址访问，minikube 可用 `$(minikube ip)`：

```bash
curl $(minikube ip):32201 -i
```

响应可见 Kong IC 2.7 内部使用的 Kong 版本是 3.0.1。因为没配置任何 Ingress 资源，返回状态码 404 是正常的。

### 进入 Pod

用 `kubectl exec` 进入 Pod 查看内部信息。虽然 Kong IC 里有两个容器，但不需要用 `-c` 选项指定容器，它会自动进入默认的 Proxy 容器（Pod 里定义的第一个容器）。另一个 Controller 容器因不包含 Shell，无法进入查看。
