---
title: busy-pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, yaml, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Pod：如何理解这个Kubernetes里最核心的概念

描述一个简单的 Pod，名字是 busy-pod，附带一些标签，spec 部分添加 env、command、args 等字段。镜像使用 busybox:latest，拉取策略是 IfNotPresent，定义了 os 和 debug 两个环境变量，启动命令是 /bin/echo，参数里输出定义的环境变量。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: busy-pod
  labels:
    owner: chrono
    env: demo
    region: north
    tier: back

spec:
  containers:
  - image: busybox:latest
    name: busy
    imagePullPolicy: IfNotPresent
    env:
    - name: os
      value: "ubuntu"
    - name: debug
      value: "on"
    command:
    - /bin/echo
    args:
    - "$(os), $(debug)"
```
