---
title: echo-cj 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, cronjob, batch, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Job-CronJob：为什么不直接用Pod来处理业务

CronJob 对象 echo-cj，schedule 设为 `'*/1 * * * *'` 表示每分钟运行一次。jobTemplate 里嵌套定义 Job，Job 的 template 里再嵌套定义 Pod，连续三层 spec。Pod 执行 /bin/echo 输出 "hello world"。

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: echo-cj

spec:
  schedule: '*/1 * * * *'
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - image: busybox
            name: echo-cj
            imagePullPolicy: IfNotPresent
            command: ["/bin/echo"]
            args: ["hello", "world"]
```
