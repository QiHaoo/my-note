---
title: 探针的使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, probe]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：应用保障：如何让Pod运行得更健康

`startupProbe`、`livenessProbe`、`readinessProbe` 三种探针配置方式完全一致。

## 关键配置字段

| 字段 | 含义 | 默认值 |
|------|------|--------|
| `periodSeconds` | 执行探测动作的时间间隔 | 10 秒探测一次 |
| `timeoutSeconds` | 探测动作的超时时间，超时就认为失败 | 1 秒 |
| `successThreshold` | 连续几次探测成功才认为是正常 | 对 startupProbe 和 livenessProbe 只能是 1 |
| `failureThreshold` | 连续探测失败几次才认为真正发生异常 | 3 次 |

## 三种探测方式

| 方式 | 字段 | 说明 |
|------|------|------|
| Shell | `exec` | 执行 Linux 命令，如 ps、cat，和 container 的 command 字段很类似 |
| TCP Socket | `tcpSocket` | 用 TCP 协议尝试连接容器指定端口 |
| HTTP GET | `httpGet` | 连接端口并发送 HTTP GET 请求 |

要使用探针，必须在开发应用时预留"检查口"，Kubernetes 才能调用探针获取信息。以 Nginx 为例，用 ConfigMap 启用 80 端口，并以 `location` 定义 HTTP 路径 `/ready` 作为对外暴露的"检查口"，返回 200 状态码和简单字符串表示工作正常：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ngx-conf

data:
  default.conf: |
    server {
      listen 80;
      location = /ready {
        return 200 'I am ready';
      }
    }
```

三种探针的具体定义见示例文件：

-> 详见 带探针的 Pod 示例

其中：

| 探针 | 探测方式 | 检查内容 | 频率 |
|------|----------|----------|------|
| startupProbe | Shell（exec） | `cat` 检查 Nginx 进程号文件 `/var/run/nginx.pid`，存在即启动成功 | 每秒探测一次 |
| livenessProbe | TCP Socket | 尝试连接 Nginx 的 80 端口 | 每 10 秒探测一次 |
| readinessProbe | HTTP GET | 访问容器 `/ready` 路径 | 每 5 秒发一次请求 |

`kubectl apply` 创建该 Pod 后状态正常，可用 `kubectl logs` 看 Nginx 访问日志，里面记录 HTTP GET 探针执行情况——Kubernetes 约每 5 秒向 `/ready` 发一次请求，不断检查容器是否就绪。

## 探针失败的验证

修改探针，把命令改成检查错误文件、连接错误端口：

```yaml
startupProbe:
  exec:
    command: ["cat", "nginx.pid"]  # 错误的文件

livenessProbe:
  tcpSocket:
    port: 8080  # 错误的端口号
```

重新创建 Pod 观察状态：

- StartupProbe 失败时，Kubernetes 不停重启容器，RESTARTS 次数持续增加，而 livenessProbe、readinessProbe 不执行，Pod 虽是 Running 也永远不会 READY。
- 因 `failureThreshold` 默认 3 次，livenessProbe TCP Socket 会连续探测三次、每次间隔 10 秒，30 秒后才全部失败并重启容器。

<div class="callout">
  <strong>补充</strong>：Shell 是从容器内部探测，TCP Socket 和 HTTP GET 是在容器外部探测；前者无需知道端口，后两者必须显式指定端口。三种探针配合三种探测方式，可分别检测 OS 层面、网络层面、应用层面的问题。postStart、preStop 是 Kubernetes 提供的回调接口，可做 CI/CD 钩子或简单通知。
</div>
