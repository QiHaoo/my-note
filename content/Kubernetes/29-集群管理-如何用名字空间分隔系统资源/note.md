---
title: 集群管理：如何用名字空间分隔系统资源
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, namespace, resourcequota, limitrange]
reviewable: true
module: kubernetes-core
---

## 核心概念

名字空间（namespace）是 Kubernetes 里的逻辑概念，把集群切分成彼此独立的区域，为多团队、多项目共用集群时划分"工作空间"，避免资源争抢和命名冲突。配合 ResourceQuota（资源配额）和 LimitRange（默认资源配额）两个对象，可在集群宏观层次对资源做全局规划与限制。

## 为什么要有名字空间

名字空间不是实体对象，只是逻辑概念，把集群切分成彼此独立的区域，应用只能在自己的名字空间里分配资源和运行，不会干扰其他名字空间，类似容器技术里 namespace 的隔离效果。

引入名字空间是面对大规模集群的现实考虑：集群很大、用户很多，可能有百万量级 Pod，资源争抢和命名冲突概率大增。例如前端、后端、测试组共用集群时，后端组先创建名为 "Web" 的 Pod 占用名字，测试组部署有 Bug 的应用把节点资源"吃"完，会导致其他组无法工作。把 Kubernetes 比作大牧场，API 对象是鸡鸭牛羊，名字空间就是圈养它们的围栏。

## 如何使用名字空间

名字空间是一种 API 对象，简称 `ns`，用 `kubectl create ns` 创建：

```bash
kubectl create ns test-ns
kubectl get ns
```

Kubernetes 初始化集群时预设 4 个名字空间：

| 名字空间 | 用途 |
|----------|------|
| default | 用户对象默认的名字空间 |
| kube-system | 系统组件所在 |
| kube-public | 公共名字空间 |
| kube-node-lease | 节点心跳租约 |

要把对象放入特定名字空间，需在 `metadata` 加 `namespace` 字段；操作其他名字空间的对象必须用 `-n` 参数明确指定，否则默认查看 `default`。

> 删除名字空间时一定要小心：一旦名字空间被删除，里面的所有对象都会消失。

-> 详见 名字空间的使用

## 什么是资源配额

有了名字空间，可像管理容器一样给名字空间设定配额。集群和单机不同，除限制 CPU、内存，还必须限制各种对象数量。

资源配额使用专门对象 **ResourceQuota**（简称 `quota`），必须依附在某个名字空间上，所以 `metadata` 必须明确写 `namespace`（否则应用到 default）。它用 `spec.hard` 字段做"硬性全局限制"。

ResourceQuota 可设置的配额字段分类：

| 配额类别 | 字段形式 | 说明 |
|----------|----------|------|
| CPU 和内存配额 | `requests.*`、`limits.*` | 和容器资源限制一样 |
| 存储容量配额 | `requests.storage`、`persistentvolumeclaims` | 限制 PVC 存储总量 / PVC 个数 |
| 核心对象配额 | 对象名复数形式（`pods`、`configmaps`、`secrets`、`services`） | 限制核心对象数量 |
| 其他 API 对象配额 | `count/name.group`（如 `count/jobs.batch`、`count/deployments.apps`） | 限制其他 API 对象数量 |

-> 详见 ResourceQuota 资源配额

## 默认资源配额

加了资源配额后，名字空间会有一个"烦人"约束：要求所有在其中运行的 Pod 都必须用 `resources` 字段声明资源需求，否则无法创建（报 "Forbidden" 错误）。原因是若没有 `resources`，Pod 可无限制使用 CPU 和内存，与名字空间资源配额冲突。

为省去反复设置配额的麻烦，可用辅助对象 **LimitRange**（简称 `limits`）为 API 对象添加默认的资源配额限制。

LimitRange 关键字段：

| 字段 | 说明 |
|------|------|
| `spec.limits` | 核心属性，描述默认的资源限制 |
| `type` | 限制的对象类型，可是 Container、Pod、PersistentVolumeClaim |
| `default` | 默认的资源上限，对应容器里的 `resources.limits`，只适用 Container |
| `defaultRequest` | 默认申请的资源，对应容器里的 `resources.requests`，只适用 Container |
| `max`、`min` | 对象能使用的资源最大最小值 |

创建 LimitRange 后，就可以不写 `resources` 字段直接创建 Pod，LimitRange 会为它自动加上资源配额作为"保底"。

-> 详见 LimitRange 默认资源配额

## 分笔记索引

- **名字空间的使用** — 创建/查看、把对象放入名字空间、删除的级联效应
- **ResourceQuota 资源配额** — 配额字段分类、完整示例、限制效果验证
- **LimitRange 默认资源配额** — 默认资源限制字段、示例与使用查看
