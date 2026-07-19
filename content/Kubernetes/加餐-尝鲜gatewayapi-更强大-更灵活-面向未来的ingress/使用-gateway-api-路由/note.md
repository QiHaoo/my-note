---
title: 使用 Gateway API 路由
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Gateway API
  - HTTPRoute
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：尝鲜 Gateway API：更强大、更灵活、面向未来的 Ingress

## 域名路由

从最简单的路由开始，只使用域名规则，创建一个 HTTPRoute 对象：

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-host-route
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "gtw.test"
  rules:
  - backendRefs:
    - name: red-svc
      port: 80
```

HTTPRoute 对象和 Ingress 很相似，但要简洁一些，具体字段含义和用法可参考文档或使用 `kubectl explain`。

- 用 `parentRefs` 指定路由使用的 Gateway 对象
- 用 `hostnames` 指定一个或多个域名
- 用 `backendRefs` 指定后端 Service

合起来看，就是要求 Gateway 把域名 `gtw.test` 的流量都转发到 `red-svc`。

`kubectl apply` 创建路由对象后，用 curl 向 kong-gateway-proxy 发送请求验证：

```bash
curl -i $(minikube ip):31198 -H 'host: gtw.test'
```

指定了域名 `gtw.test`，匹配了路由规则，Gateway 就把请求转发给了 red-svc。

## 路径与头字段匹配

再编写两个路由规则，分别使用路径匹配和头字段匹配，转发到 green-svc 和 blue-svc。相比第一个路由多了 `matches` 字段，可在里面详细指定或组合各种匹配条件，支持精确匹配、前缀匹配、正则匹配等。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-path-route
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "gtw.ops"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /hello
    backendRefs:
    - name: green-svc
      port: 80
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-header-route
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "gtw.dev"
  rules:
  - matches:
    - headers:
      - type: Exact
        name: area
        value: north
    backendRefs:
    - name: blue-svc
      port: 80
```

对应的 curl 测试：

```bash
curl -i $(minikube ip):31198/hello -H 'host: gtw.ops'
curl -i $(minikube ip):31198 -H 'host: gtw.dev' -H 'area: north'
```

路径匹配把 `gtw.ops` 的 `/hello` 转给 green-svc，头字段匹配把带 `area: north` 头的 `gtw.dev` 请求转给 blue-svc。

## 流量拆分

Gateway API 不仅支持路由转发，还能轻松实现流量拆分，如常见的金丝雀部署和蓝绿部署，只需调整 `backendRefs` 字段即可。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-canary-route
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "canary.test"
  rules:
  - backendRefs:
    - name: blue-svc
      port: 80
  - matches:
    - headers:
      - name: traffic
        value: canary
    - path:
        type: Exact
        value: /login
    backendRefs:
    - name: green-svc
      port: 80
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-blue-green-route
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "blue-green.test"
  rules:
  - backendRefs:
    - name: blue-svc
      port: 80
      weight: 70
    - name: green-svc
      port: 80
      weight: 30
```

`ngx-canary-route` 里默认后端是 blue-svc，另一条加了匹配条件，只有访问特定地址、使用特定头字段才转到 green-svc。`ngx-blue-green-route` 里两个后端服务用 `weight` 字段指定不同权重，部署时可随意调节流量比例。

## filter 特性

Gateway API 还支持 filter 特性，可对应到 Kong Gateway 的插件机制，实现对流量的附加处理，比如速率限制、改写数据、身份验证等。不过目前标准的 filter 还不多，所以有时还是要依赖 CRD 资源定义 Plugin。

这里添加了响应头和限速：filter 中的 `ResponseHeaderModifier` 用于添加响应头（如 `A-New-Header: k8s-gtw-api`），限速仍用 KongPlugin（`konghq.com/plugins` annotation 启用）。这两个功能在讲 Kong Ingress Controller 的加餐里介绍过，现在改成 Gateway API，可对比两者区别。

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: kong-rate-limiting-plugin
plugin: rate-limiting
config:
  minute: 2
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ngx-filter-route
  annotations:
    konghq.com/plugins: |
      kong-rate-limiting-plugin
spec:
  parentRefs:
  - name: kong-gtw
  hostnames:
  - "filter.test"
  rules:
  - backendRefs:
    - name: black-svc
      port: 80
    filters:
    - type: ResponseHeaderModifier
      responseHeaderModifier:
        add:
        - name: A-New-Header
          value: k8s-gtw-api
```

对应的 curl 测试：

```bash
curl -i $(minikube ip):31198 -H 'host: filter.test'
```

发送 curl 请求，即可看到新增加的响应头 `A-New-Header` 和限速信息。
