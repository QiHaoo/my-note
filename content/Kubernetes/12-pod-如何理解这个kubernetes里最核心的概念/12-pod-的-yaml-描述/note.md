---
title: Pod 的 YAML 描述
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Pod：如何理解这个Kubernetes里最核心的概念

Pod 作为 API 对象，具有 apiVersion、kind、metadata、spec 四个基本组成部分。可以用 `kubectl explain` 查看任意字段的详细说明。

## 基本字段

- `apiVersion` 和 `kind`：对于 Pod 来说是固定值 `v1` 和 `Pod`
- `metadata`：一般写上 `name` 和 `labels` 就足够了
  - `name` 只是基本标识，信息有限；Kubernetes 里 Pod 必须有名字
  - `labels` 可以添加任意数量的 Key-Value，给 Pod 贴归类标签，结合 name 更方便识别和管理

标签示例：根据运行环境用 `env=dev/test/prod`，根据数据中心用 `region: north/south`，根据应用层次用 `tier=front/middle/back`。

## spec.containers 字段

`spec` 里最重要的字段是 `containers`，它是一个数组，每个元素又是一个 container 对象。

container 对象必须要有 `name`（名字）和 `image`（镜像），否则 Kubernetes 会报告数据验证错误。

其他字段基本上都可以和 Docker、容器技术对应：

| 字段 | 作用 | 对应 Docker 概念 |
|------|------|-----------------|
| ports | 列出容器对外暴露的端口 | docker 的 `-p` 参数 |
| imagePullPolicy | 镜像拉取策略，Always / Never / IfNotPresent，默认 IfNotPresent（本地不存在才远程拉取，减少网络消耗） | - |
| env | 定义 Pod 的环境变量，运行时指定，更灵活可配置 | Dockerfile 的 ENV 指令 |
| command | 容器启动时要执行的命令 | Dockerfile 的 ENTRYPOINT 指令 |
| args | command 运行时的参数 | Dockerfile 的 CMD 指令 |

> 注意：env 实际是 container 的环境变量；command/args 与 Docker 的含义不同，要特别注意。

完整的 busy-pod YAML 描述参见示例文件。

-> 详见 busy-pod 示例
