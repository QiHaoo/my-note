---
title: 容器编排与 Kubernetes
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, 容器编排, cloud-native, borg]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：走近云原生：如何在本机搭建小巧完备的Kubernetes环境

## 容器技术的局限

容器技术的核心概念是容器、镜像、仓库，使用这三大基本要素可以完成应用的打包、分发工作，实现"一次开发，到处运行"。

但当要在服务器集群里大规模实施时，容器技术的创新只解决了运维部署工作中一个很小的问题。现实生产环境除了最基本的安装，还有各式各样的需求：

- 服务发现
- 负载均衡
- 状态监控
- 健康检查
- 扩容缩容
- 应用迁移
- 高可用

容器技术只走出了一小步，面对数不清的进程及其互相通信、互相协作的"超级问题"，困难程度指数级上升。

## 什么是容器编排

容器之上的管理、调度工作，就是"容器编排"（Container Orchestration）。

- 入门篇中部署 WordPress 网站时，把 Nginx、WordPress、MariaDB 三个容器理清次序、配好 IP 去运行，就是最初级的"容器编排"，纯手工操作，比较原始粗糙
- 单机上几个容器"人肉"编排还能应付，几百台服务器、成千上万容器就必须依靠计算机
- 目前计算机用来调度管理的"事实标准"就是 Kubernetes

## Kubernetes 的由来

早在 Docker 之前，Google 就在公司内部使用了类似技术（cgroup 就是 Google 开发再提交给 Linux 内核的），只不过不叫容器。

- Google 拥有数量庞大的服务器集群，为提高资源利用率和部署运维效率，专门开发了集群应用管理系统，代号 **Borg**，在底层支持整个公司的运转
- 2014 年，Google 内部系统从 Borg 切换到 Omega。按惯例 Google 会发表公开论文
- 因为之前发表 MapReduce、BigTable、GFS 时吃过亏（被 Yahoo 开发的 Hadoop 占领了市场），Google 决定借 Docker 的"东风"，在发论文的同时，把 C++ 开发的 Borg 系统用 Go 语言重写并开源，Kubernetes 就此诞生

Kubernetes 背后有 Borg 系统十多年生产环境经验，技术底蕴深厚，理论水平高，一经推出就引起轰动。

## CNCF 与行业地位

2015 年，Google 联合 Linux 基金会成立了 **CNCF**（Cloud Native Computing Foundation，云原生基金会），并把 Kubernetes 捐献出来作为种子项目。

有了 Google 和 Linux 两大家族的保驾护航，加上宽容开放的社区，作为 CNCF 的"头把交椅"，Kubernetes 仅用两年时间就打败了同期的竞争对手 Apache Mesos 和 Docker Swarm，成为容器编排领域的唯一霸主。

## Kubernetes 能做什么

Kubernetes 是一个生产级别的容器编排平台和集群管理系统：

- 能够创建、调度容器
- 能够监控、管理服务器
- 凝聚了 Google 等大公司和开源社区的集体智慧
- 让中小型公司也可以具备轻松运维海量计算节点（即"云计算"）的能力

> Kubernetes 与 Docker 的区别：Docker 解决应用的打包、分发、进程隔离，面向容器化的应用；Kubernetes 解决容器的编排，面向容器的管理。Docker 偏底层技术，Kubernetes 偏上层技术，通过 CRI（容器运行时接口）抽象并解耦底层容器运行时（Docker、containerd、kata 等），无论哪种容器运行时，Kubernetes 层面操作都一样。kubelet 是管理节点的，与 apiserver 通信，没有它节点就失联了。minikube 把 Kubernetes 的运行环境打包成了一个 docker image，以容器的形式来模拟 Kubernetes 的节点。
