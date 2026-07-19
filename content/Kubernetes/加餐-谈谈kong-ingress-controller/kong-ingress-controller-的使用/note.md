---
title: Kong Ingress Controller 的使用
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Kong
  - Ingress
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：谈谈 Kong Ingress Controller

和第 21 讲一样，不使用默认的 Ingress Controller，而是利用 Ingress Class 自己创建一个新实例，这样能更好理解掌握 Kong Ingress Controller 的用法。

## 定义后端应用

用 Nginx 模拟后端应用，做法和第 20 讲差不多：用 ConfigMap 定义配置文件再加载进 Nginx Pod，然后部署 Deployment 和 Service。创建两个 Nginx Pod，Service 对象名字是 `ngx-svc`。

## 定义 IngressClass

IngressClass 名字是 `kong-ink`，`spec.controller` 字段的值是 Kong Ingress Controller 的名字 `ingress-controllers.konghq.com/kong`：

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: kong-ink
spec:
  controller: ingress-controllers.konghq.com/kong
```

## 定义 Ingress 对象

用 `kubectl create` 生成 YAML 样板，`--rule` 指定路由规则，`--class` 指定 Ingress Class：

```bash
kubectl create ing kong-ing --rule="kong.test/=ngx-svc:80" --class=kong-ink
```

生成的 Ingress 对象：域名 `kong.test`，流量转发到后端 `ngx-svc` 服务。

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kong-ing
spec:
  ingressClassName: kong-ink
  rules:
  - host: kong.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ngx-svc
            port:
              number: 80
```

## 分离并修改 Ingress Controller 定义

从 `all-in-one-dbless.yaml` 中分离出 Ingress Controller 的定义：搜索 `Deployment`，把它以及相关的 Service 代码复制一份，另存成 `kic.yml`。

刚复制的代码和默认的 Kong Ingress Controller 完全相同，必须参考帮助文档做修改，要点：

1. Deployment、Service 里 metadata 的 `name` 都要重命名，如 `ingress-kong-dep`、`ingress-kong-svc`
2. `spec.selector` 和 `template.metadata.labels` 也要改成自己的名字，一般和 Deployment 名字一样，即 `ingress-kong-dep`
3. 第一个容器是流量代理 Proxy，里面的镜像可改成任意支持的版本，如 Kong:2.7、Kong:2.8 或 Kong:3.1
4. 第二个容器是规则管理 Controller，要用环境变量 `CONTROLLER_INGRESS_CLASS` 指定新的 Ingress Class 名字 `kong-ink`，同时用 `CONTROLLER_PUBLISH_SERVICE` 指定 Service 名字 `kong/ingress-kong-svc`
5. Service 对象可以把类型改成 NodePort，方便后续测试

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ingress-kong-dep              # 重命名
  namespace: kong
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ingress-kong-dep           # 重命名
  template:
    metadata:
      labels:
        app: ingress-kong-dep         # 重命名
    spec:
      containers:
      - env:                          # 第一个容器，Proxy
        # ...
        image: kong:3.1               # 改镜像
      - env:                          # 第二个容器，Controller
        - name: CONTROLLER_INGRESS_CLASS
          value: kong-ink             # 改 Ingress Class
        - name: CONTROLLER_PUBLISH_SERVICE
          value: kong/ingress-kong-svc  # 改 Service
        # ...
---
apiVersion: v1
kind: Service
metadata:
  name: ingress-kong-svc             # 重命名
  namespace: kong
spec:
  # ...
  selector:
    app: ingress-kong-dep            # 重命名
  type: NodePort                     # 改类型
```

## 测试验证

准备好后依次 apply：

```bash
kubectl apply -f ngx-deploy.yml
kubectl apply -f ingress.yml
kubectl apply -f kic.yml
```

新 Service 对象的 NodePort 端口是 32521。用 curl 发送 HTTP 请求，注意应该用 `-resolve` 或 `-H` 参数指定 Ingress 里定义的域名 `kong.test`，否则 Kong Ingress Controller 找不到路由：

```bash
curl $(minikube ip):32521 -H 'host: kong.test' -v
```

Kong Ingress Controller 正确应用了 Ingress 路由规则，返回后端 Nginx 应用的响应数据，从响应头 `Via` 可见现在用的是 Kong 3.1。
