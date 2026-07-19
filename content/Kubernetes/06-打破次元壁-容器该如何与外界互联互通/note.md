---
title: 打破次元壁：容器该如何与外界互联互通
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, networking, port-mapping]
reviewable: true
module: container-basics
---

## 如何拷贝容器内的数据

Docker 的 `cp` 命令可以在宿主机和容器之间拷贝文件，是最基本的数据交换功能，用法类似 Linux 的 `cp`、`scp`，指定源路径和目标路径即可。

- 源路径是宿主机 → 拷贝进容器；源路径是容器 → 拷贝出容器
- 容器路径需用容器名或容器 ID 指明

```bash
docker cp a.txt 062:/tmp           # 宿主机 -> 容器
docker cp 062:/tmp/a.txt ./b.txt   # 容器 -> 宿主机
```

可用 `docker exec -it <容器> sh` 进入容器验证，适合简单的数据交换。

-> 详见 docker cp 与目录共享

## 如何共享主机上的文件

`docker cp` 偶尔一两次文件共享还能应付，若容器运行时经常有文件来往，反复拷来拷去很麻烦也容易出错。容器提供了共享宿主机目录的功能，效果和虚拟机的"共享目录"几乎一样。

- 在 `docker run` 启动容器时使用 `-v` 参数，格式为"宿主机路径:容器内路径"
- 一边对目录里文件的操作另一边立刻就能看到，没有数据拷贝，效率高

```bash
docker run -d --rm -v /tmp:/tmp redis
```

`-v` 挂载宿主机目录对日常开发测试很有用：可在不变动本机环境的前提下，用镜像安装任意应用，再以容器运行本地源码、脚本。例如本机只有 Python 2.7 却想用 Python 3 开发：拉取 Python 3 镜像 → 用 `-v` 共享本地代码目录 → 在容器里以 Python 3 安装包、运行脚本，不会污染现有系统。

```bash
docker pull python:alpine
docker run -it --rm -v `pwd`:/tmp python:alpine sh
```

-> 详见 docker cp 与目录共享

## 如何实现网络互通

对于 Nginx、Redis 这些服务器，网络互通才是更要紧的问题。Docker 提供三种网络模式：

| 模式 | 特点 | 通信效率 | 隔离性 | 启用参数 |
|------|------|----------|--------|----------|
| null | 没有网络，但允许其他网络插件自定义网络连接 | - | - | - |
| host | 直接使用宿主机网络，去掉容器网络隔离（其他隔离保留），所有容器共享宿主机 IP 和网卡 | 高（无中间层） | 差，容易端口冲突 | `--net=host` |
| bridge | 桥接模式，软件虚拟出网桥（docker0），容器和宿主机通过虚拟网卡接入，类似现实中的交换机/路由器 | 低一些（多了虚拟网桥和网卡） | 好 | `--net=bridge`（默认） |

bridge 是默认网络模式，一般不需要显式指定。容器之间使用 IP 地址实现网络通信，默认网段为 `172.17.0.0/16`，宿主机固定 `172.17.0.1`，容器顺序分配（如 `172.17.0.2`、`172.17.0.3`）。可用 `docker inspect <容器> | grep IPAddress` 查看容器 IP。

-> 详见 Docker 网络模式

## 如何分配服务端口号

服务器应用都必须有端口号才能对外提供服务（HTTP 用 80、HTTPS 用 443、Redis 是 6379、MySQL 是 3306）。但一台主机端口数量有限且多个服务不能冲突，而打包镜像通常都用默认端口，容器实际运行容易因端口被占用而无法启动。

解决方法是加入"中间层"：由容器环境（如 Docker）统一管理分配端口号，在本机端口和容器端口之间做"映射"操作。容器内部仍用自己的端口号，外界看到的是另一个端口号，避免冲突。

- 端口映射需使用 bridge 模式，并在 `docker run` 时用 `-p` 参数，用 `:` 分隔本机端口和容器端口

```bash
docker run -d -p 80:80 --rm nginx:alpine
docker run -d -p 8080:80 --rm nginx:alpine
```

本机的 80 和 8080 端口分别映射到两个容器里的 80 端口，不会冲突。可用 `curl` 验证，`docker ps` 的"PORTS"栏可直观看到端口映射情况。

-> 详见 Docker 网络模式

## 分笔记索引

- **docker cp 与目录共享** — docker cp 双向拷贝、docker run -v 共享目录、与 Dockerfile COPY 区别
- **Docker 网络模式** — null/host/bridge 三种模式、bridge 架构、端口映射 -p
