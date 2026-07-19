---
title: 常用的容器操作
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, container]
reviewable: true
module: container-basics
---

← 参见 主笔记：容器化的应用：会了这些你就是Docker高手

在本地存放了镜像后，就可以用 `docker run` 把静态的应用运行起来，变成动态的容器。

## docker run

基本格式是"docker run 设置参数"，再跟上"镜像名或 ID"，后面可能还会有附加的"运行命令"。

```bash
docker run -h srv alpine hostname
```

其中 `-h srv` 是容器运行参数，`alpine` 是镜像名，后面的 `hostname` 表示要在容器里运行的程序，输出主机名。

`docker run` 是最复杂的一个容器操作命令，有很多额外参数调整容器运行状态（用 `--help` 查看帮助）。最常用的几个参数：

| 参数 | 作用 |
|------|------|
| `-it` | 开启交互式 Shell，直接进入容器内部，像登录虚拟机一样（`-i` 与 `-t` 组合） |
| `-d` | 让容器在后台运行，启动 Nginx、Redis 等服务器程序时非常有用 |
| `--name` | 为容器起一个名字方便查看，非必须，不用则 Docker 分配随机名字 |
| `--rm` | 不保存容器，运行完毕就自动清除，省去手工管理容器的麻烦 |

练习几个参数：

```bash
docker run -d nginx:alpine                   # 后台运行 Nginx
docker run -d --name red_srv redis           # 后台运行 Redis
docker run -it --name ubuntu 2e6 sh          # 用 IMAGE ID 前缀登录 Ubuntu
```

> `2e6` 是某个 Ubuntu 镜像的 image id，需用自己 docker 环境里的 image id 前缀替换。

### CONTAINER ID

每一个容器都有一个 CONTAINER ID，作用和镜像的 IMAGE ID 一样，唯一标识容器，使用时也可用前几位数字定位。

## docker ps：查看容器

| 命令 | 作用 |
|------|------|
| `docker ps` | 查看当前运行的容器 |
| `docker ps -a` | 查看所有容器，包括已经停止运行的 |

容器被 `docker stop` 停止后用 `docker ps` 看不到了，但并未彻底销毁，可用 `docker ps -a` 查看。

## docker exec：在运行中的容器内执行程序

对于正在运行的容器，可以用 `docker exec` 在里面执行另一个程序，效果和 `docker run` 很类似，但因为容器已经存在，不会创建新的容器。

```bash
docker exec -it red_srv sh
```

最常见的用法是用 `-it` 打开一个 Shell，从而进入容器内部，方便查看服务的运行状态或日志。

> `docker run` 是用命令启动一个新容器，`docker exec` 是在已有（且运行中）的容器里执行命令。exec 只能进入运行中的容器；退出 Shell 用 `exit`。

> 执行 `docker run -it ... sh` 后 `docker ps -a` 看到容器状态是 Exited，是因为执行的是 sh，退出 Shell 自然就结束运行了。要看容器是否长时间运行，应启动 Nginx、MySQL 这样会一直运行的命令，容器才不会停止。

## docker stop / start：停止与启动容器

```bash
docker stop ed4 d60 45c      # 用 CONTAINER ID 前三位停止容器
```

停止后的容器可以用 `docker start` 再次启动运行。

## docker rm：删除容器

`docker rm` 彻底删除容器。它与 `docker rmi` 非常像，区别在于没有后面的字母 `i`，所以只删除容器，不删除镜像。

```bash
docker rm ed d6 45          # 用 CONTAINER ID 前两位删除容器
```

如果想让 Docker 自动删除不需要的容器，可以在 `docker run` 时加上 `--rm` 参数：

```bash
docker run -d --rm nginx:alpine
docker run -d --rm redis
docker run -it --rm 2e6 sh
```

然后用 `docker stop` 停止容器，再用 `docker ps -a` 查看就会发现 Docker 已自动删除了这些容器，无需手动执行 `docker rm`。
