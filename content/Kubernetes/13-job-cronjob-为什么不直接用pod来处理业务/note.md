---
title: Job-CronJob：为什么不直接用Pod来处理业务
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, job, cronjob]
reviewable: true
module: kubernetes-core
---

## 核心概念

Kubernetes 基于面向对象思想设计资源对象，强调"单一职责"和"组合优于继承"。Pod 专门负责管理容器，容器之外的功能由其他对象把 Pod 作为成员"组合"进去。Job 和 CronJob 就是组合了 Pod 的两种对象，分别处理"临时任务"和"定时任务"两类离线业务，形成 CronJob -> Job -> Pod -> 容器 -> 进程的控制链。

## 为什么不直接使用 Pod

Kubernetes 使用 RESTful API，把集群中的业务抽象为 HTTP 资源对象，可以用面向对象的方式考虑问题。

面向对象设计有两条原则恰当地描述了 Kubernetes 对象设计思路：

| 原则 | 含义 |
|------|------|
| 单一职责 | 对象应只专注做好一件事，不贪大求全，保持足够小的粒度才更方便复用和管理 |
| 组合优于继承 | 尽量让对象在运行时产生联系，保持松耦合，而不要用硬编码方式固定对象关系 |

应用这两条原则看 Kubernetes 对象：Pod 已经是相对完善的对象，专门负责管理容器，不应"画蛇添足"地为它扩充功能，而要保持独立性，容器之外的功能定义其他对象，把 Pod 作为成员"组合"进去。

## 为什么要有 Job/CronJob

Pod 运行的两大类业务：

| 业务类型 | 特点 | 示例 |
|---------|------|------|
| 在线业务 | 长时间运行，一旦运行起来基本不停，永远在线 | Nginx、Node.js、MySQL、Redis |
| 离线业务 | 短时间运行，必定会退出，不直接服务外部用户，只对内部有意义 | 日志分析、数据建模、视频转码 |

离线业务的特点是必定会退出，调度策略与在线业务不同，需要考虑运行超时、状态检查、失败重试、获取计算结果等管理事项。这些与容器管理无必然联系，若由 Pod 实现会违反"单一职责"，所以分离到另外的对象上。

离线业务分两种，对应两个 API 对象：

| 离线业务 | API 对象 | 说明 |
|---------|---------|------|
| 临时任务 | Job | 跑完就完事，下次有需求再重新安排 |
| 定时任务 | CronJob | 按时按点周期运行，不需要过多干预 |

## 如何使用 YAML 描述 Job

Job 的 YAML 与 Pod 很像，主要区别在 spec 字段多了 `template` 字段，里面又是一个 spec。

- `apiVersion` 不是 v1，而是 `batch/v1`
- `kind` 是 `Job`
- `metadata` 里仍要有 name，也可用 labels

生成样板：`kubectl create job` 创建 Pod 以外的其他 API 对象（`kubectl run` 只能创建 Pod）。

`template` 字段应用了组合模式，定义一个"应用模板"，里面嵌入一个 Pod。这个 Pod 受 Job 管理控制，不直接和 apiserver 打交道，没必要重复 apiVersion 等"头字段"，只需定义关键的 spec，是"无头"的 Pod 对象。

Job 在 spec 里多加 `restartPolicy` 字段确定 Pod 运行失败时的策略：`OnFailure` 失败原地重启容器；`Never` 不重启容器，让 Job 重新调度生成新的 Pod。

-> 详见 Job 的 YAML 描述
-> 详见 echo-job 示例

## Job 级别的控制字段

控制离线作业的重要字段（在 spec 字段下，属于 Job 级别，用来控制模板里的 Pod 对象）：

| 字段 | 作用 |
|------|------|
| activeDeadlineSeconds | 设置 Pod 运行的超时时间 |
| backoffLimit | 设置 Pod 的失败重试次数 |
| completions | Job 完成需要运行多少个 Pod，默认 1 个 |
| parallelism | 与 completions 相关，表示允许并发运行的 Pod 数量，避免过多占用资源 |

-> 详见 sleep-job 示例

## 如何操作 Job

| 命令 | 作用 |
|------|------|
| `kubectl apply -f job.yml` | 创建 Job |
| `kubectl get job` | 查看 Job 状态（列出运行成功的作业数量，如 1/1） |
| `kubectl get pod` | 查看 Pod 状态 |
| `kubectl logs <pod>` | 获取 Pod 的运行结果 |
| `kubectl get pod -w` | 实时观察 Pod 状态 |

Pod 被 Job 管理，运行完成后显示为 Completed 而非反复重启报错；Pod 会被自动关联一个名字（Job 名字 + 随机字符串）。

## 如何使用 YAML 描述 CronJob

CronJob 组合了 Job，其 spec 连续有三个 spec 嵌套层次：

| spec 层次 | 从属于 | 定义 |
|----------|--------|------|
| 第一个 spec | CronJob 自身 | CronJob 的对象规格声明 |
| 第二个 spec | jobTemplate | 定义一个 Job 对象 |
| 第三个 spec | template | 定义 Job 里运行的 Pod |

CronJob 的关键字段：

| 字段 | 作用 |
|------|------|
| jobTemplate | 定义 Job 模板 |
| schedule | 定义任务周期运行的规则，使用标准 Cron 语法（分钟、小时、天、月、周），和 Linux 的 crontab 一样 |

生成样板：`kubectl create cj`（cj 是 CronJob 的简写，可用 `kubectl api-resources` 查看），需指定 `--schedule` 参数。

-> 详见 CronJob 的 YAML 描述
-> 详见 echo-cj 示例

## 操作 CronJob

```bash
kubectl apply -f cronjob.yml
kubectl get cj
kubectl get pod
```

CronJob 和 Job 的用法几乎一样。CronJob 只负责定时启动任务（相当于 Linux 的 crontab），至于容器内部执行的定时逻辑与 CronJob 没有直接关系。

## 分笔记索引

- **Job 的 YAML 描述** — 文件头字段、template 组合模式、restartPolicy、Job 级别控制字段
- **echo-job 示例** — 输出 hello world 的简单 Job
- **sleep-job 示例** — 超时/重试/并发控制的 Job
- **CronJob 的 YAML 描述** — 三层 spec 嵌套、schedule 字段
- **echo-cj 示例** — 每分钟运行一次的 CronJob
