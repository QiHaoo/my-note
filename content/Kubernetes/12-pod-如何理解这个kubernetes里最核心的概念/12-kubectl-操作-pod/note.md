---
title: kubectl 操作 Pod
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, kubectl]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Pod：如何理解这个Kubernetes里最核心的概念

有了描述 Pod 的 YAML 文件，就可以用 kubectl 命令来操作 Pod。

## 创建与删除

```bash
kubectl apply -f busy-pod.yml
kubectl delete -f busy-pod.yml
```

因为 YAML 里定义了 `name` 字段，所以删除时也可以直接指定名字：

```bash
kubectl delete pod busy-pod
```

## 查看日志与状态

和 Docker 不一样，Kubernetes 的 Pod 不会在前台运行，只能在后台（相当于默认使用 `-d`），所以输出信息不能直接看到。

```bash
kubectl logs busy-pod
```

查看 Pod 列表和运行状态：

```bash
kubectl get pod
```

查看详细状态（调试排错时很有用）：

```bash
kubectl describe pod busy-pod
```

通常需要关注末尾的 Events 部分，显示 Pod 运行过程中的关键节点事件。

## CrashLoopBackOff 状态

busy-pod 只执行了一条 echo 命令就退出了，而 Kubernetes 默认会重启 Pod，所以会进入一个反复停止-启动的循环错误状态 CrashLoopBackOff。

而 Kubernetes 里运行的应用大部分都是不会主动退出的服务（如 Nginx），运行后处于 Running 状态才是大多数 Pod 的工作方式。

## cp 与 exec

kubectl 也提供与 Docker 类似的 cp 和 exec 命令：

```bash
# 把本地文件拷贝进 Pod
echo 'aaa' > a.txt
kubectl cp a.txt ngx-pod:/tmp

# 进入 Pod 内部执行 Shell 命令
kubectl exec -it ngx-pod -- sh
```

注意 `kubectl exec` 的命令格式与 Docker 有一点小差异：需要在 Pod 后面加上 `--`，把 kubectl 的命令与 Shell 命令分隔开。
