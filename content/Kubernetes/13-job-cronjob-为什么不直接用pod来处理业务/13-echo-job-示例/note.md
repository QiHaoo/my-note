---
title: echo-job 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, job, batch, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Job-CronJob：为什么不直接用Pod来处理业务

用 busybox 创建一个简单的 Job 对象 echo-job，Pod 工作非常简单：在 containers 里写好名字和镜像，command 执行 /bin/echo，输出 "hello world"。restartPolicy 设为 OnFailure，失败原地重启容器。

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: echo-job

spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - image: busybox
        name: echo-job
        imagePullPolicy: IfNotPresent
        command: ["/bin/echo"]
        args: ["hello", "world"]
```
