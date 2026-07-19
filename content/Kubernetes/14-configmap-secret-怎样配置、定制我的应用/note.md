---
title: ConfigMap-Secret：怎样配置、定制我的应用
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, configmap, secret]
reviewable: true
module: kubernetes-core
---

## 核心概念

Kubernetes 用 ConfigMap 和 Secret 两种 API 对象管理配置信息：ConfigMap 代表明文信息，Secret 代表机密敏感信息，都存储在 etcd 里，在需要时以环境变量或加载文件（Volume）的方式注入 Pod 供应用使用，实现配置与应用的解耦。

## ConfigMap/Secret 的设计动机

应用通常都有配置文件（如 nginx.conf、redis.conf、my.cnf），把运行时参数从代码中分离。容器技术两种管理配置文件的方式都有缺陷：

| 方式 | 缺陷 |
|------|------|
| Dockerfile 用 COPY 打包到镜像 | 在镜像里固定配置文件，不好修改，不灵活 |
| docker cp 或 docker run -v 拷贝本机文件 | "笨拙"，不适合集群中自动化运维管理 |

Kubernetes 的方案是用 YAML 定义 API 对象再组合起来实现动态配置。

配置信息从数据安全角度分两类：

| 类别 | 说明 | 对应对象 |
|------|------|---------|
| 明文配置 | 不保密，可任意查询修改，如服务端口、运行参数、文件路径 | ConfigMap |
| 机密配置 | 涉及敏感信息需保密，如密码、密钥、证书 | Secret |

## 什么是 ConfigMap

ConfigMap 的 YAML 与 Pod、Job 不同，没有 `spec` 字段（因为存储的是静态字符串，不是容器），用 `data` 字段存储 Key-Value 数据。

- `apiVersion`：`v1`
- `kind`：`ConfigMap`（简写 `cm`）
- `data`：Key-Value 结构

生成带 data 字段的样板：`kubectl create cm info --from-literal=k=v $out`（`--from-literal` 参数需用 k=v 形式）。

创建/查看：`kubectl apply -f cm.yml`、`kubectl get cm`、`kubectl describe cm info`。ConfigMap 的 Key-Value 存入 etcd 数据库，可被其他 API 对象使用。

-> 详见 ConfigMap 对象

## 什么是 Secret

Secret 的结构和用法与 ConfigMap 很类似，但 Secret 在 Kubernetes 里细分出很多类（私有镜像仓库认证、身份识别凭证、HTTPS 证书和私钥、一般机密信息等），课程只使用最后一种。

- 生成样板：`kubectl create secret generic user --from-literal=name=root $out`（`generic` 是 secret 对象的一种）
- `kind`：`Secret`
- `data`：Key-Value，但值必须 Base64 编码

Secret 对数据做 Base64 编码（不是真正的加密，只是编码方式），不让用户直接看到原始数据，起一定的保密作用。可以绕开 kubectl 自己用 Linux 工具 base64 编码后写入 YAML：

```bash
echo -n "123456" | base64
# MTIzNDU2
```

注意 echo 必须加 `-n` 去掉隐含的换行符，否则 Base64 编码结果错误。

因为保密，`kubectl describe secret user` 不能直接看到内容，只能看到数据的大小。

-> 详见 Secret 对象

## 如何以环境变量的方式使用

Pod 的 `containers.env` 字段除了用 `value` 写死值，还能用 `valueFrom` 字段从 ConfigMap 或 Secret 获取值，把配置信息以环境变量注入 Pod。

- `valueFrom` 指定环境变量值的来源，可以是 `configMapKeyRef` 或 `secretKeyRef`
- 再进一步指定应用的 ConfigMap/Secret 的 `name` 和里面的 `key`
- 当心：这个 `name` 是 API 对象的名字，而不是 Key-Value 的名字

可用 `kubectl explain pod.spec.containers.env.valueFrom` 查看说明。

引用关系是"松耦合"：Pod 与 ConfigMap、Secret 不是直接嵌套包含，而是用 KeyRef 字段间接引用对象，同一配置信息可在不同对象间共享。

| 字段 | 引用对象 |
|------|---------|
| configMapKeyRef | ConfigMap |
| secretKeyRef | Secret |

-> 详见 env-pod 示例

## 如何以 Volume 的方式使用

Kubernetes 为 Pod 定义了"Volume"（存储卷）概念，类似虚拟机里的磁盘。可为 Pod 挂载（mount）多个 Volume，类似 `docker run -v`。

| 字段 | 所属层级 | 作用 |
|------|---------|------|
| volumes | spec（与 containers 同级，属于 Pod 不属于容器） | 定义卷的名字和引用的 ConfigMap/Secret |
| volumeMounts | containers | 把定义好的 Volume 挂载到容器里的某个路径（用 mountPath、name 指定） |

Volume 比环境变量多一个环节：先用 Volume 引用 ConfigMap/Secret，再在容器里挂载 Volume。

好处：以 Volume 概念统一抽象了所有存储，不仅支持 ConfigMap/Secret，以后还能支持临时卷、持久卷、动态卷、快照卷等，扩展性非常好。

加载后 ConfigMap 和 Secret 都变成目录形式，里面的 Key-Value 变成一个个文件，文件名就是 Key。

-> 详见 vol-pod 示例

## 环境变量 vs Volume 对比

| 方式 | 适用场景 | 更新行为 |
|------|---------|---------|
| 环境变量 | 简短字符串，用法简单 | Pod 启动时一次性注入，更新 ConfigMap/Secret 后不会同步更新，需重启 Pod |
| Volume | 大数据量配置文件，在 Pod 里加载成文件让应用直接读取 | 会更新，但有延迟（约 1 分钟左右） |

> ConfigMap 和 Secret 对存储数据的大小有限制（1MiB）。

## 分笔记索引

- **ConfigMap 对象** — 基本结构、data 字段、创建与查看命令
- **Secret 对象** — 分类、Base64 编码、创建与查看
- **env-pod 示例** — 以环境变量方式引用 ConfigMap/Secret
- **vol-pod 示例** — 以 Volume 方式挂载 ConfigMap/Secret
