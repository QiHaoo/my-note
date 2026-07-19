---
title: docker-compose：单机环境下的容器编排工具
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Docker
  - docker-compose
  - 容器编排
  - Kubernetes
reviewable: true
module: extras
---

## 核心概念

docker-compose 是单机环境里轻量级的容器编排工具，填补了 Docker 和 Kubernetes 之间的空白：既像 Docker 一样轻巧易用，又像 Kubernetes 一样具备容器编排能力。它源自 Fig，使用 YAML 描述容器，但语法语义更接近 Docker 命令行，核心概念是“service”（一个容器化的应用程序）。

## 什么是 docker-compose

Docker 把容器技术大众化后，周边涌现出大量扩展增强产品，其中名为“Fig”的小项目为 Docker 引入了“容器编排”概念：用 YAML 定义容器的启动参数、先后顺序和依赖关系，让用户摆脱 Docker 冗长命令行的烦恼，第一次见识到“声明式”的威力。Docker 公司在 2014 年 7 月买下 Fig，集成进 Docker 内部并改名“docker-compose”。

虽然 docker-compose 也是容器编排技术、也使用 YAML，但它的基因与 Kubernetes 完全不同，走的是 Docker 的技术路线，所以设计理念和使用方法上有差异。

- 定位：管理和运行多个 Docker 容器的工具，没有 Kubernetes 那么“宏伟”的目标，只是方便用户使用 Docker，学习难度低、上手容易，很多概念与 Docker 命令一一对应。
- 注意：docker-compose 和 Kubernetes 同属容器编排领域，用法不一致易导致认知冲突，学习时要把握一个“度”，够用就行，不要太过深究，否则会对 Kubernetes 学习造成不良影响。

## 如何使用 docker-compose

docker-compose 在 GitHub 上提供多种形式的二进制可执行文件，支持 Windows、macOS、Linux 等操作系统及 x86_64、arm64 等硬件架构，可直接下载。Linux 安装用最新 2.6.1 版本，安装后用 `docker-compose version` 查看版本号（用法同 `docker version`）。

docker-compose 管理容器的核心概念是“service”。注意它与 Kubernetes 里的 Service 名字虽像但完全不同：docker-compose 的“service”是一个容器化的应用程序（通常是后台服务），用 YAML 定义这些容器的参数和相互关系。硬要和 Kubernetes 对比，和“service”最像的 API 对象是 Pod 里的 container，同样管理容器运行，但 docker-compose 的“service”又融合了一些 Service、Deployment 的特性。

```yaml
services:
  registry:
    image: registry
    container_name: registry
    restart: always
    ports:
    - 5000:5000
```

对应 Docker 命令：`docker run -d -p 5000:5000 registry`。它和 Pod 定义很像，“services”相当于 Pod，里面的“service”相当于 `spec.containers`，用 `image` 声明镜像、`ports` 声明端口，但端口映射用的是 Docker 语法。

要点：

- 每个“service”都有一个自己的名字，同时也是这个容器的唯一网络标识，有点类似 Kubernetes 里 Service 域名的作用。
- 启动应用命令 `docker-compose up -d`，用 `-f` 参数指定 YAML 文件，和 `kubectl apply` 差不多。
- docker-compose 底层还是调用 Docker，启动的容器用 `docker ps` 也能看到，但 `docker-compose ps` 能看到更多信息。
- 停止应用用 `docker-compose down`。

-> 详见 docker-compose 基本用法

## 使用 docker-compose 搭建 WordPress 网站

用 docker-compose 搭建 WordPress 网站，深入感受容器编排的好处。架构图和第 7 讲一样，分三步定义三个“service”。

| 步骤 | service | 要点 |
|------|---------|------|
| 第一步 | MariaDB | 环境变量写法与 Kubernetes ConfigMap 有点类似，但使用字段 `environment` 直接定义，不用再“绕一下”。YAML 和命令行非常像，几乎可直接照搬 |
| 第二步 | WordPress | 同样用 `environment` 设置环境变量。`WORDPRESS_DB_HOST` 直接用 service 的名字 `mariadb`（docker-compose 自动把 MariaDB 名字用作网络标识，不需手动指定 IP）。字段 `depends_on` 设置容器依赖关系，指定启动先后顺序，编排多容器应用时很便利 |
| 第三步 | Nginx 反向代理 | docker-compose 里没有 ConfigMap、Secret 概念，加载配置必须用外部文件、无法集成进 YAML。加载配置用 `volumes` 字段（和 Kubernetes 一样，但语法是 Docker 形式）。Nginx 配置的 `proxy_pass` 里直接用 WordPress 的名字作网络标识 |

三个“service”都定义好后，用 `docker-compose up -d` 启动（用 `-f` 指定 YAML）、`docker-compose ps` 查看状态。可用 `docker-compose exec` 进入容器内部验证网络标识：分别 ping `mariadb` 和 `wordpress` 两个服务，网络都通，其 IP 地址段用的是 `172.20.0.0/16`，和 Docker 默认的 `172.17.0.0/16` 不一样。浏览器输入本机 `127.0.0.1` 或虚拟机 IP 即可看到 WordPress 界面。

-> 详见 docker-compose 搭建 WordPress

## docker-compose 的局限与价值

和 Kubernetes 比起来，docker-compose 有自己的局限性：只能用于单机，编排功能比较简单，缺乏运维监控手段等。但也有优点：小巧轻便，对软硬件要求不高，只要有 Docker 就能运行。

- 虽 Kubernetes 已成为容器编排领域霸主，docker-compose 仍有一定生存空间，如 GitHub 上很多项目提供 docker-compose YAML 来快速搭建原型或测试环境，典型就是 CNCF Harbor。
- 日常工作里，只有几个容器的简单应用用 Kubernetes 像“杀鸡用牛刀”，用 Docker 命令、Shell 脚本又不方便，这时 docker-compose 就可出场，让人彻底摆脱“命令式”、全面使用“声明式”操作容器。

小结：

1. docker-compose 源自 Fig，是专门用来编排 Docker 容器的工具。
2. docker-compose 也使用 YAML 描述容器，但语法语义更接近 Docker 命令行。
3. docker-compose YAML 里的关键概念是“service”，它是一个容器化的应用。
4. docker-compose 的命令与 Docker 类似，比较常用的有 up、ps、down，用来启动、查看和停止应用。

## 来自评论区

- docker-compose 对开发最大的作用是本地快速拥有数据库、消息中间件等，无需单独安装，随时用随时删除；写好文件放到 repo 里可一键运行和初始化，极大方便本地开发与本地集成测试。
- docker-compose 可以用在小型公司生产线上，它其实就是对 Docker 的一个易用性包装。
- 1.x docker-compose 的默认文件是 `docker-compose.yml`，2.x 后默认文件也可使用 `compose.yml`。
- docker-compose 从 v1.27 版本开始将 `version` 字段去掉，不再需要理会 `version: "3"` 等。
- 安装成 docker compose plugin 形式（没有中间横线）时，Harbor 安装会有问题因为检测不到 docker-compose，所以一般还是用传统的 docker-compose 形式与 1.x 兼容。
- 现在应该都用 Go 版本的 docker-compose。
