---
title: 镜像上传与离线分发
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, registry, image]
reviewable: true
module: container-basics
---

← 参见 主笔记：镜像仓库：该怎样用好DockerHub这个宝藏

## 上传镜像到 Docker Hub

把用 Dockerfile 创建的镜像上传到 Docker Hub 只需 4 步：

| 步骤 | 操作 |
|------|------|
| 1 | 在 Docker Hub 上注册一个用户 |
| 2 | 本机使用 `docker login` 命令，用注册的用户名和密码认证身份登录 |
| 3 | 使用 `docker tag` 给镜像改成带用户名的完整名字（或直接用 `docker build -t` 在创建镜像时就起好名字） |
| 4 | 用 `docker push` 把镜像推上去 |

以镜像 `ngx-app` 为例，改名成 `chronolaw/ngx-app:1.0` 并推送：

```bash
docker tag ngx-app chronolaw/ngx-app:1.0
docker push chronolaw/ngx-app:1.0
```

推送后可登录 Docker Hub 网站验证效果：它会自动生成页面模板，可进一步添加描述信息、使用说明等。之后把镜像名字（用户名/应用名:标签）告诉同事，对方用 `docker pull` 即可下载部署。

## 离线环境下的镜像分发

企业内网离线环境连不上外网，自然不能使用 `docker push`、`docker pull` 来推送拉取镜像。

### 自建私有 Registry（最佳方法）

在内网环境里仿造 Docker Hub，创建自己的私有 Registry 服务，由它来管理镜像，就像自建 GitLab 做版本管理。已有成熟解决方案，如 Docker Registry、CNCF Harbor。使用它们还需一些后续课程知识，步骤也较繁琐，留待后续介绍。

> Registry 都已经容器化了，自建非常简单，难的是围绕它的管理工作。推荐用 Harbor，方便，功能也多。

### save / load 归档（应急"笨"办法）

Docker 提供了 `save` 和 `load` 两个镜像归档命令，可以把镜像导出成压缩包，或从压缩包导入 Docker。压缩包非常容易保管和传输，可以联机拷贝、FTP 共享，甚至存在 U 盘上随身携带。

```bash
docker save ngx-app:latest -o ngx.tar
docker load -i ngx.tar
```

这两个命令默认使用标准流作为输入输出（为了方便 Linux 管道操作），所以一般会用 `-o`、`-i` 参数以文件的形式使用。

> 内网里自建镜像仓库后，把镜像的名字改成这个仓库的地址即可。指定仓库拉取镜像时加上网址，比如 gcr.io、quay.io。
