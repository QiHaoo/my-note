---
title: 更新描述与 annotations
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, annotations, rollout]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：滚动更新：如何做到平滑的应用升级降级

`kubectl rollout history` 的版本列表只有版本更新序号，CHANGE-CAUSE 列总是显示 `<none>`。要像 Git 一样为每次更新加上说明信息，做法很简单：在 Deployment 的 `metadata` 里加上 `annotations` 字段。

## annotations 与 labels 的区别

`annotations` 字段的含义是"注解""注释"，形式上和 `labels` 一样，都是 Key-Value，都是给 API 对象附加额外信息，但用途区别很大：

| 字段 | 用途 | 比喻 |
|------|------|------|
| annotations | 给 Kubernetes 内部的各种对象使用，像"扩展属性" | 包装盒里的产品说明书 |
| labels | 主要面对 Kubernetes 外部用户，用来筛选、过滤对象 | 包装盒外的标签贴纸 |

借助 annotations，Kubernetes 既不破坏对象的结构，也不用新增字段，就能给 API 对象添加任意的附加信息，这是面向对象设计中典型的 OCP"开闭原则"，让对象更具扩展性和灵活性。

annotations 里的值可以任意写，Kubernetes 会自动忽略不理解的 Key-Value，但要编写更新说明就需要使用特定的字段 `kubernetes.io/change-cause`。

## 为 3 个版本添加更新说明

创建 3 个版本的 Nginx 应用，同时添加更新说明（注意 YAML 里的 `metadata` 部分）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep
  annotations:
    kubernetes.io/change-cause: v1, ngx=1.21
... ...
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep
  annotations:
    kubernetes.io/change-cause: update to v2, ngx=1.22
... ...
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep
  annotations:
    kubernetes.io/change-cause: update to v3, change name
... ...
```

依次用 `kubectl apply` 创建并更新对象后，再用 `kubectl rollout history` 查看更新历史，列表信息就好看多了，每个版本的主要变动情况列得非常清楚，和 Git 版本管理的感觉很像。

相比 `kubectl rollout history --revision` 罗列大量信息，使用 `annotations.kubernetes.io/change-cause` 描述版本更新情况更容易理解。
