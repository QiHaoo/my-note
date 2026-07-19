---
title: Dockerfile 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, dockerfile]
reviewable: true
module: container-basics
---

← 参见 主笔记：创建容器镜像：如何编写正确、高效的Dockerfile

Dockerfile 中超长 RUN 指令的写法，以及一个完整的课下作业 Dockerfile 示例。

## 超长 RUN 指令：续行符与 && 连接

RUN 通常是最复杂的指令，会包含很多 Shell 命令，但一条指令只能是一行，所以常在每行末尾用续行符 `\`，命令间用 `&&` 连接，保证逻辑上是一行：

```dockerfile
RUN apt-get update \
    && apt-get install -y \
       build-essential \
       curl \
       make \
       unzip \
    && cd /tmp \
    && curl -fSL xxx.tar.gz -o xxx.tar.gz \
    && tar xzf xxx.tar.gz \
    && cd xxx \
    && ./configure \
    && make \
    && make clean
```

## 课下作业 Dockerfile

完整 Dockerfile 示例，用 `docker build -t ngx-app .` 或 `docker build -t ngx-app:1.0 .` 构建。注释已按 Dockerfile 规范拆为单独一行：

```dockerfile
# Dockerfile
# docker build -t ngx-app .
# docker build -t ngx-app:1.0 .

ARG IMAGE_BASE="nginx"
ARG IMAGE_TAG="1.21-alpine"

FROM ${IMAGE_BASE}:${IMAGE_TAG}

COPY ./default.conf /etc/nginx/conf.d/

RUN cd /usr/share/nginx/html \
    && echo "hello nginx" > a.txt

EXPOSE 8081 8082 8083
```

含义：

1. 用 ARG 定义 `IMAGE_BASE="nginx"` 和 `IMAGE_TAG="1.21-alpine"` 两个构建变量
2. FROM 用这两个变量选择基础镜像 `nginx:1.21-alpine`
3. COPY 把构建上下文里的配置文件 `./default.conf` 拷贝到镜像的 `/etc/nginx/conf.d/` 目录（源路径必须在构建上下文中真实存在，目标路径不存在会自动创建）
4. RUN 切换到 `/usr/share/nginx/html` 目录并生成 `a.txt` 文件，内容是 `hello nginx`
5. EXPOSE 声明容器对外服务的端口号 8081、8082、8083
