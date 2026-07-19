---
title: YAML：Kubernetes世界里的通用语
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, yaml, declarative, api-object]
reviewable: true
module: kubernetes-core
---

## 核心概念

Master/Node 架构是 Kubernetes 的"内功心法"，发挥内功的"招式秘籍"就是 Kubernetes 里的标准工作语言 YAML。Kubernetes 使用"声明式"（Declarative）的 YAML 语言描述"API对象"，把集群里的一切资源都定义为 API 对象，通过 RESTful 接口管理。描述 API 对象必须的字段是 apiVersion、kind、metadata，再加上描述期望状态的 spec。

## 声明式与命令式

Kubernetes 的 YAML 有一个关键特性"声明式"（Declarative），对应的是"命令式"（Imperative）。

| 方式 | 特点 | 适用 |
|------|------|------|
| 命令式 | 注重顺序和过程，必须告诉计算机每步该做什么，所有步骤都列清楚，程序才能一步步走下去 | Docker 命令、Dockerfile、大多数编程语言 |
| 声明式 | 不关心具体过程，更注重结果，只要告诉计算机一个目标状态，它自己想办法完成任务，自动化、智能化程度更高 | Kubernetes（出现前比较少见） |

以"打车"为例：司机不熟路况时，你必须不停发"命令"告诉它走哪条路（命令式）；司机经验丰富时，你只要给一个"声明"——我要去高铁站，就可以躺着到达（声明式）。Kubernetes 就像那位熟练司机，Master/Node 架构让它对集群状态了如指掌，用"命令式"跟它打交道不合适，最好做个"甩手掌柜"用"声明式"把目标告诉它。

容器技术里的 Shell 脚本和 Dockerfile 适合描述"命令式"，对"声明式"不合适，需要使用专门的 YAML 语言。

-> 详见 声明式与 YAML 语言

## 什么是 YAML

YAML 语言创建于 2011 年（比 XML 晚三年），名字上模仿了 XML，但实质上与 XML 完全不同，更适合人类阅读，计算机解析也容易。

- YAML 是 JSON 的超集，支持整数、浮点数、布尔、字符串、数组和对象等数据类型；任何合法的 JSON 文档也都是 YAML 文档

| 特性 | 说明 |
|------|------|
| 层次表示 | 使用空白与缩进表示层次（类似 Python），可不使用花括号和方括号 |
| 注释 | 可使用 `#` 书写注释（JSON 不支持） |
| 对象（字典） | 格式与 JSON 基本相同，但 Key 不需要双引号 |
| 数组（列表） | 使用 `-` 开头的清单形式（类似 Markdown） |
| 分隔符 | 表示对象的 `:` 和表示数组的 `-` 后面都必须要有空格 |
| 多文档 | 可使用 `---` 在一个文件里分隔多个 YAML 对象 |

-> 详见 声明式与 YAML 语言

## 什么是 API对象

YAML 语言只相当于"语法"，要与 Kubernetes 对话还必须有"词汇"来表示"语义"。Kubernetes 在理论层面抽象出了很多概念来描述系统的管理运维工作，这些概念就叫"API对象"。

- 名字来源于 apiserver：apiserver 是 Kubernetes 系统的唯一入口，外部用户和内部组件都必须和它通信，它采用 HTTP 协议的 URL 资源理念，API 风格用 RESTful 的 GET/POST/DELETE 等，所以这些概念很自然地被称为"API对象"
- `kubectl api-resources` 查看当前 Kubernetes 版本支持的所有对象
- 输出的 NAME 是对象名字（如 ConfigMap、Pod、Service），SHORTNAMES 是资源简写（如 Pod 简写 po，Service 简写 svc）
- 加 `--v=9` 参数会显示详细的命令执行过程，可清楚看到发出的 HTTP 请求（如 `kubectl get pod --v=9` 等价于 curl 向 8443 端口发送 HTTP GET 请求，URL 是 `/api/v1/namespaces/default/pods`）
- Kubernetes 1.23 版本有 50 多种 API 对象，apiserver 把它们存储在 etcd 里，kubelet、scheduler、controller-manager 等组件通过 apiserver 操作它们

-> 详见 API对象与 kubectl 技巧

## 如何描述 API对象

用 YAML 语言、以"声明式"在 Kubernetes 里描述并创建 API 对象。借鉴 HTTP 报文格式，API 对象的描述可分为"header"和"body"两部分。

| 部分 | 字段 | 说明 |
|------|------|------|
| header（基本信息，任何对象都必须有） | apiVersion | 操作这种资源的 API 版本号，如 v1、v1alpha1、v1beta1 |
| | kind | 资源对象的类型，如 Pod、Node、Job、Service |
| | metadata | 资源的"元信息"，用来标记对象、方便管理，如 name、labels |
| body（与对象特定相关） | spec | 对象的规格定义（specification），表示对对象的"期望状态"（desired status） |

Pod 的 YAML 示例（使用 nginx:alpine 镜像，开放端口 80）：

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

apiVersion、kind、metadata 都被 kubectl 用于生成 HTTP 请求发给 apiserver（如 URL `https://192.168.49.2:8443/api/v1/namespaces/default/pods/ngx-pod`）。

使用 YAML 文件创建/删除对象：

```bash
kubectl apply -f ngx-pod.yml
kubectl delete -f ngx-pod.yml
```

-> 详见 API对象与 kubectl 技巧

## 如何编写 YAML

官方参考文档（https://kubernetes.io/docs/reference/kubernetes-api/）是最权威的答案，但内容太多太细。作者介绍三个简单实用的小技巧：

| 技巧 | 命令 | 作用 |
|------|------|------|
| 1 | `kubectl api-resources` | 显示资源对象相应的 API 版本和类型，如 Pod 版本 v1，Ingress 版本 networking.k8s.io/v1 |
| 2 | `kubectl explain` | Kubernetes 自带的 API 文档，给出对象字段的详细说明，如 `kubectl explain pod.spec.containers` |
| 3 | `--dry-run=client -o yaml` | 让 kubectl "代劳"生成一份"文档样板"，空运行只生成 YAML 不实际创建 |

生成 Pod 的 YAML 样板示例：

```bash
kubectl run ngx --image=nginx:alpine --dry-run=client -o yaml
```

可把这段参数定义成 Shell 变量用起来更省事：

```bash
export out="--dry-run=client -o yaml"
kubectl run ngx --image=nginx:alpine $out
```

今后除了特殊情况，都不会再使用 `kubectl run` 这样的命令直接创建 Pod，而是编写 YAML 用"声明式"描述对象，再用 `kubectl apply` 发布 YAML 创建对象。

-> 详见 API对象与 kubectl 技巧

## 分笔记索引

- **声明式与 YAML 语言** — 声明式/命令式对比、YAML 语法、数组与对象示例
- **API对象与 kubectl 技巧** — API对象概念、header/body 字段、三个 YAML 编写技巧
