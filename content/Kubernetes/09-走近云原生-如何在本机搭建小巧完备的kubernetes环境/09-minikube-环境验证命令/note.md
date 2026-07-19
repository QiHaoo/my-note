---
title: minikube 环境验证命令
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, minikube, kubectl, 容器编排]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：走近云原生：如何在本机搭建小巧完备的Kubernetes环境

## 启动 Kubernetes 集群

`minikube start` 会从 Docker Hub 拉取镜像，以当前最新版本的 Kubernetes 启动集群。为保证实验环境一致性，可加 `--kubernetes-version` 参数明确指定版本：

```bash
minikube start --kubernetes-version=v1.23.3
```

## 查看集群状态

```bash
minikube status
minikube node list
```

集群里只有一个节点，名字叫"minikube"，类型是 Control Plane，里面有 host、kubelet、apiserver 三个服务，IP 地址 192.168.49.2。

可用 `minikube ssh` 登录到这个节点上，虽然是虚拟的，但用起来和实机没什么区别。

## 使用 kubectl

使用 minikube 自带的 kubectl 查看版本：

```bash
kubectl version
```

但这条命令不能直接用，使用 minikube 自带的 kubectl 有一点形式上的限制，要在前面加 minikube 前缀，后面再有个 `--`：

```bash
minikube kubectl -- version
```

### 用 alias 简化

建议用 Linux 的 alias 功能为它创建别名，写到当前用户目录下的 `.bashrc` 里：

```bash
alias kubectl="minikube kubectl --"
```

kubectl 还提供命令自动补全功能：

```bash
source <(kubectl completion bash)
```

> 注意：`<` 后面不能有多余空格，否则会语法报错。

## 运行 Nginx 应用

在 Kubernetes 里运行 Nginx 应用，命令与 Docker 一样也是 `run`，但形式上有区别，需要用 `--image` 指定镜像，Kubernetes 会自动拉取并运行：

```bash
kubectl run ngx --image=nginx:alpine
```

这里涉及 Kubernetes 里一个非常重要的概念：**Pod**，可以暂时理解成"穿了马甲"的容器。查看 Pod 列表：

```bash
kubectl get pod
```

效果类似 `docker ps`。执行后可以看到集群里有一个名字叫 ngx 的 Pod 正在运行，表示单节点 minikube 环境搭建成功。

## 常见问题

国内网络环境下镜像拉取常失败，常用解决方式：

- 切换到国内镜像，先 `minikube delete` 再 `minikube start --image-mirror-country='cn'`
- 指定阿里云镜像仓库与 base image：

```bash
minikube start --image-mirror-country='cn' \
  --image-repository='registry.cn-hangzhou.aliyuncs.com/google_containers' \
  --base-image='registry.cn-hangzhou.aliyuncs.com/google_containers/kicbase:v0.0.28' \
  --kubernetes-version=v1.23.3
```

- kubectl 调用的 docker 配置并不是 `/etc/docker/daemon.json` 里的配置，需用 `--registry-mirror` 指定镜像加速地址
- 不能用 root 账号，使用普通用户加上 `--force`；或将当前用户加入 docker 组 `sudo usermod -aG docker $USER`
- 虚拟机至少分配 2 个 CPU，内存不足时加 `--memory=4096`，建议 4c8g
- 启动卡住可用 `minikube delete --all --purge` 后重试
- 虚拟机关机后 minikube 服务停止，重新启动需再次执行 start 命令，参数必须给全（不会保存），但镜像保存在 minikube 自己的 cache 里，不会每次重新拉取
