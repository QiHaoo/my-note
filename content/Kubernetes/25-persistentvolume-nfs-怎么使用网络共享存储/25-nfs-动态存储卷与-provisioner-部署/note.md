---
title: NFS 动态存储卷与 Provisioner 部署
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, provisioner, storageclass]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume+NFS：怎么使用网络共享存储

动态存储卷用 StorageClass 绑定 Provisioner 对象，Provisioner 自动管理存储、创建 PV，代替管理员手工劳动。NFS 的 Provisioner 是 `nfs-subdir-external-provisioner`（GitHub 项目），以 Pod 形式运行在 Kubernetes 里。

## 部署 NFS Provisioner

GitHub 的 deploy 目录里有三个 YAML：rbac.yaml、class.yaml、deployment.yaml，只是示例，要修改其中两个才能在集群里运行。

**rbac.yaml**：使用默认的 default 名字空间，应改成其他的（如 kube-system），避免与普通应用混在一起，用"查找替换"统一改成 kube-system。

**deployment.yaml**：要修改的地方较多。首先名字空间改成和 rbac.yaml 一样（kube-system），然后重点修改 volumes 和 env 里的 IP 地址和共享目录名，必须和集群里的 NFS 服务器配置一样。按当前环境，IP 改成 192.168.10.208，目录名改成 /tmp/nfs。

-> 详见 NFS Provisioner Deployment 片段示例

deployment.yaml 的镜像仓库用的是 gcr.io，拉取很困难，国内镜像网站也没有。需把镜像名由 `k8s.gcr.io/sig-storage/nfs-subdir-external-provisioner:v4.0.2` 改成 `chronolaw/nfs-subdir-external-provisioner:v4.0.2`（变动一下镜像用户名）。

修改好两个 YAML 后创建 NFS Provisioner：

```bash
kubectl apply -f rbac.yaml
kubectl apply -f class.yaml
kubectl apply -f deployment.yaml
```

用 `kubectl get` 加名字空间限定 `-n kube-system` 即可看到 NFS Provisioner 运行起来。

## StorageClass 定义

NFS 默认的 StorageClass 定义：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client

provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  archiveOnDelete: "false"
```

- **provisioner**：关键字段，指定应使用哪个 Provisioner。
- **parameters**：调节 Provisioner 运行的参数，需参考文档确定具体值。这里的 `archiveOnDelete: "false"` 就是自动回收存储空间。

也可不使用默认 StorageClass，根据需求定制具有不同存储特性的 StorageClass，比如添加字段 `onDelete: "retain"` 暂时保留分配的存储，之后再手动删除：

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client-retained

provisioner: k8s-sigs.io/nfs-subdir-external-provisioner
parameters:
  onDelete: "retain"
```

## 使用 NFS 动态存储卷

定义一个 PVC 向系统申请 10MB 存储空间，使用默认的 nfs-client StorageClass：

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-dyn-10m-pvc

spec:
  storageClassName: nfs-client
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Mi
```

在 Pod 里用 volumes 和 volumeMounts 挂载，Kubernetes 就会自动找到 NFS Provisioner，在 NFS 的共享目录上创建出合适的 PV 对象。

-> 详见 NFS 动态 Pod 示例

```bash
kubectl apply -f dyn-pvc.yml -f dyn-pod.yml
kubectl get pv
```

虽然没直接定义 PV 对象，但由于有 NFS Provisioner，它自动创建一个 PV，大小刚好是 PVC 里申请的 10MB。再去 NFS 服务器查看共享目录，会发现多出一个目录，名字与自动创建的 PV 一样，但加上了名字空间和 PVC 的前缀。

## 常见问题

- **面向对象理解存储设计**：StorageClass 是类，PV 是实例，PVC 是创建实例的代码，Provisioner 是工厂。
- **动态卷的好处与缺点**：好处是分层解耦，运维定义好 StorageClass，开发可忽视存储细节只定义 PVC；在大规模集群下避免运维逐个手动维护 PV 的巨大工作量。缺点是资源管控松散，业务人员对容量把握不准易造成空间浪费。
- **StorageClass 的作用**：关联特定类型的 Provisioner，决定使用哪种存储插件；限定 PV 和 PVC 的绑定关系，只有从属同一 StorageClass 的 PV 和 PVC 才能绑定（如 GlusterFS 的 PVC 不能绑定 NFS 的 StorageClass 创建出的 PV）。
- **reclaimPolicy 改 Retain 的正确写法**：文章里用 `parameters.onDelete: "retain"` 不能更改回收策略为 Retain，正确写法是在 StorageClass 顶层加 `reclaimPolicy: Retain`（可能是新 provisioner 变了）。
- **NFS Provisioner 不强制容量限制**：provisioned storage limit is not enforced，应用可扩展使用所有可用存储，且不支持 storage resize/expansion，直接改 PVC 配置会报错。
- **生产环境建议**：NFS 没有单点故障处理方法，生产不适合用 NFS；建议用 Helm 包方式部署 nfs-subdir-external-provisioner，支持离线下载方便传输。
- **镜像拉取失败**：chronolaw/nfs-subdir-external-provisioner:v4.0.2 在虚拟机拉取失败时，可换台机拉取后用 `docker save` 保存到文件，再放到虚拟机用 `docker load` 导入。
