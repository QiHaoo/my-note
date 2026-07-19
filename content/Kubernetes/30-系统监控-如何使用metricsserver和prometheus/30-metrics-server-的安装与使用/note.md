---
title: Metrics Server 的安装与使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, monitoring, metricsserver]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：系统监控：如何使用MetricsServer和Prometheus

Metrics Server 专门收集 Kubernetes 核心资源指标（metrics），定时从所有节点的 kubelet 采集信息，对集群整体性能影响极小（每个节点约占用 1m CPU 和 2MB 内存）。

它调用 kubelet 的 API 拿到节点和 Pod 指标，再交给 apiserver，kubectl、HPA 就能利用 apiserver 读取指标。类比 Linux 的 `top` 命令，Kubernetes 提供类似的 `kubectl top`，但默认不生效，必须安装 Metrics Server 插件。

## 下载与准备工作

Metrics Server 所有依赖都放在一个 YAML 描述文件里，可用 wget 或 curl 下载（项目网址 https://github.com/kubernetes-sigs/metrics-server）。若已按前述用 kubeadm 搭建集群，已具备全部前提条件。

在 `kubectl apply` 之前，需做两个准备工作。

### 第一个工作：修改 YAML 文件

在 Metrics Server 的 Deployment 对象里加上运行参数 `--kubelet-insecure-tls`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: metrics-server
  namespace: kube-system
spec:
  ... ...
  template:
    spec:
      containers:
      - args:
        - --kubelet-insecure-tls
        ... ...
```

因为 Metrics Server 默认用 TLS 协议、要验证证书才能与 kubelet 安全通信，实验环境没必要，加这个参数可让部署简单很多（生产环境慎用）。

### 第二个工作：预先下载镜像

Metrics Server 的镜像仓库用 gcr.io，下载困难。有国内镜像网站，可用前述办法下载后改名，再加载到集群节点。参考 Shell 脚本：

```bash
repo=registry.aliyuncs.com/google_containers
name=k8s.gcr.io/metrics-server/metrics-server:v0.6.1
src_name=metrics-server:v0.6.1

docker pull $repo/$src_name
docker tag $repo/$src_name $name
docker rmi $repo/$src_name
```

## 部署与查看

```bash
kubectl apply -f components.yaml
kubectl get pod -n kube-system
kubectl top node
kubectl top pod -n kube-system
```

Metrics Server 属于名字空间 `kube-system`。由于收集信息需要时间，必须等一小会儿才能执行 `kubectl top`。

从输出可见：两个节点 CPU 使用率都不高（8% 和 4%），内存用得多，master 约一半（48%）、worker 几乎用满（89%）；`kube-system` 里 apiserver 最耗资源，用了 75m CPU 和 363MB 内存。

<div class="callout">
  <strong>常见问题</strong>：<code>kubectl top</code> 不生效时，可在 Deployment 的 <code>spec.template.spec</code> 下加 <code>nodeName: &lt;节点名&gt;</code>，或加 <code>hostNetwork: true</code>（后者不是好办法，尽量不用）。看不到 master 节点指标（显示 none）通常是 master 节点污点（NoSchedule）导致，默认 master 不运行业务。旧仓库 k8s.gcr.io 已于 2023-04-03 冻结，新仓库为 registry.k8s.io；镜像版本需与 components.yaml 对应，且集群所有节点都要能拉取镜像。
</div>
