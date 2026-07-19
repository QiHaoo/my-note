---
title: PV 与 PVC 的 YAML 与使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, persistentvolume, pvc]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume：怎么解决数据持久化的难题

以最容易的本机存储 HostPath 为例，初步认识 PV 用法。HostPath 和 Docker 里挂载本地目录的 `-v` 参数非常类似。

## 准备本地存储目录

因为 Pod 会在集群任意节点运行，首先要作为系统管理员在每个节点上创建一个目录，作为本地存储卷挂载到 Pod。为省事在 `/tmp` 下建立名字是 `host-10m-pv` 的目录，表示一个只有 10MB 容量的存储设备。

> 注意：`kubectl create` 不能直接创建 PV 对象，只能用 `kubectl api-resources`、`kubectl explain` 查看 PV 的字段说明，手动编写 PV 的 YAML。

## 描述 PersistentVolume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: host-10m-pv

spec:
  storageClassName: host-test
  accessModes:
  - ReadWriteOnce
  capacity:
    storage: 10Mi
  hostPath:
    path: /tmp/host-10m-pv/
```

spec 部分每个字段都很重要，描述了存储的详细信息：

- **storageClassName**：对存储类型的抽象 StorageClass。这个 PV 是手动管理的，名字可任意起（如 host-test，也可改成 manual、hand-work）。
- **accessModes**：定义存储设备的访问模式，即虚拟盘的读写权限，类似 Linux 文件访问模式。目前 Kubernetes 有 3 种（见下表）。
- **capacity**：存储设备的容量，这里设为 10MB。
- **hostPath**：存储卷的本地路径，即节点上创建的目录。

### 三种访问模式

| 模式 | 说明 |
|------|------|
| ReadWriteOnce | 存储卷可读可写，但只能被一个节点上的 Pod 挂载 |
| ReadOnlyMany | 存储卷只读不可写，可被任意节点上的 Pod 多次挂载 |
| ReadWriteMany | 存储卷可读可写，可被任意节点上的 Pod 多次挂载 |

> 这 3 种访问模式限制的对象是节点而不是 Pod，因为存储是系统级别的概念，不属于 Pod 里的进程。

显然本地目录只能本机使用，所以这个 PV 用了 ReadWriteOnce。

### 容量单位

Kubernetes 里定义存储容量使用国际标准，日常习惯的 KB/MB/GB 基数是 1024，要写成 Ki/Mi/Gi，小心不要写错，否则单位不一致实际容量会对不上。

## 描述 PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: host-5m-pvc

spec:
  storageClassName: host-test
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Mi
```

PVC 内容与 PV 很像，但它不表示实际存储，而是一个"申请"或"声明"，spec 里的字段描述对存储的"期望状态"。

所以 PVC 里的 storageClassName、accessModes 和 PV 一样，但不会有 capacity，要用 `resources.request` 表示希望要多大容量。Kubernetes 会根据 PVC 描述，找能匹配 StorageClass 和容量的 PV，把它们"绑定"。

## 创建 PV/PVC 与绑定过程

```bash
kubectl apply -f host-path-pv.yml
kubectl get pv
```

PV 容量 10MB，访问模式 RWO（ReadWriteOnce），状态 Available（可用）。

```bash
kubectl apply -f host-path-pvc.yml
kubectl get pvc
```

PVC 创建成功后，Kubernetes 立即通过 StorageClass、resources 等条件查找符合要求的 PV，找到就绑定。

- PVC 申请 5MB，但系统只有一个 10MB 的 PV，Kubernetes 也只能把这个 PV 分配出去，多出的容量算"福利"。两个对象状态都是 Bound，PVC 实际容量就是 PV 的 10MB，而非最初申请的 5MB。
- 若把 PVC 申请容量改大到 10MB（超过现有 PV），PVC 会一直处于 Pending 状态，表示系统没找到符合要求的存储，无法分配资源。

## 为 Pod 挂载 PersistentVolume

-> 详见 挂载 PVC 的 Pod 示例

```bash
kubectl apply -f host-path-pod.yml
kubectl get pod -o wide
```

Pod 被调度到 worker 节点。用 `kubectl exec` 进入容器执行命令验证：容器的 `/tmp` 目录里生成 `a.txt`，根据 PV 定义它应落在 worker 节点磁盘上，登录 worker 节点检查可确认本地目录有同名 `a.txt`，对一下时间即可确认是刚才在 Pod 里生成的文件。

因为 Pod 产生的数据已通过 PV 存到磁盘上，Pod 删除后重新创建，挂载存储卷时仍使用这个目录，数据保持不变，实现持久化存储。

## 常见问题

- **HostPath 目录不存在时的行为**：取决于 PV 配置中 hostPath 字段的 type 属性。`DirectoryOrCreate` 时 Kubernetes 会在节点上自动创建对应目录；`Directory` 或未设置时，若目录不存在 Pod 无法成功挂载，状态为 ContainerCreating 直到目录被创建。多位同学实测新版本 Kubernetes 会自动创建目录，但作者在 1.23 版本试验时必须手动创建。
- **目录要建在 Pod 实际运行的节点上**：有同学在 master 节点创建目录但 Pod 没起来，查了半天才发现 Pod 启动在 worker 节点，需在 worker 节点创建目录。可用 `kubectl get pod -o wide` 查看 Pod 分配到哪台机器。
- **StorageClass 不需专门创建对象**：对于纯手工创建的 PV，不需要专门的 StorageClass 对象，PV/PVC 里只用一个相同的 StorageClass 名字就能关联起来。
- **PV/PVC 使用保护**：为防止数据丢失，PVC 和 PV 有使用保护功能，`pv.metadata.finalizers` 含 `kubernetes.io/pv-protection` 字段，在绑定的 PVC 没删除前 PV 会处于 Terminating 状态；同理 PVC 在 Pod 没删除前也不会被删除。
- **PV 创建后不可变**：apply 之后修改 PV.yaml 再 apply 不被允许，需把 PV 删除再创建，改动才能成功。
- **存储容量回收**：不是 Kubernetes 关心的问题，由 PV 后面的存储系统来管理。
