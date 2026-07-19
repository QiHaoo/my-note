---
title: 滚动更新的实现过程
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, rollout]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：滚动更新：如何做到平滑的应用升级降级

为仔细研究 Kubernetes 的应用更新过程，略微改造 Nginx Deployment 对象，观察 Kubernetes 如何实现版本更新。

## 准备 V1 版本

首先修改 ConfigMap，让它输出 Nginx 的版本号，方便用 curl 查看版本：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ngx-conf

data:
  default.conf: |
    server {
      listen 80;
      location / {
        default_type text/plain;
        return 200
          'ver : $nginx_version\nsrv : $server_addr:$server_p';
      }
    }
```

然后修改 Pod 镜像，明确指定版本号是 1.21-alpine，实例数设置为 4 个，命名为 `ngx-v1.yml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep

spec:
  replicas: 4
  ... ...
  containers:
    - image: nginx:1.21-alpine
  ... ...
```

部署应用，并为它创建 Service，再用 `kubectl port-forward` 转发请求查看状态：

```bash
kubectl apply -f ngx-v1.yml
kubectl port-forward svc/ngx-svc 8080:80 &
curl 127.1:8080
```

从 curl 的输出可以看到现在应用的版本是 1.21.6。

## 更新到 V2 版本

编写新版本 `ngx-v2.yml`，把镜像升级到 nginx:1.22-alpine，其他都不变。因为 Kubernetes 动作太快，为观察更新过程，添加一个字段 `minReadySeconds`，让 Kubernetes 在更新过程中等待一点时间，确认 Pod 没问题才继续其余 Pod 的创建。

> 注意：`minReadySeconds` 不属于 Pod 模板，所以它不会影响 Pod 版本。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep

spec:
  minReadySeconds: 15  # 确认Pod就绪的等待时间
  replicas: 4
  ... ...
  containers:
    - image: nginx:1.22-alpine
  ... ...
```

执行 `kubectl apply` 更新应用（改动了镜像名，Pod 模板变了，触发"版本更新"），再用新命令 `kubectl rollout status` 查看更新状态：

```bash
kubectl apply -f ngx-v2.yml
kubectl rollout status deployment ngx-dep
```

更新完成后，`kubectl get pod` 会看到 Pod 已全部替换成新版本（如 d575...），用 curl 访问 Nginx 输出也变成了新版本号。

## 滚动更新的过程

仔细查看 `kubectl rollout status` 的输出，可以发现 Kubernetes 不是把旧 Pod 全部销毁再一次性创建出新 Pod，而是在逐个创建新 Pod，同时也在销毁旧 Pod，保证系统里始终有足够数量的 Pod 在运行，不会有"空窗期"中断服务。

新 Pod 数量增加的过程有点像"滚雪球"，从零开始越滚越大，这就是所谓的"滚动更新"（rolling update）。

用 `kubectl describe` 看得更清楚：

```bash
kubectl describe deploy ngx-dep
```

以 4 个实例为例，更新过程中 V1、V2 Pod 数量的变化：

| 阶段 | V1 Pod 数量 | V2 Pod 数量 |
|------|-------------|-------------|
| 初始 | 4 | 0 |
| 开始更新 | 3 | 1 |
| 继续 | 1 | 2 |
| 结束 | 0 | 4 |

> 原文文字描述此处可能有误，按数量守恒应为"V1 Pod 的数量变成了 2"。

其实"滚动更新"就是由 Deployment 控制的两个同步进行的"应用伸缩"操作：老版本缩容到 0，同时新版本扩容到指定值，是一个"此消彼长"的过程。
