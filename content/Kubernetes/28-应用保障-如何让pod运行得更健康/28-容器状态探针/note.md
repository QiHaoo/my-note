---
title: 容器状态探针
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, probe]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：应用保障：如何让Pod运行得更健康

加上资源配额后，Pod 在 Kubernetes 里有了初步保障——Kubernetes 监控资源使用，让它既不会"饿死"也不会"撑死"。但这只是最基础的保障：程序即便正常启动，也可能因"死锁""死循环"无法对外服务，此时外部看进程一切正常，内部却已一团糟。

## 为什么需要探针

希望 Kubernetes 这个"保姆"更细致地监控 Pod 状态，除崩溃重启外还要探查内部运行状态，定时做"体检"，让应用时刻保持"健康"。

但应用各式各样，对外界是黑盒，只能看到启动、运行、停止三态，无从知晓内部是否正常。必须把应用变成灰盒，让部分内部信息对外可见，Kubernetes 才能探查内部状态。检查过程像核酸检测：Kubernetes 用一根"小棉签"在应用的"检查口"提取数据，据此判断应用是否健康——这项功能被形象地命名为"探针"（Probe）。

## 三种探针

| 探针 | 中文名 | 检查对象 | 适用场景 |
|------|--------|----------|----------|
| Startup | 启动探针 | 应用是否已启动成功 | 有大量初始化工作、启动慢的应用 |
| Liveness | 存活探针 | 应用是否正常运行、是否存在死锁死循环 | -- |
| Readiness | 就绪探针 | 应用是否可接收流量、能对外提供服务 | -- |

三种探针递进：应用先启动、加载完配置等基本初始化数据进入 Startup 状态；若无异常进入 Liveness 存活状态（但可能准备工作未完成、不一定能对外服务）；只有最后到达 Readiness 状态才是容器最健康可用的状态。

## 探针失败时 Kubernetes 的处理

配置了探针的容器，Kubernetes 启动后会不断调用探针检查容器状态：

| 探针失败 | Kubernetes 的处理动作 |
|----------|----------------------|
| Startup | 认为未正常启动，反复重启，后续的 Liveness、Readiness 探针不会启动 |
| Liveness | 认为发生异常，重启容器 |
| Readiness | 认为容器仍在运行但内部有错、不能正常服务，把它从 Service 对象的负载均衡集合中排除，不分配流量 |

<div class="callout">
  <strong>补充</strong>：探针不是必须的——没有探针时 Kubernetes 不会检查，直接认为 ready；Pod 加入 Service 负载均衡列表是在 readinessProbe 成功后。探针由外部发起请求，但检查逻辑必须由容器内应用处理。Startup 成功后才执行后两个探针，Liveness 与 Readiness 并行。startup/liveness 探测失败后 Pod 初始 status 是 Running，容器重启几次后会变为 CrashLoopBackOff；若 startup/liveness 成功但 readiness 失败，Pod 的 READY 一直是 0/1、status 一直是 Running，不会重启。
</div>
