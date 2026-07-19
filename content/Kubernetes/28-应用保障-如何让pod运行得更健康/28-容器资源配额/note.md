---
title: 容器资源配额
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, resources, cgroup]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：应用保障：如何让Pod运行得更健康

容器的三大隔离技术：namespace 实现独立进程空间，chroot 实现独立文件系统，cgroup 管控 CPU、内存，保证容器不会无节制占用基础资源、影响其他应用。

## resources 字段

Kubernetes 的做法类似 PersistentVolumeClaim：容器先提出"书面申请"，再依申请决定资源是否分配。但 CPU、内存直接"内置"在系统里，不像硬盘需"外挂"，申请管理也更简单。

在 Pod 容器的描述里添加 `resources` 字段（相当于申请资源的 Claim）：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx-pod-resources

spec:
  containers:
    - image: nginx:alpine
      name: ngx
      resources:
        requests:
          cpu: 10m
          memory: 100Mi
        limits:
          cpu: 20m
          memory: 200Mi
```

`containers.resources` 下两个字段：

| 字段 | 含义 |
|------|------|
| `requests` | 容器要申请的资源，创建 Pod 时必须分配，否则容器无法运行 |
| `limits` | 容器使用资源的上限，超过设定值有可能被强制停止 |

## CPU 与内存的表示方式

| 资源 | 表示方式 | 示例 |
|------|----------|------|
| 内存 | 与磁盘容量一样，用 Ki、Mi、Gi 表示 KB、MB、GB | 512Ki、100Mi、0.5Gi |
| CPU | 数量有限、允许精细分割，可整数或小数，效仿 UNIX"时间片" | 1、2、0.1 |

CPU 时间不能无限分割，Kubernetes 里 CPU 最小单位是 0.01，用 `m`（milli，"毫"）表示，如 50m 相当于 0.5。上面 YAML 向系统申请 1% CPU 和 10MB 内存，运行上限是 2% CPU 和 20MB 内存。Kubernetes 会在集群中查找最契合资源要求的节点去运行 Pod（像搭积木把节点尽量"塞满"）。

## 不写 resources 与申请过多

不写 `resources` 意味着对运行资源"既没有下限也没有上限"，Kubernetes 不管 CPU/内存是否足够就调度到任意节点，运行时也可无限制使用。实验环境没问题，生产环境很危险，应尽量为 Pod 加限制。

若预估错误、申请的资源太多系统无法满足，例如把 `requests.cpu` 改成极端的 10：

```yaml
...
resources:
  requests:
    cpu: 10
```

`kubectl apply` 创建时集群虽只有 3 个 CPU 也能创建成功，但 `kubectl get pod` 会显示它处于 Pending 状态、实际未被调度运行；`kubectl describe` 会明确提示调度失败——当前所有节点都无法运行这个 Pod，因为它要求的 CPU 太多。

<div class="callout">
  <strong>补充</strong>：cgroup 除限制 CPU 和内存外，也能限制磁盘 IOPS；操作系统看到的 CPU 指逻辑核，可用 <code>lscpu</code> 查看。单个容器调大资源，回到上层用 <code>resources</code> 字段调整即可。
</div>
