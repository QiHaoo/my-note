---
title: Kong Ingress Controller 的扩展
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Kong
  - Ingress
  - Plugin
  - Kubernetes
reviewable: true
module: extras
---

← 参见 主笔记：谈谈 Kong Ingress Controller

只用 Kubernetes 标准的 Ingress 资源管理流量，无法发挥 Kong Ingress Controller 的真正实力。它通过 annotation 和 CRD 提供更多扩展增强功能，特别是插件。

## annotation 扩展机制

annotation 是 Kubernetes 为资源对象提供的方便扩展功能的手段（第 27 讲介绍过）。使用 annotation 可以在不修改 Ingress 自身定义的前提下，让 Kong Ingress Controller 更好地利用内部的 Kong 管理流量。

目前 Kong Ingress Controller 支持在 Ingress 和 Service 这两个对象上添加 annotation。

## host-aliases：添加额外域名

`konghq.com/host-aliases` 可以为 Ingress 规则添加额外的域名。

Ingress 的域名里可以使用通配符 `*`（如 `*.abc.com`），但问题在于 `*` 只能是前缀，不能是后缀，即无法写出 `abc.*` 这样的域名，管理多个域名时有点麻烦。

有了 `konghq.com/host-aliases` 就可以“绕过”这个限制，让 Ingress 轻松匹配有不同后缀的域名。例如在 Ingress 的 `metadata` 里添加 annotation，让它除了 `kong.test`，还支持 `kong.dev`、`kong.ops` 等域名：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kong-ing
  annotations:
    konghq.com/host-aliases: "kong.dev, kong.ops"  # 注意这里
spec:
  # ...
```

`kubectl apply` 更新 Ingress 后，用 curl 测试即可发现 Ingress 已支持这几个新域名。

## plugins：启用插件

`konghq.com/plugins` 可以启用 Kong Ingress Controller 内置的各种插件（Plugins）。

### 插件机制

插件是 Kong Ingress Controller 的特色功能，可理解成“预制构件”，能够附加在流量转发过程中实现各种数据处理。机制是开放的：

- 可使用官方插件
- 可使用第三方插件
- 可使用 Lua、Go 等语言编写符合自己特定需求的插件

Kong 公司维护了一个经过认证的插件中心（https://docs.konghq.com/hub/），涉及认证、安全、流控、分析、日志等多个领域大约 10 多个插件。

### 定义插件：KongPlugin CRD

定义插件需使用 CRD 资源 `KongPlugin`，可用 `kubectl api-resources`、`kubectl explain` 查看其 apiVersion、kind 等信息。

KongPlugin 是自定义资源，和标准 Kubernetes 对象不一样，不使用 `spec` 字段，而是用 `plugin` 指定插件名，用 `config` 指定插件的配置参数。

两个常用插件示例——Response Transformer（修改响应数据，添加/替换/删除响应头或响应体）和 Rate Limiting（限速，以时分秒等单位任意限制客户端访问次数）：

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: kong-add-resp-header-plugin
plugin: response-transformer
config:
  add:
    headers:
    - Resp-New-Header:kong-kic
---
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: kong-rate-limiting-plugin
plugin: rate-limiting
config:
  minute: 2
```

这里让 Response Transformer 添加一个新的响应头字段，让 Rate Limiting 限制客户端每分钟只能发两个请求。

### 在 Ingress 上启用插件

定义好插件后，在 Ingress 对象里用 annotations 启用：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kong-ing
  annotations:
    konghq.com/plugins: |
      kong-add-resp-header-plugin, kong-rate-limiting-plugin
```

### 验证

```bash
kubectl apply -f crd.yml
curl $(minikube ip):32521 -H 'host: kong.test' -i
```

响应头里多出几个字段：`RateLimit-*` 是限速信息，`Resp-New-Header` 是新加的响应头字段。把 curl 连续执行几次，可看到限速插件生效：Kong Ingress Controller 返回 429 错误，告知访问受限，并用 `Retry-After` 等字段告知多少秒之后才能重新发请求。
