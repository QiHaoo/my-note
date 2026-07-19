---
title: docker-compose 基本用法
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Docker
  - docker-compose
  - 容器编排
reviewable: true
module: extras
---

← 参见 主笔记：docker-compose：单机环境下的容器编排工具

docker-compose 的安装、核心概念 service、基本命令，以及用私有镜像仓库 Registry 的简单示例。

## 安装

docker-compose 在 GitHub 上提供多种形式的二进制可执行文件，支持 Windows、macOS、Linux 等操作系统，也支持 x86_64、arm64 等硬件架构，可直接下载。Linux 上安装用的是最新的 2.6.1 版本：

```bash
# intel x86_64
sudo curl -SL https://github.com/docker/compose/releases/down \
  -o /usr/local/bin/docker-compose

# apple m1
sudo curl -SL https://github.com/docker/compose/releases/down \
  -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker
```

安装完成后查看版本号，命令是 `docker-compose version`，用法和 `docker version` 一样：

```bash
docker-compose version
```

## 核心概念：service

docker-compose 管理容器的核心概念是“service”。注意它与 Kubernetes 里的 Service 名字虽像但完全不同：docker-compose 的“service”是一个容器化的应用程序（通常是后台服务），用 YAML 定义这些容器的参数和相互关系。

硬要和 Kubernetes 对比，和“service”最像的 API 对象应该算是 Pod 里的 container，同样是管理容器运行，但 docker-compose 的“service”又融合了一些 Service、Deployment 的特性。

和 Pod 定义对比：

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ngx-pod
spec:
  restartPolicy: Always
  containers:
  - image: nginx:alpine
    name: ngx
    ports:
    - containerPort: 80
```

## Registry 示例

以第 7 讲里的私有镜像仓库 Registry 为示范。对应的 Docker 命令：

```bash
docker run -d -p 5000:5000 registry
```

docker-compose 的 YAML，关键字段是 `services`：

```yaml
services:
  registry:
    image: registry
    container_name: registry
    restart: always
    ports:
    - 5000:5000
```

和 Kubernetes 对比，它和 Pod 定义非常像，“services”相当于 Pod，里面的“service”相当于 `spec.containers`：用 `image` 声明镜像，用 `ports` 声明端口，只是在用法上有些不一样，像端口映射用的还是 Docker 的语法。

## 基本命令

| 命令 | 作用 |
|------|------|
| `docker-compose -f reg-compose.yml up -d` | 启动应用（`-f` 指定 YAML 文件，和 `kubectl apply` 差不多） |
| `docker ps` | docker-compose 底层调用 Docker，启动的容器用此命令也能看到 |
| `docker-compose -f reg-compose.yml ps` | 查看应用，能看到更多信息 |
| `docker-compose -f reg-compose.yml down` | 停止应用 |

测试上传镜像到私有仓库：

```bash
docker tag nginx:alpine 127.0.0.1:5000/nginx:v1
docker push 127.0.0.1:5000/nginx:v1
curl 127.1:5000/v2/nginx/tags/list
```

要点提醒：在 docker-compose 里，每个“service”都有一个自己的名字，同时也是这个容器的唯一网络标识，有点类似 Kubernetes 里 Service 域名的作用。

通过这个例子，成功把“命令式”的 Docker 操作转换成“声明式”的 docker-compose 操作，用法与 Kubernetes 十分接近，同时还没有 Kubernetes 那些昂贵的运行成本，在单机环境里最适合不过。
