---
title: 安装 Master 节点与 Flannel
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, kubeadm, flannel, cluster]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：更真实的云原生：实际搭建多节点的Kubernetes集群

## 安装 Master 节点

kubeadm 用法很简单，只需 `kubeadm init` 一个命令即可把组件在 Master 节点上运行起来，它有很多参数调整集群配置（用 `-h` 查看）。实验环境用到的 3 个参数：

| 参数 | 作用 |
|------|------|
| `--pod-network-cidr` | 设置集群里 Pod 的 IP 地址段 |
| `--apiserver-advertise-address` | 设置 apiserver 的 IP 地址，对多网卡服务器（如 VirtualBox 虚拟机两块网卡）很重要，指定 apiserver 在哪个网卡上对外服务 |
| `--kubernetes-version` | 指定 Kubernetes 的版本号 |

下面的安装命令指定 Pod 地址段 `10.10.0.0/16`、apiserver 服务地址 `192.168.10.210`、版本号 `1.23.3`：

```bash
sudo kubeadm init \
    --pod-network-cidr=10.10.0.0/16 \
    --apiserver-advertise-address=192.168.10.210 \
    --kubernetes-version=v1.23.3
```

> `--apiserver-advertise-address` 的地址必须是 master 节点虚拟机的实际 IP（用 `ip addr` 查看），否则会报错或超时；写错了可用 `sudo kubeadm reset` 重置后重新 init。

### 安装后的提示操作

因为已提前把镜像下载到本地，kubeadm 安装过程很快完成，并提示接下来要做的工作。

**1. 建立 kubectl 配置**（原样拷贝粘贴）：

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

**2. 保存 kubeadm join 命令**：另一个很重要的 `kubeadm join` 提示，其他节点加入集群必须用指令里的 token 和 ca 证书，务必拷贝后保存好：

```bash
kubeadm join 192.168.10.210:6443 \
    --token tv9mkx.tw7it9vphe158e74 \
    --discovery-token-ca-cert-hash sha256:e8721b8630d5b562e...
```

安装完成后用 `kubectl version`、`kubectl get node` 检查版本和节点状态。此时 Master 节点状态是 `NotReady`，因为还缺少网络插件，集群内部网络未正常运作。

> 若忘记保存或 token 过期，后续可用 `kubeadm token create --print-join-command` 重新生成加入命令。

## 安装 Flannel 网络插件

Kubernetes 定义了 CNI 标准，有很多网络插件，本讲选最常用的 Flannel（GitHub 仓库 https://github.com/flannel-io/flannel/）。

安装简单，用项目的 `kube-flannel.yml` 在 Kubernetes 里部署即可。因为它应用了 Kubernetes 的网段地址，需修改文件里的 `net-conf.json` 字段，把 `Network` 改成 `kubeadm` 参数 `--pod-network-cidr` 设置的地址段（这里是 `10.10.0.0/16`）：

```yaml
net-conf.json: |
  {
    "Network": "10.10.0.0/16",
    "Backend": {
      "Type": "vxlan"
    }
  }
```

> `net-conf.json` 其实是 YAML 里的一个字段，不是文件。它用的是 `:|`，表示一个长字符串，内容是 json 格式。

改好后用 `kubectl apply` 安装 Flannel：

```bash
kubectl apply -f kube-flannel.yml
kubectl get node    # 等镜像拉取并运行后，Master 节点状态变 Ready
```

## 安装 Worker 节点

成功安装 Master 节点后，Worker 节点安装简单，用之前拷贝的 `kubeadm join` 命令即可（记得用 `sudo` 执行）：

```bash
sudo \
kubeadm join 192.168.10.210:6443 --token tv9mkx.tw7it9vphe158e74 \
    --discovery-token-ca-cert-hash sha256:e8721b8630d5b562e...
```

它会连接 Master 节点，拉取镜像，安装网络插件，最后把节点加入集群。过程中同样会遇到拉取镜像问题，可如法炮制提前把镜像下载到 Worker 节点本地。

安装完毕后 `kubectl get node` 会看到两个节点都是 `Ready` 状态。用 `kubectl run ngx --image=nginx:alpine` 测试：

```bash
kubectl run ngx --image=nginx:alpine
kubectl get pod -o wide
```

会看到 Pod 运行在 Worker 节点上，IP 地址是 `10.10.1.2`，表明 Kubernetes 集群部署成功。

## Console 节点部署

Console 节点部署更简单，只需安装一个 kubectl，然后复制 config 文件即可。可在 Master 节点上用 `scp` 远程拷贝：

```bash
scp `which kubectl` chrono@192.168.10.208:~/
scp ~/.kube/config chrono@192.168.10.208:~/.kube
```

> 第二行 scp 的前提是目标机器上已创建 `.kube` 目录，否则需先 `mkdir ~/.kube`。

> 这些操作步骤都已做成 Shell 脚本放在 GitHub 上（[k8s_study](https://github.com/chronolaw/k8s_study/tree/master/admin)），可直接运行。
