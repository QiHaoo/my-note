---
title: 应用保障：如何让Pod运行得更健康
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, probe, 资源配额]
reviewable: true
module: kubernetes-core
---

## 核心概念

为让 Pod 里的应用运行得更健康，Kubernetes 提供两种保障手段：

- **资源配额（Resources）**：用 cgroup 技术限制容器可使用的 CPU 和内存，避免无节制占用基础资源。
- **检查探针（Probe）**：主动健康检查，让 Kubernetes 定时给应用做"体检"，实时掌握其运行状态。

Pod 的职责是管理容器，以逻辑主机、容器集合、进程组的形式代表应用。在已有的 API 对象之上，回过头来配置这两项，就能让应用既不会"饿死"也不会"撑死"。

## 容器资源配额

容器的三大隔离技术里，namespace 实现独立进程空间，chroot 实现独立文件系统，cgroup 负责管控 CPU、内存。Kubernetes 的做法类似 PersistentVolumeClaim：容器先提出"书面申请"（在容器描述里加 `resources` 字段），再由 Kubernetes 决定资源是否分配、如何分配。

`resources` 下两个字段：

| 字段 | 含义 |
|------|------|
| `requests` | 容器要申请的资源，创建 Pod 时必须分配，否则容器无法运行 |
| `limits` | 容器使用资源的上限，超过设定值可能被强制停止 |

资源表示方式：内存用 Ki/Mi/Gi 表示 KB/MB/GB；CPU 允许精细分割，可整数（1、2）或小数（0.1、0.2，效仿 UNIX 时间片），最小单位 0.01 用 `m`（milli，毫）表示，如 50m 相当于 0.5。

不写 `resources` 意味着"既没有下限也没有上限"，生产环境很危险；若申请过多系统无法满足，Pod 会处于 Pending 状态，`kubectl describe` 可见调度失败原因。

-> 详见 容器资源配额

## 容器状态探针

程序即使正常启动，也可能因"死锁""死循环"无法对外服务——外部看进程正常，内部已一团糟。所以希望 Kubernetes 探查 Pod 内部状态，定时做"体检"。应用本是黑盒（只有启动、运行、停止三态），必须变成灰盒，让部分内部信息对外可见。

Kubernetes 定义三种探针，对应容器不同状态：

| 探针 | 中文名 | 检查对象 | 适用场景 |
|------|--------|----------|----------|
| Startup | 启动探针 | 应用是否已启动成功 | 有大量初始化工作、启动慢的应用 |
| Liveness | 存活探针 | 应用是否正常运行、是否存在死锁死循环 | -- |
| Readiness | 就绪探针 | 应用是否可接收流量、能对外提供服务 | -- |

三种探针递进：先进入 Startup，再 Liveness（可能还没准备好对外服务），最后 Readiness 才是最健康可用状态。探针失败的处理动作：

| 探针失败 | 处理动作 |
|----------|----------|
| Startup | 认为未正常启动，反复重启，后续 Liveness、Readiness 不启动 |
| Liveness | 认为发生异常，重启容器 |
| Readiness | 认为内部有错、不能正常服务，把容器从 Service 负载均衡集合排除，不分配流量 |

-> 详见 容器状态探针

## 容器状态探针的使用

`startupProbe`、`livenessProbe`、`readinessProbe` 配置方式一样，关键字段：

| 字段 | 含义 | 默认值 |
|------|------|--------|
| `periodSeconds` | 执行探测动作的时间间隔 | 10 秒 |
| `timeoutSeconds` | 探测超时时间，超时即失败 | 1 秒 |
| `successThreshold` | 连续几次探测成功才认为正常 | 对 startup/liveness 只能是 1 |
| `failureThreshold` | 连续失败几次才认为真正异常 | 3 次 |

三种探测方式：

| 方式 | 字段 | 说明 |
|------|------|------|
| Shell | `exec` | 执行 Linux 命令（如 ps、cat），与 container 的 command 类似 |
| TCP Socket | `tcpSocket` | 用 TCP 协议连接容器指定端口 |
| HTTP GET | `httpGet` | 连接端口并发送 HTTP GET 请求 |

要使用探针，必须在开发应用时预留"检查口"，Kubernetes 才能调用探针获取信息。

-> 详见 带探针的 Pod 示例

-> 详见 探针的使用

## 分笔记索引

- **容器资源配额** — resources 字段、CPU/内存表示方式、不写与申请过多的后果
- **容器状态探针** — 三种探针作用、失败处理动作、探针执行时机补充
- **探针的使用** — 关键配置字段、三种探测方式、失败验证
- **带探针的 Pod 示例** — 配置三种探针的 Nginx Pod 完整 YAML
