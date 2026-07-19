---
title: docker cp 与目录共享
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, networking, volume]
reviewable: true
module: container-basics
---

← 参见 主笔记：打破次元壁：容器该如何与外界互联互通

容器与外界交换文件数据的两种方式：`docker cp` 互相拷贝、`docker run -v` 共享目录。

## docker cp：宿主机与容器互拷文件

`docker cp` 可以在宿主机和容器之间拷贝文件，用法类似 Linux 的 `cp`、`scp`，指定源路径（src path）和目标路径（dest path）即可。

- 源路径是宿主机 → 把文件拷贝进容器
- 源路径是容器 → 把文件拷贝出容器
- 容器路径需用容器名或容器 ID 指明是哪个容器

试验需先用 `docker run` 启动一个容器（以 Redis 为例，`-d` 后台运行，`--rm` 容器结束后自动删除）：

```bash
docker run -d --rm redis
```

### 拷入容器

把当前目录的 `a.txt` 拷进 Redis 容器（ID 为 062）的 `/tmp` 目录：

```bash
docker cp a.txt 062:/tmp
```

用 `docker exec` 进入容器验证：

```bash
docker exec -it 062 sh
```

在 `/tmp` 目录下可以看到 `a.txt`。

### 拷出容器

把 `docker cp` 后面的两个路径调换位置即可：

```bash
docker cp 062:/tmp/a.txt ./b.txt
```

宿主机当前目录会多出一个 `b.txt`。

## docker run -v：共享宿主机目录

`docker cp` 偶尔一两次文件共享还能应付，若容器运行时经常有文件来往，反复拷来拷去很麻烦也容易出错。容器提供了共享宿主机目录的功能，效果和虚拟机的"共享目录"几乎一样。

在 `docker run` 启动容器时使用 `-v` 参数，格式为"宿主机路径:容器内路径"，让容器共享宿主机的某个目录：

```bash
docker run -d --rm -v /tmp:/tmp redis
```

用 `docker exec` 进入容器查看 `/tmp` 目录，文件与宿主机完全一致；在容器里对 `/tmp` 做操作（删文件、建新目录等），宿主机也会即时同步，证明两者确实共享了该目录。

### 应用场景：用容器跑本地代码

`-v` 对日常开发测试非常有用：可在不变动本机环境的前提下，用镜像安装任意应用，再以容器运行本地源码、脚本。

例如本机只有 Python 2.7 但想用 Python 3 开发，同时安装 Python 2 和 Python 3 容易把系统搞乱，可这样做：

1. 用 `docker pull` 拉取一个 Python 3 的镜像，它打包了完整运行环境、运行时有隔离，不会对现有 Python 2.7 产生影响
2. 在本地某个目录编写 Python 代码，用 `-v` 参数让容器共享这个目录
3. 在容器里以 Python 3 安装各种包，再运行脚本做开发

```bash
docker pull python:alpine
docker run -it --rm -v `pwd`:/tmp python:alpine sh
```

> `pwd` 是 shell 的特殊语法（反引号执行），表示当前目录。

这种方式比把文件打包到镜像或 `docker cp` 更灵活，非常适合有频繁修改的开发测试工作。

## docker cp 与 Dockerfile COPY 的区别

- `docker cp` 是在容器**运行时**在宿主机和容器之间互相拷贝文件，是**双向**的；Dockerfile 的 `COPY` 是在**构建镜像时**把本地文件拷贝进镜像，是单向的
- `COPY` 会生成新的 layer，对镜像是永久的；`cp` 是在当前 layer 执行一个命令，不生成新的 layer，是暂时的
- `COPY` 的路径必须是"构建上下文路径"里的文件，不能随意指定；`cp` 没有这个约束，可以 copy 整个 OS 下的文件
