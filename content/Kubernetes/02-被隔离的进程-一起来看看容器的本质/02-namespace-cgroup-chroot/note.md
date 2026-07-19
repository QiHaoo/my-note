---
title: namespace、cgroup、chroot
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, container, namespace, cgroup]
reviewable: true
module: container-basics
---

← 参见 主笔记：被隔离的进程：一起来看看容器的本质

容器隔离的奥秘在于 Linux 内核为资源隔离提供的三种技术：namespace、cgroup、chroot。它们初衷并非为实现容器，但结合在一起就形成了具有完善隔离特性的容器。

## 三种技术概览

| 技术 | 出现时间 | 作用 | 比喻 |
|------|----------|------|------|
| namespace | 2002 年 Linux 2.4.19 | 创建独立的文件系统、主机名、进程号、网络等资源空间 | 给进程盖了一间小板房 |
| cgroup（Linux Control Group） | 2008 年 Linux 2.6.24 | 实现对进程 CPU、内存等资源的优先级和配额限制 | 给小板房加了一个天花板 |
| chroot | 1979 年 UNIX V7 | 更改进程的根目录，限制访问文件系统 | 给小板房铺上了地砖 |

综合运用这三种技术，一个四四方方、具有完善隔离特性的容器就此出现。

## chroot

chroot 的历史比 namespace、cgroup 古老得多，早在 1979 年的 UNIX V7 就已出现，可以更改进程的根目录，即限制访问文件系统。操作示例：

- 先创建目录 `rootfs`，在其中新建文件 `a b c`
- 执行 `chroot /home/centos/rootfs /bin/sh`：启动一个 sh 进程，并把 `/home/centos/rootfs` 作为它的根目录
- 此时执行 `/bin/ls /` 只会显示 a b c 三个文件，说明当前进程的根目录已变成主机上的 `/home/centos/rootfs`，实现与主机的隔离

> 现在一般用的是 `pivot_root`，但 chroot 作为基本工作原理用来解释 Docker 很方便。Docker 在 LXC（基于 namespace、cgroup）上又做了一层封装，底层实际上没有用到 chroot。

## namespace

namespace 与编程语言里的 namespace 类似，可以创建出独立的文件系统、主机名、进程号、网络等资源空间。Docker 主要用到以下五种：

| namespace | 隔离对象 |
|-----------|----------|
| pid | 进程 ID |
| net | 网络接口（独立的 IP、路由、端口等） |
| mnt | 文件系统挂载点 |
| ipc | 信号量、消息队列和共享内存 |
| uts | 主机名和域名 |

> namespace 有点像进程虚拟地址和物理地址的映射：每个进程看到的都是隔离、完整的虚拟地址空间，实际映射的是不同物理地址；容器看到的进程空间（如从 1 开始）其实还是宿主机上的某个进程。

## cgroup

cgroup 全称 Linux Control Group，用来实现对进程 CPU、内存等资源的优先级和配额限制。它可以限制和隔离进程的资源使用情况（CPU、内存、磁盘 I/O、网络等），在容器实现中通常用来限制容器的 CPU 和内存等资源。

## 容器与"特殊进程"

容器可以概括为：

> 普通进程 + namespace（一重枷锁：能看到什么进程）+ cgroup（二重枷锁：能用多少资源）+ chroot（三重枷锁：能看到什么文件）= 特殊的进程 = 容器

执行 `docker run -it ubuntu:18.04 sh` 后，在容器中 `ps` 会发现 sh 的 pid 为 1；但在宿主机上 `ps auxf | grep sh` 也能看到这个进程，只是 pid 不同。容器内执行 `apt update`，宿主机 `ps` 同样能看到，且是 sh 的子进程。说明容器里的应用进程与宿主机上其他进程一样由宿主机 OS 统一管理，只不过通过 namespace 做了特殊隔离。

## 其他相关技术：UnionFS

**联合文件系统（UnionFS）** 是一种通过创建文件层进行操作的文件系统，非常轻快。Docker 用它为容器提供构建层，实现写时复制（Copy-on-Write）以及镜像的分层构建和存储。常用的联合文件系统有 AUFS、Overlay 和 Devicemapper 等。
