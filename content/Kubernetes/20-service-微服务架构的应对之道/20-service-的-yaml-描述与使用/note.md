---
title: Service 的 YAML 描述与使用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, service, loadbalancing, dns]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Service：微服务架构的应对之道

## 用 kubectl expose 生成 Service 样板

`kubectl create` 不能创建 Service 样板，要用 `kubectl expose`。它支持从 Pod、Deployment、DaemonSet 创建，需用 `--port` 和 `--target-port` 分别指定映射端口和容器端口，Service 自己的 IP 和后端 Pod 的 IP 自动生成（类似 Docker 的 `-p`）。

为第 18 讲的 `ngx-dep` 生成 Service：

```bash
export out="--dry-run=client -o yaml"
kubectl expose deploy ngx-dep --port=80 --target-port=80 $out
```

## Service 的 YAML

生成的 Service YAML 大致如下：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ngx-svc

spec:
  selector:
    app: ngx-dep
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
```

`spec` 只有两个关键字段：

- `selector`：与 Deployment / DaemonSet 一样，过滤要代理的 Pod。指定代理 Deployment 时，Kubernetes 自动填上 Deployment 的标签，选择其部署的所有 Pod
- `ports`：`port`（外部端口）、`targetPort`（内部端口）、`protocol`（协议）。可把 `ports` 改成 `8080` 等，外部看到的是 Service 端口而不知 Pod 真正服务端口

Service 与它引用的 Pod 通过 `selector`、`targetPort` 关联。标签机制虽简单却强大有效。

-> 详见 Nginx 配置与 Deployment 示例

## 创建并验证 Service

```bash
kubectl apply -f svc.yml
```

```bash
kubectl get svc
```

Kubernetes 为 Service 自动分配一个独立于 Pod 地址段的 IP（如 `10.96.240.15`，独立于第 17 讲的 `10.10.x.x`）。这个 IP 是"虚地址"，不存在实体，只能转发流量。

### 查看代理的后端 Pod

```bash
kubectl describe svc ngx-svc
```

显示 Service 管理的 endpoint（如 `10.10.0.232:80` 和 `10.10.1.86:80`）。用 `kubectl get pod -o wide` 对比 Pod 实际地址，可验证 Service 用一个静态 IP 代理了两个 Pod 的动态 IP。

### 测试负载均衡

Service、Pod 的 IP 都是集群内部网段，需 `kubectl exec` 进入 Pod 内部（或登录集群节点），再用 curl 访问 Service：

```bash
kubectl exec -it ngx-dep-6796688696-r2j6t -- sh
```

在 Pod 里 curl 访问 Service IP，输出会显示具体哪个 Pod 响应了请求，表明 Service 完成了负载均衡。

### 验证服务发现

删除一个 Pod：

```bash
kubectl delete pod ngx-dep-6796688696-r2j6t
```

Pod 被 Deployment 管理，删除后自动重建；Service 通过 controller-manager 实时监控 Pod 变化，立即更新代理的 IP（如 `10.10.1.86` 消失，换成新的 `10.10.1.87`）。

### ping 不通 Service IP

用 ping 测试 Service IP 会失败，因为 Service 的 IP 是"虚"的，只用于转发流量，ping 无法得到回应数据包。
