---
title: Dashboard 部署与 Ingress 访问
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, dashboard, ingress, tls]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（3）

在多节点集群里从零安装 Dashboard，并为其配置 Ingress 反向代理走 HTTPS 访问，综合实践 Ingress、namespace 用法。对象分布在 `kubernetes-dashboard` 和 `nginx-ingress` 两个名字空间。

## 部署 Dashboard

Dashboard 安装只需一个 YAML 文件，可直接下载：

```bash
wget https://raw.githubusercontent.com/kubernetes/dashboard/v2.
```

该 YAML 包含很多对象，要点：

- 所有对象都属于 `kubernetes-dashboard` 名字空间。
- Dashboard 使用 Deployment 部署了一个实例，端口号是 8443。
- 容器启用了 Liveness 探针，使用 HTTPS 方式检查存活状态。
- Service 对象使用 443 端口，映射了 Dashboard 的 8443 端口。

部署命令：

```bash
kubectl apply -f dashboard.yaml
```

## 生成自签名证书

因 Dashboard 默认使用加密 HTTPS、拒绝明文 HTTP 访问，要先生成证书让 Ingress 也走 HTTPS。用 Linux 命令行工具 `openssl` 生成自签名证书（也可找 CA 网站申请免费证书）：

```bash
openssl req -x509 -days 365 -out k8s.test.crt -keyout k8s.test.key \
-newkey rsa:2048 -nodes -sha256 \
-subj '/CN=k8s.test' -extensions EXT -config <( \
  printf "[dn]\nCN=k8s.test\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:k8s.test\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

命令说明：生成 X509 格式证书，有效期 365 天，私钥 RSA 2048 位，摘要算法 SHA256，签发网站 `k8s.test`。运行后生成两个文件——证书 `k8s.test.crt` 和私钥 `k8s.test.key`。

## 创建 TLS Secret

证书和私钥属机密信息，用 Secret 存储。可用 `kubectl create secret` 自动创建 YAML，类型不是 `generic` 而是 `tls`，同时用 `-n` 指定名字空间，用 `--cert`、`--key` 指定文件：

```bash
export out="--dry-run=client -o yaml"
kubectl create secret tls dash-tls -n kubernetes-dashboard --cert k8s.test.crt \
  --key k8s.test.key $out
```

生成的 YAML 大致如下：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dash-tls
  namespace: kubernetes-dashboard
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTiBDRVJU...
  tls.key: LS0tLS1CRUdJTiBQUklW...
```

创建后可用 `kubectl describe` 检查状态。

## IngressClass 与 Ingress

为保持名字空间整齐，IngressClass 和 Ingress 也放在 `kubernetes-dashboard` 名字空间。

IngressClass 对象很简单，名为 `dash-ink`，指定 Controller 为之前用的 Nginx 官方 Ingress Controller：

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: dash-ink
  namespace: kubernetes-dashboard
spec:
  controller: nginx.org/ingress-controller
```

Ingress 对象可用 `kubectl create ing` 自动生成，但这次是 HTTPS 协议，要在 Ingress 里多加两处：`annotations` 字段指定后端目标是 HTTPS 服务，`tls` 字段指定域名和证书（即刚才创建的 Secret）。完整 YAML 见示例文件。

-> 详见 Dashboard Ingress 访问 示例

## Ingress Controller 与 Service

最后是 Ingress Controller，拿现成模板修改，记得把 `args` 里的 IngressClass 改成自己的 `dash-ink`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dash-kic-dep
  namespace: nginx-ingress
spec:
  ...
  args:
  - -ingress-class=dash-ink
```

要在外面能访问 Ingress Controller，还要为它再定义一个 Service，类型是 `NodePort`，端口指定 30443：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dash-kic-svc
  namespace: nginx-ingress
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: 443
    nodePort: 30443
  selector:
    app: dash-kic-dep
  type: NodePort
```

把 Secret、IngressClass、Ingress、Ingress Controller、Service 都创建好后，确认运行状态。这些对象较多、处于不同名字空间，关联较复杂。

## 创建用户与访问

部署完成后，需创建一个用户才能登录 Dashboard。Dashboard 网站有创建示例用户的 YAML，直接拿来用，创建一个 ServiceAccount（admin-user），用 RBAC 机制绑定 ClusterRole `cluster-admin`。完整 YAML 见示例文件。

-> 详见 Dashboard Ingress 访问 示例

该账号不能用"用户名+密码"登录，需要用到 Token，用 `kubectl get secret`、`kubectl describe secret` 查到：

```bash
kubectl get secret -n kubernetes-dashboard
kubectl describe secrets -n kubernetes-dashboard admin-user-token
```

Token 是很长的字符串，拷贝存好，为测试域名 `k8s.test` 加域名解析（修改 /etc/hosts），浏览器输入 `https://k8s.test:30443` 即可访问 Dashboard。因之前安装了 Metrics Server，Dashboard 也能以图形方式显示 CPU 和内存状态，有点 Prometheus + Grafana 的意思。

<div class="callout">
  <strong>补充</strong>：配置 Ingress 时若不加 <code>nginx.org/ssl-services</code> annotation，访问会报 "Client sent an HTTP request to an HTTPS server"。IngressClass 默认作用域是集群，可通过 <code>spec.parameters.scope</code> 修改；其 name 必须全局唯一。访问返回 404 多是 Ingress 没配置好、路由不对；503 gateway time-out 多是 nginx 到后端出错、可能网络问题访问不了 Pod，可先不用 Ingress Controller、先用 NodePort 排查中间环节。k8s.test 是域名，需在使用浏览器的电脑上配置域名解析才能访问。
</div>
