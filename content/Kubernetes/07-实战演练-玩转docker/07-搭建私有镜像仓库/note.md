---
title: 搭建私有镜像仓库
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, image]
reviewable: true
module: container-basics
---

← 参见 主笔记：实战演练：玩转Docker

第 5 讲曾说过在离线环境里可以自己搭建私有仓库，但当时还没学到容器网络相关知识。现在具备了比较完整的 Docker 知识体系，才能够搭建私有仓库。私有镜像仓库有很多现成解决方案，这里选最简单的 Docker Registry，功能更完善的 CNCF Harbor 留到后续学习 Kubernetes 时再介绍。

## 搭建步骤

### 1. 拉取镜像

在 Docker Hub 网站搜索"registry"找到官方页面，照着说明操作。先拉取镜像：

```bash
docker pull registry
```

### 2. 启动并映射端口

需要做一个端口映射对外暴露端口，Docker Registry 才能提供服务。容器内端口是 5000，简单起见外面也用 5000：

```bash
docker run -d -p 5000:5000 registry
```

用 `docker ps` 查看运行状态，可看到它确实把本机的 5000 端口映射到了容器内的 5000 端口。

### 3. 打标签

使用 `docker tag` 给镜像打标签再上传。因为上传目标不是默认的 Docker Hub 而是本地私有仓库，镜像名前面必须再加上仓库地址（域名或 IP 都行），形式上和 HTTP 的 URL 非常像。把 `nginx:alpine` 改成 `127.0.0.1:5000/nginx:alpine`：

```bash
docker tag nginx:alpine 127.0.0.1:5000/nginx:alpine
```

### 4. 推送

镜像有了附加仓库地址的完整名字，就可以推上去了：

```bash
docker push 127.0.0.1:5000/nginx:alpine
```

### 5. 验证

把刚才打标签的镜像删掉，再重新下载：

```bash
docker rmi 127.0.0.1:5000/nginx:alpine
docker pull 127.0.0.1:5000/nginx:alpine
```

`docker pull` 确实完成了镜像下载任务，不过因为原来的层原本就已存在，所以不会有实际下载动作，只会创建一个新的镜像标签。

## 用 RESTful API 查看仓库镜像

Docker Registry 虽然没有图形界面，但提供了 RESTful API，可以发送 HTTP 请求查看仓库里的镜像。具体端点信息可参考官方文档（https://docs.docker.com/registry/spec/api/），下面两条 curl 命令分别获取镜像列表和 Nginx 镜像的标签列表：

```bash
curl 127.1:5000/v2/_catalog
curl 127.1:5000/v2/nginx/tags/list
```

因为应用被封装到了镜像里，所以只用简单的一两条命令就完成了私有仓库的搭建，完全不需要复杂的软件安装、环境设置、调试测试等繁琐操作，这在容器技术出现之前简直不可想象。

> `127.0.0.1` 可以"缩写"成 `127.1`，中间的 0 可以省略，这是通用的写法，ipv6 里也是这么用的。

> pull 的时候加上本地仓库的地址（比如 127.0.0.1）就会从本地私有仓库拉取，而不是默认去公有仓库。
