---
title: Deployment 的 YAML 描述与样板
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Deployment：让应用永不宕机

## 基本信息

用 `kubectl api-resources` 查看 Deployment 基本信息：

```text
NAME          SHORTNAMES   APIVERSION   NAMESPACED   KIND
deployments   deploy       apps/v1      true         Deployment
```

可知 Deployment 的简称是 `deploy`，apiVersion 是 `apps/v1`，kind 是 `Deployment`。据此，YAML 文件头应写为：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: xxx-dep
```

## 创建 YAML 样板

可用 `kubectl create` 创建 Deployment 的 YAML 样板，免去反复手工输入。方式和 Job 差不多：先指定类型是 Deployment（简写 deploy），然后是名字，再用 `--image` 参数指定镜像名字。

下面这条命令创建一个名字叫 `ngx-dep` 的对象，使用镜像 `nginx:alpine`：

```bash
export out="--dry-run=client -o yaml"
kubectl create deploy ngx-dep --image=nginx:alpine $out
```

得到的 Deployment 样板与 Job/CronJob 对比，有相似也有不同：

- 相似：都有 `spec`、`template` 字段，`template` 字段里也是一个 Pod
- 不同：`spec` 部分多了 `replicas`、`selector` 两个新字段

这两个新字段就是 Deployment 实现多实例、高可用等功能的关键所在。完整样板见示例文件。

-> 详见 Deployment 对象定义 示例
