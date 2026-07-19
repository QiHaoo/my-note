---
title: 带探针的 Pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, pod, probe, 示例]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：应用保障：如何让Pod运行得更健康

定义一个 Nginx Pod，挂载 ConfigMap 配置，并配置三种探针：startupProbe 用 Shell 方式（`cat` 检查进程号文件）、livenessProbe 用 TCP Socket 方式（连 80 端口）、readinessProbe 用 HTTP GET 方式（访问 `/ready` 路径）。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx-pod-probe

spec:
  volumes:
    - name: ngx-conf-vol
      configMap:
        name: ngx-conf

  containers:
    - image: nginx:alpine
      name: ngx
      ports:
        - containerPort: 80
      volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: ngx-conf-vol

      startupProbe:
        periodSeconds: 1
        exec:
          command: ["cat", "/var/run/nginx.pid"]

      livenessProbe:
        periodSeconds: 10
        tcpSocket:
          port: 80

      readinessProbe:
        periodSeconds: 5
        httpGet:
          path: /ready
          port: 80
```

-> 详见 探针的使用
