---
title: 常用的镜像操作
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, image, container]
reviewable: true
module: container-basics
---

← 参见 主笔记：容器化的应用：会了这些你就是Docker高手

前面课程已了解 `docker pull`（从远端仓库拉取镜像）和 `docker images`（列出本地镜像）。与镜像相关的命令最常用的就是 `docker pull`、`docker images`、`docker rmi` 三个。

## 镜像的命名规则

镜像的完整名字由**名字**和**标签**两部分组成，中间用 `:` 连接：

- **名字**表明应用身份，如 busybox、alpine、nginx、redis
- **标签（tag）**是为区分不同版本做的额外标记，任意字符串都可以，例如：
  - `3.15`：纯数字版本号
  - `jamy`：项目代号
  - `1.21-alpine`：版本号加操作系统名
- 特殊标签 `latest`：默认标签，只给名字不带标签时自动使用

拉取镜像示例：

```bash
docker pull alpine:3.15
docker pull ubuntu:jammy
docker pull nginx:1.21-alpine
docker pull nginx:alpine
docker pull redis              # 默认使用 latest 标签
```

## docker images：查看本地镜像

使用 `docker images` 查看镜像具体信息，输出列含义：

| 列 | 含义 |
|----|------|
| REPOSITORY | 镜像的名字 |
| TAG | 镜像的标签 |
| IMAGE ID | 镜像唯一标识，像身份证号 |
| CREATED | 镜像的创建时间 |
| SIZE | 镜像大小 |

### IMAGE ID 的特点

- 可用 `ubuntu:jammy` 表示镜像，也可用它的 ID（如 `d4c2c…`）表示
- 同一镜像可以打上不同标签（像人的大名、小名、昵称），同一镜像不同标签的 IMAGE ID 一样。例如 `nginx:1.21-alpine` 和 `nginx:alpine` 的 IMAGE ID 可以都是 `a63a…`
- IMAGE ID 是十六进制且唯一，Docker 提供"短路"操作，本地通常前三位就能定位，镜像少时两位甚至一位也可以

> 不同机器上同一 image 同一 tag，IMAGE ID 是一样的（与镜像文件相关）。但 `nginx:alpine` 始终指向最新版本，会随时间更新：当时与 `1.21-alpine` 相同，后来更新到 1.23 后就不同了，此时它应与 `nginx:1.23-alpine` 相同。

> 重复打 tag 导致某 tag 失去镜像引用时，name 或 tag 会显示为 `<none>`（虚悬镜像），有 none 直接删除即可。

## docker rmi：删除镜像

`docker rmi` 用来删除不再使用的镜像，节约磁盘空间。rmi 是 "remove image" 的简写：

```bash
docker rmi redis          # 删除 redis 镜像，未显式写标签默认用 latest
docker rmi d4c            # 直接用 IMAGE ID 前三位定位并删除
```

> 删除镜像时用名字加标签、且没有其他引用时就能直接删除。docker rm/rmi 有防误删保险机制——当容器引用了镜像时不能直接删除镜像，需先删除容器。

> 批量操作：`docker stop $(docker ps -a -q)` 一次停止所有容器，`docker rm $(docker ps -a -q)` 一次删除所有容器。
