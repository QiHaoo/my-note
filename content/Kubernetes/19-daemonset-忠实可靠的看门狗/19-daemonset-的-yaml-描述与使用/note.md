---
title: DaemonSet 的 YAML 描述与使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, daemonset, pod, scheduling]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：DaemonSet：忠实可靠的看门狗

## DaemonSet 的 YAML 样板

`kubectl` 不提供 `kubectl create` 直接创建 DaemonSet 样板的功能。可从 Kubernetes 官网拷贝示例修改，得到如下的样板（对象名 `redis-ds`，镜像 `redis:5-alpine`）：

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: redis-ds
  labels:
    app: redis-ds

spec:
  selector:
    matchLabels:
      name: redis-ds
  template:
    metadata:
      labels:
        name: redis-ds
    spec:
      containers:
      - image: redis:5-alpine
        name: redis
        ports:
        - containerPort: 6379
```

与 Deployment 对比：

- `kind`、`metadata` 是对象独有信息，自然不同
- `spec` 也有 `selector` 字段，匹配 `template` 里 Pod 的 labels，与 Deployment 几乎一样
- **关键不同**：DaemonSet 在 `spec` 里没有 `replicas` 字段，不会创建多个 Pod 副本，而是每个节点只创建一个 Pod 实例

某种程度上可以把 DaemonSet 看做 Deployment 的一个特例，仅在 Pod 部署调度策略上不同。

### 变通创建样板

用 `kubectl create` 先创建 Deployment 对象，再把 `kind` 改成 `DaemonSet`、删除 `spec.replicas`：

```bash
export out="--dry-run=client -o yaml"
# change "kind" to DaemonSet
kubectl create deploy redis-ds --image=redis:5-alpine $out
```

## 使用 DaemonSet

`kubectl apply` 创建对象后，DaemonSet 会自动查找集群节点、在节点上创建 Pod。实验环境（一个 Master 一个 Worker，Master 默认不跑应用）下，DaemonSet 只生成一个 Pod，运行在 worker 节点上——这与"每个节点都运行"的本意不符，引出污点 / 容忍度机制。

## 污点（taint）与容忍度（toleration）

"污点"是节点的属性，给节点"贴标签"（为区别于已有的 `labels`，改名 `taint`）；与"污点"相对的是 Pod 的"容忍度"，即 Pod 能否"容忍"污点。Pod 根据自己对污点的容忍程度选择合适的目标节点。

### 查看节点污点

用 `kubectl describe node` 查看 Master 和 Worker：

```bash
kubectl describe node master
```

```text
Name: master
Roles: control-plane,master
...
Taints: node-role.kubernetes.io/master:NoSchedule
...
```

```bash
kubectl describe node worker
```

```text
Name: worker
Roles: <none>
...
Taints: <none>
...
```

Master 默认有污点 `node-role.kubernetes.io/master`，效果 `NoSchedule`（拒绝 Pod 调度到本节点），Worker 的 taint 为空。通常 Pod 都不能容忍任何污点，所以带 taint 的 Master 无缘 Pod。

### 方法一：去掉 Master 的污点

操作 Node 的污点属性用 `kubectl taint`，指定节点名、污点名和效果，去掉污点要额外加 `-`：

```bash
kubectl taint node master node-role.kubernetes.io/master:NoSchedule-
```

DaemonSet 一直监控集群节点状态，去掉污点后会立刻在 Master 创建一个"守护" Pod。此方法修改 Node 状态，影响面较大。

### 方法二：为 Pod 添加容忍度

保留 Node 的污点，为需要的 Pod 添加 `tolerations`，实现"精细化"调度。`tolerations` 是数组，列出被容忍的污点（名字、效果），用 `operator` 指定匹配方式，一般用 `Exists`（存在这个名字和效果的污点）：

```yaml
tolerations:
- key: node-role.kubernetes.io/master
  effect: NoSchedule
  operator: Exists
```

先 `kubectl taint` 把 Master 污点加回，再重新部署带容忍度的 DaemonSet（`kubectl apply -f ds.yml`），即可看到 Pod 分别运行在 Master 和 Worker 节点上。

容忍度从属于 Pod 而非 DaemonSet 独有，理解后可在 Job / CronJob / Deployment 中同样为 Pod 加 `tolerations`，灵活调度应用。

## 静态 Pod

"静态 Pod"不受 Kubernetes 系统管控，不与 apiserver、scheduler 发生关系，所以是"静态"的。它仍"跑"在容器运行时上，也有 YAML 描述，唯一能管理它的 Kubernetes 组件是节点上的 kubelet。

YAML 文件默认存放在节点的 `/etc/kubernetes/manifests` 目录（Kubernetes 专用目录）。kubelet 定期检查目录文件，发现变化就调用容器运行时创建或删除静态 Pod。

Kubernetes 4 个核心组件（apiserver、etcd、scheduler、controller-manager）都以静态 Pod 形式存在，这是它们能先于集群启动的原因。DaemonSet 无法满足的特殊需求可考虑静态 Pod，但必须在节点上纯手动部署，应当慎用。
