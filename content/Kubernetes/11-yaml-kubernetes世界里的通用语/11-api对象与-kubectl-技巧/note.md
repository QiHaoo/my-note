---
title: API对象与 kubectl 技巧
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, api-object, kubectl, yaml]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：YAML：Kubernetes世界里的通用语

YAML 语言只相当于"语法"，要与 Kubernetes 对话还必须有足够的"词汇"来表示"语义"。

## 什么是 API对象

作为一个集群操作系统，Kubernetes 归纳总结了 Google 多年的经验，在理论层面抽象出了很多个概念，用来描述系统的管理运维工作，这些概念就叫做"API对象"。

### 名字的由来

"API对象"这个名字来源于上次课讲到的 Kubernetes 组件 apiserver：

- apiserver 是 Kubernetes 系统的唯一入口，外部用户和内部组件都必须和它通信
- 它采用了 HTTP 协议的 URL 资源理念，API 风格也用 RESTful 的 GET/POST/DELETE 等等
- 所以这些概念很自然地就被称为"API对象"

### 查看所有 API对象

```bash
kubectl api-resources
```

输出说明：

| 列 | 含义 | 示例 |
|----|------|------|
| NAME | 对象的名字 | ConfigMap、Pod、Service |
| SHORTNAMES | 资源的简写，使用 kubectl 命令时有用，可少敲键盘 | Pod 简写 po，Service 简写 svc |

### 显示 HTTP 请求详情

使用 kubectl 命令时加上 `--v=9` 参数，会显示出详细的命令执行过程，清楚地看到发出的 HTTP 请求：

```bash
kubectl get pod --v=9
```

从输出可以看到，kubectl 客户端等价于调用了 curl，向 8443 端口发送了 HTTP GET 请求，URL 是 `/api/v1/namespaces/default/pods`。

### API对象的数量与存储

目前的 Kubernetes 1.23 版本有 50 多种 API 对象，全面地描述了集群的节点、应用、配置、服务、账号等等信息。apiserver 会把它们都存储在数据库 etcd 里，然后 kubelet、scheduler、controller-manager 等组件通过 apiserver 来操作它们，就在 API 对象这个抽象层次实现了对整个集群的管理。

## 如何描述 API对象

用 YAML 语言、使用"声明式"在 Kubernetes 里描述并创建 API 对象。因为 API 对象采用标准的 HTTP 协议，可以借鉴 HTTP 的报文格式，把 API 对象的描述分成"header"和"body"两部分。

### header（基本信息，任何对象都必须有）

三个字段：

| 字段 | 含义 |
|------|------|
| apiVersion | 操作这种资源的 API 版本号；Kubernetes 迭代速度快，不同版本创建的对象会有差异，需用此字段区分，如 v1、v1alpha1、v1beta1 |
| kind | 资源对象的类型，如 Pod、Node、Job、Service |
| metadata | 资源的"元信息"，用来标记对象、方便 Kubernetes 管理，如 name、labels |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx-pod
  labels:
    env: demo
    owner: chrono
```

这个示例里有两个"元信息"：name 给 Pod 起名叫 ngx-pod；labels 给 Pod"贴"上便于查找的标签 env 和 owner。

apiVersion、kind、metadata 都被 kubectl 用于生成 HTTP 请求发给 apiserver，可用 `--v=9` 参数在请求的 URL 里看到它们，例如 `https://192.168.49.2:8443/api/v1/namespaces/default/pods/ngx-pod`。

### body（与对象特定相关）

每种对象会有不同的规格定义，在 YAML 里表现为 `spec` 字段（即 specification），表示我们对对象的"期望状态"（desired status）。

Pod 的 spec 里是一个 containers 数组，里面每个元素又是一个对象，指定了名字、镜像、端口等信息：

```yaml
spec:
  containers:
  - image: nginx:alpine
    name: ngx
    ports:
    - containerPort: 80
```

### 完整的 Pod YAML

把字段综合起来，这份 YAML 文档完整描述了一个类型是 Pod 的 API 对象，要求使用 v1 版本的 API 接口去管理，其他更具体的名称、标签、状态等细节都记录在 metadata 和 spec 字段里：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx-pod
  labels:
    env: demo
    owner: chrono

spec:
  containers:
  - image: nginx:alpine
    name: ngx
    ports:
    - containerPort: 80
```

### 使用 YAML 创建/删除对象

```bash
kubectl apply -f ngx-pod.yml
kubectl delete -f ngx-pod.yml
```

Kubernetes 收到这份"声明式"的数据，再根据 HTTP 请求里的 POST/DELETE 等方法，就会自动操作这个资源对象，至于对象在哪个节点上、怎么创建、怎么删除完全不用我们操心。

## 编写 YAML 的三个技巧

这么多 API 对象，怎么知道该用什么 apiVersion、什么 kind？metadata、spec 里又该写哪些字段？最权威的答案是 Kubernetes 官方参考文档（https://kubernetes.io/docs/reference/kubernetes-api/），但内容太多太细。作者介绍三个简单实用的小技巧。

### 技巧 1：kubectl api-resources

显示资源对象相应的 API 版本和类型，照着写绝对不会错。比如 Pod 的版本是 v1，Ingress 的版本是 networking.k8s.io/v1。

### 技巧 2：kubectl explain

相当于 Kubernetes 自带的 API 文档，会给出对象字段的详细说明，不必去网上查找。比如想看 Pod 里的字段该怎么写：

```bash
kubectl explain pod
kubectl explain pod.metadata
kubectl explain pod.spec
kubectl explain pod.spec.containers
```

### 技巧 3：--dry-run=client -o yaml

让 kubectl 为我们"代劳"，生成一份"文档样板"，免去打字和对齐格式的工作。`--dry-run=client` 是空运行，`-o yaml` 是生成 YAML 格式，结合起来使用会让 kubectl 不会有实际的创建动作，而只生成 YAML 文件。

例如生成一个 Pod 的 YAML 样板示例：

```bash
kubectl run ngx --image=nginx:alpine --dry-run=client -o yaml
```

生成的 YAML：

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: ngx
  name: ngx
spec:
  containers:
  - image: nginx:alpine
    name: ngx
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```

接下来要做的，就是查阅对象的说明文档，添加或删除字段来定制这个 YAML。

这个技巧还可以再进化，把这段参数定义成 Shell 变量（名字任意，如 `$do/$go`，作者用的是 `$out`），用起来更省事：

```bash
export out="--dry-run=client -o yaml"
kubectl run ngx --image=nginx:alpine $out
```

> 生成的 YAML 默认直接输出在屏幕上，需要用重定向 `> x.yml` 保存到文件，或直接鼠标选择文本。

今后除了特殊情况，都不会再使用 `kubectl run` 这样的命令去直接创建 Pod，而是会编写 YAML，用"声明式"来描述对象，再用 `kubectl apply` 去发布 YAML 来创建对象。
