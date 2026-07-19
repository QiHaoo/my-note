---
title: Pod：如何理解这个Kubernetes里最核心的概念
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, yaml]
reviewable: true
module: kubernetes-core
---

## 核心概念

Pod 是 Kubernetes 在容器之上建立的"收纳舱"，把一个或多个容器"打包"成整体调度的最小单位。它屏蔽了容器的底层细节，介于容器的"细粒度"和虚拟机的"粗粒度"之间，是"中粒度"，灵活又轻便，是 Kubernetes 世界里构建一切业务的"原子"。

## 为什么要有 Pod

容器进入生产环境后，其隔离性带来了麻烦：很多应用需要多个进程密切协作（如 WordPress 需要 Nginx、WordPress、MariaDB 三个容器协作）。

- 关系松散的应用可分别调度、跨机器以 IP 通信
- 关系紧密的应用（如需要初始化配置、日志代理读取本地磁盘文件转发）若强制分离成两个容器就无法正常工作
- 把多个应用塞进一个容器不是好做法--违背容器"一个进程一个应用"的独立封装理念

Pod 的作用：在容器外面再建一个"收纳舱"，让多个容器既保持相对独立，又能小范围共享网络、存储等资源，且永远"绑在一起"。Pod 的 `spec.containers` 是数组，允许定义多个容器。

## 为什么 Pod 是 Kubernetes 的核心对象

| 原因 | 说明 |
|------|------|
| 对容器的"打包" | 里面的容器是一个整体，总是一起调度、一起运行，绝不分离 |
| 属于 Kubernetes | 可以在不触碰下层容器的情况下任意定制修改 |
| 调度最小单位 | Pod 是应用调度部署的最小单位，Kubernetes 让 Pod 编排容器 |
| 衍生基础 | 所有 Kubernetes 资源都直接或间接依附在 Pod 之上，所有功能都通过 Pod 实现 |

基于 Pod 才能构建出更复杂的业务形态（ConfigMap、Job、Deployment 等）。

## 如何使用 YAML 描述 Pod

Pod 作为 API 对象，具有 apiVersion、kind、metadata、spec 四个基本组成部分。

| 字段 | 说明 |
|------|------|
| apiVersion | 固定值 `v1` |
| kind | 固定值 `Pod` |
| metadata.name | Pod 必须有名字（Kubernetes 所有资源对象的约定），课程中通常加 `pod` 后缀 |
| metadata.labels | Key-Value 标签，给 Pod 归类（如 env、region、tier） |
| spec.containers | 数组，每个元素是一个 container 对象，是最重要的字段 |

container 对象的关键字段（必须要有 name 和 image）：

| 字段 | 作用 | 对应 Docker 概念 |
|------|------|-----------------|
| ports | 列出容器对外暴露的端口 | docker 的 `-p` 参数 |
| imagePullPolicy | 镜像拉取策略：Always / Never / IfNotPresent（默认 IfNotPresent，本地不存在才远程拉取） | - |
| env | 定义环境变量，运行时指定，比 Dockerfile 的 ENV 更灵活 | Dockerfile 的 ENV 指令 |
| command | 容器启动时要执行的命令 | Dockerfile 的 ENTRYPOINT 指令 |
| args | command 运行时的参数 | Dockerfile 的 CMD 指令 |

> 注意：command/args 与 Docker 的含义不同，要特别注意。

-> 详见 Pod 的 YAML 描述
-> 详见 busy-pod 示例

## 如何使用 kubectl 操作 Pod

| 命令 | 作用 |
|------|------|
| `kubectl apply -f xxx.yml` | 用 YAML 文件创建 Pod |
| `kubectl delete -f xxx.yml` / `kubectl delete pod <名字>` | 删除 Pod |
| `kubectl logs <pod>` | 查看 Pod 的标准输出（Pod 只在后台运行，相当于默认 -d） |
| `kubectl get pod` | 查看 Pod 列表和运行状态 |
| `kubectl describe pod <pod>` | 查看 Pod 详细状态，调试排错时很有用（关注末尾 Events 部分） |
| `kubectl cp <本地文件> <pod>:<路径>` | 把本地文件拷贝进 Pod |
| `kubectl exec -it <pod> -- sh` | 进入 Pod 内部执行 Shell 命令（注意 `--` 分隔 kubectl 与 Shell 命令） |

调试要点：busy-pod 只执行一条 echo 就退出，而 Kubernetes 默认会重启 Pod，会进入 CrashLoopBackOff 的反复停止-启动循环错误状态。大部分应用是不会主动退出的服务（如 Nginx），运行后处于 Running 状态。

-> 详见 kubectl 操作 Pod

## 分笔记索引

- **Pod 的 YAML 描述** — 基本字段、spec.containers 字段、与 Docker 概念对照
- **busy-pod 示例** — 带 env/command/args 的 Pod 完整 YAML
- **kubectl 操作 Pod** — 创建/删除/日志/状态、cp 与 exec、CrashLoopBackOff
