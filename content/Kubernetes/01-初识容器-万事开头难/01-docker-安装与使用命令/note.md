---
title: Docker 安装与使用命令
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, container]
reviewable: true
module: container-basics
---

← 参见 主笔记：初识容器：万事开头难

## 安装 Docker Engine

使用 Ubuntu 的 apt 包管理工具安装（直接输入 `docker` 时系统会提示安装方式）：

```bash
sudo apt install -y docker.io   # 安装 Docker Engine
```

Docker Engine 不像 Docker Desktop 安装后即可用，安装后需执行两条命令做手工调整：

```bash
sudo service docker start          # 启动 docker 服务
sudo usermod -aG docker ${USER}    # 当前用户加入 docker 组
```

- 操作 Docker 必须有 root 权限，直接用 root 不够安全，加入 docker 用户组是官方推荐做法
- 执行后需 `exit` 退出系统再重新登录，`usermod` 才会生效

## 验证安装

### docker version

输出 Docker 客户端和服务器各自的版本信息：

```text
Client:
 Version: 20.10.12
 OS/Arch: linux/arm64

Server:
 Engine:
  Version: 20.10.12
  OS/Arch: linux/arm64
```

### docker info

显示当前 Docker 系统相关信息（CPU、内存、容器数量、镜像数量、容器运行时、存储文件系统等）：

```text
Containers: 1  Running: 0  Paused: 0  Stopped: 1
Images: 8
Server Version: 20.10.12
Storage Driver: overlay2
Cgroup Driver: systemd
Default Runtime: runc
Operating System: Ubuntu Jammy Jellyfish
Architecture: aarch64
CPUs: 2
Total Memory: 3.822GiB
Docker Root Dir: /var/lib/docker
```

可据此了解 Docker 内部运行状态：停止的容器数、镜像数、存储文件系统 overlay2、cgroup 驱动 systemd、默认运行时 runc、操作系统、硬件架构、CPU / 内存等。

## 常用命令

所有 Docker 操作形式：以 `docker` 开头，接子命令，可用 `help` 或 `--help` 获取帮助。

| 命令 | 作用 | 示例 |
|------|------|------|
| `docker ps` | 列出当前运行的容器 | `docker ps` |
| `docker ps -a` | 列出所有容器（含已运行完毕的） | `docker ps -a` |
| `docker pull` | 从远端镜像仓库（Registry）拉取镜像 | `docker pull busybox` |
| `docker images` | 列出本地存储的所有镜像 | `docker images` |
| `docker run` | 从镜像启动容器并执行命令 | `docker run busybox echo hello world` |

`docker pull` 类似 Ubuntu 的 `apt install` 下载软件包。`docker run busybox echo hello world` 会在终端输出 "hello world"，这正是 Solomon Hykes 在 PyCon 2013 大会上展示的核心内容。
