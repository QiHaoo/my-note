---
title: Job 的 YAML 描述
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, job, batch]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Job-CronJob：为什么不直接用Pod来处理业务

Job 的 YAML "文件头"部分还是那几个必备字段，与 Pod 的主要区别在 spec 字段。

## 文件头字段

- `apiVersion` 不是 v1，而是 `batch/v1`
- `kind` 是 `Job`，和对象的名字一致
- `metadata` 里仍要有 name 标记名字，也可以用 labels 添加任意标签

记不住可以用 `kubectl explain job` 查看字段说明。

生成样板用 `kubectl create job`（不能用 `kubectl run`，它只能创建 Pod；创建 Pod 以外的 API 对象要用 `kubectl create`）：

```bash
export out="--dry-run=client -o yaml"  # 定义 Shell 变量
kubectl create job echo-job --image=busybox $out
```

## template 字段与组合模式

Job 的描述与 Pod 很像但有些不一样，主要区别在 spec 字段里多了 `template` 字段，然后又是一个 spec。

这其实是 Job 对象里应用了组合模式：`template` 字段定义一个"应用模板"，里面嵌入一个 Pod，Job 就可以从这个模板创建出 Pod。

这个 Pod 因为受 Job 的管理控制，不直接和 apiserver 打交道，没必要重复 apiVersion 等"头字段"，只需要定义好关键的 spec，描述清楚容器相关信息即可，是一个"无头"的 Pod 对象。

echo-job 里并没有太多额外功能，只是把 Pod 做了个简单包装：containers 里写好名字和镜像，command 执行 /bin/echo，输出 "hello world"。

-> 详见 echo-job 示例

## restartPolicy 字段

因为 Job 业务的特殊性，要在 spec 里多加一个 `restartPolicy` 字段，确定 Pod 运行失败时的策略：

| 策略 | 含义 |
|------|------|
| OnFailure | 失败原地重启容器 |
| Never | 不重启容器，让 Job 去重新调度生成一个新的 Pod |

## Job 级别的控制字段

控制离线作业的重要字段，注意这 4 个字段不在 template 字段下，而是在 spec 字段下，属于 Job 级别，用来控制模板里的 Pod 对象：

| 字段 | 作用 |
|------|------|
| activeDeadlineSeconds | 设置 Pod 运行的超时时间 |
| backoffLimit | 设置 Pod 的失败重试次数 |
| completions | Job 完成需要运行多少个 Pod，默认 1 个 |
| parallelism | 与 completions 相关，允许并发运行的 Pod 数量，避免过多占用资源 |

sleep-job 示例：参数设置成 15 秒超时，最多重试 2 次，总共运行完 4 个 Pod，同一时刻最多并发 2 个 Pod。

-> 详见 sleep-job 示例
