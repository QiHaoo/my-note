---
title: WordPress 网站部署步骤
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, deployment, service, ingress, wordpress]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（2）

按三步在 Kubernetes 集群里搭建 WordPress 网站：部署 MariaDB、部署 WordPress、部署 Nginx Ingress Controller。相关对象都是数据库/应用相关的，可在同一 YAML 文件里书写，对象之间用 `---` 分开，用 `kubectl apply` 一次性创建。

## 1. 部署 MariaDB

先用 ConfigMap 定义数据库环境变量（DATABASE、USER、PASSWORD、ROOT_PASSWORD）：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: maria-cm

data:
  DATABASE: 'db'
  USER: 'wp'
  PASSWORD: '123'
  ROOT_PASSWORD: '123'
```

然后把 MariaDB 由 Pod 改成 Deployment，replicas 设为 1，template 里的 Pod 部分不变，仍用 `envFrom` 把配置以环境变量注入 Pod（相当于给 Pod 套了 Deployment 的"外壳"）。

-> 详见 MariaDB Deployment 示例

再为 MariaDB 定义 Service 对象，映射端口 3306，让其他应用不关心 IP 地址，直接用 Service 名字访问数据库：

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: maria-dep
  name: maria-svc

spec:
  ports:
  - port: 3306
    protocol: TCP
    targetPort: 3306
  selector:
    app: maria-dep
```

部署并查看：

```bash
kubectl apply -f wp-maria.yml
```

## 2. 部署 WordPress

因为已创建 MariaDB 的 Service，写 ConfigMap 时 HOST 不应是 IP 地址，而应是 DNS 域名（即 Service 名 `maria-svc`），这点要特别注意：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: wp-cm

data:
  HOST: 'maria-svc'
  USER: 'wp'
  PASSWORD: '123'
  NAME: 'db'
```

WordPress 的 Deployment 写法和 MariaDB 一样，给 Pod 套 Deployment"外壳"，replicas 设为 2，用 `envFrom` 配置环境变量。

-> 详见 WordPress Deployment 示例

再为 WordPress 创建 Service 对象，使用 NodePort 类型，手工指定端口 30088（必须在 30000-32767 之间）：

```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: wp-dep
  name: wp-svc

spec:
  ports:
  - name: http80
    port: 80
    protocol: TCP
    targetPort: 80
    nodePort: 30088
  selector:
    app: wp-dep
  type: NodePort
```

部署：

```bash
kubectl apply -f wp-dep.yml
```

因为 Service 是 NodePort 类型，可在集群每个节点上访问 WordPress。例如某节点 IP 是 192.168.10.210，浏览器输入 `http://192.168.10.210:30088`，30088 即 Service 里指定的节点端口，即可看到 WordPress 安装界面。

## 3. 部署 Nginx Ingress Controller

MariaDB、WordPress 都部署成功后，第三步部署 Nginx Ingress Controller。

先定义 IngressClass，名字叫 `wp-ink`：

```yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: wp-ink

spec:
  controller: nginx.org/ingress-controller
```

然后用 `kubectl create` 生成 Ingress 样板文件，指定域名 `wp.test`、后端 Service `wp-svc:80`、IngressClass `wp-ink`：

```bash
kubectl create ing wp-ing --rule="wp.test/=wp-svc:80" --class=wp-ink
```

得到的 Ingress YAML 如下（路径类型用前缀匹配 Prefix）：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: wp-ing

spec:
  ingressClassName: wp-ink
  rules:
  - host: wp.test
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: wp-svc
            port:
              number: 80
```

Ingress Controller 对象仍需从 Nginx 项目的示例 YAML 修改而来，要改动名字、标签以及参数里的 IngressClass。按基本架构所述，这个 Ingress Controller 不使用 Service，而是给 Pod 加 `hostNetwork` 字段，让 Pod 使用宿主机网络，相当于另一种形式的 NodePort。

-> 详见 Ingress Controller Deployment 示例

准备好 Ingress 资源后创建这些对象：

```bash
kubectl apply -f wp-ing.yml -f wp-kic.yml
```

## 域名解析与访问验证

Ingress 使用的是 HTTP 路由规则，用 IP 地址访问无效，集群外主机必须能识别 `wp.test` 域名，即把 `wp.test` 解析到 Ingress Controller 所在的节点。

- Mac 修改 `/etc/hosts`
- Windows 修改 `C:\Windows\System32\Drivers\etc\hosts`

添加一条解析规则：

```bash
cat /etc/hosts
192.168.10.210 wp.test
```

> 注意：`wp.test` 要映射到 Ingress Controller 的 Pod 部署的那台机器，而不是 master 机器。可用 `kubectl get pod -n nginx-ingress -o wide` 查看 Pod 部署的机器，再决定映射的 IP。

有了域名解析，浏览器不必用 IP，直接用域名 `wp.test` 走 Ingress Controller 就能访问 WordPress 网站。

## 小结与遗留问题

本次为网站增加了横向扩容、服务发现和七层负载均衡三个功能，提升了稳定性和可用性，基本解决了初级篇遇到的问题。可在此基础上添加其他功能，如创建证书 Secret 让 Ingress 支持 HTTPS。

遗留问题：保证了各项服务的高可用，但对数据库 MariaDB 来说，Deployment 故障时虽能及时重启 Pod，新 Pod 却不会从旧 Pod 继承数据，之前网站数据会彻底消失，后果不可接受。后续高级篇会学习持久化存储对象 PersistentVolume 和有状态的 StatefulSet 等对象进一步完善网站。

## 常见问题与排查

- **由 Deployment 改 DaemonSet**：把 kind 改成 DaemonSet，移除 replicas，根据需要添加 tolerations 设置。
- **为 Ingress Controller 创建 NodePort Service**：用 `kubectl expose` 生成 YAML 样板实现，并记得移除 Ingress Controller Deployment 里的 `hostNetwork: true`。
- **hostNetwork 痛点**：Ingress Controller 用 Deployment 管理，Pod 重建时可能被部署到别的节点，又得改 hosts 配置。生产环境一般把 Ingress Controller 的 Service 配置成 LoadBalancer，由云厂商自动分配 IP 地址；实验环境较简陋。
- **bind() to 0.0.0.0:80 failed (Permission denied)**：运行 nginx controller 时 Pod 状态一直不是 running，因为 Pod 会桥接宿主机的 80 端口，而 80 端口受保护。解决办法是在 securityContext 中添加 `allowPrivilegeEscalation: true`。
- **访问出错排查**：常见原因包括 coredns 未就绪（Service 域名无法解析，重启 coredns 或重启虚拟机可恢复）、未安装 Nginx Ingress Controller 的 CRD/RBAC 资源（需运行 Ingress 目录里的 setup.sh）、pathType 误用 Exact（应使用 Prefix）、开启了 VPN 代理（关掉即可）。
- **WordPress 副本数**：WordPress 使用 cookie，副本数为 2 可能会话异常退出，建议设为 1。
