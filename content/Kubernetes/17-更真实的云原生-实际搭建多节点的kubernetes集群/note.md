---
title: 更真实的云原生：实际搭建多节点的Kubernetes集群
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, kubeadm, cluster, flannel]
reviewable: true
module: kubernetes-core
---

## 核心概念

minikube 太"迷你"，隐藏了很多细节，离生产环境有差距。本讲改用 kubeadm 搭建一个更真实的多节点 Kubernetes 集群（Master + Worker + Console），为"中级篇"和"高级篇"的实验提供贴近生产的环境。

## 什么是 kubeadm

kubeadm 是社区里专门用来在集群中安装 Kubernetes 的工具（"Kubernetes 管理员"）。原理与 minikube 类似，也用容器和镜像封装 Kubernetes 的各种组件，但目标是轻松地在集群环境部署接近生产级质量的 Kubernetes。

| 对比项 | minikube | kubeadm |
|--------|----------|---------|
| 定位 | 单机学习/开发/测试 | 集群部署，接近生产级 |
| 易用性 | 简单易用，无需配置 | 同样易用，几条命令完成管理维护 |
| 隐藏细节 | 隐藏很多细节 | 更贴近真实生产系统 |

只需很少几条命令（`init`、`join`、`upgrade`、`reset`）即可完成集群的管理维护工作，既适用于集群管理员，也适用于开发、测试人员。

-> 详见 kubeadm 与实验环境架构

## 实验环境架构

3 台虚拟机（VirtualBox/VMware）组成实验环境，必须在同一网段：

| 主机 | 角色 | 配置 | 说明 |
|------|------|------|------|
| Master | 控制面 | 至少 2 核 CPU、4GB 内存 | 运行 apiserver、etcd、scheduler、controller-manager，管理整个集群 |
| Worker | 数据面 | 1 核 CPU、1GB 内存（低到不能再低） | 只运行业务应用，无管理工作 |
| Console | 控制台 | - | 安装 kubectl，所有管理命令从这里发出；逻辑概念，可复用 minikube 虚拟机或直接用 Master/Worker |

出于安全原因，集群里的主机部署好后应尽量少直接登录操作，所以单独设 Console 主机。

-> 详见 kubeadm 与实验环境架构

## 安装前的准备工作

Master 和 Worker 节点上都要做 4 步系统准备（Kubernetes 对系统的特殊要求）：

| 步骤 | 操作 |
|------|------|
| 1. 改主机名 | 修改 `/etc/hostname`，每个节点 hostname 不能重名（如 master、worker） |
| 2. 改 Docker 配置 | `/etc/docker/daemon.json` 把 cgroup 驱动改成 `systemd`，重启 Docker 守护进程 |
| 3. 改网络设置 | 启用 `br_netfilter` 模块，修改 iptables 配置让 Kubernetes 能检查、转发网络流量 |
| 4. 关闭 swap | 修改 `/etc/fstab` 关闭 Linux swap 分区，提升 Kubernetes 性能 |

完成后最好重启系统并给虚拟机拍快照备份。

-> 详见 安装前准备

## 安装 kubeadm 与下载组件镜像

Master 和 Worker 节点都要安装。kubeadm 从 Google 软件仓库下载，国内网络不稳定需改用国内软件源（如阿里云）：

```bash
sudo apt install -y kubeadm=1.23.3-00 kubelet=1.23.3-00 kubectl
sudo apt-mark hold kubeadm kubelet kubectl   # 锁定版本，避免意外升级
```

Kubernetes 组件镜像（apiserver、etcd、scheduler 等）存放在 Google 的 gcr.io，国内访问困难，需提前下载到本地。`kubeadm config images list --kubernetes-version v1.23.3` 可查看所需镜像列表。两种获取方法：

- 方法一：利用 minikube，`minikube ssh` 登录后用 `docker save -o` 导出镜像再 `minikube cp` 拷贝（安全可靠但麻烦）
- 方法二：从国内镜像网站下载再用 `docker tag` 改名，可用 Shell 脚本自动化（速度快但有隐患，万一网站不服务或改动镜像就有风险）

两种方法可结合：先用脚本从国内镜像仓库下载，再用 minikube 里的镜像对比 IMAGE ID 验证正确性。

-> 详见 安装 kubeadm 与组件镜像

## 安装 Master 节点

用 `kubeadm init` 在 Master 节点启动组件，3 个常用参数：

| 参数 | 作用 |
|------|------|
| `--pod-network-cidr` | 设置集群里 Pod 的 IP 地址段 |
| `--apiserver-advertise-address` | 设置 apiserver 的 IP，对多网卡服务器很重要，指定 apiserver 在哪个网卡对外服务 |
| `--kubernetes-version` | 指定 Kubernetes 版本号 |

安装完成后还需：建立 `.kube` 目录并拷贝 kubectl 配置文件；保存好 `kubeadm join` 提示（含 token 和 ca 证书，Worker 加入集群必需）。此时 Master 节点状态是 `NotReady`，因为还缺少网络插件。

-> 详见 安装 Master 节点与 Flannel

## 安装 Flannel 网络插件

Kubernetes 定义了 CNI 标准，有很多网络插件，本讲选最常用的 Flannel。安装简单，用项目的 `kube-flannel.yml` 部署即可，但需修改 `net-conf.json` 字段里的 `Network`，改成与 `--pod-network-cidr` 一致的地址段：

```bash
kubectl apply -f kube-flannel.yml
kubectl get node    # 等 Master 节点状态变 Ready
```

## 安装 Worker 节点与 Console

Worker 节点用之前拷贝的 `kubeadm join` 命令（需 `sudo`），它会连接 Master 拉取镜像、安装网络插件、加入集群。同样会遇到拉取镜像问题，可提前下载到 Worker 本地。完成后 `kubectl get node` 应看到两个节点都是 `Ready`。

用 `kubectl run ngx --image=nginx:alpine` 测试，会看到 Pod 运行在 Worker 节点上，IP 是 `10.10.1.2`，表明集群部署成功。

Console 节点部署更简单：安装 kubectl，复制 config 文件即可（可用 `scp` 远程拷贝）。

-> 详见 安装 Master 节点与 Flannel

## 分笔记索引

- **kubeadm 与实验环境架构** — kubeadm 原理、3 节点实验环境角色与配置
- **安装前准备** — 改主机名、Docker 配置、网络设置、关闭 swap 四步准备
- **安装 kubeadm 与组件镜像** — 软件源配置、版本锁定、组件镜像下载两种方法
- **安装 Master 节点与 Flannel** — kubeadm init、kubeconfig、join 命令、Flannel 部署
