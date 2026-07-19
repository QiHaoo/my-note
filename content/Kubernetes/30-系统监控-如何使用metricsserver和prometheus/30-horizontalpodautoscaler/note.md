---
title: HorizontalPodAutoscaler
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, monitoring, hpa, autoscaling]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：系统监控：如何使用MetricsServer和Prometheus

HorizontalPodAutoscaler（简称 `hpa`）是专门自动伸缩 Pod 数量的 API 对象，适用于 Deployment 和 StatefulSet，但不能用于 DaemonSet。它完全基于 Metrics Server：从 Metrics Server 获取应用运行指标（主要是 CPU 使用率），再依预定策略增减 Pod 数量。

`kubectl scale` 可手动增减 Deployment 的 Pod 数量，但需人工参与、难把握时机，HPA 把"扩容""缩容"变成自动化操作。

## 定义目标应用

首先定义 Deployment 和 Service，创建 Nginx 应用作为自动伸缩目标对象。注意在它的 `spec` 里一定要用 `resources` 字段写清资源配额，否则 HPA 无法获取 Pod 指标，也就无法实现自动扩缩容。

-> 详见 ngx-hpa Deployment 与 Service 示例

## 创建 HorizontalPodAutoscaler

用 `kubectl autoscale` 创建 HPA 的样板 YAML，有三个参数：

| 参数 | 含义 |
|------|------|
| `--min` | Pod 数量的最小值（缩容下限） |
| `--max` | Pod 数量的最大值（扩容上限） |
| `--cpu-percent` | CPU 使用率指标，大于则扩容、小于则缩容 |

为 Nginx 应用创建 HPA，指定 Pod 最少 2 个、最多 10 个，CPU 使用率指标设小一点（5%）方便观察扩容：

```bash
export out="--dry-run=client -o yaml"   # 定义 Shell 变量
kubectl autoscale deploy ngx-hpa-dep --min=2 --max=10 --cpu-percent=5 $out
```

得到的 YAML 描述文件：

```yaml
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: ngx-hpa
spec:
  maxReplicas: 10
  minReplicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ngx-hpa-dep
  targetCPUUtilizationPercentage: 5
```

`kubectl apply` 创建后，HPA 发现 Deployment 实例只有 1 个、不符合 min 下限，先扩容到 2 个，再通过 Metrics Server 不断监测 Pod 的 CPU 使用率。

## 压测观察扩缩容

运行一个测试 Pod（镜像 `httpd:alpine`，内含 HTTP 性能测试工具 ab），向 Nginx 发一百万个请求持续 1 分钟，再用 `kubectl get hpa` 观察：

```bash
kubectl run test -it --image=httpd:alpine -- sh
ab -c 10 -t 60 -n 1000000 'http://ngx-hpa-svc/'
```

Metrics Server 约每 15 秒采集一次数据，HPA 的扩缩也按此时间点逐步处理。发现目标 CPU 使用率超过预定 5% 后，以 2 的倍数扩容直到上限，持续监控一段时间；若 CPU 使用率回落，再缩容到最小值。

<div class="callout">
  <strong>补充</strong>：部署 HPA 后再执行 <code>kubectl scale</code> 手动扩容，HPA 会按自动伸缩策略调整 Pod 数量——超过上限则缩回上限，低于下限则扩展到下限以上，建议用 HPA 自动伸缩避免冲突。HPA 查出的 CPU 使用率要求 Pod 必须有资源申请，否则不工作。HPA 严格按顺序执行：要扩容到上限，在所有 Pod 都 Running 之前即使已符合缩容条件也不缩容，要等扩容彻底完成才缩容。除 CPU 占用率，HPA 还可基于其他自定义指标，Kubernetes 提供了可扩展框架。
</div>
