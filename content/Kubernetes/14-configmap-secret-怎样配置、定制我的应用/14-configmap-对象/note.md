---
title: ConfigMap 对象
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, configmap]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：ConfigMap-Secret：怎样配置、定制我的应用

ConfigMap 用来保存明文配置。可以用 `kubectl create` 创建 YAML 样板，注意它有简写名字 `cm`。

## 基本结构

ConfigMap 的 YAML 和 Pod、Job 不一样，除了 apiVersion、kind、metadata，没有 `spec` 字段，最重要的字段 `spec` 不见了，因为 ConfigMap 存储的是配置数据，是静态的字符串，并不是容器，不需要用 spec 字段说明运行时的"规格"。

存储数据用 `data` 字段。

```bash
export out="--dry-run=client -o yaml"  # 定义 Shell 变量
kubectl create cm info $out
```

要生成带 data 字段的 YAML 样板，需要在 `kubectl create` 后面多加 `--from-literal` 参数，表示从字面值生成数据。因为 ConfigMap 里的数据都是 Key-Value 结构，`--from-literal` 参数需要使用 `k=v` 的形式。

```bash
kubectl create cm info --from-literal=k=v $out
```

## 完整的 ConfigMap 对象

修改 YAML 样板，增添一些 Key-Value，得到比较完整的 ConfigMap 对象：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: info

data:
  count: '10'
  debug: 'on'
  path: '/etc/systemd'
  greeting: |
    say hello to kubernetes.
```

## 创建与查看

```bash
kubectl apply -f cm.yml
kubectl get cm
kubectl describe cm info
```

创建成功后，ConfigMap 的 Key-Value 信息就存入 etcd 数据库，后续可被其他 API 对象使用。
