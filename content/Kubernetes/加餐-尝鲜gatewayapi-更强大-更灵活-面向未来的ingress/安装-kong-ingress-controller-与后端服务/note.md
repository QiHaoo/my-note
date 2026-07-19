---
title: 安装 Kong Ingress Controller 与后端服务
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Kong
  - Helm
  - Ingress
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：尝鲜 Gateway API：更强大、更灵活、面向未来的 Ingress

## 安装 Kong Ingress Controller 3.0.0

Kong Gateway 的实现仍然是以 Ingress Controller 的形式，即 Kong Ingress Controller，在之前加餐中做过详细介绍。不过那时使用的是 2.7.0，现在已升级到 3.0.0，里里外外都发生了很多变化，完全是一个新的应用。

Kong Ingress Controller 2.x 可以使用 YAML 文件直接安装，但 3.0.0 已经废弃了这种方式，只能够使用 Helm 或 Operator 来安装，本文选用 Helm。

### Helm 简介

Helm 类似 Linux 里的 yum、apt，对复杂的云原生应用非常有用，可以把众多的 YAML 文件组合成安装包的形式，再轻松地把应用部署进 Kubernetes 集群。

Helm 提供了一个官方脚本，直接执行即可安装：

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 添加仓库并安装

和 yum、apt 用法类似，添加远端仓库（Helm charts）：

```bash
helm repo add kong https://charts.konghq.com
helm repo update
```

查看远端仓库里可用的安装包：

```bash
helm repo list
helm search repo kong
```

这里显示的 `kong/ingress` 就是 Kong Ingress Controller。使用 `helm install` 指定名字和安装包，再加上一些定制参数安装：

```bash
helm install \
  kong kong/ingress \
  -n kong \
  --create-namespace \
  --set gateway.env.router_flavor=expressions
```

多加了一个 `--set` 选项，启用 Kong Ingress Controller 的表达式路由，能够更好地支持 Gateway API。

### 安装结果

Kong Ingress Controller 默认安装在 kong 名字空间，用 `kubectl get` 可看到它的 Pod、Service 等对象。

注意 `kong-gateway-proxy` 这个 Service，它的类型是 LoadBalancer，也就是对外的服务接口，在实验环境里使用的端口是 31198，后续要用这个端口测试。

```bash
curl -i $(minikube ip):31198
```

curl 命令的输出是 404，这是因为还没有配置 HTTPRoute 资源，没有路由规则，所以 Gateway 无法处理流量。

这时再检查 GatewayClass 和 Gateway 对象，会看到 ACCEPTED 和 PROGRAMMED 字段都已经变成了 True，表示 Gateway 对象已经正确关联了 Kong Ingress Controller。

## 准备后端服务

为了验证 Gateway API 的流量管理效果，还要创建测试用的后端服务，具体做法可参考第 20 讲和第 21 讲，部署 NGINX 来输出简单的字符串。

下面是一个样板文件，可使用查找替换的方式生成多个不同名字的服务。

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
        return 200 'ngx\nsrv : $server_addr:$server_port\nhost: $hostname\n';
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ngx-dep
  labels:
    app: ngx-dep
spec:
  replicas: 1
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
---
apiVersion: v1
kind: Service
metadata:
  name: ngx-svc
spec:
  selector:
    app: ngx-dep
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
```

### 用 sed 生成多个服务

使用 sed 命令可快速得到 `red-svc`、`green-svc`、`blue-svc`、`black-svc` 等 4 个 Service：

```bash
sed 's/ngx/red/g'   backend.yml | kubectl apply -f -
sed 's/ngx/green/g' backend.yml | kubectl apply -f -
sed 's/ngx/blue/g'  backend.yml | kubectl apply -f -
sed 's/ngx/black/g' backend.yml | kubectl apply -f -
```
