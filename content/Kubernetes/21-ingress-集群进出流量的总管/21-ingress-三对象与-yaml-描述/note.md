---
title: Ingress 三对象与 YAML 描述
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, ingress, ingress-controller, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Ingress：集群进出流量的总管

## 为什么要有 Ingress

Service 是四层负载均衡，能力有限；多数应用跑在七层 HTTP/HTTPS 上，有主机名、URI、请求头、证书等路由条件，TCP/IP 网络栈看不见。Service 暴露到集群外部只能用 NodePort / LoadBalancer，缺乏灵活性。

Ingress 在七层做负载均衡，并作为流量总入口统管集群进出口数据（"扇入""扇出"，即"南北向"），让外部用户安全、顺畅、便捷地访问内部服务。Ingress 意为集群内外边界上的入口。

## 为什么要有 Ingress Controller

Ingress 是七层上另一种形式的 Service，代理后端 Pod、有路由规则（HTTP/HTTPS 协议）。但 Ingress 只是 HTTP 路由规则的集合，相当于静态描述文件，自身无流量管理能力。

| 对象 | 关系 |
|------|------|
| Service | 自身无服务能力，规则由节点里的 kube-proxy 配置应用；没有 kube-proxy，Service 定义再完善也没用 |
| Ingress | 自身只是规则集合，需 Ingress Controller 读取、应用规则，处理调度流量（作用相当于 Service 的 kube-proxy） |

Kubernetes 把 Ingress Controller 的实现交给社区（做的事太多、与上层业务联系太密切），任何遵守 Ingress 规则的人都能开发。最著名的是 Nginx（稳定性最好、性能最高），变种有社区的 Kubernetes Ingress Controller、Nginx 公司的 Nginx Ingress Controller（下载量最多，本讲示例）、基于 OpenResty 的 Kong Ingress Controller 等。

## 为什么要有 Ingress Class

一个集群一个 Ingress Controller 配多个 Ingress 规则的用法在实践中暴露问题：

- 项目组需引入不同的 Ingress Controller，但 Kubernetes 不允许
- Ingress 规则太多，都交给一个 Controller 处理会不堪重负
- 多个 Ingress 对象没有好的逻辑分组方式，管理维护成本高
- 集群有不同租户，对 Ingress 需求差异大甚至冲突，无法部署在同一 Controller

Ingress Class 插在 Ingress 和 Ingress Controller 中间，作为协调人，解除两者的强绑定。用户可用 Ingress Class 定义不同业务逻辑分组（如 Class A 处理博客流量、Class B 处理短视频流量、Class C 处理购物流量），彼此独立不冲突。

## api-resources 基本信息

```bash
kubectl api-resources
```

```text
NAME            SHORTNAMES   APIVERSION                      ...
ingresses       ing          networking.k8s.io/v1   true
ingressclasses               networking.k8s.io/v1   false
```

Ingress 和 Ingress Class 的 `apiVersion` 都是 `networking.k8s.io/v1`，Ingress 简写 `ing`。Ingress Controller 找不到，因为它是实际干活的应用程序，由 Deployment / DaemonSet 管理。

## Ingress 的 YAML

Ingress 用 `kubectl create ing` 创建样板，需两个附加参数：

- `--class`：指定从属的 Ingress Class
- `--rule`：指定路由规则，基本形式 `URI=Service`，即访问 HTTP 路径就转发到对应 Service 对象，再由 Service 转发给后端 Pod

```bash
export out="--dry-run=client -o yaml"
kubectl create ing ngx-ing --rule="ngx.test/=ngx-svc:80" --class=ngx-ink $out
```

生成的 Ingress YAML：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ngx-ing

spec:
  ingressClassName: ngx-ink
  rules:
  - host: ngx.test
    http:
      paths:
      - path: /
        pathType: Exact
        backend:
          service:
            name: ngx-svc
            port:
              number: 80
```

两个关键字段：

- `ingressClassName`：对应命令行 `--class` 参数
- `rules`：格式较复杂，嵌套层次深。把路由规则拆散为 `host` 和 `http.paths`，path 里指定匹配方式（`Exact` 精确匹配 / `Prefix` 前缀匹配），再用 `backend` 指定转发目标 Service 对象

Ingress YAML 的描述不如 `kubectl create` 命令行的 `--rule` 参数直观，字段多易错，建议让 kubectl 自动生成规则再略作修改。

## Ingress Class 的 YAML

Ingress Class 本身没有实际功能，只起联系 Ingress 和 Ingress Controller 的作用，定义很简单，`spec` 只有一个必需字段 `controller`（表示使用哪个 Ingress Controller，具体名字看实现文档）。用 Nginx 开发的 Ingress Controller 用名字 `nginx.org/ingress-controller`：

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: ngx-ink

spec:
  controller: nginx.org/ingress-controller
```