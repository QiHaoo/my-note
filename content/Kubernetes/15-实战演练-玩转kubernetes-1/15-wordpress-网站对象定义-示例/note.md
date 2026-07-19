---
title: WordPress 网站对象定义 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, wordpress, configmap, pod]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（1）

-> 详见 WordPress 网站搭建步骤

在 Kubernetes 集群里搭建 WordPress 网站所需的 MariaDB、WordPress 对象定义。ConfigMap 与 Pod 用 `---` 分隔可合并到一个 YAML 文件里创建（也可拆成单独文件分别 apply）。

## MariaDB：ConfigMap + Pod

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maria-cm

data:
  DATABASE: 'db'
  USER: 'wp'
  PASSWORD: '123'
  ROOT_PASSWORD: '123'

---
apiVersion: v1
kind: Pod
metadata:
  name: maria-pod
  labels:
    app: wordpress
    role: database

spec:
  containers:
  - image: mariadb:10
    name: maria
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 3306
    envFrom:
    - prefix: 'MARIADB_'
      configMapRef:
        name: maria-cm
```

## WordPress：ConfigMap + Pod

`HOST` 必须是 MariaDB Pod 的 IP 地址（用 `kubectl get pod -o wide` 查看）。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm

data:
  HOST: '172.17.0.2'
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'

---
apiVersion: v1
kind: Pod
metadata:
  name: wp-pod
  labels:
    app: wordpress
    role: website

spec:
  containers:
  - image: wordpress:5
    name: wp-pod
    imagePullPolicy: IfNotPresent
    ports:
    - containerPort: 80
    envFrom:
    - prefix: 'WORDPRESS_DB_'
      configMapRef:
        name: wp-cm
```
