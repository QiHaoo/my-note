---
title: 系统监控：如何使用MetricsServer和Prometheus
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, monitoring, metricsserver, prometheus]
reviewable: true
module: kubernetes-core
---

## 核心概念

集群可观测性是管好用好集群的重要方面。Kubernetes 提供两个系统级监控项目：命令行方式的 Metrics Server 和图形化界面的 Prometheus，并基于 Metrics Server 实现应用的水平自动伸缩对象 HorizontalPodAutoscaler（HPA）。

## Metrics Server

Metrics Server 专门收集 Kubernetes 核心资源指标（metrics），定时从所有节点的 kubelet 采集信息，对集群整体性能影响极小（每个节点约占用 1m CPU 和 2MB 内存）。它的数据流向：

- 各节点的 kubelet 采集节点和 Pod 指标 → 发送给 Metrics Server
- Metrics Server 把指标交给 apiserver
- apiserver 把指标提供给 `kubectl top` 和 HPA 读取

安装 Metrics Server 后即可用 `kubectl top` 查看集群资源状态：

| 子命令 | 作用 |
|--------|------|
| `kubectl top node` | 查看节点的资源使用率 |
| `kubectl top pod -n <ns>` | 查看 Pod 的资源使用率 |

-> 详见 Metrics Server 的安装与使用

## HorizontalPodAutoscaler

有了 Metrics Server，另一重要功能是辅助应用的"水平自动伸缩"。

HorizontalPodAutoscaler（简称 `hpa`）是专门自动伸缩 Pod 数量的 API 对象，适用于 Deployment 和 StatefulSet，但不能用于 DaemonSet。它完全基于 Metrics Server：从 Metrics Server 获取应用的运行指标（主要是 CPU 使用率），再依预定策略增减 Pod 数量。

用 `kubectl autoscale` 创建 HPA，有三个参数：

| 参数 | 含义 |
|------|------|
| `--min` | Pod 数量的最小值（缩容下限） |
| `--max` | Pod 数量的最大值（扩容上限） |
| `--cpu-percent` | CPU 使用率指标，大于则扩容、小于则缩容 |

Metrics Server 约每 15 秒采集一次数据，HPA 的扩缩也按此时间点逐步处理：CPU 使用率超过预定值后以 2 的倍数扩容直到上限，回落后再缩容到最小值。

> Deployment 里一定要用 `resources` 字段写清资源配额，否则 HPA 无法获取 Pod 指标，无法自动扩缩容。

-> 详见 HorizontalPodAutoscaler

## Prometheus

Prometheus 是云原生监控领域的"事实标准"，历史比 Kubernetes 还早：2012 年由 Google 离职员工创建，灵感来自 Borg 的 BorgMon；2016 年作为第二个项目加入 CNCF，2018 年继 Kubernetes 之后毕业，是 CNCF 的"二当家"。

Prometheus 核心是 Server，内含存储监控数据的时序数据库 TSDB；另一个组件 Retrieval 用拉取（Pull）方式从各目标收集数据，再通过 HTTP Server 交给外界。Server 外还有三个重要组件：

| 组件 | 作用 |
|------|------|
| Push Gateway | 适配特殊监控目标，把默认 Pull 模式转为 Push 模式 |
| Alert Manager | 告警中心，预设规则，发现问题时通过邮件等方式告警 |
| Grafana | 图形化界面，可定制大量直观的监控仪表盘 |

Prometheus 的 Web 界面较简单，通常只用于调试、测试，可用 PromQL 查询指标生成可视化图表；实际监控用 Grafana，预置很多强大易用的仪表盘。

> Metrics Server 和 Prometheus 没有直接关系，可以独立安装；Grafana 是独立项目，并非 Prometheus 独有。

-> 详见 Prometheus 的部署与使用

## 分笔记索引

- **Metrics Server 的安装与使用** — 下载准备、部署、kubectl top 查看、常见问题
- **HorizontalPodAutoscaler** — HPA 定义目标应用、创建与压测观察扩缩容
- **Prometheus 的部署与使用** — 架构、kube-prometheus 部署、访问与查看
- **ngx-hpa Deployment 与 Service 示例** — 作为 HPA 目标对象的 Nginx 应用 YAML
