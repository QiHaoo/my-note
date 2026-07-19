---
title: Nginx 配置与 Deployment 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, service, nginx, configmap]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Service：微服务架构的应对之道

为观察 Service 的负载均衡效果，先创建一个 ConfigMap 定义 Nginx 配置片段（输出服务器地址、主机名、请求 URI 等），再在 Deployment 里用存储卷加载进 Nginx 容器。

ConfigMap：

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
'srv : $server_addr:$server_port\nhost: $hostname\nuri : $request_method $request_uri\ndate: $time_iso8601\n';
      }
    }
```

Deployment（在 `template.volumes` 定义存储卷，用 `volumeMounts` 加载配置文件）：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep

spec:
  replicas: 2
  selector:
    matchLabels:
      app: ngx-dep

  template:
    metadata:
      labels:
        app: ngx-dep
    spec:
      volumes:
      - name: ngx-conf-vol
        configMap:
          name: ngx-conf

      containers:
      - image: nginx:alpine
        name: nginx
        ports:
        - containerPort: 80
        volumeMounts:
        - mountPath: /etc/nginx/conf.d
          name: ngx-conf-vol
```
