---
title: 安装前准备
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, kubeadm, cluster]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：更真实的云原生：实际搭建多节点的Kubernetes集群

有了主机后还不能立即用 kubeadm 安装 Kubernetes，因为 Kubernetes 对系统有特殊要求，必须在 Master 和 Worker 节点上做 4 步准备。这些信息分散在 Kubernetes 官网的不同文档里，比较凌乱，这里整合为改主机名、改 Docker 配置、改网络设置、关交换分区四步。

## 第一步：改主机名

Kubernetes 使用主机名区分集群里的节点，每个节点的 hostname 必须不能重名。修改 `/etc/hostname`，改成容易辨识的名字（Master 节点叫 master，Worker 节点叫 worker）：

```bash
sudo vi /etc/hostname
```

## 第二步：改 Docker 配置

Kubernetes 目前支持多种容器运行时，但 Docker 还是最方便最易用的，继续用 Docker 作为底层支持，用 apt 安装 Docker Engine（可参考第 1 讲）。

安装完成后需对 Docker 配置做一点修改：在 `/etc/docker/daemon.json` 里把 cgroup 的驱动程序改成 `systemd`，然后重启 Docker 守护进程：

```bash
cat <<EOF | sudo tee /etc/docker/daemon.json
{
  "exec-opts": ["native.cgroupdriver=systemd"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl enable docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 第三步：改网络设置

为了让 Kubernetes 能够检查、转发网络流量，需修改 iptables 的配置，启用 `br_netfilter` 模块：

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
br_netfilter
EOF

cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward=1
# better than modify /etc/sysctl.conf
EOF

sudo sysctl --system
```

## 第四步：关闭 swap

修改 `/etc/fstab`，关闭 Linux 的 swap 分区，提升 Kubernetes 性能：

```bash
sudo swapoff -a
sudo sed -ri '/\sswap\s/s/^#?/#/' /etc/fstab
```

> 一定要关闭 swap，不然 kubelet 无法启动；开启 swap 会导致 cgroup 失效，影响 Kubernetes 性能。

完成之后最好重启一下系统，然后给虚拟机拍个快照做备份，避免后续操作失误导致重复劳动。
