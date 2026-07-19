---
title: NFS Provisioner Deployment 片段示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, storage, nfs, provisioner]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：PersistentVolume+NFS：怎么使用网络共享存储

deployment.yaml 要修改的重点：名字空间改成和 rbac.yaml 一样（如 kube-system），然后修改 volumes 和 env 里的 IP 地址和共享目录名，必须和集群里的 NFS 服务器配置一样。按当前环境，IP 改成 192.168.10.208，目录名改成 /tmp/nfs：

```yaml
spec:
  template:
    spec:
      serviceAccountName: nfs-client-provisioner
      containers:
        ...
        env:
        - name: PROVISIONER_NAME
          value: k8s-sigs.io/nfs-subdir-external-provisioner
        - name: NFS_SERVER
          value: 192.168.10.208   # 改IP地址
        - name: NFS_PATH
          value: /tmp/nfs          # 改共享目录名

      volumes:
      - name: nfs-client-root
        nfs:
          server: 192.168.10.208   # 改IP地址
          path: /tmp/nfs           # 改共享目录名
```
