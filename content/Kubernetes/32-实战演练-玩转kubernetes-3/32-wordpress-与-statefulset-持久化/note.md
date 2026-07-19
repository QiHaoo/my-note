---
title: WordPress 与 StatefulSet 持久化
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, nfs, wordpress]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（3）

把贯穿课程的 WordPress 网站里的 MariaDB 由 Deployment 改成 StatefulSet，并挂载 NFS 动态存储卷，实现数据库数据持久化。架构图变化不大，前面的 Nginx、WordPress 原样，只需修改 MariaDB。

## MariaDB 改为 StatefulSet

因 MariaDB 由 Deployment 改成 StatefulSet，YAML 添加 `serviceName`、`volumeClaimTemplates` 两个字段，定义网络标识和 NFS 动态存储卷，容器部分用 `volumeMounts` 挂载到容器数据目录 `/var/lib/mysql`。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  labels:
    app: maria-sts
  name: maria-sts
spec:
  # headless svc
  serviceName: maria-svc
  # pvc
  volumeClaimTemplates:
  - metadata:
      name: maria-100m-pvc
    spec:
      storageClassName: nfs-client
      accessModes:
      - ReadWriteMany
      resources:
        requests:
          storage: 100Mi
  replicas: 1
  selector:
    matchLabels:
      app: maria-sts
  template:
    metadata:
      labels:
        app: maria-sts
    spec:
      containers:
      - image: mariadb:10
        name: mariadb
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3306
        envFrom:
        - prefix: 'MARIADB_'
          configMapRef:
            name: maria-cm
        volumeMounts:
        - name: maria-100m-pvc
          mountPath: /var/lib/mysql
```

## 修改 WordPress 环境变量

StatefulSet 管理的每个 Pod 都有自己的域名，所以要把 WordPress 的环境变量改成 MariaDB 的新名字 `maria-sts-0.maria-svc`。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm
data:
  HOST: 'maria-sts-0.maria-svc'  # 注意这里
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'
```

## 创建与验证

改完两个 YAML，逐个创建 MariaDB、WordPress、Ingress 等对象。和之前一样，访问 NodePort 的 308 端口，或用 Ingress Controller 的 `wp.test` 域名，都可进入 WordPress 网站。

验证 StatefulSet 持久化是否生效：

- 把这些对象都删除后重新创建，再进入网站，看原来的数据是否依然存在。
- 或更简单些，直接查看 NFS 的存储目录，应能看到 MariaDB 生成的一些数据库文件。

两种方式都能证明 MariaDB 用 StatefulSet 部署后数据已保存在磁盘上，不会因对象销毁而丢失。

<div class="callout">
  <strong>补充</strong>：部署 StatefulSet 管理的 MariaDB Pod 时，不要忘了创建 Service 对象，不然 <code>maria-sts-0.maria-svc</code> 无效，可能报 "Error establishing a database connection"。需创建 headless Service（selector 为 <code>app: maria-sts</code>，端口 3306）。
</div>
