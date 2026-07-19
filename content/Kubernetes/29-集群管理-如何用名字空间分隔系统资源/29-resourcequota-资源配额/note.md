---
title: ResourceQuota 资源配额
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, namespace, resourcequota]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：集群管理：如何用名字空间分隔系统资源

ResourceQuota（简称 `quota`）是名字空间的资源配额对象，把整个集群的计算资源分割成不同大小，按需分配给团队或项目。集群和单机不同，除限制 CPU、内存，还必须限制各种对象数量，否则对象之间也会互相挤占资源。

## 创建样板

可用 `kubectl create` 生成样板文件：

```bash
export out="--dry-run=client -o yaml"
kubectl create quota dev-qt $out
```

ResourceQuota 必须依附在某个名字空间上，所以 `metadata` 必须明确写 `namespace`（否则应用到 default）。先创建名字空间 `dev-ns`，再创建资源配额对象 `dev-qt`：

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dev-ns
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-qt
  namespace: dev-ns
spec:
  ... ...
```

ResourceQuota 既可限制整个名字空间的配额，也可只限制某些类型对象（用 scopeSelector）。这里看第一种，用 `spec.hard` 字段做"硬性全局限制"。

## 配额字段分类

| 配额类别 | 字段形式 | 说明 |
|----------|----------|------|
| CPU 和内存配额 | `requests.*`、`limits.*` | 和容器资源限制一样 |
| 存储容量配额 | `requests.storage`、`persistentvolumeclaims` | 限制 PVC 存储总量 / PVC 个数 |
| 核心对象配额 | 对象名复数形式（`pods`、`configmaps`、`secrets`、`services`） | 限制核心对象数量 |
| 其他 API 对象配额 | `count/name.group`（如 `count/jobs.batch`、`count/deployments.apps`） | 限制其他 API 对象数量 |

> `count/name.group` 中的 group 指 `kubectl api-resources` 中 APIVERSION 列内容（如 deployment 是 `apps/v1`，job 和 cronjob 是 `batch/v1`），因为 API 按逻辑功能分组。

## 完整资源配额对象示例

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-qt
  namespace: dev-ns
spec:
  hard:
    requests.cpu: 10
    requests.memory: 10Gi
    limits.cpu: 10
    limits.memory: 20Gi
    requests.storage: 100Gi
    persistentvolumeclaims: 100
    pods: 100
    configmaps: 100
    secrets: 100
    services: 10
    count/jobs.batch: 1
    count/cronjobs.batch: 1
    count/deployments.apps: 1
```

它为名字空间加上的全局资源配额：

- 所有 Pod 需求总量最多 10 CPU 和 10GB 内存，上限总量 10 CPU 和 20GB 内存。
- 只能创建 10 个 PVC，使用 10GB 持久化存储。
- 只能创建 10 个 Pod、10 个 ConfigMap、10 个 Secret、10 个 Service。
- 只能创建 1 个 Job、1 个 CronJob、1 个 Deployment。

若字段太多不好阅读，可拆成几个小 YAML 分类限制，更灵活：

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: cpu-mem-qt
  namespace: dev-ns
spec:
  hard:
    requests.cpu: 10
    requests.memory: 10Gi
    limits.cpu: 10
    limits.memory: 20Gi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: core-obj-qt
  namespace: dev-ns
spec:
  hard:
    pods: 100
    configmaps: 100
    secrets: 100
    services: 10
```

## 使用与查看

```bash
kubectl apply -f quota-ns.yml
kubectl get quota -n dev-ns
kubectl describe quota -n dev-ns
```

`kubectl get` 输出信息会挤在一起；`kubectl describe` 会给出清晰的表格。

## 限制效果验证

在名字空间里运行两个 busybox Job（同样加 `-n` 参数）：

```bash
kubectl create job echo1 -n dev-ns --image=busybox -- echo hello
kubectl create job echo2 -n dev-ns --image=busybox -- echo hello
```

ResourceQuota 限制名字空间里最多一个 Job，创建第二个 Job 会失败、提示超出资源配额；`kubectl describe` 也会发现 Job 资源已到上限。删除刚才的 Job，就又能运行新的离线业务。同理，`dev-ns` 里也只能创建一个 CronJob 和一个 Deployment。

<div class="callout">
  <strong>补充</strong>：生产上 namespace 属逻辑隔离，可划出基础中间件命名空间、其余按业务系统划分。机器通常用 CPU 与内存固定比例（如 8core/16G、16core/32G），建议按此比例配置 request/limit，request 尽可能小以容纳更多应用，超限额后集群自动弹性扩容形成"超卖"。LimitRange 中容器与 Pod 两种限制会取较小值生效，二者不矛盾。
</div>
