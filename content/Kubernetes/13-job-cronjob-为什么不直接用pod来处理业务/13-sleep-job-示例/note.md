---
title: sleep-job 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, job, batch, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Job-CronJob：为什么不直接用Pod来处理业务

名字叫 sleep-job，它随机睡眠一段时间再退出，模拟运行时间较长的作业（比如 MapReduce）。Job 的参数设置成 15 秒超时，最多重试 2 次，总共需要运行完 4 个 Pod，但同一时刻最多并发 2 个 Pod。

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: sleep-job

spec:
  activeDeadlineSeconds: 15
  backoffLimit: 2
  completions: 4
  parallelism: 2
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - image: busybox
        name: echo-job
        imagePullPolicy: IfNotPresent
        command:
        - sh
        - -c
        - sleep $(($RANDOM % 10 + 1)) && echo done
```
