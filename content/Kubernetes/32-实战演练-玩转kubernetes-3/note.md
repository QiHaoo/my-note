---
title: 实战演练：玩转Kubernetes（3）
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, statefulset, dashboard, ingress, wordpress]
reviewable: true
module: kubernetes-core
---

## 核心概念

本讲是"高级篇"的收官实战，先回顾高级篇要点（API 对象、应用管理、集群管理三部分），再做两个实战：把 WordPress 网站的 MariaDB 改为 StatefulSet 并挂载 NFS 持久化存储；在多节点集群里安装 Dashboard，并通过 Ingress 反向代理以 HTTPS 访问，综合实践 Ingress、namespace 用法。

## 要点回顾一：API 对象

- **PersistentVolume（PV）**：Kubernetes 对持久化存储的抽象，代表 LocalDisk、NFS、Ceph 等存储设备，和 CPU、内存一样属集群公共资源。StorageClass 用于分类存储设备、方便选择 PV。PV 一般由系统管理员创建，使用时用 PVC（PersistentVolumeClaim）申请容量、访问模式等参数，Kubernetes 查找最合适的 PV 分配。
- **动态存储卷**：在 StorageClass 里绑定 Provisioner，由它根据 PVC 自动创建符合要求的 PV。Pod 里用 `persistentVolumeClaim` 引用 PVC 生成 Volume，再用 `volumeMounts` 挂载到容器路径，即可读写 PV 实现持久化。
- **StatefulSet**：用于管理有状态应用，可看作 Deployment 的特例。`spec` 里多了 `serviceName` 字段，但部署方式差别大：对 Pod 顺序编号、顺序创建，保证确定的启动次序，可实现主从、主备；配合 Service 为每个 Pod 单独创建顺序编号的域名，保证稳定网络标识；用 `volumeClaimTemplates` 定义持久化存储（本质是 PVC 模板），实现存储卷与 Pod 独立绑定。通过启动顺序、稳定域名、存储模板三个能力，StatefulSet 可处理 Redis、MySQL 等。

## 要点回顾二：应用管理

- **滚动更新**：版本更新只需编写新 YAML（Deployment、DaemonSet、StatefulSet）再用 `kubectl apply`，Kubernetes 采用"滚动更新"策略，实际是两个同步进行的"扩容"和"缩容"，更新过程始终有 Pod 可用、平稳对外服务。历史用 `kubectl rollout history` 查看，意外用 `kubectl rollout undo` 回退。
- **资源配额与检查探针**：为让 Pod 容器稳定运行，可用资源配额和检查探针两种手段。资源配额限制容器申请的 CPU 和内存；检查探针是内置应用监控工具，有 Startup、Liveness、Readiness 三种（探测启动、存活、就绪），探测方式有 exec、tcpSocket、httpGet 三种，组合运用可灵活检查容器状态，发现不可用就重启容器。

## 要点回顾三：集群管理

- **名字空间与资源配额**：集群计算资源有限，除给 Pod 加资源配额，也要为集群加资源配额，用名字空间把整体资源池切分按需分配。名字空间的资源配额用 ResourceQuota，除基本 CPU、内存，还能限制存储容量和各种 API 对象数量，避免多用户互相挤占。
- **系统监控**：Kubernetes 提供 Metrics Server 和 Prometheus。Metrics Server 收集核心资源指标，可用 `kubectl top` 查看集群状态，也是 HPA 的前提；Prometheus 是 CNCF 第二个毕业项目、云原生监控"事实标准"，部署后可用 Grafana 可视化指标并集成报警。
- **网络通信**：Kubernetes 定义平坦网络模型"IP-per-pod"，实现它要符合 CNI 标准。常用插件 Flannel（Overlay，性能较低）、Calico（Route，性能较高）、Cilium 等。

## 搭建 WordPress 网站

在第 2 讲基础上优化 WordPress，关键是让数据库 MariaDB 实现数据持久化。架构图变化不大，前面 Nginx、WordPress 原样，只需修改 MariaDB。

- MariaDB 由 Deployment 改成 StatefulSet：YAML 添加 `serviceName`、`volumeClaimTemplates` 两个字段，定义网络标识和 NFS 动态存储卷，容器部分用 `volumeMounts` 挂载到数据目录 `/var/lib/mysql`。
- WordPress 相应改环境变量：StatefulSet 管理的每个 Pod 有自己的域名，把 WordPress 的 `HOST` 改成 MariaDB 新名字 `maria-sts-0.maria-svc`。
- 改完两个 YAML 后逐个创建 MariaDB、WordPress、Ingress 等对象，访问 NodePort 的 308 端口或用 Ingress Controller 的 `wp.test` 域名即可进入网站。
- 验证持久化：删除对象重新创建后数据仍在，或直接查看 NFS 存储目录可看到 MariaDB 生成的数据库文件，证明数据已保存在磁盘上。

-> 详见 WordPress 与 StatefulSet 持久化

## 部署 Dashboard

第 15 讲曾简单介绍 Dashboard（当时内置在 minikube）。现在用 kubeadm 部署了多节点集群，可从零开始安装。

Dashboard 安装只需一个 YAML 文件，可直接下载。要点：所有对象都属于 `kubernetes-dashboard` 名字空间；Dashboard 用 Deployment 部署一个实例，端口 8443；容器启用 Liveness 探针，用 HTTPS 方式检查存活；Service 用 443 端口映射 Dashboard 的 8443 端口。用 `kubectl apply -f dashboard.yaml` 即可部署。

-> 详见 Dashboard 部署与 Ingress 访问

## 部署 Ingress / Ingress Controller

为增加难度，在前面配一个 Ingress 入口用反向代理访问 Dashboard。因 Dashboard 默认用加密 HTTPS、拒绝明文 HTTP，要先生成证书让 Ingress 也走 HTTPS。

涉及对象较多、处于不同名字空间（kubernetes-dashboard、nginx-ingress），关联较复杂。整体步骤：

1. 用 `openssl` 生成自签名证书（X509 格式，有效期 365 天，RSA 2048 位，SHA256，签发网站 `k8s.test`），生成 `k8s.test.crt` 和 `k8s.test.key`。
2. 证书和私钥属机密信息，用 Secret 存储，类型是 `tls`（不是 `generic`），用 `-n` 指定名字空间、`--cert`/`--key` 指定文件。
3. 编写 IngressClass（名为 `dash-ink`，指定 Nginx 官方 Ingress Controller），放在 `kubernetes-dashboard` 名字空间。
4. 编写 Ingress 对象：因是 HTTPS，需多加两处——`annotations` 字段指定后端目标是 HTTPS 服务，`tls` 字段指定域名和证书 Secret。
5. 最后 Ingress Controller，拿现成模板修改，把 `args` 里的 IngressClass 改成 `dash-ink`；再为它定义一个 NodePort 类型 Service，端口指定 30443。

-> 详见 Dashboard 部署与 Ingress 访问

## 访问 Dashboard

部署完成后，需创建一个用户才能登录 Dashboard。

- Dashboard 网站有创建示例用户的 YAML，直接拿来用：创建 ServiceAccount（admin-user），用 RBAC 机制绑定 ClusterRole `cluster-admin`。
- 该账号不能用"用户名+密码"登录，需用 Token，用 `kubectl get secret`、`kubectl describe secret` 查到。
- Token 拷贝存好，为测试域名 `k8s.test` 加域名解析（修改 /etc/hosts），浏览器输入 `https://k8s.test:30443` 即可访问 Dashboard。
- 因之前安装了 Metrics Server，Dashboard 也能以图形方式显示 CPU 和内存状态，有点 Prometheus + Grafana 的意思。

-> 详见 Dashboard 部署与 Ingress 访问

## 分笔记索引

- **WordPress 与 StatefulSet 持久化** — MariaDB 改 StatefulSet、修改 WordPress 环境变量、创建与验证
- **Dashboard 部署与 Ingress 访问** — Dashboard 部署、自签名证书、TLS Secret、Ingress、访问
- **Dashboard Ingress 访问 示例** — Dashboard 的 Ingress 与示例用户完整 YAML
