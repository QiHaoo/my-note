---
title: Flannel 与 Calico 的工作方式
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, networking, flannel, calico]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：网络通信：CNI是怎么回事又是怎么工作的

计算机网络很复杂（IP 地址、MAC 地址、网段、网卡、网桥、路由等），数据会流经多个设备。本章做大概描述，不深究底层细节。先在实验环境用 Deployment 创建 3 个 Nginx Pod 作为研究对象：

```bash
kubectl create deploy ngx-dep --image=nginx:alpine --replicas=3
```

## Flannel（Overlay 模式）

Flannel 默认使用基于 VXLAN 的 Overlay 模式。从单机角度看，Flannel 网络结构和 Docker 几乎一样，只是网桥换成 `cni0` 而非 `docker0`。

### 本机网络

在 Pod 里执行 `ip addr` 可看到虚拟网卡 `eth0`。其形式：第一个数字（如 3）是序号，即第 3 号设备，`@if45` 是它另一端连接的虚拟网卡（序号 45）。

因为该 Pod 的宿主机是 master，登录 master 节点用 `ip addr` 可看到第 45 号设备，名字是 `veth41586979@if3`（"veth" 表示虚拟网卡，`@if3` 对应 Pod 里的 3 号设备 eth0）。

用 `brctl show` 查看 `cni0` 网桥信息，可发现网桥上有多个虚拟网卡（第三个就是 `veth41586979`），即该网卡被"插"在 `cni0` 网桥上；又因虚拟网卡"结对"特性，Pod 也就连上了 `cni0` 网桥。借助这个网桥，本机 Pod 可直接通信。

结构示意（master 节点内）：

- Pod 10.10.0.3 的 `eth0 (if3)` 通过 veth pair 结对，连到 master 节点的 `veth41586979@if45`
- `veth41586979` 插在 `cni0` 网桥上
- 另一 Pod 10.10.0.4 的 veth 也插在 `cni0` 上，借助网桥本机 Pod 直接通信

### 跨主机网络

跨主机网络的关键是节点的路由表，用 `route` 查看：

- `10.10.0.0/24` 网段的数据走 `cni0` 设备（本机网桥）
- `10.10.1.0/24` 网段的数据走 `flannel.1` 设备（Flannel）
- `192.168.10.0/24` 网段的数据走 `ens160` 设备（宿主机网卡）

假设从 master 节点的 `10.10.0.3` 访问 worker 节点的 `10.10.1.7`：因 master 的 cni0 网桥只管理 `10.10.0.0/24` 网段，按路由表 `10.10.1.0/24` 都要让 `flannel.1` 处理，进入 Flannel 工作流程。

跨主机传输步骤：

1. master Pod `10.10.0.3` 的数据经本机 `cni0` 网桥
2. 按路由 `10.10.1.0/24` 走 `flannel.1` 设备
3. `flannel.1` 把原始网络包封装成 VXLAN 报文，用 `ens160` 网卡发出
4. 经网络传输到达 worker 节点的 `ens160`
5. worker 的 `flannel.1` 拆包，做反向处理，把数据交给目标 Pod `10.10.1.7`

Flannel 在各种表里查询（用到 `ip neighbor`、`bridge fdb` 等命令），得到要把数据发到 `192.168.10.20`（worker 节点）。

## Calico（Route 模式）

在 Calico 网站选择"本地自助安装（Self-managed on-premises）"，直接下载 YAML 文件。镜像较大，可预先在每个节点 `docker pull` 拉取。安装很简单，用 `kubectl apply` 即可（安装前最好把 Flannel 删除）：

```bash
wget https://projectcalico.docs.tigera.io/manifests/calico.yaml
docker pull calico/cni:v3.23.1
docker pull calico/node:v3.23.1
docker pull calico/kube-controllers:v3.23.1
kubectl apply -f calico.yaml
```

Calico 也在 `kube-system` 名字空间。创建 3 个 Nginx Pod 后会看到 IP 与 Flannel 明显不同（如 `10.10.219.*`、`10.10.171.*`），说明 Calico 的 IP 地址分配策略和 Flannel 不同。

### 工作方式

Pod 里仍有虚拟网卡，但宿主机上网卡名变成 `caliXXX@if4`（如 `calica17a7ab6ab@if4`），且并没有连接到 `cni0` 网桥上。

这是因为 Calico 不是 Overlay 而是 Route 模式，没用 Flannel 那一套，而是在宿主机上创建路由规则，让数据包不经过网桥直接"跳"到目标网卡。查节点路由表：假设 Pod A `10.10.219.67` 要访问 Pod B `10.10.219.68`，查路由表知道要走 `cali051d14e34` 这个设备，而它恰好就在 Pod B 里，所以数据直接进 Pod B 的网卡，省去网桥中间步骤。

结构示意：

- Pod A `10.10.219.67` → 查路由表走 `cali051d14e34` → 宿主机路由规则（无 cni0 网桥）→ 直接跳到目标网卡 → Pod B `10.10.219.68`（cali051d14e34）

跨主机通信可对照路由表一步步"跳"到目标 Pod（提示：`tunl0` 设备）。

<div class="callout">
  <strong>补充</strong>：Mac VirtualBox ubuntu 虚拟机装 Calico 需指定网卡——Flannel 和 Calico 默认用 NAT 网卡 enp0s8，所有节点 IP 一样会冲突（Calico 表现为 calico-node 只能启动一个、其他 CrashLoopBackOff），需指定 Host-Only 网卡 enp0s3。安装失败需清除网络插件信息并重启 kubelet：<code>rm -rf /etc/cni/net.d/*</code>、<code>rm -rf /var/lib/cni/calico</code>、<code>systemctl restart kubelet</code>；还不行就检查 coredns 并 <code>kubectl -n kube-system rollout restart deployment coredns</code>。Flannel 默认 Overlay 基于 Linux VXLAN，跨节点有封包拆包；Calico 默认 IPinIP，同节点 Pod 间直接经虚拟网卡结合路由表传输，跨节点需 IP 层封装经 IP 隧道（如 tunl0）传输，多节点间路由通过 BGP 协议共享。<code>/opt/cni/bin</code> 里的 flannel 是操作系统级别的，配合 Kubernetes 里的 flanneld 一起构建网络。
</div>
