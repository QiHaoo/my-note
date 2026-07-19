---
title: 安装 kubeadm 与组件镜像
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, kubeadm, cluster]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：更真实的云原生：实际搭建多节点的Kubernetes集群

Master 和 Worker 节点都要安装 kubeadm，并提前下载 Kubernetes 组件镜像。

## 安装 kubeadm

kubeadm 可直接从 Google 自己的软件仓库下载安装，但国内网络不稳定、很难下载成功，需改用其他软件源（这里选国内某云厂商）：

```bash
sudo apt install -y apt-transport-https ca-certificates curl

curl https://mirrors.aliyun.com/kubernetes/apt/doc/apt-key.gpg | sudo apt-key add -

cat <<EOF | sudo tee /etc/apt/sources.list.d/kubernetes.list
deb https://mirrors.aliyun.com/kubernetes/apt/ kubernetes-xenial
EOF

sudo apt update
```

更新软件仓库后，用 `apt install` 获取 kubeadm、kubelet 和 kubectl 这三个安装必备工具。apt 默认下载最新版本，也可指定版本号（如使用和 minikube 相同的 1.23.3）：

```bash
sudo apt install -y kubeadm=1.23.3-00 kubelet=1.23.3-00 kubectl
```

安装完成后用 `kubeadm version`、`kubectl version --client` 验证版本是否正确。

按 Kubernetes 官网要求，最好再用 `apt-mark hold` 锁定这三个软件的版本，避免意外升级导致版本错误：

```bash
sudo apt-mark hold kubeadm kubelet kubectl
```

## 下载 Kubernetes 组件镜像

kubeadm 把 apiserver、etcd、scheduler 等组件都打包成镜像，以容器方式启动 Kubernetes，但这些镜像不在 Docker Hub 上，而在 Google 自己的镜像仓库 gcr.io，国内访问很困难，直接拉取几乎不可能，需提前把镜像下载到本地。

`kubeadm config images list` 可查看安装 Kubernetes 所需的镜像列表，参数 `--kubernetes-version` 可指定版本号：

```bash
kubeadm config images list --kubernetes-version v1.23.3
```

1.23.3 所需镜像列表：

```text
k8s.gcr.io/kube-apiserver:v1.23.3
k8s.gcr.io/kube-controller-manager:v1.23.3
k8s.gcr.io/kube-scheduler:v1.23.3
k8s.gcr.io/kube-proxy:v1.23.3
k8s.gcr.io/pause:3.6
k8s.gcr.io/etcd:3.5.1-0
k8s.gcr.io/coredns/coredns:v1.8.6
```

### 方法一：利用 minikube

minikube 本身也打包了 Kubernetes 的组件镜像，可从它的节点里把镜像导出再拷贝过来。先启动 minikube，`minikube ssh` 登录进虚拟节点，用 `docker save -o` 命令把相应版本的镜像都保存下来，再用 `minikube cp` 拷贝到本地。安全可靠，但操作麻烦。

### 方法二：从国内镜像网站下载再改名

从国内镜像网站下载然后再用 `docker tag` 改名，能用 Shell 编程实现自动化：

```bash
repo=registry.aliyuncs.com/google_containers

for name in `kubeadm config images list --kubernetes-version v1.23.3`; do
    src_name=${name#k8s.gcr.io/}
    src_name=${src_name#coredns/}

    docker pull $repo/$src_name
    docker tag $repo/$src_name $name
    docker rmi $repo/$src_name
done
```

速度快，但有隐患：万一网站不提供服务，或改动了镜像就比较危险。

### 两种方法结合

可把两种方法结合起来：先用脚本从国内镜像仓库下载，再用 minikube 里的镜像做对比，只要 IMAGE ID 一样就说明镜像是正确的。

## 简化方法

也可用 `kubeadm init` 的 `--image-repository` 参数直接指定国内镜像仓库，一条命令搞定，无需写脚本提前下载镜像：

```bash
kubeadm init \
    --apiserver-advertise-address=192.168.137.10 \
    --image-repository registry.aliyuncs.com/google_containers \
    --kubernetes-version v1.23.3 \
    --service-cidr=10.96.0.0/12 \
    --pod-network-cidr=10.24.0.0/16
```
