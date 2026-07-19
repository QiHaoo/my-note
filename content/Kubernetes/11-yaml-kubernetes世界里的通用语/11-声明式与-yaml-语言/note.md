---
title: 声明式与 YAML 语言
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, yaml, declarative]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：YAML：Kubernetes世界里的通用语

## 声明式与命令式

Kubernetes 使用的 YAML 语言有一个关键特性叫"声明式"（Declarative），对应的是"命令式"（Imperative），它们在计算机世界里的关系有点像小说里的"剑宗"与"气宗"。

| 方式 | 特点 |
|------|------|
| 命令式 | 注重顺序和过程，必须"告诉"计算机每步该做什么，所有步骤都列清楚，程序才能一步步走下去，计算机显得有点"笨" |
| 声明式 | 不关心具体过程，更注重结果，不需要"教"计算机该怎么做，只要告诉它一个目标状态，它自己就会想办法完成任务，自动化、智能化程度更高 |

### 打车的例子

假设要打车去高铁站：

- **命令式**：司机不熟悉路况，你只好不厌其烦地告诉他该走哪条路、在哪个路口转向、在哪里进出主路、停哪个站口，一路上费很多口舌，发出无数"命令"
- **声明式**：司机经验丰富，知道哪里拥堵、哪条路红绿灯多、哪段路有临时管控、哪里可以抄小道，你只要给他一个"声明"--我要去高铁站，就可以舒舒服服躺在后座上休息到达目的地

在这个例子里，Kubernetes 就是那位熟练的司机，Master/Node 架构让它对整个集群的状态了如指掌，内部的众多组件和插件也能够自动监控管理应用。这时用"命令式"跟它打交道就不太合适，它知道的信息比我们更多更全面，不需要外行去指导内行，最好做个"甩手掌柜"，用"声明式"把任务的目标告诉它（比如使用哪个镜像、什么时候运行），让它自己去处理执行过程中的细节。

容器技术里的 Shell 脚本和 Dockerfile 可以很好地描述"命令式"，但对于"声明式"就不太合适，这时需要使用专门的 YAML 语言。

## 什么是 YAML

YAML 语言创建于 2011 年，比 XML 晚三年。XML 是一种类似 HTML 的标签式语言，有很多繁文缛节。YAML 在名字上模仿了 XML，但实质上与 XML 完全不同，更适合人类阅读，计算机解析起来也很容易。

YAML 官网（https://yaml.org/）有对语言规范的完整介绍。

### YAML 与 JSON 的关系

YAML 是 JSON 的超集，支持整数、浮点数、布尔、字符串、数组和对象等数据类型。任何合法的 JSON 文档也都是 YAML 文档，了解 JSON 的话学习 YAML 会容易很多。

和 JSON 比起来，YAML 语法更简单，形式更清晰紧凑：

| 特性 | 说明 |
|------|------|
| 层次表示 | 使用空白与缩进表示层次（类似 Python），可以不使用花括号和方括号 |
| 注释 | 可以使用 `#` 书写注释，比起 JSON 是很大的改进 |
| 对象（字典） | 格式与 JSON 基本相同，但 Key 不需要使用双引号 |
| 数组（列表） | 使用 `-` 开头的清单形式（类似 MarkDown） |
| 分隔符 | 表示对象的 `:` 和表示数组的 `-` 后面都必须要有空格 |
| 多文档 | 可以使用 `---` 在一个文件里分隔多个 YAML 对象 |

## YAML 示例

### 数组（列表）

使用 `-` 列出三种操作系统：

```yaml
# YAML数组(列表)
OS:
- linux
- macOS
- Windows
```

对应的 JSON：

```json
{
  "OS": ["linux", "macOS", "Windows"]
}
```

对比可见 YAML 形式很简单，没有闭合花括号、方括号的麻烦，每个元素后面也不需要逗号。

### 对象（字典）

声明 1 个 Master 节点，3 个 Worker 节点：

```yaml
# YAML对象(字典)
Kubernetes:
  master: 1
  worker: 3
```

等价的 JSON：

```json
{
  "Kubernetes": {
    "master": 1,
    "worker": 3
  }
}
```

YAML 里的 Key 都不需要使用双引号，看起来更舒服。

### 组合数组和对象

把 YAML 的数组、对象组合起来，就可以描述出任意的 Kubernetes 资源对象：

```yaml
# 复杂的例子，组合数组和对象
Kubernetes:
  master:
  - apiserver: running
  - etcd: running

node:
- kubelet: running
- kube-proxy: down
- container-runtime: [docker, containerd, cri-o]
```

> 声明式的本质是：kubectl apply 不但能创建资源，也能更新资源，如果对象不存在则创建、对象已存在就比较 spec 进行相应变更（k8s 的修改实际上是先 delete 再 create）。kubectl create、kubectl edit、kubectl delete 等都是"命令式"操作。
