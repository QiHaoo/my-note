---
title: Dockerfile 常用指令
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, dockerfile]
reviewable: true
module: container-basics
---

← 参见 主笔记：创建容器镜像：如何编写正确、高效的Dockerfile

Dockerfile 就是一个纯文本，记录一系列构建指令（选基础镜像、拷贝文件、运行脚本等），每个指令生成一个 Layer，Docker 顺序执行文件里的所有步骤，最后创建出新镜像。

> Dockerfile 的注释必须是 `#` 开头且单独一行，不能在行尾，否则会把注释视为参数。

## FROM：选择基础镜像

所有 Dockerfile 都要从 FROM 开始，表示选择构建使用的基础镜像，相当于"打地基"。基础镜像的选择很关键：

| 关注点 | 选择 |
|--------|------|
| 镜像的安全和大小 | Alpine |
| 应用的运行稳定性 | Ubuntu、Debian、CentOS |

```dockerfile
FROM alpine:3.15
FROM ubuntu:bionic
```

> 每个 Dockerfile 都必须有个基础镜像，最原始可用 Docker 保留的最小镜像 scratch 构建，也可以用 tar 创建完整镜像。scratch 无法 pull、run、tag，只能在 Dockerfile 中引用。

## COPY：拷贝文件

用法类似 Linux 的 cp，但源文件必须位于"构建上下文"路径内，不能随意指定。若要从本机向镜像拷贝文件，必须把这些文件放到专门目录，再在 `docker build` 里把"构建上下文"指定到这个目录。

```dockerfile
COPY ./a.txt /tmp/a.txt   # 把构建上下文里的 a.txt 拷贝到镜像的 /tmp 目录
COPY /etc/hosts /tmp      # 错误！不能使用构建上下文之外的文件
```

> 第一个路径是 context 目录，不是当前目录。目标路径若不存在，构建过程中会自动创建（区别于 Linux 的 cp）。

## RUN：执行 Shell 命令

Dockerfile 里最重要的指令，可执行任意 Shell 命令（更新系统、安装应用、下载文件、创建目录、编译程序等），实现任意构建步骤，非常灵活。

RUN 通常是 Dockerfile 里最复杂的指令，会包含很多 Shell 命令，但一条指令只能是一行，所以常在每行末尾用续行符 `\`，命令间用 `&&` 连接，保证逻辑上是一行。

### 变通技巧：脚本文件

在 Dockerfile 里写超长 RUN 不美观，且写错后每次调试都要重新构建。可以把 Shell 命令集中到脚本文件，用 COPY 拷贝进去再用 RUN 执行：

```dockerfile
COPY setup.sh /tmp/                                # 拷贝脚本到 /tmp 目录
RUN cd /tmp && chmod +x setup.sh \                 # 添加执行权限
    && ./setup.sh && rm setup.sh                   # 运行脚本然后再删除
```

## ARG / ENV：参数化变量

RUN 指令本质就是 Shell 编程，用变量可实现参数化运行。Dockerfile 里用 ARG 和 ENV 两个指令，区别在于：

| 指令 | 可见范围 |
|------|----------|
| ARG | 创建的变量只在镜像构建过程中可见，容器运行时不可见 |
| ENV | 不仅能在构建镜像过程中使用，容器运行时也能以环境变量形式被应用程序使用 |

```dockerfile
ARG IMAGE_BASE="node"
ARG IMAGE_TAG="alpine"

ENV PATH=$PATH:/tmp
ENV DEBUG=OFF
```

ARG 定义的变量可以用在 FROM 指令里（如 `FROM ${IMAGE_BASE}:${IMAGE_TAG}`）。

## EXPOSE：声明服务端口

用来声明容器对外服务的端口号，对基于 Node.js、Tomcat、Nginx、Go 等开发的微服务系统非常有用：

```dockerfile
EXPOSE 443            # 默认是 tcp 协议
EXPOSE 53/udp         # 可以指定 udp 协议
```

## CMD：默认运行命令

指定 `docker run` 启动容器时默认运行的命令。

> ENTRYPOINT 是执行的命令，CMD 是参数；一个可以被外部覆盖，一个不可以。两者用哪个没有太严格区分。

## 精简合并指令

因为每个指令都会生成一个镜像层，Dockerfile 里最好不要滥用指令，尽量精简合并，否则太多层会导致镜像臃肿不堪。

> 层数会影响镜像总大小，每个层都会有一点空间占用，积累多了镜像就会越来越大。
