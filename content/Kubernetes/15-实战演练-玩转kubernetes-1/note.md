---
title: 实战演练：玩转Kubernetes（1）
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, wordpress, configmap, pod]
reviewable: true
module: kubernetes-core
---

## 核心概念

作为"初级篇"的最后一课，本讲回顾 Kubernetes 的核心知识要点，并综合运用 Pod、ConfigMap 等对象，在 Kubernetes 集群里搭建一个 WordPress 网站（MariaDB + WordPress + Nginx），与第 7 讲的 Docker 实战形成对照，体会"声明式"容器编排的优势与不足。

## Kubernetes 技术要点回顾

容器编排（Container Orchestration）是运维工作在云原生世界的落地，Kubernetes 源自 Borg 系统，已成为容器编排领域的事实标准。其核心机制如下：

| 要点 | 说明 |
|------|------|
| Master/Node 架构 | 集群计算资源划分为节点；控制面（Master）核心组件 apiserver、etcd、scheduler、controller-manager；数据面（Worker）核心组件 kubelet、kube-proxy、container-runtime |
| 声明式 API | 用 YAML（JSON 超集）描述对象期望状态，Kubernetes 依靠 etcd 中的状态信息不断"调控"，直至实际状态与期望状态一致 |
| Pod | 最核心的 API 对象，捆绑一组密切协作的容器，共享网络和存储，是集群里最小的调度单位 |
| 对象组合 | 基于"单一职责"和"对象组合"原则，派生出 Job/CronJob（离线作业）、ConfigMap/Secret（配置信息）等对象 |
| kubectl | 客户端工具，直接与 Master 的 apiserver 通信，把 YAML 发给 RESTful 接口触发对象管理流程 |

YAML 描述对象的固定"头字段"为 `apiVersion`、`kind`、`metadata`；实体对象（Pod、Job、CronJob）用 `spec` 描述期望状态，非实体对象（ConfigMap、Secret）用 `data` 记录静态字符串信息。

## WordPress 网站基本架构

复用"入门篇"的三个应用（WordPress、MariaDB、Nginx），从容器形式改为 Pod 形式运行在 Kubernetes 里。与 Docker 系统的关键区别在**对应用的封装**和**网络环境**两点：

- WordPress、MariaDB 被封装成 Pod（在线业务，不适用 Job/CronJob），运行所需环境变量改写成 ConfigMap，统一用"声明式"管理，比 Shell 脚本更易阅读和版本化管理
- Kubernetes 集群内部维护专用网络，与外界隔离，需用"端口转发"传递数据，并在集群外用 Nginx 反向代理该地址才能内外沟通，比 Docker 的直接端口映射略麻烦

-> 详见 WordPress 网站搭建步骤

## WordPress 网站搭建步骤

搭建共 4 步：

| 步骤 | 操作 |
|------|------|
| 1. 编排 MariaDB | 用 ConfigMap `maria-cm` 定义 4 个环境变量；定义 Pod `maria-pod`，用 `envFrom` 一次性导入 ConfigMap 并加前缀 `MARIADB_` |
| 2. 编排 WordPress | 用 ConfigMap `wp-cm` 定义环境变量（`HOST` 必须是 MariaDB Pod 的 IP）；定义 Pod `wp-pod`，同样用 `envFrom` 加前缀 `WORDPRESS_DB_` |
| 3. 端口映射 | 用 `kubectl port-forward wp-pod 8080:80 &` 把本机 8080 映射到 WordPress Pod 的 80，让集群外可见 |
| 4. Nginx 反向代理 | 因 WordPress 的 URL 重定向，直接用 8080 会跳转故障；在 Kubernetes 外用 Docker 启动 Nginx 反代 `127.0.0.1:8080`，保证外界看到的仍是 80 端口 |

`envFrom` 可一次性把 ConfigMap 的全部字段导入 Pod，并能指定变量名前缀，比逐个写 `env.valueFrom` 方便。Pod 的 IP 是 Kubernetes 私有网段（如 `172.17.0.2`），用 `kubectl get pod -o wide` 查看。

-> 详见 WordPress 网站对象定义 示例

## 使用 Dashboard 管理 Kubernetes

Kubernetes 的图形管理界面 Dashboard，用 `minikube dashboard` 启动（会自动打开浏览器）。

点击任意 Pod 名进入管理界面，右上角 4 个功能分别相当于命令行的 `logs`、`exec`、`edit`、`delete`，但比命令行直观友好：可查看日志、在浏览器里开启 Pod 内部的 Shell 窗口、查看或编辑 Pod 与 ConfigMap/Secret 等对象。

-> 详见 Dashboard 图形管理界面

## 本讲的局限

相比第 7 讲的 Docker，本讲用容器编排技术以"声明式" YAML 描述应用状态和关系，降低了心智负担。但仍不完善：

- Pod 的 IP 地址必须手工查找填写，缺少自动的服务发现机制
- 对外暴露服务的方式还很原始，必须依赖集群外部力量（Nginx 反向代理）

这些问题将在"中级篇"用更多 API 对象（Service、Ingress 等）解决。

## 分笔记索引

- **WordPress 网站搭建步骤** — 4 步搭建 WordPress（ConfigMap 注入、port-forward、Nginx 反代）
- **WordPress 网站对象定义 示例** — MariaDB/WordPress 的 ConfigMap + Pod 完整 YAML
- **Dashboard 图形管理界面** — 图形管理界面启动与 Pod 管理操作
