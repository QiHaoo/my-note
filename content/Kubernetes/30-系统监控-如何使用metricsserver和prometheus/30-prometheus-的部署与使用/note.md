---
title: Prometheus 的部署与使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, monitoring, prometheus, grafana]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：系统监控：如何使用MetricsServer和Prometheus

Metrics Server 能获取的指标太少（只有 CPU 和内存），想要更全面监控应用运行状况，要用 Prometheus。

Prometheus 历史比 Kubernetes 还早：2012 年由 Google 离职员工创建，灵感来自 Borg 的 BorgMon；2016 年作为第二个项目加入 CNCF，2018 年继 Kubernetes 之后毕业，是 CNCF 的"二当家"，也是云原生监控领域的"事实标准"。

## 架构

Prometheus 核心是 Server，内含存储监控数据的时序数据库 TSDB；另一个组件 Retrieval 用拉取（Pull）方式从各目标收集数据，再通过 HTTP Server 交给外界使用。数据流向：

- 监控目标 →（被拉取）→ Retrieval → TSDB
- TSDB →（HTTP Server）→ 外界使用
- Push Gateway →（特殊目标 Push 模式）→ Retrieval
- TSDB → Alert Manager（告警）、Grafana（图形界面）

Server 之外三个重要组件：

| 组件 | 作用 |
|------|------|
| Push Gateway | 适配特殊监控目标，把默认 Pull 模式转为 Push 模式 |
| Alert Manager | 告警中心，预设规则，发现问题时通过邮件等方式告警 |
| Grafana | 图形化界面，可定制大量直观的监控仪表盘 |

## 部署（kube-prometheus）

同属 CNCF，Prometheus 是"云原生"，在 Kubernetes 里运行顺理成章。但它组件太多、部署麻烦，这里选用 kube-prometheus 项目（https://github.com/prometheus-operator/kube-prometheus/）。

下载源码包，解压后部署相关的 YAML 文件都在 `manifests` 目录（近 10 个）。

### 准备工作一：修改 Service

修改 `prometheus-service.yaml`、`grafana-service.yaml`，给它们加 `type: NodePort`（参考前述 Ingress 章节），即可通过节点 IP 直接访问（也可配成 Ingress）。

### 准备工作二：修改镜像

修改 `kubeStateMetrics-deployment.yaml`、`prometheusAdapter-deployment.yaml`，里面有两个 gcr.io 镜像。作者没在国内网站找到下载方式，下载后上传到 Docker Hub，需改镜像名，前缀都改成 `chronolaw`：

```yaml
image: chronolaw/kube-state-metrics:v2.5.0
image: chronolaw/prometheus-adapter:v0.9.1
```

### 部署命令

执行两个 `kubectl create` 命令部署，先是 `manifests/setup` 目录（创建名字空间等基本对象），然后是 `manifests` 目录：

```bash
kubectl create -f manifests/setup
kubectl create -f manifests
```

> 这里必须用 `create`，不能用 `apply`（apply 会报错）。清理时把 create 换成 delete，顺序相反：先是 manifests，然后是 setup。

## 查看与访问

Prometheus 的对象都在名字空间 `monitoring` 里：

```bash
kubectl get pod -n monitoring
kubectl get svc -n monitoring
```

Grafana 和 Prometheus 的 Service 开了节点端口：Grafana 是 30358，Prometheus 有两个端口，其中 9090 对应的 30827 是 Web 端口。

- **Prometheus Web 界面**：访问节点 IP 加端口 30827，有查询框可用 PromQL 查询指标生成可视化图表（如 `node_memory_Active_bytes` 表示当前正在使用的内存容量）。Web 界面较简单，通常只用于调试、测试。
- **Grafana**：访问节点端口 30358，默认用户名密码都是 admin。内部预置很多强大易用的仪表盘，可在左侧 "Dashboards Browse" 挑选（如 "Kubernetes / Compute Resources / Namespace (Pods)"），图表比 `kubectl top` 好看得多。

<div class="callout">
  <strong>常见问题</strong>：<code>chronolaw/prometheus-adapter:v0.9.1</code> 在 x86/intel 上会报 <code>exec format error</code>（作者上传的是 arm64 版本），需换镜像如 <code>pengyc2019/prometheus-adapter:v0.9.1</code> 等。镜像建议 push 到 Docker Hub，Pod 调度到任意节点都方便下载。alertmanager、prometheus-k8s 等 Pod 因污点问题 Pending，是实验集群太小、无足够 worker node，去除 master 污点后会正常启动。Grafana 仪表盘 NO DATA 通常是 coredns / service 域名解析问题，重启虚拟机可能自行恢复。监控系统一般 GPE 三个组件一起用：Grafana、Prometheus、Exporter。
</div>
