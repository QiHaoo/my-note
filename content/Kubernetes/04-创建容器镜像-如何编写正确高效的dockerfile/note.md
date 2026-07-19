---
title: 创建容器镜像：如何编写正确、高效的Dockerfile
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, dockerfile]
reviewable: true
module: container-basics
---

## 镜像的内部机制

容器镜像是由多个只读的 Layer（层）构成的。为保证运行环境一致，镜像必须包含应用的整个 rootfs（不含内核，容器共享宿主机内核），若每个镜像都重复打包会导致大量冗余。分层（Layer）把重复部分抽取出来只存一份，让多个镜像共享。

| 要点 | 说明 |
|------|------|
| 结构 | 镜像内部由许多只读镜像层组成，每层是一组只读文件 |
| 共享 | 相同层可在镜像间共享，像搭积木一样堆叠 |
| 合并 | 用 Union FS（联合文件系统）把多层合并，形成容器最终看到的文件系统 |

用 `docker inspect` 可查看镜像分层（在 "RootFS" 部分）。`docker pull` / `docker rmi` 输出里那些"奇怪"的信息其实就是各 Layer：Docker 会跳过本地已有的层、保留被其他镜像共享的层。

-> 详见 镜像的内部机制与 Layer

## Dockerfile 是什么

Dockerfile 是镜像这个"样板间"的"施工图纸"，是一个纯文本，记录一系列构建指令（选基础镜像、拷贝文件、运行脚本等），每个指令生成一个 Layer。Docker 顺序执行文件里的所有步骤，最后创建出新镜像。

最简单的 Dockerfile 只有两条指令：

- **FROM**：所有 Dockerfile 都必须从它开始，选择构建使用的基础镜像，相当于"打地基"
- **CMD**：指定 `docker run` 启动容器时默认运行的命令

```dockerfile
FROM busybox
CMD echo "hello world"
```

用 `docker build` 构建，`-f` 指定 Dockerfile 文件名，后面必须跟一个"构建上下文"路径（这里的点号表示当前路径）：

```bash
docker build -f Dockerfile.busybox .
```

-> 详见 Dockerfile 常用指令
-> 详见 Dockerfile 示例

## 怎样编写正确、高效的 Dockerfile

### FROM：选择基础镜像

构建镜像第一条指令必须是 FROM，基础镜像的选择很关键：

| 关注点 | 选择 |
|--------|------|
| 镜像的安全和大小 | Alpine |
| 应用的运行稳定性 | Ubuntu、Debian、CentOS |

```dockerfile
FROM alpine:3.15
FROM ubuntu:bionic
```

### COPY：拷贝文件

用法类似 Linux 的 cp，但源文件必须位于"构建上下文"路径内，不能随意指定。

### RUN：执行 Shell 命令

Dockerfile 里最重要的指令，可执行任意 Shell 命令。一条指令只能一行，所以长 RUN 常在行尾用续行符 `\`、命令间用 `&&` 连接，保证逻辑上是一行。

### ARG / ENV：参数化变量

| 指令 | 可见范围 |
|------|----------|
| ARG | 创建的变量只在镜像构建过程中可见，容器运行时不可见 |
| ENV | 不仅能在构建镜像过程中使用，容器运行时也能以环境变量形式被应用程序使用 |

### EXPOSE：声明服务端口

声明容器对外服务的端口号，对 Node.js、Tomcat、Nginx、Go 等微服务很有用：

```dockerfile
EXPOSE 443
EXPOSE 53/udp
```

### 精简合并

每个指令生成一个镜像层，Dockerfile 里尽量精简合并，否则层数太多会导致镜像臃肿。

-> 详见 Dockerfile 常用指令
-> 详见 Dockerfile 示例

## docker build 是怎么工作的

Dockerfile 必须经过 `docker build` 才生效。命令行 docker 是简单客户端，真正的构建由服务器端 Docker daemon 完成，所以客户端只能把"构建上下文"目录打包上传（显示 `Sending build context to Docker daemon`）。

| 要点 | 说明 |
|------|------|
| 构建上下文与 Dockerfile 无直接关系 | 它指定要打包进镜像的依赖文件 |
| COPY 只能用基于构建上下文的相对路径 | daemon 看不到本地环境，只看到打包上传的文件 |
| .dockerignore | 语法类似 .gitignore，排除不需打包的文件（如 readme、.git、.svn） |
| -f 省略时 | 在当前目录找名为 Dockerfile 的文件，单一构建目标时直接叫 Dockerfile 最省事 |
| -t 参数 | 为镜像指定标签（tag），用 `:` 分隔名字和标签，不提供默认 latest |

-> 详见 docker build 与构建上下文

## 分笔记索引

- **镜像的内部机制与 Layer** — 分层原因、Union FS 合并、docker inspect、共享收益与可写层
- **Dockerfile 常用指令** — FROM/COPY/RUN/ARG/ENV/EXPOSE/CMD 详解与精简合并
- **Dockerfile 示例** — 超长 RUN 续行写法、完整课下作业 Dockerfile
- **docker build 与构建上下文** — 构建机制、.dockerignore、-t 命名、构建过程示例
